/**
 * PinchHitterModal Component Tests
 *
 * Tests the pinch hitter modal for making batting substitutions.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PinchHitterModal from '../../../components/GameTracker/PinchHitterModal';
import type { LineupState, BenchPlayer, Position, LineupPlayer } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createBenchPlayer = (
  id: string,
  name: string,
  positions: string[] = ['OF', 'DH'],
  isAvailable: boolean = true,
  batterHand: 'L' | 'R' | 'S' = 'R'
): BenchPlayer => ({
  playerId: id,
  playerName: name,
  positions: positions as Position[],
  isAvailable,
  batterHand,
});

const createLineupPlayer = (
  id: string,
  name: string,
  position: Position,
  battingOrder: number
): LineupPlayer => ({
  playerId: id,
  playerName: name,
  position,
  battingOrder,
});

const createLineupState = (options: {
  lineup?: LineupPlayer[];
  bench?: BenchPlayer[];
} = {}): LineupState => ({
  lineup: options.lineup || [
    createLineupPlayer('p1', 'Lead Off', 'CF', 1),
    createLineupPlayer('p2', 'Second Batter', '2B', 2),
    createLineupPlayer('p3', 'Third Batter', 'SS', 3),
    createLineupPlayer('p4', 'Clean Up', '1B', 4),
    createLineupPlayer('p5', 'Fifth Batter', 'LF', 5),
    createLineupPlayer('p6', 'Sixth Batter', '3B', 6),
    createLineupPlayer('p7', 'Seventh Batter', 'C', 7),
    createLineupPlayer('p8', 'Eighth Batter', 'RF', 8),
    createLineupPlayer('p9', 'Pitcher', 'P', 9),
  ],
  bench: options.bench || [
    createBenchPlayer('ph1', 'Pinch Hitter One', ['OF', 'DH'], true, 'L'),
    createBenchPlayer('ph2', 'Pinch Hitter Two', ['1B', 'DH'], true, 'R'),
    createBenchPlayer('ph3', 'Speedy Runner', ['OF', 'SS'], true, 'S'),
  ],
  currentPitcher: null,
  bullpen: [],
  usedPitchers: [],
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('PinchHitterModal Component', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    currentBatterId: 'p9',
    currentBatterName: 'Pitcher',
    currentBatterPosition: 'P' as Position,
    battingOrder: 9,
    inning: 6,
    halfInning: 'BOTTOM' as const,
    outs: 1,
    gameId: 'game1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('shows PINCH HITTER header with emoji', () => {
      render(<PinchHitterModal {...defaultProps} />);
      // Header has emoji: 🏏 PINCH HITTER
      expect(screen.getByText(/🏏 PINCH HITTER/)).toBeInTheDocument();
    });
  });

  describe('Current Batter Section', () => {
    test('shows BATTING FOR label', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('BATTING FOR')).toBeInTheDocument();
    });

    test('shows current batter name', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('Pitcher')).toBeInTheDocument();
    });

    test('shows batting order and position', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText(/#9 in order • P/)).toBeInTheDocument();
    });

    test('shows different batter info when changed', () => {
      render(
        <PinchHitterModal
          {...defaultProps}
          currentBatterName="Clean Up"
          currentBatterPosition="1B"
          battingOrder={4}
        />
      );
      expect(screen.getByText('Clean Up')).toBeInTheDocument();
      expect(screen.getByText(/#4 in order • 1B/)).toBeInTheDocument();
    });
  });

  describe('Pinch Hitter Selection Section', () => {
    test('shows SELECT PINCH HITTER label', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('SELECT PINCH HITTER')).toBeInTheDocument();
    });

    test('shows available bench players', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('Pinch Hitter One')).toBeInTheDocument();
      expect(screen.getByText('Pinch Hitter Two')).toBeInTheDocument();
      expect(screen.getByText('Speedy Runner')).toBeInTheDocument();
    });

    test('shows player positions', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText(/OF, DH/)).toBeInTheDocument();
      expect(screen.getByText(/1B, DH/)).toBeInTheDocument();
      expect(screen.getByText(/OF, SS/)).toBeInTheDocument();
    });

    test('shows batter hand', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText(/L bat/)).toBeInTheDocument();
      expect(screen.getByText(/R bat/)).toBeInTheDocument();
      expect(screen.getByText(/S bat/)).toBeInTheDocument();
    });

    test('shows no players message when bench empty', () => {
      render(
        <PinchHitterModal
          {...defaultProps}
          lineupState={createLineupState({ bench: [] })}
        />
      );
      expect(screen.getByText('No players available on bench')).toBeInTheDocument();
    });

    test('only shows available players', () => {
      render(
        <PinchHitterModal
          {...defaultProps}
          lineupState={createLineupState({
            bench: [
              createBenchPlayer('ph1', 'Available Player', ['OF'], true),
              createBenchPlayer('ph2', 'Unavailable Player', ['1B'], false),
            ],
          })}
        />
      );
      expect(screen.getByText('Available Player')).toBeInTheDocument();
      expect(screen.queryByText('Unavailable Player')).not.toBeInTheDocument();
    });

    test('can select a pinch hitter', () => {
      render(<PinchHitterModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Checkmark should appear
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    test('can change pinch hitter selection', () => {
      render(<PinchHitterModal {...defaultProps} />);

      // Select first
      fireEvent.click(screen.getByText('Pinch Hitter One'));
      expect(screen.getByText('✓')).toBeInTheDocument();

      // Select second
      fireEvent.click(screen.getByText('Pinch Hitter Two'));

      // Should still have one checkmark
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBe(1);
    });
  });

  describe('Defensive Position Section', () => {
    test('shows defensive position section after selecting PH', () => {
      render(<PinchHitterModal {...defaultProps} />);

      // Before selection, section not visible
      expect(screen.queryByText('DEFENSIVE POSITION AFTER AT-BAT')).not.toBeInTheDocument();

      // Select PH
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Now section should be visible
      expect(screen.getByText('DEFENSIVE POSITION AFTER AT-BAT')).toBeInTheDocument();
    });

    test('shows all position buttons', () => {
      render(<PinchHitterModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
      positions.forEach(pos => {
        expect(screen.getByRole('button', { name: pos })).toBeInTheDocument();
      });
    });

    test('defaults to current batter position', () => {
      render(<PinchHitterModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Should show note about playing P (current batter position)
      expect(screen.getByText(/will play P after the at-bat/)).toBeInTheDocument();
    });

    test('can select different position', () => {
      render(<PinchHitterModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Click DH position
      fireEvent.click(screen.getByRole('button', { name: 'DH' }));

      expect(screen.getByText(/will play DH after the at-bat/)).toBeInTheDocument();
    });

    test('shows pinch hitter name in position note', () => {
      render(<PinchHitterModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      expect(screen.getByText(/Pinch Hitter One will play/)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('shows Cancel button', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<PinchHitterModal {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Confirm Button', () => {
    test('shows Confirm button', () => {
      render(<PinchHitterModal {...defaultProps} />);
      expect(screen.getByText('Confirm Pinch Hitter')).toBeInTheDocument();
    });

    test('button is disabled without PH selection', () => {
      render(<PinchHitterModal {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm Pinch Hitter');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is enabled after PH selection', () => {
      render(<PinchHitterModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      const confirmBtn = screen.getByText('Confirm Pinch Hitter');
      expect(confirmBtn).not.toBeDisabled();
    });

    test('shows error when confirming without selection', () => {
      render(<PinchHitterModal {...defaultProps} />);

      // Try to confirm - button is disabled, so nothing should happen
      // The button is disabled so we can't actually click it
      const confirmBtn = screen.getByText('Confirm Pinch Hitter');
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe('Event Creation', () => {
    test('calls onComplete with correct event data', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      // Select PH
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Confirm
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PINCH_HIT',
          gameId: 'game1',
          inning: 6,
          halfInning: 'BOTTOM',
          outs: 1,
          replacedPlayerId: 'p9',
          replacedPlayerName: 'Pitcher',
          replacedBattingOrder: 9,
          pinchHitterId: 'ph1',
          pinchHitterName: 'Pinch Hitter One',
          fieldingPosition: 'P', // Default to current batter position
        })
      );
    });

    test('includes selected fielding position', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      // Select PH
      fireEvent.click(screen.getByText('Pinch Hitter One'));

      // Change position to DH
      fireEvent.click(screen.getByRole('button', { name: 'DH' }));

      // Confirm
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldingPosition: 'DH',
        })
      );
    });

    test('includes opposing pitcher when provided', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
          opposingPitcher="Ace Pitcher"
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          pitcherFacing: 'Ace Pitcher',
        })
      );
    });

    test('includes timestamp in event', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Defensive Alignment Validation (BUG-001)', () => {
    test('allows DH position without validation', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      fireEvent.click(screen.getByRole('button', { name: 'DH' }));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      // Should complete without error
      expect(onComplete).toHaveBeenCalled();
    });

    test('detects position conflict when selecting occupied position', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
          currentBatterPosition="DH"  // Start as DH
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      // Try to put PH at CF which is already occupied by Lead Off
      fireEvent.click(screen.getByRole('button', { name: 'CF' }));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      // Should show error about position conflict
      expect(screen.getByText(/Position conflict/)).toBeInTheDocument();
      expect(screen.getByText(/CF is already occupied/)).toBeInTheDocument();
      expect(onComplete).not.toHaveBeenCalled();
    });

    test('detects missing defensive position when not using DH', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
          currentBatterPosition="P"  // Replacing pitcher
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      // Try to put PH at LF instead of P
      fireEvent.click(screen.getByRole('button', { name: 'LF' }));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      // Should show errors - LF conflict and missing P
      // Multiple errors expected, use getAllByText
      const errors = screen.getAllByText(/Position conflict|Missing position/);
      expect(errors.length).toBeGreaterThan(0);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Error Display', () => {
    test('clears errors on valid selection and confirm', () => {
      const onComplete = vi.fn();
      render(
        <PinchHitterModal
          {...defaultProps}
          onComplete={onComplete}
          currentBatterPosition="DH"
        />
      );

      fireEvent.click(screen.getByText('Pinch Hitter One'));
      // Select an occupied position to trigger error
      fireEvent.click(screen.getByRole('button', { name: 'CF' }));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      // Error should be shown
      expect(screen.getByText(/Position conflict/)).toBeInTheDocument();

      // Now select valid position (DH)
      fireEvent.click(screen.getByRole('button', { name: 'DH' }));
      fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

      // Should succeed now
      expect(onComplete).toHaveBeenCalled();
    });
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('PinchHitterModal Edge Cases', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    currentBatterId: 'p9',
    currentBatterName: 'Pitcher',
    currentBatterPosition: 'P' as Position,
    battingOrder: 9,
    inning: 6,
    halfInning: 'BOTTOM' as const,
    outs: 1,
    gameId: 'game1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('works with only one bench player', () => {
    const onComplete = vi.fn();
    render(
      <PinchHitterModal
        {...defaultProps}
        onComplete={onComplete}
        lineupState={createLineupState({
          bench: [createBenchPlayer('ph1', 'Only Option', ['P'], true)],
        })}
      />
    );

    // Select the only player
    fireEvent.click(screen.getByText('Only Option'));
    fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

    expect(onComplete).toHaveBeenCalled();
  });

  test('handles switch hitter correctly', () => {
    render(
      <PinchHitterModal
        {...defaultProps}
        lineupState={createLineupState({
          bench: [createBenchPlayer('ph1', 'Switch Hitter', ['OF'], true, 'S')],
        })}
      />
    );

    expect(screen.getByText(/S bat/)).toBeInTheDocument();
  });

  test('includes all position options including P', () => {
    render(<PinchHitterModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Pinch Hitter One'));

    // Pitchers CAN pinch hit in SMB4
    expect(screen.getByRole('button', { name: 'P' })).toBeInTheDocument();
  });

  test('handles player with many positions', () => {
    render(
      <PinchHitterModal
        {...defaultProps}
        lineupState={createLineupState({
          bench: [createBenchPlayer('ph1', 'Utility Player', ['1B', '2B', '3B', 'SS', 'LF', 'RF'], true)],
        })}
      />
    );

    expect(screen.getByText(/1B, 2B, 3B, SS, LF, RF/)).toBeInTheDocument();
  });

  test('correctly replaces batter in middle of lineup', () => {
    const onComplete = vi.fn();
    render(
      <PinchHitterModal
        {...defaultProps}
        onComplete={onComplete}
        currentBatterId="p4"
        currentBatterName="Clean Up"
        currentBatterPosition="1B"
        battingOrder={4}
      />
    );

    fireEvent.click(screen.getByText('Pinch Hitter One'));
    fireEvent.click(screen.getByText('Confirm Pinch Hitter'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        replacedPlayerId: 'p4',
        replacedPlayerName: 'Clean Up',
        replacedBattingOrder: 4,
        fieldingPosition: '1B', // Inherits position
      })
    );
  });
});
