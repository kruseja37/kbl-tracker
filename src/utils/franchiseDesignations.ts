import type { Player } from './franchisePlayerStorage';

export type FranchiseDesignationType =
  | 'TEAM_MVP'
  | 'ACE'
  | 'FAN_FAVORITE'
  | 'ALBATROSS';

export type FranchiseCanonicalDesignationStatus = 'projected' | 'locked';
export type FranchiseDesignationStatus = FranchiseCanonicalDesignationStatus | 'active';

export const FRANCHISE_DESIGNATION_CALCULATION_VERSION = 'franchise-designations-v2-projected-canonical';
export const FRANCHISE_DESIGNATION_EP1_LIMITATION = 'EP1 R-8 peer pools use starts-derived effective positions/Reserve; pitchers pool by profile role in v1; two-way holders are valued compositionally with CALIBRATE trait anchors.';

export interface FranchiseDesignationPlayerInput {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  gamesPlayed: number;
  pitchingAppearances: number;
  totalWAR?: number | null;
  pWAR?: number | null;
  trueValue?: number | null;
  contractValue?: number | null;
  valueDelta?: number | null;
}

export interface FranchiseDesignationContext {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  gamesPerTeam: number;
  calculatedAt?: string;
}

export interface FranchiseDesignationCarryoverMetadata {
  carriesOver: boolean;
  untilSeasonProgress: number | null;
  previousSeasonId: string | null;
  previousPlayerId: string | null;
  note: string | null;
}

export interface FranchisePlayerDesignationRecord {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  type: FranchiseDesignationType;
  status: FranchiseDesignationStatus;
  sourceInputs: Record<string, number | string | boolean | null>;
  sourceEvidence?: string[];
  calculationVersion: string;
  calculatedAt: string;
  lockedAt: string | null;
  carryover: FranchiseDesignationCarryoverMetadata;
}

export interface FranchiseProjectedDesignationBadge {
  type: FranchiseDesignationType;
  label: string;
  prefix: 'Proj.';
  borderStyle: 'dotted';
  status: 'projected';
  colorHex: string;
  backgroundHex: string;
}

export interface FranchiseLiveDesignationBadge {
  type: FranchiseDesignationType;
  label: string;
  borderStyle: 'solid';
  status: 'active';
  colorHex: string;
  backgroundHex: string;
}

export interface DesignationEvent {
  eventType: 'designation';
  designationType: FranchiseDesignationType;
  transition: 'granted' | 'changed' | 'lost';
  playerId: string;
  previousPlayerId: string | null;
  teamId: string;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  status: FranchiseDesignationStatus;
  calculatedAt: string;
  moraleMutationApplied: false;
  relationshipMutationApplied: false;
  salaryMovementApplied: false;
}

const PITCHER_PRIMARY_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP']);

const PROJECTED_BADGES: Record<FranchiseDesignationType, FranchiseProjectedDesignationBadge> = {
  TEAM_MVP: {
    type: 'TEAM_MVP',
    label: 'Proj. MVP',
    prefix: 'Proj.',
    borderStyle: 'dotted',
    status: 'projected',
    colorHex: '#FFD700',
    backgroundHex: '#4A3F16',
  },
  ACE: {
    type: 'ACE',
    label: 'Proj. Ace',
    prefix: 'Proj.',
    borderStyle: 'dotted',
    status: 'projected',
    colorHex: '#4169E1',
    backgroundHex: '#1C2F64',
  },
  FAN_FAVORITE: {
    type: 'FAN_FAVORITE',
    label: 'Proj. Fan Favorite',
    prefix: 'Proj.',
    borderStyle: 'dotted',
    status: 'projected',
    colorHex: '#22C55E',
    backgroundHex: '#16452A',
  },
  ALBATROSS: {
    type: 'ALBATROSS',
    label: 'Proj. Albatross',
    prefix: 'Proj.',
    borderStyle: 'dotted',
    status: 'projected',
    colorHex: '#EF4444',
    backgroundHex: '#5A1F1F',
  },
};

