package com.peervault.device.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * A short-lived pairing handshake: real EC (P-256) ephemeral keypair, identified solely by this
 * session's own {@code id} (a UUID) — that id, embedded in the QR payload, IS the pairing secret.
 * There is no separate human-typable code: QR-only, nothing to fall back to manual entry with.
 * Mongo TTL-indexes {@link #getExpiresAt()} so Atlas auto-deletes expired sessions, but TTL cleanup
 * isn't instantaneous (runs on a background sweep, up to ~60s late) so expiry is ALSO explicitly
 * re-checked in code at confirm-time.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
@Document(collection = "pairing_sessions")
public class PairingSession {

    @Id
    private String id;
    private String deviceFingerprint;
    private String ephemeralPublicKeyBase64;
    private Instant createdAt;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;

    private boolean consumed;

    public PairingSession() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDeviceFingerprint() {
        return deviceFingerprint;
    }

    public void setDeviceFingerprint(String deviceFingerprint) {
        this.deviceFingerprint = deviceFingerprint;
    }

    public String getEphemeralPublicKeyBase64() {
        return ephemeralPublicKeyBase64;
    }

    public void setEphemeralPublicKeyBase64(String ephemeralPublicKeyBase64) {
        this.ephemeralPublicKeyBase64 = ephemeralPublicKeyBase64;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public boolean isConsumed() {
        return consumed;
    }

    public void setConsumed(boolean consumed) {
        this.consumed = consumed;
    }

    public static final class Builder {
        private final PairingSession session = new PairingSession();

        public Builder id(String id) {
            session.id = id;
            return this;
        }

        public Builder deviceFingerprint(String deviceFingerprint) {
            session.deviceFingerprint = deviceFingerprint;
            return this;
        }

        public Builder ephemeralPublicKeyBase64(String ephemeralPublicKeyBase64) {
            session.ephemeralPublicKeyBase64 = ephemeralPublicKeyBase64;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            session.createdAt = createdAt;
            return this;
        }

        public Builder expiresAt(Instant expiresAt) {
            session.expiresAt = expiresAt;
            return this;
        }

        public Builder consumed(boolean consumed) {
            session.consumed = consumed;
            return this;
        }

        public PairingSession build() {
            return session;
        }
    }
}
