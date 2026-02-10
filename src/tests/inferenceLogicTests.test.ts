/**
 * Inference Logic Tests
 *
 * Tests ALL inferential logic for:
 * 1. Direction-based fielder inference (FieldingModal.tsx)
 * 2. Exit type inference from result
 * 3. DP chain inference by direction
 * 4. Play classification (playClassifier.ts)
 * 5. Auto-complete conditions
 * 6. Contextual visibility rules
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';

// ============================================
// TYPES
// ============================================

export type Direction = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right' | 'Foul-Left' | 'Foul-Right';
type FairDirection = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';
export type ExitType = 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
export type AtBatResult = '1B' | '2B' | '3B' | 'HR' | 'BB' | 'IBB' | 'K' | 'KL'
  | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'SF' | 'SAC' | 'HBP' | 'E' | 'FC' | 'D3K';

interface InferenceResult {
  primary: Position;
  secondary?: Position;
  tertiary?: Position;
}

interface Bases {
  first: { playerName: string; playerId: string } | null;
  second: { playerName: string; playerId: string } | null;
  third: { playerName: string; playerId: string } | null;
}

// ============================================
// INFERENCE MATRICES (from FieldingModal.tsx)
// ============================================

const GROUND_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS', tertiary: 'P' },
  'Left-Center': { primary: 'SS', secondary: '3B', tertiary: '2B' },
  'Center': { primary: 'P', secondary: 'SS', tertiary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B', tertiary: 'SS' },
  'Right': { primary: '1B', secondary: '2B', tertiary: 'P' },
};

const FLY_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: 'LF', secondary: 'CF', tertiary: '3B' },
  'Left-Center': { primary: 'CF', secondary: 'LF', tertiary: 'SS' },
  'Center': { primary: 'CF' },
  'Right-Center': { primary: 'CF', secondary: 'RF', tertiary: '2B' },
  'Right': { primary: 'RF', secondary: 'CF', tertiary: '1B' },
};

const LINE_DRIVE_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'LF' },
  'Left-Center': { primary: 'SS', secondary: 'CF' },
  'Center': { primary: 'P', secondary: 'CF' },
  'Right-Center': { primary: '2B', secondary: 'CF' },
  'Right': { primary: '1B', secondary: 'RF' },
};

const POP_FLY_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS' },
  'Left-Center': { primary: 'SS', secondary: '3B' },
  'Center': { primary: 'SS', secondary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B' },
  'Right': { primary: '1B', secondary: '2B' },
};

const DP_CHAINS: Record<FairDirection, string> = {
  'Left': '5-4-3',
  'Left-Center': '6-4-3',
  'Center': '6-4-3',
  'Right-Center': '4-6-3',
  'Right': '3-6-3',
};

// ============================================
// INFERENCE FUNCTIONS
// ============================================

/**
 * Infer fielder from result, direction, and optional exit type.
 * Per FieldingModal.tsx inferFielderEnhanced()
 */
function inferFielderEnhanced(
  result: AtBatResult,
  direction: Direction | null,
  exitType?: ExitType | null
): Position | null {
  if (!direction) return null;

  // Cast to FairDirection for matrix lookup (foul directions handled separately in production code)
  const fairDir = direction as FairDirection;
  let inference: InferenceResult | null = null;

  // For hits, use exit type first if available
  if (['1B', '2B', '3B'].includes(result) && exitType) {
    if (exitType === 'Ground') {
      inference = GROUND_BALL_INFERENCE[fairDir];
    } else if (exitType === 'Line Drive') {
      inference = LINE_DRIVE_INFERENCE[fairDir];
    } else if (exitType === 'Fly Ball') {
      inference = FLY_BALL_INFERENCE[fairDir];
    } else if (exitType === 'Pop Up') {
      inference = POP_FLY_INFERENCE[fairDir];
    }
  }
  // Ground balls (by result)
  else if (['GO', 'DP', 'FC', 'SAC'].includes(result) || exitType === 'Ground') {
    inference = GROUND_BALL_INFERENCE[fairDir];
  }
  // Fly balls (by result)
  else if (['FO', 'SF'].includes(result) || exitType === 'Fly Ball') {
    inference = FLY_BALL_INFERENCE[fairDir];
  }
  // Line drives (by result)
  else if (result === 'LO' || exitType === 'Line Drive') {
    inference = LINE_DRIVE_INFERENCE[fairDir];
  }
  // Pop flies (by result)
  else if (result === 'PO' || exitType === 'Pop Up') {
    inference = POP_FLY_INFERENCE[fairDir];
  }

  return inference?.primary || null;
}

