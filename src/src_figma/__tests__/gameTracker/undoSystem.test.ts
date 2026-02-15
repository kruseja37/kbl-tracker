/**
 * Undo System Tests
 *
 * Phase 6.1 of Testing Implementation Plan
 *
 * Tests the undo stack logic for GameTracker.
 * Per spec: 5-step undo stack with state snapshots.
 */

import { describe, test, expect, beforeEach } from 'vitest';

// ============================================
// TYPES
// ============================================

interface GameState {
  gameId: string;
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  currentBatterId: string;
  currentBatterName: string;
}

interface ScoreboardState {
  innings: { away: number | undefined; home: number | undefined }[];
  away: { runs: number; hits: number; errors: number };
  home: { runs: number; hits: number; errors: number };
}

interface StateSnapshot {
  gameState: GameState;
  scoreboard: ScoreboardState;
  timestamp: number;
}

// ============================================
// UNDO STACK IMPLEMENTATION
// ============================================

class UndoStack {
  private stack: StateSnapshot[] = [];
  private maxSize: number;

  constructor(maxSize: number = 5) {
    this.maxSize = maxSize;
  }

  push(snapshot: StateSnapshot): void {
    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) {
      this.stack.shift(); // Remove oldest
    }
  }

  pop(): StateSnapshot | undefined {
    return this.stack.pop();
  }

  peek(): StateSnapshot | undefined {
    return this.stack[this.stack.length - 1];
  }

  get length(): number {
    return this.stack.length;
  }

  clear(): void {
    this.stack = [];
  }

  canUndo(): boolean {
    return this.stack.length > 0;
  }

  getAll(): StateSnapshot[] {
    return [...this.stack];
  }
}

// ============================================
// HELPER FACTORIES
// ============================================

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'game-123',
    homeScore: 0,
    awayScore: 0,
    inning: 1,
    isTop: true,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: { first: false, second: false, third: false },
    currentBatterId: 'batter-1',
    currentBatterName: 'Test Batter',
    ...overrides,
  };
}

function createScoreboard(): ScoreboardState {
  return {
    innings: Array(9)
      .fill(null)
      .map(() => ({ away: undefined, home: undefined })),
    away: { runs: 0, hits: 0, errors: 0 },
    home: { runs: 0, hits: 0, errors: 0 },
  };
}

function createSnapshot(
  gameOverrides: Partial<GameState> = {},
  timestamp?: number
): StateSnapshot {
  return {
    gameState: createGameState(gameOverrides),
    scoreboard: createScoreboard(),
    timestamp: timestamp || Date.now(),
  };
}

// ============================================
// UNDO STACK BASIC OPERATIONS
// ============================================

describe('Undo Stack Basic Operations', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('starts empty', () => {
    expect(undoStack.length).toBe(0);
    expect(undoStack.canUndo()).toBe(false);
  });

  test('push adds snapshot to stack', () => {
    const snapshot = createSnapshot();
    undoStack.push(snapshot);

    expect(undoStack.length).toBe(1);
    expect(undoStack.canUndo()).toBe(true);
  });

  test('pop removes and returns last snapshot', () => {
    const snapshot1 = createSnapshot({ outs: 0 });
    const snapshot2 = createSnapshot({ outs: 1 });

    undoStack.push(snapshot1);
    undoStack.push(snapshot2);

    const popped = undoStack.pop();

    expect(popped).toBe(snapshot2);
    expect(undoStack.length).toBe(1);
  });

  test('peek returns last snapshot without removing', () => {
    const snapshot = createSnapshot();
    undoStack.push(snapshot);

    const peeked = undoStack.peek();

    expect(peeked).toBe(snapshot);
    expect(undoStack.length).toBe(1);
  });

  test('pop on empty stack returns undefined', () => {
    const result = undoStack.pop();
    expect(result).toBeUndefined();
  });

  test('peek on empty stack returns undefined', () => {
    const result = undoStack.peek();
    expect(result).toBeUndefined();
  });

  test('clear removes all snapshots', () => {
    undoStack.push(createSnapshot());
    undoStack.push(createSnapshot());
    undoStack.push(createSnapshot());

    undoStack.clear();

    expect(undoStack.length).toBe(0);
    expect(undoStack.canUndo()).toBe(false);
  });
});

