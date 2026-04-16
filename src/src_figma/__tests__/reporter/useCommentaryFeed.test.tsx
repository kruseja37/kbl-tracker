import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { BeatReporter, CommentaryFeedEntryRecord } from "../../../types/reporter";
import type { AtBatEvent } from "../../../utils/eventLog";
import CommentaryFeed from "../../app/components/CommentaryFeed";
import { useCommentaryFeed } from "../../app/hooks/useCommentaryFeed";
import type {
  BetweenInningSummaryResult,
  CommentaryEngine,
  CommentaryEngineConfig,
  CommentaryResult,
} from "../../app/engines/reporter/commentaryEngine";
import type {
  LiveReporterContextSeed,
  ReporterContext,
} from "../../app/engines/reporter/reporterContext";

function createReporter(): BeatReporter {
  return {
    id: "reporter-1",
    teamId: "team-home",
    leagueId: "league-1",
    name: "Dutch Calloway",
    personality: "DRAMATIC",
    voiceStyle: "THE_HOLY_COW",
    eraFlavor: "CLASSIC_TV",
    avatarEra: "headset",
    avatarColors: {
      primary: "#114488",
      secondary: "#f0d060",
    },
    currentMood: "DRAMATIC",
    moodMomentum: 3,
    createdAt: 1,
    updatedAt: 1,
    changed_at: 1,
  };
}

function createReporterContext(
  overrides: Partial<ReporterContext["gameState"]> = {},
): ReporterContext {
  return {
    batter: {
      id: "batter-1",
      name: "Ivy Sparks",
      nicknames: [],
      effectiveFame: 4,
      teamId: "team-away",
    },
    pitcher: {
      id: "pitcher-1",
      name: "Noelle Vale",
      nicknames: [],
      effectiveFame: 5,
      teamId: "team-home",
    },
    battingTeam: {
      id: "team-away",
      name: "Freebooters",
      baselineBackstory: "Fast and loud.",
    },
    pitchingTeam: {
      id: "team-home",
      name: "Blowfish",
      baselineBackstory: "Patient and sturdy.",
    },
    batterLegacySummary: "",
    pitcherLegacySummary: "",
    battingTeamLegacySummary: "",
    pitchingTeamLegacySummary: "",
    batterRecentAlmanac: [],
    pitcherRecentAlmanac: [],
    teamRecentAlmanac: [],
    activeOpposingRelationships: [],
    activeWithinTeamRelationships: [],
    teamRivalryIntensity: 0,
    dramaticWeight: 0.4,
    gameState: {
      gameId: "game-1",
      atBatId: "game-1_1",
      inning: 1,
      halfInning: "TOP",
      outs: 0,
      bases: { first: null, second: null, third: null },
      awayScore: 0,
      homeScore: 0,
      battingTeamId: "team-away",
      pitchingTeamId: "team-home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
      leagueId: "league-1",
      ...overrides,
    },
  };
}

function createLiveSeed(
  overrides: Partial<LiveReporterContextSeed> = {},
): LiveReporterContextSeed {
  return {
    gameId: "game-1",
    atBatId: "game-1_1",
    inning: 1,
    halfInning: "TOP",
    outs: 0,
    bases: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    battingTeamId: "team-away",
    battingTeamName: "Freebooters",
    pitchingTeamId: "team-home",
    pitchingTeamName: "Blowfish",
    batterId: "batter-1",
    batterName: "Ivy Sparks",
    pitcherId: "pitcher-1",
    pitcherName: "Noelle Vale",
    competitionType: "exhibition",
    leagueId: "league-1",
    ...overrides,
  };
}

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "game-1_1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1000,
    batterId: "batter-1",
    batterName: "Ivy Sparks",
    batterTeamId: "team-away",
    pitcherId: "pitcher-1",
    pitcherName: "Noelle Vale",
    pitcherTeamId: "team-home",
    result: "HR",
    rbiCount: 1,
    runsScored: 1,
    inning: 1,
    halfInning: "TOP",
    outs: 0,
    runners: {
      first: null,
      second: null,
      third: null,
    },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: {
      first: null,
      second: null,
      third: null,
    },
    awayScoreAfter: 1,
    homeScoreAfter: 0,
    leverageIndex: 1.8,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.62,
    wpa: 0.12,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    competitionType: "exhibition",
    leagueId: "league-1",
    ...overrides,
  } as AtBatEvent;
}

