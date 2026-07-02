import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  analyzeRoster,
  createDefaultRosterAnalyzerConfig,
  type AnalyzerPlayer,
  type RosterAnalyzerInput,
} from '../rosterAnalyzerEngine';

function makePlayer(overrides: Partial<AnalyzerPlayer> & { id: string; primaryPosition: string }): AnalyzerPlayer {
  const isPitcher = ['SP', 'RP', 'CP', 'P', 'SP/RP'].includes(overrides.primaryPosition);
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    primaryPosition: overrides.primaryPosition,
    secondaryPositions: overrides.secondaryPositions ?? [],
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    rosterLevel: overrides.rosterLevel ?? 'MLB',
    isPitcher,
    ratings: isPitcher
      ? { velocity: 62, junk: 58, accuracy: 60, fielding: 40, speed: 30 }
      : { power: 55, contact: 58, speed: 54, fielding: 57, arm: 56 },
    arsenal: isPitcher ? ['4F', 'SL', 'CH'] : undefined,
    traits: ['steady'],
    chemistry: 'Spirited',
    salary: 1,
    stats: {
      gamesPlayed: 10,
      source: 'builder_projection',
      trust: 'medium',
    },
    ...overrides,
  };
}

function makeBalancedPlayers(): AnalyzerPlayer[] {
  const activePositions = [
    'C',
    '1B',
    '2B',
    '3B',
    'SS',
    'LF',
    'CF',
    'RF',
    'OF',
    'IF',
    'SP',
    'SP',
    'SP',
    'SP',
    'RP',
    'RP',
    'RP',
    'CP',
    'C',
    '1B',
    'SS',
    'OF',
  ];
  const active = activePositions.map((position, index) =>
    makePlayer({
      id: `active-${index + 1}`,
      name: `Active ${index + 1}`,
      primaryPosition: position,
    }),
  );
  const farm = Array.from({ length: 10 }, (_, index) =>
    makePlayer({
      id: `farm-${index + 1}`,
      name: `Farm ${index + 1}`,
      primaryPosition: index === 0 ? 'C' : 'IF',
      rosterStatus: 'FARM',
      rosterLevel: 'FARM',
      optionState: {
        seasonOptionsUsed: 1,
        maxSeasonOptions: 3,
        ratingRevealState: 'revealed',
        eligibleForCallUp: true,
      },
    }),
  );
  return [...active, ...farm];
}

