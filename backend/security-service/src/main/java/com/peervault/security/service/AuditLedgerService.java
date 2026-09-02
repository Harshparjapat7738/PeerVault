package com.peervault.security.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventDto;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.util.TimeFormats;
import com.peervault.security.domain.AuditLogEntry;
import com.peervault.security.repo.AuditLogRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.UUID;

/**
 * The audit authority for the whole mesh. Every audit-worthy {@link DomainEvent} — whether it arrives
 * from a Kafka listener on device/file/transfer/auth/security-alerts, or is synthesized directly by
 * the simulate-attack / revoke-all-sessions endpoints — passes through {@link #append(DomainEvent)},
 * which assigns it the next atomic sequence number, SHA-256 hash-chains it to the previous row
 * ({@code currentLogHash = sha256(prevLogHash + payload)}), persists it, and republishes the resulting
 * canonical {@link AuditEventDto} on {@code audit-log-created} for notification-service to relay.
 * <p>
 * {@link RansomwareShieldService} is injected {@code @Lazy}: it calls back into
 * {@link #append(DomainEvent)} to record its own THREAT_DETECTED event, which would otherwise be a
 * circular constructor dependency (Spring disallows eager circular beans by default). The lazy proxy
 * defers resolving the real bean until first use, breaking the cycle at startup.
 */
@Service
public class AuditLedgerService {

    private final AuditLogRepository auditLogRepository;
    private final SequenceGeneratorService sequenceGeneratorService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RansomwareShieldService ransomwareShieldService;

    public AuditLedgerService(AuditLogRepository auditLogRepository,
                               SequenceGeneratorService sequenceGeneratorService,
                               KafkaTemplate<String, Object> kafkaTemplate,
                               @Lazy RansomwareShieldService ransomwareShieldService) {
        this.auditLogRepository = auditLogRepository;
        this.sequenceGeneratorService = sequenceGeneratorService;
        this.kafkaTemplate = kafkaTemplate;
        this.ransomwareShieldService = ransomwareShieldService;
    }

    public AuditEventDto append(DomainEvent event) {
        String prevHash = auditLogRepository.findTopByOrderBySeqDesc()
                .map(AuditLogEntry::getCurrentLogHash)
                .orElse("GENESIS");
        long seq = sequenceGeneratorService.nextAuditSeq();
        String timestamp = TimeFormats.now();
        String ipHash = ipHashFor(event.eventId());
        String raw = prevHash + "|" + event.eventType() + "|" + event.severity() + "|" +
                event.deviceId() + "|" + event.actor() + "|" + event.action() + "|" + event.details() + "|" + timestamp;
        String currentHash = sha256Hex(raw);

        AuditLogEntry entry = new AuditLogEntry(UUID.randomUUID().toString(), seq, timestamp,
                event.eventType(), event.severity(), event.deviceId(), event.deviceName(), event.actor(),
                event.action(), event.details(), event.authorized(), ipHash, prevHash, currentHash, Instant.now());
        auditLogRepository.save(entry);

        AuditEventDto dto = new AuditEventDto(entry.getId(), timestamp, entry.getEventType(), entry.getSeverity(),
                entry.getDeviceId(), entry.getDeviceName(), entry.getActor(), entry.getAction(), entry.getDetails(),
                entry.isAuthorized(), ipHash, prevHash, currentHash);
        kafkaTemplate.send(KafkaTopics.AUDIT_LOG_CREATED, dto);

        // Task 7: SHARE_FILE_ACCESSED carries share-service's own delete-via-shared-storage events
        // (WARNING severity only for the delete case — see SharedStorageService), keyed by
        // event.deviceId() = the actual deleting user's device (owner or recipient, whoever called
        // the delete endpoint), not always the storage owner's — so a shared-storage user tripping
        // this shield gets *their own* device frozen, never the passive owner's.
        boolean isDeleteEvent = event.eventType() == AuditEventType.FILE_DELETE
                || event.eventType() == AuditEventType.SHARE_FILE_ACCESSED;
        if (isDeleteEvent && event.severity() == AuditSeverity.WARNING) {
            ransomwareShieldService.onFileTrashed(event.deviceId(), event.deviceName());
        }

        return dto;
    }

    /**
     * Deterministic demo stand-in for a per-row "IP hash". This is a pure control-plane build:
     * audit-worthy activity arrives here as Kafka {@link DomainEvent}s, not as inbound HTTP requests
     * carrying a real client peer address, so there is no genuine network-layer IP to hash. The value
     * is derived deterministically from the event id purely so the ledger UI has a stable-looking
     * per-row hash — it is NOT a real network-layer IP hash.
     */
    private String ipHashFor(String seed) {
        String hex = sha256Hex(seed);
        return "sha256:" + hex.substring(0, 4) + "..." + hex.substring(hex.length() - 4);
    }

    private String sha256Hex(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
