package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Mirrors the ShareTransferMode union in src/types.ts. Distinct from {@link TransferMode}
 * (p2p_direct/relay_encrypted): that one describes how transfer-service moves already-owned file
 * bytes, this one describes how a *shared* storage root is reached — a direct WebRTC data channel
 * between the two devices, or server-mediated relay storage — a choice made once, at share-accept
 * time, not per file transfer.
 */
public enum ShareTransferMode {
    DIRECT("direct"),
    RELAY("relay");

    private final String wire;

    ShareTransferMode(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static ShareTransferMode fromWire(String wire) {
        for (ShareTransferMode v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown share transfer mode: " + wire);
    }
}
