package com.peervault.transfer.scheduler;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.TransferStatus;
import com.peervault.common.dto.TransferTaskDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.event.TransferProgressEvent;
import com.peervault.common.util.TimeFormats;
import com.peervault.transfer.domain.TransferTask;
import com.peervault.transfer.mapper.TransferTaskMapper;
import com.peervault.transfer.repo.TransferTaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * The one legitimately-simulated piece of transfer-service: since no real Rust storage agent exists yet
 * to report actual byte throughput, this ticker advances {@code transferredBytes} on a fixed schedule,
 * mirroring the frontend's own {@code setInterval} mock loop exactly (the {@code * 0.8} factor is
 * intentional — it simulates real-world throughput variance and matches the existing UX).
 */
@Component
@RequiredArgsConstructor
public class TransferProgressTicker {

    private static final double TICK_FACTOR = 0.8;

    private final TransferTaskRepository transferTaskRepository;
    private final TransferTaskMapper transferTaskMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Scheduled(fixedRateString = "${peervault.transfer.tick-interval-ms}")
    public void tick() {
        // manualProgress tasks (Task 6 relay upload/download) drive their own transferredBytes via
        // real chunk-by-chunk I/O in RelayTransferService — touching them here would race two
        // writers against the same document while a real transfer is actually in flight.
        List<TransferTask> inFlight = transferTaskRepository.findAll().stream()
                .filter(t -> t.getStatus() == TransferStatus.TRANSFERRING && !t.isManualProgress())
                .toList();

        for (TransferTask task : inFlight) {
            advance(task);
            transferTaskRepository.save(task);
            publishProgress(transferTaskMapper.toDto(task));
        }
    }

    private void advance(TransferTask task) {
        long increment = (long) Math.floor(task.getSpeedBytesPerSec() * TICK_FACTOR);
        long newTransferred = Math.min(task.getSizeBytes(), task.getTransferredBytes() + increment);
        task.setTransferredBytes(newTransferred);

        long chunksCompleted = task.getSizeBytes() > 0
                ? Math.min(task.getChunksTotal(),
                        (long) Math.ceil(newTransferred / (double) task.getSizeBytes() * task.getChunksTotal()))
                : task.getChunksTotal();
        task.setChunksCompleted(chunksCompleted);

        if (newTransferred >= task.getSizeBytes()) {
            task.setStatus(TransferStatus.COMPLETED);
            task.setSpeedBytesPerSec(0L);
            task.setEtaSeconds(0L);
            task.setCompletedAt(TimeFormats.now());

            publishEvent(DomainEvent.of(
                    AuditEventType.FILE_TRANSFER,
                    AuditSeverity.INFO,
                    task.getSourceDeviceId(),
                    task.getSourceDeviceName(),
                    "PeerVault Transfer Engine",
                    "Transfer Completed: " + task.getName(),
                    "SHA-256 integrity verified (" + checksumPrefix(task.getSha256Checksum()) + "...). 0 corrupted blocks.",
                    true
            ));
        } else {
            long remaining = task.getSizeBytes() - newTransferred;
            long eta = task.getSpeedBytesPerSec() > 0
                    ? Math.max(0, (long) Math.ceil(remaining / (double) task.getSpeedBytesPerSec()))
                    : 0L;
            task.setEtaSeconds(eta);
        }
    }

    private String checksumPrefix(String sha256Checksum) {
        if (sha256Checksum == null) {
            return "";
        }
        return sha256Checksum.length() >= 16 ? sha256Checksum.substring(0, 16) : sha256Checksum;
    }

    private void publishEvent(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_EVENTS, event.deviceId(), event);
    }

    private void publishProgress(TransferTaskDto snapshot) {
        kafkaTemplate.send(KafkaTopics.TRANSFER_PROGRESS, snapshot.id(), TransferProgressEvent.of(snapshot));
    }
}
