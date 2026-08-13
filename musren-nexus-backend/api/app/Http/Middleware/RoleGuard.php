<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage in routes: middleware(['jwt.auth', 'role:admin,superadmin'])
 */
class RoleGuard
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $userRoles = $request->attributes->get('auth_roles', []);

        foreach ($roles as $role) {
            if (in_array($role, $userRoles, true)) {
                return $next($request);
            }
        }

        return response()->json(['error' => 'Forbidden'], 403);
    }
}
