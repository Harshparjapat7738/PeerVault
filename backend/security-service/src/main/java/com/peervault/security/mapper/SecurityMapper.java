package com.peervault.security.mapper;

import com.peervault.common.dto.AuditEventDto;
import com.peervault.common.dto.ThreatItemDto;
import com.peervault.security.domain.AuditLogEntry;
import com.peervault.security.domain.ThreatEntry;
import org.springframework.stereotype.Component;

@Component
public class SecurityMapper {

    public AuditEventDto toDto(AuditLogEntry entry) {
        return new AuditEventDto(
                entry.getId(),
                entry.getTimestamp(),
                entry.getEventType(),
                entry.getSeverity(),
                entry.getDeviceId(),
                entry.getDeviceName(),
                entry.getActor(),
                entry.getAction(),
                entry.getDetails(),
                entry.isAuthorized(),
                entry.getIpHash(),
                entry.getPrevLogHash(),
                entry.getCurrentLogHash()
        );
    }

    public ThreatItemDto toDto(ThreatEntry entry) {
        return new ThreatItemDto(
                entry.getId(),
                entry.getStrideCategory(),
                entry.getTitle(),
                entry.getTargetComponent(),
                entry.getDescription(),
                entry.getAttackVector(),
                entry.getMitigationRule(),
                entry.getStatus(),
                entry.getLastEvaluated()
        );
    }
}
