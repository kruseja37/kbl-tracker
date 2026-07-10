import { describe, expect, test } from 'vitest';

import {
  buildDraftRecapAdvisorFacts,
  buildPostLotAdvisorFacts,
  buildPreDraftAdvisorFacts,
  classifyPostLotSignificance,
  gradeDraftRecap,
  renderValidatedAuctionAdvisorText,
} from '../auctionAdvisorColor';

describe('auction advisor color validation red team', () => {
  const payload = buildPreDraftAdvisorFacts({
    draftId: 'draft-1',
    seatTeamId: 'team-a',
    seatTeamName: 'Page Caps',
    identityName: "Murderers' Row",
    poolPositionCounts: [
      { position: 'C', count: 7 },
      { position: 'SS', count: 10 },
    ],
    topTargets: [
      { rank: 1, playerId: 'player-a', playerName: 'Avery Anchor' },
      { rank: 2, playerId: 'player-b', playerName: 'Blake Bolt' },
    ],
    scarcePositions: [{ position: 'C', available: 7, required: 6 }],
  });

  test('rejects an invented dollar figure and renders the deterministic fallback', () => {
    const rendered = renderValidatedAuctionAdvisorText(
      'Page Caps can wait, then spend $987,654 on Avery Anchor.',
      payload,
    );

    expect(rendered).toEqual({ text: payload.fallback, source: 'template', rejected: true });
  });

  test('rejects an invented player name and renders the deterministic fallback', () => {
    const rendered = renderValidatedAuctionAdvisorText(
      'Page Caps should ignore Avery Anchor and chase Mystery Slugger.',
      payload,
    );

    expect(rendered).toEqual({ text: payload.fallback, source: 'template', rejected: true });
  });
});

describe('auction advisor color pure adapters', () => {
  test('assembles display-ready pre-draft facts without changing supplied counts or ranks', () => {
    const payload = buildPreDraftAdvisorFacts({
      draftId: 'draft-1',
      seatTeamId: 'team-a',
      seatTeamName: 'Page Caps',
      identityName: "Murderers' Row",
      poolPositionCounts: [{ position: 'C', count: 7 }],
      topTargets: [{ rank: 1, playerId: 'player-a', playerName: 'Avery Anchor' }],
      scarcePositions: [{ position: 'C', available: 7, required: 6 }],
    });

    expect(payload.facts).toContain('Pool counts: C 7.');
    expect(payload.facts).toContain('Top board targets: #1 Avery Anchor.');
    expect(payload.cacheKey).toBe('draft-1:team-a:pre-draft');
  });

  test.each([
    ['seat-won-top-five', { winnerTeamId: 'team-a', targetRank: 5, leftBoard: true }],
    ['rival-won-top-five', { winnerTeamId: 'team-b', targetRank: 5, leftBoard: true }],
    ['top-three-left', { winnerTeamId: null, targetRank: 3, leftBoard: true }],
  ] as const)('fires the %s reaction condition', (expected, scenario) => {
    expect(classifyPostLotSignificance({
      draftId: 'draft-1',
      lotId: 'lot-1',
      seatTeamId: 'team-a',
      seatTeamName: 'Page Caps',
      target: { rank: scenario.targetRank, playerId: 'player-a', playerName: 'Avery Anchor' },
      disposition: scenario.winnerTeamId ? 'SOLD' : 'PASSED',
      winnerTeamId: scenario.winnerTeamId,
      winnerTeamName: scenario.winnerTeamId === 'team-b' ? 'Page Keys' : 'Page Caps',
      salary: scenario.winnerTeamId ? 12_000 : null,
      leftBoard: scenario.leftBoard,
    })).toBe(expected);
  });

  test('does not react to a routine lot', () => {
    expect(buildPostLotAdvisorFacts({
      draftId: 'draft-1',
      lotId: 'lot-1',
      seatTeamId: 'team-a',
      seatTeamName: 'Page Caps',
      target: { rank: 6, playerId: 'player-a', playerName: 'Avery Anchor' },
      disposition: 'SOLD',
      winnerTeamId: 'team-b',
      winnerTeamName: 'Page Keys',
      salary: 12_000,
      leftBoard: true,
    })).toBeNull();
  });

  test('computes and locks the recap grade before any LLM dressing', () => {
    expect(gradeDraftRecap({
      seatsFilled: 22,
      seatTarget: 22,
      landedTargets: ['A', 'B', 'C'],
      lostTargets: ['D', 'E'],
    })).toBe('B');
    expect(gradeDraftRecap({
      seatsFilled: 22,
      seatTarget: 22,
      landedTargets: [],
      lostTargets: [],
    })).toBe('C');
    const payload = buildDraftRecapAdvisorFacts({
      draftId: 'draft-1',
      seatTeamId: 'team-a',
      seatTeamName: 'Page Caps',
      seatsFilled: 22,
      seatTarget: 22,
      spend: 88_000,
      startingBudget: 100_000,
      taxBill: 2_000,
      landedTargets: ['Avery Anchor', 'Blake Bolt', 'Casey Catcher'],
      lostTargets: ['Drew Dash', 'Evan Edge'],
    });

    expect(payload.verdict).toBe('Grade B');
    expect(payload.facts).toContain('Spend: $88,000 of $100,000.');
    expect(renderValidatedAuctionAdvisorText('Page Caps earned Grade A.', payload).source).toBe('template');
  });
});
