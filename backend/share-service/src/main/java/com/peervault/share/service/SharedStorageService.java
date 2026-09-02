package com.peervault.share.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.AuditEventType;
import com.peervault.common.dto.AuditSeverity;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.dto.SharedStorageOverviewDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.StorageRootDto;
import com.peervault.common.dto.UploadFileRequestDto;
import com.peervault.common.event.DomainEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.share.client.DeviceClient;
import com.peervault.share.client.FileClient;
import com.peervault.share.domain.SharedStorage;
import com.peervault.share.mapper.ShareMapper;
import com.peervault.share.repo.SharedStorageRepository;
import com.peervault.share.web.dto.ShareFileUploadDto;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Post-acceptance shared-storage CRUD + the access-control gate for every cross-user file
 * operation this mesh has. share-service is the sole enforcement point — see backend/claude.md for
 * why file-service itself stays unaware of "sharing" rather than also independently re-checking
 * {@code SharedStorage} permissions.
 */
@Service
public class SharedStorageService {

    private final SharedStorageRepository sharedStorageRepository;
    private final ShareMapper shareMapper;
    private final DeviceClient deviceClient;
    private final FileClient fileClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public SharedStorageService(SharedStorageRepository sharedStorageRepository,
                                 ShareMapper shareMapper,
                                 DeviceClient deviceClient,
                                 FileClient fileClient,
                                 KafkaTemplate<String, Object> kafkaTemplate) {
        this.sharedStorageRepository = sharedStorageRepository;
        this.shareMapper = shareMapper;
        this.deviceClient = deviceClient;
        this.fileClient = fileClient;
        this.kafkaTemplate = kafkaTemplate;
    }

    public SharedStorageOverviewDto listStorage(String userId) {
        List<SharedStorageDto> sharedWithMe = sharedStorageRepository.findBySharedWithUserIdAndIsActiveTrue(userId)
                .stream().map(shareMapper::toDto).toList();
        List<SharedStorageDto> sharedByMe = sharedStorageRepository.findByOwnerIdAndIsActiveTrue(userId)
                .stream().map(shareMapper::toDto).toList();
        return new SharedStorageOverviewDto(sharedWithMe, sharedByMe);
    }

    public List<StorageFileDto> listFiles(String callerUserId, String sharedStorageId) {
        SharedStorage sharedStorage = loadActiveOrThrow(sharedStorageId);
        requirePermission(callerUserId, sharedStorage, SharePermission.READ);
        List<StorageFileDto> files = fileClient.listFiles(sharedStorage.getOwnerDeviceId(), sharedStorage.getStorageRootId());

        // Task 7: unlike file-service's own list()/getById() (never audited — reads aren't
        // mutations), a *cross-user* read through a share grant is exactly the kind of access a
        // security review wants visibility into, so this one is.
        publishAudit(AuditEventType.SHARE_FILE_ACCESSED, AuditSeverity.INFO, callerUserId, sharedStorage, "User (" + callerUserId + ")",
                "Shared Storage Files Listed",
                "Listed files in shared storage grant " + sharedStorage.getId() + ".");

        return files;
    }

    public StorageFileDto uploadFile(String callerUserId, String actor, String sharedStorageId, ShareFileUploadDto request) {
        SharedStorage sharedStorage = loadActiveOrThrow(sharedStorageId);
        requirePermission(callerUserId, sharedStorage, SharePermission.WRITE);

        UploadFileRequestDto uploadRequest = new UploadFileRequestDto(
                sharedStorage.getOwnerDeviceId(),
                sharedStorage.getStorageRootId(),
                resolveRootPath(sharedStorage),
                request.relativePath(),
                request.name(),
                request.extension(),
                request.sizeBytes(),
                request.mimeType(),
                request.sha256Hash(),
                request.sampleContent()
        );
        StorageFileDto uploaded = fileClient.uploadFile(uploadRequest);

        publishAudit(AuditEventType.SHARE_FILE_ACCESSED, AuditSeverity.INFO, callerUserId, sharedStorage, actor,
                "Shared Storage Upload: " + uploaded.name(),
                "Uploaded via shared storage grant " + sharedStorage.getId() + " by " + actor + ".");

        return uploaded;
    }

    public StorageFileDto deleteFile(String callerUserId, String actor, String sharedStorageId, String fileId) {
        SharedStorage sharedStorage = loadActiveOrThrow(sharedStorageId);
        requirePermission(callerUserId, sharedStorage, SharePermission.DELETE);

        // The grant only permits touching files inside its own (deviceId, rootId) — without this,
        // a DELETE-permitted caller could trash any fileId in the mesh just by guessing an id.
        StorageFileDto file = fileClient.getFile(fileId);
        boolean inSharedRoot = sharedStorage.getOwnerDeviceId().equals(file.deviceId())
                && sharedStorage.getStorageRootId().equals(file.rootId());
        if (!inSharedRoot) {
            throw ApiException.forbidden("FILE_NOT_IN_SHARED_ROOT",
                    "File " + fileId + " is not part of shared storage " + sharedStorageId);
        }

        StorageFileDto trashed = fileClient.trashFile(fileId);

        // WARNING severity (kept from Task 4) is what feeds the ransomware shield — see
        // AuditLedgerService.append. Attributing to callerUserId's own device (not always the
        // owner's, via publishAudit's actingDeviceId resolution below) is what Task 7 needed fixed:
        // a recipient's mass-delete now freezes *their* device, not the passive owner's.
        publishAudit(AuditEventType.SHARE_FILE_ACCESSED, AuditSeverity.WARNING, callerUserId, sharedStorage, actor,
                "Shared Storage Delete: " + trashed.name(),
                "Moved to soft-delete quarantine via shared storage grant " + sharedStorage.getId() + " by " + actor + ".");

        return trashed;
    }

