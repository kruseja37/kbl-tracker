import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrivateDesk } from '../PrivateDesk';
import { DeskCandidateRow } from '../DeskCandidateRow';
import type { DeskCandidate } from '../deskModel';

const candidate: DeskCandidate = {
  id: 'muraski',
  name: 'MURASKI',
  position: 'SS',
  eligiblePositions: ['SS'],
  advisorWorth: 90,
  iv: 80,
  marginalTax: 10,
  trueCost: 90,
  archetypeChip: 'WHITEYBALL',
  fitWord: 'STRONG FIT',
  risk: 'AT_RISK',
  legalFinishLine: 'AFTER THIS PICK AND A LEGAL FINISH: $120 LEFT.',
  construction: {
    id: 'muraski', isPitcher: false,
    bat: { POW: 70, CON: 80, SPD: 90, FLD: 85, ARM: 75 },
    pit: { VEL: 0, JNK: 0, ACC: 0 },
  },
};
const idleAssistant = { status: 'idle' as const, board: null };

describe('PrivateDesk', () => {
  it('shows the distinct 22-player plan ledger, five chemistry families, and canonical Assistant GM status', () => {
    const chemistry = [
      { family: 'CMP' as const, word: 'Competitive' as const, count: 3, tier: 'L2' as const },
      { family: 'SPI' as const, word: 'Spirited' as const, count: 5, tier: 'L2' as const },
      { family: 'CRA' as const, word: 'Crafty' as const, count: 4, tier: 'L2' as const },
      { family: 'SCH' as const, word: 'Scholarly' as const, count: 6, tier: 'L2' as const },
      { family: 'DIS' as const, word: 'Disciplined' as const, count: 4, tier: 'L2' as const },
    ];
    render(<PrivateDesk
      candidates={[candidate]}
      rankings={{ SS: ['muraski'] }}
      overallRankings={['muraski']}
      boardSlots={{ SS: 'muraski' }}
      brokenSlots={[]}
      planBill={{ planCost: 500_000, planTax: 20_000, planCushion: 480_000, playerIds: Array.from({ length: 22 }, (_, index) => `p${index}`) }}
      planChemistry={chemistry}
      draftedChemistry={chemistry}
      assistantNeed={{ missingPrimaries: ['C'], catcherCoverNeed: 1, pitcherNeed: 2, rotationDeficit: 1, bullpenDeficit: 1, closerDeficit: 1, hitterFloorNeed: 0, pitcherFloorNeed: 0, minimumAdditions: 3, infeasible: false }}
      advisorLog={[]}
      taxCoreRows={[]}
      slotDepth={{ SS: 1 }}
      assistantBoard={idleAssistant}
      onReorder={() => undefined}
    />);

    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('22-PLAYER PLAN');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('$500,000');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('$20,000');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('$520,000');
    expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent('$480,000');
    for (const word of ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined']) expect(screen.getByTestId('plan-truth-strip')).toHaveTextContent(word);
    expect(screen.getByRole('region', { name: 'Assistant GM status' })).toHaveTextContent('SHAPE 3 OPEN');
    expect(screen.queryByText(/SHAPE READS THE CANONICAL/)).not.toBeInTheDocument();
    expect(screen.queryByText('THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.')).not.toBeInTheDocument();
    expect(screen.getByTestId('board-slot-grid')).toHaveClass('grid-cols-1');
    expect(screen.getByTestId('board-slot-grid')).not.toHaveClass('md:grid-cols-2');
  });

  it('keeps tax-core explanation behind Help while leaving the tax rows available', () => {
    const common = {
      candidates: [candidate],
      rankings: { SS: ['muraski'] } as const,
      overallRankings: ['muraski'] as const,
      boardSlots: { SS: 'muraski' } as const,
      brokenSlots: [], planBill: null, advisorLog: [],
      taxCoreRows: [{ key: 'core', label: 'TOP SALARY', playerNames: ['MURASKI'] }],
      slotDepth: { SS: 3 },
      assistantBoard: idleAssistant,
      onReorder: () => undefined,
    };
    const { rerender } = render(<PrivateDesk {...common} showHelp={false} />);
    expect(screen.getByText((_, node) => node?.tagName === 'P' && node.textContent === 'TOP SALARY: MURASKI')).toBeInTheDocument();
    expect(screen.queryByText('THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.')).not.toBeInTheDocument();
    rerender(<PrivateDesk {...common} showHelp />);
    expect(screen.getByText('THESE ARE THE PLAYERS WHO COUNT TOWARD YOUR TAX.')).toBeInTheDocument();
  });

  it('shows one chosen overall or position ranking and routes each reorder to the matching persisted list', () => {
    const onReorder = vi.fn();
    const onReorderOverall = vi.fn();
    const available = { ...candidate, id: 'available', name: 'AVAILABLE PLAYER' };
    render(<PrivateDesk
      candidates={[candidate, available]}
      rankings={{ SS: ['muraski', 'available'] }}
      overallRankings={['muraski', 'available']}
      boardSlots={{ SS: 'muraski' }}
      brokenSlots={[]}
      planBill={null}
      advisorLog={[]}
      taxCoreRows={[]}
      slotDepth={{ SS: 2 }}
      assistantBoard={idleAssistant}
      onReorder={onReorder}
      onReorderOverall={onReorderOverall}
    />);

    expect(screen.getByRole('button', { name: 'MY BOARD' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    expect(screen.getByRole('button', { name: 'RANKINGS' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'OVERALL RANKINGS' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'SS RANKINGS' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move AVAILABLE PLAYER up' }));
    expect(onReorderOverall).toHaveBeenLastCalledWith(['available', 'muraski']);

    fireEvent.click(screen.getByRole('button', { name: 'SS' }));
    expect(screen.getByRole('heading', { name: 'SS RANKINGS' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'OVERALL RANKINGS' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move AVAILABLE PLAYER up' }));
    expect(onReorder).toHaveBeenLastCalledWith('SS', ['available', 'muraski']);
  });

  it('selects an available non-default player from both the board and rankings but never selects a drafted card', () => {
    const onSelectCandidate = vi.fn();
    const available = { ...candidate, id: 'available', name: 'AVAILABLE PLAYER' };
    const drafted = { ...candidate, id: 'drafted', name: 'DRAFTED PLAYER', drafted: true };
    const blocked = { ...candidate, id: 'blocked', name: 'BLOCKED PLAYER' };
    const common = {
      candidates: [candidate, available, drafted, blocked],
      rankings: { SS: ['muraski', 'available', 'drafted', 'blocked'] } as const,
      overallRankings: ['muraski', 'available', 'drafted', 'blocked'] as const,
      boardSlots: { SS: 'available' } as const,
      brokenSlots: [], planBill: null, advisorLog: [], taxCoreRows: [], slotDepth: { SS: 3 },
      assistantBoard: idleAssistant,
      selectedCandidateId: 'muraski', onSelectCandidate,
      onReorder: () => undefined,
    };
    render(<PrivateDesk {...common} />);
    expect(screen.queryByText('WHAT-IF')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SELECT AVAILABLE PLAYER' }));
    expect(onSelectCandidate).toHaveBeenCalledWith('available');
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    expect(screen.getByRole('button', { name: 'SELECT DRAFTED PLAYER' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'SELECT BLOCKED PLAYER' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'SELECT BLOCKED PLAYER' }));
    expect(onSelectCandidate).toHaveBeenCalledWith('blocked');
    fireEvent.click(screen.getAllByRole('button', { name: 'SELECT AVAILABLE PLAYER' })[0]);
    expect(onSelectCandidate).toHaveBeenCalledTimes(3);
  });

  it('finds a specific player without scrolling and sends the full ranking to the persisted handler', () => {
    const onReorderOverall = vi.fn();
    const target = { ...candidate, id: 'target', name: 'JOVITA PULO', position: 'CF' as const };
    render(<PrivateDesk
      candidates={[candidate, target]}
      rankings={{ SS: ['muraski'], CF: ['target'] }}
      overallRankings={['muraski', 'target']}
      boardSlots={{ SS: 'muraski' }}
      brokenSlots={[]}
      planBill={null}
      advisorLog={[]}
      taxCoreRows={[]}
      slotDepth={{ SS: 1 }}
      assistantBoard={idleAssistant}
      onReorder={() => undefined}
      onReorderOverall={onReorderOverall}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'FIND PLAYER' }), { target: { value: 'jovita' } });
    expect(screen.getByRole('button', { name: 'SELECT JOVITA PULO' })).toHaveTextContent('#2');
    fireEvent.click(screen.getByRole('button', { name: 'Send JOVITA PULO to top' }));
    expect(onReorderOverall).toHaveBeenCalledWith(['target', 'muraski']);
  });

  it('renders a separate read-only assistant board and never renders the retired what-if controls', () => {
    render(<PrivateDesk
      candidates={[candidate]}
      rankings={{ SS: ['muraski'] }}
      overallRankings={['muraski']}
      boardSlots={{ SS: 'muraski' }}
      brokenSlots={[]}
      planBill={{ planCost: 80, planTax: 10, planCushion: 30, playerIds: ['muraski'] }}
      advisorLog={[]}
      taxCoreRows={[]}
      slotDepth={{ SS: 1 }}
      assistantBoard={{
        status: 'ready',
        board: {
          kind: 'snake-assistant-board', teamId: 'team-a',
          slots: [{ slotId: 'SS', playerId: 'muraski', pinned: false }],
          playerIds: ['muraski'], recommendationOrder: ['muraski'],
          ledger: { rosterCount: 22, salary: 80, tax: 10, allIn: 90, moneyLeft: 30 },
          chemistry: [
            { family: 'CMP', word: 'Competitive', count: 1, tier: 'L1' },
            { family: 'SPI', word: 'Spirited', count: 0, tier: 'L1' },
            { family: 'CRA', word: 'Crafty', count: 0, tier: 'L1' },
            { family: 'SCH', word: 'Scholarly', count: 0, tier: 'L1' },
            { family: 'DIS', word: 'Disciplined', count: 0, tier: 'L1' },
          ],
        },
      }}
      onReorder={() => undefined}
      tradeGuide={<div>POSTED PRICE GUIDE</div>}
    />);

    expect(screen.getByText('PLAN COST')).toBeInTheDocument();
    expect(screen.getByText('PLAN TAX')).toBeInTheDocument();
    expect(screen.getByText('PLAN CUSHION')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SELECT MURASKI' })).toHaveTextContent('SS · STRONG FIT · AT RISK');
    expect(screen.queryByText('WHAT-IF')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ASST GM BOARD' }));
    expect(screen.getByTestId('assistant-board-panel')).toHaveTextContent('ASST GM 22');
    expect(screen.getByTestId('assistant-plan-truth-strip')).toHaveTextContent('$90');
    expect(screen.queryByRole('button', { name: /KEEP/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'GUIDE' }));
    expect(screen.getByText('POSTED PRICE GUIDE')).toBeInTheDocument();
  });
});

describe('downward tax consequence copy (TAXSWING seam)', () => {
  it('renders a tax reduction as favorable money on the compact board row', () => {
    render(<DeskCandidateRow candidate={{ ...candidate, marginalTax: -12345 }} />);
    const reduction = screen.getByText('TAX −$12,345');
    expect(reduction).toHaveClass('text-[var(--ballpark-status-green)]');
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b/i);
  });

  it('shows and announces identity chips for same-name player versions', () => {
    render(<DeskCandidateRow candidate={{ ...candidate, name: 'YOINK SAX', identityChips: ['2024', 'BEW'] }} />);
    expect(screen.getByText('2024 · BEW')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SELECT YOINK SAX · 2024 · BEW' })).toBeInTheDocument();
  });
});
