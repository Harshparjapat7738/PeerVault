package com.peervault.common.dto;

/** Mirrors ShareResponse in src/types.ts — returned by the accept/reject endpoints. */
public record ShareResponseDto(
        String shareRequestId,
        ShareStatus status,
        String message
) {
}
