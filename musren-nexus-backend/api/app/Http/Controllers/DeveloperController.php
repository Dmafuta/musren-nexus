<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\WebhookEndpoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeveloperController extends Controller
{
    // ── API Keys ──────────────────────────────────────────────────────────────

    /**
     * GET /api/developer/keys — list caller's API keys.
     */
    public function listKeys(Request $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $keys   = ApiKey::where('user_id', $userId)->orderByDesc('created_at')->get();
        return response()->json($keys);
    }

    /**
     * POST /api/developer/keys — generate a new API key.
     */
    public function createKey(Request $request): JsonResponse
    {
        $data   = $request->validate(['name' => 'required|string|max:100']);
        $userId = $request->attributes->get('auth_user_id');

        $raw    = 'sk_live_' . Str::random(40);
        $hash   = hash('sha256', $raw);
        $prefix = substr($raw, 0, 12) . '...';

        $key = ApiKey::create([
            'user_id'    => $userId,
            'name'       => $data['name'],
            'key_hash'   => $hash,
            'key_prefix' => $prefix,
            'active'     => true,
        ]);

        // Return raw key once — it cannot be recovered after this
        return response()->json([
            'id'     => $key->id,
            'name'   => $key->name,
            'key'    => $raw,   // shown only on creation
            'prefix' => $prefix,
        ], 201);
    }

    /**
     * DELETE /api/developer/keys/{id} — revoke an API key.
     */
    public function revokeKey(Request $request, string $id): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $key    = ApiKey::where('id', $id)->where('user_id', $userId)->firstOrFail();
        $key->update(['active' => false]);
        return response()->json(['message' => 'Key revoked']);
    }

    // ── Webhook Endpoints ─────────────────────────────────────────────────────

    /**
     * GET /api/developer/webhooks
     */
    public function listWebhooks(Request $request): JsonResponse
    {
        $userId   = $request->attributes->get('supabase_user_id');
        $webhooks = WebhookEndpoint::where('user_id', $userId)->get();
        return response()->json($webhooks);
    }

    /**
     * POST /api/developer/webhooks
     */
    public function createWebhook(Request $request): JsonResponse
    {
        $data   = $request->validate([
            'url'    => 'required|url|max:500',
            'events' => 'required|array|min:1',
        ]);
        $userId = $request->attributes->get('auth_user_id');

        $webhook = WebhookEndpoint::create([
            'user_id' => $userId,
            'url'     => $data['url'],
            'events'  => $data['events'],
            'secret'  => Str::random(32),
            'active'  => true,
        ]);

        return response()->json($webhook, 201);
    }

    /**
     * DELETE /api/developer/webhooks/{id}
     */
    public function deleteWebhook(Request $request, string $id): JsonResponse
    {
        $userId  = $request->attributes->get('supabase_user_id');
        $webhook = WebhookEndpoint::where('id', $id)->where('user_id', $userId)->firstOrFail();
        $webhook->delete();
        return response()->json(['message' => 'Webhook deleted']);
    }
}
