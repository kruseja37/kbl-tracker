/**
 * League Builder - Leagues Module
 * Per LEAGUE_BUILDER_SPEC.md Section 3
 *
 * Create and manage league templates with custom settings.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Shuffle,
  Users,
  Loader2,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { BallparkShell } from "../components/ballpark";
import { useLeagueBuilderData, type LeagueTemplate } from "../../hooks/useLeagueBuilderData";
import {
  BALANCE_MODE_DEFAULT,
  CHECKPOINT_CADENCE_DEFAULT,
  type CheckpointCadence,
} from "../../../data/rosterEngineConstants";
import type { BalanceMode } from "../../../engines/leagueConstruction";
import { TIER_CAPS, type TierKey } from "../../../data/tierParams";
import { isFranchisePhase2L13Enabled } from "../../../utils/franchisePhase2Flags";
import {
  isSavedAuctionMutationGuardMessage,
  useSavedAuctionMutationGuard,
} from "../utils/savedAuctionMutationGuard";
import {
  formatSalaryCapInput,
  formatSalaryCapMoney,
  parseSalaryCapInput,
  salaryCapAdvisory as getSalaryCapAdvisory,
  salaryCapHardError as getSalaryCapHardError,
} from "../utils/salaryCapInput";
import {
  assignTeamToConference,
  buildConferenceDraftFromLeague,
  buildConferenceStructure,
  createBalancedConferenceDraft,
  createConferenceDraft,
  createSingleConferenceDraft,
  syncConferenceDraftTeamIds,
  validateConferenceDraft,
  type ConferenceAssignmentDraft,
} from "../../../utils/leagueConferenceEditor";

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
  salaryCap: string;
  balanceMode: BalanceMode;
  checkpointCadence: CheckpointCadence;
  color: string;
  conferences: ConferenceAssignmentDraft[];
  conferencesTouched: boolean;
}

const DEFAULT_FORM_DATA: LeagueFormData = {
  name: "",
  description: "",
  teamIds: [],
  defaultRulesPreset: "",
  draftFormat: "auction",
  tier: "juiced",
  salaryCap: TIER_CAPS.juiced.tierCap.toLocaleString(),
  balanceMode: BALANCE_MODE_DEFAULT,
  checkpointCadence: CHECKPOINT_CADENCE_DEFAULT,
  color: "#5A8352",
  conferences: [],
  conferencesTouched: false,
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

const DRAFT_FORMAT_OPTIONS: Array<{ value: 'auction'; label: string }> = [
  { value: "auction", label: "Auction (default)" },
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
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<LeagueTemplate | null>(null);
  const [formData, setFormData] = useState<LeagueFormData>(DEFAULT_FORM_DATA);
  const [salaryCapDirty, setSalaryCapDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const showCheckpointCadenceControl = isFranchisePhase2L13Enabled();
  const allLeagueIds = useMemo(() => leagues.map((league) => league.id), [leagues]);
  const savedAuctionGuard = useSavedAuctionMutationGuard(allLeagueIds);
  const isLeagueMutationBlocked = (leagueId: string | null | undefined) => {
    if (!leagueId) return false;
    return (
      !savedAuctionGuard.checked ||
      Boolean(savedAuctionGuard.lookupError) ||
      savedAuctionGuard.lockedLeagueIds.includes(leagueId)
    );
  };
  const savedAuctionMutationMessage = savedAuctionGuard.message;
  const editingLeagueMutationBlocked = isLeagueMutationBlocked(editingLeague?.id);
  const tierReference = TIER_CAPS[formData.tier].tierCap;
  const parsedSalaryCap = parseSalaryCapInput(formData.salaryCap);
  const salaryCapHardError = getSalaryCapHardError(parsedSalaryCap);
  const salaryCapAdvisory = getSalaryCapAdvisory(parsedSalaryCap, tierReference);
  const selectedTeams = useMemo(
    () => teams.filter((team) => formData.teamIds.includes(team.id)),
    [formData.teamIds, teams],
  );
  const conferenceValidation = useMemo(
    () => validateConferenceDraft(formData.teamIds, formData.conferences),
    [formData.teamIds, formData.conferences],
  );
  const conferenceAssignmentByTeamId = useMemo(() => {
    const assignments = new Map<string, string>();
    for (const conference of formData.conferences) {
      for (const teamId of conference.teamIds) {
        assignments.set(teamId, conference.id);
      }
    }
    return assignments;
  }, [formData.conferences]);

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
    setSaveError(null);
    setSalaryCapDirty(false);
    setFormData({
      ...DEFAULT_FORM_DATA,
      defaultRulesPreset: rulesPresets.find((p) => p.isDefault)?.id || rulesPresets[0]?.id || "",
      salaryCap: formatSalaryCapInput(TIER_CAPS[DEFAULT_FORM_DATA.tier].tierCap),
      conferences: [],
      conferencesTouched: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (league: LeagueTemplate) => {
    setEditingLeague(league);
    setSaveError(null);
    const tier = league.tier ?? "juiced";
    const referenceCap = TIER_CAPS[tier].tierCap;
    const salaryCap = league.salaryCap ?? referenceCap;
    setSalaryCapDirty(league.salaryCap !== undefined && league.salaryCap !== referenceCap);
    setFormData({
      name: league.name,
      description: league.description || "",
      teamIds: league.teamIds,
      defaultRulesPreset: league.defaultRulesPreset,
      draftFormat: "auction",
      tier,
      salaryCap: formatSalaryCapInput(salaryCap),
      balanceMode: league.balanceMode ?? BALANCE_MODE_DEFAULT,
      checkpointCadence: league.checkpointCadence ?? CHECKPOINT_CADENCE_DEFAULT,
      color: league.color || "#5A8352",
      conferences: buildConferenceDraftFromLeague(league),
      conferencesTouched: false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLeague(null);
    setSaveError(null);
    setSalaryCapDirty(false);
    setFormData(DEFAULT_FORM_DATA);
  };

  useEffect(() => {
    if (!isModalOpen || !editingLeagueMutationBlocked || !savedAuctionMutationMessage) return;
    setSaveError(savedAuctionMutationMessage);
  }, [editingLeagueMutationBlocked, isModalOpen, savedAuctionMutationMessage]);

  useEffect(() => {
    setSaveError((current) => {
      if (!isSavedAuctionMutationGuardMessage(current)) return current;
      return savedAuctionGuard.blocked ? savedAuctionMutationMessage : null;
    });
  }, [savedAuctionGuard.blocked, savedAuctionMutationMessage]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (salaryCapHardError || parsedSalaryCap === null) {
      setSaveError(salaryCapHardError ?? "Enter a valid salary cap.");
      return;
    }
    if (editingLeagueMutationBlocked) {
      setSaveError(savedAuctionMutationMessage ?? "League Builder changes are temporarily locked.");
      return;
    }
    if (!conferenceValidation.valid) {
      setSaveError(conferenceValidation.message ?? "Fix conference assignments before saving.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const conferencePatch = formData.conferencesTouched
        ? buildConferenceStructure(formData.conferences)
        : {
            conferences: editingLeague?.conferences ?? [],
            divisions: editingLeague?.divisions ?? [],
          };

      if (editingLeague) {
        await updateLeague({
          ...editingLeague,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          teamIds: formData.teamIds,
          defaultRulesPreset: formData.defaultRulesPreset,
          draftFormat: formData.draftFormat,
          tier: formData.tier,
          salaryCap: parsedSalaryCap,
          balanceMode: formData.balanceMode,
          checkpointCadence: formData.checkpointCadence,
          color: formData.color,
          ...conferencePatch,
        });
      } else {
        await createLeague({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          teamIds: formData.teamIds,
          conferences: conferencePatch.conferences,
          divisions: conferencePatch.divisions,
          defaultRulesPreset: formData.defaultRulesPreset,
          draftFormat: formData.draftFormat,
          tier: formData.tier,
          salaryCap: parsedSalaryCap,
          balanceMode: formData.balanceMode,
          checkpointCadence: formData.checkpointCadence,
          color: formData.color,
        });
      }
      closeModal();
    } catch (err) {
      console.error("Failed to save league:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save league.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isLeagueMutationBlocked(id)) {
      setSaveError(savedAuctionMutationMessage ?? "League Builder changes are temporarily locked.");
      setDeleteConfirmId(null);
      return;
    }
    try {
      await removeLeague(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete league:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to delete league.");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateLeague(id);
    } catch (err) {
      console.error("Failed to duplicate league:", err);
    }
  };

  const handleTierChange = (tier: TierKey) => {
    setFormData((prev) => ({
      ...prev,
      tier,
      salaryCap: salaryCapDirty ? prev.salaryCap : formatSalaryCapInput(TIER_CAPS[tier].tierCap),
    }));
  };

  const handleSalaryCapChange = (value: string) => {
    setSalaryCapDirty(true);
    const parsed = parseSalaryCapInput(value);
    setFormData((prev) => ({
      ...prev,
      salaryCap: parsed === null ? value : formatSalaryCapInput(parsed),
    }));
  };

  const toggleTeam = (teamId: string) => {
    if (editingLeagueMutationBlocked) {
      setSaveError(savedAuctionMutationMessage ?? "League Builder changes are temporarily locked.");
      return;
    }
    setFormData((prev) => {
      const nextTeamIds = prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId];
      const hasConferenceEditor = prev.conferences.length > 0;
      return {
        ...prev,
        teamIds: nextTeamIds,
        conferences: hasConferenceEditor
          ? syncConferenceDraftTeamIds(prev.conferences, nextTeamIds)
          : prev.conferences,
        conferencesTouched: hasConferenceEditor ? true : prev.conferencesTouched,
      };
    });
  };

  const setSingleConference = () => {
    setFormData((prev) => ({
      ...prev,
      conferences: createSingleConferenceDraft(prev.teamIds),
      conferencesTouched: true,
    }));
  };

  const setBalancedConferences = () => {
    setFormData((prev) => ({
      ...prev,
      conferences: createBalancedConferenceDraft(prev.teamIds),
      conferencesTouched: true,
    }));
  };

  const clearConferences = () => {
    setFormData((prev) => ({
      ...prev,
      conferences: [],
      conferencesTouched: true,
    }));
  };

  const addConference = () => {
    setFormData((prev) => ({
      ...prev,
      conferences: [
        ...prev.conferences,
        createConferenceDraft(`Conference ${prev.conferences.length + 1}`, prev.conferences.map((conference) => conference.id)),
      ],
      conferencesTouched: true,
    }));
  };

  const updateConferenceName = (conferenceId: string, name: string) => {
    setFormData((prev) => ({
      ...prev,
      conferences: prev.conferences.map((conference) => (
        conference.id === conferenceId
          ? {
              ...conference,
              name,
              abbreviation: name.trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((word) => word[0])
                .join("")
                .slice(0, 4)
                .toUpperCase() || conference.abbreviation,
            }
          : conference
      )),
      conferencesTouched: true,
    }));
  };

  const removeConference = (conferenceId: string) => {
    setFormData((prev) => ({
      ...prev,
      conferences: syncConferenceDraftTeamIds(
        prev.conferences.filter((conference) => conference.id !== conferenceId),
        prev.teamIds,
      ),
      conferencesTouched: true,
    }));
  };

  const assignTeam = (teamId: string, conferenceId: string) => {
    setFormData((prev) => ({
      ...prev,
      conferences: assignTeamToConference(prev.conferences, teamId, conferenceId),
      conferencesTouched: true,
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
    <BallparkShell
      onBack={() => navigate("/league-builder")}
      icon={Database}
      iconColor="#CC44CC"
      title="LEAGUES"
    >
      {/* Error Display */}
        {(error || saveError) && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{saveError ?? error}</span>
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
                    {/* Draft Setup */}
                    <button
                      onClick={() => navigate(`/league-builder/draft-setup?leagueId=${league.id}`)}
                      className="px-3 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-[3px] border-[#E8E8D8]/70 transition flex items-center gap-2"
                      title="Draft setup"
                    >
                      <Shuffle className="w-4 h-4" />
                      <span className="text-xs font-bold">Draft</span>
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
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {saveError && (
              <div className="mx-6 mt-4 bg-red-900/50 border-4 border-red-500 p-3 text-sm text-red-100">
                {saveError}
              </div>
            )}

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
                  onChange={(e) => handleTierChange(e.target.value as TierKey)}
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                >
                  {TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Cap */}
              <div>
                <label htmlFor="league-salary-cap" className="block text-sm font-bold mb-2">
                  SALARY CAP
                </label>
                <input
                  id="league-salary-cap"
                  aria-label="Salary cap"
                  type="text"
                  inputMode="numeric"
                  value={formData.salaryCap}
                  onChange={(e) => handleSalaryCapChange(e.target.value)}
                  className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                />
                <div className="mt-2 text-xs font-bold text-[#E8E8D8]/70">
                  TIER REFERENCE: {formatSalaryCapMoney(tierReference)}
                </div>
                {salaryCapHardError ? (
                  <div className="mt-2 text-xs font-bold text-red-200">{salaryCapHardError}</div>
                ) : salaryCapAdvisory ? (
                  <div className="mt-2 text-xs font-bold text-[#FFD27A]">{salaryCapAdvisory}</div>
                ) : null}
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
                            disabled={editingLeagueMutationBlocked}
                            className="w-4 h-4 accent-[#5A8352] disabled:cursor-not-allowed"
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

              {/* Conference Assignment */}
              <div className="bg-[#4A6844] border-[4px] border-[#3F5A3A] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-bold">Conferences</div>
                    <div className="text-xs text-[#E8E8D8]/60">
                      {formData.conferences.length > 0
                        ? `${formData.conferences.length} active`
                        : "No conference structure"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.conferences.length === 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={setSingleConference}
                          className="px-3 py-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 text-xs font-bold transition"
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={setBalancedConferences}
                          className="px-3 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-[3px] border-[#E8E8D8]/50 text-xs font-bold transition"
                        >
                          Balanced split
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={setBalancedConferences}
                          className="px-3 py-2 bg-[#3B7DD8] hover:bg-[#4B8DE8] border-[3px] border-[#E8E8D8]/50 text-xs font-bold transition"
                        >
                          Balanced split
                        </button>
                        <button
                          type="button"
                          onClick={addConference}
                          className="px-3 py-2 bg-[#5A8352] hover:bg-[#6A9362] border-[3px] border-[#E8E8D8]/50 text-xs font-bold transition inline-flex items-center gap-1"
                          title="Add conference"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={clearConferences}
                          className="px-3 py-2 bg-[#633B2E] hover:bg-[#7A4938] border-[3px] border-[#E8E8D8]/50 text-xs font-bold transition"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {formData.conferences.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {formData.conferences.map((conference) => (
                        <div key={conference.id} className="bg-[#3F5A3A] border-[3px] border-[#2F4A2A] p-3">
                          <div className="flex items-center gap-2">
                            <input
                              aria-label={`Conference name ${conference.name}`}
                              type="text"
                              value={conference.name}
                              onChange={(event) => updateConferenceName(conference.id, event.target.value)}
                              className="min-w-0 flex-1 bg-[#4A6844] border-[3px] border-[#2F4A2A] p-2 text-sm text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                            />
                            {formData.conferences.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeConference(conference.id)}
                                className="p-2 bg-red-800 hover:bg-red-700 border-[3px] border-red-500/50 transition"
                                title={`Remove ${conference.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-[#E8E8D8]/60">
                            {conference.teamIds.length} team{conference.teamIds.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedTeams.length > 0 ? (
                      <div>
                        <div className="text-xs font-bold mb-2 text-[#E8E8D8]/70">Team assignments</div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {selectedTeams.map((team) => (
                            <label key={team.id} className="flex items-center gap-2 bg-[#3F5A3A] border-[3px] border-[#2F4A2A] p-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: team.colors.primary }}
                              />
                              <span className="min-w-0 flex-1 text-sm truncate">{team.name}</span>
                              <select
                                aria-label={`${team.name} conference`}
                                value={conferenceAssignmentByTeamId.get(team.id) ?? ""}
                                onChange={(event) => assignTeam(team.id, event.target.value)}
                                className="bg-[#4A6844] border-[3px] border-[#2F4A2A] p-2 text-xs text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                              >
                                <option value="" disabled>Pick</option>
                                {formData.conferences.map((conference) => (
                                  <option key={conference.id} value={conference.id}>
                                    {conference.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-[#E8E8D8]/60">Select teams before assigning conferences.</div>
                    )}

                    {!conferenceValidation.valid && (
                      <div className="bg-red-900/50 border-4 border-red-500 p-3 text-sm text-red-100">
                        {conferenceValidation.message}
                      </div>
                    )}
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
                disabled={!formData.name.trim() || Boolean(salaryCapHardError) || !conferenceValidation.valid || editingLeagueMutationBlocked || isSaving}
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
    </BallparkShell>
  );
}
