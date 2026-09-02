package com.peervault.common.event;

import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;

import java.time.Instant;
import java.util.UUID;

/**
 * The single audit-worthy event envelope published by every business service to its own topic
 * ({@code device-events}, {@code file-events}, {@code transfer-events}, {@code auth-events},
 * {@code security-alerts}). security-service consumes all of these uniformly, appends them to the
 * hash-chained audit ledger, and republishes the resulting {@code AuditEventDto} on
 * {@code audit-log-created}.
 */
public record DomainEvent(
        String eventId,
        Instant occurredAt,
        AuditEventType eventType,
        AuditSeverity severity,
        String deviceId,
        String deviceName,
        String actor,
        String action,
        String details,
        boolean authorized
) {

    public static DomainEvent of(AuditEventType eventType, AuditSeverity severity, String deviceId, String deviceName,
                                  String actor, String action, String details, boolean authorized) {
        return new DomainEvent(UUID.randomUUID().toString(), Instant.now(), eventType, severity,
                deviceId, deviceName, actor, action, details, authorized);
    }
}
