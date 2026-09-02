package com.peervault.share.domain;

import com.peervault.common.dto.SharePermission;
import com.peervault.common.dto.ShareStatus;
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
 * Mirrors {@code ShareRequest} in src/types.ts / {@code ShareRequestDto} field-for-field, except
 * timestamps: kept here as real {@link Instant}s (rather than the frontend's plain
 * {@code "yyyy-MM-dd HH:mm:ss"} strings) so the Task 3 expiry sweep can query
 * {@code status = PENDING and expiresAt < now} directly — the mapper that will produce
 * {@code ShareRequestDto} formats them down via {@link com.peervault.common.util.TimeFormats}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "share_requests")
public class ShareRequest {

    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Indexed
    private String requesterUserId;
    private String requesterDeviceId;

    @Indexed
    private String targetUserId;
    private String targetDeviceId;

    private String storageRootId;
    private List<SharePermission> permissions;

    @Indexed
    private ShareStatus status;

    private ShareTransferMode transferMode;

    /** Optional free-text note from the requester, shown to the target alongside the request. */
    private String message;

    @Indexed
    private Instant expiresAt;

    private Instant createdAt;
    private Instant updatedAt;
}
