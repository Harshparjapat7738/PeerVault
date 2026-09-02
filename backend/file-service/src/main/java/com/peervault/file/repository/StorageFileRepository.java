package com.peervault.file.repository;

import com.peervault.file.domain.StorageFile;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface StorageFileRepository extends MongoRepository<StorageFile, String> {

    List<StorageFile> findByInTrash(Boolean inTrash);

    List<StorageFile> findByInTrashAndTrashExpiresAtInstantBefore(Boolean inTrash, Instant instant);
}
