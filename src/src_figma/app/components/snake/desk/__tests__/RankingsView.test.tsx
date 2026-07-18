import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RankingsView } from '../RankingsView';
import type { DeskCandidate } from '../deskModel';

function candidate(input: {
  id: string;
  fit: string;
  iv: number;
  tax: number;
  pow: number;
  vel?: number;
  finishStatus?: DeskCandidate['finishStatus'];
}): DeskCandidate {
  return {
    id: input.id,
    name: input.id.toUpperCase(),
    position: 'C',
    eligiblePositions: ['C'],
    advisorWorth: input.iv,
    iv: input.iv,
    marginalTax: input.tax,
    trueCost: input.iv + input.tax,
    archetypeChip: 'TEST',
    fitWord: input.fit,
    risk: 'SAFE_TO_WAIT',
    legalFinishLine: '',
    finishStatus: input.finishStatus,
    construction: {
      id: input.id,
      isPitcher: input.vel !== undefined,
      bat: { POW: input.pow, CON: input.pow - 1, SPD: input.pow - 2, FLD: input.pow - 3, ARM: input.pow - 4 },
      ...(input.vel === undefined ? {} : { pit: { VEL: input.vel, JNK: input.vel - 1, ACC: input.vel - 2 } }),
    },
  };
}

const candidates = [
  candidate({ id: 'alpha', fit: 'SOLID FIT', iv: 60_000, tax: 10_000, pow: 80, finishStatus: 'OPEN' }),
  candidate({ id: 'bravo', fit: 'STRONG FIT', iv: 90_000, tax: -5_000, pow: 70, vel: 98, finishStatus: 'DRAFTABLE' }),
  candidate({ id: 'charlie', fit: 'WEAK FIT', iv: 30_000, tax: 0, pow: 95, finishStatus: 'BLOCKED' }),
];

function selectedNames(): string[] {
  return screen.getAllByRole('button', { name: /^SELECT / }).map((button) => button.getAttribute('data-player-id') ?? '');
}

describe('RankingsView decision controls', () => {
  it('sorts and filters locally without persisting, and exposes no redundant Salary sort', () => {
    const onReorder = vi.fn();
    const onReorderOverall = vi.fn();
    render(<RankingsView
      candidates={candidates}
      rankings={{ C: ['alpha', 'bravo', 'charlie'] }}
      overallRankings={['alpha', 'bravo', 'charlie']}
      onReorder={onReorder}
      onReorderOverall={onReorderOverall}
    />);

    const sort = screen.getByRole('combobox', { name: 'Sort players' });
    expect([...sort.querySelectorAll('option')].map((option) => option.textContent)).not.toContain('SALARY');

    fireEvent.change(sort, { target: { value: 'FIT' } });
    expect(selectedNames()).toEqual(['bravo', 'alpha', 'charlie']);
    fireEvent.change(sort, { target: { value: 'IV' } });
    expect(selectedNames()).toEqual(['bravo', 'alpha', 'charlie']);
    fireEvent.change(sort, { target: { value: 'TAX' } });
    expect(selectedNames()).toEqual(['bravo', 'charlie', 'alpha']);
    fireEvent.change(sort, { target: { value: 'TRUE_COST' } });
    expect(selectedNames()).toEqual(['charlie', 'alpha', 'bravo']);
    fireEvent.change(sort, { target: { value: 'POW' } });
    expect(selectedNames()).toEqual(['charlie', 'alpha', 'bravo']);
    fireEvent.change(sort, { target: { value: 'VEL' } });
    expect(selectedNames()).toEqual(['bravo', 'alpha', 'charlie']);

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by fit' }), { target: { value: 'STRONG' } });
    expect(selectedNames()).toEqual(['bravo']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(onReorderOverall).not.toHaveBeenCalled();
  });

  it('filters immediately to shared-room draftable players without changing identity fit', () => {
    render(<RankingsView
      candidates={candidates}
      rankings={{ C: ['alpha', 'bravo', 'charlie'] }}
      overallRankings={['alpha', 'bravo', 'charlie']}
      onReorder={() => undefined}
    />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by finish safety' }), {
      target: { value: 'DRAFTABLE' },
    });
    expect(selectedNames()).toEqual(['bravo']);
    expect(screen.getByRole('button', { name: 'SELECT BRAVO' })).toHaveTextContent('STRONG FIT · DRAFTABLE');
  });

  it('persists TOP exactly once against the current position board from a sorted view', () => {
    const onReorder = vi.fn();
    const onReorderOverall = vi.fn();
    render(<RankingsView
      candidates={candidates}
      rankings={{ C: ['alpha', 'bravo', 'charlie'] }}
      overallRankings={['alpha', 'bravo', 'charlie']}
      onReorder={onReorder}
      onReorderOverall={onReorderOverall}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort players' }), { target: { value: 'POW' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send CHARLIE to top' }));

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith('C', ['charlie', 'alpha', 'bravo']);
    expect(onReorderOverall).not.toHaveBeenCalled();
  });

  it('pages a full-source board while direct rank entry still targets the complete ranking', () => {
    const largeCandidates = Array.from({ length: 125 }, (_, index) => candidate({
      id: `p${String(index + 1).padStart(3, '0')}`,
      fit: 'SOLID FIT',
      iv: 50_000 - index,
      tax: 0,
      pow: 70,
    }));
    const ids = largeCandidates.map((row) => row.id);
    const onReorderOverall = vi.fn();
    render(<RankingsView
      candidates={largeCandidates}
      rankings={{ C: ids }}
      overallRankings={ids}
      onReorder={() => undefined}
      onReorderOverall={onReorderOverall}
    />);

    expect(screen.getByRole('navigation', { name: 'OVERALL ranking pages' })).toHaveTextContent('1–20 / 125');
    expect(screen.getAllByRole('button', { name: /^SELECT / })).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));
    expect(screen.getByRole('navigation', { name: 'OVERALL ranking pages' })).toHaveTextContent('21–40 / 125');
    expect(screen.getByRole('button', { name: 'SELECT P021' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Set rank for P021' }));
    const rankInput = screen.getByRole('spinbutton', { name: 'Set rank for P021' });
    fireEvent.change(rankInput, { target: { value: '1' } });
    fireEvent.keyDown(rankInput, { key: 'Enter' });
    expect(onReorderOverall).toHaveBeenCalledTimes(1);
    expect(onReorderOverall.mock.calls[0][0]).toHaveLength(125);
    expect(onReorderOverall.mock.calls[0][0][0]).toBe('p021');
  });
});
