package com.peervault.common.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors the OSType union in src/types.ts */
public enum OsType {
    MACOS("macOS"),
    LINUX("Linux"),
    WINDOWS("Windows"),
    ANDROID("Android"),
    IOS("iOS");

    private final String wire;

    OsType(String wire) {
        this.wire = wire;
    }

    @JsonValue
    public String wire() {
        return wire;
    }

    @JsonCreator
    public static OsType fromWire(String wire) {
        for (OsType v : values()) {
            if (v.wire.equalsIgnoreCase(wire)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Unknown OS type: " + wire);
    }
}
