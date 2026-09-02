package com.peervault.common.event;

import com.peervault.common.dto.ShareRequestDto;

import java.time.Instant;
import java.util.UUID;

/**
 * Published on {@code share-requests} when a new {@code ShareRequest} is created, carrying the
 * full {@link ShareRequestDto} snapshot so notification-service can push it straight to the
 * target user without a round-trip back to share-service.
 */
public record ShareRequestEvent(
        String eventId,
        Instant occurredAt,
        ShareRequestDto shareRequest
) {

    public static ShareRequestEvent of(ShareRequestDto shareRequest) {
        return new ShareRequestEvent(UUID.randomUUID().toString(), Instant.now(), shareRequest);
    }
}
