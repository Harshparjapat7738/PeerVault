package com.peervault.transfer.repo;

import com.peervault.transfer.domain.TransferTask;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface TransferTaskRepository extends MongoRepository<TransferTask, String> {

    /** Backs RelayCleanupScheduler's TTL sweep: relay blobs still on disk past their deadline. */
    List<TransferTask> findByRelayFileIdNotNullAndRelayExpiresAtBefore(Instant instant);

    /** Backs the tenant-scoped transfer listing. */
    List<TransferTask> findByInitiatedByUserId(String userId);
}
