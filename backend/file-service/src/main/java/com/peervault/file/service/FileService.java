package com.peervault.file.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.UploadFileRequestDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.file.client.DeviceClient;
import com.peervault.file.domain.FilePermissions;
import com.peervault.file.domain.StorageFile;
import com.peervault.file.mapper.FileMapper;
import com.peervault.file.repository.StorageFileRepository;
import com.peervault.common.util.TimeFormats;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

/**
 * File metadata registry + soft-delete trash quarantine business logic. Every audit-worthy mutation
 * publishes a {@link DomainEvent} to {@link KafkaTopics#FILE_EVENTS} — security-service's ransomware
 * shield specifically watches for the {@code (FILE_DELETE, WARNING)} combination published by
 * {@link #trash(String)}.
 */
@Service
public class FileService {

    private static final Set<String> CODE_EXTENSIONS = Set.of("rs", "ts", "tsx", "js", "py", "json", "env");
    private static final Set<String> ARCHIVE_EXTENSIONS = Set.of("zip", "tar", "gz", "enc", "safetensors");
    private static final Set<String> MEDIA_EXTENSIONS = Set.of("mov", "mp4", "png", "jpg", "jpeg", "raw");
    private static final Set<String> DOC_EXTENSIONS = Set.of("pdf", "txt", "md", "docx");

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final StorageFileRepository repository;
    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final DeviceClient deviceClient;

    @Value("${peervault.trash.retention-days:30}")
    private int trashRetentionDays;

    public FileService(StorageFileRepository repository, MongoTemplate mongoTemplate,
                        KafkaTemplate<String, Object> kafkaTemplate, DeviceClient deviceClient) {
        this.repository = repository;
        this.mongoTemplate = mongoTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.deviceClient = deviceClient;
    }

