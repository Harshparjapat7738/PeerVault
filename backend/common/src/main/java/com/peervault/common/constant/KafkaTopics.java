package com.peervault.common.constant;

/**
 * Canonical Kafka topic names shared by every PeerVault service.
 * <p>
 * {@link #DEVICE_EVENTS}, {@link #FILE_EVENTS}, {@link #TRANSFER_EVENTS}, {@link #AUTH_EVENTS} and
 * {@link #SECURITY_ALERTS} carry audit-worthy {@code DomainEvent}s that security-service folds into the
 * hash-chained ledger. {@link #TRANSFER_PROGRESS} is a separate high-frequency stream (one message per
 * ~800ms scheduler tick per active transfer) that only notification-service consumes, so the audit ledger
 * isn't flooded with progress ticks. {@link #SHARE_REQUESTS}, {@link #SHARE_ACCEPTANCES} and
 * {@link #SHARE_REJECTIONS} carry share-service's own typed envelopes (not {@code DomainEvent}) —
 * notification-service consumes them directly for real-time push; security-service audit coverage
 * for sharing is wired up in Task 7.
 */
public final class KafkaTopics {

    public static final String DEVICE_EVENTS = "device-events";
    public static final String FILE_EVENTS = "file-events";
    public static final String TRANSFER_EVENTS = "transfer-events";
    public static final String TRANSFER_PROGRESS = "transfer-progress";
    public static final String AUTH_EVENTS = "auth-events";
    public static final String SECURITY_ALERTS = "security-alerts";
    public static final String DEVICE_FREEZE_COMMAND = "device-freeze-command";
    public static final String AUDIT_LOG_CREATED = "audit-log-created";
    public static final String SHARE_REQUESTS = "share-requests";
    public static final String SHARE_ACCEPTANCES = "share-acceptances";
    public static final String SHARE_REJECTIONS = "share-rejections";
    /** WebRTC offer/answer/ICE-candidate relay for P2P_DIRECT transfers — see {@code P2PSignalEvent}. */
    public static final String P2P_SIGNALING = "p2p-signaling";

    private KafkaTopics() {
    }
}
