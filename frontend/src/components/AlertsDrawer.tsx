import React from 'react';
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { AuditEvent } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AuditEvent[];
  onClearAlerts: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onClearAlerts
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Security & Mesh Alerts</h3>
              <p className="text-xs text-slate-400">{alerts.length} event notifications</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClearAlerts}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400/50 mx-auto" />
              <div>All mesh storage nodes operating normally. No active security warnings.</div>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3.5 rounded-xl border space-y-1.5 text-xs transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : alert.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold">
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    )}
                    <span>{alert.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{alert.timestamp.split(' ')[1]}</span>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed">{alert.details}</p>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                  <span>Node: {alert.deviceName || 'Mesh Node'}</span>
                  <span>IP: {alert.ipHash}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 text-center text-[11px] text-slate-500">
          Zero-Trust Auditing • Merkle-Root Hash Validated
        </div>

      </div>
    </div>
  );
};
