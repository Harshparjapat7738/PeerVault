package com.peervault.common.dto;

/** Mirrors P2PInitiateResponse in src/types.ts — response for POST /api/v1/transfers/p2p/initiate. */
public record P2PInitiateResponseDto(
        String transferId,
        String signalingChannelId
) {
}
