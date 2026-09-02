package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the DeviceStatus union in src/types.ts */
public enum DeviceStatus {
    ONLINE("online"),
    OFFLINE("offline"),
    SLEEPING("sleeping"),
    FROZEN("frozen"),
    UNAUTHORIZED("unauthorized");

    private final String wire;

    DeviceStatus(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static DeviceStatus fromWire(String wire) {
        for (DeviceStatus v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown device status: " + wire);
    }
}