    public SharedStorageDto revoke(String callerUserId, String actor, String sharedStorageId) {
        SharedStorage sharedStorage = sharedStorageRepository.findById(sharedStorageId)
                .orElseThrow(() -> ApiException.notFound("SHARED_STORAGE_NOT_FOUND", "No shared storage with id " + sharedStorageId));

        if (!callerUserId.equals(sharedStorage.getOwnerId())) {
            throw ApiException.forbidden("NOT_SHARE_OWNER", "Only the owner can revoke a shared storage grant");
        }

        if (!sharedStorage.isActive()) {
            return shareMapper.toDto(sharedStorage);
        }

        sharedStorage.setActive(false);
        sharedStorage.setRevokedAt(Instant.now());
        sharedStorageRepository.save(sharedStorage);

        publishAudit(AuditEventType.SHARE_STORAGE_ACCESS_REVOKED, AuditSeverity.INFO, callerUserId, sharedStorage, actor,
                "Shared Storage Revoked",
                "Access grant " + sharedStorage.getId() + " revoked by owner.");

        return shareMapper.toDto(sharedStorage);
    }

    /** Looks up the root's real filesystem path off device-service — SharedStorage only stores its id. */
    private String resolveRootPath(SharedStorage sharedStorage) {
        DeviceDto device = deviceClient.getDevice(sharedStorage.getOwnerDeviceId());
        List<StorageRootDto> roots = device.allowedRoots();
        return (roots == null ? List.<StorageRootDto>of() : roots).stream()
                .filter(root -> root.id().equals(sharedStorage.getStorageRootId()))
                .findFirst()
                .map(StorageRootDto::path)
                .orElseThrow(() -> ApiException.notFound("ROOT_NOT_FOUND",
                        "Storage root " + sharedStorage.getStorageRootId() + " no longer exists on device " + sharedStorage.getOwnerDeviceId()));
    }

    private SharedStorage loadActiveOrThrow(String sharedStorageId) {
        SharedStorage sharedStorage = sharedStorageRepository.findById(sharedStorageId)
                .orElseThrow(() -> ApiException.notFound("SHARED_STORAGE_NOT_FOUND", "No shared storage with id " + sharedStorageId));
        if (!sharedStorage.isActive()) {
            throw ApiException.conflict("SHARED_STORAGE_REVOKED", "This shared storage grant has been revoked");
        }
        return sharedStorage;
    }

    /** The owner always has full access to their own storage; the recipient is gated by {@code permissions}. */
    private void requirePermission(String callerUserId, SharedStorage sharedStorage, SharePermission required) {
        if (callerUserId.equals(sharedStorage.getOwnerId())) {
            return;
        }
        if (!callerUserId.equals(sharedStorage.getSharedWithUserId())) {
            throw ApiException.forbidden("NOT_SHARE_PARTICIPANT", "You have no access to this shared storage");
        }
        List<SharePermission> permissions = sharedStorage.getPermissions();
        if (permissions == null || !permissions.contains(required)) {
            throw ApiException.forbidden("PERMISSION_DENIED", "This share does not grant " + required.wire() + " access");
        }
    }

    /**
     * Reuses the existing FILE_EVENTS topic security-service's {@code AuditEventListener} already
     * consumes, rather than adding new wiring on the security-service side — see backend/claude.md.
     * {@code deviceId} is resolved to whichever device actually performed the action (the owner's or
     * the recipient's — see {@link #actingDeviceId}), not always the owner's: Task 7 needs this so
     * the ransomware shield attributes a shared-storage mass-delete to the real deleting user.
     */
    private void publishAudit(AuditEventType type, AuditSeverity severity, String callerUserId, SharedStorage sharedStorage,
                               String actor, String action, String details) {
        DomainEvent event = DomainEvent.of(type, severity, actingDeviceId(callerUserId, sharedStorage), null, actor, action, details, true);
        kafkaTemplate.send(KafkaTopics.FILE_EVENTS, event.eventId(), event);
    }

    /** The device that should be attributed for this action — the owner's own device if they're the
     *  caller (e.g. revoking their own grant), otherwise the recipient's device. */
    private String actingDeviceId(String callerUserId, SharedStorage sharedStorage) {
        return callerUserId.equals(sharedStorage.getOwnerId())
                ? sharedStorage.getOwnerDeviceId()
                : sharedStorage.getSharedWithDeviceId();
    }
}
