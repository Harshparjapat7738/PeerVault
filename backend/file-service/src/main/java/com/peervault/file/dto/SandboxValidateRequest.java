package com.peervault.file.dto;

import jakarta.validation.constraints.NotBlank;

/** Request body for {@code POST /api/v1/sandbox/validate-path}. */
public record SandboxValidateRequest(
        @NotBlank String rootPath,
        @NotBlank String candidatePath
) {
}
