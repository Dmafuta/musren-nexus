<?php

namespace App\Http\Controllers;

use App\Models\AffiliateWallet;
use App\Models\PaymentOrder;
use App\Models\WalletLedger;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MpesaWebhookController extends Controller
{
    public function __construct(private readonly EmailService $email) {}

    /**
     * POST /api/webhooks/mpesa/b2c/result
     * Handles B2C payout success or failure from Safaricom.
     */
    public function b2cResult(Request $request): JsonResponse
    {
        $body   = $request->json()->all();
        $result = $body['Result'] ?? [];

        $resultCode    = $result['ResultCode'] ?? -1;
        $conversationId = $result['ConversationID'] ?? null;

        $order = PaymentOrder::where('provider_ref', $conversationId)->first();

        if (! $order) {
            Log::warning('B2C result: no order found', compact('conversationId'));
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ($resultCode === 0) {
            $order->update(['status' => 'completed']);
            $this->creditWallet($order);
            Log::info('B2C payout success', ['order' => $order->id]);
        } else {
            $order->update(['status' => 'failed']);
            $this->email->sendAdminAlert(
                'B2C Payout Failed',
                "Order {$order->id} failed. Code: {$resultCode}. Desc: " . ($result['ResultDesc'] ?? '')
            );
            Log::warning('B2C payout failed', ['order' => $order->id, 'code' => $resultCode]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    /**
     * POST /api/webhooks/mpesa/b2c/timeout
     */
    public function b2cTimeout(Request $request): JsonResponse
    {
        $body           = $request->json()->all();
        $conversationId = $body['Result']['ConversationID'] ?? null;

        if ($conversationId) {
            PaymentOrder::where('provider_ref', $conversationId)
                ->update(['status' => 'timeout']);
        }

        Log::warning('B2C payout timeout', compact('conversationId'));
        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    /**
     * POST /api/webhooks/mpesa/stk/callback
     * Handles STK Push (C2B) result — credits wallet on success.
     */
    public function stkCallback(Request $request): JsonResponse
    {
        $body      = $request->json()->all();
        $stkResult = $body['Body']['stkCallback'] ?? [];

        $resultCode         = $stkResult['ResultCode'] ?? -1;
        $checkoutRequestId  = $stkResult['CheckoutRequestID'] ?? null;

        $order = PaymentOrder::where('provider_ref', $checkoutRequestId)->first();

        if (! $order) {
            Log::warning('STK callback: no order found', compact('checkoutRequestId'));
            return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
        }

        if ($resultCode === 0) {
            $order->update(['status' => 'completed']);
            $this->creditWallet($order);
            Log::info('STK Push success', ['order' => $order->id]);
        } else {
            $order->update(['status' => 'failed']);
            Log::info('STK Push cancelled/failed', ['order' => $order->id, 'code' => $resultCode]);
        }

        return response()->json(['ResultCode' => 0, 'ResultDesc' => 'Accepted']);
    }

    private function creditWallet(PaymentOrder $order): void
    {
        $amountCents = (int) round((float) $order->amount * 100);

        try {
            DB::transaction(function () use ($order, $amountCents) {
                AffiliateWallet::firstOrCreate(
                    ['user_id' => $order->user_id],
                    ['balance_points' => 0, 'pending_points' => 0, 'lifetime_points' => 0, 'balance_cash_cents' => 0]
                );

                AffiliateWallet::where('user_id', $order->user_id)
                    ->increment('balance_cash_cents', $amountCents);

                WalletLedger::create([
                    'user_id'     => $order->user_id,
                    'amount_cents' => $amountCents,
                    'kind'        => 'topup',
                    'description' => 'M-Pesa top-up',
                    'ref'         => $order->id,
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('Failed to credit wallet', ['order' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}
