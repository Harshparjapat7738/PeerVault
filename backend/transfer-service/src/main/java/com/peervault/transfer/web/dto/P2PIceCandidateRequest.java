package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /api/v1/transfers/p2p/{transferId}/ice-candidate}. */
public record P2PIceCandidateRequest(
        @NotBlank String candidate
) {
}
