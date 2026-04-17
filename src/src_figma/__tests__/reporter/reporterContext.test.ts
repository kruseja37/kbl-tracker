import { describe, expect, test, vi } from "vitest";
import {
  buildReporterContext,
  type AlmanacEntry,
  type ReporterContextDataSources,
} from "../../app/engines/reporter/reporterContext";
import type { AtBatEvent } from "../../../utils/eventLog";
import type {
  LeaguePlayerOverrideRecord,
  Player,
  Team,
} from "../../../utils/leagueBuilderStorage";

function createPlayer(overrides: Partial<Player>): Player {
  return {
    id: "player-default",
    firstName: "Default",
    lastName: "Player",
    gender: "M",
    age: 30,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "C",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 75,
    mojo: "Normal",
    fame: 0,
    salary: 1,
    leagueAssignments: [],
    createdDate: "2026-04-15T00:00:00.000Z",
    lastModified: "2026-04-15T00:00:00.000Z",
    isCustom: true,
    ...overrides,
  };
}

function createTeam(overrides: Partial<Team>): Team {
  return {
    id: "team-default",
    name: "Default Club",
    abbreviation: "DEF",
    location: "Default City",
    nickname: "Defaults",
    colors: { primary: "#111111", secondary: "#eeeeee" },
    stadium: "Default Park",
    leagueIds: ["league-1"],
    createdDate: "2026-04-15T00:00:00.000Z",
    lastModified: "2026-04-15T00:00:00.000Z",
    ...overrides,
  };
}

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "game-1_7",
    gameId: "game-1",
    eventIndex: 7,
    timestamp: 1713139200000,
    batterId: "batter-1",
    batterName: "Ivy Sparks",
    batterTeamId: "team-away",
    pitcherId: "pitcher-1",
    pitcherName: "Mara Stone",
    pitcherTeamId: "team-home",
    result: "2B",
    rbiCount: 1,
    runsScored: ["runner-2"],
    inning: 8,
    halfInning: "TOP",
    outs: 1,
    runners: {
      first: null,
      second: { runnerId: "runner-2", runnerName: "June Vale", responsiblePitcherId: "pitcher-1" },
      third: null,
    },
    awayScore: 2,
    homeScore: 3,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 3,
    homeScoreAfter: 3,
    leverageIndex: 2.25,
    winProbabilityBefore: 0.64,
    winProbabilityAfter: 0.48,
    wpa: 0.16,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: true,
    isWalkOff: false,
    competitionType: "exhibition",
    competitionId: "league-1",
    leagueId: "league-1",
    teamContext: {
      battingTeam: { teamId: "team-away", teamName: "Away Comets" },
      fieldingTeam: { teamId: "team-home", teamName: "Home Meteors" },
    },
    ...overrides,
  };
}

function createRecentAlmanacEntries(entityId: string, label: string): AlmanacEntry[] {
  return Array.from({ length: 7 }, (_, index) => ({
    id: `${label}-${index}`,
    entityId,
    timestamp: 1000 + index,
    headline: `${label} ${index}`,
    summary: `Summary ${index}`,
  }));
}

