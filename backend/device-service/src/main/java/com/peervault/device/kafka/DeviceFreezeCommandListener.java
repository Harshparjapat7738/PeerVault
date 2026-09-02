package com.peervault.device.kafka;

import com.peervault.common.constant.KafkaTopics;
import com.peervault.common.event.DeviceFreezeCommand;
import com.peervault.device.service.DeviceService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes {@link DeviceFreezeCommand} published by security-service when its ransomware
 * mass-deletion shield trips, forcibly freezing the offending device regardless of its current state.
 */
@Component
public class DeviceFreezeCommandListener {

    private final DeviceService deviceService;

    public DeviceFreezeCommandListener(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @KafkaListener(topics = KafkaTopics.DEVICE_FREEZE_COMMAND, groupId = "device-service")
    public void onDeviceFreezeCommand(DeviceFreezeCommand command) {
        deviceService.forceFreeze(command.deviceId(), command.reason());
    }
}
