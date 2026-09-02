package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors ThreatItem['status'] in src/types.ts */
public enum ThreatStatus {
    MITIGATED("mitigated"),
    MONITORING("monitoring"),
    BLOCKED("blocked");

    private final String wire;

    ThreatStatus(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static ThreatStatus fromWire(String wire) {
        for (ThreatStatus v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown threat status: " + wire);
    }
}
