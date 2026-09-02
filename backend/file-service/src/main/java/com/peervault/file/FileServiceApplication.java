package com.peervault.file;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * file-service: owns the file metadata registry, the soft-delete trash quarantine (with real 30-day
 * retention enforcement via a scheduled purge job), and the sandbox path-traversal checker that
 * {@code FileExplorer.tsx}'s "Storage Agent Sandbox & Traversal Barrier" widget calls.
 * {@code scanBasePackages = "com.peervault"} so {@code com.peervault.common.exception.GlobalExceptionHandler}
 * auto-registers alongside this service's own components. {@code @EnableScheduling} powers the hourly
 * trash-purge job.
 */
@SpringBootApplication(scanBasePackages = "com.peervault")
@EnableScheduling
public class FileServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(FileServiceApplication.class, args);
    }
}
