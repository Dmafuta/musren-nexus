package ke.co.musren.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record ApiKeyResponse(
        UUID id,
        String name,
        String keyPrefix,
        String environment,
        boolean active,
        Instant lastUsedAt,
        Instant createdAt,
        /** Only populated immediately after creation — never stored in plaintext */
        String fullKey
) {
    /** Constructor used when listing keys (no fullKey) */
    public static ApiKeyResponse fromKey(ke.co.musren.backend.model.ApiKey key) {
        return new ApiKeyResponse(
                key.getId(), key.getName(), key.getKeyPrefix(),
                key.getEnvironment(), key.isActive(),
                key.getLastUsedAt(), key.getCreatedAt(), null
        );
    }
}
