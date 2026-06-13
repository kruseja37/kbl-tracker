import type { GameHeader } from './eventLog';
import { getGameHeadersForScope } from './eventLog';
import { TWO_WAY_TRAIT_POSITION } from '../data/rosterEngineConstants';
import type { PlayerPosition } from '../engines/salaryCalculator';

export const RESERVE_STARTS_SHARE_THRESHOLD = 0.4;
export const FRANCHISE_EFFECTIVE_POSITION_STARTS_SOURCE = 'game-header-starting-lineups' as const;
export const FRANCHISE_TRUE_VALUE_RESERVE_POOL = 'RESERVE' as const;

export type FranchiseTrueValuePoolKey = PlayerPosition | typeof FRANCHISE_TRUE_VALUE_RESERVE_POOL;
export type FranchiseTwoWayTrait = keyof typeof TWO_WAY_TRAIT_POSITION;
export type FranchiseTrueValueValuationMode =
  | 'single-position'
  | 'reserve'
  | 'two-way-composite'
  | 'invalid';

export interface FranchiseEffectivePositionPlayerInput {
  playerId: string;
  profilePosition: string | null | undefined;
  currentTeamId?: string | null;
  trait1?: string | null;
  trait2?: string | null;
  traits?: unknown;
  pitcherRole?: string | null;
}

export interface FranchiseTrueValuePositioning {
  valuationMode: FranchiseTrueValueValuationMode;
  valuePosition: PlayerPosition | null;
  effectivePosition: PlayerPosition | null;
  poolPosition: FranchiseTrueValuePoolKey | null;
  profilePosition: string | null;
  profilePitcherRole: PlayerPosition | null;
  starts: number;
  currentTeamStarts: number;
  teamCompletedGames: number;
  startsShare: number | null;
  isReserve: boolean;
  twoWayTrait: FranchiseTwoWayTrait | null;
  twoWayBatPosition: PlayerPosition | null;
  twoWayArmPosition: PlayerPosition | null;
  startsSource: typeof FRANCHISE_EFFECTIVE_POSITION_STARTS_SOURCE;
  reasons: string[];
}

export interface FranchiseEffectivePositionReport {
  startsSource: typeof FRANCHISE_EFFECTIVE_POSITION_STARTS_SOURCE;
  orderedGameIds: string[];
  teamCompletedGames: Record<string, number>;
  playerPositions: Record<string, FranchiseTrueValuePositioning>;
}

interface ReplayState {
  incumbent: PlayerPosition;
  counts: Partial<Record<PlayerPosition, number>>;
  starts: number;
  currentTeamStarts: number;
}

const POSITION_PLAYER_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'] as const;
const PITCHER_PROFILE_POSITIONS = ['SP', 'SP/RP', 'RP', 'CP'] as const;
const INFIELD_SCOPE = ['1B', '2B', 'SS', '3B'] as const;
const OUTFIELD_SCOPE = ['LF', 'CF', 'RF'] as const;

const POSITION_PLAYER_SET = new Set<string>(POSITION_PLAYER_POSITIONS);
const PITCHER_PROFILE_SET = new Set<string>(PITCHER_PROFILE_POSITIONS);
const INFIELD_SCOPE_SET = new Set<string>(INFIELD_SCOPE);
const OUTFIELD_SCOPE_SET = new Set<string>(OUTFIELD_SCOPE);

const TWO_WAY_ANCHORS: Record<FranchiseTwoWayTrait, PlayerPosition> = {
  'Two Way (C)': 'C',
  'Two Way (IF)': '2B',
  'Two Way (OF)': 'CF',
};

function normalizeLabel(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;
}

export function canonicalPositionPlayerPosition(value: unknown): PlayerPosition | null {
  const normalized = normalizeLabel(value);
  return normalized && POSITION_PLAYER_SET.has(normalized) ? normalized as PlayerPosition : null;
}

export function canonicalPitcherProfileRole(
  profilePosition: unknown,
  pitcherRole?: unknown,
): PlayerPosition | null {
  const role = normalizeLabel(pitcherRole);
  if (role && PITCHER_PROFILE_SET.has(role)) return role as PlayerPosition;
  const profile = normalizeLabel(profilePosition);
  return profile && PITCHER_PROFILE_SET.has(profile) ? profile as PlayerPosition : null;
}

function traitValues(player: FranchiseEffectivePositionPlayerInput): string[] {
  const values = [player.trait1, player.trait2].filter((value): value is string => typeof value === 'string');
  const rawTraits = player.traits;
  if (Array.isArray(rawTraits)) {
    values.push(...rawTraits.filter((value): value is string => typeof value === 'string'));
  } else if (rawTraits && typeof rawTraits === 'object') {
    values.push(...Object.values(rawTraits).filter((value): value is string => typeof value === 'string'));
  }
  return values;
}

