package com.peervault.device.repo;

import com.peervault.device.domain.Device;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DeviceRepository extends MongoRepository<Device, String> {
}
