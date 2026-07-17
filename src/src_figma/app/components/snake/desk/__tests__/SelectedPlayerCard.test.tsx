import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Player } from '../../../../../../utils/leagueBuilderStorage';
import { SelectedPlayerCard } from '../SelectedPlayerCard';
import { DraftTruthStrip } from '../DraftTruthStrip';
import { buildChemistryStrip } from '../draftTruthModel';
import type { DeskCandidate } from '../deskModel';
import type { SelectedPlayerConsequence } from '../snakeDeskIntelligenceModel';

const player = {
  id: 'jovita', firstName: 'Jovita', lastName: 'Pulo', gender: 'F', age: 26, bats: 'R', throws: 'R',
  primaryPosition: 'SP', secondaryPosition: 'SP/RP', power: 0, contact: 14, speed: 21, fielding: 62, arm: 71,
  velocity: 91, junk: 84, accuracy: 79, arsenal: ['4F', 'SL', 'CH'], overallGrade: 'A-',
  personality: 'Competitive', chemistry: 'Scholarly', trait1: 'Big Hack', trait2: 'Tough Out', morale: 50,
  hiddenPersonalityModifiers: { loyalty: 97, ambition: 13, resilience: 86, charisma: 24 },
  mojo: 'Normal', fame: 0, salary: 90_000, leagueAssignments: [], createdDate: '2026-01-01',
  lastModified: '2026-01-01', isCustom: true,
} as Player;

const candidate = {
  id: 'jovita', name: 'JOVITA PULO', position: 'SP', eligiblePositions: ['SP', 'SP/RP'], advisorWorth: 100_000,
  iv: 90_000, marginalTax: 12_500, trueCost: 102_500, archetypeChip: 'BALANCED', fitWord: 'STRONG FIT',
  risk: 'SAFE_TO_WAIT', legalFinishLine: '',
  construction: { id: 'jovita', isPitcher: true, role: 'SP', bat: { POW: 0, CON: 14, SPD: 21, FLD: 62, ARM: 71 }, pit: { VEL: 91, JNK: 84, ACC: 79 } },
} as DeskCandidate;

const chemistry = buildChemistryStrip([player]);
const consequence = {
  status: 'ready',
  identity: {
    sessionId: 'session', sessionRevision: 2, teamId: 'team-a', seatId: 'seat-a',
    deviceId: 'device-a', privateEpoch: 3, boardRevision: 4,
  },
  selectedPlayerId: 'jovita', displacedPlayerId: 'incumbent', displacedPlayerName: 'Old Starter',
  displacedSlotId: 'SP1', reassignedSlotIds: ['SP1'],
  board: { slots: {} as never, rankings: {}, revision: 5 },
  before: {
    ledger: { rosterCount: 22, salary: 800_000, tax: 20_000, allIn: 820_000, moneyLeft: 180_000 },
    chemistry, legalFinish: { feasible: true, moneyLeft: 75_000 }, fitWord: 'WEAK FIT',
  },
  after: {
    ledger: { rosterCount: 22, salary: 790_000, tax: 5_000, allIn: 795_000, moneyLeft: 205_000 },
    chemistry: chemistry.map((row) => row.family === 'SCH' ? { ...row, count: 2, tier: 'L1' as const } : row),
    legalFinish: { feasible: true, moneyLeft: 90_000 }, fitWord: 'STRONG FIT',
  },
} as SelectedPlayerConsequence;

