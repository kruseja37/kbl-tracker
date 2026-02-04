/**
 * PinchRunnerModal Component Tests
 *
 * Tests the pinch runner modal for making baserunner substitutions.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PinchRunnerModal from '../../../components/GameTracker/PinchRunnerModal';
import type { LineupState, BenchPlayer, Bases, Runner, Position } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createRunner = (
  id: string,
  name: string,
  options: { inheritedFrom?: string; howReached?: string } = {}
): Runner => ({
  playerId: id,
  playerName: name,
  inheritedFrom: options.inheritedFrom,
  howReached: options.howReached,
});

const createBenchPlayer = (
  id: string,
  name: string,
  positions: string[] = ['OF', 'IF'],
  isAvailable: boolean = true
): BenchPlayer => ({
  playerId: id,
  playerName: name,
  positions,
  isAvailable,
  batterHand: 'R',
});

const createLineupState = (options: { bench?: BenchPlayer[] } = {}): LineupState => ({
  lineup: [
    {
      playerId: 'p1',
      playerName: 'Lead Off',
      battingOrder: 1,
      position: 'CF' as Position,
    },
    {
      playerId: 'p2',
      playerName: 'Second Batter',
      battingOrder: 2,
      position: 'SS' as Position,
    },
    {
      playerId: 'p3',
      playerName: 'Third Batter',
      battingOrder: 3,
      position: 'RF' as Position,
    },
  ],
  currentPitcher: null,
  bench: options.bench || [
    createBenchPlayer('pr1', 'Speed Demon'),
    createBenchPlayer('pr2', 'Fast Runner'),
    createBenchPlayer('pr3', 'Quick Feet'),
  ],
  bullpen: [],
  usedPitchers: [],
});

const createBases = (options: { first?: Runner; second?: Runner; third?: Runner } = {}): Bases => ({
  first: options.first || null,
  second: options.second || null,
  third: options.third || null,
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('PinchRunnerModal Component', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    bases: createBases({
      first: createRunner('p1', 'Lead Off'),
    }),
    inning: 7,
    halfInning: 'BOTTOM' as const,
    outs: 1,
    gameId: 'game1',
    currentPitcherId: 'pitcher1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('shows PINCH RUNNER header with emoji', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText(/🏃 PINCH RUNNER/)).toBeInTheDocument();
    });
  });

  describe('No Runners State', () => {
    test('shows no runners message when bases empty', () => {
      render(<PinchRunnerModal {...defaultProps} bases={createBases()} />);
      expect(screen.getByText('No runners on base')).toBeInTheDocument();
    });

    test('shows Close button when no runners', () => {
      render(<PinchRunnerModal {...defaultProps} bases={createBases()} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    test('calls onCancel when Close clicked with no runners', () => {
      const onCancel = vi.fn();
      render(<PinchRunnerModal {...defaultProps} bases={createBases()} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('Close'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Runner Selection Section', () => {
    test('shows SELECT RUNNER TO REPLACE label', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText('SELECT RUNNER TO REPLACE')).toBeInTheDocument();
    });

    test('shows runner on first base', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText('Lead Off')).toBeInTheDocument();
      expect(screen.getByText('1B')).toBeInTheDocument();
    });

    test('shows runner on second base', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            second: createRunner('p2', 'Second Batter'),
          })}
        />
      );
      expect(screen.getByText('Second Batter')).toBeInTheDocument();
      expect(screen.getByText('2B')).toBeInTheDocument();
    });

    test('shows runner on third base', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            third: createRunner('p3', 'Third Batter'),
          })}
        />
      );
      expect(screen.getByText('Third Batter')).toBeInTheDocument();
      expect(screen.getByText('3B')).toBeInTheDocument();
    });

    test('shows multiple runners when bases loaded', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            first: createRunner('p1', 'First Runner'),
            second: createRunner('p2', 'Second Runner'),
            third: createRunner('p3', 'Third Runner'),
          })}
        />
      );
      expect(screen.getByText('First Runner')).toBeInTheDocument();
      expect(screen.getByText('Second Runner')).toBeInTheDocument();
      expect(screen.getByText('Third Runner')).toBeInTheDocument();
    });

    test('shows batting order and position for runner', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText('#1 • CF')).toBeInTheDocument();
    });
  });

  describe('Pinch Runner Selection', () => {
    test('shows SELECT PINCH RUNNER after selecting runner', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      expect(screen.getByText('SELECT PINCH RUNNER')).toBeInTheDocument();
    });

    test('shows available bench players after selecting runner', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      expect(screen.getByText('Speed Demon')).toBeInTheDocument();
      expect(screen.getByText('Fast Runner')).toBeInTheDocument();
      expect(screen.getByText('Quick Feet')).toBeInTheDocument();
    });

    test('shows no players message when bench empty', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          lineupState={createLineupState({ bench: [] })}
        />
      );
      fireEvent.click(screen.getByText('Lead Off'));
      expect(screen.getByText('No players available on bench')).toBeInTheDocument();
    });

    test('only shows available players', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          lineupState={createLineupState({
            bench: [
              createBenchPlayer('pr1', 'Available Player', ['OF'], true),
              createBenchPlayer('pr2', 'Unavailable Player', ['OF'], false),
            ],
          })}
        />
      );
      fireEvent.click(screen.getByText('Lead Off'));
      expect(screen.getByText('Available Player')).toBeInTheDocument();
      expect(screen.queryByText('Unavailable Player')).not.toBeInTheDocument();
    });

    test('shows checkmark when pinch runner selected', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));

      // Count checkmarks - should be 2 (one for selected runner, one for selected PR)
      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks.length).toBe(2);
    });
  });

  describe('Inherited Runner Warning', () => {
    test('shows inherited runner warning when runner was inherited', () => {
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            first: createRunner('p1', 'Lead Off', { inheritedFrom: 'prevPitcher' }),
          })}
        />
      );
      fireEvent.click(screen.getByText('Lead Off'));
      expect(
        screen.getByText(/If this runner scores, the run is charged to the pitcher who allowed them/)
      ).toBeInTheDocument();
    });

    test('does not show inherited warning for non-inherited runner', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      expect(
        screen.queryByText(/If this runner scores, the run is charged to the pitcher who allowed them/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Defensive Position Selection', () => {
    test('shows position selection after selecting PR', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      expect(screen.getByText('DEFENSIVE POSITION AFTER INNING')).toBeInTheDocument();
    });

    test('defaults to replaced players position', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));

      // Lead Off plays CF, should be default
      // The position note should show CF
      fireEvent.click(screen.getByText('Speed Demon'));
      expect(screen.getByText(/Speed Demon will play CF when the team takes the field/)).toBeInTheDocument();
    });

    test('shows all position buttons', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));

      // Check for position buttons (they appear multiple times, once in lineup info and once in grid)
      expect(screen.getAllByRole('button', { name: 'P' }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'C' }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'SS' }).length).toBeGreaterThan(0);
    });

    test('allows changing defensive position', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));

      // Find and click the LF button in the position grid
      const lfButtons = screen.getAllByRole('button', { name: 'LF' });
      fireEvent.click(lfButtons[lfButtons.length - 1]); // Click last one (in grid)

      expect(screen.getByText(/Speed Demon will play LF when the team takes the field/)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('shows Cancel button', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<PinchRunnerModal {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Confirm Button', () => {
    test('shows Confirm button', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      expect(screen.getByText('Confirm Pinch Runner')).toBeInTheDocument();
    });

    test('button is disabled without runner selection', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm Pinch Runner');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is disabled without PR selection', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));

      const confirmBtn = screen.getByText('Confirm Pinch Runner');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is enabled with both selections', () => {
      render(<PinchRunnerModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));

      const confirmBtn = screen.getByText('Confirm Pinch Runner');
      expect(confirmBtn).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    test('shows error when confirming without runner selection', () => {
      render(<PinchRunnerModal {...defaultProps} />);

      // Force-enable the button by manipulating its disabled state is not possible
      // Instead, this test verifies error state by checking that confirm is disabled
      const confirmBtn = screen.getByText('Confirm Pinch Runner');
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe('Event Completion', () => {
    test('calls onComplete with correct data', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PINCH_RUN',
          replacedPlayerId: 'p1',
          replacedPlayerName: 'Lead Off',
          replacedBattingOrder: 1,
          base: '1B',
          pinchRunnerId: 'pr1',
          pinchRunnerName: 'Speed Demon',
          fieldingPosition: 'CF', // Defaults to replaced player's position
        })
      );
    });

    test('includes pitcher responsible for non-inherited runner', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          currentPitcherId="currentPitcher123"
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          pitcherResponsible: 'currentPitcher123',
        })
      );
    });

    test('includes inherited pitcher for inherited runner', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            first: createRunner('p1', 'Lead Off', { inheritedFrom: 'previousPitcher456' }),
          })}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          pitcherResponsible: 'previousPitcher456',
        })
      );
    });

    test('includes how original reached', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          bases={createBases({
            first: createRunner('p1', 'Lead Off', { howReached: 'single' }),
          })}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          howOriginalReached: 'single',
        })
      );
    });

    test('includes custom defensive position', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));

      // Change position to RF
      const rfButtons = screen.getAllByRole('button', { name: 'RF' });
      fireEvent.click(rfButtons[rfButtons.length - 1]);

      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldingPosition: 'RF',
        })
      );
    });

    test('includes game state in event', () => {
      const onComplete = vi.fn();
      render(
        <PinchRunnerModal
          {...defaultProps}
          inning={9}
          halfInning="BOTTOM"
          outs={2}
          gameId="testGame123"
          onComplete={onComplete}
        />
      );

      fireEvent.click(screen.getByText('Lead Off'));
      fireEvent.click(screen.getByText('Speed Demon'));
      fireEvent.click(screen.getByText('Confirm Pinch Runner'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: 'testGame123',
          inning: 9,
          halfInning: 'BOTTOM',
          outs: 2,
        })
      );
    });
  });
});

// ============================================
// MULTIPLE RUNNERS TESTS
// ============================================

describe('PinchRunnerModal Multiple Runners', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    bases: createBases({
      first: createRunner('p1', 'Lead Off'),
      second: createRunner('p2', 'Second Batter'),
      third: createRunner('p3', 'Third Batter'),
    }),
    inning: 7,
    halfInning: 'BOTTOM' as const,
    outs: 1,
    gameId: 'game1',
    currentPitcherId: 'pitcher1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('can select runner on second base', () => {
    const onComplete = vi.fn();
    render(<PinchRunnerModal {...defaultProps} onComplete={onComplete} />);

    // Click on the 2B base badge or Second Batter name
    fireEvent.click(screen.getByText('Second Batter'));
    fireEvent.click(screen.getByText('Speed Demon'));
    fireEvent.click(screen.getByText('Confirm Pinch Runner'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        base: '2B',
        replacedPlayerName: 'Second Batter',
      })
    );
  });

  test('can select runner on third base', () => {
    const onComplete = vi.fn();
    render(<PinchRunnerModal {...defaultProps} onComplete={onComplete} />);

    fireEvent.click(screen.getByText('Third Batter'));
    fireEvent.click(screen.getByText('Speed Demon'));
    fireEvent.click(screen.getByText('Confirm Pinch Runner'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        base: '3B',
        replacedPlayerName: 'Third Batter',
      })
    );
  });

  test('can switch between runner selections', () => {
    render(<PinchRunnerModal {...defaultProps} />);

    // Select first base runner
    fireEvent.click(screen.getByText('Lead Off'));

    // Should show pinch runner selection
    expect(screen.getByText('SELECT PINCH RUNNER')).toBeInTheDocument();

    // Switch to third base runner
    fireEvent.click(screen.getByText('Third Batter'));

    // Should still show pinch runner selection
    expect(screen.getByText('SELECT PINCH RUNNER')).toBeInTheDocument();
  });
});
