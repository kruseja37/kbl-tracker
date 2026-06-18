import { describe, expect, test } from 'vitest';

import {
  FRANCHISE_L10_EVENT_TUNING,
  computeFranchiseL10Events,
  franchiseL10DeterministicRoll,
  type FranchiseL10Candidate,
  type FranchiseL10EventFamily,
  type FranchiseL10EventTuning,
} from '../franchiseL10EventEngine';

const families: FranchiseL10EventFamily[] = [
  'performance',
  'pitching',
  'trait',
  'role',
  'cosmetic',
  'team',
  'roster',
  'wildcard',
];

const highRateTuning: FranchiseL10EventTuning = {
  ...FRANCHISE_L10_EVENT_TUNING,
  baseRate: Object.fromEntries(families.map((family) => [family, 0.6])) as Record<FranchiseL10EventFamily, number>,
};

function candidate(index: number, overrides: Partial<FranchiseL10Candidate> = {}): FranchiseL10Candidate {
  return {
    id: `candidate-${index.toString().padStart(3, '0')}`,
    kind: 'player',
    role: index % 2 === 0 ? 'pitcher' : 'position',
    personality: 'COMPETITIVE',
    playerMorale: 50,
    performanceSignal: 0,
    ...overrides,
  };
}

function playerSet(count: number, overrides: Partial<FranchiseL10Candidate> = {}): FranchiseL10Candidate[] {
  return Array.from({ length: count }, (_, index) => candidate(index, overrides));
}

function countEvents(
  candidates: FranchiseL10Candidate[],
  intensity: 'juiced' | 'standard' | 'nerfed',
  config: FranchiseL10EventTuning = highRateTuning,
): number {
  return computeFranchiseL10Events({ candidates, intensity, seedBase: 'l10:test' }, config).events.length;
}

