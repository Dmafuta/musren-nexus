package ke.co.musren.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "bulk_sms_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkSmsApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "box_address", length = 200)
    private String boxAddress;

    @Column(name = "director_names", nullable = false, length = 300)
    private String directorNames;

    @Column(name = "sender_id", nullable = false, length = 11)
    private String senderId;

    @Column(nullable = false, columnDefinition = "text")
    private String purpose;

    @Column(name = "preferred_shortcode", length = 20)
    private String preferredShortcode;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 20)
    private String status = "pending"; // pending | approved | rejected

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
