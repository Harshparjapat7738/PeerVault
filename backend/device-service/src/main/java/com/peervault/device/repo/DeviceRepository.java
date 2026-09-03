package com.peervault.device.repo;

import com.peervault.device.domain.Device;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DeviceRepository extends MongoRepository<Device, String> {

    /** Backs the per-user device dashboard listing and tenant-isolation checks. */
    List<Device> findByUserId(String userId);
}
