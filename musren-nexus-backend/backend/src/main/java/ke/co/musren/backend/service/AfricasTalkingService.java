package ke.co.musren.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Africa's Talking API integration.
 * Used for:
 *  - Airtime disbursement (affiliate withdrawal method: airtime)
 *  - Data bundle disbursement (affiliate withdrawal method: data)
 *  - Bulk SMS dispatch
 *
 * Sandbox: use username="sandbox" with any apiKey
 * Docs: https://developers.africastalking.com
 */
@Service
@Slf4j
public class AfricasTalkingService {

    private static final String BASE_URL = "https://api.africastalking.com";
    private static final String SANDBOX_URL = "https://api.sandbox.africastalking.com";

    @Value("${africastalking.username}")
    private String username;

    @Value("${africastalking.api-key}")
    private String apiKey;

    @Value("${africastalking.sender-id}")
    private String senderId;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AfricasTalkingService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
    }

    private String apiBase() {
        return "sandbox".equals(username) ? SANDBOX_URL : BASE_URL;
    }

    /**
     * Sends airtime to a single phone number.
     *
     * @param phoneNumber  International format: +254712345678
     * @param amountKes    Amount in KES (e.g. 50 for KES 50)
     * @return Africa's Talking transaction ID
     */
    public String sendAirtime(String phoneNumber, double amountKes) throws IOException, InterruptedException {
        // AT expects amount as "KES X" string
        String recipientsJson = """
                [{"phoneNumber":"%s","amount":"KES %s"}]
                """.formatted(phoneNumber, amountKes).strip();

        String body = "username=" + encode(username)
                + "&recipients=" + encode(recipientsJson);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiBase() + "/version1/airtime/send"))
                .header("apiKey", apiKey)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 201) {
            throw new IOException("AT airtime failed [%d]: %s".formatted(response.statusCode(), response.body()));
        }

        JsonNode node = objectMapper.readTree(response.body());
        JsonNode responses = node.path("responses");
        if (responses.isArray() && !responses.isEmpty()) {
            JsonNode first = responses.get(0);
            String status = first.path("status").asText();
            String transactionId = first.path("requestId").asText();
            log.info("AT airtime sent: status={}, txId={}, phone={}, amount=KES {}", status, transactionId, phoneNumber, amountKes);
            return transactionId;
        }

        throw new IOException("AT airtime: unexpected response: " + response.body());
    }

    /**
     * Sends an SMS to one or more recipients.
     *
     * @param message      Text body (max 160 chars per segment)
     * @param recipients   Comma-separated phone numbers in international format
     * @return AT messageId
     */
    public String sendSms(String message, String recipients) throws IOException, InterruptedException {
        String body = "username=" + encode(username)
                + "&to=" + encode(recipients)
                + "&message=" + encode(message)
                + "&from=" + encode(senderId);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiBase() + "/version1/messaging"))
                .header("apiKey", apiKey)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 201) {
            throw new IOException("AT SMS failed [%d]: %s".formatted(response.statusCode(), response.body()));
        }

        JsonNode node = objectMapper.readTree(response.body());
        String messageId = node.path("SMSMessageData").path("Recipients").path(0).path("messageId").asText("-");
        log.info("AT SMS sent: messageId={}, to={}", messageId, recipients);
        return messageId;
    }

    /**
     * Sends a data bundle to a phone number.
     * NOTE: Africa's Talking data bundle API is carrier/country specific.
     * This sends airtime equivalent that the user can convert to data.
     * For direct data bundles, integrate with the specific carrier's API.
     *
     * @param phoneNumber  International format: +254712345678
     * @param amountKes    KES value of data to send
     */
    public String sendData(String phoneNumber, double amountKes) throws IOException, InterruptedException {
        // For Kenya, AT doesn't have a direct data bundle API — use airtime as proxy
        // The user can purchase data bundles with received airtime
        log.info("Data disbursement via airtime proxy: phone={}, amount=KES {}", phoneNumber, amountKes);
        return sendAirtime(phoneNumber, amountKes);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
