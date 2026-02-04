/**
 * Franchise Data Logic Tests
 *
 * Tests the business logic and helper functions used in useFranchiseData hook.
 * These tests verify data transformation without requiring React rendering.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// HELPER FUNCTIONS (extracted from useFranchiseData.ts)
// ============================================

interface LeaderEntry {
  player: string;
  team: string;
  value: string;
}

interface BattingLeaderEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  avg: number;
  homeRuns: number;
  rbi: number;
  stolenBases: number;
  ops: number;
}

interface PitchingLeaderEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  era: number;
  wins: number;
  strikeouts: number;
  whip: number;
  saves: number;
}

type BattingStat = 'AVG' | 'HR' | 'RBI' | 'SB' | 'OPS';
type PitchingStat = 'ERA' | 'W' | 'K' | 'WHIP' | 'SV';

function toBattingLeaderEntry(entry: BattingLeaderEntry, stat: BattingStat): LeaderEntry {
  let value: string;
  switch (stat) {
    case 'AVG':
      value = entry.avg.toFixed(3).replace(/^0/, '');
      break;
    case 'HR':
      value = entry.homeRuns.toString();
      break;
    case 'RBI':
      value = entry.rbi.toString();
      break;
    case 'SB':
      value = entry.stolenBases.toString();
      break;
    case 'OPS':
      value = entry.ops.toFixed(3);
      break;
    default:
      value = '0';
  }

  return {
    player: entry.playerName,
    team: entry.teamId,
    value,
  };
}

function toPitchingLeaderEntry(entry: PitchingLeaderEntry, stat: PitchingStat): LeaderEntry {
  let value: string;
  switch (stat) {
    case 'ERA':
      value = entry.era.toFixed(2);
      break;
    case 'W':
      value = entry.wins.toString();
      break;
    case 'K':
      value = entry.strikeouts.toString();
      break;
    case 'WHIP':
      value = entry.whip.toFixed(2);
      break;
    case 'SV':
      value = entry.saves.toString();
      break;
    default:
      value = '0';
  }

  return {
    player: entry.playerName,
    team: entry.teamId,
    value,
  };
}

function calculateWeek(gamesPlayed: number, gamesPerWeek: number = 6): number {
  return Math.floor(gamesPlayed / gamesPerWeek) + 1;
}

interface StandingEntry {
  team: string;
  wins: number;
  losses: number;
  gamesBack: string;
  runDiff: string;
}

interface StorageTeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  gamesBack: number;
  runDiff: number;
}

function convertToStandingEntry(s: StorageTeamStanding): StandingEntry {
  return {
    team: s.teamName,
    wins: s.wins,
    losses: s.losses,
    gamesBack: s.gamesBack === 0 ? "-" : s.gamesBack.toFixed(1),
    runDiff: s.runDiff >= 0 ? `+${s.runDiff}` : `${s.runDiff}`,
  };
}

// ============================================
// BATTING LEADER CONVERSION TESTS
// ============================================

describe('Batting Leader Entry Conversion', () => {
  const mockBatter: BattingLeaderEntry = {
    playerId: 'p1',
    playerName: 'J. Rodriguez',
    teamId: 'Tigers',
    avg: 0.342,
    homeRuns: 47,
    rbi: 128,
    stolenBases: 48,
    ops: 1.087,
  };

  describe('AVG formatting', () => {
    test('formats AVG to 3 decimal places without leading zero', () => {
      const result = toBattingLeaderEntry(mockBatter, 'AVG');
      expect(result.value).toBe('.342');
    });

    test('AVG .300 formats to .300', () => {
      const batter = { ...mockBatter, avg: 0.300 };
      const result = toBattingLeaderEntry(batter, 'AVG');
      expect(result.value).toBe('.300');
    });

    test('AVG .099 formats to .099', () => {
      const batter = { ...mockBatter, avg: 0.099 };
      const result = toBattingLeaderEntry(batter, 'AVG');
      expect(result.value).toBe('.099');
    });
  });

  describe('HR formatting', () => {
    test('formats HR as integer', () => {
      const result = toBattingLeaderEntry(mockBatter, 'HR');
      expect(result.value).toBe('47');
    });

    test('single-digit HR', () => {
      const batter = { ...mockBatter, homeRuns: 5 };
      const result = toBattingLeaderEntry(batter, 'HR');
      expect(result.value).toBe('5');
    });
  });

  describe('RBI formatting', () => {
    test('formats RBI as integer', () => {
      const result = toBattingLeaderEntry(mockBatter, 'RBI');
      expect(result.value).toBe('128');
    });
  });

  describe('SB formatting', () => {
    test('formats SB as integer', () => {
      const result = toBattingLeaderEntry(mockBatter, 'SB');
      expect(result.value).toBe('48');
    });
  });

  describe('OPS formatting', () => {
    test('formats OPS to 3 decimal places with leading digit', () => {
      const result = toBattingLeaderEntry(mockBatter, 'OPS');
      expect(result.value).toBe('1.087');
    });

    test('OPS under 1.000', () => {
      const batter = { ...mockBatter, ops: 0.923 };
      const result = toBattingLeaderEntry(batter, 'OPS');
      expect(result.value).toBe('0.923');
    });
  });

  test('includes player name and team', () => {
    const result = toBattingLeaderEntry(mockBatter, 'HR');
    expect(result.player).toBe('J. Rodriguez');
    expect(result.team).toBe('Tigers');
  });
});

// ============================================
// PITCHING LEADER CONVERSION TESTS
// ============================================

describe('Pitching Leader Entry Conversion', () => {
  const mockPitcher: PitchingLeaderEntry = {
    playerId: 'p2',
    playerName: 'T. Anderson',
    teamId: 'Sox',
    era: 2.38,
    wins: 19,
    strikeouts: 287,
    whip: 1.02,
    saves: 45,
  };

  describe('ERA formatting', () => {
    test('formats ERA to 2 decimal places', () => {
      const result = toPitchingLeaderEntry(mockPitcher, 'ERA');
      expect(result.value).toBe('2.38');
    });

    test('ERA under 2.00', () => {
      const pitcher = { ...mockPitcher, era: 1.85 };
      const result = toPitchingLeaderEntry(pitcher, 'ERA');
      expect(result.value).toBe('1.85');
    });

    test('ERA over 4.00', () => {
      const pitcher = { ...mockPitcher, era: 4.56 };
      const result = toPitchingLeaderEntry(pitcher, 'ERA');
      expect(result.value).toBe('4.56');
    });
  });

  describe('Wins formatting', () => {
    test('formats W as integer', () => {
      const result = toPitchingLeaderEntry(mockPitcher, 'W');
      expect(result.value).toBe('19');
    });
  });

  describe('Strikeouts formatting', () => {
    test('formats K as integer', () => {
      const result = toPitchingLeaderEntry(mockPitcher, 'K');
      expect(result.value).toBe('287');
    });
  });

  describe('WHIP formatting', () => {
    test('formats WHIP to 2 decimal places', () => {
      const result = toPitchingLeaderEntry(mockPitcher, 'WHIP');
      expect(result.value).toBe('1.02');
    });

    test('WHIP under 1.00', () => {
      const pitcher = { ...mockPitcher, whip: 0.95 };
      const result = toPitchingLeaderEntry(pitcher, 'WHIP');
      expect(result.value).toBe('0.95');
    });
  });

  describe('Saves formatting', () => {
    test('formats SV as integer', () => {
      const result = toPitchingLeaderEntry(mockPitcher, 'SV');
      expect(result.value).toBe('45');
    });
  });

  test('includes player name and team', () => {
    const result = toPitchingLeaderEntry(mockPitcher, 'ERA');
    expect(result.player).toBe('T. Anderson');
    expect(result.team).toBe('Sox');
  });
});

// ============================================
// WEEK CALCULATION TESTS
// ============================================

describe('Week Calculation', () => {
  describe('default 6 games per week', () => {
    test('0 games = week 1', () => {
      expect(calculateWeek(0)).toBe(1);
    });

    test('5 games = week 1', () => {
      expect(calculateWeek(5)).toBe(1);
    });

    test('6 games = week 2', () => {
      expect(calculateWeek(6)).toBe(2);
    });

    test('12 games = week 3', () => {
      expect(calculateWeek(12)).toBe(3);
    });

    test('50 games = week 9', () => {
      expect(calculateWeek(50)).toBe(9);
    });

    test('64 games = week 11 (full SMB4 season)', () => {
      expect(calculateWeek(64)).toBe(11);
    });
  });

  describe('custom games per week', () => {
    test('7 games per week', () => {
      expect(calculateWeek(14, 7)).toBe(3);
    });

    test('1 game per week', () => {
      expect(calculateWeek(5, 1)).toBe(6);
    });
  });
});

// ============================================
// STANDINGS CONVERSION TESTS
// ============================================

describe('Standings Entry Conversion', () => {
  describe('games back formatting', () => {
    test('first place shows dash', () => {
      const standing: StorageTeamStanding = {
        teamId: 't1',
        teamName: 'Tigers',
        wins: 56,
        losses: 34,
        gamesBack: 0,
        runDiff: 127,
      };
      const result = convertToStandingEntry(standing);
      expect(result.gamesBack).toBe('-');
    });

    test('4 games back', () => {
      const standing: StorageTeamStanding = {
        teamId: 't2',
        teamName: 'Sox',
        wins: 52,
        losses: 38,
        gamesBack: 4,
        runDiff: 89,
      };
      const result = convertToStandingEntry(standing);
      expect(result.gamesBack).toBe('4.0');
    });

    test('half game back', () => {
      const standing: StorageTeamStanding = {
        teamId: 't3',
        teamName: 'Bears',
        wins: 55,
        losses: 34,
        gamesBack: 0.5,
        runDiff: 100,
      };
      const result = convertToStandingEntry(standing);
      expect(result.gamesBack).toBe('0.5');
    });
  });

  describe('run differential formatting', () => {
    test('positive run diff has plus sign', () => {
      const standing: StorageTeamStanding = {
        teamId: 't1',
        teamName: 'Tigers',
        wins: 56,
        losses: 34,
        gamesBack: 0,
        runDiff: 127,
      };
      const result = convertToStandingEntry(standing);
      expect(result.runDiff).toBe('+127');
    });

    test('negative run diff has minus sign', () => {
      const standing: StorageTeamStanding = {
        teamId: 't4',
        teamName: 'Crocs',
        wins: 44,
        losses: 46,
        gamesBack: 12,
        runDiff: -12,
      };
      const result = convertToStandingEntry(standing);
      expect(result.runDiff).toBe('-12');
    });

    test('zero run diff shows +0', () => {
      const standing: StorageTeamStanding = {
        teamId: 't5',
        teamName: 'Moonstars',
        wins: 45,
        losses: 45,
        gamesBack: 11,
        runDiff: 0,
      };
      const result = convertToStandingEntry(standing);
      expect(result.runDiff).toBe('+0');
    });
  });

  test('preserves team name and record', () => {
    const standing: StorageTeamStanding = {
      teamId: 't1',
      teamName: 'Tigers',
      wins: 56,
      losses: 34,
      gamesBack: 0,
      runDiff: 127,
    };
    const result = convertToStandingEntry(standing);
    expect(result.team).toBe('Tigers');
    expect(result.wins).toBe(56);
    expect(result.losses).toBe(34);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  describe('extreme batting stats', () => {
    test('perfect batting average (1.000)', () => {
      const batter: BattingLeaderEntry = {
        playerId: 'p1',
        playerName: 'Perfect',
        teamId: 'Team',
        avg: 1.000,
        homeRuns: 0,
        rbi: 0,
        stolenBases: 0,
        ops: 2.000,
      };
      const result = toBattingLeaderEntry(batter, 'AVG');
      // 1.000 -> "1.000" with leading zero removed = "1.000" (no leading zero to remove)
      expect(result.value).toBe('1.000');
    });

    test('zero stats', () => {
      const batter: BattingLeaderEntry = {
        playerId: 'p1',
        playerName: 'Bench',
        teamId: 'Team',
        avg: 0,
        homeRuns: 0,
        rbi: 0,
        stolenBases: 0,
        ops: 0,
      };
      expect(toBattingLeaderEntry(batter, 'HR').value).toBe('0');
      expect(toBattingLeaderEntry(batter, 'RBI').value).toBe('0');
      expect(toBattingLeaderEntry(batter, 'OPS').value).toBe('0.000');
    });
  });

  describe('extreme pitching stats', () => {
    test('0.00 ERA', () => {
      const pitcher: PitchingLeaderEntry = {
        playerId: 'p1',
        playerName: 'Perfect',
        teamId: 'Team',
        era: 0,
        wins: 10,
        strikeouts: 100,
        whip: 0.5,
        saves: 0,
      };
      const result = toPitchingLeaderEntry(pitcher, 'ERA');
      expect(result.value).toBe('0.00');
    });

    test('high ERA (9.00+)', () => {
      const pitcher: PitchingLeaderEntry = {
        playerId: 'p1',
        playerName: 'Bad',
        teamId: 'Team',
        era: 12.34,
        wins: 0,
        strikeouts: 10,
        whip: 2.5,
        saves: 0,
      };
      const result = toPitchingLeaderEntry(pitcher, 'ERA');
      expect(result.value).toBe('12.34');
    });
  });

  describe('large standings values', () => {
    test('large games back', () => {
      const standing: StorageTeamStanding = {
        teamId: 't1',
        teamName: 'Last',
        wins: 20,
        losses: 70,
        gamesBack: 35.5,
        runDiff: -200,
      };
      const result = convertToStandingEntry(standing);
      expect(result.gamesBack).toBe('35.5');
      expect(result.runDiff).toBe('-200');
    });
  });
});
