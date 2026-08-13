<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates our own HS256 JWTs (issued by AuthController).
 * Sets request attributes: auth_user_id, auth_email, auth_roles.
 */
class JwtAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $token = substr($header, 7);

        try {
            $secret  = config('services.jwt.secret');
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));

            $request->attributes->set('auth_user_id', $decoded->sub ?? null);
            $request->attributes->set('auth_email',   $decoded->email ?? null);
            $request->attributes->set('auth_roles',   (array) ($decoded->roles ?? []));
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        return $next($request);
    }
}
