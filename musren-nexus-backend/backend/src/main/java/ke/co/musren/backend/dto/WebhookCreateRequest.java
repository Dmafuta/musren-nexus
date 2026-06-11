package ke.co.musren.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.util.List;

public record WebhookCreateRequest(
        @NotBlank @URL @Size(max = 500) String url,
        @NotEmpty List<String> events
) {}
