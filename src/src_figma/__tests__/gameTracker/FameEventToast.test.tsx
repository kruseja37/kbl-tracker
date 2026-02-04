/**
 * FameEventToast Component Tests
 *
 * Tests the in-game Fame event notifications.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FameEventToast from '../../../components/GameTracker/FameEventToast';
import type { FameEvent, FameEventType } from '../../../types/game';

// ============================================
// HELPERS
// ============================================

const createFameEvent = (
  id: string,
  eventType: FameEventType,
  playerName: string,
  fameType: 'bonus' | 'boner' = 'bonus',
  fameValue: number = 1
): FameEvent => ({
  id,
  eventType,
  playerId: `player_${id}`,
  playerName,
  playerTeam: 'team1',
  fameType,
  fameValue,
  gameId: 'game1',
  inning: 5,
  halfInning: 'TOP',
  timestamp: Date.now(),
  autoDetected: true,
});

// ============================================
// TOAST TESTS
// ============================================

describe('FameEventToast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    test('renders nothing when no events', () => {
      const { container } = render(
        <FameEventToast events={[]} onDismiss={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders when events present', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Test Player')];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Test Player')).toBeInTheDocument();
    });
  });

  describe('Bonus Toast Display', () => {
    test('shows Fame Bonus! title for bonus events', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Star Fielder', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Fame Bonus!')).toBeInTheDocument();
    });

    test('shows star emoji for bonus events', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Star Fielder', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    test('shows positive fame value with plus sign', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Star Fielder', 'bonus', 2)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Boner Toast Display', () => {
    test('shows Fame Boner title for boner events', () => {
      const events = [createFameEvent('1', 'TOOTBLAN', 'Bad Runner', 'boner', -3)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Fame Boner')).toBeInTheDocument();
    });

    test('shows skull emoji for boner events', () => {
      const events = [createFameEvent('1', 'TOOTBLAN', 'Bad Runner', 'boner', -3)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('💀')).toBeInTheDocument();
    });

    test('shows negative fame value without double sign', () => {
      const events = [createFameEvent('1', 'TOOTBLAN', 'Bad Runner', 'boner', -3)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('-3')).toBeInTheDocument();
    });
  });

  describe('Event Labels', () => {
    test('shows event label from FAME_EVENT_LABELS', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Fielder', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Web Gem')).toBeInTheDocument();
    });

    test('shows player name', () => {
      const events = [createFameEvent('1', 'ROBBERY', 'Wall Climber', 'bonus', 1.5)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Wall Climber')).toBeInTheDocument();
    });
  });

  describe('Multiple Toasts', () => {
    test('shows multiple events', () => {
      const events = [
        createFameEvent('1', 'WEB_GEM', 'Player One', 'bonus', 1),
        createFameEvent('2', 'TOOTBLAN', 'Player Two', 'boner', -3),
      ];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Player One')).toBeInTheDocument();
      expect(screen.getByText('Player Two')).toBeInTheDocument();
    });

    test('respects maxVisible limit', () => {
      const events = [
        createFameEvent('1', 'WEB_GEM', 'Player One', 'bonus', 1),
        createFameEvent('2', 'ROBBERY', 'Player Two', 'bonus', 1.5),
        createFameEvent('3', 'TOOTBLAN', 'Player Three', 'boner', -3),
        createFameEvent('4', 'HAT_TRICK', 'Player Four', 'boner', -1),
      ];
      render(<FameEventToast events={events} onDismiss={vi.fn()} maxVisible={2} />);
      // Only last 2 should be visible
      expect(screen.queryByText('Player One')).not.toBeInTheDocument();
      expect(screen.queryByText('Player Two')).not.toBeInTheDocument();
      expect(screen.getByText('Player Three')).toBeInTheDocument();
      expect(screen.getByText('Player Four')).toBeInTheDocument();
    });

    test('default maxVisible is 3', () => {
      const events = [
        createFameEvent('1', 'WEB_GEM', 'Player One', 'bonus', 1),
        createFameEvent('2', 'ROBBERY', 'Player Two', 'bonus', 1.5),
        createFameEvent('3', 'TOOTBLAN', 'Player Three', 'boner', -3),
        createFameEvent('4', 'HAT_TRICK', 'Player Four', 'boner', -1),
      ];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      // Only last 3 should be visible
      expect(screen.queryByText('Player One')).not.toBeInTheDocument();
      expect(screen.getByText('Player Two')).toBeInTheDocument();
      expect(screen.getByText('Player Three')).toBeInTheDocument();
      expect(screen.getByText('Player Four')).toBeInTheDocument();
    });
  });

  describe('Dismissal', () => {
    test('shows tap to dismiss hint', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Player', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('tap to dismiss')).toBeInTheDocument();
    });

    test('calls onDismiss when toast clicked', () => {
      const onDismiss = vi.fn();
      const events = [createFameEvent('event1', 'WEB_GEM', 'Player', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText('Player'));

      // Wait for exit animation
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(onDismiss).toHaveBeenCalledWith('event1');
    });

    test('auto-dismisses after autoHideMs', () => {
      const onDismiss = vi.fn();
      const events = [createFameEvent('event1', 'WEB_GEM', 'Player', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={onDismiss} autoHideMs={3000} />);

      // Not called yet
      expect(onDismiss).not.toHaveBeenCalled();

      // Advance past autoHideMs + exit animation
      act(() => {
        vi.advanceTimersByTime(3250);
      });

      expect(onDismiss).toHaveBeenCalledWith('event1');
    });

    test('default autoHideMs is 4000', () => {
      const onDismiss = vi.fn();
      const events = [createFameEvent('event1', 'WEB_GEM', 'Player', 'bonus', 1)];
      render(<FameEventToast events={events} onDismiss={onDismiss} />);

      // Advance past default 4000ms + exit animation
      act(() => {
        vi.advanceTimersByTime(4250);
      });

      expect(onDismiss).toHaveBeenCalledWith('event1');
    });

    test('staggers auto-dismiss for multiple toasts', () => {
      const onDismiss = vi.fn();
      const events = [
        createFameEvent('event1', 'WEB_GEM', 'Player One', 'bonus', 1),
        createFameEvent('event2', 'ROBBERY', 'Player Two', 'bonus', 1.5),
      ];
      render(<FameEventToast events={events} onDismiss={onDismiss} autoHideMs={3000} />);

      // After 3250ms, first toast should dismiss
      act(() => {
        vi.advanceTimersByTime(3250);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);

      // After another 500ms, second toast should dismiss (staggered by 500ms)
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });

  describe('Fame Value Display', () => {
    test('shows fame value of 0.75', () => {
      const events = [createFameEvent('1', 'WEB_GEM', 'Player', 'bonus', 0.75)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('+0.75')).toBeInTheDocument();
    });

    test('shows fame value of 1.5', () => {
      const events = [createFameEvent('1', 'ROBBERY', 'Player', 'bonus', 1.5)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('+1.5')).toBeInTheDocument();
    });

    test('shows negative fame value', () => {
      const events = [createFameEvent('1', 'GOLDEN_SOMBRERO', 'Whiffer', 'boner', -2)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('-2')).toBeInTheDocument();
    });
  });

  describe('Event Types', () => {
    test('handles Walk-Off event', () => {
      const events = [createFameEvent('1', 'WALK_OFF', 'Hero', 'bonus', 2)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Walk-Off Hit')).toBeInTheDocument();
    });

    test('handles TOOTBLAN event', () => {
      const events = [createFameEvent('1', 'TOOTBLAN', 'Runner', 'boner', -3)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('TOOTBLAN')).toBeInTheDocument();
    });

    test('handles Cycle event', () => {
      const events = [createFameEvent('1', 'CYCLE', 'Hitter', 'bonus', 3)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Hit for the Cycle')).toBeInTheDocument();
    });

    test('handles Perfect Game event', () => {
      const events = [createFameEvent('1', 'PERFECT_GAME', 'Ace', 'bonus', 5)];
      render(<FameEventToast events={events} onDismiss={vi.fn()} />);
      expect(screen.getByText('Perfect Game')).toBeInTheDocument();
    });
  });
});
