import React, { useState } from 'react';
import { 
  Laptop, 
  HardDrive, 
  Server, 
  Smartphone, 
  Monitor, 
  ShieldAlert, 
  ShieldCheck, 
  FolderLock, 
  Lock, 
  Unlock, 
  Trash2, 
  RefreshCw, 
  Zap, 
  FolderTree, 
  Check, 
  Plus, 
  Battery, 
  BatteryCharging, 
  KeyRound, 
  Search, 
  Filter,
  Eye,
  AlertTriangle,
  FolderOpen,
  Wifi
} from 'lucide-react';
import { Device, StorageRoot } from '../types';

interface DeviceGridProps {
  devices: Device[];
  onBrowseDevice: (deviceId: string) => void;
  onOpenPairing: () => void;
  onToggleFreeze: (deviceId: string) => void;
  onRevokeDevice: (deviceId: string) => void;
  onAddAllowedRoot: (deviceId: string, root: StorageRoot) => void;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({
  devices,
  onBrowseDevice,
  onOpenPairing,
  onToggleFreeze,
  onRevokeDevice,
  onAddAllowedRoot
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'sleeping' | 'frozen'>('all');
  const [selectedDeviceForRoots, setSelectedDeviceForRoots] = useState<Device | null>(null);
  const [newRootPath, setNewRootPath] = useState('');
  const [newRootLabel, setNewRootLabel] = useState('');
  const [newRootReadOnly, setNewRootReadOnly] = useState(false);
  const [newRootAllowDelete, setNewRootAllowDelete] = useState(false);
  const [rootError, setRootError] = useState('');
  const [p2pTestingDeviceId, setP2pTestingDeviceId] = useState<string | null>(null);
  const [p2pTestResult, setP2pTestResult] = useState<{ id: string; latency: number; cipher: string } | null>(null);

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      device.publicKeyFingerprint.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ? true : device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'laptop': return Laptop;
      case 'nas': return Server;
      case 'desktop': return Monitor;
      case 'phone': return Smartphone;
      default: return HardDrive;
    }
  };

