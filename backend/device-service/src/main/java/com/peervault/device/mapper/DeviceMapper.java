package com.peervault.device.mapper;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.StorageRootDto;
import com.peervault.device.domain.Device;
import com.peervault.device.domain.StorageRoot;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DeviceMapper {

    public DeviceDto toDto(Device device) {
        return new DeviceDto(
                device.getId(),
                device.getName(),
                device.getType(),
                device.getOs(),
                device.getAgentVersion(),
                device.getStatus(),
                device.getPublicKeyFingerprint(),
                device.getIpMasked(),
                device.getNatType(),
                device.getLastSeen(),
                device.getBatteryLevel(),
                device.getIsCharging(),
                device.getStorageTotalBytes(),
                device.getStorageUsedBytes(),
                toRootDtos(device.getAllowedRoots()),
                device.getTags(),
                device.getActiveConnectionsCount(),
                device.isDirectP2PCapable(),
                device.getIsFavorite(),
                device.getPairedAt(),
                device.getPinnedLocation(),
                device.getSharingPermissions(),
                device.getUserId()
        );
    }

    private List<StorageRootDto> toRootDtos(List<StorageRoot> roots) {
        if (roots == null) {
            return List.of();
        }
        return roots.stream().map(this::toRootDto).toList();
    }

    private StorageRootDto toRootDto(StorageRoot root) {
        return new StorageRootDto(
                root.getId(),
                root.getPath(),
                root.getLabel(),
                root.isReadOnly(),
                root.isAllowDelete(),
                root.getTotalFiles(),
                root.getTotalSizeBytes()
        );
    }
}
