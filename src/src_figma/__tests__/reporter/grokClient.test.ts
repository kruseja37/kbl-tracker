import { describe, expect, test, vi } from "vitest";

import {
  callGrokChatCompletion,
  createGrokProxyInvoke,
  GrokApiError,
  type ReporterProxyInvoke,
} from "../../app/engines/reporter/grokClient";

describe("grokClient edge proxy", () => {
  test("invokes the grok-commentary edge function with model, messages, intensity, and purpose", async () => {
    const invokeImpl = vi.fn(async () => ({
      data: {
        text: "A tidy edge-routed summary.",
        inputTokens: 12,
        outputTokens: 7,
        model: "grok-4",
      },
      error: null,
    })) satisfies ReporterProxyInvoke;

    await expect(
      callGrokChatCompletion({
        model: "grok-4",
        messages: [{ role: "user", content: "Summarize this." }],
        intensity: "medium",
        purpose: "legacy_summary",
        gameId: "game-1",
        mode: "exhibition",
        invokeImpl,
      }),
    ).resolves.toMatchObject({
      text: "A tidy edge-routed summary.",
      inputTokens: 12,
      outputTokens: 7,
    });

    expect(invokeImpl).toHaveBeenCalledWith("grok-commentary", {
      body: {
        model: "grok-4",
        messages: [{ role: "user", content: "Summarize this." }],
        intensity: "medium",
        purpose: "legacy_summary",
        temperature: 0.2,
        maxTokens: 260,
        gameId: "game-1",
        mode: "exhibition",
      },
    });
  });

  test("does not hit the provider endpoint directly", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const invokeImpl = vi.fn(async () => ({
      data: {
        text: "Edge only.",
        inputTokens: 1,
        outputTokens: 1,
        model: "grok-4",
      },
      error: null,
    })) satisfies ReporterProxyInvoke;

    await callGrokChatCompletion({
      model: "grok-4",
      messages: [{ role: "user", content: "No direct provider call." }],
      intensity: "low",
      purpose: "commentary",
      invokeImpl,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test("throws a clear error when Supabase client is null", () => {
    expect(() => createGrokProxyInvoke(null)).toThrow(
      expect.objectContaining({
      name: "GrokApiError",
      message: expect.stringContaining("Supabase is not configured"),
      } satisfies Partial<GrokApiError>),
    );
  });

  test("surfaces edge function errors", async () => {
    const invokeImpl = vi.fn(async () => ({
      data: null,
      error: {
        message: "token cap exceeded",
        status: 413,
      },
    })) satisfies ReporterProxyInvoke;

    await expect(
      callGrokChatCompletion({
        model: "grok-4",
        messages: [{ role: "user", content: "Too long." }],
        intensity: "low",
        purpose: "commentary",
        invokeImpl,
      }),
    ).rejects.toMatchObject({
      name: "GrokApiError",
      status: 413,
    } satisfies Partial<GrokApiError>);
  });
});
