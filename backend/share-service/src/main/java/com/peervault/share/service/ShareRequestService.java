package com.peervault.share.service;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.ShareRequestDto;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.dto.ShareStatus;
import com.peervault.common.event.ShareAcceptanceEvent;
import com.peervault.common.event.ShareRejectionEvent;
import com.peervault.common.event.ShareRequestEvent;
import com.peervault.common.exception.ApiException;
import com.peervault.common.util.TimeFormats;
import com.peervault.share.client.AuthClient;
import com.peervault.share.client.DeviceClient;
import com.peervault.share.domain.ShareRequest;
import com.peervault.share.domain.SharedStorage;
import com.peervault.share.mapper.ShareMapper;
import com.peervault.share.repo.ShareRequestRepository;
import com.peervault.share.repo.SharedStorageRepository;
import com.peervault.share.web.dto.ShareAcceptanceDto;
import com.peervault.share.web.dto.ShareRejectionDto;
import com.peervault.share.web.dto.ShareRequestCreateDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;

@Service
public class ShareRequestService {

    private final ShareRequestRepository shareRequestRepository;
    private final SharedStorageRepository sharedStorageRepository;
    private final DeviceClient deviceClient;
    private final AuthClient authClient;
    private final ShareMapper shareMapper;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final StringRedisTemplate redisTemplate;
    private final long requestTtlHours;
    private final long rateLimitCount;
    private final long rateLimitWindowSeconds;

    public ShareRequestService(ShareRequestRepository shareRequestRepository,
                                SharedStorageRepository sharedStorageRepository,
                                DeviceClient deviceClient,
                                AuthClient authClient,
                                ShareMapper shareMapper,
                                KafkaTemplate<String, Object> kafkaTemplate,
                                StringRedisTemplate redisTemplate,
                                @Value("${peervault.share.request-ttl-hours:72}") long requestTtlHours,
                                @Value("${peervault.share.rate-limit-count:20}") long rateLimitCount,
                                @Value("${peervault.share.rate-limit-window-seconds:3600}") long rateLimitWindowSeconds) {
        this.shareRequestRepository = shareRequestRepository;
        this.sharedStorageRepository = sharedStorageRepository;
        this.deviceClient = deviceClient;
        this.authClient = authClient;
        this.shareMapper = shareMapper;
        this.kafkaTemplate = kafkaTemplate;
        this.redisTemplate = redisTemplate;
        this.requestTtlHours = requestTtlHours;
        this.rateLimitCount = rateLimitCount;
        this.rateLimitWindowSeconds = rateLimitWindowSeconds;
    }

    public ShareRequestDto createShareRequest(String requesterUserId, ShareRequestCreateDto dto) {
        enforceRateLimit(requesterUserId);
        validateRequesterOwnsRoot(dto.requesterDeviceId(), dto.storageRootId());

        String targetUserId = resolveTargetUserId(dto);
        if (targetUserId.equals(requesterUserId)) {
            throw ApiException.badRequest("SELF_SHARE_NOT_ALLOWED", "Cannot share storage with yourself");
        }

        Instant now = Instant.now();
        Instant expiresAt = parseExpiry(dto.expiresAt()).orElse(now.plus(Duration.ofHours(requestTtlHours)));

        ShareRequest entity = ShareRequest.builder()
                .requesterUserId(requesterUserId)
                .requesterDeviceId(dto.requesterDeviceId())
                .targetUserId(targetUserId)
                .targetDeviceId(dto.targetDeviceId())
                .storageRootId(dto.storageRootId())
                .permissions(dto.permissions())
                .status(ShareStatus.PENDING)
                .transferMode(dto.transferMode())
                .message(dto.message())
                .expiresAt(expiresAt)
                .createdAt(now)
                .updatedAt(now)
                .build();
        shareRequestRepository.save(entity);

        ShareRequestDto result = shareMapper.toDto(entity);
        // The trigger for Task 3's notification fan-out (WS push if the target device is online,
        // email fallback otherwise): share-service only ever publishes the event, it never talks to
        // notification-service or SMTP directly, same separation of concerns device/file/transfer/
        // auth/security already use with DomainEvent.
        kafkaTemplate.send(KafkaTopics.SHARE_REQUESTS, entity.getId(), ShareRequestEvent.of(result));
        return result;
    }

    public List<ShareRequestDto> listSent(String requesterUserId, ShareStatus statusFilter) {
        List<ShareRequest> results = statusFilter != null
                ? shareRequestRepository.findByRequesterUserIdAndStatus(requesterUserId, statusFilter)
                : shareRequestRepository.findByRequesterUserId(requesterUserId);
        return results.stream().map(shareMapper::toDto).toList();
    }

    public List<ShareRequestDto> listReceived(String targetUserId, ShareStatus statusFilter) {
        List<ShareRequest> results = statusFilter != null
                ? shareRequestRepository.findByTargetUserIdAndStatus(targetUserId, statusFilter)
                : shareRequestRepository.findByTargetUserId(targetUserId);
        return results.stream().map(shareMapper::toDto).toList();
    }

