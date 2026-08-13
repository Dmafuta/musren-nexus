<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    public function sendBulkSmsApplicationReceived(string $toEmail, string $company, string $senderId): void
    {
        try {
            Mail::html(
                $this->bulkSmsConfirmationHtml($company, $senderId),
                function ($m) use ($toEmail, $company) {
                    $m->to($toEmail)
                      ->subject("Bulk SMS Application Received — {$company}");
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to send bulk SMS confirmation email', ['error' => $e->getMessage()]);
        }
    }

    public function sendAdminAlert(string $subject, string $body): void
    {
        $adminEmail = config('services.app.admin_email');
        if (! $adminEmail) return;

        try {
            Mail::raw($body, function ($m) use ($adminEmail, $subject) {
                $m->to($adminEmail)->subject("[Musren Alert] {$subject}");
            });
        } catch (\Throwable $e) {
            Log::warning('Failed to send admin alert', ['error' => $e->getMessage()]);
        }
    }

    private function bulkSmsConfirmationHtml(string $company, string $senderId): string
    {
        return <<<HTML
        <h2>Application Received</h2>
        <p>Dear <strong>{$company}</strong>,</p>
        <p>We have received your Bulk SMS application for sender ID <strong>{$senderId}</strong>.</p>
        <p>Our team will review it and contact you within <strong>1–2 business days</strong>.</p>
        <p>— Musren Connect Team</p>
        HTML;
    }
}
