package com.peervault.security.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.event.DeviceFreezeCommand;
import com.peervault.common.event.DomainEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * The ransomware mass-deletion trip-wire (STRIDE "Denial of Service" mitigation). Every FILE_DELETE /
 * WARNING event that lands in {@link AuditLedgerService#append(DomainEvent)} increments a per-device
 * Redis-windowed counter; past {@code peervault.security.delete-rate-limit-count} deletes within
 * {@code peervault.security.delete-rate-limit-window-seconds}, it fires exactly once (guarded by a
 * separate "already tripped" key so a burst doesn't spam critical events/freeze commands), publishing
 * a CRITICAL audit event and a real {@link DeviceFreezeCommand} that device-service consumes to force-
 * freeze the node — existing files stay safe in the 30-day soft-trash vault regardless.
 */
@Service
public class RansomwareShieldService {

    private static final Logger log = LoggerFactory.getLogger(RansomwareShieldService.class);

    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AuditLedgerService auditLedgerService;
    private final long thresholdCount;
    private final long windowSeconds;

    public RansomwareShieldService(StringRedisTemplate redisTemplate,
                                    KafkaTemplate<String, Object> kafkaTemplate,
                                    AuditLedgerService auditLedgerService,
                                    @Value("${peervault.security.delete-rate-limit-count:20}") long thresholdCount,
                                    @Value("${peervault.security.delete-rate-limit-window-seconds:60}") long windowSeconds) {
        this.redisTemplate = redisTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.auditLedgerService = auditLedgerService;
        this.thresholdCount = thresholdCount;
        this.windowSeconds = windowSeconds;
    }

    public void onFileTrashed(String deviceId, String deviceName) {
        if (deviceId == null) {
            return;
        }
        String counterKey = "delete-rate:" + deviceId;
        Long count = redisTemplate.opsForValue().increment(counterKey);
        if (count != null && count == 1L) {
            redisTemplate.expire(counterKey, Duration.ofSeconds(windowSeconds));
        }
        if (count != null && count > thresholdCount) {
            String tripGuardKey = "shield-tripped:" + deviceId;
            Boolean firstTrip = redisTemplate.opsForValue()
                    .setIfAbsent(tripGuardKey, "1", Duration.ofSeconds(windowSeconds));
            if (Boolean.TRUE.equals(firstTrip)) {
                log.warn("Ransomware shield tripped for device {} ({} deletes in {}s)", deviceId, count, windowSeconds);
                // A different eventType/severity combo than FILE_DELETE/WARNING, so this append() call
                // does not re-trigger the shield.
                auditLedgerService.append(DomainEvent.of(AuditEventType.THREAT_DETECTED, AuditSeverity.CRITICAL,
                        deviceId, deviceName, "Anomaly Circuit Breaker",
                        "MASS DELETION ANOMALY BLOCKED (25 ops/sec)",
                        "Ransomware behavioral signature detected! Deletion rate exceeded " + thresholdCount +
                                " files/min limit. Node temporarily locked. Existing files safe in 30-day soft trash vault.",
                        false));
                kafkaTemplate.send(KafkaTopics.DEVICE_FREEZE_COMMAND,
                        DeviceFreezeCommand.of(deviceId, "Ransomware mass-deletion shield tripped (" + count + " deletes in " + windowSeconds + "s)"));
            }
        }
    }
}
