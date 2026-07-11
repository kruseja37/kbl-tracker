import { describe, expect, it } from 'vitest';

import type { RosterSlotPlayer } from '../../../../../../data/rosterConstruction';
import { derivePickValueChart } from '../../../../../../engines/leagueConstruction';
import { restoreLatestSnakeCorrection } from '../../../../../../engines/snakeSession';
import type { SnakeSeatingPlayer } from '../../../../../../engines/snakeSeatingProof';
import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import {
  executeAskedPickTrade,
  guideForAskedPick,
  type SnakeTradeGuideContext,
} from '../tradeGuideModel';

function player(playerId: string, shape: RosterSlotPlayer): SnakeSeatingPlayer {
  return {
    playerId,
    sourceId: `stock:${playerId}`,
    price: 5,
    shape,
    construction: {
      id: playerId,
      isPitcher: shape.isPitcher,
      role: shape.role as 'SP' | 'SP/RP' | 'RP' | 'CP' | undefined,
      bat: { POW: 5, CON: 5, SPD: 5, FLD: 5, ARM: 5 },
      ...(shape.isPitcher ? { pit: { VEL: 5, JNK: 5, ACC: 5 } } : {}),
    },
  };
}

function legalPlayers(prefix: string): SnakeSeatingPlayer[] {
  return [
    player(`${prefix}-C`, { isPitcher: false, position: 'C' }),
    player(`${prefix}-1B`, { isPitcher: false, position: '1B' }),
    player(`${prefix}-2B`, { isPitcher: false, position: '2B' }),
    player(`${prefix}-3B`, { isPitcher: false, position: '3B' }),
    player(`${prefix}-SS`, { isPitcher: false, position: 'SS' }),
    player(`${prefix}-LF`, { isPitcher: false, position: 'LF', secondaryPosition: 'C' }),
    player(`${prefix}-CF`, { isPitcher: false, position: 'CF' }),
    player(`${prefix}-RF`, { isPitcher: false, position: 'RF' }),
    ...Array.from({ length: 6 }, (_, index) => player(`${prefix}-B${index}`, { isPitcher: false, position: 'CF' })),
    ...Array.from({ length: 4 }, (_, index) => player(`${prefix}-SP${index}`, { isPitcher: true, position: 'SP', role: 'SP' })),
    ...Array.from({ length: 3 }, (_, index) => player(`${prefix}-RP${index}`, { isPitcher: true, position: 'RP', role: 'RP' })),
    player(`${prefix}-CP`, { isPitcher: true, position: 'CP', role: 'CP' }),
  ];
}

function context(): SnakeTradeGuideContext {
  const values = Array.from({ length: 70 }, (_, index) => 200 - index).sort((left, right) => right - left);
  const pickValueChart = derivePickValueChart(values);
  pickValueChart[8].value = 150;
  pickValueChart[13].value = 120;
  pickValueChart[40].value = 60;
  pickValueChart[61].value = 30;
  const pickOrder = Array.from({ length: 70 }, (_, index) => ({
    round: Math.floor(index / 2) + 1,
    pick: index + 1,
    teamId: [14, 41].includes(index + 1) ? 'buyer' : [9, 62].includes(index + 1) ? 'seller' : `other-${index}`,
  }));
  const session: LeagueBuilderMlbDraftSession = {
    id: 'guide', leagueId: 'league', seasonNumber: 1, seed: 'guide', workflowVersion: 'v2',
    engineMethodVersion: 'snakeFoundations.v1', tier: 'standard', balanceMode: 'taxed', rounds: 35,
    pickOrder, completedPicks: [], currentPickIndex: 0, revision: 7,
    createdDate: '2026-07-10', lastModified: '2026-07-10',
  };
  return {
    session,
    pickValueChart,
    seatingProofInput: {
      clubs: ['buyer', 'seller'].map((teamId) => ({ teamId, roster: [], budgetRemaining: 10_000 })),
      pool: [...legalPlayers('a'), ...legalPlayers('b'), ...legalPlayers('c'), ...legalPlayers('d')],
      baseCaps: [],
      realTeamCount: 2,
    },
  };
}

describe('S4 posted-price trade guide model', () => {
  it('answers only the GM asked pick and returns the engine message verbatim', () => {
    const result = guideForAskedPick({ ...context(), buyerTeamId: 'buyer', targetPick: 9 });
    expect(result.message).toBe('OFFER 14+41; RECEIVE 9+62 — guide-matched and legal now.');
    expect(result.proposal?.targetPick).toBe(9);
    expect(result.nextPickMoves).toEqual([
      { teamId: 'buyer', before: 14, after: 9 },
      { teamId: 'seller', before: 9, after: 14 },
    ]);
    expect(Object.keys(result)).not.toContain('targets');
    expect(Object.keys(result)).not.toContain('recommendations');
  });

  it('returns the engine no-package answer for the asked pick without finding another target', () => {
    const base = context();
    const result = guideForAskedPick({
      ...base,
      seatingProofInput: { ...base.seatingProofInput, pool: [] },
      buyerTeamId: 'buyer',
      targetPick: 9,
    });
    expect(result).toEqual({
      message: 'No legal guide trade reaches pick 9.',
      proposal: null,
      nextPickMoves: [],
    });
  });

  it('revalidates the current revision, moves ownership without geometry, writes fact-only receipts, and corrects byte-identically', () => {
    const base = context();
    const guide = guideForAskedPick({ ...base, buyerTeamId: 'buyer', targetPick: 9 });
    const executed = executeAskedPickTrade({ ...base, proposal: guide.proposal! });
    expect(executed.valid).toBe(true);
    expect(executed.session?.pickOrder.map(({ round, pick }) => ({ round, pick })))
      .toEqual(base.session.pickOrder.map(({ round, pick }) => ({ round, pick })));
    expect(executed.session?.pickOrder.find((slot) => slot.pick === 9)?.teamId).toBe('buyer');
    expect(executed.livePickMoved).toBe(false);
    expect(executed.receipts.map((entry) => entry.text)).toEqual([
      'YOU TRADED PICKS 14+41 FOR 9+62 — YOUR NEXT PICK: #9.',
      'YOU TRADED PICKS 9+62 FOR 14+41 — YOUR NEXT PICK: #14.',
    ]);
    expect(executed.receipts.map((entry) => entry.text).join(' ')).not.toMatch(/suggest|best|recommend|%/i);
    expect(restoreLatestSnakeCorrection(executed.session!)).toEqual(base.session);

    const stale = executeAskedPickTrade({
      ...base,
      session: { ...base.session, revision: 8 },
      proposal: guide.proposal!,
    });
    expect(stale).toMatchObject({ valid: false, message: 'The draft moved on — refresh.', session: null });
  });

  it('reports a live-pick ownership move so the existing room cancel seam fires', () => {
    const base = context();
    const guide = guideForAskedPick({ ...base, buyerTeamId: 'buyer', targetPick: 9 });
    const liveSession = { ...base.session, currentPickIndex: 8 };
    const refreshed = guideForAskedPick({ ...base, session: liveSession, buyerTeamId: 'buyer', targetPick: 9 });
    const executed = executeAskedPickTrade({ ...base, session: liveSession, proposal: refreshed.proposal ?? guide.proposal! });
    expect(executed.valid).toBe(true);
    expect(executed.livePickMoved).toBe(true);
  });
});
