import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { QuickBar } from '../../app/components/QuickBar';

describe('QuickBar', () => {
  test('shows SF as a primary live-game button', () => {
    render(
      <QuickBar
        gamePhase="LIVE"
        onStartGame={vi.fn()}
        onOutcome={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'SF' })).toBeInTheDocument();
  });
});
