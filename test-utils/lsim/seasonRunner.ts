import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { exportAllData, restoreAllData } from '../../src/utils/backupRestore';
import {
  createGameHeader,
  logAtBatEvent,
  logBetweenPlayEvent,
  logFieldingEvent,
  type AtBatEvent,
  type FieldingEvent,
  type RunnerState,
} from '../../src/utils/eventLog';
import { processCompletedGame } from '../../src/utils/processCompletedGame';
import { getFranchisePlayer, saveFranchisePlayer } from '../../src/utils/franchisePlayerStorage';
import { recomputeFranchiseL12StandingsForCompletedGame } from '../../src/utils/franchiseRaceStandingsCompute';
import { computeFranchiseRaceCandidateRows, computeAndPersistFranchiseWarAwards } from '../../src/utils/franchiseAwardsEngine';
import {
  freezeTrustedValueArtifactForSeason,
  getTrustedValueArtifact,
  persistTrustedValueArtifact,
} from '../../src/utils/franchiseTrustedValueStorage';
import { emitFranchiseSeasonEndHonors } from '../../src/src_figma/app/engines/reporter/franchiseSeasonEndHonors';
import { getTrackerDb, resetTrackerDbForTests, TRACKER_DB_VERSION } from '../../src/utils/trackerDb';
import type { AtBatResult } from '../../src/types/game';
import { computeLsimDistributions, type LsimDistributions } from './distributions';
import { forceAllPhase2FlagsOn, type ForcedPhase2Flags } from './flags';
import {
  getSoulInvariantChecks,
  REQUIRED_L12_MERIT_CATEGORIES,
  summarizeRelationshipMoraleDeltas,
} from './invariants/soul';
import { getStatsInvariantChecks } from './invariants/stats';
import type {
  LsimDeferredInvariant,
  LsimFinalizeProof,
  LsimFindingClassification,
  LsimInvariantResult,
  LsimL12Proof,
  LsimLastGameDelta,
  LsimPersistenceProof,
  LsimRunFinding,
  LsimStateSnapshot,
} from './invariants/types';
import { L_SIM_IDS, setupLsimSandbox, type LsimSandboxContext } from './sandbox';
import { checkpointGameNumbers, readLsimStateSnapshot } from './snapshots';
import { describeFirstStoreDumpDifference, stableStringify, dumpLsimStores } from './storeDump';
import { generateLsimSyntheticCompletedGame, type LsimSyntheticCompletedGame } from './syntheticGame';
import {
  CHECKPOINT_CADENCE_DEFAULT,
  checkpointCountForCadence,
  normalizeCheckpointCadence,
  type CheckpointCadence,
} from '../../src/data/rosterEngineConstants';

export interface LsimSeasonRunnerConfig {
  seed: string;
  teamCount?: 6;
  gamesPerTeam?: number;
  checkpointCadence?: CheckpointCadence;
  checkpointEvery?: number;
  writeCheckpoints?: boolean;
  outputDir?: string;
  runPersistenceProof?: boolean;
  runInvariantChecks?: boolean;
  runReplayIdempotency?: boolean;
  stopOnCritical?: boolean;
}

export interface LsimSeasonRunSummary {
  seed: string;
  teamCount: number;
  gamesPerTeam: number;
  checkpointCadence: CheckpointCadence;
  totalScheduledGames: number;
  gamesSimulated: number;
  stoppedEarly: boolean;
  finalDigest: string;
  checkpointGameNumbers: number[];
  invariantResults: Record<string, { pass: number; fail: number; tag: 'CRITICAL' | 'INVESTIGATE' }>;
  findings: LsimRunFinding[];
  distributions: LsimDistributions;
  finalSnapshot: LsimStateSnapshot;
  checkpointFiles: string[];
}

export interface LsimDeterminismSummary {
  seed: string;
  sameSeedByteIdentical: boolean;
  firstDigest: string;
  secondDigest: string;
  firstGamesSimulated: number;
  secondGamesSimulated: number;
}

export interface LsimH2SuiteSummary {
  baseline: LsimSeasonRunSummary;
  determinism: LsimDeterminismSummary;
  determinismFindings: LsimRunFinding[];
  deferred: LsimDeferredInvariant[];
}

const DEFAULT_TEAM_COUNT = 6 as const;
const DEFAULT_GAMES_PER_TEAM = 20;
const DEFAULT_CHECKPOINT_EVERY = 10;
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'test-utils/lsim/results');
const EMPTY_RUNNER_STATE: RunnerState = { first: null, second: null, third: null };
const EVENT_RESULTS: AtBatResult[] = ['1B', '2B', 'HR', 'K', 'BB', 'FO', 'GO', 'SF'];

function seededRandom(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function playerName(player: { firstName: string; lastName: string }): string {
  return `${player.firstName} ${player.lastName}`;
}

function finitePath(value: unknown, pathLabel = '$'): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : pathLabel;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = finitePath(value[index], `${pathLabel}[${index}]`);
      if (result) return result;
    }
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      const result = finitePath(entry, `${pathLabel}.${key}`);
      if (result) return result;
    }
  }
  return null;
}

