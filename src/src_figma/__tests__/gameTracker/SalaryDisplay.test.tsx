/**
 * SalaryDisplay Component Tests
 *
 * Tests the salary display components: SalaryBadge, SalaryBreakdownDisplay,
 * SalaryCompact, and SalarySection.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SalaryBadge,
  SalaryBreakdownDisplay,
  SalaryCompact,
  SalarySection,
} from '../../../components/GameTracker/SalaryDisplay';
import type { SalaryBreakdown } from '../../../engines/salaryCalculator';

// ============================================
// HELPERS
// ============================================

const createBreakdown = (overrides: Partial<SalaryBreakdown> = {}): SalaryBreakdown => ({
  baseSalary: 10.0,
  positionMultiplier: 1.15,
  traitModifier: 1.1,
  ageFactor: 0.95,
  performanceModifier: 1.05,
  fameModifier: 1.03,
  personalityModifier: 1.0,
  components: {
    afterPosition: 11.5,
    afterTraits: 12.65,
    afterAge: 12.02,
    afterPerformance: 12.62,
    afterFame: 13.0,
    afterPersonality: 13.0,
  },
  finalSalary: 13.0,
  ...overrides,
});

// ============================================
// SALARY BADGE TESTS
// ============================================

describe('SalaryBadge Component', () => {
  describe('Salary Formatting', () => {
    test('formats salary with M suffix', () => {
      render(<SalaryBadge salary={15.5} />);
      expect(screen.getByText('$15.5M')).toBeInTheDocument();
    });

    test('formats small salary correctly', () => {
      render(<SalaryBadge salary={0.5} />);
      expect(screen.getByText('$500K')).toBeInTheDocument();
    });

    test('formats large salary correctly', () => {
      render(<SalaryBadge salary={45.0} />);
      expect(screen.getByText('$45.0M')).toBeInTheDocument();
    });
  });

  describe('Salary Tiers', () => {
    test('shows tier by default', () => {
      render(<SalaryBadge salary={25.0} />);
      expect(screen.getByText('Premium Contract')).toBeInTheDocument();
    });

    test('hides tier when showTier=false', () => {
      render(<SalaryBadge salary={25.0} showTier={false} />);
      expect(screen.queryByText('Premium Contract')).not.toBeInTheDocument();
    });

    test('shows Superstar tier for 40+', () => {
      render(<SalaryBadge salary={45.0} />);
      expect(screen.getByText('Superstar Contract')).toBeInTheDocument();
    });

    test('shows All-Star tier for 30-39', () => {
      render(<SalaryBadge salary={35.0} />);
      expect(screen.getByText('All-Star Contract')).toBeInTheDocument();
    });

    test('shows Premium tier for 20-29', () => {
      render(<SalaryBadge salary={25.0} />);
      expect(screen.getByText('Premium Contract')).toBeInTheDocument();
    });

    test('shows Solid tier for 10-19', () => {
      render(<SalaryBadge salary={15.0} />);
      expect(screen.getByText('Solid Contract')).toBeInTheDocument();
    });

    test('shows Moderate tier for 5-9', () => {
      render(<SalaryBadge salary={7.0} />);
      expect(screen.getByText('Moderate Contract')).toBeInTheDocument();
    });

    test('shows Budget tier for 2-4', () => {
      render(<SalaryBadge salary={3.0} />);
      expect(screen.getByText('Budget Contract')).toBeInTheDocument();
    });

    test('shows Minimum tier for under 2', () => {
      render(<SalaryBadge salary={1.5} />);
      expect(screen.getByText('Minimum Contract')).toBeInTheDocument();
    });
  });
});

// ============================================
// SALARY BREAKDOWN DISPLAY TESTS
// ============================================

describe('SalaryBreakdownDisplay Component', () => {
  describe('Basic Display', () => {
    test('renders breakdown labels', () => {
      const breakdown = createBreakdown();
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);

      expect(screen.getByText('Base (from ratings)')).toBeInTheDocument();
      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByText('Traits')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Fame')).toBeInTheDocument();
    });

    test('shows player name in title when provided', () => {
      const breakdown = createBreakdown();
      render(<SalaryBreakdownDisplay breakdown={breakdown} playerName="John Smith" />);
      expect(screen.getByText('Salary Breakdown: John Smith')).toBeInTheDocument();
    });

    test('omits title when no player name', () => {
      const breakdown = createBreakdown();
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.queryByText(/Salary Breakdown/)).not.toBeInTheDocument();
    });

    test('shows final salary', () => {
      const breakdown = createBreakdown({ finalSalary: 25.5 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('Final Salary')).toBeInTheDocument();
      expect(screen.getByText('$25.5M')).toBeInTheDocument();
    });
  });

  describe('Multiplier Display', () => {
    test('shows position multiplier', () => {
      const breakdown = createBreakdown({ positionMultiplier: 1.15 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('×1.15')).toBeInTheDocument();
    });

    test('shows trait modifier', () => {
      const breakdown = createBreakdown({ traitModifier: 1.20 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('×1.20')).toBeInTheDocument();
    });

    test('shows age factor', () => {
      const breakdown = createBreakdown({ ageFactor: 0.85 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('×0.85')).toBeInTheDocument();
    });

    test('does not show multiplier of 1.0', () => {
      const breakdown = createBreakdown({
        positionMultiplier: 1.0,
        traitModifier: 1.0,
        ageFactor: 1.0,
        performanceModifier: 1.0,
        fameModifier: 1.0,
      });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.queryByText('×1.00')).not.toBeInTheDocument();
    });
  });

  describe('Personality Modifier', () => {
    test('shows personality when not 1.0', () => {
      const breakdown = createBreakdown({
        personalityModifier: 0.90,
        components: {
          ...createBreakdown().components,
          afterPersonality: 11.7,
        },
      });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('Personality')).toBeInTheDocument();
      expect(screen.getByText('×0.90')).toBeInTheDocument();
    });

    test('hides personality when 1.0', () => {
      const breakdown = createBreakdown({ personalityModifier: 1.0 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.queryByText('Personality')).not.toBeInTheDocument();
    });
  });

  describe('Tier Display', () => {
    test('shows salary tier', () => {
      const breakdown = createBreakdown({ finalSalary: 32.0 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('All-Star Contract')).toBeInTheDocument();
    });
  });
});

// ============================================
// SALARY COMPACT TESTS
// ============================================

describe('SalaryCompact Component', () => {
  describe('Basic Display', () => {
    test('renders salary label and value', () => {
      render(<SalaryCompact salary={20.0} />);
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('$20.0M')).toBeInTheDocument();
    });
  });

  describe('ROI Display', () => {
    test('shows value label when WAR provided', () => {
      render(<SalaryCompact salary={10.0} war={2.5} />);
      expect(screen.getByText('Value')).toBeInTheDocument();
    });

    test('hides value when no WAR', () => {
      render(<SalaryCompact salary={10.0} />);
      expect(screen.queryByText('Value')).not.toBeInTheDocument();
    });

    test('shows ELITE VALUE for high WAR/salary ratio', () => {
      render(<SalaryCompact salary={5.0} war={5.0} />);
      expect(screen.getByText('ELITE VALUE')).toBeInTheDocument();
    });

    test('shows GREAT VALUE for good WAR/salary ratio', () => {
      // 4.0 WAR / 10.0 salary = 0.4 WAR/$M, which is between 0.25 (GOOD) and 0.5 (GREAT)
      // So this should be GOOD VALUE, not GREAT VALUE
      // For GREAT VALUE, need >= 0.5 WAR/$M
      render(<SalaryCompact salary={10.0} war={6.0} />); // 0.6 WAR/$M
      expect(screen.getByText('GREAT VALUE')).toBeInTheDocument();
    });

    test('shows FAIR VALUE for moderate WAR/salary ratio', () => {
      render(<SalaryCompact salary={20.0} war={4.0} />);
      expect(screen.getByText('FAIR VALUE')).toBeInTheDocument();
    });

    test('shows POOR VALUE for low WAR/salary ratio', () => {
      render(<SalaryCompact salary={30.0} war={2.0} />);
      expect(screen.getByText('POOR VALUE')).toBeInTheDocument();
    });

    test('shows BUST for very low WAR/salary ratio', () => {
      render(<SalaryCompact salary={40.0} war={0.5} />);
      expect(screen.getByText('BUST')).toBeInTheDocument();
    });
  });
});

// ============================================
// SALARY SECTION TESTS
// ============================================

describe('SalarySection Component', () => {
  describe('Basic Display', () => {
    test('renders CONTRACT title', () => {
      render(<SalarySection salary={15.0} />);
      expect(screen.getByText('CONTRACT')).toBeInTheDocument();
    });

    test('renders salary amount', () => {
      render(<SalarySection salary={22.5} />);
      expect(screen.getByText('$22.5M')).toBeInTheDocument();
    });

    test('renders salary tier', () => {
      render(<SalarySection salary={35.0} />);
      expect(screen.getByText('All-Star Contract')).toBeInTheDocument();
    });
  });

  describe('ROI Section', () => {
    test('shows WAR/$M label when WAR provided', () => {
      render(<SalarySection salary={10.0} war={2.0} />);
      expect(screen.getByText('WAR/$M:')).toBeInTheDocument();
    });

    test('hides WAR/$M when no WAR', () => {
      render(<SalarySection salary={10.0} />);
      expect(screen.queryByText('WAR/$M:')).not.toBeInTheDocument();
    });

    test('shows ROI value', () => {
      render(<SalarySection salary={10.0} war={3.0} />);
      expect(screen.getByText('0.30')).toBeInTheDocument();
    });

    test('shows ROI tier display', () => {
      render(<SalarySection salary={5.0} war={5.0} />);
      expect(screen.getByText(/Elite Value/)).toBeInTheDocument();
    });
  });

  describe('Breakdown Mini Section', () => {
    test('shows breakdown when showBreakdown=true and breakdown provided', () => {
      const breakdown = createBreakdown({ positionMultiplier: 1.15 });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Position').length).toBeGreaterThan(0);
      expect(screen.getByText('×1.15')).toBeInTheDocument();
    });

    test('hides breakdown when showBreakdown=false', () => {
      const breakdown = createBreakdown();
      render(<SalarySection salary={13.0} showBreakdown={false} breakdown={breakdown} />);
      // Position should only appear once (not in mini breakdown)
      expect(screen.queryByText('×1.15')).not.toBeInTheDocument();
    });

    test('hides breakdown when no breakdown provided', () => {
      render(<SalarySection salary={13.0} showBreakdown={true} />);
      expect(screen.queryByText('×1.15')).not.toBeInTheDocument();
    });

    test('shows age factor in mini breakdown', () => {
      const breakdown = createBreakdown({ ageFactor: 0.90 });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Age').length).toBeGreaterThan(0);
      expect(screen.getByText('×0.90')).toBeInTheDocument();
    });

    test('shows trait modifier when not 1.0', () => {
      const breakdown = createBreakdown({ traitModifier: 1.25 });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Traits').length).toBeGreaterThan(0);
      expect(screen.getByText('×1.25')).toBeInTheDocument();
    });

    test('hides trait modifier when 1.0', () => {
      const breakdown = createBreakdown({ traitModifier: 1.0 });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      // Traits should only appear once in title, not in mini breakdown row
      const traitsElements = screen.queryAllByText('Traits');
      // With traitModifier = 1.0, the Traits row should not appear
      expect(traitsElements.length).toBeLessThanOrEqual(1);
    });

    test('shows fame modifier when not 1.0', () => {
      // Use different values for each modifier to avoid collision
      const breakdown = createBreakdown({
        fameModifier: 1.25,
        traitModifier: 1.0,
        positionMultiplier: 1.10,
        ageFactor: 0.90
      });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Fame').length).toBeGreaterThan(0);
      // Fame modifier should show 1.25 - use function matcher since text is split
      expect(screen.getByText((_content, element) => {
        return element?.textContent === '×1.25';
      })).toBeInTheDocument();
    });

    test('hides fame modifier when 1.0', () => {
      const breakdown = createBreakdown({ fameModifier: 1.0 });
      render(<SalarySection salary={13.0} showBreakdown={true} breakdown={breakdown} />);
      // Fame should not appear in mini breakdown when modifier is 1.0
      expect(screen.queryByText('Fame')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles zero salary', () => {
    render(<SalaryBadge salary={0} />);
    expect(screen.getByText('$0K')).toBeInTheDocument();
    expect(screen.getByText('Minimum Contract')).toBeInTheDocument();
  });

  test('handles very large salary', () => {
    render(<SalaryBadge salary={100.0} />);
    expect(screen.getByText('$100.0M')).toBeInTheDocument();
    expect(screen.getByText('Superstar Contract')).toBeInTheDocument();
  });

  test('handles negative WAR in ROI calculation', () => {
    render(<SalaryCompact salary={20.0} war={-1.0} />);
    // Should still render value, but with BUST tier
    expect(screen.getByText('BUST')).toBeInTheDocument();
  });

  test('handles zero WAR in ROI calculation', () => {
    render(<SalaryCompact salary={15.0} war={0} />);
    expect(screen.getByText('BUST')).toBeInTheDocument();
  });

  test('handles very high WAR/salary ratio', () => {
    render(<SalaryCompact salary={1.0} war={10.0} />);
    expect(screen.getByText('ELITE VALUE')).toBeInTheDocument();
  });
});