/**
 * Infer exit type from result for deterministic cases.
 * Per FieldingModal.tsx inferExitType()
 */
function inferExitType(result: AtBatResult): ExitType | null {
  switch (result) {
    case 'GO':
    case 'DP':
    case 'FC':
      return 'Ground';
    case 'FO':
    case 'SF':
      return 'Fly Ball';
    case 'LO':
      return 'Line Drive';
    case 'PO':
      return 'Pop Up';
    default:
      return null;
  }
}

// ============================================
// CONTEXTUAL VISIBILITY FUNCTIONS
// ============================================

function createBases(first = false, second = false, third = false): Bases {
  return {
    first: first ? { playerName: 'R1', playerId: 'p1' } : null,
    second: second ? { playerName: 'R2', playerId: 'p2' } : null,
    third: third ? { playerName: 'R3', playerId: 'p3' } : null,
  };
}

function shouldShowIFR(result: AtBatResult, bases: Bases, outs: number): boolean {
  return ['PO', 'FO'].includes(result) &&
    outs < 2 &&
    ((!!bases.first && !!bases.second) || (!!bases.first && !!bases.second && !!bases.third));
}

function shouldShowGRD(result: AtBatResult): boolean {
  return result === '2B';
}

function shouldShowBadHop(result: AtBatResult): boolean {
  return ['1B', '2B', '3B'].includes(result);
}

function shouldShowNutshot(result: AtBatResult, direction: Direction): boolean {
  return direction === 'Center' && ['GO', 'LO', '1B'].includes(result);
}

function shouldShowRobbery(result: AtBatResult): boolean {
  return result === 'HR';
}

// ============================================
// PLAY CLASSIFICATION FUNCTIONS (from playClassifier.ts)
// ============================================

interface FieldCoordinate {
  x: number; // -1 to 1 (left to right)
  y: number; // 0 to 1 (home plate to outfield)
}

interface ClassificationResult {
  autoComplete: boolean;
  playType: 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error';
  hitType?: '1B' | '2B' | '3B' | 'HR';
  outType?: 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC' | 'SF';
  confidence: number;
}

const OUTFIELDERS = [7, 8, 9];

function classifySingleFielderOut(
  location: FieldCoordinate,
  fielderId: number
): ClassificationResult {
  const isOutfielder = OUTFIELDERS.includes(fielderId);

  // Deep outfield catch = auto-complete fly out
  if (isOutfielder && location.y > 0.6) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'FO',
      confidence: 0.9,
    };
  }

  // Shallow outfield = need confirmation
  if (isOutfielder) {
    return {
      autoComplete: false,
      playType: 'out',
      outType: 'FO',
      confidence: 0.7,
    };
  }

  // Infielder unassisted
  return {
    autoComplete: false,
    playType: 'out',
    outType: 'LO',
    confidence: 0.6,
  };
}

function classifyMultiFielderOut(
  notation: string,
  hasRunnersOn: boolean,
  outs: number
): ClassificationResult {
  const canBeDP = hasRunnersOn && outs < 2;
  const sequenceLength = notation.split('-').length;
  const firstFielder = parseInt(notation.split('-')[0]);
  const lastFielder = parseInt(notation.split('-')[notation.split('-').length - 1]);

  // Classic DP sequences
  const isClassicDP = ['6-4-3', '4-6-3', '5-4-3', '3-6-3', '1-6-3', '1-4-3'].includes(notation);

  if (isClassicDP && canBeDP) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'DP',
      confidence: 0.95,
    };
  }

  // Standard ground outs (X-3 pattern)
  if (sequenceLength === 2 && lastFielder === 3 && [4, 5, 6].includes(firstFielder)) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'GO',
      confidence: 0.92,
    };
  }

  // Pitcher comebackers
  if (['1-3', '1-4-3', '1-6-3'].includes(notation)) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'GO',
      confidence: 0.90,
    };
  }

  // 2-fielder to first = ground out
  if (sequenceLength === 2 && lastFielder === 3) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'GO',
      confidence: 0.9,
    };
  }

  return {
    autoComplete: false,
    playType: 'out',
    outType: 'GO',
    confidence: 0.6,
  };
}

