package ke.co.musren.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ke.co.musren.backend.model.PaymentOrder;
import ke.co.musren.backend.repository.PaymentOrderRepository;
import ke.co.musren.backend.service.EmailService;
import ke.co.musren.backend.service.WithdrawalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Receives asynchronous M-Pesa Daraja callback results.
 * These URLs are registered in mpesa.b2c-result-url and mpesa.b2c-timeout-url.
 * Safaricom calls these endpoints with no Authorization header — they are public.
 */
@RestController
@RequestMapping("/api/webhooks/mpesa")
@RequiredArgsConstructor
@Slf4j
public class MpesaWebhookController {

    private final ObjectMapper objectMapper;
    private final WithdrawalService withdrawalService;
    private final PaymentOrderRepository paymentOrderRepository;
    private final EmailService emailService;

    @Value("${app.admin-email:admin@musren.co.ke}")
    private String adminEmail;

    /**
     * B2C result: fired when Safaricom completes or fails the B2C payment.
     * ResultCode 0 = Success, anything else = failure.
     */
    @PostMapping("/b2c/result")
    public ResponseEntity<Map<String, String>> b2cResult(@RequestBody String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode result = root.path("Result");

            int resultCode   = result.path("ResultCode").asInt(-1);
            String conversationId = result.path("ConversationID").asText();

            if (resultCode == 0) {
                // Extract the M-Pesa transaction ID from ResultParameters
                String transactionId = extractResultParam(result, "TransactionID");
                log.info("M-Pesa B2C success: conversationId={}, transactionId={}", conversationId, transactionId);

                withdrawalService.markPaid(conversationId, transactionId);

            } else {
                String resultDesc = result.path("ResultDesc").asText("Payment failed");
                log.warn("M-Pesa B2C failed: conversationId={}, code={}, desc={}", conversationId, resultCode, resultDesc);

                withdrawalService.markFailed(conversationId, resultDesc);
            }

        } catch (Exception e) {
            log.error("Failed to process M-Pesa B2C result: {}", e.getMessage(), e);
        }

        // Always return 200 — Safaricom will retry on non-200 responses
        return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
    }

    /**
     * B2C timeout: fired when Safaricom cannot complete the B2C within the timeout window.
     */
    @PostMapping("/b2c/timeout")
    public ResponseEntity<Map<String, String>> b2cTimeout(@RequestBody String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String conversationId = root.path("Result").path("ConversationID").asText();
            log.warn("M-Pesa B2C timeout: conversationId={}", conversationId);

            withdrawalService.markFailed(conversationId, "M-Pesa B2C payment timed out");

            // Alert admin
            try {
                emailService.sendAdminAlert(
                    adminEmail,
                    "M-Pesa B2C Timeout",
                    "A B2C payout timed out. ConversationID: " + conversationId +
                    ". Please check the withdrawal_requests table and follow up with Safaricom if needed."
                );
            } catch (Exception emailEx) {
                log.warn("Could not send B2C timeout alert email: {}", emailEx.getMessage());
            }

        } catch (Exception e) {
            log.error("Failed to parse M-Pesa B2C timeout: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
    }

    /**
     * STK Push result: fired when customer completes or cancels a payment.
     */
    @PostMapping("/stk/callback")
    public ResponseEntity<Map<String, String>> stkCallback(@RequestBody String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode body = root.path("Body").path("stkCallback");
            int resultCode       = body.path("ResultCode").asInt(-1);
            String checkoutId    = body.path("CheckoutRequestID").asText();

            Optional<PaymentOrder> orderOpt = paymentOrderRepository.findByCheckoutRequestId(checkoutId);

            if (resultCode == 0) {
                // Extract receipt from CallbackMetadata
                String receipt = extractCallbackMetaItem(body, "MpesaReceiptNumber");
                log.info("STK Push success: checkoutId={}, receipt={}", checkoutId, receipt);

                if (orderOpt.isPresent()) {
                    PaymentOrder order = orderOpt.get();
                    order.setStatus("paid");
                    order.setMpesaReceipt(receipt);
                    paymentOrderRepository.save(order);
                    log.info("PaymentOrder updated to paid: id={}", order.getId());

                    // Credit the customer's wallet in Supabase
                    try {
                        withdrawalService.creditWalletTopup(
                                order.getUserId().toString(),
                                order.getAmountCents(),
                                receipt
                        );
                    } catch (Exception creditEx) {
                        log.error("Failed to credit wallet for order {}: {}", order.getId(), creditEx.getMessage(), creditEx);
                    }
                } else {
                    log.warn("STK callback: no PaymentOrder found for checkoutId={}", checkoutId);
                }

            } else {
                String resultDesc = body.path("ResultDesc").asText("Payment cancelled");
                log.warn("STK Push cancelled/failed: checkoutId={}, desc={}", checkoutId, resultDesc);

                orderOpt.ifPresent(order -> {
                    order.setStatus("failed");
                    paymentOrderRepository.save(order);
                });
            }

        } catch (Exception e) {
            log.error("Failed to parse STK callback: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(Map.of("ResultCode", "0", "ResultDesc", "Accepted"));
    }

    /** Extracts a named value from B2C ResultParameters array. */
    private String extractResultParam(JsonNode result, String key) {
        JsonNode params = result.path("ResultParameters").path("ResultParameter");
        if (params.isArray()) {
            for (JsonNode param : params) {
                if (key.equals(param.path("Key").asText())) {
                    return param.path("Value").asText("");
                }
            }
        }
        return "";
    }

    /** Extracts a named item from STK Push CallbackMetadata items array. */
    private String extractCallbackMetaItem(JsonNode stkCallback, String name) {
        JsonNode items = stkCallback.path("CallbackMetadata").path("Item");
        if (items.isArray()) {
            for (JsonNode item : items) {
                if (name.equals(item.path("Name").asText())) {
                    return item.path("Value").asText("");
                }
            }
        }
        return "";
    }
}
