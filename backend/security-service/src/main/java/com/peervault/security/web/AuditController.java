package com.peervault.security.web;

import com.peervault.common.dto.AuditEventDto;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.security.domain.AuditLogEntry;
import com.peervault.security.mapper.SecurityMapper;
import com.peervault.security.repo.AuditLogRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Serves the immutable hash-chained audit ledger. The ledger itself is append-only end to end — even
 * the "alerts drawer" ({@code /audit/unread}) is implemented as a per-viewer read cursor stored in
 * Redis rather than any row mutation or deletion; see {@link #clearUnread()}.
 */
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

    private static final String CLEARED_AT_KEY = "audit:cleared-at";
    private static final List<AuditSeverity> ALERT_SEVERITIES = List.of(AuditSeverity.WARNING, AuditSeverity.CRITICAL);

    private final AuditLogRepository auditLogRepository;
    private final SecurityMapper mapper;
    private final StringRedisTemplate redisTemplate;

    public AuditController(AuditLogRepository auditLogRepository, SecurityMapper mapper, StringRedisTemplate redisTemplate) {
        this.auditLogRepository = auditLogRepository;
        this.mapper = mapper;
        this.redisTemplate = redisTemplate;
    }

    @GetMapping
    public List<AuditEventDto> getAuditLog(
            @RequestParam(required = false) AuditSeverity severity,
            @RequestParam(required = false) String deviceId) {
        List<AuditLogEntry> entries;
        if (severity != null && deviceId != null) {
            entries = auditLogRepository.findBySeverityAndDeviceIdOrderBySeqDesc(severity, deviceId);
        } else if (severity != null) {
            entries = auditLogRepository.findBySeverityOrderBySeqDesc(severity);
        } else if (deviceId != null) {
            entries = auditLogRepository.findByDeviceIdOrderBySeqDesc(deviceId);
        } else {
            entries = auditLogRepository.findAllByOrderBySeqDesc();
        }
        return entries.stream().map(mapper::toDto).toList();
    }

    /**
     * The "alerts drawer" feed: WARNING/CRITICAL rows created after the viewer's last-cleared cursor.
     * Deliberately read-only against the ledger — see {@link #clearUnread()}.
     */
    @GetMapping("/unread")
    public List<AuditEventDto> getUnread() {
        Instant clearedAt = readClearedAtCursor();
        return auditLogRepository
                .findBySeverityInAndCreatedAtAfterOrderBySeqDesc(ALERT_SEVERITIES, clearedAt)
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    /**
     * "Clear Alerts" does NOT delete or mutate any ledger row — the audit log is immutable by design
     * (that's the whole point of the hash chain: nothing is ever removed or rewritten). Instead this
     * just advances a per-viewer read cursor (Redis key {@code audit:cleared-at}, epoch millis) past
     * "now", so {@link #getUnread()} stops returning rows older than this moment. All rows remain
     * permanently queryable via {@link #getAuditLog}.
     */
    @DeleteMapping("/unread")
    public ResponseEntity<Void> clearUnread() {
        redisTemplate.opsForValue().set(CLEARED_AT_KEY, String.valueOf(Instant.now().toEpochMilli()));
        return ResponseEntity.noContent().build();
    }

    private Instant readClearedAtCursor() {
        String raw = redisTemplate.opsForValue().get(CLEARED_AT_KEY);
        if (raw == null) {
            return Instant.EPOCH;
        }
        try {
            return Instant.ofEpochMilli(Long.parseLong(raw));
        } catch (NumberFormatException e) {
            return Instant.EPOCH;
        }
    }
}
