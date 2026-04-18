import { describe, expect, test, vi } from "vitest";

import { INITIAL_MOOD_STATE } from "../../../engines/moodEngine";
import type {
  NotabilityPlayContext,
  NotabilityResult,
} from "../../../engines/notabilityScorer";
import type { BeatReporter } from "../../../types/reporter";
import type { AtBatEvent } from "../../../utils/eventLog";
import type { CompetitionType } from "../../../utils/gameStorage";
import {
  GrokCommentaryEngine,
  type BetweenInningSummaryInput,
  type PostGameColumnInput,
} from "../../app/engines/reporter/commentaryEngine";
import type { ReporterContext } from "../../app/engines/reporter/reporterContext";
import type { ReporterProxyInvoke } from "../../app/engines/reporter/grokClient";
import type { ClaudeProxyInvoke } from "../../app/engines/reporter/claudeClient";

function createReporter(): BeatReporter {
  const now = new Date("2026-04-15T12:00:00.000Z").getTime();
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
    createdAt: now,
    updatedAt: now,
    changed_at: now,
  };
}

function createContext(): ReporterContext {
  return {
    batter: {
      id: "batter-1",
      name: "Ivy Sparks",
      nicknames: ["Sparks"],
      effectiveFame: 4,
      archetype: "SLUGGER",
      baselineBackstory: "A cleanup hitter who lives for the late innings.",
      signatureMoment: "A pennant-clinching drive into the arcade.",
      teamId: "team-home",
      handedness: { bats: "R", throws: "R" },
    },
    pitcher: {
      id: "pitcher-1",
      name: "Noelle Vale",
      nicknames: ["Icebox"],
      effectiveFame: 5,
      archetype: "ACE",
      baselineBackstory: "A stoic ace with a high fastball and no wasted motion.",
      signatureMoment: "A thirteen-strikeout shutout under the lights.",
      teamId: "team-away",
      handedness: { bats: "L", throws: "R" },
    },
    battingTeam: {
      id: "team-home",
      name: "Blowfish",
      abbreviation: "BLW",
      location: "Mesa Vista",
      nickname: "Blowfish",
      era: "CLASSIC_TV",
      cityVibe: "sun-baked and rowdy",
      baselineBackstory: "A defense-first club that waits for one loud swing.",
      ballparkNickname: "The Tank",
    },
    pitchingTeam: {
      id: "team-away",
      name: "Freebooters",
      abbreviation: "FBT",
      location: "Harbor City",
      nickname: "Freebooters",
      era: "MODERN_LOCAL",
      cityVibe: "windy and loud",
      baselineBackstory: "An impatient lineup that swings like every count is 3-1.",
      ballparkNickname: "The Docks",
    },
    batterLegacySummary: "Sparks has a habit of turning close games into personal theatre.",
    pitcherLegacySummary: "Vale has authored a shelf full of tense, low-scoring wins.",
    battingTeamLegacySummary: "The Blowfish have built their identity around clean innings and timely thunder.",
    pitchingTeamLegacySummary: "The Freebooters keep surviving with crooked-number bursts.",
    batterRecentAlmanac: [
      {
        id: "batter-note-1",
        entityId: "batter-1",
        gameId: "game-1",
        timestamp: 1,
        headline: "Hot streak",
        summary: "Three extra-base hits over the last two games.",
      },
    ],
    pitcherRecentAlmanac: [
      {
        id: "pitcher-note-1",
        entityId: "pitcher-1",
        gameId: "game-1",
        timestamp: 2,
        headline: "Strikeout pace",
        summary: "Vale has punched out nine across the last four innings.",
      },
    ],
    battingTeamRecentAlmanac: [
      {
        id: "team-note-1",
        entityId: "team-home",
        gameId: "game-1",
        timestamp: 3,
        headline: "Rivalry heat",
        summary: "These clubs have split four nasty one-run games this month.",
      },
    ],
    pitchingTeamRecentAlmanac: [
      {
        id: "team-note-2",
        entityId: "team-away",
        gameId: "game-1",
        timestamp: 4,
        headline: "Pirate pressure",
        summary: "The Freebooters keep forcing late-count mistakes.",
      },
    ],
    teamRecentAlmanac: [
      {
        id: "team-note-1",
        entityId: "team-home",
        gameId: "game-1",
        timestamp: 3,
        headline: "Rivalry heat",
        summary: "These clubs have split four nasty one-run games this month.",
      },
    ],
    activeOpposingRelationships: [
      {
        id: "rel-1",
        sourcePlayerId: "pitcher-1",
        targetPlayerId: "batter-1",
        kind: "revenge_arc",
        intensity: 8,
        note: "Vale still remembers Sparks' walk-off from last week.",
      },
    ],
    activeWithinTeamRelationships: [],
    teamDnaFacts: [
      "Mesa Vista lives for late-night noise.",
      "The Blowfish treat every close game like a civic ritual.",
    ],
    homeTeamRivalries: [
      {
        opponentTeamId: "team-away",
        intensity: 7,
        origin: "Coastal pennant race",
      },
    ],
    awayTeamRivalries: [
      {
        opponentTeamId: "team-home",
        intensity: 6,
        origin: "Too many one-run losses",
      },
    ],
    teamRivalryIntensity: 7,
    dramaticWeight: 0.86,
    gameState: {
      gameId: "game-1",
      atBatId: "ab-1",
      inning: 8,
      halfInning: "BOTTOM",
      outs: 2,
      bases: {
        first: "Ivy Sparks",
        second: null,
        third: null,
      },
      awayScore: 2,
      homeScore: 3,
      battingTeamId: "team-home",
      pitchingTeamId: "team-away",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
      competitionId: "comp-1",
      leagueId: "league-1",
    },
    wpaMoment: {
      eventId: "ab-1",
      leverageIndex: 3.14,
      winProbabilityBefore: 0.58,
      winProbabilityAfter: 0.77,
      wpa: 0.19,
    },
  };
}

