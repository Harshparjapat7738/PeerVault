package com.peervault.auth.dto;

/** Fallback body for {@code POST /logout} when the gateway-injected {@code X-User-Id} header is absent —
 * the userId is recovered from the refresh token's {@code sub} claim instead. Both fields are optional. */
public record LogoutRequest(
        String refreshToken
) {
}
