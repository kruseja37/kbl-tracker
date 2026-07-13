import { describe, expect, test } from 'vitest';

import {
  canonicalFarmEligiblePositions,
  reconcileFarmSeatBoards,
  reorderFarmBoard,
  seedFarmSeatBoard,
  type FarmBoardCandidate,
} from '../farmRoomModel';
import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';

const candidates: FarmBoardCandidate[] = [
  { id: 'c', eligiblePositions: ['C'] },
  { id: 'ss', eligiblePositions: ['SS', '2B'] },
  { id: 'two', eligiblePositions: ['SP/RP', 'SP', 'RP'] },
  { id: 'cf', eligiblePositions: ['CF'] },
];

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'farm', leagueId: 'league', seasonNumber: 2, seed: 'seed',
    workflowVersion: 'snake-v1-farm', engineMethodVersion: 'snake-s6', tier: 'standard',
    balanceMode: 'taxed', rounds: 2, draftPhase: 'FARM',
    farmSlotSalaries: [30_000, 20_000, 15_000, 10_000],
    pickOrder: [
      { round: 1, pick: 1, teamId: 'a' }, { round: 1, pick: 2, teamId: 'b' },
      { round: 2, pick: 3, teamId: 'b' }, { round: 2, pick: 4, teamId: 'a' },
    ],
    completedPicks: [], currentPickIndex: 0,
    createdDate: '2026-07-12T00:00:00.000Z', lastModified: '2026-07-12T00:00:00.000Z',
  };
}

describe('farm private boards under scouting fog', () => {
  test('canonicalizes secondary and two-way positions without any rating input', () => {
    expect(canonicalFarmEligiblePositions('SS', '2B')).toEqual(['SS', '2B']);
    expect(canonicalFarmEligiblePositions('SP/RP')).toEqual(['SP/RP', 'SP', 'RP']);
  });

  test('seeds from each scout-visible order and includes secondary positions', () => {
    const a = seedFarmSeatBoard({ candidates, rankedIds: ['ss', 'c', 'two', 'cf'], remainingTurns: 2 });
    const b = seedFarmSeatBoard({ candidates, rankedIds: ['two', 'cf', 'c', 'ss'], remainingTurns: 2 });

    expect(a.overall).not.toEqual(b.overall);
    expect(a.byPosition.SS).toEqual(['ss']);
    expect(a.byPosition['2B']).toEqual(['ss']);
    expect(a.plannedProspectIds).toEqual(['ss', 'c']);
    expect(Object.keys(a)).not.toContain('trueGrade');
  });

  test('overall and position reorders refit deterministically and freeze only the explicit ids', () => {
    const seeded = seedFarmSeatBoard({ candidates, rankedIds: ['ss', 'c', 'two', 'cf'], remainingTurns: 2 });
    const overall = reorderFarmBoard({ board: seeded, view: 'OVERALL', orderedIds: ['cf', 'ss', 'c', 'two'], candidates, remainingTurns: 2 });
    expect(overall.overall).toEqual(['cf', 'ss', 'c', 'two']);
    expect(overall.plannedProspectIds).toEqual(['cf', 'ss']);

    const position = reorderFarmBoard({ board: overall, view: '2B', orderedIds: ['ss'], candidates, remainingTurns: 2 });
    expect(position.byPosition['2B']).toEqual(['ss']);
    expect(position.overall).toEqual(['cf', 'ss', 'c', 'two']);
    expect(position.frozenProspectIds).toEqual(['cf', 'ss', 'c', 'two']);
  });

  test('one recorded prospect backfills three boards in one session result without changing rankings', () => {
    const source = session();
    const boards = Object.fromEntries(['a', 'b', 'c'].map((teamId, index) => [teamId, seedFarmSeatBoard({
      candidates,
      rankedIds: index === 1 ? ['c', 'ss', 'two', 'cf'] : ['ss', 'c', 'two', 'cf'],
      remainingTurns: 2,
    })]));
    const withBoards = { ...source, farmSeatBoards: boards };
    const beforeRankings = Object.fromEntries(Object.entries(boards).map(([id, board]) => [id, { overall: board.overall, byPosition: board.byPosition }]));
    const result = reconcileFarmSeatBoards({
      session: withBoards,
      unavailableProspectIds: new Set(['ss']),
      remainingTurnsByTeamId: { a: 2, b: 2, c: 2 },
    });

    expect(result.changed).toBe(true);
    expect(result.session.revision).toBe(1);
    expect(result.session.farmSeatBoards?.a.plannedProspectIds).toEqual(['c', 'two']);
    expect(result.session.farmSeatBoards?.b.plannedProspectIds).toEqual(['c', 'two']);
    expect(Object.fromEntries(Object.entries(result.session.farmSeatBoards ?? {}).map(([id, board]) => [id, { overall: board.overall, byPosition: board.byPosition }])))
      .toEqual(beforeRankings);
  });

  test('an already-seeded old session is reload-stable when availability has not changed', () => {
    const board = seedFarmSeatBoard({ candidates, rankedIds: ['ss', 'c', 'two', 'cf'], remainingTurns: 2 });
    const source = { ...session(), farmSeatBoards: { a: board } };
    const result = reconcileFarmSeatBoards({
      session: source,
      unavailableProspectIds: new Set(),
      remainingTurnsByTeamId: { a: 2 },
    });
    expect(result.changed).toBe(false);
    expect(result.session).toBe(source);
  });
});