function createPlay(overrides: Partial<NotabilityPlayContext> = {}): NotabilityPlayContext {
  return {
    inning: 8,
    halfInning: "BOTTOM",
    outsBefore: 2,
    outsAfter: 2,
    basesBefore: { first: true, second: false, third: false },
    basesAfter: { first: false, second: true, third: false },
    homeScoreBefore: 3,
    awayScoreBefore: 2,
    homeScoreAfter: 4,
    awayScoreAfter: 2,
    result: "DOUBLE",
    runsScored: 1,
    ...overrides,
  };
}

function createInningEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "inning-event-1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1000,
    batterId: "batter-1",
    batterName: "Ivy Sparks",
    batterTeamId: "team-away",
    pitcherId: "pitcher-1",
    pitcherName: "Noelle Vale",
    pitcherTeamId: "team-home",
    result: "1B",
    rbiCount: 0,
    runsScored: 0,
    inning: 4,
    halfInning: "TOP",
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 2,
    homeScore: 3,
    outsAfter: 0,
    runnersAfter: {
      first: {
        runnerId: "batter-1",
        runnerName: "Ivy Sparks",
        responsiblePitcherId: "pitcher-1",
      },
      second: null,
      third: null,
    },
    awayScoreAfter: 2,
    homeScoreAfter: 3,
    leverageIndex: 1.2,
    winProbabilityBefore: 0.48,
    winProbabilityAfter: 0.46,
    wpa: -0.02,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    competitionType: "exhibition",
    leagueId: "league-1",
    ...overrides,
  };
}

function createNotability(
  overrides: Partial<NotabilityResult> = {},
): NotabilityResult {
  return {
    score: 0.22,
    shouldComment: true,
    reason: "HIGH_WPA",
    ...overrides,
  };
}

function createInvokeSuccess(
  text = "Holy cow, Sparks smoked that ball into the gap and pushed the Blowfish a step closer to the finish line.",
) {
  return vi.fn(async () => ({
    data: {
      text,
      inputTokens: 123,
      outputTokens: 29,
      model: "grok-4",
    },
    error: null,
  })) as unknown as ReturnType<typeof vi.fn>;
}

