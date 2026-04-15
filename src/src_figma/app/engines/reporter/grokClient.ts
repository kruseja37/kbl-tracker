export const GROK_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";

export interface GrokChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokChatCompletionRequest {
  apiKey: string;
  model: string;
  messages: GrokChatMessage[];
  temperature?: number;
  maxTokens?: number;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

export interface GrokChatCompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
}

interface GrokChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class GrokApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GrokApiError";
    this.status = status;
  }
}

export async function callGrokChatCompletion({
  apiKey,
  model,
  messages,
  temperature = 0.2,
  maxTokens = 260,
  endpoint = GROK_CHAT_COMPLETIONS_URL,
  fetchImpl = fetch,
}: GrokChatCompletionRequest): Promise<GrokChatCompletionResult> {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body ? ` ${body}` : "";
    throw new GrokApiError(`Grok chat completion failed with HTTP ${response.status}.${detail}`, response.status);
  }

  const payload = (await response.json()) as GrokChatCompletionResponse;
  const text = payload.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new GrokApiError("Grok chat completion response did not include summary text.");
  }

  return {
    text,
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
    raw: payload,
  };
}