function createDataSources(overrides: Partial<ReporterContextDataSources> = {}): ReporterContextDataSources {
  const event = createAtBatEvent();
  const players = new Map<string, Player>([
    [
      "batter-1",
      createPlayer({
        id: "batter-1",
        firstName: "Ivy",
        lastName: "Sparks",
        nickname: "Fuse",
        nicknames: ["The Fuse"],
        archetype: "SLUGGER",
        backstory: "A pull hitter whose legend started in a gravel-lot league.",
        signatureMoment: "Cleared the warehouse roof in extras.",
        baseFameTier: 3,
        bats: "L",
      }),
    ],
    [
      "pitcher-1",
      createPlayer({
        id: "pitcher-1",
        firstName: "Mara",
        lastName: "Stone",
        archetype: "ACE",
        backstory: "A cold-weather ace with a split-change nobody likes discussing.",
        baseFameTier: 4,
        primaryPosition: "SP",
        velocity: 82,
        junk: 71,
        accuracy: 76,
        arsenal: ["4F", "SL", "CH"],
      }),
    ],
  ]);
  const teams = new Map<string, Team>([
    [
      "team-away",
      createTeam({
        id: "team-away",
        name: "Away Comets",
        abbreviation: "AWY",
        cityVibe: "A telescope town with brass-band summers",
        era: "CLASSIC_TV",
        backstory: "A barnstorming club that learned to live on close games.",
        ballparkNickname: "The Observatory",
      }),
    ],
    [
      "team-home",
      createTeam({
        id: "team-home",
        name: "Home Meteors",
        abbreviation: "HME",
        cityVibe: "Mill chimneys, river fog, and packed bleachers",
        era: "GOLDEN_AGE",
        backstory: "The old-money club everyone wants to beat.",
      }),
    ],
  ]);
  const recent = createRecentAlmanacEntries("batter-1", "entry");

  return {
    getAtBatEvent: vi.fn(async () => event),
    getGameEvents: vi.fn(async () => [event]),
    getCurrentGame: vi.fn(async () => null),
    getCompletedGame: vi.fn(async () => null),
    getPlayer: vi.fn(async (playerId) => players.get(playerId) ?? null),
    getTeam: vi.fn(async (teamId) => teams.get(teamId) ?? null),
    getLeaguePlayerOverride: vi.fn(async (leagueId, playerId) => {
      if (leagueId === "league-1" && playerId === "batter-1") {
        return {
          id: "league-1::batter-1",
          leagueId,
          playerId,
          overrides: {},
          fameTierOverride: 5,
          lastModified: "2026-04-15T00:00:00.000Z",
        } satisfies LeaguePlayerOverrideRecord;
      }
      return null;
    }),
    getPlayerLegacySummary: vi.fn(async (playerId) =>
      playerId === "batter-1" ? "Sparks has owned late innings all spring." : null,
    ),
    getTeamLegacySummary: vi.fn(async (teamId) =>
      teamId === "team-away" ? "The Comets have become a one-run-game nuisance." : null,
    ),
    getRecentPlayerAlmanac: vi.fn(async (playerId) => (playerId === "batter-1" ? recent : [])),
    getRecentTeamAlmanac: vi.fn(async () => recent),
    ...overrides,
  };
}

