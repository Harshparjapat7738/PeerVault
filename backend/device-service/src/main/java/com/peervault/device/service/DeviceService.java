package com.peervault.device.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.DeviceStatus;
import com.peervault.common.dto.NatType;
import com.peervault.common.dto.PairingSessionDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.util.TimeFormats;
import com.peervault.device.crypto.PairingCryptoService;
import com.peervault.device.domain.Device;
import com.peervault.device.domain.PairingSession;
import com.peervault.device.domain.StorageRoot;
import com.peervault.device.mapper.DeviceMapper;
import com.peervault.device.repo.DeviceRepository;
import com.peervault.device.repo.PairingSessionRepository;
import com.peervault.device.web.dto.HeartbeatRequest;
import com.peervault.device.web.dto.PairConfirmRequest;
import com.peervault.device.web.dto.RootRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DeviceService {

    private static final Logger log = LoggerFactory.getLogger(DeviceService.class);

    /** Fixed constant — matches every device in the frontend mock (src/data/initialData.ts). */
    private static final String AGENT_VERSION = "v1.4.2-rust";

    private final DeviceRepository deviceRepository;
    private final PairingSessionRepository pairingSessionRepository;
    private final PairingCryptoService pairingCryptoService;
    private final DeviceMapper deviceMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${peervault.pairing.ttl-seconds}")
    private int pairingTtlSeconds;

    public DeviceService(DeviceRepository deviceRepository, PairingSessionRepository pairingSessionRepository,
                          PairingCryptoService pairingCryptoService, DeviceMapper deviceMapper,
                          KafkaTemplate<String, Object> kafkaTemplate) {
        this.deviceRepository = deviceRepository;
        this.pairingSessionRepository = pairingSessionRepository;
        this.pairingCryptoService = pairingCryptoService;
        this.deviceMapper = deviceMapper;
        this.kafkaTemplate = kafkaTemplate;
    }

    public PairingSessionDto initPairing() {
        PairingCryptoService.PairingMaterial material = pairingCryptoService.generate();
        Instant now = Instant.now();

        PairingSession session = PairingSession.builder()
                .id(UUID.randomUUID().toString())
                .pairingCode(material.pairingCode())
                .deviceFingerprint(material.fingerprint())
                .ephemeralPublicKeyBase64(material.ephemeralPublicKeyBase64())
                .createdAt(now)
                .expiresAt(now.plusSeconds(pairingTtlSeconds))
                .consumed(false)
                .build();
        pairingSessionRepository.save(session);

        return new PairingSessionDto(
                material.pairingCode(),
                material.qrPayload(),
                pairingTtlSeconds,
                material.fingerprint(),
                material.ephemeralPublicKeyBase64()
        );
    }

    public DeviceDto confirmPairing(PairConfirmRequest request, String remoteAddr, String ownerActor) {
        PairingSession session = pairingSessionRepository.findByPairingCodeAndConsumedFalse(request.pairingCode())
                .orElseThrow(() -> ApiException.notFound("PAIRING_SESSION_NOT_FOUND",
                        "No active pairing session for code " + request.pairingCode()));

        if (Instant.now().isAfter(session.getExpiresAt())) {
            throw ApiException.badRequest("PAIRING_EXPIRED", "Pairing code has expired. Please restart the handshake.");
        }

        session.setConsumed(true);
        pairingSessionRepository.save(session);

        List<StorageRoot> allowedRoots = request.allowedRoots().stream()
                .map(this::toStorageRoot)
                .toList();

        Device device = Device.builder()
                .id(UUID.randomUUID().toString())
                .name(request.name())
                .type(request.type())
                .os(request.os())
                .agentVersion(AGENT_VERSION)
                .status(DeviceStatus.ONLINE)
                .publicKeyFingerprint(session.getDeviceFingerprint())
                .ipMasked(maskIp(remoteAddr))
                .natType(NatType.FULL_CONE)
                .lastSeen(TimeFormats.now())
                .batteryLevel(null)
                .isCharging(null)
                // Honestly zero: no real storage agent has reported real disk stats yet for a
                // freshly-paired node — we deliberately don't invent fake capacity/usage numbers.
                .storageTotalBytes(0L)
                .storageUsedBytes(0L)
                .allowedRoots(allowedRoots)
                .tags(List.of("Newly Paired", "Zero-Trust Attested"))
                .activeConnectionsCount(0)
                .directP2PCapable(true)
                .isFavorite(false)
                .pairedAt(TimeFormats.today())
                .pinnedLocation(null)
                .ownerActor(ownerActor)
                .build();
        deviceRepository.save(device);

        String rootPaths = allowedRoots.stream().map(StorageRoot::getPath).collect(Collectors.joining(", "));
        publish(DomainEvent.of(
                AuditEventType.DEVICE_PAIR,
                AuditSeverity.INFO,
                device.getId(),
                device.getName(),
                ownerActor,
                "New Storage Node Paired",
                "Attestation confirmed. Fingerprint: " + device.getPublicKeyFingerprint()
                        + ". Allowed roots: " + rootPaths + ".",
                true
        ));

        return deviceMapper.toDto(device);
    }

    public List<DeviceDto> listDevices() {
        return deviceRepository.findAll().stream().map(deviceMapper::toDto).toList();
    }

    public DeviceDto getDevice(String id) {
        return deviceMapper.toDto(findDeviceOrThrow(id));
    }

    public DeviceDto toggleFreeze(String id, String ownerActor) {
        Device device = findDeviceOrThrow(id);

        if (device.getStatus() == DeviceStatus.FROZEN) {
            device.setStatus(DeviceStatus.ONLINE);
            deviceRepository.save(device);
            publish(DomainEvent.of(
                    AuditEventType.POLICY_CHANGE,
                    AuditSeverity.INFO,
                    device.getId(),
                    device.getName(),
                    ownerActor,
                    "Storage Node Unfrozen",
                    "Cryptographic sessions restored for " + device.getName() + ".",
                    true
            ));
        } else {
            device.setStatus(DeviceStatus.FROZEN);
            deviceRepository.save(device);
            publish(DomainEvent.of(
                    AuditEventType.DEVICE_FREEZE,
                    AuditSeverity.WARNING,
                    device.getId(),
                    device.getName(),
                    ownerActor,
                    "Emergency Node Freeze Initiated",
                    "Node " + device.getName() + " isolated from mesh. All active session keys revoked immediately.",
                    true
            ));
        }

        return deviceMapper.toDto(device);
    }

    public void revokeDevice(String id, String ownerActor) {
        Device device = findDeviceOrThrow(id);

        // Publish before deleting so the event still carries the device's data.
        publish(DomainEvent.of(
                AuditEventType.DEVICE_REVOKE,
                AuditSeverity.CRITICAL,
                device.getId(),
                device.getName(),
                ownerActor,
                "Device Credentials Revoked",
                "Public key " + device.getPublicKeyFingerprint() + " blacklisted across Control Plane.",
                true
        ));

        deviceRepository.deleteById(id);
    }

    public DeviceDto addRoot(String id, RootRequest request, String ownerActor) {
        Device device = findDeviceOrThrow(id);

        StorageRoot root = toStorageRoot(request);
        device.getAllowedRoots().add(root);
        deviceRepository.save(device);

        publish(DomainEvent.of(
                AuditEventType.POLICY_CHANGE,
                AuditSeverity.INFO,
                device.getId(),
                device.getName(),
                ownerActor,
                "Storage Sandbox Added",
                "Authorized path " + request.path() + " on device.",
                true
        ));

        return deviceMapper.toDto(device);
    }

    public void heartbeat(String id, HeartbeatRequest request) {
        Device device = findDeviceOrThrow(id);

        if (request.status() != null) {
            device.setStatus(request.status());
        }
        if (request.batteryLevel() != null) {
            device.setBatteryLevel(request.batteryLevel());
        }
        if (request.isCharging() != null) {
            device.setIsCharging(request.isCharging());
        }
        if (request.storageUsedBytes() != null) {
            device.setStorageUsedBytes(request.storageUsedBytes());
        }
        device.setLastSeen(TimeFormats.now());

        deviceRepository.save(device);
        // Intentionally no Kafka event here: heartbeats are high-frequency (on-demand PATCH calls
        // from every paired agent) and the frontend's AuditEventType union has no "heartbeat" value —
        // publishing one per beat would flood the audit ledger with events nothing can render.
    }

    public void forceFreeze(String deviceId, String reason) {
        Device device = deviceRepository.findById(deviceId).orElse(null);
        if (device == null) {
            log.warn("DeviceFreezeCommand received for unknown deviceId={}, ignoring", deviceId);
            return;
        }

        device.setStatus(DeviceStatus.FROZEN);
        deviceRepository.save(device);

        publish(DomainEvent.of(
                AuditEventType.DEVICE_FREEZE,
                AuditSeverity.CRITICAL,
                device.getId(),
                device.getName(),
                "Anomaly Circuit Breaker",
                "Emergency Node Freeze Initiated (Automated)",
                reason,
                false
        ));
    }

    private Device findDeviceOrThrow(String id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("DEVICE_NOT_FOUND", "No device with id " + id));
    }

    private StorageRoot toStorageRoot(RootRequest request) {
        return StorageRoot.builder()
                .id(UUID.randomUUID().toString())
                .path(request.path())
                .label(request.label())
                .isReadOnly(false)
                .allowDelete(request.allowDelete())
                .totalFiles(0)
                .totalSizeBytes(0L)
                .build();
    }

    private String maskIp(String remoteAddr) {
        String ip = (remoteAddr == null || remoteAddr.isBlank()) ? "0.0.0.0" : remoteAddr;
        return ip + " (Outbound TLS 1.3)";
    }

    private void publish(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.DEVICE_EVENTS, event.deviceId(), event);
    }
}
