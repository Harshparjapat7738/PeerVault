package com.peervault.share.client;

import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.UploadFileRequestDto;
import com.peervault.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.List;

/**
 * Eureka-resolved REST client to file-service — every file operation a shared-storage grant allows
 * goes through here, always scoped to {@code (ownerDeviceId, storageRootId)} that
 * {@link com.peervault.share.service.SharedStorageService} resolves from the grant itself, never
 * from caller input.
 */
@Service
@RequiredArgsConstructor
public class FileClient {

    private final RestClient.Builder loadBalancedRestClientBuilder;

    public List<StorageFileDto> listFiles(String deviceId, String rootId) {
        List<StorageFileDto> result = loadBalancedRestClientBuilder.build()
                .get()
                .uri("http://file-service/api/v1/files?deviceId={deviceId}&rootId={rootId}", deviceId, rootId)
                .retrieve()
                .body(new ParameterizedTypeReference<List<StorageFileDto>>() {
                });
        return result != null ? result : List.of();
    }

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

    public StorageFileDto uploadFile(UploadFileRequestDto request) {
        return loadBalancedRestClientBuilder.build()
                .post()
                .uri("http://file-service/api/v1/files")
                .body(request)
                .retrieve()
                .body(StorageFileDto.class);
    }

    public StorageFileDto trashFile(String id) {
        try {
            return loadBalancedRestClientBuilder.build()
                    .post()
                    .uri("http://file-service/api/v1/files/{id}/trash", id)
                    .retrieve()
                    .body(StorageFileDto.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("FILE_NOT_FOUND", "No file with id " + id);
        }
    }
}
