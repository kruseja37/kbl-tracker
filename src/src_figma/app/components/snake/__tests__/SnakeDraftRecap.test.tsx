import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SnakeDraftRecap } from '../SnakeDraftRecap';

const teams = [
  { id: 'a', name: 'Kodiaks', abbreviation: 'KOD', colors: { primary: '#781414', secondary: '#f0dcb4' } },
  { id: 'b', name: 'Comets', abbreviation: 'COM', colors: { primary: '#144678', secondary: '#e6e6dc' } },
];

function total(section: HTMLElement, label: string): HTMLElement {
  return within(section).getByText(label).parentElement!;
}

describe('SnakeDraftRecap', () => {
  it('keeps missing money unknown while preserving explicit zero, signed tax, order, and team counts', () => {
    render(<SnakeDraftRecap
      phase="MLB"
      teams={teams}
      picks={[
        { pick: 2, teamId: 'a', playerId: 'p2', playerName: 'Second Pick', salary: 0, tax: 0 },
        { pick: 1, teamId: 'a', playerId: 'p1', playerName: 'First Pick' },
        { pick: 3, teamId: 'b', playerId: 'p3', playerName: 'Zero Salary', salary: 0, tax: -500 },
      ]}
      committing={false}
      onConfirm={vi.fn()}
    />);

    const teamSections = screen.getAllByRole('region', { name: /draft recap/i });
    expect(teamSections).toHaveLength(2);
    const kodiaks = screen.getByRole('region', { name: 'Kodiaks draft recap' });
    expect(total(kodiaks, 'ROSTER')).toHaveTextContent('2');
    expect(total(kodiaks, 'SALARY')).toHaveTextContent('—');
    expect(total(kodiaks, 'TAX')).toHaveTextContent('—');
    expect(total(kodiaks, 'ALL-IN')).toHaveTextContent('—');
    const kodiaksRows = within(kodiaks).getAllByRole('listitem');
    expect(kodiaksRows[0]).toHaveTextContent('#1FIRST PICK');
    expect(kodiaksRows[1]).toHaveTextContent('#2SECOND PICK');

    const comets = screen.getByRole('region', { name: 'Comets draft recap' });
    expect(total(comets, 'ROSTER')).toHaveTextContent('1');
    expect(total(comets, 'SALARY')).toHaveTextContent('$0');
    expect(total(comets, 'TAX')).toHaveTextContent('-$500');
    expect(total(comets, 'ALL-IN')).toHaveTextContent('-$500');
  });
});
