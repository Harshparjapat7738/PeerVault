package com.peervault.device.web.dto;

import com.peervault.common.dto.DeviceStatus;

/** Body for {@code PATCH /{id}/heartbeat} — every field optional, apply whichever are present. */
public record HeartbeatRequest(
        DeviceStatus status,
        Integer batteryLevel,
        Boolean isCharging,
        Long storageUsedBytes
) {
}
