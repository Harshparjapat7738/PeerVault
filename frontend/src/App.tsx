import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DeviceGrid } from './components/DeviceGrid';
import { DevicePairingModal } from './components/DevicePairingModal';
import { FileExplorer } from './components/FileExplorer';
import { FilePreviewModal } from './components/FilePreviewModal';
import { DirectTransferModal } from './components/DirectTransferModal';
import { TransferManager } from './components/TransferManager';
import { SecurityAndShield } from './components/SecurityAndShield';
import { NetworkTopology } from './components/NetworkTopology';
import { AgentTerminal } from './components/AgentTerminal';
import { ArchitectureSuite } from './components/ArchitectureSuite';
import { AlertsDrawer } from './components/AlertsDrawer';
import { ShareStorageModal } from './components/ShareStorageModal';
import { ShareRequestsList } from './components/ShareRequestsList';
import { SharedStorageView } from './components/SharedStorageView';

import {
  INITIAL_DEVICES,
  INITIAL_FILES,
  INITIAL_TRANSFERS,
  INITIAL_AUDIT_LOGS,
  STRIDE_THREAT_MATRIX
} from './data/initialData';

import { Device, StorageFile, TransferTask, AuditEvent, StorageRoot, ShareRequest, SharedStorageOverview } from './types';
import { getShareRequestsSent, getShareRequestsReceived, getSharedStorage } from './api-client';
import { subscribeStomp } from './stomp-client';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('devices');
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [files, setFiles] = useState<StorageFile[]>(INITIAL_FILES);
  const [transfers, setTransfers] = useState<TransferTask[]>(INITIAL_TRANSFERS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS);
  
  // Modals & Drawers state
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<StorageFile | null>(null);
  const [directTransferFile, setDirectTransferFile] = useState<StorageFile | null>(null);
  const [isAlertsDrawerOpen, setIsAlertsDrawerOpen] = useState(false);
  const [selectedDeviceIdForExplorer, setSelectedDeviceIdForExplorer] = useState<string>('all');

  // Storage Sharing state (Task 8) — the one part of this app backed by the real share-service/
  // transfer-service APIs (api-client.ts) rather than data/initialData.ts mock state. Fetches are
  // best-effort: if the backend mesh isn't running, the Sharing tab just shows empty lists rather
  // than breaking the rest of this otherwise fully-mock app.
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareRequestsSent, setShareRequestsSent] = useState<ShareRequest[]>([]);
  const [shareRequestsReceived, setShareRequestsReceived] = useState<ShareRequest[]>([]);
  const [sharedStorageOverview, setSharedStorageOverview] = useState<SharedStorageOverview>({ sharedWithMe: [], sharedByMe: [] });

  const refreshShareRequests = () => {
    getShareRequestsSent().then(setShareRequestsSent).catch(() => {/* backend unreachable — leave prior state */});
    getShareRequestsReceived().then(setShareRequestsReceived).catch(() => {});
  };

  const refreshSharedStorage = () => {
    getSharedStorage().then(setSharedStorageOverview).catch(() => {});
  };

  useEffect(() => {
    refreshShareRequests();
    refreshSharedStorage();

    // Live updates: any share-requests/share-acceptances/share-rejections activity for any user
    // refetches — see backend/claude.md's Task 3 note on why this is a mesh-wide broadcast, not
    // scoped to just this user's own requests.
    const unsubRequests = subscribeStomp('/topic/share/requests', () => refreshShareRequests());
    const unsubStatus = subscribeStomp('/topic/share/status', () => {
      refreshShareRequests();
      refreshSharedStorage();
    });
    return () => {
      unsubRequests();
      unsubStatus();
    };
  }, []);

  // Live Toast Notification Banner
  const [toastMessage, setToastMessage] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setToastMessage({ title, message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-time transfer simulation loop (ticks every 800ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setTransfers(prev => prev.map(task => {
        if (task.status !== 'transferring') return task;

        const incrementBytes = Math.floor(task.speedBytesPerSec * 0.8);
        const newTransferred = Math.min(task.sizeBytes, task.transferredBytes + incrementBytes);
        const newChunks = Math.min(task.chunksTotal, Math.ceil((newTransferred / task.sizeBytes) * task.chunksTotal));
        const remainingBytes = task.sizeBytes - newTransferred;
        const newEta = task.speedBytesPerSec > 0 ? Math.max(0, Math.ceil(remainingBytes / task.speedBytesPerSec)) : 0;

        if (newTransferred >= task.sizeBytes) {
          // Completed! Add audit log
          const newAudit: AuditEvent = {
            id: `audit_done_${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            eventType: 'file_transfer',
            severity: 'info',
            deviceId: task.sourceDeviceId,
            deviceName: task.sourceDeviceName,
            actor: 'PeerVault Transfer Engine',
            action: `Transfer Completed: ${task.name}`,
            details: `SHA-256 integrity verified (${task.sha256Checksum.slice(0, 16)}...). 0 corrupted blocks.`,
            authorized: true,
            ipHash: 'sha256:41e0...bb12'
          };
          setAuditLogs(logs => [newAudit, ...logs]);

          return {
            ...task,
            transferredBytes: task.sizeBytes,
            chunksCompleted: task.chunksTotal,
            status: 'completed',
            speedBytesPerSec: 0,
            etaSeconds: 0,
            completedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
          };
        }

        return {
          ...task,
          transferredBytes: newTransferred,
          chunksCompleted: newChunks,
          etaSeconds: newEta
        };
      }));
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Handlers for Device actions
  const handleBrowseDevice = (deviceId: string) => {
    setSelectedDeviceIdForExplorer(deviceId);
    setActiveTab('files');
  };

  const handleToggleFreeze = (deviceId: string) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      const isFrozen = d.status === 'frozen';
      const newStatus = isFrozen ? 'online' : 'frozen';
      
      const newAudit: AuditEvent = {
        id: `audit_freeze_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        eventType: isFrozen ? 'policy_change' : 'device_freeze',
        severity: isFrozen ? 'info' : 'warning',
        deviceId: d.id,
        deviceName: d.name,
        actor: 'User (harshparjapat7738@gmail.com)',
        action: isFrozen ? 'Storage Node Unfrozen' : 'Emergency Node Freeze Initiated',
        details: isFrozen 
          ? `Cryptographic sessions restored for ${d.name}.`
          : `Node ${d.name} isolated from mesh. All active session keys revoked immediately.`,
        authorized: true,
        ipHash: 'sha256:99a1...33d2'
      };
      setAuditLogs(logs => [newAudit, ...logs]);

      showToast(
        isFrozen ? 'Node Unfrozen' : 'Emergency Node Isolated',
        isFrozen ? `${d.name} is back online.` : `${d.name} has been frozen. Remote access suspended.`,
        isFrozen ? 'success' : 'warn'
      );

      return { ...d, status: newStatus };
    }));
  };

  const handleRevokeDevice = (deviceId: string) => {
    const target = devices.find(d => d.id === deviceId);
    if (!target) return;

    if (!confirm(`Are you sure you want to permanently revoke credentials for "${target.name}"? This device will be un-paired from the mesh.`)) {
      return;
    }

    setDevices(prev => prev.filter(d => d.id !== deviceId));

    const newAudit: AuditEvent = {
      id: `audit_revoke_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      eventType: 'device_revoke',
      severity: 'critical',
      deviceId: target.id,
      deviceName: target.name,
      actor: 'User (harshparjapat7738@gmail.com)',
      action: 'Device Credentials Revoked',
      details: `Public key ${target.publicKeyFingerprint} blacklisted across Control Plane.`,
      authorized: true,
      ipHash: 'sha256:99a1...33d2'
    };
    setAuditLogs(logs => [newAudit, ...logs]);

    showToast('Device Revoked', `${target.name} credentials permanently deleted.`, 'warn');
  };

  const handleAddAllowedRoot = (deviceId: string, root: StorageRoot) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      return {
        ...d,
        allowedRoots: [...d.allowedRoots, root]
      };
    }));

    showToast('Storage Sandbox Added', `Authorized path ${root.path} on device.`, 'success');
  };

  const handlePairSuccess = (newDevice: Device) => {
    setDevices(prev => [newDevice, ...prev]);

    const newAudit: AuditEvent = {
      id: `audit_pair_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      eventType: 'device_pair',
      severity: 'info',
      deviceId: newDevice.id,
      deviceName: newDevice.name,
      actor: 'User (harshparjapat7738@gmail.com)',
      action: 'New Storage Node Paired',
      details: `Attestation confirmed. Fingerprint: ${newDevice.publicKeyFingerprint}. Allowed roots: ${newDevice.allowedRoots.map(r => r.path).join(', ')}.`,
      authorized: true,
      ipHash: 'sha256:99a1...33d2'
    };
    setAuditLogs(logs => [newAudit, ...logs]);

    showToast('Node Paired', `${newDevice.name} connected to personal mesh.`, 'success');
  };

  // Handlers for File actions
  const handleDownloadFile = (file: StorageFile) => {
    const sourceDev = devices.find(d => d.id === file.deviceId);
    
    // Create new transfer task
    const newTask: TransferTask = {
      id: `tx_dl_${Date.now()}`,
      name: `${file.name} (Download to Local Device)`,
      sourceDeviceId: file.deviceId,
      targetDeviceId: 'dev_local_client',
      sourceDeviceName: sourceDev?.name || 'Remote Node',
      targetDeviceName: 'Current Browser Client',
      sourceFilePath: `${file.rootPath}/${file.relativePath}`,
      targetFilePath: `/Downloads/${file.name}`,
      sizeBytes: file.sizeBytes,
      transferredBytes: 0,
      speedBytesPerSec: 52 * 1024 * 1024, // 52 MB/s
      status: 'transferring',
      mode: sourceDev?.directP2PCapable ? 'p2p_direct' : 'relay_encrypted',
      chunksTotal: Math.max(1, Math.ceil(file.sizeBytes / (256 * 1024))),
      chunksCompleted: 0,
      etaSeconds: Math.max(2, Math.ceil(file.sizeBytes / (52 * 1024 * 1024))),
      sha256Checksum: file.sha256Hash,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      startedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    setTransfers(prev => [newTask, ...prev]);
    setActiveTab('transfers');
    showToast('P2P Download Started', `Streaming ${file.name} via direct encrypted channel.`, 'success');
  };

  const handleMoveToTrash = (fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return {
        ...f,
        inTrash: true,
        trashedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        trashExpiresAt: '30 Days from now'
      };
    }));

    const file = files.find(f => f.id === fileId);
    if (file) {
      const newAudit: AuditEvent = {
        id: `audit_trash_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        eventType: 'file_delete',
        severity: 'warning',
        deviceId: file.deviceId,
        actor: 'User (harshparjapat7738@gmail.com)',
        action: `Moved to Soft-Delete Quarantine: ${file.name}`,
        details: `File preserved in .trash_vault for 30-day recovery window.`,
        authorized: true,
        ipHash: 'sha256:99a1...33d2'
      };
      setAuditLogs(logs => [newAudit, ...logs]);
    }

    showToast('Quarantined to Trash', 'File moved to 30-day soft trash. Can be restored anytime.', 'warn');
  };

  const handleRestoreFromTrash = (fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return {
        ...f,
        inTrash: false,
        trashedAt: undefined
      };
    }));

    showToast('File Restored', 'Restored to original sandbox directory.', 'success');
  };

  const handlePermanentlyPurgeTrash = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    showToast('Permanently Purged', 'File unlinked from physical storage.', 'info');
  };

  const handleUploadFile = (deviceId: string, newFile: StorageFile) => {
    setFiles(prev => [newFile, ...prev]);
    showToast('File Encrypted & Uploaded', `${newFile.name} saved to storage node.`, 'success');
  };

  const handleStartDirectTransfer = (newTask: TransferTask) => {
    setTransfers(prev => [newTask, ...prev]);
    setActiveTab('transfers');
    showToast('Transfer Orchestrated', `P2P channel initiated between ${newTask.sourceDeviceName} and ${newTask.targetDeviceName}.`, 'success');
  };

  // Transfer task controls
  const handleTogglePause = (taskId: string) => {
    setTransfers(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const isPaused = t.status === 'paused';
      return {
        ...t,
        status: isPaused ? 'transferring' : 'paused',
        speedBytesPerSec: isPaused ? 42 * 1024 * 1024 : 0
      };
    }));
  };

  const handleCancelTransfer = (taskId: string) => {
    setTransfers(prev => prev.filter(t => t.id !== taskId));
    showToast('Transfer Cancelled', 'Stream closed.', 'info');
  };

  const handleSimulateGlitchAndResume = (taskId: string) => {
    showToast('Simulating Glitch', 'Simulated packet loss. Auto-resuming from chunk offset...', 'warn');
    setTransfers(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        status: 'paused',
        speedBytesPerSec: 0
      };
    }));

    setTimeout(() => {
      setTransfers(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status: 'transferring',
          speedBytesPerSec: 48 * 1024 * 1024
        };
      }));
      showToast('Connection Resumed', 'P2P channel re-established. 0 bytes re-downloaded.', 'success');
    }, 1200);
  };

  // Ransomware Mass Deletion Simulation
  const handleSimulateRansomwareAttack = () => {
    // Simulate an automated attack attempting to delete 25 files in 1 second
    const attackAlert: AuditEvent = {
      id: `audit_ransom_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      eventType: 'threat_detected',
      severity: 'critical',
      deviceId: 'dev_m3_max_01',
      deviceName: 'MacBook Pro 16"',
      actor: 'Anomaly Circuit Breaker',
      action: 'MASS DELETION ANOMALY BLOCKED (25 ops/sec)',
      details: 'Ransomware behavioral signature detected! Deletion rate exceeded 20 files/min limit. Node temporarily locked. Existing files safe in 30-day soft trash vault.',
      authorized: false,
      ipHash: 'sha256:bad_actor_99'
    };

    setAuditLogs(logs => [attackAlert, ...logs]);
    showToast(
      'Mass Deletion Blocked!',
      'Ransomware Defense Shield triggered. Node locked & rate-limited. 0 permanent data loss.',
      'error'
    );
    setIsAlertsDrawerOpen(true);
  };

  const handleRevokeAllSessions = () => {
    const newAudit: AuditEvent = {
      id: `audit_kill_all_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      eventType: 'auth',
      severity: 'warning',
      actor: 'User (harshparjapat7738@gmail.com)',
      action: 'Global Session Revocation',
      details: 'All ephemeral ECDH session tokens and WebSockets disconnected across entire mesh.',
      authorized: true,
      ipHash: 'sha256:99a1...33d2'
    };
    setAuditLogs(logs => [newAudit, ...logs]);
    showToast('All Sessions Revoked', 'Mesh nodes require re-authentication.', 'warn');
  };

  const unreadAlertsCount = auditLogs.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
  const trashFiles = files.filter(f => f.inTrash);
  const activeDeviceForCLI = devices.find(d => d.id === 'dev_m3_max_01') || devices[0];

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex flex-col selection:bg-[#1A1A1A] selection:text-[#F9F8F6]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-200">
          <div className={`p-4 border shadow-xl max-w-sm flex items-start space-x-3 ${
            toastMessage.type === 'error' ? 'bg-[#1A1A1A] border-rose-600 text-[#F9F8F6]' :
            toastMessage.type === 'warn' ? 'bg-[#1A1A1A] border-amber-500 text-[#F9F8F6]' :
            toastMessage.type === 'success' ? 'bg-[#1A1A1A] border-emerald-600 text-[#F9F8F6]' :
            'bg-[#1A1A1A] border-[#1A1A1A] text-[#F9F8F6]'
          }`}>
            <div className="space-y-0.5">
              <div className="font-bold text-xs font-mono uppercase tracking-wider">{toastMessage.title}</div>
              <div className="text-[11px] text-[#D5D2CA]">{toastMessage.message}</div>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-[#8C8A82] hover:text-[#FFFFFF] text-xs font-mono ml-auto cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Header with Mesh Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        devices={devices}
        transfers={transfers}
        onOpenPairing={() => setIsPairingOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
        onOpenAlerts={() => setIsAlertsDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'devices' && (
          <DeviceGrid
            devices={devices}
            onBrowseDevice={handleBrowseDevice}
            onOpenPairing={() => setIsPairingOpen(true)}
            onToggleFreeze={handleToggleFreeze}
            onRevokeDevice={handleRevokeDevice}
            onAddAllowedRoot={handleAddAllowedRoot}
          />
        )}

        {activeTab === 'files' && (
          <FileExplorer
            files={files}
            devices={devices}
            selectedDeviceId={selectedDeviceIdForExplorer}
            onSelectDeviceId={setSelectedDeviceIdForExplorer}
            onPreviewFile={(f) => setPreviewFile(f)}
            onDownloadFile={handleDownloadFile}
            onMoveToTrash={handleMoveToTrash}
            onDirectTransfer={(f) => setDirectTransferFile(f)}
            onUploadFile={handleUploadFile}
          />
        )}

        {activeTab === 'transfers' && (
          <TransferManager
            transfers={transfers}
            onTogglePause={handleTogglePause}
            onCancelTransfer={handleCancelTransfer}
            onSimulateGlitchAndResume={handleSimulateGlitchAndResume}
          />
        )}

        {activeTab === 'security' && (
          <SecurityAndShield
            threats={STRIDE_THREAT_MATRIX}
            auditLogs={auditLogs}
            trashFiles={trashFiles}
            devices={devices}
            onRestoreFromTrash={handleRestoreFromTrash}
            onPermanentlyPurgeTrash={handlePermanentlyPurgeTrash}
            onSimulateRansomwareAttack={handleSimulateRansomwareAttack}
            onRevokeAllSessions={handleRevokeAllSessions}
          />
        )}

        {activeTab === 'sharing' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif font-bold text-lg text-[#1A1A1A]">Storage Sharing</h2>
                <p className="text-xs text-[#76746E] font-mono">Cross-device, cross-user access grants — backed by share-service</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-[#1A1A1A]"
              >
                <span>New Share Request</span>
              </button>
            </div>

            <ShareRequestsList
              sent={shareRequestsSent}
              received={shareRequestsReceived}
              devices={devices}
              onChanged={() => { refreshShareRequests(); refreshSharedStorage(); }}
              showToast={showToast}
            />

            <SharedStorageView
              overview={sharedStorageOverview}
              onChanged={refreshSharedStorage}
              showToast={showToast}
            />
          </div>
        )}

        {activeTab === 'topology' && (
          <NetworkTopology devices={devices} />
        )}

        {activeTab === 'agent-cli' && (
          <AgentTerminal activeDevice={activeDeviceForCLI} />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureSuite />
        )}

      </main>

      {/* Device Pairing Modal */}
      <DevicePairingModal
        isOpen={isPairingOpen}
        onClose={() => setIsPairingOpen(false)}
        onPairSuccess={handlePairSuccess}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        device={devices.find(d => d.id === previewFile?.deviceId)}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownloadFile}
        onMoveToTrash={handleMoveToTrash}
        onDirectTransfer={(f) => setDirectTransferFile(f)}
      />

      {/* Direct Device-to-Device Transfer Modal */}
      <DirectTransferModal
        isOpen={!!directTransferFile}
        fileToTransfer={directTransferFile}
        devices={devices}
        onClose={() => setDirectTransferFile(null)}
        onStartTransfer={handleStartDirectTransfer}
      />

      {/* Share Storage Modal */}
      <ShareStorageModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        devices={devices}
        onShareRequestCreated={(req) => setShareRequestsSent(prev => [req, ...prev])}
        showToast={showToast}
      />

      {/* Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsDrawerOpen}
        onClose={() => setIsAlertsDrawerOpen(false)}
        alerts={auditLogs}
        onClearAlerts={() => setAuditLogs([])}
      />

      {/* Editorial Footer */}
      <footer className="border-t border-[#1A1A1A]/20 bg-[#F4F2EE] py-6 text-xs text-[#5A5955]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="font-serif font-bold text-sm text-[#1A1A1A]">PeerVault Storage Mesh</div>
            <div className="text-[11px] text-[#76746E]">Zero-Trust Personal Distributed Storage Network & Cryptographic Control Plane</div>
          </div>
          <div className="font-mono text-[10px] text-[#5A5955] uppercase tracking-widest text-center sm:text-right">
            TLS 1.3 • Noise_XX_25519 • Rust Agent Sandboxed
          </div>
        </div>
      </footer>

    </div>
  );
}