function findingClassification(result: LsimInvariantResult): LsimFindingClassification {
  if (
    result.name.startsWith('stats.') ||
    result.name.includes('idempotency') ||
    result.name.includes('checkpoint') ||
    result.name.includes('ratings-overlay') ||
    result.name.includes('l12-race')
  ) {
    return 'mechanical/wiring (auto-fixable)';
  }
  return 'HALT - JK FIX DECISION';
}

function resultBucket(summary: LsimSeasonRunSummary['invariantResults'], result: LsimInvariantResult): void {
  const existing = summary[result.name] ?? { pass: 0, fail: 0, tag: result.tag };
  if (result.pass) existing.pass += 1;
  else existing.fail += 1;
  summary[result.name] = existing;
}

function sourceTimestamp(game: LsimSyntheticCompletedGame, gameNumber: number, eventIndex = 0): number {
  return game.gameState.savedAt + (eventIndex * 1000) + gameNumber;
}

async function seedSyntheticEventLog(
  context: LsimSandboxContext,
  synthetic: LsimSyntheticCompletedGame,
  gameNumber: number,
): Promise<void> {
  const game = synthetic.gameState;
  const playerById = new Map(context.teamSeeds.flatMap((seed) =>
    [...seed.mlbPlayers, ...seed.farmPlayers].map((player) => [player.id, player] as const),
  ));
  const awayStarter = game.pitcherGameStats.find((row) => row.teamId === game.awayTeamId && row.isStarter) ?? game.pitcherGameStats[0];
  const homeStarter = game.pitcherGameStats.find((row) => row.teamId === game.homeTeamId && row.isStarter) ?? game.pitcherGameStats[game.pitcherGameStats.length - 1];

  await createGameHeader({
    gameId: game.gameId,
    seasonId: context.ids.seasonId,
    statsScopeId: context.ids.statsScopeId,
    competitionType: 'franchise',
    competitionId: context.ids.franchiseId,
    competitionName: 'L-SIM H2 Sandbox',
    franchiseId: context.ids.franchiseId,
    leagueId: context.ids.leagueId,
    scheduleGameId: game.scheduleGameId,
    date: game.savedAt,
    awayTeamId: game.awayTeamId,
    awayTeamName: game.awayTeamName,
    homeTeamId: game.homeTeamId,
    homeTeamName: game.homeTeamName,
    stadiumName: game.stadiumName ?? null,
    startingLineups: {
      away: (game.awayLineupState?.lineup ?? []).map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        position: entry.position,
        battingOrder: entry.battingOrder,
      })),
      home: (game.homeLineupState?.lineup ?? []).map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        position: entry.position,
        battingOrder: entry.battingOrder,
      })),
    },
    benchRosters: {
      away: game.awayLineupState?.bench ?? [],
      home: game.homeLineupState?.bench ?? [],
    },
    startingPitchers: {
      away: { playerId: awayStarter.pitcherId, playerName: awayStarter.pitcherName },
      home: { playerId: homeStarter.pitcherId, playerName: homeStarter.pitcherName },
    },
    finalScore: synthetic.finalScore,
    finalInning: 9,
    totalInnings: context.ids.inningsPerGame,
    useGhostRunner: false,
    extraInningRunner: false,
    extraInningRunnerDelay: 2,
    isComplete: true,
  });

  const lineups = [
    {
      halfInning: 'TOP' as const,
      battingTeamId: game.awayTeamId,
      battingTeamName: game.awayTeamName,
      fieldingTeamId: game.homeTeamId,
      fieldingTeamName: game.homeTeamName,
      pitcher: homeStarter,
      lineup: game.awayLineupState?.lineup ?? [],
    },
    {
      halfInning: 'BOTTOM' as const,
      battingTeamId: game.homeTeamId,
      battingTeamName: game.homeTeamName,
      fieldingTeamId: game.awayTeamId,
      fieldingTeamName: game.awayTeamName,
      pitcher: awayStarter,
      lineup: game.homeLineupState?.lineup ?? [],
    },
  ];

  let eventIndex = 1;
  for (const half of lineups) {
    for (const [lineupIndex, batter] of half.lineup.slice(0, 9).entries()) {
      const result = EVENT_RESULTS[(lineupIndex + gameNumber) % EVENT_RESULTS.length];
      const isOut = ['K', 'FO', 'GO', 'SF'].includes(result);
      const runsScored = result === 'HR' ? [batter.playerId] : [];
      const awayScore = Math.floor((eventIndex - 1) / 3);
      const homeScore = Math.floor((eventIndex - 1) / 4);
      const atBatEvent: AtBatEvent = {
        eventId: `${game.gameId}-ab-${String(eventIndex).padStart(2, '0')}`,
        gameId: game.gameId,
        eventIndex,
        timestamp: sourceTimestamp(synthetic, gameNumber, eventIndex),
        batterId: batter.playerId,
        batterName: batter.playerName,
        batterTeamId: half.battingTeamId,
        pitcherId: half.pitcher.pitcherId,
        pitcherName: half.pitcher.pitcherName,
        pitcherTeamId: half.fieldingTeamId,
        result,
        rbiCount: runsScored.length,
        runsScored,
        inning: Math.min(9, Math.ceil(eventIndex / 2)),
        halfInning: half.halfInning,
        outs: eventIndex % 3,
        runners: EMPTY_RUNNER_STATE,
        awayScore,
        homeScore,
        outsAfter: isOut ? Math.min(3, (eventIndex % 3) + 1) : eventIndex % 3,
        runnersAfter: EMPTY_RUNNER_STATE,
        awayScoreAfter: awayScore + (half.halfInning === 'TOP' ? runsScored.length : 0),
        homeScoreAfter: homeScore + (half.halfInning === 'BOTTOM' ? runsScored.length : 0),
        leverageIndex: 1 + ((gameNumber + eventIndex) % 7) / 10,
        winProbabilityBefore: 0.45 + ((eventIndex % 5) / 100),
        winProbabilityAfter: 0.46 + ((eventIndex % 5) / 100),
        wpa: Number((((gameNumber + eventIndex) % 9) / 100).toFixed(3)),
        totalInnings: context.ids.inningsPerGame,
        useGhostRunner: false,
        extraInningRunner: false,
        extraInningRunnerDelay: 2,
        ballInPlay: isOut && result !== 'K'
          ? {
              trajectory: result === 'FO' || result === 'SF' ? 'fly' : 'ground',
              zone: (eventIndex % 6) + 1,
              velocity: eventIndex % 2 === 0 ? 'hard' : 'medium',
              fielderIds: [half.lineup[(lineupIndex + 3) % half.lineup.length]?.playerId ?? batter.playerId],
              primaryFielderId: half.lineup[(lineupIndex + 3) % half.lineup.length]?.playerId ?? batter.playerId,
            }
          : null,
        fameEvents: [],
        isLeadoff: lineupIndex === 0,
        isClutch: eventIndex % 4 === 0,
        isWalkOff: false,
        seasonId: context.ids.seasonId,
        seasonNumber: context.ids.seasonNumber,
        statsScopeId: context.ids.statsScopeId,
        competitionType: 'franchise',
        competitionId: context.ids.franchiseId,
        franchiseId: context.ids.franchiseId,
        scheduleGameId: game.scheduleGameId,
        leagueId: context.ids.leagueId,
        batterContext: {
          playerId: batter.playerId,
          playerName: batter.playerName,
          position: batter.position,
          battingOrder: batter.battingOrder,
          handedness: playerById.get(batter.playerId)?.bats,
          personality: playerById.get(batter.playerId)?.personality,
          hiddenModifiers: playerById.get(batter.playerId)?.hiddenPersonalityModifiers,
        },
        pitcherContext: {
          playerId: half.pitcher.pitcherId,
          playerName: half.pitcher.pitcherName,
          handedness: playerById.get(half.pitcher.pitcherId)?.throws,
          role: half.pitcher.isStarter ? 'Starter' : 'Reliever',
          personality: playerById.get(half.pitcher.pitcherId)?.personality,
          hiddenModifiers: playerById.get(half.pitcher.pitcherId)?.hiddenPersonalityModifiers,
        },
        teamContext: {
          battingTeam: { teamId: half.battingTeamId, teamName: half.battingTeamName },
          fieldingTeam: { teamId: half.fieldingTeamId, teamName: half.fieldingTeamName },
        },
        enrichment: {
          pitchLocation: eventIndex % 2 === 0 ? 'inside' : 'outside',
          pitchesInAtBat: 3 + (eventIndex % 5),
          fieldingDifficulty: eventIndex % 6 === 0 ? 'DIVING' : 'ROUTINE',
        },
        version: 1,
        editHistory: [],
      };
      await logAtBatEvent(atBatEvent);

      if (atBatEvent.ballInPlay) {
        const fielderId = atBatEvent.ballInPlay.primaryFielderId;
        const fielder = playerById.get(fielderId);
        const fieldingEvent: FieldingEvent = {
          fieldingEventId: `${atBatEvent.eventId}-fielding`,
          gameId: game.gameId,
          atBatEventId: atBatEvent.eventId,
          sequence: 1,
          playerId: fielderId,
          playerName: fielder ? playerName(fielder) : fielderId,
          position: (fielder?.primaryPosition ?? 'CF') as FieldingEvent['position'],
          teamId: half.fieldingTeamId,
          playType: eventIndex % 5 === 0 ? 'outfield_assist' : 'putout',
          difficulty: eventIndex % 6 === 0 ? 'spectacular' : 'routine',
          specialPlayType: eventIndex % 6 === 0 ? 'Diving' : 'Routine',
          ballInPlay: atBatEvent.ballInPlay,
          success: true,
          runsPreventedOrAllowed: eventIndex % 6 === 0 ? 1 : 0,
        };
        await logFieldingEvent(fieldingEvent);
      }

      eventIndex += 1;
    }
  }

  if (gameNumber % 7 === 0) {
    const injured = context.teamSeeds[gameNumber % context.teamSeeds.length].positionPlayers[gameNumber % 9];
    await logBetweenPlayEvent({
      eventId: `${game.gameId}-injury-${gameNumber}`,
      gameId: game.gameId,
      seasonId: context.ids.seasonId,
      seasonNumber: context.ids.seasonNumber,
      statsScopeId: context.ids.statsScopeId,
      competitionType: 'franchise',
      competitionId: context.ids.franchiseId,
      franchiseId: context.ids.franchiseId,
      scheduleGameId: game.scheduleGameId,
      leagueId: context.ids.leagueId,
      timestamp: sourceTimestamp(synthetic, gameNumber, 99),
      eventIndex: 1000 + gameNumber,
      type: 'injury',
      gameState: {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        totalInnings: context.ids.inningsPerGame,
        score: { away: game.awayScore, home: game.homeScore },
      },
      playerStateChange: {
        playerId: injured.id,
        playerName: playerName(injured),
        stateType: 'injury',
        previousValue: 'Healthy',
        newValue: 'Hurt',
        reason: 'L-SIM synthetic injury cadence',
      },
      version: 1,
      editHistory: [],
    });
  }
}

