<?php

namespace App\Http\Controllers;

use App\Models\BulkSmsApplication;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BulkSmsController extends Controller
{
    public function __construct(private readonly EmailService $email) {}

    /**
     * POST /api/bulk-sms/applications — public form submission.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'company'   => 'required|string|max:200',
            'box'       => 'nullable|string|max:200',
            'director'  => 'required|string|max:300',
            'sender_id' => 'required|string|max:11',
            'purpose'   => 'required|string',
            'shortcode' => 'nullable|string|max:20',
            'phone'     => 'required|string|max:20',
            'email'     => 'required|email|max:255',
        ]);

        $app = BulkSmsApplication::create([
            'company_name'       => $data['company'],
            'box_address'        => $data['box'] ?? null,
            'director_names'     => $data['director'],
            'sender_id'          => $data['sender_id'],
            'purpose'            => $data['purpose'],
            'preferred_shortcode'=> $data['shortcode'] ?? null,
            'phone'              => $data['phone'],
            'email'              => $data['email'],
            'status'             => 'pending',
        ]);

        $this->email->sendBulkSmsApplicationReceived($data['email'], $data['company'], $data['sender_id']);

        return response()->json(
            ['message' => 'Application received. Our team will contact you within 1–2 business days.'],
            201
        );
    }

    /**
     * GET /api/bulk-sms/applications — admin: list all (paginated, filterable by status).
     */
    public function index(Request $request): JsonResponse
    {
        $query = BulkSmsApplication::orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * PATCH /api/bulk-sms/applications/{id} — admin: update status.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $app = BulkSmsApplication::findOrFail($id);

        $data = $request->validate([
            'status' => 'required|string|in:pending,approved,rejected',
        ]);

        $app->update(['status' => $data['status']]);

        return response()->json($app);
    }
}