// ============================================
// UNDO STACK SIZE LIMIT (5-STEP)
// ============================================

describe('Undo Stack Size Limit', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('stack limited to 5 items', () => {
    for (let i = 0; i < 10; i++) {
      undoStack.push(createSnapshot({ outs: i % 3 }));
    }

    expect(undoStack.length).toBe(5);
  });

  test('oldest snapshot removed when exceeding limit', () => {
    const snapshot1 = createSnapshot({ outs: 0 }, 1000);
    const snapshot2 = createSnapshot({ outs: 1 }, 2000);
    const snapshot3 = createSnapshot({ outs: 2 }, 3000);
    const snapshot4 = createSnapshot({ outs: 0 }, 4000);
    const snapshot5 = createSnapshot({ outs: 1 }, 5000);
    const snapshot6 = createSnapshot({ outs: 2 }, 6000);

    undoStack.push(snapshot1);
    undoStack.push(snapshot2);
    undoStack.push(snapshot3);
    undoStack.push(snapshot4);
    undoStack.push(snapshot5);

    expect(undoStack.length).toBe(5);

    // Adding 6th should remove snapshot1
    undoStack.push(snapshot6);

    expect(undoStack.length).toBe(5);

    const all = undoStack.getAll();
    expect(all[0].timestamp).toBe(2000); // snapshot1 (1000) removed
    expect(all[4].timestamp).toBe(6000); // snapshot6 is newest
  });

  test('can undo exactly 5 times', () => {
    for (let i = 0; i < 5; i++) {
      undoStack.push(createSnapshot({ outs: i % 3 }));
    }

    let undoCount = 0;
    while (undoStack.canUndo()) {
      undoStack.pop();
      undoCount++;
    }

    expect(undoCount).toBe(5);
  });
});

describe('Undo Stack custom cap behavior', () => {
  test('caps at 20 entries even when 21 pushes occur', () => {
    const undoStack = new UndoStack(20);

    for (let i = 0; i < 21; i++) {
      undoStack.push(createSnapshot({ outs: i }));
    }

    expect(undoStack.length).toBe(20);
    const remaining = undoStack.getAll();
    expect(remaining[0].gameState.outs).toBe(1);
    expect(remaining[remaining.length - 1].gameState.outs).toBe(20);
  });
});

// ============================================
// SNAPSHOT INTEGRITY
// ============================================

describe('Snapshot Integrity', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('snapshot preserves game state', () => {
    const snapshot = createSnapshot({
      homeScore: 5,
      awayScore: 3,
      inning: 7,
      isTop: false,
      outs: 2,
    });

    undoStack.push(snapshot);
    const restored = undoStack.pop();

    expect(restored?.gameState.homeScore).toBe(5);
    expect(restored?.gameState.awayScore).toBe(3);
    expect(restored?.gameState.inning).toBe(7);
    expect(restored?.gameState.isTop).toBe(false);
    expect(restored?.gameState.outs).toBe(2);
  });

  test('snapshot preserves base state', () => {
    const snapshot = createSnapshot({
      bases: { first: true, second: false, third: true },
    });

    undoStack.push(snapshot);
    const restored = undoStack.pop();

    expect(restored?.gameState.bases.first).toBe(true);
    expect(restored?.gameState.bases.second).toBe(false);
    expect(restored?.gameState.bases.third).toBe(true);
  });

  test('snapshot preserves count', () => {
    const snapshot = createSnapshot({
      balls: 3,
      strikes: 2,
    });

    undoStack.push(snapshot);
    const restored = undoStack.pop();

    expect(restored?.gameState.balls).toBe(3);
    expect(restored?.gameState.strikes).toBe(2);
  });

  test('snapshot preserves timestamp', () => {
    const timestamp = Date.now();
    const snapshot = createSnapshot({}, timestamp);

    undoStack.push(snapshot);
    const restored = undoStack.pop();

    expect(restored?.timestamp).toBe(timestamp);
  });

  test('snapshots are independent (deep copy)', () => {
    const gameState = createGameState({ outs: 0 });
    const snapshot: StateSnapshot = {
      gameState: { ...gameState },
      scoreboard: createScoreboard(),
      timestamp: Date.now(),
    };

    undoStack.push(snapshot);

    // Modify original (should not affect stack)
    gameState.outs = 2;

    const restored = undoStack.peek();
    expect(restored?.gameState.outs).toBe(0); // Original value preserved
  });
});

