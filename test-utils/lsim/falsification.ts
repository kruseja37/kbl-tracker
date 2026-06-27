/**
 * L-SIM-H2 invariant FALSIFICATION audit (Opus step-4; builder != auditor).
 *
 * JK directive 2026-06-19: the audit must confirm each invariant actually tests
 * what it claims — inject a KNOWN-BAD input and confirm it trips RED — not just
 * that the harness builds and runs. A check that can never fail proves nothing,
 * and the season run / preflight cannot catch that.
 *
 * This asserts, for the §5 soul-layer suite:
 *   (1) every invariant PASSES a neutral baseline snapshot (not vacuously red);
 *   (2) every invariant returns pass=false on a targeted known-bad mutation.
 *
 * RUN: NODE_ENV= npx vitest run -c test-utils/lsim/falsification.config.ts
 */
import { describe, expect, test } from 'vitest';
import { TRAIT_OPPOSITES } from '../../src/engines/traitAcquisition';
import { getSoulInvariantChecks } from './invariants/soul';
import type { LsimInvariantResult, LsimStateSnapshot } from './invariants/types';

const CHECKS = getSoulInvariantChecks();
const FINITE_CHANNELS = { wpa_spine: 0, iconic_event: 0, status: 0, defensive: 0, role_player: 0 };

function base(): LsimStateSnapshot {
  return {
    gameNumber: 1,
    gamesSimulated: 1,
    totalScheduledGames: 10,
    gamesPerTeam: 10,
    checkpointCadence: 'standard',
    checkpointCount: 5,
    checkpointGameNumbers: [2, 4, 6, 8, 10],
    teamIds: ['t1'],
    teams: [],
    players: [],
    seasonMetadata: null,
    completedGames: [],
    standings: [],
    battingRows: [],
    pitchingRows: [],
    fieldingRows: [],
    fameRows: [],
    trueValueRows: [],
    trueValueSnapshots: [],
    designationRows: [],
    ratingsOverlays: [],
    relationshipEdges: [],
    traitOverlays: [],
    l10Overlays: [],
    flashpointRows: [],
    allStarRosters: [],
    awardRows: [],
    moraleSnapshots: [],
    seasonNewsItems: [],
    trustedValueArtifact: null,
    finalizeProof: null,
    storeDump: { databases: {}, digest: 'base', rowCounts: {} },
    l12Proof: { status: 'computed', candidateCount: 0, categories: [], hasNonFiniteScore: false, rankingMatchesComposite: true, missingCategoriesWithNonEmptyPool: [], detail: 'base' },
    persistenceProof: null,
    lastGameDelta: {
      battingIncreasedPlayerIds: [],
      pitchingIncreasedPlayerIds: [],
      afterFirstProcessDigest: 'digest',
      afterReplayDigest: 'digest',
    },
  } as unknown as LsimStateSnapshot;
}

function resultFor(name: string, snap: LsimStateSnapshot): LsimInvariantResult {
  for (const check of CHECKS) {
    let r: LsimInvariantResult;
    try {
      r = check(snap);
    } catch {
      continue; // a non-target check threw on the mutated state; skip
    }
    if (r.name === name) return r;
  }
  // target threw or is absent → treat as "tripped" (it did not return pass=true)
  return { name, tag: 'CRITICAL', pass: false, detail: 'invariant threw or was absent on injected state' };
}

const [oppA, oppB] = Object.entries(TRAIT_OPPOSITES)[0] ?? ['Clutch', 'Choker'];

