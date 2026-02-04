/**
 * Detection Functions Tests
 *
 * Phase 3.1 of Testing Implementation Plan
 *
 * Tests the detectionFunctions.ts engine which detects:
 * - Web gem prompts
 * - Robbery prompts
 * - TOOTBLAN prompts
 * - Blown save detection
 * - Triple play detection
 * - Escape artist detection
 * - Position player pitching events
 * - Fielding error events
 * - Catcher events
 * - Baserunning events
 * - Rally detection
 *
 * Per DETECTION_FUNCTIONS_IMPLEMENTATION.md
 */

import { describe, test, expect } from 'vitest';
import {
  promptWebGem,
  promptRobbery,
  promptTOOTBLAN,
  promptNutShot,
  promptKilledPitcher,
  promptInsideParkHR,
  detectBlownSave,
  isSaveOpportunity,
  detectTriplePlay,
  detectHitIntoTriplePlay,
  detectEscapeArtist,
  detectPositionPlayerPitching,
  detectDroppedFly,
  detectBootedGrounder,
  detectWrongBaseThrow,
  detectPassedBallRun,
  detectThrowOutAtHome,
  detectPickedOff,
  detectWalkedInRun,
  detectClutchGrandSlam,
  detectRallyStarter,
  detectRallyKiller,
  getPromptDetections,
  type DetectionContext,
  type PlayResult,
  type PitcherAppearance,
} from '../../../engines/detectionFunctions';

// ============================================
// TEST DATA HELPERS
// ============================================

function createDetectionContext(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    gameId: 'game-1',
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    score: { away: 3, home: 3 },
    bases: { first: null, second: null, third: null },
    leverageIndex: 1.0,
    isPlayoffs: false,
    ...overrides,
  };
}

function createPlayResult(overrides: Partial<PlayResult> = {}): PlayResult {
  return {
    result: 'GO',
    batterId: 'batter-1',
    batterName: 'Test Batter',
    pitcherId: 'pitcher-1',
    pitcherName: 'Test Pitcher',
    rbi: 0,
    ...overrides,
  };
}

function createPitcherAppearance(overrides: Partial<PitcherAppearance> = {}): PitcherAppearance {
  return {
    pitcherId: 'pitcher-1',
    pitcherName: 'Test Pitcher',
    teamId: 'team-1',
    enteredInSaveOpportunity: false,
    inheritedRunners: 0,
    inheritedRunnersScored: 0,
    runsAllowedOwn: 0,
    outsRecorded: 3,
    leadWhenEntered: 0,
    leadWhenExited: 0,
    isPositionPlayer: false,
    ...overrides,
  };
}

// ============================================
// WEB GEM PROMPT TESTS
// ============================================

describe('Web Gem Prompt', () => {
  test('no prompt for routine catches', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'ROUTINE' },
    });
    const context = createDetectionContext();

    const result = promptWebGem(play, context);
    expect(result).toBeNull();
  });

  test('no prompt when no catch data', () => {
    const play = createPlayResult();
    const context = createDetectionContext();

    const result = promptWebGem(play, context);
    expect(result).toBeNull();
  });

  test('prompts for diving catch', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'DIVING_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptWebGem(play, context);

    expect(result).not.toBeNull();
    expect(result!.shouldPrompt).toBe(true);
    expect(result!.eventType).toBe('WEB_GEM');
    expect(result!.message).toContain('Web Gem');
  });

  test('prompts for wall catch', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'WALL_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptWebGem(play, context);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('WEB_GEM');
    expect(result!.defaultAnswer).toBe(true); // Wall catches default to yes
  });

  test('prompts for leaping catch', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'LEAPING_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptWebGem(play, context);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('WEB_GEM');
  });

  test('includes saved run context when applicable', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'DIVING_CATCH', savedRun: true },
    });
    const context = createDetectionContext();

    const result = promptWebGem(play, context);

    expect(result).not.toBeNull();
    expect(result!.message).toContain('saved a run');
    expect(result!.defaultAnswer).toBe(true); // Saved run = default yes
  });
});

// ============================================
// ROBBERY PROMPT TESTS
// ============================================

