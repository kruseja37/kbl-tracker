/**
 * League Builder - Teams Module
 * Per LEAGUE_BUILDER_SPEC.md Section 4
 *
 * Create, edit, and manage teams. Teams are global entities
 * that can be assigned to multiple leagues.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  AlertTriangle,
  MapPin,
  Building2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useLeagueBuilderData, type Team } from "../../hooks/useLeagueBuilderData";
import type { EraFlavor, TeamRivalry } from "../../../utils/leagueBuilderStorage";
import type { ManagerAssignment, ManagerProfile } from "../../../types/managerWpa";
import {
  ensureDefaultManagerProfile,
  ensureDefaultManagerProfiles,
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  listManagerAssignments,
  listManagerProfiles,
  saveManagerAssignment,
  saveManagerProfile,
} from "../../../utils/managerIdentityStorage";
import { getDefaultManagerIdForTeam } from "../../../utils/managerWpaDerivation";

const ERA_FLAVORS: EraFlavor[] = ['GOLDEN_AGE', 'CLASSIC_TV', 'MODERN_LOCAL'];

const ERA_FLAVOR_LABELS: Record<EraFlavor, string> = {
  GOLDEN_AGE: 'Golden Age',
  CLASSIC_TV: 'Classic TV',
  MODERN_LOCAL: 'Modern Local',
};

const TEAM_BACKSTORY_LIMIT = 500;
const HERITAGE_FACT_LIMIT = 5;
const RIVALRY_INTENSITY_MIN = 0;
const RIVALRY_INTENSITY_MAX = 10;

// ============================================
// TYPES
// ============================================

interface TeamFormData {
  name: string;
  abbreviation: string;
  location: string;
  nickname: string;
  stadium: string;
  stadiumCapacity: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  foundedYear: string;
  championships: string;
  backstory: string;
  era: EraFlavor | '';
  cityVibe: string;
  ballparkNickname: string;
  heritageFacts: string[];
  rivalries: TeamRivalry[];
  managerId: string;
  managerDisplayName: string;
  managerGender: string;
  managerAge: string;
  managerHometown: string;
  managerStyleLabel: string;
}

const DEFAULT_FORM_DATA: TeamFormData = {
  name: "",
  abbreviation: "",
  location: "",
  nickname: "",
  stadium: "",
  stadiumCapacity: "",
  primaryColor: "#FF6600",
  secondaryColor: "#000000",
  accentColor: "",
  foundedYear: "",
  championships: "0",
  backstory: "",
  era: "",
  cityVibe: "",
  ballparkNickname: "",
  heritageFacts: [],
  rivalries: [],
  managerId: "",
  managerDisplayName: "",
  managerGender: "Male",
  managerAge: "",
  managerHometown: "",
  managerStyleLabel: "",
};

function normalizeHeritageFacts(heritageFacts: string[]): string[] {
  return heritageFacts
    .map((fact) => fact.trim())
    .filter(Boolean)
    .slice(0, HERITAGE_FACT_LIMIT);
}

function normalizeRivalries(rivalries: TeamRivalry[]): TeamRivalry[] {
  const seenOpponentIds = new Set<string>();

  return rivalries.reduce<TeamRivalry[]>((acc, rivalry) => {
    const opponentTeamId = rivalry.opponentTeamId?.trim();
    if (!opponentTeamId || seenOpponentIds.has(opponentTeamId)) {
      return acc;
    }

    seenOpponentIds.add(opponentTeamId);
    acc.push({
      opponentTeamId,
      intensity: Math.max(
        RIVALRY_INTENSITY_MIN,
        Math.min(RIVALRY_INTENSITY_MAX, Math.round(rivalry.intensity ?? 0)),
      ),
      origin: rivalry.origin?.trim() || undefined,
    });
    return acc;
  }, []);
}

function teamMetadataMatches(
  left: { heritageFacts: string[]; rivalries: TeamRivalry[] },
  right: { heritageFacts: string[]; rivalries: TeamRivalry[] },
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LeagueBuilderTeams() {
  const navigate = useNavigate();
  const {
    teams,
    leagues,
    isLoading,
    error,
    createTeam,
    updateTeam,
    removeTeam,
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState<TeamFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isHeritageFactsOpen, setIsHeritageFactsOpen] = useState(true);
  const [isRivalriesOpen, setIsRivalriesOpen] = useState(true);
  const [managerProfiles, setManagerProfiles] = useState<ManagerProfile[]>([]);
  const [managerAssignments, setManagerAssignments] = useState<ManagerAssignment[]>([]);
  const autosavedTeamMetadataRef = useRef<{
    heritageFacts: string[];
    rivalries: TeamRivalry[];
  } | null>(null);
  const managerProfilesById = useMemo(
    () => new Map(managerProfiles.map((profile) => [profile.managerId, profile])),
    [managerProfiles],
  );
  const managerAssignmentsByTeamId = useMemo(
    () =>
      new Map(
        managerAssignments.map((assignment) => [assignment.teamId, assignment]),
      ),
    [managerAssignments],
  );

  // Auto-generate abbreviation from name
  useEffect(() => {
    if (!editingTeam && formData.name && !formData.abbreviation) {
      // Generate 3-letter abbreviation from first letters of words
      const words = formData.name.split(" ").filter(Boolean);
      const abbr =
        words.length >= 3
          ? words
              .slice(0, 3)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
          : formData.name.slice(0, 3).toUpperCase();
      setFormData((prev) => ({ ...prev, abbreviation: abbr }));
    }
  }, [formData.name, formData.abbreviation, editingTeam]);

  useEffect(() => {
    if (teams.length === 0) {
      setManagerProfiles([]);
      setManagerAssignments([]);
      return;
    }

    let cancelled = false;
    async function loadManagers() {
      await ensureDefaultManagerProfiles(teams);
      const [profiles, assignments] = await Promise.all([
        listManagerProfiles(),
        listManagerAssignments({
          mode: "franchise",
          instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
        }),
      ]);
      if (cancelled) return;
      setManagerProfiles(profiles);
      setManagerAssignments(assignments);
    }

    loadManagers().catch((err) => {
      if (!cancelled) console.error("Failed to load managers:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [teams]);

  const getAssignedManagerId = (team: Team): string => (
    managerAssignmentsByTeamId.get(team.id)?.managerId ||
    team.managerId ||
    getDefaultManagerIdForTeam(team.id)
  );

  const getAssignedManagerProfile = (team: Team): ManagerProfile | undefined =>
    managerProfilesById.get(getAssignedManagerId(team));

  const getAssignedManagerName = (team: Team): string =>
    getAssignedManagerProfile(team)?.displayName ||
    team.managerName ||
    `${team.name} Manager`;

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingTeam(null);
    setFormData(DEFAULT_FORM_DATA);
    setIsHeritageFactsOpen(true);
    setIsRivalriesOpen(true);
    autosavedTeamMetadataRef.current = null;
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    const managerId = getAssignedManagerId(team);
    const managerProfile = managerProfilesById.get(managerId);
    setEditingTeam(team);
    setFormData({
      name: team.name,
      abbreviation: team.abbreviation,
      location: team.location,
      nickname: team.nickname,
      stadium: team.stadium,
      stadiumCapacity: team.stadiumCapacity?.toString() || "",
      primaryColor: team.colors.primary,
      secondaryColor: team.colors.secondary,
      accentColor: team.colors.accent || "",
      foundedYear: team.foundedYear?.toString() || "",
      championships: team.championships?.toString() || "0",
      backstory: team.backstory || "",
      era: team.era || "",
      cityVibe: team.cityVibe || "",
      ballparkNickname: team.ballparkNickname || "",
      heritageFacts: team.heritageFacts || [],
      rivalries: team.rivalries || [],
      managerId,
      managerDisplayName: managerProfile?.displayName || team.managerName || "",
      managerGender: managerProfile?.gender || "",
      managerAge: managerProfile?.age?.toString() || "",
      managerHometown: managerProfile?.hometown || "",
      managerStyleLabel: managerProfile?.managementStyle?.label || "",
    });
    autosavedTeamMetadataRef.current = {
      heritageFacts: normalizeHeritageFacts(team.heritageFacts || []),
      rivalries: normalizeRivalries(team.rivalries || []),
    };
    setIsHeritageFactsOpen(true);
    setIsRivalriesOpen(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setFormData(DEFAULT_FORM_DATA);
    autosavedTeamMetadataRef.current = null;
  };

  useEffect(() => {
    if (!editingTeam || !isModalOpen) return;

    const nextMetadata = {
      heritageFacts: normalizeHeritageFacts(formData.heritageFacts),
      rivalries: normalizeRivalries(formData.rivalries),
    };
    const previousMetadata =
      autosavedTeamMetadataRef.current ?? {
        heritageFacts: normalizeHeritageFacts(editingTeam.heritageFacts || []),
        rivalries: normalizeRivalries(editingTeam.rivalries || []),
      };

    if (teamMetadataMatches(previousMetadata, nextMetadata)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void updateTeam({
        ...editingTeam,
        heritageFacts: nextMetadata.heritageFacts.length
          ? nextMetadata.heritageFacts
          : undefined,
        rivalries: nextMetadata.rivalries.length
          ? nextMetadata.rivalries
          : undefined,
      })
        .then((savedTeam) => {
          autosavedTeamMetadataRef.current = nextMetadata;
          if (savedTeam) {
            setEditingTeam(savedTeam);
          }
        })
        .catch((err) => {
          console.error("Failed to auto-save team metadata:", err);
        });
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    editingTeam,
    formData.heritageFacts,
    formData.rivalries,
    isModalOpen,
    updateTeam,
  ]);

  const handleManagerSelectionChange = (managerId: string) => {
    const profile = managerProfilesById.get(managerId);
    setFormData((prev) => ({
      ...prev,
      managerId,
      managerDisplayName: profile?.displayName || "",
      managerGender: profile?.gender || "Male",
      managerAge: profile?.age?.toString() || "",
      managerHometown: profile?.hometown || "",
      managerStyleLabel: profile?.managementStyle?.label || "",
    }));
  };

  const persistManagerForTeam = async (team: Team): Promise<Team> => {
    const displayName = formData.managerDisplayName.trim();
    const selectedProfile = formData.managerId
      ? managerProfilesById.get(formData.managerId)
      : undefined;
    const managerAge = formData.managerAge
      ? parseInt(formData.managerAge, 10)
      : undefined;
    const profile = displayName
      ? await saveManagerProfile({
          managerId: selectedProfile?.managerId || undefined,
          displayName,
          gender: formData.managerGender.trim() || undefined,
          age:
            typeof managerAge === "number" && Number.isFinite(managerAge)
              ? managerAge
              : undefined,
          hometown: formData.managerHometown.trim() || undefined,
          createdByUser: true,
          defaultManager:
            selectedProfile?.defaultManager ??
            formData.managerId === getDefaultManagerIdForTeam(team.id),
          managementStyle: formData.managerStyleLabel.trim()
            ? { ...(selectedProfile?.managementStyle ?? {}), label: formData.managerStyleLabel.trim() }
            : selectedProfile?.managementStyle,
        })
      : await ensureDefaultManagerProfile(team);

    await saveManagerAssignment({
      managerId: profile.managerId,
      teamId: team.id,
      mode: "franchise",
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    setManagerProfiles((current) => {
      const withoutProfile = current.filter(
        (item) => item.managerId !== profile.managerId,
      );
      return [...withoutProfile, profile].sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );
    });
    setManagerAssignments((current) => [
      ...current.filter((assignment) => assignment.teamId !== team.id),
      {
        managerId: profile.managerId,
        teamId: team.id,
        mode: "franchise",
        instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      },
    ]);

    return updateTeam({
      ...team,
      managerId: profile.managerId,
      managerName: profile.displayName,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.abbreviation.trim()) return;

    setIsSaving(true);
    try {
      const normalizedHeritageFacts = normalizeHeritageFacts(formData.heritageFacts);
      const normalizedRivalries = normalizeRivalries(formData.rivalries);
      const teamData = {
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim().toUpperCase(),
        location: formData.location.trim(),
        nickname: formData.nickname.trim() || formData.name.trim(),
        stadium: formData.stadium.trim(),
        stadiumCapacity: formData.stadiumCapacity
          ? parseInt(formData.stadiumCapacity, 10)
          : undefined,
        colors: {
          primary: formData.primaryColor,
          secondary: formData.secondaryColor,
          accent: formData.accentColor || undefined,
        },
        foundedYear: formData.foundedYear
          ? parseInt(formData.foundedYear, 10)
          : undefined,
        championships: formData.championships
          ? parseInt(formData.championships, 10)
          : 0,
        backstory: formData.backstory.trim() || undefined,
        era: formData.era || undefined,
        cityVibe: formData.cityVibe.trim() || undefined,
        ballparkNickname: formData.ballparkNickname.trim() || undefined,
        heritageFacts: normalizedHeritageFacts.length
          ? normalizedHeritageFacts
          : undefined,
        rivalries: normalizedRivalries.length
          ? normalizedRivalries
          : undefined,
        leagueIds: editingTeam?.leagueIds || [],
        retiredNumbers: editingTeam?.retiredNumbers || [],
      };

      let savedTeam: Team;
      if (editingTeam) {
        savedTeam = await updateTeam({
          ...editingTeam,
          ...teamData,
        });
      } else {
        savedTeam = await createTeam(teamData);
      }
      await persistManagerForTeam(savedTeam);
      closeModal();
    } catch (err) {
      console.error("Failed to save team:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTeam(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  };

  const getTeamLeagues = (teamId: string) => {
    return leagues.filter((league) => league.teamIds.includes(teamId));
  };

  const sameLeagueTeams = useMemo(() => {
    if (!editingTeam) return [];

    const relatedLeagueIds = new Set([
      ...(editingTeam.leagueIds || []),
      ...leagues
        .filter((league) => league.teamIds.includes(editingTeam.id))
        .map((league) => league.id),
    ]);

    return teams
      .filter((team) => {
        if (team.id === editingTeam.id) return false;

        return (
          (team.leagueIds ?? []).some((leagueId) => relatedLeagueIds.has(leagueId)) ||
          leagues.some(
            (league) =>
              relatedLeagueIds.has(league.id) &&
              league.teamIds.includes(team.id),
          )
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [editingTeam, leagues, teams]);

  const availableRivalryTeams = useMemo(() => {
    const selectedOpponentIds = new Set(
      formData.rivalries.map((rivalry) => rivalry.opponentTeamId).filter(Boolean),
    );
    return sameLeagueTeams.filter((team) => !selectedOpponentIds.has(team.id));
  }, [formData.rivalries, sameLeagueTeams]);

  const addHeritageFact = () => {
    setFormData((prev) => {
      if (prev.heritageFacts.length >= HERITAGE_FACT_LIMIT) return prev;
      return {
        ...prev,
        heritageFacts: [...prev.heritageFacts, ""],
      };
    });
  };

  const updateHeritageFact = (index: number, value: string) => {
    setFormData((prev) => {
      const heritageFacts = [...prev.heritageFacts];
      heritageFacts[index] = value;
      return { ...prev, heritageFacts };
    });
  };

  const removeHeritageFact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      heritageFacts: prev.heritageFacts.filter((_, factIndex) => factIndex !== index),
    }));
  };

  const addRivalry = () => {
    const nextOpponent = availableRivalryTeams[0];
    if (!nextOpponent) return;

    setFormData((prev) => ({
      ...prev,
      rivalries: [
        ...prev.rivalries,
        {
          opponentTeamId: nextOpponent.id,
          intensity: 5,
          origin: "",
        },
      ],
    }));
  };

  const updateRivalry = (
    index: number,
    field: keyof TeamRivalry,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const rivalries = [...prev.rivalries];
      rivalries[index] = {
        ...rivalries[index],
        [field]: value,
      };
      return { ...prev, rivalries };
    });
  };

  const removeRivalry = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rivalries: prev.rivalries.filter((_, rivalryIndex) => rivalryIndex !== index),
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
          <span>Loading teams...</span>
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
            <Users className="w-6 h-6" style={{ color: "#5599FF" }} />
            <h1
              className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              TEAMS
            </h1>
          </div>
          <div className="ml-auto text-sm text-[#E8E8D8]/70">{teams.length} teams</div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={openCreateModal}
            className="bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] px-6 py-3 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold tracking-wide">CREATE NEW TEAM</span>
          </button>
        </div>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] text-center">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "#5599FF" }} />
            <h2 className="text-xl font-bold mb-2">No Teams Yet</h2>
            <p className="text-[#E8E8D8]/70">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {teams.map((team) => {
              const teamLeagues = getTeamLeagues(team.id);
              return (
                <div
                  key={team.id}
                  className="bg-[#556B55] border-4 border-[#4A6844] p-4 hover:border-[#5A8352] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] relative group"
                >
                  {/* Team Color Circle */}
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-3 border-4"
                    style={{
                      backgroundColor: team.colors.primary,
                      borderColor: team.colors.secondary,
                    }}
                  />

                  {/* Team Info */}
                  <div
                    className="text-sm font-bold text-center mb-1"
                    style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    {team.name}
                  </div>
                  <div className="text-xs text-[#E8E8D8]/60 text-center mb-2">
                    {team.abbreviation}
                  </div>
                  <div className="text-[10px] text-[#D4A020] text-center mb-2">
                    MGR {getAssignedManagerName(team)}
                  </div>

                  {/* League badges */}
                  {teamLeagues.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center mb-2">
                      {teamLeagues.slice(0, 2).map((league) => (
                        <span
                          key={league.id}
                          className="text-[8px] px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: league.color || "#5A8352",
                            color: "#fff",
                          }}
                        >
                          {league.name.substring(0, 8)}
                        </span>
                      ))}
                      {teamLeagues.length > 2 && (
                        <span className="text-[8px] text-[#E8E8D8]/50">
                          +{teamLeagues.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Visible on hover */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(team)}
                      className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                      title="Edit team"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    {deleteConfirmId === team.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 border-2 border-red-400 transition"
                          title="Confirm delete"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(team.id)}
                        className="p-1.5 bg-red-800 hover:bg-red-700 border-2 border-red-500/50 transition"
                        title="Delete team"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
                {editingTeam ? "Edit Team" : "Create New Team"}
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
              {/* Name & Abbreviation Row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Sirloins"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Abbreviation *</label>
                  <input
                    type="text"
                    value={formData.abbreviation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        abbreviation: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="SFG"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none uppercase"
                  />
                </div>
              </div>

              {/* Location & Nickname */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="e.g., Castleton"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Nickname</label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                    }
                    placeholder="e.g., Giants"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>

              {/* Stadium */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    <Building2 className="w-3 h-3 inline mr-1" />
                    Stadium
                  </label>
                  <input
                    type="text"
                    value={formData.stadium}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stadium: e.target.value }))
                    }
                    placeholder="e.g., Oracle Park"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Stadium Capacity</label>
                  <input
                    type="number"
                    value={formData.stadiumCapacity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stadiumCapacity: e.target.value }))
                    }
                    placeholder="e.g., 41500"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
              </div>

              <section className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold tracking-[0.18em] uppercase text-[#E8E8D8]">
                      Manager
                    </h3>
                    <p className="mt-1 text-xs text-[#E8E8D8]/60">
                      Create or assign the dugout identity used by pregame setup and Manager WPA.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4A020]">
                    Identity
                  </span>
                </div>

                <div>
                  <label htmlFor="team-manager-select" className="block text-sm font-bold mb-2">
                    Assign Manager
                  </label>
                  <select
                    id="team-manager-select"
                    value={formData.managerId}
                    onChange={(e) => handleManagerSelectionChange(e.target.value)}
                    className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                  >
                    <option value="">Create new manager</option>
                    {managerProfiles.map((manager) => (
                      <option key={manager.managerId} value={manager.managerId}>
                        {manager.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="manager-name" className="block text-sm font-bold mb-2">
                      Name
                    </label>
                    <input
                      id="manager-name"
                      type="text"
                      value={formData.managerDisplayName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managerDisplayName: e.target.value,
                        }))
                      }
                      placeholder="e.g., Marla Bench"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="manager-style" className="block text-sm font-bold mb-2">
                      Style Label
                    </label>
                    <input
                      id="manager-style"
                      type="text"
                      value={formData.managerStyleLabel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managerStyleLabel: e.target.value,
                        }))
                      }
                      placeholder="Balanced"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="manager-gender" className="block text-sm font-bold mb-2">
                      Gender
                    </label>
                    <select
                      id="manager-gender"
                      value={formData.managerGender}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managerGender: e.target.value,
                        }))
                      }
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    >
                      <option value="">Unspecified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Nonbinary">Nonbinary</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="manager-age" className="block text-sm font-bold mb-2">
                      Age
                    </label>
                    <input
                      id="manager-age"
                      type="number"
                      min="18"
                      max="99"
                      value={formData.managerAge}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managerAge: e.target.value,
                        }))
                      }
                      placeholder="52"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="manager-hometown" className="block text-sm font-bold mb-2">
                      Hometown
                    </label>
                    <input
                      id="manager-hometown"
                      type="text"
                      value={formData.managerHometown}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          managerHometown: e.target.value,
                        }))
                      }
                      placeholder="Denver, CO"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold tracking-[0.18em] uppercase text-[#E8E8D8]">
                      Editorial Identity
                    </h3>
                    <p className="mt-1 text-xs text-[#E8E8D8]/60">
                      Team flavor for reporter copy, lore, and matchup color.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4A020]">
                    Team
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="team-backstory" className="block text-sm font-bold">
                      Backstory
                    </label>
                    <span className="text-[10px] text-[#E8E8D8]/60">
                      {formData.backstory.length}/{TEAM_BACKSTORY_LIMIT}
                    </span>
                  </div>
                  <textarea
                    id="team-backstory"
                    value={formData.backstory}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        backstory: e.target.value.slice(0, TEAM_BACKSTORY_LIMIT),
                      }))
                    }
                    maxLength={TEAM_BACKSTORY_LIMIT}
                    rows={4}
                    placeholder="A concise team-card origin note for reporters."
                    className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="team-era" className="block text-sm font-bold mb-2">Era</label>
                    <select
                      id="team-era"
                      value={formData.era}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, era: e.target.value as EraFlavor | '' }))
                      }
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    >
                      <option value="">None</option>
                      {ERA_FLAVORS.map((era) => (
                        <option key={era} value={era}>
                          {ERA_FLAVOR_LABELS[era]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="team-city-vibe" className="block text-sm font-bold mb-2">
                      City Vibe
                    </label>
                    <input
                      id="team-city-vibe"
                      type="text"
                      value={formData.cityVibe}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, cityVibe: e.target.value }))
                      }
                      placeholder="e.g., Blue-collar river town"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="team-ballpark-nickname" className="block text-sm font-bold mb-2">
                      Ballpark Nickname
                    </label>
                    <input
                      id="team-ballpark-nickname"
                      type="text"
                      value={formData.ballparkNickname}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ballparkNickname: e.target.value }))
                      }
                      placeholder="e.g., The Cinderbox"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>
                </div>

                <div className="border-[3px] border-[#2d3d2f] bg-[#3F5A3A]/70">
                  <button
                    type="button"
                    onClick={() => setIsHeritageFactsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#4A6844]/70 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold tracking-[0.16em] uppercase">
                        Heritage Facts
                      </h4>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        Short lines describing the team&apos;s identity, tendencies, lore. 2-5 works best. Used by the beat reporter for color.
                      </p>
                    </div>
                    {isHeritageFactsOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#D4A020]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#D4A020]" />
                    )}
                  </button>

                  {isHeritageFactsOpen && (
                    <div className="space-y-3 border-t-[3px] border-[#2d3d2f] px-4 py-4">
                      {formData.heritageFacts.length === 0 && (
                        <p className="text-xs text-[#E8E8D8]/55">
                          Add a few quick identity beats for the reporter to pull from.
                        </p>
                      )}

                      {formData.heritageFacts.map((fact, index) => (
                        <div
                          key={`heritage-fact-${index}`}
                          className="flex items-center gap-3"
                        >
                          <input
                            type="text"
                            value={fact}
                            onChange={(e) => updateHeritageFact(index, e.target.value)}
                            placeholder="e.g., Lives for late-inning chaos"
                            className="w-full bg-[#2d3d2f] border-[3px] border-[#243124] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => removeHeritageFact(index)}
                            className="shrink-0 bg-red-900/70 hover:bg-red-800 border-[3px] border-red-400/50 p-2 transition"
                            aria-label={`Remove heritage fact ${index + 1}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addHeritageFact}
                        disabled={formData.heritageFacts.length >= HERITAGE_FACT_LIMIT}
                        className="inline-flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] border-[3px] border-[#E8E8D8]/70 px-4 py-2 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Add Fact
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-[3px] border-[#2d3d2f] bg-[#3F5A3A]/70">
                  <button
                    type="button"
                    onClick={() => setIsRivalriesOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#4A6844]/70 transition"
                  >
                    <div>
                      <h4 className="text-sm font-bold tracking-[0.16em] uppercase">
                        Rivalries
                      </h4>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        Teams this franchise considers rivals, and how intense. Asymmetric — other teams have their own list.
                      </p>
                    </div>
                    {isRivalriesOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#D4A020]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#D4A020]" />
                    )}
                  </button>

                  {isRivalriesOpen && (
                    <div className="space-y-3 border-t-[3px] border-[#2d3d2f] px-4 py-4">
                      {formData.rivalries.length === 0 && (
                        <p className="text-xs text-[#E8E8D8]/55">
                          Rivalries are available once this team shares a league with other clubs.
                        </p>
                      )}

                      {formData.rivalries.map((rivalry, index) => {
                        const selectedByOtherRows = new Set(
                          formData.rivalries
                            .filter((_, rivalryIndex) => rivalryIndex !== index)
                            .map((entry) => entry.opponentTeamId)
                            .filter(Boolean),
                        );
                        const opponentOptions = sameLeagueTeams.filter(
                          (team) =>
                            team.id === rivalry.opponentTeamId ||
                            !selectedByOtherRows.has(team.id),
                        );

                        return (
                          <div
                            key={`${rivalry.opponentTeamId || "rivalry"}-${index}`}
                            className="grid gap-3 border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3 md:grid-cols-[1.5fr_1fr_1.5fr_auto]"
                          >
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/65">
                                Opponent
                              </label>
                              <select
                                value={rivalry.opponentTeamId}
                                onChange={(e) =>
                                  updateRivalry(index, "opponentTeamId", e.target.value)
                                }
                                className="w-full bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                              >
                                {opponentOptions.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/65">
                                Intensity
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={RIVALRY_INTENSITY_MIN}
                                  max={RIVALRY_INTENSITY_MAX}
                                  step={1}
                                  value={rivalry.intensity}
                                  onChange={(e) =>
                                    updateRivalry(index, "intensity", Number(e.target.value))
                                  }
                                  className="w-full accent-[#D4A020]"
                                />
                                <span className="w-8 text-right text-sm font-bold text-[#D4A020]">
                                  {rivalry.intensity}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/65">
                                Origin
                              </label>
                              <input
                                type="text"
                                value={rivalry.origin || ""}
                                onChange={(e) => updateRivalry(index, "origin", e.target.value)}
                                placeholder="e.g., 1987 brawl"
                                className="w-full bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeRivalry(index)}
                                className="bg-red-900/70 hover:bg-red-800 border-[3px] border-red-400/50 p-2 transition"
                                aria-label={`Remove rivalry ${index + 1}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={addRivalry}
                        disabled={availableRivalryTeams.length === 0}
                        className="inline-flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] border-[3px] border-[#E8E8D8]/70 px-4 py-2 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Add Rivalry
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Colors */}
              <div>
                <label className="block text-sm font-bold mb-2">Team Colors</label>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Secondary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.accentColor || "#FFFFFF"}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded cursor-pointer border-2 border-[#3F5A3A]"
                    />
                    <span className="text-xs text-[#E8E8D8]/70">Accent</span>
                  </div>

                  {/* Preview */}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-[#E8E8D8]/70">Preview:</span>
                    <div
                      className="w-10 h-10 rounded-full border-4"
                      style={{
                        backgroundColor: formData.primaryColor,
                        borderColor: formData.secondaryColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Founded Year</label>
                  <input
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, foundedYear: e.target.value }))
                    }
                    placeholder="e.g., 1883"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Championships</label>
                  <input
                    type="number"
                    value={formData.championships}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, championships: e.target.value }))
                    }
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                  />
                </div>
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
                disabled={!formData.name.trim() || !formData.abbreviation.trim() || isSaving}
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
                    {editingTeam ? "Save Changes" : "Create Team"}
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
