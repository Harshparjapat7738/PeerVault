package com.peervault.security.web;

import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DomainEvent;
import com.peervault.security.service.AuditLedgerService;
import com.peervault.security.web.dto.MessageResponse;
import com.peervault.security.web.dto.SimulateAttackRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/security")
public class SecurityController {

    private static final Logger log = LoggerFactory.getLogger(SecurityController.class);

    private static final String REVOKED_BEFORE_KEY = "security:revoked-before";
    private static final String DEFAULT_DEVICE_ID = "dev_m3_max_01";
    private static final String DEFAULT_DEVICE_NAME = "MacBook Pro 16\"";
    private static final int SIMULATION_ITERATIONS = 25;

    private final AuditLedgerService auditLedgerService;
    private final StringRedisTemplate redisTemplate;

    public SecurityController(AuditLedgerService auditLedgerService, StringRedisTemplate redisTemplate) {
        this.auditLedgerService = auditLedgerService;
        this.redisTemplate = redisTemplate;
    }

    /**
     * Drives the real ransomware-shield pipeline end to end — no shortcuts. 25 genuine FILE_DELETE /
     * WARNING events are appended one by one through {@link AuditLedgerService#append(DomainEvent)},
     * the same path every real delete event takes, so the Redis-windowed counter in
     * {@code RansomwareShieldService} trips partway through exactly as it would for a real attack,
     * publishing the real CRITICAL audit event and the real device-freeze command.
     */
    @PostMapping("/simulate-ransomware-attack")
    public ResponseEntity<MessageResponse> simulateRansomwareAttack(@RequestBody(required = false) SimulateAttackRequest request) {
        String deviceId = (request != null && request.deviceId() != null) ? request.deviceId() : DEFAULT_DEVICE_ID;
        String deviceName = (request != null && request.deviceName() != null) ? request.deviceName() : DEFAULT_DEVICE_NAME;

        log.warn("Simulating ransomware mass-deletion attack against device {} ({} iterations)", deviceId, SIMULATION_ITERATIONS);
        for (int i = 1; i <= SIMULATION_ITERATIONS; i++) {
            auditLedgerService.append(DomainEvent.of(AuditEventType.FILE_DELETE, AuditSeverity.WARNING,
                    deviceId, deviceName, "Ransomware Simulation Harness", "Simulated Mass Delete #" + i,
                    "Synthetic rapid-delete event for shield testing.", true));
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(new MessageResponse("Simulated " + SIMULATION_ITERATIONS + " rapid delete events against " +
                        deviceName + ". Check the audit ledger for the shield trip and device freeze command."));
    }

    /**
     * Bumps the Redis global session-revocation epoch that the gateway's {@code JwtAuthGlobalFilter}
     * checks on every request — any access token issued before this instant is rejected even if its
     * own signature/expiry is still valid, regardless of which device or user it belongs to.
     */
    @PostMapping("/revoke-all-sessions")
    public ResponseEntity<Void> revokeAllSessions() {
        redisTemplate.opsForValue().set(REVOKED_BEFORE_KEY, String.valueOf(Instant.now().toEpochMilli()));
        auditLedgerService.append(DomainEvent.of(AuditEventType.AUTH, AuditSeverity.WARNING, null, null,
                "User", "Global Session Revocation",
                "All ephemeral ECDH session tokens and WebSockets disconnected across entire mesh.", true));
        return ResponseEntity.noContent().build();
    }
}