describe('Robbery Prompt', () => {
  test('no prompt for non-wall catches', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'DIVING_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptRobbery(play, context, false);
    expect(result).toBeNull();
  });

  test('prompts ROBBERY for wall catch', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'WALL_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptRobbery(play, context, false);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('ROBBERY');
    expect(result!.message).toContain('rob a home run');
    expect(result!.defaultAnswer).toBe(true);
  });

  test('prompts ROBBERY_GRAND_SLAM when bases loaded', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'WALL_CATCH' },
    });
    const context = createDetectionContext();

    const result = promptRobbery(play, context, true);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('ROBBERY_GRAND_SLAM');
    expect(result!.message).toContain('GRAND SLAM');
  });
});

// ============================================
// TOOTBLAN PROMPT TESTS
// ============================================

describe('TOOTBLAN Prompt', () => {
  test('prompts for picked off', () => {
    const play = createPlayResult();
    const context = createDetectionContext();

    const result = promptTOOTBLAN(play, context, 'PICKED_OFF');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TOOTBLAN');
    expect(result!.message).toContain('TOOTBLAN');
    expect(result!.defaultAnswer).toBe(true); // Picked off = default yes
  });

  test('prompts for caught stealing', () => {
    const play = createPlayResult();
    const context = createDetectionContext();

    const result = promptTOOTBLAN(play, context, 'CAUGHT_STEALING');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TOOTBLAN');
    expect(result!.defaultAnswer).toBe(false); // CS = not always TOOTBLAN
  });

  test('prompts RALLY_KILLER when RISP and 2 outs', () => {
    const play = createPlayResult();
    const context = createDetectionContext({
      outs: 2,
      bases: { first: null, second: 'runner-1', third: null },
    });

    const result = promptTOOTBLAN(play, context, 'CAUGHT_STEALING');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TOOTBLAN_RALLY_KILLER');
    expect(result!.message).toContain('rally');
  });

  test('prompts for passed runner (always TOOTBLAN)', () => {
    const play = createPlayResult();
    const context = createDetectionContext();

    const result = promptTOOTBLAN(play, context, 'PASSED_RUNNER');

    expect(result).not.toBeNull();
    expect(result!.defaultAnswer).toBe(true);
  });
});

// ============================================
// NUT SHOT PROMPT TESTS
// ============================================

describe('Nut Shot Prompt', () => {
  test('no prompt for non-GO/E plays', () => {
    const play = createPlayResult({ result: 'HR' });
    const context = createDetectionContext();

    const result = promptNutShot(play, context, 'SS');
    expect(result).toBeNull();
  });

  test('prompts for GO when fielder affected', () => {
    const play = createPlayResult({
      result: 'GO',
      fieldingData: { primaryFielder: 'SS' },
    });
    const context = createDetectionContext();

    const result = promptNutShot(play, context, 'SS');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('NUT_SHOT_VICTIM');
    expect(result!.message).toContain('sensitive area');
    expect(result!.defaultAnswer).toBe(false);
  });

  test('NUT_SHOT_DELIVERED when different fielder', () => {
    const play = createPlayResult({
      result: 'GO',
      fieldingData: { primaryFielder: '2B' },
    });
    const context = createDetectionContext();

    const result = promptNutShot(play, context, 'SS');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('NUT_SHOT_DELIVERED');
  });

  test('prompts for errors too', () => {
    const play = createPlayResult({ result: 'E' });
    const context = createDetectionContext();

    const result = promptNutShot(play, context, 'SS');

    expect(result).not.toBeNull();
  });
});

// ============================================
// KILLED PITCHER PROMPT TESTS
// ============================================

