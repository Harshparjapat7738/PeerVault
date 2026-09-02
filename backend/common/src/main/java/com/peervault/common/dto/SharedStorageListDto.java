package com.peervault.common.dto;

import java.util.List;

/** Mirrors SharedStorageList in src/types.ts */
public record SharedStorageListDto(
        List<SharedStorageDto> items,
        int totalCount
) {
}
