/**
 * League Builder - Leagues Module
 * Per LEAGUE_BUILDER_SPEC.md Section 3
 *
 * Create and manage league templates with custom settings.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Database,
  Plus,
  Trash2,
  Copy,
  Edit3,
  ChevronRight,
  Users,
  Loader2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useLeagueBuilderData, type LeagueTemplate } from "../../hooks/useLeagueBuilderData";
import {
  BALANCE_MODE_DEFAULT,
  CHECKPOINT_CADENCE_DEFAULT,
  type CheckpointCadence,
} from "../../../data/rosterEngineConstants";
import type { BalanceMode, RegisteredPool } from "../../../engines/leagueConstruction";
import type { TierKey } from "../../../data/tierParams";
import { isFranchisePhase2L13Enabled } from "../../../utils/franchisePhase2Flags";

// ============================================
// TYPES
// ============================================

interface LeagueFormData {
  name: string;
  description: string;
  teamIds: string[];
  defaultRulesPreset: string;
  draftFormat: 'auction' | 'snake';
  tier: TierKey;
  balanceMode: BalanceMode;
  checkpointCadence: CheckpointCadence;
  color: string;
}

const DEFAULT_FORM_DATA: LeagueFormData = {
  name: "",
  description: "",
  teamIds: [],
  defaultRulesPreset: "",
  draftFormat: "auction",
  tier: "juiced",
  balanceMode: BALANCE_MODE_DEFAULT,
  checkpointCadence: CHECKPOINT_CADENCE_DEFAULT,
  color: "#5A8352",
};

const TIER_OPTIONS: Array<{ value: TierKey; label: string }> = [
  { value: "juiced", label: "Juiced" },
  { value: "standard", label: "Standard" },
  { value: "nerfed", label: "Nerfed" },
];

const BALANCE_MODE_OPTIONS: Array<{ value: BalanceMode; label: string }> = [
  { value: "taxed", label: "Taxed" },
  { value: "advisory", label: "Advisory" },
  { value: "off", label: "Off" },
];

const DRAFT_FORMAT_OPTIONS: Array<{ value: 'auction' | 'snake'; label: string }> = [
  { value: "auction", label: "Auction (default)" },
  { value: "snake", label: "Snake" },
];

const CHECKPOINT_CADENCE_OPTIONS: Array<{ value: CheckpointCadence; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "frequent", label: "Frequent" },
];

function formatTier(value: TierKey | undefined): string {
  return TIER_OPTIONS.find((option) => option.value === (value ?? "juiced"))?.label ?? "Juiced";
}

function formatBalanceMode(value: BalanceMode | undefined): string {
  return BALANCE_MODE_OPTIONS.find((option) => option.value === (value ?? BALANCE_MODE_DEFAULT))?.label ?? "Taxed";
}

function formatCheckpointCadence(value: CheckpointCadence | undefined): string {
  return CHECKPOINT_CADENCE_OPTIONS.find((option) => option.value === (value ?? CHECKPOINT_CADENCE_DEFAULT))?.label ?? "Standard";
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LeagueBuilderLeagues() {
  const navigate = useNavigate();
  const {
    leagues,
    teams,
    rulesPresets,
    isLoading,
    error,
    createLeague,
    updateLeague,
    removeLeague,
    duplicateLeague,
    registerLeaguePool,
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<LeagueTemplate | null>(null);
  const [formData, setFormData] = useState<LeagueFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [registeringPoolId, setRegisteringPoolId] = useState<string | null>(null);
  const [registeredPoolResult, setRegisteredPoolResult] = useState<RegisteredPool | null>(null);
  const showCheckpointCadenceControl = isFranchisePhase2L13Enabled();

  // Set default rules preset when data loads
  useEffect(() => {
    if (rulesPresets.length > 0 && !formData.defaultRulesPreset) {
      const defaultPreset = rulesPresets.find((p) => p.isDefault) || rulesPresets[0];
      setFormData((prev) => ({ ...prev, defaultRulesPreset: defaultPreset.id }));
    }
  }, [rulesPresets, formData.defaultRulesPreset]);

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingLeague(null);
    setFormData({
      ...DEFAULT_FORM_DATA,
      defaultRulesPreset: rulesPresets.find((p) => p.isDefault)?.id || rulesPresets[0]?.id || "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (league: LeagueTemplate) => {
    setEditingLeague(league);
    setFormData({
      name: league.name,
      description: league.description || "",
      teamIds: league.teamIds,
      defaultRulesPreset: league.defaultRulesPreset,
      draftFormat: league.draftFormat ?? "auction",
      tier: league.tier ?? "juiced",
      balanceMode: league.balanceMode ?? BALANCE_MODE_DEFAULT,
      checkpointCadence: league.checkpointCadence ?? CHECKPOINT_CADENCE_DEFAULT,
      color: league.color || "#5A8352",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLeague(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      if (editingLeague) {
        await updateLeague({
          ...editingLeague,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          teamIds: formData.teamIds,
          defaultRulesPreset: formData.defaultRulesPreset,
          draftFormat: formData.draftFormat,
          tier: formData.tier,
          balanceMode: formData.balanceMode,
          checkpointCadence: formData.checkpointCadence,
          color: formData.color,
        });
      } else {
        await createLeague({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          teamIds: formData.teamIds,
          conferences: [],
          divisions: [],
          defaultRulesPreset: formData.defaultRulesPreset,
          draftFormat: formData.draftFormat,
          tier: formData.tier,
          balanceMode: formData.balanceMode,
          checkpointCadence: formData.checkpointCadence,
          color: formData.color,
        });
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save league:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeLeague(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete league:", err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateLeague(id);
    } catch (err) {
      console.error("Failed to duplicate league:", err);
    }
  };

  const handleRegisterPool = async (leagueId: string) => {
    setRegisteringPoolId(leagueId);
    try {
      const pool = await registerLeaguePool(leagueId);
      setRegisteredPoolResult(pool);
    } catch (err) {
      console.error("Failed to register pool:", err);
    } finally {
      setRegisteringPoolId(null);
    }
  };

  const toggleTeam = (teamId: string) => {
    setFormData((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading leagues...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/league-builder")}
            className="p-3 bg-[#4A6844] hover:bg-[#5A8352] border-4 border-[#E8E8D8] transition active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            <ArrowLeft className="w-6 h-6 text-[#E8E8D8]" />
          </button>
          <div className="flex items-center gap-3 bg-[#5A8352] border-[6px] border-[#E8E8D8] px-8 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]">
            <Database className="w-6 h-6" style={{ color: "#CC44CC" }} />
            <h1
              className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              LEAGUES
            </h1>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {registeredPoolResult && (
          <div className="bg-[#4A6844] border-4 border-[#E8E8D8] p-4 mb-6 flex items-start gap-3">
            <Check className="w-5 h-5 text-[#9DFF7A] mt-0.5" />
            <div>
              <div className="font-bold">Pool Registered</div>
              <div className="text-sm text-[#E8E8D8]/80">
                {formatTier(registeredPoolResult.tier)} tier · Cap ${registeredPoolResult.tierCap.toLocaleString()} ·{" "}
                {registeredPoolResult.players.length} players
              </div>
              {registeredPoolResult.poolSurplusWarning && (
                <div className="text-sm text-[#FFD166] mt-1">
                  Surplus warning: pool is above 120% of roster slots.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] px-6 py-3 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold tracking-wide">CREATE NEW LEAGUE</span>
          </button>
        </div>

        {/* Leagues List */}
        <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]">
          {leagues.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "#CC44CC" }} />
              <h2 className="text-xl font-bold mb-2">No Leagues Yet</h2>
              <p className="text-[#E8E8D8]/70">Create your first league to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leagues.map((league) => (
                <div
                  key={league.id}
                  className="bg-[#4A6844] border-[4px] border-[#3F5A3A] p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full border-2 border-[#E8E8D8]/50"
                      style={{ backgroundColor: league.color || "#5A8352" }}
                    />
                    <div>
                      <div className="text-lg font-bold">{league.name}</div>
                      {league.description && (
                        <div className="text-sm text-[#E8E8D8]/70">{league.description}</div>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-xs text-[#E8E8D8]/60">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {league.teamIds.length} team{league.teamIds.length !== 1 ? "s" : ""}
                        </span>
                        <span>{formatTier(league.tier)}</span>
                        <span>{formatBalanceMode(league.balanceMode)}</span>
                        {showCheckpointCadenceControl && (
                          <span>{formatCheckpointCadence(league.checkpointCadence)} checkpoints</span>
                        )}
                        <span>
                          Created:{" "}
                          {new Date(league.createdDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Register Pool */}
                    <button
                      onClick={() => handleRegisterPool(league.id)}
                      disabled={registeringPoolId === league.id}
                      className="px-3 py-2 bg-[#5599FF] hover:bg-[#3366FF] border-[3px] border-[#E8E8D8]/70 transition disabled:opacity-60 flex items-center gap-2"
                      title="Register pool"
                    >
                      {registeringPoolId === league.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      <span className="text-xs font-bold">Register Pool</span>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(league)}
                      className="p-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 transition"
                      title="Edit league"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicate(league.id)}
                      className="p-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 transition"
                      title="Duplicate league"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    {deleteConfirmId === league.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(league.id)}
                          className="p-2 bg-red-600 hover:bg-red-700 border-[3px] border-red-400 transition"
                          title="Confirm delete"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 transition"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(league.id)}
                        className="p-2 bg-red-800 hover:bg-red-700 border-[3px] border-red-500/50 transition"
                        title="Delete league"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* View */}
                    <button
                      onClick={() => openEditModal(league)}
                      className="p-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 transition"
                      title="View details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-[#4A6844]">
              <h2 className="text-xl font-bold">
                {editingLeague ? "Edit League" : "Create New League"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-[#4A6844] transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold mb-2">League Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Kruse Baseball League"
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none resize-none"
                />
              </div>

              {/* Theme Color */}
              <div>
                <label className="block text-sm font-bold mb-2">Theme Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-12 rounded cursor-pointer border-4 border-[#3F5A3A]"
                  />
                  <span className="text-sm text-[#E8E8D8]/70">{formData.color}</span>
                </div>
              </div>

              {/* Rules Preset */}
              <div>
                <label className="block text-sm font-bold mb-2">Default Rules Preset</label>
                <select
                  value={formData.defaultRulesPreset}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, defaultRulesPreset: e.target.value }))
                  }
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                >
                  {rulesPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} {preset.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* League Tier */}
              <div>
                <label className="block text-sm font-bold mb-2">League Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tier: e.target.value as TierKey }))
                  }
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                >
                  {TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Draft Format */}
              <div>
                <label htmlFor="league-draft-format" className="block text-sm font-bold mb-2">
                  DRAFT FORMAT
                </label>
                <select
                  id="league-draft-format"
                  aria-label="Draft format"
                  value={formData.draftFormat}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      draftFormat: e.target.value as 'auction' | 'snake',
                    }))
                  }
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                >
                  {DRAFT_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance Mode */}
              <div>
                <label className="block text-sm font-bold mb-2">Balance Mode</label>
                <select
                  value={formData.balanceMode}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, balanceMode: e.target.value as BalanceMode }))
                  }
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                >
                  {BALANCE_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {showCheckpointCadenceControl && (
                <div>
                  <label className="block text-sm font-bold mb-2">Checkpoint Cadence</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHECKPOINT_CADENCE_OPTIONS.map((option) => {
                      const active = formData.checkpointCadence === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, checkpointCadence: option.value }))
                          }
                          className={`border-[4px] p-3 text-left font-bold transition ${
                            active
                              ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#2F4A2A]"
                              : "bg-[#4A6844] border-[#3F5A3A] text-[#E8E8D8] hover:border-[#E8E8D8]/70"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Teams ({formData.teamIds.length} selected)
                </label>
                {teams.length === 0 ? (
                  <div className="bg-[#4A6844] border-[4px] border-[#3F5A3A] p-4 text-center text-[#E8E8D8]/60">
                    No teams available. Create teams in the Teams module first.
                  </div>
                ) : (
                  <div className="bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {teams.map((team) => (
                        <label
                          key={team.id}
                          className={`flex items-center gap-2 p-2 cursor-pointer transition ${
                            formData.teamIds.includes(team.id)
                              ? "bg-[#5A8352]"
                              : "hover:bg-[#3F5A3A]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.teamIds.includes(team.id)}
                            onChange={() => toggleTeam(team.id)}
                            className="w-4 h-4 accent-[#5A8352]"
                          />
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.colors.primary }}
                          />
                          <span className="text-sm">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t-4 border-[#4A6844]">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-[#4A6844] hover:bg-[#3F5A3A] border-[3px] border-[#E8E8D8]/50 transition font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || isSaving}
                className="px-6 py-2 bg-[#5599FF] hover:bg-[#3366FF] border-[3px] border-[#E8E8D8] transition font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingLeague ? "Save Changes" : "Create League"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
