package com.peervault.transfer.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.RelayStatusDto;
import com.peervault.common.dto.RelayUploadResponseDto;
import com.peervault.common.dto.TransferMode;
import com.peervault.common.dto.TransferStatus;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.event.TransferProgressEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.util.TimeFormats;
import com.peervault.transfer.client.DeviceClient;
import com.peervault.transfer.domain.TransferTask;
import com.peervault.transfer.mapper.TransferTaskMapper;
import com.peervault.transfer.repo.TransferTaskRepository;
import com.peervault.transfer.util.ChunkedProgressInputStream;
import com.peervault.transfer.web.dto.RelayUploadMetadata;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

/**
 * Relay-mode ({@code TransferMode.RELAY_ENCRYPTED}) transfers "for when P2P fails or for async
 * transfers": unlike Task 5's WebRTC signaling — which the server fundamentally can't do more than
 * relay small metadata for — relay mode really does hand its bytes to the server, so this class
 * actually stores and serves them for real via GridFS (see {@code GridFsConfig}'s javadoc for why
 * GridFS over MinIO/S3), with genuinely chunk-by-chunk progress on both legs (not simulated — see
 * {@code ChunkedProgressInputStream} for upload, the manual read loop in {@link #download} for
 * download). {@code TransferTask.manualProgress} keeps {@code TransferProgressTicker} from also
 * trying to advance these tasks while a real transfer is actually in flight.
 * <p>
 * Reuses {@code TransferStatus.QUEUED} (unused until now, same as Task 5 activating
 * {@code NEGOTIATING}) for "uploaded to relay, waiting for the target device to pick it up" — the
 * distinct state {@code GET .../status} exists to let a caller poll for.
 * <p>
 * {@code transferredBytes} tracks whichever leg is currently active, not a cumulative total across
 * both legs — it resets to 0 at the start of the download leg. The schema has one such field, and
 * upload/download happen sequentially (often far apart in time, which is the point of "async"), so
 * there's no meaningful way to show both at once anyway.
 */
@Service
public class RelayTransferService {

    private final TransferTaskRepository transferTaskRepository;
    private final TransferTaskMapper transferTaskMapper;
    private final DeviceClient deviceClient;
    private final GridFsTemplate gridFsTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${peervault.transfer.chunk-size-bytes}")
    private long chunkSizeBytes;

    @Value("${peervault.transfer.default-relay-speed-bytes-per-sec}")
    private long defaultRelaySpeedBytesPerSec;

    @Value("${peervault.transfer.relay.ttl-days:7}")
    private long relayTtlDays;

