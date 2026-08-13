<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserRole;
use App\Models\WithdrawalRequest;
use App\Models\BulkSmsApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    /** GET /api/admin/users — returns flat list for admin UI */
    public function index(Request $request): JsonResponse
    {
        $users = User::with('roles')
            ->orderByDesc('created_at')
            ->paginate(100);

        $rows = collect($users->items())->map(fn ($u) => [
            'user_id' => $u->id,
            'email'   => $u->email,
            'name'    => $u->name,
            'roles'   => $u->roles->pluck('role')->toArray(),
        ]);

        return response()->json([
            'data'         => $rows,
            'total'        => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
        ]);
    }

    /** GET /api/admin/stats — dashboard KPI cards */
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users'        => User::count(),
            'pending_withdrawals'=> WithdrawalRequest::where('status', 'pending')->count(),
            'pending_bulk_sms'   => BulkSmsApplication::where('status', 'pending')->count(),
            'active_affiliates'  => UserRole::where('role', 'affiliate')->count(),
        ]);
    }

    /** GET /api/admin/affiliates */
    public function affiliates(): JsonResponse
    {
        $affiliates = User::whereHas('roles', fn ($q) => $q->where('role', 'affiliate'))
            ->with('wallet')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($affiliates);
    }

    /** GET /api/admin/role-requests */
    public function roleRequests(): JsonResponse
    {
        // Users with role 'user' only — pending role upgrade requests
        $users = User::whereHas('roles', fn ($q) => $q->where('role', 'user'))
            ->whereDoesntHave('roles', fn ($q) => $q->whereIn('role', ['admin', 'superadmin', 'staff', 'developer', 'affiliate', 'customer', 'merchant']))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($users);
    }

    /** POST /api/admin/users/{id}/roles — assign a role */
    public function assignRole(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['role' => 'required|string|in:admin,superadmin,staff,user,developer,affiliate,customer,merchant']);
        $user = User::findOrFail($id);

        UserRole::firstOrCreate(['user_id' => $user->id, 'role' => $data['role']]);

        return response()->json(['message' => "Role '{$data['role']}' assigned."]);
    }

    /** DELETE /api/admin/users/{id}/roles/{role} — remove a role */
    public function removeRole(string $id, string $role): JsonResponse
    {
        UserRole::where('user_id', $id)->where('role', $role)->delete();
        return response()->json(['message' => "Role '{$role}' removed."]);
    }
}
