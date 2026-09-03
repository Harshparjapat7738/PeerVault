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
import org.springframework.web.bind.annotation.RequestHeader;
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
    public List<TransferTaskDto> list(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        return transferService.listTransfers(userId);
    }

    @PostMapping("/download")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferTaskDto download(@Valid @RequestBody DownloadRequest request,
                                     @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return transferService.startDownload(request, userId);
    }

    @PostMapping("/direct")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferTaskDto direct(@Valid @RequestBody DirectTransferRequest request,
                                   @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return transferService.startDirectTransfer(request, userId);
    }

    @PostMapping("/{id}/pause-toggle")
    public TransferTaskDto pauseToggle(@PathVariable String id,
                                        @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return transferService.togglePause(id, userId);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable String id, @RequestHeader(value = "X-User-Id", required = false) String userId) {
        transferService.cancel(id, userId);
    }

    @PostMapping("/{id}/simulate-glitch")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void simulateGlitch(@PathVariable String id,
                                @RequestHeader(value = "X-User-Id", required = false) String userId) {
        transferService.simulateGlitch(id, userId);
    }
}
