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
  baseSalary: 10000,
  positionMultiplier: 1.15,
  traitModifier: 1.1,
  ageFactor: 0.95,
  performanceModifier: 1.05,
  fameModifier: 1.03,
  personalityModifier: 1.0,
  components: {
    afterPosition: 11500,
    afterTraits: 12650,
    afterAge: 12018,
    afterPerformance: 12619,
    afterFame: 13000,
    afterPersonality: 13000,
  },
  finalSalary: 13000,
  ...overrides,
});

// ============================================
// SALARY BADGE TESTS
// ============================================

describe('SalaryBadge Component', () => {
  describe('Salary Formatting', () => {
    test('formats bridge-scale salary with K suffix', () => {
      render(<SalaryBadge salary={15500} />);
      expect(screen.getByText('$15.5K')).toBeInTheDocument();
    });

    test('formats sub-thousand salary correctly', () => {
      render(<SalaryBadge salary={500} />);
      expect(screen.getByText('$500')).toBeInTheDocument();
    });

    test('formats large salary correctly', () => {
      render(<SalaryBadge salary={45000} />);
      expect(screen.getByText('$45.0K')).toBeInTheDocument();
    });
  });

  describe('Salary Tiers', () => {
    test('shows tier by default', () => {
      render(<SalaryBadge salary={80000} />);
      expect(screen.getByText('Premium Contract')).toBeInTheDocument();
    });

    test('hides tier when showTier=false', () => {
      render(<SalaryBadge salary={80000} showTier={false} />);
      expect(screen.queryByText('Premium Contract')).not.toBeInTheDocument();
    });

    test('shows Superstar tier for bridge-scale top contracts', () => {
      render(<SalaryBadge salary={145000} />);
      expect(screen.getByText('Superstar Contract')).toBeInTheDocument();
    });

    test('shows All-Star tier for bridge-scale upper contracts', () => {
      render(<SalaryBadge salary={110000} />);
      expect(screen.getByText('All-Star Contract')).toBeInTheDocument();
    });

    test('shows Premium tier for bridge-scale strong contracts', () => {
      render(<SalaryBadge salary={80000} />);
      expect(screen.getByText('Premium Contract')).toBeInTheDocument();
    });

    test('shows Solid tier for bridge-scale mid contracts', () => {
      render(<SalaryBadge salary={50000} />);
      expect(screen.getByText('Solid Contract')).toBeInTheDocument();
    });

    test('shows Moderate tier for bridge-scale depth contracts', () => {
      render(<SalaryBadge salary={25000} />);
      expect(screen.getByText('Moderate Contract')).toBeInTheDocument();
    });

    test('shows Budget tier for bridge-scale lower contracts', () => {
      render(<SalaryBadge salary={10000} />);
      expect(screen.getByText('Budget Contract')).toBeInTheDocument();
    });

    test('shows Minimum tier for bridge-scale minimum contracts', () => {
      render(<SalaryBadge salary={3000} />);
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

      expect(screen.getByText('Base (kblIV)')).toBeInTheDocument();
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
      const breakdown = createBreakdown({ finalSalary: 25500 });
      render(<SalaryBreakdownDisplay breakdown={breakdown} />);
      expect(screen.getByText('Final Salary')).toBeInTheDocument();
      expect(screen.getByText('$25.5K')).toBeInTheDocument();
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
      const breakdown = createBreakdown({ finalSalary: 110000 });
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
      render(<SalaryCompact salary={20000} />);
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('$20.0K')).toBeInTheDocument();
    });
  });

  describe('ROI Display', () => {
    test('shows value label when WAR provided', () => {
      render(<SalaryCompact salary={10000} war={2.5} />);
      expect(screen.getByText('Value')).toBeInTheDocument();
    });

    test('hides value when no WAR', () => {
      render(<SalaryCompact salary={10000} />);
      expect(screen.queryByText('Value')).not.toBeInTheDocument();
    });

    test('shows ELITE VALUE for high WAR/salary ratio', () => {
      render(<SalaryCompact salary={5000} war={2.0} />);
      expect(screen.getByText('ELITE VALUE')).toBeInTheDocument();
    });

    test('shows GREAT VALUE for good WAR/salary ratio', () => {
      render(<SalaryCompact salary={10000} war={2.0} />);
      expect(screen.getByText('GREAT VALUE')).toBeInTheDocument();
    });

    test('shows FAIR VALUE for moderate WAR/salary ratio', () => {
      render(<SalaryCompact salary={100000} war={5.0} />);
      expect(screen.getByText('FAIR VALUE')).toBeInTheDocument();
    });

    test('shows POOR VALUE for low WAR/salary ratio', () => {
      render(<SalaryCompact salary={100000} war={2.0} />);
      expect(screen.getByText('POOR VALUE')).toBeInTheDocument();
    });

    test('shows BUST for very low WAR/salary ratio', () => {
      render(<SalaryCompact salary={100000} war={0.5} />);
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
      render(<SalarySection salary={15000} />);
      expect(screen.getByText('CONTRACT')).toBeInTheDocument();
    });

    test('renders salary amount', () => {
      render(<SalarySection salary={22500} />);
      expect(screen.getByText('$22.5K')).toBeInTheDocument();
    });

    test('renders salary tier', () => {
      render(<SalarySection salary={110000} />);
      expect(screen.getByText('All-Star Contract')).toBeInTheDocument();
    });
  });

  describe('ROI Section', () => {
    test('shows WAR/$100K label when WAR provided', () => {
      render(<SalarySection salary={10000} war={2.0} />);
      expect(screen.getByText('WAR/$100K:')).toBeInTheDocument();
    });

    test('hides WAR/$100K when no WAR', () => {
      render(<SalarySection salary={10000} />);
      expect(screen.queryByText('WAR/$100K:')).not.toBeInTheDocument();
    });

    test('shows ROI value', () => {
      render(<SalarySection salary={10000} war={3.0} />);
      expect(screen.getByText('30.00')).toBeInTheDocument();
    });

    test('shows ROI tier display', () => {
      render(<SalarySection salary={5000} war={2.0} />);
      expect(screen.getByText(/Elite Value/)).toBeInTheDocument();
    });
  });

  describe('Breakdown Mini Section', () => {
    test('shows breakdown when showBreakdown=true and breakdown provided', () => {
      const breakdown = createBreakdown({ positionMultiplier: 1.15 });
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Position').length).toBeGreaterThan(0);
      expect(screen.getByText('×1.15')).toBeInTheDocument();
    });

    test('hides breakdown when showBreakdown=false', () => {
      const breakdown = createBreakdown();
      render(<SalarySection salary={13000} showBreakdown={false} breakdown={breakdown} />);
      // Position should only appear once (not in mini breakdown)
      expect(screen.queryByText('×1.15')).not.toBeInTheDocument();
    });

    test('hides breakdown when no breakdown provided', () => {
      render(<SalarySection salary={13000} showBreakdown={true} />);
      expect(screen.queryByText('×1.15')).not.toBeInTheDocument();
    });

    test('shows age factor in mini breakdown', () => {
      const breakdown = createBreakdown({ ageFactor: 0.90 });
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Age').length).toBeGreaterThan(0);
      expect(screen.getByText('×0.90')).toBeInTheDocument();
    });

    test('shows trait modifier when not 1.0', () => {
      const breakdown = createBreakdown({ traitModifier: 1.25 });
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Traits').length).toBeGreaterThan(0);
      expect(screen.getByText('×1.25')).toBeInTheDocument();
    });

    test('hides trait modifier when 1.0', () => {
      const breakdown = createBreakdown({ traitModifier: 1.0 });
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
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
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
      expect(screen.getAllByText('Fame').length).toBeGreaterThan(0);
      // Fame modifier should show 1.25 - use function matcher since text is split
      expect(screen.getByText((_content, element) => {
        return element?.textContent === '×1.25';
      })).toBeInTheDocument();
    });

    test('hides fame modifier when 1.0', () => {
      const breakdown = createBreakdown({ fameModifier: 1.0 });
      render(<SalarySection salary={13000} showBreakdown={true} breakdown={breakdown} />);
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
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('Minimum Contract')).toBeInTheDocument();
  });

  test('handles very large salary', () => {
    render(<SalaryBadge salary={1500000} />);
    expect(screen.getByText('$1.50M')).toBeInTheDocument();
    expect(screen.getByText('Superstar Contract')).toBeInTheDocument();
  });

  test('handles negative WAR in ROI calculation', () => {
    render(<SalaryCompact salary={20000} war={-1.0} />);
    // Should still render value, but with BUST tier
    expect(screen.getByText('BUST')).toBeInTheDocument();
  });

  test('handles zero WAR in ROI calculation', () => {
    render(<SalaryCompact salary={15000} war={0} />);
    expect(screen.getByText('BUST')).toBeInTheDocument();
  });

  test('handles very high WAR/salary ratio', () => {
    render(<SalaryCompact salary={1000} war={10.0} />);
    expect(screen.getByText('ELITE VALUE')).toBeInTheDocument();
  });
});
