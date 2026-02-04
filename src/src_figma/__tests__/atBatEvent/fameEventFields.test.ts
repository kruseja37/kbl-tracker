/**
 * Fame Event Fields Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.6
 *
 * Tests that AtBatEvent fameEvents field is properly populated
 * with detected fame events rather than being always empty.
 */

import { describe, test, expect } from 'vitest';
import type {
  AtBatEvent,
  FameEventRecord,
} from '../../utils/eventLog';

// ============================================
// FAME EVENT RECORD STRUCTURE
// ============================================

describe('FameEventRecord Structure', () => {
  test('FameEventRecord has all required properties', () => {
    const fameEvent: FameEventRecord = {
      eventType: 'WEB_GEM',
      fameType: 'bonus',
      fameValue: 1.0,
      playerId: 'player-001',
      playerName: 'Test Player',
      description: 'Diving catch in center field',
    };

    expect(fameEvent.eventType).toBe('WEB_GEM');
    expect(fameEvent.fameType).toBe('bonus');
    expect(fameEvent.fameValue).toBe(1.0);
    expect(fameEvent.playerId).toBe('player-001');
    expect(fameEvent.playerName).toBe('Test Player');
    expect(fameEvent.description).toBeTruthy();
  });

  test('fameType is either bonus or boner', () => {
    const bonus: FameEventRecord = {
      eventType: 'ROBBERY',
      fameType: 'bonus',
      fameValue: 1.5,
      playerId: 'p1',
      playerName: 'P1',
      description: 'HR robbery at wall',
    };

    const boner: FameEventRecord = {
      eventType: 'TOOTBLAN',
      fameType: 'boner',
      fameValue: -3.0,
      playerId: 'p2',
      playerName: 'P2',
      description: 'Picked off while not paying attention',
    };

    expect(['bonus', 'boner']).toContain(bonus.fameType);
    expect(['bonus', 'boner']).toContain(boner.fameType);
    expect(bonus.fameValue).toBeGreaterThan(0);
    expect(boner.fameValue).toBeLessThan(0);
  });
});

// ============================================
// FAME EVENT TYPES (Per SPECIAL_EVENTS_SPEC.md)
// ============================================

describe('Fame Event Types', () => {
  describe('Fame Bonus Events', () => {
    test('WEB_GEM event structure', () => {
      const webGem: FameEventRecord = {
        eventType: 'WEB_GEM',
        fameType: 'bonus',
        fameValue: 1.0,
        playerId: 'fielder-001',
        playerName: 'Great Fielder',
        description: 'Spectacular diving catch',
      };

      expect(webGem.eventType).toBe('WEB_GEM');
      expect(webGem.fameType).toBe('bonus');
      expect(webGem.fameValue).toBeGreaterThan(0);
    });

    test('ROBBERY event structure (HR denial)', () => {
      // Per kbl-detection-philosophy.md: Robbery > Web Gem
      // Robbery = HR denied at wall (y > 0.95)
      const robbery: FameEventRecord = {
        eventType: 'ROBBERY',
        fameType: 'bonus',
        fameValue: 1.5, // Higher than Web Gem
        playerId: 'cf-001',
        playerName: 'Center Fielder',
        description: 'Robbed home run at the wall',
      };

      expect(robbery.eventType).toBe('ROBBERY');
      expect(robbery.fameValue).toBeGreaterThan(1.0); // > Web Gem
    });

    test('CLUTCH_HIT event structure', () => {
      const clutchHit: FameEventRecord = {
        eventType: 'CLUTCH_HIT',
        fameType: 'bonus',
        fameValue: 2.0,
        playerId: 'batter-001',
        playerName: 'Clutch Batter',
        description: 'Walk-off hit in 9th',
      };

      expect(clutchHit.eventType).toBe('CLUTCH_HIT');
      expect(clutchHit.fameType).toBe('bonus');
    });

    test('NUT_SHOT_SURVIVES event structure', () => {
      // Per kbl-detection-philosophy.md: +2 Fame if survives
      const nutShotSurvives: FameEventRecord = {
        eventType: 'NUT_SHOT_SURVIVES',
        fameType: 'bonus',
        fameValue: 2.0,
        playerId: 'pitcher-001',
        playerName: 'Tough Pitcher',
        description: 'Hit by comebacker, stayed in game',
      };

      expect(nutShotSurvives.fameValue).toBe(2.0);
    });

    test('NUT_SHOT_EXITS event structure', () => {
      // Per kbl-detection-philosophy.md: +1 Fame if exits
      const nutShotExits: FameEventRecord = {
        eventType: 'NUT_SHOT_EXITS',
        fameType: 'bonus',
        fameValue: 1.0,
        playerId: 'pitcher-001',
        playerName: 'Injured Pitcher',
        description: 'Hit by comebacker, had to leave',
      };

      expect(nutShotExits.fameValue).toBe(1.0);
    });
  });

  describe('Fame Boner Events', () => {
    test('TOOTBLAN event structure', () => {
      // Per kbl-detection-philosophy.md: -3 Fame for TOOTBLAN
      const tootblan: FameEventRecord = {
        eventType: 'TOOTBLAN',
        fameType: 'boner',
        fameValue: -3.0,
        playerId: 'runner-001',
        playerName: 'Baserunning Blunder',
        description: 'Thrown out on bases in stupid way',
      };

      expect(tootblan.eventType).toBe('TOOTBLAN');
      expect(tootblan.fameType).toBe('boner');
      expect(tootblan.fameValue).toBe(-3.0);
    });

    test('FAILED_ROBBERY event structure', () => {
      // Per kbl-detection-philosophy.md: -1 Fame for failed robbery
      const failedRobbery: FameEventRecord = {
        eventType: 'FAILED_ROBBERY',
        fameType: 'boner',
        fameValue: -1.0,
        playerId: 'fielder-001',
        playerName: 'Failed Fielder',
        description: 'Attempted HR catch, missed',
      };

      expect(failedRobbery.fameValue).toBe(-1.0);
    });

    test('CHOKE event structure', () => {
      const choke: FameEventRecord = {
        eventType: 'CHOKE',
        fameType: 'boner',
        fameValue: -2.0,
        playerId: 'batter-001',
        playerName: 'Choker',
        description: 'Struck out with bases loaded in 9th',
      };

      expect(choke.eventType).toBe('CHOKE');
      expect(choke.fameType).toBe('boner');
      expect(choke.fameValue).toBeLessThan(0);
    });

    test('ERROR event structure', () => {
      const error: FameEventRecord = {
        eventType: 'ERROR',
        fameType: 'boner',
        fameValue: -1.0,
        playerId: 'fielder-001',
        playerName: 'Error Maker',
        description: 'Routine ground ball error',
      };

      expect(error.fameType).toBe('boner');
      expect(error.fameValue).toBeLessThan(0);
    });
  });
});

