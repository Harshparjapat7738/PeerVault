import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Play, 
  Pause, 
  X, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Radio, 
  Gauge, 
  AlertCircle, 
  RefreshCw, 
  HardDrive, 
  Layers,
  Sparkles
} from 'lucide-react';
import { TransferTask, TransferStatus } from '../types';

interface TransferManagerProps {
  transfers: TransferTask[];
  onTogglePause: (id: string) => void;
  onCancelTransfer: (id: string) => void;
  onSimulateGlitchAndResume: (id: string) => void;
}

export const TransferManager: React.FC<TransferManagerProps> = ({
  transfers,
  onTogglePause,
  onCancelTransfer,
  onSimulateGlitchAndResume
}) => {
  const [activeSpeedLimit, setActiveSpeedLimit] = useState<'unlimited' | '50mb' | '10mb'>('unlimited');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredTransfers = transfers.filter(t => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return t.status === 'transferring';
    if (filterStatus === 'completed') return t.status === 'completed';
    if (filterStatus === 'paused') return t.status === 'paused';
    return true;
  });

  const totalActiveSpeed = transfers
    .filter(t => t.status === 'transferring')
    .reduce((acc, t) => acc + t.speedBytesPerSec, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Transfer Hub Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-[#FFFFFF] border border-[#1A1A1A]/20 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#76746E]">
            <span>Aggregate Throughput</span>
            <Gauge className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#1A1A1A]">
            {(totalActiveSpeed / (1024 * 1024)).toFixed(1)} <span className="text-xs text-[#76746E] font-sans">MB/s</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-800 flex items-center font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
            Direct P2P Data Channels Active
          </div>
        </div>

        <div className="p-5 bg-[#FFFFFF] border border-[#1A1A1A]/20 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#76746E]">
            <span>Active Streams</span>
            <ArrowLeftRight className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#1A1A1A]">
            {transfers.filter(t => t.status === 'transferring').length}
          </div>
          <div className="text-[10px] font-mono text-[#76746E]">
            {transfers.filter(t => t.status === 'completed').length} completed in session
          </div>
        </div>

        <div className="p-5 bg-[#FFFFFF] border border-[#1A1A1A]/20 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#76746E]">
            <span>Chunk Engine (256KB)</span>
            <Layers className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <div className="text-xl font-bold font-serif text-[#1A1A1A]">
            Rolling SHA-256
          </div>
          <div className="text-[10px] font-mono text-[#76746E]">
            ChaCha20-Poly1305 Cipher
          </div>
        </div>

        <div className="p-5 bg-[#FFFFFF] border border-[#1A1A1A]/20 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-[#76746E]">
            <span>Bandwidth Throttle</span>
            <Radio className="w-4 h-4 text-[#1A1A1A]" />
          </div>
          <div className="flex items-center space-x-1 pt-1">
            {(['unlimited', '50mb', '10mb'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveSpeedLimit(mode)}
                className={`px-2.5 py-1 text-[10px] font-mono uppercase transition-colors cursor-pointer border ${
                  activeSpeedLimit === mode
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] text-[#5A5955] border-[#1A1A1A]/15 hover:text-[#1A1A1A]'
                }`}
              >
                {mode === 'unlimited' ? 'Max' : mode}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-mono text-[#76746E]">
            Per-device I/O schedule
          </div>
        </div>

      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-[#FFFFFF] p-3.5 border border-[#1A1A1A]/20 text-xs shadow-xs">
        <div className="flex items-center space-x-2">
          {['all', 'active', 'paused', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 font-mono text-[11px] capitalize transition-colors cursor-pointer border ${
                filterStatus === f
                  ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                  : 'bg-[#F9F8F6] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/10'
              }`}
            >
              {f} ({
                f === 'all' ? transfers.length :
                f === 'active' ? transfers.filter(t => t.status === 'transferring').length :
                f === 'completed' ? transfers.filter(t => t.status === 'completed').length :
                transfers.filter(t => t.status === 'paused').length
              })
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-[#76746E] hidden sm:block">
          Resumable Chunks • Cryptographic Integrity Flush
        </div>
      </div>

      {/* Transfer Task Cards */}
      <div className="space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#76746E] text-xs font-mono">
            No transfer tasks found matching filter.
          </div>
        ) : (
          filteredTransfers.map((task) => {
            const percentage = Math.min(100, Math.round((task.transferredBytes / task.sizeBytes) * 100));
            const isCompleted = task.status === 'completed';
            const isTransferring = task.status === 'transferring';
            const isPaused = task.status === 'paused';

            return (
              <div
                key={task.id}
                id={`transfer-task-${task.id}`}
                className="bg-[#FFFFFF] border border-[#1A1A1A]/20 p-6 space-y-4 shadow-xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="font-serif font-bold text-base text-[#1A1A1A]">{task.name}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                        task.mode === 'p2p_direct'
                          ? 'bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/15'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}>
                        {task.mode === 'p2p_direct' ? (
                          <>
                            <Zap className="w-3 h-3 mr-1 text-[#1A1A1A]" />
                            Direct P2P Stream
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-700" />
                            Encrypted Relay
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-[#5A5955] font-mono">
                      <span>{task.sourceDeviceName}</span>
                      <span className="text-[#1A1A1A]">➔</span>
                      <span>{task.targetDeviceName}</span>
                    </div>
                  </div>

                  {/* Right Status Badge & Actions */}
                  <div className="flex items-center space-x-2">
                    {isTransferring && (
                      <span className="inline-flex items-center px-2.5 py-1 font-mono text-[10px] uppercase font-semibold bg-blue-50 text-blue-900 border border-blue-300">
                        <span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5 animate-ping"></span>
                        Streaming ({(task.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s)
                      </span>
                    )}

                    {isCompleted && (
                      <span className="inline-flex items-center px-2.5 py-1 font-mono text-[10px] uppercase font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Transferred & Verified
                      </span>
                    )}

                    {isPaused && (
                      <span className="inline-flex items-center px-2.5 py-1 font-mono text-[10px] uppercase font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                        <Pause className="w-3.5 h-3.5 mr-1" />
                        Paused (Offset Preserved)
                      </span>
                    )}

                    {/* Task Controls */}
                    {!isCompleted && (
                      <div className="flex items-center space-x-1 pl-2">
                        <button
                          onClick={() => onTogglePause(task.id)}
                          className="p-1.5 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-[#1A1A1A] border border-[#1A1A1A]/20 transition-colors cursor-pointer"
                          title={isPaused ? 'Resume transfer' : 'Pause transfer'}
                        >
                          {isPaused ? <Play className="w-3.5 h-3.5 text-[#1A1A1A]" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onCancelTransfer(task.id)}
                          className="p-1.5 bg-[#FFFFFF] hover:bg-rose-50 text-rose-700 border border-[#1A1A1A]/20 hover:border-rose-300 transition-colors cursor-pointer"
                          title="Cancel transfer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Numerical Metrics */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#1A1A1A]">
                      {formatBytes(task.transferredBytes)} <span className="text-[#76746E]">/ {formatBytes(task.sizeBytes)} ({percentage}%)</span>
                    </span>
                    <span className="text-[#5A5955]">
                      {isTransferring ? `ETA: ${task.etaSeconds}s` : isCompleted ? 'Completed' : 'Standby'}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#EFECE6] overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-600'
                          : 'bg-[#1A1A1A]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Live 256KB Chunk Visualizer Stream */}
                <div className="bg-[#F9F8F6] p-3.5 border border-[#1A1A1A]/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[#5A5955] font-mono">
                    <span className="flex items-center">
                      <Layers className="w-3 h-3 mr-1.5 text-[#1A1A1A]" />
                      Chunk Stream ({task.chunksCompleted.toLocaleString()} / {task.chunksTotal.toLocaleString()} blocks)
                    </span>
                    <span className="text-[#76746E] truncate max-w-[220px]" title={task.sha256Checksum}>
                      SHA-256: {task.sha256Checksum.slice(0, 16)}...
                    </span>
                  </div>

                  {/* Simulated interactive mini-blocks */}
                  <div className="flex space-x-1 overflow-hidden py-1">
                    {Array.from({ length: 32 }).map((_, idx) => {
                      const chunkProgress = (idx / 32) * 100;
                      const isChunkDone = percentage >= chunkProgress;
                      const isChunkActive = isTransferring && !isChunkDone && percentage >= chunkProgress - 6;

                      return (
                        <div
                          key={idx}
                          className={`h-4 flex-1 transition-colors duration-150 border ${
                            isChunkDone
                              ? 'bg-[#1A1A1A] border-[#1A1A1A]'
                              : isChunkActive
                                ? 'bg-amber-400 border-amber-500 animate-pulse'
                                : 'bg-[#EFECE6] border-[#D5D2CA]'
                          }`}
                          title={`Block #${idx * 100}: ${isChunkDone ? 'Verified' : 'Pending'}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Resumption & Glitch Recovery Test Simulator */}
                {isTransferring && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onSimulateGlitchAndResume(task.id)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#F9F8F6] hover:bg-[#EFECE6] border border-[#1A1A1A]/20 text-xs text-[#1A1A1A] font-mono transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      <span>Simulate Network Dropout & Auto-Resume</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
