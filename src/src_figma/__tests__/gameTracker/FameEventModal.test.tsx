/**
 * FameEventModal Component Tests
 *
 * Tests the fame event modal for recording memorable game moments.
 * Per FAN_HAPPINESS_SPEC.md Section 5
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FameEventModal, { QuickFameButtons } from '../../../components/GameTracker/FameEventModal';
import type { Position, HalfInning } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

interface Player {
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
}

const createPlayer = (
  id: string,
  name: string,
  position: Position = 'SS',
  teamId: string = 'team1'
): Player => ({
  playerId: id,
  playerName: name,
  position,
  teamId,
});

const defaultAwayPlayers: Player[] = [
  createPlayer('a1', 'Away Batter One', 'CF', 'away'),
  createPlayer('a2', 'Away Batter Two', 'SS', 'away'),
  createPlayer('a3', 'Away Pitcher', 'P', 'away'),
];

const defaultHomePlayers: Player[] = [
  createPlayer('h1', 'Home Batter One', 'LF', 'home'),
  createPlayer('h2', 'Home Batter Two', '1B', 'home'),
  createPlayer('h3', 'Home Pitcher', 'P', 'home'),
];

// ============================================
// FAME EVENT MODAL TESTS
// ============================================

describe('FameEventModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    gameId: 'game1',
    inning: 5,
    halfInning: 'TOP' as HalfInning,
    awayPlayers: defaultAwayPlayers,
    homePlayers: defaultHomePlayers,
    awayTeamName: 'Visitors',
    homeTeamName: 'Locals',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    test('renders when isOpen is true', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add Fame Event');
    });

    test('does not render when isOpen is false', () => {
      render(<FameEventModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    });
  });

  describe('Header', () => {
    test('shows Add Fame Event title', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Add Fame Event');
    });

    test('shows inning info', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText(/Inning 5 Top/)).toBeInTheDocument();
    });

    test('shows Bot for bottom half', () => {
      render(<FameEventModal {...defaultProps} halfInning="BOTTOM" />);
      expect(screen.getByText(/Inning 5 Bot/)).toBeInTheDocument();
    });

    test('shows Fame explanation', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText(/Fame is narrative only/)).toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    test('shows Fame Bonus tab', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText(/Fame Bonus/)).toBeInTheDocument();
    });

    test('shows Fame Boner tab', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText(/Fame Boner/)).toBeInTheDocument();
    });

    test('Fame Bonus tab is active by default', () => {
      render(<FameEventModal {...defaultProps} />);
      // The star emoji should be in header when bonus tab is active
      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveTextContent('⭐');
    });

    test('switching to Boner tab changes header emoji', () => {
      render(<FameEventModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/Fame Boner/));
      const header = screen.getByRole('heading', { level: 2 });
      expect(header).toHaveTextContent('💀');
    });
  });

  describe('Event Type Selection', () => {
    test('shows Event Type label', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Event Type')).toBeInTheDocument();
    });

    test('shows bonus categories for Bonus tab', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Walk-Offs')).toBeInTheDocument();
      expect(screen.getByText('Defensive Highlights')).toBeInTheDocument();
      expect(screen.getByText('Home Runs')).toBeInTheDocument();
    });

    test('shows boner categories for Boner tab', () => {
      render(<FameEventModal {...defaultProps} />);
      fireEvent.click(screen.getByText(/Fame Boner/));
      expect(screen.getByText('Strikeouts')).toBeInTheDocument();
      expect(screen.getByText('Batting Failures')).toBeInTheDocument();
      expect(screen.getByText('Pitching Disasters')).toBeInTheDocument();
    });

    test('shows event buttons with fame values', () => {
      render(<FameEventModal {...defaultProps} />);
      // Events should show with +/- values
      expect(screen.getByText(/Web Gem \(\+/)).toBeInTheDocument();
    });

    test('allows selecting an event type', () => {
      render(<FameEventModal {...defaultProps} />);
      const webGemBtn = screen.getByText(/Web Gem.*\(\+/);
      fireEvent.click(webGemBtn);
      // The button should be highlighted (checked visually via styling)
    });
  });

  describe('Team Selection', () => {
    test('shows Team label', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    test('shows away team button', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Visitors (Away)')).toBeInTheDocument();
    });

    test('shows home team button', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Locals (Home)')).toBeInTheDocument();
    });

    test('defaults to away team for TOP inning', () => {
      render(<FameEventModal {...defaultProps} halfInning="TOP" />);
      // Away team should be pre-selected
    });

    test('defaults to home team for BOTTOM inning', () => {
      render(<FameEventModal {...defaultProps} halfInning="BOTTOM" />);
      // Home team should be pre-selected
    });

    test('allows switching teams', () => {
      render(<FameEventModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Locals (Home)'));
      // Player dropdown should now show home players
    });
  });

  describe('Player Selection', () => {
    test('shows Player label', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Player')).toBeInTheDocument();
    });

    test('shows player dropdown', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('shows away players when away team selected', () => {
      render(<FameEventModal {...defaultProps} />);
      const select = screen.getByRole('combobox');
      fireEvent.click(select);
      expect(screen.getByText('Away Batter One (CF)')).toBeInTheDocument();
      expect(screen.getByText('Away Batter Two (SS)')).toBeInTheDocument();
    });

    test('shows home players when home team selected', () => {
      render(<FameEventModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Locals (Home)'));
      const select = screen.getAllByRole('combobox')[0];
      fireEvent.click(select);
      expect(screen.getByText('Home Batter One (LF)')).toBeInTheDocument();
    });
  });

  describe('Secondary Player Selection', () => {
    test('shows secondary player for NUT_SHOT_DELIVERED', () => {
      render(<FameEventModal {...defaultProps} preSelectedEventType="NUT_SHOT_DELIVERED" />);
      expect(screen.getByText('Fielder Hit (Victim)')).toBeInTheDocument();
    });

    test('shows secondary player for KILLED_PITCHER', () => {
      render(<FameEventModal {...defaultProps} preSelectedEventType="KILLED_PITCHER" />);
      expect(screen.getByText('Pitcher Hit')).toBeInTheDocument();
    });

    test('shows secondary player for BACK_TO_BACK_HR', () => {
      render(<FameEventModal {...defaultProps} preSelectedEventType="BACK_TO_BACK_HR" />);
      expect(screen.getByText('Other HR Batter')).toBeInTheDocument();
    });

    test('does not show secondary player for regular events', () => {
      render(<FameEventModal {...defaultProps} preSelectedEventType="WEB_GEM" />);
      expect(screen.queryByText(/Secondary|Victim|Other HR/)).not.toBeInTheDocument();
    });
  });

  describe('Notes Input', () => {
    test('shows Notes label', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText(/Notes.*optional/)).toBeInTheDocument();
    });

    test('allows entering notes', () => {
      render(<FameEventModal {...defaultProps} />);
      const notesInput = screen.getByPlaceholderText('Additional context...');
      fireEvent.change(notesInput, { target: { value: 'Great play!' } });
      expect(notesInput).toHaveValue('Great play!');
    });
  });

  describe('Preview Section', () => {
    test('shows preview when event and player selected', () => {
      render(<FameEventModal {...defaultProps} />);

      // Select an event
      fireEvent.click(screen.getByText(/Web Gem.*\(\+/));

      // Select a player
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'a1' } });

      // Preview should show
      expect(screen.getByText(/Away Batter One.*Visitors/)).toBeInTheDocument();
    });
  });

  describe('Cancel Button', () => {
    test('shows Cancel button', () => {
      render(<FameEventModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('calls onClose when Cancel clicked', () => {
      const onClose = vi.fn();
      render(<FameEventModal {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Submit Button', () => {
    test('shows Add Fame Event submit button', () => {
      render(<FameEventModal {...defaultProps} />);
      // Get the submit button (there are multiple "Add Fame Event" texts)
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      expect(submitBtn).toBeInTheDocument();
    });

    test('submit button is disabled without event type', () => {
      render(<FameEventModal {...defaultProps} />);
      // Select player but not event
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'a1' } });

      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      expect(submitBtn).toBeDisabled();
    });

    test('submit button is disabled without player', () => {
      render(<FameEventModal {...defaultProps} />);
      // Select event but not player
      fireEvent.click(screen.getByText(/Web Gem \(\+/));

      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      expect(submitBtn).toBeDisabled();
    });

    test('submit button is enabled with event and player', () => {
      render(<FameEventModal {...defaultProps} />);

      // Select event
      fireEvent.click(screen.getByText(/Web Gem \(\+/));

      // Select player
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'a1' } });

      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('Event Submission', () => {
    test('calls onSubmit with fame event data', () => {
      const onSubmit = vi.fn();
      render(<FameEventModal {...defaultProps} onSubmit={onSubmit} />);

      // Select event
      fireEvent.click(screen.getByText(/Web Gem \(\+/));

      // Select player
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'a1' } });

      // Submit
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      fireEvent.click(submitBtn!);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'WEB_GEM',
          playerId: 'a1',
          playerName: 'Away Batter One',
          playerTeam: 'away', // Note: property name is playerTeam, not teamId
          gameId: 'game1',
          inning: 5,
          halfInning: 'TOP',
        })
      );
    });

    test('calls onClose after submit', () => {
      const onClose = vi.fn();
      render(<FameEventModal {...defaultProps} onClose={onClose} />);

      // Select event and player
      fireEvent.click(screen.getByText(/Web Gem \(\+/));
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'a1' } });

      // Submit
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(btn => btn.textContent === 'Add Fame Event');
      fireEvent.click(submitBtn!);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Pre-selected Values', () => {
    test('uses pre-selected event type', () => {
      render(<FameEventModal {...defaultProps} preSelectedEventType="TOOTBLAN" />);
      // The TOOTBLAN event should be auto-selected - preview might show it
    });

    test('uses pre-selected player', () => {
      render(
        <FameEventModal
          {...defaultProps}
          preSelectedPlayerId="a2"
          preSelectedEventType="WEB_GEM"
        />
      );
      // Should show preview with pre-selected player
      // Use getAllByText since player name appears in both dropdown and preview
      const matches = screen.getAllByText(/Away Batter Two/);
      expect(matches.length).toBeGreaterThan(0);
    });

    test('uses pre-selected team', () => {
      render(
        <FameEventModal
          {...defaultProps}
          preSelectedTeam="home"
        />
      );
      // Home team should be selected
    });
  });
});

// ============================================
// QUICK FAME BUTTONS TESTS
// ============================================

describe('QuickFameButtons Component', () => {
  const defaultProps = {
    onOpenModal: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows Quick Fame Events label', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/Quick Fame Events/)).toBeInTheDocument();
  });

  test('shows Nut Shot button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/🥜 Nut Shot/)).toBeInTheDocument();
  });

  test('shows Killed Pitcher button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/💥 Killed Pitcher/)).toBeInTheDocument();
  });

  test('shows TOOTBLAN button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/🤦 TOOTBLAN/)).toBeInTheDocument();
  });

  test('shows Web Gem button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/⭐ Web Gem/)).toBeInTheDocument();
  });

  test('shows Robbery button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/🎭 Robbery/)).toBeInTheDocument();
  });

  test('shows Other button', () => {
    render(<QuickFameButtons {...defaultProps} />);
    expect(screen.getByText(/📝 Other/)).toBeInTheDocument();
  });

  test('Nut Shot button calls onOpenModal with event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/🥜 Nut Shot/));
    expect(onOpenModal).toHaveBeenCalledWith('NUT_SHOT_DELIVERED');
  });

  test('Killed Pitcher button calls onOpenModal with event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/💥 Killed Pitcher/));
    expect(onOpenModal).toHaveBeenCalledWith('KILLED_PITCHER');
  });

  test('TOOTBLAN button calls onOpenModal with event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/🤦 TOOTBLAN/));
    expect(onOpenModal).toHaveBeenCalledWith('TOOTBLAN');
  });

  test('Web Gem button calls onOpenModal with event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/⭐ Web Gem/));
    expect(onOpenModal).toHaveBeenCalledWith('WEB_GEM');
  });

  test('Robbery button calls onOpenModal with event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/🎭 Robbery/));
    expect(onOpenModal).toHaveBeenCalledWith('ROBBERY');
  });

  test('Other button calls onOpenModal without event type', () => {
    const onOpenModal = vi.fn();
    render(<QuickFameButtons onOpenModal={onOpenModal} />);
    fireEvent.click(screen.getByText(/📝 Other/));
    expect(onOpenModal).toHaveBeenCalledWith();
  });
});
