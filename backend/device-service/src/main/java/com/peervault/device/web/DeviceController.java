package com.peervault.device.web;

import com.peervault.common.dto.DeviceDto;
import com.peervault.common.dto.PairingSessionDto;
import com.peervault.device.service.DeviceService;
import com.peervault.device.web.dto.HeartbeatRequest;
import com.peervault.device.web.dto.PairConfirmRequest;
import com.peervault.device.web.dto.RootRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @PostMapping("/pair/init")
    public PairingSessionDto initPairing() {
        return deviceService.initPairing();
    }

    @PostMapping("/pair/confirm")
    public DeviceDto confirmPairing(@Valid @RequestBody PairConfirmRequest request, HttpServletRequest httpRequest) {
        return deviceService.confirmPairing(request, httpRequest.getRemoteAddr(), resolveActor(httpRequest), resolveUserId(httpRequest));
    }

    @GetMapping
    public List<DeviceDto> listDevices(HttpServletRequest httpRequest) {
        return deviceService.listDevices(resolveUserId(httpRequest));
    }

    @GetMapping("/{id}")
    public DeviceDto getDevice(@PathVariable String id, HttpServletRequest httpRequest) {
        return deviceService.getDevice(id, resolveUserId(httpRequest));
    }

    @PostMapping("/{id}/freeze")
    public DeviceDto toggleFreeze(@PathVariable String id, HttpServletRequest httpRequest) {
        return deviceService.toggleFreeze(id, resolveActor(httpRequest), resolveUserId(httpRequest));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<Void> revokeDevice(@PathVariable String id, HttpServletRequest httpRequest) {
        deviceService.revokeDevice(id, resolveActor(httpRequest), resolveUserId(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/roots")
    public DeviceDto addRoot(@PathVariable String id, @Valid @RequestBody RootRequest request,
                              HttpServletRequest httpRequest) {
        return deviceService.addRoot(id, request, resolveActor(httpRequest), resolveUserId(httpRequest));
    }

    @PatchMapping("/{id}/heartbeat")
    public ResponseEntity<Void> heartbeat(@PathVariable String id, @RequestBody HeartbeatRequest request,
                                           HttpServletRequest httpRequest) {
        deviceService.heartbeat(id, request, resolveUserId(httpRequest));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    /** api-gateway forwards X-User-Email once the JWT is validated; every device endpoint requires auth. */
    private String resolveActor(HttpServletRequest request) {
        String email = request.getHeader("X-User-Email");
        if (email == null || email.isBlank()) {
            return "User";
        }
        return "User (" + email + ")";
    }

    /**
     * api-gateway forwards X-User-Id once the JWT is validated — null only for a direct
     * service-to-service call that bypasses the gateway (no such caller exists for these endpoints
     * today; every business-service caller of device-service goes through {@code GET /{id}} instead,
     * see {@code DeviceService}'s ownership helpers).
     */
    private String resolveUserId(HttpServletRequest request) {
        return request.getHeader("X-User-Id");
    }
}
