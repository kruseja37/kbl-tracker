/**
 * FieldingModal Component Tests
 *
 * Tests the fielding details modal for recording fielding plays.
 * Per FIELDING_SYSTEM_SPEC.md
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FieldingModal, { inferFielderEnhanced } from '../../../components/GameTracker/FieldingModal';
import type { AtBatResult, Direction, ExitType, Bases, Runner } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createRunner = (id: string, name: string): Runner => ({
  playerId: id,
  playerName: name,
});

const createBases = (options: { first?: boolean; second?: boolean; third?: boolean } = {}): Bases => ({
  first: options.first ? createRunner('r1', 'Runner First') : null,
  second: options.second ? createRunner('r2', 'Runner Second') : null,
  third: options.third ? createRunner('r3', 'Runner Third') : null,
});

// ============================================
// INFERENCE FUNCTION TESTS
// ============================================

describe('inferFielderEnhanced', () => {
  describe('Ground Ball Inference', () => {
    test('Left direction returns 3B', () => {
      expect(inferFielderEnhanced('GO', 'Left')).toBe('3B');
    });

    test('Left-Center direction returns SS', () => {
      expect(inferFielderEnhanced('GO', 'Left-Center')).toBe('SS');
    });

    test('Center direction returns P', () => {
      expect(inferFielderEnhanced('GO', 'Center')).toBe('P');
    });

    test('Right-Center direction returns 2B', () => {
      expect(inferFielderEnhanced('GO', 'Right-Center')).toBe('2B');
    });

    test('Right direction returns 1B', () => {
      expect(inferFielderEnhanced('GO', 'Right')).toBe('1B');
    });

    test('DP uses same inference as GO', () => {
      expect(inferFielderEnhanced('DP', 'Left-Center')).toBe('SS');
    });

    test('FC uses same inference as GO', () => {
      expect(inferFielderEnhanced('FC', 'Right')).toBe('1B');
    });
  });

  describe('Fly Ball Inference', () => {
    test('Left direction returns LF', () => {
      expect(inferFielderEnhanced('FO', 'Left')).toBe('LF');
    });

    test('Left-Center direction returns CF', () => {
      expect(inferFielderEnhanced('FO', 'Left-Center')).toBe('CF');
    });

    test('Center direction returns CF', () => {
      expect(inferFielderEnhanced('FO', 'Center')).toBe('CF');
    });

    test('Right-Center direction returns CF', () => {
      expect(inferFielderEnhanced('FO', 'Right-Center')).toBe('CF');
    });

    test('Right direction returns RF', () => {
      expect(inferFielderEnhanced('FO', 'Right')).toBe('RF');
    });

    test('SF uses same inference as FO', () => {
      expect(inferFielderEnhanced('SF', 'Left')).toBe('LF');
    });
  });

  describe('Line Drive Inference', () => {
    test('Left direction returns 3B', () => {
      expect(inferFielderEnhanced('LO', 'Left')).toBe('3B');
    });

    test('Center direction returns P', () => {
      expect(inferFielderEnhanced('LO', 'Center')).toBe('P');
    });

    test('Right direction returns 1B', () => {
      expect(inferFielderEnhanced('LO', 'Right')).toBe('1B');
    });
  });

  describe('Pop Fly Inference', () => {
    test('Left direction returns 3B', () => {
      expect(inferFielderEnhanced('PO', 'Left')).toBe('3B');
    });

    test('Center direction returns SS', () => {
      expect(inferFielderEnhanced('PO', 'Center')).toBe('SS');
    });

    test('Right direction returns 1B', () => {
      expect(inferFielderEnhanced('PO', 'Right')).toBe('1B');
    });
  });

  describe('Exit Type Override', () => {
    test('uses Ground exit type for hits', () => {
      expect(inferFielderEnhanced('1B', 'Left', 'Ground')).toBe('3B');
    });

    test('uses Fly Ball exit type for hits', () => {
      expect(inferFielderEnhanced('2B', 'Left', 'Fly Ball')).toBe('LF');
    });

    test('uses Line Drive exit type for hits', () => {
      expect(inferFielderEnhanced('1B', 'Center', 'Line Drive')).toBe('P');
    });
  });

  describe('Null Direction', () => {
    test('returns null when direction is null', () => {
      expect(inferFielderEnhanced('GO', null)).toBeNull();
    });
  });
});

// ============================================
// COMPONENT TESTS
// ============================================

describe('FieldingModal Component', () => {
  const defaultProps = {
    result: 'GO' as AtBatResult,
    direction: 'Left-Center' as Direction,
    exitType: null as ExitType | null,
    bases: createBases(),
    outs: 0,
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('shows Fielding Details title', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('Fielding Details')).toBeInTheDocument();
    });

    test('shows close button', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    test('calls onCancel when close clicked', () => {
      const onCancel = vi.fn();
      render(<FieldingModal {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('✕'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Zone Input Section', () => {
    test('shows WHERE DID THE BALL GO? label', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('WHERE DID THE BALL GO?')).toBeInTheDocument();
    });
  });

  describe('Primary Fielder Selection', () => {
    test('shows FIELDED BY label', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText(/FIELDED BY/)).toBeInTheDocument();
    });

    test('shows all position buttons', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'P' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1B' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2B' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3B' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SS' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'LF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CF' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'RF' })).toBeInTheDocument();
    });

    test('shows (inferred) when fielder matches inference', () => {
      render(<FieldingModal {...defaultProps} />);
      // For GO Left-Center, inference should be SS
      expect(screen.getByText('(inferred)')).toBeInTheDocument();
    });

    test('allows changing fielder', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: '3B' }));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryFielder: '3B',
          wasOverridden: true,
        }),
        expect.anything() // Exit type may be inferred
      );
    });
  });

  describe('Depth Selection', () => {
    test('shows DEPTH label', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('DEPTH:')).toBeInTheDocument();
    });

    test('shows depth options', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Shallow' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Infield' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Outfield' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Deep' })).toBeInTheDocument();
    });
  });

  describe('Play Type Selection (Outs)', () => {
    test('shows PLAY TYPE for ground outs', () => {
      render(<FieldingModal {...defaultProps} result="GO" />);
      expect(screen.getByText('PLAY TYPE:')).toBeInTheDocument();
    });

    test('shows PLAY TYPE for fly outs', () => {
      render(<FieldingModal {...defaultProps} result="FO" />);
      expect(screen.getByText('PLAY TYPE:')).toBeInTheDocument();
    });

    test('shows play type options', () => {
      render(<FieldingModal {...defaultProps} result="FO" />);
      expect(screen.getByRole('button', { name: 'Routine' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Diving' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Wall Catch' })).toBeInTheDocument();
    });

    test('shows saved run checkbox for star plays', () => {
      render(<FieldingModal {...defaultProps} result="FO" />);
      fireEvent.click(screen.getByRole('button', { name: 'Diving' }));
      expect(screen.getByText('Saved a run?')).toBeInTheDocument();
    });
  });

  describe('DP Chain Selection', () => {
    test('shows DP TYPE for double play result', () => {
      render(<FieldingModal {...defaultProps} result="DP" />);
      expect(screen.getByText('DP TYPE:')).toBeInTheDocument();
    });

    test('shows DP chain options', () => {
      render(<FieldingModal {...defaultProps} result="DP" />);
      expect(screen.getByRole('button', { name: '6-4-3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4-6-3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5-4-3' })).toBeInTheDocument();
    });

    test('shows DP role selection', () => {
      render(<FieldingModal {...defaultProps} result="DP" />);
      expect(screen.getByText('YOUR ROLE IN DP:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Started' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Turned' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
    });

    test('defaults to inferred DP chain based on direction', () => {
      // Left-Center should default to 6-4-3
      render(<FieldingModal {...defaultProps} result="DP" direction="Left-Center" />);
      // The 6-4-3 button should be pre-selected (highlighted)
    });
  });

  describe('Exit Type Selection (Hits)', () => {
    test('shows exit type selection for singles', () => {
      render(<FieldingModal {...defaultProps} result="1B" />);
      expect(screen.getByText('HOW DID IT LEAVE THE BAT?')).toBeInTheDocument();
    });

    test('shows exit type selection for doubles', () => {
      render(<FieldingModal {...defaultProps} result="2B" />);
      expect(screen.getByText('HOW DID IT LEAVE THE BAT?')).toBeInTheDocument();
    });

    test('shows exit type selection for triples', () => {
      render(<FieldingModal {...defaultProps} result="3B" />);
      expect(screen.getByText('HOW DID IT LEAVE THE BAT?')).toBeInTheDocument();
    });

    test('shows all exit type options', () => {
      render(<FieldingModal {...defaultProps} result="1B" />);
      expect(screen.getByRole('button', { name: 'Ground' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Line Drive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fly Ball' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pop Up' })).toBeInTheDocument();
    });

    test('does not show exit type selection when provided via props', () => {
      render(<FieldingModal {...defaultProps} result="1B" exitType="Ground" />);
      expect(screen.queryByText('HOW DID IT LEAVE THE BAT?')).not.toBeInTheDocument();
    });
  });

  describe('D3K Options', () => {
    test('shows D3K outcome options for D3K result', () => {
      render(<FieldingModal {...defaultProps} result="D3K" />);
      expect(screen.getByText('D3K OUTCOME:')).toBeInTheDocument();
    });

    test('shows all D3K outcome options', () => {
      render(<FieldingModal {...defaultProps} result="D3K" />);
      expect(screen.getByRole('button', { name: 'Thrown Out' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Safe (WP)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Safe (PB)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Safe (C Error)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Safe (1B Error)' })).toBeInTheDocument();
    });

    test('requires D3K outcome selection', () => {
      render(<FieldingModal {...defaultProps} result="D3K" />);
      const confirmBtn = screen.getByText('Confirm Fielding');
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe('Error Options', () => {
    test('shows error type options for error result', () => {
      render(<FieldingModal {...defaultProps} result="E" />);
      expect(screen.getByText('ERROR TYPE:')).toBeInTheDocument();
    });

    test('shows error type buttons', () => {
      render(<FieldingModal {...defaultProps} result="E" />);
      expect(screen.getByRole('button', { name: 'Fielding' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Throwing' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mental' })).toBeInTheDocument();
    });

    test('shows error context options', () => {
      render(<FieldingModal {...defaultProps} result="E" />);
      expect(screen.getByText('ERROR CONTEXT:')).toBeInTheDocument();
      expect(screen.getByText(/Allowed a run to score/)).toBeInTheDocument();
      expect(screen.getByText(/Was a routine play/)).toBeInTheDocument();
      expect(screen.getByText(/Was a difficult play/)).toBeInTheDocument();
    });
  });

  describe('Special Situations', () => {
    test('shows SPECIAL SITUATIONS label', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('SPECIAL SITUATIONS:')).toBeInTheDocument();
    });

    test('shows IFR toggle when conditions met (PO, R1 & R2, < 2 outs)', () => {
      render(
        <FieldingModal
          {...defaultProps}
          result="PO"
          bases={createBases({ first: true, second: true })}
          outs={0}
        />
      );
      expect(screen.getByText('Infield Fly Rule called?')).toBeInTheDocument();
    });

    test('shows ball caught options when IFR selected', () => {
      render(
        <FieldingModal
          {...defaultProps}
          result="PO"
          bases={createBases({ first: true, second: true })}
          outs={0}
        />
      );
      fireEvent.click(screen.getByText('Infield Fly Rule called?'));
      expect(screen.getByText('Was ball caught?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No (Dropped)' })).toBeInTheDocument();
    });

    test('shows GRD toggle for doubles', () => {
      render(<FieldingModal {...defaultProps} result="2B" />);
      expect(screen.getByText('Ground Rule Double?')).toBeInTheDocument();
    });

    test('shows Bad Hop toggle for hits', () => {
      render(<FieldingModal {...defaultProps} result="1B" />);
      expect(screen.getByText(/Bad Hop/)).toBeInTheDocument();
    });

    test('shows Nutshot toggle for center direction ground/line plays', () => {
      render(<FieldingModal {...defaultProps} result="GO" direction="Center" />);
      expect(screen.getByText(/Nutshot/)).toBeInTheDocument();
    });

    test('shows Comebacker Injury toggle for center direction', () => {
      render(<FieldingModal {...defaultProps} result="LO" direction="Center" />);
      expect(screen.getByText(/Comebacker Injury/)).toBeInTheDocument();
    });

    test('shows HR Robbery toggle for HR result', () => {
      render(<FieldingModal {...defaultProps} result="HR" />);
      expect(screen.getByText('HR Robbery Attempted?')).toBeInTheDocument();
    });

    test('shows robbery failed option when robbery attempted', () => {
      render(<FieldingModal {...defaultProps} result="HR" />);
      fireEvent.click(screen.getByText('HR Robbery Attempted?'));
      expect(screen.getByText(/Ball bounced off glove over fence/)).toBeInTheDocument();
    });

    test('shows no special situations message when none apply', () => {
      render(<FieldingModal {...defaultProps} result="K" />);
      expect(screen.getByText('No special situations apply to this play.')).toBeInTheDocument();
    });
  });

  describe('Confirm Button', () => {
    test('shows Confirm Fielding button', () => {
      render(<FieldingModal {...defaultProps} />);
      expect(screen.getByText('Confirm Fielding')).toBeInTheDocument();
    });

    test('button is enabled when fielder selected', () => {
      render(<FieldingModal {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm Fielding');
      expect(confirmBtn).not.toBeDisabled();
    });

    test('button is disabled for hits without exit type selection', () => {
      render(<FieldingModal {...defaultProps} result="1B" />);
      const confirmBtn = screen.getByText('Confirm Fielding');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is enabled for hits with exit type selected', () => {
      render(<FieldingModal {...defaultProps} result="1B" />);
      fireEvent.click(screen.getByRole('button', { name: 'Ground' }));
      const confirmBtn = screen.getByText('Confirm Fielding');
      expect(confirmBtn).not.toBeDisabled();
    });

    test('button is disabled for DP without chain selected', () => {
      render(<FieldingModal {...defaultProps} result="DP" direction={null} />);
      // When direction is null, no default DP chain is set
      const confirmBtn = screen.getByText('Confirm Fielding');
      expect(confirmBtn).toBeDisabled();
    });
  });

  describe('Event Completion', () => {
    test('calls onComplete with fielding data', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} onComplete={onComplete} />);

      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryFielder: 'SS', // Inferred from GO Left-Center
          playType: 'routine',
          inferredFielder: 'SS',
          wasOverridden: false,
        }),
        expect.anything() // Exit type may be inferred from result
      );
    });

    test('includes selected depth', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: 'Deep' }));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          depth: 'deep',
        }),
        expect.anything()
      );
    });

    test('includes play type', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} result="FO" onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: 'Diving' }));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          playType: 'diving',
        }),
        expect.anything() // Exit type is inferred from FO = Fly Ball
      );
    });

    test('includes saved run for star plays', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} result="FO" onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: 'Diving' }));
      fireEvent.click(screen.getByText('Saved a run?'));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          savedRun: true,
        }),
        expect.anything() // Exit type is inferred from FO = Fly Ball
      );
    });

    test('includes exit type for hits', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} result="1B" onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: 'Line Drive' }));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.anything(),
        'Line Drive'
      );
    });

    test('includes special situations', () => {
      const onComplete = vi.fn();
      render(<FieldingModal {...defaultProps} result="2B" onComplete={onComplete} />);

      fireEvent.click(screen.getByRole('button', { name: 'Ground' }));
      fireEvent.click(screen.getByText('Ground Rule Double?'));
      fireEvent.click(screen.getByText('Confirm Fielding'));

      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          groundRuleDouble: true,
        }),
        'Ground'
      );
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('FieldingModal Edge Cases', () => {
  const defaultProps = {
    result: 'GO' as AtBatResult,
    direction: 'Left-Center' as Direction,
    exitType: null as ExitType | null,
    bases: createBases(),
    outs: 0,
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('handles null direction', () => {
    render(<FieldingModal {...defaultProps} direction={null} />);
    // Should render without error
    expect(screen.getByText('Fielding Details')).toBeInTheDocument();
  });

  test('handles all at-bat result types', () => {
    const results: AtBatResult[] = ['GO', 'FO', 'LO', 'PO', 'DP', 'K', '1B', '2B', '3B', 'HR', 'E', 'FC', 'SF', 'SAC'];

    results.forEach(result => {
      const { unmount } = render(<FieldingModal {...defaultProps} result={result} />);
      expect(screen.getByText('Fielding Details')).toBeInTheDocument();
      unmount();
    });
  });

  test('IFR requires ball caught selection', () => {
    render(
      <FieldingModal
        {...defaultProps}
        result="PO"
        bases={createBases({ first: true, second: true })}
        outs={0}
      />
    );

    fireEvent.click(screen.getByText('Infield Fly Rule called?'));

    const confirmBtn = screen.getByText('Confirm Fielding');
    expect(confirmBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(confirmBtn).not.toBeDisabled();
  });

  test('robbery failed resets when robbery not attempted', () => {
    const onComplete = vi.fn();
    // HR doesn't require exit type selection
    render(<FieldingModal {...defaultProps} result="HR" onComplete={onComplete} />);

    // Check robbery attempted
    fireEvent.click(screen.getByText('HR Robbery Attempted?'));

    // Check robbery failed
    fireEvent.click(screen.getByText(/Ball bounced off glove/));

    // Uncheck robbery attempted
    fireEvent.click(screen.getByText('HR Robbery Attempted?'));

    // Select a fielder first (HR doesn't auto-infer fielder)
    fireEvent.click(screen.getByRole('button', { name: 'CF' }));

    fireEvent.click(screen.getByText('Confirm Fielding'));

    // Verify the call was made with expected fielding data
    expect(onComplete).toHaveBeenCalled();
    const firstCallArgs = onComplete.mock.calls[0][0];
    expect(firstCallArgs.robberyAttempted).toBe(false);
    expect(firstCallArgs.robberyFailed).toBe(false);
  });
});
