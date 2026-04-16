import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { BeatReporter, CommentaryFeedEntryRecord } from "../../../types/reporter";
import type { AtBatEvent } from "../../../utils/eventLog";
import { useCommentaryFeed } from "../../app/hooks/useCommentaryFeed";
import type {
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

function createReporterContext(): ReporterContext {
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
    },
  };
}

function createLiveSeed(): LiveReporterContextSeed {
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
  preambleError?: Error;
  commentaryError?: Error;
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
  const engine: CommentaryEngine = {
    generatePreamble,
    generateCommentary,
    getNarrativeSoFar: vi.fn(() => ""),
    resetNarrative: vi.fn(),
  };

  return { engine, generatePreamble, generateCommentary };
}

function renderCommentaryFeedHook(options: {
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

  return renderHook(() =>
    useCommentaryFeed({
      gameId: "game-1",
      homeTeamId: "team-home",
      leagueId: "league-1",
      getLivePreambleSeed: () => createLiveSeed(),
      dependencies: {
        getIntensity: async () => options.intensity ?? "medium",
        getReporterForTeam: async () =>
          options.reporter === undefined ? createReporter() : options.reporter,
        buildReporterContext:
          options.buildReporterContext ??
          (async () => createReporterContext()),
        buildLiveReporterContext:
          options.buildLiveReporterContext ??
          (async () => createReporterContext()),
        isWithinDailyCallLimit:
          options.isWithinDailyCallLimit ?? (async () => true),
        now: () => 2000,
        createEngine: options.createEngine,
        scoreNotability: options.scoreNotability,
        persistCommentaryFeedEntry: persistCommentaryFeedEntryImpl,
        listCommentaryFeedEntriesForGame: listCommentaryFeedEntriesForGameImpl,
      },
    }),
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
