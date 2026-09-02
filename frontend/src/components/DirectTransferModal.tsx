import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  HardDrive, 
  ShieldCheck, 
  Zap, 
  Check, 
  Radio, 
  AlertCircle
} from 'lucide-react';
import { Device, StorageFile, TransferTask } from '../types';

interface DirectTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileToTransfer: StorageFile | null;
  devices: Device[];
  onStartTransfer: (newTask: TransferTask) => void;
}

export const DirectTransferModal: React.FC<DirectTransferModalProps> = ({
  isOpen,
  onClose,
  fileToTransfer,
  devices,
  onStartTransfer
}) => {
  if (!isOpen || !fileToTransfer) return null;

  const sourceDevice = devices.find(d => d.id === fileToTransfer.deviceId);
  const eligibleTargetDevices = devices.filter(d => d.id !== fileToTransfer.deviceId && d.status === 'online');
  
  const [selectedTargetDeviceId, setSelectedTargetDeviceId] = useState(
    eligibleTargetDevices.length > 0 ? eligibleTargetDevices[0].id : ''
  );
  const [selectedRootId, setSelectedRootId] = useState('');
  const [transferMode, setTransferMode] = useState<'p2p_direct' | 'relay_encrypted'>('p2p_direct');

  const targetDevice = devices.find(d => d.id === selectedTargetDeviceId);
  const activeRoot = targetDevice?.allowedRoots.find(r => r.id === selectedRootId) || targetDevice?.allowedRoots[0];

  const handleInitiate = () => {
    if (!targetDevice || !activeRoot || !sourceDevice) return;

    const newTask: TransferTask = {
      id: `tx_${Date.now()}`,
      name: `${fileToTransfer.name} (${sourceDevice.name} -> ${targetDevice.name})`,
      sourceDeviceId: sourceDevice.id,
      targetDeviceId: targetDevice.id,
      sourceDeviceName: sourceDevice.name,
      targetDeviceName: targetDevice.name,
      sourceFilePath: `${fileToTransfer.rootPath}/${fileToTransfer.relativePath}`,
      targetFilePath: `${activeRoot.path}/${fileToTransfer.relativePath}`,
      sizeBytes: fileToTransfer.sizeBytes,
      transferredBytes: 0,
      speedBytesPerSec: transferMode === 'p2p_direct' ? 42 * 1024 * 1024 : 18 * 1024 * 1024,
      status: 'transferring',
      mode: transferMode,
      chunksTotal: Math.ceil(fileToTransfer.sizeBytes / (256 * 1024)),
      chunksCompleted: 0,
      etaSeconds: Math.max(2, Math.ceil(fileToTransfer.sizeBytes / (35 * 1024 * 1024))),
      sha256Checksum: fileToTransfer.sha256Hash,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    onStartTransfer(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A]">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Direct Node-to-Node Transfer</h3>
              <p className="text-xs font-mono text-[#76746E]">Orchestrate P2P transfer between storage nodes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#76746E] hover:text-[#1A1A1A] p-1.5 hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Source Info */}
          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-1">
            <div className="text-[#76746E] font-mono text-[11px] uppercase">Source Node & File</div>
            <div className="text-[#1A1A1A] font-serif font-bold text-sm">{sourceDevice?.name}</div>
            <div className="font-mono text-[11px] text-[#5A5955] truncate">
              {fileToTransfer.rootPath}/{fileToTransfer.relativePath}
            </div>
          </div>

          {/* Target Node Selector */}
          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Destination Storage Node</label>
            {eligibleTargetDevices.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 font-mono text-xs">
                No other online storage devices available. Pair a new device first.
              </div>
            ) : (
              <select
                value={selectedTargetDeviceId}
                onChange={(e) => setSelectedTargetDeviceId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                {eligibleTargetDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.os} • {d.directP2PCapable ? 'P2P Ready' : 'Relay Fallback'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Destination Root Sandbox */}
          {targetDevice && (
            <div>
              <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Destination Storage Sandbox</label>
              <select
                value={selectedRootId || targetDevice.allowedRoots[0]?.id}
                onChange={(e) => setSelectedRootId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] font-mono text-[11px]"
              >
                {targetDevice.allowedRoots.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.path} ({r.label})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer Mode Radio */}
          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Data Plane Transport Route</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransferMode('p2p_direct')}
                className={`p-3 border text-left transition-all cursor-pointer ${
                  transferMode === 'p2p_direct'
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs mb-1">
                  <Zap className={`w-4 h-4 ${transferMode === 'p2p_direct' ? 'text-amber-300' : 'text-[#1A1A1A]'}`} />
                  <span>Direct P2P Stream</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${transferMode === 'p2p_direct' ? 'text-[#F9F8F6]/80' : 'text-[#76746E]'}`}>
                  Direct WebRTC / QUIC data channel. Highest throughput, lowest latency.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode('relay_encrypted')}
                className={`p-3 border text-left transition-all cursor-pointer ${
                  transferMode === 'relay_encrypted'
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs mb-1">
                  <ShieldCheck className={`w-4 h-4 ${transferMode === 'relay_encrypted' ? 'text-emerald-300' : 'text-[#1A1A1A]'}`} />
                  <span>Encrypted Relay</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${transferMode === 'relay_encrypted' ? 'text-[#F9F8F6]/80' : 'text-[#76746E]'}`}>
                  Zero-knowledge relay for restrictive CGNATs. Relay sees only ciphertext.
                </p>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 text-[11px] text-[#5A5955] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong className="text-[#1A1A1A]">Zero-Bandwidth Phone Rule:</strong> The control plane instructs the two devices to establish a direct cryptographic stream without routing the file through your current device.
            </span>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#5A5955] border border-[#1A1A1A]/20 text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleInitiate}
            disabled={!targetDevice || eligibleTargetDevices.length === 0}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-[#1A1A1A]"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Initiate Direct Transfer</span>
          </button>
        </div>

      </div>
    </div>
  );
};
