package com.peervault.share.repo;

import com.peervault.share.domain.SharedStorage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SharedStorageRepository extends MongoRepository<SharedStorage, String> {

    List<SharedStorage> findBySharedWithUserIdAndIsActiveTrue(String sharedWithUserId);

    List<SharedStorage> findByOwnerIdAndIsActiveTrue(String ownerId);
}