describe('SelectedPlayerCard', () => {
  it('renders an unproved bounded finish as OPEN instead of NO', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={{
        ...consequence,
        after: {
          ...consequence.after,
          legalFinish: { feasible: false, moneyLeft: -1, affordability: 'OPEN' },
        },
      }}
      teamName="Beewolves"
    />);

    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.queryByText('NO')).not.toBeInTheDocument();
  });

  it('renders the complete compact profile and exact consequences without visible pronouns or zero ratings', () => {
    const onOptimizeAround = vi.fn();
    const onKeep = vi.fn();
    const onTradeDecision = vi.fn();
    const { container } = render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={consequence}
      teamLogoUrl="data:image/png;base64,AA=="
      teamName="Beewolves"
      onOptimizeAround={onOptimizeAround}
      onKeep={onKeep}
      decision={{
        kind: 'TRADE_TO_PICK', playerId: 'jovita', targetPick: 19,
        proposal: { buyerTeamId: 'bew', sellerTeamId: 'buz', targetPick: 19, offerPickNumbers: [24, 36], receivePickNumbers: [19, 41], offerValue: 100, receiveValue: 95, sessionRevision: 7 },
      }}
      onTradeDecision={onTradeDecision}
      actionConsequence="AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT."
      draftAction={<button type="button" className="min-h-11">DRAFT PLAYER</button>}
    />);

    expect(screen.getByText('Jovita Pulo')).toBeInTheDocument();
    expect(screen.getByText('SP · SP/RP')).toBeInTheDocument();
    expect(screen.getByText('AGE 26 · B/T R/R')).toBeInTheDocument();
    expect(screen.getByAltText('Beewolves logo')).toBeInTheDocument();
    expect(screen.getByText('OVR')).toBeInTheDocument();
    expect(screen.getByText('A-')).toBeInTheDocument();
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
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('TRUE COST$102,500');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('TAX IMPACT+$12,500');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT.');
    expect(screen.getByTestId('selected-player-consequence')).toHaveTextContent('OUT · OLD STARTER · WEAK FIT');
    expect(screen.getByTestId('selected-player-consequence')).toHaveTextContent('IN · JOVITA PULO · STRONG FIT');
    for (const amount of ['$800,000', '$20,000', '$820,000', '$180,000', '$790,000', '$5,000', '$795,000', '$205,000', '$75,000', '$90,000']) {
      expect(screen.getByTestId('selected-player-consequence')).toHaveTextContent(amount);
    }
    for (const word of ['COMPETITIVE', 'SPIRITED', 'CRAFTY', 'SCHOLARLY', 'DISCIPLINED']) expect(screen.getByLabelText('Selected player chemistry consequences')).toHaveTextContent(word);
    fireEvent.click(screen.getByRole('button', { name: 'OPTIMIZE AROUND' }));
    fireEvent.click(screen.getByRole('button', { name: 'KEEP ON MY BOARD' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRADE TO #19' }));
    expect(screen.getByTestId('selected-player-card')).toContainElement(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    expect(onOptimizeAround).toHaveBeenCalledOnce();
    expect(onKeep).toHaveBeenCalledOnce();
    expect(onTradeDecision).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b|pronouns?/i);
    expect(document.body.textContent).not.toMatch(/loyalty|ambition|resilience|charisma|hidden personality/i);
    for (const control of container.querySelectorAll('button')) {
      expect(control).toHaveClass('min-h-11');
    }
  });

  it('keeps the inline profile contract and renders unknown consequences as dashes, never safe or zero', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={{ status: 'unavailable', selectedPlayerId: 'jovita' }}
      teamName="Beewolves"
    />);
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('Jovita Pulo');
    expect(screen.getByTestId('selected-player-card')).toHaveTextContent('MY BOARD—');
    expect(screen.getByTestId('selected-player-card')).not.toHaveTextContent('BOARD CONSEQUENCES —');
    expect(screen.queryByRole('button', { name: 'KEEP ON MY BOARD' })).not.toBeInTheDocument();
    expect(screen.getByTestId('selected-player-card')).not.toHaveTextContent('SAFE');
    expect(screen.getByTestId('selected-player-card')).not.toHaveTextContent('$0');
  });

  it('reports an already-boarded player and never offers Keep', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={{ status: 'already-on-board', selectedPlayerId: 'jovita' }}
      teamName="Beewolves"
      onKeep={vi.fn()}
    />);
    expect(screen.getByText('ON MY BOARD')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'KEEP ON MY BOARD' })).not.toBeInTheDocument();
  });

  it('never labels a consequence dismissal as Revert; undo is owned by the saved board transaction', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={{ status: 'already-on-board', selectedPlayerId: 'jovita' }}
      teamName="Beewolves"
      onRevert={vi.fn()}
    />);
    expect(screen.queryByRole('button', { name: 'REVERT' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'UNDO BOARD UPDATE' })).not.toBeInTheDocument();
  });

  it('uses a pixel portrait when the club has no logo without displaying gender or pronouns', () => {
    render(<SelectedPlayerCard player={player} candidate={candidate} consequence={null} teamName="Beewolves" />);
    expect(screen.getByRole('img', { name: 'Jovita Pulo pixel portrait' })).toBeInTheDocument();
    expect(screen.getByTestId('selected-player-card').textContent).not.toMatch(/female|woman|she|her|pronouns?/i);
  });

  it('keeps a portrait action strip outside the collapsible full profile', () => {
    render(<SelectedPlayerCard
      player={player}
      candidate={candidate}
      consequence={consequence}
      teamName="Beewolves"
      actionConsequence="AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT."
      draftAction={<button type="button" className="min-h-11">DRAFT PLAYER</button>}
    />);

    const strip = screen.getByTestId('selected-player-action-strip');
    const profileBody = screen.getByTestId('selected-player-profile-body');
    const toggle = screen.getByRole('button', { name: 'OPEN PLAYER CARD' });
    expect(strip).toHaveTextContent('Jovita Pulo');
    expect(strip).toHaveTextContent('AFTER THIS PICK AND A LEGAL FINISH: $90,000 LEFT.');
    expect(strip).toContainElement(screen.getByRole('button', { name: 'DRAFT PLAYER' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(profileBody).toHaveClass('hidden', 'lg:block');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'CLOSE PLAYER CARD' })).toHaveAttribute('aria-expanded', 'true');
    expect(profileBody).not.toHaveClass('hidden');
    expect(profileBody).toHaveClass('lg:block');
    expect(profileBody).toHaveTextContent('PLAYER ARCHETYPE · Effectively-Wild');
    expect(profileBody).toHaveTextContent('TRUE COST$102,500');
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