function deriveLastGameDelta(
  before: LsimStateSnapshot,
  afterFirst: LsimStateSnapshot,
  afterReplayDigest: string,
): LsimLastGameDelta {
  const beforeBatting = new Map(before.battingRows.map((row) => [row.playerId, row.games]));
  const beforePitching = new Map(before.pitchingRows.map((row) => [row.playerId, row.games]));
  return {
    battingIncreasedPlayerIds: afterFirst.battingRows
      .filter((row) => row.games > (beforeBatting.get(row.playerId) ?? 0))
      .map((row) => row.playerId)
      .sort(),
    pitchingIncreasedPlayerIds: afterFirst.pitchingRows
      .filter((row) => row.games > (beforePitching.get(row.playerId) ?? 0))
      .map((row) => row.playerId)
      .sort(),
    afterFirstProcessDigest: afterFirst.storeDump.digest,
    afterReplayDigest,
  };
}

async function breakRelationshipCoRosteringForRecovery(
  context: LsimSandboxContext,
  snapshot: LsimStateSnapshot,
): Promise<string | null> {
  const teamByPlayer = new Map<string, string | null>();
  const rosterStatusByPlayer = new Map<string, string | null>();
  for (const player of snapshot.players) {
    const assignment = player.leagueAssignments?.find((entry) => entry.leagueId === context.ids.leagueId);
    teamByPlayer.set(player.id, assignment?.teamId ?? null);
    rosterStatusByPlayer.set(player.id, assignment?.rosterStatus ?? null);
  }

  const candidate = snapshot.relationshipEdges.find((edge) =>
    edge.dissolvedAtGameNumber === null &&
    edge.potential === false &&
    teamByPlayer.get(edge.player1Id) &&
    teamByPlayer.get(edge.player1Id) === teamByPlayer.get(edge.player2Id) &&
    rosterStatusByPlayer.get(edge.player1Id) === 'MLB' &&
    rosterStatusByPlayer.get(edge.player2Id) === 'MLB' &&
    snapshot.moraleSnapshots.some((morale) =>
      morale.targetType === 'player' &&
      (morale.playerId === edge.player1Id || morale.playerId === edge.player2Id) &&
      morale.history.some((entry) => entry.sourceEventId.startsWith('relationship-hit:')),
    ),
  );
  if (!candidate) return null;

  const player = await getFranchisePlayer(context.ids.franchiseId, candidate.player2Id);
  if (!player) return null;
  await saveFranchisePlayer(context.ids.franchiseId, {
    ...player,
    leagueAssignments: (player.leagueAssignments ?? []).map((assignment) =>
      assignment.leagueId === context.ids.leagueId
        ? { ...assignment, rosterStatus: 'FARM' as const }
        : assignment,
    ),
  });
  return candidate.id;
}

