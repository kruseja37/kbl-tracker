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
import { BallparkShell } from "../components/ballpark";
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
import { getParkByName } from "../../../data/parkLookup";
import { HISTORICAL_ARCHETYPES } from "../../../data/historicalArchetypes";
import {
  applyIdentitySelection,
  BANDS,
  composeIdentity,
  identityCapShift,
  shiftLuxuryCaps,
  type Band,
  type BandPriorities,
  type TeamCapIdentity,
} from "../../../engines/leagueConstruction";
import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_CAP_TABLES,
  type ModStat,
  type TierKey,
} from "../../../data/tierParams";
import {
  isSavedAuctionMutationGuardMessage,
  useSavedAuctionMutationGuard,
} from "../utils/savedAuctionMutationGuard";

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
const CAP_IDENTITY_PRIORITY_MIN = 0;
const CAP_IDENTITY_PRIORITY_MAX = 5;
const CAP_IDENTITY_MOD_OPTIONS = Object.keys(CAP_MODIFICATION_FRACTIONS)
  .filter((name) => name !== "--")
  .sort((a, b) => a.localeCompare(b));

const CAP_IDENTITY_STAT_GROUPS: Array<{ label: string; stats: ModStat[] }> = [
  { label: "Hitters", stats: ["POW", "CON", "SPD", "FLD", "ARM"] },
  { label: "Rotation", stats: ["RVEL", "RJNK", "RACC"] },
  { label: "Bullpen", stats: ["PVEL", "PJNK", "PACC"] },
];

const CAP_IDENTITY_STAT_LABELS: Record<ModStat, string> = {
  POW: "POW",
  CON: "CON",
  SPD: "SPD",
  FLD: "FLD",
  ARM: "ARM",
  RVEL: "VEL",
  RJNK: "JNK",
  RACC: "ACC",
  PVEL: "VEL",
  PJNK: "JNK",
  PACC: "ACC",
};

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
  capIdentity: TeamCapIdentity;
  farmCapIdentity: TeamCapIdentity;
}

function createEmptyBandPriorities(): BandPriorities {
  return Object.fromEntries(BANDS.map((band) => [band, 0])) as BandPriorities;
}

function normalizeIdentityMods(mods: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const mod of mods ?? []) {
    if (!mod || mod === "--" || seen.has(mod)) continue;
    seen.add(mod);
    normalized.push(mod);
    if (normalized.length === 2) break;
  }
  return normalized;
}

function normalizeCapIdentity(identity?: TeamCapIdentity): TeamCapIdentity {
  // TEAMIDGUARD (2026-07-09): carry unknown fields (rawShift, etc.) through instead of
  // reconstructing the object -- archetype-derived identities carry a precise rawShift that
  // must survive being seeded into the edit form.
  return {
    ...identity,
    bandPriorities: {
      ...createEmptyBandPriorities(),
      ...(identity?.bandPriorities ?? {}),
    },
    increase: normalizeIdentityMods(identity?.increase),
    decrease: normalizeIdentityMods(identity?.decrease),
  };
}

function createEmptyCapIdentity(): TeamCapIdentity {
  return normalizeCapIdentity();
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
  capIdentity: createEmptyCapIdentity(),
  farmCapIdentity: createEmptyCapIdentity(),
};

function createDefaultFormData(): TeamFormData {
  return {
    ...DEFAULT_FORM_DATA,
    heritageFacts: [],
    rivalries: [],
    capIdentity: createEmptyCapIdentity(),
    farmCapIdentity: createEmptyCapIdentity(),
  };
}

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

