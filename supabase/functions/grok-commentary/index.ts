import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyJwt } from "../_shared/auth.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { enforceIntensityCaps } from "../_shared/intensity.ts";
import { resolveAllowedModel } from "../_shared/models.ts";
import {
  LlmProxyHttpError,
  parseLlmProxyRequest,
  type LlmProxyResponse,
} from "../_shared/types.ts";

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
    const model = resolveAllowedModel("grok", body.model);
    const { maxOutputTokens } = enforceIntensityCaps({
      intensity: body.intensity,
      messages: body.messages,
      requestedMaxTokens: body.maxTokens,
    });
    const apiKey = Deno.env.get("GROK_API_KEY");

    if (!apiKey) {
      throw new LlmProxyHttpError(500, "missing_grok_api_key", "GROK_API_KEY is not configured.");
    }

    const upstream = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        temperature: body.temperature ?? 0.2,
        max_tokens: maxOutputTokens,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      throw new LlmProxyHttpError(
        upstream.status,
        "grok_upstream_error",
        detail || `Grok upstream failed with HTTP ${upstream.status}.`,
      );
    }

    const payload = (await upstream.json()) as GrokChatCompletionResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new LlmProxyHttpError(502, "empty_grok_response", "Grok response did not include text.");
    }

    const response: LlmProxyResponse = {
      text,
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
      model,
    };

    return jsonResponse(response);
  } catch (error) {
    return errorResponse(error);
  }
});
