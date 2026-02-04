/**
 * FanMoraleDisplay Component Tests
 *
 * Tests fan morale badge, bar, detail, and section components.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  FanMoraleBadge,
  FanMoraleBar,
  FanMoraleDetail,
  FanMoraleSection,
} from '../../../components/GameTracker/FanMoraleDisplay';
import type { FanMorale } from '../../../engines/fanMoraleEngine';

// ============================================
// MOCK DATA
// ============================================

const createMockFanMorale = (overrides: Partial<FanMorale> = {}): FanMorale => ({
  teamId: 'team1',
  seasonId: 'season1',
  current: 65,
  trend: 'RISING',
  trendStreak: 3,
  state: 'CONTENT',
  riskLevel: 'SAFE',
  seasonHigh: 78,
  seasonLow: 45,
  eventHistory: [],
  activeTradeAftermaths: [],
  activeProspectSpotlights: [],
  lastEvent: undefined,
  ...overrides,
});

// ============================================
// MOCKS
// ============================================

vi.mock('../../../engines/fanMoraleEngine', () => ({
  FAN_STATE_CONFIG: {
    EUPHORIC: {
      emoji: '🤩',
      color: '#00FF00',
      label: 'Championship Fever',
      description: 'Fans are ALL IN. Merchandise flying off shelves.',
    },
    EXCITED: {
      emoji: '😊',
      color: '#7FFF00',
      label: 'Playoff Buzz',
      description: 'Strong engagement. Fans showing up and loud.',
    },
    CONTENT: {
      emoji: '🙂',
      color: '#FFFF00',
      label: 'Satisfied',
      description: 'Fans are engaged but not emotionally invested.',
    },
    RESTLESS: {
      emoji: '😐',
      color: '#FFA500',
      label: 'Growing Impatient',
      description: 'Attendance dipping. Murmurs about management.',
    },
    FRUSTRATED: {
      emoji: '😤',
      color: '#FF4500',
      label: 'Frustrated',
      description: 'Boos heard. Trade demands. Media criticism.',
    },
    APATHETIC: {
      emoji: '😑',
      color: '#FF0000',
      label: 'Checked Out',
      description: 'Empty seats. Fans stopped caring.',
    },
    HOSTILE: {
      emoji: '😡',
      color: '#8B0000',
      label: 'Hostile',
      description: 'Protests. Ownership under fire. Contraction risk.',
    },
  },
  getFanState: (morale: number) => {
    if (morale >= 90) return 'EUPHORIC';
    if (morale >= 75) return 'EXCITED';
    if (morale >= 55) return 'CONTENT';
    if (morale >= 40) return 'RESTLESS';
    if (morale >= 25) return 'FRUSTRATED';
    if (morale >= 10) return 'APATHETIC';
    return 'HOSTILE';
  },
  getRiskLevel: (morale: number) => {
    if (morale >= 40) return 'SAFE';
    if (morale >= 25) return 'WATCH';
    if (morale >= 10) return 'DANGER';
    return 'CRITICAL';
  },
}));

// ============================================
// TESTS: FanMoraleBadge
// ============================================

describe('FanMoraleBadge Component', () => {
  describe('Standard Display', () => {
    test('shows emoji for CONTENT state', () => {
      render(<FanMoraleBadge morale={65} />);
      expect(screen.getByText('🙂')).toBeInTheDocument();
    });

    test('shows state label', () => {
      render(<FanMoraleBadge morale={65} />);
      expect(screen.getByText('Satisfied')).toBeInTheDocument();
    });

    test('shows morale value out of 99', () => {
      render(<FanMoraleBadge morale={65} />);
      expect(screen.getByText(/65\/99/)).toBeInTheDocument();
    });

    test('shows EUPHORIC state for high morale', () => {
      render(<FanMoraleBadge morale={95} />);
      expect(screen.getByText('🤩')).toBeInTheDocument();
      expect(screen.getByText('Championship Fever')).toBeInTheDocument();
    });

    test('shows HOSTILE state for very low morale', () => {
      render(<FanMoraleBadge morale={5} />);
      expect(screen.getByText('😡')).toBeInTheDocument();
      expect(screen.getByText('Hostile')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    test('shows compact version when compact=true', () => {
      render(<FanMoraleBadge morale={65} compact={true} />);
      expect(screen.getByText('🙂')).toBeInTheDocument();
      expect(screen.getByText('65')).toBeInTheDocument();
      // Should NOT show label in compact mode
      expect(screen.queryByText('Satisfied')).not.toBeInTheDocument();
    });
  });

  describe('Trend Display', () => {
    test('hides trend by default', () => {
      render(<FanMoraleBadge morale={65} />);
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
      expect(screen.queryByText('rising')).not.toBeInTheDocument();
    });

    test('shows rising trend arrow when showTrend=true', () => {
      render(<FanMoraleBadge morale={65} showTrend={true} trend="RISING" />);
      expect(screen.getByText(/↑/)).toBeInTheDocument();
    });

    test('shows falling trend arrow', () => {
      render(<FanMoraleBadge morale={65} showTrend={true} trend="FALLING" />);
      expect(screen.getByText(/↓/)).toBeInTheDocument();
    });

    test('shows stable trend arrow', () => {
      render(<FanMoraleBadge morale={65} showTrend={true} trend="STABLE" />);
      expect(screen.getByText(/→/)).toBeInTheDocument();
    });

    test('shows trend in compact mode', () => {
      render(<FanMoraleBadge morale={65} showTrend={true} trend="RISING" compact={true} />);
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  describe('State Thresholds', () => {
    test('EXCITED at 75+', () => {
      render(<FanMoraleBadge morale={75} />);
      expect(screen.getByText('😊')).toBeInTheDocument();
      expect(screen.getByText('Playoff Buzz')).toBeInTheDocument();
    });

    test('RESTLESS at 40-54', () => {
      render(<FanMoraleBadge morale={45} />);
      expect(screen.getByText('😐')).toBeInTheDocument();
      expect(screen.getByText('Growing Impatient')).toBeInTheDocument();
    });

    test('FRUSTRATED at 25-39', () => {
      render(<FanMoraleBadge morale={30} />);
      expect(screen.getByText('😤')).toBeInTheDocument();
      expect(screen.getByText('Frustrated')).toBeInTheDocument();
    });

    test('APATHETIC at 10-24', () => {
      render(<FanMoraleBadge morale={15} />);
      expect(screen.getByText('😑')).toBeInTheDocument();
      expect(screen.getByText('Checked Out')).toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: FanMoraleBar
// ============================================

describe('FanMoraleBar Component', () => {
  describe('Labels', () => {
    test('shows Hostile and Euphoric labels by default', () => {
      render(<FanMoraleBar morale={65} />);
      expect(screen.getByText('Hostile')).toBeInTheDocument();
      expect(screen.getByText('Euphoric')).toBeInTheDocument();
    });

    test('hides labels when showLabels=false', () => {
      render(<FanMoraleBar morale={65} showLabels={false} />);
      expect(screen.queryByText('Hostile')).not.toBeInTheDocument();
      expect(screen.queryByText('Euphoric')).not.toBeInTheDocument();
    });

    test('shows state info at bottom', () => {
      const { container } = render(<FanMoraleBar morale={65} />);
      // Shows emoji, label, and value - verify full content
      const fullContent = container.textContent;
      expect(fullContent).toContain('🙂');
      expect(fullContent).toContain('Satisfied');
      expect(fullContent).toContain('65');
    });
  });
});

// ============================================
// TESTS: FanMoraleDetail
// ============================================

describe('FanMoraleDetail Component', () => {
  describe('Header Display', () => {
    test('shows emoji and label', () => {
      const moraleData = createMockFanMorale({ current: 65, state: 'CONTENT' });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('🙂')).toBeInTheDocument();
      expect(screen.getByText('Satisfied')).toBeInTheDocument();
    });

    test('shows description', () => {
      const moraleData = createMockFanMorale({ current: 65, state: 'CONTENT' });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('Fans are engaged but not emotionally invested.')).toBeInTheDocument();
    });

    test('shows current morale value', () => {
      const moraleData = createMockFanMorale({ current: 65 });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByText('/ 99')).toBeInTheDocument();
    });
  });

  describe('Stats Row', () => {
    test('shows trend', () => {
      const moraleData = createMockFanMorale({ trend: 'RISING' });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('Trend')).toBeInTheDocument();
      expect(screen.getByText(/↑.*RISING/)).toBeInTheDocument();
    });

    test('shows streak', () => {
      const moraleData = createMockFanMorale({ trendStreak: 5 });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('shows risk level', () => {
      const moraleData = createMockFanMorale({ riskLevel: 'SAFE' });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('Safe')).toBeInTheDocument();
    });

    test('shows season range', () => {
      const moraleData = createMockFanMorale({ seasonLow: 35, seasonHigh: 82 });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('Range')).toBeInTheDocument();
      expect(screen.getByText('35-82')).toBeInTheDocument();
    });
  });

  describe('Last Event', () => {
    test('hides last event when not present', () => {
      const moraleData = createMockFanMorale({ lastEvent: undefined });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.queryByText('LAST EVENT')).not.toBeInTheDocument();
    });

    test('shows last event when present', () => {
      const moraleData = createMockFanMorale({
        lastEvent: {
          id: 'evt1',
          type: 'WIN_STREAK_5',
          timestamp: Date.now(),
          baseImpact: 5,
          finalImpact: 6,
          multipliers: {},
        },
      });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('LAST EVENT')).toBeInTheDocument();
      expect(screen.getByText('WIN STREAK 5')).toBeInTheDocument();
      expect(screen.getByText('+6')).toBeInTheDocument();
    });

    test('shows negative impact for bad events', () => {
      const moraleData = createMockFanMorale({
        lastEvent: {
          id: 'evt1',
          type: 'LOSE_STREAK_3',
          timestamp: Date.now(),
          baseImpact: -2,
          finalImpact: -3,
          multipliers: {},
        },
      });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText('-3')).toBeInTheDocument();
    });
  });

  describe('Event History', () => {
    test('hides history by default', () => {
      const moraleData = createMockFanMorale({
        eventHistory: [
          { id: 'e1', type: 'WIN', timestamp: Date.now(), baseImpact: 1, finalImpact: 1, multipliers: {} },
        ],
      });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.queryByText('RECENT HISTORY')).not.toBeInTheDocument();
    });

    test('shows history when showHistory=true', () => {
      const moraleData = createMockFanMorale({
        eventHistory: [
          { id: 'e1', type: 'WIN', timestamp: Date.now(), baseImpact: 1, finalImpact: 1, multipliers: {} },
          { id: 'e2', type: 'LOSS', timestamp: Date.now(), baseImpact: -1, finalImpact: -1, multipliers: {} },
        ],
      });
      render(<FanMoraleDetail moraleData={moraleData} showHistory={true} />);
      expect(screen.getByText('RECENT HISTORY')).toBeInTheDocument();
    });

    test('hides history section when empty', () => {
      const moraleData = createMockFanMorale({ eventHistory: [] });
      render(<FanMoraleDetail moraleData={moraleData} showHistory={true} />);
      expect(screen.queryByText('RECENT HISTORY')).not.toBeInTheDocument();
    });
  });

  describe('Trade Aftermaths', () => {
    test('hides trade section when no active trades', () => {
      const moraleData = createMockFanMorale({ activeTradeAftermaths: [] });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.queryByText(/TRADE UNDER SCRUTINY/)).not.toBeInTheDocument();
    });

    test('shows trade section when active trades exist', () => {
      const moraleData = createMockFanMorale({
        activeTradeAftermaths: [
          {
            tradeId: 't1',
            tradeTimestamp: Date.now(),
            acquiredPlayers: [{ playerId: 'p1', playerName: 'John Doe', role: 'STAR' as const }],
            tradedAwayPlayers: [],
            scrutinyPeriod: { gamesPlayed: 5, startTimestamp: Date.now() },
            cumulativePerformance: { bonusWAR: 0, fameGained: 0 },
          },
        ],
      });
      render(<FanMoraleDetail moraleData={moraleData} />);
      expect(screen.getByText(/TRADE UNDER SCRUTINY/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Game 5\/14/)).toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: FanMoraleSection
// ============================================

describe('FanMoraleSection Component', () => {
  describe('Basic Display', () => {
    test('shows Fan Morale label', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.getByText('Fan Morale:')).toBeInTheDocument();
    });

    test('shows morale value', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.getByText('65')).toBeInTheDocument();
    });

    test('shows state label in parentheses', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.getByText('(Satisfied)')).toBeInTheDocument();
    });

    test('shows emoji', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.getByText('🙂')).toBeInTheDocument();
    });
  });

  describe('Trend Display', () => {
    test('shows rising trend arrow', () => {
      render(<FanMoraleSection morale={65} trend="RISING" />);
      expect(screen.getByText(/↑/)).toBeInTheDocument();
    });

    test('shows falling trend arrow', () => {
      render(<FanMoraleSection morale={65} trend="FALLING" />);
      expect(screen.getByText(/↓/)).toBeInTheDocument();
    });

    test('shows stable trend by default', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.getByText(/→/)).toBeInTheDocument();
    });

    test('shows streak multiplier when > 1', () => {
      render(<FanMoraleSection morale={65} trend="RISING" trendStreak={5} />);
      expect(screen.getByText(/×5/)).toBeInTheDocument();
    });

    test('hides streak multiplier when = 1', () => {
      render(<FanMoraleSection morale={65} trend="RISING" trendStreak={1} />);
      expect(screen.queryByText(/×1/)).not.toBeInTheDocument();
    });
  });

  describe('Risk Level', () => {
    test('hides risk badge when SAFE', () => {
      render(<FanMoraleSection morale={65} />);
      expect(screen.queryByText('SAFE')).not.toBeInTheDocument();
    });

    test('shows WATCH badge when morale 25-39', () => {
      render(<FanMoraleSection morale={30} />);
      expect(screen.getByText('WATCH')).toBeInTheDocument();
    });

    test('shows DANGER badge when morale 10-24', () => {
      render(<FanMoraleSection morale={15} />);
      expect(screen.getByText('DANGER')).toBeInTheDocument();
    });

    test('shows CRITICAL badge when morale < 10', () => {
      render(<FanMoraleSection morale={5} />);
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: Edge Cases
// ============================================

describe('Edge Cases', () => {
  test('handles zero morale', () => {
    render(<FanMoraleBadge morale={0} />);
    expect(screen.getByText('😡')).toBeInTheDocument();
    expect(screen.getByText('Hostile')).toBeInTheDocument();
  });

  test('handles max morale (99)', () => {
    render(<FanMoraleBadge morale={99} />);
    expect(screen.getByText('🤩')).toBeInTheDocument();
    expect(screen.getByText('Championship Fever')).toBeInTheDocument();
  });

  test('handles boundary at 90 (EUPHORIC threshold)', () => {
    render(<FanMoraleBadge morale={90} />);
    expect(screen.getByText('🤩')).toBeInTheDocument();
  });

  test('handles boundary at 89 (EXCITED)', () => {
    render(<FanMoraleBadge morale={89} />);
    expect(screen.getByText('😊')).toBeInTheDocument();
  });

  test('handles boundary at 55 (CONTENT threshold)', () => {
    render(<FanMoraleBadge morale={55} />);
    expect(screen.getByText('🙂')).toBeInTheDocument();
  });

  test('handles boundary at 54 (RESTLESS)', () => {
    render(<FanMoraleBadge morale={54} />);
    expect(screen.getByText('😐')).toBeInTheDocument();
  });

  test('handles boundary at 40 (RESTLESS threshold)', () => {
    render(<FanMoraleBadge morale={40} />);
    expect(screen.getByText('😐')).toBeInTheDocument();
  });

  test('handles boundary at 10 (APATHETIC threshold)', () => {
    render(<FanMoraleBadge morale={10} />);
    expect(screen.getByText('😑')).toBeInTheDocument();
  });

  test('handles boundary at 9 (HOSTILE)', () => {
    render(<FanMoraleBadge morale={9} />);
    expect(screen.getByText('😡')).toBeInTheDocument();
  });
});
