package com.peervault.common.event;

import com.peervault.common.dto.P2PSignalType;

import java.time.Instant;
import java.util.UUID;

/**
 * Published on {@code p2p-signaling} for every WebRTC offer/answer/ICE-candidate exchanged during
 * a {@code P2P_DIRECT} transfer's handshake. Pure relay, never persisted anywhere (same treatment
 * as {@link TransferProgressEvent} — high-frequency, transient, no lasting business value once the
 * handshake completes): {@code payload} (raw SDP or ICE candidate JSON) is opaque to the backend,
 * which only routes it. {@code fromDeviceId}/{@code toDeviceId} are best-effort direction metadata,
 * not delivery routing (delivery is by the {@code /topic/webrtc/{transferId}} both peers already
 * share) — null for {@code ICE_CANDIDATE}, since the relay endpoint's request body
 * ({@code { candidate }}) gives no way to know which side sent it.
 */
public record P2PSignalEvent(
        String eventId,
        Instant occurredAt,
        String transferId,
        P2PSignalType type,
        String fromDeviceId,
        String toDeviceId,
        String payload
) {

    public static P2PSignalEvent of(String transferId, P2PSignalType type, String fromDeviceId, String toDeviceId, String payload) {
        return new P2PSignalEvent(UUID.randomUUID().toString(), Instant.now(), transferId, type, fromDeviceId, toDeviceId, payload);
    }
}