function createLogUsageSpy() {
  return vi.fn(async (entry) => ({
    id: "usage-1",
    timestamp: 1,
    provider: "grok" as const,
    costUsd: 0.001,
    ...entry,
  }));
}

async function generateWithDefaults(options: {
  invokeImpl?: ReporterProxyInvoke;
  logUsage?: ReturnType<typeof createLogUsageSpy>;
  temperature?: number;
  notability?: NotabilityResult;
  mode?: CompetitionType;
}) {
  const engine = new GrokCommentaryEngine({
    model: "grok-4",
    intensity: "high",
    temperature: options.temperature,
    gameId: "game-1",
    mode: options.mode ?? "exhibition",
    reporter: createReporter(),
    invokeImpl: options.invokeImpl,
    logUsage: options.logUsage,
  });

  const result = await engine.generateCommentary({
    play: createPlay(),
    notability: options.notability ?? createNotability(),
    reporter: createReporter(),
    mood: {
      ...INITIAL_MOOD_STATE,
      moodScore: 4,
      energyModifier: "electric",
    },
    context: createContext(),
    boxScore: {
      batter: { AB: 4, H: 2, RBI: 2 },
      pitcher: { IP: "7.2", K: 9 },
    },
  });

  return { engine, result };
}

async function generatePreambleWithDefaults(options: {
  invokeImpl?: ReporterProxyInvoke;
  logUsage?: ReturnType<typeof createLogUsageSpy>;
  temperature?: number;
  mode?: CompetitionType;
}) {
  const engine = new GrokCommentaryEngine({
    model: "grok-4",
    intensity: "high",
    temperature: options.temperature,
    gameId: "game-1",
    mode: options.mode ?? "exhibition",
    reporter: createReporter(),
    invokeImpl: options.invokeImpl,
    logUsage: options.logUsage,
  });

  const result = await engine.generatePreamble({
    context: createContext(),
    mood: {
      ...INITIAL_MOOD_STATE,
      moodScore: 4,
      energyModifier: "electric",
    },
    reporter: createReporter(),
    reporterTeam: "home",
  });

  return { engine, result };
}

function createBetweenInningInput(
  overrides: Partial<BetweenInningSummaryInput> = {},
): BetweenInningSummaryInput {
  return {
    context: createContext(),
    mood: {
      ...INITIAL_MOOD_STATE,
      moodScore: 2,
      currentMood: "DRAMATIC",
    },
    reporter: createReporter(),
    reporterTeam: "home",
    inning: 4,
    inningEvents: [
      createInningEvent({
        eventId: "inning-event-1",
        eventIndex: 1,
        enrichment: {
          exitType: "line_drive",
          pitchType: "4F",
          pitchesInAtBat: 3,
        },
      }),
      createInningEvent({
        eventId: "inning-event-2",
        eventIndex: 2,
        batterName: "Harry Backman",
        batterId: "batter-2",
        batterTeamId: "team-home",
        halfInning: "BOTTOM",
        result: "DP",
        enrichment: {
          fieldingPlayType: "diving",
          fieldingSequence: [5, 4, 3],
        },
      }),
    ],
    previousNarrativeSoFar:
      "Through three innings, the Blowfish scratched out a slim lead behind clean pitching.",
    ...overrides,
  };
}

async function generateBetweenInningSummaryWithDefaults(options: {
  invokeImpl?: ReporterProxyInvoke;
  logUsage?: ReturnType<typeof createLogUsageSpy>;
  mode?: CompetitionType;
  input?: Partial<BetweenInningSummaryInput>;
}) {
  const engine = new GrokCommentaryEngine({
    model: "grok-4",
    intensity: "high",
    gameId: "game-1",
    mode: options.mode ?? "exhibition",
    reporter: createReporter(),
    invokeImpl: options.invokeImpl,
    logUsage: options.logUsage,
  });

  const result = await engine.generateBetweenInningSummary(
    createBetweenInningInput(options.input),
  );

  return { engine, result };
}