    public SharedStorageDto acceptShareRequest(String callerUserId, String requestId, ShareAcceptanceDto dto) {
        ShareRequest shareRequest = loadPendingOrThrow(requestId);
        authorizeTarget(callerUserId, shareRequest);

        // Best-effort: confirms the device exists, not that it belongs to callerUserId — same
        // single-tenant schema gap as the requester-side check in createShareRequest (see
        // backend/claude.md).
        deviceClient.getDevice(dto.targetDeviceId());

        Instant now = Instant.now();
        SharedStorage sharedStorage = SharedStorage.builder()
                .ownerId(shareRequest.getRequesterUserId())
                .ownerDeviceId(shareRequest.getRequesterDeviceId())
                .sharedWithUserId(shareRequest.getTargetUserId())
                .sharedWithDeviceId(dto.targetDeviceId())
                .storageRootId(shareRequest.getStorageRootId())
                .permissions(shareRequest.getPermissions())
                .transferMode(shareRequest.getTransferMode())
                .isActive(true)
                .createdAt(now)
                .build();
        sharedStorageRepository.save(sharedStorage);

        shareRequest.setStatus(ShareStatus.ACCEPTED);
        shareRequest.setUpdatedAt(now);
        shareRequestRepository.save(shareRequest);

        SharedStorageDto result = shareMapper.toDto(sharedStorage);
        kafkaTemplate.send(KafkaTopics.SHARE_ACCEPTANCES, shareRequest.getId(),
                ShareAcceptanceEvent.of(shareRequest.getId(), result, dto.customMessage()));
        return result;
    }

    public ShareRequestDto rejectShareRequest(String callerUserId, String requestId, ShareRejectionDto dto) {
        ShareRequest shareRequest = loadPendingOrThrow(requestId);
        authorizeTarget(callerUserId, shareRequest);

        shareRequest.setStatus(ShareStatus.REJECTED);
        shareRequest.setUpdatedAt(Instant.now());
        shareRequestRepository.save(shareRequest);

        String reason = dto == null ? null : dto.reason();
        kafkaTemplate.send(KafkaTopics.SHARE_REJECTIONS, shareRequest.getId(),
                ShareRejectionEvent.of(shareRequest.getId(), shareRequest.getRequesterUserId(),
                        shareRequest.getRequesterDeviceId(), callerUserId, reason));
        return shareMapper.toDto(shareRequest);
    }

    /**
     * Loads the request and lazily expires it if {@code expiresAt} has passed but no scheduled
     * sweep has caught it yet (none exists as of Task 3 — {@code findByStatusAndExpiresAtBefore}
     * from Task 1 is still unused). Throws if the request doesn't exist or isn't (still) PENDING.
     */
    private ShareRequest loadPendingOrThrow(String requestId) {
        ShareRequest shareRequest = shareRequestRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("SHARE_REQUEST_NOT_FOUND", "No share request with id " + requestId));

        if (shareRequest.getStatus() == ShareStatus.PENDING && Instant.now().isAfter(shareRequest.getExpiresAt())) {
            shareRequest.setStatus(ShareStatus.EXPIRED);
            shareRequest.setUpdatedAt(Instant.now());
            shareRequestRepository.save(shareRequest);
        }

        if (shareRequest.getStatus() != ShareStatus.PENDING) {
            throw ApiException.conflict("SHARE_REQUEST_NOT_PENDING",
                    "Share request " + requestId + " is " + shareRequest.getStatus().wire() + ", not pending");
        }
        return shareRequest;
    }

    /** Only the request's target can accept/reject it — not enforced anywhere until this task. */
    private void authorizeTarget(String callerUserId, ShareRequest shareRequest) {
        if (!shareRequest.getTargetUserId().equals(callerUserId)) {
            throw ApiException.forbidden("NOT_SHARE_TARGET", "You are not the target of this share request");
        }
    }

    /**
     * Confirms {@code storageRootId} exists in {@code requesterDeviceId}'s {@code allowedRoots} via
     * device-service. This is the strongest ownership check available with the current schema —
     * {@code Device} has no {@code userId}/owner field anywhere in the mesh (the control plane is
     * single-tenant today; see backend/claude.md for the full note), so this cannot also confirm the
     * device belongs to {@code requesterUserId}. Closing that gap is out of scope for Task 2.
     */
    private void validateRequesterOwnsRoot(String requesterDeviceId, String storageRootId) {
        DeviceDto device = deviceClient.getDevice(requesterDeviceId);
        boolean ownsRoot = device.allowedRoots() != null && device.allowedRoots().stream()
                .anyMatch(root -> root.id().equals(storageRootId));
        if (!ownsRoot) {
            throw ApiException.forbidden("ROOT_NOT_OWNED",
                    "Device " + requesterDeviceId + " has no storage root " + storageRootId);
        }
    }

    private String resolveTargetUserId(ShareRequestCreateDto dto) {
        if (dto.targetUserId() != null && !dto.targetUserId().isBlank()) {
            return dto.targetUserId();
        }
        if (dto.targetEmail() != null && !dto.targetEmail().isBlank()) {
            return authClient.lookupByEmail(dto.targetEmail()).userId();
        }
        throw ApiException.badRequest("TARGET_REQUIRED", "Either targetUserId or targetEmail is required");
    }

    private Optional<Instant> parseExpiry(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDateTime.parse(expiresAt, TimeFormats.TIMESTAMP).toInstant(ZoneOffset.UTC));
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("INVALID_EXPIRES_AT", "expiresAt must match yyyy-MM-dd HH:mm:ss");
        }
    }

    /** Sliding-window-ish (fixed window, reset on first hit) counter, same shape as security-service's ransomware shield. */
    private void enforceRateLimit(String userId) {
        String key = "share:requests:" + userId + ":hourly";
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, Duration.ofSeconds(rateLimitWindowSeconds));
        }
        if (count != null && count > rateLimitCount) {
            throw ApiException.tooManyRequests("SHARE_REQUEST_RATE_LIMITED",
                    "Too many share requests — limit is " + rateLimitCount + " per " + rateLimitWindowSeconds + "s");
        }
    }
}
