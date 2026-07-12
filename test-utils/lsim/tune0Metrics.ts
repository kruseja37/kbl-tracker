import { FAME_TIER_ORDER, resolveFameTier, type FameTier } from '../../src/engines/fameModel';
import type { ExpectedStatsAgeBand } from '../../src/engines/expectedStatsEngine';
import type { LsimStateSnapshot } from './invariants/types';
import type { LsimSandboxContext } from './sandbox';
import { getAllFranchisePlayers } from '../../src/utils/franchisePlayerStorage';
import { getFranchiseRatingsOverlaysByScope } from '../../src/utils/franchiseRatingsOverlayStorage';
import { getFranchiseTraitOverlaysByScope } from '../../src/utils/franchiseTraitOverlayStorage';
import { getFranchiseFameRecordRowsByScope } from '../../src/utils/franchiseFameRecordsStorage';
import { getFranchiseL10OverlaysByScope } from '../../src/utils/franchiseL10OverlayStorage';
import { getFranchiseRelationshipEdgesByScope } from '../../src/utils/franchiseRelationshipEdgesStorage';
import { listFranchiseMoraleSnapshots } from '../../src/utils/franchiseMoraleState';
import { listManagerProfiles } from '../../src/utils/managerIdentityStorage';

const AGE_BANDS: ExpectedStatsAgeBand[] = ['18-21', '22-24', '25-31', '32-35', '36+'];

export interface Tune0NumericDistribution {
  count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  sum: number;
  absoluteMean: number | null;
  absoluteSum: number;
}

export interface Tune0DevelopmentBandMetrics extends Tune0NumericDistribution {
  positive: number;
  negative: number;
  zero: number;
}

export interface Tune0MoraleDeltaMetrics extends Tune0NumericDistribution {
  changed: number;
  up: number;
  down: number;
}

export interface Tune0CheckpointMetrics {
  checkpointIndex: number;
  boundaryGameNumber: number;
  developmentProposals: {
    total: Tune0DevelopmentBandMetrics;
    byAgeBand: Record<ExpectedStatsAgeBand, Tune0DevelopmentBandMetrics>;
  };
  traitProposals: {
    gain: number;
    lose: number;
    byTrait: Record<string, { gain: number; lose: number }>;
  };
  fame: {
    heat: Tune0NumericDistribution & { p25: number | null; median: number | null; p75: number | null };
    tierCounts: Record<FameTier, number>;
  };
  moraleDeltas: {
    player: Tune0MoraleDeltaMetrics;
    teamFan: Tune0MoraleDeltaMetrics;
  };
  events: {
    l10New: number;
    l10Cumulative: number;
    l10ByFamily: Record<string, number>;
    l11New: number;
    l11Cumulative: number;
    l11ByReason: Record<string, number>;
  };
  relationships: {
    formedNew: number;
    formedCumulative: number;
    potentialCumulative: number;
    dissolvedCumulative: number;
    byTypeNew: Record<string, number>;
  };
}

function ageBand(age: number): ExpectedStatsAgeBand {
  if (!Number.isFinite(age)) return '25-31';
  if (age <= 21) return '18-21';
  if (age <= 24) return '22-24';
  if (age <= 31) return '25-31';
  if (age <= 35) return '32-35';
  return '36+';
}

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function numericDistribution(values: readonly number[]): Tune0NumericDistribution {
  const finite = values.filter((value) => Number.isFinite(value));
  const sum = finite.reduce((total, value) => total + value, 0);
  const absoluteSum = finite.reduce((total, value) => total + Math.abs(value), 0);
  return {
    count: finite.length,
    min: finite.length > 0 ? Math.min(...finite) : null,
    max: finite.length > 0 ? Math.max(...finite) : null,
    mean: finite.length > 0 ? round(sum / finite.length) : null,
    sum: round(sum),
    absoluteMean: finite.length > 0 ? round(absoluteSum / finite.length) : null,
    absoluteSum: round(absoluteSum),
  };
}

function developmentDistribution(values: readonly number[]): Tune0DevelopmentBandMetrics {
  return {
    ...numericDistribution(values),
    positive: values.filter((value) => value > 0).length,
    negative: values.filter((value) => value < 0).length,
    zero: values.filter((value) => value === 0).length,
  };
}

function moraleDistribution(values: readonly number[]): Tune0MoraleDeltaMetrics {
  return {
    ...numericDistribution(values),
    changed: values.filter((value) => value !== 0).length,
    up: values.filter((value) => value > 0).length,
    down: values.filter((value) => value < 0).length,
  };
}

