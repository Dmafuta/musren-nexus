package ke.co.musren.backend.repository;

import ke.co.musren.backend.model.PaymentOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, UUID> {

    Optional<PaymentOrder> findByCheckoutRequestId(String checkoutRequestId);
}
