package com.peervault.transfer.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.P2PInitiateResponseDto;
import com.peervault.common.dto.P2PSignalType;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.TransferMode;
import com.peervault.common.dto.TransferStatus;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.event.P2PSignalEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.util.TimeFormats;
import com.peervault.transfer.client.DeviceClient;
import com.peervault.transfer.client.FileClient;
import com.peervault.transfer.domain.TransferTask;
import com.peervault.transfer.repo.TransferTaskRepository;
import com.peervault.transfer.web.dto.P2PAnswerRequest;
import com.peervault.transfer.web.dto.P2PIceCandidateRequest;
import com.peervault.transfer.web.dto.P2PInitiateRequest;
import com.peervault.transfer.web.dto.P2POfferRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * WebRTC signaling relay for {@code TransferMode.P2P_DIRECT} transfers. The backend never touches
 * actual file bytes here (nor anywhere else in transfer-service — see {@code TransferProgressTicker}'s
 * own javadoc on why byte progress is simulated) — it only relays opaque SDP/ICE payloads between
 * the two peers via Kafka -> notification-service -> {@code /topic/webrtc/{transferId}}, and reuses
 * the existing {@code TransferTask}/{@code TransferStatus.NEGOTIATING} machinery (unused until now)
 * to represent the handshake in progress.
 * <p>
 * Both peers learn {@code transferId} the same way: {@code initiate} publishes a {@code DomainEvent}
 * to {@code TRANSFER_EVENTS} exactly like {@code startDirectTransfer} already does, which reaches
 * every client on the existing {@code /topic/transfers} broadcast — that's what tells the target
 * device a P2P transfer now exists for it to subscribe to on {@code /topic/webrtc/{transferId}}.
 * No new "discovery" mechanism was needed.
 */
@Service
@RequiredArgsConstructor
public class P2PSignalingService {

    private final TransferTaskRepository transferTaskRepository;
    private final DeviceClient deviceClient;
    private final FileClient fileClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${peervault.transfer.chunk-size-bytes}")
    private long chunkSizeBytes;

    @Value("${peervault.transfer.default-p2p-speed-bytes-per-sec}")
    private long defaultP2pSpeedBytesPerSec;

    public P2PInitiateResponseDto initiate(P2PInitiateRequest request) {
        StorageFileDto file = fileClient.getFile(request.fileId());
        DeviceDto sourceDevice = deviceClient.getDevice(file.deviceId());
        DeviceDto targetDevice = deviceClient.getDevice(request.targetDeviceId());

        String now = TimeFormats.now();
        TransferTask task = TransferTask.builder()
                .id(UUID.randomUUID().toString())
                .name(file.name() + " (" + sourceDevice.name() + " -> " + targetDevice.name() + ", P2P)")
                .sourceDeviceId(sourceDevice.id())
                .targetDeviceId(targetDevice.id())
                .sourceDeviceName(sourceDevice.name())
                .targetDeviceName(targetDevice.name())
                .sourceFilePath(file.rootPath() + "/" + file.relativePath())
                // Real save location isn't known until the receiving peer's own WebRTC data-channel
                // handler picks one — same "no real client-side agent to ask" gap TransferService's
                // startDownload's "local-client" target already lives with.
                .targetFilePath(file.name())
                .sizeBytes(file.sizeBytes())
                .transferredBytes(0L)
                .speedBytesPerSec(0L)
                .status(TransferStatus.NEGOTIATING)
                .mode(TransferMode.P2P_DIRECT)
                .chunksTotal(chunksTotal(file.sizeBytes()))
                .chunksCompleted(0L)
                .etaSeconds(0L)
                .sha256Checksum(file.sha256Hash())
                .createdAt(now)
                .build();
        transferTaskRepository.save(task);

        publishAudit(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                task.getSourceDeviceId(),
                task.getSourceDeviceName(),
                "User",
                "P2P Signaling Started",
                "WebRTC handshake initiated for " + file.name() + " -> " + targetDevice.name() + ".",
                true
        ));

        return new P2PInitiateResponseDto(task.getId(), task.getId());
    }

    public void relayOffer(String transferId, P2POfferRequest request) {
        TransferTask task = loadP2PTaskOrThrow(transferId);
        publishSignal(task.getId(), P2PSignalType.OFFER, task.getSourceDeviceId(), task.getTargetDeviceId(), request.sdpOffer());
    }

    public void relayAnswer(String transferId, P2PAnswerRequest request) {
        TransferTask task = loadP2PTaskOrThrow(transferId);
        publishSignal(task.getId(), P2PSignalType.ANSWER, task.getTargetDeviceId(), task.getSourceDeviceId(), request.sdpAnswer());

        // The offer/answer exchange completing is treated as handshake success — there's no real
        // client-reported "ICE connected" signal to wait for (same honest-simulation trade-off
        // TransferProgressTicker already makes for byte throughput). Flipping to TRANSFERRING here
        // hands the task straight to that existing ticker with zero changes needed there. ICE
        // candidates may still trickle in afterwards, same as real WebRTC.
        if (task.getStatus() == TransferStatus.NEGOTIATING) {
            task.setStatus(TransferStatus.TRANSFERRING);
            task.setSpeedBytesPerSec(defaultP2pSpeedBytesPerSec);
            task.setStartedAt(TimeFormats.now());
            task.setEtaSeconds(etaSeconds(task.getSizeBytes(), defaultP2pSpeedBytesPerSec));
            transferTaskRepository.save(task);
        }
    }

    public void relayIceCandidate(String transferId, P2PIceCandidateRequest request) {
        TransferTask task = loadP2PTaskOrThrow(transferId);
        // Direction is genuinely unknowable from this endpoint's request shape ({ candidate } only,
        // no sender field) — see P2PSignalEvent's javadoc. fromDeviceId/toDeviceId are left null;
        // delivery still reaches both peers via the shared /topic/webrtc/{transferId} channel.
        publishSignal(task.getId(), P2PSignalType.ICE_CANDIDATE, null, null, request.candidate());
    }

    private TransferTask loadP2PTaskOrThrow(String transferId) {
        TransferTask task = transferTaskRepository.findById(transferId)
                .orElseThrow(() -> ApiException.notFound("TRANSFER_NOT_FOUND", "No transfer task with id " + transferId));
        if (task.getMode() != TransferMode.P2P_DIRECT) {
            throw ApiException.badRequest("NOT_P2P_TRANSFER", "Transfer " + transferId + " is not a P2P_DIRECT transfer");
        }
        return task;
    }

    private long chunksTotal(long sizeBytes) {
        return (long) Math.ceil(sizeBytes / (double) chunkSizeBytes);
    }

    private long etaSeconds(long sizeBytes, long speedBytesPerSec) {
        return Math.max(2, (long) Math.ceil(sizeBytes / (double) speedBytesPerSec));
    }

    private void publishSignal(String transferId, P2PSignalType type, String fromDeviceId, String toDeviceId, String payload) {
        kafkaTemplate.send(KafkaTopics.P2P_SIGNALING, transferId, P2PSignalEvent.of(transferId, type, fromDeviceId, toDeviceId, payload));
    }

    private void publishAudit(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_EVENTS, event.deviceId(), event);
    }
}
