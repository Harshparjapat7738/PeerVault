import React from 'react';
import {
  ShieldCheck,
  HardDrive,
  Wifi,
  Lock,
  Terminal,
  FolderTree,
  ArrowLeftRight,
  BookOpen,
  Bell,
  CheckCircle2,
  Server,
  Plus,
  Share2,
  LogOut
} from 'lucide-react';
import { Device, TransferTask } from '../types';
import type { StoredUser } from '../api/client';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  devices: Device[];
  transfers: TransferTask[];
  onOpenPairing: () => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  /** Signed-in account (from `../api/client.ts`'s `getStoredUser()`) — null if somehow rendered
   *  without a session (shouldn't happen: `App.tsx`'s route guard sends unauthenticated users to
   *  `/login` before this ever mounts), in which case a generic placeholder is shown instead. */
  currentUser?: StoredUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  devices,
  transfers,
  onOpenPairing,
  unreadAlertsCount,
  onOpenAlerts,
  currentUser,
  onLogout
}) => {
  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const activeTransfersCount = transfers.filter(t => t.status === 'transferring').length;
  const totalStorageBytes = devices.reduce((acc, d) => acc + d.storageTotalBytes, 0);
  const usedStorageBytes = devices.reduce((acc, d) => acc + d.storageUsedBytes, 0);
  const usedStorageTB = (usedStorageBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1);

  const accountLabel = currentUser?.name || currentUser?.email?.split('@')[0] || 'Guest';
  const accountInitials = accountLabel
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';
  const totalStorageTB = (totalStorageBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1);

  const navItems = [
    { id: 'devices', label: 'Storage Mesh', icon: HardDrive, count: devices.length },
    { id: 'files', label: 'Remote Explorer', icon: FolderTree },
    { id: 'transfers', label: 'P2P Transfer Hub', icon: ArrowLeftRight, badge: activeTransfersCount > 0 ? activeTransfersCount : undefined },
    { id: 'sharing', label: 'Storage Sharing', icon: Share2 },
    { id: 'security', label: 'Zero-Trust & Shield', icon: ShieldCheck, badge: unreadAlertsCount > 0 ? 'Shielded' : undefined },
    { id: 'topology', label: 'Mesh Topology', icon: Wifi },
    { id: 'agent-cli', label: 'Agent Daemon CLI', icon: Terminal },
    { id: 'architecture', label: 'Architecture & ADRs', icon: BookOpen },
  ];

  return (
    <header className="border-b border-[#1A1A1A]/20 bg-[#F9F8F6] sticky top-0 z-40">
      {/* Top Editorial Dispatch Bar */}
      <div className="border-b border-[#1A1A1A]/10 bg-[#F4F2EE] px-4 py-1 text-[11px] text-[#5A5955] flex items-center justify-between font-mono">
        <div className="flex items-center space-x-3 tracking-wider">
          <span className="font-bold text-[#1A1A1A]">PEERVAULT</span>
          <span>•</span>
          <span className="uppercase text-[10px] tracking-[0.2em]">Zero-Trust Distributed Storage Mesh</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline uppercase text-[10px] tracking-[0.2em]">Noise_XX • ChaCha20-Poly1305</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px] uppercase tracking-wider">
          <span className="flex items-center text-[#1A1A1A] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Control Plane: Attested
          </span>
          <span className="text-[#8C8A82]">|</span>
          <span className="text-[#5A5955]">Edition 2026</span>
        </div>
      </div>

      {/* Main Header with Logo & Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 border-b border-[#1A1A1A]/15">
          
          {/* Logo & Headline */}
          <div className="flex items-center space-x-3.5">
            <div className="h-11 w-11 bg-[#1A1A1A] text-[#F9F8F6] flex items-center justify-center border border-[#1A1A1A] shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline space-x-2.5">
                <span className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">PeerVault<span className="italic font-normal text-[#5A5955]">.</span></span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#1A1A1A] text-[#1A1A1A] bg-transparent">
                  v1.4 Spec
                </span>
              </div>
              <p className="text-xs text-[#5A5955] font-serif italic mt-0.5 hidden sm:block">
                Personal Distributed Storage Control Plane & Cryptographic Mesh
              </p>
            </div>
          </div>

          {/* Mesh Metrics Badges & Action Buttons */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Editorial Stats Box */}
            <div className="hidden lg:flex items-center space-x-4 bg-[#FFFFFF] border border-[#1A1A1A]/20 px-3.5 py-2 text-xs text-[#1A1A1A] shadow-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span><strong className="font-mono font-bold text-[#1A1A1A]">{onlineDevicesCount}</strong>/{devices.length} Nodes Online</span>
              </div>
              <div className="h-3 w-px bg-[#1A1A1A]/20"></div>
              <div>
                <span className="text-[#666660]">Mesh: </span>
                <strong className="font-mono font-bold text-[#1A1A1A]">{usedStorageTB} TB</strong> / {totalStorageTB} TB
              </div>
              {activeTransfersCount > 0 && (
                <>
                  <div className="h-3 w-px bg-[#1A1A1A]/20"></div>
                  <div className="text-[#1A1A1A] flex items-center space-x-1 font-semibold">
                    <ArrowLeftRight className="w-3.5 h-3.5 animate-spin" />
                    <span>{activeTransfersCount} Active P2P</span>
                  </div>
                </>
              )}
            </div>

            {/* Add / Pair Device Button */}
            <button
              onClick={onOpenPairing}
              id="header-btn-pair-device"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-[#1A1A1A]"
            >
              <Plus className="w-4 h-4" />
              <span>Pair Storage Node</span>
            </button>

            {/* Alerts Drawer Button */}
            <button
              onClick={onOpenAlerts}
              id="header-btn-alerts"
              className="relative p-2 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A] hover:bg-[#F4F2EE] transition-colors cursor-pointer"
              title="View Security & Audit Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1A1A1A] text-[#F9F8F6] text-[10px] font-mono font-bold flex items-center justify-center border border-[#FFFFFF]">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* User Account Info */}
            <div className="flex items-center space-x-2.5 border-l border-[#1A1A1A]/15 pl-3">
              <div className="w-8 h-8 bg-[#1A1A1A] text-[#F9F8F6] border border-[#1A1A1A] flex items-center justify-center font-mono text-xs font-bold">
                {accountInitials}
              </div>
              <div className="hidden xl:block text-left text-xs">
                <div className="font-semibold text-[#1A1A1A] truncate max-w-[130px] font-mono text-[11px]">{accountLabel}</div>
                <div className="text-[10px] text-[#5A5955] uppercase tracking-wider">{currentUser?.email || 'Not signed in'}</div>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 text-[#76746E] hover:text-[#1A1A1A] hover:bg-[#F4F2EE] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1.5 overflow-x-auto py-3 scrollbar-none" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] border-[#1A1A1A] font-semibold shadow-xs'
                    : 'bg-transparent text-[#5A5955] border-transparent hover:text-[#1A1A1A] hover:border-[#1A1A1A]/20 hover:bg-[#FFFFFF]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F9F8F6]' : 'text-[#5A5955]'}`} />
                <span className="tracking-tight">{item.label}</span>
                {item.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 ${
                    isActive ? 'bg-[#333333] text-[#F9F8F6]' : 'bg-[#EFECE6] text-[#1A1A1A]'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 ${
                    isActive ? 'bg-[#333333] text-[#F9F8F6]' : 'bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/20'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
};
