/**
 * EliminationSelector - Startup screen for elimination bracket selection
 *
 * Per ELIMINATION_MODE_SPEC.md §3.1:
 * - Elimination cards (name, league, teams, round, status, last played)
 * - New Elimination Bracket button
 * - Actions: Load, Delete
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Trash2, Plus, Loader2 } from 'lucide-react';
import {
  listEliminations,
  deleteElimination,
  type EliminationMetadata,
} from '../../../utils/eliminationManager';

export function EliminationSelector() {
  const navigate = useNavigate();
  const [eliminations, setEliminations] = useState<EliminationMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEliminations = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await listEliminations();
      setEliminations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load elimination brackets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEliminations();
  }, [loadEliminations]);

  const handleOpen = (elimination: EliminationMetadata) => {
    navigate(`/elimination/${elimination.eliminationId}`);
  };

  const handleNewElimination = () => {
    navigate('/elimination/setup');
  };

  const handleDelete = async (eliminationId: string) => {
    try {
      await deleteElimination(eliminationId);
      setDeletingId(null);
      await loadEliminations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
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
        <div className="text-center mb-8">
          <div className="text-[#0066FF] text-xs tracking-widest mb-1">KBL XHD TRACKER</div>
          <div className="text-xl tracking-wide">Select Elimination Bracket</div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {eliminations.map((elimination) => (
            <div
              key={elimination.eliminationId}
              className="bg-[#111] border border-[#333] rounded-lg overflow-hidden"
            >
              {deletingId === elimination.eliminationId ? (
                <div className="p-4 bg-red-900/30 border-l-4 border-red-500">
                  <p className="text-sm mb-3">
                    Delete "{elimination.name}"? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(elimination.eliminationId)}
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
              ) : (
                <div className="p-4 flex items-center gap-4">
                  <Trophy className="w-8 h-8 text-[#FFD700] shrink-0" />

                  <div
                    className="flex-1 cursor-pointer hover:opacity-80"
                    onClick={() => handleOpen(elimination)}
                  >
                    <div className="font-semibold text-white">{elimination.name}</div>
                    <div className="text-xs text-[#888] mt-1">
                      {elimination.leagueName} • {elimination.teamsCount} teams • Round{' '}
                      {elimination.currentRound} • {elimination.status} • Last played:{' '}
                      {formatDate(elimination.lastPlayedAt)}
                    </div>
                    {elimination.status === 'COMPLETED' && elimination.champion && (
                      <div className="text-xs text-[#FFD700] mt-2">🏆 {elimination.champion}</div>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setDeletingId(elimination.eliminationId)}
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

          {eliminations.length === 0 && (
            <div className="text-center py-12 text-[#666]">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No elimination brackets yet. Create one to get started!</p>
            </div>
          )}
        </div>

        <button
          onClick={handleNewElimination}
          className="w-full bg-[#E91E63] hover:bg-[#D81B60] text-white py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
        >
          <Plus className="w-5 h-5" />
          New Elimination Bracket
        </button>
      </div>
    </div>
  );
}
