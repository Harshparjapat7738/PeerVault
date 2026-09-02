package com.peervault.security.domain;

import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.UUID;

/**
 * One immutable row in the hash-chained audit ledger. {@code seq} is assigned atomically via
 * {@link com.peervault.security.service.SequenceGeneratorService} so ordering is guaranteed even
 * under concurrent Kafka listener threads; {@code currentLogHash} covers {@code prevLogHash} plus
 * every audit-worthy field, so any row tampering breaks the chain from that point forward.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
@Document(collection = "audit_logs")
public class AuditLogEntry {

    @Id
    private String id = UUID.randomUUID().toString();

    private long seq;
    private String timestamp;
    private AuditEventType eventType;
    private AuditSeverity severity;
    private String deviceId;
    private String deviceName;
    private String actor;
    private String action;
    private String details;
    private boolean authorized;
    private String ipHash;
    private String prevLogHash;
    private String currentLogHash;

    @Indexed
    private Instant createdAt;

    public AuditLogEntry() {
    }

    public AuditLogEntry(String id, long seq, String timestamp, AuditEventType eventType, AuditSeverity severity,
                          String deviceId, String deviceName, String actor, String action, String details,
                          boolean authorized, String ipHash, String prevLogHash, String currentLogHash, Instant createdAt) {
        this.id = id;
        this.seq = seq;
        this.timestamp = timestamp;
        this.eventType = eventType;
        this.severity = severity;
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.actor = actor;
        this.action = action;
        this.details = details;
        this.authorized = authorized;
        this.ipHash = ipHash;
        this.prevLogHash = prevLogHash;
        this.currentLogHash = currentLogHash;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public long getSeq() {
        return seq;
    }

    public void setSeq(long seq) {
        this.seq = seq;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public AuditEventType getEventType() {
        return eventType;
    }

    public void setEventType(AuditEventType eventType) {
        this.eventType = eventType;
    }

    public AuditSeverity getSeverity() {
        return severity;
    }

    public void setSeverity(AuditSeverity severity) {
        this.severity = severity;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public void setDeviceName(String deviceName) {
        this.deviceName = deviceName;
    }

    public String getActor() {
        return actor;
    }

    public void setActor(String actor) {
        this.actor = actor;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public boolean isAuthorized() {
        return authorized;
    }

    public void setAuthorized(boolean authorized) {
        this.authorized = authorized;
    }

    public String getIpHash() {
        return ipHash;
    }

    public void setIpHash(String ipHash) {
        this.ipHash = ipHash;
    }

    public String getPrevLogHash() {
        return prevLogHash;
    }

    public void setPrevLogHash(String prevLogHash) {
        this.prevLogHash = prevLogHash;
    }

    public String getCurrentLogHash() {
        return currentLogHash;
    }

    public void setCurrentLogHash(String currentLogHash) {
        this.currentLogHash = currentLogHash;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
