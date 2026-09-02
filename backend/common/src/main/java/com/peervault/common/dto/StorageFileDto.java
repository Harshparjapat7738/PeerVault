package com.peervault.common.dto;

/** Mirrors StorageFile in src/types.ts */
public record StorageFileDto(
        String id,
        String deviceId,
        String rootId,
        String rootPath,
        String relativePath,
        String name,
        String extension,
        long sizeBytes,
        String modifiedAt,
        String sha256Hash,
        String mimeType,
        boolean isDirectory,
        Boolean isFavorite,
        Boolean inTrash,
        String trashedAt,
        String trashExpiresAt,
        FilePermissionsDto permissions,
        int version,
        String sampleContent
) {
}
