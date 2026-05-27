import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseRetirementCeremonyPlan,
  FRANCHISE_RETIREMENT_CEREMONY_VERSION,
  revealFranchiseRetirementForTeam,
  type FranchiseRetirementCeremonyInput,
  type FranchiseRetirementCeremonyPlayer,
} from '../franchiseRetirementCeremony';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-3',
  seasonNumber: 3,
  statsScopeId: 'franchise-a-season-3',
  offseasonStateId: 'offseason-franchise-a-season-3',
  phase: 'RETIREMENTS' as const,
  seedNamespace: 'retirement-ceremony',
};

function player(overrides: Partial<FranchiseRetirementCeremonyPlayer> & { playerId: string }): FranchiseRetirementCeremonyPlayer {
  return {
    playerId: overrides.playerId,
    displayName: overrides.displayName ?? overrides.playerId,
    age: overrides.age ?? 30,
    teamId: overrides.teamId ?? 'team-a',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    ...overrides,
  };
}

function farmRecord(playerId = 'farm-old', teamId = 'team-a') {
  return {
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    teamId,
    playerId,
    rosterStatus: 'FARM',
  };
}

function input(overrides: Partial<FranchiseRetirementCeremonyInput> = {}): FranchiseRetirementCeremonyInput {
  return {
    context,
    seed: 'ceremony-seed',
    teamId: 'team-a',
    revealIndex: 0,
    players: [
      player({ playerId: 'old-a', displayName: 'Old A', age: 41 }),
      player({ playerId: 'old-b', displayName: 'Old B', age: 38 }),
      player({ playerId: 'farm-old', displayName: 'Farm Old', age: 36, rosterStatus: 'FARM' }),
    ],
    farmRecords: [farmRecord()],
    stagedRetireeIds: [],
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

describe('franchise retirement ceremony planner', () => {
  test('uses the C0 method version', () => {
    const plan = buildFranchiseRetirementCeremonyPlan(input());
    const reveal = revealFranchiseRetirementForTeam(input());

    expect(FRANCHISE_RETIREMENT_CEREMONY_VERSION).toBe('franchise-retirement-ceremony-v1-reverse-age-roll');
    expect(plan.methodVersion).toBe(FRANCHISE_RETIREMENT_CEREMONY_VERSION);
    expect(reveal.methodVersion).toBe(FRANCHISE_RETIREMENT_CEREMONY_VERSION);
  });

  test('same inputs produce the same reveal', () => {
    const first = revealFranchiseRetirementForTeam(input());
    const second = revealFranchiseRetirementForTeam(input());

    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
  });

  test('changing seed changes seed hash and can change reveal roll', () => {
    const first = revealFranchiseRetirementForTeam(input({ seed: 'seed-one' }));
    const second = revealFranchiseRetirementForTeam(input({ seed: 'seed-two' }));

    expect(first.seedHash).not.toBe(second.seedHash);
    expect(first.roll).not.toBe(second.roll);
  });

  test('changing revealIndex changes seed hash and can change reveal roll', () => {
    const first = revealFranchiseRetirementForTeam(input({ revealIndex: 0 }));
    const second = revealFranchiseRetirementForTeam(input({ revealIndex: 1 }));

    expect(first.seedHash).not.toBe(second.seedHash);
    expect(first.roll).not.toBe(second.roll);
  });

  test('changing candidate pool changes candidatePoolHash', () => {
    const first = revealFranchiseRetirementForTeam(input());
    const second = revealFranchiseRetirementForTeam(input({
      players: [
        player({ playerId: 'old-a', age: 41 }),
        player({ playerId: 'new-veteran', age: 40 }),
      ],
      farmRecords: [],
    }));

    expect(first.candidatePoolHash).not.toBe(second.candidatePoolHash);
  });

  test('staged retiree ids are excluded from reveal candidates', () => {
    const reveal = revealFranchiseRetirementForTeam(input({ stagedRetireeIds: ['old-a'] }));

    expect(reveal.candidates.map((candidate) => candidate.playerId)).not.toContain('old-a');
    expect(reveal.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PLAYER_ALREADY_STAGED', playerId: 'old-a' }),
    ]));
  });

  test('orders candidates by reverse age with playerId tie-breaker', () => {
    const plan = buildFranchiseRetirementCeremonyPlan(input({
      players: [
        player({ playerId: 'same-b', age: 35 }),
        player({ playerId: 'older', age: 42 }),
        player({ playerId: 'same-a', age: 35 }),
      ],
      farmRecords: [],
    }));

    expect(plan.candidates.map((candidate) => candidate.playerId)).toEqual(['older', 'same-a', 'same-b']);
    expect(plan.candidates.map((candidate) => candidate.ageRank)).toEqual([0, 1, 2]);
  });

  test('uses zero-based OFFSEASON probability formula and keeps probabilities at or above five percent', () => {
    const players = Array.from({ length: 60 }, (_, index) =>
      player({ playerId: `p-${String(index).padStart(2, '0')}`, age: 100 - index }),
    );
    const plan = buildFranchiseRetirementCeremonyPlan(input({ players, farmRecords: [] }));

    expect(plan.candidates[0].probability).toBe(50);
    expect(plan.candidates[1].probability).toBe(49.25);
    expect(plan.candidates[59].probability).toBeGreaterThanOrEqual(5);
    expect(Math.min(...plan.candidates.map((candidate) => candidate.probability))).toBeGreaterThanOrEqual(5);
    expect(plan.candidates[0].evidence).toContain('Age rank 0 uses zero-based reverse-age ordering.');
  });

  test('returns exactly one reveal outcome with an explicit no_retirement bucket', () => {
    const reveal = revealFranchiseRetirementForTeam(input());
    const noRetirementBucket = reveal.buckets.find((bucket) => bucket.type === 'no_retirement');

    expect(['retiree', 'no_retirement']).toContain(reveal.outcome.type);
    expect(reveal.selectedPlayerIds.length).toBe(reveal.outcome.type === 'retiree' ? 1 : 0);
    expect(noRetirementBucket).toEqual(expect.objectContaining({ type: 'no_retirement' }));
    expect(reveal.revealBucket).not.toBeNull();
  });

  test('selectedPlayerIds reflects only the single retiree outcome', () => {
    const reveal = revealFranchiseRetirementForTeam(input({ seed: 'retiree-likely' }));

    if (reveal.outcome.type === 'retiree') {
      expect(reveal.selectedPlayerIds).toEqual([reveal.outcome.playerId]);
    } else {
      expect(reveal.selectedPlayerIds).toEqual([]);
    }
  });

  test('includes MLB and valid FARM players', () => {
    const plan = buildFranchiseRetirementCeremonyPlan(input());

    expect(plan.candidates.map((candidate) => [candidate.playerId, candidate.rosterStatus])).toEqual([
      ['old-a', 'MLB'],
      ['old-b', 'MLB'],
      ['farm-old', 'FARM'],
    ]);
    expect(plan.issues.find((issue) => issue.code === 'FARM_RECORD_MISSING')).toBeUndefined();
  });

  test('excludes and flags FARM players without matching scoped farm records', () => {
    const plan = buildFranchiseRetirementCeremonyPlan(input({
      players: [
        player({ playerId: 'farm-old', age: 40, rosterStatus: 'FARM' }),
        player({ playerId: 'mlb-old', age: 39, rosterStatus: 'MLB' }),
      ],
      farmRecords: [],
    }));

    expect(plan.candidates.map((candidate) => candidate.playerId)).toEqual(['mlb-old']);
    expect(plan.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'FARM_RECORD_MISSING', playerId: 'farm-old', severity: 'warning' }),
    ]));
  });

  test.each(['FREE_AGENT', 'UNASSIGNED', 'RELEASED', 'RETIRED', 'INACTIVE', 'BOGUS'])(
    'excludes status %s from ceremony candidates',
    (rosterStatus) => {
      const plan = buildFranchiseRetirementCeremonyPlan(input({
        players: [
          player({ playerId: 'excluded', age: 44, rosterStatus }),
          player({ playerId: 'eligible', age: 43, rosterStatus: 'MLB' }),
        ],
        farmRecords: [],
      }));

      expect(plan.candidates.map((candidate) => candidate.playerId)).toEqual(['eligible']);
      expect(plan.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ playerId: 'excluded' }),
      ]));
    },
  );

  test('invalidates missing offseasonStateId', () => {
    const report = revealFranchiseRetirementForTeam(input({
      context: { ...context, offseasonStateId: '' },
    }));

    expect(report.valid).toBe(false);
    expect(report.outcome.type).toBe('no_retirement');
    expect(report.selectedPlayerIds).toEqual([]);
    expect(report.revealBucket?.type).not.toBe('retiree');
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MISSING_OFFSEASON_STATE_ID', severity: 'error' }),
    ]));
  });

  test('invalidates wrong or missing phase', () => {
    const wrong = revealFranchiseRetirementForTeam(input({
      context: { ...context, phase: 'DRAFT' as never },
    }));
    const missing = revealFranchiseRetirementForTeam(input({
      context: { ...context, phase: undefined as never },
    }));

    expect(wrong.valid).toBe(false);
    expect(missing.valid).toBe(false);
    expect(wrong.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_PHASE', severity: 'error' }),
    ]));
    expect(missing.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVALID_PHASE', severity: 'error' }),
    ]));
  });

  test('invalidates missing seedNamespace', () => {
    const report = revealFranchiseRetirementForTeam(input({
      context: { ...context, seedNamespace: '' },
    }));

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MISSING_SEED_NAMESPACE', severity: 'error' }),
    ]));
  });

  test('invalidates missing and wrong stats scope reports', () => {
    const missing = revealFranchiseRetirementForTeam(input({
      context: { ...context, statsScopeId: '' },
    }));
    const wrong = revealFranchiseRetirementForTeam(input({
      context: { ...context, statsScopeId: 'elimination-scope' },
    }));

    expect(missing.valid).toBe(false);
    expect(missing.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MISSING_STATS_SCOPE_ID', severity: 'error' }),
    ]));
    expect(wrong.valid).toBe(false);
    expect(wrong.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'STATS_SCOPE_MISMATCH', severity: 'error' }),
    ]));
  });

  test('invalidates missing deterministic seed', () => {
    const report = revealFranchiseRetirementForTeam(input({ seed: '' }));

    expect(report.valid).toBe(false);
    expect(report.outcome.type).toBe('no_retirement');
    expect(report.selectedPlayerIds).toEqual([]);
    expect(report.revealBucket?.type).not.toBe('retiree');
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MISSING_SEED', severity: 'error' }),
    ]));
  });

  test('invalid canonical context cannot return an actionable staged retiree', () => {
    const report = revealFranchiseRetirementForTeam(input({
      context: { ...context, statsScopeId: 'elimination-scope' },
      seed: 'retiree-likely',
    }));

    expect(report.valid).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'STATS_SCOPE_MISMATCH', severity: 'error' }),
    ]));
    expect(report.outcome.type).toBe('no_retirement');
    expect(report.selectedPlayerIds).toEqual([]);
    expect(report.revealBucket?.type).not.toBe('retiree');
    expect(report.candidatePoolHash).toEqual(expect.any(String));
    expect(report.seedHash).toEqual(expect.any(String));
  });

  test.each([
    ['missing teamId', { teamId: '' }],
    ['invalid revealIndex', { revealIndex: -1 }],
  ])('%s cannot return actionable staged retiree ids', (_label, overrides) => {
    const report = revealFranchiseRetirementForTeam(input({
      ...overrides,
      seed: 'retiree-likely',
    }));

    expect(report.valid).toBe(false);
    expect(report.outcome.type).toBe('no_retirement');
    expect(report.selectedPlayerIds).toEqual([]);
    expect(report.revealBucket?.type).not.toBe('retiree');
  });

  test('does not mutate input objects', () => {
    const ceremonyInput = input();
    const before = JSON.parse(JSON.stringify(ceremonyInput));

    deepFreeze(ceremonyInput);
    buildFranchiseRetirementCeremonyPlan(ceremonyInput);
    revealFranchiseRetirementForTeam(ceremonyInput);

    expect(ceremonyInput).toEqual(before);
  });

  test('reports explicit limitations for pure staged suggestions', () => {
    const reveal = revealFranchiseRetirementForTeam(input());

    expect(reveal.limitations).toEqual(expect.arrayContaining([
      expect.stringMatching(/Pure ceremony planner only/i),
      expect.stringMatching(/not persisted/i),
      expect.stringMatching(/No transactions are logged/i),
      expect.stringMatching(/No retirement is automatically applied/i),
    ]));
  });

  test('module does not import storage writers, React, transaction modules, or R1 apply path', () => {
    const source = readFileSync(resolve(__dirname, '../franchiseRetirementCeremony.ts'), 'utf8');

    expect(source).not.toMatch(/from ['"].*Storage['"]/);
    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toMatch(/transactionStorage/);
    expect(source).not.toMatch(/franchiseRetirementAdapter/);
    expect(source).not.toMatch(/runFranchiseRetirementDryRun/);
    expect(source).not.toMatch(/saveFranchisePlayer|logMode2V1Transaction|deleteFranchiseFarmRecord/);
  });
});
