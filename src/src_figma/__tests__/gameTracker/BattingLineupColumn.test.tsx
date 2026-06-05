import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { BattingLineupColumn } from '../../app/components/BattingLineupColumn';
import { getMojoColor } from '../../../engines/mojoEngine';

const baseProps = {
  players: [
    {
      playerId: 'away-1',
      name: 'Away Starter',
      position: 'SS',
      battingOrder: 1,
      jerseyNumber: 42,
      hometown: { city: 'Denver', state: 'CO' },
      gameLine: '2 for 3; 2B; 3 RBI; SB',
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

  test('uses the canonical mojo palette for normal-state lineup names', () => {
    render(
      <BattingLineupColumn
        {...baseProps}
        playerStates={{ 'away-1': { mojo: 0, fitness: 'FIT' } }}
      />,
    );

    expect(screen.getByText('Away Starter')).toHaveStyle({
      color: getMojoColor(0),
    });
  });

  test('renders jersey number, hometown, and a wrapped game line without growing the row', () => {
    render(<BattingLineupColumn {...baseProps} />);

    const nameRow = screen.getByTestId('batting-lineup-name-row-away-1');
    const nameHighlight = screen.getByTestId('batting-lineup-name-highlight-away-1');
    const meta = screen.getByTestId('batting-lineup-meta-away-1');
    const gameLine = screen.getByTestId('batting-lineup-game-line-away-1');
    const battingOrder = screen.getByText('1.');

    expect(nameRow.style.backgroundImage).toBe('');
    expect(nameRow).toHaveClass('min-h-[22px]', 'leading-[11px]');
    expect(nameHighlight.style.backgroundImage).not.toBe('');
    expect(nameHighlight.style.backgroundColor).toBe('rgba(242, 192, 65, 0.03)');
    expect(nameHighlight).toHaveClass('flex-1');
    expect(battingOrder).toHaveStyle({
      fontFamily: "'Moms Typewriter', monospace",
      fontSize: '11px',
      lineHeight: '13px',
    });
    expect(meta).toHaveTextContent('#42 Denver, CO');
    expect(meta).toHaveClass('ml-[26px]', 'h-[9px]', 'max-h-[9px]', 'overflow-hidden');
    expect(meta).toHaveStyle({ lineHeight: '9px', fontFamily: "'Tox Typewriter', monospace" });
    expect(meta.style.backgroundImage).not.toBe('');
    expect(meta.style.backgroundColor).toBe('rgba(242, 192, 65, 0.03)');
    expect(gameLine.style.backgroundImage).toBe('');
    expect(screen.getByText('#42')).toHaveStyle({ fontSize: '9px', color: 'rgb(212, 184, 90)' });
    expect(screen.getByText('Denver, CO')).toHaveStyle({ fontSize: '8px' });
    expect(gameLine).toHaveTextContent('2 for 3; 2B; 3 RBI; SB');
    expect(gameLine).toHaveClass('ml-[34px]');
    expect(gameLine.style.fontFamily).toBe('"Tox Typewriter", monospace');
    expect(gameLine.style.fontSize).toBe('8.5px');
    expect(gameLine.style.lineHeight).toBe('9px');
    expect(gameLine.style.display).toBe('-webkit-box');
    expect(gameLine.style.webkitLineClamp).toBe('2');
    expect(gameLine.style.whiteSpace).toBe('normal');
  });

  test('keeps the runner base marker visible before a wrapped full lineup name', () => {
    render(
      <BattingLineupColumn
        {...baseProps}
        players={[
          {
            ...baseProps.players[0],
            name: 'Extremely Long Away Starter Name',
          },
        ]}
        runners={{ first: { playerId: 'away-1', name: 'Extremely Long Away Starter Name' } }}
      />,
    );

    const nameHighlight = screen.getByTestId('batting-lineup-name-highlight-away-1');
    const baseMarker = screen.getByTestId('batting-lineup-runner-base-away-1');
    const nameMarker = screen.getByText('Extremely Long Away Starter Name');
    const positionMarker = screen.getByText('SS');

    expect(nameHighlight).toHaveClass('flex');
    expect(nameHighlight).not.toHaveClass('overflow-hidden');
    expect(nameMarker).toHaveClass('whitespace-normal', 'break-words');
    expect(nameMarker.style.display).toBe('-webkit-box');
    expect(nameMarker.style.webkitLineClamp).toBe('2');
    expect(baseMarker).toHaveTextContent('1');
    expect(baseMarker.tagName).toBe('SPAN');
    expect(baseMarker).toHaveClass('inline-flex', 'shrink-0', 'self-start', 'font-black');
    const children = Array.from(nameHighlight.children);
    expect(children.indexOf(baseMarker)).toBeLessThan(children.indexOf(nameMarker));
    expect(children.indexOf(nameMarker)).toBeLessThan(children.indexOf(positionMarker));
    expect(baseMarker).not.toHaveClass('border', 'bg-[#0c1f2b]');
    expect(baseMarker.style.color).toBe('rgb(68, 85, 102)');
    expect(baseMarker.style.fontFamily).toBe('"Moms Typewriter", monospace');
    expect(baseMarker.style.fontSize).toBe('8px');
    expect(baseMarker.style.letterSpacing).toBe('0');
    expect(baseMarker.style.lineHeight).toBe('8px');
    expect(baseMarker.style.textShadow).toBe('0 1px 1px rgba(0,0,0,0.9)');
    expect(baseMarker.style.transform).toBe('');
    expect(baseMarker).toHaveAccessibleName('1B runner');
    expect(baseMarker).toHaveAttribute('title', 'Extremely Long Away Starter Name on 1B');
  });
});
