import { describe, expect, it } from 'vitest';

import type { RosterSlotPlayer } from '../../../../../../data/rosterConstruction';
import type { SnakeSeatingPlayer } from '../../../../../../engines/snakeSeatingProof';
import type { LeagueBuilderMlbDraftSession } from '../../../../../../utils/leagueBuilderStorage';
import type { DeskCandidate } from '../deskModel';
import {
  buildSnakeDecisionCandidateFacts,
  buildSnakeGuideRecommendationRequest,
  expectedSnakeGuideDestinations,
  hasEquivalentViableReplacement,
  isStrictlyParetoDominated,
  resolveSnakeDraftDecision,
  runSnakeGuideRecommendationRequest,
  sanitizeSnakeGuideSession,
  snakeGuideThreatPick,
  validateSnakeGuideRecommendationPackage,
  type SnakeDecisionCandidateFacts,
  type SnakeDraftDecisionInput,
} from '../snakeDraftDecisionModel';
import type { SelectedPlayerConsequence } from '../snakeDeskIntelligenceModel';

const chemistry = ['CMP', 'SPI', 'CRA', 'SCH', 'DIS'].map((family) => ({
  family,
  score: 201,
}));

function facts(playerId: string, overrides: Partial<SnakeDecisionCandidateFacts> = {}): SnakeDecisionCandidateFacts {
  return {
    playerId,
    contextualWorth: 100,
    trueCost: 100,
    fit: 2,
    chemistry,
    legalFinish: true,
    solvent: true,
    ...overrides,
  };
}

const risk = {
  playerId: 'selected', risk: 'AT_RISK' as const, nextPick: 12,
  earliestSelectingPick: 8, latestSelectingPick: 12, latestSelectingPickIsAskingTurn: true,
  interestedClubCount: 2, draftedAtPick: 8, rationalBuyersBeforeTurn: 2,
};

const scarcity = [{
  playerId: 'selected', role: 'SS' as const, viablePeopleLeft: 4, clubsStillNeeding: 2,
  lowestViableTrueCost: 50, highestViableTrueCost: 150,
  targetContextualWorth: 100, replacementPlayerId: 'replacement', replacementContextualWorth: 90,
  contextualWorthDrop: 10, replacementState: 'AVAILABLE' as const,
}];

const guideProposal = {
  buyerTeamId: 'asking', sellerTeamId: 'rival', targetPick: 7,
  offerPickNumbers: [11], receivePickNumbers: [7],
  offerValue: 100, receiveValue: 100, sessionRevision: 3,
};

function baseDecision(overrides: Partial<SnakeDraftDecisionInput> = {}): SnakeDraftDecisionInput {
  return {
    selectedPlayerId: 'selected', askingTeamId: 'asking', livePickTeamId: 'rival',
    assistantPriorityPlayerIds: ['selected'], assistantInfeasibleReason: null, infeasibleForPlayerId: null,
    selected: facts('selected'), replacements: [], risk, scarcity,
    guide: { status: 'ready', proposal: guideProposal },
    ...overrides,
  };
}

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

function guideSession(): LeagueBuilderMlbDraftSession {
  return {
    id: 'guide', leagueId: 'league', seasonNumber: 1, seed: 'guide', workflowVersion: 'v2',
    engineMethodVersion: 'snakeFoundations.v1', tier: 'standard', balanceMode: 'taxed', rounds: 20,
    pickOrder: Array.from({ length: 20 }, (_, index) => ({
      round: index + 1,
      pick: index + 1,
      teamId: [12, 18].includes(index + 1) ? 'asking' : 'rival',
    })),
    completedPicks: [], currentPickIndex: 0, revision: 3,
    snakeSetup: {
      poolPlayerIds: [], versionSelections: {}, orderSeed: 'order',
      clubs: [
        { teamId: 'asking', hotseat: true, archetypeId: 'BALANCED' },
        { teamId: 'rival', hotseat: true, archetypeId: 'BALANCED' },
      ],
    },
    seatBoards: { private: {} as never },
    roomLogByTeamId: { private: [] },
    snakeCompanions: { roomCode: 'SECRET', claims: [] },
    correctionSnapshots: [],
    createdDate: '2026-07-13', lastModified: '2026-07-13',
  };
}

function guideRequest(pool = [player('open-a', { isPitcher: true, position: 'CP', role: 'CP' }), player('open-b', { isPitcher: true, position: 'CP', role: 'CP' })]) {
  const session = guideSession();
  return buildSnakeGuideRecommendationRequest({
    session,
    buyerTeamId: 'asking',
    earliestThreatPick: 10,
    pickValueChart: session.pickOrder.map((slot) => ({ pick: slot.pick, value: 100 })),
    seatingProofInput: {
      clubs: [
        { teamId: 'asking', roster: legalPlayers('asking').slice(0, -1), budgetRemaining: 1_000 },
        { teamId: 'rival', roster: legalPlayers('rival').slice(0, -1), budgetRemaining: 1_000 },
      ],
      pool,
      baseCaps: [],
      realTeamCount: 2,
    },
  });
}

