package com.peervault.device;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * device-service: owns the device registry and the real EC (P-256) pairing crypto surface that
 * {@code DevicePairingModal.tsx} exercises. {@code scanBasePackages = "com.peervault"} so
 * {@code com.peervault.common.exception.GlobalExceptionHandler} auto-registers alongside this
 * service's own components.
 */
@SpringBootApplication(scanBasePackages = "com.peervault")
public class DeviceServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DeviceServiceApplication.class, args);
    }
}
