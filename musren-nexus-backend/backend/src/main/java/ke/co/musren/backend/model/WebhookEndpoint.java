package ke.co.musren.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "webhook_endpoints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookEndpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 500)
    private String url;

    /** Supported event types, e.g. withdrawal.approved, api_key.created */
    @ElementCollection
    @CollectionTable(name = "webhook_endpoint_events", joinColumns = @JoinColumn(name = "endpoint_id"))
    @Column(name = "event_type")
    private List<String> events;

    /** HMAC-SHA256 signing secret — sent in X-Musren-Signature header */
    @Column(nullable = false, length = 64)
    private String secret;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
