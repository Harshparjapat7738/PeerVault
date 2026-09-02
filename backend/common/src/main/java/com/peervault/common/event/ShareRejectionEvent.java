package com.peervault.common.event;

import java.time.Instant;
import java.util.UUID;

/**
 * Published on {@code share-rejections} when a {@code ShareRequest} is rejected (or expires
 * unactioned), so notification-service can push the outcome to the original requester in real
 * time, and security-service can attribute the action to the actual actor in the audit ledger
 * (Task 7) — {@code rejectedByUserId}, not {@code requesterUserId}, performed this action;
 * {@code requesterDeviceId} is who the denied access request concerned.
 */
public record ShareRejectionEvent(
        String eventId,
        Instant occurredAt,
        String shareRequestId,
        String requesterUserId,
        String requesterDeviceId,
        String rejectedByUserId,
        String reason
) {

    public static ShareRejectionEvent of(String shareRequestId, String requesterUserId, String requesterDeviceId,
                                          String rejectedByUserId, String reason) {
        return new ShareRejectionEvent(UUID.randomUUID().toString(), Instant.now(), shareRequestId, requesterUserId,
                requesterDeviceId, rejectedByUserId, reason);
    }
}
