package com.peervault.transfer.web;

import com.peervault.common.dto.RelayStatusDto;
import com.peervault.common.dto.RelayUploadResponseDto;
import com.peervault.transfer.service.RelayTransferService;
import com.peervault.transfer.web.dto.RelayUploadMetadata;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/transfers/relay")
public class RelayTransferController {

    private final RelayTransferService relayTransferService;

    public RelayTransferController(RelayTransferService relayTransferService) {
        this.relayTransferService = relayTransferService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public RelayUploadResponseDto upload(@RequestPart("file") MultipartFile file,
                                          @Valid @RequestPart("metadata") RelayUploadMetadata metadata) throws IOException {
        return relayTransferService.upload(file, metadata);
    }

    @PostMapping("/{transferId}/download")
    public ResponseEntity<StreamingResponseBody> download(@PathVariable String transferId) {
        RelayTransferService.RelayDownloadPayload payload = relayTransferService.download(transferId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(payload.contentType()))
                .contentLength(payload.contentLength())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + payload.filename() + "\"")
                .body(payload.body());
    }

    @GetMapping("/{transferId}/status")
    public RelayStatusDto status(@PathVariable String transferId) {
        return relayTransferService.status(transferId);
    }
}
