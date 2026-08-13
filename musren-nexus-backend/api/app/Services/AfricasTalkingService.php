<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AfricasTalkingService
{
    private string $username;
    private string $apiKey;
    private string $senderId;
    private string $baseUrl;

    public function __construct()
    {
        $this->username = config('services.africastalking.username', 'sandbox');
        $this->apiKey   = config('services.africastalking.api_key');
        $this->senderId = config('services.africastalking.sender_id', 'MUSREN');
        $this->baseUrl  = $this->username === 'sandbox'
            ? 'https://api.sandbox.africastalking.com/version1'
            : 'https://api.africastalking.com/version1';
    }

    /**
     * Send SMS to one or more recipients.
     * @param string|array $to  Phone number(s) e.g. "+254700000001"
     */
    public function sendSms(string|array $to, string $message): array
    {
        $recipients = is_array($to) ? implode(',', $to) : $to;

        try {
            $response = Http::withHeaders([
                'apiKey' => $this->apiKey,
                'Accept' => 'application/json',
            ])->asForm()->post("{$this->baseUrl}/messaging", [
                'username'  => $this->username,
                'to'        => $recipients,
                'message'   => $message,
                'from'      => $this->senderId,
            ]);

            $data = $response->json();
            Log::info('AT SMS sent', ['recipients' => $recipients, 'response' => $data]);
            return ['success' => true, 'data' => $data];
        } catch (\Throwable $e) {
            Log::error('AT SMS failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Send airtime to a recipient.
     */
    public function sendAirtime(string $phone, string $amount, string $currency = 'KES'): array
    {
        try {
            $response = Http::withHeaders([
                'apiKey' => $this->apiKey,
                'Accept' => 'application/json',
            ])->asForm()->post("{$this->baseUrl}/airtime/send", [
                'username'    => $this->username,
                'recipients'  => json_encode([[
                    'phoneNumber' => $phone,
                    'amount'      => "{$currency} {$amount}",
                ]]),
            ]);

            $data = $response->json();
            Log::info('AT Airtime sent', ['phone' => $phone, 'amount' => $amount]);
            return ['success' => true, 'data' => $data];
        } catch (\Throwable $e) {
            Log::error('AT Airtime failed', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
