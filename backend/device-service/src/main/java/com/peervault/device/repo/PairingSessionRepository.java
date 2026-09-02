package com.peervault.device.repo;

import com.peervault.device.domain.PairingSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface PairingSessionRepository extends MongoRepository<PairingSession, String> {

    Optional<PairingSession> findByPairingCodeAndConsumedFalse(String pairingCode);
}
