package com.peervault.common.dto;

/** Mirrors PairingSession in src/types.ts */
public record PairingSessionDto(
        String pairingCode,
        String qrPayload,
        int expiresInSeconds,
        String deviceFingerprint,
        String ephemeralECDHKey
) {
}
