package com.peervault.security.repo;

import com.peervault.security.domain.ThreatEntry;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ThreatRepository extends MongoRepository<ThreatEntry, String> {
}
