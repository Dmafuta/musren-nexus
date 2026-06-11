package ke.co.musren.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WebhookResponse(
        UUID id,
        String url,
        List<String> events,
        boolean active,
        Instant createdAt
) {
    public static WebhookResponse from(ke.co.musren.backend.model.WebhookEndpoint endpoint) {
        return new WebhookResponse(
                endpoint.getId(),
                endpoint.getUrl(),
                endpoint.getEvents(),
                endpoint.isActive(),
                endpoint.getCreatedAt()
        );
    }
}
