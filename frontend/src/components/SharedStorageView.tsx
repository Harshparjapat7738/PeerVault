import React, { useState } from 'react';
import { FolderOpen, FolderLock, Trash2, XCircle, ChevronDown, ChevronUp, Loader2, File, Zap, ShieldCheck } from 'lucide-react';
import { SharedStorage, SharedStorageOverview, StorageFile } from '../types';
import { accessSharedStorage, deleteSharedStorageFile, revokeSharedStorage, ApiError } from '../api-client';

interface SharedStorageViewProps {
  overview: SharedStorageOverview;
  onChanged: () => void;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const GrantModeBadge: React.FC<{ mode: SharedStorage['transferMode'] }> = ({ mode }) => (
  mode === 'direct'
    ? <span className="inline-flex items-center text-[10px] font-mono uppercase text-amber-700"><Zap className="w-3 h-3 mr-0.5" />Direct</span>
    : <span className="inline-flex items-center text-[10px] font-mono uppercase text-emerald-700"><ShieldCheck className="w-3 h-3 mr-0.5" />Relay</span>
);

export const SharedStorageView: React.FC<SharedStorageViewProps> = ({ overview, onChanged, showToast }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleExpand = async (grant: SharedStorage) => {
    if (expandedId === grant.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(grant.id);
    setIsLoadingFiles(true);
    try {
      const result = await accessSharedStorage(grant.id);
      setFiles(result);
    } catch (e) {
      showToast('Access Denied', e instanceof ApiError ? e.message : 'Could not list files for this grant.', 'error');
      setFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (grant: SharedStorage, file: StorageFile) => {
    setBusyId(file.id);
    try {
      await deleteSharedStorageFile(grant.id, file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      showToast('File Trashed', `${file.name} moved to soft-delete quarantine.`, 'warn');
    } catch (e) {
      showToast('Delete Failed', e instanceof ApiError ? e.message : 'This grant does not permit deletion.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (grant: SharedStorage) => {
    if (!confirm('Revoke this shared storage grant? The recipient will lose access immediately.')) return;
    setBusyId(grant.id);
    try {
      await revokeSharedStorage(grant.id);
      showToast('Access Revoked', 'The grant is now inactive.', 'info');
      onChanged();
    } catch (e) {
      showToast('Revoke Failed', e instanceof ApiError ? e.message : 'Could not revoke this grant.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h3 className="font-serif font-bold text-sm text-[#1A1A1A] mb-2 flex items-center"><FolderOpen className="w-4 h-4 mr-1.5" />Shared With Me</h3>
        <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 divide-y divide-[#1A1A1A]/10 shadow-xs">
          {overview.sharedWithMe.length === 0 ? (
            <div className="p-8 text-center text-[#76746E] text-xs font-mono">Nothing has been shared with you yet.</div>
          ) : (
            overview.sharedWithMe.map(grant => (
              <div key={grant.id}>
                <button
                  onClick={() => toggleExpand(grant)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F9F8F6] transition-colors cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs text-[#1A1A1A] font-semibold">Root {grant.storageRootId} — from user {grant.ownerId}</div>
                    <div className="text-[10px] font-mono text-[#76746E] flex items-center space-x-2">
                      <span>{grant.permissions.join('+')}</span>
                      <GrantModeBadge mode={grant.transferMode} />
                    </div>
                  </div>
                  {expandedId === grant.id ? <ChevronUp className="w-4 h-4 text-[#76746E]" /> : <ChevronDown className="w-4 h-4 text-[#76746E]" />}
                </button>

                {expandedId === grant.id && (
                  <div className="px-4 pb-4">
                    {isLoadingFiles ? (
                      <div className="p-6 flex items-center justify-center text-[#76746E]"><Loader2 className="w-4 h-4 animate-spin" /></div>
                    ) : files.length === 0 ? (
                      <div className="p-4 bg-[#F9F8F6] border border-[#1A1A1A]/10 text-center text-[10px] font-mono text-[#76746E]">Empty root.</div>
                    ) : (
                      <div className="bg-[#F9F8F6] border border-[#1A1A1A]/10 divide-y divide-[#1A1A1A]/10">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center justify-between px-3 py-2 text-[11px] font-mono">
                            <span className="flex items-center space-x-2 text-[#1A1A1A] truncate">
                              <File className="w-3.5 h-3.5 text-[#76746E] shrink-0" />
                              <span className="truncate">{f.relativePath}</span>
                              <span className="text-[#8C8A82]">({formatBytes(f.sizeBytes)})</span>
                            </span>
                            {grant.permissions.includes('delete') && (
                              <button
                                onClick={() => handleDeleteFile(grant, f)}
                                disabled={busyId === f.id}
                                className="text-rose-700 hover:text-rose-900 p-1 cursor-pointer disabled:opacity-40"
                                title="Move to trash"
                              >
                                {busyId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="font-serif font-bold text-sm text-[#1A1A1A] mb-2 flex items-center"><FolderLock className="w-4 h-4 mr-1.5" />Shared By Me</h3>
        <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 divide-y divide-[#1A1A1A]/10 shadow-xs">
          {overview.sharedByMe.length === 0 ? (
            <div className="p-8 text-center text-[#76746E] text-xs font-mono">You haven't shared anything yet.</div>
          ) : (
            overview.sharedByMe.map(grant => (
              <div key={grant.id} className="flex items-center justify-between p-4">
                <div className="space-y-0.5">
                  <div className="font-mono text-xs text-[#1A1A1A] font-semibold">Root {grant.storageRootId} — with user {grant.sharedWithUserId}</div>
                  <div className="text-[10px] font-mono text-[#76746E] flex items-center space-x-2">
                    <span>{grant.permissions.join('+')}</span>
                    <GrantModeBadge mode={grant.transferMode} />
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(grant)}
                  disabled={busyId === grant.id}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-[#FFFFFF] hover:bg-rose-50 text-rose-700 border border-[#1A1A1A]/20 hover:border-rose-300 text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-40"
                >
                  {busyId === grant.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}<span>Revoke</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