function percentile(sorted: readonly number[], fraction: number): number | null {
  if (sorted.length === 0) return null;
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return round(sorted[lower] + ((sorted[upper] - sorted[lower]) * (index - lower)));
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function managerFirings(snapshot: LsimStateSnapshot): Array<Record<string, unknown>> {
  const managerDb = snapshot.storeDump.databases['kbl-manager-identity'] ?? {};
  const assignments = (managerDb.managerAssignments ?? [])
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .filter((row) => row.fired === true || typeof row.firedReason === 'string' || typeof row.endDate === 'string');
  const tenureRecords = (managerDb.managerProfiles ?? [])
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .flatMap((row) => Array.isArray(row.tenureRecords) ? row.tenureRecords : [])
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .filter((row) => row.endReason === 'fired');
  const unique = new Map<string, Record<string, unknown>>();
  for (const row of [...assignments, ...tenureRecords]) {
    const key = `${String(row.teamId ?? '')}:${String(row.endDate ?? row.managerId ?? '')}`;
    unique.set(key, row);
  }
  return [...unique.values()];
}

function moraleIdentity(row: LsimStateSnapshot['moraleSnapshots'][number]): string {
  return `${row.targetType}:${row.teamId ?? ''}:${row.playerId ?? ''}`;
}

export function buildTune0CheckpointMetrics(
  snapshot: LsimStateSnapshot,
  previousCheckpoint?: LsimStateSnapshot,
): Tune0CheckpointMetrics {
  const previousBoundary = previousCheckpoint?.gameNumber ?? 0;
  const ages = new Map(snapshot.players.map((player) => [player.id, ageBand(player.age)]));
  const newRatings = snapshot.ratingsOverlays.filter((row) =>
    row.createdAtGameNumber > previousBoundary && row.createdAtGameNumber <= snapshot.gameNumber,
  );
  const byAgeValues = Object.fromEntries(AGE_BANDS.map((band) => [band, [] as number[]])) as Record<
    ExpectedStatsAgeBand,
    number[]
  >;
  for (const row of newRatings) {
    byAgeValues[ages.get(row.playerId) ?? '25-31'].push(row.delta);
  }

  const newTraits = snapshot.traitOverlays.filter((row) =>
    row.createdAtGameNumber > previousBoundary && row.createdAtGameNumber <= snapshot.gameNumber,
  );
  const byTrait: Record<string, { gain: number; lose: number }> = {};
  for (const row of newTraits) {
    byTrait[row.traitName] ??= { gain: 0, lose: 0 };
    byTrait[row.traitName][row.valence] += 1;
  }

  const heatValues = snapshot.fameRows.map((row) => row.heat).sort((left, right) => left - right);
  const heat = numericDistribution(heatValues);
  const tierCounts = Object.fromEntries(FAME_TIER_ORDER.map((tier) => [tier, 0])) as Record<FameTier, number>;
  for (const row of snapshot.fameRows) {
    tierCounts[resolveFameTier(row.heat, row.reachFloor)] += 1;
  }

  const previousMorale = new Map(
    (previousCheckpoint?.moraleSnapshots ?? []).map((row) => [moraleIdentity(row), row.currentValue]),
  );
  const playerMoraleDeltas: number[] = [];
  const teamFanMoraleDeltas: number[] = [];
  for (const row of snapshot.moraleSnapshots) {
    const prior = previousMorale.get(moraleIdentity(row)) ?? row.baselineValue;
    const delta = round(row.currentValue - prior);
    if (row.targetType === 'player') playerMoraleDeltas.push(delta);
    else teamFanMoraleDeltas.push(delta);
  }

  const newL10 = snapshot.l10Overlays.filter((row) =>
    row.createdAtGameNumber > previousBoundary && row.createdAtGameNumber <= snapshot.gameNumber,
  );
  const l10ByFamily: Record<string, number> = {};
  for (const row of newL10) increment(l10ByFamily, row.family);

  const firings = managerFirings(snapshot);
  const previousFirings = previousCheckpoint ? managerFirings(previousCheckpoint) : [];
  const l11ByReason: Record<string, number> = {};
  for (const row of firings) increment(l11ByReason, String(row.firedReason ?? row.endReason ?? 'unspecified'));

  const newRelationships = snapshot.relationshipEdges.filter((row) =>
    row.formedAtGameNumber !== null &&
    row.formedAtGameNumber > previousBoundary &&
    row.formedAtGameNumber <= snapshot.gameNumber,
  );
  const byTypeNew: Record<string, number> = {};
  for (const row of newRelationships) increment(byTypeNew, row.type);

  return {
    checkpointIndex: snapshot.checkpointGameNumbers.indexOf(snapshot.gameNumber) + 1,
    boundaryGameNumber: snapshot.gameNumber,
    developmentProposals: {
      total: developmentDistribution(newRatings.map((row) => row.delta)),
      byAgeBand: Object.fromEntries(
        AGE_BANDS.map((band) => [band, developmentDistribution(byAgeValues[band])]),
      ) as Record<ExpectedStatsAgeBand, Tune0DevelopmentBandMetrics>,
    },
    traitProposals: {
      gain: newTraits.filter((row) => row.valence === 'gain').length,
      lose: newTraits.filter((row) => row.valence === 'lose').length,
      byTrait,
    },
    fame: {
      heat: {
        ...heat,
        p25: percentile(heatValues, 0.25),
        median: percentile(heatValues, 0.5),
        p75: percentile(heatValues, 0.75),
      },
      tierCounts,
    },
    moraleDeltas: {
      player: moraleDistribution(playerMoraleDeltas),
      teamFan: moraleDistribution(teamFanMoraleDeltas),
    },
    events: {
      l10New: newL10.length,
      l10Cumulative: snapshot.l10Overlays.length,
      l10ByFamily,
      l11New: Math.max(0, firings.length - previousFirings.length),
      l11Cumulative: firings.length,
      l11ByReason,
    },
    relationships: {
      formedNew: newRelationships.length,
      formedCumulative: snapshot.relationshipEdges.filter((row) => row.formedAtGameNumber !== null).length,
      potentialCumulative: snapshot.relationshipEdges.filter((row) => row.potential).length,
      dissolvedCumulative: snapshot.relationshipEdges.filter((row) => row.dissolvedAtGameNumber !== null).length,
      byTypeNew,
    },
  };
}

export function tune0CheckpointSeriesFromSnapshotChain(
  finalSnapshot: LsimStateSnapshot,
): Tune0CheckpointMetrics[] {
  const checkpointSet = new Set(finalSnapshot.checkpointGameNumbers);
  const snapshots: LsimStateSnapshot[] = [];
  let current: LsimStateSnapshot | undefined = finalSnapshot;
  while (current) {
    if (checkpointSet.has(current.gameNumber)) snapshots.push(current);
    current = current.previous;
  }
  snapshots.sort((left, right) => left.gameNumber - right.gameNumber);
  return snapshots.map((snapshot, index) => buildTune0CheckpointMetrics(snapshot, snapshots[index - 1]));
}

/**
 * Lightweight checkpoint reader for TUNE-0. The canonical snapshot reader also
 * dumps every IndexedDB store; doing that at every variant checkpoint makes the
 * one-factor sweep prohibitively slow. This reads only the contracted output
 * distributions and constructs the narrow snapshot shape consumed above.
 */
export async function readTune0MetricSnapshot(
  context: LsimSandboxContext,
  gameNumber: number,
  checkpointGameNumbers: number[],
): Promise<LsimStateSnapshot> {
  const scope = context.scope;
  const [
    players,
    ratingsOverlays,
    traitOverlays,
    fameRows,
    l10Overlays,
    relationshipEdges,
    moraleSnapshots,
    managerProfiles,
  ] = await Promise.all([
    getAllFranchisePlayers(scope.franchiseId),
    getFranchiseRatingsOverlaysByScope(scope),
    getFranchiseTraitOverlaysByScope(scope),
    getFranchiseFameRecordRowsByScope(scope),
    getFranchiseL10OverlaysByScope(scope),
    getFranchiseRelationshipEdgesByScope(scope),
    listFranchiseMoraleSnapshots(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      context.ids.seasonNumber,
    ),
    listManagerProfiles(),
  ]);

  return {
    gameNumber,
    gamesSimulated: gameNumber,
    totalScheduledGames: context.totalScheduledGames,
    gamesPerTeam: context.ids.gamesPerTeam,
    checkpointCadence: 'standard',
    checkpointCount: checkpointGameNumbers.length,
    checkpointGameNumbers,
    teamIds: [],
    teams: [],
    players,
    seasonMetadata: null,
    completedGames: [],
    standings: [],
    battingRows: [],
    pitchingRows: [],
    fieldingRows: [],
    fameRows,
    trueValueRows: [],
    trueValueSnapshots: [],
    designationRows: [],
    ratingsOverlays,
    relationshipEdges,
    traitOverlays,
    l10Overlays,
    flashpointRows: [],
    allStarRosters: [],
    awardRows: [],
    moraleSnapshots,
    seasonNewsItems: [],
    trustedValueArtifact: null,
    storeDump: {
      databases: {
        'kbl-manager-identity': { managerProfiles },
      },
      digest: 'tune0-lightweight-checkpoint',
      rowCounts: {},
    },
    l12Proof: null,
    persistenceProof: null,
    finalizeProof: null,
  };
}
