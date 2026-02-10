/**
 * Tier 2.3 Systems Tests
 * GAP-B10-002 (Nicknames), GAP-B10-005 (Award Emblems),
 * GAP-B10-006 (HOF), GAP-B10-007 (Legacy/Dynasty),
 * GAP-B10-008 (Calendar), GAP-B10-009 (Headlines)
 */
import { describe, test, expect } from 'vitest';

// Nickname Engine
import {
  NICKNAME_TRIGGERS,
  checkForNickname,
  checkAllNicknames,
  createCustomNickname,
  formatNickname,
  type NicknamePlayerContext,
} from '../../../engines/nicknameEngine';

// Award Emblems
import {
  AWARD_EMBLEMS,
  AWARD_PRIORITY,
  getPlayerEmblems,
  getPlayerEmblemsCompact,
  addAward,
  createAwardProfile,
  hasAward,
  getAwardCount,
  getTotalAwards,
} from '../../../engines/awardEmblems';

// HOF Engine
import {
  HOF_WEIGHTS,
  HOF_ELIGIBILITY,
  HOF_FIRST_BALLOT_SCORE,
  calculateHOFScore,
  evaluateHOFEligibility,
  type HOFCandidate,
} from '../../../engines/hofEngine';

// Legacy/Dynasty
import {
  LEGACY_THRESHOLDS,
  countMajorAwards,
  calculateLegacyStatus,
  checkForDynasty,
  getHomegrownRatio,
} from '../../../engines/legacyDynastyTracker';

// Calendar
import {
  SEASON_CALENDAR,
  getGameDate,
  formatGameDate,
  getSpecialEvents,
  getSeasonProgress,
} from '../../../engines/calendarEngine';

// Headlines
import {
  PREGAME_TEMPLATES,
  POSTGAME_TEMPLATES,
  generatePregameHeadlines,
  generatePostgameHeadline,
} from '../../../engines/headlineEngine';

// ============================================
// NICKNAME ENGINE (GAP-B10-002)
// ============================================

