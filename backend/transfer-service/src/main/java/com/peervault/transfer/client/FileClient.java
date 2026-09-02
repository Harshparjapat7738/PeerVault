package com.peervault.transfer.client;

import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/** Eureka-resolved REST client to file-service — transfer-service never trusts client-forged size/hash. */
@Service
@RequiredArgsConstructor
public class FileClient {

    private final RestClient.Builder loadBalancedRestClientBuilder;

    public StorageFileDto getFile(String id) {
        try {
            return loadBalancedRestClientBuilder.build()
                    .get()
                    .uri("http://file-service/api/v1/files/{id}", id)
                    .retrieve()
                    .body(StorageFileDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("FILE_NOT_FOUND", "No file with id " + id);
        }
    }
}
