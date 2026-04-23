import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { QuickBar } from '../../app/components/QuickBar';

describe('QuickBar', () => {
  test('shows LO as a primary live-game button', () => {
    render(
      <QuickBar
        gamePhase="LIVE"
        onStartGame={vi.fn()}
        onOutcome={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'LO' })).toBeInTheDocument();
  });

  test('disables FC when no runners are on base', () => {
    const onOutcome = vi.fn();

    render(
      <QuickBar
        gamePhase="LIVE"
        onStartGame={vi.fn()}
        onOutcome={onOutcome}
        gameSituation={{ outs: 0, bases: { first: false, second: false, third: false } }}
      />,
    );

    const fcButton = screen.getByRole('button', { name: 'FC' });
    expect(fcButton).toBeDisabled();
    fcButton.click();
    expect(onOutcome).not.toHaveBeenCalled();
  });

  test('enables FC when a runner is on base', () => {
    render(
      <QuickBar
        gamePhase="LIVE"
        onStartGame={vi.fn()}
        onOutcome={vi.fn()}
        gameSituation={{ outs: 0, bases: { first: true, second: false, third: false } }}
      />,
    );

    expect(screen.getByRole('button', { name: 'FC' })).not.toBeDisabled();
  });
});