describe('Killed Pitcher Prompt', () => {
  test('no prompt when primary fielder not pitcher', () => {
    const play = createPlayResult({
      result: 'GO',
      fieldingData: { primaryFielder: 'SS' },
    });
    const context = createDetectionContext();

    const result = promptKilledPitcher(play, context);
    expect(result).toBeNull();
  });

  test('prompts when pitcher is primary fielder on comebacker', () => {
    const play = createPlayResult({
      result: 'LO',
      fieldingData: { primaryFielder: 'P' },
    });
    const context = createDetectionContext();

    const result = promptKilledPitcher(play, context);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('KILLED_PITCHER');
    expect(result!.message).toContain('comebacker');
    expect(result!.defaultAnswer).toBe(false);
  });

  test('prompts for errors back to pitcher', () => {
    const play = createPlayResult({
      result: 'E',
      fieldingData: { primaryFielder: 'P' },
    });
    const context = createDetectionContext();

    const result = promptKilledPitcher(play, context);
    expect(result).not.toBeNull();
  });

  test('no prompt for HR', () => {
    const play = createPlayResult({
      result: 'HR',
      fieldingData: { primaryFielder: 'P' },
    });
    const context = createDetectionContext();

    const result = promptKilledPitcher(play, context);
    expect(result).toBeNull();
  });
});

// ============================================
// INSIDE PARK HR PROMPT TESTS
// ============================================

describe('Inside Park HR Prompt', () => {
  test('no prompt for non-HR', () => {
    const play = createPlayResult({ result: '3B' });

    const result = promptInsideParkHR(play);
    expect(result).toBeNull();
  });

  test('prompts for HR', () => {
    const play = createPlayResult({ result: 'HR' });

    const result = promptInsideParkHR(play);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('INSIDE_PARK_HR');
    expect(result!.defaultAnswer).toBe(false); // Rare, default no
  });
});

// ============================================
// BLOWN SAVE DETECTION TESTS
// ============================================

describe('Blown Save Detection', () => {
  test('no detection when not save opportunity', () => {
    const appearance = createPitcherAppearance({
      enteredInSaveOpportunity: false,
    });

    const result = detectBlownSave(appearance, true, false);
    expect(result).toBeNull();
  });

  test('no detection when lead maintained', () => {
    const appearance = createPitcherAppearance({
      enteredInSaveOpportunity: true,
      leadWhenEntered: 2,
      leadWhenExited: 1,
    });

    const result = detectBlownSave(appearance, true, true);
    expect(result).toBeNull();
  });

  test('detects blown save when lead lost', () => {
    const appearance = createPitcherAppearance({
      enteredInSaveOpportunity: true,
      leadWhenEntered: 2,
      leadWhenExited: 0,
      pitcherName: 'Bob Smith',
    });

    const result = detectBlownSave(appearance, false, false);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('BLOWN_SAVE');
    expect(result!.message).toContain('Bob Smith');
    expect(result!.message).toContain('blew the save');
  });

  test('detects blown save + loss', () => {
    const appearance = createPitcherAppearance({
      enteredInSaveOpportunity: true,
      leadWhenEntered: 2,
      leadWhenExited: -1,
      pitcherName: 'Bob Smith',
    });

    const result = detectBlownSave(appearance, true, false);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('BLOWN_SAVE_LOSS');
    expect(result!.message).toContain('loss');
  });
});

// ============================================
// SAVE OPPORTUNITY TESTS
// ============================================

describe('Save Opportunity Detection', () => {
  test('no save opportunity when not leading', () => {
    expect(isSaveOpportunity(0, { first: null, second: null, third: null }, 9)).toBe(false);
    expect(isSaveOpportunity(-1, { first: null, second: null, third: null }, 9)).toBe(false);
  });

  test('no save opportunity too early in game', () => {
    expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 5)).toBe(false);
    expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 6)).toBe(false);
  });

  test('save opportunity with 3-run lead or less', () => {
    expect(isSaveOpportunity(1, { first: null, second: null, third: null }, 9)).toBe(true);
    expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 9)).toBe(true);
    expect(isSaveOpportunity(3, { first: null, second: null, third: null }, 9)).toBe(true);
  });

  test('no save opportunity with 4+ run lead and bases empty', () => {
    expect(isSaveOpportunity(4, { first: null, second: null, third: null }, 9)).toBe(false);
  });

  test('save opportunity with larger lead if tying run on base', () => {
    // Lead of 4, bases loaded: tying run is at bat (next batter)
    expect(isSaveOpportunity(4, { first: 'r1', second: 'r2', third: 'r3' }, 9)).toBe(true);

    // Lead of 4, 2 runners: tying run is on deck
    expect(isSaveOpportunity(4, { first: 'r1', second: 'r2', third: null }, 9)).toBe(false);
  });

  test('works for shorter games (7-inning)', () => {
    expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 7, 7)).toBe(true);
    expect(isSaveOpportunity(2, { first: null, second: null, third: null }, 4, 7)).toBe(false);
  });
});

