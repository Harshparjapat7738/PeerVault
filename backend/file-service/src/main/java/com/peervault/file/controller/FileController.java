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
            @RequestParam(required = false) String type
    ) {
        return fileService.list(deviceId, rootId, search, type);
    }

    @GetMapping("/trash")
    public List<StorageFileDto> listTrash() {
        return fileService.listTrash();
    }

    @GetMapping("/{id}")
    public StorageFileDto getById(@PathVariable String id) {
        return fileService.getById(id);
    }

    @PostMapping
    public ResponseEntity<StorageFileDto> upload(@Valid @RequestBody UploadFileRequestDto req) {
        StorageFileDto dto = fileService.upload(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/{id}/trash")
    public StorageFileDto trash(@PathVariable String id) {
        return fileService.trash(id);
    }

    @PostMapping("/{id}/restore")
    public StorageFileDto restore(@PathVariable String id) {
        return fileService.restore(id);
    }

    @DeleteMapping("/{id}/purge")
    public ResponseEntity<Void> purge(@PathVariable String id) {
        fileService.purge(id);
        return ResponseEntity.noContent().build();
    }
}
