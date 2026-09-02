package com.peervault.common.dto;

/** Mirrors StorageRoot in src/types.ts */
public record StorageRootDto(
        String id,
        String path,
        String label,
        boolean isReadOnly,
        boolean allowDelete,
        int totalFiles,
        long totalSizeBytes
) {
}