// ============================================
// TRIPLE PLAY DETECTION TESTS
// ============================================

describe('Triple Play Detection', () => {
  test('no detection for fewer than 3 outs', () => {
    expect(detectTriplePlay(2, ['SS', '2B'], ['1B', '2B'])).toBeNull();
    expect(detectTriplePlay(1, ['SS'], ['1B'])).toBeNull();
  });

  test('detects regular triple play', () => {
    const result = detectTriplePlay(3, ['SS', '2B'], ['2B', '1B', 'C']);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('TRIPLE_PLAY');
    expect(result!.message).toContain('TRIPLE PLAY');
  });

  test('detects unassisted triple play', () => {
    const result = detectTriplePlay(3, [], ['2B']);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('UNASSISTED_TRIPLE_PLAY');
    expect(result!.message).toContain('UNASSISTED');
    expect(result!.message).toContain('rarest plays');
  });
});

describe('Hit Into Triple Play Detection', () => {
  test('no detection for fewer than 3 outs', () => {
    expect(detectHitIntoTriplePlay(2, 'batter-1', 'John Doe')).toBeNull();
  });

  test('detects hit into triple play', () => {
    const result = detectHitIntoTriplePlay(3, 'batter-1', 'John Doe');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('HIT_INTO_TRIPLE_PLAY');
    expect(result!.message).toContain('John Doe');
    expect(result!.playerId).toBe('batter-1');
  });
});

// ============================================
// ESCAPE ARTIST DETECTION TESTS
// ============================================

describe('Escape Artist Detection', () => {
  test('no detection when bases not loaded with 0 outs', () => {
    const result = detectEscapeArtist('pitcher-1', 'Bob', false, 0, 3);
    expect(result).toBeNull();
  });

  test('no detection when runs allowed', () => {
    const result = detectEscapeArtist('pitcher-1', 'Bob', true, 2, 3);
    expect(result).toBeNull();
  });

  test('no detection when inning not complete', () => {
    const result = detectEscapeArtist('pitcher-1', 'Bob', true, 0, 2);
    expect(result).toBeNull();
  });

  test('detects escape artist', () => {
    const result = detectEscapeArtist('pitcher-1', 'Bob Smith', true, 0, 3);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('ESCAPE_ARTIST');
    expect(result!.message).toContain('Bob Smith');
    expect(result!.message).toContain('loaded the bases');
    expect(result!.message).toContain('escaped');
  });
});

// ============================================
// POSITION PLAYER PITCHING TESTS
// ============================================

