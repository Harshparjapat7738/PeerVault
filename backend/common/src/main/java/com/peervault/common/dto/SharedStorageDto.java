package com.peervault.common.dto;

import java.util.List;

/** Mirrors SharedStorage in src/types.ts */
public record SharedStorageDto(
        String id,
        String ownerId,
        String ownerDeviceId,
        String sharedWithUserId,
        String sharedWithDeviceId,
        String storageRootId,
        List<SharePermission> permissions,
        ShareTransferMode transferMode,
        boolean isActive,
        String createdAt,
        String revokedAt
) {
}
