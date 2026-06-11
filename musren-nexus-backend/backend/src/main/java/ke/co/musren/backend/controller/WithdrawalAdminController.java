package ke.co.musren.backend.controller;

import ke.co.musren.backend.config.MusrenUserDetails;
import ke.co.musren.backend.service.SupabaseRoleService;
import ke.co.musren.backend.service.WithdrawalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin-only endpoint to trigger a payout for a pending withdrawal request.
 *
 * Role enforcement is server-side: the caller's userId is extracted from their
 * Supabase JWT, and their roles are fetched from Supabase using the server-side
 * service_role key. The service_role key is never exposed to the browser.
 */
@RestController
@RequestMapping("/api/admin/withdrawals")
@RequiredArgsConstructor
@Slf4j
public class WithdrawalAdminController {

    private final WithdrawalService withdrawalService;
    private final SupabaseRoleService roleService;

    @PostMapping("/{withdrawalId}/process")
    public ResponseEntity<Map<String, String>> process(
            @PathVariable String withdrawalId,
            @AuthenticationPrincipal MusrenUserDetails user) {

        // Server-side admin role check — not trusting any client-supplied header
        if (!roleService.isAdmin(user.getUserId())) {
            log.warn("Unauthorized withdrawal process attempt: userId={}", user.getUserId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Admin or superadmin role required."));
        }

        log.info("Withdrawal process requested: withdrawalId={}, by={}", withdrawalId, user.getUserId());

        try {
            withdrawalService.processWithdrawal(withdrawalId);
            return ResponseEntity.ok(Map.of("status", "processing", "withdrawalId", withdrawalId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Withdrawal processing failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Payout failed. Check logs for details."));
        }
    }
}
