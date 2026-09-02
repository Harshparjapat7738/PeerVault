package com.peervault.common.dto;

/**
 * Internal-only cross-service response for auth-service's {@code GET /api/v1/auth/users/lookup}
 * (e.g. share-service resolving a share target's email to a userId at share-request time, when
 * the caller doesn't already know it). Not a mirror of any src/types.ts shape — nothing on the
 * frontend calls this endpoint directly.
 */
public record UserLookupDto(
        String userId,
        String email
) {
}
