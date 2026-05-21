import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { LineupPreview } from '../../app/components/LineupPreview';
import type { Player as RosterPlayer } from '../../app/components/TeamRoster';

function setMaxTouchPoints(points: number) {
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: points,
  });
}

function setMatchMediaMatches(matchesForQuery: (query: string) => boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: matchesForQuery(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createLineup(): RosterPlayer[] {
  return [
    {
      playerId: 'alpha',
      name: 'Alpha Starter',
      position: 'SS',
      battingOrder: 1,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'R',
    },
    {
      playerId: 'bravo',
      name: 'Bravo Starter',
      position: 'CF',
      battingOrder: 2,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'L',
    },
    {
      playerId: 'charlie',
      name: 'Charlie Starter',
      position: '1B',
      battingOrder: 3,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: 'S',
    },
  ];
}

describe('LineupPreview touch reordering', () => {
  beforeEach(() => {
    setMaxTouchPoints(0);
    setMatchMediaMatches(() => false);
  });

  test('enables tap-to-reorder when iPad-style touch points are available', () => {
    setMaxTouchPoints(5);
    const onReorder = vi.fn();

    render(
      <LineupPreview
        teamName="Touch Team"
        lineup={createLineup()}
        bench={[]}
        teamColor="#4A6A42"
        onReorder={onReorder}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Alpha Starter in batting order' }));
    expect(screen.getByText(/Tap another # to move this hitter/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move Charlie Starter in batting order' }));

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0][0].map((player: RosterPlayer) => player.name)).toEqual([
      'Bravo Starter',
      'Charlie Starter',
      'Alpha Starter',
    ]);
    expect(onReorder.mock.calls[0][0].map((player: RosterPlayer) => player.battingOrder)).toEqual([
      1,
      2,
      3,
    ]);
  });

  test('offers one-tap up and down controls for touch lineup edits', () => {
    setMaxTouchPoints(5);
    const onReorder = vi.fn();

    render(
      <LineupPreview
        teamName="Touch Team"
        lineup={createLineup()}
        bench={[]}
        teamColor="#4A6A42"
        onReorder={onReorder}
      />,
    );

    expect(screen.getByRole('button', { name: 'Move Alpha Starter up in batting order' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Move Alpha Starter down in batting order' }));

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder.mock.calls[0][0].map((player: RosterPlayer) => player.name)).toEqual([
      'Bravo Starter',
      'Alpha Starter',
      'Charlie Starter',
    ]);
  });

  test('enables tap controls when any pointer is coarse', () => {
    setMatchMediaMatches((query) => query === '(any-pointer: coarse)');

    render(
      <LineupPreview
        teamName="Hybrid Team"
        lineup={createLineup()}
        bench={[]}
        teamColor="#4A6A42"
        onReorder={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Move Alpha Starter in batting order' })).toBeInTheDocument();
  });

  test('keeps desktop drag markup when touch input is unavailable', () => {
    render(
      <LineupPreview
        teamName="Desktop Team"
        lineup={createLineup()}
        bench={[]}
        teamColor="#4A6A42"
        onReorder={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Move Alpha Starter in batting order' })).toBeNull();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});
