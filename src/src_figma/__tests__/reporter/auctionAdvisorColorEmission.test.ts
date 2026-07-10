import { afterEach, describe, expect, test, vi } from 'vitest';

import { buildPreDraftAdvisorFacts } from '../../../engines/auctionAdvisorColor';
import {
  AUCTION_ADVISOR_MODEL,
  emitAuctionAdvisorMoment,
} from '../../app/engines/reporter/auctionAdvisorColorEmission';
import {
  isAuctionAdvisorColorEnabled,
  setAuctionAdvisorColorEnabledForTests,
} from '../../../utils/franchisePhase2Flags';

afterEach(() => setAuctionAdvisorColorEnabledForTests(null));

const payload = buildPreDraftAdvisorFacts({
  draftId: 'draft-1',
  seatTeamId: 'team-a',
  seatTeamName: 'Page Caps',
  identityName: "Murderers' Row",
  poolPositionCounts: [{ position: 'C', count: 7 }],
  topTargets: [{ rank: 1, playerId: 'player-a', playerName: 'Avery Anchor' }],
  scarcePositions: [{ position: 'C', available: 7, required: 6 }],
});

describe('auction advisor color emission seam', () => {
  test('the single per-feature gate defaults on and supports the house-pattern override', () => {
    expect(isAuctionAdvisorColorEnabled()).toBe(true);
    setAuctionAdvisorColorEnabledForTests(false);
    expect(isAuctionAdvisorColorEnabled()).toBe(false);
  });
  test('gate off renders the useful template without calling the connector', async () => {
    const callClaude = vi.fn();
    await expect(emitAuctionAdvisorMoment(payload, { enabled: () => false, callClaude })).resolves.toEqual({
      text: payload.fallback,
      source: 'template',
      rejected: false,
    });
    expect(callClaude).not.toHaveBeenCalled();
  });

  test('connector failure renders the template with no retry', async () => {
    const callClaude = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await emitAuctionAdvisorMoment(payload, { enabled: () => true, callClaude });
    expect(result.source).toBe('template');
    expect(callClaude).toHaveBeenCalledTimes(1);
  });

  test('uses the ruled Haiku model, sends the zero-facts prompt, and accepts clean color output', async () => {
    const callClaude = vi.fn().mockResolvedValue({
      text: 'Page Caps should move early on Avery Anchor.',
      inputTokens: 10,
      outputTokens: 10,
      raw: {},
    });
    const result = await emitAuctionAdvisorMoment(payload, { enabled: () => true, callClaude });
    expect(result.source).toBe('llm');
    expect(callClaude).toHaveBeenCalledWith(expect.objectContaining({ model: AUCTION_ADVISOR_MODEL }));
    expect(callClaude).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringMatching(/no numbers in any form.*no player.*no grades.*personality and baseball color only/i),
        }),
      ]),
    }));
    expect(callClaude.mock.calls[0]?.[0].messages[0]?.content).not.toContain('one or two');
    expect(AUCTION_ADVISOR_MODEL).toBe('claude-haiku-4-5');
  });
});