export function getCanonicalTwoWayTrait(
  player: FranchiseEffectivePositionPlayerInput,
): FranchiseTwoWayTrait | null {
  return traitValues(player).find((trait): trait is FranchiseTwoWayTrait =>
    trait in TWO_WAY_TRAIT_POSITION,
  ) ?? null;
}

function scopeForTwoWayTrait(trait: FranchiseTwoWayTrait): Set<string> {
  if (trait === 'Two Way (C)') return new Set(['C']);
  if (trait === 'Two Way (IF)') return INFIELD_SCOPE_SET;
  return OUTFIELD_SCOPE_SET;
}

function positionInScope(position: unknown, scope: Set<string>): PlayerPosition | null {
  const normalized = canonicalPositionPlayerPosition(position);
  return normalized && scope.has(normalized) ? normalized : null;
}

function nextIncumbent(
  current: PlayerPosition,
  counts: Partial<Record<PlayerPosition, number>>,
  scope: readonly PlayerPosition[],
): PlayerPosition {
  const currentCount = counts[current] ?? 0;
  const max = Math.max(...scope.map((position) => counts[position] ?? 0));
  const leaders = scope.filter((position) => (counts[position] ?? 0) === max);
  return max > currentCount && leaders.length === 1 ? leaders[0] : current;
}

function emptyPositioning(
  player: FranchiseEffectivePositionPlayerInput,
  reasons: string[],
): FranchiseTrueValuePositioning {
  return {
    valuationMode: 'invalid',
    valuePosition: null,
    effectivePosition: null,
    poolPosition: null,
    profilePosition: player.profilePosition ?? null,
    profilePitcherRole: null,
    starts: 0,
    currentTeamStarts: 0,
    teamCompletedGames: 0,
    startsShare: null,
    isReserve: false,
    twoWayTrait: null,
    twoWayBatPosition: null,
    twoWayArmPosition: null,
    startsSource: FRANCHISE_EFFECTIVE_POSITION_STARTS_SOURCE,
    reasons,
  };
}

function sideTeamId(header: Pick<GameHeader, 'awayTeamId' | 'homeTeamId'>, side: 'away' | 'home'): string {
  return side === 'away' ? header.awayTeamId : header.homeTeamId;
}

function orderedHeaders(headers: GameHeader[]): GameHeader[] {
  return [...headers].sort((left, right) =>
    (left.date - right.date) || left.gameId.localeCompare(right.gameId),
  );
}

