<?php

namespace App\Http\Controllers;

use App\Models\WithdrawalRequest;
use App\Services\MpesaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawalController extends Controller
{
    public function __construct(private readonly MpesaService $mpesa) {}

    /**
     * POST /api/admin/withdrawals/{id}/approve
     * Trigger B2C payout for a pending customer withdrawal request.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $withdrawal = WithdrawalRequest::findOrFail($id);

        if ($withdrawal->status !== 'pending') {
            return response()->json(['error' => 'Withdrawal is not pending'], 409);
        }

        $result = $this->mpesa->b2cTransfer(
            phone:     $withdrawal->phone,
            amount:    (int) $withdrawal->amount_value,
            payoutRef: $id,
            remarks:   'Musren Connect withdrawal'
        );

        if (! ($result['success'] ?? false)) {
            return response()->json(['error' => $result['error'] ?? 'B2C failed'], 502);
        }

        $withdrawal->update([
            'status'     => 'processing',
            'payout_ref' => $result['conversation_id'] ?? null,
        ]);

        return response()->json([
            'message'         => 'B2C payout initiated',
            'conversation_id' => $result['conversation_id'] ?? null,
        ]);
    }

    /**
     * POST /api/admin/withdrawals/{id}/reject
     * Reject a pending customer withdrawal request.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'nullable|string|max:500']);

        $withdrawal = WithdrawalRequest::findOrFail($id);

        if ($withdrawal->status !== 'pending') {
            return response()->json(['error' => 'Withdrawal is not pending'], 409);
        }

        $withdrawal->update([
            'status' => 'rejected',
            'notes'  => $data['reason'] ?? null,
        ]);

        return response()->json(['message' => 'Withdrawal rejected']);
    }
}
