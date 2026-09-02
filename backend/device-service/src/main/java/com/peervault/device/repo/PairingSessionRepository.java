package com.peervault.device.repo;

import com.peervault.device.domain.PairingSession;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * QR-only pairing: the session's own {@code id} (a UUID, embedded in the QR payload) is the lookup
 * key at confirm-time, so the inherited {@link #findById(Object)} is all this needs — no custom
 * finder for a human-typed code, because there is no human-typed code.
 */
public interface PairingSessionRepository extends MongoRepository<PairingSession, String> {
}
