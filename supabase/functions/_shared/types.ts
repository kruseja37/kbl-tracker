export type NarrativeIntensity = "low" | "medium" | "high";

export type LlmUsagePurpose =
  | "legacy_summary"
  | "commentary"
  | "between_inning_summary"
  | "post_game_column"
  | "storyline_refinement";

export interface LlmProxyResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
}

export interface LlmProxyMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmProxyRequest {
  model?: string;
  messages: LlmProxyMessage[];
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: LlmProxyResponseFormat;
  gameId?: string;
  mode?: "exhibition" | "elimination" | "franchise" | "playoff";
}

export interface LlmProxyResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface LlmProxyError {
  error: {
    code: string;
    message: string;
  };
}

export class LlmProxyHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "LlmProxyHttpError";
    this.status = status;
    this.code = code;
  }
}

const INTENSITIES = new Set<NarrativeIntensity>(["low", "medium", "high"]);
const PURPOSES = new Set<LlmUsagePurpose>([
  "legacy_summary",
  "commentary",
  "between_inning_summary",
  "post_game_column",
  "storyline_refinement",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMessage(value: unknown): value is LlmProxyMessage {
  return (
    isObject(value) &&
    (value.role === "system" || value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

function isResponseFormat(value: unknown): value is LlmProxyResponseFormat {
  return (
    isObject(value) &&
    value.type === "json_schema" &&
    isObject(value.json_schema) &&
    typeof value.json_schema.name === "string" &&
    value.json_schema.name.trim().length > 0 &&
    isObject(value.json_schema.schema) &&
    (value.json_schema.strict === undefined ||
      typeof value.json_schema.strict === "boolean")
  );
}

export function parseLlmProxyRequest(value: unknown): LlmProxyRequest {
  if (!isObject(value)) {
    throw new LlmProxyHttpError(400, "invalid_body", "Request body must be a JSON object.");
  }

  if (!Array.isArray(value.messages) || value.messages.length === 0 || !value.messages.every(isMessage)) {
    throw new LlmProxyHttpError(400, "invalid_messages", "Request body must include non-empty messages.");
  }

  if (typeof value.intensity !== "string" || !INTENSITIES.has(value.intensity as NarrativeIntensity)) {
    throw new LlmProxyHttpError(400, "invalid_intensity", "Request body must include intensity: low, medium, or high.");
  }

  if (typeof value.purpose !== "string" || !PURPOSES.has(value.purpose as LlmUsagePurpose)) {
    throw new LlmProxyHttpError(400, "invalid_purpose", "Request body must include a supported LLM usage purpose.");
  }

  if (value.model !== undefined && typeof value.model !== "string") {
    throw new LlmProxyHttpError(400, "invalid_model", "model must be a string when provided.");
  }

  if (value.temperature !== undefined && typeof value.temperature !== "number") {
    throw new LlmProxyHttpError(400, "invalid_temperature", "temperature must be a number when provided.");
  }

  if (value.maxTokens !== undefined && (!Number.isFinite(value.maxTokens) || typeof value.maxTokens !== "number")) {
    throw new LlmProxyHttpError(400, "invalid_max_tokens", "maxTokens must be a finite number when provided.");
  }

  if (value.responseFormat !== undefined && !isResponseFormat(value.responseFormat)) {
    throw new LlmProxyHttpError(
      400,
      "invalid_response_format",
      "responseFormat must be a json_schema object when provided.",
    );
  }

  return {
    model: value.model,
    messages: value.messages,
    intensity: value.intensity as NarrativeIntensity,
    purpose: value.purpose as LlmUsagePurpose,
    temperature: value.temperature,
    maxTokens: value.maxTokens,
    responseFormat: value.responseFormat as LlmProxyResponseFormat | undefined,
    gameId: typeof value.gameId === "string" ? value.gameId : undefined,
    mode:
      value.mode === "exhibition" ||
      value.mode === "elimination" ||
      value.mode === "franchise" ||
      value.mode === "playoff"
        ? value.mode
        : undefined,
  };
}
