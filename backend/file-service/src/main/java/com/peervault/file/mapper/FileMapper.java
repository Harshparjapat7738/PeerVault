package com.peervault.file.mapper;

import com.peervault.common.dto.FilePermissionsDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.file.domain.FilePermissions;
import com.peervault.file.domain.StorageFile;

public final class FileMapper {

    private FileMapper() {
    }

    public static StorageFileDto toDto(StorageFile f) {
        FilePermissions p = f.getPermissions();
        FilePermissionsDto permissionsDto = p == null
                ? null
                : new FilePermissionsDto(p.isRead(), p.isWrite(), p.isDelete());

        return new StorageFileDto(
                f.getId(),
                f.getDeviceId(),
                f.getRootId(),
                f.getRootPath(),
                f.getRelativePath(),
                f.getName(),
                f.getExtension(),
                f.getSizeBytes(),
                f.getModifiedAt(),
                f.getSha256Hash(),
                f.getMimeType(),
                f.isDirectory(),
                f.getIsFavorite(),
                f.getInTrash(),
                f.getTrashedAt(),
                f.getTrashExpiresAt(),
                permissionsDto,
                f.getVersion(),
                f.getSampleContent()
        );
    }
}
