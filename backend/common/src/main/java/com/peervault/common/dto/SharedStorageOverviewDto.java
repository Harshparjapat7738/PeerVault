package com.peervault.common.dto;

import java.util.List;

/** Mirrors SharedStorageOverview in src/types.ts — response for GET /api/v1/share/storage, both directions in one call. */
public record SharedStorageOverviewDto(
        List<SharedStorageDto> sharedWithMe,
        List<SharedStorageDto> sharedByMe
) {
}
