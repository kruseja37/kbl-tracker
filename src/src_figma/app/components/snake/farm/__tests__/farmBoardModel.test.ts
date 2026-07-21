import { describe, expect, test } from 'vitest';

import {
  buildFarmLivePrivateBoard,
  canonicalFarmEligiblePositions,
  buildFarmPublicRosters,
  buildFarmScoutPressure,
  readFarmLivePrivateBoard,
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
  test('combines saved FARM players with live picks exactly once and uses the complete public roster for pressure', () => {
    const publicRosters = buildFarmPublicRosters({
      teamIds: ['a', 'b'],
      existingFarmRosterIdsByTeamId: {
        a: ['a-catcher', 'a-arm'],
        b: Array.from({ length: 10 }, (_, index) => `b-${index}`),
      },
      storedPlayers: [
        { id: 'a-catcher', firstName: 'Ari', lastName: 'Backstop', primaryPosition: 'C' },
        { id: 'a-arm', firstName: 'Kai', lastName: 'Starter', primaryPosition: 'SP' },
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `b-${index}`, firstName: 'Full', lastName: `Roster ${index}`, primaryPosition: 'SP',
        })),
      ],
      completedPicks: [
        { teamId: 'a', playerId: 'a-arm' },
        { teamId: 'a', playerId: 'a-live' },
      ],
      prospects: [
        { id: 'a-arm', firstName: 'Duplicate', lastName: 'Pick', primaryPosition: 'SP' },
        { id: 'a-live', firstName: 'New', lastName: 'Bat', primaryPosition: 'SS' },
      ],
    });

    expect(publicRosters.a.map((player) => player.id)).toEqual(['a-catcher', 'a-arm', 'a-live']);
    expect(new Set(publicRosters.a.map((player) => player.id)).size).toBe(publicRosters.a.length);
    expect(publicRosters.b).toHaveLength(10);
    expect(buildFarmScoutPressure({
      card: {
        id: 'target', name: 'Target Arm', position: 'SP', scoutedGrade: 'B', gradeRange: 'A-C',
        confidence: 'medium', scoutName: 'Scout', scoutsCall: '', eligiblePositions: ['SP'],
      },
      publicRosters,
      farmTarget: 10,
    })).toContain('0 CLUBS STILL NEED ARMS');
  });

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

  test('round-trips a scout-only live board and takes revision from the server row', () => {
    const board = seedFarmSeatBoard({ candidates, rankedIds: ['ss', 'c', 'two', 'cf'], remainingTurns: 2 });
    const cards = candidates.map((candidate, index) => ({
      id: candidate.id,
      name: `Prospect ${index + 1}`,
      position: candidate.eligiblePositions[0],
      scoutedGrade: 'B' as const,
      gradeRange: 'A–C',
      confidence: 'medium' as const,
      scoutName: 'Own Scout',
      scoutsCall: 'SCOUT READ.',
      eligiblePositions: [...candidate.eligiblePositions],
    }));
    const payload = buildFarmLivePrivateBoard({ board, cards, farmBudget: 250_000 });
    expect(JSON.stringify(payload)).not.toMatch(/trueGrade|prospectProfile|power|contact|velocity|hiddenPersonality/i);

    const parsed = readFarmLivePrivateBoard({
      roomId: 'room', teamId: 'a', boardRevision: 7, board: payload,
      updatedByDeviceId: 'host', updatedAt: 'now',
    });
    expect(parsed).toEqual(expect.objectContaining({ farmBudget: 250_000, cards }));
    expect(parsed?.board).toEqual(expect.objectContaining({ overall: board.overall, revision: 7 }));
  });

  test('rejects a FARM private board that contains true prospect data', () => {
    const board = seedFarmSeatBoard({ candidates, rankedIds: ['ss', 'c', 'two', 'cf'], remainingTurns: 2 });
    expect(() => buildFarmLivePrivateBoard({
      board,
      cards: [{
        id: 'ss', name: 'Secret', position: 'SS', scoutedGrade: 'B', gradeRange: 'A–C',
        confidence: 'medium', scoutName: 'Scout', scoutsCall: 'READ', eligiblePositions: ['SS'],
        trueGrade: 'A+',
      } as never],
      farmBudget: 250_000,
    })).toThrow('forbidden prospect data');
  });

  test('keeps eight club scout payloads isolated from one another', () => {
    const teamIds = Array.from({ length: 8 }, (_, index) => `team-${index + 1}`);
    const rows = teamIds.map((teamId, teamIndex) => {
      const cards = candidates.map((candidate, cardIndex) => ({
        id: candidate.id,
        name: `Prospect ${cardIndex + 1}`,
        position: candidate.eligiblePositions[0],
        scoutedGrade: 'B' as const,
        gradeRange: 'A–C',
        confidence: 'medium' as const,
        scoutName: `Scout ${teamId}`,
        scoutsCall: `PRIVATE READ ${teamIndex + 1}.`,
        eligiblePositions: [...candidate.eligiblePositions],
      }));
      const board = seedFarmSeatBoard({
        candidates,
        rankedIds: [...candidates.map((candidate) => candidate.id).slice(teamIndex % candidates.length), ...candidates.map((candidate) => candidate.id).slice(0, teamIndex % candidates.length)],
        remainingTurns: 10,
      });
      return {
        teamId,
        payload: buildFarmLivePrivateBoard({ board, cards, farmBudget: 250_000 + teamIndex }),
      };
    });

    expect(rows).toHaveLength(8);
    for (const row of rows) {
      const ownScout = `Scout ${row.teamId}`;
      const serialized = JSON.stringify(row.payload);
      expect(serialized).toContain(ownScout);
      for (const otherTeamId of teamIds.filter((id) => id !== row.teamId)) {
        expect(serialized).not.toContain(`Scout ${otherTeamId}`);
      }
      expect(serialized).not.toMatch(/trueGrade|prospectProfile|power|velocity|hiddenPersonality/i);
    }
  });
});
