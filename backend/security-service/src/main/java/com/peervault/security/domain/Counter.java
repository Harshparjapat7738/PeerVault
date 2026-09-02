package com.peervault.security.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * MongoDB has no {@code SERIAL}/{@code BIGSERIAL}; this is the standard Mongo atomic-counter pattern
 * used by {@link com.peervault.security.service.SequenceGeneratorService} to hand out monotonically
 * increasing {@code seq} values for {@link AuditLogEntry} rows via {@code findAndModify}.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
@Document(collection = "counters")
public class Counter {

    @Id
    private String id;

    private long seq;

    public Counter() {
    }

    public Counter(String id, long seq) {
        this.id = id;
        this.seq = seq;
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
}
