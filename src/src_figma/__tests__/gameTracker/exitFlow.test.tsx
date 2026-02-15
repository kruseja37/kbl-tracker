/**
 * Exit Flow Test (BUG-006: Exit type requires single modal in GameTracker)
 * @franchise-game-tracker
 */

import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AtBatFlow from '../../../components/GameTracker/AtBatFlow';

vi.mock('../../../components/GameTracker/FieldingModal', () => ({
  __esModule: true,
  default: () => <div data-testid="fielding-modal">Fielding Modal</div>,
}));

const baseProps = {
  result: 'GO' as const,
  bases: {
    first: null,
    second: null,
    third: null,
  },
  batterName: 'Test Batter',
  outs: 1,
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

describe('@franchise-game-tracker AtBatFlow exit modal', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('@franchise-game-tracker modal stays singular when direction choosers rerun', () => {
    render(<AtBatFlow {...baseProps} />);

    const directionButton = screen.getByRole('button', { name: 'Left' });
    fireEvent.click(directionButton);

    expect(screen.getAllByTestId('fielding-modal')).toHaveLength(1);

    fireEvent.click(directionButton);
    expect(screen.getAllByTestId('fielding-modal')).toHaveLength(1);
  });
});
