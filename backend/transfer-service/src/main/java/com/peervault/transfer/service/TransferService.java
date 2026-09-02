package com.peervault.transfer.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.StorageRootDto;
import com.peervault.common.dto.TransferMode;
import com.peervault.common.dto.TransferStatus;
import com.peervault.common.dto.TransferTaskDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.util.TimeFormats;
import com.peervault.transfer.client.DeviceClient;
import com.peervault.transfer.client.FileClient;
import com.peervault.transfer.domain.TransferTask;
import com.peervault.transfer.mapper.TransferTaskMapper;
import com.peervault.transfer.repo.TransferTaskRepository;
import com.peervault.transfer.web.dto.DirectTransferRequest;
import com.peervault.transfer.web.dto.DownloadRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrates transfer lifecycle (create/pause-resume/cancel/glitch-resume). Byte progress itself is
 * advanced separately by {@link com.peervault.transfer.scheduler.TransferProgressTicker} — this service
 * only owns state transitions and the REST calls to device-service/file-service that establish the
 * canonical (server-trusted) size/hash/device data for a new transfer.
 */
@Service
@RequiredArgsConstructor
public class TransferService {

    /** Resume speed after a simulated network glitch — 48 MB/s, matches the frontend's own resume speed. */
    private static final long GLITCH_RESUME_SPEED_BYTES_PER_SEC = 50_331_648L;
    private static final long GLITCH_RESUME_DELAY_MS = 1200L;

    private final TransferTaskRepository transferTaskRepository;
    private final TransferTaskMapper transferTaskMapper;
    private final DeviceClient deviceClient;
    private final FileClient fileClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final TaskScheduler taskScheduler;

    @Value("${peervault.transfer.chunk-size-bytes}")
    private long chunkSizeBytes;

    @Value("${peervault.transfer.default-p2p-speed-bytes-per-sec}")
    private long defaultP2pSpeedBytesPerSec;

    @Value("${peervault.transfer.default-relay-speed-bytes-per-sec}")
    private long defaultRelaySpeedBytesPerSec;

    public List<TransferTaskDto> listTransfers() {
        return transferTaskRepository.findAll().stream().map(transferTaskMapper::toDto).toList();
    }

    public TransferTaskDto startDownload(DownloadRequest request) {
        StorageFileDto file = fileClient.getFile(request.fileId());
        DeviceDto sourceDevice = deviceClient.getDevice(file.deviceId());

        TransferMode mode = sourceDevice.directP2PCapable() ? TransferMode.P2P_DIRECT : TransferMode.RELAY_ENCRYPTED;
        String now = TimeFormats.now();

        TransferTask task = TransferTask.builder()
                .id(UUID.randomUUID().toString())
                .name(file.name() + " (Download to Local Device)")
                .sourceDeviceId(file.deviceId())
                .targetDeviceId("local-client")
                .sourceDeviceName(sourceDevice.name())
                .targetDeviceName("Current Browser Client")
                .sourceFilePath(file.rootPath() + "/" + file.relativePath())
                .targetFilePath("/Downloads/" + file.name())
                .sizeBytes(file.sizeBytes())
                .transferredBytes(0L)
                .speedBytesPerSec(defaultSpeedFor(mode))
                .status(TransferStatus.TRANSFERRING)
                .mode(mode)
                .chunksTotal(chunksTotal(file.sizeBytes()))
                .chunksCompleted(0L)
                .etaSeconds(etaSeconds(file.sizeBytes(), defaultSpeedFor(mode)))
                .sha256Checksum(file.sha256Hash())
                .createdAt(now)
                .startedAt(now)
                .build();
        transferTaskRepository.save(task);

        publish(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                task.getSourceDeviceId(),
                task.getSourceDeviceName(),
                "User",
                "Direct P2P Data Channel Established",
                "Streaming " + file.name() + " via direct encrypted channel.",
                true
        ));

