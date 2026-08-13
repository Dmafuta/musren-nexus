<?php

namespace App\Http\Controllers;

use App\Models\CorporateTopupInquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CorporateTopupController extends Controller
{
    /** POST /api/corporate-topup — public */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company'           => 'required|string|max:120',
            'industry'          => 'nullable|string|max:80',
            'contact_name'      => 'required|string|max:100',
            'email'             => 'required|email|max:255',
            'phone'             => 'required|string|max:20',
            'role'              => 'nullable|string|max:80',
            'network'           => 'required|string|max:60',
            'estimated_volume'  => 'required|string|max:80',
            'frequency'         => 'required|string|max:60',
            'use_cases'         => 'required|array|min:1',
            'use_cases.*'       => 'string|max:100',
            'preferred_contact' => 'required|in:Email,Phone call,WhatsApp',
            'notes'             => 'nullable|string|max:1000',
        ]);

        $inquiry = CorporateTopupInquiry::create($data);

        return response()->json($inquiry, 201);
    }

    /** GET /api/admin/corporate-topup */
    public function index(): JsonResponse
    {
        $inquiries = CorporateTopupInquiry::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $inquiries]);
    }

    /** PATCH /api/admin/corporate-topup/{id} */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status'       => 'required|in:new,contacted,qualified,rejected',
            'status_notes' => 'nullable|string|max:500',
        ]);

        $inquiry = CorporateTopupInquiry::findOrFail($id);

        $patch = ['status' => $data['status'], 'status_notes' => $data['status_notes'] ?? null];
        if ($data['status'] === 'contacted' && ! $inquiry->contacted_at) {
            $patch['contacted_at'] = now();
        }
        if ($data['status'] === 'qualified' && ! $inquiry->qualified_at) {
            $patch['qualified_at'] = now();
        }

        $inquiry->update($patch);

        return response()->json($inquiry->fresh());
    }
}
