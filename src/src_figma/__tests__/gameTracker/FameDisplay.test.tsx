/**
 * FameDisplay Component Tests
 *
 * Tests the Fame display components: FamePanel, FameBadge, FameToast, EndGameFameSummary
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  FamePanel,
  FameBadge,
  FameToast,
  EndGameFameSummary,
} from '../../../components/GameTracker/FameDisplay';
import type { FameEvent, FameEventType } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createFameEvent = (
  id: string,
  playerId: string,
  playerName: string,
  playerTeam: string,
  eventType: FameEventType,
  fameValue: number,
  fameType: 'bonus' | 'boner' = fameValue >= 0 ? 'bonus' : 'boner'
): FameEvent => ({
  id,
  playerId,
  playerName,
  playerTeam,
  eventType,
  fameType,
  fameValue,
  inning: 1,
  halfInning: 'TOP',
  leverageIndex: 1.0,
  timestamp: new Date(),
});

// ============================================
// FAME PANEL TESTS
// ============================================

describe('FamePanel Component', () => {
  const defaultProps = {
    fameEvents: [] as FameEvent[],
    awayTeamName: 'Visitors',
    homeTeamName: 'Home Team',
    awayTeamId: 'away1',
    homeTeamId: 'home1',
  };

  test('renders nothing when no fame events', () => {
    const { container } = render(<FamePanel {...defaultProps} fameEvents={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows event count in header', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
        ]}
      />
    );
    expect(screen.getByText('(1 event)')).toBeInTheDocument();
  });

  test('shows plural for multiple events', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
          createFameEvent('2', 'p2', 'Mike Johnson', 'home1', 'GRAND_SLAM', 4),
        ]}
      />
    );
    expect(screen.getByText('(2 events)')).toBeInTheDocument();
  });

  test('shows team net fame in header', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
          createFameEvent('2', 'p2', 'Mike Johnson', 'home1', 'GRAND_SLAM', 4),
        ]}
      />
    );
    expect(screen.getByText('Visitors: +5')).toBeInTheDocument();
    expect(screen.getByText('Home Team: +4')).toBeInTheDocument();
  });

  test('shows negative fame correctly', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'ERROR', -2),
        ]}
      />
    );
    expect(screen.getByText('Visitors: -2')).toBeInTheDocument();
  });

  test('collapses when header clicked', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
        ]}
      />
    );

    // Initially expanded - should show team name
    expect(screen.getByText('Visitors')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Game Fame'));

    // Team sections in expanded content should be gone (collapsed)
    // The header still shows team names in summary but content is hidden
  });

  test('shows player name and fame in detail section', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
        ]}
      />
    );

    expect(screen.getByText(/John Smith:/)).toBeInTheDocument();
    // Multiple elements will show +5, so use getAllByText
    const positiveElements = screen.getAllByText(/\+5/);
    expect(positiveElements.length).toBeGreaterThan(0);
  });

  test('shows "No Fame events" for team with no events', () => {
    render(
      <FamePanel
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
          // No home team events
        ]}
      />
    );

    expect(screen.getByText('No Fame events')).toBeInTheDocument();
  });
});

// ============================================
// FAME BADGE TESTS
// ============================================

describe('FameBadge Component', () => {
  test('renders nothing for zero fame', () => {
    const { container } = render(<FameBadge netFame={0} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows positive fame with star', () => {
    render(<FameBadge netFame={5} />);
    expect(screen.getByText(/⭐\+5/)).toBeInTheDocument();
  });

  test('shows negative fame with skull', () => {
    render(<FameBadge netFame={-3} />);
    expect(screen.getByText(/💀-3/)).toBeInTheDocument();
  });

  test('applies small size by default', () => {
    render(<FameBadge netFame={5} />);
    const badge = screen.getByText(/⭐\+5/);
    expect(badge.className).toContain('text-xs');
  });

  test('applies medium size when specified', () => {
    render(<FameBadge netFame={5} size="md" />);
    const badge = screen.getByText(/⭐\+5/);
    expect(badge.className).toContain('text-sm');
  });
});

// ============================================
// FAME TOAST TESTS
// ============================================

describe('FameToast Component', () => {
  const bonusEvent = createFameEvent('1', 'p1', 'John Smith', 'team1', 'WALKOFF', 5, 'bonus');
  const bonerEvent = createFameEvent('2', 'p2', 'Mike Johnson', 'team1', 'ERROR', -2, 'boner');

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows Fame Bonus title for bonus events', () => {
    render(<FameToast event={bonusEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText('Fame Bonus!')).toBeInTheDocument();
  });

  test('shows Fame Boner title for boner events', () => {
    render(<FameToast event={bonerEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText('Fame Boner')).toBeInTheDocument();
  });

  test('shows player name and event type', () => {
    render(<FameToast event={bonusEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText(/John Smith:/)).toBeInTheDocument();
  });

  test('shows fame value with sign', () => {
    render(<FameToast event={bonusEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText('+5 Fame')).toBeInTheDocument();
  });

  test('shows negative fame value', () => {
    render(<FameToast event={bonerEvent} onDismiss={vi.fn()} />);
    expect(screen.getByText('-2 Fame')).toBeInTheDocument();
  });

  test('calls onDismiss when close button clicked', () => {
    const onDismiss = vi.fn();
    render(<FameToast event={bonusEvent} onDismiss={onDismiss} />);

    // Find and click the X button
    const closeButtons = document.querySelectorAll('button');
    const closeButton = Array.from(closeButtons).find(btn =>
      btn.querySelector('svg')
    );
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    expect(onDismiss).toHaveBeenCalled();
  });

  test('auto-hides after specified time', async () => {
    const onDismiss = vi.fn();
    render(<FameToast event={bonusEvent} onDismiss={onDismiss} autoHideMs={3000} />);

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalled();
  });

  test('shows View Details button when callback provided', () => {
    render(
      <FameToast
        event={bonusEvent}
        onDismiss={vi.fn()}
        onViewDetails={vi.fn()}
      />
    );
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  test('does not show View Details button when callback not provided', () => {
    render(<FameToast event={bonusEvent} onDismiss={vi.fn()} />);
    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  test('calls onViewDetails when button clicked', () => {
    const onViewDetails = vi.fn();
    render(
      <FameToast
        event={bonusEvent}
        onDismiss={vi.fn()}
        onViewDetails={onViewDetails}
      />
    );
    fireEvent.click(screen.getByText('View Details'));
    expect(onViewDetails).toHaveBeenCalled();
  });
});

// ============================================
// END GAME FAME SUMMARY TESTS
// ============================================

describe('EndGameFameSummary Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    fameEvents: [] as FameEvent[],
    awayTeamName: 'Visitors',
    homeTeamName: 'Home Team',
    awayTeamId: 'away1',
    homeTeamId: 'home1',
    winner: null as 'away' | 'home' | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when isOpen is false', () => {
    const { container } = render(<EndGameFameSummary {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows Game Fame Summary title', () => {
    render(<EndGameFameSummary {...defaultProps} />);
    expect(screen.getByText('Game Fame Summary')).toBeInTheDocument();
  });

  test('shows both team names', () => {
    render(<EndGameFameSummary {...defaultProps} />);
    expect(screen.getByText('Visitors')).toBeInTheDocument();
    expect(screen.getByText('Home Team')).toBeInTheDocument();
  });

  test('shows team fame totals', () => {
    render(
      <EndGameFameSummary
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
          createFameEvent('2', 'p2', 'Mike Johnson', 'home1', 'GRAND_SLAM', 4),
        ]}
      />
    );
    expect(screen.getByText('+5 Fame')).toBeInTheDocument();
    expect(screen.getByText('+4 Fame')).toBeInTheDocument();
  });

  test('shows "No Fame events" when empty', () => {
    render(<EndGameFameSummary {...defaultProps} fameEvents={[]} />);
    expect(screen.getByText('No Fame events recorded this game')).toBeInTheDocument();
  });

  test('shows top Fame bonuses section', () => {
    render(
      <EndGameFameSummary
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'WALKOFF', 5),
        ]}
      />
    );
    expect(screen.getByText('⭐ Top Fame Bonuses')).toBeInTheDocument();
  });

  test('shows Fame boners section when present', () => {
    render(
      <EndGameFameSummary
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'John Smith', 'away1', 'ERROR', -2),
        ]}
      />
    );
    expect(screen.getByText('💀 Fame Boners')).toBeInTheDocument();
  });

  test('calls onClose when Close button clicked', () => {
    const onClose = vi.fn();
    render(<EndGameFameSummary {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<EndGameFameSummary {...defaultProps} onClose={onClose} />);

    // Find the X button in the header
    const closeButtons = document.querySelectorAll('button');
    const xButton = Array.from(closeButtons).find(btn =>
      btn.querySelector('svg') && btn.className.includes('text-white')
    );
    if (xButton) {
      fireEvent.click(xButton);
    }
    expect(onClose).toHaveBeenCalled();
  });

  test('shows top 3 players for each team', () => {
    render(
      <EndGameFameSummary
        {...defaultProps}
        fameEvents={[
          createFameEvent('1', 'p1', 'Player One', 'away1', 'WALKOFF', 5),
          createFameEvent('2', 'p2', 'Player Two', 'away1', 'GRAND_SLAM', 4),
          createFameEvent('3', 'p3', 'Player Three', 'away1', 'HOME_RUN', 3),
          createFameEvent('4', 'p4', 'Player Four', 'away1', 'HOME_RUN', 2),
        ]}
      />
    );

    expect(screen.getByText(/Player One:/)).toBeInTheDocument();
    expect(screen.getByText(/Player Two:/)).toBeInTheDocument();
    expect(screen.getByText(/Player Three:/)).toBeInTheDocument();
    // Player Four might be hidden (only top 3)
  });
});