        return transferTaskMapper.toDto(task);
    }

    public TransferTaskDto startDirectTransfer(DirectTransferRequest request) {
        StorageFileDto file = fileClient.getFile(request.fileId());
        DeviceDto sourceDevice = deviceClient.getDevice(file.deviceId());
        DeviceDto targetDevice = deviceClient.getDevice(request.targetDeviceId());

        StorageRootDto targetRoot = targetDevice.allowedRoots().stream()
                .filter(r -> r.id().equals(request.targetRootId()))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("TARGET_ROOT_NOT_FOUND",
                        "No storage root " + request.targetRootId() + " on device " + targetDevice.id()));

        TransferMode mode = request.mode();
        String now = TimeFormats.now();

        TransferTask task = TransferTask.builder()
                .id(UUID.randomUUID().toString())
                .name(file.name() + " (" + sourceDevice.name() + " -> " + targetDevice.name() + ")")
                .sourceDeviceId(file.deviceId())
                .targetDeviceId(targetDevice.id())
                .sourceDeviceName(sourceDevice.name())
                .targetDeviceName(targetDevice.name())
                .sourceFilePath(file.rootPath() + "/" + file.relativePath())
                .targetFilePath(targetRoot.path() + "/" + file.relativePath())
                .sizeBytes(file.sizeBytes())
                .transferredBytes(0L)
                .speedBytesPerSec(defaultSpeedFor(mode))
                .status(TransferStatus.TRANSFERRING)
                .mode(mode)
                .chunksTotal(chunksTotal(file.sizeBytes()))
                .chunksCompleted(0L)
                .etaSeconds(etaSeconds(file.sizeBytes(), defaultSpeedFor(mode)))
                .sha256Checksum(file.sha256Hash())
                .createdAt(now)
                .startedAt(now)
                .build();
        transferTaskRepository.save(task);

        publish(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                task.getSourceDeviceId(),
                task.getSourceDeviceName(),
                "User",
                "Direct Transfer Orchestrated",
                "P2P channel initiated between " + sourceDevice.name() + " and " + targetDevice.name() + ".",
                true
        ));

        return transferTaskMapper.toDto(task);
    }

    public TransferTaskDto togglePause(String id) {
        TransferTask task = findOrThrow(id);

        if (task.getStatus() == TransferStatus.PAUSED) {
            task.setStatus(TransferStatus.TRANSFERRING);
            task.setSpeedBytesPerSec(defaultSpeedFor(task.getMode()));
        } else {
            task.setStatus(TransferStatus.PAUSED);
            task.setSpeedBytesPerSec(0L);
        }
        transferTaskRepository.save(task);
        return transferTaskMapper.toDto(task);
    }

    public void cancel(String id) {
        TransferTask task = findOrThrow(id);

        // Publish before deleting so the event still carries the task's device data.
        publish(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.WARNING,
                task.getSourceDeviceId(),
                task.getSourceDeviceName(),
                "User",
                "Transfer Cancelled",
                "Stream closed.",
                true
        ));

        transferTaskRepository.deleteById(id);
    }

    public void simulateGlitch(String id) {
        TransferTask task = findOrThrow(id);
        task.setStatus(TransferStatus.PAUSED);
        task.setSpeedBytesPerSec(0L);
        transferTaskRepository.save(task);

        taskScheduler.schedule(() -> resumeAfterGlitch(id), Instant.now().plusMillis(GLITCH_RESUME_DELAY_MS));
    }

    /** Runs on the scheduler thread ~1.2s later; guards against a cancel/complete race in between. */
    private void resumeAfterGlitch(String id) {
        transferTaskRepository.findById(id).ifPresent(task -> {
            if (task.getStatus() == TransferStatus.PAUSED) {
                task.setStatus(TransferStatus.TRANSFERRING);
                task.setSpeedBytesPerSec(GLITCH_RESUME_SPEED_BYTES_PER_SEC);
                transferTaskRepository.save(task);
            }
        });
    }

    private long defaultSpeedFor(TransferMode mode) {
        return mode == TransferMode.P2P_DIRECT ? defaultP2pSpeedBytesPerSec : defaultRelaySpeedBytesPerSec;
    }

    private long chunksTotal(long sizeBytes) {
        return (long) Math.ceil(sizeBytes / (double) chunkSizeBytes);
    }

    private long etaSeconds(long sizeBytes, long speedBytesPerSec) {
        return Math.max(2, (long) Math.ceil(sizeBytes / (double) speedBytesPerSec));
    }

    private TransferTask findOrThrow(String id) {
        return transferTaskRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TRANSFER_NOT_FOUND", "No transfer task with id " + id));
    }

    private void publish(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_EVENTS, event.deviceId(), event);
    }
}
