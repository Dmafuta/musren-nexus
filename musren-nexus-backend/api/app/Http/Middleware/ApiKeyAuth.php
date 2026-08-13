<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates requests that carry:
 *   Authorization: ApiKey sk_live_<...>
 *
 * SHA-256 hashes the raw key and looks it up in developer_api_keys.
 * On success, sets request attribute supabase_user_id so downstream
 * controllers work the same as with JWT auth.
 */
class ApiKeyAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (! str_starts_with($header, 'ApiKey ')) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $rawKey = trim(substr($header, 7));
        $hash   = hash('sha256', $rawKey);

        $apiKey = ApiKey::where('key_hash', $hash)->where('active', true)->first();

        if (! $apiKey) {
            return response()->json(['error' => 'Invalid or revoked API key'], 401);
        }

        // Best-effort last-used update
        $apiKey->timestamps = false;
        $apiKey->last_used_at = now();
        $apiKey->save();

        $request->attributes->set('supabase_user_id', (string) $apiKey->user_id);
        $request->attributes->set('supabase_role', 'developer');

        return $next($request);
    }
}
