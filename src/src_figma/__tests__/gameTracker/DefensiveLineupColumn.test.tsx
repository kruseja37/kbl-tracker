import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { DefensiveLineupColumn } from '../../app/components/DefensiveLineupColumn';

const baseProps = {
  players: [
    {
      playerId: 'home-1',
      name: 'Home Starter',
      position: 'P',
      battingOrder: 1,
      isPitcher: true,
      pitchCount: 0,
    },
    {
      playerId: 'home-2',
      name: 'Home Catcher',
      position: 'C',
      battingOrder: 2,
      isPitcher: false,
    },
  ],
  currentPitcherName: 'Home Starter',
  nextLeadoffIndex: 2,
  teamPrimaryColor: '#112233',
  teamSecondaryColor: '#445566',
  getMojoForPlayer: () => undefined,
  getFitnessForPlayer: () => undefined,
  onPlayerTap: vi.fn(),
};

describe('DefensiveLineupColumn', () => {
  test('renders and triggers the header swap action', () => {
    const onClick = vi.fn();

    render(
      <DefensiveLineupColumn
        {...baseProps}
        headerAction={{ label: 'SWAP', onClick }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SWAP' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('renders visible mojo adjust controls and keeps row taps separate', () => {
    const onMojoAdjust = vi.fn();
    const onPlayerTap = vi.fn();

    render(
      <DefensiveLineupColumn
        {...baseProps}
        onPlayerTap={onPlayerTap}
        onMojoAdjust={onMojoAdjust}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase mojo for Home Starter' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Decrease mojo for Home Starter' }),
    );

    expect(onMojoAdjust).toHaveBeenNthCalledWith(1, 'home-1', 'Home Starter', 1);
    expect(onMojoAdjust).toHaveBeenNthCalledWith(2, 'home-1', 'Home Starter', -1);
    expect(onPlayerTap).not.toHaveBeenCalled();
  });

  test('keeps mojo controls active during enrichment mode without triggering fielder taps', () => {
    const onMojoAdjust = vi.fn();
    const onFielderTap = vi.fn();

    render(
      <DefensiveLineupColumn
        {...baseProps}
        onMojoAdjust={onMojoAdjust}
        enrichmentMode={{
          active: true,
          sequence: [],
          onFielderTap,
          onDone: vi.fn(),
          onClear: vi.fn(),
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase mojo for Home Starter' }),
    );

    expect(onMojoAdjust).toHaveBeenCalledWith('home-1', 'Home Starter', 1);
    expect(onFielderTap).not.toHaveBeenCalled();
  });

  test('disables mojo controls at the configured bounds', () => {
    render(
      <DefensiveLineupColumn
        {...baseProps}
        playerStates={{
          'home-1': { mojo: -2, fitness: 'FIT' },
          'home-2': { mojo: 0, fitness: 'FIT' },
        }}
        onMojoAdjust={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Decrease mojo for Home Starter' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Increase mojo for Home Starter' }),
    ).not.toBeDisabled();
  });
});
