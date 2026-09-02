package com.peervault.common.event;

import com.peervault.common.dto.SharedStorageDto;

import java.time.Instant;
import java.util.UUID;

/**
 * Published on {@code share-acceptances} once a {@code ShareRequest} is accepted and its
 * {@link SharedStorageDto} grant is created, so notification-service can push the outcome to the
 * original requester in real time. {@code customMessage} is the accepter's optional reply note
 * from {@code ShareAcceptanceDto} — carried through for display only, never persisted on
 * {@code SharedStorage} itself (that's an access-control grant, not a conversation log).
 */
public record ShareAcceptanceEvent(
        String eventId,
        Instant occurredAt,
        String shareRequestId,
        SharedStorageDto sharedStorage,
        String customMessage
) {

    public static ShareAcceptanceEvent of(String shareRequestId, SharedStorageDto sharedStorage, String customMessage) {
        return new ShareAcceptanceEvent(UUID.randomUUID().toString(), Instant.now(), shareRequestId, sharedStorage, customMessage);
    }
}
