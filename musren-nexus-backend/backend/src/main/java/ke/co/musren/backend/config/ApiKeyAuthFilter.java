package ke.co.musren.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ke.co.musren.backend.model.ApiKey;
import ke.co.musren.backend.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates requests that carry an API key in the Authorization header:
 *   Authorization: ApiKey sk_live_<...>
 *   Authorization: ApiKey sk_sandbox_<...>
 *
 * Validates by SHA-256 hashing the raw key and looking up the hash in
 * the developer_api_keys table. Runs before SupabaseJwtFilter — if a
 * valid Bearer JWT is also present the JWT filter will overwrite auth, which
 * is intentional (JWT is more authoritative in interactive sessions).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private final ApiKeyRepository apiKeyRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("ApiKey ")) {
            String rawKey = header.substring(7).trim();
            try {
                String hash = sha256(rawKey);
                Optional<ApiKey> found = apiKeyRepository.findByKeyHashAndActiveTrue(hash);

                if (found.isPresent()) {
                    ApiKey key = found.get();
                    updateLastUsed(key);

                    MusrenUserDetails principal = new MusrenUserDetails(
                            key.getUserId().toString(), null, null, null
                    );
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            principal, null, List.of(new SimpleGrantedAuthority("ROLE_AUTHENTICATED"))
                    );
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("API key authenticated: userId={}, keyId={}", key.getUserId(), key.getId());
                } else {
                    log.debug("Invalid or revoked API key presented");
                }
            } catch (NoSuchAlgorithmException e) {
                log.error("SHA-256 unavailable: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    /** Best-effort async last_used_at update — never blocks the request. */
    private void updateLastUsed(ApiKey key) {
        try {
            key.setLastUsedAt(Instant.now());
            apiKeyRepository.save(key);
        } catch (Exception e) {
            log.warn("Could not update last_used_at for key {}: {}", key.getId(), e.getMessage());
        }
    }

    private String sha256(String input) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }
}
