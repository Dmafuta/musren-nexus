<?php

namespace App\Http\Controllers;

use App\Models\AffiliateWallet;
use App\Models\LoyaltyExchangeRate;
use App\Models\WalletLedger;
use App\Models\WithdrawalRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /** GET /api/customer/wallet */
    public function wallet(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $wallet = AffiliateWallet::firstOrCreate(
            ['user_id' => $userId],
            ['balance_points' => 0, 'pending_points' => 0, 'lifetime_points' => 0, 'balance_cash_cents' => 0]
        );
        return response()->json($wallet);
    }

    /** GET /api/customer/ledger */
    public function ledger(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $rows = WalletLedger::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'amount_cents', 'kind', 'description', 'created_at']);
        return response()->json($rows);
    }

    /** GET /api/customer/withdrawals */
    public function withdrawals(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $rows = WithdrawalRequest::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'method', 'amount_points', 'amount_value', 'status', 'created_at']);
        return response()->json($rows);
    }

    /** GET /api/exchange-rates */
    public function exchangeRates(): JsonResponse
    {
        $rates = LoyaltyExchangeRate::where('active', true)
            ->orderBy('kind')
            ->get(['kind', 'points', 'value_amount', 'label']);
        return response()->json($rates);
    }
}
