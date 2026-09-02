package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Discriminates the three WebRTC signaling message kinds relayed on {@code p2p-signaling}. */
public enum P2PSignalType {
    OFFER("offer"),
    ANSWER("answer"),
    ICE_CANDIDATE("ice-candidate");

    private final String wire;

    P2PSignalType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static P2PSignalType fromWire(String wire) {
        for (P2PSignalType v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown P2P signal type: " + wire);
    }
}
