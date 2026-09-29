<?php

namespace App\Http\Controllers;

use App\Models\AffiliateEvent;
use App\Models\AffiliateRewardRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantController extends Controller
{
    /** GET /api/merchant/reward-rules */
    public function rewardRules(): JsonResponse
    {
        $rules = AffiliateRewardRule::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $rules]);
    }

    /** PATCH /api/merchant/reward-rules/{id} */
    public function updateRewardRule(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'click_points'      => 'required|integer|min:0',
            'signup_points'     => 'required|integer|min:0',
            'purchase_points'   => 'required|integer|min:0',
            'revenue_share_bps' => 'required|integer|min:0',
            'max_daily_points'  => 'nullable|integer|min:0',
        ]);

        $rule = AffiliateRewardRule::findOrFail($id);
        $rule->update($data);

        return response()->json($rule->fresh());
    }

    /** GET /api/merchant/analytics */
    public function analytics(): JsonResponse
    {
        $totals = [
            'clicks'         => AffiliateEvent::where('kind', 'click')->count(),
            'signups'        => AffiliateEvent::where('kind', 'signup')->count(),
            'purchases'      => AffiliateEvent::where('kind', 'purchase')->count(),
            'points_awarded' => (int) AffiliateEvent::sum('points_awarded'),
        ];

        $byProduct = AffiliateEvent::selectRaw(
            "product_slug,
             SUM(CASE WHEN kind = 'click'    THEN 1 ELSE 0 END) AS clicks,
             SUM(CASE WHEN kind = 'signup'   THEN 1 ELSE 0 END) AS signups,
             SUM(CASE WHEN kind = 'purchase' THEN 1 ELSE 0 END) AS purchases,
             SUM(points_awarded) AS points"
        )
            ->whereNotNull('product_slug')
            ->groupBy('product_slug')
            ->orderByDesc('purchases')
            ->get();

        return response()->json(['totals' => $totals, 'by_product' => $byProduct]);
    }

    /** GET /api/merchant/conversions?product_slug=&kind= */
    public function conversions(Request $request): JsonResponse
    {
        $query = AffiliateEvent::orderByDesc('occurred_at')->limit(50);

        if ($slug = $request->query('product_slug')) {
            $query->where('product_slug', $slug);
        }
        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }

        return response()->json(['data' => $query->get()]);
    }

    /** GET /api/merchant/affiliates */
    public function affiliates(): JsonResponse
    {
        $rows = AffiliateEvent::selectRaw(
            "user_id,
             SUM(CASE WHEN kind = 'click'    THEN 1 ELSE 0 END) AS clicks,
             SUM(CASE WHEN kind = 'signup'   THEN 1 ELSE 0 END) AS signups,
             SUM(CASE WHEN kind = 'purchase' THEN 1 ELSE 0 END) AS purchases,
             SUM(points_awarded) AS total_points,
             MAX(occurred_at) AS last_activity"
        )
            ->groupBy('user_id')
            ->orderByDesc('total_points')
            ->limit(30)
            ->get();

        return response()->json(['data' => $rows]);
    }
}