const LIVE_DESIGNATION_BADGES: Partial<Record<FranchiseDesignationType, FranchiseLiveDesignationBadge>> = {
  TEAM_MVP: {
    type: 'TEAM_MVP',
    label: 'MVP',
    borderStyle: 'solid',
    status: 'active',
    colorHex: '#FFD700',
    backgroundHex: '#4A3F16',
  },
  ACE: {
    type: 'ACE',
    label: 'Ace',
    borderStyle: 'solid',
    status: 'active',
    colorHex: '#4169E1',
    backgroundHex: '#1C2F64',
  },
};

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function canonicalPosition(position: string): string {
  return String(position).trim().toUpperCase();
}

export function isFranchiseDesignationPitcher(position: string): boolean {
  return PITCHER_PRIMARY_POSITIONS.has(canonicalPosition(position));
}

export function minimumTeamMvpGames(gamesPerTeam: number): number {
  // MODE_2_CANON §17.1: Team MVP uses 20% of season, minimum 5 games.
  return Math.max(5, Math.ceil(gamesPerTeam * 0.2));
}

export function minimumAcePitchingAppearances(gamesPerTeam: number): number {
  // MODE_2_CANON §17.2: Ace uses 20% of season as pitcher, minimum 4.
  return Math.max(4, Math.ceil(gamesPerTeam * 0.2));
}

export function minimumValueDesignationGames(gamesPerTeam: number): number {
  // MODE_2_CANON §17.3-§17.4: Fan Favorite/Albatross use 10%, minimum 3.
  return Math.max(3, Math.ceil(gamesPerTeam * 0.1));
}

export function getProjectedDesignationBadge(
  type: FranchiseDesignationType,
): FranchiseProjectedDesignationBadge {
  return PROJECTED_BADGES[type];
}

export function getLiveDesignationBadge(
  type: FranchiseDesignationType,
): FranchiseLiveDesignationBadge | null {
  return LIVE_DESIGNATION_BADGES[type] ?? null;
}

function activeHolderKey(row: Pick<FranchisePlayerDesignationRecord, 'teamId' | 'type'>): string {
  return `${row.teamId}\u0000${row.type}`;
}

function activeHolderMap(
  rows: FranchisePlayerDesignationRecord[],
): Map<string, FranchisePlayerDesignationRecord> {
  const activeRows = rows
    .filter((row) => row.status === 'active')
    .sort((left, right) =>
      left.teamId.localeCompare(right.teamId) ||
      left.type.localeCompare(right.type) ||
      left.playerId.localeCompare(right.playerId),
    );
  return new Map(activeRows.map((row) => [activeHolderKey(row), row]));
}

function designationEvent(
  transition: DesignationEvent['transition'],
  prior: FranchisePlayerDesignationRecord | null,
  next: FranchisePlayerDesignationRecord | null,
): DesignationEvent {
  const source = next ?? prior;
  if (!source) {
    throw new Error('DesignationEvent requires a prior or next active holder.');
  }
  return {
    eventType: 'designation',
    designationType: source.type,
    transition,
    playerId: next?.playerId ?? source.playerId,
    previousPlayerId: prior?.playerId ?? null,
    teamId: source.teamId,
    franchiseId: source.franchiseId,
    seasonId: source.seasonId,
    statsScopeId: source.statsScopeId,
    status: source.status,
    calculatedAt: source.calculatedAt,
    moraleMutationApplied: false,
    relationshipMutationApplied: false,
    salaryMovementApplied: false,
  };
}

export function diffActiveDesignationHolders(
  prior: FranchisePlayerDesignationRecord[],
  next: FranchisePlayerDesignationRecord[],
): DesignationEvent[] {
  const priorActive = activeHolderMap(prior);
  const nextActive = activeHolderMap(next);
  const keys = Array.from(new Set([...priorActive.keys(), ...nextActive.keys()])).sort();
  const events: DesignationEvent[] = [];

  for (const key of keys) {
    const priorHolder = priorActive.get(key) ?? null;
    const nextHolder = nextActive.get(key) ?? null;
    if (!priorHolder && nextHolder) {
      events.push(designationEvent('granted', null, nextHolder));
    } else if (priorHolder && !nextHolder) {
      events.push(designationEvent('lost', priorHolder, null));
    } else if (priorHolder && nextHolder && priorHolder.playerId !== nextHolder.playerId) {
      events.push(designationEvent('changed', priorHolder, nextHolder));
    }
  }

  return events;
}

