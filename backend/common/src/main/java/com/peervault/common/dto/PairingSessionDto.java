package com.peervault.common.dto;

/**
 * Mirrors PairingSession in src/types.ts. {@code sessionId} is the pairing session's own id — the
 * one and only pairing secret, carried solely inside {@code qrPayload}. QR-only: there is no
 * separate human-typed code to show or type.
 */
public record PairingSessionDto(
        String sessionId,
        String qrPayload,
        int expiresInSeconds,
        String deviceFingerprint,
        String ephemeralECDHKey
) {
}