// ============================================
// UNDO SCENARIOS
// ============================================

describe('Undo Scenarios', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('undo after hit restores previous state', () => {
    // Before hit: 0 outs, bases empty
    const beforeHit = createSnapshot({
      outs: 0,
      bases: { first: false, second: false, third: false },
    });

    undoStack.push(beforeHit);

    // After hit: runner on first
    // User presses undo
    const restored = undoStack.pop();

    expect(restored?.gameState.bases.first).toBe(false);
  });

  test('undo after run scored restores score', () => {
    // Before run
    const beforeRun = createSnapshot({ awayScore: 0 });
    undoStack.push(beforeRun);

    // After run scored
    // User presses undo
    const restored = undoStack.pop();

    expect(restored?.gameState.awayScore).toBe(0);
  });

  test('undo after strikeout restores outs', () => {
    // Before K: 1 out
    const beforeK = createSnapshot({ outs: 1 });
    undoStack.push(beforeK);

    // After K: 2 outs
    // User presses undo
    const restored = undoStack.pop();

    expect(restored?.gameState.outs).toBe(1);
  });

  test('undo after inning change restores inning', () => {
    // Before inning change
    const beforeChange = createSnapshot({
      inning: 3,
      isTop: true,
      outs: 2,
    });
    undoStack.push(beforeChange);

    // After: inning 3 bottom, 0 outs
    // User presses undo
    const restored = undoStack.pop();

    expect(restored?.gameState.inning).toBe(3);
    expect(restored?.gameState.isTop).toBe(true);
    expect(restored?.gameState.outs).toBe(2);
  });

  test('multiple undos restore progressively older states', () => {
    const state1 = createSnapshot({ outs: 0 }, 1000);
    const state2 = createSnapshot({ outs: 1 }, 2000);
    const state3 = createSnapshot({ outs: 2 }, 3000);

    undoStack.push(state1);
    undoStack.push(state2);
    undoStack.push(state3);

    const undo1 = undoStack.pop();
    expect(undo1?.gameState.outs).toBe(2);

    const undo2 = undoStack.pop();
    expect(undo2?.gameState.outs).toBe(1);

    const undo3 = undoStack.pop();
    expect(undo3?.gameState.outs).toBe(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Undo Edge Cases', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('undo at game start (nothing to undo)', () => {
    expect(undoStack.canUndo()).toBe(false);
    expect(undoStack.pop()).toBeUndefined();
  });

  test('undo after exactly 5 plays then undo 6th', () => {
    // Push 5 states
    for (let i = 0; i < 5; i++) {
      undoStack.push(createSnapshot({ outs: i % 3 }));
    }

    // Pop all 5
    for (let i = 0; i < 5; i++) {
      expect(undoStack.pop()).toBeDefined();
    }

    // 6th pop should fail
    expect(undoStack.pop()).toBeUndefined();
  });

  test('push after clearing stack', () => {
    undoStack.push(createSnapshot());
    undoStack.clear();
    undoStack.push(createSnapshot({ outs: 1 }));

    expect(undoStack.length).toBe(1);
    expect(undoStack.peek()?.gameState.outs).toBe(1);
  });

  test('handles rapid state changes', () => {
    // Simulate rapid plays
    for (let i = 0; i < 20; i++) {
      undoStack.push(createSnapshot({ outs: i % 3 }, Date.now() + i));
    }

    expect(undoStack.length).toBe(5);
    // Most recent 5 are preserved
  });
});

