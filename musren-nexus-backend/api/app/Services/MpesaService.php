<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MpesaService
{
    private string $consumerKey;
    private string $consumerSecret;
    private string $shortcode;
    private string $passkey;
    private string $initiatorName;
    private string $securityCredential;
    private string $env;
    private string $baseUrl;

    public function __construct()
    {
        $this->consumerKey        = config('services.mpesa.consumer_key');
        $this->consumerSecret     = config('services.mpesa.consumer_secret');
        $this->shortcode          = config('services.mpesa.shortcode');
        $this->passkey            = config('services.mpesa.passkey');
        $this->initiatorName      = config('services.mpesa.initiator_name');
        $this->securityCredential = config('services.mpesa.security_credential');
        $this->env                = config('services.mpesa.env', 'sandbox');

        $this->baseUrl = $this->env === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    private function getAccessToken(): ?string
    {
        $response = Http::withBasicAuth($this->consumerKey, $this->consumerSecret)
            ->get("{$this->baseUrl}/oauth/v1/generate?grant_type=client_credentials");

        if ($response->failed()) {
            Log::error('M-Pesa OAuth failed', ['status' => $response->status()]);
            return null;
        }

        return $response->json('access_token');
    }

    /**
     * Initiate STK Push (Lipa Na M-Pesa Online).
     */
    public function stkPush(string $phone, int $amount, string $accountRef, string $callbackUrl): array
    {
        $token = $this->getAccessToken();
        if (! $token) return ['success' => false, 'error' => 'Failed to get M-Pesa token'];

        $timestamp = now()->format('YmdHis');
        $password  = base64_encode($this->shortcode . $this->passkey . $timestamp);

        $response = Http::withToken($token)->post("{$this->baseUrl}/mpesa/stkpush/v1/processrequest", [
            'BusinessShortCode' => $this->shortcode,
            'Password'          => $password,
            'Timestamp'         => $timestamp,
            'TransactionType'   => 'CustomerPayBillOnline',
            'Amount'            => $amount,
            'PartyA'            => ltrim($phone, '+'),
            'PartyB'            => $this->shortcode,
            'PhoneNumber'       => ltrim($phone, '+'),
            'CallBackURL'       => $callbackUrl,
            'AccountReference'  => substr((string) $accountRef, 0, 12),
            'TransactionDesc'   => 'Wallet top-up',
        ]);

        if ($response->failed() || isset($response->json()['errorCode'])) {
            Log::error('STK Push failed', ['body' => $response->json()]);
            return ['success' => false, 'error' => $response->json()['errorMessage'] ?? 'STK Push failed'];
        }

        return [
            'success'              => true,
            'checkout_request_id'  => $response->json('CheckoutRequestID'),
        ];
    }

    /**
     * Initiate B2C payout (withdrawal).
     */
    public function b2cTransfer(string $phone, int $amount, string $payoutRef, string $remarks = 'Payout'): array
    {
        $token = $this->getAccessToken();
        if (! $token) return ['success' => false, 'error' => 'Failed to get M-Pesa token'];

        $resultUrl  = config('services.mpesa.b2c_result_url');
        $timeoutUrl = config('services.mpesa.b2c_timeout_url');

        $response = Http::withToken($token)->post("{$this->baseUrl}/mpesa/b2c/v3/paymentrequest", [
            'OriginatorConversationID' => $payoutRef,
            'InitiatorName'            => $this->initiatorName,
            'SecurityCredential'       => $this->securityCredential,
            'CommandID'                => 'BusinessPayment',
            'Amount'                   => $amount,
            'PartyA'                   => $this->shortcode,
            'PartyB'                   => ltrim($phone, '+'),
            'Remarks'                  => $remarks,
            'QueueTimeOutURL'          => $timeoutUrl,
            'ResultURL'                => $resultUrl,
            'Occassion'                => 'Withdrawal',
        ]);

        if ($response->failed() || isset($response->json()['errorCode'])) {
            Log::error('B2C failed', ['body' => $response->json()]);
            return ['success' => false, 'error' => $response->json()['errorMessage'] ?? 'B2C failed'];
        }

        return [
            'success'          => true,
            'conversation_id'  => $response->json('ConversationID'),
        ];
    }
}
