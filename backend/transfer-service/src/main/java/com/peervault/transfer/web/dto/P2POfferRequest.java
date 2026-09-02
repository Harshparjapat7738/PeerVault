package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /api/v1/transfers/p2p/{transferId}/offer}. */
public record P2POfferRequest(
        @NotBlank String sdpOffer
) {
}
