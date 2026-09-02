package com.peervault.common.event;

import java.time.Instant;
import java.util.UUID;

/**
 * One-way command published by security-service on {@code device-freeze-command} when the
 * ransomware mass-deletion shield trips, instructing device-service to force-freeze a node.
 */
public record DeviceFreezeCommand(
        String commandId,
        Instant occurredAt,
        String deviceId,
        String reason
) {

    public static DeviceFreezeCommand of(String deviceId, String reason) {
        return new DeviceFreezeCommand(UUID.randomUUID().toString(), Instant.now(), deviceId, reason);
    }
}
