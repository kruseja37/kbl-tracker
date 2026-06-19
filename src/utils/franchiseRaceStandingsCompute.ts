/**
 * L12-3b — dark per-game race-standing recompute seam.
 *
 * Recompute-only: no store writes, no timestamps, no trackerDb interaction.
 * The result is returned to the caller for later L12 emission/UI consumers.
 */

import {
  computeFranchiseRaceStanding,
  MERIT_RACE_WEIGHTS,
  type RaceStanding,
  type RaceStandingCandidate,
} from '../engines/franchiseRaceStandingScorer';
import {
  computeFranchiseTvFamilyRaces,
  type FranchiseTvFamilyResult,
} from '../engines/franchiseTvFamilyScorer';
import type { PersistedGameState } from './gameStorage';
import {
  computeFranchiseRaceCandidateRows,
  type FranchiseWarAwardCategory,
} from './franchiseAwardsEngine';
import {
  getFranchiseFameRecordRowsByScope,
  type FranchiseFameRecordRow,
} from './franchiseFameRecordsStorage';
import { isFranchisePhase2L12Enabled } from './franchisePhase2Flags';
import {
  type CompletedGameArchiveOptions,
} from './franchiseCheckpointSweepCompute';
import type { FranchiseTrueValueRow } from './franchiseTrueValueStorage';
import {
  getFranchiseTrueValueSnapshotRowsByScope,
} from './franchiseTrueValueSnapshotsStorage';
import type { FranchiseAwardsScopeInput } from './franchiseAwardsStorage';

export const L12_GG_DEFENSIVE_FAME_SHARE = 0.2;

const L12_MERIT_RACE_CATEGORIES = [
  'MVP',
  'CY_YOUNG',
  'ROOKIE_OF_YEAR',
  'GOLD_GLOVE',
  'SILVER_SLUGGER',
  'BENCH_PLAYER',
  'BOOGER_GLOVE',
] as const;

type AwardsPreviewScope = FranchiseAwardsScopeInput & {
  seasonNumber: number;
};

export type FranchiseL12TrueValueScope = FranchiseAwardsScopeInput & {
  seasonNumber: number;
  rows: readonly FranchiseTrueValueRow[];
};

export interface FranchiseL12RaceStandings {
  meritRaces: Partial<Record<FranchiseWarAwardCategory, RaceStanding[]>>;
  tvFamily: FranchiseTvFamilyResult;
}

export type RecomputeL12Result = {
  status: 'dark-noop' | 'computed';
  reason?: string;
  standings?: FranchiseL12RaceStandings;
};

type FameSignals = {
  heat: number;
  reachFloor: number;
  defensiveFame: number;
};

async function computeRaceCandidateRows(
  scope: AwardsPreviewScope,
  categories: readonly FranchiseWarAwardCategory[],
) {
  return computeFranchiseRaceCandidateRows(scope, categories);
}

export const raceStandingsSeam = {
  computeRaceCandidateRows,
  getFameRows: getFranchiseFameRecordRowsByScope,
  getSnapshotRows: getFranchiseTrueValueSnapshotRowsByScope,
};

export async function recomputeFranchiseL12StandingsForCompletedGame(
  _gameState: PersistedGameState,
  scope: FranchiseL12TrueValueScope,
  _archiveOptions?: CompletedGameArchiveOptions,
): Promise<RecomputeL12Result> {
  if (!isFranchisePhase2L12Enabled()) {
    return { status: 'dark-noop', reason: 'Phase-2 L12 disabled.' };
  }

  const candidateRowsByCategory = await loadOrEmptyRecord(() => raceStandingsSeam.computeRaceCandidateRows({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
  }, L12_MERIT_RACE_CATEGORIES));
  const fameRows = await loadOrEmpty(() => raceStandingsSeam.getFameRows({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
  }));
  const fameByPlayerId = buildFameByPlayerId(fameRows);

  const meritRaces: FranchiseL12RaceStandings['meritRaces'] = {};
  for (const category of L12_MERIT_RACE_CATEGORIES) {
    const candidateRows = candidateRowsByCategory[category] ?? [];
    if (candidateRows.length === 0) continue;

    const candidates = candidateRows.map((candidate): RaceStandingCandidate => {
      const fame = fameByPlayerId.get(candidate.playerId) ?? noFameSignals();
      return {
        playerId: candidate.playerId,
        meritScore: category === 'GOLD_GLOVE'
          ? candidate.score + (L12_GG_DEFENSIVE_FAME_SHARE * fame.defensiveFame)
          : candidate.score,
        fameHeat: fame.heat,
        fameReachFloor: fame.reachFloor,
      };
    });

    meritRaces[category] = computeFranchiseRaceStanding({
      candidates,
      weights: MERIT_RACE_WEIGHTS,
    });
  }

  const values = scope.rows.map((row) => ({
    playerId: row.playerId,
    valueDelta: row.valueDelta,
    trueValue: row.trueValue,
  }));
  const snapshotRows = await loadOrEmpty(() => raceStandingsSeam.getSnapshotRows({
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
  }));
  const snapshots = snapshotRows.map((snapshot) => ({
    playerId: snapshot.playerId,
    checkpoint: snapshot.checkpoint,
    trueValue: snapshot.trueValue,
  }));
  const tvFamily = computeFranchiseTvFamilyRaces({ values, snapshots });

  return {
    status: 'computed',
    standings: {
      meritRaces,
      tvFamily,
    },
  };
}

async function loadOrEmpty<T>(
  loader: () => Promise<readonly T[]>,
): Promise<T[]> {
  try {
    const rows = await loader();
    return Array.isArray(rows) ? [...rows] : [];
  } catch {
    return [];
  }
}

async function loadOrEmptyRecord<T extends string, U>(
  loader: () => Promise<Partial<Record<T, readonly U[]>>>,
): Promise<Partial<Record<T, U[]>>> {
  try {
    const rowsByKey = await loader();
    if (!rowsByKey || typeof rowsByKey !== 'object') {
      return {};
    }
    const cloned: Partial<Record<T, U[]>> = {};
    for (const [key, rows] of Object.entries(rowsByKey) as Array<[T, readonly U[] | undefined]>) {
      cloned[key] = Array.isArray(rows) ? [...rows] : [];
    }
    return cloned;
  } catch {
    return {};
  }
}

function buildFameByPlayerId(rows: readonly FranchiseFameRecordRow[]): Map<string, FameSignals> {
  return new Map(rows.map((row) => [
    row.playerId,
    {
      heat: finiteOrZero(row.heat),
      reachFloor: finiteOrZero(row.reachFloor),
      defensiveFame: finiteOrZero(row.defensiveFame),
    },
  ]));
}

function noFameSignals(): FameSignals {
  return {
    heat: 0,
    reachFloor: 0,
    defensiveFame: 0,
  };
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