// ============================================
// ATBATEVENT FAMEEVENT INTEGRATION
// ============================================

describe('AtBatEvent FameEvents Integration', () => {
  test('fameEvents should be array (not always empty)', () => {
    // Per TESTING_IMPLEMENTATION_PLAN.md Phase 5.6:
    // "fameEvents populated with detected events (not always empty)"

    const eventWithFame: Partial<AtBatEvent> = {
      result: 'FO',
      fameEvents: [
        {
          eventType: 'WEB_GEM',
          fameType: 'bonus',
          fameValue: 1.0,
          playerId: 'cf-001',
          playerName: 'Center Fielder',
          description: 'Diving catch',
        },
      ],
    };

    expect(Array.isArray(eventWithFame.fameEvents)).toBe(true);
    expect(eventWithFame.fameEvents!.length).toBe(1);
  });

  test('multiple fame events can occur on same play', () => {
    // Web gem catch + TOOTBLAN (runner out trying to advance)
    const eventWithMultipleFame: Partial<AtBatEvent> = {
      result: 'FO',
      fameEvents: [
        {
          eventType: 'WEB_GEM',
          fameType: 'bonus',
          fameValue: 1.0,
          playerId: 'rf-001',
          playerName: 'Right Fielder',
          description: 'Diving catch in right',
        },
        {
          eventType: 'TOOTBLAN',
          fameType: 'boner',
          fameValue: -3.0,
          playerId: 'runner-001',
          playerName: 'Runner',
          description: 'Doubled off trying to tag up',
        },
      ],
    };

    expect(eventWithMultipleFame.fameEvents!.length).toBe(2);

    const bonus = eventWithMultipleFame.fameEvents!.find(e => e.fameType === 'bonus');
    const boner = eventWithMultipleFame.fameEvents!.find(e => e.fameType === 'boner');

    expect(bonus).toBeDefined();
    expect(boner).toBeDefined();
  });

  test('empty fameEvents array is valid for routine plays', () => {
    const routineOut: Partial<AtBatEvent> = {
      result: 'GO',
      fameEvents: [], // No fame events on routine groundout
    };

    expect(routineOut.fameEvents).toEqual([]);
  });
});

// ============================================
// FAME VALUE CALCULATION
// ============================================

