package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * The {@code metadata} part of {@code POST /api/v1/transfers/relay/upload}'s multipart body — bound
 * as a JSON part alongside the {@code file} binary part. {@code sizeBytes}/{@code sha256} aren't
 * here: size comes off the actual uploaded {@code MultipartFile}, and the hash is computed for real
 * from the actual bytes as they're read (see {@code ChunkedProgressInputStream}) — never trusted
 * from the caller.
 */
public record RelayUploadMetadata(
        @NotBlank String sourceDeviceId,
        @NotBlank String targetDeviceId,
        @NotBlank String name,
        @NotBlank String mimeType
) {
}
