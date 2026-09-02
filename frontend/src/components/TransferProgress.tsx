import React from 'react';
import { Loader2, CheckCircle2, XCircle, Zap, ShieldCheck } from 'lucide-react';

export type TransferProgressMode = 'relay' | 'p2p';
export type TransferProgressStatus = 'in-progress' | 'success' | 'error';

interface TransferProgressProps {
  mode: TransferProgressMode;
  status: TransferProgressStatus;
  /** 0-100. Omit when there's no real percentage to show (e.g. the P2P handshake has no byte
   *  count of its own — see TransferProgressP2P, which renders this without a progress prop). */
  progress?: number;
  targetDeviceName?: string;
  errorMessage?: string;
}

/**
 * Lightweight "data sharing in progress" indicator, shared by the relay and P2P transfer surfaces.
 * Purely presentational — it reflects whatever `status`/`progress` its caller already has (real
 * relay chunk progress from TransferManager's TransferTask rows, or real WebRTC connection phase
 * from TransferProgressP2P); it doesn't fetch or compute anything itself.
 */
export const TransferProgress: React.FC<TransferProgressProps> = ({ mode, status, progress, targetDeviceName, errorMessage }) => {
  const modeLabel = mode === 'relay' ? 'Relay upload in progress' : 'P2P transfer in progress';
  const ModeIcon = mode === 'relay' ? ShieldCheck : Zap;

  return (
    <div
      className={`flex items-center space-x-3 px-4 py-3 border text-xs font-mono ${
        status === 'success'
          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
          : status === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : 'bg-[#F9F8F6] border-[#1A1A1A]/15 text-[#1A1A1A]'
      }`}
    >
      {status === 'in-progress' && <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
      {status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1.5">
          <ModeIcon className="w-3 h-3 shrink-0 opacity-60" />
          <span className="font-semibold uppercase tracking-wide text-[10px]">
            {status === 'success' ? 'Transfer complete' : status === 'error' ? 'Transfer failed' : 'Sharing data…'}
          </span>
        </div>
        <p className="text-[11px] opacity-80 truncate">
          {status === 'error'
            ? errorMessage || `${modeLabel} failed.`
            : targetDeviceName
              ? `${modeLabel} — to ${targetDeviceName}`
              : modeLabel}
        </p>

        {status === 'in-progress' && typeof progress === 'number' && (
          <div className="mt-1.5 w-full h-1.5 bg-[#EFECE6] overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      {status === 'in-progress' && typeof progress === 'number' && (
        <span className="shrink-0 font-semibold">{Math.round(progress)}%</span>
      )}
    </div>
  );
};
