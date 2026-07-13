import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import { SelectedPlayerCard } from '../SelectedPlayerCard';
import { DraftTruthStrip } from '../DraftTruthStrip';
import { buildChemistryStrip } from '../draftTruthModel';
import type { DeskCandidate } from '../deskModel';

const player = {
  id: 'jovita', firstName: 'Jovita', lastName: 'Pulo', gender: 'F', age: 26, bats: 'R', throws: 'R',
  primaryPosition: 'SP', secondaryPosition: 'SP/RP', power: 0, contact: 14, speed: 21, fielding: 62, arm: 71,
  velocity: 91, junk: 84, accuracy: 79, arsenal: ['4F', 'SL', 'CH'], overallGrade: 'A-',
  personality: 'Competitive', chemistry: 'Scholarly', trait1: 'Big Hack', trait2: 'Tough Out', morale: 50,
  mojo: 'Normal', fame: 0, salary: 90_000, leagueAssignments: [], createdDate: '2026-01-01',
  lastModified: '2026-01-01', isCustom: true,
} as Player;

const candidate = {
  id: 'jovita', name: 'JOVITA PULO', position: 'SP', eligiblePositions: ['SP', 'SP/RP'], advisorWorth: 100_000,
  iv: 90_000, marginalTax: 12_500, trueCost: 102_500, archetypeChip: 'BALANCED', fitWord: 'STRONG FIT',
  risk: 'SAFE_TO_WAIT', legalFinishLine: '',
  construction: { id: 'jovita', isPitcher: true, role: 'SP', bat: { POW: 0, CON: 14, SPD: 21, FLD: 62, ARM: 71 }, pit: { VEL: 91, JNK: 84, ACC: 79 } },
} as DeskCandidate;

describe('SelectedPlayerCard', () => {
  it('renders the complete compact profile and exact consequences without visible pronouns or zero ratings', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      chemistryDelta={{ family: 'SCH', word: 'Scholarly', before: 2, after: 3, crossing: 'L1->L2', premium: -4_000 }}
      teamLogoUrl="data:image/png;base64,AA=="
      teamName="Beewolves"
    />);

    expect(screen.getByText('Jovita Pulo')).toBeInTheDocument();
    expect(screen.getByText('SP · SP/RP')).toBeInTheDocument();
    expect(screen.getByText('AGE 26 · B/T R/R')).toBeInTheDocument();
    expect(screen.getByAltText('Beewolves logo')).toBeInTheDocument();
    for (const label of ['CON', 'SPD', 'FLD', 'ARM', 'VEL', 'JNK', 'ACC']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText('POW')).not.toBeInTheDocument();
    expect(screen.getByText('ARSENAL · 4F · SL · CH')).toBeInTheDocument();
    expect(screen.getByText('Big Hack')).toBeInTheDocument();
    expect(screen.getByText('Tough Out')).toBeInTheDocument();
    expect(screen.getByText('PLAYER ARCHETYPE · Effectively-Wild')).toBeInTheDocument();
    expect(screen.getByText('TEAM ARCHETYPE · BALANCED')).toBeInTheDocument();
    expect(screen.getByText('Competitive')).toBeInTheDocument();
    expect(screen.getAllByText('Scholarly').length).toBeGreaterThan(0);
    expect(screen.getByText('FIT · STRONG FIT')).toHaveClass('text-[var(--ballpark-status-green)]');
    expect(screen.getByText('+$12,500')).toBeInTheDocument();
    expect(screen.getByText('$102,500')).toBeInTheDocument();
    expect(screen.getByText('−$4,000')).toBeInTheDocument();
    expect(screen.getByText('SCHOLARLY 2→3 · L1->L2')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b|pronouns?/i);
  });

  it('keeps the inline profile contract and renders unknown consequences when legacy roster truth is incomplete', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      chemistryDelta={null}
      moneyKnown={false}
      teamName="Beewolves"
    />);
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('Jovita Pulo');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('CURRENT TAX—');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('TRUE COST—');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('CHEM VALUE—');
    expect(screen.getByText('SCHOLARLY —→—')).toBeInTheDocument();
  });
});

describe('DraftTruthStrip', () => {
  it('renders all five chemistry families and unknown legacy money as unknown, not zero', () => {
    render(<DraftTruthStrip
      title="DRAFTED ROSTER"
      ledger={{ rosterCount: 1, salary: 77_000, tax: null, allIn: null, moneyLeft: null }}
      chemistry={buildChemistryStrip(null)}
    />);
    expect(screen.getByText('$77,000')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getAllByText('— · —')).toHaveLength(5);
    for (const word of ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined']) expect(screen.getByText(word)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('$0');
  });

  it('uses two-column money and full-width chemistry rows in a narrow public rail without changing the wide plan layout', () => {
    const chemistry = buildChemistryStrip(null);
    const { rerender } = render(<DraftTruthStrip
      title="DRAFTED ROSTER"
      ledger={{ rosterCount: 1, salary: 77_000, tax: null, allIn: null, moneyLeft: null }}
      chemistry={chemistry}
      compact
    />);
    expect(screen.getByTestId('compact-money-grid')).toHaveClass('grid-cols-2');
    expect(screen.getByTestId('compact-money-grid')).not.toHaveClass('sm:grid-cols-4');
    expect(screen.getByLabelText('DRAFTED ROSTER chemistry')).toHaveClass('grid-cols-1');
    expect(screen.getByLabelText('DRAFTED ROSTER chemistry')).not.toHaveClass('grid-cols-2', 'grid-cols-5');
    for (const word of ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined']) {
      const label = screen.getByText(word);
      expect(label).toHaveClass('whitespace-nowrap');
      expect(label).not.toHaveClass('truncate');
      expect(label).not.toHaveClass('overflow-hidden', 'text-ellipsis');
    }

    rerender(<DraftTruthStrip
      title="22-PLAYER PLAN"
      ledger={{ rosterCount: 22, salary: 77_000, tax: null, allIn: null, moneyLeft: null }}
      chemistry={chemistry}
    />);
    expect(screen.queryByTestId('compact-money-grid')).not.toBeInTheDocument();
    expect(screen.getByLabelText('22-PLAYER PLAN chemistry')).toHaveClass('grid-cols-5');
  });
});