describe("buildReporterContext", () => {
  test("builds identity, fame, team, history, current moment, and WPA snapshots", async () => {
    const dataSources = createDataSources();

    const context = await buildReporterContext("game-1", "game-1_7", { dataSources });

    expect(context.batter).toMatchObject({
      id: "batter-1",
      name: "Ivy Sparks",
      nickname: "Fuse",
      nicknames: ["The Fuse"],
      effectiveFame: 5,
      archetype: "SLUGGER",
      baselineBackstory: "A pull hitter whose legend started in a gravel-lot league.",
      signatureMoment: "Cleared the warehouse roof in extras.",
    });
    expect(context.pitcher).toMatchObject({
      id: "pitcher-1",
      name: "Mara Stone",
      effectiveFame: 4,
      archetype: "ACE",
    });
    expect(context.battingTeam).toMatchObject({
      id: "team-away",
      name: "Away Comets",
      era: "CLASSIC_TV",
      cityVibe: "A telescope town with brass-band summers",
      ballparkNickname: "The Observatory",
    });
    expect(context.pitchingTeam).toMatchObject({
      id: "team-home",
      name: "Home Meteors",
      era: "GOLDEN_AGE",
    });
    expect(context.batterLegacySummary).toBe("Sparks has owned late innings all spring.");
    expect(context.battingTeamLegacySummary).toBe("The Comets have become a one-run-game nuisance.");
    expect(context.batterRecentAlmanac).toHaveLength(5);
    expect(context.batterRecentAlmanac.map((entry) => entry.id)).toEqual([
      "entry-6",
      "entry-5",
      "entry-4",
      "entry-3",
      "entry-2",
    ]);
    expect(context.battingTeamRecentAlmanac).toHaveLength(5);
    expect(context.pitchingTeamRecentAlmanac).toHaveLength(5);
    expect(context.gameState).toMatchObject({
      gameId: "game-1",
      atBatId: "game-1_7",
      inning: 8,
      halfInning: "TOP",
      outs: 1,
      bases: { first: null, second: "June Vale", third: null },
      awayScore: 2,
      homeScore: 3,
      battingTeamId: "team-away",
      pitchingTeamId: "team-home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
    });
    expect(context.wpaMoment).toEqual({
      eventId: "game-1_7",
      leverageIndex: 2.25,
      winProbabilityBefore: 0.64,
      winProbabilityAfter: 0.48,
      wpa: 0.16,
    });
    expect(context.dramaticWeight).toBe(2.95);
  });

  test("keeps v1-deferred relationship and rivalry slots inert", async () => {
    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources(),
    });

    expect(context.activeOpposingRelationships).toEqual([]);
    expect(context.activeWithinTeamRelationships).toEqual([]);
    expect(context.homeTeamRivalries).toEqual([]);
    expect(context.awayTeamRivalries).toEqual([]);
    expect(context.teamDnaFacts).toEqual([]);
    expect(context.teamRivalryIntensity).toBe(0);
  });

  test("returns teamRivalryIntensity from the home team's perspective", async () => {
    const teams = new Map<string, Team>([
      [
        "team-away",
        createTeam({
          id: "team-away",
          name: "Away Comets",
        }),
      ],
      [
        "team-home",
        createTeam({
          id: "team-home",
          name: "Home Meteors",
          rivalries: [
            {
              opponentTeamId: "team-away",
              intensity: 7,
              origin: "Division rivals",
            },
          ],
        }),
      ],
    ]);

    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources({
        getTeam: vi.fn(async (teamId) => teams.get(teamId) ?? null),
      }),
    });

    expect(context.teamRivalryIntensity).toBe(7);
    expect(context.homeTeamRivalries).toEqual([
      {
        opponentTeamId: "team-away",
        intensity: 7,
        origin: "Division rivals",
      },
    ]);
  });

  test("returns teamRivalryIntensity as 0 when the home team has no rivalry entry for the matchup", async () => {
    const teams = new Map<string, Team>([
      [
        "team-away",
        createTeam({
          id: "team-away",
          rivalries: [
            {
              opponentTeamId: "team-home",
              intensity: 9,
              origin: "One-sided feud",
            },
          ],
        }),
      ],
      [
        "team-home",
        createTeam({
          id: "team-home",
        }),
      ],
    ]);

    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources({
        getTeam: vi.fn(async (teamId) => teams.get(teamId) ?? null),
      }),
    });

    expect(context.teamRivalryIntensity).toBe(0);
  });

  test("returns teamDnaFacts from the home team's heritageFacts array", async () => {
    const teams = new Map<string, Team>([
      [
        "team-away",
        createTeam({
          id: "team-away",
        }),
      ],
      [
        "team-home",
        createTeam({
          id: "team-home",
          heritageFacts: [
            "Owns the late innings.",
            "Still hangs bunting from the 1948 title run.",
          ],
        }),
      ],
    ]);

    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources({
        getTeam: vi.fn(async (teamId) => teams.get(teamId) ?? null),
      }),
    });

    expect(context.teamDnaFacts).toEqual([
      "Owns the late innings.",
      "Still hangs bunting from the 1948 title run.",
    ]);
  });

  test("returns empty arrays and zero when team metadata is absent", async () => {
    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources(),
    });

    expect(context.teamDnaFacts).toEqual([]);
    expect(context.homeTeamRivalries).toEqual([]);
    expect(context.awayTeamRivalries).toEqual([]);
    expect(context.teamRivalryIntensity).toBe(0);
  });

  test("fetches distinct batting and pitching team almanac entries", async () => {
    const battingTeamEntries = createRecentAlmanacEntries("team-away", "batting-team");
    const pitchingTeamEntries = createRecentAlmanacEntries("team-home", "pitching-team");

    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources({
        getRecentTeamAlmanac: vi.fn(async (teamId) =>
          teamId === "team-away" ? battingTeamEntries : pitchingTeamEntries,
        ),
      }),
    });

    expect(context.battingTeamRecentAlmanac.map((entry) => entry.id)).toEqual([
      "batting-team-6",
      "batting-team-5",
      "batting-team-4",
      "batting-team-3",
      "batting-team-2",
    ]);
    expect(context.pitchingTeamRecentAlmanac.map((entry) => entry.id)).toEqual([
      "pitching-team-6",
      "pitching-team-5",
      "pitching-team-4",
      "pitching-team-3",
      "pitching-team-2",
    ]);
  });

  test("keeps rivalry intensity at 0 for asymmetric away-only rivalry declarations", async () => {
    const teams = new Map<string, Team>([
      [
        "team-away",
        createTeam({
          id: "team-away",
          rivalries: [
            {
              opponentTeamId: "team-home",
              intensity: 8,
              origin: "Still mad about last October",
            },
          ],
        }),
      ],
      [
        "team-home",
        createTeam({
          id: "team-home",
        }),
      ],
    ]);

    const context = await buildReporterContext("game-1", "game-1_7", {
      dataSources: createDataSources({
        getTeam: vi.fn(async (teamId) => teams.get(teamId) ?? null),
      }),
    });

    expect(context.teamRivalryIntensity).toBe(0);
    expect(context.homeTeamRivalries).toEqual([]);
    expect(context.awayTeamRivalries).toEqual([
      {
        opponentTeamId: "team-home",
        intensity: 8,
        origin: "Still mad about last October",
      },
    ]);
  });

  test("falls back to event snapshots when League Builder records are absent", async () => {
    const dataSources = createDataSources({
      getPlayer: vi.fn(async () => null),
      getTeam: vi.fn(async () => null),
      getLeaguePlayerOverride: vi.fn(async () => null),
      getPlayerLegacySummary: vi.fn(async () => null),
      getTeamLegacySummary: vi.fn(async () => null),
      getRecentPlayerAlmanac: vi.fn(async () => []),
      getRecentTeamAlmanac: vi.fn(async () => []),
    });

    const context = await buildReporterContext("game-1", "7", { dataSources });

    expect(context.batter).toMatchObject({
      id: "batter-1",
      name: "Ivy Sparks",
      effectiveFame: 3,
      baselineBackstory: "",
    });
    expect(context.battingTeam).toMatchObject({
      id: "team-away",
      name: "Away Comets",
      baselineBackstory: "",
    });
    expect(context.pitchingTeam).toMatchObject({
      id: "team-home",
      name: "Home Meteors",
      baselineBackstory: "",
    });
    expect(dataSources.getGameEvents).not.toHaveBeenCalled();
  });

  test("resolves by event index when direct at-bat lookup misses", async () => {
    const event = createAtBatEvent({ eventId: "game-1_9", eventIndex: 9 });
    const dataSources = createDataSources({
      getAtBatEvent: vi.fn(async () => null),
      getGameEvents: vi.fn(async () => [event]),
    });

    const context = await buildReporterContext("game-1", "9", { dataSources });

    expect(context.gameState.atBatId).toBe("game-1_9");
    expect(dataSources.getGameEvents).toHaveBeenCalledWith("game-1");
  });

  test("throws a targeted error when the at-bat cannot be resolved", async () => {
    const dataSources = createDataSources({
      getAtBatEvent: vi.fn(async () => null),
      getGameEvents: vi.fn(async () => []),
    });

    await expect(
      buildReporterContext("game-missing", "missing-at-bat", { dataSources }),
    ).rejects.toThrow("Reporter context at-bat not found: game-missing/missing-at-bat");
  });
});
