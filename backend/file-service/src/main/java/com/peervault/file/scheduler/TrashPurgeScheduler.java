package com.peervault.file.scheduler;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DomainEvent;
import com.peervault.file.domain.StorageFile;
import com.peervault.file.repository.StorageFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Real enforcement of the 30-day trash retention policy the UI advertises: hourly, hard-purges any
 * {@link StorageFile} whose trash retention window has elapsed, publishing an audit event for each
 * before deleting it.
 */
@Component
public class TrashPurgeScheduler {

    private static final Logger log = LoggerFactory.getLogger(TrashPurgeScheduler.class);

    private final StorageFileRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public TrashPurgeScheduler(StorageFileRepository repository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @Scheduled(fixedDelay = 3_600_000)
    public void purgeExpiredTrash() {
        List<StorageFile> expired = repository.findByInTrashAndTrashExpiresAtInstantBefore(true, Instant.now());

        for (StorageFile file : expired) {
            kafkaTemplate.send(KafkaTopics.FILE_EVENTS, DomainEvent.of(
                    AuditEventType.FILE_DELETE,
                    AuditSeverity.INFO,
                    file.getDeviceId(),
                    null,
                    "Trash Retention Scheduler",
                    "Trash Auto-Purged (30-day retention expired): " + file.getName(),
                    "Retention window elapsed; file permanently unlinked.",
                    true
            ));
            repository.delete(file);
            log.info("Auto-purged expired trash file {} ({})", file.getId(), file.getName());
        }
    }
}
