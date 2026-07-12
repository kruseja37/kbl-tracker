import { FAME_TIER_ORDER, resolveFameTier, type FameTier } from '../../src/engines/fameModel';
import {
  computeRelationshipFormationEdges,
  L13_3A_RELATIONSHIP_EDGE_TYPES,
  RELATIONSHIP_FORMATION_TUNING,
  type RelationshipFormationEdgeType,
  type RelationshipFormationPlayer,
} from '../../src/engines/relationshipFormation';
import type { ExpectedStatsAgeBand } from '../../src/engines/expectedStatsEngine';
import type { FranchiseRelationshipEdgeScopeInput } from '../../src/utils/franchiseRelationshipEdgesStorage';
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
import {
  summarizeRelationshipMoraleDeltas,
  type LsimRelationshipMoraleDeltaSummary,
} from './invariants/soul';

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

export interface Tune0OrganicTimingBand {
  candidateCount: number;
  formedCount: number;
  meanGameWithUnformedCensored: number | null;
  meanFormationGame: number | null;
  minThresholdMargin: number | null;
  maxThresholdMargin: number | null;
}

export interface Tune0OrganicRelationshipMetrics {
  uniqueFormedEdges: number;
  uniqueFormedEdgesByType: Record<RelationshipFormationEdgeType, number>;
  activeEdgesAtEnd: number;
  formationGameSpread: {
    distinctGames: number;
    firstGame: number | null;
    lastGame: number | null;
    largestSingleGameBatch: number;
    batchesByGame: Record<string, number>;
  };
  perTeamEdgeCounts: {
    teamCount: number;
    min: number | null;
    median: number | null;
    max: number | null;
    byTeam: Record<string, number>;
    unassignedEdges: number;
  };
  candidateCoverage: {
    candidateEdges: number;
    formedCandidateEdges: number;
    formedFraction: number | null;
    strictSubset: boolean;
  };
  compatibilityTiming: {
    marginal: Tune0OrganicTimingBand;
    middle: Tune0OrganicTimingBand;
    strong: Tune0OrganicTimingBand;
    strongerFormsEarlierMonotone: boolean | null;
  };
  moraleCascade: LsimRelationshipMoraleDeltaSummary;
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
    organic: Tune0OrganicRelationshipMetrics;
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

function emptyTypeCounts(): Record<RelationshipFormationEdgeType, number> {
  return Object.fromEntries(
    L13_3A_RELATIONSHIP_EDGE_TYPES.map((type) => [type, 0]),
  ) as Record<RelationshipFormationEdgeType, number>;
}

function relationshipKey(player1Id: string, player2Id: string, type: string): string {
  const [left, right] = [player1Id, player2Id].sort((a, b) => a.localeCompare(b));
  return `${left}:${right}:${type}`;
}

function playerTeamId(
  player: LsimStateSnapshot['players'][number],
  leagueId: string | undefined,
): string | null {
  const assignment = player.leagueAssignments?.find((entry) =>
    entry.rosterStatus === 'MLB' && (!leagueId || entry.leagueId === leagueId),
  );
  return assignment?.teamId ?? null;
}

interface OrganicCandidate {
  key: string;
  teamId: string;
  type: RelationshipFormationEdgeType;
  thresholdMargin: number;
}

function organicCandidates(
  snapshot: LsimStateSnapshot,
  scope?: FranchiseRelationshipEdgeScopeInput,
): OrganicCandidate[] {
  if (!scope) return [];
  const leagueId = snapshot.teams[0]?.leagueIds?.[0];
  const playersByTeam = new Map<string, RelationshipFormationPlayer[]>();
  for (const player of snapshot.players) {
    const teamId = playerTeamId(player, leagueId);
    if (!teamId) continue;
    const players = playersByTeam.get(teamId) ?? [];
    players.push({
      playerId: player.id,
      teamId,
      personality: player.personality,
      age: player.age,
      modifiers: player.hiddenPersonalityModifiers,
    });
    playersByTeam.set(teamId, players);
  }

  const hazard = RELATIONSHIP_FORMATION_TUNING.perGameHazard as unknown as Record<string, number>;
  const activeSnapshot = {
    activeBase: hazard.activeBase,
    activeSlopePerPoint: hazard.activeSlopePerPoint,
    activeCap: hazard.activeCap,
  };
  const candidates: OrganicCandidate[] = [];
  try {
    // Harness-only discovery: probability 1 exposes every above-threshold active
    // candidate while preserving the live scoring and threshold implementation.
    hazard.activeBase = 1;
    hazard.activeSlopePerPoint = 0;
    hazard.activeCap = 1;
    for (const [teamId, players] of [...playersByTeam.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const edges = computeRelationshipFormationEdges(players, {
        ...scope,
        gameNumber: 1,
      });
      for (const edge of edges) {
        if (edge.potential) continue;
        candidates.push({
          key: relationshipKey(edge.player1Id, edge.player2Id, edge.type),
          teamId,
          type: edge.type,
          thresholdMargin: round(edge.score - edge.threshold),
        });
      }
    }
  } finally {
    Object.assign(hazard, activeSnapshot);
  }
  return candidates.sort((left, right) =>
    left.thresholdMargin - right.thresholdMargin || left.key.localeCompare(right.key),
  );
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : round((sorted[middle - 1] + sorted[middle]) / 2);
}

function timingBand(
  candidates: readonly OrganicCandidate[],
  formedAtByKey: ReadonlyMap<string, number>,
  censorGameNumber: number,
): Tune0OrganicTimingBand {
  const formedGames = candidates
    .map((candidate) => formedAtByKey.get(candidate.key))
    .filter((value): value is number => value !== undefined);
  const censoredGames = candidates.map((candidate) => formedAtByKey.get(candidate.key) ?? censorGameNumber);
  return {
    candidateCount: candidates.length,
    formedCount: formedGames.length,
    meanGameWithUnformedCensored: censoredGames.length > 0
      ? round(censoredGames.reduce((total, value) => total + value, 0) / censoredGames.length)
      : null,
    meanFormationGame: formedGames.length > 0
      ? round(formedGames.reduce((total, value) => total + value, 0) / formedGames.length)
      : null,
    minThresholdMargin: candidates.length > 0 ? candidates[0].thresholdMargin : null,
    maxThresholdMargin: candidates.length > 0 ? candidates[candidates.length - 1].thresholdMargin : null,
  };
}

export function buildTune0OrganicRelationshipMetrics(
  snapshot: LsimStateSnapshot,
  scope?: FranchiseRelationshipEdgeScopeInput,
): Tune0OrganicRelationshipMetrics {
  const formedEdges = snapshot.relationshipEdges.filter((row) =>
    row.formedAtGameNumber !== null &&
    (row.formationSource === undefined || row.formationSource === 'formation'),
  );
  const byType = emptyTypeCounts();
  const batchesByGame: Record<string, number> = {};
  for (const edge of formedEdges) {
    if (L13_3A_RELATIONSHIP_EDGE_TYPES.includes(edge.type as RelationshipFormationEdgeType)) {
      byType[edge.type as RelationshipFormationEdgeType] += 1;
    }
    increment(batchesByGame, String(edge.formedAtGameNumber));
  }
  const formationGames = Object.keys(batchesByGame).map(Number).sort((left, right) => left - right);

  const leagueId = snapshot.teams[0]?.leagueIds?.[0];
  const teamByPlayer = new Map(
    snapshot.players.map((player) => [player.id, playerTeamId(player, leagueId)]),
  );
  const teamIds = snapshot.teamIds.length > 0
    ? [...snapshot.teamIds]
    : [...new Set([...teamByPlayer.values()].filter((value): value is string => Boolean(value)))];
  const byTeam = Object.fromEntries(teamIds.sort().map((teamId) => [teamId, 0]));
  let unassignedEdges = 0;
  for (const edge of formedEdges) {
    const teamId = teamByPlayer.get(edge.player1Id) ?? teamByPlayer.get(edge.player2Id) ?? null;
    if (!teamId || !(teamId in byTeam)) {
      unassignedEdges += 1;
      continue;
    }
    byTeam[teamId] += 1;
  }
  const teamCounts = Object.values(byTeam);

  const candidates = organicCandidates(snapshot, scope);
  const candidateKeys = new Set(candidates.map((candidate) => candidate.key));
  const formedAtByKey = new Map(
    formedEdges.map((edge) => [
      relationshipKey(edge.player1Id, edge.player2Id, edge.type),
      edge.formedAtGameNumber as number,
    ]),
  );
  const firstCut = Math.floor(candidates.length / 3);
  const secondCut = Math.floor((candidates.length * 2) / 3);
  const marginal = timingBand(candidates.slice(0, firstCut), formedAtByKey, snapshot.gameNumber + 1);
  const middle = timingBand(candidates.slice(firstCut, secondCut), formedAtByKey, snapshot.gameNumber + 1);
  const strong = timingBand(candidates.slice(secondCut), formedAtByKey, snapshot.gameNumber + 1);
  const timingMeans = [marginal, middle, strong].map((band) => band.meanGameWithUnformedCensored);
  const monotone = timingMeans.every((value) => value !== null)
    ? (timingMeans[2] as number) <= (timingMeans[1] as number) &&
      (timingMeans[1] as number) <= (timingMeans[0] as number)
    : null;
  const formedCandidateEdges = [...formedAtByKey.keys()].filter((key) => candidateKeys.has(key)).length;

  return {
    uniqueFormedEdges: formedEdges.length,
    uniqueFormedEdgesByType: byType,
    activeEdgesAtEnd: formedEdges.filter((row) => row.dissolvedAtGameNumber === null).length,
    formationGameSpread: {
      distinctGames: formationGames.length,
      firstGame: formationGames[0] ?? null,
      lastGame: formationGames.at(-1) ?? null,
      largestSingleGameBatch: Math.max(0, ...Object.values(batchesByGame)),
      batchesByGame,
    },
    perTeamEdgeCounts: {
      teamCount: teamCounts.length,
      min: teamCounts.length > 0 ? Math.min(...teamCounts) : null,
      median: median(teamCounts),
      max: teamCounts.length > 0 ? Math.max(...teamCounts) : null,
      byTeam,
      unassignedEdges,
    },
    candidateCoverage: {
      candidateEdges: candidates.length,
      formedCandidateEdges,
      formedFraction: candidates.length > 0 ? round(formedCandidateEdges / candidates.length) : null,
      strictSubset: candidates.length > 0 && formedCandidateEdges < candidates.length,
    },
    compatibilityTiming: {
      marginal,
      middle,
      strong,
      strongerFormsEarlierMonotone: monotone,
    },
    moraleCascade: summarizeRelationshipMoraleDeltas(snapshot),
  };
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
  relationshipScope?: FranchiseRelationshipEdgeScopeInput,
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
      organic: buildTune0OrganicRelationshipMetrics(snapshot, relationshipScope),
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
    teamIds: context.teams.map((team) => team.id),
    teams: context.teams,
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
