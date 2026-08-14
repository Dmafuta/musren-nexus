<?php

namespace App\Http\Controllers;

use App\Models\PaymentOrder;
use App\Services\MpesaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private readonly MpesaService $mpesa) {}

    /**
     * POST /api/payments/topup — initiates STK Push for customer wallet top-up.
     * Requires JWT auth (SupabaseJwt middleware).
     */
    public function topup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'  => 'required|string|max:15',
            'amount' => 'required|numeric|min:1|max:150000',
        ]);

        $userId = $request->attributes->get('auth_user_id');
        $phone  = preg_replace('/^0/', '+254', $data['phone']);
        $amount = (int) $data['amount'];

        // Create a pending payment order
        $order = PaymentOrder::create([
            'user_id'     => $userId,
            'amount'      => $amount,
            'currency'    => 'KES',
            'provider'    => 'mpesa_stk',
            'status'      => 'pending',
            'phone'       => $phone,
            'description' => 'Wallet top-up',
        ]);

        $callbackUrl = config('services.mpesa.stk_callback_url');
        $result = $this->mpesa->stkPush($phone, $amount, $order->id, $callbackUrl);

        if (! ($result['success'] ?? false)) {
            $order->update(['status' => 'failed']);
            return response()->json(['error' => $result['error'] ?? 'STK Push failed'], 502);
        }

        $order->update(['provider_ref' => $result['checkout_request_id'] ?? null]);

        return response()->json([
            'message'             => 'STK Push sent. Enter your M-Pesa PIN to complete.',
            'order_id'            => $order->id,
            'checkout_request_id' => $result['checkout_request_id'] ?? null,
        ]);
    }
}
