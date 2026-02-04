/**
 * AtBatButtons Component Tests
 *
 * Tests the AtBatButtons React component rendering and interaction.
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AtBatButtons from '../../../components/GameTracker/AtBatButtons';

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('AtBatButtons Component', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders RESULT label', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('RESULT:')).toBeInTheDocument();
    });

    test('renders EVENTS label', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('EVENTS:')).toBeInTheDocument();
    });

    test('renders all hit buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('1B')).toBeInTheDocument();
      expect(screen.getByText('2B')).toBeInTheDocument();
      expect(screen.getByText('3B')).toBeInTheDocument();
      expect(screen.getByText('HR')).toBeInTheDocument();
    });

    test('renders walk buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('BB')).toBeInTheDocument();
      expect(screen.getByText('IBB')).toBeInTheDocument();
      expect(screen.getByText('HBP')).toBeInTheDocument();
    });

    test('renders out buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('K')).toBeInTheDocument();
      expect(screen.getByText('KL')).toBeInTheDocument();
      expect(screen.getByText('GO')).toBeInTheDocument();
      expect(screen.getByText('FO')).toBeInTheDocument();
      expect(screen.getByText('LO')).toBeInTheDocument();
      expect(screen.getByText('PO')).toBeInTheDocument();
    });

    test('renders special result buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('DP')).toBeInTheDocument();
      expect(screen.getByText('SF')).toBeInTheDocument();
      expect(screen.getByText('SAC')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
      expect(screen.getByText('FC')).toBeInTheDocument();
      expect(screen.getByText('D3K')).toBeInTheDocument();
    });

    test('renders event buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('Steal')).toBeInTheDocument();
      expect(screen.getByText('CS')).toBeInTheDocument();
      expect(screen.getByText('WP')).toBeInTheDocument();
      expect(screen.getByText('PB')).toBeInTheDocument();
      expect(screen.getByText('Pickoff')).toBeInTheDocument();
    });

    test('renders substitution buttons', () => {
      render(<AtBatButtons {...defaultProps} />);
      expect(screen.getByText('Pitching Change')).toBeInTheDocument();
      expect(screen.getByText('Pinch Hitter')).toBeInTheDocument();
      expect(screen.getByText('Pinch Runner')).toBeInTheDocument();
      expect(screen.getByText('Def Sub')).toBeInTheDocument();
      expect(screen.getByText('Pos Switch')).toBeInTheDocument();
    });
  });

  describe('Button Click Handlers', () => {
    test('calls onResult when hit button clicked', () => {
      const onResult = vi.fn();
      render(<AtBatButtons {...defaultProps} onResult={onResult} />);

      fireEvent.click(screen.getByText('1B'));
      expect(onResult).toHaveBeenCalledWith('1B');

      fireEvent.click(screen.getByText('HR'));
      expect(onResult).toHaveBeenCalledWith('HR');
    });

    test('calls onResult when out button clicked', () => {
      const onResult = vi.fn();
      render(<AtBatButtons {...defaultProps} onResult={onResult} />);

      fireEvent.click(screen.getByText('K'));
      expect(onResult).toHaveBeenCalledWith('K');

      fireEvent.click(screen.getByText('GO'));
      expect(onResult).toHaveBeenCalledWith('GO');
    });

    test('calls onEvent when event button clicked', () => {
      const onEvent = vi.fn();
      // Need runners for steal to be enabled
      render(
        <AtBatButtons
          {...defaultProps}
          onEvent={onEvent}
          bases={{ first: 'player1', second: null, third: null }}
        />
      );

      fireEvent.click(screen.getByText('Steal'));
      expect(onEvent).toHaveBeenCalledWith('SB');
    });

    test('calls onEvent when substitution button clicked', () => {
      const onEvent = vi.fn();
      render(<AtBatButtons {...defaultProps} onEvent={onEvent} />);

      fireEvent.click(screen.getByText('Pitching Change'));
      expect(onEvent).toHaveBeenCalledWith('PITCH_CHANGE');

      fireEvent.click(screen.getByText('Pinch Hitter'));
      expect(onEvent).toHaveBeenCalledWith('PINCH_HIT');
    });
  });

  describe('Disabled State', () => {
    test('disables all buttons when disabled prop is true', () => {
      render(<AtBatButtons {...defaultProps} disabled={true} />);

      // Check a sample of buttons
      expect(screen.getByText('1B')).toBeDisabled();
      expect(screen.getByText('K')).toBeDisabled();
      expect(screen.getByText('Pitching Change')).toBeDisabled();
    });

    test('buttons work when not disabled', () => {
      const onResult = vi.fn();
      render(<AtBatButtons {...defaultProps} onResult={onResult} disabled={false} />);

      fireEvent.click(screen.getByText('1B'));
      expect(onResult).toHaveBeenCalled();
    });
  });
});

// ============================================
// D3K AVAILABILITY TESTS
// ============================================

describe('AtBatButtons D3K Availability', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('D3K enabled with bases empty', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('D3K')).not.toBeDisabled();
  });

  test('D3K disabled with runner on first and less than 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={0}
      />
    );
    expect(screen.getByText('D3K')).toBeDisabled();
  });

  test('D3K enabled with runner on first and 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={2}
      />
    );
    expect(screen.getByText('D3K')).not.toBeDisabled();
  });

  test('D3K enabled with runner on second only (first empty)', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: null, second: 'player2', third: null }}
        outs={1}
      />
    );
    expect(screen.getByText('D3K')).not.toBeDisabled();
  });
});

// ============================================
// SAC/SF AVAILABILITY TESTS
// ============================================

describe('AtBatButtons SAC Availability', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('SAC disabled with bases empty', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('SAC')).toBeDisabled();
  });

  test('SAC enabled with runner on first and 0 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={0}
      />
    );
    expect(screen.getByText('SAC')).not.toBeDisabled();
  });

  test('SAC disabled with 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={2}
      />
    );
    expect(screen.getByText('SAC')).toBeDisabled();
  });
});

describe('AtBatButtons SF Availability', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('SF disabled with no runner on third', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('SF')).toBeDisabled();
  });

  test('SF enabled with runner on third and less than 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: null, second: null, third: 'player3' }}
        outs={1}
      />
    );
    expect(screen.getByText('SF')).not.toBeDisabled();
  });

  test('SF disabled with runner on third but 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: null, second: null, third: 'player3' }}
        outs={2}
      />
    );
    expect(screen.getByText('SF')).toBeDisabled();
  });
});

// ============================================
// DP AVAILABILITY TESTS
// ============================================

describe('AtBatButtons DP Availability', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('DP disabled with bases empty', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('DP')).toBeDisabled();
  });

  test('DP enabled with runner on first', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={0}
      />
    );
    expect(screen.getByText('DP')).not.toBeDisabled();
  });

  test('DP disabled with 2 outs', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
        outs={2}
      />
    );
    expect(screen.getByText('DP')).toBeDisabled();
  });
});

// ============================================
// RUNNER-DEPENDENT EVENT TESTS
// ============================================

describe('AtBatButtons Runner Events', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('steal button disabled with no runners', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('Steal')).toBeDisabled();
  });

  test('steal button enabled with runner on base', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'player1', second: null, third: null }}
      />
    );
    expect(screen.getByText('Steal')).not.toBeDisabled();
  });

  test('CS button disabled with no runners', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('CS')).toBeDisabled();
  });

  test('WP button disabled with no runners', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('WP')).toBeDisabled();
  });

  test('Pickoff button disabled with no runners', () => {
    render(<AtBatButtons {...defaultProps} />);
    expect(screen.getByText('Pickoff')).toBeDisabled();
  });

  test('all runner events enabled with bases loaded', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'p1', second: 'p2', third: 'p3' }}
      />
    );
    expect(screen.getByText('Steal')).not.toBeDisabled();
    expect(screen.getByText('CS')).not.toBeDisabled();
    expect(screen.getByText('WP')).not.toBeDisabled();
    expect(screen.getByText('Pickoff')).not.toBeDisabled();
  });
});

// ============================================
// COMPLEX SCENARIOS
// ============================================

describe('AtBatButtons Complex Scenarios', () => {
  const defaultProps = {
    onResult: vi.fn(),
    onEvent: vi.fn(),
    disabled: false,
    outs: 0,
    bases: { first: null, second: null, third: null },
  };

  test('bases loaded with 0 outs - all special plays available', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'p1', second: 'p2', third: 'p3' }}
        outs={0}
      />
    );

    expect(screen.getByText('SAC')).not.toBeDisabled();
    expect(screen.getByText('SF')).not.toBeDisabled();
    expect(screen.getByText('DP')).not.toBeDisabled();
    expect(screen.getByText('D3K')).toBeDisabled(); // First occupied, not 2 outs
  });

  test('bases loaded with 2 outs - only D3K available of special plays', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: 'p1', second: 'p2', third: 'p3' }}
        outs={2}
      />
    );

    expect(screen.getByText('SAC')).toBeDisabled(); // Can't with 2 outs
    expect(screen.getByText('SF')).toBeDisabled(); // Can't with 2 outs
    expect(screen.getByText('DP')).toBeDisabled(); // Can't with 2 outs
    expect(screen.getByText('D3K')).not.toBeDisabled(); // 2 outs rule
  });

  test('runners on 2nd and 3rd with 1 out', () => {
    render(
      <AtBatButtons
        {...defaultProps}
        bases={{ first: null, second: 'p2', third: 'p3' }}
        outs={1}
      />
    );

    expect(screen.getByText('SAC')).not.toBeDisabled(); // Runners + < 2 outs
    expect(screen.getByText('SF')).not.toBeDisabled(); // Runner on 3rd + < 2 outs
    expect(screen.getByText('DP')).not.toBeDisabled(); // Runners + < 2 outs
    expect(screen.getByText('D3K')).not.toBeDisabled(); // First empty
  });
});
