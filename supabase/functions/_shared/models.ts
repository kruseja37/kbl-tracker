import { LlmProxyHttpError } from "./types.ts";

export type LlmProvider = "grok" | "anthropic";

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  grok: "grok-4",
  anthropic: "claude-sonnet-4-6",
};

export const ALLOWED_MODELS: Record<LlmProvider, readonly string[]> = {
  grok: ["grok-4"],
  anthropic: ["claude-sonnet-4-6"],
};

export function resolveAllowedModel(provider: LlmProvider, requestedModel?: string): string {
  const model = requestedModel ?? DEFAULT_MODELS[provider];

  if (!ALLOWED_MODELS[provider].includes(model)) {
    throw new LlmProxyHttpError(400, "model_not_allowed", `Model ${model} is not allowed for ${provider}.`);
  }

  return model;
}
