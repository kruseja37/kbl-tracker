import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { BattingLineupColumn } from '../../app/components/BattingLineupColumn';

const baseProps = {
  players: [
    {
      playerId: 'away-1',
      name: 'Away Starter',
      position: 'SS',
      battingOrder: 1,
    },
  ],
  currentBatterIndex: 1,
  runners: {},
  nextLeadoffIndex: 2,
  teamPrimaryColor: '#112233',
  teamSecondaryColor: '#445566',
  getMojoForPlayer: () => 0,
  getFitnessForPlayer: () => 'FIT' as const,
  onPlayerTap: vi.fn(),
};

describe('BattingLineupColumn', () => {
  test('renders visible mojo adjust controls and triggers the callback without tapping the row', () => {
    const onMojoAdjust = vi.fn();
    const onPlayerTap = vi.fn();

    render(
      <BattingLineupColumn
        {...baseProps}
        onPlayerTap={onPlayerTap}
        onMojoAdjust={onMojoAdjust}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase mojo for Away Starter' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Decrease mojo for Away Starter' }),
    );

    expect(onMojoAdjust).toHaveBeenNthCalledWith(1, 'away-1', 'Away Starter', 1);
    expect(onMojoAdjust).toHaveBeenNthCalledWith(2, 'away-1', 'Away Starter', -1);
    expect(onPlayerTap).not.toHaveBeenCalled();
  });

  test('disables mojo controls at the configured bounds', () => {
    render(
      <BattingLineupColumn
        {...baseProps}
        playerStates={{ 'away-1': { mojo: 3, fitness: 'FIT' } }}
        onMojoAdjust={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Increase mojo for Away Starter' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Decrease mojo for Away Starter' }),
    ).not.toBeDisabled();
  });
});
