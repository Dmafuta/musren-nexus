package ke.co.musren.backend.repository;

import ke.co.musren.backend.model.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    List<ApiKey> findByUserIdAndActiveTrueOrderByCreatedAtDesc(UUID userId);

    Optional<ApiKey> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndNameAndActiveTrue(UUID userId, String name);

    Optional<ApiKey> findByKeyHashAndActiveTrue(String keyHash);
}
