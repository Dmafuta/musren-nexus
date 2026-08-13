<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // ─── Supabase ──────────────────────────────────────────────────────────────
    'supabase' => [
        'url'              => env('SUPABASE_URL'),
        'jwt_secret'       => env('SUPABASE_JWT_SECRET'),
        'service_role_key' => env('SUPABASE_SERVICE_ROLE_KEY'),
    ],

    // ─── M-Pesa Daraja ────────────────────────────────────────────────────────
    'mpesa' => [
        'consumer_key'        => env('MPESA_CONSUMER_KEY'),
        'consumer_secret'     => env('MPESA_CONSUMER_SECRET'),
        'shortcode'           => env('MPESA_SHORTCODE', '174379'),
        'passkey'             => env('MPESA_PASSKEY'),
        'initiator_name'      => env('MPESA_INITIATOR_NAME', 'testapi'),
        'security_credential' => env('MPESA_SECURITY_CREDENTIAL'),
        'env'                 => env('MPESA_ENV', 'sandbox'),
        'stk_callback_url'    => env('APP_BASE_URL', 'http://localhost:8081') . '/api/webhooks/mpesa/stk/callback',
        'b2c_result_url'      => env('APP_BASE_URL', 'http://localhost:8081') . '/api/webhooks/mpesa/b2c/result',
        'b2c_timeout_url'     => env('APP_BASE_URL', 'http://localhost:8081') . '/api/webhooks/mpesa/b2c/timeout',
    ],

    // ─── Africa's Talking ─────────────────────────────────────────────────────
    'africastalking' => [
        'username'  => env('AT_USERNAME', 'sandbox'),
        'api_key'   => env('AT_API_KEY'),
        'sender_id' => env('AT_SENDER_ID', 'MUSREN'),
    ],

    // ─── App-level ────────────────────────────────────────────────────────────
    'app_config' => [
        'admin_email'   => env('ADMIN_EMAIL'),
        'support_email' => env('MAIL_SUPPORT', 'support@musren.co.ke'),
    ],

];
