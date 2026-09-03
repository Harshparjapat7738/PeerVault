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
        String pinnedLocation,
        SharingPermissionsDto sharingPermissions,
        /**
         * The account that owns this device (set at pair/confirm time from the caller's JWT). Present
         * on the wire (unlike {@code Device.ownerActor}, which is display text only) because
         * file-service/transfer-service need to compare it against their own caller's {@code X-User-Id}
         * to enforce tenant isolation without a live RPC back into device-service for every check —
         * see backend/CLAUDE.md's device/root-ownership hardening pass.
         */
        String userId
) {
}
