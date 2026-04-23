import { describe, expect, test } from "vitest";

import { INITIAL_MOOD_STATE } from "../../../engines/moodEngine";
import type { BeatReporter } from "../../../types/reporter";
import type { AtBatEvent } from "../../../utils/eventLog";
import {
  buildPostGameColumnSystemPrompt,
  formatEnrichedEvents,
  formatGroundTruth,
  formatHardRules,
  formatReporterIdentity,
  formatRosterAttribution,
} from "../../app/engines/reporter/promptBuilder";
import type { ReporterContext } from "../../app/engines/reporter/reporterContext";

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

function createContext(): ReporterContext {
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
      location: "Harbor City",
      baselineBackstory: "Fast and loud.",
    },
    pitchingTeam: {
      id: "team-home",
      name: "Blowfish",
      location: "Mesa Vista",
      ballparkNickname: "The Tank",
      baselineBackstory: "Patient and sturdy.",
    },
    batterLegacySummary: "Sparks turns tight games into theatre.",
    pitcherLegacySummary: "Vale survives on edge-of-the-zone nerve.",
    battingTeamLegacySummary: "The Freebooters thrive on chaos.",
    pitchingTeamLegacySummary: "The Blowfish wait for one loud swing.",
    batterRecentAlmanac: [],
    pitcherRecentAlmanac: [],
    battingTeamRecentAlmanac: [],
    pitchingTeamRecentAlmanac: [],
    teamRecentAlmanac: [],
    activeOpposingRelationships: [],
    activeWithinTeamRelationships: [],
    teamDnaFacts: ["Mesa Vista lives for late-night noise."],
    homeTeamRivalries: [],
    awayTeamRivalries: [],
    teamRivalryIntensity: 4,
    dramaticWeight: 0.5,
    gameState: {
      gameId: "game-1",
      atBatId: "game-1_1",
      inning: 2,
      halfInning: "TOP",
      outs: 1,
      bases: { first: null, second: null, third: null },
      awayScore: 1,
      homeScore: 2,
      battingTeamId: "team-away",
      pitchingTeamId: "team-home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
      leagueId: "league-1",
    },
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
    result: "1B",
    rbiCount: 0,
    runsScored: 0,
    inning: 2,
    halfInning: "TOP",
    outs: 1,
    runners: { first: null, second: null, third: null },
    awayScore: 1,
    homeScore: 2,
    outsAfter: 1,
    runnersAfter: {
      first: {
        runnerId: "batter-1",
        runnerName: "Ivy Sparks",
        responsiblePitcherId: "pitcher-1",
      },
      second: null,
      third: null,
    },
    awayScoreAfter: 1,
    homeScoreAfter: 2,
    leverageIndex: 1.1,
    winProbabilityBefore: 0.45,
    winProbabilityAfter: 0.43,
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

