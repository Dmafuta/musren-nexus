<?php

use App\Http\Controllers\BulkSmsController;
use App\Http\Controllers\DeveloperController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MpesaWebhookController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Middleware\ApiKeyAuth;
use App\Http\Middleware\RequireRole;
use App\Http\Middleware\SupabaseJwt;
use Illuminate\Support\Facades\Route;

// ── Public ──────────────────────────────────────────────────────────────────
Route::get('/health', HealthController::class);
Route::post('/bulk-sms/applications', [BulkSmsController::class, 'store']);

// M-Pesa Daraja callbacks — no auth (Safaricom posts here)
Route::prefix('webhooks/mpesa')->group(function () {
    Route::post('b2c/result',    [MpesaWebhookController::class, 'b2cResult']);
    Route::post('b2c/timeout',   [MpesaWebhookController::class, 'b2cTimeout']);
    Route::post('stk/callback',  [MpesaWebhookController::class, 'stkCallback']);
});

// ── JWT-authenticated (Supabase Bearer token) ────────────────────────────────
Route::middleware(SupabaseJwt::class)->group(function () {

    // Customer: wallet top-up via STK Push
    Route::post('/payments/topup', [PaymentController::class, 'topup']);

    // Developer: API keys & webhooks
    Route::prefix('developer')->group(function () {
        Route::get('keys',              [DeveloperController::class, 'listKeys']);
        Route::post('keys',             [DeveloperController::class, 'createKey']);
        Route::delete('keys/{id}',      [DeveloperController::class, 'revokeKey']);

        Route::get('webhooks',          [DeveloperController::class, 'listWebhooks']);
        Route::post('webhooks',         [DeveloperController::class, 'createWebhook']);
        Route::delete('webhooks/{id}',  [DeveloperController::class, 'deleteWebhook']);
    });

    // Admin: requires admin/superadmin/staff role
    Route::prefix('admin')->middleware([RequireRole::class . ':admin,superadmin,staff'])->group(function () {
        Route::get('bulk-sms/applications',          [BulkSmsController::class, 'index']);
        Route::patch('bulk-sms/applications/{id}',   [BulkSmsController::class, 'update']);

        Route::post('withdrawals/{id}/approve',      [WithdrawalController::class, 'approve']);
        Route::post('withdrawals/{id}/reject',       [WithdrawalController::class, 'reject']);
    });
});

// ── API-key-authenticated (developer integrations) ───────────────────────────
Route::middleware(ApiKeyAuth::class)->prefix('v1')->group(function () {
    // Placeholder for developer-facing product APIs (SMS send, USSD, etc.)
    Route::get('/ping', fn () => response()->json(['pong' => true]));
});
