package com.peervault.file.dto;

/** Response body for {@code POST /api/v1/sandbox/validate-path}. */
public record SandboxValidateResponse(
        boolean allowed,
        String canonicalPath,
        String reason
) {
}
