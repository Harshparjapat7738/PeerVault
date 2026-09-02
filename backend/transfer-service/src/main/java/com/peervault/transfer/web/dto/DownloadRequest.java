package com.peervault.transfer.web.dto;

import jakarta.validation.constraints.NotBlank;

public record DownloadRequest(
        @NotBlank String fileId
) {
}
