package com.peervault.file.controller;

import com.peervault.common.dto.StorageFileDto;
import com.peervault.common.dto.UploadFileRequestDto;
import com.peervault.file.service.FileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/files")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @GetMapping
    public List<StorageFileDto> list(
            @RequestParam(required = false) String deviceId,
            @RequestParam(required = false) String rootId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestHeader(value = "X-User-Id", required = false) String userId
    ) {
        return fileService.list(deviceId, rootId, search, type, userId);
    }

    @GetMapping("/trash")
    public List<StorageFileDto> listTrash(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        return fileService.listTrash(userId);
    }

    @GetMapping("/{id}")
    public StorageFileDto getById(@PathVariable String id,
                                   @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return fileService.getById(id, userId);
    }

    @PostMapping
    public ResponseEntity<StorageFileDto> upload(@Valid @RequestBody UploadFileRequestDto req,
                                                  @RequestHeader(value = "X-User-Id", required = false) String userId) {
        StorageFileDto dto = fileService.upload(req, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/{id}/trash")
    public StorageFileDto trash(@PathVariable String id,
                                 @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return fileService.trash(id, userId);
    }

    @PostMapping("/{id}/restore")
    public StorageFileDto restore(@PathVariable String id,
                                   @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return fileService.restore(id, userId);
    }

    @DeleteMapping("/{id}/purge")
    public ResponseEntity<Void> purge(@PathVariable String id,
                                       @RequestHeader(value = "X-User-Id", required = false) String userId) {
        fileService.purge(id, userId);
        return ResponseEntity.noContent().build();
    }
}
