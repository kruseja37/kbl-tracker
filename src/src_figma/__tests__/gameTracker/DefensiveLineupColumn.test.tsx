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
});
