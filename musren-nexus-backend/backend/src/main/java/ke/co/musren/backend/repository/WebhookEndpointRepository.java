package ke.co.musren.backend.repository;

import ke.co.musren.backend.model.WebhookEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WebhookEndpointRepository extends JpaRepository<WebhookEndpoint, UUID> {

    List<WebhookEndpoint> findByUserIdAndActiveTrueOrderByCreatedAtDesc(UUID userId);

    Optional<WebhookEndpoint> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Finds all active endpoints for a specific user that subscribe to the given event.
     * Used by WebhookDispatcherService to target the right endpoints per event.
     */
    @Query("SELECT we FROM WebhookEndpoint we JOIN we.events e WHERE we.userId = :userId AND e = :event AND we.active = true")
    List<WebhookEndpoint> findActiveByUserIdAndEvent(@Param("userId") UUID userId, @Param("event") String event);
}
