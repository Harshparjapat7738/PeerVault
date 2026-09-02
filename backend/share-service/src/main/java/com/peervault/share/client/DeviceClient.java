package com.peervault.share.client;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/**
 * Eureka-resolved REST client to device-service — share-service never trusts a client-forged
 * {@code storageRootId}; it fetches the real {@link DeviceDto} and checks {@code allowedRoots}
 * itself. Same pattern as transfer-service's {@code DeviceClient}.
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
}