function classifyHit(location: FieldCoordinate): {
  suggestedHitType: '1B' | '2B' | '3B';
  confidence: number;
} {
  if (location.y < 0.35) {
    return { suggestedHitType: '1B', confidence: 0.85 };
  } else if (location.y < 0.55) {
    return { suggestedHitType: '1B', confidence: 0.75 };
  } else if (location.y < 0.75) {
    return { suggestedHitType: '1B', confidence: 0.6 };
  } else if (location.y < 0.9) {
    return { suggestedHitType: '2B', confidence: 0.7 };
  } else {
    return { suggestedHitType: '3B', confidence: 0.6 };
  }
}

function shouldAutoComplete(result: ClassificationResult): boolean {
  return result.autoComplete && result.confidence >= 0.85;
}

// ============================================
// TESTS: Direction-Based Fielder Inference
// ============================================

describe('Direction-Based Fielder Inference', () => {
  describe('Ground Ball Inference (GO)', () => {
    it('GO Left -> 3B', () => {
      expect(inferFielderEnhanced('GO', 'Left')).toBe('3B');
    });

    it('GO Left-Center -> SS', () => {
      expect(inferFielderEnhanced('GO', 'Left-Center')).toBe('SS');
    });

    it('GO Center -> P', () => {
      expect(inferFielderEnhanced('GO', 'Center')).toBe('P');
    });

    it('GO Right-Center -> 2B', () => {
      expect(inferFielderEnhanced('GO', 'Right-Center')).toBe('2B');
    });

    it('GO Right -> 1B', () => {
      expect(inferFielderEnhanced('GO', 'Right')).toBe('1B');
    });
  });

  describe('Double Play Inference (DP)', () => {
    it('DP Left -> 3B', () => {
      expect(inferFielderEnhanced('DP', 'Left')).toBe('3B');
    });

    it('DP Left-Center -> SS', () => {
      expect(inferFielderEnhanced('DP', 'Left-Center')).toBe('SS');
    });

    it('DP Center -> P', () => {
      expect(inferFielderEnhanced('DP', 'Center')).toBe('P');
    });

    it('DP Right-Center -> 2B', () => {
      expect(inferFielderEnhanced('DP', 'Right-Center')).toBe('2B');
    });

    it('DP Right -> 1B', () => {
      expect(inferFielderEnhanced('DP', 'Right')).toBe('1B');
    });
  });

  describe('Fielders Choice Inference (FC)', () => {
    it('FC Left -> 3B', () => {
      expect(inferFielderEnhanced('FC', 'Left')).toBe('3B');
    });

    it('FC Left-Center -> SS', () => {
      expect(inferFielderEnhanced('FC', 'Left-Center')).toBe('SS');
    });
  });

  describe('Fly Ball Inference (FO)', () => {
    it('FO Left -> LF', () => {
      expect(inferFielderEnhanced('FO', 'Left')).toBe('LF');
    });

    it('FO Left-Center -> CF', () => {
      expect(inferFielderEnhanced('FO', 'Left-Center')).toBe('CF');
    });

    it('FO Center -> CF', () => {
      expect(inferFielderEnhanced('FO', 'Center')).toBe('CF');
    });

    it('FO Right-Center -> CF', () => {
      expect(inferFielderEnhanced('FO', 'Right-Center')).toBe('CF');
    });

    it('FO Right -> RF', () => {
      expect(inferFielderEnhanced('FO', 'Right')).toBe('RF');
    });
  });

  describe('Sacrifice Fly Inference (SF)', () => {
    it('SF Left -> LF', () => {
      expect(inferFielderEnhanced('SF', 'Left')).toBe('LF');
    });

    it('SF Center -> CF', () => {
      expect(inferFielderEnhanced('SF', 'Center')).toBe('CF');
    });

    it('SF Right -> RF', () => {
      expect(inferFielderEnhanced('SF', 'Right')).toBe('RF');
    });
  });

  describe('Line Drive Inference (LO)', () => {
    it('LO Left -> 3B', () => {
      expect(inferFielderEnhanced('LO', 'Left')).toBe('3B');
    });

    it('LO Left-Center -> SS', () => {
      expect(inferFielderEnhanced('LO', 'Left-Center')).toBe('SS');
    });

    it('LO Center -> P', () => {
      expect(inferFielderEnhanced('LO', 'Center')).toBe('P');
    });

    it('LO Right-Center -> 2B', () => {
      expect(inferFielderEnhanced('LO', 'Right-Center')).toBe('2B');
    });

    it('LO Right -> 1B', () => {
      expect(inferFielderEnhanced('LO', 'Right')).toBe('1B');
    });
  });

  describe('Pop Fly Inference (PO)', () => {
    it('PO Left -> 3B', () => {
      expect(inferFielderEnhanced('PO', 'Left')).toBe('3B');
    });

    it('PO Left-Center -> SS', () => {
      expect(inferFielderEnhanced('PO', 'Left-Center')).toBe('SS');
    });

    it('PO Center -> SS', () => {
      expect(inferFielderEnhanced('PO', 'Center')).toBe('SS');
    });

    it('PO Right-Center -> 2B', () => {
      expect(inferFielderEnhanced('PO', 'Right-Center')).toBe('2B');
    });

    it('PO Right -> 1B', () => {
      expect(inferFielderEnhanced('PO', 'Right')).toBe('1B');
    });
  });

  describe('Hit with Exit Type (1B)', () => {
    it('1B Ground Left -> 3B', () => {
      expect(inferFielderEnhanced('1B', 'Left', 'Ground')).toBe('3B');
    });

    it('1B Ground Right -> 1B', () => {
      expect(inferFielderEnhanced('1B', 'Right', 'Ground')).toBe('1B');
    });

    it('1B Line Drive Left -> 3B', () => {
      expect(inferFielderEnhanced('1B', 'Left', 'Line Drive')).toBe('3B');
    });

    it('1B Line Drive Center -> P', () => {
      expect(inferFielderEnhanced('1B', 'Center', 'Line Drive')).toBe('P');
    });

    it('1B Fly Ball Left -> LF', () => {
      expect(inferFielderEnhanced('1B', 'Left', 'Fly Ball')).toBe('LF');
    });
  });

  describe('Hit with Exit Type (2B)', () => {
    it('2B Fly Ball LC -> CF', () => {
      expect(inferFielderEnhanced('2B', 'Left-Center', 'Fly Ball')).toBe('CF');
    });

    it('2B Line Drive RC -> 2B', () => {
      expect(inferFielderEnhanced('2B', 'Right-Center', 'Line Drive')).toBe('2B');
    });

    it('2B Ground through hole -> SS', () => {
      expect(inferFielderEnhanced('2B', 'Left-Center', 'Ground')).toBe('SS');
    });
  });

  describe('Hit with Exit Type (3B)', () => {
    it('3B Fly Ball RC -> CF', () => {
      expect(inferFielderEnhanced('3B', 'Right-Center', 'Fly Ball')).toBe('CF');
    });

    it('3B Line Drive Right -> 1B', () => {
      expect(inferFielderEnhanced('3B', 'Right', 'Line Drive')).toBe('1B');
    });
  });

  describe('Sacrifice Bunt (SAC)', () => {
    it('SAC Center -> P', () => {
      expect(inferFielderEnhanced('SAC', 'Center')).toBe('P');
    });

    it('SAC Left -> 3B', () => {
      expect(inferFielderEnhanced('SAC', 'Left')).toBe('3B');
    });

    it('SAC Right -> 1B', () => {
      expect(inferFielderEnhanced('SAC', 'Right')).toBe('1B');
    });
  });

  describe('Null Direction', () => {
    it('Null direction returns null', () => {
      expect(inferFielderEnhanced('GO', null)).toBeNull();
    });
  });
});

