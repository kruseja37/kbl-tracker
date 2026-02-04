/**
 * Scoreboard Component Tests
 *
 * Tests the Scoreboard React component rendering and display logic.
 */

import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Scoreboard from '../../../components/GameTracker/Scoreboard';

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('Scoreboard Component', () => {
  const defaultProps = {
    awayName: 'Tigers',
    homeName: 'Sox',
    awayScore: 3,
    homeScore: 5,
    inning: 7,
    halfInning: 'BOTTOM' as const,
    outs: 2,
    gameNumber: 42,
  };

  describe('Basic Rendering', () => {
    test('renders team names', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText('Tigers')).toBeInTheDocument();
      expect(screen.getByText('Sox')).toBeInTheDocument();
    });

    test('renders scores', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('renders inning number', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText('7')).toBeInTheDocument();
    });

    test('renders game info header', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText(/GAME 42/)).toBeInTheDocument();
      expect(screen.getByText(/Tigers @ Sox/)).toBeInTheDocument();
    });
  });

  describe('Inning Arrow Display', () => {
    test('shows up arrow for TOP of inning', () => {
      render(<Scoreboard {...defaultProps} halfInning="TOP" />);

      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    test('shows down arrow for BOTTOM of inning', () => {
      render(<Scoreboard {...defaultProps} halfInning="BOTTOM" />);

      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  describe('Outs Display', () => {
    test('shows OUTS label', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText('OUTS:')).toBeInTheDocument();
    });

    test('renders three out dots', () => {
      render(<Scoreboard {...defaultProps} outs={0} />);

      // All three dots should be present
      const dots = screen.getAllByText('●');
      expect(dots.length).toBe(3);
    });
  });

  describe('Leverage Index Display', () => {
    test('shows default LI of 1.00', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.getByText('LI:')).toBeInTheDocument();
      expect(screen.getByText('1.00')).toBeInTheDocument();
    });

    test('shows custom LI value', () => {
      render(<Scoreboard {...defaultProps} leverageIndex={2.5} />);

      // LI value may be combined with emoji in same element
      expect(screen.getByText(/2\.50/)).toBeInTheDocument();
    });

    test('shows CLUTCH label for LI >= 1.5', () => {
      render(<Scoreboard {...defaultProps} leverageIndex={1.75} />);

      expect(screen.getByText('CLUTCH')).toBeInTheDocument();
    });

    test('shows HIGH label for LI >= 2.5', () => {
      render(<Scoreboard {...defaultProps} leverageIndex={3.0} />);

      expect(screen.getByText('HIGH')).toBeInTheDocument();
    });

    test('shows EXTREME label for LI >= 5.0', () => {
      render(<Scoreboard {...defaultProps} leverageIndex={6.0} />);

      expect(screen.getByText('EXTREME')).toBeInTheDocument();
    });

    test('does not show category label for LI < 1.5', () => {
      render(<Scoreboard {...defaultProps} leverageIndex={1.0} />);

      expect(screen.queryByText('MEDIUM')).not.toBeInTheDocument();
      expect(screen.queryByText('LOW')).not.toBeInTheDocument();
    });
  });

  describe('Mojo Display', () => {
    test('shows batter mojo when provided', () => {
      render(
        <Scoreboard
          {...defaultProps}
          batterMojo={1}
          batterName="J. Rodriguez"
        />
      );

      expect(screen.getByText('BAT:')).toBeInTheDocument();
      expect(screen.getByText('J. Rodriguez')).toBeInTheDocument();
    });

    test('shows pitcher mojo when provided', () => {
      render(
        <Scoreboard
          {...defaultProps}
          pitcherMojo={-1}
          pitcherName="T. Anderson"
        />
      );

      expect(screen.getByText('PIT:')).toBeInTheDocument();
      expect(screen.getByText('T. Anderson')).toBeInTheDocument();
    });

    test('shows both batter and pitcher mojo', () => {
      render(
        <Scoreboard
          {...defaultProps}
          batterMojo={2}
          batterName="Slugger"
          pitcherMojo={-2}
          pitcherName="Ace"
        />
      );

      expect(screen.getByText('BAT:')).toBeInTheDocument();
      expect(screen.getByText('Slugger')).toBeInTheDocument();
      expect(screen.getByText('PIT:')).toBeInTheDocument();
      expect(screen.getByText('Ace')).toBeInTheDocument();
    });

    test('does not show mojo row when neither provided', () => {
      render(<Scoreboard {...defaultProps} />);

      expect(screen.queryByText('BAT:')).not.toBeInTheDocument();
      expect(screen.queryByText('PIT:')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// GAME STATE SCENARIOS
// ============================================

describe('Scoreboard Game Scenarios', () => {
  test('first inning start', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={0}
        homeScore={0}
        inning={1}
        halfInning="TOP"
        outs={0}
        gameNumber={1}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('▲')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2); // Both scores
  });

  test('extra innings', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={4}
        homeScore={4}
        inning={12}
        halfInning="TOP"
        outs={1}
        gameNumber={1}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('high leverage late game situation', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={5}
        homeScore={4}
        inning={9}
        halfInning="BOTTOM"
        outs={2}
        gameNumber={1}
        leverageIndex={5.5}
        batterMojo={1}
        batterName="Clutch Hitter"
      />
    );

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('▼')).toBeInTheDocument();
    expect(screen.getByText('EXTREME')).toBeInTheDocument();
    expect(screen.getByText(/5\.50/)).toBeInTheDocument(); // May include emoji
    expect(screen.getByText('Clutch Hitter')).toBeInTheDocument();
  });

  test('blowout shows low leverage', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={12}
        homeScore={2}
        inning={6}
        halfInning="BOTTOM"
        outs={1}
        gameNumber={1}
        leverageIndex={0.3}
      />
    );

    expect(screen.getByText('0.30')).toBeInTheDocument();
    // No category label for low LI
    expect(screen.queryByText('LOW')).not.toBeInTheDocument();
    expect(screen.queryByText('MEDIUM')).not.toBeInTheDocument();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Scoreboard Edge Cases', () => {
  test('handles double-digit scores', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={15}
        homeScore={14}
        inning={9}
        halfInning="BOTTOM"
        outs={2}
        gameNumber={1}
      />
    );

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  test('handles long team names', () => {
    render(
      <Scoreboard
        awayName="Herbisaurs"
        homeName="Wild Pigs"
        awayScore={3}
        homeScore={5}
        inning={5}
        halfInning="TOP"
        outs={1}
        gameNumber={1}
      />
    );

    expect(screen.getByText('Herbisaurs')).toBeInTheDocument();
    expect(screen.getByText('Wild Pigs')).toBeInTheDocument();
  });

  test('handles game number 1', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={0}
        homeScore={0}
        inning={1}
        halfInning="TOP"
        outs={0}
        gameNumber={1}
      />
    );

    expect(screen.getByText(/GAME 1:/)).toBeInTheDocument();
  });

  test('handles high game number', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={0}
        homeScore={0}
        inning={1}
        halfInning="TOP"
        outs={0}
        gameNumber={162}
      />
    );

    expect(screen.getByText(/GAME 162:/)).toBeInTheDocument();
  });

  test('unknown player name shows ?', () => {
    render(
      <Scoreboard
        awayName="Away"
        homeName="Home"
        awayScore={0}
        homeScore={0}
        inning={1}
        halfInning="TOP"
        outs={0}
        gameNumber={1}
        batterMojo={0}
        // batterName not provided
      />
    );

    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
