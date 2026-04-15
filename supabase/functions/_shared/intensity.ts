import type { LlmProxyMessage, NarrativeIntensity } from "./types.ts";
import { LlmProxyHttpError } from "./types.ts";

export interface TokenCaps {
  maxOutputTokens: number;
  maxInputTokens: number;
}

export const TOKEN_CAPS: Record<NarrativeIntensity, TokenCaps> = {
  low: {
    maxInputTokens: 2_500,
    maxOutputTokens: 260,
  },
  medium: {
    maxInputTokens: 4_000,
    maxOutputTokens: 700,
  },
  high: {
    maxInputTokens: 6_500,
    maxOutputTokens: 1_200,
  },
};

export function estimateInputTokens(messages: LlmProxyMessage[]): number {
  const characters = messages.reduce((total, message) => total + message.content.length, 0);
  return Math.ceil(characters / 4);
}

export function enforceIntensityCaps(params: {
  intensity: NarrativeIntensity;
  messages: LlmProxyMessage[];
  requestedMaxTokens?: number;
}): { maxOutputTokens: number; estimatedInputTokens: number } {
  const caps = TOKEN_CAPS[params.intensity];
  const estimatedInputTokens = estimateInputTokens(params.messages);

  if (estimatedInputTokens > caps.maxInputTokens) {
    throw new LlmProxyHttpError(
      413,
      "input_token_cap_exceeded",
      `Estimated input tokens ${estimatedInputTokens} exceed ${params.intensity} cap ${caps.maxInputTokens}.`,
    );
  }

  return {
    maxOutputTokens: Math.min(
      Math.max(1, Math.floor(params.requestedMaxTokens ?? caps.maxOutputTokens)),
      caps.maxOutputTokens,
    ),
    estimatedInputTokens,
  };
}
