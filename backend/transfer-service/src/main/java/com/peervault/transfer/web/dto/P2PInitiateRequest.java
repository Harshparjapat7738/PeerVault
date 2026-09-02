package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /api/v1/transfers/p2p/initiate}. */
public record P2PInitiateRequest(
        @NotBlank String fileId,
        @NotBlank String targetDeviceId
) {
}
