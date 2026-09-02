package com.peervault.notification.relay;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventDto;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.event.ShareAcceptanceEvent;
import com.peervault.common.event.ShareRejectionEvent;
import com.peervault.common.event.P2PSignalEvent;
import com.peervault.common.event.ShareRequestEvent;
import com.peervault.common.event.TransferProgressEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Stateless relay: every domain/audit event published to Kafka by the other business services is fanned out
 * verbatim to the matching STOMP topic. No persistence, no per-user targeting — every connected browser
 * client sees the same broadcast, which is sufficient for a personal single-user mesh.
 *
 * <p><b>{@code /topic/share/*} is the one place that broadcast assumption gets genuinely
 * questionable</b>: sharing is inherently cross-user, so under this same broadcast-to-everyone
 * design, User B's browser would see User A's share requests/acceptances/rejections too — not just
 * a redundant echo, an actual cross-tenant leak the moment two different people use the mesh at
 * once. Real per-user delivery needs STOMP user destinations (a Principal on the WS handshake,
 * which {@code WebSocketConfig} doesn't set up — there's no auth on {@code /ws} at all today) and is
 * out of scope for wiring these three listeners; flagged here rather than fixed silently.
 */
@Component
public class KafkaToWebSocketRelay {

    private final SimpMessagingTemplate messagingTemplate;

    public KafkaToWebSocketRelay(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = KafkaTopics.DEVICE_EVENTS, groupId = "notification-service")
    public void onDeviceEvent(DomainEvent event) {
        messagingTemplate.convertAndSend("/topic/devices", event);
    }

    @KafkaListener(topics = KafkaTopics.FILE_EVENTS, groupId = "notification-service")
    public void onFileEvent(DomainEvent event) {
        messagingTemplate.convertAndSend("/topic/files", event);
    }

    @KafkaListener(topics = KafkaTopics.TRANSFER_EVENTS, groupId = "notification-service")
    public void onTransferEvent(DomainEvent event) {
        messagingTemplate.convertAndSend("/topic/transfers", event);
    }

    @KafkaListener(topics = KafkaTopics.TRANSFER_PROGRESS, groupId = "notification-service")
    public void onTransferProgress(TransferProgressEvent event) {
        messagingTemplate.convertAndSend("/topic/transfers/progress", event);
    }

    @KafkaListener(topics = KafkaTopics.AUTH_EVENTS, groupId = "notification-service")
    public void onAuthEvent(DomainEvent event) {
        messagingTemplate.convertAndSend("/topic/auth", event);
    }

    @KafkaListener(topics = KafkaTopics.SECURITY_ALERTS, groupId = "notification-service")
    public void onSecurityAlert(DomainEvent event) {
        messagingTemplate.convertAndSend("/topic/alerts", event);
    }

    @KafkaListener(topics = KafkaTopics.AUDIT_LOG_CREATED, groupId = "notification-service")
    public void onAuditLogCreated(AuditEventDto event) {
        messagingTemplate.convertAndSend("/topic/audit", event);
        // Task 7: a filtered view of the same ledger stream, scoped to sharing — every ShareAuditEventListener-
        // and SharedStorageService-originated row lands here too, without a second Kafka subscription.
        if (isShareRelated(event.eventType())) {
            messagingTemplate.convertAndSend("/topic/share/audit", event);
        }
    }

    private boolean isShareRelated(AuditEventType type) {
        return switch (type) {
            case SHARE_REQUEST_CREATED, SHARE_REQUEST_ACCEPTED, SHARE_REQUEST_REJECTED,
                 SHARE_STORAGE_ACCESS_GRANTED, SHARE_STORAGE_ACCESS_REVOKED, SHARE_FILE_ACCESSED -> true;
            default -> false;
        };
    }

    @KafkaListener(topics = KafkaTopics.SHARE_REQUESTS, groupId = "notification-service")
    public void onShareRequest(ShareRequestEvent event) {
        messagingTemplate.convertAndSend("/topic/share/requests", event);
    }

    @KafkaListener(topics = KafkaTopics.SHARE_ACCEPTANCES, groupId = "notification-service")
    public void onShareAcceptance(ShareAcceptanceEvent event) {
        messagingTemplate.convertAndSend("/topic/share/status", event);
    }

    @KafkaListener(topics = KafkaTopics.SHARE_REJECTIONS, groupId = "notification-service")
    public void onShareRejection(ShareRejectionEvent event) {
        messagingTemplate.convertAndSend("/topic/share/status", event);
    }

    /**
     * Routed per-transfer, not to one shared topic like everything else here — two unrelated P2P
     * handshakes happening at once would otherwise cross-talk on the same channel. Both peers learn
     * {@code transferId} off the existing {@code /topic/transfers} broadcast (see
     * {@code P2PSignalingService}'s javadoc), then subscribe to this one specifically.
     */
    @KafkaListener(topics = KafkaTopics.P2P_SIGNALING, groupId = "notification-service")
    public void onP2PSignal(P2PSignalEvent event) {
        messagingTemplate.convertAndSend("/topic/webrtc/" + event.transferId(), event);
    }
}
