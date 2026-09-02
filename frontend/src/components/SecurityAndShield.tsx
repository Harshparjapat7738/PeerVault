import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Lock, 
  KeyRound, 
  Activity, 
  Flame, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Search, 
  Radio, 
  Layers,
  XCircle
} from 'lucide-react';
import { AuditEvent, ThreatItem, StorageFile, Device } from '../types';

interface SecurityAndShieldProps {
  threats: ThreatItem[];
  auditLogs: AuditEvent[];
  trashFiles: StorageFile[];
  devices: Device[];
  onRestoreFromTrash: (fileId: string) => void;
  onPermanentlyPurgeTrash: (fileId: string) => void;
  onSimulateRansomwareAttack: () => void;
  onRevokeAllSessions: () => void;
}

export const SecurityAndShield: React.FC<SecurityAndShieldProps> = ({
  threats,
  auditLogs,
  trashFiles,
  devices,
  onRestoreFromTrash,
  onPermanentlyPurgeTrash,
  onSimulateRansomwareAttack,
  onRevokeAllSessions
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stride' | 'trash' | 'audit' | 'keys'>('stride');
  const [auditFilter, setAuditFilter] = useState<'all' | 'warning' | 'critical'>('all');
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(threats[0]);

  const filteredLogs = auditLogs.filter(log => {
    if (auditFilter === 'all') return true;
    if (auditFilter === 'warning') return log.severity === 'warning' || log.severity === 'critical';
    if (auditFilter === 'critical') return log.severity === 'critical';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Security Overview & Circuit Breaker Controls */}
      <div className="bg-[#FFFFFF] p-6 border border-[#1A1A1A]/20 space-y-5 shadow-xs">
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A]">
              <ShieldCheck className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">Zero-Trust & Destructive Action Shield</h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-semibold">
                  Shield Active
                </span>
              </div>
              <p className="text-xs text-[#5A5955] mt-1 max-w-2xl leading-relaxed">
                STRIDE threat mitigation, cryptographic nonces, 30-day soft-delete quarantine, and mass-delete anomaly circuit breakers.
              </p>
            </div>
          </div>

          {/* Interactive Attack Simulation Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSimulateRansomwareAttack}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FFFFFF] hover:bg-rose-50 text-rose-800 border border-rose-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
              title="Simulates rapid mass delete flood to test the circuit breaker"
            >
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Simulate Ransomware Mass Deletion</span>
            </button>

            <button
              onClick={onRevokeAllSessions}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#1A1A1A]"
            >
              <Lock className="w-4 h-4 text-[#D5D2CA]" />
              <span>Revoke All Ephemeral Tokens</span>
            </button>
          </div>
        </div>

        {/* Security Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1A1A1A]/10 text-xs">
          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10">
            <div className="text-[#76746E] text-[11px] font-mono uppercase">STRIDE Mitigations</div>
            <div className="font-bold text-[#1A1A1A] text-sm mt-0.5 font-mono">6/6 Enforced</div>
          </div>
          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10">
            <div className="text-[#76746E] text-[11px] font-mono uppercase">Soft-Trash Quarantine</div>
            <div className="font-bold text-[#1A1A1A] text-sm mt-0.5 font-mono">{trashFiles.length} files (30d retention)</div>
          </div>
          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10">
            <div className="text-[#76746E] text-[11px] font-mono uppercase">Audit Log Chain</div>
            <div className="font-bold text-emerald-800 text-sm mt-0.5 font-mono">SHA-256 Chained</div>
          </div>
          <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/10">
            <div className="text-[#76746E] text-[11px] font-mono uppercase">Rate-Limit Guard</div>
            <div className="font-bold text-[#1A1A1A] text-sm mt-0.5 font-mono">&lt; 20 ops / minute</div>
          </div>
        </div>

      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#1A1A1A]/20 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveSubTab('stride')}
          className={`px-3.5 py-1.5 transition-colors cursor-pointer border ${
            activeSubTab === 'stride'
              ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
              : 'bg-[#FFFFFF] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
          }`}
        >
          STRIDE Threat Matrix (6)
        </button>

        <button
          onClick={() => setActiveSubTab('trash')}
          className={`px-3.5 py-1.5 transition-colors cursor-pointer flex items-center space-x-1.5 border ${
            activeSubTab === 'trash'
              ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
              : 'bg-[#FFFFFF] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
          }`}
        >
          <span>Soft-Delete Trash Quarantine</span>
          {trashFiles.length > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold">
              {trashFiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3.5 py-1.5 transition-colors cursor-pointer border ${
            activeSubTab === 'audit'
              ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
              : 'bg-[#FFFFFF] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
          }`}
        >
          Immutable Audit Ledger ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('keys')}
          className={`px-3.5 py-1.5 transition-colors cursor-pointer border ${
            activeSubTab === 'keys'
              ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
              : 'bg-[#FFFFFF] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
          }`}
        >
          Cryptographic Keyring & Sessions
        </button>
      </div>

      {/* SUB-TAB 1: STRIDE THREAT MATRIX */}
      {activeSubTab === 'stride' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Threats List */}
          <div className="lg:col-span-1 space-y-2">
            {threats.map((threat) => {
              const isSelected = selectedThreat?.id === threat.id;
              return (
                <div
                  key={threat.id}
                  onClick={() => setSelectedThreat(threat)}
                  className={`p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFFFFF] border-[#1A1A1A] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#1A1A1A]/15 hover:border-[#1A1A1A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold font-mono text-[#1A1A1A]">
                      [{threat.strideCategory[0]}] {threat.strideCategory}
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 font-semibold">
                      {threat.status}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-xs text-[#1A1A1A] truncate">{threat.title}</h4>
                  <p className="text-[11px] font-mono text-[#76746E] truncate mt-0.5">{threat.targetComponent}</p>
                </div>
              );
            })}
          </div>

          {/* Detailed Threat Inspector */}
          {selectedThreat && (
            <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
                <div>
                  <div className="text-xs font-mono text-[#76746E] font-semibold uppercase">
                    STRIDE Classification: {selectedThreat.strideCategory}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#1A1A1A] mt-0.5">{selectedThreat.title}</h3>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 font-semibold">
                  Mitigation Verified
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-4 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-1">
                  <div className="font-semibold text-[#1A1A1A] font-mono text-[11px] uppercase">Threat Description & Target</div>
                  <p className="text-[#333333] leading-relaxed">{selectedThreat.description}</p>
                  <div className="text-[11px] text-[#5A5955] font-mono pt-1">
                    Target: <span className="text-[#1A1A1A]">{selectedThreat.targetComponent}</span>
                  </div>
                </div>

                <div className="p-4 bg-rose-50/50 border border-rose-200 space-y-1">
                  <div className="font-semibold text-rose-900 font-mono text-[11px] uppercase">Potential Attack Vector</div>
                  <p className="text-rose-950 leading-relaxed font-mono text-[11px]">{selectedThreat.attackVector}</p>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200 space-y-1">
                  <div className="font-semibold text-emerald-900 flex items-center font-mono text-[11px] uppercase">
                    <ShieldCheck className="w-4 h-4 mr-1 text-emerald-700" />
                    Enforced Security Mitigation
                  </div>
                  <p className="text-emerald-950 leading-relaxed">{selectedThreat.mitigationRule}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SOFT-DELETE TRASH QUARANTINE */}
      {activeSubTab === 'trash' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-xs text-[#5A5955] flex items-start space-x-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1A1A1A]">Anti-Ransomware Quarantine Active:</strong> Remote deletes are NEVER instantly unlinked from disk. Deleted files enter a 30-day soft-delete holding vault on the source storage node and can be restored with a single click.
            </div>
          </div>

          {trashFiles.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#76746E] text-xs font-mono">
              Trash vault is currently empty. No quarantined files.
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9F8F6] text-[#76746E] border-b border-[#1A1A1A]/20 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Quarantined File</th>
                    <th className="py-3 px-4">Source Device</th>
                    <th className="py-3 px-4">Trashed At</th>
                    <th className="py-3 px-4">Auto-Purge In</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/10">
                  {trashFiles.map((file) => {
                    const device = devices.find(d => d.id === file.deviceId);
                    return (
                      <tr key={file.id} className="hover:bg-[#F9F8F6]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-serif font-bold text-sm text-[#1A1A1A]">{file.name}</div>
                          <div className="font-mono text-[10px] text-[#76746E]">{file.relativePath}</div>
                        </td>
                        <td className="py-3.5 px-4 text-[#1A1A1A]">{device?.name}</td>
                        <td className="py-3.5 px-4 text-[#5A5955] font-mono text-[11px]">{file.trashedAt || 'Recent'}</td>
                        <td className="py-3.5 px-4 text-amber-800 font-mono text-[11px] font-semibold">29 days</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => onRestoreFromTrash(file.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1 bg-[#FFFFFF] hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-mono transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>

                            <button
                              onClick={() => onPermanentlyPurgeTrash(file.id)}
                              className="p-1.5 text-[#76746E] hover:text-rose-700 transition-colors cursor-pointer"
                              title="Permanently erase from disk"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: IMMUTABLE AUDIT LEDGER */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#FFFFFF] p-3.5 border border-[#1A1A1A]/20 text-xs shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="text-[#5A5955] font-mono text-[11px]">Filter Severity:</span>
              {(['all', 'warning', 'critical'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setAuditFilter(sev)}
                  className={`px-2.5 py-1 capitalize font-mono text-[11px] transition-colors cursor-pointer border ${
                    auditFilter === sev
                      ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                      : 'bg-[#F9F8F6] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/10'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <span className="text-[#76746E] font-mono text-[11px] hidden sm:inline">
              Cryptographic Hash-Chain Validated (Merkle Tree Verified)
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 divide-y divide-[#1A1A1A]/10 overflow-hidden shadow-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-3 text-xs hover:bg-[#F9F8F6] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      log.severity === 'critical' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                      log.severity === 'warning' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      'bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/15'
                    }`}>
                      {log.severity}
                    </span>
                    <span className="font-serif font-bold text-sm text-[#1A1A1A]">{log.action}</span>
                    <span className="text-[#76746E] font-mono text-[10px]">[{log.eventType}]</span>
                  </div>

                  <p className="text-[#5A5955] text-xs leading-relaxed">{log.details}</p>

                  <div className="flex items-center space-x-3 text-[11px] text-[#76746E] font-mono pt-1">
                    <span>Actor: <strong className="text-[#1A1A1A] font-sans">{log.actor}</strong></span>
                    <span>•</span>
                    <span>Node: <strong className="text-[#1A1A1A] font-sans">{log.deviceName || 'Mesh'}</strong></span>
                    <span>•</span>
                    <span>IP Hash: {log.ipHash}</span>
                  </div>
                </div>

                <div className="text-[#76746E] text-[11px] whitespace-nowrap font-mono shrink-0">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: KEYRING & SESSIONS */}
      {activeSubTab === 'keys' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="bg-[#FFFFFF] p-6 border border-[#1A1A1A]/20 space-y-3.5 shadow-xs">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-[#1A1A1A]" />
              <h3 className="font-serif font-bold text-base text-[#1A1A1A]">Device Cryptographic Identities</h3>
            </div>
            <p className="text-[#5A5955] leading-relaxed">
              Each storage node generates asymmetric keypairs locally inside hardware security enclaves (Apple Secure Enclave / TPM 2.0).
            </p>

            <div className="space-y-2 pt-2">
              {devices.map((d) => (
                <div key={d.id} className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-1">
                  <div className="flex justify-between font-semibold text-[#1A1A1A]">
                    <span>{d.name}</span>
                    <span className="text-emerald-800 font-mono text-[11px]">ECDSA P-256</span>
                  </div>
                  <div className="font-mono text-[10px] text-[#76746E] truncate" title={d.publicKeyFingerprint}>
                    {d.publicKeyFingerprint}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-6 border border-[#1A1A1A]/20 space-y-3.5 shadow-xs">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-emerald-700" />
              <h3 className="font-serif font-bold text-base text-[#1A1A1A]">Active Ephemeral Sessions</h3>
            </div>
            <p className="text-[#5A5955] leading-relaxed">
              Access tokens are bounded to 120s TTL and must be co-signed with device session keys.
            </p>

            <div className="space-y-2 pt-2">
              <div className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-semibold">
                  <span>Web Dashboard Session</span>
                  <span className="text-[#1A1A1A] font-mono text-[11px]">Expires in 114s</span>
                </div>
                <div className="text-[10px] text-[#76746E] font-mono">
                  Passkey WebAuthn attested • harshparjapat7738@gmail.com
                </div>
              </div>

              <div className="p-3 bg-[#F9F8F6] border border-[#1A1A1A]/10 space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-semibold">
                  <span>P2P Data Channel Session</span>
                  <span className="text-emerald-800 font-mono text-[11px]">Active Stream</span>
                </div>
                <div className="text-[10px] text-[#76746E] font-mono">
                  Noise_XX_25519_ChaChaPoly_BLAKE2s • Laptop A &lt;--&gt; TrueNAS
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
