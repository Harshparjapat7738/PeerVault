package com.peervault.security.kafka;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.ShareRequestDto;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.event.ShareAcceptanceEvent;
import com.peervault.common.event.ShareRejectionEvent;
import com.peervault.common.event.ShareRequestEvent;
import com.peervault.security.service.AuditLedgerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Task 7: folds share-service's own typed Kafka envelopes into the same hash-chained ledger every
 * other audit-worthy event goes through via {@link AuditLedgerService#append(DomainEvent)}. These
 * three topics carry {@code ShareRequestEvent}/{@code ShareAcceptanceEvent}/{@code ShareRejectionEvent}
 * — not {@code DomainEvent} — which is why they need their own listener rather than joining
 * {@link AuditEventListener}'s five-topic group (see {@code KafkaTopics}' javadoc).
 * <p>
 * A single acceptance produces two distinct ledger rows: the request's own lifecycle transition
 * ({@code SHARE_REQUEST_ACCEPTED}) and the resulting access-control fact
 * ({@code SHARE_STORAGE_ACCESS_GRANTED}) — both true and independently worth recording, even though
 * they happen atomically together. {@code SHARE_STORAGE_ACCESS_REVOKED} and
 * {@code SHARE_FILE_ACCESSED} aren't produced here at all — share-service publishes those directly
 * as plain {@code DomainEvent}s onto the existing {@code FILE_EVENTS} topic
 * ({@code AuditEventListener} already consumes it), matching Task 4's "reuse what security-service
 * already listens to" approach rather than adding a topic for every event type.
 */
@Component
public class ShareAuditEventListener {

    private static final Logger log = LoggerFactory.getLogger(ShareAuditEventListener.class);

    private final AuditLedgerService auditLedgerService;

    public ShareAuditEventListener(AuditLedgerService auditLedgerService) {
        this.auditLedgerService = auditLedgerService;
    }

    @KafkaListener(topics = KafkaTopics.SHARE_REQUESTS, groupId = "security-service")
    public void onShareRequest(ShareRequestEvent event) {
        ShareRequestDto r = event.shareRequest();
        append(AuditEventType.SHARE_REQUEST_CREATED, AuditSeverity.INFO, r.requesterDeviceId(),
                "User (" + r.requesterUserId() + ")",
                "Share Request Created",
                "Requested to share storage root " + r.storageRootId() + " with user " + r.targetUserId()
                        + " (" + permissionsText(r.permissions()) + ", " + r.transferMode().wire() + ").");
    }

    @KafkaListener(topics = KafkaTopics.SHARE_ACCEPTANCES, groupId = "security-service")
    public void onShareAcceptance(ShareAcceptanceEvent event) {
        SharedStorageDto s = event.sharedStorage();

        append(AuditEventType.SHARE_REQUEST_ACCEPTED, AuditSeverity.INFO, s.sharedWithDeviceId(),
                "User (" + s.sharedWithUserId() + ")",
                "Share Request Accepted",
                "Accepted share request " + event.shareRequestId()
                        + (event.customMessage() != null ? " — \"" + event.customMessage() + "\"" : "") + ".");

        append(AuditEventType.SHARE_STORAGE_ACCESS_GRANTED, AuditSeverity.INFO, s.ownerDeviceId(),
                "User (" + s.sharedWithUserId() + ")",
                "Shared Storage Access Granted",
                "Grant " + s.id() + ": storage root " + s.storageRootId() + " (" + permissionsText(s.permissions())
                        + ") shared from user " + s.ownerId() + " to user " + s.sharedWithUserId() + ".");
    }

    @KafkaListener(topics = KafkaTopics.SHARE_REJECTIONS, groupId = "security-service")
    public void onShareRejection(ShareRejectionEvent event) {
        append(AuditEventType.SHARE_REQUEST_REJECTED, AuditSeverity.INFO, event.requesterDeviceId(),
                "User (" + event.rejectedByUserId() + ")",
                "Share Request Rejected",
                "Rejected share request " + event.shareRequestId() + " from user " + event.requesterUserId()
                        + (event.reason() != null ? ": " + event.reason() : "."));
    }

    private void append(AuditEventType type, AuditSeverity severity, String deviceId, String actor,
                         String action, String details) {
        try {
            auditLedgerService.append(DomainEvent.of(type, severity, deviceId, null, actor, action, details, true));
        } catch (Exception ex) {
            log.error("Failed to append audit ledger entry for a share event ({}): {}", type, ex.getMessage(), ex);
        }
    }

    private String permissionsText(List<SharePermission> permissions) {
        return permissions == null || permissions.isEmpty()
                ? "no permissions"
                : permissions.stream().map(SharePermission::wire).collect(Collectors.joining("+"));
    }
}