describe('Nickname Engine (GAP-B10-002)', () => {
  const baseCtx: NicknamePlayerContext = {
    playerId: 'p1', position: 'SS', age: 28, seasonsWithTeam: 3,
    fame: 1, careerHR: 50, careerHits: 500, seasonStrikeouts: 80,
    consecutiveGamesWithHit: 5, walkOffHits: 1, playoffClutchMoments: 0,
    injuredGames: 0, seasons: 5, war: 3.0, mvpAwards: 0, cyYoungAwards: 0,
    allStarSelections: 0, goldGloves: 0, isRookie: false,
  };

  test('16 triggers defined', () => {
    expect(NICKNAME_TRIGGERS).toHaveLength(16);
  });

  test('MR_OCTOBER triggers on 5+ playoff clutch moments', () => {
    const result = checkForNickname({ ...baseCtx, playoffClutchMoments: 5 }, 1);
    expect(result?.displayName).toBe('Mr. October');
  });

  test('THE_MACHINE triggers on 30+ game hit streak', () => {
    const result = checkForNickname({ ...baseCtx, consecutiveGamesWithHit: 30 }, 1);
    expect(result?.displayName).toBe('The Machine');
  });

  test('THE_NATURAL triggers for rookie with 5+ WAR', () => {
    const result = checkForNickname({ ...baseCtx, isRookie: true, war: 5.5 }, 1);
    expect(result?.displayName).toBe('The Natural');
  });

  test('THE_WIZARD triggers for SS with 3+ GG', () => {
    const result = checkForNickname({ ...baseCtx, position: 'SS', goldGloves: 3 }, 1);
    expect(result?.displayName).toBe('The Wizard');
  });

  test('THE_WHIFF_KING triggers on 200+ season Ks', () => {
    const result = checkForNickname({ ...baseCtx, seasonStrikeouts: 210 }, 1);
    expect(result?.displayName).toBe('The Whiff King');
  });

  test('no nickname when no trigger matches', () => {
    const result = checkForNickname(baseCtx, 1);
    expect(result).toBeNull();
  });

  test('checkAllNicknames returns multiple matches', () => {
    const ctx = { ...baseCtx, playoffClutchMoments: 5, walkOffHits: 6 };
    const results = checkAllNicknames(ctx, 1);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  test('custom nickname creation', () => {
    const custom = createCustomNickname('Big Papi', 3);
    expect(custom.isCustom).toBe(true);
    expect(formatNickname(custom)).toBe('"Big Papi"');
  });
});

// ============================================
// AWARD EMBLEMS (GAP-B10-005)
// ============================================

describe('Award Emblems (GAP-B10-005)', () => {
  test('16 award types defined', () => {
    expect(Object.keys(AWARD_EMBLEMS)).toHaveLength(16);
  });

  test('priority order has 16 entries', () => {
    expect(AWARD_PRIORITY).toHaveLength(16);
  });

  test('HOF is highest priority', () => {
    expect(AWARD_PRIORITY[0]).toBe('HALL_OF_FAME');
  });

  test('getPlayerEmblems with counts', () => {
    const awards = [
      { type: 'MVP' as const, seasons: [1, 3], count: 2 },
      { type: 'ALL_STAR' as const, seasons: [1, 2, 3], count: 3 },
    ];
    const result = getPlayerEmblems(awards);
    expect(result).toContain('🏆MVP(2)');
    expect(result).toContain('⭐AS(3)');
  });

  test('getPlayerEmblems sorts by priority', () => {
    const awards = [
      { type: 'ALL_STAR' as const, seasons: [1], count: 1 },
      { type: 'MVP' as const, seasons: [1], count: 1 },
    ];
    const result = getPlayerEmblems(awards);
    // MVP should come before AS in output
    expect(result.indexOf('MVP')).toBeLessThan(result.indexOf('AS'));
  });

  test('getPlayerEmblems respects maxEmblems', () => {
    const awards = [
      { type: 'MVP' as const, seasons: [1], count: 1 },
      { type: 'CY_YOUNG' as const, seasons: [1], count: 1 },
      { type: 'ALL_STAR' as const, seasons: [1], count: 1 },
    ];
    const result = getPlayerEmblems(awards, { maxEmblems: 2 });
    const parts = result.split(' ');
    expect(parts.length).toBe(2);
  });

  test('getPlayerEmblemsCompact returns abbreviations', () => {
    const awards = [
      { type: 'GOLD_GLOVE' as const, seasons: [1, 2], count: 2 },
    ];
    expect(getPlayerEmblemsCompact(awards)).toBe('GG(2)');
  });

  test('addAward increments existing', () => {
    const profile = createAwardProfile('p1');
    addAward(profile, 'ALL_STAR', 1);
    addAward(profile, 'ALL_STAR', 2);
    expect(getAwardCount(profile, 'ALL_STAR')).toBe(2);
    expect(hasAward(profile, 'ALL_STAR')).toBe(true);
    expect(getTotalAwards(profile)).toBe(2);
  });
});

// ============================================
// HOF ENGINE (GAP-B10-006)
// ============================================

describe('HOF Engine (GAP-B10-006)', () => {
  const baseCandidate: HOFCandidate = {
    playerId: 'p1', playerName: 'Test Player',
    careerWAR: 60, mvpAwards: 2, cyYoungAwards: 0,
    allStarSelections: 8, goldGloves: 3, championships: 2,
    seasonsPlayed: 15, gamesPerSeason: 162,
  };

  test('HOF_WEIGHTS match spec', () => {
    expect(HOF_WEIGHTS.WAR).toBe(1.5);
    expect(HOF_WEIGHTS.MVP).toBe(15);
    expect(HOF_WEIGHTS.CY_YOUNG).toBe(15);
    expect(HOF_WEIGHTS.ALL_STAR).toBe(3);
    expect(HOF_WEIGHTS.GOLD_GLOVE).toBe(2);
    expect(HOF_WEIGHTS.CHAMPIONSHIP).toBe(5);
  });

  test('calculateHOFScore formula correct', () => {
    const score = calculateHOFScore(baseCandidate);
    // 60*1.5 + 2*15 + 0 + 8*3 + 3*2 + 2*5 = 90+30+0+24+6+10 = 160
    expect(score).toBe(160);
  });

  test('HOF score scales WAR by season length', () => {
    const shortSeason = { ...baseCandidate, gamesPerSeason: 50 };
    const score = calculateHOFScore(shortSeason);
    // WAR scaled: 60 * (162/50) = 60 * 3.24 = 194.4 → 194.4*1.5 = 291.6
    // Plus awards: 30+24+6+10 = 70 → total 361.6
    expect(score).toBeGreaterThan(300);
  });

  test('evaluateHOFEligibility — WAR eligible', () => {
    const result = evaluateHOFEligibility(baseCandidate);
    expect(result.eligible).toBe(true);
    expect(result.hofScore).toBeGreaterThan(0);
    expect(result.eligibilityReason).toContain('WAR');
  });

  test('evaluateHOFEligibility — MVP eligible', () => {
    const candidate = { ...baseCandidate, careerWAR: 10, mvpAwards: 1 };
    const result = evaluateHOFEligibility(candidate);
    expect(result.eligible).toBe(true);
    expect(result.eligibilityReason).toContain('MVP');
  });

  test('evaluateHOFEligibility — All-Star eligible', () => {
    const candidate = { ...baseCandidate, careerWAR: 10, mvpAwards: 0, allStarSelections: 5 };
    const result = evaluateHOFEligibility(candidate);
    expect(result.eligible).toBe(true);
    expect(result.eligibilityReason).toContain('All-Star');
  });

  test('evaluateHOFEligibility — not eligible', () => {
    const candidate = { ...baseCandidate, careerWAR: 10, mvpAwards: 0, allStarSelections: 2 };
    const result = evaluateHOFEligibility(candidate);
    expect(result.eligible).toBe(false);
  });

  test('first ballot detection at score >= 90', () => {
    const result = evaluateHOFEligibility(baseCandidate);
    expect(result.hofScore).toBeGreaterThanOrEqual(90);
    expect(result.isFirstBallot).toBe(true);
  });
});

// ============================================
// LEGACY/DYNASTY (GAP-B10-007)
// ============================================

describe('Legacy/Dynasty (GAP-B10-007)', () => {
  test('LEGACY_THRESHOLDS match spec', () => {
    expect(LEGACY_THRESHOLDS.FRANCHISE_CORNERSTONE.minSeasons).toBe(2);
    expect(LEGACY_THRESHOLDS.FRANCHISE_CORNERSTONE.minWAR).toBe(5.0);
    expect(LEGACY_THRESHOLDS.FRANCHISE_ICON.minSeasons).toBe(3);
    expect(LEGACY_THRESHOLDS.FRANCHISE_ICON.minWAR).toBe(10.0);
    expect(LEGACY_THRESHOLDS.FRANCHISE_LEGEND.minSeasons).toBe(5);
    expect(LEGACY_THRESHOLDS.FRANCHISE_LEGEND.minWAR).toBe(18.0);
  });

  test('countMajorAwards adds correctly', () => {
    expect(countMajorAwards({ mvpAwards: 2, cyYoungAwards: 1, allStarSelections: 4, championshipMVPs: 1 }))
      .toBe(6); // 2 + 1 + 2 + 1
  });

  test('calculateLegacyStatus — Legend', () => {
    expect(calculateLegacyStatus(5, 20, 3)).toBe('FRANCHISE_LEGEND');
  });

  test('calculateLegacyStatus — Icon', () => {
    expect(calculateLegacyStatus(3, 12, 1)).toBe('FRANCHISE_ICON');
  });

  test('calculateLegacyStatus — Cornerstone', () => {
    expect(calculateLegacyStatus(2, 6, 0)).toBe('FRANCHISE_CORNERSTONE');
  });

  test('calculateLegacyStatus — null', () => {
    expect(calculateLegacyStatus(1, 2, 0)).toBeNull();
  });

  test('checkForDynasty — DYNASTY (3+ titles in 5 years)', () => {
    const seasons = [
      { season: 1, champion: 'team1', playoffTeams: ['team1'] },
      { season: 2, champion: 'team1', playoffTeams: ['team1'] },
      { season: 3, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 4, champion: 'team1', playoffTeams: ['team1'] },
      { season: 5, champion: 'team1', playoffTeams: ['team1'] },
    ];
    expect(checkForDynasty('team1', seasons)).toBe('DYNASTY');
  });

  test('checkForDynasty — MINI_DYNASTY', () => {
    const seasons = [
      { season: 1, champion: 'team1', playoffTeams: ['team1'] },
      { season: 2, champion: 'team1', playoffTeams: ['team1'] },
      { season: 3, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 4, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 5, champion: 'team2', playoffTeams: ['team1', 'team2'] },
    ];
    expect(checkForDynasty('team1', seasons)).toBe('MINI_DYNASTY');
  });

  test('checkForDynasty — CONTENDER', () => {
    const seasons = [
      { season: 1, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 2, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 3, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 4, champion: 'team2', playoffTeams: ['team1', 'team2'] },
      { season: 5, champion: 'team2', playoffTeams: ['team1', 'team2'] },
    ];
    expect(checkForDynasty('team1', seasons)).toBe('CONTENDER');
  });

  test('checkForDynasty — null', () => {
    const seasons = [
      { season: 1, champion: 'team2', playoffTeams: ['team2'] },
      { season: 2, champion: 'team3', playoffTeams: ['team3'] },
    ];
    expect(checkForDynasty('team1', seasons)).toBeNull();
  });

  test('getHomegrownRatio calculates correctly', () => {
    const result = getHomegrownRatio(['HOMEGROWN', 'HOMEGROWN', 'TRADE_ACQUISITION', 'FREE_AGENT_SIGNING']);
    expect(result.homegrown).toBe(2);
    expect(result.acquired).toBe(2);
    expect(result.ratio).toBe(0.5);
  });
});

// ============================================
// CALENDAR ENGINE (GAP-B10-008)
// ============================================

describe('Calendar Engine (GAP-B10-008)', () => {
  test('SEASON_CALENDAR has all key dates', () => {
    expect(SEASON_CALENDAR.OPENING_DAY).toEqual({ month: 3, day: 28 });
    expect(SEASON_CALENDAR.ALL_STAR_BREAK).toEqual({ month: 7, day: 15 });
    expect(SEASON_CALENDAR.TRADE_DEADLINE).toEqual({ month: 7, day: 31 });
    expect(SEASON_CALENDAR.REGULAR_SEASON_END).toEqual({ month: 9, day: 29 });
  });

  test('getGameDate game 1 = Opening Day', () => {
    const date = getGameDate(1, 50);
    expect(date.month).toBe(3);
    expect(date.day).toBe(28);
  });

  test('getGameDate last game = Regular Season End', () => {
    const date = getGameDate(50, 50);
    expect(date.month).toBe(9);
    expect(date.day).toBe(29);
  });

  test('getGameDate mid-season is between dates', () => {
    const date = getGameDate(25, 50);
    expect(date.month).toBeGreaterThanOrEqual(6);
    expect(date.month).toBeLessThanOrEqual(7);
  });

  test('formatGameDate returns short format', () => {
    expect(formatGameDate({ month: 3, day: 28 })).toBe('Mar 28');
    expect(formatGameDate({ month: 10, day: 1 })).toBe('Oct 1');
  });

  test('getSpecialEvents returns Opening Day for game 1', () => {
    const events = getSpecialEvents(1, 50);
    expect(events.some(e => e.name === 'Opening Day')).toBe(true);
  });

  test('getSpecialEvents returns trade deadline', () => {
    const deadline = Math.floor(50 * 0.65); // game 32
    const events = getSpecialEvents(deadline, 50);
    expect(events.some(e => e.name === 'Trade Deadline')).toBe(true);
  });

  test('getSeasonProgress', () => {
    expect(getSeasonProgress(25, 50)).toBe(0.5);
    expect(getSeasonProgress(50, 50)).toBe(1);
    expect(getSeasonProgress(0, 50)).toBe(0);
  });
});

// ============================================
// HEADLINE ENGINE (GAP-B10-009)
// ============================================

describe('Headline Engine (GAP-B10-009)', () => {
  test('PREGAME_TEMPLATES has 8 types', () => {
    expect(Object.keys(PREGAME_TEMPLATES)).toHaveLength(8);
  });

  test('POSTGAME_TEMPLATES has 10 types', () => {
    expect(Object.keys(POSTGAME_TEMPLATES)).toHaveLength(10);
  });

  test('generatePregameHeadlines returns sorted by priority', () => {
    const headlines = generatePregameHeadlines({
      hotStreak: { name: 'Joe', games: 15 },
      rivalry: { team1: 'Bears', team2: 'Lions' },
      revengePlayer: { name: 'Bob', formerTeam: 'Lions' },
    });
    expect(headlines.length).toBe(3);
    // Revenge (1) should be before rivalry (4) should be before hot streak (8)
    expect(headlines[0].type).toBe('REVENGE_GAME');
    expect(headlines[1].type).toBe('RIVALRY_SHOWDOWN');
    expect(headlines[2].type).toBe('HOT_STREAK');
  });

  test('generatePregameHeadlines fills templates', () => {
    const headlines = generatePregameHeadlines({
      milestoneChase: { name: 'Hank', n: 3, milestone: '500 HR' },
    });
    expect(headlines[0].text).toContain('Hank');
    expect(headlines[0].text).toContain('3');
    expect(headlines[0].text).toContain('500 HR');
  });

  test('generatePostgameHeadline — perfect game highest priority', () => {
    const h = generatePostgameHeadline({
      perfectGame: { pitcher: 'Ace' },
      walkOff: { player: 'Joe', team: 'Bears' },
      winner: 'Bears', loser: 'Lions', score: '1-0',
    });
    expect(h.type).toBe('PERFECT_GAME');
    expect(h.text).toContain('Ace');
  });

  test('generatePostgameHeadline — walk-off if no perfecto/no-no', () => {
    const h = generatePostgameHeadline({
      walkOff: { player: 'Joe', team: 'Bears' },
      winner: 'Bears', loser: 'Lions', score: '5-4',
    });
    expect(h.type).toBe('WALK_OFF');
  });

  test('generatePostgameHeadline — blowout detection', () => {
    const h = generatePostgameHeadline({
      winner: 'Bears', loser: 'Lions', score: '12-2',
    });
    expect(h.type).toBe('BLOWOUT');
  });

  test('generatePostgameHeadline — default fallback', () => {
    const h = generatePostgameHeadline({
      winner: 'Bears', loser: 'Lions', score: '3-2',
    });
    expect(h.type).toBe('CLUTCH_MOMENT');
  });
});
