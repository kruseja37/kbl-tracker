/**
 * WalkoffCelebration Component Tests
 *
 * Tests the walkoff celebration overlay display.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WalkoffCelebration from '../../../components/GameTracker/WalkoffCelebration';
import type { WalkoffResult } from '../../../utils/walkoffDetector';

// ============================================
// HELPERS
// ============================================

const createWalkoffResult = (overrides: Partial<WalkoffResult> = {}): WalkoffResult => ({
  isWalkoff: true,
  heroPlayerId: 'p1',
  heroName: 'John Smith',
  inning: 9,
  runsScored: 1,
  playType: 'HIT',
  ...overrides,
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('WalkoffCelebration Component', () => {
  const defaultProps = {
    walkoff: createWalkoffResult(),
    homeTeamName: 'Tigers',
    homeScore: 5,
    awayScore: 4,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    test('renders when walkoff is true', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      expect(screen.getByText('WALKOFF!')).toBeInTheDocument();
    });

    test('does not render when walkoff is false', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ isWalkoff: false })}
        />
      );
      expect(screen.queryByText('WALKOFF!')).not.toBeInTheDocument();
    });
  });

  describe('Hero Display', () => {
    test('shows HERO label', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      expect(screen.getByText('HERO')).toBeInTheDocument();
    });

    test('shows hero name', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    test('shows fame bonus for hero', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      // Fame recipient shows hero name
      expect(screen.getByText(/for John Smith/)).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    test('shows team win message', () => {
      render(<WalkoffCelebration {...defaultProps} homeTeamName="Moonstars" />);
      expect(screen.getByText('Moonstars Win!')).toBeInTheDocument();
    });

    test('shows home score', () => {
      render(<WalkoffCelebration {...defaultProps} homeScore={7} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    test('shows away score', () => {
      render(<WalkoffCelebration {...defaultProps} awayScore={6} />);
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  describe('Play Type Display', () => {
    test('shows Walkoff Homer for HR play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'HR' })}
        />
      );
      expect(screen.getByText(/Walkoff Homer/)).toBeInTheDocument();
    });

    test('shows Walkoff Hit for HIT play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'HIT' })}
        />
      );
      expect(screen.getByText(/Walkoff Hit/)).toBeInTheDocument();
    });

    test('shows Walkoff Walk for WALK play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'WALK' })}
        />
      );
      expect(screen.getByText(/Walkoff Walk/)).toBeInTheDocument();
    });

    test('shows Walkoff HBP for HBP play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'HBP' })}
        />
      );
      expect(screen.getByText(/Walkoff HBP/)).toBeInTheDocument();
    });

    test('shows Walkoff Error for ERROR play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'ERROR' })}
        />
      );
      expect(screen.getByText(/Walkoff Error/)).toBeInTheDocument();
    });

    test('shows Walkoff Sac for SAC play type', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ playType: 'SAC' })}
        />
      );
      expect(screen.getByText(/Walkoff Sac/)).toBeInTheDocument();
    });
  });

  describe('Extra Innings', () => {
    test('shows extra innings message for inning > 9', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ inning: 11 })}
        />
      );
      expect(screen.getByText(/11th Inning Thriller!/)).toBeInTheDocument();
    });

    test('does not show extra innings message for 9th inning', () => {
      render(
        <WalkoffCelebration
          {...defaultProps}
          walkoff={createWalkoffResult({ inning: 9 })}
        />
      );
      expect(screen.queryByText(/Inning Thriller/)).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    test('shows dismiss hint', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      expect(screen.getByText('Tap anywhere to continue')).toBeInTheDocument();
    });

    test('calls onDismiss when overlay clicked', () => {
      const onDismiss = vi.fn();
      render(<WalkoffCelebration {...defaultProps} onDismiss={onDismiss} />);

      // Find the overlay and click it
      const overlay = screen.getByText('WALKOFF!').closest('div')?.parentElement;
      if (overlay) {
        fireEvent.click(overlay);
      }

      // Wait for exit animation
      vi.advanceTimersByTime(500);

      expect(onDismiss).toHaveBeenCalled();
    });

    test('auto-dismisses after autoHideMs', () => {
      const onDismiss = vi.fn();
      render(
        <WalkoffCelebration
          {...defaultProps}
          onDismiss={onDismiss}
          autoHideMs={5000}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5500); // 5000 + 500 for exit animation

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Confetti Decorations', () => {
    test('shows confetti emojis', () => {
      render(<WalkoffCelebration {...defaultProps} />);
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('⚾')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });
  });
});

// ============================================
// FAME BONUS TESTS
// ============================================

describe('WalkoffCelebration Fame Bonus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows fame bonus value', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult()}
        homeTeamName="Tigers"
        homeScore={5}
        awayScore={4}
        onDismiss={vi.fn()}
      />
    );
    // Fame bonus should be shown (+ some number + Fame)
    expect(screen.getByText(/\+.*Fame/)).toBeInTheDocument();
  });

  test('shows star icon for fame', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult()}
        homeTeamName="Tigers"
        homeScore={5}
        awayScore={4}
        onDismiss={vi.fn()}
      />
    );
    // There are multiple star emojis (one in confetti, one in fame section)
    const stars = screen.getAllByText('⭐');
    expect(stars.length).toBeGreaterThan(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('WalkoffCelebration Edge Cases', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('handles walkoff grand slam (4 runs scored)', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult({
          playType: 'HR',
          runsScored: 4,
        })}
        homeTeamName="Tigers"
        homeScore={8}
        awayScore={5}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('WALKOFF!')).toBeInTheDocument();
    expect(screen.getByText(/Walkoff Homer/)).toBeInTheDocument();
  });

  test('handles very long hero name', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult({
          heroName: 'Juan Carlos Rodriguez Martinez de la Cruz',
        })}
        homeTeamName="Tigers"
        homeScore={5}
        awayScore={4}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('Juan Carlos Rodriguez Martinez de la Cruz')).toBeInTheDocument();
  });

  test('handles null play type gracefully', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult({ playType: null })}
        homeTeamName="Tigers"
        homeScore={5}
        awayScore={4}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/Walkoff Winner/)).toBeInTheDocument();
  });

  test('handles 10th inning walkoff', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult({ inning: 10 })}
        homeTeamName="Tigers"
        homeScore={3}
        awayScore={2}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/10th Inning Thriller!/)).toBeInTheDocument();
  });

  test('handles blowout walkoff score', () => {
    render(
      <WalkoffCelebration
        walkoff={createWalkoffResult()}
        homeTeamName="Tigers"
        homeScore={15}
        awayScore={14}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });
});
