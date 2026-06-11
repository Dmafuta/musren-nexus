package ke.co.musren.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Fetches user roles from the Supabase user_roles table using the server-side
 * service_role key. Used for server-side role enforcement on privileged endpoints.
 *
 * The service_role key never leaves the server — it is read from application config only.
 */
@Service
@Slf4j
public class SupabaseRoleService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    public SupabaseRoleService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Returns all roles assigned to the given user ID.
     * Returns an empty list on any error so the caller can deny access safely.
     */
    public List<String> getUserRoles(String userId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(supabaseUrl + "/rest/v1/user_roles?user_id=eq." + userId + "&select=role"))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .GET()
                    .timeout(Duration.ofSeconds(8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Failed to fetch roles for user {}: HTTP {}", userId, response.statusCode());
                return List.of();
            }

            JsonNode array = objectMapper.readTree(response.body());
            List<String> roles = new ArrayList<>();
            if (array.isArray()) {
                for (JsonNode node : array) {
                    String role = node.path("role").asText(null);
                    if (role != null) roles.add(role);
                }
            }
            return roles;
        } catch (Exception e) {
            log.error("Error fetching roles for user {}: {}", userId, e.getMessage());
            return List.of();
        }
    }

    /**
     * Returns true if the user has the admin or superadmin role.
     */
    public boolean isAdmin(String userId) {
        List<String> roles = getUserRoles(userId);
        return roles.contains("admin") || roles.contains("superadmin");
    }
}
