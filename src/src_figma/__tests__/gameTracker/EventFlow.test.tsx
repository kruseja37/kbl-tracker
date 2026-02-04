/**
 * EventFlow Component Tests
 *
 * Tests the EventFlow React component that handles runner events
 * (stolen bases, caught stealing, wild pitches, passed balls, pickoffs).
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventFlow from '../../../components/GameTracker/EventFlow';
import type { Bases, Runner, GameEvent } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createRunner = (name: string, id: string = 'p1'): Runner => ({
  playerId: id,
  playerName: name,
});

const createBases = (options: { first?: string; second?: string; third?: string } = {}): Bases => ({
  first: options.first ? createRunner(options.first, 'p1') : null,
  second: options.second ? createRunner(options.second, 'p2') : null,
  third: options.third ? createRunner(options.third, 'p3') : null,
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('EventFlow Component', () => {
  const defaultProps = {
    event: 'SB' as GameEvent,
    bases: createBases({ first: 'John Smith' }),
    onComplete: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Event Title Display', () => {
    test('shows Stolen Base title for SB event', () => {
      render(<EventFlow {...defaultProps} event="SB" />);
      expect(screen.getByText('Stolen Base')).toBeInTheDocument();
    });

    test('shows Caught Stealing title for CS event', () => {
      render(<EventFlow {...defaultProps} event="CS" />);
      expect(screen.getByText('Caught Stealing')).toBeInTheDocument();
    });

    test('shows Wild Pitch title for WP event', () => {
      render(<EventFlow {...defaultProps} event="WP" />);
      expect(screen.getByText('Wild Pitch')).toBeInTheDocument();
    });

    test('shows Passed Ball title for PB event', () => {
      render(<EventFlow {...defaultProps} event="PB" />);
      expect(screen.getByText('Passed Ball')).toBeInTheDocument();
    });

    test('shows Pickoff title for PK event', () => {
      render(<EventFlow {...defaultProps} event="PK" />);
      expect(screen.getByText('Pickoff')).toBeInTheDocument();
    });
  });

  describe('Runner Selection', () => {
    test('shows runner on first base', () => {
      render(
        <EventFlow
          {...defaultProps}
          bases={createBases({ first: 'John Smith' })}
        />
      );
      expect(screen.getByText(/Smith.*1B/)).toBeInTheDocument();
    });

    test('shows runner on second base', () => {
      render(
        <EventFlow
          {...defaultProps}
          bases={createBases({ second: 'Mike Johnson' })}
        />
      );
      expect(screen.getByText(/Johnson.*2B/)).toBeInTheDocument();
    });

    test('shows runner on third base', () => {
      render(
        <EventFlow
          {...defaultProps}
          bases={createBases({ third: 'Tom Williams' })}
        />
      );
      expect(screen.getByText(/Williams.*3B/)).toBeInTheDocument();
    });

    test('shows multiple runners when bases loaded', () => {
      render(
        <EventFlow
          {...defaultProps}
          bases={createBases({
            first: 'John Smith',
            second: 'Mike Johnson',
            third: 'Tom Williams',
          })}
        />
      );
      expect(screen.getByText(/Smith.*1B/)).toBeInTheDocument();
      expect(screen.getByText(/Johnson.*2B/)).toBeInTheDocument();
      expect(screen.getByText(/Williams.*3B/)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('renders cancel button', () => {
      render(<EventFlow {...defaultProps} />);
      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    test('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<EventFlow {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('✕'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Submit Button', () => {
    test('renders confirm button', () => {
      render(<EventFlow {...defaultProps} />);
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    test('confirm button is disabled initially', () => {
      render(<EventFlow {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm');
      expect(confirmBtn).toBeDisabled();
    });
  });
});

// ============================================
// STOLEN BASE OUTCOMES
// ============================================

describe('EventFlow Stolen Base Outcomes', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Runner from First', () => {
    test('shows To 2nd, To 3rd, and Out options', () => {
      render(
        <EventFlow
          event="SB"
          bases={createBases({ first: 'John Smith' })}
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      // Click to select runner
      fireEvent.click(screen.getByText(/Smith.*1B/));

      expect(screen.getByText('To 2nd')).toBeInTheDocument();
      expect(screen.getByText('To 3rd')).toBeInTheDocument();
      expect(screen.getByText('Out')).toBeInTheDocument();
    });
  });

  describe('Runner from Second', () => {
    test('shows To 3rd, Scores, and Out options', () => {
      render(
        <EventFlow
          event="SB"
          bases={createBases({ second: 'Mike Johnson' })}
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Johnson.*2B/));

      expect(screen.getByText('To 3rd')).toBeInTheDocument();
      expect(screen.getByText('Scores')).toBeInTheDocument();
      expect(screen.getByText('Out')).toBeInTheDocument();
    });
  });

  describe('Runner from Third', () => {
    test('shows Scores and Out at Home options', () => {
      render(
        <EventFlow
          event="SB"
          bases={createBases({ third: 'Tom Williams' })}
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Williams.*3B/));

      expect(screen.getByText('Scores')).toBeInTheDocument();
      expect(screen.getByText('Out at Home')).toBeInTheDocument();
    });
  });
});

// ============================================
// CAUGHT STEALING / PICKOFF
// ============================================

describe('EventFlow Caught Stealing / Pickoff', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('CS only shows Out option', () => {
    render(
      <EventFlow
        event="CS"
        bases={createBases({ first: 'John Smith' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Smith.*1B/));

    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.queryByText('To 2nd')).not.toBeInTheDocument();
    expect(screen.queryByText('Scores')).not.toBeInTheDocument();
  });

  test('PK only shows Out option', () => {
    render(
      <EventFlow
        event="PK"
        bases={createBases({ second: 'Mike Johnson' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Johnson.*2B/));

    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.queryByText('To 3rd')).not.toBeInTheDocument();
    expect(screen.queryByText('Scores')).not.toBeInTheDocument();
  });
});

// ============================================
// WILD PITCH / PASSED BALL
// ============================================

describe('EventFlow Wild Pitch / Passed Ball', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Wild Pitch from First', () => {
    test('shows advance options but no Out option', () => {
      render(
        <EventFlow
          event="WP"
          bases={createBases({ first: 'John Smith' })}
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Smith.*1B/));

      expect(screen.getByText('To 2nd')).toBeInTheDocument();
      expect(screen.getByText('To 3rd')).toBeInTheDocument();
      expect(screen.queryByText('Out')).not.toBeInTheDocument();
    });
  });

  describe('Passed Ball from Third', () => {
    test('shows Scores option but no Out option', () => {
      render(
        <EventFlow
          event="PB"
          bases={createBases({ third: 'Tom Williams' })}
          onComplete={onComplete}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Williams.*3B/));

      expect(screen.getByText('Scores')).toBeInTheDocument();
      expect(screen.queryByText('Out')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// COMPLETE FLOW INTERACTIONS
// ============================================

describe('EventFlow Complete Interaction', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('completes stolen base from first to second', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ first: 'John Smith' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    // Select runner
    fireEvent.click(screen.getByText(/Smith.*1B/));

    // Select outcome
    fireEvent.click(screen.getByText('To 2nd'));

    // Confirm
    fireEvent.click(screen.getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledWith({
      event: 'SB',
      runner: 'first',
      outcome: 'ADVANCE',
      toBase: 'second',
    });
  });

  test('completes stolen base scoring from third', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ third: 'Tom Williams' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Williams.*3B/));
    fireEvent.click(screen.getByText('Scores'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledWith({
      event: 'SB',
      runner: 'third',
      outcome: 'SCORE',
      toBase: 'home',
    });
  });

  test('completes caught stealing', () => {
    render(
      <EventFlow
        event="CS"
        bases={createBases({ first: 'John Smith' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Smith.*1B/));
    fireEvent.click(screen.getByText('Out'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledWith({
      event: 'CS',
      runner: 'first',
      outcome: 'OUT',
      toBase: undefined,
    });
  });

  test('completes wild pitch advance from second to third', () => {
    render(
      <EventFlow
        event="WP"
        bases={createBases({ second: 'Mike Johnson' })}
        onComplete={onComplete}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Johnson.*2B/));
    fireEvent.click(screen.getByText('To 3rd'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(onComplete).toHaveBeenCalledWith({
      event: 'WP',
      runner: 'second',
      outcome: 'ADVANCE',
      toBase: 'third',
    });
  });
});

// ============================================
// RUNNER NAME FORMATTING
// ============================================

describe('EventFlow Runner Name Formatting', () => {
  test('extracts last name from full name', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ first: 'Juan Carlos Rodriguez' })}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Rodriguez.*1B/)).toBeInTheDocument();
  });

  test('handles single name', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ first: 'Cher' })}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Cher.*1B/)).toBeInTheDocument();
  });

  test('handles hyphenated last name', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ first: 'Mary Johnson-Smith' })}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/Johnson-Smith.*1B/)).toBeInTheDocument();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('EventFlow Edge Cases', () => {
  test('handles no runners (should show nothing)', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases()}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByText(/1B/)).not.toBeInTheDocument();
    expect(screen.queryByText(/2B/)).not.toBeInTheDocument();
    expect(screen.queryByText(/3B/)).not.toBeInTheDocument();
  });

  test('changing runner selection clears outcome', () => {
    render(
      <EventFlow
        event="SB"
        bases={createBases({ first: 'John Smith', second: 'Mike Johnson' })}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Select first runner and outcome
    fireEvent.click(screen.getByText(/Smith.*1B/));
    fireEvent.click(screen.getByText('To 2nd'));

    // Select different runner - should clear outcome
    fireEvent.click(screen.getByText(/Johnson.*2B/));

    // Confirm should be disabled because outcome was cleared
    expect(screen.getByText('Confirm')).toBeDisabled();
  });
});
