import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Server, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  QrCode, 
  KeyRound, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Check, 
  FolderLock, 
  AlertCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Device, DeviceType, OSType, StorageRoot } from '../types';

interface DevicePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPairSuccess: (newDevice: Device) => void;
}

export const DevicePairingModal: React.FC<DevicePairingModalProps> = ({
  isOpen,
  onClose,
  onPairSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [deviceName, setDeviceName] = useState('New Storage Workstation');
  const [deviceType, setDeviceType] = useState<DeviceType>('laptop');
  const [deviceOS, setDeviceOS] = useState<OSType>('macOS');
  const [rootPath, setRootPath] = useState('/Users/harsh/Projects');
  const [rootLabel, setRootLabel] = useState('Development & Repos');
  const [allowDelete, setAllowDelete] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(120);

  // Generated cryptographic mock credentials
  const [pairingCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [fingerprint] = useState(() => `SHA256:${Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('')}...${Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('')}`);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTimerSeconds(120);
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) return 120;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCompletePairing = () => {
    const newRoot: StorageRoot = {
      id: `root_${Date.now()}`,
      path: rootPath,
      label: rootLabel,
      isReadOnly: false,
      allowDelete: allowDelete,
      totalFiles: 14,
      totalSizeBytes: 1.2 * 1024 * 1024 * 1024
    };

    const newDevice: Device = {
      id: `dev_${Date.now()}`,
      name: deviceName,
      type: deviceType,
      os: deviceOS,
      agentVersion: 'v1.4.2-rust',
      status: 'online',
      publicKeyFingerprint: fingerprint,
      ipMasked: '192.168.1.188 (Outbound TLS 1.3)',
      natType: 'full_cone',
      lastSeen: 'Just now',
      storageTotalBytes: 1000 * 1024 * 1024 * 1024,
      storageUsedBytes: 180 * 1024 * 1024 * 1024,
      directP2PCapable: true,
      pairedAt: new Date().toISOString().split('T')[0],
      tags: ['Newly Paired', 'Zero-Trust Attested'],
      activeConnectionsCount: 1,
      allowedRoots: [newRoot]
    };

    onPairSuccess(newDevice);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A]">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Pair Trusted Storage Node</h3>
              <p className="text-xs font-mono text-[#76746E]">Zero-Trust Cryptographic Handshake</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#76746E] hover:text-[#1A1A1A] p-1.5 hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 flex items-center justify-between border-b border-[#1A1A1A]/10 bg-[#FFFFFF] text-xs font-mono">
          {[
            { s: 1, label: 'Device Profile' },
            { s: 2, label: 'ECDSA Pairing' },
            { s: 3, label: 'Root Sandbox' },
            { s: 4, label: 'Attestation' }
          ].map((item) => (
            <div key={item.s} className="flex items-center space-x-1.5">
              <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold border ${
                step === item.s 
                  ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]' 
                  : step > item.s 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-[#F9F8F6] text-[#76746E] border-[#1A1A1A]/15'
              }`}>
                {step > item.s ? '✓' : item.s}
              </div>
              <span className={`hidden sm:inline text-[11px] ${step === item.s ? 'text-[#1A1A1A] font-bold' : 'text-[#76746E]'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Modal Body Steps */}
        <div className="p-6 space-y-4">
          
          {/* STEP 1: Device Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Device Display Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#1A1A1A]"
                  placeholder="e.g. Studio MacBook Pro, Home NAS"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Device Archetype</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 'laptop' as const, label: 'Laptop', icon: Laptop },
                    { type: 'desktop' as const, label: 'Desktop', icon: Monitor },
                    { type: 'nas' as const, label: 'NAS Storage', icon: Server },
                    { type: 'phone' as const, label: 'Phone', icon: Smartphone }
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setDeviceType(t.type)}
                        className={`p-3 border text-center transition-all cursor-pointer ${
                          deviceType === t.type
                            ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                            : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-xs font-medium font-serif">{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Operating System</label>
                <select
                  value={deviceOS}
                  onChange={(e) => setDeviceOS(e.target.value as OSType)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#1A1A1A]"
                >
                  <option value="macOS">Apple macOS (Darwin 24 / Apple Silicon)</option>
                  <option value="Linux">Linux (Ubuntu / Debian / TrueNAS / Arch)</option>
                  <option value="Windows">Microsoft Windows 11 / Windows Server</option>
                  <option value="Android">Android 14+ (Mobile Storage)</option>
                  <option value="iOS">Apple iOS</option>
                </select>
              </div>

              <div className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/15 text-xs text-[#5A5955] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
                <span>The storage agent must be installed on this machine to initiate the cryptographic handshake.</span>
              </div>
            </div>
          )}

          {/* STEP 2: Ephemeral 6-digit PIN & QR Attestation */}
          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="bg-[#F9F8F6] p-5 border border-[#1A1A1A]/20 flex flex-col items-center justify-center space-y-3">
                <div className="w-24 h-24 bg-white border border-[#1A1A1A]/20 p-2 flex items-center justify-center shadow-xs">
                  {/* QR Code Graphic simulation */}
                  <div className="w-full h-full border border-dashed border-[#1A1A1A]/40 flex flex-col items-center justify-center text-[#1A1A1A]">
                    <QrCode className="w-14 h-14" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase text-[#76746E]">Ephemeral Pairing PIN (120s TTL)</div>
                  <div className="flex items-center justify-center space-x-2 font-mono text-3xl font-bold tracking-widest text-[#1A1A1A]">
                    <span>{pairingCode.slice(0, 3)}</span>
                    <span className="text-[#76746E]">-</span>
                    <span>{pairingCode.slice(3, 6)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/30 text-xs font-mono transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied to Clipboard' : 'Copy 6-Digit PIN'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs px-2 text-[#5A5955] font-mono">
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-700" />
                  Expires in: <strong className="text-[#1A1A1A] ml-1">{timerSeconds}s</strong>
                </span>
                <span className="text-[11px] text-[#76746E] truncate max-w-[200px]" title={fingerprint}>
                  {fingerprint}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Root Whitelisting & Sandboxing */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-xs text-[#333333] flex items-start space-x-2">
                <FolderLock className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1A1A1A]">Mandatory Sandboxing Rule:</strong> Storage nodes never expose the entire filesystem. Explicitly define allowed root folders.
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1">Allowed Root Path</label>
                <input
                  type="text"
                  value={rootPath}
                  onChange={(e) => setRootPath(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs font-mono focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1">Folder Label</label>
                <input
                  type="text"
                  value={rootLabel}
                  onChange={(e) => setRootLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDelete}
                    onChange={(e) => setAllowDelete(e.target.checked)}
                    className="border-[#1A1A1A]/40 text-[#1A1A1A] focus:ring-0"
                  />
                  <span className="text-[#333333]">Allow remote file deletion (Protected by 30-day soft trash)</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: Attestation Confirmation */}
          {step === 4 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1A1A1A] text-lg">Cryptographic Pair Attested!</h4>
                <p className="text-xs text-[#5A5955] mt-1 max-w-sm mx-auto leading-relaxed">
                  ECDSA signature verified against user identity (harshparjapat7738@gmail.com). Node is ready to participate in direct P2P mesh transfers.
                </p>
              </div>

              <div className="p-4 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-left text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#76746E]">
                  <span>Device Name:</span>
                  <span className="text-[#1A1A1A] font-sans font-semibold">{deviceName}</span>
                </div>
                <div className="flex justify-between text-[#76746E]">
                  <span>Public Key:</span>
                  <span className="text-[#1A1A1A] truncate max-w-[200px]">{fingerprint}</span>
                </div>
                <div className="flex justify-between text-[#76746E]">
                  <span>Allowed Sandbox:</span>
                  <span className="text-emerald-800 font-semibold">{rootPath}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#5A5955] border border-[#1A1A1A]/20 text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            {step > 1 && step < 4 && (
              <button
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/20 text-xs font-mono transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#1A1A1A]"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleCompletePairing}
                className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-[#FFFFFF] text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                <span>Activate Node</span>
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
