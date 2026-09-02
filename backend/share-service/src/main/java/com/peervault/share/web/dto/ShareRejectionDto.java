package com.peervault.share.web.dto;

/**
 * Request body for {@code POST /api/v1/share/request/{requestId}/reject}. The whole body is
 * optional (a reject needs no payload at all), so this has no required fields.
 */
public record ShareRejectionDto(
        String reason
) {
}
