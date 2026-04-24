import { describe, expect, test } from "vitest";

import type { HistoricalFactRecord } from "../../../types/reporter";
import type { AtBatEvent } from "../../../utils/eventLog";
import {
  HISTORICAL_FACT_BANK,
  selectHistoricalFact,
} from "../../app/engines/reporter/historicalFactBank";
import type { ReporterContext } from "../../app/engines/reporter/reporterContext";

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
      id: "oakland-athletics",
      name: "Athletics",
      abbreviation: "ATH",
      nickname: "Athletics",
      location: "Oakland",
      baselineBackstory: "Fast and loud.",
    },
    pitchingTeam: {
      id: "team-home",
      name: "Blowfish",
      abbreviation: "BLW",
      nickname: "Blowfish",
      location: "Mesa Vista",
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
    dramaticWeight: 0.3,
    gameState: {
      gameId: "game-1",
      atBatId: "ab-1",
      inning: 7,
      halfInning: "TOP",
      outs: 1,
      bases: { first: null, second: null, third: null },
      awayScore: 3,
      homeScore: 2,
      battingTeamId: "oakland-athletics",
      pitchingTeamId: "team-home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
      leagueId: "league-1",
    },
  };
}

function createEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "ab-1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1000,
    batterId: "batter-1",
    batterName: "Ivy Sparks",
    batterTeamId: "oakland-athletics",
    pitcherId: "pitcher-1",
    pitcherName: "Noelle Vale",
    pitcherTeamId: "team-home",
    result: "HR",
    rbiCount: 1,
    runsScored: 1,
    inning: 7,
    halfInning: "TOP",
    outs: 1,
    runners: { first: null, second: null, third: null },
    awayScore: 3,
    homeScore: 2,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 4,
    homeScoreAfter: 2,
    leverageIndex: 2.1,
    winProbabilityBefore: 0.52,
    winProbabilityAfter: 0.68,
    wpa: 0.16,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: true,
    isWalkOff: false,
    competitionType: "exhibition",
    leagueId: "league-1",
    ...overrides,
  };
}

describe("historicalFactBank selector", () => {
  test("returns a contextual team/theme match when one exists", () => {
    const selection = selectHistoricalFact({
      inning: 7,
      inningEvents: [createEvent({ result: "HR" })],
      context: createContext(),
    });

    expect(selection).not.toBeNull();
    expect(selection?.fact.id).toBe("mlb-rickey-henderson-steals");
  });

  test("falls back to a verified general-history fact when contextual matches are absent", () => {
    const generalOnlyFacts: HistoricalFactRecord[] = [
      {
        id: "general-history-note",
        factText: "Baseball's official record can still change when new evidence surfaces.",
        sourceLabel: "MLB",
        sourceUrl: "https://www.mlb.com/news/baseball-record-books-changing-negro-leagues",
        sourceType: "mlb",
        subjectType: "general",
        subjectIds: ["general-history"],
        teamTags: [],
        playerTags: [],
        themeTags: [],
        eraTags: ["modern"],
        verifiedAt: "2026-04-23",
        priority: 3,
        active: true,
      },
    ];

    const selection = selectHistoricalFact(
      {
        inning: 2,
        inningEvents: [createEvent({ result: "FO", runsScored: 0, awayScoreAfter: 3 })],
        context: {
          ...createContext(),
          battingTeam: {
            ...createContext().battingTeam,
            id: "fictional-team",
            name: "Moonshots",
            abbreviation: "MON",
            nickname: "Moonshots",
            location: "Luna Bay",
          },
        },
      },
      generalOnlyFacts,
    );

    expect(selection?.fact.id).toBe("general-history-note");
  });

  test("skips cleanly when no active verified fact matches or falls back", () => {
    const selection = selectHistoricalFact(
      {
        inning: 5,
        inningEvents: [createEvent({ result: "GO", runsScored: 0 })],
        context: createContext(),
      },
      [],
    );

    expect(selection).toBeNull();
  });

  test("avoids repeating the same fact id within a game", () => {
    const first = selectHistoricalFact({
      inning: 7,
      inningEvents: [createEvent({ result: "HR" })],
      context: createContext(),
    });

    const second = selectHistoricalFact({
      inning: 8,
      inningEvents: [createEvent({ result: "HR", inning: 8 })],
      context: createContext(),
      usedFactIds: first ? [first.fact.id] : [],
      previousFamilyKey: first?.familyKey ?? null,
      previousSourceLabel: first?.fact.sourceLabel ?? null,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.fact.id).not.toBe(first?.fact.id);
  });

  test("the checked-in bank is seeded only with active verified facts", () => {
    expect(HISTORICAL_FACT_BANK.length).toBeGreaterThan(5);
    expect(HISTORICAL_FACT_BANK.every((fact) => fact.active)).toBe(true);
    expect(
      HISTORICAL_FACT_BANK.every(
        (fact) =>
          fact.verifiedAt === "2026-04-23" &&
          fact.sourceUrl.length > 0 &&
          fact.factText.length > 0,
      ),
    ).toBe(true);
  });
});
