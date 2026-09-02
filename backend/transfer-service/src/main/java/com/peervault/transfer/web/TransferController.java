package com.peervault.transfer.web;

import com.peervault.common.dto.TransferTaskDto;
import com.peervault.transfer.service.TransferService;
import com.peervault.transfer.web.dto.DirectTransferRequest;
import com.peervault.transfer.web.dto.DownloadRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @GetMapping
    public List<TransferTaskDto> list() {
        return transferService.listTransfers();
    }

    @PostMapping("/download")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferTaskDto download(@Valid @RequestBody DownloadRequest request) {
        return transferService.startDownload(request);
    }

    @PostMapping("/direct")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferTaskDto direct(@Valid @RequestBody DirectTransferRequest request) {
        return transferService.startDirectTransfer(request);
    }

    @PostMapping("/{id}/pause-toggle")
    public TransferTaskDto pauseToggle(@PathVariable String id) {
        return transferService.togglePause(id);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable String id) {
        transferService.cancel(id);
    }

    @PostMapping("/{id}/simulate-glitch")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void simulateGlitch(@PathVariable String id) {
        transferService.simulateGlitch(id);
    }
}
