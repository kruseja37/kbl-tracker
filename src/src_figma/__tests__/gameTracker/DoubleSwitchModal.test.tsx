/**
 * DoubleSwitchModal Component Tests
 *
 * Tests the double switch modal for combined pitching change + batting order swap.
 * Per Ralph Framework S-B013, S-B014
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DoubleSwitchModal from '../../../components/GameTracker/DoubleSwitchModal';
import type { LineupPlayer } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

interface BullpenPitcher {
  id: string;
  name: string;
  era: number;
  role: 'SP' | 'RP' | 'CL';
  pitchCount?: number;
}

interface BenchPlayer {
  id: string;
  name: string;
  positions: string[];
  avg?: number;
}

const createLineupPlayer = (
  id: string,
  name: string,
  order: number,
  position: string
): LineupPlayer => ({
  playerId: id,
  playerName: name,
  battingOrder: order,
  position: position as LineupPlayer['position'],
});

const createBullpenPitcher = (
  id: string,
  name: string,
  era: number = 3.50,
  role: 'SP' | 'RP' | 'CL' = 'RP'
): BullpenPitcher => ({
  id,
  name,
  era,
  role,
});

const createBenchPlayer = (
  id: string,
  name: string,
  positions: string[] = ['IF', 'OF'],
  avg?: number
): BenchPlayer => ({
  id,
  name,
  positions,
  avg,
});

const createDefaultLineup = (): LineupPlayer[] => [
  createLineupPlayer('p1', 'Lead Off', 1, 'CF'),
  createLineupPlayer('p2', 'Second Bat', 2, 'SS'),
  createLineupPlayer('p3', 'Third Bat', 3, '1B'),
  createLineupPlayer('p4', 'Fourth Bat', 4, 'LF'),
  createLineupPlayer('p5', 'Fifth Bat', 5, '3B'),
  createLineupPlayer('p6', 'Sixth Bat', 6, 'RF'),
  createLineupPlayer('p7', 'Seventh Bat', 7, 'C'),
  createLineupPlayer('p8', 'Eighth Bat', 8, '2B'),
  createLineupPlayer('pitcher', 'Starting Pitcher', 9, 'P'),
];

const createDefaultBullpen = (): BullpenPitcher[] => [
  createBullpenPitcher('rp1', 'Reliever One', 2.50, 'RP'),
  createBullpenPitcher('rp2', 'Reliever Two', 3.25, 'RP'),
  createBullpenPitcher('cl1', 'Closer Guy', 1.80, 'CL'),
];

const createDefaultBench = (): BenchPlayer[] => [
  createBenchPlayer('b1', 'Bench One', ['IF', 'OF'], 0.275),
  createBenchPlayer('b2', 'Bench Two', ['C', 'IF'], 0.250),
  createBenchPlayer('b3', 'Bench Three', ['OF'], 0.300),
];

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('DoubleSwitchModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    currentPitcher: { id: 'pitcher', name: 'Starting Pitcher', pitchCount: 95, ip: '6.0' },
    lineup: createDefaultLineup(),
    bullpen: createDefaultBullpen(),
    bench: createDefaultBench(),
    currentInning: 7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    test('renders when isOpen is true', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Double Switch')).toBeInTheDocument();
    });

    test('does not render when isOpen is false', () => {
      render(<DoubleSwitchModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Double Switch')).not.toBeInTheDocument();
    });
  });

  describe('Header', () => {
    test('shows Double Switch title', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Double Switch')).toBeInTheDocument();
    });

    test('shows subtitle explaining the action', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Pitching change + batting order swap')).toBeInTheDocument();
    });

    test('shows swap emoji icon', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('🔄')).toBeInTheDocument();
    });
  });

  describe('Explainer', () => {
    test('shows explanation of double switch', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(
        screen.getByText(/A double switch moves the new pitcher to a different batting order spot/)
      ).toBeInTheDocument();
    });
  });

  describe('Outgoing Pitcher Section', () => {
    test('shows PITCHER OUT label', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('PITCHER OUT')).toBeInTheDocument();
    });

    test('shows current pitcher name', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      // Pitcher name appears in the outgoing section
      const pitcherNameElements = screen.getAllByText('Starting Pitcher');
      expect(pitcherNameElements.length).toBeGreaterThan(0);
    });

    test('shows pitcher stats', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('6.0 IP • 95 pitches')).toBeInTheDocument();
    });

    test('shows pitcher batting order', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Batting #9')).toBeInTheDocument();
    });
  });

  describe('Reliever Selection', () => {
    test('shows PITCHER IN label', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('PITCHER IN')).toBeInTheDocument();
    });

    test('shows all bullpen pitchers', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Reliever One')).toBeInTheDocument();
      expect(screen.getByText('Reliever Two')).toBeInTheDocument();
      expect(screen.getByText('Closer Guy')).toBeInTheDocument();
    });

    test('shows pitcher role and ERA', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('RP • 2.50 ERA')).toBeInTheDocument();
      expect(screen.getByText('CL • 1.80 ERA')).toBeInTheDocument();
    });

    test('allows selecting a reliever', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Reliever One'));
      // Button should have selected style - we can verify by the visual change or check interactions
      // Since CSS is hard to test, we'll verify the selection works via the complete flow
    });
  });

  describe('Position Player Out Selection', () => {
    test('shows POSITION PLAYER OUT label', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('POSITION PLAYER OUT')).toBeInTheDocument();
    });

    test('shows non-pitcher position players', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText(/#1 Lead Off/)).toBeInTheDocument();
      expect(screen.getByText(/#2 Second Bat/)).toBeInTheDocument();
      expect(screen.getByText(/#8 Eighth Bat/)).toBeInTheDocument();
    });

    test('does not show pitcher in position player options', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      // The pitcher should not be in the position player out list
      // "#9 Starting Pitcher" should not appear (only starting pitcher name in outgoing section)
      expect(screen.queryByText(/#9 Starting Pitcher/)).not.toBeInTheDocument();
    });

    test('shows player position', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      // Position shown as meta info
      expect(screen.getByText('CF')).toBeInTheDocument();
      expect(screen.getByText('SS')).toBeInTheDocument();
    });
  });

  describe('Bench Player In Selection', () => {
    test('shows POSITION PLAYER IN label', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('POSITION PLAYER IN')).toBeInTheDocument();
    });

    test('shows bench players', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Bench One')).toBeInTheDocument();
      expect(screen.getByText('Bench Two')).toBeInTheDocument();
      expect(screen.getByText('Bench Three')).toBeInTheDocument();
    });

    test('shows bench player positions and avg', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('IF/OF • .275')).toBeInTheDocument();
      expect(screen.getByText('C/IF • .250')).toBeInTheDocument();
      expect(screen.getByText('OF • .300')).toBeInTheDocument();
    });
  });

  describe('Preview Section', () => {
    test('shows preview after all selections made', () => {
      render(<DoubleSwitchModal {...defaultProps} />);

      // Make all selections
      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));

      expect(screen.getByText('RESULT')).toBeInTheDocument();
    });

    test('shows new batting order for pitcher', () => {
      render(<DoubleSwitchModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/)); // Position player #1 out
      fireEvent.click(screen.getByText('Bench One'));

      // Reliever takes the position player's spot (#1)
      expect(screen.getByText('Reliever One (P)')).toBeInTheDocument();
    });

    test('shows new batting order for position player', () => {
      render(<DoubleSwitchModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));

      // Bench player takes pitcher's old spot and position
      expect(screen.getByText('Bench One (CF)')).toBeInTheDocument();
    });

    test('shows was note indicating old batting order', () => {
      render(<DoubleSwitchModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));

      expect(screen.getByText('was #9')).toBeInTheDocument(); // Pitcher's old spot
      expect(screen.getByText('was #1')).toBeInTheDocument(); // Position player's old spot
    });
  });

  describe('Cancel Button', () => {
    test('shows Cancel button', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('calls onClose when clicked', () => {
      const onClose = vi.fn();
      render(<DoubleSwitchModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Confirm Button', () => {
    test('shows Confirm button', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      expect(screen.getByText('Confirm Double Switch')).toBeInTheDocument();
    });

    test('button is disabled without all selections', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      const confirmBtn = screen.getByText('Confirm Double Switch');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is disabled with only reliever selected', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Reliever One'));

      const confirmBtn = screen.getByText('Confirm Double Switch');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is disabled without bench player selected', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));

      const confirmBtn = screen.getByText('Confirm Double Switch');
      expect(confirmBtn).toBeDisabled();
    });

    test('button is enabled with all selections', () => {
      render(<DoubleSwitchModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));

      const confirmBtn = screen.getByText('Confirm Double Switch');
      expect(confirmBtn).not.toBeDisabled();
    });
  });

  describe('Event Completion', () => {
    test('calls onConfirm with correct data', () => {
      const onConfirm = vi.fn();
      render(<DoubleSwitchModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));
      fireEvent.click(screen.getByText('Confirm Double Switch'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          // Pitching change data
          outgoingPitcherId: 'pitcher',
          outgoingPitcherName: 'Starting Pitcher',
          outgoingPitchCount: 95,
          incomingPitcherId: 'rp1',
          incomingPitcherName: 'Reliever One',
          // Position swap data
          positionPlayerOutId: 'p1',
          positionPlayerOutName: 'Lead Off',
          positionPlayerOutOrder: 1,
          positionPlayerInId: 'b1',
          positionPlayerInName: 'Bench One',
          positionPlayerInPosition: 'CF',
          // New batting orders
          newPitcherBattingOrder: 1, // Takes position player's spot
          newPositionPlayerBattingOrder: 9, // Takes pitcher's spot
        })
      );
    });

    test('calls onClose after confirm', () => {
      const onClose = vi.fn();
      render(<DoubleSwitchModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Reliever One'));
      fireEvent.click(screen.getByText(/#1 Lead Off/));
      fireEvent.click(screen.getByText('Bench One'));
      fireEvent.click(screen.getByText('Confirm Double Switch'));

      expect(onClose).toHaveBeenCalled();
    });

    test('handles different position player selections', () => {
      const onConfirm = vi.fn();
      render(<DoubleSwitchModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('Closer Guy'));
      fireEvent.click(screen.getByText(/#4 Fourth Bat/)); // LF, batting 4th
      fireEvent.click(screen.getByText('Bench Two'));
      fireEvent.click(screen.getByText('Confirm Double Switch'));

      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          incomingPitcherId: 'cl1',
          incomingPitcherName: 'Closer Guy',
          positionPlayerOutId: 'p4',
          positionPlayerOutName: 'Fourth Bat',
          positionPlayerOutOrder: 4,
          positionPlayerInId: 'b2',
          positionPlayerInName: 'Bench Two',
          positionPlayerInPosition: 'LF',
          newPitcherBattingOrder: 4,
          newPositionPlayerBattingOrder: 9,
        })
      );
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('DoubleSwitchModal Edge Cases', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    currentPitcher: { id: 'pitcher', name: 'Starting Pitcher', pitchCount: 95, ip: '6.0' },
    lineup: createDefaultLineup(),
    bullpen: createDefaultBullpen(),
    bench: createDefaultBench(),
    currentInning: 7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('handles empty bullpen gracefully', () => {
    render(<DoubleSwitchModal {...defaultProps} bullpen={[]} />);
    expect(screen.getByText('PITCHER IN')).toBeInTheDocument();
    // No relievers to show
  });

  test('handles empty bench gracefully', () => {
    render(<DoubleSwitchModal {...defaultProps} bench={[]} />);
    expect(screen.getByText('POSITION PLAYER IN')).toBeInTheDocument();
    // No bench players to show
  });

  test('handles bench player without avg', () => {
    const benchWithoutAvg: BenchPlayer[] = [
      createBenchPlayer('b1', 'No Avg Player', ['IF']),
    ];
    render(<DoubleSwitchModal {...defaultProps} bench={benchWithoutAvg} />);
    // Should show positions without avg
    expect(screen.getByText('IF')).toBeInTheDocument();
  });

  test('handles selecting different position players in sequence', () => {
    const onConfirm = vi.fn();
    render(<DoubleSwitchModal {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText('Reliever One'));

    // First select one position player
    fireEvent.click(screen.getByText(/#1 Lead Off/));

    // Then change to another
    fireEvent.click(screen.getByText(/#5 Fifth Bat/));

    fireEvent.click(screen.getByText('Bench One'));
    fireEvent.click(screen.getByText('Confirm Double Switch'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        positionPlayerOutId: 'p5',
        positionPlayerOutName: 'Fifth Bat',
        positionPlayerOutOrder: 5,
        positionPlayerInPosition: '3B',
        newPitcherBattingOrder: 5,
      })
    );
  });

  test('handles selecting different relievers in sequence', () => {
    const onConfirm = vi.fn();
    render(<DoubleSwitchModal {...defaultProps} onConfirm={onConfirm} />);

    // First select one reliever
    fireEvent.click(screen.getByText('Reliever One'));

    // Then change to another
    fireEvent.click(screen.getByText('Closer Guy'));

    fireEvent.click(screen.getByText(/#1 Lead Off/));
    fireEvent.click(screen.getByText('Bench One'));
    fireEvent.click(screen.getByText('Confirm Double Switch'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        incomingPitcherId: 'cl1',
        incomingPitcherName: 'Closer Guy',
      })
    );
  });
});
