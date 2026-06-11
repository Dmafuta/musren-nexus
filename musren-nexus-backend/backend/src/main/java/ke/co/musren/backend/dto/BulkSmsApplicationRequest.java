package ke.co.musren.backend.dto;

import jakarta.validation.constraints.*;

public record BulkSmsApplicationRequest(
        @NotBlank @Size(max = 200) String company,
        @Size(max = 200) String box,
        @NotBlank @Size(max = 300) String director,
        @NotBlank @Size(max = 11) String senderId,
        @NotBlank String purpose,
        @Size(max = 20) String shortcode,
        @NotBlank @Size(max = 20) String phone,
        @NotBlank @Email @Size(max = 255) String email
) {}
