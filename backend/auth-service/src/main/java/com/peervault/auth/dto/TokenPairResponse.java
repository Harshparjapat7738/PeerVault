package com.peervault.auth.dto;

/** Response for {@code POST /refresh}. */
public record TokenPairResponse(
        String accessToken,
        String refreshToken
) {
}
