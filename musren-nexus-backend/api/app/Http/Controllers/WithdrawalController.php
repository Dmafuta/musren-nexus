<?php

namespace App\Http\Controllers;

use App\Services\MpesaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WithdrawalController extends Controller
{
    public function __construct(private readonly MpesaService $mpesa) {}

    /**
     * POST /api/admin/withdrawals/{id}/approve
     * Admin: trigger B2C payout for a pending withdrawal request.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $supabaseUrl = config('services.supabase.url');
        $serviceKey  = config('services.supabase.service_role_key');

        // Fetch the withdrawal request from Supabase
        $resp = Http::withHeaders([
            'apikey'        => $serviceKey,
            'Authorization' => "Bearer {$serviceKey}",
        ])->get("{$supabaseUrl}/rest/v1/withdrawal_requests", [
            'id' => "eq.{$id}",
            'select' => 'id,user_id,amount,phone,status',
        ]);

        $rows = $resp->json();
        if (empty($rows)) {
            return response()->json(['error' => 'Withdrawal not found'], 404);
        }

        $withdrawal = $rows[0];
        if ($withdrawal['status'] !== 'pending') {
            return response()->json(['error' => 'Withdrawal is not pending'], 409);
        }

        $result = $this->mpesa->b2cTransfer(
            phone:     $withdrawal['phone'],
            amount:    (int) $withdrawal['amount'],
            payoutRef: $id,
            remarks:   'Musren Connect withdrawal'
        );

        if (! ($result['success'] ?? false)) {
            return response()->json(['error' => $result['error'] ?? 'B2C failed'], 502);
        }

        // Mark as processing in Supabase
        Http::withHeaders([
            'apikey'        => $serviceKey,
            'Authorization' => "Bearer {$serviceKey}",
            'Prefer'        => 'return=minimal',
        ])->patch("{$supabaseUrl}/rest/v1/withdrawal_requests?id=eq.{$id}", [
            'status'     => 'processing',
            'payout_ref' => $result['conversation_id'] ?? null,
        ]);

        return response()->json(['message' => 'B2C payout initiated', 'conversation_id' => $result['conversation_id'] ?? null]);
    }

    /**
     * POST /api/admin/withdrawals/{id}/reject
     * Admin: reject a pending withdrawal request.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $supabaseUrl = config('services.supabase.url');
        $serviceKey  = config('services.supabase.service_role_key');

        $data = $request->validate(['reason' => 'nullable|string|max:500']);

        Http::withHeaders([
            'apikey'        => $serviceKey,
            'Authorization' => "Bearer {$serviceKey}",
            'Prefer'        => 'return=minimal',
        ])->patch("{$supabaseUrl}/rest/v1/withdrawal_requests?id=eq.{$id}", [
            'status' => 'rejected',
            'notes'  => $data['reason'] ?? null,
        ]);

        return response()->json(['message' => 'Withdrawal rejected']);
    }
}
