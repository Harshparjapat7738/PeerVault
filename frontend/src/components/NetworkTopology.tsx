import React, { useState } from 'react';
import { 
  Wifi, 
  HardDrive, 
  Server, 
  Laptop, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  Radio, 
  Zap, 
  Globe, 
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { Device } from '../types';

interface NetworkTopologyProps {
  devices: Device[];
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({ devices }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('dev_m3_max_01');
  const [forceRelaySimulation, setForceRelaySimulation] = useState<boolean>(false);

  const selectedDevice = devices.find(d => d.id === selectedNodeId);

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <span>Distributed Storage Mesh Topology</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time peer-to-peer data channels, NAT STUN/ICE traversal, and zero-knowledge encrypted relays.
          </p>
        </div>

        {/* Toggle Relay Simulation */}
        <div className="flex items-center space-x-3 bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400">Force Encrypted Relay Path:</span>
          <button
            onClick={() => setForceRelaySimulation(!forceRelaySimulation)}
            className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
              forceRelaySimulation
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/50'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {forceRelaySimulation ? 'Simulated Symmetric NAT (Relay Active)' : 'Direct P2P Preferred'}
          </button>
        </div>
      </div>

      {/* Main Visual Topology Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Graph Canvas Container */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden min-h-[460px] flex flex-col justify-between shadow-2xl">
          
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Central Signaling & Relay Nodes */}
          <div className="relative z-10 flex items-center justify-around">
            
            {/* Control Plane Signaling Node */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl flex items-center justify-center text-cyan-400 ring-2 ring-cyan-500/20">
                <Radio className="w-7 h-7 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-200 mt-2">Control Plane</span>
              <span className="text-[10px] text-cyan-400 font-mono">Signaling & Auth</span>
            </div>

            {/* Zero-Knowledge Encrypted Relay */}
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-2xl border shadow-xl flex items-center justify-center transition-all ${
                forceRelaySimulation
                  ? 'bg-amber-950/40 border-amber-500 text-amber-400 ring-4 ring-amber-500/30'
                  : 'bg-slate-900 border-slate-700 text-emerald-400'
              }`}>
                <ShieldCheck className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-slate-200 mt-2">Encrypted Relay</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {forceRelaySimulation ? 'Active Ciphertext Stream' : 'Standby (Zero-Knowledge)'}
              </span>
            </div>

          </div>

          {/* Dynamic SVG Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Laptop A <-> NAS (Direct P2P Link) */}
            <line
              x1="22%"
              y1="75%"
              x2="50%"
              y2="75%"
              stroke={forceRelaySimulation ? '#475569' : '#06b6d4'}
              strokeWidth="2.5"
              strokeDasharray={forceRelaySimulation ? '4,4' : '6,4'}
              className={forceRelaySimulation ? '' : 'animate-pulse'}
            />
            {/* Workstation <-> NAS */}
            <line
              x1="78%"
              y1="75%"
              x2="50%"
              y2="75%"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="6,4"
            />
            {/* Phone <-> Relay Link */}
            <line
              x1="50%"
              y1="75%"
              x2="70%"
              y2="25%"
              stroke={forceRelaySimulation ? '#f59e0b' : '#334155'}
              strokeWidth={forceRelaySimulation ? '3' : '1.5'}
              strokeDasharray="4,4"
            />
          </svg>

          {/* User Storage Nodes Floor */}
          <div className="relative z-10 grid grid-cols-3 gap-3 pt-12">
            
            {/* Laptop A */}
            <div 
              onClick={() => setSelectedNodeId('dev_m3_max_01')}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                selectedNodeId === 'dev_m3_max_01'
                  ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-500/30'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 w-10 h-10 mx-auto flex items-center justify-center mb-1">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white truncate">MacBook Pro 16"</div>
              <div className="text-[10px] text-emerald-400 font-mono">P2P Ready (8ms)</div>
            </div>

            {/* TrueNAS */}
            <div 
              onClick={() => setSelectedNodeId('dev_truenas_02')}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                selectedNodeId === 'dev_truenas_02'
                  ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-500/30'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 w-10 h-10 mx-auto flex items-center justify-center mb-1">
                <Server className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white truncate">Home TrueNAS</div>
              <div className="text-[10px] text-emerald-400 font-mono">Direct LAN (2ms)</div>
            </div>

            {/* Workstation */}
            <div 
              onClick={() => setSelectedNodeId('dev_rtx4090_03')}
              className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                selectedNodeId === 'dev_rtx4090_03'
                  ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-500/30'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 w-10 h-10 mx-auto flex items-center justify-center mb-1">
                <Monitor className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white truncate">Workstation 4090</div>
              <div className="text-[10px] text-emerald-400 font-mono">10GbE Direct</div>
            </div>

          </div>

          {/* Graph Legend */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 pt-4 border-t border-slate-800/80">
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-cyan-400 mr-1.5 inline-block"></span>
              Direct P2P (WebRTC/QUIC)
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-amber-400 mr-1.5 inline-block"></span>
              Encrypted Relay Fallback
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-emerald-400 mr-1.5 inline-block"></span>
              Low-Latency LAN Loopback
            </span>
          </div>

        </div>

        {/* Selected Node Real-time Inspector */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
              Live Node Telemetry
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {selectedDevice?.name || 'Mesh Node'}
            </h3>
            <div className="text-xs text-slate-400 mt-0.5">
              {selectedDevice?.os} • Agent {selectedDevice?.agentVersion}
            </div>
          </div>

          {selectedDevice && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-500 font-medium">NAT Traversal Profile</div>
                <div className="font-semibold text-emerald-400 uppercase">
                  {selectedDevice.natType} (STUN Candidate Verified)
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedDevice.directP2PCapable && !forceRelaySimulation
                    ? 'Eligible for Zero-Hop Peer-to-Peer Data Channels'
                    : 'Requires Encrypted Relay Fallback (Zero-Knowledge)'}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="text-slate-500">Public Key Fingerprint</div>
                <div className="text-slate-300 break-all">{selectedDevice.publicKeyFingerprint}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-500 font-medium">Outbound Socket Status</div>
                <div className="text-slate-200 font-mono text-[11px]">{selectedDevice.ipMasked}</div>
                <div className="text-[10px] text-slate-500">
                  Inbound ports closed. Communication initiated exclusively via outbound TLS 1.3 tunnels.
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-500 font-medium">Active Mesh Links</div>
                <div className="text-cyan-300 font-semibold">
                  {selectedDevice.activeConnectionsCount} Concurrent Cryptographic Channels
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
