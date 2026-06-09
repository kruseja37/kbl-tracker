import { describe, expect, test } from 'vitest';
import {
  checkForNickname,
  type NicknamePlayerContext,
} from '../nicknameEngine';

const baseContext: NicknamePlayerContext = {
  playerId: 'player-1',
  position: 'SS',
  age: 28,
  seasonsWithTeam: 3,
  fame: 1,
  careerHR: 20,
  careerHits: 200,
  seasonStrikeouts: 80,
  consecutiveGamesWithHit: 3,
  walkOffHits: 0,
  playoffClutchMoments: 0,
  injuredGames: 0,
  seasons: 5,
  war: 2,
  mvpAwards: 0,
  cyYoungAwards: 0,
  allStarSelections: 0,
  goldGloves: 0,
  isRookie: false,
};

describe('nicknameEngine adaptive standards', () => {
  test('preserves default Iron Man behavior without adaptive season config', () => {
    expect(checkForNickname({ ...baseContext, consecutiveGamesPlayed: 161 }, 1)).toBeNull();
    expect(checkForNickname({ ...baseContext, consecutiveGamesPlayed: 162 }, 1)?.nicknameId).toBe('IRON_MAN');
  });

  test('scales Iron Man for short seasons when adaptive standards are supplied', () => {
    const shortSeason = {
      gamesPerSeason: 32,
      inningsPerGame: 6,
    };

    expect(checkForNickname({
      ...baseContext,
      consecutiveGamesPlayed: 31,
      adaptiveStandards: shortSeason,
    }, 1)).toBeNull();

    expect(checkForNickname({
      ...baseContext,
      consecutiveGamesPlayed: 32,
      adaptiveStandards: shortSeason,
    }, 1)?.nicknameId).toBe('IRON_MAN');
  });
});
