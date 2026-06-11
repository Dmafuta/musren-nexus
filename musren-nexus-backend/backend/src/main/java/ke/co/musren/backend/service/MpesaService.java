package ke.co.musren.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;

/**
 * M-Pesa Daraja API integration.
 * Handles B2C (Business to Customer) payouts for affiliate withdrawals.
 *
 * Sandbox test credentials: developer.safaricom.co.ke → My Apps → Test Credentials
 * Production app: developer.safaricom.co.ke → My Apps → Go Live
 */
@Service
@Slf4j
public class MpesaService {

    @Value("${mpesa.consumer-key}")
    private String consumerKey;

    @Value("${mpesa.consumer-secret}")
    private String consumerSecret;

    @Value("${mpesa.shortcode}")
    private String shortcode;

    @Value("${mpesa.initiator-name}")
    private String initiatorName;

    @Value("${mpesa.security-credential}")
    private String securityCredential;

    @Value("${mpesa.b2c-result-url}")
    private String b2cResultUrl;

    @Value("${mpesa.b2c-timeout-url}")
    private String b2cTimeoutUrl;

    @Value("${mpesa.environment}")
    private String environment;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public MpesaService(ObjectMapper objectMapper) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = objectMapper;
    }

    private String baseUrl() {
        return "sandbox".equals(environment)
                ? "https://sandbox.safaricom.co.ke"
                : "https://api.safaricom.co.ke";
    }

    /**
     * Fetches a short-lived OAuth2 access token from Daraja.
     */
    public String getAccessToken() throws IOException, InterruptedException {
        String credentials = Base64.getEncoder().encodeToString(
                (consumerKey + ":" + consumerSecret).getBytes(StandardCharsets.UTF_8)
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/oauth/v1/generate?grant_type=client_credentials"))
                .header("Authorization", "Basic " + credentials)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("M-Pesa OAuth failed [%d]: %s".formatted(response.statusCode(), response.body()));
        }

        JsonNode node = objectMapper.readTree(response.body());
        return node.get("access_token").asText();
    }

    /**
     * Initiates a B2C (Business to Customer) payment — used to pay out affiliate withdrawals to M-Pesa.
     *
     * @param phoneNumber  Recipient phone in international format: 2547XXXXXXXX
     * @param amountKes    Amount in KES (whole shillings)
     * @param remarks      Short description shown in M-Pesa message (max 100 chars)
     * @param occasion     Reference tag (e.g. withdrawal ID)
     * @return Daraja conversation ID for tracking the async result
     */
    public String sendB2CPayment(String phoneNumber, int amountKes, String remarks, String occasion)
            throws IOException, InterruptedException {

        String accessToken = getAccessToken();

        Map<String, Object> payload = Map.of(
                "InitiatorName", initiatorName,
                "SecurityCredential", securityCredential,
                "CommandID", "BusinessPayment",
                "Amount", amountKes,
                "PartyA", shortcode,
                "PartyB", phoneNumber,
                "Remarks", remarks,
                "QueueTimeOutURL", b2cTimeoutUrl,
                "ResultURL", b2cResultUrl,
                "Occasion", occasion
        );

        String body = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/mpesa/b2c/v1/paymentrequest"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("M-Pesa B2C failed [%d]: %s".formatted(response.statusCode(), response.body()));
        }

        JsonNode node = objectMapper.readTree(response.body());
        String conversationId = node.path("ConversationID").asText();
        log.info("M-Pesa B2C initiated: conversationId={}, phone={}, amount={}", conversationId, phoneNumber, amountKes);
        return conversationId;
    }

    /**
     * STK Push (Lipa Na M-Pesa) — used for customer top-ups / payments inbound to Musren.
     *
     * @param phoneNumber  Payer phone: 2547XXXXXXXX
     * @param amountKes    Amount in KES
     * @param accountRef   Reference shown on the customer's phone (max 12 chars)
     * @param description  Description (max 13 chars)
     * @param callbackUrl  URL for async payment result
     */
    public String stkPush(String phoneNumber, int amountKes, String accountRef,
                          String description, String callbackUrl)
            throws IOException, InterruptedException {

        String accessToken = getAccessToken();
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String password = Base64.getEncoder().encodeToString(
                (shortcode + getPasskey() + timestamp).getBytes(StandardCharsets.UTF_8)
        );

        Map<String, Object> payload = Map.ofEntries(
                Map.entry("BusinessShortCode", shortcode),
                Map.entry("Password", password),
                Map.entry("Timestamp", timestamp),
                Map.entry("TransactionType", "CustomerPayBillOnline"),
                Map.entry("Amount", amountKes),
                Map.entry("PartyA", phoneNumber),
                Map.entry("PartyB", shortcode),
                Map.entry("PhoneNumber", phoneNumber),
                Map.entry("CallBackURL", callbackUrl),
                Map.entry("AccountReference", accountRef),
                Map.entry("TransactionDesc", description)
        );

        String body = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/mpesa/stkpush/v1/processrequest"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(15))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("STK Push failed [%d]: %s".formatted(response.statusCode(), response.body()));
        }

        JsonNode node = objectMapper.readTree(response.body());
        String checkoutId = node.path("CheckoutRequestID").asText();
        log.info("STK Push initiated: checkoutId={}, phone={}, amount={}", checkoutId, phoneNumber, amountKes);
        return checkoutId;
    }

    @Value("${mpesa.passkey:bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919}")
    private String passkey;

    private String getPasskey() {
        return passkey;
    }
}
