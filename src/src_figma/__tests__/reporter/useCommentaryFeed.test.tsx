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

function createAwayReporter(): BeatReporter {
  return {
    ...createReporter(),
    id: "reporter-2",
    teamId: "team-away",
    name: "Ashley Chen",
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
    battingTeamRecentAlmanac: [],
    pitchingTeamRecentAlmanac: [],
    teamRecentAlmanac: [],
    activeOpposingRelationships: [],
    activeWithinTeamRelationships: [],
    teamDnaFacts: [],
    homeTeamRivalries: [],
    awayTeamRivalries: [],
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
  postGameColumnResult?: import("../../app/engines/reporter/commentaryEngine").PostGameColumnResult;
  preambleError?: Error;
  commentaryError?: Error;
  betweenInningSummaryError?: Error;
  postGameColumnError?: Error;
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
        historicalLeadIn: "History says this kind of pressure has company.",
        skipped: false,
        inputTokens: 12,
        outputTokens: 14,
      }
    );
  });
  const generatePostGameColumn = vi.fn(async () => {
    if (overrides.postGameColumnError) {
      throw overrides.postGameColumnError;
    }
    return (
      overrides.postGameColumnResult ?? {
        headline: "BACKMAN'S BLAST",
        body: "Three paragraphs of sparkling prose.",
        skipped: false,
        inputTokens: 40,
        outputTokens: 120,
      }
    );
  });
  const getNarrativeSoFar = vi.fn(() => overrides.narrativeSoFar ?? "");
  const engine: CommentaryEngine = {
    generatePreamble,
    generateCommentary,
    generateBetweenInningSummary,
    generatePostGameColumn,
    getNarrativeSoFar,
    resetNarrative: vi.fn(),
  };

  return {
    engine,
    generatePreamble,
    generateCommentary,
    generateBetweenInningSummary,
    generatePostGameColumn,
    getNarrativeSoFar,
  };
}

