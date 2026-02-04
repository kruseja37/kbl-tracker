/**
 * FranchiseSetup Component Tests
 *
 * Tests the franchise setup wizard with step navigation.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// ============================================
// TESTS
// ============================================

describe('FranchiseSetup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders NEW FRANCHISE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('NEW FRANCHISE')).toBeInTheDocument();
    });

    test('shows step progress indicator', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    test('renders step labels', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('League')).toBeInTheDocument();
      expect(screen.getByText('Season')).toBeInTheDocument();
      expect(screen.getByText('Playoffs')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Rosters')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    test('shows 6 progress step buttons', () => {
      render(<FranchiseSetup />);
      // Each step has a numbered button
      const stepButtons = screen.getAllByRole('button');
      // Should have 6 step buttons plus navigation buttons
      expect(stepButtons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Step 1 - League Selection', () => {
    test('shows SELECT A LEAGUE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('SELECT A LEAGUE')).toBeInTheDocument();
    });

    test('shows league options', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('KRUSE BASEBALL LEAGUE')).toBeInTheDocument();
    });

    test('shows SUMMER LEAGUE option', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('SUMMER LEAGUE')).toBeInTheDocument();
    });

    test('shows CHAMPIONSHIP SERIES option', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('CHAMPIONSHIP SERIES')).toBeInTheDocument();
    });

    test('next button disabled until league selected', () => {
      render(<FranchiseSetup />);
      const nextButton = screen.getByRole('button', { name: /NEXT/i });
      expect(nextButton).toBeDisabled();
    });

    test('shows league description text', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Choose the league template/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('CANCEL button navigates home', () => {
      render(<FranchiseSetup />);
      fireEvent.click(screen.getByRole('button', { name: /CANCEL/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('no BACK button on step 1', () => {
      render(<FranchiseSetup />);
      expect(screen.queryByRole('button', { name: /BACK/i })).not.toBeInTheDocument();
    });
  });

  describe('League Details', () => {
    test('shows team count in league info', () => {
      render(<FranchiseSetup />);
      // KBL shows 16 teams
      expect(screen.getByText(/16 teams/)).toBeInTheDocument();
    });

    test('shows create new league option', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Create New League/i)).toBeInTheDocument();
    });

    test('shows league rules info', () => {
      render(<FranchiseSetup />);
      // Multiple leagues show default rules
      expect(screen.getAllByText(/Default rules/).length).toBeGreaterThan(0);
    });

    test('shows conference info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/2 conferences/)).toBeInTheDocument();
    });

    test('shows divisions info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/4 divisions/)).toBeInTheDocument();
    });
  });

  describe('League Card Expansion', () => {
    test('shows expand button for leagues with structure', () => {
      render(<FranchiseSetup />);
      // KBL has a structure and should have expand button
      const expandButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent === '▼' || btn.textContent === '▲'
      );
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });
});
