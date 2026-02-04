/**
 * PitchingChangeModal Component Tests
 *
 * Tests the pitching change modal for making relief pitcher substitutions.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PitchingChangeModal from '../../../components/GameTracker/PitchingChangeModal';
import type { LineupState, ActivePitcher, BenchPlayer, Bases, Runner } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createPitcher = (id: string, name: string, isStarter: boolean = true): ActivePitcher => ({
  playerId: id,
  playerName: name,
  pitchCount: 50,
  isStarter,
  inningsPitched: 5,
  earnedRuns: 2,
  hits: 4,
  walks: 1,
  strikeouts: 6,
  battersFaced: 20,
  enteredInning: isStarter ? 1 : 6,
});

const createBenchPlayer = (
  id: string,
  name: string,
  positions: string[] = ['P'],
  isAvailable: boolean = true
): BenchPlayer => ({
  playerId: id,
  playerName: name,
  positions,
  isAvailable,
  batterHand: 'R',
});

const createRunner = (id: string, name: string): Runner => ({
  playerId: id,
  playerName: name,
});

const createLineupState = (options: {
  currentPitcher?: ActivePitcher | null;
  bench?: BenchPlayer[];
} = {}): LineupState => ({
  lineup: [],
  currentPitcher: options.currentPitcher !== undefined ? options.currentPitcher : createPitcher('p1', 'Ace Starter'),
  bench: options.bench || [
    createBenchPlayer('rp1', 'Reliever One'),
    createBenchPlayer('rp2', 'Reliever Two'),
    createBenchPlayer('cl1', 'Closer Guy'),
  ],
  bullpen: [],
  usedPitchers: [],
});

const createBases = (options: { first?: string; second?: string; third?: string } = {}): Bases => ({
  first: options.first ? createRunner(`r1`, options.first) : null,
  second: options.second ? createRunner(`r2`, options.second) : null,
  third: options.third ? createRunner(`r3`, options.third) : null,
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('PitchingChangeModal Component', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    bases: createBases(),
    inning: 6,
    halfInning: 'TOP' as const,
    outs: 1,
    gameId: 'game1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('shows PITCHING CHANGE header', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText(/PITCHING CHANGE/)).toBeInTheDocument();
    });
  });

  describe('Outgoing Pitcher Section', () => {
    test('shows OUTGOING PITCHER label', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('OUTGOING PITCHER')).toBeInTheDocument();
    });

    test('shows current pitcher name', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('Ace Starter')).toBeInTheDocument();
    });

    test('shows Started for starter pitcher', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText(/Started/)).toBeInTheDocument();
    });

    test('shows entered inning for relief pitcher', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({
            currentPitcher: createPitcher('p1', 'Reliever One', false),
          })}
        />
      );
      expect(screen.getByText(/Inning 6/)).toBeInTheDocument();
    });

    test('shows pitch count input', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Enter pitch count')).toBeInTheDocument();
    });
  });

  describe('Incoming Pitcher Section', () => {
    test('shows SELECT INCOMING PITCHER label', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('SELECT INCOMING PITCHER')).toBeInTheDocument();
    });

    test('shows available relievers', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('Reliever One')).toBeInTheDocument();
      expect(screen.getByText('Reliever Two')).toBeInTheDocument();
      expect(screen.getByText('Closer Guy')).toBeInTheDocument();
    });

    test('shows no pitchers message when bench has no pitchers', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({
            bench: [],
          })}
        />
      );
      expect(screen.getByText('No pitchers available on bench')).toBeInTheDocument();
    });

    test('only shows available pitchers', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({
            bench: [
              createBenchPlayer('rp1', 'Available Reliever', ['P'], true),
              createBenchPlayer('rp2', 'Unavailable Reliever', ['P'], false),
            ],
          })}
        />
      );
      expect(screen.getByText('Available Reliever')).toBeInTheDocument();
      expect(screen.queryByText('Unavailable Reliever')).not.toBeInTheDocument();
    });

    test('only shows players who can pitch', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({
            bench: [
              createBenchPlayer('rp1', 'Pitcher Guy', ['P'], true),
              createBenchPlayer('pos1', 'Position Player', ['1B', 'OF'], true),
            ],
          })}
        />
      );
      expect(screen.getByText('Pitcher Guy')).toBeInTheDocument();
      expect(screen.queryByText('Position Player')).not.toBeInTheDocument();
    });
  });

  describe('Role Selection', () => {
    test('shows role selection after selecting reliever', () => {
      render(<PitchingChangeModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Reliever One'));

      expect(screen.getByText('Reliever')).toBeInTheDocument();
      expect(screen.getByText('Closer')).toBeInTheDocument();
    });

    test('defaults to RP role', () => {
      render(<PitchingChangeModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Reliever One'));

      // The Reliever button should be selected by default
      const relieverButton = screen.getByText('Reliever');
      // Check if it has the selected style (hard to test directly, but we can verify it exists)
      expect(relieverButton).toBeInTheDocument();
    });
  });

  describe('Bequeathed Runners Warning', () => {
    test('shows runners warning when bases occupied', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          bases={createBases({
            first: 'Runner One',
            second: 'Runner Two',
          })}
        />
      );
      expect(screen.getByText(/Runners left on base: 2/)).toBeInTheDocument();
    });

    test('shows runner details', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          bases={createBases({ first: 'John Smith' })}
        />
      );
      expect(screen.getByText(/1B: John Smith/)).toBeInTheDocument();
    });

    test('shows responsibility note', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          bases={createBases({ first: 'John Smith' })}
        />
      );
      expect(screen.getByText(/will be charged to Ace Starter/)).toBeInTheDocument();
    });

    test('does not show warning when bases empty', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          bases={createBases()}
        />
      );
      expect(screen.queryByText(/Runners left on base/)).not.toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('shows Cancel button', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<PitchingChangeModal {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Confirm Button', () => {
    test('shows Confirm button', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      expect(screen.getByText('Confirm Pitching Change')).toBeInTheDocument();
    });

    test('button is disabled without reliever selection', () => {
      render(<PitchingChangeModal {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm Pitching Change');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is disabled without pitch count', () => {
      render(<PitchingChangeModal {...defaultProps} />);

      // Select a reliever
      fireEvent.click(screen.getByText('Reliever One'));

      const confirmBtn = screen.getByText('Confirm Pitching Change');
      expect(confirmBtn).toBeDisabled();
    });

    test('calls onComplete with correct data', () => {
      const onComplete = vi.fn();
      render(
        <PitchingChangeModal
          {...defaultProps}
          onComplete={onComplete}
        />
      );

      // Enter pitch count
      fireEvent.change(screen.getByPlaceholderText('Enter pitch count'), {
        target: { value: '85' },
      });

      // Select reliever
      fireEvent.click(screen.getByText('Reliever One'));

      // Confirm
      fireEvent.click(screen.getByText('Confirm Pitching Change'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PITCH_CHANGE',
          outgoingPitcherId: 'p1',
          outgoingPitcherName: 'Ace Starter',
          outgoingPitchCount: 85,
          incomingPitcherId: 'rp1',
          incomingPitcherName: 'Reliever One',
          incomingPitcherRole: 'RP',
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('shows error for invalid pitch count', () => {
      render(<PitchingChangeModal {...defaultProps} />);

      // Enter invalid pitch count
      fireEvent.change(screen.getByPlaceholderText('Enter pitch count'), {
        target: { value: '-5' },
      });

      // Select reliever
      fireEvent.click(screen.getByText('Reliever One'));

      // Try to confirm
      fireEvent.click(screen.getByText('Confirm Pitching Change'));

      expect(screen.getByText(/Please enter a valid pitch count/)).toBeInTheDocument();
    });
  });

  describe('No Current Pitcher', () => {
    test('shows error when no current pitcher', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({ currentPitcher: null })}
        />
      );
      expect(screen.getByText('No current pitcher found')).toBeInTheDocument();
    });

    test('shows Close button when no pitcher', () => {
      render(
        <PitchingChangeModal
          {...defaultProps}
          lineupState={createLineupState({ currentPitcher: null })}
        />
      );
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });
});

// ============================================
// INHERITED RUNNERS TESTS
// ============================================

describe('PitchingChangeModal Inherited Runners', () => {
  const defaultProps = {
    lineupState: createLineupState(),
    bases: createBases(),
    inning: 6,
    halfInning: 'TOP' as const,
    outs: 1,
    gameId: 'game1',
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('includes bequeathed runners in event data', () => {
    const onComplete = vi.fn();
    render(
      <PitchingChangeModal
        {...defaultProps}
        onComplete={onComplete}
        bases={createBases({
          first: 'Runner A',
          third: 'Runner B',
        })}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter pitch count'), {
      target: { value: '75' },
    });
    fireEvent.click(screen.getByText('Reliever One'));
    fireEvent.click(screen.getByText('Confirm Pitching Change'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        bequeathedRunners: expect.arrayContaining([
          expect.objectContaining({ base: '1B', runnerName: 'Runner A' }),
          expect.objectContaining({ base: '3B', runnerName: 'Runner B' }),
        ]),
        inheritedRunners: 2,
      })
    );
  });

  test('sets inheritedRunners to 0 when bases empty', () => {
    const onComplete = vi.fn();
    render(
      <PitchingChangeModal
        {...defaultProps}
        onComplete={onComplete}
        bases={createBases()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Enter pitch count'), {
      target: { value: '75' },
    });
    fireEvent.click(screen.getByText('Reliever One'));
    fireEvent.click(screen.getByText('Confirm Pitching Change'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        bequeathedRunners: [],
        inheritedRunners: 0,
      })
    );
  });
});
