import { HISTORICAL_ARCHETYPES } from '../../../data/historicalArchetypes';
import type { Player, Team } from '../../../utils/leagueBuilderStorage';
import type { PoolSourceMode } from '../../../engines/poolFromDemand';
import {
  buildDefaultDesignSlots,
  evaluateRosterDesign,
  type DesignPoolPlayer,
} from '../../../engines/rosterDesignFeasibility';
import type { DraftSetupSeat } from '../../hooks/useLeagueBuilderData';

export const BOARD_POSITION_DEPTH = 5;
export const BOARD_RANK_SAVE_DEBOUNCE_MS = 500;

export function retiredSnakeVersionIdsForLock(
  displayedPoolIds: readonly string[],
  selectedPoolIds: readonly string[],
): string[] {
  const selectedIds = new Set(selectedPoolIds);
  return [...new Set(displayedPoolIds.filter((id) => !selectedIds.has(id)))]
    .sort((left, right) => left.localeCompare(right));
}

export function snakeVersionRestoreIds(
  currentPoolIds: readonly string[],
  retiredVersionIds: readonly string[],
): string[] {
  const currentIds = new Set(currentPoolIds);
  return retiredVersionIds.filter((id) => !currentIds.has(id));
}

type IdentityAutoFillSlot = 'mlb' | 'farm';
type IdentityAutoFillMode = 'fill-empty' | 'reroll-team';
export type IdentityAutoFilledSlotKey = `${string}:${IdentityAutoFillSlot}`;

export interface IdentityAutoAssignment {
  teamId: string;
  mlbKey?: string;
  farmKey?: string;
  slots: IdentityAutoFillSlot[];
}

interface IdentityAutoAssignInput {
  leagueId: string;
  nonce: number;
  teams: readonly Team[];
  seats: readonly DraftSetupSeat[];
  draftability?: Record<string, { band: 'GREEN' | 'YELLOW' | 'LOCKED'; reason?: string }>;
  includeHumanTeams: boolean;
  autoFilledSlots?: ReadonlySet<IdentityAutoFilledSlotKey>;
  mode: IdentityAutoFillMode;
  rerollTeamId?: string;
  poolSourceMode: PoolSourceMode;
  activeLeagueId: string;
  players: readonly Player[];
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/A';
  return `$${Math.round(value).toLocaleString()}`;
}

export function draftSetupSolvencyBannerText(
  pool: readonly DesignPoolPlayer[],
  cap: number,
): string | null {
  if (pool.length === 0) return null;
  const cheapest = evaluateRosterDesign(buildDefaultDesignSlots(), pool, Number.POSITIVE_INFINITY);
  return cheapest.totalCost > cap
    ? `This pool can't seat a legal roster under your ${formatMoney(cap)} cap — raise the cap or add cheaper players.`
    : null;
}

export function identityAutoFilledSlotKey(
  teamId: string,
  slot: IdentityAutoFillSlot,
): IdentityAutoFilledSlotKey {
  return `${teamId}:${slot}`;
}

function teamOwnerId(team: Team, seats: readonly DraftSetupSeat[]): string {
  if (team.controlledBy === 'ai') return 'cpu';
  return team.gmSeatId || seats[0]?.id || 'seat-you';
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string): number {
  return hashStringToUint32(seed) / 0x100000000;
}

function teamRosterPlayers(players: readonly Player[], activeLeagueId: string, teamId: string): Player[] {
  if (!activeLeagueId || !teamId) return [];
  return players.filter((player) => player.leagueAssignments?.some((assignment) => (
    assignment.leagueId === activeLeagueId
    && assignment.teamId === teamId
    && assignment.rosterStatus !== 'FREE_AGENT'
  )));
}

function playerStatForArchetypeStat(
  player: Player,
  stat: (typeof HISTORICAL_ARCHETYPES)[number]['boosts'][number],
): number {
  switch (stat) {
    case 'POW': return player.power;
    case 'CON': return player.contact;
    case 'SPD': return player.speed;
    case 'FLD': return player.fielding;
    case 'ARM': return player.arm;
    case 'ROT_POW': return player.power;
    case 'ROT_CON': return player.contact;
    case 'ROT_VEL':
    case 'PEN_VEL': return player.velocity ?? 0;
    case 'ROT_JNK':
    case 'PEN_JNK': return player.junk ?? 0;
    case 'ROT_ACC':
    case 'PEN_ACC': return player.accuracy ?? 0;
    default: return 0;
  }
}

export function rosterFitForArchetype(
  teamPlayers: readonly Player[],
  archetype: (typeof HISTORICAL_ARCHETYPES)[number],
): number {
  if (teamPlayers.length === 0 || archetype.boosts.length === 0) return 0;
  const statMeans = archetype.boosts.map((stat) => {
    const sample = stat.startsWith('ROT_')
      ? teamPlayers.filter((player) => player.primaryPosition === 'SP' || player.primaryPosition === 'SP/RP')
      : stat.startsWith('PEN_')
        ? teamPlayers.filter((player) => ['RP', 'CP', 'SP/RP'].includes(player.primaryPosition))
        : teamPlayers.filter((player) => !['SP', 'SP/RP', 'RP', 'CP'].includes(player.primaryPosition));
    if (sample.length === 0) return 0;
    return sample.reduce((sum, player) => sum + playerStatForArchetypeStat(player, stat), 0) / sample.length;
  });
  return statMeans.reduce((sum, value) => sum + value, 0) / statMeans.length;
}

