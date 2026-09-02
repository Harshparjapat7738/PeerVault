package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the STRIDECategory union in src/types.ts */
public enum StrideCategory {
    SPOOFING("Spoofing"),
    TAMPERING("Tampering"),
    REPUDIATION("Repudiation"),
    INFORMATION_DISCLOSURE("Information Disclosure"),
    DENIAL_OF_SERVICE("Denial of Service"),
    ELEVATION_OF_PRIVILEGE("Elevation of Privilege");

    private final String wire;

    StrideCategory(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static StrideCategory fromWire(String wire) {
        for (StrideCategory v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown STRIDE category: " + wire);
    }
}
