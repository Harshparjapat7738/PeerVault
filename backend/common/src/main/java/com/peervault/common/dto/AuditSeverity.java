package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the AuditSeverity union in src/types.ts */
public enum AuditSeverity {
    INFO("info"),
    WARNING("warning"),
    CRITICAL("critical");

    private final String wire;

    AuditSeverity(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static AuditSeverity fromWire(String wire) {
        for (AuditSeverity v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown audit severity: " + wire);
    }
}
