package com.peervault.device.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Body for {@code POST /{id}/roots} and each entry of {@code allowedRoots} on pair/confirm. */
public record RootRequest(
        @NotBlank String path,
        @NotBlank String label,
        boolean allowDelete
) {
}
