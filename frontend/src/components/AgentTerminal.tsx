import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, RotateCcw, ShieldCheck, Check, Sparkles, Copy } from 'lucide-react';
import { Device } from '../types';

interface AgentTerminalProps {
  activeDevice: Device | undefined;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ activeDevice }) => {
  const [terminalHistory, setTerminalHistory] = useState<Array<{ text: string; type: 'cmd' | 'output' | 'error' | 'success' | 'warn' }>>([
    { text: 'PeerVault Storage Agent Daemon v1.4.2-rust (x86_64-unknown-linux-gnu)', type: 'success' },
    { text: 'Compiled with: ring 0.17, tokio 1.38, rustls 0.23, noise-protocol 0.2', type: 'output' },
    { text: '[2026-08-30 02:14:00.102] [INFO] Loaded 2 canonical sandboxes from /etc/peervault/roots.json', type: 'output' },
    { text: '[2026-08-30 02:14:00.180] [INFO] Outbound TLS 1.3 channel established with Control Plane', type: 'success' },
    { text: 'Type "help" or click one of the quick command badges below to run diagnostic routines.', type: 'warn' }
  ]);
  const [inputCommand, setInputCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalHistory]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setTerminalHistory(prev => [...prev, { text: `$ ${trimmed}`, type: 'cmd' }]);
    setInputCommand('');
    setIsProcessing(true);

    setTimeout(() => {
      const parts = trimmed.split(' ');
      const mainCmd = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');

      switch (mainCmd) {
        case 'help':
          setTerminalHistory(prev => [
            ...prev,
            { text: 'Available PeerVault Storage Agent CLI Commands:', type: 'success' },
            { text: '  status               - Show daemon health, enclave keys, and uptime', type: 'output' },
            { text: '  roots                - Inspect active sandbox directories and permissions', type: 'output' },
            { text: '  sandbox-test <path>  - Run canonicalization security test on a path', type: 'output' },
            { text: '  p2p-bench            - Benchmark ChaCha20-Poly1305 encryption throughput', type: 'output' },
            { text: '  verify-integrity     - Calculate rolling SHA-256 checksum on sample payload', type: 'output' },
            { text: '  clear                - Clear the terminal screen', type: 'output' }
          ]);
          break;

        case 'status':
          setTerminalHistory(prev => [
            ...prev,
            { text: `[Daemon Status] Online (PID: 49102, Uptime: 42d 18h)`, type: 'success' },
            { text: `Asymmetric Identity: ${activeDevice?.publicKeyFingerprint || 'ECDSA P-256 (TPM Enclave)'}`, type: 'output' },
            { text: `Memory Footprint: 14.2 MB RSS (Zero Garbage Collection overhead)`, type: 'output' },
            { text: `Inbound Port Status: ALL CLOSED (Zero Public Attack Surface)`, type: 'success' },
            { text: `Active Mesh Links: 2 Direct P2P WebSockets, 0 Relay Fallback`, type: 'output' }
          ]);
          break;

        case 'roots':
          setTerminalHistory(prev => [
            ...prev,
            { text: '[Authorized Storage Sandboxes]', type: 'success' },
            { text: '  1. /Users/harsh/Projects (Label: Development & Repos, Read/Write: true, Delete: true)', type: 'output' },
            { text: '  2. /Users/harsh/Documents (Label: Personal Documents, Read/Write: true, Delete: false [Protected])', type: 'output' },
            { text: 'Kernel Traversal Barrier: Hard-blocking /etc, /bin, /usr, ~/.ssh, C:\\Windows', type: 'warn' }
          ]);
          break;

        case 'sandbox-test':
          if (!arg) {
            setTerminalHistory(prev => [
              ...prev,
              { text: 'Error: Please provide a path to test. Example: sandbox-test ../../etc/shadow', type: 'error' }
            ]);
          } else if (arg.includes('..') || arg.startsWith('/etc') || arg.startsWith('C:\\Windows') || arg.includes('~/.ssh')) {
            setTerminalHistory(prev => [
              ...prev,
              { text: `[SECURITY BLOCK] Attempted path: "${arg}"`, type: 'error' },
              { text: `Canonicalization Engine: std::fs::canonicalize failed validation constraint.`, type: 'error' },
              { text: `Action: Traversal Outside Root sandbox intercepted. 0 bytes read. Audit log logged.`, type: 'warn' }
            ]);
          } else {
            setTerminalHistory(prev => [
              ...prev,
              { text: `[SANDBOX PASS] Path: "${arg}"`, type: 'success' },
              { text: `Resolved Canonical: /Users/harsh/Projects/${arg}`, type: 'output' },
              { text: `Validation: Path is strictly confined within authorized boundaries.`, type: 'success' }
            ]);
          }
          break;

        case 'p2p-bench':
          setTerminalHistory(prev => [
            ...prev,
            { text: 'Benchmarking ChaCha20-Poly1305 hardware-accelerated crypto (1GB payload)...', type: 'output' },
            { text: '  Chunk Size: 256 KB | SIMD AVX2: Enabled', type: 'output' },
            { text: '  Throughput: 1,842 MB/s (1.84 GB/s)', type: 'success' },
            { text: '  CPU Utilization: 4.8% on Apple M3 Max / Linux x86_64', type: 'output' }
          ]);
          break;

        case 'verify-integrity':
          setTerminalHistory(prev => [
            ...prev,
            { text: 'Computing SHA-256 rolling digest on 3,360 blocks (project.zip)...', type: 'output' },
            { text: 'Hash: a7b8c9d0e1f2a3b4c5d6e7f80918273645abcdef0192837465abcdeffedcba01', type: 'success' },
            { text: 'Integrity: 100% matched against Control Plane session manifest.', type: 'success' }
          ]);
          break;

        case 'clear':
          setTerminalHistory([]);
          break;

        default:
          setTerminalHistory(prev => [
            ...prev,
            { text: `Command not found: "${mainCmd}". Type "help" for a list of available commands.`, type: 'error' }
          ]);
          break;
      }

      setIsProcessing(false);
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputCommand);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>Storage Agent Daemon Terminal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct diagnostic interface to the Rust storage agent running on <strong className="text-slate-200">{activeDevice?.name || 'Local Node'}</strong>.
          </p>
        </div>

        {/* Quick Command Suggestions Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            'status',
            'roots',
            'sandbox-test ../../etc/passwd',
            'p2p-bench',
            'verify-integrity'
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => executeCommand(cmd)}
              className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-cyan-400 font-mono text-[11px] border border-slate-800 transition-colors cursor-pointer"
            >
              $ {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Window Container */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl font-mono text-xs">
        
        {/* Terminal Header Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-slate-400 text-xs ml-2">peervault-agent — daemon@storage-node</span>
          </div>
          <button
            onClick={() => setTerminalHistory([])}
            className="text-slate-500 hover:text-slate-300 text-[11px] flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Terminal Body */}
        <div className="p-5 min-h-[380px] max-h-[500px] overflow-y-auto space-y-2 leading-relaxed">
          {terminalHistory.map((line, idx) => (
            <div 
              key={idx} 
              className={`break-words ${
                line.type === 'cmd' ? 'text-cyan-300 font-bold' :
                line.type === 'success' ? 'text-emerald-400' :
                line.type === 'error' ? 'text-rose-400' :
                line.type === 'warn' ? 'text-amber-300' :
                'text-slate-300'
              }`}
            >
              {line.text}
            </div>
          ))}

          {isProcessing && (
            <div className="text-cyan-400 animate-pulse flex items-center space-x-1">
              <span>Executing routine...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Terminal Input Line */}
        <div className="bg-slate-900/60 p-3 border-t border-slate-800 flex items-center space-x-2">
          <span className="text-cyan-400 font-bold">$</span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="Type 'help', 'status', 'roots', or 'sandbox-test <path>'..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-mono"
            autoFocus
          />
          <button
            onClick={() => executeCommand(inputCommand)}
            disabled={!inputCommand.trim() || isProcessing}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-30 cursor-pointer"
          >
            Run
          </button>
        </div>

      </div>

    </div>
  );
};
