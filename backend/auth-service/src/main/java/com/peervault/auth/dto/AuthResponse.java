package com.peervault.auth.dto;

/** Response for {@code POST /register} and {@code POST /login}. */
public record AuthResponse(
        String userId,
        String email,
        /** Optional display name — null when the account has none set. */
        String name,
        String accessToken,
        String refreshToken
) {
}
