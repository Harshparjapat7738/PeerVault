package com.peervault.common.event;

import com.peervault.common.dto.TransferTaskDto;

import java.time.Instant;
import java.util.UUID;

/**
 * High-frequency transfer-progress tick published on {@code transfer-progress}. Only
 * notification-service consumes this — it is intentionally NOT folded into the audit ledger.
 */
public record TransferProgressEvent(
        String eventId,
        Instant occurredAt,
        TransferTaskDto snapshot
) {

    public static TransferProgressEvent of(TransferTaskDto snapshot) {
        return new TransferProgressEvent(UUID.randomUUID().toString(), Instant.now(), snapshot);
    }
}
