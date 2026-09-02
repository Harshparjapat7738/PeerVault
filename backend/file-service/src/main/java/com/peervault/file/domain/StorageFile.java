package com.peervault.file.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Mirrors {@code StorageFile} in src/types.ts / {@code StorageFileDto} field-for-field, plus two
 * internal-only real {@link Instant} fields ({@link #modifiedAtInstant}, {@link #trashExpiresAtInstant})
 * used to query/compare for the scheduled trash-purge job — the display-string versions
 * ({@link #modifiedAt}, {@link #trashExpiresAt}) go out over the API via
 * {@code com.peervault.common.util.TimeFormats} and match the frontend's plain-string convention.
 * <p>
 * Hand-written (no Lombok annotation processing) — this environment's JDK is too new for the pinned
 * Lombok release to hook into javac, and this module is scoped to files under {@code file-service/}
 * only, so boilerplate is written out explicitly rather than depending on a parent/tooling fix.
 */
@Document(collection = "files")
public class StorageFile {

    @Id
    private String id;

    @Indexed
    private String deviceId;

    private String rootId;
    private String rootPath;
    private String relativePath;
    private String name;
    private String extension;
    private long sizeBytes;
    private String modifiedAt;
    private Instant modifiedAtInstant;
    private String sha256Hash;
    private String mimeType;
    private boolean isDirectory;
    private Boolean isFavorite;
    private Boolean inTrash;
    private String trashedAt;
    private String trashExpiresAt;

    @Indexed
    private Instant trashExpiresAtInstant;

    private FilePermissions permissions;
    private int version;
    private String sampleContent;

    public StorageFile() {
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

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getRootId() {
        return rootId;
    }

    public void setRootId(String rootId) {
        this.rootId = rootId;
    }

    public String getRootPath() {
        return rootPath;
    }

    public void setRootPath(String rootPath) {
        this.rootPath = rootPath;
    }

    public String getRelativePath() {
        return relativePath;
    }

    public void setRelativePath(String relativePath) {
        this.relativePath = relativePath;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getExtension() {
        return extension;
    }

    public void setExtension(String extension) {
        this.extension = extension;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getModifiedAt() {
        return modifiedAt;
    }

    public void setModifiedAt(String modifiedAt) {
        this.modifiedAt = modifiedAt;
    }

    public Instant getModifiedAtInstant() {
        return modifiedAtInstant;
    }

    public void setModifiedAtInstant(Instant modifiedAtInstant) {
        this.modifiedAtInstant = modifiedAtInstant;
    }

    public String getSha256Hash() {
        return sha256Hash;
    }

    public void setSha256Hash(String sha256Hash) {
        this.sha256Hash = sha256Hash;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public boolean isDirectory() {
        return isDirectory;
    }

    public void setDirectory(boolean directory) {
        isDirectory = directory;
    }

    public Boolean getIsFavorite() {
        return isFavorite;
    }

    public void setIsFavorite(Boolean isFavorite) {
        this.isFavorite = isFavorite;
    }

    public Boolean getInTrash() {
        return inTrash;
    }

    public void setInTrash(Boolean inTrash) {
        this.inTrash = inTrash;
    }

    public String getTrashedAt() {
        return trashedAt;
    }

    public void setTrashedAt(String trashedAt) {
        this.trashedAt = trashedAt;
    }

    public String getTrashExpiresAt() {
        return trashExpiresAt;
    }

    public void setTrashExpiresAt(String trashExpiresAt) {
        this.trashExpiresAt = trashExpiresAt;
    }

    public Instant getTrashExpiresAtInstant() {
        return trashExpiresAtInstant;
    }

    public void setTrashExpiresAtInstant(Instant trashExpiresAtInstant) {
        this.trashExpiresAtInstant = trashExpiresAtInstant;
    }

    public FilePermissions getPermissions() {
        return permissions;
    }

    public void setPermissions(FilePermissions permissions) {
        this.permissions = permissions;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getSampleContent() {
        return sampleContent;
    }

    public void setSampleContent(String sampleContent) {
        this.sampleContent = sampleContent;
    }

    public static class Builder {
        private final StorageFile target = new StorageFile();

        public Builder id(String id) {
            target.id = id;
            return this;
        }

        public Builder deviceId(String deviceId) {
            target.deviceId = deviceId;
            return this;
        }

        public Builder rootId(String rootId) {
            target.rootId = rootId;
            return this;
        }

        public Builder rootPath(String rootPath) {
            target.rootPath = rootPath;
            return this;
        }

        public Builder relativePath(String relativePath) {
            target.relativePath = relativePath;
            return this;
        }

        public Builder name(String name) {
            target.name = name;
            return this;
        }

        public Builder extension(String extension) {
            target.extension = extension;
            return this;
        }

        public Builder sizeBytes(long sizeBytes) {
            target.sizeBytes = sizeBytes;
            return this;
        }

        public Builder modifiedAt(String modifiedAt) {
            target.modifiedAt = modifiedAt;
            return this;
        }

        public Builder modifiedAtInstant(Instant modifiedAtInstant) {
            target.modifiedAtInstant = modifiedAtInstant;
            return this;
        }

        public Builder sha256Hash(String sha256Hash) {
            target.sha256Hash = sha256Hash;
            return this;
        }

        public Builder mimeType(String mimeType) {
            target.mimeType = mimeType;
            return this;
        }

        public Builder isDirectory(boolean isDirectory) {
            target.isDirectory = isDirectory;
            return this;
        }

        public Builder isFavorite(Boolean isFavorite) {
            target.isFavorite = isFavorite;
            return this;
        }

        public Builder inTrash(Boolean inTrash) {
            target.inTrash = inTrash;
            return this;
        }

        public Builder trashedAt(String trashedAt) {
            target.trashedAt = trashedAt;
            return this;
        }

        public Builder trashExpiresAt(String trashExpiresAt) {
            target.trashExpiresAt = trashExpiresAt;
            return this;
        }

        public Builder trashExpiresAtInstant(Instant trashExpiresAtInstant) {
            target.trashExpiresAtInstant = trashExpiresAtInstant;
            return this;
        }

        public Builder permissions(FilePermissions permissions) {
            target.permissions = permissions;
            return this;
        }

        public Builder version(int version) {
            target.version = version;
            return this;
        }

        public Builder sampleContent(String sampleContent) {
            target.sampleContent = sampleContent;
            return this;
        }

        public StorageFile build() {
            return target;
        }
    }
}
