import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrivateDesk } from '../PrivateDesk';
import type { DeskCandidate } from '../deskModel';

const candidate: DeskCandidate = {
  id: 'muraski',
  name: 'MURASKI',
  position: 'SS',
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

describe('PrivateDesk', () => {
  it('selects an available non-default player from both the board and rankings but never selects a drafted card', () => {
    const onSelectCandidate = vi.fn();
    const available = { ...candidate, id: 'available', name: 'AVAILABLE PLAYER' };
    const drafted = { ...candidate, id: 'drafted', name: 'DRAFTED PLAYER', drafted: true };
    const blocked = { ...candidate, id: 'blocked', name: 'BLOCKED PLAYER' };
    const common = {
      candidates: [candidate, available, drafted, blocked],
      rankings: { SS: ['muraski', 'available', 'drafted', 'blocked'] } as const,
      boardSlots: { SS: 'available' } as const,
      brokenSlots: [], planBill: null, advisorLog: [], taxCoreRows: [], slotDepth: { SS: 3 },
      selectedCandidateId: 'muraski', onSelectCandidate,
      isCandidateSelectable: (candidateId: string) => candidateId !== 'blocked',
      onReorder: () => undefined, onStartWhatIf: () => undefined, onKeepWhatIf: () => undefined, onRevertWhatIf: () => undefined,
    };
    render(<PrivateDesk {...common} />);
    fireEvent.click(screen.getByRole('button', { name: 'SELECT AVAILABLE PLAYER' }));
    expect(onSelectCandidate).toHaveBeenCalledWith('available');
    fireEvent.click(screen.getByRole('button', { name: 'RANKINGS' }));
    expect(screen.getByRole('button', { name: 'SELECT DRAFTED PLAYER' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'SELECT BLOCKED PLAYER' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'SELECT AVAILABLE PLAYER' })[0]);
    expect(onSelectCandidate).toHaveBeenCalledTimes(2);
  });

  it('renders distinct engine bills, verbatim risk, fallout, and keep/revert what-if controls', () => {
    const onKeepWhatIf = vi.fn();
    const onRevertWhatIf = vi.fn();
    render(<PrivateDesk
      candidates={[candidate]}
      rankings={{ SS: ['muraski'] }}
      boardSlots={{ SS: 'muraski' }}
      brokenSlots={[]}
      planBill={{ planCost: 80, planTax: 10, planCushion: 30, playerIds: ['muraski'] }}
      advisorLog={[]}
      taxCoreRows={[]}
      slotDepth={{ SS: 1 }}
      onReorder={() => undefined}
      onStartWhatIf={() => undefined}
      onKeepWhatIf={onKeepWhatIf}
      onRevertWhatIf={onRevertWhatIf}
      tradeGuide={<div>POSTED PRICE GUIDE</div>}
      whatIf={{
        slotId: 'SS', playerId: 'muraski', planCost: 80, planTax: 10, planCushion: 30,
        legal: true, legalityLine: 'THE CHOSEN BOARD SLOTS STILL WORK.', legalFinishLine: candidate.legalFinishLine,
      }}
    />);

    expect(screen.getByText('PLAN COST')).toBeInTheDocument();
    expect(screen.getByText('PLAN TAX')).toBeInTheDocument();
    expect(screen.getByText('PLAN CUSHION')).toBeInTheDocument();
    expect(screen.getByText('NEXT PICK — AT RISK')).toBeInTheDocument();
    expect(screen.getByText('FITS YOUR BOARD — SS SLOT')).toBeInTheDocument();
    expect(screen.getAllByText(candidate.legalFinishLine)).toHaveLength(2);
    expect(screen.getByText('THE CHOSEN BOARD SLOTS STILL WORK.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'KEEP' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVERT' }));
    expect(onKeepWhatIf).toHaveBeenCalledTimes(1);
    expect(onRevertWhatIf).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'GUIDE' }));
    expect(screen.getByText('POSTED PRICE GUIDE')).toBeInTheDocument();
  });
});

describe('downward tax consequence copy (TAXSWING seam)', () => {
  it('renders YOUR TAX BILL GOES DOWN when the marginal tax is negative', async () => {
    const { DeskCandidateCard } = await import('../DeskCandidateCard');
    render(<DeskCandidateCard candidate={{ ...candidate, marginalTax: -12345 }} />);
    expect(screen.getByText(/YOUR TAX BILL GOES DOWN \$12,345 WITH THIS PLAYER/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(?:he|she|him|her)\b/i);
  });
});