describe('Position Player Pitching Detection', () => {
  test('no events for regular pitcher', () => {
    const appearance = createPitcherAppearance({ isPositionPlayer: false });

    const results = detectPositionPlayerPitching(appearance, 2, 2);
    expect(results).toHaveLength(0);
  });

  test('detects clean inning', () => {
    const appearance = createPitcherAppearance({
      isPositionPlayer: true,
      runsAllowedOwn: 0,
      pitcherName: 'Joe Fielder',
    });

    const results = detectPositionPlayerPitching(appearance, 0, 1);

    expect(results.some(r => r.eventType === 'PP_CLEAN_INNING')).toBe(true);
    expect(results.find(r => r.eventType === 'PP_CLEAN_INNING')!.message).toContain('Joe Fielder');
  });

  test('detects multiple clean innings', () => {
    const appearance = createPitcherAppearance({
      isPositionPlayer: true,
      runsAllowedOwn: 0,
    });

    const results = detectPositionPlayerPitching(appearance, 0, 2);

    expect(results.some(r => r.eventType === 'PP_MULTIPLE_CLEAN')).toBe(true);
  });

  test('detects strikeout', () => {
    const appearance = createPitcherAppearance({
      isPositionPlayer: true,
    });

    const results = detectPositionPlayerPitching(appearance, 1, 1);

    expect(results.some(r => r.eventType === 'PP_GOT_K')).toBe(true);
  });

  test('detects gave up runs', () => {
    const appearance = createPitcherAppearance({
      isPositionPlayer: true,
      runsAllowedOwn: 5,
    });

    const results = detectPositionPlayerPitching(appearance, 0, 1);

    expect(results.some(r => r.eventType === 'PP_GAVE_UP_RUNS')).toBe(true);
  });

  test('can have multiple events', () => {
    const appearance = createPitcherAppearance({
      isPositionPlayer: true,
      runsAllowedOwn: 0,
    });

    const results = detectPositionPlayerPitching(appearance, 2, 2);

    // Clean innings + strikeouts
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================
// FIELDING ERROR DETECTION TESTS
// ============================================

describe('Dropped Fly Detection', () => {
  test('no detection for non-missed_catch errors', () => {
    const context = createDetectionContext();
    expect(detectDroppedFly('fielding', 'FO', context, 'f1', 'Joe')).toBeNull();
    expect(detectDroppedFly('throwing', 'FO', context, 'f1', 'Joe')).toBeNull();
  });

  test('no detection for non-fly plays', () => {
    const context = createDetectionContext();
    expect(detectDroppedFly('missed_catch', 'GO', context, 'f1', 'Joe')).toBeNull();
  });

  test('detects dropped fly', () => {
    const context = createDetectionContext();
    const result = detectDroppedFly('missed_catch', 'FO', context, 'fielder-1', 'Joe Smith');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('DROPPED_FLY');
    expect(result!.message).toContain('Joe Smith');
    expect(result!.playerId).toBe('fielder-1');
  });

  test('detects clutch dropped fly', () => {
    const context = createDetectionContext({ leverageIndex: 3.0 });
    const result = detectDroppedFly('missed_catch', 'FO', context, 'fielder-1', 'Joe Smith');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('DROPPED_FLY_CLUTCH');
    expect(result!.message).toContain('CLUTCH');
  });
});

describe('Booted Grounder Detection', () => {
  test('no detection for non-fielding errors', () => {
    expect(detectBootedGrounder('throwing', 'GO', 'f1', 'Joe')).toBeNull();
    expect(detectBootedGrounder('missed_catch', 'GO', 'f1', 'Joe')).toBeNull();
  });

  test('no detection for non-GO plays', () => {
    expect(detectBootedGrounder('fielding', 'FO', 'f1', 'Joe')).toBeNull();
  });

  test('detects booted grounder', () => {
    const result = detectBootedGrounder('fielding', 'GO', 'fielder-1', 'Joe Smith');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('BOOTED_GROUNDER');
    expect(result!.message).toContain('Joe Smith');
    expect(result!.playerId).toBe('fielder-1');
  });
});

describe('Wrong Base Throw Detection', () => {
  test('no detection for non-throwing errors', () => {
    expect(detectWrongBaseThrow('fielding', true, 'f1', 'Joe')).toBeNull();
  });

  test('no detection when not wrong target', () => {
    expect(detectWrongBaseThrow('throwing', false, 'f1', 'Joe')).toBeNull();
  });

  test('detects wrong base throw', () => {
    const result = detectWrongBaseThrow('throwing', true, 'fielder-1', 'Joe Smith');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('WRONG_BASE_THROW');
    expect(result!.message).toContain('wrong base');
    expect(result!.playerId).toBe('fielder-1');
  });
});

// ============================================
// CATCHER EVENT TESTS
// ============================================

describe('Passed Ball Run Detection', () => {
  test('no detection when no run scored', () => {
    expect(detectPassedBallRun(false, false, 'c1', 'Joe')).toBeNull();
  });

  test('detects passed ball run', () => {
    const result = detectPassedBallRun(true, false, 'catcher-1', 'Joe Catcher');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('PASSED_BALL_RUN');
    expect(result!.message).toContain('Joe Catcher');
    expect(result!.playerId).toBe('catcher-1');
  });

  test('detects passed ball winning run', () => {
    const result = detectPassedBallRun(true, true, 'catcher-1', 'Joe Catcher');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('PASSED_BALL_WINNING_RUN');
    expect(result!.message).toContain('WINNING RUN');
  });
});

describe('Throw Out At Home Detection', () => {
  test('no detection when not out at home', () => {
    expect(detectThrowOutAtHome('CF', false, 'f1', 'Joe')).toBeNull();
  });

  test('no detection for non-outfielders', () => {
    expect(detectThrowOutAtHome('SS', true, 'f1', 'Joe')).toBeNull();
    expect(detectThrowOutAtHome('2B', true, 'f1', 'Joe')).toBeNull();
  });

  test('detects throw out from LF', () => {
    const result = detectThrowOutAtHome('LF', true, 'fielder-1', 'Joe Outfielder');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('THROW_OUT_AT_HOME');
    expect(result!.message).toContain('guns down');
    expect(result!.playerId).toBe('fielder-1');
  });

  test('detects throw out from CF', () => {
    const result = detectThrowOutAtHome('CF', true, 'fielder-1', 'Joe');
    expect(result).not.toBeNull();
  });

  test('detects throw out from RF', () => {
    const result = detectThrowOutAtHome('RF', true, 'fielder-1', 'Joe');
    expect(result).not.toBeNull();
  });
});

// ============================================
// BASERUNNING EVENT TESTS
// ============================================

describe('Picked Off Detection', () => {
  test('detects picked off to end game', () => {
    const context = createDetectionContext();
    const result = detectPickedOff(context, 'runner-1', 'Bob Runner', 3, true);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('PICKED_OFF_END_GAME');
    expect(result!.message).toContain('END THE GAME');
    expect(result!.playerId).toBe('runner-1');
  });

  test('detects picked off to end inning', () => {
    const context = createDetectionContext();
    const result = detectPickedOff(context, 'runner-1', 'Bob Runner', 3, false);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('PICKED_OFF_END_INNING');
    expect(result!.message).toContain('end the inning');
  });

  test('no detection for mid-inning pickoff', () => {
    const context = createDetectionContext();
    const result = detectPickedOff(context, 'runner-1', 'Bob', 2, false);

    expect(result).toBeNull();
  });
});

// ============================================
// WALKED IN RUN DETECTION TESTS
// ============================================

describe('Walked In Run Detection', () => {
  test('no detection for non-walk results', () => {
    expect(detectWalkedInRun('1B', true, 'p1', 'Joe')).toBeNull();
    expect(detectWalkedInRun('HR', true, 'p1', 'Joe')).toBeNull();
  });

  test('no detection when bases not loaded', () => {
    expect(detectWalkedInRun('BB', false, 'p1', 'Joe')).toBeNull();
  });

  test('detects walk with bases loaded', () => {
    const result = detectWalkedInRun('BB', true, 'pitcher-1', 'Bad Pitcher');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('WALKED_IN_RUN');
    expect(result!.message).toContain('Bad Pitcher');
    expect(result!.playerId).toBe('pitcher-1');
  });

  test('detects IBB with bases loaded', () => {
    const result = detectWalkedInRun('IBB', true, 'pitcher-1', 'Bad Pitcher');
    expect(result).not.toBeNull();
  });

  test('detects HBP with bases loaded', () => {
    const result = detectWalkedInRun('HBP', true, 'pitcher-1', 'Bad Pitcher');
    expect(result).not.toBeNull();
  });
});

// ============================================
// CLUTCH GRAND SLAM DETECTION TESTS
// ============================================

describe('Clutch Grand Slam Detection', () => {
  test('no detection for non-HR', () => {
    const result = detectClutchGrandSlam('3B', true, 4, { batting: 0, fielding: 3 }, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('no detection when bases not loaded', () => {
    const result = detectClutchGrandSlam('HR', false, 4, { batting: 0, fielding: 3 }, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('no detection for non-clutch grand slam (already leading)', () => {
    // Team up 5-0, bases loaded HR is not "clutch"
    const result = detectClutchGrandSlam('HR', true, 4, { batting: 5, fielding: 0 }, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('detects clutch grand slam to take lead', () => {
    // Down 3-0, grand slam to go up 4-3
    const result = detectClutchGrandSlam('HR', true, 4, { batting: 0, fielding: 3 }, 'batter-1', 'Hero Hitter');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('CLUTCH_GRAND_SLAM');
    expect(result!.message).toContain('Hero Hitter');
    expect(result!.message).toContain('TAKE THE LEAD');
    expect(result!.playerId).toBe('batter-1');
  });

  test('detects clutch grand slam to tie', () => {
    // Down 4-0, grand slam to tie 4-4
    const result = detectClutchGrandSlam('HR', true, 4, { batting: 0, fielding: 4 }, 'batter-1', 'Hero');

    expect(result).not.toBeNull();
    expect(result!.message).toContain('TIE');
  });
});

// ============================================
// RALLY DETECTION TESTS
// ============================================

describe('Rally Starter Detection', () => {
  test('no detection when not first batter of rally', () => {
    const result = detectRallyStarter(false, 5, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('no detection when rally under 3 runs', () => {
    const result = detectRallyStarter(true, 2, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('detects rally starter', () => {
    const result = detectRallyStarter(true, 5, 'batter-1', 'Rally Starter');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('RALLY_STARTER');
    expect(result!.message).toContain('Rally Starter');
    expect(result!.message).toContain('5-run rally');
    expect(result!.playerId).toBe('batter-1');
  });
});

describe('Rally Killer Detection', () => {
  test('no detection when no rally active', () => {
    const result = detectRallyKiller(false, 2, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('no detection when few runners stranded', () => {
    const result = detectRallyKiller(true, 1, 'b1', 'Joe');
    expect(result).toBeNull();
  });

  test('detects rally killer', () => {
    const result = detectRallyKiller(true, 3, 'batter-1', 'Rally Killer');

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('RALLY_KILLER');
    expect(result!.message).toContain('Rally Killer');
    expect(result!.message).toContain('3 runners stranded');
    expect(result!.playerId).toBe('batter-1');
  });
});

// ============================================
// GET PROMPT DETECTIONS AGGREGATOR TESTS
// ============================================

describe('Get Prompt Detections', () => {
  test('returns empty array for routine play', () => {
    const play = createPlayResult({ result: 'GO' });
    const context = createDetectionContext();

    const prompts = getPromptDetections(play, context, {});
    expect(prompts).toHaveLength(0);
  });

  test('returns web gem prompt for diving catch', () => {
    const play = createPlayResult({
      fieldingData: { catchType: 'DIVING_CATCH' },
    });
    const context = createDetectionContext();

    const prompts = getPromptDetections(play, context, {});

    expect(prompts.some(p => p.eventType === 'WEB_GEM')).toBe(true);
  });

  test('returns multiple prompts when applicable', () => {
    const play = createPlayResult({
      result: 'HR',
      fieldingData: { catchType: 'WALL_CATCH' },
    });
    const context = createDetectionContext();

    const prompts = getPromptDetections(play, context, { wasBasesLoaded: true });

    // Should have both robbery and inside park HR prompts
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    expect(prompts.some(p => p.eventType === 'ROBBERY_GRAND_SLAM')).toBe(true);
    expect(prompts.some(p => p.eventType === 'INSIDE_PARK_HR')).toBe(true);
  });

  test('includes TOOTBLAN prompt when runner out', () => {
    const play = createPlayResult();
    const context = createDetectionContext();

    const prompts = getPromptDetections(play, context, {
      runnerOut: true,
      outType: 'PICKED_OFF',
    });

    expect(prompts.some(p => p.eventType === 'TOOTBLAN')).toBe(true);
  });

  test('includes nut shot prompt when fielder affected', () => {
    const play = createPlayResult({ result: 'GO' });
    const context = createDetectionContext();

    const prompts = getPromptDetections(play, context, {
      affectedFielder: 'SS',
    });

    expect(prompts.some(p => p.eventType === 'NUT_SHOT_DELIVERED')).toBe(true);
  });
});
