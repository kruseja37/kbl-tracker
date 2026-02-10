import { describe, it, expect } from 'vitest';
import {
  detectFanFavorite,
  detectAlbatross,
  detectDesignations,
  getMinGamesForQualification,
  getMinSalaryForAlbatross,
  shouldRecalculate,
  generateFanFavoriteReason,
  generateAlbatrossReason,
  calculateInSeasonHappiness,
  getTransactionHappiness,
  applyTradeValueModifier,
  calculateFreeAgencyDemand,
  generateHeadline,
  getValueDeltaColor,
  getDesignationBadge,
  processEndOfSeason,
  shouldCarryOverDesignations,
  createCarryoverRecord,
  IN_SEASON_HAPPINESS_EFFECTS,
  TRANSACTION_HAPPINESS_EFFECTS,
  TRADE_VALUE_MODIFIERS,
  CONTRACT_MODIFIERS,
  type PlayerSeasonData,
  type LeagueContext,
} from '../../../engines/fanFavoriteEngine';

const makePlayer = (overrides: Partial<PlayerSeasonData> = {}): PlayerSeasonData => ({
  playerId: 'p1',
  playerName: 'Test Player',
  position: 'CF',
  salary: 5_000_000,
  gamesPlayed: 10,
  war: 3.0,
  trueValue: 10_000_000,
  ...overrides,
});

const makeContext = (overrides: Partial<LeagueContext> = {}): LeagueContext => ({
  gamesPerTeam: 50,
  leagueMinSalary: 1_000_000,
  seasonProgress: 0.5,
  ...overrides,
});