describe("commentaryEngine", () => {
  test("happy path returns commentary text, usage tokens, and skipped=false", async () => {
    const invokeImpl = createInvokeSuccess();
    const logUsage = createLogUsageSpy();

    const { result } = await generateWithDefaults({
      invokeImpl: invokeImpl as unknown as ReporterProxyInvoke,
      logUsage,
    });

    expect(result).toMatchObject({
      text: "Holy cow, Sparks smoked that ball into the gap and pushed the Blowfish a step closer to the finish line.",
      skipped: false,
      inputTokens: 123,
      outputTokens: 29,
    });
  });

  test("logs usage once per successful generation with commentary purpose, intensity, and game id", async () => {
    const logUsage = createLogUsageSpy();

    await generateWithDefaults({
      invokeImpl: createInvokeSuccess() as unknown as ReporterProxyInvoke,
      logUsage,
      mode: "playoff",
    });

    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(logUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "grok-4",
        inputTokens: 123,
        outputTokens: 29,
        purpose: "commentary",
        intensity: "high",
        gameId: "game-1",
        mode: "playoff",
      }),
    );
  });

  test("accumulates a rolling gameNarrativeSoFar across commentary calls", async () => {
    const invokeImpl = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          text: "Sparks opened the late rally with a laser double.",
          inputTokens: 90,
          outputTokens: 18,
          model: "grok-4",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          text: "Vale answered by freezing the next hitter with a high heater.",
          inputTokens: 88,
          outputTokens: 17,
          model: "grok-4",
        },
        error: null,
      }) as unknown as ReporterProxyInvoke;
    const engine = new GrokCommentaryEngine({
      model: "grok-4",
      intensity: "medium",
      gameId: "game-1",
      mode: "exhibition",
      invokeImpl,
      logUsage: createLogUsageSpy(),
    });

    await engine.generateCommentary({
      play: createPlay(),
      notability: createNotability(),
      reporter: createReporter(),
      mood: INITIAL_MOOD_STATE,
      context: createContext(),
    });
    await engine.generateCommentary({
      play: createPlay({ result: "STRIKEOUT", outsAfter: 3, runsScored: 0 }),
      notability: createNotability({ score: 0.17, reason: "WPA" }),
      reporter: createReporter(),
      mood: INITIAL_MOOD_STATE,
      context: createContext(),
    });

    expect(engine.getNarrativeSoFar()).toContain("Sparks opened the late rally with a laser double.");
    expect(engine.getNarrativeSoFar()).toContain("Vale answered by freezing the next hitter with a high heater.");
  });

  test("resetNarrative clears the rolling summary", async () => {
    const { engine } = await generateWithDefaults({
      invokeImpl: createInvokeSuccess() as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
    });

    expect(engine.getNarrativeSoFar()).not.toBe("");
    engine.resetNarrative();
    expect(engine.getNarrativeSoFar()).toBe("");
  });

  test("returns a skipped fallback result instead of throwing when the LLM call fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invokeImpl = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as ReporterProxyInvoke;

    const { result } = await generateWithDefaults({
      invokeImpl,
      logUsage: createLogUsageSpy(),
    });

    expect(result).toMatchObject({
      text: null,
      skipped: true,
      error: "timeout",
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      "[reporter:commentary] Commentary generation failed; skipping play.",
      "timeout",
    );
  });

  test("skips immediately when the play is not notable", async () => {
    const invokeImpl = createInvokeSuccess();
    const logUsage = createLogUsageSpy();

    const { result } = await generateWithDefaults({
      invokeImpl: invokeImpl as unknown as ReporterProxyInvoke,
      logUsage,
      notability: createNotability({
        shouldComment: false,
        score: 0.01,
        reason: "LOW_WPA",
      }),
    });

    expect(result).toEqual({
      text: null,
      skipped: true,
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(invokeImpl).not.toHaveBeenCalled();
    expect(logUsage).not.toHaveBeenCalled();
  });

  test("sends a structured prompt with reporter identity, mood, narrative, play description, and notability reason", async () => {
    const invokeImpl = createInvokeSuccess();
    const engine = new GrokCommentaryEngine({
      model: "grok-4",
      intensity: "medium",
      gameId: "game-1",
      mode: "exhibition",
      invokeImpl: invokeImpl as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
    });

    await engine.generateCommentary({
      play: createPlay(),
      notability: createNotability({ reason: "HR" }),
      reporter: createReporter(),
      mood: {
        ...INITIAL_MOOD_STATE,
        moodScore: 4,
      },
      context: createContext(),
      boxScore: {
        batter: { AB: 4, H: 2, RBI: 2 },
        pitcher: { IP: "7.2", K: 9 },
      },
    });

    const options = invokeImpl.mock.calls[0][1];
    const systemMessage = options.body.messages[0];
    const userMessage = options.body.messages[1];

    expect(systemMessage.content).toContain("Name: Dutch Calloway");
    expect(systemMessage.content).toContain("REPORTER IDENTITY");
    expect(systemMessage.content).toContain("Current mood: Balanced (resolved label: euphoric)");
    expect(systemMessage.content).toContain("(no prior narrative — treat this like a fresh beat inside the game broadcast)");
    expect(systemMessage.content).toContain("Notability cue: This play triggered commentary because the scorer flagged HR.");
    expect(userMessage.content).toContain("Result: DOUBLE");
    expect(userMessage.content).toContain("Notability reason: HR");
    expect(userMessage.content).toContain("\"RBI\": 2");
  });

  test("uses 0.7 as the default temperature and allows overrides", async () => {
    const defaultInvoke = createInvokeSuccess();
    await generateWithDefaults({
      invokeImpl: defaultInvoke as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
    });
    expect(defaultInvoke.mock.calls[0][1].body.temperature).toBe(0.7);

    const overrideInvoke = createInvokeSuccess();
    await generateWithDefaults({
      invokeImpl: overrideInvoke as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
      temperature: 0.45,
    });
    expect(overrideInvoke.mock.calls[0][1].body.temperature).toBe(0.45);
  });

  test("uses a different preamble system prompt than play commentary", async () => {
    const invokeImpl = createInvokeSuccess(
      "Good evening everybody, this is Dutch Calloway and the Tank feels ready to shake tonight.",
    );
    const engine = new GrokCommentaryEngine({
      model: "grok-4",
      intensity: "medium",
      gameId: "game-1",
      mode: "exhibition",
      reporter: createReporter(),
      invokeImpl: invokeImpl as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
    });

    await engine.generatePreamble({
      context: createContext(),
      mood: {
        ...INITIAL_MOOD_STATE,
        moodScore: 4,
      },
      reporter: createReporter(),
      reporterTeam: "home",
    });
    await engine.generateCommentary({
      play: createPlay(),
      notability: createNotability({ reason: "HR" }),
      reporter: createReporter(),
      mood: {
        ...INITIAL_MOOD_STATE,
        moodScore: 4,
      },
      context: createContext(),
    });

    const preambleSystemMessage = invokeImpl.mock.calls[0][1].body.messages[0];
    const commentarySystemMessage = invokeImpl.mock.calls[1][1].body.messages[0];
    const preambleUserMessage = invokeImpl.mock.calls[0][1].body.messages[1];

    expect(preambleSystemMessage.content).toContain(
      "Write a 4-6 sentence whole-game scene-setting preamble in YOUR voice.",
    );
    expect(preambleSystemMessage.content).toContain(
      "End with a natural sign-off that signals readiness for first pitch.",
    );
    expect(commentarySystemMessage.content).toContain("Notability cue:");
    expect(preambleSystemMessage.content).not.toContain("Notability cue:");
    expect(preambleUserMessage.content).toContain("PREGAME SCENE");
  });

  test("preamble returns commentary result with skipped=false on success", async () => {
    const { result } = await generatePreambleWithDefaults({
      invokeImpl: createInvokeSuccess(
        "Good evening everybody, this is Dutch Calloway and the air around The Tank already feels electric.",
      ) as unknown as ReporterProxyInvoke,
      logUsage: createLogUsageSpy(),
    });

    expect(result).toMatchObject({
      text: "Good evening everybody, this is Dutch Calloway and the air around The Tank already feels electric.",
      skipped: false,
      inputTokens: 123,
      outputTokens: 29,
    });
  });

  test("preamble errors fall back to skipped=true without throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invokeImpl = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as ReporterProxyInvoke;

    const { result } = await generatePreambleWithDefaults({
      invokeImpl,
      logUsage: createLogUsageSpy(),
    });

    expect(result).toMatchObject({
      text: null,
      skipped: true,
      error: "timeout",
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      "[reporter:commentary] Game preamble generation failed; skipping preamble.",
      "timeout",
    );
  });

  test("logs usage for successful preamble generation with purpose commentary", async () => {
    const logUsage = createLogUsageSpy();

    await generatePreambleWithDefaults({
      invokeImpl: createInvokeSuccess(
        "Good evening everybody, this is Dutch Calloway and the lights feel hot tonight.",
      ) as unknown as ReporterProxyInvoke,
      logUsage,
      mode: "playoff",
    });

    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(logUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "grok-4",
        inputTokens: 123,
        outputTokens: 29,
        purpose: "commentary",
        intensity: "high",
        gameId: "game-1",
        mode: "playoff",
      }),
    );
  });

  describe("generateBetweenInningSummary", () => {
    test("happy path returns popup + updated narrative and replaces the narrative cache", async () => {
      const invokeImpl = createInvokeSuccess(
        '{"popup":"Freebooters stranded two in the top of the fourth.","narrative":"Through four, the Blowfish still carry a one-run edge after Vale escaped a noisy inning."}',
      ) as unknown as ReporterProxyInvoke;

      const { engine, result } = await generateBetweenInningSummaryWithDefaults({
        invokeImpl,
        logUsage: createLogUsageSpy(),
      });

      expect(result).toEqual({
        popupText: "Freebooters stranded two in the top of the fourth.",
        updatedNarrativeSoFar:
          "Through four, the Blowfish still carry a one-run edge after Vale escaped a noisy inning.",
        skipped: false,
        inputTokens: 123,
        outputTokens: 29,
      });
      expect(engine.getNarrativeSoFar()).toBe(
        "Through four, the Blowfish still carry a one-run edge after Vale escaped a noisy inning.",
      );
    });

    test("replaces prior gameNarrativeSoFar instead of appending after earlier commentary", async () => {
      const invokeImpl = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            text: "Sparks opened the late rally with a laser double.",
            inputTokens: 90,
            outputTokens: 18,
            model: "grok-4",
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            text: '{"popup":"Freebooters came up empty.","narrative":"Through the middle frames, the Blowfish still hold a one-run margin."}',
            inputTokens: 77,
            outputTokens: 20,
            model: "grok-4",
          },
          error: null,
        }) as unknown as ReporterProxyInvoke;

      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        gameId: "game-1",
        mode: "exhibition",
        reporter: createReporter(),
        invokeImpl,
        logUsage: createLogUsageSpy(),
      });

      await engine.generateCommentary({
        play: createPlay(),
        notability: createNotability(),
        reporter: createReporter(),
        mood: INITIAL_MOOD_STATE,
        context: createContext(),
      });
      expect(engine.getNarrativeSoFar()).toContain(
        "Sparks opened the late rally with a laser double.",
      );

      await engine.generateBetweenInningSummary(
        createBetweenInningInput({
          previousNarrativeSoFar: engine.getNarrativeSoFar(),
        }),
      );

      expect(engine.getNarrativeSoFar()).toBe(
        "Through the middle frames, the Blowfish still hold a one-run margin.",
      );
      expect(engine.getNarrativeSoFar()).not.toContain(
        "Sparks opened the late rally with a laser double.",
      );
    });

    test("malformed JSON falls back to raw popup text, preserves narrative, and warns", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { engine, result } = await generateBetweenInningSummaryWithDefaults({
        invokeImpl: createInvokeSuccess("Freebooters stranded two.") as unknown as ReporterProxyInvoke,
        logUsage: createLogUsageSpy(),
        input: {
          previousNarrativeSoFar: "Existing narrative stays put.",
        },
      });

      expect(result).toEqual({
        popupText: "Freebooters stranded two.",
        updatedNarrativeSoFar: "",
        skipped: false,
        inputTokens: 123,
        outputTokens: 29,
      });
      expect(engine.getNarrativeSoFar()).toBe("");
      expect(warn).toHaveBeenCalledWith(
        "[reporter:commentary] Between-inning summary did not return valid JSON; using raw popup text and preserving narrative.",
        "Freebooters stranded two.",
      );
    });

    test("empty response text skips and leaves narrative unchanged", async () => {
      const invokeImpl = vi.fn(async () => ({
        data: {
          text: null,
          inputTokens: 0,
          outputTokens: 0,
          model: "grok-4",
        },
        error: null,
      })) as unknown as ReporterProxyInvoke;
      const { engine, result } = await generateBetweenInningSummaryWithDefaults({
        invokeImpl,
        logUsage: createLogUsageSpy(),
      });

      expect(result.skipped).toBe(true);
      expect(result.popupText).toBeNull();
      expect(result.updatedNarrativeSoFar).toBe("");
      expect(result.error).toBe(
        "Grok Edge Function response did not include summary text.",
      );
      expect(engine.getNarrativeSoFar()).toBe("");
    });

    test("LLM throws and leaves narrative unchanged", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const invokeImpl = vi.fn(async () => {
        throw new Error("timeout");
      }) as unknown as ReporterProxyInvoke;
      const { engine, result } = await generateBetweenInningSummaryWithDefaults({
        invokeImpl,
        logUsage: createLogUsageSpy(),
      });

      expect(result).toMatchObject({
        popupText: null,
        updatedNarrativeSoFar: "",
        skipped: true,
        error: "timeout",
        inputTokens: 0,
        outputTokens: 0,
      });
      expect(engine.getNarrativeSoFar()).toBe("");
      expect(warn).toHaveBeenCalledWith(
        "[reporter:commentary] Between-inning summary generation failed; skipping summary.",
        "timeout",
      );
    });

    test("uses purpose between_inning_summary when logging usage", async () => {
      const logUsage = createLogUsageSpy();

      await generateBetweenInningSummaryWithDefaults({
        invokeImpl: createInvokeSuccess(
          '{"popup":"Freebooters stranded two.","narrative":"Through the top of the fourth, the Blowfish still cling to their one-run margin."}',
        ) as unknown as ReporterProxyInvoke,
        logUsage,
        mode: "playoff",
      });

      expect(logUsage).toHaveBeenCalledTimes(1);
      expect(logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "grok-4",
          inputTokens: 123,
          outputTokens: 29,
          purpose: "between_inning_summary",
          intensity: "high",
          gameId: "game-1",
          mode: "playoff",
        }),
      );
    });

    test("uses a different system prompt than play commentary", async () => {
      const invokeImpl = vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            text: '{"popup":"Freebooters stranded two.","narrative":"Through the top of the fourth, the Blowfish still cling to their one-run margin."}',
            inputTokens: 77,
            outputTokens: 20,
            model: "grok-4",
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            text: "Sparks smoked one into the gap.",
            inputTokens: 99,
            outputTokens: 22,
            model: "grok-4",
          },
          error: null,
        }) as unknown as ReporterProxyInvoke;
      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        gameId: "game-1",
        mode: "exhibition",
        reporter: createReporter(),
        invokeImpl,
        logUsage: createLogUsageSpy(),
      });

      await engine.generateBetweenInningSummary(createBetweenInningInput());
      await engine.generateCommentary({
        play: createPlay(),
        notability: createNotability(),
        reporter: createReporter(),
        mood: INITIAL_MOOD_STATE,
        context: createContext(),
      });

      const betweenSystemMessage = invokeImpl.mock.calls[0][1].body.messages[0];
      const commentarySystemMessage = invokeImpl.mock.calls[1][1].body.messages[0];

      expect(betweenSystemMessage.content).toContain(
        'Return JSON only, no markdown fences, exact shape: { "popup": "<2-3 sentences>", "narrative": "<1-2 sentences>" }',
      );
      expect(commentarySystemMessage.content).toContain("Notability cue:");
      expect(betweenSystemMessage.content).not.toBe(commentarySystemMessage.content);
    });
  });

  describe("generatePostGameColumn", () => {
    function createPostGameInput(
      overrides: Partial<PostGameColumnInput> = {},
    ): PostGameColumnInput {
      return {
        context: createContext(),
        reporter: createReporter(),
        reporterTeam: "home",
        finalScore: { home: 4, away: 2 },
        allInningEvents: [
          createInningEvent({
            eventId: "p1",
            eventIndex: 1,
            batterName: "Harry Backman",
            pitcherName: "Winnie Noelle",
          }),
        ],
        narrativeSoFar:
          "Through six, the Blowfish kept a steady two-run grip.",
        ...overrides,
      };
    }

    function makeClaudeInvoke(options: {
      text?: string;
      error?: { message: string; status?: number };
      inputTokens?: number;
      outputTokens?: number;
    }): ClaudeProxyInvoke {
      const invoke = vi.fn(async (_functionName, _opts) => {
        if (options.error) {
          return { data: null, error: options.error };
        }
        return {
          data: {
            text: options.text ?? "",
            inputTokens: options.inputTokens ?? 100,
            outputTokens: options.outputTokens ?? 400,
            model: "claude-sonnet-4-6",
          },
          error: null,
        };
      });
      return invoke as unknown as ClaudeProxyInvoke;
    }

    test("happy path returns parsed headline + body and skipped=false", async () => {
      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        gameId: "game-1",
        mode: "exhibition",
        claudeInvokeImpl: makeClaudeInvoke({
          text: JSON.stringify({
            headline: "BACKMAN'S BLAST SINKS FREEBOOTERS",
            body: "In the cathedral of Blowfish Stadium, Harry Backman did what Harry Backman does best.",
          }),
        }),
      });

      const result = await engine.generatePostGameColumn(createPostGameInput());

      expect(result.skipped).toBe(false);
      expect(result.headline).toBe("BACKMAN'S BLAST SINKS FREEBOOTERS");
      expect(result.body).toContain("Harry Backman");
    });

    test("truncated JSON (headline only, body missing) returns skipped=true so no partial column persists", async () => {
      const truncated = '{"headline": "BACKMAN HEROICS","body": "In the cathedral of Blow';
      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        claudeInvokeImpl: makeClaudeInvoke({ text: truncated }),
      });

      const result = await engine.generatePostGameColumn(createPostGameInput());

      // Recovery regex may pull the headline, but because body is broken we
      // explicitly mark the column as skipped so the caller does not persist
      // a half-written record.
      expect(result.skipped).toBe(true);
      expect(result.error).toContain("invalid or truncated");
    });

    test("logs usage with purpose='post_game_column'", async () => {
      const logUsage = createLogUsageSpy();
      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        gameId: "game-1",
        mode: "exhibition",
        claudeInvokeImpl: makeClaudeInvoke({
          text: JSON.stringify({ headline: "H", body: "B" }),
          inputTokens: 500,
          outputTokens: 800,
        }),
        logUsage,
      });

      await engine.generatePostGameColumn(createPostGameInput());

      expect(logUsage).toHaveBeenCalledTimes(1);
      expect(logUsage.mock.calls[0][0]).toMatchObject({
        purpose: "post_game_column",
        inputTokens: 500,
        outputTokens: 800,
        gameId: "game-1",
        mode: "exhibition",
      });
    });

    test("Claude API error returns skipped=true without throwing", async () => {
      const engine = new GrokCommentaryEngine({
        model: "grok-4",
        intensity: "medium",
        claudeInvokeImpl: makeClaudeInvoke({
          error: { message: "upstream 500", status: 500 },
        }),
      });

      await expect(
        engine.generatePostGameColumn(createPostGameInput()),
      ).resolves.toMatchObject({
        skipped: true,
        headline: null,
        body: null,
        error: expect.stringContaining("Claude"),
      });
    });
  });
});
