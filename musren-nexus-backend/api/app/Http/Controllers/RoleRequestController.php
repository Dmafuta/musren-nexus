<?php

namespace App\Http\Controllers;

use App\Models\RoleRequest;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleRequestController extends Controller
{
    /** GET /api/roles/my-request?role=developer */
    public function myRequest(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $role   = $request->query('role');

        $query = RoleRequest::where('user_id', $userId)
            ->orderBy('created_at', 'desc');

        if ($role) {
            $query->where('requested_role', $role);
        }

        return response()->json(['data' => $query->first()]);
    }

    /** POST /api/roles/request */
    public function store(Request $request): JsonResponse
    {
        $data   = $request->validate([
            'requested_role' => 'required|in:developer,affiliate',
            'message'        => 'nullable|string|max:500',
        ]);
        $userId = $request->attributes->get('auth_user_id');

        // Check if there's already a pending request for this role
        $existing = RoleRequest::where('user_id', $userId)
            ->where('requested_role', $data['requested_role'])
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You already have a pending request for this role.'], 422);
        }

        $req = RoleRequest::create([
            'user_id'        => $userId,
            'requested_role' => $data['requested_role'],
            'message'        => $data['message'] ?? null,
        ]);

        return response()->json($req, 201);
    }

    /** GET /api/admin/role-requests?status=pending */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $query = RoleRequest::orderBy('created_at', 'desc');
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        return response()->json(['data' => $query->get()]);
    }

    /** PATCH /api/admin/role-requests/{id} */
    public function review(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status'         => 'required|in:approved,rejected',
            'reviewer_notes' => 'nullable|string|max:1000',
        ]);

        $req = RoleRequest::findOrFail($id);

        $req->update([
            'status'         => $data['status'],
            'reviewer_notes' => $data['reviewer_notes'] ?? null,
            'reviewed_by'    => $request->attributes->get('auth_user_id'),
            'reviewed_at'    => now(),
        ]);

        // If approved, grant the role
        if ($data['status'] === 'approved') {
            UserRole::firstOrCreate([
                'user_id' => $req->user_id,
                'role'    => $req->requested_role,
            ]);
        }

        return response()->json($req->fresh());
    }
}
