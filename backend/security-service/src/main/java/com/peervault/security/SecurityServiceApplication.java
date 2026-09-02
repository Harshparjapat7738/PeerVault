package com.peervault.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * security-service: the audit authority and ransomware shield for the whole mesh. Consumes every
 * business service's {@code DomainEvent} stream, folds it into an immutable SHA-256 hash-chained
 * audit ledger, republishes normalized {@code AuditEventDto}s for notification-service to fan out,
 * seeds and serves the STRIDE threat matrix, and runs the Redis-windowed mass-deletion trip-wire that
 * force-freezes a device via {@code device-freeze-command}.
 * <p>
 * Note: this package is named {@code com.peervault.security} for domain-naming symmetry with the
 * other services (device/file/transfer/...) — it does NOT use Spring Security, so there is no naming
 * collision with {@code org.springframework.security}. {@code scanBasePackages = "com.peervault"} so
 * {@code com.peervault.common.exception.GlobalExceptionHandler} auto-registers.
 */
@SpringBootApplication(scanBasePackages = "com.peervault")
public class SecurityServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecurityServiceApplication.class, args);
    }
}
