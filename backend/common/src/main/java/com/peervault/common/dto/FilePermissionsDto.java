package com.peervault.common.dto;

/** Mirrors StorageFile['permissions'] in src/types.ts */
public record FilePermissionsDto(
        boolean read,
        boolean write,
        boolean delete
) {
}
