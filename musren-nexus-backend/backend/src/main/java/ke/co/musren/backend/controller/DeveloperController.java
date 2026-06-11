package ke.co.musren.backend.controller;

import jakarta.validation.Valid;
import ke.co.musren.backend.config.MusrenUserDetails;
import ke.co.musren.backend.dto.ApiKeyCreateRequest;
import ke.co.musren.backend.dto.ApiKeyResponse;
import ke.co.musren.backend.dto.WebhookCreateRequest;
import ke.co.musren.backend.dto.WebhookResponse;
import ke.co.musren.backend.model.ApiKey;
import ke.co.musren.backend.model.WebhookEndpoint;
import ke.co.musren.backend.repository.ApiKeyRepository;
import ke.co.musren.backend.repository.WebhookEndpointRepository;
import ke.co.musren.backend.service.EmailService;
import ke.co.musren.backend.service.WebhookDispatcherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/developer")
@RequiredArgsConstructor
@Slf4j
public class DeveloperController {

    private final ApiKeyRepository apiKeyRepo;
    private final WebhookEndpointRepository webhookRepo;
    private final EmailService emailService;
    private final WebhookDispatcherService webhookDispatcher;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // ─── API Keys ─────────────────────────────────────────────────────────────

    @GetMapping("/keys")
    public ResponseEntity<List<ApiKeyResponse>> listKeys(@AuthenticationPrincipal MusrenUserDetails user) {
        UUID userId = UUID.fromString(user.getUserId());
        List<ApiKeyResponse> keys = apiKeyRepo
                .findByUserIdAndActiveTrueOrderByCreatedAtDesc(userId)
                .stream()
                .map(ApiKeyResponse::fromKey)
                .toList();
        return ResponseEntity.ok(keys);
    }

    @PostMapping("/keys")
    public ResponseEntity<?> createKey(
            @Valid @RequestBody ApiKeyCreateRequest req,
            @AuthenticationPrincipal MusrenUserDetails user) throws NoSuchAlgorithmException {

        UUID userId = UUID.fromString(user.getUserId());

        if (apiKeyRepo.existsByUserIdAndNameAndActiveTrue(userId, req.name())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "A key named '" + req.name() + "' already exists."));
        }

        // Generate a secure random key: sk_live_<32-byte-base64url> or sk_sandbox_<...>
        byte[] rawKey = new byte[32];
        SECURE_RANDOM.nextBytes(rawKey);
        String prefix = "live".equals(req.environment()) ? "sk_live_" : "sk_sandbox_";
        String fullKey = prefix + Base64.getUrlEncoder().withoutPadding().encodeToString(rawKey);

        // Store only the prefix (first 12 chars) and SHA-256 hash
        String keyPrefix = fullKey.substring(0, Math.min(12, fullKey.length()));
        String keyHash = sha256(fullKey);

        ApiKey apiKey = ApiKey.builder()
                .userId(userId)
                .name(req.name())
                .keyPrefix(keyPrefix)
                .keyHash(keyHash)
                .environment(req.environment())
                .active(true)
                .build();

        apiKeyRepo.save(apiKey);
        log.info("API key created: userId={}, name={}, env={}", userId, req.name(), req.environment());

        // Notify by email (async)
        if (user.getEmail() != null) {
            emailService.sendApiKeyCreated(user.getEmail(), req.name(), req.environment());
        }

        // Dispatch webhook event (async, best-effort)
        webhookDispatcher.dispatch(user.getUserId(), "api_key.created", Map.of(
                "keyId", apiKey.getId().toString(),
                "name", apiKey.getName(),
                "keyPrefix", apiKey.getKeyPrefix(),
                "environment", apiKey.getEnvironment()
        ));

        // Return the full key only once — never retrievable again
        ApiKeyResponse response = new ApiKeyResponse(
                apiKey.getId(), apiKey.getName(), apiKey.getKeyPrefix(),
                apiKey.getEnvironment(), true, null, apiKey.getCreatedAt(), fullKey
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/keys/{id}")
    public ResponseEntity<Void> revokeKey(
            @PathVariable UUID id,
            @AuthenticationPrincipal MusrenUserDetails user) {

        UUID userId = UUID.fromString(user.getUserId());

        var found = apiKeyRepo.findByIdAndUserId(id, userId);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        ApiKey key = found.get();
        key.setActive(false);
        apiKeyRepo.save(key);
        log.info("API key revoked: id={}, userId={}", id, userId);
        webhookDispatcher.dispatch(user.getUserId(), "api_key.revoked", Map.of(
                "keyId", key.getId().toString(),
                "name", key.getName(),
                "environment", key.getEnvironment()
        ));
        return ResponseEntity.noContent().build();
    }

    // ─── Webhooks ─────────────────────────────────────────────────────────────

    @GetMapping("/webhooks")
    public ResponseEntity<List<WebhookResponse>> listWebhooks(@AuthenticationPrincipal MusrenUserDetails user) {
        UUID userId = UUID.fromString(user.getUserId());
        List<WebhookResponse> hooks = webhookRepo
                .findByUserIdAndActiveTrueOrderByCreatedAtDesc(userId)
                .stream()
                .map(WebhookResponse::from)
                .toList();
        return ResponseEntity.ok(hooks);
    }

    @PostMapping("/webhooks")
    public ResponseEntity<WebhookResponse> createWebhook(
            @Valid @RequestBody WebhookCreateRequest req,
            @AuthenticationPrincipal MusrenUserDetails user) {

        UUID userId = UUID.fromString(user.getUserId());

        // Generate a signing secret for HMAC-SHA256 verification
        byte[] secretBytes = new byte[32];
        SECURE_RANDOM.nextBytes(secretBytes);
        String secret = HexFormat.of().formatHex(secretBytes);

        WebhookEndpoint endpoint = WebhookEndpoint.builder()
                .userId(userId)
                .url(req.url())
                .events(req.events())
                .secret(secret)
                .active(true)
                .build();

        webhookRepo.save(endpoint);
        log.info("Webhook endpoint created: userId={}, url={}", userId, req.url());

        return ResponseEntity.status(HttpStatus.CREATED).body(WebhookResponse.from(endpoint));
    }

    @DeleteMapping("/webhooks/{id}")
    public ResponseEntity<Void> deleteWebhook(
            @PathVariable UUID id,
            @AuthenticationPrincipal MusrenUserDetails user) {

        UUID userId = UUID.fromString(user.getUserId());

        var found = webhookRepo.findByIdAndUserId(id, userId);
        if (found.isEmpty()) return ResponseEntity.notFound().build();
        WebhookEndpoint hook = found.get();
        hook.setActive(false);
        webhookRepo.save(hook);
        return ResponseEntity.noContent().build();
    }

    private String sha256(String input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
