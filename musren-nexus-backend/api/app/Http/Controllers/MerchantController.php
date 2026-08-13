<?php

namespace App\Http\Controllers;

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
}
