package com.peervault.share;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * share-service: owns cross-device/cross-user storage sharing — {@code ShareRequest} negotiation
 * and accept/reject (Task 2/3), and the {@code SharedStorage} grants those produce once accepted
 * (Task 4). {@code scanBasePackages = "com.peervault"} so
 * {@code com.peervault.common.exception.GlobalExceptionHandler} auto-registers alongside this
 * service's own components.
 */
@SpringBootApplication(scanBasePackages = "com.peervault")
public class ShareServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShareServiceApplication.class, args);
    }
}
