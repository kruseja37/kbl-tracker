export type ReporterLlmProvider = "grok" | "anthropic";

export interface ReporterModelPricing {
  provider: ReporterLlmProvider;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export const REPORTER_MODEL_PRICING: Record<string, ReporterModelPricing> = {
  "grok-4": {
    provider: "grok",
    inputUsdPerMillionTokens: 3,
    outputUsdPerMillionTokens: 15,
  },
  "claude-sonnet-4.6": {
    provider: "anthropic",
    inputUsdPerMillionTokens: 3,
    outputUsdPerMillionTokens: 15,
  },
};

export function getReporterModelPricing(model: string): ReporterModelPricing {
  const exact = REPORTER_MODEL_PRICING[model];
  if (exact) return exact;

  if (model.toLowerCase().startsWith("grok")) {
    return REPORTER_MODEL_PRICING["grok-4"];
  }

  if (model.toLowerCase().startsWith("claude")) {
    return REPORTER_MODEL_PRICING["claude-sonnet-4.6"];
  }

  throw new Error(`No reporter LLM pricing configured for model: ${model}`);
}

export function calculateLlmCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = getReporterModelPricing(params.model);
  const inputCost = (params.inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens;
  const outputCost = (params.outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  return Number((inputCost + outputCost).toFixed(6));
}
