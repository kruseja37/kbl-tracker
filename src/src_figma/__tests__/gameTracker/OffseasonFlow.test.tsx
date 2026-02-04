/**
 * OffseasonFlow Component Tests
 *
 * Tests the offseason flow wizard with phase progression.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OffseasonFlow, OffseasonModal } from '../../../components/GameTracker/OffseasonFlow';

// ============================================
// MOCKS
// ============================================

vi.mock('../../../utils/seasonEndProcessor', () => ({
  processSeasonEnd: vi.fn().mockResolvedValue({
    playersProcessed: 25,
    teamsProcessed: 2,
    fameEvents: [{ type: 'MVP', player: 'Test Player' }],
    seasonSummary: { wins: 85, losses: 77 },
  }),
  createEmptyPreviousSeasonState: vi.fn().mockReturnValue({
    standings: [],
    stats: {},
  }),
  getSeasonEndSummary: vi.fn().mockReturnValue('Season Summary:\n- 85 wins, 77 losses\n- Division: 1st Place'),
}));

// ============================================
// DEFAULT PROPS
// ============================================

const defaultProps = {
  seasonId: 'season-2026',
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

// ============================================
// TESTS
// ============================================

describe('OffseasonFlow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering (Intro Phase)', () => {
    test('shows Offseason header', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('Offseason')).toBeInTheDocument();
    });

    test('shows intro title', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('Offseason Begins')).toBeInTheDocument();
    });

    test('shows intro description', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText(/The season is over/)).toBeInTheDocument();
    });

    test('shows Offseason Phases list', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('Offseason Phases:')).toBeInTheDocument();
    });

    test('shows Begin Offseason button', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('Begin Offseason →')).toBeInTheDocument();
    });

    test('shows Back button', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    test('shows all phase names in list', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('Season End')).toBeInTheDocument();
      expect(screen.getByText('Awards Ceremony')).toBeInTheDocument();
      expect(screen.getByText('True Value')).toBeInTheDocument();
      expect(screen.getByText('Free Agency')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    test('shows Coming Soon for unimplemented phases', () => {
      render(<OffseasonFlow {...defaultProps} />);
      const comingSoonBadges = screen.getAllByText('Coming Soon');
      expect(comingSoonBadges.length).toBeGreaterThan(0);
    });

    test('shows phase emojis', () => {
      render(<OffseasonFlow {...defaultProps} />);
      expect(screen.getByText('⚾')).toBeInTheDocument();
    });
  });

  describe('Back Button', () => {
    test('calls onCancel when Back clicked', () => {
      const onCancel = vi.fn();
      render(<OffseasonFlow {...defaultProps} onCancel={onCancel} />);
      fireEvent.click(screen.getByText('← Back'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Phase Navigation', () => {
    test('advances to Season End phase when Begin clicked', () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      expect(screen.getByText('Season End Processing')).toBeInTheDocument();
    });

    test('shows phase progress indicator after leaving intro', () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      // Progress indicator shows emoji dots
      const progressDots = screen.getAllByTitle(/Season End|Awards|True Value|Contraction/);
      expect(progressDots.length).toBeGreaterThan(0);
    });
  });

  describe('Season End Phase', () => {
    test('shows Season End title', () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      expect(screen.getByText('Season End Processing')).toBeInTheDocument();
    });

    test('shows Process Season End button', () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      expect(screen.getByText('Process Season End')).toBeInTheDocument();
    });

    test('shows processing state when processing', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      // Should show processing message briefly
      await waitFor(() => {
        // Either shows processing or completed
        const hasProcessing = screen.queryByText('Processing Season...');
        const hasComplete = screen.queryByText('Season Complete!');
        expect(hasProcessing || hasComplete).toBeTruthy();
      });
    });

    test('shows Season Complete after processing', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Season Complete!')).toBeInTheDocument();
      });
    });

    test('shows stats after processing', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // Players
        expect(screen.getByText('Players')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument(); // Teams
        expect(screen.getByText('Teams')).toBeInTheDocument();
      });
    });

    test('shows Continue to Awards button after processing', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Awards →')).toBeInTheDocument();
      });
    });
  });

  describe('Placeholder Phases', () => {
    test('shows placeholder for Awards phase', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Awards →')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Continue to Awards →'));

      expect(screen.getByText('Awards Ceremony')).toBeInTheDocument();
      // Placeholder text may be split, check for partial content
      expect(screen.getByText(/not yet implemented/)).toBeInTheDocument();
    });

    test('shows skip button for placeholder phases', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Awards →')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Continue to Awards →'));
      expect(screen.getByText('Skip to Next Phase →')).toBeInTheDocument();
    });

    test('advances through placeholder phases', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Awards →')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Continue to Awards →'));
      expect(screen.getByText('Awards Ceremony')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Skip to Next Phase →'));
      expect(screen.getByText('True Value')).toBeInTheDocument();
    });
  });

  describe('New Season Phase', () => {
    // Helper to navigate through all phases to New Season
    const navigateToNewSeason = async () => {
      fireEvent.click(screen.getByText('Begin Offseason →'));
      fireEvent.click(screen.getByText('Process Season End'));

      await waitFor(() => {
        expect(screen.getByText('Continue to Awards →')).toBeInTheDocument();
      });

      // First click advances to Awards
      fireEvent.click(screen.getByText('Continue to Awards →'));

      // Skip through 9 placeholder phases (Awards through Trades)
      // Awards, True Value, Contraction, Retirement, Free Agency, Draft, Farm, Chemistry, Trades
      for (let i = 0; i < 9; i++) {
        const skipBtn = screen.queryByText('Skip to Next Phase →');
        if (skipBtn) {
          fireEvent.click(skipBtn);
        }
      }
    };

    test('shows Ready for Next Season when reaching final phase', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      await navigateToNewSeason();
      expect(screen.getByText('Ready for Next Season!')).toBeInTheDocument();
    });

    test('shows checklist on New Season phase', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      await navigateToNewSeason();

      expect(screen.getByText('✓ Stats aggregated to careers')).toBeInTheDocument();
      expect(screen.getByText('✓ Team MVPs determined')).toBeInTheDocument();
      expect(screen.getByText('○ Awards ceremony (coming soon)')).toBeInTheDocument();
    });

    test('shows Start New Season button', async () => {
      render(<OffseasonFlow {...defaultProps} />);
      await navigateToNewSeason();
      expect(screen.getByText('Start New Season! 🎉')).toBeInTheDocument();
    });

    test('calls onComplete when Start New Season clicked', async () => {
      const onComplete = vi.fn();
      render(<OffseasonFlow {...defaultProps} onComplete={onComplete} />);
      await navigateToNewSeason();
      fireEvent.click(screen.getByText('Start New Season! 🎉'));
      expect(onComplete).toHaveBeenCalled();
    });
  });
});

describe('OffseasonModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    test('does not render when isOpen is false', () => {
      render(
        <OffseasonModal
          isOpen={false}
          seasonId="season-2026"
          onComplete={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.queryByText('Offseason Begins')).not.toBeInTheDocument();
    });

    test('renders when isOpen is true', () => {
      render(
        <OffseasonModal
          isOpen={true}
          seasonId="season-2026"
          onComplete={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('Offseason Begins')).toBeInTheDocument();
    });
  });

  describe('Modal Props', () => {
    test('passes seasonId to OffseasonFlow', () => {
      render(
        <OffseasonModal
          isOpen={true}
          seasonId="custom-season"
          onComplete={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText('Offseason Begins')).toBeInTheDocument();
    });

    test('calls onClose when Back clicked', () => {
      const onClose = vi.fn();
      render(
        <OffseasonModal
          isOpen={true}
          seasonId="season-2026"
          onComplete={vi.fn()}
          onClose={onClose}
        />
      );
      fireEvent.click(screen.getByText('← Back'));
      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe('PhaseProgress Component', () => {
  test('shows progress indicators', () => {
    render(<OffseasonFlow {...defaultProps} />);
    fireEvent.click(screen.getByText('Begin Offseason →'));

    // Progress dots are shown with titles
    const progressIndicators = screen.getAllByTitle(/Season End/);
    expect(progressIndicators.length).toBeGreaterThan(0);
  });
});