describe("promptBuilder helpers", () => {
  test("formatReporterIdentity includes personality and voice signature traits", () => {
    const lines = formatReporterIdentity(createReporter()).join("\n");

    expect(lines).toContain("Personality: Dramatic");
    expect(lines).toContain("Voice style: The Holy Cow");
    expect(lines).toContain("Holy Cow!");
  });

  test("formatEnrichedEvents surfaces enrichment when present and omits it when absent", () => {
    const context = createContext();
    const lines = formatEnrichedEvents(
      [
        createAtBatEvent({
          enrichment: {
            exitType: "line_drive",
            pitchType: "4F",
            pitchesInAtBat: 3,
            fieldLocation: { x: 10, y: 20, zone: "right-center" },
          },
        }),
        createAtBatEvent({
          eventId: "game-1_2",
          eventIndex: 2,
          batterName: "Harry Backman",
          batterId: "batter-2",
          result: "BB",
          enrichment: undefined,
        }),
      ],
      context,
    );

    expect(lines[0]).toContain("LINE DRIVE singled");
    expect(lines[0]).toContain("last pitch 4F");
    expect(lines[1]).toContain("Harry Backman: walked");
    expect(lines[1]).not.toContain("last pitch");
  });

  test("formatGroundTruth labels home and away correctly for each reporter side", () => {
    const context = createContext();

    const homeLines = formatGroundTruth(context, "home").join("\n");
    const awayLines = formatGroundTruth(context, "away").join("\n");

    expect(homeLines).toContain("Home team: Blowfish");
    expect(homeLines).toContain("Reporter team: Blowfish (home booth)");
    expect(awayLines).toContain("Away team: Freebooters");
    expect(awayLines).toContain("Reporter team: Freebooters (away booth)");
  });

  test("formatHardRules returns the anti-hallucination invariants", () => {
    const lines = formatHardRules().join("\n");

    expect(lines).toContain("Never invent facts");
    expect(lines).toContain("If a detail is missing, say less and stay generic");
    expect(lines).toContain("No markdown");
  });

  test("formatRosterAttribution labels each player by reporter-vs-opponent team", () => {
    const reporter = createReporter();
    const context = createContext();
    const events = [
      createAtBatEvent({
        batterName: "Ivy Sparks",
        batterTeamId: "team-away",
        pitcherName: "Noelle Vale",
        pitcherTeamId: "team-home",
      }),
      createAtBatEvent({
        eventId: "game-1_2",
        eventIndex: 2,
        batterName: "Toro Blanco",
        batterId: "batter-2",
        batterTeamId: "team-home",
        pitcherName: "Kay Trent",
        pitcherId: "pitcher-2",
        pitcherTeamId: "team-away",
      }),
    ];

    const homeLines = formatRosterAttribution(events, reporter, context, "home").join("\n");
    expect(homeLines).toContain("YOUR team — Blowfish");
    expect(homeLines).toContain("Pitchers who threw for Blowfish: Noelle Vale");
    expect(homeLines).toContain("Batters who hit for Blowfish: Toro Blanco");
    expect(homeLines).toContain("OPPONENT — Freebooters");
    expect(homeLines).toContain("Pitchers who threw for Freebooters: Kay Trent");
    expect(homeLines).toContain("Batters who hit for Freebooters: Ivy Sparks");

    const awayReporter = { ...reporter, teamId: "team-away" };
    const awayLines = formatRosterAttribution(events, awayReporter, context, "away").join("\n");
    expect(awayLines).toContain("YOUR team — Freebooters");
    expect(awayLines).toContain("Pitchers who threw for Freebooters: Kay Trent");
    expect(awayLines).toContain("OPPONENT — Blowfish");
    expect(awayLines).toContain("Pitchers who threw for Blowfish: Noelle Vale");
  });

  test("buildPostGameColumnSystemPrompt includes ROSTER ATTRIBUTION section", () => {
    const reporter = createReporter();
    const context = createContext();
    const events = [
      createAtBatEvent({
        batterName: "Ivy Sparks",
        batterTeamId: "team-away",
        pitcherName: "Noelle Vale",
        pitcherTeamId: "team-home",
      }),
    ];

    const prompt = buildPostGameColumnSystemPrompt(
      reporter,
      "home",
      context,
      { home: 4, away: 3 },
      events,
      "",
    );

    expect(prompt).toContain("ROSTER ATTRIBUTION (do NOT confuse these)");
    expect(prompt).toContain("YOUR team — Blowfish");
    expect(prompt).toContain("OPPONENT — Freebooters");
    expect(prompt).toContain("Before naming any pitcher or batter, verify which team they played for using ROSTER ATTRIBUTION.");
  });

  test("buildPostGameColumnSystemPrompt makes the official final result override stale narrative", () => {
    const reporter = createReporter();
    const context = createContext();
    const prompt = buildPostGameColumnSystemPrompt(
      reporter,
      "home",
      context,
      { home: 2, away: 1 },
      [createAtBatEvent()],
      "The clubs were deadlocked at one.",
    );

    expect(prompt).toContain("POSTGAME GROUND TRUTH");
    expect(prompt).toContain("Official final score: Freebooters 1, Blowfish 2");
    expect(prompt).toContain("Official result: Blowfish beat Freebooters, 2-1.");
    expect(prompt).toContain("POSTGAME GROUND TRUTH and EVENTS override NARRATIVE SO FAR");
    expect(prompt).toContain("If the official final score is not tied, NEVER call the game a tie");
    expect(prompt).not.toContain("STRICT length: 3-5 sentences MAXIMUM");
    expect(prompt).not.toContain("NEVER recap events from prior innings");
  });

  test("formatMoodState uses the current mood label and momentum fields", async () => {
    const { formatMoodState } = await import("../../app/engines/reporter/promptBuilder");
    const lines = formatMoodState({
      ...INITIAL_MOOD_STATE,
      currentMood: "DRAMATIC",
      moodMomentum: 3,
      moodScore: 4,
      energyModifier: "electric",
    }).join("\n");

    expect(lines).toContain("Current mood: Dramatic (resolved label: euphoric)");
    expect(lines).toContain("Momentum: +3");
    expect(lines).toContain("Energy level: electric");
  });
});
