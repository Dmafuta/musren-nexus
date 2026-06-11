package ke.co.musren.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Tracks outbound STK Push (Lipa Na M-Pesa) payment requests.
 * Created when a customer initiates a top-up; updated when the Daraja
 * callback arrives at /api/webhooks/mpesa/stk/callback.
 */
@Entity
@Table(name = "payment_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** The CheckoutRequestID returned by the STK Push API. */
    @Column(name = "checkout_request_id", nullable = false, unique = true, length = 100)
    private String checkoutRequestId;

    /** Amount in Kenya shillings cents (multiply by 100 before storing). */
    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    /** pending | paid | failed | cancelled */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(length = 200)
    private String description;

    /** M-Pesa receipt number, set when status transitions to paid. */
    @Column(name = "mpesa_receipt", length = 50)
    private String mpesaReceipt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
