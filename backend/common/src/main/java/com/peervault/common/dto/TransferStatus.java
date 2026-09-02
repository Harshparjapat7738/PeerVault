package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the TransferStatus union in src/types.ts */
public enum TransferStatus {
    QUEUED("queued"),
    NEGOTIATING("negotiating"),
    TRANSFERRING("transferring"),
    PAUSED("paused"),
    COMPLETED("completed"),
    FAILED("failed"),
    CANCELLED("cancelled");

    private final String wire;

    TransferStatus(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static TransferStatus fromWire(String wire) {
        for (TransferStatus v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown transfer status: " + wire);
    }
}
