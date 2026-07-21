import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SNAKE_BOARD_SLOT_IDS } from '../../../../../../utils/leagueBuilderStorage';
import { BoardView } from '../BoardView';
import type { DeskCandidate } from '../deskModel';

function candidate(id: string, name: string, drafted = false): DeskCandidate {
  return {
    id, name, position: 'SS', eligiblePositions: ['SS'], advisorWorth: 90,
    iv: 80, marginalTax: 10, trueCost: 90, archetypeChip: 'WHITEYBALL',
    fitWord: 'STRONG FIT', risk: 'SAFE_TO_WAIT', legalFinishLine: 'LEGAL', drafted,
    construction: {
      id, isPitcher: false,
      bat: { POW: 70, CON: 80, SPD: 90, FLD: 85, ARM: 75 },
      pit: { VEL: 0, JNK: 0, ACC: 0 },
    },
  };
}

const chemistry = [
  { family: 'CMP' as const, word: 'Competitive' as const, count: 3, tier: 'L2' as const },
  { family: 'SPI' as const, word: 'Spirited' as const, count: 5, tier: 'L2' as const },
  { family: 'CRA' as const, word: 'Crafty' as const, count: 4, tier: 'L2' as const },
  { family: 'SCH' as const, word: 'Scholarly' as const, count: 6, tier: 'L2' as const },
  { family: 'DIS' as const, word: 'Disciplined' as const, count: 4, tier: 'L2' as const },
];