  const getStatusBadge = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
            Online
          </span>
        );
      case 'sleeping':
        return (
          <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Standby
          </span>
        );
      case 'frozen':
        return (
          <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <Lock className="w-3 h-3 mr-1" />
            Frozen
          </span>
        );
      case 'unauthorized':
      case 'offline':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-[#EFECE6] text-[#76746E] border border-[#D5D2CA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8C8A82] mr-1.5"></span>
            Offline
          </span>
        );
    }
  };

  const handleTestP2P = (deviceId: string) => {
    setP2pTestingDeviceId(deviceId);
    setP2pTestResult(null);
    setTimeout(() => {
      setP2pTestingDeviceId(null);
      setP2pTestResult({
        id: deviceId,
        latency: Math.floor(Math.random() * 18) + 6,
        cipher: 'ChaCha20-Poly1305 (Direct UDP/STUN)'
      });
    }, 900);
  };

  const handleSaveNewRoot = () => {
    if (!newRootPath.trim() || !newRootLabel.trim() || !selectedDeviceForRoots) {
      setRootError('Please provide both a directory path and descriptive label.');
      return;
    }

    // Security check: reject root traversal
    const forbiddenPaths = ['/etc', 'C:\\Windows', '~/.ssh', '/bin', '/usr', '/System', '/var/root'];
    if (forbiddenPaths.some(p => newRootPath.startsWith(p))) {
      setRootError('Security Violation: Operating System system paths cannot be configured as storage roots.');
      return;
    }

    const newRoot: StorageRoot = {
      id: `root_${Date.now()}`,
      path: newRootPath.trim(),
      label: newRootLabel.trim(),
      isReadOnly: newRootReadOnly,
      allowDelete: newRootAllowDelete,
      totalFiles: 0,
      totalSizeBytes: 0
    };

    onAddAllowedRoot(selectedDeviceForRoots.id, newRoot);
    setNewRootPath('');
    setNewRootLabel('');
    setNewRootReadOnly(false);
    setNewRootAllowDelete(false);
    setRootError('');
    setSelectedDeviceForRoots(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Editorial Banner & Controls */}
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#76746E] font-semibold">
            Registry • Storage Mesh Nodes
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#1A1A1A]">
            Authenticated Device Mesh
          </h2>
          <p className="text-xs md:text-sm text-[#5A5955] leading-relaxed">
            Zero-trust storage daemon mesh. End-to-end encrypted with Noise_XX protocols. Inbound firewall ports remain strictly closed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#76746E]" />
            <input
              type="text"
              placeholder="Search nodes, tags, key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A] placeholder-[#8C8A82] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-[#F4F2EE] p-1 border border-[#1A1A1A]/10 text-xs">
            {(['all', 'online', 'sleeping', 'frozen'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 capitalize font-mono text-[11px] transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold'
                    : 'text-[#5A5955] hover:text-[#1A1A1A]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Add Device button */}
          <button
            onClick={onOpenPairing}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-[#1A1A1A]"
          >
            <Plus className="w-4 h-4" />
            <span>Pair New Node</span>
          </button>
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDevices.map((device) => {
          const Icon = getDeviceIcon(device.type);
          const usedGB = (device.storageUsedBytes / (1024 * 1024 * 1024)).toFixed(0);
          const totalGB = (device.storageTotalBytes / (1024 * 1024 * 1024)).toFixed(0);
          const percentage = Math.round((device.storageUsedBytes / device.storageTotalBytes) * 100);
          const isFrozen = device.status === 'frozen';

          return (
            <div
              key={device.id}
              id={`device-card-${device.id}`}
              className={`bg-[#FFFFFF] border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs ${
                isFrozen 
                  ? 'border-rose-300 bg-rose-50/10' 
                  : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
              }`}
            >
              <div>
                {/* Header Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-3 border ${
                      isFrozen
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-serif font-bold text-base text-[#1A1A1A]">{device.name}</h3>
                        {device.pinnedLocation && (
                          <span className="text-[10px] font-mono bg-[#F4F2EE] text-[#5A5955] px-1.5 py-0.5 border border-[#1A1A1A]/10">
                            {device.pinnedLocation}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-[#5A5955] font-mono mt-0.5">
                        <span>{device.os}</span>
                        <span>•</span>
                        <span className="text-[#1A1A1A]">{device.agentVersion}</span>
                        <span>•</span>
                        <span>{device.lastSeen}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1.5">
                    {getStatusBadge(device.status)}
                    {device.batteryLevel !== undefined && (
                      <div className="flex items-center space-x-1 text-[11px] text-[#76746E] font-mono">
                        {device.isCharging ? (
                          <BatteryCharging className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Battery className="w-3.5 h-3.5" />
                        )}
                        <span>{device.batteryLevel}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cryptographic Identity & Network Box */}
                <div className="mt-4 p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#76746E] flex items-center">
                      <KeyRound className="w-3.5 h-3.5 mr-1.5 text-[#5A5955]" />
                      Public Fingerprint:
                    </span>
                    <span className="text-[#1A1A1A] font-semibold truncate max-w-[200px]" title={device.publicKeyFingerprint}>
                      {device.publicKeyFingerprint}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#76746E]">Transport / NAT Profile:</span>
                    <span className="text-[#1A1A1A] flex items-center space-x-1.5 font-mono">
                      <span>{device.ipMasked}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#EFECE6] border border-[#1A1A1A]/10 uppercase font-semibold">
                        {device.natType}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Storage Capacity Gauge */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5A5955]">Storage Allocation</span>
                    <span className="font-mono font-semibold text-[#1A1A1A]">
                      {usedGB} GB <span className="text-[#76746E]">/ {totalGB} GB ({percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EFECE6] overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        percentage > 85 ? 'bg-amber-600' : 'bg-[#1A1A1A]'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Allowed Roots Sandboxes */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-serif font-bold text-[#1A1A1A] flex items-center">
                      <FolderLock className="w-3.5 h-3.5 mr-1 text-[#1A1A1A]" />
                      Authorized Sandboxes ({device.allowedRoots.length})
                    </span>
                    <button
                      onClick={() => setSelectedDeviceForRoots(device)}
                      className="text-[11px] text-[#1A1A1A] hover:underline font-mono cursor-pointer"
                    >
                      + Add Root
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    {device.allowedRoots.map((root) => (
                      <div 
                        key={root.id}
                        className="p-2.5 bg-[#F9F8F6] border border-[#1A1A1A]/10 flex items-center justify-between text-xs"
                      >
                        <div className="truncate max-w-[240px]">
                          <div className="font-semibold text-xs text-[#1A1A1A] truncate">{root.label}</div>
                          <div className="font-mono text-[10px] text-[#76746E] truncate">{root.path}</div>
                        </div>
                        <div className="flex items-center space-x-1.5 font-mono text-[10px] uppercase">
                          {root.isReadOnly ? (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300">
                              Read-Only
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/10">
                              Read/Write
                            </span>
                          )}
                          {root.allowDelete ? (
                            <span className="px-1.5 py-0.5 bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/10">
                              Del: Yes
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200" title="Delete restricted to protect files">
                              Protected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* P2P Test Result Pill */}
                {p2pTestResult && p2pTestResult.id === device.id && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center justify-between">
                    <span className="flex items-center font-semibold">
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                      P2P Handshake Valid ({p2pTestResult.latency} ms)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800">
                      {p2pTestResult.cipher}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Action Buttons */}
              <div className="mt-6 pt-4 border-t border-[#1A1A1A]/15 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onBrowseDevice(device.id)}
                    disabled={isFrozen || device.status === 'offline'}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-[#1A1A1A]"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>

                  <button
                    onClick={() => handleTestP2P(device.id)}
                    disabled={isFrozen || device.status === 'offline' || p2pTestingDeviceId === device.id}
                    className="inline-flex items-center space-x-1 px-3 py-2 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-[#1A1A1A] text-xs border border-[#1A1A1A]/20 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Run simulated direct P2P socket test"
                  >
                    {p2pTestingDeviceId === device.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1A1A1A]" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-[#1A1A1A]" />
                    )}
                    <span>{p2pTestingDeviceId === device.id ? 'Testing...' : 'Test P2P'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Freeze / Unfreeze Toggle */}
                  <button
                    onClick={() => onToggleFreeze(device.id)}
                    className={`inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                      isFrozen
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-[#FFFFFF] text-[#1A1A1A] border-[#1A1A1A]/20 hover:bg-[#F4F2EE]'
                    }`}
                    title={isFrozen ? 'Unfreeze node' : 'Emergency freeze node to isolate remote access'}
                  >
                    {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
                  </button>

                  {/* Revoke Credentials */}
                  <button
                    onClick={() => onRevokeDevice(device.id)}
                    className="p-2 bg-[#FFFFFF] hover:bg-rose-50 text-rose-700 border border-[#1A1A1A]/20 hover:border-rose-300 transition-colors cursor-pointer"
                    title="Revoke device credentials"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add Allowed Root Dialog Modal */}
      {selectedDeviceForRoots && (
        <div className="fixed inset-0 bg-[#1A1A1A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#1A1A1A] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#76746E]">Storage Enclave Isolation</div>
                <h3 className="font-serif font-bold text-lg text-[#1A1A1A] mt-0.5">Configure Storage Root</h3>
                <p className="text-xs text-[#5A5955]">Device: {selectedDeviceForRoots.name}</p>
              </div>
              <button
                onClick={() => setSelectedDeviceForRoots(null)}
                className="text-[#76746E] hover:text-[#1A1A1A] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {rootError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{rootError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Local Directory Path (Canonicalized)</label>
                <input
                  type="text"
                  placeholder={selectedDeviceForRoots.os === 'Windows' ? 'C:\\Users\\Harsh\\Work' : '/home/harsh/Work'}
                  value={newRootPath}
                  onChange={(e) => setNewRootPath(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1A1A1A]"
                />
                <p className="text-[10px] text-[#76746E] mt-1">
                  Absolute path on device. Storage agent guarantees zero traversal outside this folder.
                </p>
              </div>

              <div>
                <label className="block text-[#1A1A1A] font-semibold mb-1">Sandbox Label</label>
                <input
                  type="text"
                  placeholder="e.g. Work Projects, RAW Photos"
                  value={newRootLabel}
                  onChange={(e) => setNewRootLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-[#1A1A1A]/15 bg-[#F4F2EE] p-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRootReadOnly}
                    onChange={(e) => setNewRootReadOnly(e.target.checked)}
                    className="rounded-none border-[#1A1A1A] text-[#1A1A1A] focus:ring-0"
                  />
                  <span className="text-[#1A1A1A] font-semibold">Read-Only Mode (Prevent remote modifications)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRootAllowDelete}
                    onChange={(e) => setNewRootAllowDelete(e.target.checked)}
                    className="rounded-none border-[#1A1A1A] text-[#1A1A1A] focus:ring-0"
                  />
                  <span className="text-[#1A1A1A] font-semibold">Allow Remote Deletions (Protected by 30-day soft trash)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#1A1A1A]/15">
              <button
                onClick={() => setSelectedDeviceForRoots(null)}
                className="px-4 py-2 border border-[#1A1A1A]/20 hover:bg-[#F4F2EE] text-[#1A1A1A] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewRoot}
                className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider cursor-pointer border border-[#1A1A1A]"
              >
                Authorize Root
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
