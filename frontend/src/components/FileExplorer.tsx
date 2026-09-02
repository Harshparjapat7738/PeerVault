import React, { useState } from 'react';
import { 
  FolderTree, 
  Search, 
  LayoutGrid, 
  List, 
  HardDrive, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  ArrowLeftRight, 
  ShieldAlert, 
  ShieldCheck, 
  Upload, 
  FolderLock, 
  Plus, 
  AlertTriangle, 
  Check, 
  FileCode, 
  FileArchive, 
  Image as ImageIcon, 
  FileVideo,
  FileSpreadsheet
} from 'lucide-react';
import { StorageFile, Device } from '../types';

interface FileExplorerProps {
  files: StorageFile[];
  devices: Device[];
  selectedDeviceId: string;
  onSelectDeviceId: (id: string) => void;
  onPreviewFile: (file: StorageFile) => void;
  onDownloadFile: (file: StorageFile) => void;
  onMoveToTrash: (fileId: string) => void;
  onDirectTransfer: (file: StorageFile) => void;
  onUploadFile: (deviceId: string, file: StorageFile) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  devices,
  selectedDeviceId,
  onSelectDeviceId,
  onPreviewFile,
  onDownloadFile,
  onMoveToTrash,
  onDirectTransfer,
  onUploadFile
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'code' | 'archive' | 'media' | 'doc'>('all');
  
  // Sandbox attack test state
  const [sandboxTestPath, setSandboxTestPath] = useState('../../etc/shadow');
  const [sandboxResult, setSandboxResult] = useState<{ allowed: boolean; message: string; canonical: string } | null>(null);

  // Upload simulation state
  const [isUploading, setIsUploading] = useState(false);

  const activeDevice = devices.find(d => d.id === selectedDeviceId);

