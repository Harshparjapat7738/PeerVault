package com.peervault.security.kafka;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.event.DomainEvent;
import com.peervault.security.service.AuditLedgerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes every audit-worthy {@link DomainEvent} published across the mesh — device, file, transfer,
 * auth, and pre-flagged security-alert events — and folds each one into the hash-chained audit ledger.
 * A single listener across all five topics keeps ordering simple; the actual audit semantics live
 * entirely in {@link AuditLedgerService#append(DomainEvent)}.
 */
@Component
public class AuditEventListener {

    private static final Logger log = LoggerFactory.getLogger(AuditEventListener.class);

    private final AuditLedgerService auditLedgerService;

    public AuditEventListener(AuditLedgerService auditLedgerService) {
        this.auditLedgerService = auditLedgerService;
    }

    @KafkaListener(
            topics = {
                    KafkaTopics.DEVICE_EVENTS,
                    KafkaTopics.FILE_EVENTS,
                    KafkaTopics.TRANSFER_EVENTS,
                    KafkaTopics.AUTH_EVENTS,
                    KafkaTopics.SECURITY_ALERTS
            },
            groupId = "security-service"
    )
    public void onDomainEvent(DomainEvent event) {
        try {
            auditLedgerService.append(event);
        } catch (Exception ex) {
            log.error("Failed to append audit ledger entry for event {}: {}", event.eventId(), ex.getMessage(), ex);
        }
    }
}
