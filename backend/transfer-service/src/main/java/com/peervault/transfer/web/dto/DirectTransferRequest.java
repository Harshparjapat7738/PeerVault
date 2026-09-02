package com.peervault.transfer.web.dto;

import com.peervault.common.dto.TransferMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DirectTransferRequest(
        @NotBlank String fileId,
        @NotBlank String targetDeviceId,
        @NotBlank String targetRootId,
        @NotNull TransferMode mode
) {
}