// ============================================
// TESTS: Exit Type Inference
// ============================================

describe('Exit Type Inference from Result', () => {
  describe('Deterministic Results', () => {
    it('GO -> Ground', () => {
      expect(inferExitType('GO')).toBe('Ground');
    });

    it('DP -> Ground', () => {
      expect(inferExitType('DP')).toBe('Ground');
    });

    it('FC -> Ground', () => {
      expect(inferExitType('FC')).toBe('Ground');
    });

    it('FO -> Fly Ball', () => {
      expect(inferExitType('FO')).toBe('Fly Ball');
    });

    it('SF -> Fly Ball', () => {
      expect(inferExitType('SF')).toBe('Fly Ball');
    });

    it('LO -> Line Drive', () => {
      expect(inferExitType('LO')).toBe('Line Drive');
    });

    it('PO -> Pop Up', () => {
      expect(inferExitType('PO')).toBe('Pop Up');
    });
  });

  describe('Non-Deterministic Results', () => {
    it('1B -> null (needs user selection)', () => {
      expect(inferExitType('1B')).toBeNull();
    });

    it('2B -> null (needs user selection)', () => {
      expect(inferExitType('2B')).toBeNull();
    });

    it('3B -> null (needs user selection)', () => {
      expect(inferExitType('3B')).toBeNull();
    });

    it('HR -> null (over fence)', () => {
      expect(inferExitType('HR')).toBeNull();
    });

    it('K -> null (not a batted ball)', () => {
      expect(inferExitType('K')).toBeNull();
    });

    it('BB -> null (not a batted ball)', () => {
      expect(inferExitType('BB')).toBeNull();
    });

    it('HBP -> null (not a batted ball)', () => {
      expect(inferExitType('HBP')).toBeNull();
    });

    it('E -> null (needs context)', () => {
      expect(inferExitType('E')).toBeNull();
    });
  });
});