function renderCommentaryFeedHook(options: {
  gameId?: string;
  intensity?: "low" | "medium" | "high";
  reporter?: BeatReporter | null;
  awayReporter?: BeatReporter | null;
  getLivePreambleSeed?: (gameId: string) => LiveReporterContextSeed | null;
  buildReporterContext?: (gameId: string, atBatId: string) => Promise<ReporterContext>;
  buildLiveReporterContext?: (seed: LiveReporterContextSeed) => Promise<ReporterContext>;
  isWithinDailyCallLimit?: (now?: number) => Promise<boolean>;
  createEngine?: (config: CommentaryEngineConfig) => CommentaryEngine;
  scoreNotability?: typeof import("../../../engines/notabilityScorer").scoreNotability;
  persistCommentaryFeedEntry?: (record: CommentaryFeedEntryRecord) => Promise<void>;
  listCommentaryFeedEntriesForGame?: (gameId: string) => Promise<CommentaryFeedEntryRecord[]>;
  persistGameStory?: (record: import("../../../types/reporter").GameStory) => Promise<void>;
  listGameStoriesForGame?: (
    gameId: string,
  ) => Promise<import("../../../types/reporter").GameStory[]>;
}) {
  const persistCommentaryFeedEntryImpl =
    options.persistCommentaryFeedEntry ?? (async () => undefined);
  const listCommentaryFeedEntriesForGameImpl =
    options.listCommentaryFeedEntriesForGame ?? (async () => []);
  const persistGameStoryImpl =
    options.persistGameStory ?? (async () => undefined);
  const listGameStoriesForGameImpl =
    options.listGameStoriesForGame ?? (async () => []);
  const resolvedHomeReporter =
    options.reporter === undefined ? createReporter() : options.reporter;
  const resolvedAwayReporter =
    options.awayReporter !== undefined
      ? options.awayReporter
      : options.reporter === undefined
        ? createAwayReporter()
        : options.reporter;

  return renderHook(
    ({ gameId }) =>
      useCommentaryFeed({
        gameId,
        homeTeamId: "team-home",
        awayTeamId: "team-away",
        leagueId: "league-1",
        getLivePreambleSeed: () =>
          options.getLivePreambleSeed?.(gameId) ??
          createLiveSeed({
            gameId,
            atBatId: `${gameId}_1`,
          }),
        dependencies: {
          getIntensity: async () => options.intensity ?? "medium",
          getReporterForTeam: async (teamId) =>
            teamId === "team-away" ? resolvedAwayReporter : resolvedHomeReporter,
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
          persistGameStory: persistGameStoryImpl,
          listGameStoriesForGame: listGameStoriesForGameImpl,
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
          awayTeamId: "team-away",
          leagueId: "league-1",
          getLivePreambleSeed: () =>
            createLiveSeed({
              gameId: "game-1",
              atBatId: "game-1_1",
            }),
          dependencies: {
            getIntensity: async () => "medium",
            getReporterForTeam: async (teamId) =>
              teamId === "team-away" ? createAwayReporter() : createReporter(),
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
        4,
        [],
        "home",
      );
    });

    expect(invokeImpl).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toHaveLength(0);
  });

  test("missing home reporter disables the preamble path while keeping away routing available", async () => {
    const { result } = renderCommentaryFeedHook({
      reporter: null,
      awayReporter: createAwayReporter(),
    });

    await waitFor(() => {
      expect(result.current.homeDisabled).toBe(true);
      expect(result.current.disabled).toBe(false);
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
        4,
        [],
        "home",
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

  test("fireBetweenInningSummary appends a historical tidbit entry directly with no recap text", async () => {
    const { engine, generateBetweenInningSummary, getNarrativeSoFar } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        4,
        [createAtBatEvent({ inning: 4, halfInning: "TOP" })],
        "home",
      );
    });

    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(getNarrativeSoFar).not.toHaveBeenCalled();
    // Live fire path does NOT set pendingPopup — entry goes straight into the feed.
    // The I2 popup overlay is only used by the preview harness.
    expect(result.current.pendingPopup).toBeNull();
    expect(result.current.commentaryEntries).toEqual([
      expect.objectContaining({
        id: "commentary-inning-game-1-home-4-2000",
        commentaryText: "",
        halfInningLabel: "INNING 4",
        kind: "between-inning",
        reporterId: "reporter-1",
        historicalTidbit: expect.objectContaining({
          factId: expect.any(String),
          sourceLabel: expect.any(String),
        }),
      }),
    ]);
  });

  test("fireBetweenInningSummary uses the completed inning event context when no live seed is available", async () => {
    const { engine, generateBetweenInningSummary } = createEngine();
    const buildReporterContext = vi.fn(async (targetGameId: string, atBatId: string) =>
      createReporterContext({
        gameId: targetGameId,
        atBatId,
        inning: 1,
        halfInning: "BOTTOM",
      }),
    );
    const buildLiveReporterContext = vi.fn(async (seed: LiveReporterContextSeed) =>
      createReporterContext({
        gameId: seed.gameId,
        atBatId: seed.atBatId,
      }),
    );
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      getLivePreambleSeed: () => null,
      buildReporterContext,
      buildLiveReporterContext,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        1,
        [
          createAtBatEvent({
            eventId: "game-1_3",
            eventIndex: 3,
            inning: 1,
            halfInning: "BOTTOM",
          }),
        ],
        "home",
      );
    });

    expect(buildReporterContext).toHaveBeenCalledWith("game-1", "game-1_3");
    expect(buildLiveReporterContext).not.toHaveBeenCalled();
    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toHaveLength(1);
  });

  test("dismissBetweenInningPopup clears the popup without duplicating the feed entry", async () => {
    const { engine } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistCommentaryFeedEntry: persistSpy,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        4,
        [createAtBatEvent({ inning: 4, halfInning: "TOP" })],
        "home",
      );
    });

    expect(result.current.commentaryEntries).toHaveLength(1);

    await act(async () => {
      result.current.dismissBetweenInningPopup("tap");
    });

    expect(result.current.pendingPopup).toBeNull();
    expect(result.current.commentaryEntries).toEqual([
      expect.objectContaining({
        id: "commentary-inning-game-1-home-4-2000",
        commentaryText: "",
        halfInningLabel: "INNING 4",
        kind: "between-inning",
        timestamp: 2000,
        reporterId: "reporter-1",
        historicalTidbit: expect.objectContaining({
          factId: expect.any(String),
          sourceLabel: expect.any(String),
        }),
      }),
    ]);
    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "commentary-inning-game-1-home-4-2000",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "",
        halfInningLabel: "INNING 4",
        kind: "between-inning",
        timestamp: 2000,
        createdAt: 2000,
        changed_at: 2000,
        historicalTidbit: expect.objectContaining({
          factId: expect.any(String),
          sourceLabel: expect.any(String),
        }),
      }),
    );
  });

  test("fireBetweenInningSummary routes home innings through the home reporter", async () => {
    const { engine, generateBetweenInningSummary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        1,
        [createAtBatEvent({ inning: 1, halfInning: "TOP" })],
        "home",
      );
    });

    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries[0]).toMatchObject({
      reporterId: "reporter-1",
    });
  });

  test("fireBetweenInningSummary routes away innings through the away reporter", async () => {
    const { engine, generateBetweenInningSummary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      awayReporter: createAwayReporter(),
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        2,
        [createAtBatEvent({ inning: 2, halfInning: "BOTTOM", batterTeamId: "team-home" })],
        "away",
      );
    });

    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries[0]).toMatchObject({
      reporterId: "reporter-2",
    });
  });

  test("fireBetweenInningSummary can fire sequentially for consecutive innings without being blocked by a stale popup guard", async () => {
    // Regression: the prior stacking guard keyed on pendingPopupRef would block
    // inning 2's summary after inning 1 fired because the I2 popup state was
    // pinned forever (the popup is never rendered live, so never dismissed).
    // This test exercises back-to-back fires for different innings and asserts
    // the history-only entries still append for both.
    const { engine, generateBetweenInningSummary } = createEngine();
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        1,
        [createAtBatEvent({ inning: 1, halfInning: "TOP" })],
        "home",
      );
      await result.current.fireBetweenInningSummary(
        "game-1",
        2,
        [createAtBatEvent({ inning: 2, halfInning: "TOP", batterName: "Harry Backman", result: "BB" })],
        "away",
      );
    });

    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries).toHaveLength(2);
  });

  test("hydrates prior historical tidbits and avoids reusing the same fact on the next inning", async () => {
    const persistedRecords: CommentaryFeedEntryRecord[] = [
      {
        id: "commentary-inning-game-1-home-3-1000",
        gameId: "game-1",
        leagueId: "league-1",
        reporterId: "reporter-1",
        commentaryText: "Earlier summary.",
        halfInningLabel: "INNING 3",
        kind: "between-inning",
        historicalTidbit: {
          factId: "mlb-rickey-henderson-steals",
          text: "Rickey Henderson finished with 1,406 career stolen bases and set the single-season record with 130 in 1982.",
          sourceLabel: "MLB",
          sourceUrl:
            "https://www.mlb.com/news/remembering-mlb-stolen-base-king-rickey-henderson",
        },
        timestamp: 1000,
        createdAt: 1000,
        changed_at: 1000,
      },
    ];
    const { engine, generateBetweenInningSummary } = createEngine();
    const contextualHistoryReporterContext: ReporterContext = {
      ...createReporterContext({
        inning: 4,
        halfInning: "TOP",
      }),
      battingTeam: {
        id: "oakland-athletics",
        name: "Athletics",
        abbreviation: "ATH",
        nickname: "Athletics",
        location: "Oakland",
        baselineBackstory: "Fast and loud.",
      },
    };
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      listCommentaryFeedEntriesForGame: async () => persistedRecords,
      buildReporterContext: async () => contextualHistoryReporterContext,
      buildLiveReporterContext: async () => contextualHistoryReporterContext,
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        4,
        [createAtBatEvent({ inning: 4, halfInning: "TOP", result: "HR" })],
        "home",
      );
    });

    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
    expect(result.current.commentaryEntries[1]).toMatchObject({
      historicalTidbit: expect.objectContaining({
        factId: expect.not.stringMatching(/^mlb-rickey-henderson-steals$/),
      }),
    });
  });

  test("persists a verified historical tidbit without invoking the inning summary model", async () => {
    const { engine, generateBetweenInningSummary } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistCommentaryFeedEntry: persistSpy,
    });

    await act(async () => {
      await result.current.fireBetweenInningSummary(
        "game-1",
        4,
        [createAtBatEvent({ inning: 4, halfInning: "TOP", result: "HR" })],
        "home",
      );
    });

    await waitFor(() => {
      expect(result.current.commentaryEntries).toHaveLength(1);
    });
    expect(result.current.commentaryEntries[0]).toMatchObject({
      commentaryText: "",
      kind: "between-inning",
      historicalTidbit: expect.objectContaining({
        factId: expect.any(String),
        sourceLabel: expect.any(String),
      }),
    });
    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        commentaryText: "",
        historicalTidbit: expect.objectContaining({
          factId: expect.any(String),
        }),
      }),
    );
    expect(generateBetweenInningSummary).not.toHaveBeenCalled();
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
        historicalTidbit: {
          factId: "mlb-johnny-vander-meer-back-to-back-no-hitters",
          text: "Johnny Vander Meer's back-to-back no-hitters in June 1938 still stand as the only consecutive no-hitters in Major League history.",
          sourceLabel: "MLB",
          sourceUrl:
            "https://www.mlb.com/news/75th-anniversary-of-vander-meers-back-to-back-no-hitters/c-50314542",
        },
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
          historicalTidbit: persistedRecords[0].historicalTidbit,
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
      '[data-testid="commentary-entry-commentary-inning-game-1-T4-2000"] > div:nth-child(2)',
    );
    expect(body).not.toBeNull();
    expect(body).toHaveStyle({
      fontStyle: "italic",
      color: "rgb(196, 217, 196)",
    });
    expect(screen.getByText("History Note")).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
  });

  // ═══════════════════════════════════════════════════════════════
  // firePostGameColumns — dual-reporter post-game newspaper columns
  // ═══════════════════════════════════════════════════════════════

  test("firePostGameColumns generates BOTH home and away columns and persists both", async () => {
    const { engine, generatePostGameColumn } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistGameStory: persistSpy,
    });

    await act(async () => {
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [
          createAtBatEvent({ inning: 1, batterName: "Harry Backman", pitcherName: "Winnie Noelle" }),
          createAtBatEvent({ inning: 2, batterName: "Lester Bronco", pitcherName: "Manny Kays" }),
        ],
        finalScore: { home: 4, away: 2 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
    });

    expect(generatePostGameColumn).toHaveBeenCalledTimes(2);
    const reporterTeams = generatePostGameColumn.mock.calls.map(
      (args) => (args[0] as { reporterTeam: string }).reporterTeam,
    );
    expect(reporterTeams.sort()).toEqual(["away", "home"]);

    expect(persistSpy).toHaveBeenCalledTimes(2);
    const persistedIds = persistSpy.mock.calls.map(
      (args) => (args[0] as { id: string }).id,
    );
    expect(persistedIds.sort()).toEqual([
      "game-story-game-1-away",
      "game-story-game-1-home",
    ]);

    // playersMentioned should be the union of all batters + pitchers across innings.
    const firstPersisted = persistSpy.mock.calls[0][0] as {
      playersMentioned: string[];
    };
    expect(firstPersisted.playersMentioned.sort()).toEqual([
      "Harry Backman",
      "Lester Bronco",
      "Manny Kays",
      "Winnie Noelle",
    ]);
  });

  test("firePostGameColumns with one reporter missing still generates the other", async () => {
    const { engine, generatePostGameColumn } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      // Home reporter missing; away assigned
      reporter: null,
      awayReporter: createAwayReporter(),
      createEngine: () => engine,
      persistGameStory: persistSpy,
    });

    await act(async () => {
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [createAtBatEvent({ inning: 1 })],
        finalScore: { home: 0, away: 3 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
    });

    // Only the away reporter generates.
    expect(generatePostGameColumn).toHaveBeenCalledTimes(1);
    const call = generatePostGameColumn.mock.calls[0][0] as {
      reporterTeam: string;
    };
    expect(call.reporterTeam).toBe("away");
    expect(persistSpy).toHaveBeenCalledTimes(1);
  });

  test("firePostGameColumns with both reporters missing generates nothing and persists nothing", async () => {
    const { engine, generatePostGameColumn } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      reporter: null,
      awayReporter: null,
      createEngine: () => engine,
      persistGameStory: persistSpy,
    });

    await act(async () => {
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [createAtBatEvent({ inning: 1 })],
        finalScore: { home: 0, away: 0 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
    });

    expect(generatePostGameColumn).not.toHaveBeenCalled();
    expect(persistSpy).not.toHaveBeenCalled();
  });

  test("firePostGameColumns dedup prevents a second fire for the same gameId", async () => {
    const { engine, generatePostGameColumn } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistGameStory: persistSpy,
    });

    await act(async () => {
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [createAtBatEvent({ inning: 1 })],
        finalScore: { home: 1, away: 0 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [createAtBatEvent({ inning: 1 })],
        finalScore: { home: 1, away: 0 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
    });

    // Engine was only invoked for the first call (2 per game — home + away).
    expect(generatePostGameColumn).toHaveBeenCalledTimes(2);
    expect(persistSpy).toHaveBeenCalledTimes(2);
  });

  test("firePostGameColumns persists a GameStory shape with the expected fields per column", async () => {
    const { engine } = createEngine();
    const persistSpy = vi.fn(async () => undefined);
    const { result } = renderCommentaryFeedHook({
      createEngine: () => engine,
      persistGameStory: persistSpy,
    });

    await act(async () => {
      await result.current.firePostGameColumns({
        targetGameId: "game-1",
        allInningEvents: [
          createAtBatEvent({ inning: 1, batterName: "Harry Backman", pitcherName: "Winnie Noelle" }),
        ],
        finalScore: { home: 1, away: 0 },
        gameMode: "exhibition",
        gameDate: "2026-04-17",
      });
    });

    expect(persistSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: "game-1",
        gameMode: "exhibition",
        gameDate: "2026-04-17",
        headline: "BACKMAN'S BLAST",
        body: "Three paragraphs of sparkling prose.",
        createdAt: 2000,
        changed_at: 2000,
        playersMentioned: expect.arrayContaining(["Harry Backman", "Winnie Noelle"]),
      }),
    );
  });
});
