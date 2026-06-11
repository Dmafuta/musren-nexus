package ke.co.musren.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "developer_api_keys")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    /** First 10 chars of the key shown in the UI (e.g. "sk_live_ab") */
    @Column(name = "key_prefix", nullable = false, length = 12)
    private String keyPrefix;

    /** SHA-256 hash of the full key — never store the key in plaintext */
    @Column(name = "key_hash", nullable = false, length = 64)
    private String keyHash;

    @Column(nullable = false, length = 10)
    private String environment; // "sandbox" | "live"

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
