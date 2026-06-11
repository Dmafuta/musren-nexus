package ke.co.musren.backend.config;

import io.jsonwebtoken.Claims;
import lombok.Getter;

/**
 * Represents the authenticated Supabase user in the Spring Security context.
 * Access via SecurityContextHolder or injected as a method parameter using @AuthenticationPrincipal.
 */
@Getter
public class MusrenUserDetails {

    private final String userId;
    private final String email;
    private final String supabaseRole;
    private final Claims claims;

    public MusrenUserDetails(String userId, String email, String supabaseRole, Claims claims) {
        this.userId = userId;
        this.email = email;
        this.supabaseRole = supabaseRole;
        this.claims = claims;
    }
}
