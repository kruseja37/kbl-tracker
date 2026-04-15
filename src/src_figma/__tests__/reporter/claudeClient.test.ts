import { describe, expect, test, vi } from "vitest";

import {
  callClaudeMessages,
  createClaudeProxyInvoke,
  ClaudeApiError,
  type ClaudeProxyInvoke,
} from "../../app/engines/reporter/claudeClient";

describe("claudeClient edge proxy", () => {
  test("invokes the claude-column edge function with model, messages, intensity, and purpose", async () => {
    const invokeImpl = vi.fn(async () => ({
      data: {
        text: "A sharp post-game column.",
        inputTokens: 30,
        outputTokens: 80,
        model: "claude-sonnet-4.6",
      },
      error: null,
    })) satisfies ClaudeProxyInvoke;

    await expect(
      callClaudeMessages({
        model: "claude-sonnet-4.6",
        messages: [{ role: "user", content: "Write the column." }],
        intensity: "high",
        purpose: "post_game_column",
        gameId: "game-2",
        mode: "elimination",
        maxTokens: 900,
        invokeImpl,
      }),
    ).resolves.toMatchObject({
      text: "A sharp post-game column.",
      inputTokens: 30,
      outputTokens: 80,
    });

    expect(invokeImpl).toHaveBeenCalledWith("claude-column", {
      body: {
        model: "claude-sonnet-4.6",
        messages: [{ role: "user", content: "Write the column." }],
        intensity: "high",
        purpose: "post_game_column",
        temperature: 0.2,
        maxTokens: 900,
        gameId: "game-2",
        mode: "elimination",
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
        model: "claude-sonnet-4.6",
      },
      error: null,
    })) satisfies ClaudeProxyInvoke;

    await callClaudeMessages({
      model: "claude-sonnet-4.6",
      messages: [{ role: "user", content: "No direct provider call." }],
      intensity: "low",
      purpose: "post_game_column",
      invokeImpl,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test("throws a clear error when Supabase client is null", () => {
    expect(() => createClaudeProxyInvoke(null)).toThrow(
      expect.objectContaining({
      name: "ClaudeApiError",
      message: expect.stringContaining("Supabase is not configured"),
      } satisfies Partial<ClaudeApiError>),
    );
  });

  test("surfaces edge function errors", async () => {
    const invokeImpl = vi.fn(async () => ({
      data: null,
      error: {
        message: "unauthorized",
        status: 401,
      },
    })) satisfies ClaudeProxyInvoke;

    await expect(
      callClaudeMessages({
        model: "claude-sonnet-4.6",
        messages: [{ role: "user", content: "Column please." }],
        intensity: "medium",
        purpose: "post_game_column",
        invokeImpl,
      }),
    ).rejects.toMatchObject({
      name: "ClaudeApiError",
      status: 401,
    } satisfies Partial<ClaudeApiError>);
  });
});
