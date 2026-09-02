package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the DeviceType union in src/types.ts */
public enum DeviceType {
    LAPTOP("laptop"),
    DESKTOP("desktop"),
    NAS("nas"),
    PHONE("phone"),
    SERVER("server");

    private final String wire;

    DeviceType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static DeviceType fromWire(String wire) {
        for (DeviceType v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown device type: " + wire);
    }
}
