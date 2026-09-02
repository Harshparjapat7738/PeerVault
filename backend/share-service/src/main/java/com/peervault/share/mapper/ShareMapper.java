package com.peervault.share.mapper;

import com.peervault.common.dto.ShareRequestDto;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.util.TimeFormats;
import com.peervault.share.domain.ShareRequest;
import com.peervault.share.domain.SharedStorage;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
public class ShareMapper {

    public ShareRequestDto toDto(ShareRequest r) {
        return new ShareRequestDto(
                r.getId(),
                r.getRequesterUserId(),
                r.getRequesterDeviceId(),
                r.getTargetUserId(),
                r.getTargetDeviceId(),
                r.getStorageRootId(),
                r.getPermissions(),
                r.getStatus(),
                r.getTransferMode(),
                r.getMessage(),
                format(r.getExpiresAt()),
                format(r.getCreatedAt()),
                format(r.getUpdatedAt())
        );
    }

    public SharedStorageDto toDto(SharedStorage s) {
        return new SharedStorageDto(
                s.getId(),
                s.getOwnerId(),
                s.getOwnerDeviceId(),
                s.getSharedWithUserId(),
                s.getSharedWithDeviceId(),
                s.getStorageRootId(),
                s.getPermissions(),
                s.getTransferMode(),
                s.isActive(),
                format(s.getCreatedAt()),
                format(s.getRevokedAt())
        );
    }

    private String format(java.time.Instant instant) {
        return instant == null ? null : TimeFormats.format(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
    }
}
