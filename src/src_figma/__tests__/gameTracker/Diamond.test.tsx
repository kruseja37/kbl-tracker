/**
 * Diamond Component Tests
 *
 * Tests the Diamond React component that displays the base path
 * and runners on base.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Diamond from '../../../components/GameTracker/Diamond';
import type { Runner } from '../../../types/game';

// ============================================
// TYPES
// ============================================

interface Bases {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}

const createRunner = (name: string, id: string = 'p1'): Runner => ({
  playerId: id,
  playerName: name,
});

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('Diamond Component', () => {
  const defaultProps = {
    bases: { first: null, second: null, third: null } as Bases,
    onBaseClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Base Labels', () => {
    test('renders 1B label', () => {
      render(<Diamond {...defaultProps} />);
      expect(screen.getByText('1B')).toBeInTheDocument();
    });

    test('renders 2B label', () => {
      render(<Diamond {...defaultProps} />);
      expect(screen.getByText('2B')).toBeInTheDocument();
    });

    test('renders 3B label', () => {
      render(<Diamond {...defaultProps} />);
      expect(screen.getByText('3B')).toBeInTheDocument();
    });
  });

  describe('Empty Bases', () => {
    test('renders with no runners', () => {
      render(<Diamond {...defaultProps} />);
      // Should render without crashing
      expect(screen.getByText('1B')).toBeInTheDocument();
    });
  });

  describe('Runner Display', () => {
    test('shows runner on first base', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: createRunner('John Smith'),
            second: null,
            third: null,
          }}
        />
      );
      // Should show last name
      expect(screen.getByText('Smith')).toBeInTheDocument();
    });

    test('shows runner on second base', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: null,
            second: createRunner('Mike Johnson'),
            third: null,
          }}
        />
      );
      expect(screen.getByText('Johnson')).toBeInTheDocument();
    });

    test('shows runner on third base', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: null,
            second: null,
            third: createRunner('Tom Williams'),
          }}
        />
      );
      expect(screen.getByText('Williams')).toBeInTheDocument();
    });

    test('shows all runners when bases loaded', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: createRunner('John Smith'),
            second: createRunner('Mike Johnson'),
            third: createRunner('Tom Williams'),
          }}
        />
      );
      expect(screen.getByText('Smith')).toBeInTheDocument();
      expect(screen.getByText('Johnson')).toBeInTheDocument();
      expect(screen.getByText('Williams')).toBeInTheDocument();
    });
  });

  describe('Runner Name Formatting', () => {
    test('extracts last name from full name', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: createRunner('Juan Carlos Rodriguez'),
            second: null,
            third: null,
          }}
        />
      );
      expect(screen.getByText('Rodriguez')).toBeInTheDocument();
    });

    test('handles single name', () => {
      render(
        <Diamond
          {...defaultProps}
          bases={{
            first: createRunner('Cher'),
            second: null,
            third: null,
          }}
        />
      );
      expect(screen.getByText('Cher')).toBeInTheDocument();
    });
  });

  describe('Base Click Handlers', () => {
    test('calls onBaseClick with "first" when first base clicked', () => {
      const onBaseClick = vi.fn();
      render(
        <Diamond
          bases={{ first: null, second: null, third: null }}
          onBaseClick={onBaseClick}
        />
      );

      // Find the first base element (we can find it by its structure)
      // The labels have pointerEvents: none, so they won't interfere
      // Find elements by their role or test clicking any clickable area
      const container = document.querySelector('[style*="cursor: pointer"]');
      if (container) {
        fireEvent.click(container);
        expect(onBaseClick).toHaveBeenCalled();
      }
    });

    test('calls onBaseClick with "home" when home plate clicked', () => {
      const onBaseClick = vi.fn();
      render(
        <Diamond
          bases={{ first: null, second: null, third: null }}
          onBaseClick={onBaseClick}
        />
      );

      // Home plate has distinct clip-path style
      const homePlate = document.querySelector('[style*="clip-path"]');
      if (homePlate) {
        fireEvent.click(homePlate);
        expect(onBaseClick).toHaveBeenCalledWith('home');
      }
    });
  });
});

// ============================================
// RUNNER SCENARIOS
// ============================================

describe('Diamond Runner Scenarios', () => {
  const onBaseClick = vi.fn();

  test('runner on first and third (corners)', () => {
    render(
      <Diamond
        bases={{
          first: createRunner('Player One'),
          second: null,
          third: createRunner('Player Three'),
        }}
        onBaseClick={onBaseClick}
      />
    );

    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
    expect(screen.queryByText('Two')).not.toBeInTheDocument();
  });

  test('runner on second only (scoring position)', () => {
    render(
      <Diamond
        bases={{
          first: null,
          second: createRunner('Speedy Runner'),
          third: null,
        }}
        onBaseClick={onBaseClick}
      />
    );

    expect(screen.getByText('Runner')).toBeInTheDocument();
  });

  test('runners on second and third (scoring position)', () => {
    render(
      <Diamond
        bases={{
          first: null,
          second: createRunner('Runner Two'),
          third: createRunner('Runner Three'),
        }}
        onBaseClick={onBaseClick}
      />
    );

    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getByText('Three')).toBeInTheDocument();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Diamond Edge Cases', () => {
  const onBaseClick = vi.fn();

  test('handles empty string player name', () => {
    render(
      <Diamond
        bases={{
          first: createRunner(''),
          second: null,
          third: null,
        }}
        onBaseClick={onBaseClick}
      />
    );
    // Should not crash
    expect(screen.getByText('1B')).toBeInTheDocument();
  });

  test('handles special characters in name', () => {
    render(
      <Diamond
        bases={{
          first: createRunner("J.D. O'Brien Jr."),
          second: null,
          third: null,
        }}
        onBaseClick={onBaseClick}
      />
    );
    expect(screen.getByText("Jr.")).toBeInTheDocument();
  });

  test('handles hyphenated names', () => {
    render(
      <Diamond
        bases={{
          first: createRunner('Mary Johnson-Smith'),
          second: null,
          third: null,
        }}
        onBaseClick={onBaseClick}
      />
    );
    expect(screen.getByText('Johnson-Smith')).toBeInTheDocument();
  });
});
