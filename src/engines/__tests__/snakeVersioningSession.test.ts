import 'fake-indexeddb/auto';
import { afterEach, describe, expect, test } from 'vitest';

import type { RegisteredPool } from '../leagueConstruction';
import { buildSnakeOrder } from '../leagueConstruction';
import { commitCompletedSnakeSessionToLeagueRosters } from '../../utils/leagueBuilderAuctionPipeline';
import {
  __resetLeagueBuilderDatabaseForTests,
  createEmptyTeamRoster,
  getTeamRoster,
  savePlayer,
  saveTeamRoster,
  type LeagueBuilderMlbDraftSession,
  type Player,
} from '../../utils/leagueBuilderStorage';
import {
  applySnakePickWithCorrection,
  restoreLatestSnakeCorrection,
  validateSeatBoard,
} from '../snakeSession';
import {
  countUniqueVersionHumans,
  deriveVersionGroupId,
  retireDraftedVersion,
} from '../snakeVersioning';

function session(): LeagueBuilderMlbDraftSession {
  return {
    id: 'snake-v2',
    leagueId: 'league',
    seasonNumber: 1,
    seed: 'seed',
    workflowVersion: 'snake-v2',
    engineMethodVersion: 'snakeFoundations.v1',
    tier: 'standard',
    balanceMode: 'taxed',
    rounds: 1,
    pickOrder: [{ round: 1, pick: 1, teamId: 'a' }],
    completedPicks: [],
    currentPickIndex: 0,
    revision: 4,
    paused: false,
    versionState: { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} },
    createdDate: '2026-07-10',
    lastModified: '2026-07-10',
  };
}

describe('snake version identity and session v2', () => {
  afterEach(() => __resetLeagueBuilderDatabaseForTests());
  test('versions-count-as-one-human derivation never groups natural same-name players', () => {
    expect(deriveVersionGroupId({ playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' }))
      .toBe('source:ruthba01');
    expect(deriveVersionGroupId({ playerId: 'ruth-1918', sourceId: 'lahman:ruthba01' }))
      .toBe('source:ruthba01');
    expect(deriveVersionGroupId({ playerId: 'morales-a', sourceId: 'lahman:moraljo01' }))
      .not.toBe(deriveVersionGroupId({ playerId: 'morales-b', sourceId: 'lahman:moralvi01' }));
    expect(countUniqueVersionHumans([
      { playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' },
      { playerId: 'ruth-1918', sourceId: 'lahman:ruthba01' },
      { playerId: 'morales-a', sourceId: 'lahman:moraljo01' },
    ])).toBe(2);
  });

  test('drafting one card retires the other cards in its version group', () => {
    const result = retireDraftedVersion({
      state: { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} },
      drafted: { playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' },
      pool: [
        { playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' },
        { playerId: 'ruth-1918', sourceId: 'lahman:ruthba01' },
        { playerId: 'gehrig', sourceId: 'lahman:gehrilo01' },
      ],
    });
    expect(result.retiredPlayerIds).toEqual(['ruth-1918']);
    expect(result.state.draftedPlayerIdByGroupId['source:ruthba01']).toBe('ruth-1927');
  });

  test('correction restores byte-identical prior session state', () => {
    const before = session();
    const after = applySnakePickWithCorrection({
      session: before,
      player: { playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' },
      settledSalary: 100,
      marginalTax: 5,
      versionPool: [
        { playerId: 'ruth-1927', sourceId: 'lahman:ruthba01' },
        { playerId: 'ruth-1918', sourceId: 'lahman:ruthba01' },
      ],
    });
    expect(after.completedPicks).toHaveLength(1);
    expect(after.versionState?.retiredPlayerIdsByGroupId['source:ruthba01'])
      .toEqual(['ruth-1918']);
    expect(restoreLatestSnakeCorrection(after)).toEqual(before);
    expect(JSON.stringify(restoreLatestSnakeCorrection(after))).toBe(JSON.stringify(before));
  });

  test('a stored board is exactly 22 unique player IDs', () => {
    const slots = Object.fromEntries(
      ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'BACKUP_C',
        'SP1', 'SP2', 'SP3', 'SP4', 'RP1', 'RP2', 'RP3', 'CP',
        'FLEX1', 'FLEX2', 'FLEX3', 'FLEX4', 'SWING']
        .map((slotId, index) => [slotId, `player-${index}`]),
    );
    expect(validateSeatBoard({
      slots,
      rankings: { global: Object.values(slots), byPosition: {}, frozenPlayerIds: ['player-0'] },
      revision: 1,
    }).valid).toBe(true);
    expect(validateSeatBoard({
      slots: { ...slots, SWING: 'player-0' },
      rankings: { global: [], byPosition: {}, frozenPlayerIds: [] },
      revision: 1,
    }).valid).toBe(false);
  });

  test('D1 compatibility: a completed v2 session commits 22 unique IDs per team', async () => {
    const teamIds = ['a', 'b'];
    const pickOrder = buildSnakeOrder(teamIds, 22);
    const poolPlayers = pickOrder.map((slot) => ({
      id: `d1-${slot.pick}`,
      iv: 100 + slot.pick,
      salary: 100 + slot.pick,
    }));
    const makePlayer = (id: string): Player => ({
      id,
      firstName: id,
      lastName: 'Player',
      gender: 'M',
      age: 25,
      bats: 'R',
      throws: 'R',
      primaryPosition: 'CF',
      power: 50,
      contact: 50,
      speed: 50,
      fielding: 50,
      arm: 50,
      velocity: 0,
      junk: 0,
      accuracy: 0,
      arsenal: [],
      overallGrade: 'B',
      personality: 'Competitive',
      chemistry: 'Competitive',
      morale: 50,
      mojo: 'Normal',
      fame: 0,
      salary: 0,
      createdDate: '2026-07-10',
      lastModified: '2026-07-10',
      isCustom: false,
    });
    for (const teamId of teamIds) await saveTeamRoster(createEmptyTeamRoster(teamId));
    for (const row of poolPlayers) await savePlayer(makePlayer(row.id));

    const completed: LeagueBuilderMlbDraftSession = {
      ...session(),
      rounds: 22,
      pickOrder,
      completedPicks: pickOrder.map((slot) => ({
        ...slot,
        playerId: `d1-${slot.pick}`,
        settledSalary: 100 + slot.pick,
      })),
      currentPickIndex: pickOrder.length,
      paused: true,
      versionState: { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} },
    };
    const pool: RegisteredPool = {
      leagueId: 'league',
      tier: 'standard',
      balanceMode: 'taxed',
      players: poolPlayers,
      tierCap: 1_000_000,
      luxuryCaps: [],
      pickValueChart: [],
      totalSlots: 44,
      poolSurplusWarning: false,
    };
    const report = await commitCompletedSnakeSessionToLeagueRosters({
      leagueId: 'league',
      session: completed,
      pool,
    });
    expect(report.teamRosterCounts).toEqual({ a: 22, b: 22 });
    for (const teamId of teamIds) {
      const roster = await getTeamRoster(teamId);
      expect(roster?.mlbRoster).toHaveLength(22);
      expect(new Set(roster?.mlbRoster).size).toBe(22);
    }
  });
});