  // Filter files
  const filteredFiles = files.filter(f => {
    if (f.inTrash) return false;
    if (selectedDeviceId !== 'all' && f.deviceId !== selectedDeviceId) return false;

    const matchesSearch = 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.relativePath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.sha256Hash.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'all') return true;
    if (typeFilter === 'code') return ['rs', 'ts', 'tsx', 'js', 'py', 'json', 'env'].includes(f.extension);
    if (typeFilter === 'archive') return ['zip', 'tar', 'gz', 'enc', 'safetensors'].includes(f.extension);
    if (typeFilter === 'media') return ['mov', 'mp4', 'png', 'jpg', 'jpeg', 'raw'].includes(f.extension);
    if (typeFilter === 'doc') return ['pdf', 'txt', 'md', 'docx'].includes(f.extension);

    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
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
      case 'safetensors':
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

  const handleTestSandboxTraversal = () => {
    const input = sandboxTestPath.trim();
    // Simulate Rust Agent canonicalize check
    const isEscape = input.includes('..') || input.startsWith('/etc') || input.startsWith('C:\\Windows') || input.includes('~/.ssh');
    
    if (isEscape) {
      setSandboxResult({
        allowed: false,
        message: 'Security Alert: Path Traversal Denied. Requested path resolves outside configured allowed sandbox root.',
        canonical: input.startsWith('/') ? input : `/Users/harsh/Projects/${input}`
      });
    } else {
      setSandboxResult({
        allowed: true,
        message: 'Access Authorized. Path strictly contained within sandbox boundaries.',
        canonical: `/Users/harsh/Projects/${input}`
      });
    }
  };

  const handleSimulateUpload = () => {
    if (!activeDevice || activeDevice.status !== 'online') return;
    setIsUploading(true);

    setTimeout(() => {
      const activeRoot = activeDevice.allowedRoots[0] || {
        id: 'root_default',
        path: '/var/storage',
        label: 'Default Sandbox'
      };
      const newFile: StorageFile = {
        id: `file_upload_${Date.now()}`,
        deviceId: activeDevice.id,
        rootId: activeRoot.id,
        rootPath: activeRoot.path,
        relativePath: `uploaded_${Date.now().toString().slice(-4)}.json`,
        name: `uploaded_dataset_${Date.now().toString().slice(-4)}.json`,
        extension: 'json',
        sizeBytes: 340 * 1024,
        modifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        sha256Hash: Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
        mimeType: 'application/json',
        isDirectory: false,
        isFavorite: false,
        version: 1,
        permissions: { read: true, write: true, delete: true },
        sampleContent: `{\n  "dataset": "distributed_mesh_sync",\n  "status": "encrypted_at_rest"\n}`
      };

      onUploadFile(activeDevice.id, newFile);
      setIsUploading(false);
    }, 700);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Device Selector Bar */}
      <div className="bg-[#FFFFFF] p-6 border border-[#1A1A1A]/20 space-y-5 shadow-xs">
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Device Selector Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => onSelectDeviceId('all')}
              className={`px-3.5 py-1.5 text-xs font-mono tracking-tight transition-colors cursor-pointer border ${
                selectedDeviceId === 'all'
                  ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                  : 'bg-[#F9F8F6] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
              }`}
            >
              Unified Mesh ({files.filter(f => !f.inTrash).length})
            </button>

            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDeviceId(d.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-mono whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedDeviceId === d.id
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/15'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{d.name}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'online' ? 'bg-emerald-600' : 'bg-[#8C8A82]'}`} />
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5 shrink-0">
            {activeDevice && activeDevice.status === 'online' && (
              <button
                onClick={handleSimulateUpload}
                disabled={isUploading}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 border border-[#1A1A1A]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Streaming...' : `Upload to ${activeDevice.name.split(' ')[0]}`}</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F4F2EE] p-0.5 border border-[#1A1A1A]/15">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-[#1A1A1A] text-[#F9F8F6]' : 'text-[#5A5955] hover:text-[#1A1A1A]'}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-[#1A1A1A] text-[#F9F8F6]' : 'text-[#5A5955] hover:text-[#1A1A1A]'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[#1A1A1A]/15">
          
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#76746E]" />
            <input
              type="text"
              placeholder="Search remote filenames, relative paths, SHA-256 hashes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A] placeholder-[#8C8A82] focus:outline-none focus:border-[#1A1A1A] font-mono"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto text-xs">
            {(['all', 'code', 'archive', 'media', 'doc'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 font-mono text-[11px] capitalize transition-colors cursor-pointer border ${
                  typeFilter === t
                    ? 'bg-[#1A1A1A] text-[#F9F8F6] font-semibold border-[#1A1A1A]'
                    : 'bg-[#F9F8F6] text-[#5A5955] hover:text-[#1A1A1A] border-[#1A1A1A]/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#1A1A1A]/20 space-y-3">
          <FolderTree className="w-10 h-10 text-[#76746E] mx-auto stroke-1" />
          <h3 className="font-serif font-bold text-base text-[#1A1A1A]">No remote files matching criteria</h3>
          <p className="text-xs text-[#5A5955]">
            Check search filters or select a different active storage node above.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE VIEW */
        <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F2EE] text-[#5A5955] border-b border-[#1A1A1A]/15 uppercase font-mono tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">File Name & Path</th>
                  <th className="py-3 px-4">Storage Node</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Permissions</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/10">
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.extension);
                  const device = devices.find(d => d.id === file.deviceId);

                  return (
                    <tr 
                      key={file.id} 
                      className="hover:bg-[#F9F8F6] transition-colors group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[#F4F2EE] border border-[#1A1A1A]/15 text-[#1A1A1A] shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="truncate max-w-[280px]">
                            <button
                              onClick={() => onPreviewFile(file)}
                              className="font-serif font-bold text-sm text-[#1A1A1A] hover:underline text-left truncate block cursor-pointer"
                            >
                              {file.name}
                            </button>
                            <div className="font-mono text-[10px] text-[#76746E] truncate">
                              {file.relativePath}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#1A1A1A]">
                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <HardDrive className="w-3.5 h-3.5 text-[#76746E]" />
                          <span className="truncate max-w-[140px]">{device?.name || 'Remote Node'}</span>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#1A1A1A] font-mono text-xs">
                        {formatBytes(file.sizeBytes)}
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase font-semibold ${
                          file.permissions.delete 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {file.permissions.delete ? 'Read/Write/Delete' : 'Read/Write (Protected)'}
                        </span>
                      </td>

                      {/* Hash */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#76746E] truncate max-w-[140px]">
                        <span title={file.sha256Hash}>{file.sha256Hash.slice(0, 16)}...</span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          <button
                            onClick={() => onPreviewFile(file)}
                            className="p-1.5 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-[#1A1A1A] border border-[#1A1A1A]/20 transition-colors cursor-pointer"
                            title="Inspect metadata & content preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDirectTransfer(file)}
                            className="p-1.5 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-[#1A1A1A] border border-[#1A1A1A]/20 transition-colors cursor-pointer"
                            title="Transfer to another storage node"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDownloadFile(file)}
                            className="p-1.5 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-emerald-800 border border-[#1A1A1A]/20 transition-colors cursor-pointer"
                            title="Download file via P2P stream"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {file.permissions.delete && (
                            <button
                              onClick={() => onMoveToTrash(file.id)}
                              className="p-1.5 bg-[#FFFFFF] hover:bg-rose-50 text-rose-700 border border-[#1A1A1A]/20 hover:border-rose-300 transition-colors cursor-pointer"
                              title="Safe move to 30-day soft trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFiles.map((file) => {
            const Icon = getFileIcon(file.extension);
            const device = devices.find(d => d.id === file.deviceId);

            return (
              <div
                key={file.id}
                className="bg-[#FFFFFF] border border-[#1A1A1A]/20 hover:border-[#1A1A1A] p-5 space-y-3.5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 bg-[#1A1A1A] text-[#F9F8F6] border border-[#1A1A1A]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono bg-[#F4F2EE] px-2 py-0.5 text-[#5A5955] border border-[#1A1A1A]/10 font-semibold">
                      {formatBytes(file.sizeBytes)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 
                      onClick={() => onPreviewFile(file)}
                      className="font-serif font-bold text-base text-[#1A1A1A] hover:underline truncate cursor-pointer"
                    >
                      {file.name}
                    </h4>
                    <div className="font-mono text-[10px] text-[#76746E] truncate mt-0.5">
                      {file.relativePath}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="pt-2.5 border-t border-[#1A1A1A]/15 flex items-center justify-between text-xs text-[#5A5955] font-mono">
                    <span className="truncate max-w-[150px] font-medium text-[#1A1A1A]">{device?.name}</span>
                    <span className="text-[10px] text-[#76746E]">{file.modifiedAt.split(' ')[0]}</span>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="flex-1 py-1.5 bg-[#FFFFFF] hover:bg-[#F4F2EE] text-[#1A1A1A] text-xs font-semibold border border-[#1A1A1A]/20 transition-colors cursor-pointer"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => onDownloadFile(file)}
                      className="p-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] border border-[#1A1A1A] transition-colors cursor-pointer"
                      title="Download via P2P"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Path Sandbox Traversal Tester */}
      <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 p-6 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderLock className="w-5 h-5 text-[#1A1A1A]" />
            <h3 className="font-serif font-bold text-base text-[#1A1A1A]">Storage Agent Sandbox & Traversal Barrier</h3>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 font-bold">
            Zero-Escape Guaranteed
          </span>
        </div>
        
        <p className="text-xs text-[#5A5955] leading-relaxed">
          Simulate malicious path traversal attempts (e.g. <code className="font-mono text-[#1A1A1A] bg-[#F4F2EE] px-1 py-0.5 border border-[#1A1A1A]/10">../../etc/shadow</code> or <code className="font-mono text-[#1A1A1A] bg-[#F4F2EE] px-1 py-0.5 border border-[#1A1A1A]/10">../../Windows/System32</code>) to verify the Rust Storage Agent canonicalization barrier.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={sandboxTestPath}
            onChange={(e) => setSandboxTestPath(e.target.value)}
            placeholder="Try: ../../etc/passwd or symlink_escape"
            className="flex-1 px-3 py-2 text-xs bg-[#F9F8F6] border border-[#1A1A1A]/20 text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1A1A1A]"
          />
          <button
            onClick={handleTestSandboxTraversal}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#333333] text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0 border border-[#1A1A1A]"
          >
            Verify Sandbox Boundary
          </button>
        </div>

        {sandboxResult && (
          <div className={`p-3.5 border text-xs flex items-start space-x-2.5 ${
            sandboxResult.allowed
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            {sandboxResult.allowed ? (
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-semibold font-serif text-sm">{sandboxResult.message}</div>
              <div className="font-mono text-[11px] text-[#5A5955]">
                Resolved Canonical Path: {sandboxResult.canonical}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
