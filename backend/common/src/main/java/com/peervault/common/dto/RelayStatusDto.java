package com.peervault.common.dto;

/**
 * Mirrors RelayStatus in src/types.ts — response for GET /api/v1/transfers/relay/{id}/status.
 * Deliberately doesn't expose the raw GridFS file id or other internal bookkeeping — just what a
 * caller needs to know: has upload finished, and can the target device download yet.
 */
public record RelayStatusDto(
        String transferId,
        TransferStatus status,
        boolean uploadComplete,
        boolean downloadAvailable,
        long sizeBytes,
        long transferredBytes,
        String expiresAt
) {
}
