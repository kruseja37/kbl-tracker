import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { FullFenwayScoreboard } from '../../app/components/FullFenwayScoreboard';

describe('FullFenwayScoreboard', () => {
  test('renders live linescore, count, and context header', () => {
    render(
      <FullFenwayScoreboard
        awayTeamName="Sirloins"
        homeTeamName="Beewolves"
        awayRecord="45-38"
        homeRecord="52-31"
        innings={[
          { away: 0, home: 1 },
          { away: 2, home: 0 },
          { away: undefined, home: undefined },
        ]}
        awayRuns={2}
        homeRuns={1}
        awayHits={5}
        homeHits={4}
        awayErrors={1}
        homeErrors={0}
        inning={3}
        isTop={true}
        balls={2}
        strikes={1}
        outs={1}
        stadiumName="Beewolves Field"
        currentBatterName="J. JOHNSON"
        gameDate={new Date('2026-03-11T12:00:00Z')}
        elapsedMinutes={17}
      />
    );

    expect(screen.getByText('BEEWOLVES FIELD')).toBeInTheDocument();
    expect(screen.getByText('AT BAT')).toBeInTheDocument();
    expect(screen.getByText('J. JOHNSON')).toBeInTheDocument();
    expect(screen.getByText('45-38')).toBeInTheDocument();
    expect(screen.getByText('52-31')).toBeInTheDocument();
    expect(screen.getByText('TOP 3')).toBeInTheDocument();
    expect(screen.getByText('TIME: 0:17:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MINI' })).toBeDisabled();
  });
});
