<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserRole;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function issueToken(User $user): string
    {
        $roles  = $user->roleNames();
        $secret = config('services.jwt.secret');
        $now    = time();

        $payload = [
            'iss'   => config('app.url'),
            'sub'   => $user->id,
            'email' => $user->email,
            'name'  => $user->name,
            'roles' => $roles,
            'iat'   => $now,
            'exp'   => $now + (60 * 60 * 24 * 7), // 7 days
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    /**
     * GET /api/auth/bootstrap/has-superadmin — public
     */
    public function hasSuperadmin(): JsonResponse
    {
        $exists = UserRole::where('role', 'superadmin')->exists();
        return response()->json(['has_superadmin' => $exists]);
    }

    /**
     * POST /api/auth/bootstrap/claim-superadmin — JWT-authenticated
     * Assigns superadmin role to the calling user if none exists yet.
     */
    public function claimSuperadmin(Request $request): JsonResponse
    {
        if (UserRole::where('role', 'superadmin')->exists()) {
            return response()->json(['claimed' => false, 'message' => 'A superadmin already exists.']);
        }

        $userId = $request->attributes->get('auth_user_id');
        UserRole::firstOrCreate(['user_id' => $userId, 'role' => 'superadmin']);

        return response()->json(['claimed' => true, 'message' => 'You are now Super Admin.']);
    }

    /**
     * POST /api/auth/register
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'nullable|string|max:200',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|max:72',
            'phone'    => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name'     => $data['name'] ?? explode('@', $data['email'])[0],
            'email'    => $data['email'],
            'password' => $data['password'],
            'phone'    => $data['phone'] ?? null,
        ]);

        // Assign default role
        UserRole::create(['user_id' => $user->id, 'role' => 'user']);

        $token = $this->issueToken($user->fresh());

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user->fresh()),
        ], 201);
    }

    /**
     * POST /api/auth/login
     */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email|max:255',
            'password' => 'required|string|max:72',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'token' => $this->issueToken($user),
            'user'  => $this->userPayload($user),
        ]);
    }

    /**
     * GET /api/auth/me — returns current user + fresh roles
     */
    public function me(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $user   = User::findOrFail($userId);

        return response()->json($this->userPayload($user));
    }

    /**
     * POST /api/auth/logout — client should discard the token; nothing to invalidate server-side
     */
    public function logout(): JsonResponse
    {
        return response()->json(['message' => 'Logged out']);
    }

    /**
     * POST /api/roles/select — assign the caller's workspace role (customer/affiliate/merchant/developer)
     */
    public function selectRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|string|in:customer,affiliate,merchant,developer',
        ]);

        $userId = $request->attributes->get('auth_user_id');
        $user   = User::findOrFail($userId);

        UserRole::firstOrCreate(['user_id' => $userId, 'role' => $data['role']]);

        // Issue a fresh token so the new role is reflected immediately
        $token = $this->issueToken($user->fresh());

        return response()->json([
            'token' => $token,
            'user'  => $this->userPayload($user->fresh()),
        ]);
    }

    /**
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email|max:255']);

        $user = User::where('email', $data['email'])->first();

        // Always return success to prevent email enumeration
        if (! $user) {
            return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $data['email']],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $resetUrl = config('app.url') . "/reset-password?token={$token}&email=" . urlencode($data['email']);

        try {
            Mail::html(
                "<p>Click to reset your password: <a href=\"{$resetUrl}\">{$resetUrl}</a></p><p>This link expires in 60 minutes.</p>",
                fn ($m) => $m->to($data['email'])->subject('Reset your Musren Connect password')
            );
        } catch (\Throwable) {
            // Log but don't expose
        }

        return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'                 => 'required|email|max:255',
            'token'                 => 'required|string',
            'password'              => 'required|string|min:8|max:72|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (! $record || ! Hash::check($data['token'], $record->token)) {
            return response()->json(['error' => 'Invalid or expired reset token'], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            return response()->json(['error' => 'Reset token has expired'], 422);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $user->update(['password' => $data['password']]);
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Password reset successfully. Please log in.']);
    }

    private function userPayload(User $user): array
    {
        return [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'roles' => $user->roleNames(),
        ];
    }
}
