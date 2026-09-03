package com.peervault.auth.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * {@code auth_db.users} — control-plane account. Password auth stands in for the architecture doc's
 * WebAuthn/passkey step (full WebAuthn ceremony is out of scope for this build).
 * <p>
 * Hand-written accessors/builder rather than Lombok: the Lombok version pinned by the Spring Boot 3.3.4
 * BOM (1.18.34) is not compatible with this environment's host JDK, so auth-service avoids relying on
 * Lombok annotation processing while the {@code lombok} dependency stays declared (optional) per spec.
 */
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    /** Optional display name collected at signup; may be null for accounts created before this field
     *  existed, or if the caller never supplied one. Purely cosmetic — never used for auth/lookup. */
    private String name;

    private long tokenVersion = 0L;

    /** Purely cosmetic — mirrors mfa_enabled in the architecture doc's DDL; no real MFA is implemented. */
    private boolean mfaEnabled = true;

    private Instant createdAt;

    private Instant updatedAt;

    public User() {
    }

    public User(String id, String email, String passwordHash, String name, long tokenVersion, boolean mfaEnabled,
                Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.tokenVersion = tokenVersion;
        this.mfaEnabled = mfaEnabled;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getTokenVersion() {
        return tokenVersion;
    }

    public void setTokenVersion(long tokenVersion) {
        this.tokenVersion = tokenVersion;
    }

    public boolean isMfaEnabled() {
        return mfaEnabled;
    }

    public void setMfaEnabled(boolean mfaEnabled) {
        this.mfaEnabled = mfaEnabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public static final class Builder {
        private String id;
        private String email;
        private String passwordHash;
        private String name;
        private long tokenVersion = 0L;
        private boolean mfaEnabled = true;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder passwordHash(String passwordHash) {
            this.passwordHash = passwordHash;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder tokenVersion(long tokenVersion) {
            this.tokenVersion = tokenVersion;
            return this;
        }

        public Builder mfaEnabled(boolean mfaEnabled) {
            this.mfaEnabled = mfaEnabled;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public User build() {
            return new User(id, email, passwordHash, name, tokenVersion, mfaEnabled, createdAt, updatedAt);
        }
    }
}
