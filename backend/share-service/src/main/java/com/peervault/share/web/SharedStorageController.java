package com.peervault.share.web;

import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.dto.SharedStorageOverviewDto;
import com.peervault.common.dto.StorageFileDto;
import com.peervault.share.service.SharedStorageService;
import com.peervault.share.web.dto.ShareFileUploadDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/share/storage")
public class SharedStorageController {

    private final SharedStorageService sharedStorageService;

    public SharedStorageController(SharedStorageService sharedStorageService) {
        this.sharedStorageService = sharedStorageService;
    }

    /** Both directions in one call: storage shared WITH the caller, and storage the caller has shared TO others. */
    @GetMapping
    public SharedStorageOverviewDto list(@RequestHeader("X-User-Id") String userId) {
        return sharedStorageService.listStorage(userId);
    }

    @GetMapping("/{sharedStorageId}/files")
    public List<StorageFileDto> listFiles(@RequestHeader("X-User-Id") String userId,
                                           @PathVariable String sharedStorageId) {
        return sharedStorageService.listFiles(userId, sharedStorageId);
    }

    @PostMapping("/{sharedStorageId}/files")
    @ResponseStatus(HttpStatus.CREATED)
    public StorageFileDto uploadFile(@RequestHeader("X-User-Id") String userId,
                                      @PathVariable String sharedStorageId,
                                      @Valid @RequestBody ShareFileUploadDto request,
                                      HttpServletRequest httpRequest) {
        return sharedStorageService.uploadFile(userId, resolveActor(httpRequest), sharedStorageId, request);
    }

    @DeleteMapping("/{sharedStorageId}/files/{fileId}")
    public StorageFileDto deleteFile(@RequestHeader("X-User-Id") String userId,
                                      @PathVariable String sharedStorageId,
                                      @PathVariable String fileId,
                                      HttpServletRequest httpRequest) {
        return sharedStorageService.deleteFile(userId, resolveActor(httpRequest), sharedStorageId, fileId);
    }

    /** Owner only. Soft revoke: SharedStorage.isActive flips to false, never deleted. */
    @DeleteMapping("/{sharedStorageId}")
    public SharedStorageDto revoke(@RequestHeader("X-User-Id") String userId,
                                    @PathVariable String sharedStorageId,
                                    HttpServletRequest httpRequest) {
        return sharedStorageService.revoke(userId, resolveActor(httpRequest), sharedStorageId);
    }

    /** api-gateway forwards X-User-Email once the JWT is validated; same pattern DeviceController uses. */
    private String resolveActor(HttpServletRequest request) {
        String email = request.getHeader("X-User-Email");
        if (email == null || email.isBlank()) {
            return "User";
        }
        return "User (" + email + ")";
    }
}
