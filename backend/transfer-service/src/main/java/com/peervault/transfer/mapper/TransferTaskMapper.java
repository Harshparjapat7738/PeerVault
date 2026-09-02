package com.peervault.transfer.mapper;

import com.peervault.common.dto.TransferTaskDto;
import com.peervault.transfer.domain.TransferTask;
import org.springframework.stereotype.Component;

@Component
public class TransferTaskMapper {

    public TransferTaskDto toDto(TransferTask t) {
        return new TransferTaskDto(
                t.getId(),
                t.getName(),
                t.getSourceDeviceId(),
                t.getTargetDeviceId(),
                t.getSourceDeviceName(),
                t.getTargetDeviceName(),
                t.getSourceFilePath(),
                t.getTargetFilePath(),
                t.getSizeBytes(),
                t.getTransferredBytes(),
                t.getSpeedBytesPerSec(),
                t.getStatus(),
                t.getMode(),
                t.getChunksTotal(),
                t.getChunksCompleted(),
                t.getEtaSeconds(),
                t.getSha256Checksum(),
                t.getCreatedAt(),
                t.getStartedAt(),
                t.getCompletedAt(),
                t.getErrorReason()
        );
    }
}
