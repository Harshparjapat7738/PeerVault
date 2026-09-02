package com.peervault.common.dto;

import java.util.List;

/** Mirrors Device in src/types.ts */
public record DeviceDto(
        String id,
        String name,
        DeviceType type,
        OsType os,
        String agentVersion,
        DeviceStatus status,
        String publicKeyFingerprint,
        String ipMasked,
        NatType natType,
        String lastSeen,
        Integer batteryLevel,
        Boolean isCharging,
        long storageTotalBytes,
        long storageUsedBytes,
        List<StorageRootDto> allowedRoots,
        List<String> tags,
        int activeConnectionsCount,
        boolean directP2PCapable,
        Boolean isFavorite,
        String pairedAt,
        String pinnedLocation
) {
}