describe('Fan Favorite Engine', () => {
  describe('getMinGamesForQualification (GAP-B4-014)', () => {
    it('returns 10% of season games', () => {
      expect(getMinGamesForQualification(50)).toBe(5);
      expect(getMinGamesForQualification(100)).toBe(10);
    });

    it('has floor of 3 games', () => {
      expect(getMinGamesForQualification(10)).toBe(3);
      expect(getMinGamesForQualification(1)).toBe(3);
    });
  });

  describe('getMinSalaryForAlbatross', () => {
    it('returns 2x league minimum', () => {
      expect(getMinSalaryForAlbatross(1_000_000)).toBe(2_000_000);
    });
  });

  describe('shouldRecalculate (GAP-B4-014)', () => {
    it('returns true for game end', () => {
      expect(shouldRecalculate('GAME_END')).toBe(true);
    });

    it('returns true for trade completed', () => {
      expect(shouldRecalculate('TRADE_COMPLETED')).toBe(true);
    });

    it('returns false for mojo changes', () => {
      expect(shouldRecalculate('MOJO_CHANGE')).toBe(false);
    });
  });

  describe('detectFanFavorite (GAP-B4-012)', () => {
    it('selects player with highest positive value delta', () => {
      const players = [
        makePlayer({ playerId: 'p1', salary: 2_000_000, trueValue: 8_000_000, gamesPlayed: 10 }),
        makePlayer({ playerId: 'p2', salary: 3_000_000, trueValue: 12_000_000, gamesPlayed: 10 }),
        makePlayer({ playerId: 'p3', salary: 5_000_000, trueValue: 6_000_000, gamesPlayed: 10 }),
      ];
      const result = detectFanFavorite(players, makeContext());
      expect(result).not.toBeNull();
      expect(result!.playerId).toBe('p2'); // +9M delta
    });

    it('returns null if no players have positive delta', () => {
      const players = [
        makePlayer({ salary: 10_000_000, trueValue: 5_000_000, gamesPlayed: 10 }),
      ];
      const result = detectFanFavorite(players, makeContext());
      expect(result).toBeNull();
    });

    it('requires minimum games played', () => {
      const players = [
        makePlayer({ gamesPlayed: 2, salary: 1_000_000, trueValue: 10_000_000 }),
      ];
      // With 50 games/team, min is 5 games
      const result = detectFanFavorite(players, makeContext());
      expect(result).toBeNull();
    });

    it('sets projected status when season not over', () => {
      const players = [makePlayer()];
      const result = detectFanFavorite(players, makeContext({ seasonProgress: 0.5 }));
      expect(result!.status).toBe('projected');
    });

    it('sets locked status at season end', () => {
      const players = [makePlayer()];
      const result = detectFanFavorite(players, makeContext({ seasonProgress: 1.0 }));
      expect(result!.status).toBe('locked');
    });
  });

  describe('detectAlbatross (GAP-B4-013)', () => {
    it('selects player with most negative value delta', () => {
      const players = [
        makePlayer({ playerId: 'p1', salary: 15_000_000, trueValue: 5_000_000, gamesPlayed: 10 }),
        makePlayer({ playerId: 'p2', salary: 20_000_000, trueValue: 3_000_000, gamesPlayed: 10 }),
      ];
      const result = detectAlbatross(players, makeContext());
      expect(result).not.toBeNull();
      expect(result!.playerId).toBe('p2'); // -17M delta
    });

    it('requires salary ≥ 2x league minimum', () => {
      const players = [
        makePlayer({ salary: 1_500_000, trueValue: 500_000, gamesPlayed: 10 }),
      ];
      // Min salary for albatross = 2M, player has 1.5M
      const result = detectAlbatross(players, makeContext());
      expect(result).toBeNull();
    });

    it('requires ≥25% underperformance', () => {
      const players = [
        makePlayer({ salary: 5_000_000, trueValue: 4_500_000, gamesPlayed: 10 }),
      ];
      // -10% underperformance, below 25% threshold
      const result = detectAlbatross(players, makeContext());
      expect(result).toBeNull();
    });

    it('detects albatross at exactly 25% underperformance', () => {
      const players = [
        makePlayer({ salary: 4_000_000, trueValue: 3_000_000, gamesPlayed: 10 }),
      ];
      // -25% = threshold
      const result = detectAlbatross(players, makeContext());
      expect(result).not.toBeNull();
    });
  });

  describe('generateFanFavoriteReason', () => {
    it('returns "absolute steal" for ≥500%', () => {
      expect(generateFanFavoriteReason(500)).toContain('absolute steal');
    });

    it('returns "massively outperforming" for ≥200%', () => {
      expect(generateFanFavoriteReason(250)).toContain('Massively outperforming');
    });

    it('returns "double the value" for ≥100%', () => {
      expect(generateFanFavoriteReason(150)).toContain('double the value');
    });

    it('returns default for <100%', () => {
      expect(generateFanFavoriteReason(50)).toContain('Exceeding expectations');
    });
  });

  describe('generateAlbatrossReason (GAP-B4-025)', () => {
    it('returns "Complete bust" for ≥75% under', () => {
      expect(generateAlbatrossReason(-80)).toContain('Complete bust');
    });

    it('returns "Severely underperforming" for ≥50% under', () => {
      expect(generateAlbatrossReason(-60)).toContain('Severely underperforming');
    });

    it('returns default for moderate underperformance', () => {
      expect(generateAlbatrossReason(-30)).toContain('Not living up');
    });
  });

  describe('In-Season Happiness Effects (GAP-B4-015)', () => {
    it('applies season scaling', () => {
      const early = calculateInSeasonHappiness('FF_BIG_GAME', 0.1);
      const late = calculateInSeasonHappiness('FF_BIG_GAME', 0.9);
      expect(late).toBeGreaterThan(early);
    });

    it('FF walkoff has highest positive value', () => {
      expect(IN_SEASON_HAPPINESS_EFFECTS.FF_WALKOFF).toBe(2.0);
    });

    it('Albatross error is negative', () => {
      expect(IN_SEASON_HAPPINESS_EFFECTS.ALB_COSTLY_ERROR).toBe(-1.0);
    });
  });

  describe('Transaction Happiness (GAP-B4-016)', () => {
    it('traded FF causes large negative effect', () => {
      expect(getTransactionHappiness('TRADED_FAN_FAVORITE')).toBe(-15);
    });

    it('traded Albatross causes positive effect', () => {
      expect(getTransactionHappiness('TRADED_ALBATROSS')).toBe(10);
    });

    it('released FF is worse than traded FF', () => {
      expect(TRANSACTION_HAPPINESS_EFFECTS.RELEASED_FAN_FAVORITE).toBeLessThan(
        TRANSACTION_HAPPINESS_EFFECTS.TRADED_FAN_FAVORITE
      );
    });
  });

  describe('Trade Value Modifier (GAP-B4-017)', () => {
    it('FF gets 15% premium', () => {
      expect(applyTradeValueModifier(100, 'FAN_FAVORITE')).toBeCloseTo(115);
    });

    it('Albatross gets 30% discount', () => {
      expect(applyTradeValueModifier(100, 'ALBATROSS')).toBe(70);
    });

    it('no modifier for non-designated', () => {
      expect(applyTradeValueModifier(100, null)).toBe(100);
    });
  });

  describe('Contract Negotiation (GAP-B4-018)', () => {
    it('FF demands 15% more', () => {
      const demand = calculateFreeAgencyDemand(10_000_000, 'FAN_FAVORITE', false);
      expect(demand).toBe(11_500_000);
    });

    it('FF loyalty discount on re-sign', () => {
      const demand = calculateFreeAgencyDemand(10_000_000, 'FAN_FAVORITE', true);
      expect(demand).toBe(10_350_000); // 11.5M * 0.9
    });

    it('Albatross accepts 10% less', () => {
      const demand = calculateFreeAgencyDemand(10_000_000, 'ALBATROSS', false);
      expect(demand).toBe(9_000_000);
    });
  });

  describe('Narrative Headlines (GAP-B4-019)', () => {
    it('generates headline with player and team', () => {
      const headline = generateHeadline('NEW_FAN_FAVORITE', 'J. Smith', 'Tigers');
      expect(headline).toContain('J. Smith');
      expect(headline).toContain('Tigers');
    });

    it('generates headline with percentage', () => {
      const headline = generateHeadline('ALBATROSS_EMERGES', 'R. Davis', 'Sox', -50);
      expect(headline).toContain('R. Davis');
      expect(headline).toContain('Sox');
    });
  });

  describe('Value Delta Color (GAP-B4-022)', () => {
    it('green-bright for ≥100% over', () => {
      expect(getValueDeltaColor(10_000_000, 5_000_000)).toBe('green-bright');
    });

    it('green for 25-99% over', () => {
      expect(getValueDeltaColor(2_500_000, 5_000_000)).toBe('green');
    });

    it('gray for -25% to +25%', () => {
      expect(getValueDeltaColor(500_000, 5_000_000)).toBe('gray');
    });

    it('orange for -50% to -25%', () => {
      expect(getValueDeltaColor(-2_000_000, 5_000_000)).toBe('orange');
    });

    it('red for <-50%', () => {
      expect(getValueDeltaColor(-3_000_000, 5_000_000)).toBe('red');
    });
  });

  describe('Designation Badge (GAP-B4-023)', () => {
    it('FF gets star emoji and solid border when locked', () => {
      const badge = getDesignationBadge('FAN_FAVORITE', 'locked');
      expect(badge.emoji).toBe('⭐');
      expect(badge.borderStyle).toBe('solid');
    });

    it('FF gets dashed border when projected', () => {
      const badge = getDesignationBadge('FAN_FAVORITE', 'projected');
      expect(badge.borderStyle).toBe('dashed');
    });

    it('Albatross gets skull emoji', () => {
      const badge = getDesignationBadge('ALBATROSS', 'locked');
      expect(badge.emoji).toBe('💀');
      expect(badge.label).toBe('ALBATROSS');
    });
  });

  describe('End of Season Processing (GAP-B4-021)', () => {
    it('locks designations and awards fame', () => {
      const players = [
        makePlayer({ playerId: 'ff', salary: 2_000_000, trueValue: 10_000_000, gamesPlayed: 10 }),
        makePlayer({ playerId: 'alb', salary: 15_000_000, trueValue: 5_000_000, gamesPlayed: 10 }),
      ];
      const result = processEndOfSeason(players, makeContext());

      expect(result.fanFavorite).not.toBeNull();
      expect(result.fanFavorite!.status).toBe('locked');
      expect(result.albatross).not.toBeNull();
      expect(result.albatross!.status).toBe('locked');

      expect(result.fameEvents).toHaveLength(2);
      expect(result.fameEvents[0].type).toBe('FAN_FAVORITE_NAMED');
      expect(result.fameEvents[0].fameValue).toBe(2.0);
      expect(result.fameEvents[1].type).toBe('ALBATROSS_NAMED');
      expect(result.fameEvents[1].fameValue).toBe(-1.0);
    });
  });

  describe('Season Carryover (GAP-B4-024)', () => {
    it('carries over when < 10% of new season played', () => {
      expect(shouldCarryOverDesignations(2, 50)).toBe(true);
    });

    it('stops carryover at 10% threshold', () => {
      expect(shouldCarryOverDesignations(5, 50)).toBe(false);
    });

    it('creates carryover record', () => {
      const ff = detectFanFavorite(
        [makePlayer()],
        makeContext({ seasonProgress: 1.0 })
      )!;
      const record = createCarryoverRecord(ff, 'season-1', 'team-1');
      expect(record.designation).toBe('FAN_FAVORITE');
      expect(record.previousSeasonId).toBe('season-1');
    });
  });
});