function byTeam(players: FranchiseDesignationPlayerInput[]): Map<string, FranchiseDesignationPlayerInput[]> {
  const grouped = new Map<string, FranchiseDesignationPlayerInput[]>();
  for (const player of players) {
    const current = grouped.get(player.teamId) ?? [];
    current.push(player);
    grouped.set(player.teamId, current);
  }
  return grouped;
}

function selectHighest(
  players: FranchiseDesignationPlayerInput[],
  value: (player: FranchiseDesignationPlayerInput) => number | null | undefined,
): FranchiseDesignationPlayerInput | null {
  return [...players]
    .filter((player) => finiteNumber(value(player)))
    .sort((left, right) => {
      const diff = (value(right) ?? 0) - (value(left) ?? 0);
      return diff || left.playerId.localeCompare(right.playerId);
    })[0] ?? null;
}

function selectLowest(
  players: FranchiseDesignationPlayerInput[],
  value: (player: FranchiseDesignationPlayerInput) => number | null | undefined,
): FranchiseDesignationPlayerInput | null {
  return [...players]
    .filter((player) => finiteNumber(value(player)))
    .sort((left, right) => {
      const diff = (value(left) ?? 0) - (value(right) ?? 0);
      return diff || left.playerId.localeCompare(right.playerId);
    })[0] ?? null;
}

function baseCarryover(type: FranchiseDesignationType): FranchiseDesignationCarryoverMetadata {
  if (type === 'FAN_FAVORITE' || type === 'ALBATROSS') {
    return {
      carriesOver: false,
      untilSeasonProgress: 0.1,
      previousSeasonId: null,
      previousPlayerId: null,
      note: 'MODE_2_CANON §17.3-§17.4 carryover metadata reserved for season-end locking slice.',
    };
  }

  return {
    carriesOver: false,
    untilSeasonProgress: null,
    previousSeasonId: null,
    previousPlayerId: null,
    note: null,
  };
}

function makeRecord(
  player: FranchiseDesignationPlayerInput,
  context: FranchiseDesignationContext,
  type: FranchiseDesignationType,
  sourceInputs: FranchisePlayerDesignationRecord['sourceInputs'],
  sourceEvidence: string[],
): FranchisePlayerDesignationRecord {
  const calculatedAt = context.calculatedAt ?? new Date().toISOString();
  return {
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    statsScopeId: context.statsScopeId,
    seasonNumber: context.seasonNumber,
    teamId: player.teamId,
    playerId: player.playerId,
    playerName: player.playerName,
    type,
    status: 'projected',
    sourceInputs: {
      ...sourceInputs,
      statusAuthority: 'MODE_2_CANON §17 projected-only; locking is out of scope for TV2.',
      peerPoolLimitation: FRANCHISE_DESIGNATION_EP1_LIMITATION,
    },
    sourceEvidence,
    calculationVersion: FRANCHISE_DESIGNATION_CALCULATION_VERSION,
    calculatedAt,
    lockedAt: null,
    carryover: baseCarryover(type),
  };
}

