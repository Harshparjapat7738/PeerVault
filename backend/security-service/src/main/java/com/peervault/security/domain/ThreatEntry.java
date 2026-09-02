package com.peervault.security.domain;

import com.peervault.common.dto.StrideCategory;
import com.peervault.common.dto.ThreatStatus;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Mirrors {@link com.peervault.common.dto.ThreatItemDto} field-for-field; seeded from the STRIDE matrix on startup.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
@Document(collection = "threats")
public class ThreatEntry {

    @Id
    private String id;

    private StrideCategory strideCategory;
    private String title;
    private String targetComponent;
    private String description;
    private String attackVector;
    private String mitigationRule;
    private ThreatStatus status;
    private String lastEvaluated;

    public ThreatEntry() {
    }

    public ThreatEntry(String id, StrideCategory strideCategory, String title, String targetComponent,
                        String description, String attackVector, String mitigationRule, ThreatStatus status,
                        String lastEvaluated) {
        this.id = id;
        this.strideCategory = strideCategory;
        this.title = title;
        this.targetComponent = targetComponent;
        this.description = description;
        this.attackVector = attackVector;
        this.mitigationRule = mitigationRule;
        this.status = status;
        this.lastEvaluated = lastEvaluated;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public StrideCategory getStrideCategory() {
        return strideCategory;
    }

    public void setStrideCategory(StrideCategory strideCategory) {
        this.strideCategory = strideCategory;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getTargetComponent() {
        return targetComponent;
    }

    public void setTargetComponent(String targetComponent) {
        this.targetComponent = targetComponent;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getAttackVector() {
        return attackVector;
    }

    public void setAttackVector(String attackVector) {
        this.attackVector = attackVector;
    }

    public String getMitigationRule() {
        return mitigationRule;
    }

    public void setMitigationRule(String mitigationRule) {
        this.mitigationRule = mitigationRule;
    }

    public ThreatStatus getStatus() {
        return status;
    }

    public void setStatus(ThreatStatus status) {
        this.status = status;
    }

    public String getLastEvaluated() {
        return lastEvaluated;
    }

    public void setLastEvaluated(String lastEvaluated) {
        this.lastEvaluated = lastEvaluated;
    }
}
