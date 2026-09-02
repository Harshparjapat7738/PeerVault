package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the AuditEventType union in src/types.ts */
public enum AuditEventType {
    AUTH("auth"),
    DEVICE_PAIR("device_pair"),
    DEVICE_FREEZE("device_freeze"),
    DEVICE_REVOKE("device_revoke"),
    FILE_ACCESS("file_access"),
    FILE_TRANSFER("file_transfer"),
    FILE_DELETE("file_delete"),
    THREAT_DETECTED("threat_detected"),
    POLICY_CHANGE("policy_change"),
    SANDBOX_VIOLATION("sandbox_violation"),
    SHARE_REQUEST_CREATED("share_request_created"),
    SHARE_REQUEST_ACCEPTED("share_request_accepted"),
    SHARE_REQUEST_REJECTED("share_request_rejected"),
    SHARE_STORAGE_ACCESS_GRANTED("share_storage_access_granted"),
    SHARE_STORAGE_ACCESS_REVOKED("share_storage_access_revoked"),
    SHARE_FILE_ACCESSED("share_file_accessed");

    private final String wire;

    AuditEventType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static AuditEventType fromWire(String wire) {
        for (AuditEventType v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown audit event type: " + wire);
    }
}
