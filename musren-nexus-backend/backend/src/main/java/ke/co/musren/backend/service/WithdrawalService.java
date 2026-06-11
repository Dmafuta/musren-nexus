package ke.co.musren.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Orchestrates the full withdrawal payout flow:
 *  1. Look up the withdrawal request in Supabase (using server-side service_role key)
 *  2. Disburse via M-Pesa (cash) or Africa's Talking (airtime/data)
 *  3. Call Supabase RPC to approve and record the payout reference
 *  4. Send confirmation email
 *  5. Fire "withdrawal.approved" webhook event to the affiliate's registered endpoints
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WithdrawalService {

    private final MpesaService mpesaService;
    private final AfricasTalkingService atService;
    private final EmailService emailService;
    private final WebhookDispatcherService webhookDispatcher;
    private final ObjectMapper objectMapper;

    @Value("${supabase.url}")
    private String supabaseUrl;

    // Server-side only — never passed in from the browser
    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Processes a pending withdrawal request end-to-end.
     *
     * @param withdrawalId  UUID of the withdrawal_requests row
     */
    public void processWithdrawal(String withdrawalId) throws Exception {
        // 1. Fetch withdrawal details from Supabase
        JsonNode withdrawal = fetchWithdrawal(withdrawalId);

        String method = withdrawal.path("method").asText();
        String destination = withdrawal.path("destination").asText();
        int amountPoints = withdrawal.path("amount_points").asInt();
        double amountValue = withdrawal.path("amount_value").asDouble();
        String userId = withdrawal.path("user_id").asText();

        log.info("Processing withdrawal: id={}, method={}, destination={}, points={}, value={}",
                withdrawalId, method, destination, amountPoints, amountValue);

        // 2. Disburse funds
        String payoutRef = switch (method) {
            case "mpesa" -> mpesaService.sendB2CPayment(
                    destination,
                    (int) amountValue / 100, // stored as cents
                    "Musren affiliate payout",
                    withdrawalId
            );
            case "airtime" -> atService.sendAirtime(destination, amountValue / 100.0);
            case "data" -> atService.sendData(destination, amountValue / 100.0);
            default -> throw new IllegalArgumentException("Unknown withdrawal method: " + method);
        };

        // 3. Mark approved in Supabase via RPC
        approveWithdrawalInSupabase(withdrawalId, payoutRef);

        // 4. Send confirmation email (best-effort)
        try {
            String email = fetchUserEmail(userId);
            if (email != null && !email.isBlank()) {
                emailService.sendWithdrawalApproved(email, method, amountValue / 100.0,
                        "mpesa".equals(method) ? "KES" : "");
            }
        } catch (Exception e) {
            log.warn("Could not send withdrawal confirmation email for {}: {}", withdrawalId, e.getMessage());
        }

        // 5. Fire webhook event for the affiliate (async, best-effort)
        webhookDispatcher.dispatch(userId, "withdrawal.approved", Map.of(
                "withdrawalId", withdrawalId,
                "method", method,
                "amountValue", amountValue / 100.0,
                "payoutRef", payoutRef
        ));

        log.info("Withdrawal processed successfully: id={}, payoutRef={}", withdrawalId, payoutRef);
    }

    private JsonNode fetchWithdrawal(String withdrawalId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/withdrawal_requests?id=eq." + withdrawalId + "&select=*"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Failed to fetch withdrawal: " + response.body());
        }

        JsonNode array = objectMapper.readTree(response.body());
        if (!array.isArray() || array.isEmpty()) {
            throw new IllegalArgumentException("Withdrawal not found: " + withdrawalId);
        }
        return array.get(0);
    }

    private void approveWithdrawalInSupabase(String withdrawalId, String payoutRef)
            throws IOException, InterruptedException {

        Map<String, String> rpcArgs = Map.of("_id", withdrawalId, "_payout_ref", payoutRef);
        String body = objectMapper.writeValueAsString(rpcArgs);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/rpc/affiliate_approve_withdrawal"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 && response.statusCode() != 204) {
            throw new IOException("Failed to approve withdrawal in Supabase: " + response.body());
        }
    }

    /**
     * Marks a withdrawal as paid after a successful M-Pesa B2C callback.
     * Looks up the withdrawal by its payout_ref (the ConversationID stored at dispatch time),
     * then updates status to "paid" and replaces payout_ref with the actual M-Pesa TransactionID.
     */
    public void markPaid(String conversationId, String transactionId) throws IOException, InterruptedException {
        // Fetch withdrawal by payout_ref = conversationId
        HttpRequest fetch = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/withdrawal_requests?payout_ref=eq." + conversationId + "&select=id,user_id,method,amount_value&limit=1"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> fetchResp = httpClient.send(fetch, HttpResponse.BodyHandlers.ofString());
        JsonNode array = objectMapper.readTree(fetchResp.body());
        if (!array.isArray() || array.isEmpty()) {
            log.warn("markPaid: no withdrawal found for conversationId={}", conversationId);
            return;
        }
        JsonNode w = array.get(0);
        String withdrawalId = w.path("id").asText();
        String userId = w.path("user_id").asText();

        // PATCH withdrawal: status = paid, payout_ref = transactionId
        String patchBody = objectMapper.writeValueAsString(
                Map.of("status", "paid", "payout_ref", transactionId));

        HttpRequest patch = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/withdrawal_requests?id=eq." + withdrawalId))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("Content-Type", "application/json")
                .header("Prefer", "return=minimal")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(patchBody))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> patchResp = httpClient.send(patch, HttpResponse.BodyHandlers.ofString());
        if (patchResp.statusCode() >= 300) {
            throw new IOException("markPaid PATCH failed [" + patchResp.statusCode() + "]: " + patchResp.body());
        }
        log.info("Withdrawal marked paid: id={}, txId={}", withdrawalId, transactionId);

        // Best-effort: notify affiliate by email
        try {
            String email = fetchUserEmail(userId);
            if (email != null && !email.isBlank()) {
                String method = w.path("method").asText("mpesa");
                double amount = w.path("amount_value").asDouble() / 100.0;
                emailService.sendWithdrawalApproved(email, method, amount, "KES");
            }
        } catch (Exception e) {
            log.warn("Could not send paid email for withdrawal {}: {}", withdrawalId, e.getMessage());
        }
    }

    /**
     * Marks a withdrawal as failed (M-Pesa B2C callback or timeout).
     * Returns points to the affiliate wallet via Supabase RPC.
     */
    public void markFailed(String conversationId, String reason) throws IOException, InterruptedException {
        // Fetch withdrawal by payout_ref = conversationId
        HttpRequest fetch = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/withdrawal_requests?payout_ref=eq." + conversationId + "&select=id&limit=1"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> fetchResp = httpClient.send(fetch, HttpResponse.BodyHandlers.ofString());
        JsonNode array = objectMapper.readTree(fetchResp.body());
        if (!array.isArray() || array.isEmpty()) {
            log.warn("markFailed: no withdrawal found for conversationId={}", conversationId);
            return;
        }
        String withdrawalId = array.get(0).path("id").asText();

        // Call Supabase RPC to reject the withdrawal and return points
        Map<String, String> rpcArgs = Map.of("_id", withdrawalId, "_reason", reason);
        HttpRequest rpc = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/rpc/affiliate_reject_withdrawal"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(rpcArgs)))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> rpcResp = httpClient.send(rpc, HttpResponse.BodyHandlers.ofString());
        if (rpcResp.statusCode() >= 300) {
            throw new IOException("markFailed RPC failed [" + rpcResp.statusCode() + "]: " + rpcResp.body());
        }
        log.info("Withdrawal marked failed: id={}, reason={}", withdrawalId, reason);
    }

    private String fetchUserEmail(String userId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/profiles?user_id=eq." + userId + "&select=email"))
                .header("apikey", serviceRoleKey)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .GET()
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) return null;

        JsonNode array = objectMapper.readTree(response.body());
        if (array.isArray() && !array.isEmpty()) {
            return array.get(0).path("email").asText(null);
        }
        return null;
    }
}
