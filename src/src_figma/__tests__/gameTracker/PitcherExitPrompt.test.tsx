/**
 * PitcherExitPrompt Component Tests
 *
 * Tests the pitcher fatigue prompt modal.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PitcherExitPrompt from '../../../components/GameTracker/PitcherExitPrompt';

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onKeepIn: vi.fn(),
  onChangePitcher: vi.fn(),
  pitcherName: 'Clayton Kershaw',
  pitchCount: 90,
  ip: '6.0',
  hits: 4,
  runs: 1,
  strikeouts: 8,
  walks: 2,
};

// ============================================
// TESTS
// ============================================

describe('PitcherExitPrompt Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    test('renders nothing when isOpen=false', () => {
      const { container } = render(
        <PitcherExitPrompt {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders modal when isOpen=true', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('Pitcher Check')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    test('shows Pitcher Check title', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('Pitcher Check')).toBeInTheDocument();
    });

    test('shows close button', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('×')).toBeInTheDocument();
    });

    test('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<PitcherExitPrompt {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('×'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Pitcher Info', () => {
    test('shows pitcher name', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('Clayton Kershaw')).toBeInTheDocument();
    });

    test('shows pitch count', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={90} />);
      expect(screen.getByText('90')).toBeInTheDocument();
      expect(screen.getByText('PITCHES')).toBeInTheDocument();
    });
  });

  describe('Game Stats', () => {
    test('shows innings pitched', () => {
      render(<PitcherExitPrompt {...defaultProps} ip="6.0" />);
      expect(screen.getByText('6.0')).toBeInTheDocument();
      expect(screen.getByText('IP')).toBeInTheDocument();
    });

    test('shows hits allowed', () => {
      render(<PitcherExitPrompt {...defaultProps} hits={4} />);
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
    });

    test('shows runs allowed', () => {
      render(<PitcherExitPrompt {...defaultProps} runs={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();
    });

    test('shows strikeouts', () => {
      render(<PitcherExitPrompt {...defaultProps} strikeouts={8} />);
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    test('shows walks', () => {
      render(<PitcherExitPrompt {...defaultProps} walks={2} />);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('BB')).toBeInTheDocument();
    });
  });

  describe('Fatigue Levels', () => {
    test('shows "Getting Tired" at 85-99 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={90} />);
      expect(screen.getByText('Getting Tired')).toBeInTheDocument();
    });

    test('shows "Fatigued" at 100-114 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={105} />);
      expect(screen.getByText('Fatigued')).toBeInTheDocument();
    });

    test('shows "Exhausted" at 115+ pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={120} />);
      expect(screen.getByText('Exhausted')).toBeInTheDocument();
    });

    test('shows "Fresh" below 85 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={70} />);
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });
  });

  describe('Prompt Messages', () => {
    test('shows monitor message at 85-99 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={90} />);
      expect(screen.getByText('Pitch count is climbing. Stay alert.')).toBeInTheDocument();
    });

    test('shows caution message at 100-114 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={105} />);
      expect(screen.getByText('Pitcher is showing fatigue. Monitor closely.')).toBeInTheDocument();
    });

    test('shows danger message at 115+ pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={120} />);
      expect(screen.getByText('Pitcher is exhausted. Consider making a change.')).toBeInTheDocument();
    });

    test('no message below 85 pitches', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={70} />);
      expect(screen.queryByText(/climbing|fatigue|exhausted/i)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    test('shows Keep In button', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('Keep In')).toBeInTheDocument();
    });

    test('shows Make Change button', () => {
      render(<PitcherExitPrompt {...defaultProps} />);
      expect(screen.getByText('Make Change')).toBeInTheDocument();
    });

    test('calls onKeepIn when Keep In clicked', () => {
      const onKeepIn = vi.fn();
      render(<PitcherExitPrompt {...defaultProps} onKeepIn={onKeepIn} />);
      fireEvent.click(screen.getByText('Keep In'));
      expect(onKeepIn).toHaveBeenCalled();
    });

    test('calls onChangePitcher when Make Change clicked', () => {
      const onChangePitcher = vi.fn();
      render(<PitcherExitPrompt {...defaultProps} onChangePitcher={onChangePitcher} />);
      fireEvent.click(screen.getByText('Make Change'));
      expect(onChangePitcher).toHaveBeenCalled();
    });
  });

  describe('Threshold Boundaries', () => {
    test('at exactly 85 pitches shows monitor level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={85} />);
      expect(screen.getByText('Getting Tired')).toBeInTheDocument();
    });

    test('at exactly 100 pitches shows caution level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={100} />);
      expect(screen.getByText('Fatigued')).toBeInTheDocument();
    });

    test('at exactly 115 pitches shows danger level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={115} />);
      expect(screen.getByText('Exhausted')).toBeInTheDocument();
    });

    test('at 84 pitches shows fresh level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={84} />);
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });

    test('at 99 pitches shows monitor level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={99} />);
      expect(screen.getByText('Getting Tired')).toBeInTheDocument();
    });

    test('at 114 pitches shows caution level', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={114} />);
      expect(screen.getByText('Fatigued')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles zero pitch count', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });

    test('handles very high pitch count', () => {
      render(<PitcherExitPrompt {...defaultProps} pitchCount={150} />);
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Exhausted')).toBeInTheDocument();
    });

    test('handles zero stats', () => {
      render(
        <PitcherExitPrompt
          {...defaultProps}
          ip="0.0"
          hits={0}
          runs={0}
          strikeouts={0}
          walks={0}
        />
      );
      expect(screen.getByText('0.0')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    test('handles fractional innings', () => {
      render(<PitcherExitPrompt {...defaultProps} ip="5.2" />);
      expect(screen.getByText('5.2')).toBeInTheDocument();
    });
  });
});
