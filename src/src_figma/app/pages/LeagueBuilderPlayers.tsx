/**
 * League Builder - Players Module
 * Per LEAGUE_BUILDER_SPEC.md Section 5 + LEAGUE_BUILDER_REFACTOR_SPEC.md §9–§10
 *
 * Create, edit, and manage the global player database.
 * Supports per-league overrides via context tabs (BASE + league tabs).
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  User,
  Search,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Users,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import {
  useLeagueBuilderData,
  type Player,
  type Position,
  type Grade,
  type Personality,
  type Chemistry,
  type MojoState,
  type RosterStatus,
  type PitchType,
} from "../../hooks/useLeagueBuilderData";
import {
  getLeaguePlayerOverride,
  setLeaguePlayerOverride,
  removeLeaguePlayerOverride,
  type PlayerAttributes,
  type PlayerArchetype,
} from "../../../utils/leagueBuilderStorage";
import { mergePlayerOverrides } from "../../../utils/playerOverrides";
import { generateHometown } from "../../../data/usCities";
import { FamePip } from "../components/FamePip";
import { FAME_TIER_LABEL, type FameTier } from "../../../types/reporter";

// ============================================
// CONSTANTS
// ============================================

const POSITIONS: Position[] = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CP', 'SP/RP', 'TWO-WAY'];
const GRADES: Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
const PERSONALITIES: Personality[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined', 'Tough', 'Relaxed', 'Egotistical', 'Jolly', 'Timid', 'Droopy'];
const CHEMISTRIES: Chemistry[] = ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined'];
const PITCH_TYPES: PitchType[] = ['4F', '2F', 'CB', 'SL', 'CH', 'FK', 'CF', 'SB', 'SC', 'KN'];
const PLAYER_ARCHETYPES: PlayerArchetype[] = [
  'GRIZZLED_VET',
  'HOT_ROOKIE',
  'JOURNEYMAN',
  'ACE',
  'SLUGGER',
  'SPEEDSTER',
  'GLOVE_WIZARD',
  'CLUBHOUSE_LEADER',
  'HEAD_CASE',
  'QUIET_PRO',
  'SHOWBOAT',
  'UTILITY_GUY',
];

const PLAYER_ARCHETYPE_LABELS: Record<PlayerArchetype, string> = {
  GRIZZLED_VET: 'Grizzled Vet',
  HOT_ROOKIE: 'Hot Rookie',
  JOURNEYMAN: 'Journeyman',
  ACE: 'Ace',
  SLUGGER: 'Slugger',
  SPEEDSTER: 'Speedster',
  GLOVE_WIZARD: 'Glove Wizard',
  CLUBHOUSE_LEADER: 'Clubhouse Leader',
  HEAD_CASE: 'Head Case',
  QUIET_PRO: 'Quiet Pro',
  SHOWBOAT: 'Showboat',
  UTILITY_GUY: 'Utility Guy',
};

const PLAYER_BACKSTORY_LIMIT = 300;

/** The gold color for override indicators, per JK's design feedback */
const OVERRIDE_GOLD = '#D4A020';

/** All PlayerAttributes keys that can be overridden per-league */
const OVERRIDABLE_FIELDS: (keyof PlayerAttributes)[] = [
  'power', 'contact', 'speed', 'fielding', 'arm',
  'velocity', 'junk', 'accuracy', 'arsenal', 'overallGrade',
  'trait1', 'trait2', 'personality', 'chemistry',
  'primaryPosition', 'secondaryPosition',
  'age', 'bats', 'throws', 'nickname', 'hometown',
];

// ============================================
// TYPES
// ============================================

type EditorTab = 'base' | string; // 'base' or a leagueId

interface PlayerFormData {
  firstName: string;
  lastName: string;
  nickname: string;
  backstory: string;
  nicknames: string[];
  nicknameDraft: string;
  archetype: PlayerArchetype | '';
  signatureMoment: string;
  gender: 'M' | 'F';
  age: string;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  primaryPosition: Position;
  secondaryPosition: Position | '';
  power: string;
  contact: string;
  speed: string;
  fielding: string;
  arm: string;
  velocity: string;
  junk: string;
  accuracy: string;
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1: string;
  trait2: string;
  personality: Personality;
  chemistry: Chemistry;
  hometownCity: string;
  hometownState: string;
  teamId: string;
  rosterStatus: RosterStatus;
  baseFameTier: FameTier;
}

