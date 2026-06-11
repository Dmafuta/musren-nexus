package ke.co.musren.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables @Async support used by EmailService and WebhookDispatcherService
 * for non-blocking operations. Also exposes an ObjectMapper bean.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
