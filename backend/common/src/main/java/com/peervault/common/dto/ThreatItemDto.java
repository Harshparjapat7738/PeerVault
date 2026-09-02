package com.peervault.common.dto;

/** Mirrors ThreatItem in src/types.ts */
public record ThreatItemDto(
        String id,
        StrideCategory strideCategory,
        String title,
        String targetComponent,
        String description,
        String attackVector,
        String mitigationRule,
        ThreatStatus status,
        String lastEvaluated
) {
}
