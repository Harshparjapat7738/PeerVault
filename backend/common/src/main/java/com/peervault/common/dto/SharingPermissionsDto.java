package com.peervault.common.dto;

/**
 * Granular permissions granted to a device at QR-pairing confirm-time. Mirrors SharingPermissions in
 * src/types.ts. Deliberately used as-is for both {@code PairConfirmRequest}'s body and the persisted/
 * returned shape on {@code Device}/{@code DeviceDto} — unlike e.g. {@code RootRequest} vs.
 * {@code StorageRootDto}, a request-only and a returned shape here would be byte-for-byte identical,
 * so splitting them into two classes would buy nothing.
 *
 * <p>Read access to a device's own shared roots isn't a field here — it's implicit and always true,
 * and a checkbox that's always checked isn't a real choice, so it isn't modeled as one.
 *
 * <p>Note: setting these does not yet gate anything in {@code share-service} — see
 * {@code backend/CLAUDE.md}'s Task 9 entry for the flagged follow-up.
 */
public record SharingPermissionsDto(
        boolean canShareStorage,
        boolean canWrite,
        boolean canDelete,
        boolean canShareFurther
) {
}