function chooseAutoFillArchetype(input: {
  leagueId: string;
  nonce: number;
  teamId: string;
  slot: IdentityAutoFillSlot;
  candidates: readonly (typeof HISTORICAL_ARCHETYPES)[number][];
  assignmentCounts: ReadonlyMap<string, number>;
  poolSourceMode: PoolSourceMode;
  rosterPlayers: readonly Player[];
}): string | null {
  const ranked = input.candidates
    .map((archetype) => ({
      archetype,
      diversityCount: input.assignmentCounts.get(archetype.id) ?? 0,
      rosterFit: input.poolSourceMode === 'team-roster-priority'
        ? rosterFitForArchetype(input.rosterPlayers, archetype)
        : 0,
      tie: seededUnit(`${input.leagueId}:${input.nonce}:${input.teamId}:${input.slot}:${archetype.id}`),
    }))
    .sort((a, b) => (
      a.diversityCount - b.diversityCount
      || b.rosterFit - a.rosterFit
      || a.tie - b.tie
      || a.archetype.id.localeCompare(b.archetype.id)
    ));
  return ranked[0]?.archetype.id ?? null;
}

export function buildIdentityAutoAssignPlan(input: IdentityAutoAssignInput): IdentityAutoAssignment[] {
  const lockedArchetypeIds = new Set(
    Object.entries(input.draftability ?? {})
      .filter(([, verdict]) => verdict.band === 'LOCKED')
      .map(([archetypeId]) => archetypeId),
  );
  const candidates = HISTORICAL_ARCHETYPES.filter((archetype) => !lockedArchetypeIds.has(archetype.id));
  if (candidates.length === 0) return [];

  const autoSlots = input.autoFilledSlots ?? new Set<IdentityAutoFilledSlotKey>();
  const mutableSlot = (team: Team, slot: IdentityAutoFillSlot): boolean => {
    if (input.mode === 'fill-empty') return slot === 'mlb' ? !team.mlbArchetypeKey : !team.farmArchetypeKey;
    if (team.id !== input.rerollTeamId) return false;
    const current = slot === 'mlb' ? team.mlbArchetypeKey : team.farmArchetypeKey;
    return !current || autoSlots.has(identityAutoFilledSlotKey(team.id, slot));
  };
  const scopedTeam = (team: Team): boolean => input.includeHumanTeams || teamOwnerId(team, input.seats) === 'cpu';

  const counts = new Map<string, number>();
  for (const team of input.teams) {
    const keys: Array<[IdentityAutoFillSlot, string | undefined | null]> = [
      ['mlb', team.mlbArchetypeKey],
      ['farm', team.farmArchetypeKey],
    ];
    for (const [slot, key] of keys) {
      if (!key || mutableSlot(team, slot)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const nextTeams = new Map(input.teams.map((team) => [team.id, { ...team }]));
  const assignments: IdentityAutoAssignment[] = [];
  for (const team of [...input.teams].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!scopedTeam(team)) continue;
    const slots: IdentityAutoFillSlot[] = [];
    if (mutableSlot(team, 'mlb')) slots.push('mlb');
    if (mutableSlot(team, 'farm')) slots.push('farm');
    if (slots.length === 0) continue;

    const nextTeam = nextTeams.get(team.id) ?? { ...team };
    const assignment: IdentityAutoAssignment = { teamId: team.id, slots: [] };
    const rosterPlayers = teamRosterPlayers(input.players, input.activeLeagueId, team.id);
    for (const slot of slots) {
      const currentKey = slot === 'mlb' ? team.mlbArchetypeKey : team.farmArchetypeKey;
      const slotCandidates = currentKey && candidates.length > 1
        ? candidates.filter((archetype) => archetype.id !== currentKey)
        : candidates;
      const selected = chooseAutoFillArchetype({
        leagueId: input.leagueId,
        nonce: input.nonce,
        teamId: team.id,
        slot,
        candidates: slotCandidates,
        assignmentCounts: counts,
        poolSourceMode: input.poolSourceMode,
        rosterPlayers,
      });
      if (!selected) continue;
      counts.set(selected, (counts.get(selected) ?? 0) + 1);
      assignment.slots.push(slot);
      if (slot === 'mlb') {
        assignment.mlbKey = selected;
        nextTeam.mlbArchetypeKey = selected;
      } else {
        assignment.farmKey = selected;
        nextTeam.farmArchetypeKey = selected;
      }
    }
    nextTeams.set(team.id, nextTeam);
    if (assignment.slots.length > 0) assignments.push(assignment);
  }
  return assignments;
}

function playerName(player: Player): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

export function comparePlayersByIvDesc(ivById: ReadonlyMap<string, number>): (a: Player, b: Player) => number {
  return (a, b) => {
    const av = ivById.get(a.id);
    const bv = ivById.get(b.id);
    const aValid = Number.isFinite(av);
    const bValid = Number.isFinite(bv);
    if (aValid && bValid && av !== bv) return (bv as number) - (av as number);
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return playerName(a).localeCompare(playerName(b)) || a.id.localeCompare(b.id);
  };
}
