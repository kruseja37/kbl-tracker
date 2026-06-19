import {
  computeFranchiseRaceStanding,
  FAN_VOTE_WEIGHTS,
  type RaceWeightProfile,
  type RaceStandingCandidate,
} from './franchiseRaceStandingScorer';

export type AllStarFieldPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

// 100%-fame fan wildcard weights (JK: "could be 100% fame"; §16-tunable to the 65% starter floor).
export const WILDCARD_WEIGHTS: RaceWeightProfile = {
  wMerit: 0, wFame: 1, fameAlwaysOn: true,
  tiltWindow: Number.POSITIVE_INFINITY, meritFloor: Number.NEGATIVE_INFINITY, bandGap: 0.08,
};

// One eligible candidate, pre-assembled by L12-4b. RAW position string + component merits; the ENGINE does ALL
// normalization (combo-position + two-way stronger-side) internally so it is fully unit-testable in isolation.
export interface AllStarCandidate {
  playerId: string;
  teamId: string;
  rawPosition: string;          // valuePosition (may be combo 'OF'/'IF'/'IF/OF'/'1B/OF', concrete 'C'..'RF'/'DH', or a pitcher label)
  hittingMerit: number | null;  // totalWar (full hitter value — backup ranking + the bat side of two-way)
  battingWar: number | null;    // batting component (two-way side comparison)
  startingMerit: number | null; // pitchingWar (SP ranking + the arm side of two-way)
  reliefMerit: number | null;   // pitchingWpa (RP ranking)
  gamesStarted: number;         // SP (>=1) vs RP (===0) classification
  qualifiedAsHitter: boolean;   // PA floor (meetsQualifier, computed by 4b)
  qualifiedAsPitcher: boolean;  // relaxed IP floor (meetsQualifier, computed by 4b)
  fameHeat: number;
  fameReachFloor: number;
}

export type AllStarSelectionRole = 'starter' | 'reserve';

export interface AllStarSelection {
  playerId: string;
  teamId: string;
  position: string;             // 'C'..'RF' | 'SP' | 'RP' | 'WILDCARD'
  role: AllStarSelectionRole;
  selectionScore: number;       // fame-led composite (starters/wildcard) OR raw merit (backups/pitchers)
}

export interface AllStarRosterConfig {
  positionStarters: readonly AllStarFieldPosition[];
  positionBackups: readonly { readonly slot: string; readonly eligible: readonly AllStarFieldPosition[]; readonly count: number }[];
  startingPitchers: number;
  backupStartingPitchers: number;
  relievers: number;
  backupRelievers: number;
  wildcards: number;
  starterWeights: RaceWeightProfile;
  wildcardWeights: RaceWeightProfile;
}

export const V1_ALL_STAR_ROSTER_CONFIG: AllStarRosterConfig = {
  positionStarters: ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
  positionBackups: [
    { slot: 'C', eligible: ['C'], count: 1 },
    { slot: 'corner-IF', eligible: ['1B', '3B'], count: 1 },
    { slot: 'middle-IF', eligible: ['2B', 'SS'], count: 1 },
    { slot: 'OF', eligible: ['LF', 'CF', 'RF'], count: 2 },
  ],
  startingPitchers: 4,
  backupStartingPitchers: 1,
  relievers: 5,
  backupRelievers: 2,
  wildcards: 1,
  starterWeights: FAN_VOTE_WEIGHTS,
  wildcardWeights: WILDCARD_WEIGHTS,
};

type PitcherKind = 'SP' | 'RP';

interface NormalizedHitterCandidate extends AllStarCandidate {
  facet: 'hitter';
  fieldPosition: AllStarFieldPosition;
}

interface NormalizedPitcherCandidate extends AllStarCandidate {
  facet: 'pitcher';
  pitcherKind: PitcherKind;
}

type NormalizedAllStarCandidate = NormalizedHitterCandidate | NormalizedPitcherCandidate;

