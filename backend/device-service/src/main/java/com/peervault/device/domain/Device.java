package com.peervault.device.domain;

import com.peervault.common.dto.DeviceStatus;
import com.peervault.common.dto.DeviceType;
import com.peervault.common.dto.NatType;
import com.peervault.common.dto.OsType;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

/**
 * Mirrors {@code Device} in src/types.ts / {@code DeviceDto} field-for-field, plus one internal-only
 * field ({@link #getOwnerActor()}) used for audit detail text — never exposed on the wire.
 *
 * <p>Hand-written (no Lombok): the JDK in this environment is newer than the Lombok version pinned by
 * the Spring Boot BOM supports, so its annotation processor silently produces no accessors.
 */
@Document(collection = "devices")
public class Device {

    @Id
    private String id;
    private String name;
    private DeviceType type;
    private OsType os;
    private String agentVersion;
    private DeviceStatus status;

    @Indexed(unique = true)
    private String publicKeyFingerprint;

    private String ipMasked;
    private NatType natType;
    private String lastSeen;
    private Integer batteryLevel;
    private Boolean isCharging;
    private long storageTotalBytes;
    private long storageUsedBytes;
    private List<StorageRoot> allowedRoots;
    private List<String> tags;
    private int activeConnectionsCount;
    private boolean directP2PCapable;
    private Boolean isFavorite;
    private String pairedAt;
    private String pinnedLocation;

    /** Who paired this device, e.g. "User (harshparjapat7738@gmail.com)" — audit detail text only. */
    private String ownerActor;

    public Device() {
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public DeviceType getType() {
        return type;
    }

    public void setType(DeviceType type) {
        this.type = type;
    }

    public OsType getOs() {
        return os;
    }

    public void setOs(OsType os) {
        this.os = os;
    }

    public String getAgentVersion() {
        return agentVersion;
    }

    public void setAgentVersion(String agentVersion) {
        this.agentVersion = agentVersion;
    }

    public DeviceStatus getStatus() {
        return status;
    }

    public void setStatus(DeviceStatus status) {
        this.status = status;
    }

    public String getPublicKeyFingerprint() {
        return publicKeyFingerprint;
    }

    public void setPublicKeyFingerprint(String publicKeyFingerprint) {
        this.publicKeyFingerprint = publicKeyFingerprint;
    }

    public String getIpMasked() {
        return ipMasked;
    }

    public void setIpMasked(String ipMasked) {
        this.ipMasked = ipMasked;
    }

    public NatType getNatType() {
        return natType;
    }

    public void setNatType(NatType natType) {
        this.natType = natType;
    }

    public String getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(String lastSeen) {
        this.lastSeen = lastSeen;
    }

    public Integer getBatteryLevel() {
        return batteryLevel;
    }

    public void setBatteryLevel(Integer batteryLevel) {
        this.batteryLevel = batteryLevel;
    }

    public Boolean getIsCharging() {
        return isCharging;
    }

    public void setIsCharging(Boolean isCharging) {
        this.isCharging = isCharging;
    }

    public long getStorageTotalBytes() {
        return storageTotalBytes;
    }

    public void setStorageTotalBytes(long storageTotalBytes) {
        this.storageTotalBytes = storageTotalBytes;
    }

    public long getStorageUsedBytes() {
        return storageUsedBytes;
    }

    public void setStorageUsedBytes(long storageUsedBytes) {
        this.storageUsedBytes = storageUsedBytes;
    }

    public List<StorageRoot> getAllowedRoots() {
        return allowedRoots;
    }

    public void setAllowedRoots(List<StorageRoot> allowedRoots) {
        this.allowedRoots = allowedRoots;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public int getActiveConnectionsCount() {
        return activeConnectionsCount;
    }

    public void setActiveConnectionsCount(int activeConnectionsCount) {
        this.activeConnectionsCount = activeConnectionsCount;
    }

    public boolean isDirectP2PCapable() {
        return directP2PCapable;
    }

    public void setDirectP2PCapable(boolean directP2PCapable) {
        this.directP2PCapable = directP2PCapable;
    }

    public Boolean getIsFavorite() {
        return isFavorite;
    }

    public void setIsFavorite(Boolean isFavorite) {
        this.isFavorite = isFavorite;
    }

    public String getPairedAt() {
        return pairedAt;
    }

    public void setPairedAt(String pairedAt) {
        this.pairedAt = pairedAt;
    }

    public String getPinnedLocation() {
        return pinnedLocation;
    }

    public void setPinnedLocation(String pinnedLocation) {
        this.pinnedLocation = pinnedLocation;
    }

    public String getOwnerActor() {
        return ownerActor;
    }

    public void setOwnerActor(String ownerActor) {
        this.ownerActor = ownerActor;
    }

    public static final class Builder {
        private final Device device = new Device();

        public Builder id(String id) {
            device.id = id;
            return this;
        }

        public Builder name(String name) {
            device.name = name;
            return this;
        }

        public Builder type(DeviceType type) {
            device.type = type;
            return this;
        }

        public Builder os(OsType os) {
            device.os = os;
            return this;
        }

        public Builder agentVersion(String agentVersion) {
            device.agentVersion = agentVersion;
            return this;
        }

        public Builder status(DeviceStatus status) {
            device.status = status;
            return this;
        }

        public Builder publicKeyFingerprint(String publicKeyFingerprint) {
            device.publicKeyFingerprint = publicKeyFingerprint;
            return this;
        }

        public Builder ipMasked(String ipMasked) {
            device.ipMasked = ipMasked;
            return this;
        }

        public Builder natType(NatType natType) {
            device.natType = natType;
            return this;
        }

        public Builder lastSeen(String lastSeen) {
            device.lastSeen = lastSeen;
            return this;
        }

        public Builder batteryLevel(Integer batteryLevel) {
            device.batteryLevel = batteryLevel;
            return this;
        }

        public Builder isCharging(Boolean isCharging) {
            device.isCharging = isCharging;
            return this;
        }

        public Builder storageTotalBytes(long storageTotalBytes) {
            device.storageTotalBytes = storageTotalBytes;
            return this;
        }

        public Builder storageUsedBytes(long storageUsedBytes) {
            device.storageUsedBytes = storageUsedBytes;
            return this;
        }

        public Builder allowedRoots(List<StorageRoot> allowedRoots) {
            device.allowedRoots = allowedRoots;
            return this;
        }

        public Builder tags(List<String> tags) {
            device.tags = tags;
            return this;
        }

        public Builder activeConnectionsCount(int activeConnectionsCount) {
            device.activeConnectionsCount = activeConnectionsCount;
            return this;
        }

        public Builder directP2PCapable(boolean directP2PCapable) {
            device.directP2PCapable = directP2PCapable;
            return this;
        }

        public Builder isFavorite(Boolean isFavorite) {
            device.isFavorite = isFavorite;
            return this;
        }

        public Builder pairedAt(String pairedAt) {
            device.pairedAt = pairedAt;
            return this;
        }

        public Builder pinnedLocation(String pinnedLocation) {
            device.pinnedLocation = pinnedLocation;
            return this;
        }

        public Builder ownerActor(String ownerActor) {
            device.ownerActor = ownerActor;
            return this;
        }

        public Device build() {
            return device;
        }
    }
}
