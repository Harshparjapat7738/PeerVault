package com.peervault.share.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for {@code POST /api/v1/share/request/{requestId}/accept}. The share request itself
 * is a path variable, not part of the body. {@code targetDeviceId} is which of the accepting user's
 * devices the grant lands on — decided here, at accept time, not necessarily the same value the
 * requester suggested on {@code ShareRequest.targetDeviceId} at creation time. Permissions and
 * transfer mode aren't re-specified here — they carry over from the original {@code ShareRequest}
 * as-is; accepting doesn't renegotiate terms.
 */
public record ShareAcceptanceDto(
        @NotBlank String targetDeviceId,
        String customMessage
) {
}
