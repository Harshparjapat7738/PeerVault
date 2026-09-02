package com.peervault.auth.dto;

/** Response for {@code POST /register} and {@code POST /login}. */
public record AuthResponse(
        String userId,
        String email,
        String accessToken,
        String refreshToken
) {
}
