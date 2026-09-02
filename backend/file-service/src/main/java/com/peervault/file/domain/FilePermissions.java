package com.peervault.file.domain;

/**
 * Embedded sub-document mirroring {@code StorageFile['permissions']} in src/types.ts.
 * <p>
 * Hand-written (no Lombok annotation processing) — this environment's JDK is too new for the pinned
 * Lombok release to hook into javac, and this module is scoped to files under {@code file-service/}
 * only, so boilerplate is written out explicitly rather than depending on a parent/tooling fix.
 */
public class FilePermissions {

    private boolean read;
    private boolean write;
    private boolean delete;

    public FilePermissions() {
    }

    public FilePermissions(boolean read, boolean write, boolean delete) {
        this.read = read;
        this.write = write;
        this.delete = delete;
    }

    public static Builder builder() {
        return new Builder();
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public boolean isWrite() {
        return write;
    }

    public void setWrite(boolean write) {
        this.write = write;
    }

    public boolean isDelete() {
        return delete;
    }

    public void setDelete(boolean delete) {
        this.delete = delete;
    }

    public static class Builder {
        private boolean read;
        private boolean write;
        private boolean delete;

        public Builder read(boolean read) {
            this.read = read;
            return this;
        }

        public Builder write(boolean write) {
            this.write = write;
            return this;
        }

        public Builder delete(boolean delete) {
            this.delete = delete;
            return this;
        }

        public FilePermissions build() {
            return new FilePermissions(read, write, delete);
        }
    }
}
