package com.peervault.share.web;

import com.peervault.common.dto.ShareRequestDto;
import com.peervault.common.dto.SharedStorageDto;
import com.peervault.common.dto.ShareStatus;
import com.peervault.share.service.ShareRequestService;
import com.peervault.share.web.dto.ShareAcceptanceDto;
import com.peervault.share.web.dto.ShareRejectionDto;
import com.peervault.share.web.dto.ShareRequestCreateDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/share")
public class ShareController {

    private final ShareRequestService shareRequestService;

    public ShareController(ShareRequestService shareRequestService) {
        this.shareRequestService = shareRequestService;
    }

    @PostMapping("/request")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareRequestDto createShareRequest(@RequestHeader("X-User-Id") String userId,
                                               @Valid @RequestBody ShareRequestCreateDto request) {
        return shareRequestService.createShareRequest(userId, request);
    }

    /** Outgoing share requests initiated by the caller. Optional {@code ?status=} filters (e.g. pending). */
    @GetMapping("/requests/sent")
    public List<ShareRequestDto> listSent(@RequestHeader("X-User-Id") String userId,
                                           @RequestParam(required = false) ShareStatus status) {
        return shareRequestService.listSent(userId, status);
    }

    /** Incoming share requests addressed to the caller. Optional {@code ?status=} filters (e.g. pending). */
    @GetMapping("/requests/received")
    public List<ShareRequestDto> listReceived(@RequestHeader("X-User-Id") String userId,
                                               @RequestParam(required = false) ShareStatus status) {
        return shareRequestService.listReceived(userId, status);
    }

    /** Only the request's target (X-User-Id must match ShareRequest.targetUserId) may accept it. */
    @PostMapping("/request/{requestId}/accept")
    @ResponseStatus(HttpStatus.CREATED)
    public SharedStorageDto accept(@RequestHeader("X-User-Id") String userId,
                                    @PathVariable String requestId,
                                    @Valid @RequestBody ShareAcceptanceDto request) {
        return shareRequestService.acceptShareRequest(userId, requestId, request);
    }

    /** Only the request's target (X-User-Id must match ShareRequest.targetUserId) may reject it. */
    @PostMapping("/request/{requestId}/reject")
    public ShareRequestDto reject(@RequestHeader("X-User-Id") String userId,
                                   @PathVariable String requestId,
                                   @RequestBody(required = false) ShareRejectionDto request) {
        return shareRequestService.rejectShareRequest(userId, requestId, request);
    }
}