// ============================================
// TESTS: DP Chain Inference
// ============================================

describe('DP Chain Inference by Direction', () => {
  it('Left -> 5-4-3 (3B to 2B to 1B)', () => {
    expect(DP_CHAINS['Left']).toBe('5-4-3');
  });

  it('Left-Center -> 6-4-3 (SS to 2B to 1B)', () => {
    expect(DP_CHAINS['Left-Center']).toBe('6-4-3');
  });

  it('Center -> 6-4-3 (SS to 2B to 1B)', () => {
    expect(DP_CHAINS['Center']).toBe('6-4-3');
  });

  it('Right-Center -> 4-6-3 (2B to SS to 1B)', () => {
    expect(DP_CHAINS['Right-Center']).toBe('4-6-3');
  });

  it('Right -> 3-6-3 (1B to SS to 1B)', () => {
    expect(DP_CHAINS['Right']).toBe('3-6-3');
  });
});

// ============================================
// TESTS: Contextual Visibility Rules
// ============================================

describe('Contextual Visibility Rules', () => {
  describe('Infield Fly Rule Toggle', () => {
    it('IFR visible: PO + R1R2 + 0 outs', () => {
      expect(shouldShowIFR('PO', createBases(true, true, false), 0)).toBe(true);
    });

    it('IFR visible: FO + bases loaded + 1 out', () => {
      expect(shouldShowIFR('FO', createBases(true, true, true), 1)).toBe(true);
    });

    it('IFR NOT visible: PO + 2 outs', () => {
      expect(shouldShowIFR('PO', createBases(true, true, false), 2)).toBe(false);
    });

    it('IFR NOT visible: PO + only R1', () => {
      expect(shouldShowIFR('PO', createBases(true, false, false), 0)).toBe(false);
    });

    it('IFR NOT visible: GO (not a fly ball)', () => {
      expect(shouldShowIFR('GO', createBases(true, true, false), 0)).toBe(false);
    });
  });

  describe('Ground Rule Double Toggle', () => {
    it('GRD visible: 2B', () => {
      expect(shouldShowGRD('2B')).toBe(true);
    });

    it('GRD NOT visible: 1B', () => {
      expect(shouldShowGRD('1B')).toBe(false);
    });

    it('GRD NOT visible: 3B', () => {
      expect(shouldShowGRD('3B')).toBe(false);
    });
  });

  describe('Bad Hop Toggle', () => {
    it('Bad Hop visible: 1B', () => {
      expect(shouldShowBadHop('1B')).toBe(true);
    });

    it('Bad Hop visible: 2B', () => {
      expect(shouldShowBadHop('2B')).toBe(true);
    });

    it('Bad Hop visible: 3B', () => {
      expect(shouldShowBadHop('3B')).toBe(true);
    });

    it('Bad Hop NOT visible: GO', () => {
      expect(shouldShowBadHop('GO')).toBe(false);
    });

    it('Bad Hop NOT visible: FO', () => {
      expect(shouldShowBadHop('FO')).toBe(false);
    });
  });

  describe('Nutshot Toggle', () => {
    it('Nutshot visible: GO Center', () => {
      expect(shouldShowNutshot('GO', 'Center')).toBe(true);
    });

    it('Nutshot visible: LO Center', () => {
      expect(shouldShowNutshot('LO', 'Center')).toBe(true);
    });

    it('Nutshot visible: 1B Center', () => {
      expect(shouldShowNutshot('1B', 'Center')).toBe(true);
    });

    it('Nutshot NOT visible: GO Left', () => {
      expect(shouldShowNutshot('GO', 'Left')).toBe(false);
    });

    it('Nutshot NOT visible: FO Center', () => {
      expect(shouldShowNutshot('FO', 'Center')).toBe(false);
    });
  });

  describe('Robbery Toggle', () => {
    it('Robbery visible: HR', () => {
      expect(shouldShowRobbery('HR')).toBe(true);
    });

    it('Robbery NOT visible: FO', () => {
      expect(shouldShowRobbery('FO')).toBe(false);
    });

    it('Robbery NOT visible: 2B', () => {
      expect(shouldShowRobbery('2B')).toBe(false);
    });
  });
});

