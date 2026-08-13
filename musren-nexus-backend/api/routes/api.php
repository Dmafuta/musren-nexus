<?php

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BulkSmsController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DeveloperController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MpesaWebhookController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Middleware\JwtAuth;
use App\Http\Middleware\RoleGuard;
use Illuminate\Support\Facades\Route;

// ── Public ──────────────────────────────────────────────────────────────────
Route::get('/health', HealthController::class);
Route::post('/bulk-sms/applications', [BulkSmsController::class, 'store']);
Route::get('/exchange-rates', [CustomerController::class, 'exchangeRates']);

// M-Pesa Daraja callbacks — no auth (Safaricom posts here)
Route::prefix('webhooks/mpesa')->group(function () {
    Route::post('b2c/result',   [MpesaWebhookController::class, 'b2cResult']);
    Route::post('b2c/timeout',  [MpesaWebhookController::class, 'b2cTimeout']);
    Route::post('stk/callback', [MpesaWebhookController::class, 'stkCallback']);
});

// ── Auth ────────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register',        [AuthController::class, 'register']);
    Route::post('login',           [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password',  [AuthController::class, 'resetPassword']);
    Route::get('bootstrap/has-superadmin', [AuthController::class, 'hasSuperadmin']);

    Route::middleware(JwtAuth::class)->group(function () {
        Route::get('me',      [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('bootstrap/claim-superadmin', [AuthController::class, 'claimSuperadmin']);
    });
});

// ── JWT-authenticated ────────────────────────────────────────────────────────
Route::middleware(JwtAuth::class)->group(function () {

    // Role selection (onboarding)
    Route::post('roles/select', [AuthController::class, 'selectRole']);

    // Customer data
    Route::prefix('customer')->group(function () {
        Route::get('wallet',      [CustomerController::class, 'wallet']);
        Route::get('ledger',      [CustomerController::class, 'ledger']);
        Route::get('withdrawals', [CustomerController::class, 'withdrawals']);
    });

    // Payments
    Route::post('/payments/topup', [PaymentController::class, 'topup']);

    // Developer: API keys & webhooks
    Route::prefix('developer')->group(function () {
        Route::get('keys',             [DeveloperController::class, 'listKeys']);
        Route::post('keys',            [DeveloperController::class, 'createKey']);
        Route::delete('keys/{id}',     [DeveloperController::class, 'revokeKey']);
        Route::get('webhooks',         [DeveloperController::class, 'listWebhooks']);
        Route::post('webhooks',        [DeveloperController::class, 'createWebhook']);
        Route::delete('webhooks/{id}', [DeveloperController::class, 'deleteWebhook']);
    });

    // Admin — requires admin/superadmin/staff role
    Route::prefix('admin')
        ->middleware(RoleGuard::class . ':admin,superadmin,staff')
        ->group(function () {
            Route::get('stats',                         [AdminUserController::class, 'stats']);
            Route::get('users',                         [AdminUserController::class, 'index']);
            Route::get('affiliates',                    [AdminUserController::class, 'affiliates']);
            Route::get('role-requests',                 [AdminUserController::class, 'roleRequests']);
            Route::post('users/{id}/roles',             [AdminUserController::class, 'assignRole']);
            Route::delete('users/{id}/roles/{role}',    [AdminUserController::class, 'removeRole']);

            Route::get('bulk-sms/applications',         [BulkSmsController::class, 'index']);
            Route::patch('bulk-sms/applications/{id}',  [BulkSmsController::class, 'update']);

            Route::post('withdrawals/{id}/approve',     [WithdrawalController::class, 'approve']);
            Route::post('withdrawals/{id}/reject',      [WithdrawalController::class, 'reject']);
        });
});

// ── API-key-authenticated (developer integrations) ───────────────────────────
Route::middleware(\App\Http\Middleware\ApiKeyAuth::class)->prefix('v1')->group(function () {
    Route::get('/ping', fn () => response()->json(['pong' => true]));
});
