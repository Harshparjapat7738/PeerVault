import React, { useState } from 'react';
import { Share2, AlertCircle, Loader2, Zap, ShieldCheck, Check } from 'lucide-react';
import { Device, SharePermission, ShareRequest, ShareTransferMode } from '../types';
import { createShareRequest, ApiError } from '../api-client';

interface ShareStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  onShareRequestCreated: (request: ShareRequest) => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

const ALL_PERMISSIONS: SharePermission[] = ['read', 'write', 'delete'];

export const ShareStorageModal: React.FC<ShareStorageModalProps> = ({
  isOpen,
  onClose,
  devices,
  onShareRequestCreated,
  showToast
}) => {
  const devicesWithRoots = devices.filter(d => d.allowedRoots.length > 0);

  const [requesterDeviceId, setRequesterDeviceId] = useState(devicesWithRoots[0]?.id || '');
  const [storageRootId, setStorageRootId] = useState(devicesWithRoots[0]?.allowedRoots[0]?.id || '');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [permissions, setPermissions] = useState<SharePermission[]>(['read']);
  const [transferMode, setTransferMode] = useState<ShareTransferMode>('direct');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requesterDevice = devices.find(d => d.id === requesterDeviceId);
  const roots = requesterDevice?.allowedRoots || [];

  const togglePermission = (p: SharePermission) => {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const canSubmit = requesterDeviceId && storageRootId && targetEmail.trim() && targetDeviceId.trim() && permissions.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createShareRequest({
        requesterDeviceId,
        targetEmail: targetEmail.trim(),
        targetDeviceId: targetDeviceId.trim(),
        storageRootId,
        permissions,
        transferMode,
        message: message.trim() || undefined
      });
      onShareRequestCreated(created);
      showToast('Share Request Sent', `Requested to share with ${targetEmail.trim()}.`, 'success');
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to create share request. Is share-service reachable?';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A]">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-[#1A1A1A] text-lg">Share Storage Root</h3>
              <p className="text-xs font-mono text-[#76746E]">Grant another user cross-device access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#76746E] hover:text-[#1A1A1A] p-1.5 hover:bg-[#EFECE6] transition-colors cursor-pointer">✕</button>
        </div>

        <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">

          {devicesWithRoots.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 font-mono text-xs">
              No paired device has an authorized storage root yet — add one from the Storage Mesh tab first.
            </div>
          ) : (
            <>
              <div>
                <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Your Device</label>
                <select
                  value={requesterDeviceId}
                  onChange={(e) => {
                    setRequesterDeviceId(e.target.value);
                    const d = devices.find(x => x.id === e.target.value);
                    setStorageRootId(d?.allowedRoots[0]?.id || '');
                  }}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                >
                  {devicesWithRoots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Storage Root to Share</label>
                <select
                  value={storageRootId}
                  onChange={(e) => setStorageRootId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] font-mono text-[11px]"
                >
                  {roots.map(r => <option key={r.id} value={r.id}>{r.path} ({r.label})</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Recipient Email</label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Recipient's Device ID</label>
            <input
              type="text"
              value={targetDeviceId}
              onChange={(e) => setTargetDeviceId(e.target.value)}
              placeholder="Paired device id the recipient will accept on"
              className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] font-mono text-[11px]"
            />
            <p className="text-[10px] text-[#76746E] mt-1">This mesh has no cross-user device directory yet — ask the recipient for their device id.</p>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Permissions</label>
            <div className="flex space-x-2">
              {ALL_PERMISSIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePermission(p)}
                  className={`flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 border text-xs font-mono uppercase transition-colors cursor-pointer ${
                    permissions.includes(p)
                      ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A] font-semibold'
                      : 'bg-[#F9F8F6] text-[#5A5955] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/40'
                  }`}
                >
                  {permissions.includes(p) && <Check className="w-3 h-3" />}
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Transport Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransferMode('direct')}
                className={`p-3 border text-left transition-all cursor-pointer ${
                  transferMode === 'direct'
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs mb-1">
                  <Zap className={`w-4 h-4 ${transferMode === 'direct' ? 'text-amber-300' : 'text-[#1A1A1A]'}`} />
                  <span>Direct (WebRTC)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${transferMode === 'direct' ? 'text-[#F9F8F6]/80' : 'text-[#76746E]'}`}>
                  Peer-to-peer data channel once accepted.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('relay')}
                className={`p-3 border text-left transition-all cursor-pointer ${
                  transferMode === 'relay'
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#5A5955] hover:border-[#1A1A1A]/40'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-serif font-bold text-xs mb-1">
                  <ShieldCheck className={`w-4 h-4 ${transferMode === 'relay' ? 'text-emerald-300' : 'text-[#1A1A1A]'}`} />
                  <span>Relay (Server)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${transferMode === 'relay' ? 'text-[#F9F8F6]/80' : 'text-[#76746E]'}`}>
                  Async, server-buffered — works when P2P can't connect.
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase text-[#1A1A1A] font-semibold mb-1.5">Note (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="A short note for the recipient"
              className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 font-mono text-[11px] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#5A5955] border border-[#1A1A1A]/20 text-xs font-mono transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-[#1A1A1A]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4 text-amber-300" />}
            <span>Send Share Request</span>
          </button>
        </div>

      </div>
    </div>
  );
};
