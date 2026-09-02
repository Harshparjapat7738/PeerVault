package com.peervault.share.web.dto;

import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.ShareTransferMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Request body for {@code POST /api/v1/share/request}. {@code requesterUserId} isn't part of the
 * body — it comes off the caller's JWT ({@code X-User-Id}, forwarded by the gateway).
 * <p>
 * Exactly one of {@code targetUserId} / {@code targetEmail} must be set (enforced in
 * {@code ShareRequestService}, not by annotations here — it's an either/or business rule): pass
 * {@code targetUserId} when the caller already knows it, or {@code targetEmail} to address someone
 * by email — resolved to a user id via auth-service's internal lookup endpoint.
 * {@code targetDeviceId} is always required: which of the target's devices should receive the
 * grant is decided by the sharer up front, not at accept time.
 */
public record ShareRequestCreateDto(
        @NotBlank String requesterDeviceId,
        String targetUserId,
        String targetEmail,
        @NotBlank String targetDeviceId,
        @NotBlank String storageRootId,
        @NotEmpty List<SharePermission> permissions,
        @NotNull ShareTransferMode transferMode,
        String message,
        String expiresAt
) {
}
