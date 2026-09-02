package com.peervault.common.dto;

/** Mirrors AuditEvent in src/types.ts */
public record AuditEventDto(
        String id,
        String timestamp,
        AuditEventType eventType,
        AuditSeverity severity,
        String deviceId,
        String deviceName,
        String actor,
        String action,
        String details,
        boolean authorized,
        String ipHash,
        String prevLogHash,
        String currentLogHash
) {
}
