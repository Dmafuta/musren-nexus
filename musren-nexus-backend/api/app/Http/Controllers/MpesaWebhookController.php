<?php

namespace App\Http\Controllers;

use App\Models\PaymentOrder;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
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
        // Credit via Supabase REST (service role key bypasses RLS)
        $supabaseUrl = config('services.supabase.url');
        $serviceKey  = config('services.supabase.service_role_key');

        if (! $supabaseUrl || ! $serviceKey) {
            Log::warning('Supabase not configured — wallet not credited', ['order' => $order->id]);
            return;
        }

        try {
            Http::withHeaders([
                'apikey'        => $serviceKey,
                'Authorization' => "Bearer {$serviceKey}",
                'Content-Type'  => 'application/json',
                'Prefer'        => 'return=minimal',
            ])->post("{$supabaseUrl}/rest/v1/rpc/credit_wallet", [
                'p_user_id' => $order->user_id,
                'p_amount'  => (float) $order->amount,
                'p_ref'     => $order->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to credit wallet', ['order' => $order->id, 'error' => $e->getMessage()]);
        }
    }
}
