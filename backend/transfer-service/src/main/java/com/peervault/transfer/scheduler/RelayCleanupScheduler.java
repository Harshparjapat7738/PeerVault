package com.peervault.transfer.scheduler;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DomainEvent;
import com.peervault.transfer.domain.TransferTask;
import com.peervault.transfer.repo.TransferTaskRepository;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

/**
 * Real enforcement of relay storage's TTL (Task 6): hourly, hard-deletes any GridFS blob whose
 * retention window has elapsed and clears {@code relayFileId} on its {@code TransferTask} (the row
 * itself stays — same "flip a flag / clear a reference, keep history" shape as
 * {@code TrashPurgeScheduler}, except here the underlying bytes really are gone afterwards, unlike
 * file-service's soft-trash which never actually deletes anything for 30 days).
 */
@Component
public class RelayCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(RelayCleanupScheduler.class);

    private final TransferTaskRepository transferTaskRepository;
    private final GridFsTemplate gridFsTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public RelayCleanupScheduler(TransferTaskRepository transferTaskRepository, GridFsTemplate gridFsTemplate,
                                  KafkaTemplate<String, Object> kafkaTemplate) {
        this.transferTaskRepository = transferTaskRepository;
        this.gridFsTemplate = gridFsTemplate;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 3_600_000)
    public void purgeExpiredRelayBlobs() {
        List<TransferTask> expired = transferTaskRepository.findByRelayFileIdNotNullAndRelayExpiresAtBefore(Instant.now());

        for (TransferTask task : expired) {
            try {
                gridFsTemplate.delete(query(where("_id").is(new ObjectId(task.getRelayFileId()))));
            } catch (Exception e) {
                log.warn("Failed to delete GridFS blob {} for transfer {}: {}", task.getRelayFileId(), task.getId(), e.getMessage());
            }

            task.setRelayFileId(null);
            transferTaskRepository.save(task);

            kafkaTemplate.send(KafkaTopics.TRANSFER_EVENTS, DomainEvent.of(
                    AuditEventType.FILE_DELETE,
                    AuditSeverity.INFO,
                    task.getSourceDeviceId(),
                    task.getSourceDeviceName(),
                    "Relay Retention Scheduler",
                    "Relay Blob Auto-Purged (TTL expired): " + task.getName(),
                    "Relay storage retention window elapsed; blob permanently deleted.",
                    true
            ));
            log.info("Auto-purged expired relay blob for transfer {} ({})", task.getId(), task.getName());
        }
    }
}