describe('Batch 4B sparse decision resolver', () => {
  it('returns only the four supported calls or neutral null', () => {
    expect(resolveSnakeDraftDecision(baseDecision({
      risk: { ...risk, risk: 'SAFE_TO_WAIT', earliestSelectingPick: null, draftedAtPick: null },
      guide: { status: 'idle', proposal: null },
    }))).toEqual({ kind: 'SAFE_TO_WAIT', playerId: 'selected', nextPick: 12 });
    expect(resolveSnakeDraftDecision(baseDecision({ livePickTeamId: 'asking' })))
      .toEqual({ kind: 'TAKE_NOW', playerId: 'selected' });
    expect(resolveSnakeDraftDecision(baseDecision())).toEqual({
      kind: 'TRADE_TO_PICK', playerId: 'selected', targetPick: 7, proposal: guideProposal,
    });
    expect(resolveSnakeDraftDecision(baseDecision({ guide: { status: 'unavailable', proposal: null } }))).toBeNull();
  });

  it('returns PASS for a selected current engine-proven infeasible pin but not transport/unknown state', () => {
    expect(resolveSnakeDraftDecision(baseDecision({
      assistantPriorityPlayerIds: null,
      assistantInfeasibleReason: 'PIN_UNMATCHED',
      infeasibleForPlayerId: 'selected',
      selected: null, replacements: null, risk: null, scarcity: null,
      guide: { status: 'unavailable', proposal: null },
    }))).toEqual({ kind: 'PASS', playerId: 'selected' });
    expect(resolveSnakeDraftDecision(baseDecision({
      assistantPriorityPlayerIds: null,
      assistantInfeasibleReason: null,
      infeasibleForPlayerId: null,
      selected: null, replacements: null, risk: null, scarcity: null,
      guide: { status: 'unavailable', proposal: null },
    }))).toBeNull();
    expect(resolveSnakeDraftDecision(baseDecision({
      assistantInfeasibleReason: 'INSOLVENT_BOARD', infeasibleForPlayerId: 'different',
    }))).not.toMatchObject({ kind: 'PASS' });
    expect(resolveSnakeDraftDecision(baseDecision({
      assistantPriorityPlayerIds: null,
      assistantInfeasibleReason: 'INSOLVENT_BOARD', infeasibleForPlayerId: 'selected',
      selected: null, replacements: null, risk: null, scarcity: null,
      guide: { status: 'unavailable', proposal: null },
    }))).toBeNull();
  });

  it('requires complete selected-id-bound Batch 3 facts', () => {
    const candidate = { id: 'selected', advisorWorth: 101, trueCost: 90 } as DeskCandidate;
    const consequence = {
      status: 'ready', selectedPlayerId: 'selected',
      after: {
        fitWord: 'STRONG FIT',
        chemistry: [
          { family: 'CMP', word: 'Competitive', count: 1, tier: 'L1' },
          { family: 'SPI', word: 'Spirited', count: 2, tier: 'L2' },
          { family: 'CRA', word: 'Crafty', count: 3, tier: 'L3' },
          { family: 'SCH', word: 'Scholarly', count: 4, tier: 'L2' },
          { family: 'DIS', word: 'Disciplined', count: 5, tier: 'L1' },
        ],
        ledger: { rosterCount: 22, salary: 80, tax: 10, allIn: 90, moneyLeft: 10 },
        legalFinish: { feasible: true, moneyLeft: 10 },
      },
    } as SelectedPlayerConsequence;
    expect(buildSnakeDecisionCandidateFacts({ playerId: 'selected', candidate, consequence }))
      .toMatchObject({ playerId: 'selected', contextualWorth: 101, trueCost: 90, fit: 3 });
    expect(buildSnakeDecisionCandidateFacts({ playerId: 'other', candidate, consequence })).toBeNull();
    expect(buildSnakeDecisionCandidateFacts({
      playerId: 'selected', candidate,
      consequence: { ...consequence, after: { ...(consequence as Extract<SelectedPlayerConsequence, { status: 'ready' }>).after, chemistry: [] } } as SelectedPlayerConsequence,
    })).toBeNull();
  });

  it('uses complete Pareto facts, excludes the same player, and suppresses urgency for an equivalent public replacement', () => {
    const selected = facts('selected');
    const replacement = facts('replacement', { contextualWorth: 110, trueCost: 90, fit: 3 });
    expect(isStrictlyParetoDominated({ selected, replacement })).toBe(true);
    expect(isStrictlyParetoDominated({ selected, replacement: { ...replacement, playerId: 'selected' } })).toBe(false);
    expect(resolveSnakeDraftDecision(baseDecision({ replacements: [replacement] })))
      .toEqual({ kind: 'PASS', playerId: 'selected' });
    const equivalent = [{ ...scarcity[0], replacementContextualWorth: 100, contextualWorthDrop: 0 }];
    expect(hasEquivalentViableReplacement({ selectedPlayerId: 'selected', scarcity: equivalent })).toBe(true);
    expect(resolveSnakeDraftDecision(baseDecision({ scarcity: equivalent }))).toBeNull();
    expect(snakeGuideThreatPick({ ...baseDecision({ scarcity: equivalent }), guide: undefined, replacements: undefined } as never)).toBeNull();
  });
});

