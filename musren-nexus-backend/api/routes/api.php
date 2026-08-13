<?php

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AffiliateController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BulkSmsController;
use App\Http\Controllers\ConsentController;
use App\Http\Controllers\CorporateTopupController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DeveloperController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MerchantController;
use App\Http\Controllers\MpesaWebhookController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\RoleRequestController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Middleware\JwtAuth;
use App\Http\Middleware\RoleGuard;
use Illuminate\Support\Facades\Route;

// ── Public ──────────────────────────────────────────────────────────────────
Route::get('/health', HealthController::class);
Route::post('/bulk-sms/applications', [BulkSmsController::class, 'store']);
Route::get('/exchange-rates', [CustomerController::class, 'exchangeRates']);
Route::post('/corporate-topup', [CorporateTopupController::class, 'store']);
Route::get('/referral/{code}', [AffiliateController::class, 'trackClick']);

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
    Route::post('roles/select',  [AuthController::class, 'selectRole']);
    Route::get('roles/my-request', [RoleRequestController::class, 'myRequest']);
    Route::post('roles/request', [RoleRequestController::class, 'store']);

    // Customer data
    Route::prefix('customer')->group(function () {
        Route::get('wallet',      [CustomerController::class, 'wallet']);
        Route::get('ledger',      [CustomerController::class, 'ledger']);
        Route::get('withdrawals', [CustomerController::class, 'withdrawals']);
    });

    // Payments
    Route::post('payments/topup', [PaymentController::class, 'topup']);

    // Affiliate
    Route::prefix('affiliate')->group(function () {
        Route::get('wallet',        [AffiliateController::class, 'wallet']);
        Route::get('events',        [AffiliateController::class, 'events']);
        Route::get('withdrawals',   [AffiliateController::class, 'withdrawals']);
        Route::post('withdraw',     [AffiliateController::class, 'withdraw']);
        Route::get('notifications', [AffiliateController::class, 'notifications']);
        Route::get('promotions',    [AffiliateController::class, 'promotions']);
        Route::get('rates',         [AffiliateController::class, 'rates']);
        Route::get('codes',         [AffiliateController::class, 'codes']);
        Route::post('codes',        [AffiliateController::class, 'createCode']);
        Route::get('assets',        [AffiliateController::class, 'assets']);
        Route::get('templates',     [AffiliateController::class, 'templates']);
        Route::post('shares',       [AffiliateController::class, 'logShare']);
        Route::get('channel-stats', [AffiliateController::class, 'channelStats']);
    });

    // Consent
    Route::get('consent/my-consents', [ConsentController::class, 'myConsents']);
    Route::post('consent',            [ConsentController::class, 'record']);

    // Merchant
    Route::prefix('merchant')->middleware(RoleGuard::class . ':merchant,admin,superadmin')->group(function () {
        Route::get('reward-rules',         [MerchantController::class, 'rewardRules']);
        Route::patch('reward-rules/{id}',  [MerchantController::class, 'updateRewardRule']);
    });

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
            Route::get('stats',                        [AdminUserController::class, 'stats']);
            Route::get('users',                        [AdminUserController::class, 'index']);
            Route::post('users/{id}/roles',            [AdminUserController::class, 'assignRole']);
            Route::delete('users/{id}/roles/{role}',   [AdminUserController::class, 'removeRole']);

            Route::get('bulk-sms/applications',        [BulkSmsController::class, 'index']);
            Route::patch('bulk-sms/applications/{id}', [BulkSmsController::class, 'update']);

            Route::get('withdrawals',                  [AdminUserController::class, 'withdrawals']);
            Route::post('withdrawals/{id}/approve',    [WithdrawalController::class, 'approve']);
            Route::post('withdrawals/{id}/reject',     [WithdrawalController::class, 'reject']);

            // Role requests
            Route::get('role-requests',                [RoleRequestController::class, 'index']);
            Route::patch('role-requests/{id}',         [RoleRequestController::class, 'review']);

            // Corporate topup
            Route::get('corporate-topup',              [CorporateTopupController::class, 'index']);
            Route::patch('corporate-topup/{id}',       [CorporateTopupController::class, 'update']);

            // Affiliates
            Route::get('affiliates',                   [AdminUserController::class, 'affiliates']);
            Route::get('affiliate-promotions',         [AffiliateController::class, 'adminPromotions']);
            Route::post('affiliate-promotions',        [AffiliateController::class, 'createPromotion']);
            Route::patch('affiliate-promotions/{id}',  [AffiliateController::class, 'updatePromotion']);
            Route::delete('affiliate-promotions/{id}', [AffiliateController::class, 'deletePromotion']);
            Route::get('affiliate-assets',             [AffiliateController::class, 'adminAssets']);
            Route::post('affiliate-assets',            [AffiliateController::class, 'createAsset']);
            Route::get('affiliate-templates',          [AffiliateController::class, 'adminTemplates']);
            Route::post('affiliate-templates',         [AffiliateController::class, 'createTemplate']);
            Route::get('affiliate-reward-rules',              [AffiliateController::class, 'rewardRules']);
            Route::post('affiliate-reward-rules',             [AffiliateController::class, 'upsertRewardRule']);
            Route::patch('affiliate-reward-rules/{id}',       [AffiliateController::class, 'updateRewardRule']);
            Route::get('affiliate-rates',                     [AffiliateController::class, 'adminRates']);
            Route::post('affiliate-rates',                    [AffiliateController::class, 'createRate']);
            Route::patch('affiliate-rates/{id}',              [AffiliateController::class, 'updateRate']);
            Route::get('affiliate-withdrawals',               [AffiliateController::class, 'adminWithdrawals']);
            Route::post('affiliate-withdrawals/{id}/approve', [AffiliateController::class, 'adminApproveWithdrawal']);
            Route::post('affiliate-withdrawals/{id}/reject',  [AffiliateController::class, 'adminRejectWithdrawal']);
            Route::patch('affiliate-assets/{id}',             [AffiliateController::class, 'updateAsset']);
            Route::delete('affiliate-assets/{id}',            [AffiliateController::class, 'deleteAsset']);
            Route::put('affiliate-templates',                 [AffiliateController::class, 'upsertTemplate']);
            Route::get('affiliate-leaderboard',               [AffiliateController::class, 'leaderboard']);

            // Consent
            Route::get('consent/settings',             [ConsentController::class, 'getSettings']);
            Route::put('consent/settings',             [ConsentController::class, 'updateSettings']);
            Route::get('consent/policies',             [ConsentController::class, 'listPolicies']);
            Route::get('consent/policy-versions',      [ConsentController::class, 'policyVersions']);
            Route::post('consent/policies',            [ConsentController::class, 'createPolicy']);
            Route::patch('consent/policies/{id}',      [ConsentController::class, 'togglePolicy']);
            Route::delete('consent/policies/{id}',     [ConsentController::class, 'deletePolicy']);
        });
});

// ── API-key-authenticated (developer integrations) ───────────────────────────
Route::middleware(\App\Http\Middleware\ApiKeyAuth::class)->prefix('v1')->group(function () {
    Route::get('/ping', fn () => response()->json(['pong' => true]));
});
