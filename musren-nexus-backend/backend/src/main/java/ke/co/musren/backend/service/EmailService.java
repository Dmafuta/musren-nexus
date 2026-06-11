package ke.co.musren.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.support}")
    private String supportAddress;

    /**
     * Sends a transactional email asynchronously.
     */
    @Async
    public void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent: to={}, subject={}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendWithdrawalApproved(String to, String method, double amount, String currency) {
        String html = """
                <p>Hi,</p>
                <p>Your withdrawal request has been <strong>approved</strong>.</p>
                <p><strong>Method:</strong> %s<br>
                   <strong>Amount:</strong> %s %.2f</p>
                <p>Funds will be disbursed shortly. You'll receive an M-Pesa / airtime confirmation.</p>
                <p>— The Musren team</p>
                """.formatted(method, currency, amount);
        sendHtml(to, "Musren: Withdrawal approved", html);
    }

    @Async
    public void sendWithdrawalRejected(String to, String reason) {
        String html = """
                <p>Hi,</p>
                <p>Your withdrawal request has been <strong>rejected</strong>.</p>
                <p><strong>Reason:</strong> %s</p>
                <p>Your points have been returned to your balance.</p>
                <p>Contact <a href="mailto:%s">%s</a> if you have questions.</p>
                <p>— The Musren team</p>
                """.formatted(reason, supportAddress, supportAddress);
        sendHtml(to, "Musren: Withdrawal update", html);
    }

    @Async
    public void sendBulkSmsApplicationReceived(String to, String company, String senderId) {
        String html = """
                <p>Hi,</p>
                <p>We've received your Bulk SMS application for <strong>%s</strong> (Sender ID: <strong>%s</strong>).</p>
                <p>Our team will review your application and get back to you within 1–2 business days.</p>
                <p>— The Musren team</p>
                """.formatted(company, senderId);
        sendHtml(to, "Musren: Bulk SMS application received", html);
    }

    @Async
    public void sendAdminAlert(String to, String subject, String message) {
        String html = """
                <p><strong>Musren admin alert</strong></p>
                <p>%s</p>
                <p>— Musren backend</p>
                """.formatted(message);
        sendHtml(to, "Musren Admin Alert: " + subject, html);
    }

    @Async
    public void sendApiKeyCreated(String to, String keyName, String environment) {
        String html = """
                <p>Hi,</p>
                <p>A new API key <strong>%s</strong> (%s) was created on your Musren developer account.</p>
                <p>If you didn't do this, contact us immediately at <a href="mailto:%s">%s</a>.</p>
                <p>— The Musren team</p>
                """.formatted(keyName, environment, supportAddress, supportAddress);
        sendHtml(to, "Musren: New API key created", html);
    }
}