export function calculateFranchiseDesignations(
  players: FranchiseDesignationPlayerInput[],
  context: FranchiseDesignationContext,
): FranchisePlayerDesignationRecord[] {
  const records: FranchisePlayerDesignationRecord[] = [];
  const mvpFloor = minimumTeamMvpGames(context.gamesPerTeam);
  const aceFloor = minimumAcePitchingAppearances(context.gamesPerTeam);
  const valueFloor = minimumValueDesignationGames(context.gamesPerTeam);

  for (const teamPlayers of byTeam(players).values()) {
    const teamMvp = selectHighest(
      teamPlayers.filter((player) => player.gamesPlayed >= mvpFloor),
      (player) => player.totalWAR,
    );
    if (teamMvp) {
      records.push(makeRecord(teamMvp, context, 'TEAM_MVP', {
        totalWAR: finiteNumber(teamMvp.totalWAR) ? teamMvp.totalWAR : null,
        gamesPlayed: teamMvp.gamesPlayed,
        gamesFloor: mvpFloor,
      }, [
        'MODE_2_CANON §17.1: Team MVP is highest total WAR on team with 20% season/minimum 5 games.',
      ]));
    }

    const ace = selectHighest(
      teamPlayers.filter((player) =>
        isFranchiseDesignationPitcher(player.position) &&
        player.pitchingAppearances >= aceFloor &&
        finiteNumber(player.pWAR) &&
        player.pWAR >= 0.5,
      ),
      (player) => player.pWAR,
    );
    if (ace) {
      records.push(makeRecord(ace, context, 'ACE', {
        pWAR: finiteNumber(ace.pWAR) ? ace.pWAR : null,
        pitchingAppearances: ace.pitchingAppearances,
        pitchingAppearancesFloor: aceFloor,
        pWARFloor: 0.5,
      }, [
        'MODE_2_CANON §17.2: Ace is highest pWAR among team pitchers with 20%/minimum 4 pitcher games and pWAR >= 0.5.',
      ]));
    }

    const fanFavorite = selectHighest(
      teamPlayers.filter((player) =>
        player.gamesPlayed >= valueFloor &&
        finiteNumber(player.valueDelta) &&
        player.valueDelta > 0,
      ),
      (player) => player.valueDelta,
    );
    if (fanFavorite) {
      records.push(makeRecord(fanFavorite, context, 'FAN_FAVORITE', {
        trueValue: finiteNumber(fanFavorite.trueValue) ? fanFavorite.trueValue : null,
        contractValue: finiteNumber(fanFavorite.contractValue) ? fanFavorite.contractValue : null,
        valueDelta: fanFavorite.valueDelta ?? null,
        gamesPlayed: fanFavorite.gamesPlayed,
        gamesFloor: valueFloor,
      }, [
        'MODE_2_CANON §17.3: Fan Favorite is highest positive Value Delta with 10% season/minimum 3 games.',
        'R-5: valueDelta trust flips only for projected designations in TV2.',
      ]));
    }

    const albatross = selectLowest(
      teamPlayers.filter((player) =>
        player.gamesPlayed >= valueFloor &&
        finiteNumber(player.valueDelta) &&
        player.valueDelta < 0,
      ),
      (player) => player.valueDelta,
    );
    if (albatross) {
      records.push(makeRecord(albatross, context, 'ALBATROSS', {
        trueValue: finiteNumber(albatross.trueValue) ? albatross.trueValue : null,
        contractValue: finiteNumber(albatross.contractValue) ? albatross.contractValue : null,
        valueDelta: albatross.valueDelta ?? null,
        gamesPlayed: albatross.gamesPlayed,
        gamesFloor: valueFloor,
      }, [
        'MODE_2_CANON §17.4: Albatross is most negative Value Delta with 10% season/minimum 3 games.',
        'R-5: valueDelta trust flips only for projected designations in TV2.',
      ]));
    }
  }

  return records;
}

export function updateFranchiseDesignationTeamForTrade(
  player: Player,
  fromTeamId: string,
  toTeamId: string,
): Player {
  const designations = (player as Player & { franchiseDesignations?: FranchisePlayerDesignationRecord[] }).franchiseDesignations;
  if (!designations?.length) return player;

  // TV2 addendum: shared storage is the canonical designation source. This
  // compatibility path only carries stale embedded metadata through trade saves.
  return {
    ...player,
    franchiseDesignations: designations.map((designation) =>
      designation.teamId === fromTeamId
        ? {
            ...designation,
            teamId: toTeamId,
            sourceInputs: {
              ...designation.sourceInputs,
              previousTeamId: fromTeamId,
            },
          }
        : designation,
    ),
  } as Player;
}