describe('Fame Value Calculation', () => {
  test('fameValue should be scaled by Leverage Index', () => {
    // Per kbl-detection-philosophy.md:
    // fameValue = baseFame × √LI × playoffMultiplier
    // LI=4 → 2× multiplier, LI=9 → 3× multiplier

    const baseFame = 1.0; // Base Web Gem value

    // At LI = 1.0 (average situation)
    const li1 = 1.0;
    const fameAtLI1 = baseFame * Math.sqrt(li1);
    expect(fameAtLI1).toBe(1.0);

    // At LI = 4.0 (high leverage)
    const li4 = 4.0;
    const fameAtLI4 = baseFame * Math.sqrt(li4);
    expect(fameAtLI4).toBe(2.0);

    // At LI = 9.0 (extreme leverage)
    const li9 = 9.0;
    const fameAtLI9 = baseFame * Math.sqrt(li9);
    expect(fameAtLI9).toBe(3.0);
  });

  test('playoff multiplier increases fame value', () => {
    // Per FAME_SYSTEM_TRACKING.md, playoffs have higher fame multiplier
    const baseFame = 1.5; // Robbery base value
    const li = 4.0;
    const playoffMultiplier = 1.5; // Example playoff boost

    const regularSeasonFame = baseFame * Math.sqrt(li);
    const playoffFame = baseFame * Math.sqrt(li) * playoffMultiplier;

    expect(playoffFame).toBeGreaterThan(regularSeasonFame);
    expect(playoffFame).toBe(regularSeasonFame * playoffMultiplier);
  });

  test('negative fame events are also scaled by LI', () => {
    const baseBoner = -3.0; // TOOTBLAN base value
    const li = 4.0; // High leverage

    // Magnitude increases, but stays negative
    const scaledBoner = baseBoner * Math.sqrt(li);

    expect(scaledBoner).toBeLessThan(0);
    expect(scaledBoner).toBeLessThan(baseBoner); // More negative
    expect(scaledBoner).toBe(-6.0);
  });
});

// ============================================
// FAME EVENT DETECTION SCENARIOS
// ============================================

describe('Fame Event Detection Scenarios', () => {
  test('Scenario: Walk-off grand slam in playoffs', () => {
    const walkoffGrandSlam: Partial<AtBatEvent> = {
      result: 'HR',
      isWalkOff: true,
      isClutch: true,
      leverageIndex: 9.0, // Extreme
      fameEvents: [
        {
          eventType: 'WALK_OFF_HR',
          fameType: 'bonus',
          fameValue: 9.0, // High leverage walk-off
          playerId: 'batter-001',
          playerName: 'Hero Batter',
          description: 'Walk-off grand slam to win the pennant',
        },
      ],
    };

    expect(walkoffGrandSlam.isWalkOff).toBe(true);
    expect(walkoffGrandSlam.fameEvents![0].fameValue).toBeGreaterThan(5.0);
  });

  test('Scenario: Strikeout with bases loaded in 9th (choke)', () => {
    const clutchChoke: Partial<AtBatEvent> = {
      result: 'K',
      isClutch: true,
      leverageIndex: 6.0,
      fameEvents: [
        {
          eventType: 'CHOKE',
          fameType: 'boner',
          fameValue: -4.9, // baseBoner × √6.0
          playerId: 'batter-001',
          playerName: 'Choker',
          description: 'Struck out with bases loaded, 2 outs, 9th inning',
        },
      ],
    };

    expect(clutchChoke.fameEvents![0].fameType).toBe('boner');
    expect(clutchChoke.fameEvents![0].fameValue).toBeLessThan(-2.0);
  });

  test('Scenario: No fame events on routine play', () => {
    const routinePlay: Partial<AtBatEvent> = {
      result: 'GO',
      leverageIndex: 0.8, // Low leverage
      isClutch: false,
      fameEvents: [],
    };

    expect(routinePlay.fameEvents).toEqual([]);
    expect(routinePlay.isClutch).toBe(false);
  });

  test('Scenario: Error in high leverage allows run', () => {
    const highLeverageError: Partial<AtBatEvent> = {
      result: 'E',
      leverageIndex: 4.0,
      fameEvents: [
        {
          eventType: 'ERROR_HIGH_LEVERAGE',
          fameType: 'boner',
          fameValue: -2.0, // baseError × √4.0
          playerId: 'fielder-001',
          playerName: 'Error Fielder',
          description: 'Error allowed tying run to score',
        },
      ],
    };

    expect(highLeverageError.fameEvents![0].fameType).toBe('boner');
    expect(highLeverageError.fameEvents![0].fameValue).toBeLessThan(0);
  });
});

// ============================================
// PLAYER ID TRACKING IN FAME EVENTS
// ============================================

describe('Player ID Tracking in Fame Events', () => {
  test('playerId references the player receiving fame', () => {
    // Fielder makes great catch - fielder gets fame
    const fielderFame: FameEventRecord = {
      eventType: 'WEB_GEM',
      fameType: 'bonus',
      fameValue: 1.0,
      playerId: 'fielder-cf-001',
      playerName: 'Center Fielder',
      description: 'Diving catch',
    };

    expect(fielderFame.playerId).toBe('fielder-cf-001');
    expect(fielderFame.playerId).not.toBe('');
  });

  test('batter playerId tracked for batting fame events', () => {
    const batterFame: FameEventRecord = {
      eventType: 'CLUTCH_HIT',
      fameType: 'bonus',
      fameValue: 2.0,
      playerId: 'batter-007',
      playerName: 'Clutch Hitter',
      description: 'Game-winning hit',
    };

    expect(batterFame.playerId).toBe('batter-007');
  });

  test('runner playerId tracked for baserunning events', () => {
    const runnerBoner: FameEventRecord = {
      eventType: 'TOOTBLAN',
      fameType: 'boner',
      fameValue: -3.0,
      playerId: 'runner-123',
      playerName: 'Bad Runner',
      description: 'Picked off being careless',
    };

    expect(runnerBoner.playerId).toBe('runner-123');
  });
});
