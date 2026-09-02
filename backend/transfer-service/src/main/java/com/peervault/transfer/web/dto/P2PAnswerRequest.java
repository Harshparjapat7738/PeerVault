package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /api/v1/transfers/p2p/{transferId}/answer}. */
public record P2PAnswerRequest(
        @NotBlank String sdpAnswer
) {
}