function balancedInput(overrides: Partial<RosterAnalyzerInput> = {}): RosterAnalyzerInput {
  const players = overrides.players ?? makeBalancedPlayers();
  const activePlayerIds = players.filter((player) => player.rosterLevel !== 'FARM').map((player) => player.id);
  const farmPlayerIds = players.filter((player) => player.rosterLevel === 'FARM').map((player) => player.id);
  return {
    identity: {
      mode: 'builder',
      surface: 'builder_team',
      teamId: 'team-1',
      generatedAt: 'test-now',
      ...(overrides.identity ?? {}),
    },
    teamName: 'Test Team',
    players,
    roster: {
      activePlayerIds,
      farmPlayerIds,
      rotationIds: activePlayerIds.filter((id) => players.find((player) => player.id === id)?.primaryPosition === 'SP').slice(0, 4),
      bullpenRoles: activePlayerIds
        .filter((id) => ['RP', 'CP'].includes(players.find((player) => player.id === id)?.primaryPosition ?? ''))
        .slice(0, 4)
        .map((playerId, index) => ({
          role: (['long', 'middle', 'setup', 'closer'] as const)[index],
          playerId,
        })),
      lineupSlots: activePlayerIds
        .filter((id) => !['SP', 'RP', 'CP'].includes(players.find((player) => player.id === id)?.primaryPosition ?? ''))
        .slice(0, 9)
        .map((playerId, index) => ({
          order: index + 1,
          playerId,
          position: players.find((player) => player.id === playerId)?.primaryPosition ?? 'IF',
        })),
      ...(overrides.roster ?? {}),
    },
    config: createDefaultRosterAnalyzerConfig({
      salary: { enabled: true, unit: 'millions', luxuryCap: 40 },
      ...(overrides.config ?? {}),
    }),
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

describe('roster analyzer engine MVP', () => {
  test('T7b call-up/send-down emitters are unblocked read-only advice', () => {
    const source = readFileSync('src/engines/rosterAnalyzerEngine.ts', 'utf8');

    expect(source).not.toContain('call_up_send_down_execution_not_in_mvp');
    expect(source).not.toMatch(/kind:\s*'call_up_advice'[\s\S]{0,220}blocked_future_work/);
    expect(source).not.toMatch(/kind:\s*'send_down_advice'[\s\S]{0,220}blocked_future_work/);
  });

  test('returns a read-only report for a balanced roster without warning-level findings', () => {
    const report = analyzeRoster(balancedInput());

    expect(report.summary.readOnly).toBe(true);
    expect(report.summary.blockerCount).toBe(0);
    expect(report.summary.criticalCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.profile).toMatchObject({
      activeCount: 22,
      farmCount: 10,
      totalCount: 32,
    });
    expect(report.recommendations.every((recommendation) => recommendation.execution === 'read_only' || recommendation.execution === 'blocked_future_work')).toBe(true);
  });

  test('flags missing positions, rotation depth, bullpen depth, and lineup readiness', () => {
    const players = Array.from({ length: 12 }, (_, index) =>
      makePlayer({
        id: `thin-${index + 1}`,
        primaryPosition: index < 2 ? 'SP' : '1B',
      }),
    );

    const report = analyzeRoster(balancedInput({
      players,
      roster: {
        activePlayerIds: players.map((player) => player.id),
        farmPlayerIds: [],
        rotationIds: players.slice(0, 2).map((player) => player.id),
        bullpenRoles: [],
        lineupSlots: players.slice(0, 7).map((player, index) => ({
          order: index + 1,
          playerId: player.id,
          position: player.primaryPosition,
        })),
      },
    }));

    expect(report.findings.map((finding) => finding.kind)).toEqual(
      expect.arrayContaining(['roster_count', 'position_coverage', 'rotation', 'bullpen', 'lineup']),
    );
    expect(report.recommendations.map((recommendation) => recommendation.kind)).toEqual(
      expect.arrayContaining(['bench_balance', 'rotation_adjustment']),
    );
  });

  test('surfaces top-heavy roster concentration as advisory, not a hard rule', () => {
    const players = makeBalancedPlayers().map((player, index) => ({
      ...player,
      ratings: player.isPitcher
        ? {
          velocity: index < 3 ? 99 : 20,
          junk: index < 3 ? 99 : 20,
          accuracy: index < 3 ? 99 : 20,
          fielding: 20,
          speed: 20,
        }
        : {
          power: index < 3 ? 99 : 20,
          contact: index < 3 ? 99 : 20,
          speed: index < 3 ? 99 : 20,
          fielding: index < 3 ? 99 : 20,
          arm: index < 3 ? 99 : 20,
        },
    }));

    const report = analyzeRoster(balancedInput({
      players,
      config: createDefaultRosterAnalyzerConfig({
        spreadsheetAdvisories: {
          enabled: true,
          topN: 3,
          concentrationShareWarning: 0.25,
        },
      }),
    }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'team_profile',
          severity: 'info',
          title: 'Roster appears top-heavy',
        }),
      ]),
    );
  });

  test('keeps farm recommendations low-trust and read-only when farm data is partial', () => {
    const players = makeBalancedPlayers().map((player) =>
      player.rosterLevel === 'FARM'
        ? {
          ...player,
          optionState: {
            seasonOptionsUsed: 1,
            maxSeasonOptions: 3,
            ratingRevealState: 'hidden' as const,
            eligibleForCallUp: true,
            scoutedGrade: 'B',
            scoutConfidence: 'medium',
            scoutVisibleSalary: 2_000,
          },
        }
        : player,
    );

    const report = analyzeRoster(balancedInput({ players }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'farm_options',
          trust: 'low',
        }),
      ]),
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'call_up_advice',
          execution: 'read_only',
          trust: 'low',
          rationale: expect.stringContaining('medium scout confidence'),
          caveats: expect.arrayContaining([
            expect.stringContaining('hidden farm internals are not used'),
          ]),
        }),
      ]),
    );
  });

  test('surfaces farm coverage for active MLB gaps as planning advice only', () => {
    const active = [
      makePlayer({ id: 'active-1', primaryPosition: 'SS' }),
      makePlayer({ id: 'active-2', primaryPosition: 'SP' }),
    ];
    const farmCatcher = makePlayer({
      id: 'farm-catcher',
      name: 'Farm Catcher',
      primaryPosition: 'C',
      rosterStatus: 'FARM',
      rosterLevel: 'FARM',
      optionState: {
        seasonOptionsUsed: 1,
        maxSeasonOptions: 3,
        ratingRevealState: 'hidden',
        scoutedGrade: 'B',
        scoutConfidence: 'medium',
        scoutVisibleSalary: 2_000,
      },
    });
    const report = analyzeRoster(balancedInput({
      players: [...active, farmCatcher],
      roster: {
        activePlayerIds: active.map((player) => player.id),
        farmPlayerIds: [farmCatcher.id],
        rotationIds: ['active-2'],
        bullpenRoles: [],
        lineupSlots: active.map((player, index) => ({
          order: index + 1,
          playerId: player.id,
          position: player.primaryPosition,
        })),
      },
      config: createDefaultRosterAnalyzerConfig({
        rosterTargets: {
          activeMlb: 2,
          farm: 1,
          total: 3,
          positionMinimums: { C: 1 },
          rotationSize: 1,
          bullpenMinimum: 0,
        },
      }),
    }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'farm_options',
          title: 'Farm has C coverage for an active roster gap',
          affectedPlayerIds: ['farm-catcher'],
        }),
      ]),
    );
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'call_up_advice',
          execution: 'read_only',
          title: 'Call-up advice: review farm C coverage',
          playerIds: ['farm-catcher'],
          rationale: expect.stringContaining('medium scout confidence'),
        }),
      ]),
    );
  });

  test('uses canonical catcher minimum of two for active coverage findings', () => {
    const players = makeBalancedPlayers().map((player) =>
      player.id === 'active-19'
        ? { ...player, primaryPosition: '1B' }
        : player,
    );

    const report = analyzeRoster(balancedInput({ players }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'position_coverage',
          title: 'C coverage below target',
          detail: 'Active roster has 1 C eligible player(s); target is 2.',
        }),
      ]),
    );
  });

  test('suppresses illegal catcher send-down advice while still emitting legal surplus send-downs', () => {
    const players = makeBalancedPlayers().map((player) => {
      if (player.id === 'active-19') {
        return {
          ...player,
          name: 'Backup Catcher',
          valueDelta: -500,
          optionState: {
            ...player.optionState,
            eligibleForSendDown: true,
          },
        };
      }
      if (player.id === 'active-9') {
        return {
          ...player,
          name: 'Surplus Outfielder',
          valueDelta: -500,
          optionState: {
            ...player.optionState,
            eligibleForSendDown: true,
          },
        };
      }
      if (player.id === 'farm-1') {
        return {
          ...player,
          name: 'Farm Catcher',
          primaryPosition: 'C',
          optionState: {
            ...player.optionState,
            scoutedGrade: 'S',
            scoutConfidence: 'high',
            scoutVisibleSalary: 1,
            eligibleForCallUp: true,
          },
        };
      }
      if (player.id === 'farm-2') {
        return {
          ...player,
          name: 'Farm Outfielder',
          primaryPosition: 'OF',
          optionState: {
            ...player.optionState,
            scoutedGrade: 'S',
            scoutConfidence: 'high',
            scoutVisibleSalary: 1,
            eligibleForCallUp: true,
          },
        };
      }
      return player;
    });

    const report = analyzeRoster(balancedInput({ players }));
    const sendDownRecommendations = report.recommendations.filter((recommendation) => recommendation.kind === 'send_down_advice');

    expect(sendDownRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Send-down advice: review Surplus Outfielder',
          playerIds: ['active-9'],
          execution: 'read_only',
        }),
      ]),
    );
    expect(sendDownRecommendations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerIds: ['active-19'],
        }),
      ]),
    );
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'farm_options',
          severity: 'warning',
          title: 'Send-down advice suppressed for Backup Catcher',
          affectedPlayerIds: ['active-19'],
        }),
      ]),
    );
  });

  test('flags option risk, out-of-options status, hidden ratings, and farm imbalance without executable advice', () => {
    const active = Array.from({ length: 4 }, (_, index) =>
      makePlayer({ id: `active-${index + 1}`, primaryPosition: index === 0 ? 'C' : 'IF' }),
    );
    const farmPlayers = [
      makePlayer({
        id: 'limited-options',
        name: 'Limited Options',
        primaryPosition: 'IF',
        rosterStatus: 'FARM',
        rosterLevel: 'FARM',
        optionState: {
          seasonOptionsUsed: 2,
          maxSeasonOptions: 3,
          ratingRevealState: 'partial',
          scoutedGrade: 'C+',
          scoutConfidence: 'medium',
          scoutVisibleSalary: 2_000,
        },
      }),
      makePlayer({
        id: 'out-of-options',
        name: 'Out Options',
        primaryPosition: 'OF',
        rosterStatus: 'FARM',
        rosterLevel: 'FARM',
        optionState: {
          seasonOptionsUsed: 3,
          maxSeasonOptions: 3,
          ratingRevealState: 'hidden',
          scoutedGrade: 'B',
          scoutConfidence: 'low',
          scoutVisibleSalary: 2_000,
        },
      }),
    ];

    const report = analyzeRoster(balancedInput({
      players: [...active, ...farmPlayers],
      roster: {
        activePlayerIds: active.map((player) => player.id),
        farmPlayerIds: farmPlayers.map((player) => player.id),
        rotationIds: [],
        bullpenRoles: [],
        lineupSlots: active.map((player, index) => ({
          order: index + 1,
          playerId: player.id,
          position: player.primaryPosition,
        })),
      },
      config: createDefaultRosterAnalyzerConfig({
        rosterTargets: {
          activeMlb: 4,
          farm: 2,
          total: 6,
          positionMinimums: { C: 1 },
          rotationSize: 0,
          bullpenMinimum: 0,
        },
      }),
    }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Farm roster depth is imbalanced' }),
        expect.objectContaining({ title: 'Limited Options has limited option flexibility', severity: 'warning', trust: 'high' }),
        expect.objectContaining({ title: 'Out Options is out of options', severity: 'warning', trust: 'high' }),
        expect.objectContaining({ title: 'Limited Options farm advice is limited', trust: 'medium' }),
        expect.objectContaining({ title: 'Out Options farm advice is limited', trust: 'low' }),
        expect.objectContaining({ title: 'Farm flavor systems are not active inputs', trust: 'low' }),
      ]),
    );
    expect(report.recommendations
      .filter((recommendation) => recommendation.kind === 'call_up_advice' || recommendation.kind === 'send_down_advice')
      .every((recommendation) => recommendation.execution === 'read_only' && !recommendation.blockedBy)).toBe(true);
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'send_down_advice',
          title: "Send-down advice: review Out Options's option status",
          execution: 'read_only',
        }),
      ]),
    );
  });

  test('does not mutate frozen analyzer inputs', () => {
    const input = balancedInput();
    const before = JSON.parse(JSON.stringify(input));

    deepFreeze(input);
    const report = analyzeRoster(input);

    expect(report.summary.readOnly).toBe(true);
    expect(input).toEqual(before);
  });

  test('reports explicit limitations for missing stats, salary, chemistry, traits, and pitch arsenal gaps', () => {
    const players = makeBalancedPlayers().map((player, index) => ({
      ...player,
      stats: undefined,
      salary: undefined,
      chemistry: undefined,
      traits: [],
      arsenal: player.isPitcher ? (index === 10 ? ['SL'] : []) : undefined,
    }));

    const report = analyzeRoster(balancedInput({
      players,
      config: createDefaultRosterAnalyzerConfig({
        salary: { enabled: true, unit: 'unknown' },
      }),
    }));

    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Trait data unavailable', trust: 'unavailable' }),
        expect.objectContaining({ title: 'Chemistry data unavailable', trust: 'unavailable' }),
        expect.objectContaining({ title: 'Salary data unavailable' }),
        expect.objectContaining({ kind: 'pitch_arsenal' }),
        expect.objectContaining({ title: 'Analyzer limitation' }),
      ]),
    );
    expect(report.trust.lowTrustInputs).toEqual(expect.arrayContaining(['player stats']));
    expect(report.trust.unavailableInputs).toEqual(expect.arrayContaining(['salary', 'chemistry']));
  });
});
