<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'service'   => 'musren-nexus-backend',
            'status'    => 'UP',
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
