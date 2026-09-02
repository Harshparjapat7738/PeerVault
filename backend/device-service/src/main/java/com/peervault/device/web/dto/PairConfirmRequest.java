package com.peervault.device.web.dto;

import com.peervault.common.dto.DeviceType;
import com.peervault.common.dto.OsType;
import com.peervault.common.dto.SharingPermissionsDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Body for {@code POST /api/v1/devices/pair/confirm}. QR-only: {@code sessionId} is read off the
 * scanned QR payload, never typed in by hand. */
public record PairConfirmRequest(
        @NotBlank String sessionId,
        @NotBlank String name,
        @NotNull DeviceType type,
        @NotNull OsType os,
        @NotEmpty List<@Valid RootRequest> allowedRoots,
        @NotNull SharingPermissionsDto permissions
) {
}
