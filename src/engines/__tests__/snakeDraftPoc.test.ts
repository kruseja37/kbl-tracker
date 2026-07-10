import { describe, expect, test } from 'vitest';

import { isLegalRoster, type RosterSlotPlayer } from '../../data/rosterConstruction';
import type { LeagueBuilderMlbDraftSession } from '../../utils/leagueBuilderStorage';
import {
  commitSnakeDraftPick,
  detectSnakePositionRun,
  evaluateSnakePick,
  executeSnakePickTrade,
  forecastSnakeAvailability,
  pickSnakeCpuCandidate,
  seededSnakeShuffle,
  type SnakeDraftPlayerModel,
  type SnakeDraftRosterEntry,
} from '../snakeDraftPoc';

function construction(id: string, shape: RosterSlotPlayer) {
  return {
    id,
    isPitcher: shape.isPitcher,
    role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
    bat: { POW: 50, CON: 50, SPD: 50, FLD: 50, ARM: 50 },
    ...(shape.isPitcher ? { pit: { VEL: 50, JNK: 50, ACC: 50 } } : {}),
  };
}

function player(id: string, shape: RosterSlotPlayer, iv = 1_000): SnakeDraftPlayerModel {
  return { playerId: id, iv, position: shape.position, shape, construction: construction(id, shape) };
}

function rosterEntry(model: SnakeDraftPlayerModel): SnakeDraftRosterEntry {
  return { ...model, settledSalary: model.iv };
}

