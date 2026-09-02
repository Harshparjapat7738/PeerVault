import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Trash2, 
  Check, 
  HardDrive, 
  KeyRound, 
  Calendar, 
  ShieldCheck, 
  ArrowLeftRight,
  Code2,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  FileVideo
} from 'lucide-react';
import { StorageFile, Device } from '../types';

interface FilePreviewModalProps {
  file: StorageFile | null;
  device: Device | undefined;
  onClose: () => void;
  onDownload: (file: StorageFile) => void;
  onMoveToTrash: (fileId: string) => void;
  onDirectTransfer: (file: StorageFile) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  device,
  onClose,
  onDownload,
  onMoveToTrash,
  onDirectTransfer
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'hex' | 'security'>('preview');

  if (!file) return null;

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(file.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    switch (file.extension) {
      case 'rs':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'js':
      case 'json':
      case 'env':
        return FileCode;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'enc':
        return FileArchive;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'raw':
        return ImageIcon;
      case 'mov':
      case 'mp4':
        return FileVideo;
      default:
        return FileText;
    }
  };

  const Icon = getFileIcon();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/30 max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-[#1A1A1A]/20 bg-[#F9F8F6] flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="p-2.5 bg-[#FFFFFF] border border-[#1A1A1A]/20 text-[#1A1A1A] shrink-0">
              <Icon className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-[#1A1A1A] text-lg truncate">{file.name}</h3>
                <span className="text-[10px] bg-[#EFECE6] text-[#1A1A1A] px-2 py-0.5 border border-[#1A1A1A]/15 font-mono">
                  v{file.version}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-[#5A5955] mt-0.5 font-mono">
                <span className="flex items-center">
                  <HardDrive className="w-3 h-3 mr-1 text-[#76746E]" />
                  {device?.name || 'Remote Node'}
                </span>
                <span>•</span>
                <span>{formatBytes(file.sizeBytes)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#76746E] hover:text-[#1A1A1A] p-1.5 hover:bg-[#EFECE6] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* View Tabs */}
        <div className="px-6 border-b border-[#1A1A1A]/10 bg-[#FFFFFF] flex space-x-6 text-xs font-mono">
          <button
            onClick={() => setActiveViewTab('preview')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
              activeViewTab === 'preview'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#76746E] hover:text-[#1A1A1A]'
            }`}
          >
            File Preview & Content
          </button>
          <button
            onClick={() => setActiveViewTab('hex')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
              activeViewTab === 'hex'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#76746E] hover:text-[#1A1A1A]'
            }`}
          >
            Hex / Chunk Breakdown
          </button>
          <button
            onClick={() => setActiveViewTab('security')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
              activeViewTab === 'security'
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-bold'
                : 'border-transparent text-[#76746E] hover:text-[#1A1A1A]'
            }`}
          >
            Zero-Trust Security & Hashing
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: Preview */}
          {activeViewTab === 'preview' && (
            <div className="space-y-3">
              {file.sampleContent ? (
                <div className="bg-[#F9F8F6] border border-[#1A1A1A]/15 p-4 font-mono text-xs text-[#1A1A1A] overflow-x-auto whitespace-pre leading-relaxed shadow-xs">
                  {file.sampleContent}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F9F8F6] border border-[#1A1A1A]/15 text-[#76746E] text-xs font-mono">
                  Binary media stream. Direct encrypted streaming ready via WebRTC DataChannel.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Hex / Chunk Breakdown */}
          {activeViewTab === 'hex' && (
            <div className="space-y-3">
              <div className="bg-[#F9F8F6] border border-[#1A1A1A]/20 p-4 font-mono text-[11px] text-[#333333] leading-loose overflow-x-auto">
                <div className="text-[#1A1A1A] font-bold mb-2">// 256KB Chunk #0001 (Offset 0x00000000 - 0x00040000)</div>
                <div>00000000: 50 4b 03 04 14 00 08 00  08 00 5e 89 71 58 2b 4a  |PK........^.qX+J|</div>
                <div>00000010: 99 a0 3b 12 00 04 00 00  00 08 00 00 0b 00 00 00  |..;.............|</div>
                <div>00000020: 70 72 6f 6a 65 63 74 2e  7a 69 70 73 74 6f 72 61  |project.zipstora|</div>
                <div>00000030: 67 65 2d 61 67 65 6e 74  2e 72 73 20 73 61 6e 64  |ge-agent.rs sand|</div>
                <div>00000040: 62 6f 78 20 63 61 6e 6f  6e 69 63 61 6c 69 7a 65  |box canonicalize|</div>
              </div>
              <p className="text-[11px] text-[#76746E] font-mono">
                Chunks are framed with 16-byte Poly1305 authentication tags and verified at destination before disk flush.
              </p>
            </div>
          )}

          {/* TAB 3: Security & Hashing */}
          {activeViewTab === 'security' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#76746E]">SHA-256 Checksum:</span>
                  <button
                    onClick={handleCopyHash}
                    className="text-[#1A1A1A] hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <div className="text-[#1A1A1A] break-all bg-[#FFFFFF] p-2.5 border border-[#1A1A1A]/15">
                  {file.sha256Hash}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-1">
                  <div className="text-[#76746E] font-mono text-[11px] uppercase">Canonical Path</div>
                  <div className="font-mono text-[#1A1A1A] truncate">{file.rootPath}/{file.relativePath}</div>
                </div>

                <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-1">
                  <div className="text-[#76746E] font-mono text-[11px] uppercase">Device Source</div>
                  <div className="text-[#1A1A1A] font-medium">{device?.name}</div>
                </div>

                <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-1">
                  <div className="text-[#76746E] font-mono text-[11px] uppercase">Permissions Mask</div>
                  <div className="text-emerald-800 font-mono text-[11px] font-semibold">
                    Read: {file.permissions.read ? 'Allowed' : 'Denied'} | Write: {file.permissions.write ? 'Allowed' : 'Denied'} | Delete: {file.permissions.delete ? 'Allowed' : 'Protected'}
                  </div>
                </div>

                <div className="p-3.5 bg-[#F9F8F6] border border-[#1A1A1A]/15 space-y-1">
                  <div className="text-[#76746E] font-mono text-[11px] uppercase">Last Modified</div>
                  <div className="text-[#1A1A1A] font-mono text-[11px]">{file.modifiedAt}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-[#1A1A1A]/20 bg-[#F9F8F6] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {file.permissions.delete && !file.inTrash && (
              <button
                onClick={() => {
                  onMoveToTrash(file.id);
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFFFFF] text-rose-800 hover:bg-rose-50 border border-rose-300 text-xs font-mono transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Move to 30-Day Trash</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onDirectTransfer(file);
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#FFFFFF] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#1A1A1A]/30 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#1A1A1A]" />
              <span>Transfer to Another Node</span>
            </button>

            <button
              onClick={() => {
                onDownload(file);
                onClose();
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-mono font-semibold transition-colors cursor-pointer border border-[#1A1A1A]"
            >
              <Download className="w-4 h-4" />
              <span>Download via P2P</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
