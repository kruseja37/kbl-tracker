import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createGameHeader,
  generateBoxScore,
  logAtBatEvent,
  type AtBatEvent,
} from '../../../utils/eventLog';
import type { AtBatResult } from '../../../types/game';

const deleteEventLogDB = () => new Promise<void>((resolve) => {
  const request = indexedDB.deleteDatabase('kbl-event-log');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    resolve();
  };
  request.onsuccess = finish;
  request.onerror = finish;
  request.onblocked = finish;
  setTimeout(finish, 50);
});

afterEach(async () => {
  await deleteEventLogDB();
});

function createAtBatEvent(index: number, result: AtBatResult): AtBatEvent {
  return {
    eventId: `game-box_ab_${index}`,
    gameId: 'game-box',
    eventIndex: index,
    timestamp: index,
    batterId: 'away-batter-1',
    batterName: 'Away Batter',
    batterTeamId: 'away-team',
    pitcherId: 'home-pitcher-1',
    pitcherName: 'Home Pitcher',
    pitcherTeamId: 'home-team',
    result,
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
  };
}

describe('generateBoxScore batter hit/strikeout totals', () => {
  test('counts ITPHR/GRD as hits and the full strikeout family (K/Kc/Ꝁ/D3K/WP_K/PB_K)', async () => {
    await createGameHeader({
      gameId: 'game-box',
      seasonId: 'season-1',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: { away: 0, home: 0 },
      finalInning: 9,
      isComplete: true,
    });

    // 6 hits (incl. ITPHR + GRD), 6 strikeouts (full family incl. Ꝁ glyph), 1 walk.
    const hits: AtBatResult[] = ['1B', '2B', '3B', 'HR', 'ITPHR', 'GRD'];
    const strikeouts: AtBatResult[] = ['K', 'Kc', 'Ꝁ', 'D3K', 'WP_K', 'PB_K'];
    const results: AtBatResult[] = [...hits, ...strikeouts, 'BB'];

    for (let i = 0; i < results.length; i++) {
      await logAtBatEvent(createAtBatEvent(i + 1, results[i]));
    }

    const boxScore = await generateBoxScore('game-box');
    expect(boxScore).not.toBeNull();

    const batter = boxScore?.awayTeam.batters.find((b) => b.playerId === 'away-batter-1');
    expect(batter).toBeDefined();

    // 6 hits credited (ITPHR + GRD no longer dropped)
    expect(batter?.hits).toBe(6);
    // 6 strikeouts credited (Ꝁ + dropped-third-strike family no longer dropped)
    expect(batter?.strikeouts).toBe(6);
    // AB = 12: every hit and strikeout is an AB; only the BB is excluded
    expect(batter?.ab).toBe(12);
    expect(batter?.walks).toBe(1);

    // Team hit total reflects the corrected per-batter hits
    expect(boxScore?.awayTeam.hits).toBe(6);
  });
});