const DEFAULT_FORM_DATA: PlayerFormData = {
  firstName: "",
  lastName: "",
  nickname: "",
  backstory: "",
  nicknames: [],
  nicknameDraft: "",
  archetype: "",
  signatureMoment: "",
  hometownCity: "",
  hometownState: "",
  gender: 'M',
  age: "25",
  bats: 'R',
  throws: 'R',
  primaryPosition: 'CF',
  secondaryPosition: '',
  power: "50",
  contact: "50",
  speed: "50",
  fielding: "50",
  arm: "50",
  velocity: "50",
  junk: "50",
  accuracy: "50",
  arsenal: ['4F'],
  overallGrade: 'C',
  trait1: "",
  trait2: "",
  personality: 'Competitive',
  chemistry: 'Competitive',
  teamId: "",
  rosterStatus: 'FREE_AGENT',
  baseFameTier: 3,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LeagueBuilderPlayers() {
  const navigate = useNavigate();
  const {
    leagues,
    players,
    teams,
    isLoading,
    error,
    createPlayer,
    updatePlayer,
    removePlayer,
  } = useLeagueBuilderData();

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");

  // Override state for context tabs
  const [editorTab, setEditorTab] = useState<EditorTab>('base');
  const [currentOverrides, setCurrentOverrides] = useState<Partial<PlayerAttributes>>({});
  const [fameTierOverride, setFameTierOverride] = useState<FameTier | undefined>(undefined);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(false);

  const [activeLeagueId, setActiveLeagueId] = useState<string>("");

  // Auto-select first league on load
  useEffect(() => {
    if (!activeLeagueId && leagues.length > 0) {
      setActiveLeagueId(leagues[0].id);
    }
  }, [leagues, activeLeagueId]);

  // Filter teams to only those in the selected league
  const leagueTeams = useMemo(() => {
    if (!activeLeagueId) return teams;
    const league = leagues.find(l => l.id === activeLeagueId);
    if (!league?.teamIds?.length) return teams;
    return teams.filter(t => league.teamIds!.includes(t.id));
  }, [activeLeagueId, leagues, teams]);

  const getActiveAssignment = useCallback((player: Player) => {
    if (!player.leagueAssignments?.length) return undefined;
    if (!activeLeagueId) return player.leagueAssignments[0];
    return player.leagueAssignments.find((assignment) => assignment.leagueId === activeLeagueId)
      ?? player.leagueAssignments[0];
  }, [activeLeagueId]);

  /** ALL league IDs for tab rendering — player's existing assignments + all known leagues */
  const playerLeagueIds = useMemo(() => {
    const assignedIds = new Set(editingPlayer?.leagueAssignments?.map(a => a.leagueId) ?? []);
    // Include all leagues so user can assign player to new leagues
    const allIds = new Set([...assignedIds, ...leagues.map(l => l.id)]);
    return Array.from(allIds);
  }, [editingPlayer, leagues]);

  const isLeagueTab = editorTab !== 'base';

  // Filter players
  const filteredPlayers = useMemo(() => {
    let list = [...players];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
      );
    }

    if (positionFilter !== "ALL") {
      list = list.filter(p => p.primaryPosition === positionFilter);
    }

    if (teamFilter !== "ALL") {
      if (teamFilter === "FREE_AGENT") {
        list = list.filter((player) => {
          const assignment = getActiveAssignment(player);
          return !assignment || assignment.rosterStatus === 'FREE_AGENT' || !assignment.teamId;
        });
      } else {
        list = list.filter((player) => getActiveAssignment(player)?.teamId === teamFilter);
      }
    }

    list.sort((a, b) => a.lastName.localeCompare(b.lastName));
    return list.slice(0, 100);
  }, [players, searchQuery, positionFilter, teamFilter, getActiveAssignment]);

  // ============================================
  // OVERRIDE HELPERS
  // ============================================

  /** Convert a Player to form data (used for both base and effective views) */
  const playerToFormData = useCallback((player: Player): PlayerFormData => ({
    firstName: player.firstName,
    lastName: player.lastName,
    baseFameTier: (player.baseFameTier ?? 3) as FameTier,
    nickname: player.nickname || "",
    backstory: player.backstory || "",
    nicknames: player.nicknames ?? [],
    nicknameDraft: "",
    archetype: player.archetype || "",
    signatureMoment: player.signatureMoment || "",
    hometownCity: player.hometown?.city || "",
    hometownState: player.hometown?.state || "",
    gender: player.gender,
    age: player.age.toString(),
    bats: player.bats,
    throws: player.throws,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition || '',
    power: player.power.toString(),
    contact: player.contact.toString(),
    speed: player.speed.toString(),
    fielding: player.fielding.toString(),
    arm: player.arm.toString(),
    velocity: player.velocity.toString(),
    junk: player.junk.toString(),
    accuracy: player.accuracy.toString(),
    arsenal: player.arsenal,
    overallGrade: player.overallGrade,
    trait1: player.trait1 || "",
    trait2: player.trait2 || "",
    personality: player.personality,
    chemistry: player.chemistry,
    teamId: "",
    rosterStatus: 'FREE_AGENT',
  }), []);

  /** Check if a field has an active override in the current league tab */
  const isFieldOverridden = useCallback((field: keyof PlayerAttributes): boolean => {
    if (!isLeagueTab) return false;
    return field in currentOverrides;
  }, [isLeagueTab, currentOverrides]);

  /** Get the base value of a field (from the original player, not the effective merged value) */
  const getBaseValue = useCallback((field: keyof PlayerAttributes): string => {
    if (!editingPlayer) return '';
    if (field === 'hometown') {
      const ht = editingPlayer.hometown;
      return ht ? `${ht.city}, ${ht.state}` : '';
    }
    const val = editingPlayer[field as keyof Player];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }, [editingPlayer]);

  /** Load overrides when switching to a league tab */
  const loadOverridesForLeague = useCallback(async (leagueId: string) => {
    if (!editingPlayer) return;
    setIsLoadingOverrides(true);
    try {
      const record = await getLeaguePlayerOverride(leagueId, editingPlayer.id);
      const overrides = record?.overrides ?? {};
      setCurrentOverrides(overrides);
      setFameTierOverride(record?.fameTierOverride);
      // Show effective values (base + overrides merged)
      const effective = mergePlayerOverrides(editingPlayer, overrides);
      const effectiveForm = playerToFormData(effective);
      // Preserve team assignment from the league's context
      const leagueAssignment = editingPlayer.leagueAssignments?.find(a => a.leagueId === leagueId);
      effectiveForm.teamId = leagueAssignment?.teamId || "";
      effectiveForm.rosterStatus = leagueAssignment?.rosterStatus ?? 'FREE_AGENT';
      setFormData(effectiveForm);
    } catch (err) {
      console.error("Failed to load overrides:", err);
      setCurrentOverrides({});
      setFameTierOverride(undefined);
    } finally {
      setIsLoadingOverrides(false);
    }
  }, [editingPlayer, playerToFormData]);

  /** Switch to a tab */
  const switchTab = useCallback(async (tab: EditorTab) => {
    if (!editingPlayer) return;
    setEditorTab(tab);
    if (tab === 'base') {
      setCurrentOverrides({});
      setFameTierOverride(undefined);
      const baseForm = playerToFormData(editingPlayer);
      const assignment = getActiveAssignment(editingPlayer);
      baseForm.teamId = assignment?.teamId || "";
      baseForm.rosterStatus = assignment?.rosterStatus ?? 'FREE_AGENT';
      setFormData(baseForm);
    } else {
      await loadOverridesForLeague(tab);
    }
  }, [editingPlayer, playerToFormData, getActiveAssignment, loadOverridesForLeague]);

  /** Reset a single field override back to base */
  const resetFieldToBase = useCallback((field: keyof PlayerAttributes) => {
    if (!editingPlayer || !isLeagueTab) return;
    const newOverrides = { ...currentOverrides };
    delete newOverrides[field];
    setCurrentOverrides(newOverrides);
    // Restore the base value in the form
    if (field === 'hometown') {
      setFormData(prev => ({
        ...prev,
        hometownCity: editingPlayer.hometown?.city || '',
        hometownState: editingPlayer.hometown?.state || '',
      }));
    } else if (field === 'arsenal') {
      setFormData(prev => ({ ...prev, arsenal: editingPlayer.arsenal }));
    } else {
      const baseVal = editingPlayer[field as keyof Player];
      const strVal = baseVal === undefined || baseVal === null ? '' : String(baseVal);
      setFormData(prev => ({ ...prev, [field]: strVal }));
    }
  }, [editingPlayer, isLeagueTab, currentOverrides]);

  // ============================================
  // HANDLERS
  // ============================================

  const openCreateModal = () => {
    setEditingPlayer(null);
    setFormData(DEFAULT_FORM_DATA);
    setEditorTab('base');
    setCurrentOverrides({});
    setFameTierOverride(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    setEditorTab('base');
    setCurrentOverrides({});
    setFameTierOverride(undefined);
    const base = playerToFormData(player);
    const assignment = getActiveAssignment(player);
    base.teamId = assignment?.teamId || "";
    base.rosterStatus = assignment?.rosterStatus ?? 'FREE_AGENT';
    setFormData(base);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setFormData(DEFAULT_FORM_DATA);
    setEditorTab('base');
    setCurrentOverrides({});
    setFameTierOverride(undefined);
  };

  /** Track which form fields changed on a league tab to build override delta */
  const handleFormChange = useCallback((field: string, value: string | PitchType[] | Position | '') => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // On league tabs, track changes as overrides (delta from base)
    if (isLeagueTab && editingPlayer) {
      // hometown fields map to the composite 'hometown' override
      if (field === 'hometownCity' || field === 'hometownState') {
        setFormData(prev => {
          const city = field === 'hometownCity' ? (value as string) : prev.hometownCity;
          const state = field === 'hometownState' ? (value as string) : prev.hometownState;
          const baseHt = editingPlayer.hometown;
          const baseCity = baseHt?.city || '';
          const baseState = baseHt?.state || '';
          if (city === baseCity && state === baseState) {
            setCurrentOverrides(p => { const n = { ...p }; delete n.hometown; return n; });
          } else {
            setCurrentOverrides(p => ({ ...p, hometown: { city, state } }));
          }
          return prev; // already set above
        });
        return;
      }

      if (OVERRIDABLE_FIELDS.includes(field as keyof PlayerAttributes)) {
        const baseVal = editingPlayer[field as keyof Player];
        let parsedValue: unknown = value;
        if (['power', 'contact', 'speed', 'fielding', 'arm', 'velocity', 'junk', 'accuracy', 'age'].includes(field)) {
          parsedValue = parseInt(value as string, 10) || 0;
        }
        const baseStr = baseVal === undefined || baseVal === null ? '' : String(baseVal);
        const newStr = String(parsedValue);
        if (baseStr === newStr || (field === 'arsenal' && JSON.stringify(baseVal) === JSON.stringify(value))) {
          setCurrentOverrides(prev => {
            const next = { ...prev };
            delete next[field as keyof PlayerAttributes];
            return next;
          });
        } else {
          setCurrentOverrides(prev => ({
            ...prev,
            [field]: parsedValue,
          }));
        }
      }
    }
  }, [isLeagueTab, editingPlayer]);

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) return;

    setIsSaving(true);
    try {
      if (isLeagueTab && editingPlayer) {
        // LEAGUE TAB: Save overrides + update league assignment
        const leagueId = editorTab;

        // Save attribute overrides (+ fame tier override, which is a sibling field on the record)
        const hasAnyOverride = Object.keys(currentOverrides).length > 0 || fameTierOverride !== undefined;
        if (hasAnyOverride) {
          await setLeaguePlayerOverride(leagueId, editingPlayer.id, currentOverrides, { fameTierOverride });
        } else {
          await removeLeaguePlayerOverride(leagueId, editingPlayer.id);
        }

        // Update league assignment (team/roster for this league)
        const existingAssignments = editingPlayer.leagueAssignments ?? [];
        const otherAssignments = existingAssignments.filter(a => a.leagueId !== leagueId);
        const newAssignment = {
          leagueId,
          teamId: formData.teamId,
          rosterStatus: (formData.teamId ? formData.rosterStatus : 'FREE_AGENT') as RosterStatus,
        };
        const updatedAssignments = [...otherAssignments, newAssignment];

        // Only update player record if assignments actually changed
        const hadAssignment = existingAssignments.find(a => a.leagueId === leagueId);
        if (!hadAssignment || hadAssignment.teamId !== formData.teamId || hadAssignment.rosterStatus !== (formData.teamId ? formData.rosterStatus : 'FREE_AGENT')) {
          await updatePlayer({
            ...editingPlayer,
            leagueAssignments: updatedAssignments,
          });
        }

        closeModal();
      } else {
        // BASE TAB: Save to player record (existing behavior)
        const isPitcher = ['SP', 'RP', 'CP', 'SP/RP'].includes(formData.primaryPosition);

        const resolvedLeagueId =
          activeLeagueId ||
          teams.find((team) => team.id === formData.teamId)?.leagueIds?.[0] ||
          editingPlayer?.leagueAssignments?.[0]?.leagueId ||
          "";

        // Auto-generate hometown on create if not provided
        const hometown = formData.hometownCity.trim() && formData.hometownState.trim()
          ? { city: formData.hometownCity.trim(), state: formData.hometownState.trim() }
          : !editingPlayer ? generateHometown() : editingPlayer?.hometown;

        const playerData = {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          nickname: formData.nickname.trim() || undefined,
          backstory: formData.backstory.trim() || undefined,
          nicknames: formData.nicknames.length > 0 ? formData.nicknames : undefined,
          archetype: formData.archetype || undefined,
          signatureMoment: formData.signatureMoment.trim() || undefined,
          hometown,
          gender: formData.gender,
          age: parseInt(formData.age, 10) || 25,
          bats: formData.bats,
          throws: formData.throws,
          primaryPosition: formData.primaryPosition,
          secondaryPosition: formData.secondaryPosition || undefined,
          power: parseInt(formData.power, 10) || 50,
          contact: parseInt(formData.contact, 10) || 50,
          speed: parseInt(formData.speed, 10) || 50,
          fielding: parseInt(formData.fielding, 10) || 50,
          arm: parseInt(formData.arm, 10) || 50,
          velocity: isPitcher ? parseInt(formData.velocity, 10) || 50 : 0,
          junk: isPitcher ? parseInt(formData.junk, 10) || 50 : 0,
          accuracy: isPitcher ? parseInt(formData.accuracy, 10) || 50 : 0,
          arsenal: isPitcher ? formData.arsenal : [],
          overallGrade: formData.overallGrade,
          trait1: formData.trait1 || undefined,
          trait2: formData.trait2 || undefined,
          personality: formData.personality,
          chemistry: formData.chemistry,
          morale: editingPlayer?.morale ?? 75,
          mojo: editingPlayer?.mojo ?? 'Normal' as MojoState,
          fame: editingPlayer?.fame ?? 0,
          salary: editingPlayer?.salary ?? 1.0,
          contractYears: editingPlayer?.contractYears,
          leagueAssignments: (() => {
            // Preserve existing assignments for OTHER leagues, update current league
            const existingOther = (editingPlayer?.leagueAssignments ?? [])
              .filter(a => a.leagueId !== resolvedLeagueId);
            const currentAssignment = resolvedLeagueId
              ? [{
                  leagueId: resolvedLeagueId,
                  teamId: formData.teamId,
                  rosterStatus: (formData.teamId ? formData.rosterStatus : 'FREE_AGENT') as RosterStatus,
                }]
              : [];
            return [...existingOther, ...currentAssignment];
          })(),
          baseFameTier: formData.baseFameTier,
          isCustom: true,
          sourceDatabase: 'League Builder',
        };

        if (editingPlayer) {
          await updatePlayer({
            ...editingPlayer,
            ...playerData,
          });
        } else {
          await createPlayer(playerData);
        }
        closeModal();
      }
    } catch (err) {
      console.error("Failed to save player:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removePlayer(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete player:", err);
    }
  };

  const toggleArsenal = (pitch: PitchType) => {
    const newArsenal = formData.arsenal.includes(pitch)
      ? formData.arsenal.filter(p => p !== pitch)
      : [...formData.arsenal, pitch];
    handleFormChange('arsenal', newArsenal);
  };

  const addEditorialNickname = useCallback(() => {
    const nextNickname = formData.nicknameDraft.trim();
    if (!nextNickname || formData.nicknames.includes(nextNickname)) {
      setFormData(prev => ({ ...prev, nicknameDraft: "" }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      nicknames: [...prev.nicknames, nextNickname],
      nicknameDraft: "",
    }));
  }, [formData.nicknameDraft, formData.nicknames]);

  const removeEditorialNickname = useCallback((nickname: string) => {
    setFormData(prev => ({
      ...prev,
      nicknames: prev.nicknames.filter((current) => current !== nickname),
    }));
  }, []);

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return "Free Agent";
    const team = teams.find(t => t.id === teamId);
    return team?.abbreviation || "Unknown";
  };

  const getLeagueName = (leagueId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    return league?.name || leagueId;
  };

  const isPitcherPosition = (pos: Position) => ['SP', 'RP', 'CP', 'SP/RP'].includes(pos);

  // ============================================
  // OVERRIDE-AWARE FIELD WRAPPER
  // ============================================

  /** Renders a form field with override indicator (gold border + badge + reset) when on league tab */
  const OverrideField = useCallback(({ field, label, children }: {
    field: keyof PlayerAttributes;
    label: string;
    children: React.ReactNode;
  }) => {
    const overridden = isFieldOverridden(field);
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            className="block text-xs font-bold tracking-wide"
            style={{ color: overridden ? OVERRIDE_GOLD : '#E8E8D8', opacity: overridden ? 1 : 0.7 }}
          >
            {label}
          </label>
          {overridden && (
            <span
              className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: OVERRIDE_GOLD, color: '#1a1a1a' }}
            >
              OVERRIDE
            </span>
          )}
        </div>
        <div className="relative">
          <div
            style={overridden ? {
              borderLeft: `4px solid ${OVERRIDE_GOLD}`,
              borderTop: `3px solid ${OVERRIDE_GOLD}`,
              borderRight: `3px solid ${OVERRIDE_GOLD}`,
              borderBottom: `3px solid ${OVERRIDE_GOLD}`,
            } : undefined}
            className={overridden ? '' : 'border-[3px] border-[#3F5A3A]'}
          >
            {children}
          </div>
          {overridden && (
            <button
              type="button"
              onClick={() => resetFieldToBase(field)}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-[9px] font-semibold tracking-wide rounded-sm transition hover:opacity-80"
              style={{
                backgroundColor: '#3F5A3A',
                color: OVERRIDE_GOLD,
                border: `1px solid ${OVERRIDE_GOLD}`,
              }}
              title="Reset to base value"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              RESET
            </button>
          )}
        </div>
        {overridden && (
          <div className="text-[10px] text-[#E8E8D8]/50 mt-0.5">
            Base: {getBaseValue(field)}
          </div>
        )}
      </div>
    );
  }, [isFieldOverridden, resetFieldToBase, getBaseValue]);

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2d3d2f] text-[#E8E8D8] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading players...</span>
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
            <User className="w-6 h-6" style={{ color: "#3366FF" }} />
            <h1
              className="text-2xl font-bold text-[#E8E8D8] tracking-wider"
              style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.8)" }}
            >
              PLAYERS
            </h1>
          </div>
          {/* League Selector */}
          {leagues.length > 1 && (
            <select
              value={activeLeagueId}
              onChange={(e) => setActiveLeagueId(e.target.value)}
              className="bg-[#4A6844] border-4 border-[#E8E8D8] text-[#E8E8D8] px-4 py-2 text-sm font-bold tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] cursor-pointer"
            >
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name.toUpperCase()}
                </option>
              ))}
            </select>
          )}
          <div className="ml-auto text-sm text-[#E8E8D8]/70">{players.length} players</div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border-4 border-red-500 p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-200">{error}</span>
          </div>
        )}

        {/* Create Button & Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={openCreateModal}
            className="bg-[#5A8352] hover:bg-[#4A6844] border-[5px] border-[#E8E8D8] px-6 py-3 transition-all active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold tracking-wide">CREATE PLAYER</span>
          </button>

          <div className="flex-1 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E8E8D8]/50" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#4A6844] border-4 border-[#E8E8D8]/30 pl-10 pr-4 py-2 text-[#E8E8D8] placeholder-[#E8E8D8]/50 focus:border-[#E8E8D8]/60 outline-none"
              />
            </div>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-4 py-2 text-[#E8E8D8] focus:border-[#E8E8D8]/60 outline-none"
            >
              <option value="ALL">All Positions</option>
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-[#4A6844] border-4 border-[#E8E8D8]/30 px-4 py-2 text-[#E8E8D8] focus:border-[#E8E8D8]/60 outline-none"
            >
              <option value="ALL">All Teams</option>
              <option value="FREE_AGENT">Free Agents</option>
              {leagueTeams.map(team => (
                <option key={team.id} value={team.id}>{team.abbreviation}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Players Table */}
        <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] overflow-hidden">
          {players.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: "#3366FF" }} />
              <h2 className="text-xl font-bold mb-2">No Players Yet</h2>
              <p className="text-[#E8E8D8]/70">Create your first player to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#4A6844] text-xs">
                  <th className="text-left p-3">NAME</th>
                  <th className="text-center p-3">POS</th>
                  <th className="text-center p-3">TEAM</th>
                  <th className="text-center p-3">OVR</th>
                  <th className="text-center p-3">AGE</th>
                  <th className="text-center p-3">HOMETOWN</th>
                  <th className="text-center p-3">B/T</th>
                  <th className="text-right p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player, idx) => (
                  <tr
                    key={player.id}
                    className={`${idx % 2 === 0 ? 'bg-[#556B55]' : 'bg-[#4A6844]/30'} hover:bg-[#5A8352]/50 transition-colors`}
                  >
                    <td className="p-3 font-medium">
                      {player.firstName} {player.lastName}
                      {player.nickname && <span className="text-[#E8E8D8]/50 text-xs ml-1">"{player.nickname}"</span>}
                    </td>
                    <td className="p-3 text-center text-xs">{player.primaryPosition}</td>
                    <td className="p-3 text-center text-xs">{getTeamName(getActiveAssignment(player)?.teamId)}</td>
                    <td className="p-3 text-center font-bold">{player.overallGrade}</td>
                    <td className="p-3 text-center text-xs">{player.age}</td>
                    <td className="p-3 text-center text-xs">
                      {player.hometown ? `${player.hometown.city}, ${player.hometown.state}` : '—'}
                    </td>
                    <td className="p-3 text-center text-xs">{player.bats}/{player.throws}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(player)}
                          className="p-1.5 bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 transition"
                          title="Edit player"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {deleteConfirmId === player.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(player.id)}
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
                            onClick={() => setDeleteConfirmId(player.id)}
                            className="p-1.5 bg-red-800 hover:bg-red-700 border-2 border-red-500/50 transition"
                            title="Delete player"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#E8E8D8]/50">
                      {searchQuery || positionFilter !== "ALL" || teamFilter !== "ALL"
                        ? "No players match your filters"
                        : "No players in database"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#556B55] border-[6px] border-[#4A6844] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b-4 border-[#4A6844]">
              <h2 className="text-xl font-bold">
                {editingPlayer
                  ? `Edit Player — ${editingPlayer.firstName} ${editingPlayer.lastName}`
                  : "Create New Player"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-[#4A6844] transition rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Tabs — only for editing existing players with league assignments */}
            {editingPlayer && playerLeagueIds.length > 0 && (
              <div className="flex items-center gap-0 bg-[#3F5A3A] px-4 py-1">
                <button
                  onClick={() => switchTab('base')}
                  className={`px-5 py-2 text-xs font-bold tracking-wide transition ${
                    editorTab === 'base'
                      ? 'bg-[#5A8352] border-[3px] border-[#E8E8D8] text-[#E8E8D8]'
                      : 'text-[#E8E8D8]/60 hover:text-[#E8E8D8]/80'
                  }`}
                >
                  BASE
                </button>
                {playerLeagueIds.map(lid => (
                  <button
                    key={lid}
                    onClick={() => switchTab(lid)}
                    className={`px-4 py-2 text-xs font-bold tracking-wide transition ${
                      editorTab === lid
                        ? 'bg-[#5A8352] border-[3px] border-[#E8E8D8] text-[#E8E8D8]'
                        : 'text-[#E8E8D8]/60 hover:text-[#E8E8D8]/80'
                    }`}
                  >
                    {getLeagueName(lid).toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Context Banner */}
            {editingPlayer && playerLeagueIds.length > 0 && (
              <div
                className="flex items-center gap-2 px-5 py-2.5"
                style={{ backgroundColor: isLeagueTab ? '#4A4430' : '#4A6844' }}
              >
                <span className="text-sm" style={{ color: isLeagueTab ? OVERRIDE_GOLD : '#5599FF' }}>
                  {isLeagueTab ? '⚡' : 'ℹ'}
                </span>
                <span className="text-xs" style={{ color: isLeagueTab ? '#E8D8A8' : '#E8E8D8', opacity: 0.8 }}>
                  {isLeagueTab
                    ? `Editing overrides for ${getLeagueName(editorTab)}. Fields with gold border have league-specific values.`
                    : 'Editing base attributes. Changes here affect all leagues without overrides.'}
                </span>
              </div>
            )}

            {/* Loading overlay for tab switch */}
            {isLoadingOverrides && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm text-[#E8E8D8]/70">Loading overrides...</span>
              </div>
            )}

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Name Row — only editable on base tab or create */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    disabled={isLeagueTab}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    disabled={isLeagueTab}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {!isLeagueTab ? (
                <section className="bg-[#4A6844]/55 border-[4px] border-[#3F5A3A] p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold tracking-[0.18em] uppercase text-[#E8E8D8]">
                        Editorial Identity
                      </h3>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        Optional reporter-facing flavor. Identity only; relationships stay deferred.
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#D4A020]">
                      Base
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="player-backstory" className="block text-sm font-bold">
                        Backstory
                      </label>
                      <span className="text-[10px] text-[#E8E8D8]/60">
                        {formData.backstory.length}/{PLAYER_BACKSTORY_LIMIT}
                      </span>
                    </div>
                    <textarea
                      id="player-backstory"
                      value={formData.backstory}
                      onChange={(e) => handleFormChange('backstory', e.target.value.slice(0, PLAYER_BACKSTORY_LIMIT))}
                      maxLength={PLAYER_BACKSTORY_LIMIT}
                      rows={4}
                      placeholder="A short card-back note for reporters and recaps."
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Nicknames</label>
                      <div className="bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {formData.nicknames.map((nickname) => (
                            <span
                              key={nickname}
                              className="inline-flex items-center gap-1 bg-[#556B55] border-2 border-[#D4A020] px-2 py-1 text-xs"
                            >
                              {nickname}
                              <button
                                type="button"
                                onClick={() => removeEditorialNickname(nickname)}
                                className="text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                                aria-label={`Remove ${nickname}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          {formData.nicknames.length === 0 ? (
                            <span className="text-xs text-[#E8E8D8]/45">No editorial nicknames yet</span>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.nicknameDraft}
                            onChange={(e) => handleFormChange('nicknameDraft', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                addEditorialNickname();
                              }
                            }}
                            placeholder="Add nickname"
                            className="min-w-0 flex-1 bg-[#4A6844] border-2 border-[#2d3d2f] p-2 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                          />
                          <button
                            type="button"
                            onClick={addEditorialNickname}
                            className="bg-[#5A8352] hover:bg-[#6A9362] border-2 border-[#E8E8D8]/50 px-3 text-xs font-bold transition"
                          >
                            ADD
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="player-archetype" className="block text-sm font-bold mb-2">Archetype</label>
                      <select
                        id="player-archetype"
                        value={formData.archetype}
                        onChange={(e) => handleFormChange('archetype', e.target.value)}
                        className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                      >
                        <option value="">None</option>
                        {PLAYER_ARCHETYPES.map((archetype) => (
                          <option key={archetype} value={archetype}>
                            {PLAYER_ARCHETYPE_LABELS[archetype]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="player-signature-moment" className="block text-sm font-bold mb-2">
                      Signature Moment
                    </label>
                    <input
                      id="player-signature-moment"
                      type="text"
                      value={formData.signatureMoment}
                      onChange={(e) => handleFormChange('signatureMoment', e.target.value)}
                      placeholder="e.g., Hit a walk-off into the rain at Apple Field"
                      className="w-full bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:border-[#E8E8D8] outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold">Baseline Fame Tier</label>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#E8E8D8]/60">
                        {FAME_TIER_LABEL[formData.baseFameTier]} ({formData.baseFameTier}/5)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3">
                      {([1, 2, 3, 4, 5] as const).map((tier) => {
                        const selected = formData.baseFameTier === tier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, baseFameTier: tier }))}
                            aria-pressed={selected}
                            aria-label={`Set baseline fame tier to ${FAME_TIER_LABEL[tier]} (${tier}/5)`}
                            className="transition-opacity"
                            style={{
                              opacity: selected ? 1 : 0.35,
                              filter: selected ? 'none' : 'saturate(0.6)',
                              cursor: 'pointer',
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                            }}
                          >
                            <FamePip tier={tier} size="sm" />
                          </button>
                        );
                      })}
                      <p className="ml-auto text-xs text-[#E8E8D8]/55 max-w-[220px]">
                        Default is 3 (Veteran). Reporters weight beats by this tier before live game fame is added.
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="bg-[#4A4430]/55 border-[4px] border-[#D4A020]/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold tracking-[0.18em] uppercase text-[#E8D8A8]">
                        Fame Tier Override
                      </h3>
                      <p className="mt-1 text-xs text-[#E8E8D8]/60">
                        League-specific override. Base is {FAME_TIER_LABEL[(editingPlayer?.baseFameTier ?? 3) as FameTier]} ({editingPlayer?.baseFameTier ?? 3}/5).
                      </p>
                    </div>
                    {fameTierOverride !== undefined ? (
                      <button
                        type="button"
                        onClick={() => setFameTierOverride(undefined)}
                        className="text-xs px-2 py-1 font-bold transition"
                        style={{ color: OVERRIDE_GOLD, border: `1px solid ${OVERRIDE_GOLD}` }}
                      >
                        Revert to Base
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#E8E8D8]/45">
                        Using Base
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 bg-[#3F5A3A] border-[4px] border-[#2d3d2f] p-3">
                    {([1, 2, 3, 4, 5] as const).map((tier) => {
                      const selected = fameTierOverride === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setFameTierOverride(tier)}
                          aria-pressed={selected}
                          aria-label={`Override fame tier to ${FAME_TIER_LABEL[tier]} (${tier}/5)`}
                          className="transition-opacity"
                          style={{
                            opacity: selected ? 1 : 0.35,
                            filter: selected ? 'none' : 'saturate(0.6)',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: selected ? `2px solid ${OVERRIDE_GOLD}` : 'none',
                            padding: selected ? '2px' : '4px',
                          }}
                        >
                          <FamePip tier={tier} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Hometown Row */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <OverrideField field="hometown" label="Hometown">
                    <div className="flex gap-2 bg-[#4A6844]">
                      <input
                        type="text"
                        placeholder="City"
                        value={formData.hometownCity}
                        onChange={(e) => handleFormChange('hometownCity', e.target.value)}
                        className="flex-1 bg-transparent p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 focus:outline-none"
                        style={isFieldOverridden('hometown') ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                      />
                      <span className="self-center text-[#E8E8D8]/30">,</span>
                      <input
                        type="text"
                        placeholder="ST"
                        value={formData.hometownState}
                        onChange={(e) => handleFormChange('hometownState', e.target.value)}
                        className="w-16 bg-transparent p-3 text-[#E8E8D8] placeholder-[#E8E8D8]/40 text-center focus:outline-none"
                        style={isFieldOverridden('hometown') ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                        maxLength={2}
                      />
                    </div>
                  </OverrideField>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ht = generateHometown();
                    setFormData(prev => ({ ...prev, hometownCity: ht.city, hometownState: ht.state }));
                    if (isLeagueTab && editingPlayer) {
                      const baseHt = editingPlayer.hometown;
                      if (ht.city !== baseHt?.city || ht.state !== baseHt?.state) {
                        setCurrentOverrides(prev => ({ ...prev, hometown: ht }));
                      } else {
                        setCurrentOverrides(prev => { const n = { ...prev }; delete n.hometown; return n; });
                      }
                    }
                  }}
                  className="mb-0.5 p-2.5 bg-[#4A6844] hover:bg-[#5A8352] border-[3px] border-[#3F5A3A] transition"
                  title="Randomize hometown"
                >
                  <Shuffle className="w-4 h-4 text-[#E8E8D8]" />
                </button>
              </div>

              {/* Demographics Row */}
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFormChange('gender', e.target.value)}
                    disabled={isLeagueTab}
                    className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none disabled:opacity-50"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <OverrideField field="age" label="Age">
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleFormChange('age', e.target.value)}
                    min={18}
                    max={50}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('age') ? { color: OVERRIDE_GOLD } : undefined}
                  />
                </OverrideField>
                <OverrideField field="bats" label="Bats">
                  <select
                    value={formData.bats}
                    onChange={(e) => handleFormChange('bats', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('bats') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    <option value="R">Right</option>
                    <option value="L">Left</option>
                    <option value="S">Switch</option>
                  </select>
                </OverrideField>
                <OverrideField field="throws" label="Throws">
                  <select
                    value={formData.throws}
                    onChange={(e) => handleFormChange('throws', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('throws') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    <option value="R">Right</option>
                    <option value="L">Left</option>
                  </select>
                </OverrideField>
                <OverrideField field="overallGrade" label="Grade">
                  <select
                    value={formData.overallGrade}
                    onChange={(e) => handleFormChange('overallGrade', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('overallGrade') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </OverrideField>
              </div>

              {/* Position Row */}
              <div className="grid grid-cols-2 gap-4">
                <OverrideField field="primaryPosition" label="Primary Position">
                  <select
                    value={formData.primaryPosition}
                    onChange={(e) => handleFormChange('primaryPosition', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('primaryPosition') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </OverrideField>
                <OverrideField field="secondaryPosition" label="Secondary Position">
                  <select
                    value={formData.secondaryPosition}
                    onChange={(e) => handleFormChange('secondaryPosition', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('secondaryPosition') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    <option value="">None</option>
                    {POSITIONS.filter(p => p !== formData.primaryPosition).map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </OverrideField>
              </div>

              {/* Batting Ratings */}
              <div>
                <label className="block text-sm font-bold mb-2">Batting Ratings</label>
                <div className="grid grid-cols-5 gap-3">
                  {([
                    { key: 'power', label: 'POW' },
                    { key: 'contact', label: 'CON' },
                    { key: 'speed', label: 'SPD' },
                    { key: 'fielding', label: 'FLD' },
                    { key: 'arm', label: 'ARM' },
                  ] as const).map(({ key, label }) => (
                    <OverrideField key={key} field={key} label={label}>
                      <input
                        type="number"
                        value={formData[key]}
                        onChange={(e) => handleFormChange(key, e.target.value)}
                        min={0}
                        max={99}
                        className="w-full bg-[#4A6844] p-2 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                        style={isFieldOverridden(key) ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                      />
                    </OverrideField>
                  ))}
                </div>
              </div>

              {/* Pitching Ratings (only show for pitchers) */}
              {isPitcherPosition(formData.primaryPosition) && (
                <div>
                  <label className="block text-sm font-bold mb-2">Pitching Ratings</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: 'velocity', label: 'VEL' },
                      { key: 'junk', label: 'JNK' },
                      { key: 'accuracy', label: 'ACC' },
                    ] as const).map(({ key, label }) => (
                      <OverrideField key={key} field={key} label={label}>
                        <input
                          type="number"
                          value={formData[key]}
                          onChange={(e) => handleFormChange(key, e.target.value)}
                          min={0}
                          max={99}
                          className="w-full bg-[#4A6844] p-2 text-center text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                          style={isFieldOverridden(key) ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                        />
                      </OverrideField>
                    ))}
                  </div>

                  {/* Arsenal */}
                  <div className="mt-3">
                    <OverrideField field="arsenal" label="Arsenal">
                      <div className="flex flex-wrap gap-2 bg-[#4A6844] p-2">
                        {PITCH_TYPES.map(pitch => (
                          <button
                            key={pitch}
                            type="button"
                            onClick={() => toggleArsenal(pitch)}
                            className={`px-3 py-1 text-xs border-2 transition ${
                              formData.arsenal.includes(pitch)
                                ? 'bg-[#5599FF] border-[#3366FF] text-white'
                                : 'bg-[#4A6844] border-[#3F5A3A] text-[#E8E8D8]/70 hover:border-[#E8E8D8]/50'
                            }`}
                          >
                            {pitch}
                          </button>
                        ))}
                      </div>
                    </OverrideField>
                  </div>
                </div>
              )}

              {/* Traits */}
              <div className="grid grid-cols-2 gap-4">
                <OverrideField field="trait1" label="Trait 1">
                  <input
                    type="text"
                    value={formData.trait1}
                    onChange={(e) => handleFormChange('trait1', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('trait1') ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                  />
                </OverrideField>
                <OverrideField field="trait2" label="Trait 2">
                  <input
                    type="text"
                    value={formData.trait2}
                    onChange={(e) => handleFormChange('trait2', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('trait2') ? { color: OVERRIDE_GOLD, fontWeight: 700 } : undefined}
                  />
                </OverrideField>
              </div>

              {/* Personality & Chemistry */}
              <div className="grid grid-cols-2 gap-4">
                <OverrideField field="personality" label="Personality">
                  <select
                    value={formData.personality}
                    onChange={(e) => handleFormChange('personality', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('personality') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    {PERSONALITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </OverrideField>
                <OverrideField field="chemistry" label="Chemistry">
                  <select
                    value={formData.chemistry}
                    onChange={(e) => handleFormChange('chemistry', e.target.value)}
                    className="w-full bg-[#4A6844] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                    style={isFieldOverridden('chemistry') ? { color: OVERRIDE_GOLD } : undefined}
                  >
                    {CHEMISTRIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </OverrideField>
              </div>

              {/* Team Assignment — shown on all tabs */}
              {(() => {
                // On league tabs, show teams for THAT league; on base tab, show teams for active league
                const tabLeagueId = isLeagueTab ? editorTab : activeLeagueId;
                const tabLeague = leagues.find(l => l.id === tabLeagueId);
                const tabTeams = tabLeague?.teamIds?.length
                  ? teams.filter(t => tabLeague.teamIds!.includes(t.id))
                  : leagueTeams;
                const tabLabel = isLeagueTab
                  ? `Team (${tabLeague?.name ?? tabLeagueId})`
                  : 'Team';
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        <Users className="w-3 h-3 inline mr-1" />
                        {tabLabel}
                      </label>
                      <select
                        value={formData.teamId}
                        onChange={(e) => {
                          const newTeamId = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            teamId: newTeamId,
                            rosterStatus: newTeamId ? prev.rosterStatus : 'FREE_AGENT'
                          }));
                        }}
                        className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none"
                      >
                        <option value="">Free Agent</option>
                        {tabTeams.map(team => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Roster Status</label>
                      <select
                        value={formData.rosterStatus}
                        onChange={(e) => setFormData(prev => ({ ...prev, rosterStatus: e.target.value as RosterStatus }))}
                        disabled={!formData.teamId}
                        className="w-full bg-[#4A6844] border-[4px] border-[#3F5A3A] p-3 text-[#E8E8D8] focus:border-[#E8E8D8] outline-none disabled:opacity-50"
                      >
                        <option value="FREE_AGENT">Free Agent</option>
                        <option value="MLB">MLB Roster</option>
                        <option value="FARM">Farm System</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
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
                disabled={(!isLeagueTab && (!formData.firstName.trim() || !formData.lastName.trim())) || isSaving}
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
                    {isLeagueTab ? "Save Overrides" : editingPlayer ? "Save Changes" : "Create Player"}
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
