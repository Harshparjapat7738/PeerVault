package com.peervault.transfer.domain;

import com.peervault.common.dto.TransferMode;
import com.peervault.common.dto.TransferStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

/**
 * Mirrors {@code TransferTask} in src/types.ts / {@code TransferTaskDto} field-for-field. Timestamps are
 * plain {@code "yyyy-MM-dd HH:mm:ss"} strings (via {@link com.peervault.common.util.TimeFormats}) rather
 * than a wall-clock instant — the progress ticker mirrors the frontend's own mock loop, which advances
 * {@code transferredBytes} by a fixed per-tick increment rather than deriving it from elapsed time.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transfer_tasks")
public class TransferTask {

    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    private String name;
    private String sourceDeviceId;
    private String targetDeviceId;
    private String sourceDeviceName;
    private String targetDeviceName;
    private String sourceFilePath;
    private String targetFilePath;
    private long sizeBytes;
    private long transferredBytes;
    private long speedBytesPerSec;
    private TransferStatus status;
    private TransferMode mode;
    private long chunksTotal;
    private long chunksCompleted;
    private long etaSeconds;
    private String sha256Checksum;
    private String createdAt;
    private String startedAt;
    private String completedAt;
    private String errorReason;

    // --- Relay mode (Task 6) — internal-only, never exposed on TransferTaskDto/the frontend, same
    // treatment as Device.ownerActor: relayFileId is a raw GridFS ObjectId, meaningless off-server. ---

    /** GridFS file id (hex) holding this transfer's real bytes; null until upload finishes, and
     *  set back to null once {@code RelayCleanupScheduler} purges the blob past its TTL. */
    private String relayFileId;

    /** True once the source-side upload leg has fully landed in relay storage. */
    private boolean relayUploadComplete;

    /** TTL deadline for the relay blob (from {@code peervault.transfer.relay.ttl-days}), independent of transfer status. */
    private Instant relayExpiresAt;

    /**
     * True for any transfer whose {@code transferredBytes}/{@code status} are driven by real,
     * chunk-by-chunk I/O in {@code RelayTransferService} rather than the simulated
     * {@code TransferProgressTicker} — sourceOfTruth flag so the ticker knows to leave this task
     * alone entirely rather than racing its own writes against a real upload/download in flight.
     */
    private boolean manualProgress;
}
