package ke.co.musren.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ke.co.musren.backend.model.WebhookEndpoint;
import ke.co.musren.backend.repository.WebhookEndpointRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dispatches webhook events to all active registered endpoints that subscribe to the given event.
 *
 * Payloads are wrapped in a standard envelope and signed with HMAC-SHA256 using each
 * endpoint's unique secret. The signature is sent in the X-Musren-Signature header as
 * "sha256=<hex>" so receivers can verify authenticity.
 *
 * Dispatch is fully asynchronous and best-effort — individual delivery failures are logged
 * but do not block the calling thread or affect other endpoints.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookDispatcherService {

    private final WebhookEndpointRepository webhookRepo;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    /**
     * Dispatch an event to all active endpoints for the given user that subscribe to the event.
     * This method is asynchronous — it returns immediately and delivers in a background thread.
     *
     * @param userId  UUID string of the user whose endpoints to notify
     * @param event   Event name, e.g. "api_key.created", "withdrawal.approved"
     * @param data    Event payload object (will be serialized to JSON)
     */
    @Async
    public void dispatch(String userId, String event, Object data) {
        List<WebhookEndpoint> endpoints;
        try {
            endpoints = webhookRepo.findActiveByUserIdAndEvent(UUID.fromString(userId), event);
        } catch (Exception e) {
            log.error("Failed to query webhook endpoints for event={}, userId={}: {}", event, userId, e.getMessage());
            return;
        }

        if (endpoints.isEmpty()) return;

        String payload;
        try {
            Map<String, Object> envelope = Map.of(
                    "event", event,
                    "timestamp", Instant.now().toString(),
                    "data", data
            );
            payload = objectMapper.writeValueAsString(envelope);
        } catch (Exception e) {
            log.error("Failed to serialize webhook payload for event={}: {}", event, e.getMessage());
            return;
        }

        for (WebhookEndpoint endpoint : endpoints) {
            deliverToEndpoint(endpoint, event, payload);
        }
    }

    private void deliverToEndpoint(WebhookEndpoint endpoint, String event, String payload) {
        try {
            String signature = hmacSha256(endpoint.getSecret(), payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint.getUrl()))
                    .header("Content-Type", "application/json")
                    .header("X-Musren-Signature", "sha256=" + signature)
                    .header("X-Musren-Event", event)
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("Webhook delivered: endpointId={}, url={}, event={}, status={}",
                    endpoint.getId(), endpoint.getUrl(), event, response.statusCode());

            if (response.statusCode() >= 400) {
                log.warn("Webhook delivery non-2xx: url={}, status={}, body={}",
                        endpoint.getUrl(), response.statusCode(),
                        response.body().substring(0, Math.min(200, response.body().length())));
            }
        } catch (Exception e) {
            log.warn("Webhook delivery failed: endpointId={}, url={}, error={}",
                    endpoint.getId(), endpoint.getUrl(), e.getMessage());
        }
    }

    private String hmacSha256(String secret, String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(keySpec);
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
