package ke.co.musren.backend.controller;

import jakarta.validation.Valid;
import ke.co.musren.backend.dto.BulkSmsApplicationRequest;
import ke.co.musren.backend.model.BulkSmsApplication;
import ke.co.musren.backend.repository.BulkSmsApplicationRepository;
import ke.co.musren.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bulk-sms")
@RequiredArgsConstructor
@Slf4j
public class BulkSmsApplicationController {

    private final BulkSmsApplicationRepository repo;
    private final EmailService emailService;

    /**
     * Public-facing form submission from the website.
     * No auth required — this is the initial inquiry from potential customers.
     */
    @PostMapping("/applications")
    public ResponseEntity<Map<String, String>> submit(@Valid @RequestBody BulkSmsApplicationRequest req) {
        BulkSmsApplication application = BulkSmsApplication.builder()
                .companyName(req.company())
                .boxAddress(req.box())
                .directorNames(req.director())
                .senderId(req.senderId())
                .purpose(req.purpose())
                .preferredShortcode(req.shortcode())
                .phone(req.phone())
                .email(req.email())
                .status("pending")
                .build();

        repo.save(application);
        log.info("Bulk SMS application received: company={}, senderId={}, email={}", req.company(), req.senderId(), req.email());

        // Confirmation email (async, non-blocking)
        emailService.sendBulkSmsApplicationReceived(req.email(), req.company(), req.senderId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Application received. Our team will contact you within 1–2 business days."));
    }

    /**
     * Admin: list all applications, optionally filtered by status.
     */
    @GetMapping("/applications")
    public ResponseEntity<Page<BulkSmsApplication>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {

        PageRequest pageable = PageRequest.of(page, size);
        Page<BulkSmsApplication> result = status != null
                ? repo.findByStatusOrderByCreatedAtDesc(status, pageable)
                : repo.findAllByOrderByCreatedAtDesc(pageable);

        return ResponseEntity.ok(result);
    }

    /**
     * Admin: update application status (approve / reject).
     */
    @PatchMapping("/applications/{id}")
    public ResponseEntity<BulkSmsApplication> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {

        return repo.findById(id).map(app -> {
            String newStatus = body.get("status");
            if (newStatus != null) app.setStatus(newStatus);
            return ResponseEntity.ok(repo.save(app));
        }).orElse(ResponseEntity.notFound().build());
    }
}