    /**
     * Tenant isolation, gated on {@code userId} being present: a real browser request through the
     * gateway always carries {@code X-User-Id}, so it's enforced there; internal Eureka-to-Eureka
     * calls (share-service's {@code FileClient}, which is the deliberate "sole gate" for shared-storage
     * access per Task 4) carry no such header and stay unaffected — see backend/CLAUDE.md.
     */
    public List<StorageFileDto> list(String deviceId, String rootId, String search, String type, String userId) {
        Query query = new Query(Criteria.where("inTrash").ne(true));

        if (deviceId != null && !deviceId.isBlank() && !"all".equalsIgnoreCase(deviceId)) {
            requireOwnedDevice(deviceId, userId);
            query.addCriteria(Criteria.where("deviceId").is(deviceId));
        } else if (userId != null && !userId.isBlank()) {
            List<String> ownedDeviceIds = deviceClient.listDeviceIdsForUser(userId);
            if (ownedDeviceIds.isEmpty()) {
                return List.of();
            }
            query.addCriteria(Criteria.where("deviceId").in(ownedDeviceIds));
        }

        // Scopes to one storage root within a device — share-service relies on this to list only
        // the files inside a specific SharedStorage grant's root, not the owner's whole device.
        if (rootId != null && !rootId.isBlank()) {
            query.addCriteria(Criteria.where("rootId").is(rootId));
        }

        if (search != null && !search.isBlank()) {
            String regex = ".*" + java.util.regex.Pattern.quote(search) + ".*";
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("name").regex(regex, "i"),
                    Criteria.where("relativePath").regex(regex, "i"),
                    Criteria.where("sha256Hash").regex(regex, "i")
            ));
        }

        Set<String> extensions = extensionsForType(type);
        if (extensions != null) {
            query.addCriteria(Criteria.where("extension").in(extensions));
        }

        return mongoTemplate.find(query, StorageFile.class).stream()
                .map(FileMapper::toDto)
                .toList();
    }

    private Set<String> extensionsForType(String type) {
        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type)) {
            return null;
        }
        return switch (type.toLowerCase()) {
            case "code" -> CODE_EXTENSIONS;
            case "archive" -> ARCHIVE_EXTENSIONS;
            case "media" -> MEDIA_EXTENSIONS;
            case "doc" -> DOC_EXTENSIONS;
            default -> null;
        };
    }

    public List<StorageFileDto> listTrash(String userId) {
        if (userId != null && !userId.isBlank()) {
            List<String> ownedDeviceIds = deviceClient.listDeviceIdsForUser(userId);
            if (ownedDeviceIds.isEmpty()) {
                return List.of();
            }
            return repository.findByInTrashAndDeviceIdIn(true, ownedDeviceIds).stream()
                    .map(FileMapper::toDto)
                    .toList();
        }
        return repository.findByInTrash(true).stream()
                .map(FileMapper::toDto)
                .toList();
    }

    public StorageFileDto getById(String id, String userId) {
        StorageFile file = findOrThrow(id);
        requireOwnedDevice(file.getDeviceId(), userId);
        return FileMapper.toDto(file);
    }

    public StorageFileDto upload(UploadFileRequestDto req, String userId) {
        requireOwnedDevice(req.deviceId(), userId);
        String sha256 = req.sha256Hash();
        if (sha256 == null || sha256.isBlank()) {
            // Stand-in for client-side hashing a real Rust storage agent would perform before upload:
            // generate a random 64-hex-char placeholder so the record still has a well-formed hash.
            byte[] bytes = new byte[32];
            SECURE_RANDOM.nextBytes(bytes);
            sha256 = toHex(bytes);
        }

        StorageFile file = StorageFile.builder()
                .id(java.util.UUID.randomUUID().toString())
                .deviceId(req.deviceId())
                .rootId(req.rootId())
                .rootPath(req.rootPath())
                .relativePath(req.relativePath())
                .name(req.name())
                .extension(req.extension())
                .sizeBytes(req.sizeBytes())
                .modifiedAt(TimeFormats.now())
                .modifiedAtInstant(Instant.now())
                .sha256Hash(sha256)
                .mimeType(req.mimeType())
                .isDirectory(false)
                .isFavorite(false)
                .inTrash(false)
                .permissions(FilePermissions.builder().read(true).write(true).delete(true).build())
                .version(1)
                .sampleContent(req.sampleContent())
                .build();

        StorageFile saved = repository.save(file);

        publish(DomainEvent.of(
                AuditEventType.FILE_TRANSFER,
                AuditSeverity.INFO,
                saved.getDeviceId(),
                null,
                "User",
                "File Uploaded: " + saved.getName(),
                "Registered on storage node via encrypted upload channel.",
                true
        ));

        return FileMapper.toDto(saved);
    }

    public StorageFileDto trash(String id, String userId) {
        StorageFile file = findOrThrow(id);
        requireOwnedDevice(file.getDeviceId(), userId);

        Instant expiresAtInstant = Instant.now().plus(Duration.ofDays(trashRetentionDays));

        file.setInTrash(true);
        file.setTrashedAt(TimeFormats.now());
        file.setTrashExpiresAtInstant(expiresAtInstant);
        file.setTrashExpiresAt(TimeFormats.format(LocalDateTime.ofInstant(expiresAtInstant, ZoneOffset.UTC)));

        StorageFile saved = repository.save(file);

        publish(DomainEvent.of(
                AuditEventType.FILE_DELETE,
                AuditSeverity.WARNING,
                saved.getDeviceId(),
                null,
                "User",
                "Moved to Soft-Delete Quarantine: " + saved.getName(),
                "File preserved in .trash_vault for 30-day recovery window.",
                true
        ));

        return FileMapper.toDto(saved);
    }

    public StorageFileDto restore(String id, String userId) {
        StorageFile file = findOrThrow(id);
        requireOwnedDevice(file.getDeviceId(), userId);

        file.setInTrash(false);
        file.setTrashedAt(null);
        file.setTrashExpiresAt(null);
        file.setTrashExpiresAtInstant(null);

        StorageFile saved = repository.save(file);

        publish(DomainEvent.of(
                AuditEventType.POLICY_CHANGE,
                AuditSeverity.INFO,
                saved.getDeviceId(),
                null,
                "User",
                "File Restored",
                "Restored to original sandbox directory.",
                true
        ));

        return FileMapper.toDto(saved);
    }

    public void purge(String id, String userId) {
        StorageFile file = findOrThrow(id);
        requireOwnedDevice(file.getDeviceId(), userId);

        publish(DomainEvent.of(
                AuditEventType.FILE_DELETE,
                AuditSeverity.INFO,
                file.getDeviceId(),
                null,
                "User",
                "Permanently Purged: " + file.getName(),
                "File unlinked from physical storage.",
                true
        ));

        repository.deleteById(id);
    }

    private StorageFile findOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("FILE_NOT_FOUND", "File not found: " + id));
    }

    /**
     * Skipped when {@code userId} is blank (internal service-to-service caller — see class javadoc).
     * When present, 404s exactly like a missing file rather than 403, so a probing caller can't use
     * the error to distinguish "not yours" from "doesn't exist" and enumerate other users' file ids.
     */
    private void requireOwnedDevice(String deviceId, String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        DeviceDto device = deviceClient.getDevice(deviceId);
        if (device.userId() == null || !device.userId().equals(userId)) {
            throw ApiException.notFound("FILE_NOT_FOUND", "File not found");
        }
    }

    private void publish(DomainEvent event) {
        kafkaTemplate.send(KafkaTopics.FILE_EVENTS, event.deviceId() != null ? event.deviceId() : event.eventId(), event);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
