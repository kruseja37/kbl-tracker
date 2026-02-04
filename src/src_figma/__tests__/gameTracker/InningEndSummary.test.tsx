/**
 * InningEndSummary Component Tests
 *
 * Tests the InningEndSummary modal that displays at the end of each half-inning.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InningEndSummary from '../../../components/GameTracker/InningEndSummary';

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('InningEndSummary Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    inning: 5,
    halfInning: 'TOP' as const,
    teamName: 'Tigers',
    runs: 2,
    hits: 4,
    lob: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    test('renders when isOpen is true', () => {
      render(<InningEndSummary {...defaultProps} isOpen={true} />);
      expect(screen.getByText('End of Top 5')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<InningEndSummary {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('End of Top 5')).not.toBeInTheDocument();
    });
  });

  describe('Header Display', () => {
    test('shows correct inning label for TOP', () => {
      render(<InningEndSummary {...defaultProps} halfInning="TOP" inning={3} />);
      expect(screen.getByText('End of Top 3')).toBeInTheDocument();
    });

    test('shows correct inning label for BOTTOM', () => {
      render(<InningEndSummary {...defaultProps} halfInning="BOTTOM" inning={7} />);
      expect(screen.getByText('End of Bottom 7')).toBeInTheDocument();
    });

    test('shows close button', () => {
      render(<InningEndSummary {...defaultProps} />);
      expect(screen.getByText('×')).toBeInTheDocument();
    });

    test('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<InningEndSummary {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('×'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Team Name Display', () => {
    test('shows team name', () => {
      render(<InningEndSummary {...defaultProps} teamName="Moonstars" />);
      expect(screen.getByText('Moonstars')).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    test('shows runs stat', () => {
      render(<InningEndSummary {...defaultProps} runs={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('RUNS')).toBeInTheDocument();
    });

    test('shows hits stat', () => {
      render(<InningEndSummary {...defaultProps} hits={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('HITS')).toBeInTheDocument();
    });

    test('shows LOB stat', () => {
      render(<InningEndSummary {...defaultProps} lob={2} />);
      // LOB value
      expect(screen.getByText('LOB')).toBeInTheDocument();
    });

    test('shows errors when present', () => {
      render(<InningEndSummary {...defaultProps} errors={1} />);
      expect(screen.getByText('ERRORS')).toBeInTheDocument();
    });

    test('does not show errors when zero', () => {
      render(<InningEndSummary {...defaultProps} errors={0} />);
      expect(screen.queryByText('ERRORS')).not.toBeInTheDocument();
    });
  });

  describe('Summary Messages', () => {
    test('shows "Quick inning!" when 0 runs and 0 hits', () => {
      render(<InningEndSummary {...defaultProps} runs={0} hits={0} />);
      expect(screen.getByText('Quick inning!')).toBeInTheDocument();
    });

    test('shows "Big inning!" when 3+ runs', () => {
      render(<InningEndSummary {...defaultProps} runs={3} />);
      expect(screen.getByText('Big inning!')).toBeInTheDocument();
    });

    test('shows "Big inning!" for 5 runs', () => {
      render(<InningEndSummary {...defaultProps} runs={5} />);
      expect(screen.getByText('Big inning!')).toBeInTheDocument();
    });

    test('no special message for 1-2 runs', () => {
      render(<InningEndSummary {...defaultProps} runs={2} hits={3} />);
      expect(screen.queryByText('Quick inning!')).not.toBeInTheDocument();
      expect(screen.queryByText('Big inning!')).not.toBeInTheDocument();
    });
  });

  describe('Auto-Hide Timer', () => {
    test('calls onClose after autoHideMs', () => {
      const onClose = vi.fn();
      render(<InningEndSummary {...defaultProps} onClose={onClose} autoHideMs={3000} />);

      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(onClose).toHaveBeenCalled();
    });

    test('does not auto-hide when autoHideMs is 0', () => {
      const onClose = vi.fn();
      render(<InningEndSummary {...defaultProps} onClose={onClose} autoHideMs={0} />);

      vi.advanceTimersByTime(5000);

      expect(onClose).not.toHaveBeenCalled();
    });

    test('uses default autoHideMs of 3000', () => {
      const onClose = vi.fn();
      render(<InningEndSummary {...defaultProps} onClose={onClose} />);

      vi.advanceTimersByTime(2999);
      expect(onClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(onClose).toHaveBeenCalled();
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('InningEndSummary Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('handles high run totals', () => {
    render(
      <InningEndSummary
        isOpen={true}
        onClose={vi.fn()}
        inning={1}
        halfInning="TOP"
        teamName="Team"
        runs={10}
        hits={12}
        lob={3}
      />
    );
    expect(screen.getByText('Big inning!')).toBeInTheDocument();
  });

  test('handles 9th inning', () => {
    render(
      <InningEndSummary
        isOpen={true}
        onClose={vi.fn()}
        inning={9}
        halfInning="BOTTOM"
        teamName="Team"
        runs={0}
        hits={0}
        lob={0}
      />
    );
    expect(screen.getByText('End of Bottom 9')).toBeInTheDocument();
  });

  test('handles extra innings', () => {
    render(
      <InningEndSummary
        isOpen={true}
        onClose={vi.fn()}
        inning={12}
        halfInning="TOP"
        teamName="Team"
        runs={1}
        hits={2}
        lob={1}
      />
    );
    expect(screen.getByText('End of Top 12')).toBeInTheDocument();
  });

  test('handles long team name', () => {
    render(
      <InningEndSummary
        isOpen={true}
        onClose={vi.fn()}
        inning={1}
        halfInning="TOP"
        teamName="The Super Long Team Name That Goes On Forever"
        runs={0}
        hits={0}
        lob={0}
      />
    );
    expect(screen.getByText('The Super Long Team Name That Goes On Forever')).toBeInTheDocument();
  });

  test('handles multiple errors', () => {
    render(
      <InningEndSummary
        isOpen={true}
        onClose={vi.fn()}
        inning={1}
        halfInning="TOP"
        teamName="Team"
        runs={2}
        hits={1}
        lob={0}
        errors={3}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('ERRORS')).toBeInTheDocument();
  });
});
