import React, { useState } from 'react';
import { Inbox, Send, Check, X, Clock, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { Device, ShareRequest } from '../types';
import { acceptShareRequest, rejectShareRequest, ApiError } from '../api-client';

interface ShareRequestsListProps {
  sent: ShareRequest[];
  received: ShareRequest[];
  devices: Device[];
  onChanged: () => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  rejected: 'bg-rose-50 text-rose-800 border-rose-300',
  expired: 'bg-[#EFECE6] text-[#5A5955] border-[#1A1A1A]/15',
  revoked: 'bg-[#EFECE6] text-[#5A5955] border-[#1A1A1A]/15',
};

export const ShareRequestsList: React.FC<ShareRequestsListProps> = ({ sent, received, devices, onChanged, showToast }) => {
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptDeviceId, setAcceptDeviceId] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleStartAccept = (request: ShareRequest) => {
    setAcceptingId(request.id);
    setAcceptDeviceId(devices[0]?.id || '');
  };

  const handleConfirmAccept = async (request: ShareRequest) => {
    if (!acceptDeviceId) return;
    setBusyId(request.id);
    try {
      await acceptShareRequest(request.id, { targetDeviceId: acceptDeviceId });
      showToast('Share Accepted', `Storage root ${request.storageRootId} is now shared with you.`, 'success');
      setAcceptingId(null);
      onChanged();
    } catch (e) {
      showToast('Accept Failed', e instanceof ApiError ? e.message : 'Could not accept share request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: ShareRequest) => {
    setBusyId(request.id);
    try {
      await rejectShareRequest(request.id, {});
      showToast('Share Rejected', 'The requester has been notified.', 'info');
      onChanged();
    } catch (e) {
      showToast('Reject Failed', e instanceof ApiError ? e.message : 'Could not reject share request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const rows = tab === 'received' ? received : sent;

  return (
    <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 shadow-xs">
      <div className="flex items-center border-b border-[#1A1A1A]/20 bg-[#F9F8F6]">
        {(['received', 'sent'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-mono uppercase transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t ? 'border-[#1A1A1A] text-[#1A1A1A] font-semibold' : 'border-transparent text-[#76746E] hover:text-[#1A1A1A]'
            }`}
          >
            {t === 'received' ? <Inbox className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span>{t === 'received' ? 'Received' : 'Sent'} ({t === 'received' ? received.length : sent.length})</span>
          </button>
        ))}
      </div>

      <div className="divide-y divide-[#1A1A1A]/10">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-[#76746E] text-xs font-mono">No {tab} share requests.</div>
        ) : (
          rows.map(r => (
            <div key={r.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-serif font-bold text-sm text-[#1A1A1A]">Storage root {r.storageRootId}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase font-semibold border ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#5A5955]">
                    {tab === 'received' ? `From user ${r.requesterUserId}` : `To user ${r.targetUserId}`} • {r.permissions.join('+')} •{' '}
                    {r.transferMode === 'direct' ? (
                      <span className="inline-flex items-center"><Zap className="w-3 h-3 mx-0.5 text-amber-600" />Direct</span>
                    ) : (
                      <span className="inline-flex items-center"><ShieldCheck className="w-3 h-3 mx-0.5 text-emerald-600" />Relay</span>
                    )}
                  </div>
                  {r.message && <div className="text-[11px] text-[#5A5955] italic">"{r.message}"</div>}
                  <div className="text-[10px] font-mono text-[#8C8A82] flex items-center"><Clock className="w-3 h-3 mr-1" />Expires {r.expiresAt}</div>
                </div>

                {tab === 'received' && r.status === 'pending' && acceptingId !== r.id && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleStartAccept(r)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Check className="w-3.5 h-3.5" /><span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(r)}
                      disabled={busyId === r.id}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#FFFFFF] hover:bg-rose-50 text-rose-700 border border-[#1A1A1A]/20 hover:border-rose-300 text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}<span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              {acceptingId === r.id && (
                <div className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/15 flex flex-col sm:flex-row sm:items-center gap-2">
                  <select
                    value={acceptDeviceId}
                    onChange={(e) => setAcceptDeviceId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-[#FFFFFF] border border-[#1A1A1A]/30 text-[#1A1A1A] text-[11px] font-mono focus:outline-none focus:border-[#1A1A1A]"
                  >
                    {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleConfirmAccept(r)}
                      disabled={busyId === r.id || !acceptDeviceId}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}<span>Confirm on this device</span>
                    </button>
                    <button onClick={() => setAcceptingId(null)} className="px-3 py-1.5 bg-[#FFFFFF] text-[#5A5955] border border-[#1A1A1A]/20 text-[11px] font-mono transition-colors cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