async function buildL12Proof(
  context: LsimSandboxContext,
  synthetic: LsimSyntheticCompletedGame,
  snapshot: LsimStateSnapshot,
): Promise<LsimL12Proof> {
  const scope = {
    franchiseId: context.scope.franchiseId,
    seasonId: context.scope.seasonId,
    statsScopeId: context.scope.statsScopeId,
    seasonNumber: context.ids.seasonNumber,
  };
  const result = await recomputeFranchiseL12StandingsForCompletedGame(
    synthetic.gameState,
    { ...scope, rows: snapshot.trueValueRows },
    synthetic.archiveOptions,
  );
  if (result.status !== 'computed' || !result.standings) {
    return {
      status: result.status,
      candidateCount: 0,
      categories: [],
      hasNonFiniteScore: false,
      rankingMatchesComposite: true,
      missingCategoriesWithNonEmptyPool: [],
      detail: result.reason ?? 'no standings payload',
    };
  }

  const meritEntries = Object.entries(result.standings.meritRaces);
  const categories = meritEntries
    .filter(([, rows]) => Array.isArray(rows) && rows.length > 0)
    .map(([category]) => category)
    .sort();
  const candidateCount = meritEntries.reduce((sum, [, rows]) => sum + (rows?.length ?? 0), 0);

  // ranking == weighted composite: each category array is sorted DESC by composite with rank = index + 1.
  let rankingMatchesComposite = true;
  for (const [, rows] of meritEntries) {
    if (!Array.isArray(rows)) continue;
    for (let index = 0; index < rows.length; index += 1) {
      if (rows[index].rank !== index + 1) rankingMatchesComposite = false;
      if (index > 0 && rows[index].composite > rows[index - 1].composite + 1e-9) rankingMatchesComposite = false;
    }
  }

  // eligibility-pool refinement: a REQUIRED merit category ABSENT from standings is valid sparsity IFF its
  // eligibility pool (the production candidate-builder) is also empty; a non-empty pool means candidates were dropped.
  const presentSet = new Set(categories);
  const missing = REQUIRED_L12_MERIT_CATEGORIES.filter((category) => !presentSet.has(category));
  let missingCategoriesWithNonEmptyPool: string[] = [];
  if (missing.length > 0) {
    const pool = await computeFranchiseRaceCandidateRows(
      scope as Parameters<typeof computeFranchiseRaceCandidateRows>[0],
      missing as unknown as Parameters<typeof computeFranchiseRaceCandidateRows>[1],
    );
    const poolByCategory = pool as Record<string, unknown[] | undefined>;
    missingCategoriesWithNonEmptyPool = missing.filter((category) => (poolByCategory[category]?.length ?? 0) > 0);
  }

  return {
    status: result.status,
    candidateCount,
    categories,
    hasNonFiniteScore: finitePath(result.standings) !== null,
    rankingMatchesComposite,
    missingCategoriesWithNonEmptyPool,
    detail: `tvFamilyKeys=${Object.keys(result.standings.tvFamily).sort().join(',') || 'none'}; missingCategories=${missing.join(',') || 'none'}`,
  };
}

