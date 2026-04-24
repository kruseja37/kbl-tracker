import { supabase } from "../../../../supabase";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import type { CompetitionType } from "../../../../utils/gameStorage";
import type { LlmUsagePurpose } from "./usageLogger";

export interface GrokChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokJsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
}

export interface GrokChatCompletionRequest {
  model: string;
  messages: GrokChatMessage[];
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: GrokJsonSchemaResponseFormat;
  gameId?: string;
  mode?: CompetitionType;
  invokeImpl?: ReporterProxyInvoke;
}

export interface GrokChatCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
}

interface ReporterProxyRequestBody {
  model: string;
  messages: GrokChatMessage[];
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: GrokJsonSchemaResponseFormat;
  gameId?: string;
  mode?: CompetitionType;
}

interface ReporterProxyResponse {
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

interface ReporterProxyError {
  message: string;
  status?: number;
}

interface ReporterProxyInvokeResult {
  data: ReporterProxyResponse | null;
  error: ReporterProxyError | null;
}

interface ReporterProxySupabaseClient {
  functions: {
    invoke: (functionName: string, options: { body: ReporterProxyRequestBody }) => Promise<ReporterProxyInvokeResult>;
  };
}

export type ReporterProxyInvoke = (
  functionName: "grok-commentary",
  options: { body: ReporterProxyRequestBody },
) => Promise<ReporterProxyInvokeResult>;

export class GrokApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GrokApiError";
    this.status = status;
  }
}

export function createGrokProxyInvoke(client: ReporterProxySupabaseClient | null): ReporterProxyInvoke {
  if (!client) {
    throw new GrokApiError(
      "Supabase is not configured; Grok calls must go through the grok-commentary Edge Function.",
    );
  }

  return ((functionName, options) =>
    client.functions.invoke(functionName, options)) as ReporterProxyInvoke;
}

function getDefaultInvoke(): ReporterProxyInvoke {
  return createGrokProxyInvoke(supabase);
}

export async function callGrokChatCompletion({
  model,
  messages,
  intensity,
  purpose,
  temperature = 0.2,
  maxTokens = 260,
  responseFormat,
  gameId,
  mode,
  invokeImpl,
}: GrokChatCompletionRequest): Promise<GrokChatCompletionResult> {
  const invoke = invokeImpl ?? getDefaultInvoke();
  const body: ReporterProxyRequestBody = {
    model,
    messages,
    intensity,
    purpose,
    temperature,
    maxTokens,
    responseFormat,
    gameId,
    mode,
  };
  const { data, error } = await invoke("grok-commentary", { body });

  if (error) {
    throw new GrokApiError(`Grok Edge Function failed: ${error.message}`, error.status);
  }

  if (!data?.text) {
    throw new GrokApiError("Grok Edge Function response did not include summary text.");
  }

  return {
    text: data.text,
    inputTokens: data.inputTokens ?? 0,
    outputTokens: data.outputTokens ?? 0,
    raw: data,
  };
}