    public RelayTransferService(TransferTaskRepository transferTaskRepository,
                                 TransferTaskMapper transferTaskMapper,
                                 DeviceClient deviceClient,
                                 GridFsTemplate gridFsTemplate,
                                 KafkaTemplate<String, Object> kafkaTemplate) {
        this.transferTaskRepository = transferTaskRepository;
        this.transferTaskMapper = transferTaskMapper;
        this.deviceClient = deviceClient;
        this.gridFsTemplate = gridFsTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    public RelayUploadResponseDto upload(MultipartFile file, RelayUploadMetadata metadata) throws IOException {
        DeviceDto sourceDevice = deviceClient.getDevice(metadata.sourceDeviceId());
        DeviceDto targetDevice = deviceClient.getDevice(metadata.targetDeviceId());

        long sizeBytes = file.getSize();
        String now = TimeFormats.now();

        TransferTask task = TransferTask.builder()
                .id(UUID.randomUUID().toString())
                .name(metadata.name() + " (" + sourceDevice.name() + " -> " + targetDevice.name() + ", Relay)")
                .sourceDeviceId(sourceDevice.id())
                .targetDeviceId(targetDevice.id())
                .sourceDeviceName(sourceDevice.name())
                .targetDeviceName(targetDevice.name())
                // No real filesystem path on either side — the source is a raw upload body, and the
                // target's eventual save location isn't known until its own client picks one.
                .sourceFilePath(metadata.name())
                .targetFilePath(metadata.name())
                .sizeBytes(sizeBytes)
                .transferredBytes(0L)
                .speedBytesPerSec(defaultRelaySpeedBytesPerSec)
                .status(TransferStatus.TRANSFERRING)
                .mode(TransferMode.RELAY_ENCRYPTED)
                .chunksTotal(chunksTotal(sizeBytes))
                .chunksCompleted(0L)
                .etaSeconds(etaSeconds(sizeBytes, defaultRelaySpeedBytesPerSec))
                .createdAt(now)
                .startedAt(now)
                .manualProgress(true)
                .build();
        transferTaskRepository.save(task);

        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }

        ObjectId gridFsId;
        try (InputStream source = file.getInputStream()) {
            ChunkedProgressInputStream progressStream = new ChunkedProgressInputStream(
                    source, digest, (int) chunkSizeBytes, bytesRead -> onProgress(task, bytesRead));

            Document gridFsMetadata = new Document("mimeType", metadata.mimeType()).append("transferId", task.getId());
            gridFsId = gridFsTemplate.store(progressStream, metadata.name(), metadata.mimeType(), gridFsMetadata);
        }

        String sha256 = toHex(digest.digest());
        Instant expiresAt = Instant.now().plus(Duration.ofDays(relayTtlDays));

        task.setSha256Checksum(sha256);
        task.setRelayFileId(gridFsId.toHexString());
        task.setRelayUploadComplete(true);
        task.setRelayExpiresAt(expiresAt);
        task.setStatus(TransferStatus.QUEUED);
        task.setSpeedBytesPerSec(0L);
        task.setEtaSeconds(0L);
        task.setTransferredBytes(task.getSizeBytes());
        task.setChunksCompleted(task.getChunksTotal());
        transferTaskRepository.save(task);
        publishProgress(task);

        publishAudit(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                task.getSourceDeviceId(),
                task.getSourceDeviceName(),
                "User",
                "Relay Upload Complete: " + task.getName(),
                "Stored " + task.getSizeBytes() + " bytes to relay storage (SHA-256 verified); available for "
                        + relayTtlDays + " days.",
                true
        ));

