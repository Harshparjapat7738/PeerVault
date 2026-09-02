package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the NATType union in src/types.ts */
public enum NatType {
    FULL_CONE("full_cone"),
    RESTRICTED("restricted"),
    SYMMETRIC("symmetric"),
    UPNP("upnp");

    private final String wire;

    NatType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static NatType fromWire(String wire) {
        for (NatType v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown NAT type: " + wire);
    }
}
