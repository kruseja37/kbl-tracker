/**
 * FranchiseSelector - Startup screen for franchise selection
 *
 * Per FRANCHISE_MODE_SPEC.md §5:
 * - Franchise cards (name, season count, storage, last played)
 * - New Franchise button
 * - Actions: Continue, Rename, Export, Delete
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Pencil, Download, Trash2, Plus, Loader2 } from 'lucide-react';
import {
  listFranchises,
  createFranchise,
  deleteFranchise,
  renameFranchise,
  setActiveFranchise,
  exportFranchise,
  type FranchiseSummary,
} from '../../../utils/franchiseManager';

export function FranchiseSelector() {
  const navigate = useNavigate();
  const [franchises, setFranchises] = useState<FranchiseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFranchises = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await listFranchises();
      // Sort by lastPlayedAt descending
      list.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
      setFranchises(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load franchises');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFranchises();
  }, [loadFranchises]);

  const handleContinue = async (franchise: FranchiseSummary) => {
    await setActiveFranchise(franchise.id);
    navigate(`/franchise/${franchise.id}`);
  };

  const handleNewFranchise = () => {
    // Navigate to wizard — franchise creation happens in the wizard's START FRANCHISE flow
    navigate('/franchise/setup');
  };

  const handleRename = async (franchiseId: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameFranchise(franchiseId, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
      await loadFranchises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    }
  };

  const handleDelete = async (franchiseId: string) => {
    try {
      await deleteFranchise(franchiseId);
      setDeletingId(null);
      await loadFranchises();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleExport = async (franchise: FranchiseSummary) => {
    try {
      const blob = await exportFranchise(franchise.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${franchise.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const formatDate = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '—';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / 1048576)}MB`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-[#0066FF] text-xs tracking-widest mb-1">KBL XHD TRACKER</div>
          <div className="text-xl tracking-wide">Select Franchise</div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Franchise Cards */}
        <div className="space-y-3 mb-6">
          {franchises.map((franchise) => (
            <div key={franchise.id} className="bg-[#111] border border-[#333] rounded-lg overflow-hidden">
              {/* Delete confirmation overlay */}
              {deletingId === franchise.id ? (
                <div className="p-4 bg-red-900/30 border-l-4 border-red-500">
                  <p className="text-sm mb-3">Delete "{franchise.name}"? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(franchise.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white text-sm rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : renamingId === franchise.id ? (
                /* Rename input */
                <div className="p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(franchise.id)}
                      className="flex-1 bg-[#222] border border-[#555] text-white px-3 py-1 rounded text-sm"
                      autoFocus
                      placeholder="Franchise name"
                    />
                    <button
                      onClick={() => handleRename(franchise.id)}
                      className="px-3 py-1 bg-[#0066FF] hover:bg-[#0055DD] text-white text-sm rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setRenamingId(null); setRenameValue(''); }}
                      className="px-3 py-1 bg-[#333] hover:bg-[#444] text-white text-sm rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal card view */
                <div className="p-4 flex items-center gap-4">
                  <Trophy className="w-8 h-8 text-[#FFD700] shrink-0" />

                  <div
                    className="flex-1 cursor-pointer hover:opacity-80"
                    onClick={() => handleContinue(franchise)}
                  >
                    <div className="font-semibold text-white">{franchise.name}</div>
                    <div className="text-xs text-[#888] mt-1">
                      {franchise.controlledTeamName && <>{franchise.controlledTeamName} • </>}
                      Season {franchise.currentSeason}
                      {franchise.leagueName && <> • {franchise.leagueName}</>}
                      {' • '}
                      Last played: {formatDate(franchise.lastPlayedAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setRenamingId(franchise.id);
                        setRenameValue(franchise.name);
                      }}
                      className="p-2 hover:bg-[#333] rounded text-[#888] hover:text-white"
                      title="Rename"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(franchise)}
                      className="p-2 hover:bg-[#333] rounded text-[#888] hover:text-white"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(franchise.id)}
                      className="p-2 hover:bg-[#333] rounded text-[#888] hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {franchises.length === 0 && (
            <div className="text-center py-12 text-[#666]">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No franchises yet. Create one to get started!</p>
            </div>
          )}
        </div>

        {/* New Franchise Button */}
        <button
          onClick={handleNewFranchise}
          className="w-full bg-[#0066FF] hover:bg-[#0055DD] text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          New Franchise
        </button>
      </div>
    </div>
  );
}
