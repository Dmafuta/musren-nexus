<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates Supabase-issued HS256 JWTs.
 * Sets request attributes: supabase_user_id, supabase_role, supabase_email.
 * Returns 401 if the token is missing or invalid on protected routes.
 */
class SupabaseJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $token = substr($header, 7);

        try {
            $secret = config('services.supabase.jwt_secret');
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));

            $request->attributes->set('supabase_user_id', $decoded->sub ?? null);
            $request->attributes->set('supabase_role',    $decoded->role ?? null);
            $request->attributes->set('supabase_email',   $decoded->email ?? null);
            $request->attributes->set('supabase_claims',  (array) $decoded);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        return $next($request);
    }
}
