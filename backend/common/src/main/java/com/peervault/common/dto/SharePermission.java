package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the SharePermission union in src/types.ts */
public enum SharePermission {
    READ("read"),
    WRITE("write"),
    DELETE("delete");

    private final String wire;

    SharePermission(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static SharePermission fromWire(String wire) {
        for (SharePermission v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown share permission: " + wire);
    }
}