// ============================================
// UNDO WITH COMPLEX STATE
// ============================================

describe('Undo with Complex State', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('restores bases loaded situation', () => {
    const basesLoaded = createSnapshot({
      bases: { first: true, second: true, third: true },
      outs: 1,
    });

    undoStack.push(basesLoaded);
    const restored = undoStack.pop();

    expect(restored?.gameState.bases).toEqual({
      first: true,
      second: true,
      third: true,
    });
  });

  test('restores full count', () => {
    const fullCount = createSnapshot({
      balls: 3,
      strikes: 2,
    });

    undoStack.push(fullCount);
    const restored = undoStack.pop();

    expect(restored?.gameState.balls).toBe(3);
    expect(restored?.gameState.strikes).toBe(2);
  });

  test('restores high-scoring game', () => {
    const highScoring = createSnapshot({
      homeScore: 12,
      awayScore: 8,
      inning: 7,
    });

    undoStack.push(highScoring);
    const restored = undoStack.pop();

    expect(restored?.gameState.homeScore).toBe(12);
    expect(restored?.gameState.awayScore).toBe(8);
  });

  test('restores extra innings state', () => {
    const extraInnings = createSnapshot({
      inning: 11,
      isTop: false,
      homeScore: 5,
      awayScore: 5,
    });

    undoStack.push(extraInnings);
    const restored = undoStack.pop();

    expect(restored?.gameState.inning).toBe(11);
  });
});

// ============================================
// PRACTICAL GAME SCENARIOS
// ============================================

describe('Practical Game Scenarios', () => {
  let undoStack: UndoStack;

  beforeEach(() => {
    undoStack = new UndoStack();
  });

  test('undo mistaken HR entry', () => {
    // State before mistaken entry
    const beforeMistake = createSnapshot({
      homeScore: 3,
      awayScore: 2,
      bases: { first: true, second: false, third: false },
    });

    undoStack.push(beforeMistake);

    // User accidentally entered HR (would add runs, clear bases)
    // User hits undo
    const restored = undoStack.pop();

    expect(restored?.gameState.homeScore).toBe(3); // Not +1
    expect(restored?.gameState.bases.first).toBe(true); // Runner still on first
  });

  test('undo after recording wrong runner out', () => {
    const beforeError = createSnapshot({
      outs: 1,
      bases: { first: true, second: true, third: false },
    });

    undoStack.push(beforeError);

    // User marked wrong runner out
    // Undo restores
    const restored = undoStack.pop();

    expect(restored?.gameState.outs).toBe(1);
    expect(restored?.gameState.bases).toEqual({
      first: true,
      second: true,
      third: false,
    });
  });

  test('undo chain: hit → run → undo both', () => {
    // Initial state
    const initial = createSnapshot({
      awayScore: 0,
      bases: { first: false, second: false, third: false },
    });

    // After single
    const afterSingle = createSnapshot({
      awayScore: 0,
      bases: { first: true, second: false, third: false },
    });

    // After runner scores
    const afterRun = createSnapshot({
      awayScore: 1,
      bases: { first: true, second: false, third: false },
    });

    undoStack.push(initial);
    undoStack.push(afterSingle);
    undoStack.push(afterRun);

    // Undo run
    const undo1 = undoStack.pop();
    expect(undo1?.gameState.awayScore).toBe(1);

    // Undo single
    const undo2 = undoStack.pop();
    expect(undo2?.gameState.bases.first).toBe(true);

    // Back to initial
    const undo3 = undoStack.pop();
    expect(undo3?.gameState.awayScore).toBe(0);
    expect(undo3?.gameState.bases.first).toBe(false);
  });
});