function session(overrides: Partial<LeagueBuilderMlbDraftSession> = {}): LeagueBuilderMlbDraftSession {
  return {
    id: 'mlb-draft:test:1',
    leagueId: 'test',
    seasonNumber: 1,
    seed: 'snake-seed',
    workflowVersion: 'snake-draft-poc-v1',
    engineMethodVersion: 'snakeDraftPoc.v1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 3,
    pickOrder: [
      { round: 1, pick: 1, teamId: 'human' },
      { round: 1, pick: 2, teamId: 'cpu' },
      { round: 2, pick: 3, teamId: 'cpu' },
      { round: 2, pick: 4, teamId: 'human' },
      { round: 3, pick: 5, teamId: 'human' },
      { round: 3, pick: 6, teamId: 'cpu' },
    ],
    completedPicks: [],
    trades: [],
    currentPickIndex: 0,
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function legalCoreWithoutCloser(): SnakeDraftPlayerModel[] {
  const hitters: SnakeDraftPlayerModel[] = [
    player('C', { isPitcher: false, position: 'C' }),
    player('1B', { isPitcher: false, position: '1B' }),
    player('2B', { isPitcher: false, position: '2B' }),
    player('3B', { isPitcher: false, position: '3B' }),
    player('SS', { isPitcher: false, position: 'SS' }),
    player('LF', { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
    player('CF', { isPitcher: false, position: 'CF' }),
    player('RF', { isPitcher: false, position: 'RF' }),
    ...Array.from({ length: 5 }, (_, index) => player(`bench-${index}`, { isPitcher: false, position: 'CF' })),
  ];
  const pitchers = [
    ...Array.from({ length: 4 }, (_, index) => player(`sp-${index}`, { isPitcher: true, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 4 }, (_, index) => player(`rp-${index}`, { isPitcher: true, position: 'RP', role: 'RP' })),
  ];
  return [...hitters, ...pitchers];
}

describe('snake draft POC engine', () => {
  test('CPU picker and seeded shuffle are deterministic for the same seed', () => {
    const candidates = [
      { playerId: 'a', blendedBoardValue: 100, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
      { playerId: 'b', blendedBoardValue: 99.5, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
      { playerId: 'c', blendedBoardValue: 95, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
    ];
    const runDraft = () => {
      let left = [...candidates];
      const picks: string[] = [];
      for (let pickIndex = 0; pickIndex < 3; pickIndex += 1) {
        const picked = pickSnakeCpuCandidate({ seed: 'same', pickIndex, teamId: `cpu-${pickIndex % 2}`, candidates: left });
        expect(picked).not.toBeNull();
        picks.push(picked!.playerId);
        left = left.filter((row) => row.playerId !== picked!.playerId);
      }
      return picks;
    };
    expect(runDraft()).toEqual(runDraft());
    expect(seededSnakeShuffle(['a', 'b', 'c', 'd'], 'same')).toEqual(
      seededSnakeShuffle(['a', 'b', 'c', 'd'], 'same'),
    );
  });

  test('must-fill rejects a non-closer when the final seat has to be a closer', () => {
    const roster = legalCoreWithoutCloser().map(rosterEntry);
    expect(roster).toHaveLength(21);
    const wrong = player('wrong', { isPitcher: false, position: 'CF' });
    const closer = player('closer', { isPitcher: true, position: 'CP', role: 'CP' });
    const guard = evaluateSnakePick({
      roster,
      candidate: wrong,
      remainingPool: [wrong, closer],
      committedSpent: 21_000,
      tierCap: 1_000_000,
      shiftedCaps: [],
    });
    expect(guard.mustFill).toBe(true);
    expect(guard.confirmable).toBe(false);
    expect(guard.reason).toContain('closer');
  });

  test('a CPU driven through the real pick guard never strands its legal 22', () => {
    const required = legalCoreWithoutCloser();
    const closer = player('closer', { isPitcher: true, position: 'CP', role: 'CP' });
    const extras = Array.from({ length: 6 }, (_, index) => player(
      `extra-${index}`,
      { isPitcher: false, position: 'CF', ...(index === 0 ? { secondaryPosition: 'C' } : {}) },
    ));
    let available = [...extras, ...required, closer];
    const roster: SnakeDraftRosterEntry[] = [];
    for (let pickIndex = 0; pickIndex < 22; pickIndex += 1) {
      const guarded = available.map((candidate) => ({
        candidate,
        guard: evaluateSnakePick({
          roster,
          candidate,
          remainingPool: available,
          committedSpent: roster.reduce((sum, row) => sum + row.settledSalary, 0),
          tierCap: 1_000_000,
          shiftedCaps: [],
        }),
      }));
      const cpu = pickSnakeCpuCandidate({
        seed: 'legal-full-draft',
        pickIndex,
        teamId: 'cpu',
        candidates: guarded.map(({ candidate, guard }) => ({
          playerId: candidate.playerId,
          blendedBoardValue: candidate.playerId.startsWith('extra') ? 5_000 : 1_000,
          needMultiplier: 1,
          fitMultiplier: 1,
          marginalTax: guard.marginalTax,
          selectable: guard.confirmable,
        })),
      });
      expect(cpu, `pick ${pickIndex + 1}`).not.toBeNull();
      const picked = available.find((row) => row.playerId === cpu!.playerId)!;
      roster.push(rosterEntry(picked));
      available = available.filter((row) => row.playerId !== picked.playerId);
    }
    expect(roster).toHaveLength(22);
    expect(isLegalRoster(roster.map((row) => row.shape))).toBe(true);
  });

  test('pick commit stamps IV settlement and marginal tax in the crash-safe session shape', () => {
    const next = commitSnakeDraftPick({
      session: session(),
      playerId: 'player-a',
      settledSalary: 42_500,
      marginalTax: 3_250,
    });
    expect(next.currentPickIndex).toBe(1);
    expect(next.completedPicks[0]).toEqual({
      round: 1,
      pick: 1,
      teamId: 'human',
      playerId: 'player-a',
      settledSalary: 42_500,
      marginalTax: 3_250,
    });
  });

  test('forecast makes a top player less likely to survive to a later user slot', () => {
    const result = forecastSnakeAvailability({
      seed: 'forecast',
      currentPickIndex: 0,
      userTeamId: 'human',
      pickOrder: [
        { pick: 1, teamId: 'human' },
        { pick: 2, teamId: 'human' },
        { pick: 3, teamId: 'cpu-a' },
        { pick: 4, teamId: 'cpu-b' },
        { pick: 5, teamId: 'human' },
      ],
      candidates: [
        {
          playerId: 'star',
          byTeamId: {
            'cpu-a': { blendedBoardValue: 500, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
            'cpu-b': { blendedBoardValue: 500, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
          },
        },
        {
          playerId: 'other',
          byTeamId: {
            'cpu-a': { blendedBoardValue: 100, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
            'cpu-b': { blendedBoardValue: 100, needMultiplier: 1, fitMultiplier: 1, marginalTax: 0, selectable: true },
          },
        },
      ],
      rollouts: 50,
    });
    const star = result.rows.find((row) => row.playerId === 'star')!;
    expect(star.survivalByPick[2]).toBe(1);
    expect(star.survivalByPick[5]).toBeLessThan(star.survivalByPick[2]);
  });

  test('accepted pick trade reassigns future ownership, appends an audit row, and changes the forecast slot', () => {
    const base = session({
      currentPickIndex: 1,
      completedPicks: [{ round: 1, pick: 1, teamId: 'human', playerId: 'done', settledSalary: 1, marginalTax: 0 }],
    });
    const before = forecastSnakeAvailability({
      seed: 'trade',
      currentPickIndex: base.currentPickIndex,
      pickOrder: base.pickOrder,
      userTeamId: 'human',
      candidates: [],
      rollouts: 1,
    });
    const result = executeSnakePickTrade({
      session: base,
      humanTeamId: 'human',
      cpuTeamId: 'cpu',
      humanPickNumbers: [4],
      cpuPickNumbers: [3],
      pickValueChart: [
        { pick: 1, value: 150 },
        { pick: 2, value: 140 },
        { pick: 3, value: 100 },
        { pick: 4, value: 110 },
        { pick: 5, value: 90 },
        { pick: 6, value: 80 },
      ],
    });
    expect(result.accepted).toBe(true);
    expect(result.session.pickOrder.find((slot) => slot.pick === 3)?.teamId).toBe('human');
    expect(result.session.pickOrder.find((slot) => slot.pick === 4)?.teamId).toBe('cpu');
    expect(result.session.trades).toHaveLength(1);
    const after = forecastSnakeAvailability({
      seed: 'trade',
      currentPickIndex: result.session.currentPickIndex,
      pickOrder: result.session.pickOrder,
      userTeamId: 'human',
      candidates: [],
      rollouts: 1,
    });
    expect(before.nextUserPick).toBe(4);
    expect(after.nextUserPick).toBe(3);
  });

  test('run detector names a three-in-five position run and remaining supply', () => {
    const positions = new Map([
      ['a', 'CP'], ['b', 'CP'], ['c', 'SS'], ['d', 'CP'], ['e', 'CF'], ['left', 'CP'],
    ]);
    expect(detectSnakePositionRun({
      completedPlayerIds: ['a', 'b', 'c', 'd', 'e'],
      positionByPlayerId: positions,
      availablePlayerIds: ['left'],
    })).toEqual({ position: 'CP', count: 3, remaining: 1 });
  });
});