export function resolveFranchiseEffectivePositionsFromHeaders(input: {
  players: FranchiseEffectivePositionPlayerInput[];
  headers: GameHeader[];
}): FranchiseEffectivePositionReport {
  const headers = orderedHeaders(input.headers);
  const teamCompletedGames: Record<string, number> = {};
  const byPlayerId = new Map(input.players.map((player) => [player.playerId, player]));
  const replayStates = new Map<string, ReplayState>();
  const output = new Map<string, FranchiseTrueValuePositioning>();

  for (const player of input.players) {
    const twoWayTrait = getCanonicalTwoWayTrait(player);
    if (twoWayTrait) {
      const anchor = TWO_WAY_ANCHORS[twoWayTrait];
      const armRole = canonicalPitcherProfileRole(player.profilePosition, player.pitcherRole);
      replayStates.set(player.playerId, {
        incumbent: anchor,
        counts: {},
        starts: 0,
        currentTeamStarts: 0,
      });
      output.set(player.playerId, {
        ...emptyPositioning(player, armRole ? [] : ['Canonical pitcher profile role is required for two-way arm True Value.']),
        valuationMode: armRole ? 'two-way-composite' : 'invalid',
        valuePosition: anchor,
        effectivePosition: anchor,
        poolPosition: null,
        profilePitcherRole: armRole,
        twoWayTrait,
        twoWayBatPosition: anchor,
        twoWayArmPosition: armRole,
      });
      continue;
    }

    const pitcherRole = canonicalPitcherProfileRole(player.profilePosition, player.pitcherRole);
    if (pitcherRole) {
      output.set(player.playerId, {
        ...emptyPositioning(player, []),
        valuationMode: 'single-position',
        valuePosition: pitcherRole,
        effectivePosition: pitcherRole,
        poolPosition: pitcherRole,
        profilePitcherRole: pitcherRole,
      });
      continue;
    }

    const profilePosition = canonicalPositionPlayerPosition(player.profilePosition);
    if (!profilePosition) {
      output.set(player.playerId, emptyPositioning(
        player,
        [`Canonical position-player primary position is required; found ${String(player.profilePosition ?? 'missing')}.`],
      ));
      continue;
    }

    replayStates.set(player.playerId, {
      incumbent: profilePosition,
      counts: {},
      starts: 0,
      currentTeamStarts: 0,
    });
    output.set(player.playerId, {
      ...emptyPositioning(player, []),
      valuationMode: 'single-position',
      valuePosition: profilePosition,
      effectivePosition: profilePosition,
      poolPosition: profilePosition,
    });
  }

  for (const header of headers) {
    if (header.awayTeamId) teamCompletedGames[header.awayTeamId] = (teamCompletedGames[header.awayTeamId] ?? 0) + 1;
    if (header.homeTeamId) teamCompletedGames[header.homeTeamId] = (teamCompletedGames[header.homeTeamId] ?? 0) + 1;

    for (const side of ['away', 'home'] as const) {
      const teamId = sideTeamId(header, side);
      for (const starter of header.startingLineups?.[side] ?? []) {
        const player = byPlayerId.get(starter.playerId);
        const state = replayStates.get(starter.playerId);
        const existing = output.get(starter.playerId);
        if (!player || !state || !existing || existing.valuationMode === 'invalid') continue;

        const scope = existing.twoWayTrait
          ? Array.from(scopeForTwoWayTrait(existing.twoWayTrait)) as PlayerPosition[]
          : POSITION_PLAYER_POSITIONS as readonly PlayerPosition[];
        const startPosition = existing.twoWayTrait
          ? positionInScope(starter.position, scopeForTwoWayTrait(existing.twoWayTrait))
          : canonicalPositionPlayerPosition(starter.position);
        if (!startPosition) continue;

        state.counts[startPosition] = (state.counts[startPosition] ?? 0) + 1;
        state.starts += 1;
        if (player.currentTeamId && player.currentTeamId === teamId) {
          state.currentTeamStarts += 1;
        }
        state.incumbent = nextIncumbent(state.incumbent, state.counts, scope);
        output.set(starter.playerId, {
          ...existing,
          valuePosition: state.incumbent,
          effectivePosition: state.incumbent,
          poolPosition: existing.twoWayTrait ? existing.poolPosition : state.incumbent,
          twoWayBatPosition: existing.twoWayTrait ? state.incumbent : existing.twoWayBatPosition,
          starts: state.starts,
          currentTeamStarts: state.currentTeamStarts,
        });
      }
    }
  }

  for (const player of input.players) {
    const existing = output.get(player.playerId);
    if (!existing) continue;
    const teamGames = player.currentTeamId ? teamCompletedGames[player.currentTeamId] ?? 0 : 0;
    const state = replayStates.get(player.playerId);
    const currentTeamStarts = state?.currentTeamStarts ?? existing.currentTeamStarts;
    const startsShare = teamGames > 0 ? currentTeamStarts / teamGames : null;
    const isReserve = existing.valuationMode === 'single-position' &&
      existing.profilePitcherRole === null &&
      startsShare !== null &&
      startsShare < RESERVE_STARTS_SHARE_THRESHOLD;

    output.set(player.playerId, {
      ...existing,
      starts: state?.starts ?? existing.starts,
      currentTeamStarts,
      teamCompletedGames: teamGames,
      startsShare,
      isReserve,
      valuationMode: isReserve ? 'reserve' : existing.valuationMode,
      poolPosition: isReserve ? FRANCHISE_TRUE_VALUE_RESERVE_POOL : existing.poolPosition,
    });
  }

  return {
    startsSource: FRANCHISE_EFFECTIVE_POSITION_STARTS_SOURCE,
    orderedGameIds: headers.map((header) => header.gameId),
    teamCompletedGames,
    playerPositions: Object.fromEntries(output),
  };
}

export async function buildFranchiseEffectivePositionReport(input: {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  players: FranchiseEffectivePositionPlayerInput[];
}): Promise<FranchiseEffectivePositionReport> {
  const headers = await getGameHeadersForScope({
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    isComplete: true,
  });
  const scopedHeaders = headers.filter((header) =>
    header.franchiseId === input.franchiseId &&
    header.seasonId === input.seasonId &&
    (header.statsScopeId ?? header.seasonId) === input.statsScopeId,
  );
  return resolveFranchiseEffectivePositionsFromHeaders({
    players: input.players,
    headers: scopedHeaders,
  });
}
