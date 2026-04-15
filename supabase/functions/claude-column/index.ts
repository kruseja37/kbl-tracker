import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyJwt } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { enforceIntensityCaps } from "../_shared/intensity.ts";
import { resolveAllowedModel } from "../_shared/models.ts";
import {
  LlmProxyHttpError,
  parseLlmProxyRequest,
  type LlmProxyMessage,
  type LlmProxyResponse,
} from "../_shared/types.ts";

interface ClaudeMessagesResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function errorResponse(error: unknown): Response {
  if (error instanceof LlmProxyHttpError) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
  }

  return jsonResponse(
    {
      error: {
        code: "internal_error",
        message: error instanceof Error ? error.message : "Unexpected edge function error.",
      },
    },
    500,
  );
}

function toClaudePayloadMessages(messages: LlmProxyMessage[]): {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n") || undefined;
  const claudeMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  if (claudeMessages.length === 0) {
    throw new LlmProxyHttpError(400, "invalid_claude_messages", "Claude requests require a user or assistant message.");
  }

  return {
    system,
    messages: claudeMessages,
  };
}

serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return optionsResponse();
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: { code: "method_not_allowed", message: "Use POST." } }, 405);
  }

  try {
    await verifyJwt(request);

    const body = parseLlmProxyRequest(await request.json());
    const model = resolveAllowedModel("anthropic", body.model);
    const { maxOutputTokens } = enforceIntensityCaps({
      intensity: body.intensity,
      messages: body.messages,
      requestedMaxTokens: body.maxTokens,
    });
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      throw new LlmProxyHttpError(500, "missing_anthropic_api_key", "ANTHROPIC_API_KEY is not configured.");
    }

    const claudePayload = toClaudePayloadMessages(body.messages);
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        temperature: body.temperature ?? 0.2,
        system: claudePayload.system,
        messages: claudePayload.messages,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      throw new LlmProxyHttpError(
        upstream.status,
        "anthropic_upstream_error",
        detail || `Anthropic upstream failed with HTTP ${upstream.status}.`,
      );
    }

    const payload = (await upstream.json()) as ClaudeMessagesResponse;
    const text = payload.content
      ?.filter((content) => content.type === "text" && content.text)
      .map((content) => content.text)
      .join("")
      .trim();

    if (!text) {
      throw new LlmProxyHttpError(502, "empty_anthropic_response", "Claude response did not include text.");
    }

    const response: LlmProxyResponse = {
      text,
      inputTokens: payload.usage?.input_tokens ?? 0,
      outputTokens: payload.usage?.output_tokens ?? 0,
      model,
    };

    return jsonResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
});
