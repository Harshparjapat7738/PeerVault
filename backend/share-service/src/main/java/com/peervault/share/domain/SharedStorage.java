package com.peervault.share.domain;

import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.ShareTransferMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Mirrors {@code SharedStorage} in src/types.ts / {@code SharedStorageDto} field-for-field.
 * Created once its originating {@link ShareRequest} is accepted (Task 3); {@code isActive} flips
 * to {@code false} on revoke rather than deleting the row, so a share's history stays queryable
 * (Task 4).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "shared_storages")
public class SharedStorage {

    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Indexed
    private String ownerId;

    /** Which of the owner's devices {@code storageRootId} actually lives on — needed to call file-service. */
    private String ownerDeviceId;

    @Indexed
    private String sharedWithUserId;
    private String sharedWithDeviceId;

    private String storageRootId;
    private List<SharePermission> permissions;

    /** Carried over from the originating ShareRequest at accept time — see Task 3 notes. */
    private ShareTransferMode transferMode;

    @Indexed
    private boolean isActive;

    private Instant createdAt;
    private Instant revokedAt;
}