describe('BoardView Batch 5 ledger', () => {
  it('renders aggregate truth first, then all 22 canonical slots with explicit failure states and no raw id', () => {
    render(<BoardView
      candidates={[
        candidate('known', 'KNOWN PLAYER'),
        candidate('broken', 'BROKEN PLAYER'),
        candidate('drafted', 'DRAFTED PLAYER', true),
      ]}
      boardSlots={{ C: 'known', '1B': 'raw-private-id', '3B': 'broken', SS: 'drafted' }}
      brokenSlots={['3B']}
      planBill={{ planCost: 500, planTax: 20, planCushion: 480, playerIds: Array.from({ length: 22 }, (_, index) => `p${index}`) }}
      planChemistry={chemistry}
      taxCoreRows={[]}
      slotDepth={{}}
    />);

    const truth = screen.getByTestId('plan-truth-strip');
    const grid = screen.getByTestId('board-slot-grid');
    expect(truth.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('LINEUP + BENCH')).toBeInTheDocument();
    expect(screen.getByText('PITCHING STAFF')).toBeInTheDocument();
    expect([...grid.children].map((row) => row.getAttribute('data-board-slot'))).toEqual(SNAKE_BOARD_SLOT_IDS);
    expect(grid.children).toHaveLength(22);
    expect(grid.querySelector('[data-board-slot="1B"]')).toHaveTextContent('UNKNOWN PLAYER');
    expect(grid.querySelector('[data-board-slot="2B"]')).toHaveTextContent('MISSING');
    expect(grid.querySelector('[data-board-slot="3B"]')).toHaveTextContent('PLAN BROKEN');
    expect(grid.querySelector('[data-board-slot="SS"]')).toHaveTextContent('UNAVAILABLE');
    expect(grid).not.toHaveTextContent('raw-private-id');
    for (const word of ['Competitive', 'Spirited', 'Crafty', 'Scholarly', 'Disciplined']) expect(truth).toHaveTextContent(word);
  });

  it('uses the same aggregate-first canonical ledger for the read-only assistant board', () => {
    render(<BoardView
      candidates={[candidate('known', 'KNOWN PLAYER')]}
      boardSlots={{ C: 'known' }}
      brokenSlots={[]}
      planBill={null}
      planLedger={{ rosterCount: 22, salary: 500, tax: 20, allIn: 520, moneyLeft: 480 }}
      planTitle="ASST GM 22"
      planChemistry={chemistry}
      taxCoreRows={[]}
      slotDepth={{}}
      readOnly
    />);
    const board = screen.getByTestId('assistant-board-view');
    expect(screen.getByTestId('assistant-plan-truth-strip')).toHaveTextContent('ASST GM 22');
    expect(board.querySelectorAll('[data-board-slot]')).toHaveLength(22);
    expect(board.querySelector('details')).toBeNull();
  });

  it('shows exact used, archetype-adjusted limit, room, contributors, and selected-player points', () => {
    render(<BoardView
      candidates={[candidate('known', 'KNOWN PLAYER')]}
      boardSlots={{ SS: 'known' }}
      brokenSlots={[]}
      planBill={null}
      taxCoreRows={[{
        key: 'hitters:POW', group: 'hitters', stat: 'POW', topN: 8,
        label: 'TOP 8 HITTERS · POWER', playerNames: ['KNOWN PLAYER'],
        used: 570.4, allowed: 585.7, room: 15.3, tax: 0,
        contributors: [{ playerId: 'known', playerName: 'KNOWN PLAYER', points: 70 }],
      }]}
      slotDepth={{}}
      selectedCandidateId="known"
    />);

    const room = screen.getByTestId('rating-room');
    expect(room).toHaveTextContent('RATING ROOM');
    expect(room).toHaveTextContent('$0 TAX');
    expect(room).toHaveTextContent('POW · TOP 8');
    expect(room).toHaveTextContent('USED 570.4 / LIMIT 585.7');
    expect(room).toHaveTextContent('15.3 LEFT');
    expect(room).toHaveTextContent('KNOWN PLAYER 70');
    expect(room).toHaveTextContent('SELECTED · 70 PTS');
  });

  it('keeps the same rating-room ledger on the read-only Assistant GM board', () => {
    render(<BoardView
      candidates={[candidate('known', 'KNOWN PLAYER')]}
      boardSlots={{ SS: 'known' }}
      brokenSlots={[]}
      planBill={null}
      planLedger={{ rosterCount: 22, salary: 500, tax: 25, allIn: 525, moneyLeft: 475 }}
      planTitle="ASST GM 22"
      planChemistry={chemistry}
      taxCoreRows={[{
        key: 'hitters:POW', group: 'hitters', stat: 'POW', topN: 8,
        label: 'TOP 8 HITTERS · POWER', playerNames: ['KNOWN PLAYER'],
        used: 610, allowed: 585, room: -25, tax: 25,
        contributors: [{ playerId: 'known', playerName: 'KNOWN PLAYER', points: 70 }],
      }]}
      slotDepth={{}}
      readOnly
    />);

    expect(screen.getByTestId('assistant-rating-room')).toHaveTextContent('25 OVER');
    expect(screen.getByTestId('assistant-rating-room')).toHaveTextContent('$25 TAX');
  });

  it('labels the fifth bench body FLEX5 when catcher depth is supplied from the staff', () => {
    const bench = candidate('bench-five', 'BENCH FIVE');
    render(<BoardView
      candidates={[bench]}
      boardSlots={{ BACKUP_C: bench.id }}
      brokenSlots={[]}
      planBill={null}
      taxCoreRows={[]}
      slotDepth={{}}
    />);

    expect(screen.getByTestId('board-slot-grid').querySelector('[data-board-slot="BACKUP_C"]'))
      .toHaveTextContent('FLEX5');
  });

  it('marks an owned drafted player as roster truth with team branding and no unavailable-plan panel', () => {
    const rosterPlayer = { ...candidate('owned', 'OWNED PLAYER', true), draftedByActiveTeam: true };
    render(<BoardView
      candidates={[rosterPlayer]}
      boardSlots={{ SS: 'owned' }}
      brokenSlots={[]}
      planBill={null}
      taxCoreRows={[]}
      slotDepth={{}}
      teamColors={{ primary: '#008B8B', secondary: '#FFD700' }}
    />);

    const row = screen.getByRole('button', { name: 'SELECT OWNED PLAYER' });
    expect(row).toHaveTextContent('ROSTER');
    expect(row).toHaveStyle({ borderLeftColor: '#008B8B', borderLeftWidth: '8px' });
    expect(screen.getByTestId('board-slot-grid').querySelector('[data-board-slot="SS"]')).toHaveAttribute('data-board-state', 'ROSTER');
    expect(screen.queryByTestId('plan-truth-strip')).not.toBeInTheDocument();
  });
});
