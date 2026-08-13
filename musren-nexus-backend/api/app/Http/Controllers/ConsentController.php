<?php

namespace App\Http\Controllers;

use App\Models\ConsentPolicy;
use App\Models\UserConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsentController extends Controller
{
    /** GET /api/admin/consent/settings */
    public function getSettings(): JsonResponse
    {
        $settings = DB::table('consent_settings')->where('id', 1)->first();
        return response()->json($settings);
    }

    /** PUT /api/admin/consent/settings */
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'active_policy_version'      => 'required|string|max:20',
            'default_analytics'          => 'required|boolean',
            'default_marketing'          => 'required|boolean',
            'default_personalization'    => 'required|boolean',
            'reprompt_on_version_change' => 'required|boolean',
        ]);

        DB::table('consent_settings')->where('id', 1)->update(array_merge($data, ['updated_at' => now()]));

        return response()->json(DB::table('consent_settings')->where('id', 1)->first());
    }

    /** GET /api/admin/consent/policies */
    public function listPolicies(): JsonResponse
    {
        $policies = ConsentPolicy::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $policies]);
    }

    /** GET /api/admin/consent/policy-versions */
    public function policyVersions(): JsonResponse
    {
        $versions = ConsentPolicy::where('active', true)
            ->orderBy('created_at', 'desc')
            ->pluck('version')
            ->unique()
            ->values();
        return response()->json(['data' => $versions]);
    }

    /** POST /api/admin/consent/policies */
    public function createPolicy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind'        => 'required|in:privacy,terms,cookies',
            'version'     => ['required', 'string', 'max:20', 'regex:/^[0-9]+(\.[0-9]+){0,2}$/'],
            'summary'     => 'nullable|string|max:500',
            'content_url' => 'nullable|url|max:500',
        ]);

        $policy = ConsentPolicy::create(array_merge($data, ['active' => true]));

        return response()->json($policy, 201);
    }

    /** PATCH /api/admin/consent/policies/{id} */
    public function togglePolicy(Request $request, string $id): JsonResponse
    {
        $data   = $request->validate(['active' => 'required|boolean']);
        $policy = ConsentPolicy::findOrFail($id);
        $policy->update(['active' => $data['active']]);
        return response()->json($policy->fresh());
    }

    /** DELETE /api/admin/consent/policies/{id} */
    public function deletePolicy(string $id): JsonResponse
    {
        ConsentPolicy::findOrFail($id)->delete();
        return response()->json(['deleted' => true]);
    }

    /** GET /api/consent/my-consents — JWT authenticated */
    public function myConsents(Request $request): JsonResponse
    {
        $userId   = $request->attributes->get('auth_user_id');
        $consents = UserConsent::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get(['id', 'category', 'granted', 'policy_version', 'created_at', 'source']);

        return response()->json(['data' => $consents]);
    }

    /** POST /api/consent — record consent choices */
    public function record(Request $request): JsonResponse
    {
        $data = $request->validate([
            'choices'        => 'required|array',
            'choices.*'      => 'boolean',
            'policy_version' => 'nullable|string|max:20',
            'source'         => 'nullable|string|max:60',
        ]);

        $userId  = $request->attributes->get('auth_user_id');
        $version = $data['policy_version'] ?? '1.0';
        $source  = $data['source'] ?? 'api';

        foreach ($data['choices'] as $category => $granted) {
            UserConsent::create([
                'user_id'        => $userId,
                'category'       => $category,
                'granted'        => $granted,
                'policy_version' => $version,
                'source'         => $source,
            ]);
        }

        return response()->json(['recorded' => true]);
    }
}
