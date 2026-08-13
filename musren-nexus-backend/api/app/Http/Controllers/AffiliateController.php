<?php

namespace App\Http\Controllers;

use App\Models\AffiliateEvent;
use App\Models\AffiliateNotification;
use App\Models\AffiliatePromotion;
use App\Models\AffiliateReferralCode;
use App\Models\AffiliateRewardRule;
use App\Models\AffiliateShare;
use App\Models\AffiliateWallet;
use App\Models\LoyaltyExchangeRate;
use App\Models\ProductAsset;
use App\Models\ShareTemplate;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AffiliateController extends Controller
{
    // ── Wallet ───────────────────────────────────────────────────────────────

    public function wallet(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $wallet = AffiliateWallet::firstOrCreate(
            ['user_id' => $userId],
            ['balance_points' => 0, 'pending_points' => 0, 'lifetime_points' => 0, 'balance_cash_cents' => 0]
        );
        return response()->json($wallet);
    }

    // ── Events ───────────────────────────────────────────────────────────────

    public function events(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $events = AffiliateEvent::where('user_id', $userId)
            ->orderBy('occurred_at', 'desc')
            ->limit(15)
            ->get();
        return response()->json(['data' => $events]);
    }

    // ── Withdrawals ──────────────────────────────────────────────────────────

    public function withdrawals(Request $request): JsonResponse
    {
        $userId      = $request->attributes->get('auth_user_id');
        $withdrawals = WithdrawalRequest::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
        return response()->json(['data' => $withdrawals]);
    }

    /** POST /api/affiliate/withdraw */
    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate([
            'method'      => 'required|in:mpesa,airtime,data',
            'amount_points' => 'required|integer|min:1',
            'destination' => 'nullable|string|max:30',
        ]);

        $userId = $request->attributes->get('auth_user_id');
        $wallet = AffiliateWallet::where('user_id', $userId)->first();

        if (! $wallet || $wallet->balance_points < $data['amount_points']) {
            return response()->json(['error' => 'Insufficient points balance'], 422);
        }

        // Deduct from balance and add to pending
        $wallet->decrement('balance_points', $data['amount_points']);
        $wallet->increment('pending_points', $data['amount_points']);

        // Look up exchange rate
        $rateKind = $data['method'] === 'mpesa' ? 'cash' : $data['method'];
        $rate     = LoyaltyExchangeRate::where('kind', $rateKind)->where('active', true)->first();
        $value    = $rate ? (int) floor(($data['amount_points'] / $rate->points) * $rate->value_amount) : 0;

        $wr = WithdrawalRequest::create([
            'user_id'       => $userId,
            'method'        => $data['method'],
            'amount_points' => $data['amount_points'],
            'amount_value'  => $value,
            'phone'         => $data['destination'] ?? null,
            'status'        => 'pending',
        ]);

        return response()->json($wr, 201);
    }

    // ── Notifications ────────────────────────────────────────────────────────

    public function notifications(Request $request): JsonResponse
    {
        $userId        = $request->attributes->get('auth_user_id');
        $notifications = AffiliateNotification::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(8)
            ->get();
        return response()->json(['data' => $notifications]);
    }

    // ── Promotions ───────────────────────────────────────────────────────────

    public function promotions(): JsonResponse
    {
        $promos = AffiliatePromotion::where('active', true)
            ->where('public_visible', true)
            ->orderBy('multiplier', 'desc')
            ->get(['id', 'name', 'description', 'multiplier', 'starts_at', 'ends_at']);
        return response()->json(['data' => $promos]);
    }

    // ── Exchange rates ────────────────────────────────────────────────────────

    public function rates(): JsonResponse
    {
        $rates = LoyaltyExchangeRate::where('active', true)
            ->get(['kind', 'points', 'value_amount', 'label', 'starts_at', 'ends_at']);
        return response()->json(['data' => $rates]);
    }

    // ── Referral codes ────────────────────────────────────────────────────────

    public function codes(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $codes  = AffiliateReferralCode::where('user_id', $userId)
            ->where('active', true)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json(['data' => $codes]);
    }

    /** POST /api/affiliate/codes */
    public function createCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'         => ['required', 'string', 'min:3', 'max:64', 'regex:/^[a-zA-Z0-9_-]+$/', 'unique:affiliate_referral_codes,code'],
            'product_slug' => 'nullable|string|max:80',
        ]);

        $userId = $request->attributes->get('auth_user_id');

        $code = AffiliateReferralCode::create([
            'user_id'      => $userId,
            'code'         => $data['code'],
            'product_slug' => $data['product_slug'] ?? null,
            'active'       => true,
        ]);

        return response()->json($code, 201);
    }

    // ── Product assets ────────────────────────────────────────────────────────

    public function assets(Request $request): JsonResponse
    {
        $slug   = $request->query('product_slug');
        $query  = ProductAsset::where('active', true)->orderBy('created_at', 'desc');
        if ($slug) {
            $query->where('product_slug', $slug);
        }
        return response()->json(['data' => $query->get()]);
    }

    // ── Share templates ───────────────────────────────────────────────────────

    public function templates(Request $request): JsonResponse
    {
        $slug      = $request->query('product_slug');
        $query     = ShareTemplate::where('active', true);
        if ($slug) {
            $query->where('product_slug', $slug);
        }
        return response()->json(['data' => $query->get()]);
    }

    // ── Log share ─────────────────────────────────────────────────────────────

    public function logShare(Request $request): JsonResponse
    {
        $data   = $request->validate([
            'code'         => 'required|string|max:64',
            'product_slug' => 'nullable|string|max:80',
            'channel'      => 'required|string|max:30',
        ]);
        $userId = $request->attributes->get('auth_user_id');

        AffiliateShare::create(array_merge($data, ['user_id' => $userId]));

        return response()->json(['logged' => true]);
    }

    // ── Channel stats ─────────────────────────────────────────────────────────

    public function channelStats(Request $request): JsonResponse
    {
        $userId      = $request->attributes->get('auth_user_id');
        $productSlug = $request->query('product_slug');

        $query = AffiliateEvent::where('user_id', $userId)
            ->whereIn('kind', ['click', 'signup']);
        if ($productSlug) {
            $query->where('product_slug', $productSlug);
        }

        $by = [];
        foreach ($query->get(['kind', 'channel']) as $e) {
            $ch = $e->channel ?? 'unknown';
            $by[$ch] = $by[$ch] ?? ['clicks' => 0, 'signups' => 0];
            if ($e->kind === 'click') $by[$ch]['clicks']++;
            if ($e->kind === 'signup') $by[$ch]['signups']++;
        }

        return response()->json($by);
    }

    // ── Admin: reward rules ───────────────────────────────────────────────────

    public function rewardRules(): JsonResponse
    {
        return response()->json(['data' => AffiliateRewardRule::orderBy('created_at', 'desc')->get()]);
    }

    public function updateRewardRule(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'click_points'       => 'required|integer|min:0',
            'signup_points'      => 'required|integer|min:0',
            'purchase_points'    => 'required|integer|min:0',
            'revenue_share_bps'  => 'required|integer|min:0',
            'max_daily_points'   => 'nullable|integer|min:0',
        ]);

        $rule = AffiliateRewardRule::findOrFail($id);
        $rule->update($data);

        return response()->json($rule->fresh());
    }

    // ── Admin: promotions ─────────────────────────────────────────────────────

    public function adminPromotions(): JsonResponse
    {
        return response()->json(['data' => AffiliatePromotion::orderBy('created_at', 'desc')->get()]);
    }

    public function createPromotion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:120',
            'description'    => 'nullable|string',
            'multiplier'     => 'required|numeric|min:0.01',
            'starts_at'      => 'nullable|date',
            'ends_at'        => 'nullable|date',
            'active'         => 'boolean',
            'public_visible' => 'boolean',
        ]);
        return response()->json(AffiliatePromotion::create($data), 201);
    }

    public function updatePromotion(Request $request, string $id): JsonResponse
    {
        $data  = $request->validate([
            'name'           => 'sometimes|string|max:120',
            'description'    => 'nullable|string',
            'multiplier'     => 'sometimes|numeric|min:0.01',
            'starts_at'      => 'nullable|date',
            'ends_at'        => 'nullable|date',
            'active'         => 'boolean',
            'public_visible' => 'boolean',
        ]);
        $promo = AffiliatePromotion::findOrFail($id);
        $promo->update($data);
        return response()->json($promo->fresh());
    }

    public function deletePromotion(string $id): JsonResponse
    {
        AffiliatePromotion::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // ── Admin: assets ─────────────────────────────────────────────────────────

    public function adminAssets(Request $request): JsonResponse
    {
        $query = ProductAsset::orderBy('created_at', 'desc');
        if ($slug = $request->query('product_slug')) {
            $query->where('product_slug', $slug);
        }
        return response()->json(['data' => $query->get()]);
    }

    public function createAsset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_slug' => 'required|string|max:80',
            'kind'         => 'required|in:poster,logo,video,copy',
            'title'        => 'required|string|max:120',
            'file_url'     => 'nullable|url|max:500',
            'body_text'    => 'nullable|string',
            'notes'        => 'nullable|string',
            'active'       => 'boolean',
        ]);
        return response()->json(ProductAsset::create($data), 201);
    }

    // ── Admin: templates ──────────────────────────────────────────────────────

    public function adminTemplates(Request $request): JsonResponse
    {
        $query = ShareTemplate::orderBy('created_at', 'desc');
        if ($slug = $request->query('product_slug')) {
            $query->where('product_slug', $slug);
        }
        return response()->json(['data' => $query->get()]);
    }

    public function createTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_slug' => 'required|string|max:80',
            'channel'      => 'required|string|max:30',
            'body'         => 'required|string',
            'cta'          => 'nullable|string|max:120',
            'active'       => 'boolean',
        ]);
        return response()->json(ShareTemplate::create($data), 201);
    }

    // ── Admin: exchange rates ─────────────────────────────────────────────────

    public function adminRates(): JsonResponse
    {
        return response()->json(['data' => LoyaltyExchangeRate::orderBy('kind')->orderBy('created_at', 'desc')->get()]);
    }

    public function createRate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind'         => 'required|in:cash,airtime,data',
            'points'       => 'required|integer|min:1',
            'value_amount' => 'required|integer|min:1',
            'label'        => 'nullable|string|max:100',
            'active'       => 'boolean',
        ]);
        return response()->json(LoyaltyExchangeRate::create($data), 201);
    }

    public function updateRate(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['active' => 'required|boolean']);
        $rate = LoyaltyExchangeRate::findOrFail($id);
        $rate->update(['active' => $data['active']]);
        return response()->json($rate->fresh());
    }

    // ── Admin: affiliate withdrawal queue ─────────────────────────────────────

    public function adminWithdrawals(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');
        $list   = WithdrawalRequest::where('status', $status)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json(['data' => $list]);
    }

    public function adminApproveWithdrawal(string $id): JsonResponse
    {
        $wr = WithdrawalRequest::findOrFail($id);
        if ($wr->status !== 'pending') {
            return response()->json(['error' => 'Only pending withdrawals can be approved'], 409);
        }
        $wr->update(['status' => 'processing']);
        return response()->json(['message' => 'Marked as processing']);
    }

    public function adminRejectWithdrawal(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'nullable|string|max:255']);
        $wr   = WithdrawalRequest::findOrFail($id);
        if ($wr->status !== 'pending') {
            return response()->json(['error' => 'Only pending withdrawals can be rejected'], 409);
        }
        // Refund points
        AffiliateWallet::where('user_id', $wr->user_id)->increment('balance_points', $wr->amount_points);
        AffiliateWallet::where('user_id', $wr->user_id)->decrement('pending_points', $wr->amount_points);
        $wr->update(['status' => 'rejected', 'notes' => $data['reason'] ?? null]);
        return response()->json($wr->fresh());
    }

    // ── Admin: reward rule upsert ─────────────────────────────────────────────

    public function upsertRewardRule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_slug'      => 'required|string|max:80',
            'click_points'      => 'required|integer|min:0',
            'signup_points'     => 'required|integer|min:0',
            'purchase_points'   => 'required|integer|min:0',
            'revenue_share_bps' => 'required|integer|min:0',
            'max_daily_points'  => 'nullable|integer|min:0',
            'active'            => 'boolean',
        ]);
        $rule = AffiliateRewardRule::updateOrCreate(
            ['product_slug' => $data['product_slug']],
            collect($data)->except('product_slug')->all()
        );
        return response()->json($rule, 201);
    }

    // ── Admin: asset update/delete ────────────────────────────────────────────

    public function updateAsset(Request $request, string $id): JsonResponse
    {
        $data  = $request->validate(['active' => 'required|boolean']);
        $asset = ProductAsset::findOrFail($id);
        $asset->update(['active' => $data['active']]);
        return response()->json($asset->fresh());
    }

    public function deleteAsset(string $id): JsonResponse
    {
        ProductAsset::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    // ── Admin: template upsert ────────────────────────────────────────────────

    public function upsertTemplate(Request $request): JsonResponse
    {
        $data     = $request->validate([
            'product_slug' => 'required|string|max:80',
            'channel'      => 'required|string|max:30',
            'body'         => 'required|string',
            'cta'          => 'nullable|string|max:120',
            'active'       => 'boolean',
        ]);
        $template = ShareTemplate::updateOrCreate(
            ['product_slug' => $data['product_slug'], 'channel' => $data['channel']],
            collect($data)->except(['product_slug', 'channel'])->all()
        );
        return response()->json($template);
    }

    // ── Admin: leaderboard ────────────────────────────────────────────────────

    public function leaderboard(): JsonResponse
    {
        $rows = AffiliateEvent::selectRaw(
            "user_id,
             SUM(CASE WHEN kind = 'click'    THEN 1 ELSE 0 END) as clicks,
             SUM(CASE WHEN kind = 'signup'   THEN 1 ELSE 0 END) as signups,
             SUM(CASE WHEN kind = 'purchase' THEN 1 ELSE 0 END) as purchases,
             SUM(points_awarded) as points"
        )
        ->where('occurred_at', '>=', now()->subDays(7))
        ->groupBy('user_id')
        ->orderByDesc('points')
        ->limit(20)
        ->get();

        return response()->json(['data' => $rows]);
    }

    // ── Public: referral click tracking ───────────────────────────────────────

    public function trackClick(Request $request, string $code): \Symfony\Component\HttpFoundation\Response
    {
        $productSlug = $request->query('p');
        $channel     = $request->query('ch');
        $dest        = $productSlug ? "/solutions/{$productSlug}" : '/';

        try {
            $refCode = AffiliateReferralCode::where('code', $code)->where('active', true)->first();
            if ($refCode) {
                $rule = $productSlug
                    ? AffiliateRewardRule::where('product_slug', $productSlug)->where('active', true)->first()
                    : null;

                AffiliateEvent::create([
                    'user_id'      => $refCode->user_id,
                    'kind'         => 'click',
                    'product_slug' => $productSlug,
                    'points_awarded' => $rule ? $rule->click_points : 1,
                    'channel'      => $channel,
                    'occurred_at'  => now(),
                ]);

                // Award points to wallet
                AffiliateWallet::where('user_id', $refCode->user_id)
                    ->increment('balance_points', $rule ? $rule->click_points : 1);
                AffiliateWallet::where('user_id', $refCode->user_id)
                    ->increment('lifetime_points', $rule ? $rule->click_points : 1);
            }
        } catch (\Throwable) {
            // Never block the redirect
        }

        return redirect()->away($dest, 302);
    }
}