// Each case injects the minimal known-bad state the named invariant must catch.
const CASES: Array<{ name: string; mutate: (s: LsimStateSnapshot) => void }> = [
  { name: 'soul.fame-components-finite',
    mutate: (s) => { s.fameRows = [{ playerId: 'p', heat: Number.NaN, reachFloor: 0, channelByChannel: { ...FINITE_CHANNELS } } as never]; } },
  { name: 'soul.fame-reach-monotonic',
    mutate: (s) => {
      s.allStarRosters = [{
        locked: true,
        lockedAtGameNumber: Math.round(s.totalScheduledGames * 0.6),
        selections: [{ playerId: 'p', teamId: 't1', position: 'C', role: 'starter' }],
      } as never];
      s.fameRows = [{ playerId: 'p', reachFloor: 1, heat: 0, channelByChannel: { ...FINITE_CHANNELS } } as never];
    } },
  { name: 'soul.fame-heat-fickle',
    mutate: (s) => { s.gamesSimulated = s.totalScheduledGames; /* season-end, no up+down transitions */ } },
  { name: 'soul.fame-war-legitimacy-floor', // NAMED property: apex degeneracy (replacement-WAR at the top tier) AND the elite-merit floor not firing (an elite-WAR player stranded at Unknown heat)
    mutate: (s) => {
      // p trips the apex-degeneracy clause (bottom-decile WAR holding IMMORTAL_LEGEND);
      // q trips the new elite-floor clause (top-decile WAR but heat below LOCAL_HERO == the gravity never lifted him).
      s.fameRows = [
        { playerId: 'p', heat: 50, reachFloor: 5, channelByChannel: { ...FINITE_CHANNELS } } as never,
        { playerId: 'q', heat: 0, reachFloor: 0, channelByChannel: { ...FINITE_CHANNELS } } as never,
      ];
      s.trueValueRows = [
        { playerId: 'p', warPercentile: 0.05 } as never,
        { playerId: 'q', warPercentile: 0.95 } as never,
      ];
    } },
  { name: 'soul.l12-race-no-nan-resolve-tier', // NAMED property now: eligible candidates dropped despite a non-empty pool
    mutate: (s) => {
      s.l12Proof = {
        status: 'computed', candidateCount: 1, categories: ['MVP'], hasNonFiniteScore: false,
        rankingMatchesComposite: true, missingCategoriesWithNonEmptyPool: ['RELIEVER_OF_YEAR'], detail: 'dropped',
      };
    } },
  { name: 'soul.morale-bounds',
    mutate: (s) => { s.moraleSnapshots = [{ id: 'm1', currentValue: 150, baselineValue: 50, targetType: 'player' } as never]; } },
  { name: 'soul.flashpoint-compounding-clamped', // NAMED property: lastGameTax must match computeFlashpointGameTax (ramp+clamp)
    mutate: (s) => { s.flashpointRows = [{ playerId: 'p', flashpointKind: 'albatross', consecutiveGamesUnresolved: 3, accumulatedFanMoraleTax: -1.5, lastGameTax: -0.5 } as never]; } },
  { name: 'soul.designation-six-slots-single-holder', // NAMED property: <=1 ACTIVE holder per (team,type)
    mutate: (s) => { s.designationRows = [{ teamId: 't1', type: 'TEAM_MVP', status: 'active', playerId: 'p1' } as never, { teamId: 't1', type: 'TEAM_MVP', status: 'active', playerId: 'p2' } as never]; } },
  { name: 'soul.albatross-2x-min-salary-overpaid-gate',
    mutate: (s) => { s.designationRows = [{ teamId: 't1', playerId: 'p', type: 'ALBATROSS', sourceInputs: { salary: 100, albatrossSalaryFloor: 50, valueDeltaOverContract: 0, gamesPlayed: 10, gamesFloor: 1 } } as never]; } },
  { name: 'soul.l10-per-game-cadence',
    mutate: (s) => { s.gameNumber = 1; s.l10Overlays = [{ sourceEventId: 'l10-5' } as never]; /* game 5 > current 1 */ } },
  // l11-backstop now detects firings via the fan-morale relief entry (the assignment is overwritten by the successor).
  // Three inverse cases, each tripping a DIFFERENT named property it can NOW see (scoped rows left empty -> roll-check skipped, isolating a/c/d):
  { name: 'soul.l11-backstop-under-25-plus-roll', // (a) firing-time morale >= 25 (relief entry previousValue)
    mutate: (s) => {
      s.moraleSnapshots = [{ targetType: 'team-fan', teamId: 't1', history: [{ reason: 'manager.fired.relief', previousValue: 30, currentValue: 38 }] } as never];
      s.storeDump = { databases: { 'kbl-manager-identity': { managerAssignments: [{ teamId: 't1', managerId: 'succ', fired: false }], managerProfiles: [{ managerId: 'm', tenureRecords: [{ teamId: 't1', endReason: 'fired', endDate: '2026-01-01' }] }] } }, digest: '', rowCounts: {} };
    } },
  { name: 'soul.l11-backstop-under-25-plus-roll', // (c) no active successor generated for the fired team
    mutate: (s) => {
      s.moraleSnapshots = [{ targetType: 'team-fan', teamId: 't1', history: [{ reason: 'manager.fired.relief', previousValue: 20, currentValue: 28 }] } as never];
      s.storeDump = { databases: { 'kbl-manager-identity': { managerAssignments: [], managerProfiles: [{ managerId: 'm', tenureRecords: [{ teamId: 't1', endReason: 'fired', endDate: '2026-01-01' }] }] } }, digest: '', rowCounts: {} };
    } },
  { name: 'soul.l11-backstop-under-25-plus-roll', // (d) firing left a relief but NO durable fired-tenure record
    mutate: (s) => {
      s.moraleSnapshots = [{ targetType: 'team-fan', teamId: 't1', history: [{ reason: 'manager.fired.relief', previousValue: 20, currentValue: 28 }] } as never];
      s.storeDump = { databases: { 'kbl-manager-identity': { managerAssignments: [{ teamId: 't1', managerId: 'succ', fired: false }], managerProfiles: [] } }, digest: '', rowCounts: {} };
    } },
  { name: 'soul.per-write-idempotency',
    mutate: (s) => { s.lastGameDelta = { battingIncreasedPlayerIds: [], pitchingIncreasedPlayerIds: [], afterFirstProcessDigest: 'a', afterReplayDigest: 'b' }; } },
  { name: 'soul.checkpoint-cadence-matches-setting',
    mutate: (s) => { s.gamesSimulated = s.totalScheduledGames; s.gameNumber = s.totalScheduledGames; s.ratingsOverlays = [{ sourceEventId: 'checkpoint-2' } as never]; /* only 1 of 5 boundaries */ } },
  { name: 'soul.l13-relationship-formation-checkpoint-write',
    mutate: (s) => {
      s.gameNumber = 2;
      s.gamesSimulated = 2;
      s.players = [
        { id: 'p1', leagueAssignments: [{ teamId: 't1' }] } as never,
        { id: 'p2', leagueAssignments: [{ teamId: 't1' }] } as never,
      ];
      const row = {
        id: 'f:s:ss:p1:p2:RIVALRY',
        franchiseId: 'f',
        seasonId: 's',
        statsScopeId: 'ss',
        seasonNumber: 1,
        player1Id: 'p1',
        player2Id: 'p2',
        type: 'RIVALRY',
        intensity: 0.9,
        potential: false,
        accuracy: 0.8,
        formedAtGameNumber: 2,
        dissolvedAtGameNumber: null,
        createdAt: 2,
        updatedAt: 2,
      };
      s.relationshipEdges = [row, row] as never;
    } },
  { name: 'soul.l13-relationship-formation-checkpoint-write',
    mutate: (s) => {
      s.gameNumber = 3;
      s.gamesSimulated = 3;
      s.players = [
        { id: 'p1', leagueAssignments: [{ teamId: 't1' }] } as never,
        { id: 'p2', leagueAssignments: [{ teamId: 't1' }] } as never,
      ];
      s.relationshipEdges = [{
        id: 'f:s:ss:p1:p2:FRIENDSHIP',
        franchiseId: 'f',
        seasonId: 's',
        statsScopeId: 'ss',
        seasonNumber: 1,
        player1Id: 'p1',
        player2Id: 'p2',
        type: 'FRIENDSHIP',
        intensity: 0.9,
        potential: false,
        accuracy: 0.8,
        formedAtGameNumber: 3,
        dissolvedAtGameNumber: null,
        createdAt: 3,
        updatedAt: 3,
      }] as never;
    } },
  { name: 'soul.l13-relationship-intensity-lifecycle',
    mutate: (s) => {
      s.gameNumber = 3;
      s.gamesSimulated = 3;
      s.completedGames = [{ gameId: 'game-3', playerStats: {}, pitcherGameStats: [] }] as never;
      s.relationshipEdges = [{
        id: 'f:s:ss:p1:p2:RIVALRY',
        franchiseId: 'f',
        seasonId: 's',
        statsScopeId: 'ss',
        seasonNumber: 1,
        player1Id: 'p1',
        player2Id: 'p2',
        type: 'RIVALRY',
        intensity: 0.99,
        potential: false,
        accuracy: 0.8,
        formedAtGameNumber: 1,
        dissolvedAtGameNumber: null,
        createdAt: 1,
        updatedAt: 3,
      }] as never;
    } },
  { name: 'soul.l13-relationship-morale-development-boundary',
    mutate: (s) => {
      s.gameNumber = s.totalScheduledGames;
      s.gamesSimulated = s.totalScheduledGames;
      s.relationshipEdges = [{
        id: 'f:s:ss:p1:p2:FEUD',
        franchiseId: 'f',
        seasonId: 's',
        statsScopeId: 'ss',
        seasonNumber: 1,
        player1Id: 'p1',
        player2Id: 'p2',
        type: 'FEUD',
        intensity: 0.9,
        potential: false,
        accuracy: 0.8,
        formedAtGameNumber: 2,
        dissolvedAtGameNumber: null,
        createdAt: 2,
        updatedAt: 3,
      }] as never;
      s.moraleSnapshots = [{
        targetType: 'player',
        playerId: 'p2',
        currentValue: 40,
        baselineValue: 50,
        history: [{
          sourceEventId: 'relationship-hit:f:s:ss:f:s:ss:p1:p2:FEUD:game-2',
          delta: -10,
        }],
      }] as never;
      s.ratingsOverlays = [];
    } },
  { name: 'soul.l13-rep4-fan-nudge-boundary',
    mutate: (s) => {
      const fanNudgeSourceEventId = 'relationship-visible-fan-nudge:f:s:ss:f:s:ss:p1:p2:FEUD:game-7';
      s.relationshipEdges = [{
        id: 'f:s:ss:p1:p2:FEUD',
        franchiseId: 'f',
        seasonId: 's',
        statsScopeId: 'ss',
        seasonNumber: 1,
        player1Id: 'p1',
        player2Id: 'p2',
        type: 'FEUD',
        intensity: 0.9,
        potential: false,
        accuracy: 0.8,
        formedAtGameNumber: 2,
        dissolvedAtGameNumber: null,
        createdAt: 2,
        updatedAt: 3,
      }] as never;
      s.seasonNewsItems = [{
        id: 'relationship-news-bad',
        franchiseId: 'f',
        seasonId: 's',
        seasonNumber: 1,
        eventType: 'RELATIONSHIP_FLARE',
        subjectIds: ['p1', 'p2'],
        facts: {
          edgeId: 'f:s:ss:p1:p2:FEUD',
          relationshipType: 'FRIENDSHIP',
          intensity: 0.1,
          potential: false,
          relationshipIntelMoveId: 'move-1',
          relationshipIntelSeed: 'wrong-seed',
          relationshipIntelRoll: 0.99,
          relationshipIntelUnconfirmed: true,
          fanNudgeSourceEventId,
        },
      }] as never;
      s.moraleSnapshots = [{
        targetType: 'player',
        playerId: 'p1',
        currentValue: 47,
        baselineValue: 50,
        history: [{ sourceEventId: fanNudgeSourceEventId, delta: -3 }],
      }] as never;
    } },
  { name: 'soul.ratings-overlay-validity', // NAMED property now includes the deterministic id
    mutate: (s) => {
      s.players = [{ id: 'p', primaryPosition: 'SS' } as never];
      s.ratingsOverlays = [{ id: 'WRONG-ID', playerId: 'p', source: 'ratings-development', confirmationStatus: 'pending', kind: 'permanent', expiresAtGameNumber: null, createdAtGameNumber: 1, delta: 1, ratingKey: 'power', franchiseId: 'f', seasonId: 's', statsScopeId: 'ss', sourceEventId: 'checkpoint-2' } as never];
    } },
  { name: 'soul.trait-two-slot-no-offset-hysteresis',
    mutate: (s) => { s.players = [{ id: 'p', trait1: oppA, trait2: oppB } as never]; /* opposite pair held */ } },
  { name: 'soul.trait-two-slot-no-offset-hysteresis',
    mutate: (s) => { s.traitOverlays = [{ id: 'o', playerId: 'p', traitName: 'Wild Thrower', valence: 'gain', probability: 0.60, confirmationStatus: 'pending', displacesTraitName: null } as never]; /* gain BELOW its tier (MODERATE 0.65) threshold — must still trip the per-tier check */ } },
  { name: 'soul.persistence-backup-migration-proof', // NAMED property now includes the real version-bump leg
    mutate: (s) => { s.persistenceProof = { backupRoundTripByteIdentical: true, migrationSurvivalChecked: true, migrationSurvivalAcrossVersionBump: false, detail: 'no version-bump survival' }; } },
  { name: 'soul.channel-separation-double-count-guards',
    mutate: (s) => { s.fameRows = [{ playerId: 'p', heat: 0, reachFloor: 0, channelByChannel: { ...FINITE_CHANNELS }, valueDelta: 5 } as never]; /* value field leaked into fame row */ } },
  { name: 'soul.all-star-sixty-percent-lock',
    mutate: (s) => { s.gameNumber = Math.round(s.totalScheduledGames * 0.6); s.allStarRosters = []; /* at lock, no roster */ } },
  { name: 'soul.reach-floor-ratchet', // NAMED property now: the honor bump must stamp every selected player's fame record at the lock
    mutate: (s) => {
      s.gameNumber = Math.round(s.totalScheduledGames * 0.6); // = lockGame
      s.allStarRosters = [{ locked: true, lockedAtGameNumber: s.gameNumber, selections: [{ playerId: 'p', teamId: 't1', position: 'C', role: 'starter' }] } as never];
      s.fameRows = [{ playerId: 'p', heat: 10, reachFloor: 1, updatedAtCheckpoint: 'game-5', channelByChannel: { ...FINITE_CHANNELS } } as never];
    } },
  // §5.3 TV-freeze — inverse 1: a post-freeze recompute that should be a no-op but ISN'T (anti-thaw guard failed).
  { name: 'soul.tv-freeze',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.trustedValueArtifact = { frozen: true, frozenAt: 123, trustedPlayerIds: [] } as never;
      s.finalizeProof = { ran: true, invoked: [], artifactPresent: true, reFreezeIdempotent: true, antiThawHeld: false, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 1, awardsWithWinnerCount: 1, detail: 'anti-thaw failed' } as never;
    } },
  // §5.3 TV-freeze — inverse 2: the artifact never froze at season-end.
  { name: 'soul.tv-freeze',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.trustedValueArtifact = { frozen: false, frozenAt: null, trustedPlayerIds: [] } as never;
      s.finalizeProof = { ran: true, invoked: [], artifactPresent: false, reFreezeIdempotent: false, antiThawHeld: false, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 0, awardsWithWinnerCount: 0, detail: 'no freeze' } as never;
    } },
  // §5.3 awards-off-frozen — inverse 1: a finalized winner computed off an UNFROZEN artifact.
  { name: 'soul.awards-off-frozen-artifact',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.trustedValueArtifact = { frozen: false, frozenAt: null, trustedPlayerIds: ['w'] } as never;
      s.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [] } as never];
      s.finalizeProof = { ran: true, invoked: [], artifactPresent: true, reFreezeIdempotent: true, antiThawHeld: true, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 1, awardsWithWinnerCount: 1, detail: 'unfrozen winner' } as never;
    } },
  // §5.3 awards-off-frozen — inverse 2: an UNTRUSTED row won (winner not in the frozen artifact's trustedPlayerIds).
  { name: 'soul.awards-off-frozen-artifact',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.trustedValueArtifact = { frozen: true, frozenAt: 1, trustedPlayerIds: ['other'] } as never;
      s.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [] } as never];
      s.finalizeProof = { ran: true, invoked: [], artifactPresent: true, reFreezeIdempotent: true, antiThawHeld: true, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 1, awardsWithWinnerCount: 1, detail: 'untrusted winner' } as never;
    } },
  // §5.3 emission-snub — inverse 1: the legacy nod double-counted per honorKind.
  { name: 'soul.emission-snub-signal',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [
        { eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never,
        { eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never,
      ];
    } },
  // §5.3 emission-snub — inverse 2: a snub fired for a NON-close loser (margin 4, outside the top-3 closest).
  { name: 'soul.emission-snub-signal',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [{ eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never];
      s.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [
        { playerId: 'w', score: 9, marginToWinner: 0 }, { playerId: 'L1', score: 8, marginToWinner: 1 },
        { playerId: 'L2', score: 7, marginToWinner: 2 }, { playerId: 'L3', score: 6, marginToWinner: 3 },
        { playerId: 'L4', score: 5, marginToWinner: 4 },
      ] } as never];
      s.moraleSnapshots = ['L1', 'L2', 'L3', 'L4'].map((playerId) =>
        ({ playerId, history: [{ sourceEventId: `race-snub:f:s:ss:MVP:${playerId}` }] }) as never);
    } },
  // §5.3 emission-snub — inverse 3: a missing snub for an actual close loser (top-3 expected, only 2 snubbed).
  { name: 'soul.emission-snub-signal',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [{ eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never];
      s.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [
        { playerId: 'w', score: 9, marginToWinner: 0 }, { playerId: 'L1', score: 8, marginToWinner: 1 },
        { playerId: 'L2', score: 7, marginToWinner: 2 }, { playerId: 'L3', score: 6, marginToWinner: 3 },
      ] } as never];
      s.moraleSnapshots = ['L1', 'L2'].map((playerId) =>
        ({ playerId, history: [{ sourceEventId: `race-snub:f:s:ss:MVP:${playerId}` }] }) as never);
    } },
  // §5.3 emission-snub — inverse 4: the WINNER was snubbed (snub must never target a winner).
  { name: 'soul.emission-snub-signal',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [{ eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never];
      s.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [
        { playerId: 'w', score: 9, marginToWinner: 0 }, { playerId: 'L1', score: 8, marginToWinner: 1 },
      ] } as never];
      s.moraleSnapshots = ['w', 'L1'].map((playerId) =>
        ({ playerId, history: [{ sourceEventId: `race-snub:f:s:ss:MVP:${playerId}` }] }) as never);
    } },
  // §5.3 emission-snub — inverse 5: a snub fired for an honorKind that emitted NO nod (snub gated behind nod emission).
  { name: 'soul.emission-snub-signal',
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [{ eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never];
      s.awardRows = [
        { category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [{ playerId: 'w', score: 9, marginToWinner: 0 }] } as never,
        { category: 'CY_YOUNG', finalized: true, winnerPlayerId: 'cy', candidates: [
          { playerId: 'cy', score: 9, marginToWinner: 0 }, { playerId: 'C1', score: 8, marginToWinner: 1 },
        ] } as never,
      ];
      // CY_YOUNG emitted NO nod, yet a CY snub was recorded -> snubWithoutNod violation.
      s.moraleSnapshots = [{ playerId: 'C1', history: [{ sourceEventId: 'race-snub:f:s:ss:CY_YOUNG:C1' }] } as never];
    } },
];