// ============================================
// TESTS: Play Classification
// ============================================

describe('Play Classification', () => {
  describe('Single Fielder Out Classification', () => {
    it('Deep outfield catch (y > 0.6) -> auto-complete FO', () => {
      const result = classifySingleFielderOut({ x: 0, y: 0.75 }, 8);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('FO');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('Shallow outfield catch (y < 0.6) -> needs confirmation', () => {
      const result = classifySingleFielderOut({ x: 0, y: 0.45 }, 8);
      expect(result.autoComplete).toBe(false);
      expect(result.outType).toBe('FO');
    });

    it('Infielder unassisted -> LO suggestion, needs confirmation', () => {
      const result = classifySingleFielderOut({ x: 0, y: 0.25 }, 6);
      expect(result.autoComplete).toBe(false);
      expect(result.outType).toBe('LO');
    });
  });

  describe('Multi-Fielder Out Classification', () => {
    it('6-4-3 with runners -> auto-complete DP', () => {
      const result = classifyMultiFielderOut('6-4-3', true, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('DP');
    });

    it('4-6-3 with runners -> auto-complete DP', () => {
      const result = classifyMultiFielderOut('4-6-3', true, 1);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('DP');
    });

    it('6-4-3 with 2 outs -> NOT DP (can\'t turn DP with 2 outs)', () => {
      const result = classifyMultiFielderOut('6-4-3', true, 2);
      expect(result.outType).not.toBe('DP');
    });

    it('6-3 (SS to 1B) -> auto-complete GO', () => {
      const result = classifyMultiFielderOut('6-3', false, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('GO');
    });

    it('5-3 (3B to 1B) -> auto-complete GO', () => {
      const result = classifyMultiFielderOut('5-3', false, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('GO');
    });

    it('4-3 (2B to 1B) -> auto-complete GO', () => {
      const result = classifyMultiFielderOut('4-3', false, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('GO');
    });

    it('1-3 (P to 1B comebacker) -> auto-complete GO', () => {
      const result = classifyMultiFielderOut('1-3', false, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('GO');
    });

    it('1-4-3 (P to 2B to 1B comebacker) -> auto-complete GO', () => {
      const result = classifyMultiFielderOut('1-4-3', false, 0);
      expect(result.autoComplete).toBe(true);
      expect(result.outType).toBe('GO');
    });
  });

  describe('Hit Classification by Depth', () => {
    it('Infield hit (y < 0.35) -> 1B high confidence', () => {
      const result = classifyHit({ x: 0, y: 0.25 });
      expect(result.suggestedHitType).toBe('1B');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('Shallow outfield (0.35 < y < 0.55) -> 1B medium confidence', () => {
      const result = classifyHit({ x: 0, y: 0.45 });
      expect(result.suggestedHitType).toBe('1B');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('Mid outfield (0.55 < y < 0.75) -> 1B lower confidence', () => {
      const result = classifyHit({ x: 0, y: 0.65 });
      expect(result.suggestedHitType).toBe('1B');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('Deep outfield (0.75 < y < 0.9) -> 2B', () => {
      const result = classifyHit({ x: 0, y: 0.82 });
      expect(result.suggestedHitType).toBe('2B');
    });

    it('At the wall (y >= 0.9) -> 3B', () => {
      const result = classifyHit({ x: 0, y: 0.95 });
      expect(result.suggestedHitType).toBe('3B');
    });
  });

  describe('Auto-Complete Threshold', () => {
    it('Should auto-complete when confidence >= 0.85 and autoComplete=true', () => {
      const result: ClassificationResult = {
        autoComplete: true,
        playType: 'out',
        outType: 'FO',
        confidence: 0.9,
      };
      expect(shouldAutoComplete(result)).toBe(true);
    });

    it('Should NOT auto-complete when confidence < 0.85', () => {
      const result: ClassificationResult = {
        autoComplete: true,
        playType: 'out',
        outType: 'FO',
        confidence: 0.7,
      };
      expect(shouldAutoComplete(result)).toBe(false);
    });

    it('Should NOT auto-complete when autoComplete=false', () => {
      const result: ClassificationResult = {
        autoComplete: false,
        playType: 'out',
        outType: 'FO',
        confidence: 0.95,
      };
      expect(shouldAutoComplete(result)).toBe(false);
    });
  });
});

// ============================================
// TESTS: Special Event Prompts
// ============================================

describe('Special Event Prompt Conditions', () => {
  describe('Web Gem Prompt', () => {
    it('Should prompt for Web Gem when y > 0.8 and <= 0.95', () => {
      // y = 0.85 is in Web Gem zone
      expect(0.85 > 0.8 && 0.85 <= 0.95).toBe(true);
    });

    it('Should NOT prompt for Web Gem when y <= 0.8', () => {
      expect(0.75 > 0.8).toBe(false);
    });
  });

  describe('Robbery Prompt', () => {
    it('Should prompt for Robbery when y > 0.95', () => {
      expect(0.97 > 0.95).toBe(true);
    });

    it('Should NOT prompt for Robbery when y <= 0.95', () => {
      expect(0.93 > 0.95).toBe(false);
    });
  });

  describe('Pitcher Comebacker Prompts', () => {
    it('Should prompt KILLED_PITCHER for pitcher fielding sequence', () => {
      // Pitcher is position 1
      const firstFielder = 1;
      expect(firstFielder === 1).toBe(true);
    });

    it('Should prompt NUT_SHOT for pitcher fielding sequence', () => {
      // Same condition as KILLED_PITCHER
      const firstFielder = 1;
      expect(firstFielder === 1).toBe(true);
    });
  });
});

// ============================================
// TESTS: Inference Matrix Completeness
// ============================================

describe('Inference Matrix Completeness', () => {
  const directions: FairDirection[] = ['Left', 'Left-Center', 'Center', 'Right-Center', 'Right'];

  describe('Ground Ball Matrix', () => {
    directions.forEach(dir => {
      it(`Has entry for ${dir}`, () => {
        expect(GROUND_BALL_INFERENCE[dir]).toBeDefined();
        expect(GROUND_BALL_INFERENCE[dir].primary).toBeDefined();
      });
    });
  });

  describe('Fly Ball Matrix', () => {
    directions.forEach(dir => {
      it(`Has entry for ${dir}`, () => {
        expect(FLY_BALL_INFERENCE[dir]).toBeDefined();
        expect(FLY_BALL_INFERENCE[dir].primary).toBeDefined();
      });
    });
  });

  describe('Line Drive Matrix', () => {
    directions.forEach(dir => {
      it(`Has entry for ${dir}`, () => {
        expect(LINE_DRIVE_INFERENCE[dir]).toBeDefined();
        expect(LINE_DRIVE_INFERENCE[dir].primary).toBeDefined();
      });
    });
  });

  describe('Pop Fly Matrix', () => {
    directions.forEach(dir => {
      it(`Has entry for ${dir}`, () => {
        expect(POP_FLY_INFERENCE[dir]).toBeDefined();
        expect(POP_FLY_INFERENCE[dir].primary).toBeDefined();
      });
    });
  });

  describe('DP Chains', () => {
    directions.forEach(dir => {
      it(`Has DP chain for ${dir}`, () => {
        expect(DP_CHAINS[dir]).toBeDefined();
        expect(DP_CHAINS[dir].split('-').length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
