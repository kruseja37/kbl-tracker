import {
  renderValidatedAuctionAdvisorText,
  type AuctionAdvisorFactPayload,
  type ValidatedAdvisorText,
} from '../../../../engines/auctionAdvisorColor';
import { isAuctionAdvisorColorEnabled } from '../../../../utils/franchisePhase2Flags';
import { callClaudeMessages, type ClaudeMessagesRequest, type ClaudeMessagesResult } from './claudeClient';

export const AUCTION_ADVISOR_MODEL = 'claude-haiku-4-5';

type AdvisorClaudeCall = (request: ClaudeMessagesRequest) => Promise<ClaudeMessagesResult>;

export interface AuctionAdvisorEmissionDependencies {
  enabled?: () => boolean;
  callClaude?: AdvisorClaudeCall;
}

function systemPrompt(payload: AuctionAdvisorFactPayload): string {
  return [
    'You are a concise baseball assistant GM.',
    'Dress the supplied facts with personality. Keep the response concise.',
    'Use no numbers in any form: no digits, number words, ordinals, dollar figures, or currency symbols.',
    'Use no player, team, club, or other proper name beyond names provided in the facts.',
    'State no grades, tiers, rankings, verdicts, or evaluative superlatives.',
    'Supply personality and baseball color only; never restate or transform fact-shaped content.',
    `Moment: ${payload.title}.`,
  ].join(' ');
}

export async function emitAuctionAdvisorMoment(
  payload: AuctionAdvisorFactPayload,
  dependencies: AuctionAdvisorEmissionDependencies = {},
): Promise<ValidatedAdvisorText> {
  const enabled = dependencies.enabled ?? isAuctionAdvisorColorEnabled;
  if (!enabled()) return { text: payload.fallback, source: 'template', rejected: false };

  const callClaude = dependencies.callClaude ?? callClaudeMessages;
  try {
    const response = await callClaude({
      model: AUCTION_ADVISOR_MODEL,
      messages: [
        { role: 'system', content: systemPrompt(payload) },
        { role: 'user', content: payload.facts.join('\n') },
      ],
      intensity: 'low',
      purpose: 'storyline_refinement',
      temperature: 0.4,
      maxTokens: 180,
      mode: 'franchise',
    });
    return renderValidatedAuctionAdvisorText(response.text, payload);
  } catch {
    return { text: payload.fallback, source: 'template', rejected: false };
  }
}
