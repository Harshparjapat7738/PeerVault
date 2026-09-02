package com.peervault.common.dto;

/** Mirrors TransferTask in src/types.ts */
public record TransferTaskDto(
        String id,
        String name,
        String sourceDeviceId,
        String targetDeviceId,
        String sourceDeviceName,
        String targetDeviceName,
        String sourceFilePath,
        String targetFilePath,
        long sizeBytes,
        long transferredBytes,
        long speedBytesPerSec,
        TransferStatus status,
        TransferMode mode,
        long chunksTotal,
        long chunksCompleted,
        long etaSeconds,
        String sha256Checksum,
        String createdAt,
        String startedAt,
        String completedAt,
        String errorReason
) {
}
