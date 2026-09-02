package com.peervault.device.web.dto;

import com.peervault.common.dto.DeviceType;
import com.peervault.common.dto.OsType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Body for {@code POST /api/v1/devices/pair/confirm}. */
public record PairConfirmRequest(
        @NotBlank String pairingCode,
        @NotBlank String name,
        @NotNull DeviceType type,
        @NotNull OsType os,
        @NotEmpty List<@Valid RootRequest> allowedRoots
) {
}
