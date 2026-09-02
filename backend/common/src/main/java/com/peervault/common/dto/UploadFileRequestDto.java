package com.peervault.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Request body for file-service's {@code POST /api/v1/files} — registers a client-side upload.
 * Lives in {@code common} (not file-service-local, unlike most request-only DTOs) because
 * share-service's {@code FileClient} also has to construct this exact shape server-side when
 * proxying an upload into someone else's shared storage (Task 4).
 */
public record UploadFileRequestDto(
        @NotBlank String deviceId,
        @NotBlank String rootId,
        @NotBlank String rootPath,
        @NotBlank String relativePath,
        @NotBlank String name,
        @NotBlank String extension,
        @NotNull @PositiveOrZero Long sizeBytes,
        @NotBlank String mimeType,
        String sha256Hash,
        String sampleContent
) {
}
