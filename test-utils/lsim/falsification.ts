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
    traitOverlays: [],
    l10Overlays: [],
    flashpointRows: [],
    allStarRosters: [],
    awardRows: [],
    moraleSnapshots: [],
    seasonNewsItems: [],
    trustedValueArtifact: null,
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
      s.previous = { ...base(), fameRows: [{ playerId: 'p', reachFloor: 3, heat: 0 } as never] };
      s.fameRows = [{ playerId: 'p', reachFloor: 1, heat: 0, channelByChannel: { ...FINITE_CHANNELS } } as never];
    } },
  { name: 'soul.fame-heat-fickle',
    mutate: (s) => { s.gamesSimulated = s.totalScheduledGames; /* season-end, no up+down transitions */ } },
  { name: 'soul.fame-war-legitimacy-floor', // NAMED property now: apex degeneracy (replacement-WAR at the very top tier)
    mutate: (s) => {
      s.fameRows = [{ playerId: 'p', heat: 50, reachFloor: 5, channelByChannel: { ...FINITE_CHANNELS } } as never];
      s.trueValueRows = [{ playerId: 'p', warPercentile: 0.05 } as never];
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
  { name: 'soul.l11-backstop-under-25-plus-roll', // synthetic-falsify (live PENDING-STEP-3): fired auto-backstop lacking the required persistence
    mutate: (s) => { s.storeDump = { databases: { 'kbl-manager-identity': { managerAssignments: [{ fired: true, firedReason: 'auto-backstop', teamId: 't1' }] } }, digest: '', rowCounts: {} }; } },
  { name: 'soul.per-write-idempotency',
    mutate: (s) => { s.lastGameDelta = { battingIncreasedPlayerIds: [], pitchingIncreasedPlayerIds: [], afterFirstProcessDigest: 'a', afterReplayDigest: 'b' }; } },
  { name: 'soul.checkpoint-cadence-exactly-five',
    mutate: (s) => { s.gamesSimulated = s.totalScheduledGames; s.gameNumber = s.totalScheduledGames; s.ratingsOverlays = [{ sourceEventId: 'checkpoint-2' } as never]; /* only 1 of 5 boundaries */ } },
  { name: 'soul.ratings-overlay-validity', // NAMED property now includes the deterministic id
    mutate: (s) => {
      s.players = [{ id: 'p', primaryPosition: 'SS' } as never];
      s.ratingsOverlays = [{ id: 'WRONG-ID', playerId: 'p', source: 'ratings-development', confirmationStatus: 'pending', kind: 'permanent', expiresAtGameNumber: null, createdAtGameNumber: 1, delta: 1, ratingKey: 'power', franchiseId: 'f', seasonId: 's', statsScopeId: 'ss', sourceEventId: 'checkpoint-2' } as never];
    } },
  { name: 'soul.trait-two-slot-no-offset-hysteresis',
    mutate: (s) => { s.players = [{ id: 'p', trait1: oppA, trait2: oppB } as never]; /* opposite pair held */ } },
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
  { name: 'soul.emission-snub-signal', // synthetic-falsify (live PENDING-STEP-4): the legacy nod double-counted per honorKind
    mutate: (s) => {
      s.gamesSimulated = s.totalScheduledGames;
      s.seasonNewsItems = [
        { eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never,
        { eventType: 'AWARD_RESULT', facts: { honorKind: 'MVP', winnerId: 'w' } } as never,
      ];
    } },
];

describe('L-SIM invariant falsification audit', () => {
  test('every soul invariant PASSES a neutral baseline (not vacuously red)', () => {
    const results = CHECKS.map((check) => check(base()));
    const failing = results.filter((r) => !r.pass).map((r) => `${r.name}: ${r.detail}`);
    expect(failing).toEqual([]);
    expect(results.length).toBe(20);
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
});
