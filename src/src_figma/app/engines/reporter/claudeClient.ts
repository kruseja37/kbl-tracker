import { supabase } from "../../../../supabase";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import type { CompetitionType } from "../../../../utils/gameStorage";
import type { LlmUsagePurpose } from "./usageLogger";
import type { GrokChatMessage } from "./grokClient";

export interface ClaudeMessagesRequest {
  model: string;
  messages: GrokChatMessage[];
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
  temperature?: number;
  maxTokens?: number;
  gameId?: string;
  mode?: CompetitionType;
  invokeImpl?: ClaudeProxyInvoke;
}

export interface ClaudeMessagesResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
}

interface ClaudeProxyRequestBody {
  model: string;
  messages: GrokChatMessage[];
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
  temperature?: number;
  maxTokens?: number;
  gameId?: string;
  mode?: CompetitionType;
}

interface ClaudeProxyResponse {
  text?: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

interface ClaudeProxyError {
  message: string;
  status?: number;
}

interface ClaudeProxyInvokeResult {
  data: ClaudeProxyResponse | null;
  error: ClaudeProxyError | null;
}

interface ClaudeProxySupabaseClient {
  functions: {
    invoke: (functionName: string, options: { body: ClaudeProxyRequestBody }) => Promise<ClaudeProxyInvokeResult>;
  };
}

export type ClaudeProxyInvoke = (
  functionName: "claude-column",
  options: { body: ClaudeProxyRequestBody },
) => Promise<ClaudeProxyInvokeResult>;

export class ClaudeApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ClaudeApiError";
    this.status = status;
  }
}

export function createClaudeProxyInvoke(client: ClaudeProxySupabaseClient | null): ClaudeProxyInvoke {
  if (!client) {
    throw new ClaudeApiError(
      "Supabase is not configured; Claude calls must go through the claude-column Edge Function.",
    );
  }

  return ((functionName, options) =>
    client.functions.invoke(functionName, options)) as ClaudeProxyInvoke;
}

function getDefaultInvoke(): ClaudeProxyInvoke {
  return createClaudeProxyInvoke(supabase);
}

export async function callClaudeMessages({
  model,
  messages,
  intensity,
  purpose,
  temperature = 0.2,
  maxTokens = 700,
  gameId,
  mode,
  invokeImpl,
}: ClaudeMessagesRequest): Promise<ClaudeMessagesResult> {
  const invoke = invokeImpl ?? getDefaultInvoke();
  const body: ClaudeProxyRequestBody = {
    model,
    messages,
    intensity,
    purpose,
    temperature,
    maxTokens,
    gameId,
    mode,
  };
  const { data, error } = await invoke("claude-column", { body });

  if (error) {
    throw new ClaudeApiError(`Claude Edge Function failed: ${error.message}`, error.status);
  }

  if (!data?.text) {
    throw new ClaudeApiError("Claude Edge Function response did not include text.");
  }

  return {
    text: data.text,
    inputTokens: data.inputTokens ?? 0,
    outputTokens: data.outputTokens ?? 0,
    raw: data,
  };
}
