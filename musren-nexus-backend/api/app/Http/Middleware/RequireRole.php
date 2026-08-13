<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: RequireRole:admin,superadmin
 * Reads the app_role claim injected by SupabaseJwt middleware.
 */
class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = $request->attributes->get('supabase_claims')['app_role'] ?? null;

        if (! $role || ! in_array($role, $roles, true)) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
