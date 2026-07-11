import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetTrackerDbForTests } from '../trackerDb';
import { getPlayerMilestones } from '../careerStorage';
import { checkAndProcessSeasonBattingMilestones } from '../milestoneAggregator';
import type { PlayerSeasonBatting } from '../seasonStorage';

const deleteDatabase = (name: string): Promise<void> => new Promise((resolve, reject) => {
  const request = indexedDB.deleteDatabase(name);
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
  request.onblocked = () => resolve();
});

function battingRow(homeRuns: number): PlayerSeasonBatting {
  return {
    seasonId: 'milestone-season-1',
    playerId: 'milestone-batter',
    playerName: 'Milestone Batter',
    teamId: 'team-a',
    games: 10,
    pa: 40,
    ab: 36,
    hits: 12,
    singles: 8,
    doubles: 2,
    triples: 0,
    homeRuns,
    rbi: 10,
    runs: 10,
    walks: 4,
    strikeouts: 5,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1,
  };
}

describe('season milestone persistence truth', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  test('crossing a season threshold emits fame and persists a season-kind milestone in the existing milestone store', async () => {
    const result = await checkAndProcessSeasonBattingMilestones(
      'milestone-batter',
      'Milestone Batter',
      'team-a',
      battingRow(40),
      battingRow(39),
      'milestone-game-1',
      { gamesPerSeason: 162, inningsPerGame: 9 },
    );

    expect(result.milestones.map((milestone) => milestone.eventType)).toContain('SEASON_40_HR');
    expect(result.fameEvents.map((event) => event.eventType)).toContain('SEASON_40_HR');
    expect(result.records).toHaveLength(1);
    await expect(getPlayerMilestones('milestone-batter')).resolves.toEqual([
      expect.objectContaining({
        id: 'season:milestone-season-1:SEASON_40_HR:40:milestone-batter',
        milestoneType: 'SEASON_40_HR_milestone-season-1',
        gameId: 'milestone-game-1',
        seasonId: 'milestone-season-1',
      }),
    ]);
  });
});