describe('L-SIM invariant falsification audit', () => {
  test('every soul invariant PASSES a neutral baseline (not vacuously red)', () => {
    const results = CHECKS.map((check) => check(base()));
    const failing = results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.detail}`);
    expect(failing).toEqual([]);
    expect(results.length).toBe(26);
  });

  test('falsification cases cover every soul invariant exactly once', () => {
    const covered = new Set(CASES.map((c) => c.name));
    const all = new Set(CHECKS.map((c) => c(base()).name));
    expect(covered.size).toBe(all.size);
    for (const name of all) expect(covered.has(name)).toBe(true);
  });

  for (const { name, mutate } of CASES) {
    test(`${name} TRIPS RED on known-bad input`, () => {
      const snap = base();
      mutate(snap);
      const result = resultFor(name, snap);
      expect(result.pass, `${name} stayed GREEN on injected bad state — cannot be falsified; detail=${result.detail}`).toBe(false);
    });
  }

  test('soul.checkpoint-cadence-matches-setting TRIPS RED for frequent cadence with only standard-count overlays', () => {
    const snap = base();
    snap.gamesSimulated = snap.totalScheduledGames;
    snap.gameNumber = snap.totalScheduledGames;
    snap.checkpointCadence = 'frequent';
    snap.checkpointCount = 10;
    snap.checkpointGameNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    snap.ratingsOverlays = [2, 4, 6, 8, 10].map((gameNumber) =>
      ({ sourceEventId: `checkpoint-${gameNumber}` }) as never);

    const result = resultFor('soul.checkpoint-cadence-matches-setting', snap);
    expect(result.pass, `frequent cadence mismatch stayed GREEN; detail=${result.detail}`).toBe(false);
  });

  test('soul.l13-relationship-formation-checkpoint-write PASSES valid active cross-team edges', () => {
    const snap = base();
    snap.teamIds = ['t1', 't2'];
    snap.gameNumber = 2;
    snap.gamesSimulated = 2;
    snap.players = [
      { id: 'p1', leagueAssignments: [{ teamId: 't1' }] } as never,
      { id: 'p2', leagueAssignments: [{ teamId: 't2' }] } as never,
    ];
    snap.relationshipEdges = [{
      id: 'f:s:ss:p1:p2:RIVALRY',
      franchiseId: 'f',
      seasonId: 's',
      statsScopeId: 'ss',
      seasonNumber: 1,
      player1Id: 'p1',
      player2Id: 'p2',
      type: 'RIVALRY',
      intensity: 0.9,
      potential: false,
      accuracy: 0.8,
      formedAtGameNumber: 2,
      dissolvedAtGameNumber: null,
      createdAt: 2,
      updatedAt: 2,
    }] as never;

    const result = resultFor('soul.l13-relationship-formation-checkpoint-write', snap);
    expect(result.pass, `valid cross-team relationship edge was rejected; detail=${result.detail}`).toBe(true);
  });

  // §5.3 inverse-test backstop: prove the three finalize invariants are not just red-trippable but also genuinely
  // GREEN on a VALID season-end snapshot satisfying the named property (else "trips red" could be vacuous-always-red).
  test('soul.tv-freeze PASSES a valid frozen-artifact season-end snapshot', () => {
    const snap = base();
    snap.gamesSimulated = snap.totalScheduledGames;
    snap.trustedValueArtifact = { frozen: true, frozenAt: 1718800000000, trustedPlayerIds: ['w'] } as never;
    snap.finalizeProof = { ran: true, invoked: ['freeze', 'awards', 'emit'], artifactPresent: true, reFreezeIdempotent: true, antiThawHeld: true, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 5, awardsWithWinnerCount: 5, detail: 'valid' } as never;
    expect(resultFor('soul.tv-freeze', snap).pass).toBe(true);
  });

  test('soul.awards-off-frozen-artifact PASSES finalized winners drawn from the frozen trusted set', () => {
    const snap = base();
    snap.gamesSimulated = snap.totalScheduledGames;
    snap.trustedValueArtifact = { frozen: true, frozenAt: 1, trustedPlayerIds: ['w', 'x'] } as never;
    snap.awardRows = [
      { category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [] } as never,
      { category: 'CY_YOUNG', finalized: true, winnerPlayerId: 'x', candidates: [] } as never,
    ];
    expect(resultFor('soul.awards-off-frozen-artifact', snap).pass).toBe(true);
  });

  test('soul.emission-snub-signal PASSES when only the top-3 close losers are snubbed, one nod per honorKind', () => {
    const snap = base();
    snap.gamesSimulated = snap.totalScheduledGames;
    snap.seasonNewsItems = [{ eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never];
    snap.awardRows = [{ category: 'MVP', finalized: true, winnerPlayerId: 'w', candidates: [
      { playerId: 'w', score: 9, marginToWinner: 0 }, { playerId: 'L1', score: 8, marginToWinner: 1 },
      { playerId: 'L2', score: 7, marginToWinner: 2 }, { playerId: 'L3', score: 6, marginToWinner: 3 },
      { playerId: 'L4', score: 5, marginToWinner: 4 },
    ] } as never];
    snap.moraleSnapshots = ['L1', 'L2', 'L3'].map((playerId) =>
      ({ playerId, history: [{ sourceEventId: `race-snub:f:s:ss:MVP:${playerId}` }] }) as never);
    expect(resultFor('soul.emission-snub-signal', snap).pass).toBe(true);
  });

  test('soul.emission-snub-signal stays GREEN-LIVE-PENDING when no nod fired (offline reporter+LLM gate)', () => {
    const snap = base();
    snap.gamesSimulated = snap.totalScheduledGames;
    snap.seasonNewsItems = [];
    snap.finalizeProof = { ran: true, invoked: [], artifactPresent: true, reFreezeIdempotent: true, antiThawHeld: true, emissionStatus: 'processed', emittedHonors: [], awardsFinalizedCount: 5, awardsWithWinnerCount: 5, detail: 'no nod' } as never;
    const result = resultFor('soul.emission-snub-signal', snap);
    expect(result.pass).toBe(true);
    expect(result.detail).toContain('LIVE-PENDING');
  });
});
