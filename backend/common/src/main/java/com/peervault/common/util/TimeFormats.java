package com.peervault.common.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * The frontend (src/data/initialData.ts) renders plain {@code "yyyy-MM-dd HH:mm:ss"} / {@code "yyyy-MM-dd"}
 * strings rather than ISO-8601 — every DTO field that lands in the UI as free text uses these formatters
 * so responses match the mock data shape exactly.
 */
public final class TimeFormats {

    public static final DateTimeFormatter TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    public static final DateTimeFormatter DATE_ONLY = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private TimeFormats() {
    }

    public static String now() {
        return LocalDateTime.now(ZoneOffset.UTC).format(TIMESTAMP);
    }

    public static String today() {
        return LocalDate.now(ZoneOffset.UTC).format(DATE_ONLY);
    }

    public static String format(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.format(TIMESTAMP);
    }
}