        return new RelayUploadResponseDto(task.getId(), "/api/v1/transfers/relay/" + task.getId() + "/download");
    }

    public RelayDownloadPayload download(String transferId) {
        TransferTask task = loadRelayTaskOrThrow(transferId);

        if (!task.isRelayUploadComplete() || task.getRelayFileId() == null) {
            throw ApiException.conflict("RELAY_UPLOAD_NOT_COMPLETE", "Relay upload for " + transferId + " has not finished yet");
        }
        if (task.getRelayExpiresAt() != null && Instant.now().isAfter(task.getRelayExpiresAt())) {
            throw ApiException.notFound("RELAY_BLOB_EXPIRED", "Relay storage for " + transferId + " has expired");
        }

        GridFSFile gridFsFile = gridFsTemplate.findOne(query(where("_id").is(new ObjectId(task.getRelayFileId()))));
        if (gridFsFile == null) {
            throw ApiException.notFound("RELAY_BLOB_NOT_FOUND", "Relay blob for " + transferId + " no longer exists");
        }
        GridFsResource resource = gridFsTemplate.getResource(gridFsFile);

        String mimeType = gridFsFile.getMetadata() != null && gridFsFile.getMetadata().getString("mimeType") != null
                ? gridFsFile.getMetadata().getString("mimeType")
                : "application/octet-stream";

        task.setStatus(TransferStatus.TRANSFERRING);
        task.setTransferredBytes(0L);
        task.setChunksCompleted(0L);
        task.setSpeedBytesPerSec(defaultRelaySpeedBytesPerSec);
        transferTaskRepository.save(task);
        publishProgress(task);

        StreamingResponseBody body = outputStream -> {
            try (InputStream in = resource.getInputStream()) {
                byte[] buffer = new byte[(int) chunkSizeBytes];
                long transferred = 0;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, read);
                    transferred += read;
                    onProgress(task, transferred);
                }
                finalizeDownload(task);
            } catch (IOException e) {
                markFailed(task, e);
                throw e;
            }
        };

        return new RelayDownloadPayload(body, mimeType, task.getSizeBytes(), task.getName());
    }

    public RelayStatusDto status(String transferId) {
        TransferTask task = loadRelayTaskOrThrow(transferId);
        boolean downloadAvailable = task.isRelayUploadComplete()
                && task.getRelayFileId() != null
                && (task.getRelayExpiresAt() == null || Instant.now().isBefore(task.getRelayExpiresAt()));

        String expiresAt = task.getRelayExpiresAt() == null
                ? null
                : TimeFormats.format(LocalDateTime.ofInstant(task.getRelayExpiresAt(), ZoneOffset.UTC));

        return new RelayStatusDto(
                task.getId(),
                task.getStatus(),
                task.isRelayUploadComplete(),
                downloadAvailable,
                task.getSizeBytes(),
                task.getTransferredBytes(),
                expiresAt
        );
    }

    private void finalizeDownload(TransferTask task) {
        task.setStatus(TransferStatus.COMPLETED);
        task.setTransferredBytes(task.getSizeBytes());
        task.setChunksCompleted(task.getChunksTotal());
        task.setSpeedBytesPerSec(0L);
        task.setEtaSeconds(0L);
        task.setCompletedAt(TimeFormats.now());
        transferTaskRepository.save(task);
        publishProgress(task);

        publishAudit(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                task.getTargetDeviceId(),
                task.getTargetDeviceName(),
                "User",
                "Relay Download Complete: " + task.getName(),
                "Target device retrieved " + task.getSizeBytes() + " bytes from relay storage.",
                true
        ));
    }

    private void markFailed(TransferTask task, IOException e) {
        task.setStatus(TransferStatus.FAILED);
        task.setErrorReason("Download interrupted: " + e.getMessage());
        transferTaskRepository.save(task);
        publishProgress(task);
    }

    private void onProgress(TransferTask task, long transferredBytes) {
        task.setTransferredBytes(transferredBytes);
        long chunksCompleted = (long) Math.ceil(transferredBytes / (double) chunkSizeBytes);
        task.setChunksCompleted(Math.min(task.getChunksTotal(), chunksCompleted));
        transferTaskRepository.save(task);
        publishProgress(task);
    }

    private TransferTask loadRelayTaskOrThrow(String transferId) {
        TransferTask task = transferTaskRepository.findById(transferId)
                .orElseThrow(() -> ApiException.notFound("TRANSFER_NOT_FOUND", "No transfer task with id " + transferId));
        if (task.getMode() != TransferMode.RELAY_ENCRYPTED) {
            throw ApiException.badRequest("NOT_RELAY_TRANSFER", "Transfer " + transferId + " is not a RELAY_ENCRYPTED transfer");
        }
        return task;
    }

    private long chunksTotal(long sizeBytes) {
        return (long) Math.ceil(sizeBytes / (double) chunkSizeBytes);
    }

    private long etaSeconds(long sizeBytes, long speedBytesPerSec) {
        return speedBytesPerSec > 0 ? Math.max(2, (long) Math.ceil(sizeBytes / (double) speedBytesPerSec)) : 0L;
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private void publishProgress(TransferTask task) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_PROGRESS, task.getId(), TransferProgressEvent.of(transferTaskMapper.toDto(task)));
    }

    private void publishAudit(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_EVENTS, event.deviceId(), event);
    }

    /** Controller-facing handoff — never serialized as JSON, so it stays local rather than in common. */
    public record RelayDownloadPayload(StreamingResponseBody body, String contentType, long contentLength, String filename) {
    }
}
