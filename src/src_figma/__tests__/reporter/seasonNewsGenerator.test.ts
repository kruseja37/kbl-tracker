import { beforeEach, describe, expect, test, vi } from "vitest";

import type { BeatReporter, SeasonEmissionConfig } from "../../../types/reporter";
import { callClaudeMessages } from "../../app/engines/reporter/claudeClient";
import {
  generateSeasonNewsTake,
  shouldEmitSeasonNews,
  type SeasonNewsEvent,
} from "../../app/engines/reporter/seasonNewsGenerator";

vi.mock("../../app/engines/reporter/claudeClient", () => ({
  callClaudeMessages: vi.fn(),
}));

const reporter: BeatReporter = {
  id: "reporter-1",
  teamId: "team-1",
  name: "Mina Pressbox",
  personality: "ANALYTICAL",
  voiceStyle: "THE_PROFESSOR",
  eraFlavor: "MODERN_LOCAL",
  avatarEra: "headset",
  avatarColors: {
    primary: "#112233",
    secondary: "#445566",
  },
  currentMood: "BALANCED",
  moodMomentum: 0,
  createdAt: 1,
  updatedAt: 1,
  changed_at: 1,
};

const defaultConfig: SeasonEmissionConfig = {
  id: "default",
  marqueeOnly: true,
  perEventRate: {},
  raceTopN: 3,
  simWritable: true,
  lastModified: 0,
};

const event: SeasonNewsEvent = {
  franchiseId: "franchise-1",
  seasonId: "season-1",
  seasonNumber: 1,
  eventType: "MILESTONE",
  subjectIds: ["player-1"],
  facts: {
    playerName: "Harry Backman",
    milestone: "50th career home run",
  },
  dramaticWeight: 0.82,
};

describe("seasonNewsGenerator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("shouldEmitSeasonNews applies the marquee-only default and per-event overrides", () => {
    expect(shouldEmitSeasonNews("MILESTONE", defaultConfig)).toBe(false);
    expect(
      shouldEmitSeasonNews("MILESTONE", {
        ...defaultConfig,
        perEventRate: { MILESTONE: 1 },
      }),
    ).toBe(true);
    expect(
      shouldEmitSeasonNews("MILESTONE", {
        ...defaultConfig,
        marqueeOnly: false,
      }),
    ).toBe(true);
    expect(
      shouldEmitSeasonNews("MILESTONE", {
        ...defaultConfig,
        marqueeOnly: false,
        perEventRate: { MILESTONE: 0 },
      }),
    ).toBe(false);
  });

  test("generateSeasonNewsTake returns null without calling transport when the gate rejects", async () => {
    await expect(
      generateSeasonNewsTake(event, reporter, defaultConfig),
    ).resolves.toBeNull();

    expect(callClaudeMessages).not.toHaveBeenCalled();
  });

  test("generateSeasonNewsTake emits a SeasonNewsItem from mocked Claude JSON", async () => {
    vi.spyOn(Date, "now").mockReturnValue(99_000);
    vi.mocked(callClaudeMessages).mockResolvedValue({
      text: JSON.stringify({
        headline: "Backman Reaches Fifty",
        body: "Harry Backman gave the season a clean milestone marker.",
      }),
      inputTokens: 100,
      outputTokens: 40,
      raw: {},
    });

    const result = await generateSeasonNewsTake(event, reporter, {
      ...defaultConfig,
      perEventRate: { MILESTONE: 1 },
    });

    expect(result).toEqual(
      expect.objectContaining({
        franchiseId: event.franchiseId,
        seasonId: event.seasonId,
        seasonNumber: event.seasonNumber,
        eventType: event.eventType,
        subjectIds: event.subjectIds,
        facts: event.facts,
        headline: "Backman Reaches Fifty",
        body: "Harry Backman gave the season a clean milestone marker.",
        reporterId: reporter.id,
        dramaticWeight: event.dramaticWeight,
        createdAt: 99_000,
        changed_at: 99_000,
      }),
    );
    expect(result?.id).toContain("season-news:franchise-1:season-1:MILESTONE:99000:");
    expect(callClaudeMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "storyline_refinement",
        mode: "franchise",
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining("The deterministic Phase-2 matrix is the math"),
          }),
          expect.objectContaining({
            content: expect.stringContaining("50th career home run"),
          }),
        ]),
      }),
    );
  });

  test("generateSeasonNewsTake returns null when the Claude transport is unavailable", async () => {
    vi.mocked(callClaudeMessages).mockRejectedValue(
      new Error("Supabase is not configured"),
    );

    await expect(
      generateSeasonNewsTake(event, reporter, {
        ...defaultConfig,
        perEventRate: { MILESTONE: 1 },
      }),
    ).resolves.toBeNull();
  });
});