function createEngine(overrides: {
  preambleResult?: CommentaryResult;
  commentaryResult?: CommentaryResult;
  betweenInningSummaryResult?: BetweenInningSummaryResult;
  preambleError?: Error;
  commentaryError?: Error;
  betweenInningSummaryError?: Error;
  narrativeSoFar?: string;
} = {}) {
  const generatePreamble = vi.fn(async () => {
    if (overrides.preambleError) {
      throw overrides.preambleError;
    }

    return (
      overrides.preambleResult ?? {
        text: "Good evening everybody, this is Dutch Calloway at The Tank.",
        skipped: false,
        inputTokens: 10,
        outputTokens: 10,
      }
    );
  });
  const generateCommentary = vi.fn(async () => {
    if (overrides.commentaryError) {
      throw overrides.commentaryError;
    }

    return (
      overrides.commentaryResult ?? {
        text: "Sparks launched one into the night.",
        skipped: false,
        inputTokens: 10,
        outputTokens: 10,
      }
    );
  });
  const generateBetweenInningSummary = vi.fn(async () => {
    if (overrides.betweenInningSummaryError) {
      throw overrides.betweenInningSummaryError;
    }

    return (
      overrides.betweenInningSummaryResult ?? {
        popupText: "Freebooters stranded two.",
        updatedNarrativeSoFar:
          "Through the top of the fourth, the Blowfish still cling to their one-run margin.",
        skipped: false,
        inputTokens: 12,
        outputTokens: 14,
      }
    );
  });
  const getNarrativeSoFar = vi.fn(() => overrides.narrativeSoFar ?? "");
  const engine: CommentaryEngine = {
    generatePreamble,
    generateCommentary,
    generateBetweenInningSummary,
    getNarrativeSoFar,
    resetNarrative: vi.fn(),
  };

  return {
    engine,
    generatePreamble,
    generateCommentary,
    generateBetweenInningSummary,
    getNarrativeSoFar,
  };
}

function renderCommentaryFeedHook(options: {
  gameId?: string;
  intensity?: "low" | "medium" | "high";
  reporter?: BeatReporter | null;
  buildReporterContext?: (gameId: string, atBatId: string) => Promise<ReporterContext>;
  buildLiveReporterContext?: (seed: LiveReporterContextSeed) => Promise<ReporterContext>;
  isWithinDailyCallLimit?: (now?: number) => Promise<boolean>;
  createEngine?: (config: CommentaryEngineConfig) => CommentaryEngine;
  scoreNotability?: typeof import("../../../engines/notabilityScorer").scoreNotability;
  persistCommentaryFeedEntry?: (record: CommentaryFeedEntryRecord) => Promise<void>;
  listCommentaryFeedEntriesForGame?: (gameId: string) => Promise<CommentaryFeedEntryRecord[]>;
}) {
  const persistCommentaryFeedEntryImpl =
    options.persistCommentaryFeedEntry ?? (async () => undefined);
  const listCommentaryFeedEntriesForGameImpl =
    options.listCommentaryFeedEntriesForGame ?? (async () => []);

  return renderHook(
    ({ gameId }) =>
      useCommentaryFeed({
        gameId,
        homeTeamId: "team-home",
        leagueId: "league-1",
        getLivePreambleSeed: () =>
          createLiveSeed({
            gameId,
            atBatId: `${gameId}_1`,
          }),
        dependencies: {
          getIntensity: async () => options.intensity ?? "medium",
          getReporterForTeam: async () =>
            options.reporter === undefined ? createReporter() : options.reporter,
          buildReporterContext:
            options.buildReporterContext ??
            (async (targetGameId, atBatId) =>
              createReporterContext({
                gameId: targetGameId,
                atBatId,
              })),
          buildLiveReporterContext:
            options.buildLiveReporterContext ??
            (async (seed) =>
              createReporterContext({
                gameId: seed.gameId,
                atBatId: seed.atBatId,
                inning: seed.inning,
                halfInning: seed.halfInning,
                outs: seed.outs,
                awayScore: seed.awayScore,
                homeScore: seed.homeScore,
                battingTeamId: seed.battingTeamId,
                pitchingTeamId: seed.pitchingTeamId,
                batterId: seed.batterId,
                pitcherId: seed.pitcherId,
                competitionType: seed.competitionType,
                leagueId: seed.leagueId,
              })),
          isWithinDailyCallLimit:
            options.isWithinDailyCallLimit ?? (async () => true),
          now: () => 2000,
          createEngine: options.createEngine,
          scoreNotability: options.scoreNotability,
          persistCommentaryFeedEntry: persistCommentaryFeedEntryImpl,
          listCommentaryFeedEntriesForGame: listCommentaryFeedEntriesForGameImpl,
        },
      }),
    {
      initialProps: {
        gameId: options.gameId ?? "game-1",
      },
    },
  );
}