function formatSignedPercent(value: number): string {
  const percent = value * 100;
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
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
  const [formData, setFormData] = useState<TeamFormData>(() => createDefaultFormData());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCapIdentityOpen, setIsCapIdentityOpen] = useState(true);
  const [isFarmCapIdentityOpen, setIsFarmCapIdentityOpen] = useState(true);
  const [isHeritageFactsOpen, setIsHeritageFactsOpen] = useState(true);
  const [isRivalriesOpen, setIsRivalriesOpen] = useState(true);
  const [managerProfiles, setManagerProfiles] = useState<ManagerProfile[]>([]);
  const [managerAssignments, setManagerAssignments] = useState<ManagerAssignment[]>([]);
  const autosavedTeamMetadataRef = useRef<{
    heritageFacts: string[];
    rivalries: TeamRivalry[];
  } | null>(null);
  // TEAMIDGUARD (2026-07-09): tracks whether the user touched the MLB cap-identity form
  // fields (band priorities / increase / decrease) this modal session. Reset on open; only
  // the non-archetype legacy path consults it (archetype-owned teams always preserve).
  const capIdentityTouchedRef = useRef(false);
  const managerProfilesById = useMemo(
    () => new Map(managerProfiles.map((profile) => [profile.managerId, profile])),
    [managerProfiles],
  );
  const allLeagueIds = useMemo(() => leagues.map((league) => league.id), [leagues]);
  const savedAuctionGuard = useSavedAuctionMutationGuard(allLeagueIds);

  const getTeamMutationLeagueIds = (team: Team | null | undefined) => {
    if (!team) return [];
    const ids = new Set(team.leagueIds ?? []);
    leagues.forEach((league) => {
      if (league.teamIds.includes(team.id)) ids.add(league.id);
    });
    return [...ids];
  };

  const editingTeamMutationLeagueIds = useMemo(
    () => getTeamMutationLeagueIds(editingTeam),
    [editingTeam, leagues],
  );
  const isMutationBlockedForLeagueIds = (leagueIds: string[]) =>
    leagueIds.length > 0 &&
    (!savedAuctionGuard.checked ||
      Boolean(savedAuctionGuard.lookupError) ||
      leagueIds.some((leagueId) => savedAuctionGuard.lockedLeagueIds.includes(leagueId)));
  const savedAuctionMutationMessage = savedAuctionGuard.message;
  const editingTeamMutationBlocked = isMutationBlockedForLeagueIds(editingTeamMutationLeagueIds);
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
    setSaveError(null);
    setFormData(createDefaultFormData());
    setIsCapIdentityOpen(true);
    setIsFarmCapIdentityOpen(true);
    setIsHeritageFactsOpen(true);
    setIsRivalriesOpen(true);
    autosavedTeamMetadataRef.current = null;
    capIdentityTouchedRef.current = false;
    setIsModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    const managerId = getAssignedManagerId(team);
    const managerProfile = managerProfilesById.get(managerId);
    setEditingTeam(team);
    setSaveError(null);
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
      capIdentity: normalizeCapIdentity(team.capIdentity),
      farmCapIdentity: normalizeCapIdentity(team.farmCapIdentity),
    });
    autosavedTeamMetadataRef.current = {
      heritageFacts: normalizeHeritageFacts(team.heritageFacts || []),
      rivalries: normalizeRivalries(team.rivalries || []),
    };
    setIsHeritageFactsOpen(true);
    setIsRivalriesOpen(true);
    setIsCapIdentityOpen(true);
    setIsFarmCapIdentityOpen(true);
    capIdentityTouchedRef.current = false;
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setSaveError(null);
    setFormData(createDefaultFormData());
    autosavedTeamMetadataRef.current = null;
  };

  useEffect(() => {
    if (!isModalOpen || !editingTeamMutationBlocked || !savedAuctionMutationMessage) return;
    setSaveError(savedAuctionMutationMessage);
  }, [editingTeamMutationBlocked, isModalOpen, savedAuctionMutationMessage]);

  useEffect(() => {
    setSaveError((current) => {
      if (!isSavedAuctionMutationGuardMessage(current)) return current;
      return savedAuctionGuard.blocked ? savedAuctionMutationMessage : null;
    });
  }, [savedAuctionGuard.blocked, savedAuctionMutationMessage]);

  useEffect(() => {
    if (!editingTeam || !isModalOpen) return;
    if (editingTeamMutationBlocked) {
      if (savedAuctionMutationMessage) setSaveError(savedAuctionMutationMessage);
      return;
    }

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
    editingTeamMutationBlocked,
    isModalOpen,
    savedAuctionMutationMessage,
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
    if (!capIdentityValidation.identity) return;
    if (!farmCapIdentityValidation.identity) return;
    if (editingTeamMutationBlocked) {
      setSaveError(savedAuctionMutationMessage ?? "League Builder changes are temporarily locked.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const normalizedHeritageFacts = normalizeHeritageFacts(formData.heritageFacts);
      const normalizedRivalries = normalizeRivalries(formData.rivalries);
      // TEAMIDGUARD (2026-07-09): one writer for tax identity. Archetype-owned teams
      // (team.mlbArchetypeKey set) never have capIdentity rebuilt here -- the archetype
      // system (selectTeamArchetype / archetypeToCapIdentity) is the sole writer, so this
      // legacy editor must preserve the stored value byte-identical no matter what else on
      // the form changed. Non-archetype teams keep the legacy rebuild, but only when the
      // MLB identity form fields were actually touched this session; an untouched section
      // preserves the stored capIdentity verbatim (including rawShift).
      const isArchetypeOwnedForSave = Boolean(editingTeam?.mlbArchetypeKey);
      const capIdentity: TeamCapIdentity | undefined =
        isArchetypeOwnedForSave || (editingTeam && !capIdentityTouchedRef.current)
          ? editingTeam?.capIdentity
          : {
              bandPriorities: {
                ...createEmptyBandPriorities(),
                ...(formData.capIdentity.bandPriorities ?? {}),
              },
              increase: capIdentityValidation.identity.increase,
              decrease: capIdentityValidation.identity.decrease,
            };
      const farmCapIdentity: TeamCapIdentity = {
        bandPriorities: {
          ...createEmptyBandPriorities(),
          ...(formData.farmCapIdentity.bandPriorities ?? {}),
        },
        increase: farmCapIdentityValidation.identity.increase,
        decrease: farmCapIdentityValidation.identity.decrease,
      };
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
        capIdentity,
        farmCapIdentity,
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
      setSaveError(err instanceof Error ? err.message : "Failed to save team.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const team = teams.find((candidate) => candidate.id === id);
    if (isMutationBlockedForLeagueIds(getTeamMutationLeagueIds(team))) {
      setSaveError(savedAuctionMutationMessage ?? "League Builder changes are temporarily locked.");
      setDeleteConfirmId(null);
      return;
    }
    try {
      await removeTeam(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete team:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to delete team.");
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
  const stadiumDimensionMatch = useMemo(() => {
    const stadiumName = formData.stadium.trim();
    return stadiumName ? getParkByName(stadiumName) : undefined;
  }, [formData.stadium]);
  const capIdentityValidation = useMemo(() => {
    try {
      return {
        identity: applyIdentitySelection({
          increase: formData.capIdentity.increase,
          decrease: formData.capIdentity.decrease,
        }),
        error: "",
      };
    } catch (err) {
      return {
        identity: null,
        error: err instanceof Error ? err.message : "Invalid team identity selection",
      };
    }
  }, [formData.capIdentity.decrease, formData.capIdentity.increase]);
  const farmCapIdentityValidation = useMemo(() => {
    try {
      return {
        identity: applyIdentitySelection({
          increase: formData.farmCapIdentity.increase,
          decrease: formData.farmCapIdentity.decrease,
        }),
        error: "",
      };
    } catch (err) {
      return {
        identity: null,
        error: err instanceof Error ? err.message : "Invalid farm identity selection",
      };
    }
  }, [formData.farmCapIdentity.decrease, formData.farmCapIdentity.increase]);
  const previewTier = useMemo<TierKey>(() => {
    const leagueId = editingTeam?.leagueIds?.[0];
    if (!leagueId) return "juiced";
    return leagues.find((league) => league.id === leagueId)?.tier ?? "juiced";
  }, [editingTeam?.leagueIds, leagues]);
  const capShiftPreview = useMemo(() => {
    if (!capIdentityValidation.identity) return null;
    return identityCapShift(capIdentityValidation.identity);
  }, [capIdentityValidation.identity]);
  const shiftedCapPreviewRows = useMemo(() => {
    if (!capIdentityValidation.identity) return [];
    const baseCaps = LUXURY_CAP_TABLES[previewTier];
    const shiftedCaps = shiftLuxuryCaps(baseCaps, capIdentityValidation.identity);
    return shiftedCaps
      .map((row, index) => ({ base: baseCaps[index], shifted: row }))
      .filter(({ base, shifted }) => base && Math.abs(shifted.cap - base.cap) >= 0.01)
      .slice(0, 2);
  }, [capIdentityValidation.identity, previewTier]);
  const farmCapShiftPreview = useMemo(() => {
    if (!farmCapIdentityValidation.identity) return null;
    return identityCapShift(farmCapIdentityValidation.identity);
  }, [farmCapIdentityValidation.identity]);
  const farmShiftedCapPreviewRows = useMemo(() => {
    if (!farmCapIdentityValidation.identity) return [];
    const baseCaps = LUXURY_CAP_TABLES[previewTier];
    const shiftedCaps = shiftLuxuryCaps(baseCaps, farmCapIdentityValidation.identity);
    return shiftedCaps
      .map((row, index) => ({ base: baseCaps[index], shifted: row }))
      .filter(({ base, shifted }) => base && Math.abs(shifted.cap - base.cap) >= 0.01)
      .slice(0, 2);
  }, [farmCapIdentityValidation.identity, previewTier]);

  // TEAMIDGUARD (2026-07-09): archetype-owned teams render the MLB identity section
  // read-only and display the actual archetype shift (via rawShift, not the coarse
  // CAP_MODIFICATION_FRACTIONS table).
  const isArchetypeOwned = Boolean(editingTeam?.mlbArchetypeKey);
  const ownedArchetype = useMemo(
    () =>
      isArchetypeOwned
        ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === editingTeam?.mlbArchetypeKey)
        : undefined,
    [isArchetypeOwned, editingTeam?.mlbArchetypeKey],
  );
  const archetypeCapShiftPreview = useMemo(() => {
    if (!isArchetypeOwned) return null;
    return identityCapShift(formData.capIdentity);
  }, [isArchetypeOwned, formData.capIdentity]);

  const updateCapIdentityPriority = (band: Band, value: number) => {
    capIdentityTouchedRef.current = true;
    const nextValue = Math.max(
      CAP_IDENTITY_PRIORITY_MIN,
      Math.min(CAP_IDENTITY_PRIORITY_MAX, Math.round(value)),
    );
    setFormData((prev) => ({
      ...prev,
      capIdentity: {
        ...prev.capIdentity,
        bandPriorities: {
          ...createEmptyBandPriorities(),
          ...(prev.capIdentity.bandPriorities ?? {}),
          [band]: nextValue,
        },
      },
    }));
  };

  const updateCapIdentityMod = (
    kind: "increase" | "decrease",
    index: number,
    value: string,
  ) => {
    capIdentityTouchedRef.current = true;
    setFormData((prev) => {
      const slots = [
        prev.capIdentity[kind][0] ?? "",
        prev.capIdentity[kind][1] ?? "",
      ];
      slots[index] = value;
      return {
        ...prev,
        capIdentity: {
          ...prev.capIdentity,
          [kind]: normalizeIdentityMods(slots),
        },
      };
    });
  };

  const updateFarmCapIdentityPriority = (band: Band, value: number) => {
    const nextValue = Math.max(
      CAP_IDENTITY_PRIORITY_MIN,
      Math.min(CAP_IDENTITY_PRIORITY_MAX, Math.round(value)),
    );
    setFormData((prev) => ({
      ...prev,
      farmCapIdentity: {
        ...prev.farmCapIdentity,
        bandPriorities: {
          ...createEmptyBandPriorities(),
          ...(prev.farmCapIdentity.bandPriorities ?? {}),
          [band]: nextValue,
        },
      },
    }));
  };

  const updateFarmCapIdentityMod = (
    kind: "increase" | "decrease",
    index: number,
    value: string,
  ) => {
    setFormData((prev) => {
      const slots = [
        prev.farmCapIdentity[kind][0] ?? "",
        prev.farmCapIdentity[kind][1] ?? "",
      ];
      slots[index] = value;
      return {
        ...prev,
        farmCapIdentity: {
          ...prev.farmCapIdentity,
          [kind]: normalizeIdentityMods(slots),
        },
      };
    });
  };

  const suggestCapIdentityFromPriorities = () => {
    capIdentityTouchedRef.current = true;
    setFormData((prev) => {
      const bandPriorities = {
        ...createEmptyBandPriorities(),
        ...(prev.capIdentity.bandPriorities ?? {}),
      };
      const suggested = composeIdentity(bandPriorities);
      return {
        ...prev,
        capIdentity: {
          ...prev.capIdentity,
          bandPriorities,
          increase: suggested.increase,
        },
      };
    });
  };

  const suggestFarmCapIdentityFromPriorities = () => {
    setFormData((prev) => {
      const bandPriorities = {
        ...createEmptyBandPriorities(),
        ...(prev.farmCapIdentity.bandPriorities ?? {}),
      };
      const suggested = composeIdentity(bandPriorities);
      return {
        ...prev,
        farmCapIdentity: {
          ...prev.farmCapIdentity,
          bandPriorities,
          increase: suggested.increase,
        },
      };
    });
  };

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
    <BallparkShell
      onBack={() => navigate("/league-builder")}
      icon={Users}
      iconColor="#5599FF"
      title="TEAMS"
      rightSlot={
        <div className="ml-auto text-sm text-[#E8E8D8]/70">
          {teams.length} teams
        </div>
      }
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
            {saveError && (
              <div className="mx-6 mt-4 bg-red-900/50 border-4 border-red-500 p-3 text-sm text-red-100">
                {saveError}
              </div>
            )}

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
              <div className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-3 text-[11px] leading-snug text-[#E8E8D8]/75">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#C4A853]">Stadium source</span>
                  <span className="border border-[#E8E8D8]/25 bg-[#3F5A3A] px-2 py-0.5 text-[9px] font-bold text-[#E8E8D8]/80">
                    MODE 2 COPY
                  </span>
                  <span className={`border px-2 py-0.5 text-[9px] font-bold ${
                    stadiumDimensionMatch
                      ? 'border-[#88DD44]/50 bg-[#274627] text-[#A8F08A]'
                      : 'border-[#FFD27A]/50 bg-[#5A5130] text-[#FFEFB5]'
                  }`}>
                    {stadiumDimensionMatch ? 'SMB4 MATCH' : 'DIMENSIONS MISSING'}
                  </span>
                </div>
                {stadiumDimensionMatch ? (
                  <div className="mt-2">
                    {stadiumDimensionMatch.name}: LF {stadiumDimensionMatch.lf} · CF {stadiumDimensionMatch.cf} · RF {stadiumDimensionMatch.rf}
                  </div>
                ) : (
                  <div className="mt-2">
                    Mode 2 copies this name; dimensions and seed factors stay untrusted unless it matches the SMB4 park database.
                  </div>
                )}
                <div className="mt-1 text-[#E8E8D8]/55">
                  Custom dimensions and adaptive park-factor persistence remain blocked.
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

              <section className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-4 space-y-4">
                <div className="border-[3px] border-[#2d3d2f] bg-[#3F5A3A]/70">
                  <button
                    type="button"
                    onClick={() => setIsCapIdentityOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#4A6844]/70 transition"
                  >
                    <div>
                      <h3 className="text-sm font-bold tracking-[0.16em] uppercase">
                        Team Identity (Cap)
                      </h3>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        Band priority, cap-mod stack, and shifted luxury-cap preview.
                      </p>
                    </div>
                    {isCapIdentityOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#D4A020]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#D4A020]" />
                    )}
                  </button>

                  {isCapIdentityOpen && isArchetypeOwned && (
                    // TEAMIDGUARD (2026-07-09): archetype is the sole writer of capIdentity for
                    // archetype-owned teams -- this section is read-only, and the shift values
                    // shown come from the actual stored rawShift, not the coarse mod table.
                    <div
                      data-testid="cap-identity-readonly"
                      className="space-y-4 border-t-[3px] border-[#2d3d2f] px-4 py-4"
                    >
                      <div className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3">
                        <h4 className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                          {ownedArchetype?.name ?? "Archetype"}
                        </h4>
                        <p className="text-xs text-[#E8E8D8]/60">
                          Set by archetype — change it in Draft Setup.
                        </p>
                      </div>

                      <div className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3">
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                          Cap Shift Preview
                        </h4>
                        {archetypeCapShiftPreview && CAP_IDENTITY_STAT_GROUPS.some((group) =>
                          group.stats.some((stat) => Math.abs(archetypeCapShiftPreview[stat]) > 0.000001),
                        ) ? (
                          <div className="space-y-2">
                            {CAP_IDENTITY_STAT_GROUPS.map((group) => {
                              if (!archetypeCapShiftPreview) return null;
                              const entries = group.stats.filter(
                                (stat) => Math.abs(archetypeCapShiftPreview[stat]) > 0.000001,
                              );
                              if (entries.length === 0) return null;
                              return (
                                <div key={group.label} className="flex flex-wrap items-center gap-2">
                                  <span className="w-20 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D4A020]">
                                    {group.label}
                                  </span>
                                  {entries.map((stat) => (
                                    <span
                                      key={stat}
                                      className="border border-[#E8E8D8]/25 bg-[#3F5A3A] px-2 py-1 text-xs font-bold"
                                    >
                                      {CAP_IDENTITY_STAT_LABELS[stat]} {formatSignedPercent(archetypeCapShiftPreview[stat])}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#E8E8D8]/55">No cap shifts selected.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {isCapIdentityOpen && !isArchetypeOwned && (
                    <div className="space-y-4 border-t-[3px] border-[#2d3d2f] px-4 py-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {BANDS.map((band) => {
                          const priority = formData.capIdentity.bandPriorities?.[band] ?? 0;
                          return (
                            <div
                              key={band}
                              className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                                  {band}
                                </label>
                                <input
                                  type="number"
                                  min={CAP_IDENTITY_PRIORITY_MIN}
                                  max={CAP_IDENTITY_PRIORITY_MAX}
                                  step={1}
                                  value={priority}
                                  onChange={(e) =>
                                    updateCapIdentityPriority(band, Number(e.target.value))
                                  }
                                  className="w-14 bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-1 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                                />
                              </div>
                              <input
                                type="range"
                                min={CAP_IDENTITY_PRIORITY_MIN}
                                max={CAP_IDENTITY_PRIORITY_MAX}
                                step={1}
                                value={priority}
                                onChange={(e) =>
                                  updateCapIdentityPriority(band, Number(e.target.value))
                                }
                                className="w-full accent-[#D4A020]"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={suggestCapIdentityFromPriorities}
                          className="inline-flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] border-[3px] border-[#E8E8D8]/70 px-4 py-2 text-sm font-bold transition"
                        >
                          <Check className="w-4 h-4" />
                          Suggest from priorities
                        </button>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#D4A020]">
                          Tier {previewTier.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {(["increase", "decrease"] as const).map((kind) => {
                          const selected = [
                            formData.capIdentity[kind][0] ?? "",
                            formData.capIdentity[kind][1] ?? "",
                          ];
                          return (
                            <div
                              key={kind}
                              className="space-y-3 border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3"
                            >
                              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                                {kind === "increase" ? "Increase" : "Decrease"}
                              </h4>
                              {[0, 1].map((slotIndex) => (
                                <select
                                  key={`${kind}-${slotIndex}`}
                                  value={selected[slotIndex]}
                                  onChange={(e) =>
                                    updateCapIdentityMod(kind, slotIndex, e.target.value)
                                  }
                                  className="w-full bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                                  aria-label={`${kind} cap modification ${slotIndex + 1}`}
                                >
                                  <option value="">-- none --</option>
                                  {CAP_IDENTITY_MOD_OPTIONS.map((modName) => (
                                    <option
                                      key={modName}
                                      value={modName}
                                      disabled={
                                        selected.some(
                                          (candidate, candidateIndex) =>
                                            candidateIndex !== slotIndex && candidate === modName,
                                        )
                                      }
                                    >
                                      {modName}
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          );
                        })}
                      </div>

                      {capIdentityValidation.error && (
                        <div className="border-[3px] border-red-400/60 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                          {capIdentityValidation.error}
                        </div>
                      )}

                      <div className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3">
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                          Cap Shift Preview
                        </h4>
                        {capShiftPreview && CAP_IDENTITY_STAT_GROUPS.some((group) =>
                          group.stats.some((stat) => Math.abs(capShiftPreview[stat]) > 0.000001),
                        ) ? (
                          <div className="space-y-2">
                            {CAP_IDENTITY_STAT_GROUPS.map((group) => {
                              if (!capShiftPreview) return null;
                              const entries = group.stats.filter(
                                (stat) => Math.abs(capShiftPreview[stat]) > 0.000001,
                              );
                              if (entries.length === 0) return null;
                              return (
                                <div key={group.label} className="flex flex-wrap items-center gap-2">
                                  <span className="w-20 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D4A020]">
                                    {group.label}
                                  </span>
                                  {entries.map((stat) => (
                                    <span
                                      key={stat}
                                      className="border border-[#E8E8D8]/25 bg-[#3F5A3A] px-2 py-1 text-xs font-bold"
                                    >
                                      {CAP_IDENTITY_STAT_LABELS[stat]} {formatSignedPercent(capShiftPreview[stat])}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#E8E8D8]/55">No cap shifts selected.</p>
                        )}

                        {shiftedCapPreviewRows.length > 0 && (
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {shiftedCapPreviewRows.map(({ base, shifted }) => (
                              <div
                                key={`${shifted.group}-${shifted.stat}`}
                                className="border border-[#E8E8D8]/20 bg-[#3F5A3A]/80 px-3 py-2 text-xs"
                              >
                                <div className="font-bold uppercase tracking-[0.12em] text-[#E8E8D8]/75">
                                  {shifted.group} {shifted.stat}
                                </div>
                                <div className="mt-1 text-[#D4A020]">
                                  {base.cap.toFixed(1)} → {shifted.cap.toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-4 space-y-4">
                <div className="border-[3px] border-[#2d3d2f] bg-[#3F5A3A]/70">
                  <button
                    type="button"
                    onClick={() => setIsFarmCapIdentityOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#4A6844]/70 transition"
                  >
                    <div>
                      <h3 className="text-sm font-bold tracking-[0.16em] uppercase">
                        Farm Identity (Cap)
                      </h3>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        Farm band priority, cap-mod stack, and shifted luxury-cap preview.
                      </p>
                    </div>
                    {isFarmCapIdentityOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#D4A020]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#D4A020]" />
                    )}
                  </button>

                  {isFarmCapIdentityOpen && (
                    <div className="space-y-4 border-t-[3px] border-[#2d3d2f] px-4 py-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {BANDS.map((band) => {
                          const priority = formData.farmCapIdentity.bandPriorities?.[band] ?? 0;
                          return (
                            <div
                              key={band}
                              className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                                  {band}
                                </label>
                                <input
                                  type="number"
                                  min={CAP_IDENTITY_PRIORITY_MIN}
                                  max={CAP_IDENTITY_PRIORITY_MAX}
                                  step={1}
                                  value={priority}
                                  onChange={(e) =>
                                    updateFarmCapIdentityPriority(band, Number(e.target.value))
                                  }
                                  aria-label={`Farm ${band} priority`}
                                  className="w-14 bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-1 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                                />
                              </div>
                              <input
                                type="range"
                                min={CAP_IDENTITY_PRIORITY_MIN}
                                max={CAP_IDENTITY_PRIORITY_MAX}
                                step={1}
                                value={priority}
                                onChange={(e) =>
                                  updateFarmCapIdentityPriority(band, Number(e.target.value))
                                }
                                aria-label={`Farm ${band} priority slider`}
                                className="w-full accent-[#D4A020]"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={suggestFarmCapIdentityFromPriorities}
                          className="inline-flex items-center gap-2 bg-[#5A8352] hover:bg-[#4A6844] border-[3px] border-[#E8E8D8]/70 px-4 py-2 text-sm font-bold transition"
                        >
                          <Check className="w-4 h-4" />
                          Suggest farm from priorities
                        </button>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#D4A020]">
                          Tier {previewTier.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {(["increase", "decrease"] as const).map((kind) => {
                          const selected = [
                            formData.farmCapIdentity[kind][0] ?? "",
                            formData.farmCapIdentity[kind][1] ?? "",
                          ];
                          return (
                            <div
                              key={kind}
                              className="space-y-3 border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3"
                            >
                              <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                                Farm {kind === "increase" ? "Increase" : "Decrease"}
                              </h4>
                              {[0, 1].map((slotIndex) => (
                                <select
                                  key={`${kind}-${slotIndex}`}
                                  value={selected[slotIndex]}
                                  onChange={(e) =>
                                    updateFarmCapIdentityMod(kind, slotIndex, e.target.value)
                                  }
                                  className="w-full bg-[#3F5A3A] border-[3px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                                  aria-label={`Farm ${kind} cap modification ${slotIndex + 1}`}
                                >
                                  <option value="">-- none --</option>
                                  {CAP_IDENTITY_MOD_OPTIONS.map((modName) => (
                                    <option
                                      key={modName}
                                      value={modName}
                                      disabled={
                                        selected.some(
                                          (candidate, candidateIndex) =>
                                            candidateIndex !== slotIndex && candidate === modName,
                                        )
                                      }
                                    >
                                      {modName}
                                    </option>
                                  ))}
                                </select>
                              ))}
                            </div>
                          );
                        })}
                      </div>

                      {farmCapIdentityValidation.error && (
                        <div className="border-[3px] border-red-400/60 bg-red-950/40 px-3 py-2 text-sm text-red-100">
                          {farmCapIdentityValidation.error}
                        </div>
                      )}

                      <div className="border-[3px] border-[#243124] bg-[#2d3d2f]/70 p-3">
                        <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#E8E8D8]/75">
                          Farm Cap Shift Preview
                        </h4>
                        {farmCapShiftPreview && CAP_IDENTITY_STAT_GROUPS.some((group) =>
                          group.stats.some((stat) => Math.abs(farmCapShiftPreview[stat]) > 0.000001),
                        ) ? (
                          <div className="space-y-2">
                            {CAP_IDENTITY_STAT_GROUPS.map((group) => {
                              if (!farmCapShiftPreview) return null;
                              const entries = group.stats.filter(
                                (stat) => Math.abs(farmCapShiftPreview[stat]) > 0.000001,
                              );
                              if (entries.length === 0) return null;
                              return (
                                <div key={group.label} className="flex flex-wrap items-center gap-2">
                                  <span className="w-20 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D4A020]">
                                    {group.label}
                                  </span>
                                  {entries.map((stat) => (
                                    <span
                                      key={stat}
                                      className="border border-[#E8E8D8]/25 bg-[#3F5A3A] px-2 py-1 text-xs font-bold"
                                    >
                                      {CAP_IDENTITY_STAT_LABELS[stat]} {formatSignedPercent(farmCapShiftPreview[stat])}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#E8E8D8]/55">No farm cap shifts selected.</p>
                        )}

                        {farmShiftedCapPreviewRows.length > 0 && (
                          <div className="mt-4 grid gap-2 md:grid-cols-2">
                            {farmShiftedCapPreviewRows.map(({ base, shifted }) => (
                              <div
                                key={`${shifted.group}-${shifted.stat}`}
                                className="border border-[#E8E8D8]/20 bg-[#3F5A3A]/80 px-3 py-2 text-xs"
                              >
                                <div className="font-bold uppercase tracking-[0.12em] text-[#E8E8D8]/75">
                                  {shifted.group} {shifted.stat}
                                </div>
                                <div className="mt-1 text-[#D4A020]">
                                  {base.cap.toFixed(1)} → {shifted.cap.toFixed(1)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
                disabled={
                  !formData.name.trim() ||
                  !formData.abbreviation.trim() ||
                  Boolean(capIdentityValidation.error) ||
                  Boolean(farmCapIdentityValidation.error) ||
                  editingTeamMutationBlocked ||
                  isSaving
                }
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
    </BallparkShell>
  );
}
