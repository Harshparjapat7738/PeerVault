package com.peervault.common.dto;

import java.util.List;

/** Mirrors ShareRequest in src/types.ts */
public record ShareRequestDto(
        String id,
        String requesterUserId,
        String requesterDeviceId,
        String targetUserId,
        String targetDeviceId,
        String storageRootId,
        List<SharePermission> permissions,
        ShareStatus status,
        ShareTransferMode transferMode,
        String message,
        String expiresAt,
        String createdAt,
        String updatedAt
) {
}
