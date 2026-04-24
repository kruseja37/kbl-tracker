import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { ScoreBug } from '../../app/components/ScoreBug';

describe('ScoreBug', () => {
  test('renders the home plate icon above the inning label using the home team secondary color', () => {
    render(
      <ScoreBug
        awayTeamName="Away"
        awayScore={2}
        homeTeamName="Home"
        homeScore={3}
        homeTeamSecondaryColor="#445566"
        inning={4}
        isTop={true}
        outs={1}
        bases={{ first: false, second: true, third: false }}
        onTap={vi.fn()}
      />,
    );

    expect(screen.getByTestId('scorebug-inning-indicator')).toHaveTextContent('T4');
    expect(screen.getByTestId('scorebug-home-plate-badge')).toContainElement(
      screen.getByTestId('scorebug-inning-text'),
    );
    expect(screen.getByTestId('scorebug-home-plate-badge')).toHaveClass('mt-[4px]', 'h-[16px]', 'w-[20px]');
    expect(screen.getByTestId('scorebug-inning-text')).toHaveTextContent('T4');
    expect(screen.getByTestId('scorebug-inning-text')).toHaveClass('pb-[3px]', 'text-[7px]');
    expect(screen.getByTestId('scorebug-home-plate')).toHaveStyle({
      backgroundColor: 'rgb(68, 85, 102)',
    });
  });
});
