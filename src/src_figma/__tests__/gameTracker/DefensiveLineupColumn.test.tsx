import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { DefensiveLineupColumn } from '../../app/components/DefensiveLineupColumn';
import { getMojoColor } from '../../../engines/mojoEngine';

const baseProps = {
  players: [
    {
      playerId: 'home-1',
      name: 'Home Starter',
      position: 'P',
      battingOrder: 1,
      isPitcher: true,
      pitchCount: 0,
      jerseyNumber: 31,
      hometown: { city: 'Boulder', state: 'CO' },
      gameLine: '0 for 0; 2 BB',
    },
    {
      playerId: 'home-2',
      name: 'Home Catcher',
      position: 'C',
      battingOrder: 2,
      isPitcher: false,
      jerseyNumber: 12,
      hometown: { city: 'Aurora', state: 'CO' },
      gameLine: '1 for 4; HR; 2 RBI; CS; Gem',
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

  test('uses the canonical mojo palette for normal-state defensive names', () => {
    render(
      <DefensiveLineupColumn
        {...baseProps}
        playerStates={{
          'home-1': { mojo: 0, fitness: 'FIT' },
          'home-2': { mojo: 0, fitness: 'FIT' },
        }}
      />,
    );

    expect(screen.getByText('Home Starter')).toHaveStyle({
      color: getMojoColor(0),
    });
  });

  test('renders defensive metadata and a wrapped current-game line without adding row height', () => {
    render(<DefensiveLineupColumn {...baseProps} />);

    const battingOrder = screen.getByText('1.');
    const starterMeta = screen.getByTestId('defensive-lineup-meta-home-1');
    const catcherMeta = screen.getByTestId('defensive-lineup-meta-home-2');
    const starterGameLine = screen.getByTestId('defensive-lineup-game-line-home-1');
    const catcherGameLine = screen.getByTestId('defensive-lineup-game-line-home-2');

    expect(battingOrder).toHaveStyle({
      fontFamily: "'Moms Typewriter', monospace",
      fontSize: '11px',
      lineHeight: '13px',
    });
    expect(starterMeta).toHaveTextContent('PC: 0#31 Boulder, CO');
    expect(starterMeta).toHaveClass('ml-[26px]', 'h-[9px]', 'max-h-[9px]', 'overflow-hidden');
    expect(starterMeta.parentElement).toHaveStyle({
      fontSize: '8px',
      lineHeight: '9px',
      fontFamily: "'Tox Typewriter', monospace",
    });
    expect(catcherMeta).toHaveTextContent('#12 Aurora, CO');
    expect(catcherMeta).toHaveClass('ml-[26px]', 'h-[9px]', 'max-h-[9px]', 'overflow-hidden');
    expect(screen.getByText('#31')).toHaveStyle({ fontSize: '9px', color: 'rgb(212, 184, 90)' });
    expect(screen.getByText('Boulder, CO')).toHaveStyle({ fontSize: '8px' });
    expect(starterGameLine).toHaveTextContent('0 for 0; 2 BB');
    expect(catcherGameLine).toHaveTextContent('1 for 4; HR; 2 RBI; CS; Gem');
    expect(starterGameLine).toHaveClass('ml-[34px]');
    expect(catcherGameLine).toHaveClass('ml-[34px]');
    expect(starterGameLine.style.fontFamily).toBe('"Tox Typewriter", monospace');
    expect(starterGameLine.style.fontSize).toBe('8.5px');
    expect(starterGameLine.style.lineHeight).toBe('9px');
    expect(starterGameLine.style.display).toBe('-webkit-box');
    expect(starterGameLine.style.webkitLineClamp).toBe('2');
    expect(starterGameLine.style.whiteSpace).toBe('normal');
  });
});
