package com.peervault.security.repo;

import com.peervault.security.domain.AuditLogEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface AuditLogRepository extends MongoRepository<AuditLogEntry, String> {

    Optional<AuditLogEntry> findTopByOrderBySeqDesc();

    List<AuditLogEntry> findAllByOrderBySeqDesc();

    List<AuditLogEntry> findBySeverityOrderBySeqDesc(com.peervault.common.dto.AuditSeverity severity);

    List<AuditLogEntry> findByDeviceIdOrderBySeqDesc(String deviceId);

    List<AuditLogEntry> findBySeverityAndDeviceIdOrderBySeqDesc(com.peervault.common.dto.AuditSeverity severity, String deviceId);

    List<AuditLogEntry> findBySeverityInAndCreatedAtAfterOrderBySeqDesc(
            List<com.peervault.common.dto.AuditSeverity> severities, java.time.Instant createdAtAfter);
}