const FIELD_POSITION_ORDER: readonly AllStarFieldPosition[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const PITCHER_POSITION_LABELS = new Set(['P', 'SP', 'RP', 'CP', 'SP/RP']);

export function computeFranchiseAllStarRoster(input: {
  candidates: readonly AllStarCandidate[];
  config?: AllStarRosterConfig;   // defaults to V1_ALL_STAR_ROSTER_CONFIG
}): AllStarSelection[] {
  const config = input.config ?? V1_ALL_STAR_ROSTER_CONFIG;
  const candidates = input.candidates
    .map(normalizeCandidate)
    .filter((candidate): candidate is NormalizedAllStarCandidate => candidate !== null);
  const selectedPlayerIds = new Set<string>();
  const selections: AllStarSelection[] = [];

  for (const position of config.positionStarters) {
    const positionCandidates = candidates.filter((candidate): candidate is NormalizedHitterCandidate =>
      candidate.facet === 'hitter' &&
      candidate.fieldPosition === position &&
      !selectedPlayerIds.has(candidate.playerId),
    );
    const starter = pickRaceWinner(positionCandidates, config.starterWeights, (candidate) => candidate.hittingMerit ?? 0);

    if (starter !== null) {
      selectedPlayerIds.add(starter.candidate.playerId);
      selections.push({
        playerId: starter.candidate.playerId,
        teamId: starter.candidate.teamId,
        position,
        role: 'starter',
        selectionScore: starter.selectionScore,
      });
    }
  }

  for (const slot of config.positionBackups) {
    const slotCandidates = candidates
      .filter((candidate): candidate is NormalizedHitterCandidate =>
        candidate.facet === 'hitter' &&
        slot.eligible.includes(candidate.fieldPosition) &&
        !selectedPlayerIds.has(candidate.playerId),
      )
      .sort((left, right) => compareNullableDesc(left.hittingMerit, right.hittingMerit) ||
        left.playerId.localeCompare(right.playerId));

    for (const candidate of slotCandidates.slice(0, slot.count)) {
      selectedPlayerIds.add(candidate.playerId);
      selections.push({
        playerId: candidate.playerId,
        teamId: candidate.teamId,
        position: candidate.fieldPosition,
        role: 'reserve',
        selectionScore: candidate.hittingMerit ?? 0,
      });
    }
  }

  const startingPitchers = candidates
    .filter((candidate): candidate is NormalizedPitcherCandidate =>
      candidate.facet === 'pitcher' &&
      candidate.pitcherKind === 'SP' &&
      !selectedPlayerIds.has(candidate.playerId),
    )
    .sort((left, right) => compareNullableDesc(left.startingMerit, right.startingMerit) ||
      left.playerId.localeCompare(right.playerId));

  for (const candidate of startingPitchers.slice(0, config.startingPitchers)) {
    selectedPlayerIds.add(candidate.playerId);
    selections.push({
      playerId: candidate.playerId,
      teamId: candidate.teamId,
      position: 'SP',
      role: 'starter',
      selectionScore: candidate.startingMerit ?? 0,
    });
  }

  for (const candidate of startingPitchers.slice(
    config.startingPitchers,
    config.startingPitchers + config.backupStartingPitchers,
  )) {
    selectedPlayerIds.add(candidate.playerId);
    selections.push({
      playerId: candidate.playerId,
      teamId: candidate.teamId,
      position: 'SP',
      role: 'reserve',
      selectionScore: candidate.startingMerit ?? 0,
    });
  }

  const relievers = candidates
    .filter((candidate): candidate is NormalizedPitcherCandidate =>
      candidate.facet === 'pitcher' &&
      candidate.pitcherKind === 'RP' &&
      candidate.reliefMerit !== null &&
      !selectedPlayerIds.has(candidate.playerId),
    )
    .sort((left, right) => compareNullableDesc(left.reliefMerit, right.reliefMerit) ||
      left.playerId.localeCompare(right.playerId));

  for (const candidate of relievers.slice(0, config.relievers)) {
    selectedPlayerIds.add(candidate.playerId);
    selections.push({
      playerId: candidate.playerId,
      teamId: candidate.teamId,
      position: 'RP',
      role: 'starter',
      selectionScore: candidate.reliefMerit ?? 0,
    });
  }

  for (const candidate of relievers.slice(
    config.relievers,
    config.relievers + config.backupRelievers,
  )) {
    selectedPlayerIds.add(candidate.playerId);
    selections.push({
      playerId: candidate.playerId,
      teamId: candidate.teamId,
      position: 'RP',
      role: 'reserve',
      selectionScore: candidate.reliefMerit ?? 0,
    });
  }

  const wildcardCandidates = candidates.filter((candidate) => !selectedPlayerIds.has(candidate.playerId));
  const wildcardStandings = computeFranchiseRaceStanding({
    candidates: wildcardCandidates.map((candidate): RaceStandingCandidate => ({
      playerId: candidate.playerId,
      meritScore: candidate.hittingMerit ?? candidate.startingMerit ?? candidate.reliefMerit ?? 0,
      fameHeat: candidate.fameHeat,
      fameReachFloor: candidate.fameReachFloor,
    })),
    weights: config.wildcardWeights,
  });

  for (const standing of wildcardStandings.slice(0, config.wildcards)) {
    const candidate = wildcardCandidates.find((row) => row.playerId === standing.playerId);

    if (candidate !== undefined) {
      selectedPlayerIds.add(candidate.playerId);
      selections.push({
        playerId: candidate.playerId,
        teamId: candidate.teamId,
        position: 'WILDCARD',
        role: 'starter',
        selectionScore: standing.composite,
      });
    }
  }

  return selections;
}

function normalizeCandidate(candidate: AllStarCandidate): NormalizedAllStarCandidate | null {
  const fieldPosition = normalizeFieldPosition(candidate.rawPosition);
  const pitcherKind = normalizePitcherKind(candidate.gamesStarted);
  const hitterEligible = candidate.qualifiedAsHitter && fieldPosition !== null;
  const pitcherEligible = candidate.qualifiedAsPitcher && pitcherKind !== null && normalizesToPitcher(candidate.rawPosition);

  if (hitterEligible && pitcherEligible) {
    const battingSide = candidate.battingWar ?? Number.NEGATIVE_INFINITY;
    const pitchingSide = candidate.startingMerit ?? Number.NEGATIVE_INFINITY;

    if (battingSide >= pitchingSide) {
      return {
        ...candidate,
        facet: 'hitter',
        fieldPosition,
      };
    }

    return {
      ...candidate,
      facet: 'pitcher',
      pitcherKind,
    };
  }

  if (hitterEligible) {
    return {
      ...candidate,
      facet: 'hitter',
      fieldPosition,
    };
  }

  if (pitcherEligible) {
    return {
      ...candidate,
      facet: 'pitcher',
      pitcherKind,
    };
  }

  return null;
}

function normalizeFieldPosition(rawPosition: string): AllStarFieldPosition | null {
  const normalized = normalizePositionText(rawPosition);

  if (isFieldPosition(normalized)) {
    return normalized;
  }

  switch (normalized) {
    case 'OF':
      return 'CF';
    case 'IF':
      return 'SS';
    case 'IF/OF':
      return 'CF';
    case '1B/OF':
      return '1B';
    default:
      return normalizeHybridFieldPosition(normalized);
  }
}

function normalizeHybridFieldPosition(normalizedPosition: string): AllStarFieldPosition | null {
  const parts = normalizedPosition.split('/').filter((part) => part.length > 0);

  for (const position of FIELD_POSITION_ORDER) {
    if (parts.includes(position)) {
      return position;
    }
  }

  if (parts.includes('OF')) {
    return 'CF';
  }

  if (parts.includes('IF')) {
    return 'SS';
  }

  return null;
}

function normalizesToPitcher(rawPosition: string): boolean {
  const normalized = normalizePositionText(rawPosition);

  if (PITCHER_POSITION_LABELS.has(normalized)) {
    return true;
  }

  const parts = normalized.split('/').filter((part) => part.length > 0);
  return parts.some((part) => PITCHER_POSITION_LABELS.has(part));
}

function normalizePitcherKind(gamesStarted: number): PitcherKind | null {
  if (gamesStarted >= 1) {
    return 'SP';
  }

  if (gamesStarted === 0) {
    return 'RP';
  }

  return null;
}

function pickRaceWinner<T extends AllStarCandidate>(
  candidates: readonly T[],
  weights: RaceWeightProfile,
  meritScoreForCandidate: (candidate: T) => number,
): { candidate: T; selectionScore: number } | null {
  const standings = computeFranchiseRaceStanding({
    candidates: candidates.map((candidate): RaceStandingCandidate => ({
      playerId: candidate.playerId,
      meritScore: meritScoreForCandidate(candidate),
      fameHeat: candidate.fameHeat,
      fameReachFloor: candidate.fameReachFloor,
    })),
    weights,
  });
  const winner = standings.find((standing) => standing.rank === 1);

  if (winner === undefined) {
    return null;
  }

  const candidate = candidates.find((row) => row.playerId === winner.playerId);
  return candidate === undefined
    ? null
    : { candidate, selectionScore: winner.composite };
}

function compareNullableDesc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

function isFieldPosition(position: string): position is AllStarFieldPosition {
  return FIELD_POSITION_ORDER.includes(position as AllStarFieldPosition);
}

function normalizePositionText(rawPosition: string): string {
  return rawPosition.trim().toUpperCase();
}