describe('franchiseL10EventEngine L10-1 pure selection engine', () => {
  test('same input produces an identical deterministic report', () => {
    const candidates = [
      ...playerSet(12),
      { id: 'team-alpha', kind: 'team', fanMorale: 35 } satisfies FranchiseL10Candidate,
    ];

    const first = computeFranchiseL10Events({ candidates, intensity: 'standard', seedBase: 'franchise:1:20' });
    const second = computeFranchiseL10Events({ candidates, intensity: 'standard', seedBase: 'franchise:1:20' });

    expect(second).toEqual(first);
  });

  test('intensity dial scales fire volume juiced greater than standard greater than nerfed', () => {
    const candidates = playerSet(80, { playerMorale: 0, personality: 'EGOTISTICAL' });
    const intensityTuning: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: Object.fromEntries(families.map((family) => [family, 0.25])) as Record<FranchiseL10EventFamily, number>,
    };

    const juiced = countEvents(candidates, 'juiced', intensityTuning);
    const standard = countEvents(candidates, 'standard', intensityTuning);
    const nerfed = countEvents(candidates, 'nerfed', intensityTuning);

    expect(juiced).toBeGreaterThan(standard);
    expect(standard).toBeGreaterThan(nerfed);
  });

  test('pitching family only fires for pitchers', () => {
    const candidates = [
      candidate(1, { id: 'position-player', role: 'position' }),
      candidate(2, { id: 'pitcher', role: 'pitcher' }),
    ];
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: { ...FRANCHISE_L10_EVENT_TUNING.baseRate, pitching: 1 },
    };
    const events = computeFranchiseL10Events({ candidates, intensity: 'standard', seedBase: 'pitching-only' }, config)
      .events.filter((event) => event.family === 'pitching');

    expect(events).toHaveLength(1);
    expect(events[0].targetId).toBe('pitcher');
  });

  test('team family only fires for team candidates', () => {
    const candidates = [
      candidate(1, { id: 'player-one' }),
      { id: 'team-one', kind: 'team', fanMorale: 50 } satisfies FranchiseL10Candidate,
    ];
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: { ...FRANCHISE_L10_EVENT_TUNING.baseRate, team: 1 },
    };
    const teamEvents = computeFranchiseL10Events({ candidates, intensity: 'standard', seedBase: 'team-only' }, config)
      .events.filter((event) => event.family === 'team');

    expect(teamEvents).toHaveLength(2);
    expect(teamEvents.every((event) => event.targetKind === 'team')).toBe(true);
    expect(teamEvents.map((event) => event.eventType).sort()).toEqual(['front_office_mandate', 'stadium_change']);
  });

  test('high fan morale suppresses the stadium_change rate', () => {
    const lowFanMoraleTeams = Array.from({ length: 80 }, (_, index) => ({
      id: `team-low-${index}`,
      kind: 'team' as const,
      fanMorale: 0,
    }));
    const highFanMoraleTeams = Array.from({ length: 80 }, (_, index) => ({
      id: `team-low-${index}`,
      kind: 'team' as const,
      fanMorale: 100,
    }));
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: { ...FRANCHISE_L10_EVENT_TUNING.baseRate, team: 0.55 },
      fanMoraleSuppression: 1,
    };
    const low = computeFranchiseL10Events({ candidates: lowFanMoraleTeams, intensity: 'standard', seedBase: 'stadium' }, config)
      .events.filter((event) => event.eventType === 'stadium_change').length;
    const high = computeFranchiseL10Events({ candidates: highFanMoraleTeams, intensity: 'standard', seedBase: 'stadium' }, config)
      .events.filter((event) => event.eventType === 'stadium_change').length;

    expect(low).toBeGreaterThan(0);
    expect(high).toBe(0);
    expect(low).toBeGreaterThan(high);
  });

  test('morale tilts player-family valence toward positive at high morale', () => {
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: { ...FRANCHISE_L10_EVENT_TUNING.baseRate, performance: 1 },
      moraleWeight: 0.4,
    };
    const highMorale = playerSet(60, { playerMorale: 100, role: 'position' });
    const lowMorale = playerSet(60, { playerMorale: 0, role: 'position' });
    const highPositive = computeFranchiseL10Events({ candidates: highMorale, intensity: 'standard', seedBase: 'valence' }, config)
      .events.filter((event) => event.family === 'performance' && event.valence === 'positive').length;
    const lowPositive = computeFranchiseL10Events({ candidates: lowMorale, intensity: 'standard', seedBase: 'valence' }, config)
      .events.filter((event) => event.family === 'performance' && event.valence === 'positive').length;

    expect(highPositive).toBeGreaterThan(lowPositive);
  });

  test('personality sensitivity moves fire probability and volume', () => {
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: Object.fromEntries(families.map((family) => [family, family === 'performance' ? 0.2 : 0])) as Record<FranchiseL10EventFamily, number>,
      personalitySensitivity: {
        ...FRANCHISE_L10_EVENT_TUNING.personalitySensitivity,
        EGOTISTICAL: 2,
        RELAXED: 0.5,
      },
    };
    const highSensitivity = playerSet(100, { personality: 'EGOTISTICAL', role: 'position' });
    const lowSensitivity = playerSet(100, { personality: 'RELAXED', role: 'position' });
    const high = computeFranchiseL10Events({ candidates: highSensitivity, intensity: 'standard', seedBase: 'personality' }, config)
      .events.length;
    const low = computeFranchiseL10Events({ candidates: lowSensitivity, intensity: 'standard', seedBase: 'personality' }, config)
      .events.length;

    expect(high).toBeGreaterThan(low);
  });

  test('personality-shift family is never emitted', () => {
    const report = computeFranchiseL10Events(
      {
        candidates: [
          ...playerSet(50, { playerMorale: 0, personality: 'EGOTISTICAL' }),
          { id: 'team-shift-check', kind: 'team', fanMorale: 0 },
        ],
        intensity: 'juiced',
        seedBase: 'no-personality-shift',
      },
      highRateTuning,
    );

    expect(report.events.some((event) => event.family === ('personality-shift' as FranchiseL10EventFamily))).toBe(false);
    expect(report.events.some((event) => event.eventType.includes('personality'))).toBe(false);
  });

  test('probability clamps to one at extreme config values', () => {
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: { ...FRANCHISE_L10_EVENT_TUNING.baseRate, performance: 10 },
      personalitySensitivity: {
        ...FRANCHISE_L10_EVENT_TUNING.personalitySensitivity,
        EGOTISTICAL: 5,
      },
    };
    const report = computeFranchiseL10Events(
      { candidates: [candidate(1, { personality: 'EGOTISTICAL', performanceSignal: 1 })], intensity: 'juiced', seedBase: 'clamp' },
      config,
    );
    const performance = report.events.find((event) => event.family === 'performance');

    expect(performance?.probability).toBe(1);
  });

  test('FNV-1a deterministic roll stays in the zero-to-one range', () => {
    const rolls = [
      franchiseL10DeterministicRoll('franchise:season:20:alpha'),
      franchiseL10DeterministicRoll('franchise:season:20:beta'),
      franchiseL10DeterministicRoll(''),
    ];

    for (const roll of rolls) {
      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThanOrEqual(1);
    }
    expect(franchiseL10DeterministicRoll('franchise:season:20:alpha')).toBe(rolls[0]);
  });

  test('empty candidate list returns an empty report', () => {
    expect(computeFranchiseL10Events({ candidates: [], intensity: 'standard', seedBase: 'empty' })).toEqual({ events: [] });
  });

  test('representative end-to-end sweep emits a plausible sorted mix', () => {
    const candidates = [
      candidate(1, { id: 'alpha-player', role: 'position', playerMorale: 95, personality: 'JOLLY' }),
      candidate(2, { id: 'beta-pitcher', role: 'pitcher', playerMorale: 5, personality: 'DROOPY' }),
      { id: 'gamma-team', kind: 'team', fanMorale: 20 } satisfies FranchiseL10Candidate,
    ];
    const report = computeFranchiseL10Events({ candidates, intensity: 'juiced', seedBase: 'mix' }, highRateTuning);

    expect(report.events.length).toBeGreaterThan(3);
    expect(report.events.some((event) => event.targetKind === 'player')).toBe(true);
    expect(report.events.some((event) => event.targetKind === 'team')).toBe(true);
    expect(report.events).toEqual([...report.events].sort((a, b) => (
      a.targetId.localeCompare(b.targetId)
      || a.family.localeCompare(b.family)
      || a.eventType.localeCompare(b.eventType)
    )));
  });

  test('roster fire chooses one representative downstream candidate type', () => {
    const config: FranchiseL10EventTuning = {
      ...FRANCHISE_L10_EVENT_TUNING,
      baseRate: Object.fromEntries(families.map((family) => [family, family === 'roster' ? 1 : 0])) as Record<FranchiseL10EventFamily, number>,
    };
    const report = computeFranchiseL10Events(
      { candidates: playerSet(30, { role: 'position' }), intensity: 'standard', seedBase: 'roster-representative' },
      config,
    );
    const rosterEvents = report.events.filter((event) => event.family === 'roster');

    expect(rosterEvents).toHaveLength(30);
    expect(new Set(rosterEvents.map((event) => event.eventType)).size).toBeGreaterThan(1);
    expect(rosterEvents.every((event) => ['trade_demand', 'mentorship', 'clubhouse_rift'].includes(event.eventType))).toBe(true);
  });
});
