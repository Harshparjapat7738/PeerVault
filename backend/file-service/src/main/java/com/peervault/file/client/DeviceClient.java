package com.peervault.file.client;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Eureka-resolved REST client to device-service, used only for tenant-isolation checks — file-service
 * never trusts client-forged device data (same pattern as transfer-service's/share-service's own
 * {@code DeviceClient}). These calls never carry {@code X-User-Id} themselves (they're internal
 * service-to-service hops), except {@link #listDeviceIdsForUser(String)}, which deliberately forwards
 * the already-authenticated browser caller's own id one hop further, not a spoofed/forged value.
 */
@Service
@RequiredArgsConstructor
public class DeviceClient {

    private final RestClient.Builder loadBalancedRestClientBuilder;

    public DeviceDto getDevice(String id) {
        try {
            return loadBalancedRestClientBuilder.build()
                    .get()
                    .uri("http://device-service/api/v1/devices/{id}", id)
                    .retrieve()
                    .body(DeviceDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("DEVICE_NOT_FOUND", "No device with id " + id);
        }
    }

    /** The ids of every device owned by {@code userId} — backs "list my files across all my devices". */
    public List<String> listDeviceIdsForUser(String userId) {
        List<DeviceDto> devices = loadBalancedRestClientBuilder.build()
                .get()
                .uri("http://device-service/api/v1/devices")
                .header("X-User-Id", userId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<DeviceDto>>() {
                });
        return devices == null ? List.of() : devices.stream().map(DeviceDto::id).toList();
    }
}
