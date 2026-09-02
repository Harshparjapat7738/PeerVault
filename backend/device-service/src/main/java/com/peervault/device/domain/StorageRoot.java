package com.peervault.device.domain;

/**
 * Embedded (not a separate collection) inside {@link Device#getAllowedRoots()} — always loaded/saved
 * with its parent device. Mirrors {@code StorageRoot} in src/types.ts / {@code StorageRootDto} field-for-field.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
public class StorageRoot {

    private String id;
    private String path;
    private String label;
    private boolean isReadOnly;
    private boolean allowDelete;
    private int totalFiles;
    private long totalSizeBytes;

    public StorageRoot() {
    }

    public StorageRoot(String id, String path, String label, boolean isReadOnly, boolean allowDelete,
                        int totalFiles, long totalSizeBytes) {
        this.id = id;
        this.path = path;
        this.label = label;
        this.isReadOnly = isReadOnly;
        this.allowDelete = allowDelete;
        this.totalFiles = totalFiles;
        this.totalSizeBytes = totalSizeBytes;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public boolean isReadOnly() {
        return isReadOnly;
    }

    public void setReadOnly(boolean readOnly) {
        isReadOnly = readOnly;
    }

    public boolean isAllowDelete() {
        return allowDelete;
    }

    public void setAllowDelete(boolean allowDelete) {
        this.allowDelete = allowDelete;
    }

    public int getTotalFiles() {
        return totalFiles;
    }

    public void setTotalFiles(int totalFiles) {
        this.totalFiles = totalFiles;
    }

    public long getTotalSizeBytes() {
        return totalSizeBytes;
    }

    public void setTotalSizeBytes(long totalSizeBytes) {
        this.totalSizeBytes = totalSizeBytes;
    }

    public static final class Builder {
        private String id;
        private String path;
        private String label;
        private boolean isReadOnly;
        private boolean allowDelete;
        private int totalFiles;
        private long totalSizeBytes;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder path(String path) {
            this.path = path;
            return this;
        }

        public Builder label(String label) {
            this.label = label;
            return this;
        }

        public Builder isReadOnly(boolean isReadOnly) {
            this.isReadOnly = isReadOnly;
            return this;
        }

        public Builder allowDelete(boolean allowDelete) {
            this.allowDelete = allowDelete;
            return this;
        }

        public Builder totalFiles(int totalFiles) {
            this.totalFiles = totalFiles;
            return this;
        }

        public Builder totalSizeBytes(long totalSizeBytes) {
            this.totalSizeBytes = totalSizeBytes;
            return this;
        }

        public StorageRoot build() {
            return new StorageRoot(id, path, label, isReadOnly, allowDelete, totalFiles, totalSizeBytes);
        }
    }
}
