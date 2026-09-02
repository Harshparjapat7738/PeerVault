package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the TransferMode union in src/types.ts */
public enum TransferMode {
    P2P_DIRECT("p2p_direct"),
    RELAY_ENCRYPTED("relay_encrypted");

    private final String wire;

    TransferMode(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static TransferMode fromWire(String wire) {
        for (TransferMode v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown transfer mode: " + wire);
    }
}