describe('Batch 4B sanitized current guide bridge', () => {
  it('strips every private field and searches the latest viable destination before the threat', () => {
    const session = guideSession();
    const sanitized = sanitizeSnakeGuideSession(session);
    expect(Object.keys(sanitized).sort()).toEqual([
      'completedPicks', 'currentPickIndex', 'id', 'lockedClubs', 'pickOrder', 'revision',
    ]);
    expect(JSON.stringify(sanitized)).not.toMatch(/seatBoards|roomLog|snakeCompanions|correction|SECRET|private/);
    const request = guideRequest();
    expect(expectedSnakeGuideDestinations(request.input)[0]).toBe(9);
    const result = runSnakeGuideRecommendationRequest(request);
    expect(result).toMatchObject({ status: 'ready', proposal: { targetPick: 9, buyerTeamId: 'asking' } });
    expect(result.status === 'ready' && result.proposal.offerPickNumbers.length).toBeGreaterThanOrEqual(1);
    expect(result.status === 'ready' && result.proposal.offerPickNumbers.length).toBeLessThanOrEqual(3);
  });

  it('uses one shared all-club completion proof, including the only remaining closer for each club', () => {
    expect(runSnakeGuideRecommendationRequest(guideRequest()).status).toBe('ready');
    expect(runSnakeGuideRecommendationRequest(guideRequest([
      player('only-cp', { isPitcher: true, position: 'CP', role: 'CP' }),
    ])).status).toBe('unavailable');
  });

  it('rejects missing, extra, duplicate, and nonexistent seating-proof clubs before search', () => {
    const baseline = guideRequest();
    const mutations = [
      { clubs: baseline.input.seatingProofInput.clubs.slice(0, 1), realTeamCount: 2 },
      { clubs: [...baseline.input.seatingProofInput.clubs, { ...baseline.input.seatingProofInput.clubs[0], teamId: 'extra' }], realTeamCount: 3 },
      { clubs: [baseline.input.seatingProofInput.clubs[0], baseline.input.seatingProofInput.clubs[0]], realTeamCount: 2 },
      { clubs: [baseline.input.seatingProofInput.clubs[0], { ...baseline.input.seatingProofInput.clubs[1], teamId: 'ghost' }], realTeamCount: 2 },
    ];
    for (const mutation of mutations) {
      const request = {
        ...baseline,
        input: {
          ...baseline.input,
          seatingProofInput: { ...baseline.input.seatingProofInput, ...mutation },
        },
      };
      expect(expectedSnakeGuideDestinations(request.input)).toEqual([]);
      expect(runSnakeGuideRecommendationRequest(request)).toEqual({ status: 'unavailable' });
    }
  });

  it('rejects a forged destination, four-pick payload, wrong revision, and noncanonical totals', () => {
    const request = guideRequest();
    const result = runSnakeGuideRecommendationRequest(request);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('Expected guide package.');
    const premiumProposal = result.proposal as typeof result.proposal & { sellerPremium?: number };
    expect(premiumProposal.sellerPremium).toBe(result.proposal.offerValue - result.proposal.receiveValue);
    expect(validateSnakeGuideRecommendationPackage(request, { ...result.proposal, targetPick: 10 })).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, {
      ...result.proposal,
      offerPickNumbers: [12, 18, 12, 18],
      receivePickNumbers: [9, 8, 7, 6],
    })).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, { ...result.proposal, sessionRevision: 4 })).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, { ...result.proposal, offerValue: result.proposal.offerValue + 1 })).toBe(false);
    const { sellerPremium: _removed, ...missingPremium } = premiumProposal;
    expect(_removed).toBe(premiumProposal.offerValue - premiumProposal.receiveValue);
    expect(validateSnakeGuideRecommendationPackage(request, missingPremium)).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, { ...premiumProposal, sellerPremium: Number.NaN })).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, { ...premiumProposal, sellerPremium: Number.POSITIVE_INFINITY })).toBe(false);
    expect(validateSnakeGuideRecommendationPackage(request, { ...premiumProposal, sellerPremium: (premiumProposal.sellerPremium ?? 0) + 1 })).toBe(false);
    const unfairRequest = {
      ...request,
      input: {
        ...request.input,
        pickValueChart: request.input.pickValueChart.map((row) => ({
          ...row,
          value: result.proposal.offerPickNumbers.includes(row.pick) ? 100 : 1,
        })),
      },
    };
    expect(validateSnakeGuideRecommendationPackage(unfairRequest, {
      ...result.proposal,
      offerValue: result.proposal.offerPickNumbers.length * 100,
      receiveValue: result.proposal.receivePickNumbers.length,
    })).toBe(false);
  });
});
