package com.peervault.share.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Request body for {@code POST /api/v1/share/storage/{sharedStorageId}/files}. Deliberately
 * narrower than file-service's {@code UploadFileRequestDto}: {@code deviceId}/{@code rootId}/
 * {@code rootPath} are never taken from the caller — {@code SharedStorageService} derives them
 * itself from the resolved (and permission-checked) {@code SharedStorage} grant, so a
 * WRITE-permitted caller can never point an upload at a root they weren't actually granted.
 */
public record ShareFileUploadDto(
        @NotBlank String relativePath,
        @NotBlank String name,
        @NotBlank String extension,
        @NotNull @PositiveOrZero Long sizeBytes,
        @NotBlank String mimeType,
        String sha256Hash,
        String sampleContent
) {
}
