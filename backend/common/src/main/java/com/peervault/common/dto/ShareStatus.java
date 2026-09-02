package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the ShareStatus union in src/types.ts */
public enum ShareStatus {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    EXPIRED("expired"),
    REVOKED("revoked");

    private final String wire;

    ShareStatus(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static ShareStatus fromWire(String wire) {
        for (ShareStatus v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown share status: " + wire);
    }
}
