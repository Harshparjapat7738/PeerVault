package com.peervault.common.dto;

/** Mirrors RelayUploadResponse in src/types.ts — response for POST /api/v1/transfers/relay/upload. */
public record RelayUploadResponseDto(
        String transferId,
        String relayUrl
) {
}
