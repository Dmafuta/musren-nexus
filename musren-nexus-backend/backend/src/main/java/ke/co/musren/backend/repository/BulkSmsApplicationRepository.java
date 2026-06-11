package ke.co.musren.backend.repository;

import ke.co.musren.backend.model.BulkSmsApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BulkSmsApplicationRepository extends JpaRepository<BulkSmsApplication, UUID> {

    Page<BulkSmsApplication> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<BulkSmsApplication> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