// Mirrors FranchiseHome.tsx:3219 awardComputedAtFromFreeze — a 1-LINE param derivation used at the genuine call site,
// NOT a finalize reimplementation. Ties the awards `computedAt` to the freeze's frozenAt (the determinism anchor).
function awardComputedAtFromFreeze(frozen: { frozenAt: number | null } | null): string | undefined {
  return frozen?.frozenAt ? new Date(frozen.frozenAt).toISOString() : undefined;
}

/**
 * §5.3 SEASON-FINALIZE — invokes the GENUINE production finalize chain exactly as FranchiseHome.tsx does at season-end
 * (the "two finalize calls" + the L12-5e-2 additive emission), in the same order. This is invoking production READ/write
 * code, NOT a harness reimplementation — a reimplemented finalize would be a hallucinated-green testing a fake.
 *
 *   1. freezeTrustedValueArtifactForSeason   src/utils/franchiseTrustedValueStorage.ts:97   (FranchiseHome.tsx:3309/3347)
 *   2. computeAndPersistFranchiseWarAwards    src/utils/franchiseAwardsEngine.ts:594         (FranchiseHome.tsx:3313/3352)
 *   3. emitFranchiseSeasonEndHonors           franchiseSeasonEndHonors.ts:69                 (FranchiseHome.tsx:3319/3359)
 *
 * It then actively re-tests the §5.3 TV-freeze idempotency + anti-thaw (a 2nd freeze is a no-op; a frozen->unfrozen
 * overwrite is refused by the storage guard) — both REFUSE to write, so the probe is store-neutral / deterministic.
 */
async function runSeasonFinalize(context: LsimSandboxContext): Promise<LsimFinalizeProof> {
  const scope = context.scope;
  const seasonNumber = context.ids.seasonNumber;
  const invoked: string[] = [];

  const frozen = await freezeTrustedValueArtifactForSeason(scope);
  invoked.push('freezeTrustedValueArtifactForSeason@src/utils/franchiseTrustedValueStorage.ts:97');

  const awards = await computeAndPersistFranchiseWarAwards({
    ...scope,
    seasonNumber,
    computedAt: awardComputedAtFromFreeze(frozen),
  });
  invoked.push('computeAndPersistFranchiseWarAwards@src/utils/franchiseAwardsEngine.ts:594');

  const emission = await emitFranchiseSeasonEndHonors({ ...scope, seasonNumber });
  invoked.push('emitFranchiseSeasonEndHonors@src/src_figma/app/engines/reporter/franchiseSeasonEndHonors.ts:69');

  // §5.3 TV-freeze idempotency + anti-thaw (the named property: a post-freeze recompute is a no-op).
  let reFreezeIdempotent = false;
  let antiThawHeld = false;
  const afterFreeze = await getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId);
  if (afterFreeze?.frozen === true && afterFreeze.frozenAt !== null) {
    const reFrozen = await freezeTrustedValueArtifactForSeason(scope);
    reFreezeIdempotent = reFrozen?.frozen === true && reFrozen.frozenAt === afterFreeze.frozenAt;
    // Anti-thaw: attempt a frozen->unfrozen overwrite. persistTrustedValueArtifact's guard MUST refuse it (no write),
    // leaving the artifact frozen at the original frozenAt. (Refused write => store-neutral => determinism preserved.)
    await persistTrustedValueArtifact({ ...afterFreeze, frozen: false, frozenAt: null });
    const afterThawAttempt = await getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId);
    antiThawHeld = afterThawAttempt?.frozen === true && afterThawAttempt.frozenAt === afterFreeze.frozenAt;
  }

  const finalized = awards.filter((row) => row.finalized);
  const withWinner = finalized.filter((row) => row.winnerPlayerId);
  return {
    ran: true,
    invoked,
    artifactPresent: frozen !== null,
    reFreezeIdempotent,
    antiThawHeld,
    emissionStatus: emission.status,
    emittedHonors: emission.emitted,
    awardsFinalizedCount: finalized.length,
    awardsWithWinnerCount: withWinner.length,
    detail: `frozenAt=${afterFreeze?.frozenAt ?? 'none'}; reFreezeIdempotent=${reFreezeIdempotent}; antiThawHeld=${antiThawHeld}; awardsFinalized=${finalized.length}; awardsWithWinner=${withWinner.length}; emission=${emission.status}; emitted=[${emission.emitted.join(',')}]`,
  };
}

function deleteIdbDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete ${name}`));
    request.onblocked = () => resolve();
  });
}

// A REAL version-bump migration leg (§5.4): write a row into kbl-tracker at an EARLY version, then open via the
// PRODUCTION getTrackerDb (which runs onupgradeneeded up to TRACKER_DB_VERSION) and confirm the early row survived,
// a late (v24) store now exists, and the DB sits at the current version. Destructive — the caller restores the
// franchise from a backup taken beforehand.
async function runMigrationSurvivalAcrossVersionBump(): Promise<boolean> {
  resetTrackerDbForTests();
  await deleteIdbDatabase('kbl-tracker');
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('kbl-tracker', 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('completedGames')) {
        db.createObjectStore('completedGames', { keyPath: 'gameId' });
      }
    };
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('completedGames', 'readwrite');
      tx.objectStore('completedGames').put({ gameId: 'lsim-migration-sentinel', sentinel: true });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    open.onerror = () => reject(open.error);
  });
  resetTrackerDbForTests();
  const db = await getTrackerDb();
  const survived = await new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction('completedGames', 'readonly');
      const get = tx.objectStore('completedGames').get('lsim-migration-sentinel');
      get.onsuccess = () => resolve(Boolean((get.result as { sentinel?: boolean } | undefined)?.sentinel));
      get.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
  return survived && db.objectStoreNames.contains('franchiseAllStarRosters') && db.version === TRACKER_DB_VERSION;
}

async function runPersistenceProof(): Promise<LsimPersistenceProof> {
  const before = await dumpLsimStores();
  const backup = await exportAllData();
  let migrationSurvivalAcrossVersionBump = false;
  try {
    migrationSurvivalAcrossVersionBump = await runMigrationSurvivalAcrossVersionBump();
  } catch {
    migrationSurvivalAcrossVersionBump = false;
  }
  // The migration leg rebuilt kbl-tracker holding only the sentinel; wipe again so the restore + round-trip parity
  // start from a clean DB rather than inheriting that sentinel row.
  resetTrackerDbForTests();
  await deleteIdbDatabase('kbl-tracker');
  const restoreResult = await restoreAllData(backup);
  const after = await dumpLsimStores();
  const byteIdentical = restoreResult.success === true && before.digest === after.digest;
  return {
    backupRoundTripByteIdentical: byteIdentical,
    migrationSurvivalChecked: restoreResult.success === true,
    migrationSurvivalAcrossVersionBump,
    detail: `restoreSuccess=${restoreResult.success}; beforeDigest=${before.digest}; afterDigest=${after.digest}; migrationVersionBump=${migrationSurvivalAcrossVersionBump}; restoredDatabases=${restoreResult.restoredDatabases?.length ?? 0}; error=${restoreResult.error ?? 'none'}`,
  };
}

function deferredInvariants(): LsimDeferredInvariant[] {
  return [
    {
      name: 'soul.real-export-migration-survival',
      section: '§5.4',
      reason: 'H2 validates sandbox backup/restore round-trip through the real API; no real user export is touched under the sandbox-only contract.',
    },
    {
      name: 'soul.tv-fixed-baseline-non-drift-across-seasons',
      section: '§5.6',
      reason: 'H2 baseline is one season; multi-season legs are delegated to Opus step 4.',
    },
  ];
}

async function writeCheckpointFile(
  outputDir: string,
  seed: string,
  snapshot: LsimStateSnapshot,
  findings: LsimRunFinding[],
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = path.join(
    outputDir,
    `${seed.replace(/[^a-zA-Z0-9_-]/g, '_')}-checkpoint-${String(snapshot.gameNumber).padStart(3, '0')}.json`,
  );
  await writeFile(filePath, stableStringify({
    gameNumber: snapshot.gameNumber,
    gamesSimulated: snapshot.gamesSimulated,
    digest: snapshot.storeDump.digest,
    rowCounts: snapshot.storeDump.rowCounts,
    relationshipMoraleDeltas: summarizeRelationshipMoraleDeltas(snapshot),
    findings,
  }), 'utf8');
  return filePath;
}

export async function runLsimSeason(config: LsimSeasonRunnerConfig): Promise<LsimSeasonRunSummary> {
  const teamCount = config.teamCount ?? DEFAULT_TEAM_COUNT;
  if (teamCount !== DEFAULT_TEAM_COUNT) {
    throw new Error(`[L-SIM-H2] H2 direct sandbox currently supports the seeded 6-team league; received teamCount=${teamCount}`);
  }
  const gamesPerTeam = config.gamesPerTeam ?? DEFAULT_GAMES_PER_TEAM;
  const checkpointCadence = normalizeCheckpointCadence(config.checkpointCadence ?? CHECKPOINT_CADENCE_DEFAULT);
  const checkpointCount = checkpointCountForCadence(checkpointCadence);
  const totalScheduledGames = Math.floor((teamCount * gamesPerTeam) / 2);
  const checkpointEvery = config.checkpointEvery ?? DEFAULT_CHECKPOINT_EVERY;
  const writeCheckpoints = config.writeCheckpoints ?? true;
  const outputDir = config.outputDir ?? DEFAULT_OUTPUT_DIR;
  const stopOnCritical = config.stopOnCritical ?? true;
  const runPersistence = config.runPersistenceProof ?? true;
  const runInvariantChecks = config.runInvariantChecks ?? true;
  const runReplayIdempotency = config.runReplayIdempotency ?? runInvariantChecks;
  const checks = runInvariantChecks ? [...getStatsInvariantChecks(), ...getSoulInvariantChecks()] : [];
  const findings: LsimRunFinding[] = [];
  const invariantResults: LsimSeasonRunSummary['invariantResults'] = {};
  const checkpointFiles: string[] = [];
  let flags: ForcedPhase2Flags | null = null;
  const originalRandom = Math.random;

  try {
    Math.random = seededRandom(config.seed);
    flags = forceAllPhase2FlagsOn();
    const context = await setupLsimSandbox({
      totalScheduledGames,
      initialGamesPlayed: 0,
      preseedPriorStats: false,
      deterministicScheduleIds: true,
      checkpointCadence,
    });
    let previous = await readLsimStateSnapshot(context, {
      gameNumber: 0,
      gamesSimulated: 0,
      l12Proof: {
        status: 'computed',
        candidateCount: 0,
        categories: [],
        hasNonFiniteScore: false,
        rankingMatchesComposite: true,
        missingCategoriesWithNonEmptyPool: [],
        detail: 'initial snapshot',
      },
      persistenceProof: null,
    });
    let finalSnapshot = previous;
    let stoppedEarly = false;
    let relationshipRecoveryBreakEdgeId: string | null = null;

    for (let gameNumber = 1; gameNumber <= totalScheduledGames; gameNumber += 1) {
      const synthetic = generateLsimSyntheticCompletedGame(context, {
        gameNumber,
        seed: `${config.seed}:game-${gameNumber}`,
      });
      if (runInvariantChecks && relationshipRecoveryBreakEdgeId === null && previous.relationshipEdges.length > 0) {
        relationshipRecoveryBreakEdgeId = await breakRelationshipCoRosteringForRecovery(context, previous);
      }
      await seedSyntheticEventLog(context, synthetic, gameNumber);
      const processOptions = {
        ...context.processOptions,
        currentGame: gameNumber,
        seasonTotalGames: totalScheduledGames,
        gamesPerTeam,
        gamesPerSeason: gamesPerTeam,
        milestoneConfig: {
          ...context.processOptions?.milestoneConfig,
          gamesPerSeason: gamesPerTeam,
          inningsPerGame: context.ids.inningsPerGame,
        },
      };

      await processCompletedGame(
        synthetic.gameState,
        processOptions,
        context.ids.leagueId,
        synthetic.archiveOptions,
      );

      if (!runInvariantChecks && !runReplayIdempotency) {
        if (gameNumber === totalScheduledGames) {
          // §5.3: drive the genuine production season-finalize so the determinism legs reproduce the finalized
          // end-state (frozen artifact + awards) byte-identically. Deterministic via the scenario's FrozenDate.
          await runSeasonFinalize(context);
          finalSnapshot = await readLsimStateSnapshot(context, {
            gameNumber,
            gamesSimulated: gameNumber,
            l12Proof: null,
            persistenceProof: null,
          });
        }
        if (gameNumber % checkpointEvery === 0 || gameNumber === totalScheduledGames) {
          const digest = gameNumber === totalScheduledGames
            ? finalSnapshot.storeDump.digest
            : (await dumpLsimStores()).digest;
          console.log('[L-SIM-H2] leg progress', JSON.stringify({
            seed: config.seed,
            gameNumber,
            totalScheduledGames,
            findings: findings.length,
            digest,
          }));
        }
        continue;
      }

      const afterFirst = await readLsimStateSnapshot(context, {
        gameNumber,
        gamesSimulated: gameNumber,
        previous,
        l12Proof: null,
        persistenceProof: null,
      });
      const l12Proof = await buildL12Proof(context, synthetic, afterFirst);

      let afterReplayDigest: string | undefined;
      if (runReplayIdempotency) {
        await processCompletedGame(
          synthetic.gameState,
          processOptions,
          context.ids.leagueId,
          synthetic.archiveOptions,
        );
        afterReplayDigest = (await dumpLsimStores()).digest;
      }
      const lastGameDelta = deriveLastGameDelta(previous, afterFirst, afterReplayDigest);
      // §5.3 season-finalize runs AFTER the idempotency replay (so afterFirst/afterReplay digests stay pre-finalize)
      // and BEFORE the persistence proof (so the backup captures the frozen artifact + awards).
      const finalizeProof = gameNumber === totalScheduledGames
        ? await runSeasonFinalize(context)
        : null;
      const persistenceProof = runPersistence && gameNumber === totalScheduledGames
        ? await runPersistenceProof()
        : null;
      finalSnapshot = await readLsimStateSnapshot(context, {
        gameNumber,
        gamesSimulated: gameNumber,
        previous,
        lastGameDelta,
        l12Proof,
        persistenceProof,
        finalizeProof,
      });

      const gameResults = checks.map((check) => check(finalSnapshot));
      for (const result of gameResults) {
        resultBucket(invariantResults, result);
        if (!result.pass) {
          findings.push({
            gameNumber,
            name: result.name,
            tag: result.tag,
            detail: result.detail,
            classification: findingClassification(result),
          });
        }
      }

      if (writeCheckpoints && (gameNumber % checkpointEvery === 0 || gameNumber === totalScheduledGames)) {
        checkpointFiles.push(await writeCheckpointFile(outputDir, config.seed, finalSnapshot, findings));
      }
      if (gameNumber % checkpointEvery === 0 || gameNumber === totalScheduledGames) {
        console.log('[L-SIM-H2] leg progress', JSON.stringify({
          seed: config.seed,
          gameNumber,
          totalScheduledGames,
          findings: findings.length,
          digest: finalSnapshot.storeDump.digest,
        }));
      }

      previous = finalSnapshot;

      if (stopOnCritical && gameResults.some((result) => result.tag === 'CRITICAL' && !result.pass)) {
        stoppedEarly = true;
        break;
      }
    }

    return {
      seed: config.seed,
      teamCount,
      gamesPerTeam,
      checkpointCadence,
      totalScheduledGames,
      gamesSimulated: finalSnapshot.gamesSimulated,
      stoppedEarly,
      finalDigest: finalSnapshot.storeDump.digest,
      checkpointGameNumbers: checkpointGameNumbers(totalScheduledGames, checkpointCount),
      invariantResults,
      findings,
      distributions: computeLsimDistributions(finalSnapshot),
      finalSnapshot,
      checkpointFiles,
    };
  } finally {
    Math.random = originalRandom;
    flags?.restore();
  }
}

export async function runLsimH2Suite(config: Partial<LsimSeasonRunnerConfig> = {}): Promise<LsimH2SuiteSummary> {
  const baseConfig = {
    seed: config.seed ?? 'lsim-h2-baseline',
    teamCount: config.teamCount ?? DEFAULT_TEAM_COUNT,
    gamesPerTeam: config.gamesPerTeam ?? DEFAULT_GAMES_PER_TEAM,
    checkpointCadence: normalizeCheckpointCadence(config.checkpointCadence ?? CHECKPOINT_CADENCE_DEFAULT),
    checkpointEvery: config.checkpointEvery ?? DEFAULT_CHECKPOINT_EVERY,
    outputDir: config.outputDir ?? DEFAULT_OUTPUT_DIR,
  } satisfies LsimSeasonRunnerConfig;
  const first = await runLsimSeason({
    ...baseConfig,
    seed: `${baseConfig.seed}-determinism`,
    writeCheckpoints: false,
    runPersistenceProof: false,
    runInvariantChecks: false,
    runReplayIdempotency: false,
    stopOnCritical: false,
  });
  const second = await runLsimSeason({
    ...baseConfig,
    seed: `${baseConfig.seed}-determinism`,
    writeCheckpoints: false,
    runPersistenceProof: false,
    runInvariantChecks: false,
    runReplayIdempotency: false,
    stopOnCritical: false,
  });
  const baseline = await runLsimSeason({
    ...baseConfig,
    writeCheckpoints: config.writeCheckpoints ?? true,
    runPersistenceProof: true,
    stopOnCritical: true,
  });
  const sameSeedByteIdentical = first.finalDigest === second.finalDigest &&
    first.gamesSimulated === second.gamesSimulated &&
    stableStringify(first.finalSnapshot.storeDump.databases) === stableStringify(second.finalSnapshot.storeDump.databases);
  const determinismDiff = sameSeedByteIdentical
    ? 'none'
    : describeFirstStoreDumpDifference(first.finalSnapshot.storeDump, second.finalSnapshot.storeDump);
  const determinismFindings: LsimRunFinding[] = sameSeedByteIdentical
    ? []
    : [{
        gameNumber: Math.max(first.gamesSimulated, second.gamesSimulated),
        name: 'soul.determinism-same-seed-byte-identical-end-state',
        tag: 'CRITICAL',
        detail: `firstDigest=${first.finalDigest}; secondDigest=${second.finalDigest}; firstGames=${first.gamesSimulated}; secondGames=${second.gamesSimulated}; diff=${determinismDiff}`,
        classification: 'mechanical/wiring (auto-fixable)',
      }];

  return {
    baseline,
    determinism: {
      seed: `${baseConfig.seed}-determinism`,
      sameSeedByteIdentical,
      firstDigest: first.finalDigest,
      secondDigest: second.finalDigest,
      firstGamesSimulated: first.gamesSimulated,
      secondGamesSimulated: second.gamesSimulated,
    },
    determinismFindings,
    deferred: deferredInvariants(),
  };
}

export function summarizeH2SuiteForConsole(summary: LsimH2SuiteSummary): string {
  return JSON.stringify({
    baseline: {
      gamesSimulated: summary.baseline.gamesSimulated,
      totalScheduledGames: summary.baseline.totalScheduledGames,
      checkpointCadence: summary.baseline.checkpointCadence,
      stoppedEarly: summary.baseline.stoppedEarly,
      finalDigest: summary.baseline.finalDigest,
      findings: summary.baseline.findings.length,
      criticalFindings: summary.baseline.findings.filter((finding) => finding.tag === 'CRITICAL').length,
      investigateFindings: summary.baseline.findings.filter((finding) => finding.tag === 'INVESTIGATE').length,
    },
    determinism: summary.determinism,
    distributions: summary.baseline.distributions,
    deferred: summary.deferred.map((entry) => entry.name),
    lsimIds: L_SIM_IDS,
  });
}
