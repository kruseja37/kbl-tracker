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
  const values = Array.from({ length: 32 }, (_, index) => Math.round(1_000 * (0.91 ** index)));
  const pickValueChart = derivePickValueChart(values, 20, 4);
  const pickOrder = Array.from({ length: 20 }, (_, index) => ({
    round: index + 1,
    pick: index + 1,
    teamId: [4, 12].includes(index + 1) ? 'buyer' : [2, 20].includes(index + 1) ? 'seller' : `other-${index}`,
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

function integrityContext(): SnakeTradeGuideContext {
  const pickValueChart = [110, 100, 80, 70, 60, 50, 40, 30, 25, 20, 20, 10]
    .map((value, index) => ({ pick: index + 1, value }));
  const pickOrder = Array.from({ length: 12 }, (_, index) => ({
    round: index + 1,
    pick: index + 1,
    teamId: [4, 5, 12].includes(index + 1) ? 'buyer' : [2, 10, 11].includes(index + 1) ? 'seller' : `other-${index}`,
  }));
  return {
    ...context(),
    pickValueChart,
    session: {
      ...context().session,
      id: 'integrity',
      seed: 'integrity',
      rounds: 12,
      pickOrder,
    },
  };
}

describe('S4 posted-price trade guide model', () => {
  it('answers only the GM asked pick and returns the engine message verbatim', () => {
    const result = guideForAskedPick({ ...context(), buyerTeamId: 'buyer', targetPick: 2 });
    expect(result.message).toBe('OFFER 4+12; RECEIVE 2+20 — guide-matched and legal now.');
    expect(result.proposal?.targetPick).toBe(2);
    expect(result.nextPickMoves).toEqual([
      { teamId: 'buyer', before: 4, after: 2 },
      { teamId: 'seller', before: 2, after: 4 },
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
      targetPick: 2,
    });
    expect(result).toEqual({
      message: 'No legal guide trade reaches pick 2.',
      proposal: null,
      nextPickMoves: [],
    });
  });

  it('revalidates the current revision, moves ownership without geometry, writes fact-only receipts, and corrects byte-identically', () => {
    const base = context();
    const guide = guideForAskedPick({ ...base, buyerTeamId: 'buyer', targetPick: 2 });
    const executed = executeAskedPickTrade({ ...base, proposal: guide.proposal! });
    expect(executed.valid).toBe(true);
    expect(executed.session?.pickOrder.map(({ round, pick }) => ({ round, pick })))
      .toEqual(base.session.pickOrder.map(({ round, pick }) => ({ round, pick })));
    expect(executed.session?.pickOrder.find((slot) => slot.pick === 2)?.teamId).toBe('buyer');
    expect(executed.livePickMoved).toBe(false);
    expect(executed.receipts.map((entry) => entry.text)).toEqual([
      'YOU TRADED PICKS 4+12 FOR 2+20 — YOUR NEXT PICK: #2.',
      'YOU TRADED PICKS 2+20 FOR 4+12 — YOUR NEXT PICK: #4.',
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
    const guide = guideForAskedPick({ ...base, buyerTeamId: 'buyer', targetPick: 2 });
    const liveSession = { ...base.session, currentPickIndex: 1 };
    const refreshed = guideForAskedPick({ ...base, session: liveSession, buyerTeamId: 'buyer', targetPick: 2 });
    const executed = executeAskedPickTrade({ ...base, session: liveSession, proposal: refreshed.proposal ?? guide.proposal! });
    expect(executed.valid).toBe(true);
    expect(executed.livePickMoved).toBe(true);
  });

  it('rejects caller-tampered totals instead of writing them to the receipt record', () => {
    const base = context();
    const guide = guideForAskedPick({ ...base, buyerTeamId: 'buyer', targetPick: 2 });
    const result = executeAskedPickTrade({
      ...base,
      proposal: { ...guide.proposal!, offerValue: guide.proposal!.offerValue + 1 },
    });
    expect(result).toMatchObject({ valid: false, session: null, receipts: [] });
  });

  it('rejects duplicate picks before ownership is changed', () => {
    const base = integrityContext();
    expect(executeAskedPickTrade({
      ...base,
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 2,
        offerPickNumbers: [4, 4], receivePickNumbers: [2, 10], offerValue: 140, receiveValue: 120,
        sessionRevision: 7,
      },
    })).toMatchObject({ valid: false, session: null, receipts: [] });
  });

  it('rejects a proposal that omits its named target pick', () => {
    const base = integrityContext();
    expect(executeAskedPickTrade({
      ...base,
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 11,
        offerPickNumbers: [4, 5], receivePickNumbers: [2, 10], offerValue: 130, receiveValue: 120,
        sessionRevision: 7,
      },
    })).toMatchObject({ valid: false, session: null, receipts: [] });
  });

  it('rejects a self-trade before ownership is changed', () => {
    const base = integrityContext();
    expect(executeAskedPickTrade({
      ...base,
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'buyer', targetPick: 5,
        offerPickNumbers: [4], receivePickNumbers: [5], offerValue: 70, receiveValue: 60,
        sessionRevision: 7,
      },
    })).toMatchObject({ valid: false, session: null, receipts: [] });
  });

  it('rejects a pick that appears on both sides', () => {
    const base = integrityContext();
    const overlapping: SnakeTradeGuideContext = {
      ...base,
      session: {
        ...base.session,
        pickOrder: [
          ...base.session.pickOrder,
          { round: 13, pick: 4, teamId: 'seller' },
        ],
      },
    };
    expect(executeAskedPickTrade({
      ...overlapping,
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 4,
        offerPickNumbers: [4], receivePickNumbers: [4], offerValue: 70, receiveValue: 70,
        sessionRevision: 7,
      },
    })).toMatchObject({ valid: false, session: null, receipts: [] });
  });

  it('rejects stale future ownership', () => {
    const base = integrityContext();
    expect(executeAskedPickTrade({
      ...base,
      session: { ...base.session, currentPickIndex: 5 },
      proposal: {
        buyerTeamId: 'buyer', sellerTeamId: 'seller', targetPick: 2,
        offerPickNumbers: [4, 5], receivePickNumbers: [2, 10], offerValue: 130, receiveValue: 120,
        sessionRevision: 7,
      },
    })).toMatchObject({ valid: false, session: null, receipts: [] });
  });
});