describe("useCommentaryFeed", () => {
  test("preamble fires once and prepends a PRE entry", async () => {
    const { engine, generatePreamble } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });
    expect(result.current.commentaryEntries[0]).toMatchObject({
      halfInningLabel: "PRE",
      timestamp: 0,
    });
    expect(generatePreamble).toHaveBeenCalledTimes(1);
  });

  test("persistCommentaryFeedEntry called after preamble lands", async () => {
    const { engine } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistCommentaryFeedEntry: persistSpy,
      listCommentaryFeedEntriesForGame: async () => [],
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
    });

    await waitFor(() => {
      expect(persistSpy).toHaveBeenCalledTimes(1);
    });
    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "commentary-pre-game-1",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Good evening everybody, this is Dutch Calloway at The Tank.",
        halfInningLabel: "PRE",
        timestamp: 0,
        createdAt: 2000,
        changed_at: 2000,
      }),
    );
  });

  test("preamble re-fire is blocked by preambleFiredForGameId", async () => {
    const { engine, generatePreamble } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
      await result.current.firePreamble("game-1", "game-1_1");
    });

    expect(generatePreamble).toHaveBeenCalledTimes(1);
    expect(result.current.commentaryEntries).toHaveLength(1);
  });

  test("play commentary with shouldComment=true appends an entry", async () => {
    const { engine, generateCommentary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await act(async () => {
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });
    expect(result.current.commentaryEntries[0]).toMatchObject({
      id: "commentary-game-1_1",
      halfInningLabel: "T1",
      reporterId: "reporter-1",
    });
    expect(generateCommentary).toHaveBeenCalledTimes(1);
  });

  test("persistCommentaryFeedEntry called after play commentary lands", async () => {
    const { engine } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistCommentaryFeedEntry: persistSpy,
      listCommentaryFeedEntriesForGame: async () => [],
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await act(async () => {
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
    });

    await waitFor(() => {
      expect(persistSpy).toHaveBeenCalledTimes(1);
    });
    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "commentary-game-1_1",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Sparks launched one into the night.",
        halfInningLabel: "T1",
        timestamp: 2000,
        createdAt: 2000,
        changed_at: 2000,
      }),
    );
  });

  test("calling firePlayCommentary twice for the same gameId and atBatId only hits the engine once", async () => {
    const { engine, generateCommentary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await act(async () => {
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
    });

    expect(generateCommentary).toHaveBeenCalledTimes(1);
    expect(result.current.commentaryEntries).toHaveLength(1);
  });

  test("a persisted play entry seeds the processed set so the same atBatId is a no-op on mount", async () => {
    const { engine, generateCommentary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      listCommentaryFeedEntriesForGame: async () => [
        {
          id: "commentary-abc",
          gameId: "game-1",
          leagueId: "league-1",
          reporterId: "reporter-1",
          commentaryText: "Already covered this swing.",
          halfInningLabel: "T1",
          timestamp: 1000,
          createdAt: 1000,
          changed_at: 1000,
        },
      ],
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });

    await act(async () => {
      await result.current.firePlayCommentary(
        "game-1",
        "abc",
        createAtBatEvent({
          eventId: "abc",
          gameId: "game-1",
        }),
      );
    });

    expect(generateCommentary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toHaveLength(1);
  });

  test("resetForNewGame clears processed play ids so the same atBatId string can fire in a new game", async () => {
    const { engine, generateCommentary } = createEngine();
    const hook = renderCommentaryFeedHook({
      createEngine: () => engine,
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await act(async () => {
      await hook.result.current.firePlayCommentary(
        "game-1",
        "shared-at-bat",
        createAtBatEvent({
          eventId: "shared-at-bat",
          gameId: "game-1",
        }),
      );
    });

    hook.rerender({ gameId: "game-2" });

    await act(async () => {
      await hook.result.current.firePlayCommentary(
        "game-2",
        "shared-at-bat",
        createAtBatEvent({
          eventId: "shared-at-bat",
          gameId: "game-2",
        }),
      );
    });

    expect(generateCommentary).toHaveBeenCalledTimes(2);
  });

  test("same-game rerender with a new hydration dependency does not wipe processed plays", async () => {
    const { engine, generateCommentary } = createEngine();
    const firstListImpl = vi.fn(async () => []);
    const secondListImpl = vi.fn(async () => []);

    const hook = renderHook(
      ({ listImpl }) =>
        useCommentaryFeed({
          gameId: "game-1",
          homeTeamId: "team-home",
          leagueId: "league-1",
          getLivePreambleSeed: () =>
            createLiveSeed({
              gameId: "game-1",
              atBatId: "game-1_1",
            }),
          dependencies: {
            getIntensity: async () => "medium",
            getReporterForTeam: async () => createReporter(),
            buildReporterContext: async (targetGameId, atBatId) =>
              createReporterContext({
                gameId: targetGameId,
                atBatId,
              }),
            buildLiveReporterContext: async (seed) =>
              createReporterContext({
                gameId: seed.gameId,
                atBatId: seed.atBatId,
              }),
            isWithinDailyCallLimit: async () => true,
            now: () => 2000,
            createEngine: () => engine,
            scoreNotability: () => ({
              score: 0.4,
              shouldComment: true,
              reason: "HIGH_WPA",
            }),
            persistCommentaryFeedEntry: async () => undefined,
            listCommentaryFeedEntriesForGame: listImpl,
          },
        }),
      {
        initialProps: {
          listImpl: firstListImpl,
        },
      },
    );

    await waitFor(() => {
      expect(firstListImpl).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await hook.result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
    });

    expect(generateCommentary).toHaveBeenCalledTimes(1);

    hook.rerender({ listImpl: secondListImpl });

    expect(secondListImpl).not.toHaveBeenCalled();

    await act(async () => {
      await hook.result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
    });

    expect(generateCommentary).toHaveBeenCalledTimes(1);
  });

  test("play commentary with shouldComment=false does not append an entry", async () => {
    const { engine, generateCommentary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      scoreNotability: () => ({
        score: 0.01,
        shouldComment: false,
        reason: "LOW_WPA",
      }),
    });

    await act(async () => {
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent({ result: "GO", wpa: 0.01 }),
      );
    });

    expect(result.current.commentaryEntries).toHaveLength(0);
    expect(generateCommentary).not.toHaveBeenCalled();
  });

  test("intensity low disables everything", async () => {
    const invokeImpl = vi.fn();
    const { result } = renderCommentaryFeedHook({
      intensity: "low",
      createEngine: () => {
        const commentaryEngine = new (class implements CommentaryEngine {
          async generatePreamble() {
            await invokeImpl();
            return { text: "nope", skipped: false, inputTokens: 0, outputTokens: 0 };
          }
          async generateCommentary() {
            await invokeImpl();
            return { text: "nope", skipped: false, inputTokens: 0, outputTokens: 0 };
          }
          async generateBetweenInningSummary() {
            await invokeImpl();
            return {
              popupText: "nope",
              updatedNarrativeSoFar: "",
              skipped: false,
              inputTokens: 0,
              outputTokens: 0,
            };
          }
          getNarrativeSoFar() {
            return "";
          }
          resetNarrative() {}
        })();
        return commentaryEngine;
      },
    });

    await waitFor(() => {
      expect(result.current.disabled).toBe(true);
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "TOP" },
        [],
      );
    });

    expect(invokeImpl).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toHaveLength(0);
  });

  test("missing reporter disables everything", async () => {
    const { result } = renderCommentaryFeedHook({
      reporter: null,
    });

    await waitFor(() => {
      expect(result.current.disabled).toBe(true);
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
      await result.current.firePlayCommentary(
        "game-1",
        "game-1_1",
        createAtBatEvent(),
      );
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "TOP" },
        [],
      );
    });

    expect(result.current.commentaryEntries).toHaveLength(0);
  });

  test("errors from the engine do not throw", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { engine } = createEngine({
      commentaryError: new Error("boom"),
    });
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      scoreNotability: () => ({
        score: 0.4,
        shouldComment: true,
        reason: "HIGH_WPA",
      }),
    });

    await expect(
      act(async () => {
        await result.current.firePlayCommentary(
          "game-1",
          "game-1_1",
          createAtBatEvent(),
        );
      }),
    ).resolves.toBeUndefined();

    expect(result.current.commentaryEntries).toHaveLength(0);
  });

  test("on mount with existing records, commentaryEntries seeds from IDB", async () => {
    const persistedRecords: CommentaryFeedEntryRecord[] = [
      {
        id: "commentary-pre-game-1",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Pregame throat-clearing.",
        halfInningLabel: "PRE",
        timestamp: 0,
        createdAt: 1000,
        changed_at: 1000,
      },
      {
        id: "commentary-game-1_2",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "A ringing double wakes up the crowd.",
        halfInningLabel: "B2",
        timestamp: 3000,
        createdAt: 3000,
        changed_at: 3000,
      },
    ];

    const { result } = renderCommentaryFeedHook({
      listCommentaryFeedEntriesForGame: async () => persistedRecords,
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toEqual([
        {
          id: "commentary-pre-game-1",
          commentaryText: "Pregame throat-clearing.",
          halfInningLabel: "PRE",
          timestamp: 0,
          reporterId: "reporter-1",
        },
        {
          id: "commentary-game-1_2",
          commentaryText: "A ringing double wakes up the crowd.",
          halfInningLabel: "B2",
          timestamp: 3000,
          reporterId: "reporter-1",
        },
      ]);
    });
  });

  test("on mount when a PRE record already exists, preambleFiredForGameIdRef prevents re-fire", async () => {
    const { engine, generatePreamble } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      listCommentaryFeedEntriesForGame: async () => [
        {
          id: "commentary-pre-game-1",
          gameId: "game-1",
          leagueId: "league-1",
          reporterId: "reporter-1",
          commentaryText: "Already had a preamble.",
          halfInningLabel: "PRE",
          timestamp: 0,
          createdAt: 1000,
          changed_at: 1000,
        },
      ],
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });

    await act(async () => {
      await result.current.firePreamble("game-1", "game-1_1");
    });

    expect(generatePreamble).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toEqual([
      {
        id: "commentary-pre-game-1",
        commentaryText: "Already had a preamble.",
        halfInningLabel: "PRE",
        timestamp: 0,
        reporterId: "reporter-1",
      },
    ]);
  });

  test("fireBetweenInningSummary success path sets pendingPopup and keeps feed unchanged until dismiss", async () => {
    const { engine, generateBetweenInningSummary, getNarrativeSoFar } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "TOP" },
        [
          {
            batterName: "Ivy Sparks",
            pitcherName: "Noelle Vale",
            result: "1B",
            runsScored: 0,
          },
        ],
      );
    });

    expect(generateBetweenInningSummary).toHaveBeenCalledTimes(1);
    expect(getNarrativeSoFar).toHaveBeenCalledTimes(1);
    expect(result.current.pendingPopup).toEqual({
      text: "Freebooters stranded two.",
      halfInningLabel: "T4",
    });
    expect(result.current.commentaryEntries).toEqual([]);
  });

  test("dismissBetweenInningPopup appends entry with kind between-inning and clears pendingPopup", async () => {
    const { engine } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistCommentaryFeedEntry: persistSpy,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "TOP" },
        [
          {
            batterName: "Ivy Sparks",
            pitcherName: "Noelle Vale",
            result: "1B",
            runsScored: 0,
          },
        ],
      );
    });

    await act(async () => {
      result.current.dismissBetweenInningPopup("tap");
    });

    expect(result.current.pendingPopup).toBeNull();
    expect(result.current.commentaryEntries).toEqual([
      {
        id: "commentary-inning-game-1-T4-2000",
        commentaryText: "Freebooters stranded two.",
        halfInningLabel: "T4",
        kind: "between-inning",
        timestamp: 2000,
        reporterId: "reporter-1",
      },
    ]);
    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "commentary-inning-game-1-T4-2000",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Freebooters stranded two.",
        halfInningLabel: "T4",
        kind: "between-inning",
        timestamp: 2000,
        createdAt: 2000,
        changed_at: 2000,
      }),
    );
  });

  test("fireBetweenInningSummary when another popup is pending warns and skips the second call", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { engine, generateBetweenInningSummary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "TOP" },
        [
          {
            batterName: "Ivy Sparks",
            pitcherName: "Noelle Vale",
            result: "1B",
            runsScored: 0,
          },
        ],
      );
      await result.current.fireBetweenInningSummary(
        "game-1",
        { inning: 4, halfInning: "BOTTOM" },
        [
          {
            batterName: "Harry Backman",
            pitcherName: "Noelle Vale",
            result: "BB",
            runsScored: 0,
          },
        ],
      );
    });

    expect(generateBetweenInningSummary).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[reporter:commentary] Between-inning popup already pending; skipping new summary.",
    );
  });

  test("persisted between-inning entries round-trip with kind and render with differentiated feed styling", async () => {
    const persistedRecords: CommentaryFeedEntryRecord[] = [
      {
        id: "commentary-inning-game-1-T4-2000",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Freebooters stranded two.",
        halfInningLabel: "T4",
        kind: "between-inning",
        timestamp: 2000,
        createdAt: 2000,
        changed_at: 2000,
      },
    ];

    const { result } = renderCommentaryFeedHook({
      listCommentaryFeedEntriesForGame: async () => persistedRecords,
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toEqual([
        {
          id: "commentary-inning-game-1-T4-2000",
          commentaryText: "Freebooters stranded two.",
          halfInningLabel: "T4",
          kind: "between-inning",
          timestamp: 2000,
          reporterId: "reporter-1",
        },
      ]);
    });

    const { container } = render(
      <CommentaryFeed entries={result.current.commentaryEntries} soundsOn={false} />,
    );

    expect(screen.getByTestId("commentary-divider-END-T4")).toHaveTextContent(
      "··· END T4 ···",
    );
    const body = container.querySelector(
      '[data-testid="commentary-entry-commentary-inning-game-1-T4-2000"] > div:last-child',
    );
    expect(body).not.toBeNull();
    expect(body).toHaveStyle({
      fontStyle: "italic",
      color: "rgb(196, 217, 196)",
    });
  });
});
