import React, { useState } from 'react';
import { Laptop, Server, Monitor, Smartphone, ShieldCheck, AlertCircle, ArrowRight, XCircle } from 'lucide-react';
import { DeviceType, OSType, SharingPermissions } from '../types';

interface DevicePermissionDialogProps {
  /** SHA-256 fingerprint of the pairing session's ephemeral key, read off the scanned QR — shown so
   *  the person confirming can visually cross-check it against the generating device's screen. */
  deviceFingerprint: string;
  onAccept: (profile: { name: string; type: DeviceType; os: OSType; rootPath: string; rootLabel: string; allowDelete: boolean }, permissions: SharingPermissions) => void;
  onDecline: () => void;
  submitting: boolean;
  error: string | null;
}

/**
 * Shown once a QR has been scanned and decoded, before `confirmPairing()` is ever called — this is
 * the explicit permission grant the PIN-based flow never had. Declining never touches the backend.
 */
export const DevicePermissionDialog: React.FC<DevicePermissionDialogProps> = ({
  deviceFingerprint,
  onAccept,
  onDecline,
  submitting,
  error
}) => {
  const [name, setName] = useState('New Storage Node');
  const [type, setType] = useState<DeviceType>('laptop');
  const [os, setOs] = useState<OSType>('macOS');
  const [rootPath, setRootPath] = useState('/Users/harsh/Projects');
  const [rootLabel, setRootLabel] = useState('Development & Repos');
  const [allowDelete, setAllowDelete] = useState(false);

  const [permissions, setPermissions] = useState<SharingPermissions>({
    canShareStorage: true,
    canWrite: false,
    canDelete: false,
    canShareFurther: false
  });

  const toggle = (key: keyof SharingPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">

        <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center space-x-3">
          <div className="p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A]">
            <ShieldCheck className="w-5 h-5 text-emerald-800" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Confirm This Device</h3>
            <p className="text-xs font-mono text-[#76746E] truncate max-w-[320px]" title={deviceFingerprint}>
              {deviceFingerprint}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Device Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Device Archetype</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { t: 'laptop' as const, label: 'Laptop', icon: Laptop },
                  { t: 'desktop' as const, label: 'Desktop', icon: Monitor },
                  { t: 'nas' as const, label: 'NAS', icon: Server },
                  { t: 'phone' as const, label: 'Phone', icon: Smartphone }
                ].map(({ t, label, icon: Icon }) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`p-2.5 border text-center transition-all cursor-pointer ${
                      type === t ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]' : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-[10px] font-medium font-serif">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-[#1A1A1A] font-semibold mb-1.5">Operating System</label>
              <select
                value={os}
                onChange={(e) => setOs(e.target.value as OSType)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-xs focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="macOS">Apple macOS</option>
                <option value="Linux">Linux</option>
                <option value="Windows">Microsoft Windows</option>
                <option value="Android">Android</option>
                <option value="iOS">Apple iOS</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
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
            </div>
          </div>

          <div className="pt-1 border-t border-[#1A1A1A]/10 space-y-2">
            <h4 className="text-xs font-mono uppercase text-[#1A1A1A] font-semibold pt-3">Grant Permissions</h4>

            {/* Intentionally not a checkbox — read access is always enabled and isn't a real
                choice, so it isn't modeled as a toggle. Exactly four toggles follow. */}
            <p className="text-[11px] text-[#76746E] px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/10">
              Read access is always enabled for any paired device.
            </p>

            <PermissionRow
              label="Share this device's storage"
              description="Allow this device to initiate storage-sharing requests to others."
              checked={permissions.canShareStorage}
              onChange={() => toggle('canShareStorage')}
            />
            <PermissionRow
              label="Write files"
              description="Upload/save files into storage shared with this device."
              checked={permissions.canWrite}
              onChange={() => toggle('canWrite')}
            />
            <PermissionRow
              label="Delete files"
              description="Remove files from shared storage (soft-trash, 30-day recovery window)."
              checked={permissions.canDelete}
              onChange={() => toggle('canDelete')}
              warning
            />
            <PermissionRow
              label="Re-share further"
              description="Allow this device to re-share storage it was granted access to."
              checked={permissions.canShareFurther}
              onChange={() => toggle('canShareFurther')}
            />
          </div>
        </div>

        <div className="p-5 border-t border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <button
            onClick={onDecline}
            disabled={submitting}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#5A5955] border border-[#1A1A1A]/20 text-xs font-mono transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => onAccept({ name, type, os, rootPath, rootLabel, allowDelete }, permissions)}
            disabled={submitting || !name.trim() || !rootPath.trim()}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-[#FFFFFF] text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{submitting ? 'Confirming…' : 'Accept & Pair'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

function PermissionRow({
  label,
  description,
  checked,
  disabled,
  warning,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  warning?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className={`flex items-start space-x-2.5 p-3 border ${
      warning ? 'border-amber-300 bg-amber-50' : 'border-[#1A1A1A]/15 bg-[#FFFFFF]'
    } ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-[#1A1A1A]/30'} transition-colors`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 w-4 h-4 accent-[#1A1A1A]"
      />
      <div>
        <p className={`text-xs font-semibold ${warning ? 'text-amber-900' : 'text-[#1A1A1A]'}`}>{label}</p>
        <p className="text-[11px] text-[#76746E] mt-0.5">{description}</p>
      </div>
    </label>
  );
}
