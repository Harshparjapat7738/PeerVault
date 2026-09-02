package com.peervault.share.repo;

import com.peervault.common.dto.ShareStatus;
import com.peervault.share.domain.ShareRequest;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface ShareRequestRepository extends MongoRepository<ShareRequest, String> {

    List<ShareRequest> findByTargetUserIdAndStatus(String targetUserId, ShareStatus status);

    List<ShareRequest> findByTargetUserId(String targetUserId);

    List<ShareRequest> findByRequesterUserId(String requesterUserId);

    List<ShareRequest> findByRequesterUserIdAndStatus(String requesterUserId, ShareStatus status);

    /** Backs the Task 3 expiry sweep: every still-pending request whose deadline has passed. */
    List<ShareRequest> findByStatusAndExpiresAtBefore(ShareStatus status, Instant instant);
}
