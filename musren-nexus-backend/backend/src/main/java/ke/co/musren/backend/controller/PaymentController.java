package ke.co.musren.backend.controller;

import jakarta.validation.Valid;
import ke.co.musren.backend.config.MusrenUserDetails;
import ke.co.musren.backend.model.PaymentOrder;
import ke.co.musren.backend.repository.PaymentOrderRepository;
import ke.co.musren.backend.service.MpesaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Handles customer wallet top-up via M-Pesa STK Push.
 * POST /api/payments/topup  — authenticated
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final MpesaService mpesaService;
    private final PaymentOrderRepository paymentOrderRepository;

    @Value("${app.stk-callback-url:${APP_BASE_URL:http://localhost:8080}/api/webhooks/mpesa/stk/callback}")
    private String stkCallbackUrl;

    @PostMapping("/topup")
    public ResponseEntity<?> topup(
            @Valid @RequestBody TopupRequest req,
            @AuthenticationPrincipal MusrenUserDetails user) {

        if (req.amountKes() < 10) {
            return ResponseEntity.badRequest().body(Map.of("error", "Minimum top-up is KES 10"));
        }

        // Normalise phone: accept 07XXXXXXXX or 2547XXXXXXXX
        String phone = req.phone().startsWith("0")
                ? "254" + req.phone().substring(1)
                : req.phone();

        if (!phone.matches("^2547\\d{8}$") && !phone.matches("^2541\\d{8}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid phone number format"));
        }

        try {
            String checkoutId = mpesaService.stkPush(
                    phone,
                    req.amountKes(),
                    "MusrenWallet",
                    "Top up",
                    stkCallbackUrl
            );

            PaymentOrder order = PaymentOrder.builder()
                    .userId(UUID.fromString(user.getUserId()))
                    .checkoutRequestId(checkoutId)
                    .amountCents(req.amountKes() * 100)
                    .description("Wallet top-up")
                    .status("pending")
                    .build();

            paymentOrderRepository.save(order);
            log.info("STK Push initiated: userId={}, checkoutId={}, amount={}", user.getUserId(), checkoutId, req.amountKes());

            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of("checkoutRequestId", checkoutId, "message", "STK Push sent"));

        } catch (Exception e) {
            log.error("STK Push failed for userId={}: {}", user.getUserId(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to initiate M-Pesa payment. Please try again."));
        }
    }

    record TopupRequest(String phone, int amountKes) {}
}
