import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AtBatEvent } from "../eventLog";
import type { CompletedGameRecord } from "../gameStorage";
import type { KblWpaCredit, KblWpaRole } from "../kblWpaAttribution";
import type {
  ManagerDecisionRecord,
  ManagerDeploymentStintRecord,
  ManagerLineupDeltaRecord,
} from "../../types/managerWpa";
import { WPA_MODEL_VERSION } from "../../engines/wpaV2";

const {
  mockGetInstanceGames,
  mockGetGameEvents,
  mockGetGameFieldingEvents,
  mockGetBetweenPlayEvents,
  mockGetGameHeader,
} = vi.hoisted(() => ({
  mockGetInstanceGames: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetGameFieldingEvents: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(),
  mockGetGameHeader: vi.fn(),
}));

vi.mock("../almanacQueries", () => ({
  getInstanceGames: mockGetInstanceGames,
}));

vi.mock("../eventLog", () => ({
  getGameEvents: mockGetGameEvents,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameHeader: mockGetGameHeader,
}));

import {
  buildAllExhibitionTeamImpactLeaderboards,
  buildTeamImpactLeaderboards,
  buildTeamImpactSummaries,
  getInstanceTeamImpactSummaries,
  type TeamImpactGameInput,
  type TeamImpactMode,
  type TeamImpactSummary,
} from "../teamImpact";

describe("teamImpact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInstanceGames.mockResolvedValue([]);
    mockGetGameEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue(null);
  });

  test("elimination run aggregates only its own games", () => {
    const runGame = game({
      gameId: "run-a-1",
      competitionType: "elimination",
      competitionId: "run-a",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const otherRunGame = game({
      gameId: "run-b-1",
      competitionType: "elimination",
      competitionId: "run-b",
      awayTeamId: "gamma",
      awayTeamName: "Gamma",
      homeTeamId: "delta",
      homeTeamName: "Delta",
    });

    const summaries = build("elimination", "run-a", [
      impactGame(runGame, [credit(runGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.3)]),
      impactGame(otherRunGame, [
        credit(otherRunGame, "gamma-bat", "Gamma Bat", "gamma", "batting", 1),
      ]),
    ]);

    expect(summaries.map((summary) => summary.teamId).sort()).toEqual([
      "alpha",
      "beta",
    ]);
    expect(team(summaries, "alpha").playerWpa.total).toBe(0.3);
    expect(summaries.some((summary) => summary.teamId === "gamma")).toBe(false);
  });

  test("exhibition league aggregates only that league's games", () => {
    const leagueGame = game({
      gameId: "league-a-1",
      competitionType: "exhibition",
      leagueId: "league-a",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const otherLeagueGame = game({
      gameId: "league-b-1",
      competitionType: "exhibition",
      leagueId: "league-b",
      awayTeamId: "gamma",
      awayTeamName: "Gamma",
      homeTeamId: "delta",
      homeTeamName: "Delta",
    });
    const nonExhibitionSameLeagueGame = game({
      gameId: "franchise-with-league-a",
      competitionType: "franchise",
      leagueId: "league-a",
      competitionId: "franchise-1",
      awayTeamId: "epsilon",
      awayTeamName: "Epsilon",
      homeTeamId: "zeta",
      homeTeamName: "Zeta",
    });

    const summaries = build("exhibition", "league-a", [
      impactGame(leagueGame, [credit(leagueGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.25)]),
      impactGame(otherLeagueGame, [
        credit(otherLeagueGame, "gamma-bat", "Gamma Bat", "gamma", "batting", 0.75),
      ]),
      impactGame(nonExhibitionSameLeagueGame, [
        credit(
          nonExhibitionSameLeagueGame,
          "epsilon-bat",
          "Epsilon Bat",
          "epsilon",
          "batting",
          1,
        ),
      ]),
    ]);

    expect(summaries.map((summary) => summary.teamId).sort()).toEqual([
      "alpha",
      "beta",
    ]);
    expect(team(summaries, "alpha").playerWpa.total).toBe(0.25);
    expect(summaries.some((summary) => summary.teamId === "gamma")).toBe(false);
    expect(summaries.some((summary) => summary.teamId === "epsilon")).toBe(false);
  });

  test("player role WPA buckets sum correctly by team", () => {
    const fullGame = game();
    const summaries = build("elimination", "run-1", [
      impactGame(fullGame, [
        credit(fullGame, "alpha-two-way", "Alpha Two-Way", "alpha", "batting", 0.2),
        credit(fullGame, "alpha-two-way", "Alpha Two-Way", "alpha", "pitching", 0.1),
        credit(fullGame, "alpha-two-way", "Alpha Two-Way", "alpha", "fielding", 0.03),
        credit(fullGame, "alpha-two-way", "Alpha Two-Way", "alpha", "baserunning", 0.04),
        credit(fullGame, "alpha-two-way", "Alpha Two-Way", "alpha", "catching", 0.02),
      ]),
    ]);

    expect(team(summaries, "alpha").playerWpa).toEqual({
      total: 0.39,
      batting: 0.2,
      pitching: 0.1,
      fielding: 0.03,
      baserunning: 0.04,
      catching: 0.02,
    });
  });

  test("manager value stays separate from player WPA", () => {
    const managerGame = game({
      managerDecisions: [managerDecision("alpha-manager", "alpha", 0.12)],
      managerDeploymentStints: [managerDeployment("alpha-manager", "alpha", 0.08)],
      managerLineupDeltas: [managerLineupDelta("alpha-manager", "alpha", 0.3)],
    });
    const summaries = build("elimination", "run-1", [
      impactGame(managerGame, [
        credit(managerGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.2),
      ]),
    ]);
    const alpha = team(summaries, "alpha");

    expect(alpha.playerWpa.total).toBe(0.2);
    expect(alpha.managerWpa).toEqual({
      tacticalManagerWpa: 0.12,
      deploymentWpa: 0.08,
      lineupDeltaWpa: 0.3,
      managerValue: 0.08,
    });
    expect(alpha.pog.bestManager).toBe(1);
    expect(alpha.playerLeaders.some((player) => player.playerId === "alpha-manager")).toBe(false);
  });

  test("POG points include Overall, role awards, and Best Manager while excluding Team Standout", () => {
    const awardGame = game({
      managerDeploymentStints: [managerDeployment("alpha-manager", "alpha", 0.05)],
      managerLineupDeltas: [managerLineupDelta("alpha-manager", "alpha", 0.05)],
    });
    const summaries = build("elimination", "run-1", [
      impactGame(awardGame, [
        credit(awardGame, "alpha-overall", "Alpha Overall", "alpha", "batting", 0.3),
        credit(awardGame, "alpha-hitter", "Alpha Hitter", "alpha", "batting", 0.2),
        credit(awardGame, "alpha-pitcher", "Alpha Pitcher", "alpha", "pitching", 0.15),
        credit(awardGame, "alpha-runner", "Alpha Runner", "alpha", "baserunning", 0.1),
        credit(awardGame, "alpha-fielder", "Alpha Fielder", "alpha", "fielding", 0.06),
      ]),
    ]);
    const alpha = team(summaries, "alpha");

    expect(alpha.pog.points).toBe(8);
    expect(alpha.pog.overallWins).toBe(1);
    expect(alpha.pog.bestHitter).toBe(1);
    expect(alpha.pog.bestPitcher).toBe(1);
    expect(alpha.pog.bestBaserunner).toBe(1);
    expect(alpha.pog.bestFielder).toBe(1);
    expect(alpha.pog.bestManager).toBe(1);
    expect(alpha.pog.mostDecoratedPlayer).toEqual({
      playerId: "alpha-overall",
      playerName: "Alpha Overall",
      points: 3,
    });
  });

  test("stored-only archived game contributes legacy Overall POG points but no role awards", () => {
    const storedGame = game({
      playersOfTheGame: {
        first: "alpha-legacy",
        second: "beta-runner-up",
      },
      playerStats: {
        "alpha-legacy": playerStat("Alpha Legacy", "alpha"),
      },
    });
    const summaries = build("elimination", "run-1", [
      impactGame(storedGame, [], { eventLogAvailable: false }),
    ]);
    const alpha = team(summaries, "alpha");

    expect(alpha.pog.points).toBe(3);
    expect(alpha.pog.overallWins).toBe(1);
    expect(alpha.pog.bestHitter).toBe(0);
    expect(alpha.dataQuality.storedPogGames).toBe(1);
    expect(player(alpha, "alpha-legacy").pogPoints).toBe(3);
  });

  test("legacy_at_bat_wpa contributes limited overall legacy state but no role awards", () => {
    const legacyGame = game();
    const summaries = build("elimination", "run-1", [
      impactGame(legacyGame, [
        credit(legacyGame, "alpha-legacy", "Alpha Legacy", "alpha", "batting", 0.22, {
          basis: "Archived batting WPA fallback",
          confidence: "low",
        }),
      ]),
    ]);
    const alpha = team(summaries, "alpha");

    expect(alpha.playerWpa.batting).toBe(0.22);
    expect(alpha.pog.points).toBe(3);
    expect(alpha.pog.overallWins).toBe(1);
    expect(alpha.pog.bestHitter).toBe(0);
    expect(alpha.dataQuality.legacyAtBatWpaGames).toBe(1);
    expect(alpha.dataQuality.warnings).toContain(
      "1 game(s) use legacy at-bat WPA fallback; role awards are limited.",
    );
  });

  test("event-log load failure for one game produces partial data instead of failing the instance", async () => {
    const storedGame = game({
      gameId: "run-fail-1",
      competitionId: "run-fail",
      playersOfTheGame: { first: "alpha-stored" },
      playerStats: {
        "alpha-stored": playerStat("Alpha Stored", "alpha"),
      },
    });
    mockGetInstanceGames.mockResolvedValue([storedGame]);
    mockGetGameEvents.mockRejectedValue(new Error("IndexedDB unavailable"));

    const summaries = await getInstanceTeamImpactSummaries("elimination", "run-fail");
    const alpha = team(summaries, "alpha");

    expect(alpha.pog.points).toBe(3);
    expect(alpha.dataQuality.storedPogGames).toBe(1);
    expect(alpha.dataQuality.eventLogFailedGames).toBe(1);
    expect(alpha.dataQuality.warnings).toContain(
      "1 game(s) could not load event logs; impact is partial.",
    );
  });

  test("rankings and averages are stable across teams with different game counts", () => {
    const gameOne = game({
      gameId: "rank-1",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const gameTwo = game({
      gameId: "rank-2",
      awayTeamId: "beta",
      awayTeamName: "Beta",
      homeTeamId: "gamma",
      homeTeamName: "Gamma",
    });
    const summaries = build("elimination", "run-1", [
      impactGame(gameOne, [credit(gameOne, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.4)]),
      impactGame(gameTwo, [credit(gameTwo, "beta-bat", "Beta Bat", "beta", "batting", 0.2)]),
    ]);

    expect(team(summaries, "alpha").benchmarks.totalPlayerWpaRank).toBe(1);
    expect(team(summaries, "beta").benchmarks.totalPlayerWpaRank).toBe(2);
    expect(team(summaries, "gamma").benchmarks.totalPlayerWpaRank).toBe(3);
    expect(team(summaries, "alpha").benchmarks.instanceAverageTotalPlayerWpa).toBe(0.2);
    expect(team(summaries, "beta").benchmarks.instanceAverageTotalPlayerWpa).toBe(0.2);
    expect(team(summaries, "alpha").benchmarks.perGameTotalPlayerWpa).toBe(0.4);
    expect(team(summaries, "beta").benchmarks.perGameTotalPlayerWpa).toBe(0.1);
    expect(team(summaries, "alpha").benchmarks.identityLabel).toBe("Lineup carried them");
  });

  test("player leaders include total WPA, role split, POG points, and per-game WPA", () => {
    const leaderGame = game();
    const summaries = build("elimination", "run-1", [
      impactGame(leaderGame, [
        credit(leaderGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.2),
        credit(leaderGame, "alpha-star", "Alpha Star", "alpha", "fielding", 0.05),
        credit(leaderGame, "alpha-arm", "Alpha Arm", "alpha", "pitching", 0.1),
      ]),
    ]);
    const alpha = team(summaries, "alpha");

    expect(player(alpha, "alpha-star")).toMatchObject({
      playerId: "alpha-star",
      playerName: "Alpha Star",
      games: 1,
      wpa: {
        total: 0.25,
        batting: 0.2,
        pitching: 0,
        fielding: 0.05,
        baserunning: 0,
        catching: 0,
      },
      pogPoints: 3,
      perGameWpa: 0.25,
      awards: {
        overall: 1,
        bestHitter: 0,
        bestPitcher: 0,
        bestBaserunner: 0,
        bestFielder: 0,
      },
    });
    expect(player(alpha, "alpha-arm")).toMatchObject({
      pogPoints: 1,
      perGameWpa: 0.1,
      awards: {
        bestPitcher: 1,
      },
    });
  });

  test("player leader includes biggest positive play from real event and credit data", () => {
    const playGame = game({ gameId: "play-positive" });
    const event = atBat(playGame, "play-positive-1", {
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "HR",
      inning: 8,
      halfInning: "BOTTOM",
      leverageIndex: 2.2,
      isClutch: true,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        playGame,
        [
          credit(playGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.24, {
            eventId: event.eventId,
          }),
          credit(playGame, "alpha-star", "Alpha Star", "alpha", "fielding", 0.03, {
            eventId: "unrelated-fielding-credit",
          }),
        ],
        { atBatEvents: [event] },
      ),
    ]);

    expect(player(team(summaries, "alpha"), "alpha-star").biggestPositivePlay).toEqual({
      gameId: playGame.gameId,
      eventId: event.eventId,
      value: 0.24,
      label: "Alpha Star HR vs Beta Pitcher",
      inningLabel: "Bot 8",
      leverageIndex: 2.2,
    });
  });

  test("player leader includes biggest negative play from real event and credit data", () => {
    const playGame = game({ gameId: "play-negative" });
    const event = atBat(playGame, "play-negative-1", {
      batterId: "beta-slugger",
      batterName: "Beta Slugger",
      batterTeamId: "beta",
      pitcherId: "alpha-arm",
      pitcherName: "Alpha Arm",
      pitcherTeamId: "alpha",
      result: "HR",
      inning: 9,
      halfInning: "TOP",
      leverageIndex: 1.8,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        playGame,
        [
          credit(playGame, "alpha-arm", "Alpha Arm", "alpha", "pitching", -0.19, {
            eventId: event.eventId,
          }),
          credit(playGame, "alpha-arm", "Alpha Arm", "alpha", "pitching", -0.04, {
            eventId: "play-negative-smaller",
          }),
        ],
        { atBatEvents: [event] },
      ),
    ]);

    expect(player(team(summaries, "alpha"), "alpha-arm").biggestNegativePlay).toEqual({
      gameId: playGame.gameId,
      eventId: event.eventId,
      value: -0.19,
      label: "Beta Slugger HR vs Alpha Arm",
      inningLabel: "Top 9",
      leverageIndex: 1.8,
    });
  });

  test("highLeverageWpa sums only credits tied to high-leverage or clutch at-bat events", () => {
    const leverageGame = game({ gameId: "leverage-sum" });
    const highEvent = atBat(leverageGame, "leverage-high", {
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "2B",
      leverageIndex: 1.7,
    });
    const clutchEvent = atBat(leverageGame, "leverage-clutch", {
      eventIndex: 2,
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "1B",
      leverageIndex: 1.1,
      isClutch: true,
    });
    const lowEvent = atBat(leverageGame, "leverage-low", {
      eventIndex: 3,
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "BB",
      leverageIndex: 1.2,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        leverageGame,
        [
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.11, {
            eventId: highEvent.eventId,
          }),
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.07, {
            eventId: clutchEvent.eventId,
          }),
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.05, {
            eventId: lowEvent.eventId,
          }),
        ],
        { atBatEvents: [highEvent, clutchEvent, lowEvent] },
      ),
    ]);

    expect(player(team(summaries, "alpha"), "alpha-star").highLeverageWpa).toBe(0.18);
  });

  test("normal and low-leverage credits do not inflate highLeverageWpa", () => {
    const leverageGame = game({ gameId: "leverage-low-only" });
    const normalEvent = atBat(leverageGame, "normal-event", {
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "1B",
      leverageIndex: 1.49,
    });
    const lowEvent = atBat(leverageGame, "low-event", {
      eventIndex: 2,
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "GO",
      leverageIndex: 0.7,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        leverageGame,
        [
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.12, {
            eventId: normalEvent.eventId,
          }),
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", -0.04, {
            eventId: lowEvent.eventId,
          }),
        ],
        { atBatEvents: [normalEvent, lowEvent] },
      ),
    ]);

    expect(player(team(summaries, "alpha"), "alpha-star").highLeverageWpa).toBe(0);
  });

  test("mapped labelable event with unknown leverage has biggest play but no highLeverageWpa", () => {
    const leverageGame = game({ gameId: "leverage-unknown" });
    const event = atBat(leverageGame, "unknown-leverage-event", {
      batterId: "alpha-star",
      batterName: "Alpha Star",
      result: "2B",
      leverageIndex: Number.NaN,
      isClutch: false,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        leverageGame,
        [
          credit(leverageGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.16, {
            eventId: event.eventId,
          }),
        ],
        { atBatEvents: [event] },
      ),
    ]);
    const leader = player(team(summaries, "alpha"), "alpha-star");

    expect(leader.biggestPositivePlay).toEqual({
      gameId: leverageGame.gameId,
      eventId: event.eventId,
      value: 0.16,
      label: "Alpha Star 2B vs Beta Pitcher",
      inningLabel: "Bot 7",
    });
    expect(leader).not.toHaveProperty("highLeverageWpa");
  });

  test("missing event metadata does not invent biggest play labels", () => {
    const metadataGame = game({ gameId: "metadata-missing" });
    const event = atBat(metadataGame, "metadata-missing-1", {
      batterId: "alpha-star",
      batterName: "",
      result: "HR",
      leverageIndex: 2.4,
      isClutch: true,
    });
    const summaries = build("elimination", "run-1", [
      impactGame(
        metadataGame,
        [
          credit(metadataGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.2, {
            eventId: event.eventId,
          }),
        ],
        { atBatEvents: [event] },
      ),
    ]);
    const leader = player(team(summaries, "alpha"), "alpha-star");

    expect(leader.biggestPositivePlay).toBeUndefined();
    expect(leader.biggestNegativePlay).toBeUndefined();
    expect(leader.highLeverageWpa).toBeUndefined();
  });

  test("team WPA leaderboard orders by total player WPA with deterministic tie-breakers", () => {
    const tieGame = game({
      gameId: "leaderboard-tie",
      awayTeamId: "beta",
      awayTeamName: "Beta",
      homeTeamId: "alpha",
      homeTeamName: "Alpha",
    });
    const summaries = build("elimination", "run-1", [
      impactGame(tieGame, [
        credit(tieGame, "beta-bat", "Beta Bat", "beta", "batting", 0.3),
        credit(tieGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.3),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.teamWpaLeaders.map((entry) => ({
      rank: entry.rank,
      teamId: entry.teamId,
      value: entry.value,
      perGameWpa: entry.perGameWpa,
      identityLabel: entry.identityLabel,
    }))).toEqual([
      {
        rank: 1,
        teamId: "alpha",
        value: 0.3,
        perGameWpa: 0.3,
        identityLabel: "Lineup carried them",
      },
      {
        rank: 2,
        teamId: "beta",
        value: 0.3,
        perGameWpa: 0.3,
        identityLabel: "Lineup carried them",
      },
    ]);
  });

  test("team POG points leaderboard excludes Team Standout points", () => {
    const pogGame = game({ gameId: "leaderboard-pog" });
    const summaries = build("elimination", "run-1", [
      impactGame(pogGame, [
        credit(pogGame, "alpha-overall", "Alpha Overall", "alpha", "batting", 0.3),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.teamPogPointsLeaders).toMatchObject([
      {
        rank: 1,
        teamId: "alpha",
        points: 3,
        overallWins: 1,
        bestManagerWins: 0,
        mostDecoratedPlayer: {
          playerId: "alpha-overall",
          playerName: "Alpha Overall",
          points: 3,
        },
      },
    ]);
    expect(leaderboards.overallPogLeaders).toMatchObject([
      {
        rank: 1,
        playerId: "alpha-overall",
        playerName: "Alpha Overall",
        teamId: "alpha",
        teamName: "Alpha",
        count: 1,
        pogPoints: 3,
      },
    ]);
  });

  test("player total WPA leaderboard includes role split and per-game WPA", () => {
    const gameOne = game({ gameId: "player-wpa-1" });
    const gameTwo = game({ gameId: "player-wpa-2" });
    const summaries = build("elimination", "run-1", [
      impactGame(gameOne, [
        credit(gameOne, "alpha-star", "Alpha Star", "alpha", "batting", 0.2),
        credit(gameOne, "alpha-star", "Alpha Star", "alpha", "fielding", 0.05),
      ]),
      impactGame(gameTwo, [
        credit(gameTwo, "alpha-star", "Alpha Star", "alpha", "pitching", 0.15),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);
    const leader = leaderboards.playerTotalWpaLeaders[0];

    expect(leader).toMatchObject({
      rank: 1,
      playerId: "alpha-star",
      teamId: "alpha",
      teamName: "Alpha",
      games: 2,
      value: 0.4,
      perGameWpa: 0.2,
      pogPoints: 6,
      roleSplit: {
        total: 0.4,
        batting: 0.2,
        pitching: 0.15,
        fielding: 0.05,
        baserunning: 0,
        catching: 0,
      },
    });
  });

  test("player POG points leaderboard includes Overall and role award counts", () => {
    const awardsGame = game({ gameId: "player-pog-awards" });
    const summaries = build("elimination", "run-1", [
      impactGame(awardsGame, [
        credit(awardsGame, "alpha-star", "Alpha Star", "alpha", "batting", 0.25),
        credit(awardsGame, "alpha-arm", "Alpha Arm", "alpha", "pitching", 0.12),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.playerPogPointsLeaders).toMatchObject([
      {
        rank: 1,
        playerId: "alpha-star",
        points: 3,
        awardCounts: {
          overall: 1,
          bestHitter: 0,
          bestPitcher: 0,
          bestBaserunner: 0,
          bestFielder: 0,
        },
      },
      {
        rank: 2,
        playerId: "alpha-arm",
        points: 1,
        awardCounts: {
          overall: 0,
          bestPitcher: 1,
        },
      },
    ]);
  });

  test("award-specific player leaderboards sort deterministically", () => {
    const alphaHitterGame = game({
      gameId: "award-sort-alpha",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const betaHitterGame = game({
      gameId: "award-sort-beta",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const summaries = build("elimination", "run-1", [
      impactGame(alphaHitterGame, [
        credit(alphaHitterGame, "beta-overall", "Beta Overall", "beta", "pitching", 0.4),
        credit(alphaHitterGame, "alpha-tie-hitter", "Tie Hitter", "alpha", "batting", 0.1),
      ]),
      impactGame(betaHitterGame, [
        credit(betaHitterGame, "alpha-overall", "Alpha Overall", "alpha", "pitching", 0.4),
        credit(betaHitterGame, "beta-tie-hitter", "Tie Hitter", "beta", "batting", 0.1),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.bestHitterLeaders.map((entry) => ({
      rank: entry.rank,
      playerId: entry.playerId,
      playerName: entry.playerName,
      teamName: entry.teamName,
      count: entry.count,
      pogPoints: entry.pogPoints,
    }))).toEqual([
      {
        rank: 1,
        playerId: "alpha-tie-hitter",
        playerName: "Tie Hitter",
        teamName: "Alpha",
        count: 1,
        pogPoints: 1,
      },
      {
        rank: 2,
        playerId: "beta-tie-hitter",
        playerName: "Tie Hitter",
        teamName: "Beta",
        count: 1,
        pogPoints: 1,
      },
    ]);
  });

  test("role leaders use real role buckets and defense combines fielding plus catching", () => {
    const roleGame = game({ gameId: "role-leaders" });
    const summaries = build("elimination", "run-1", [
      impactGame(roleGame, [
        credit(roleGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.18),
        credit(roleGame, "alpha-arm", "Alpha Arm", "alpha", "pitching", 0.14),
        credit(roleGame, "alpha-glove", "Alpha Glove", "alpha", "fielding", 0.03),
        credit(roleGame, "alpha-glove", "Alpha Glove", "alpha", "catching", 0.04),
        credit(roleGame, "beta-runner", "Beta Runner", "beta", "baserunning", 0.09),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.roleWpaLeaders.batting[0]).toMatchObject({
      role: "batting",
      playerId: "alpha-bat",
      value: 0.18,
    });
    expect(leaderboards.roleWpaLeaders.pitching[0]).toMatchObject({
      role: "pitching",
      playerId: "alpha-arm",
      value: 0.14,
    });
    expect(leaderboards.roleWpaLeaders.defense[0]).toMatchObject({
      role: "defense",
      playerId: "alpha-glove",
      value: 0.07,
      roleSplit: {
        fielding: 0.03,
        catching: 0.04,
      },
    });
    expect(leaderboards.roleWpaLeaders.baserunning[0]).toMatchObject({
      role: "baserunning",
      playerId: "beta-runner",
      value: 0.09,
    });
  });

  test("stored-only games affect POG points leaders but not WPA or role leaders", () => {
    const storedGame = game({
      gameId: "leaderboard-stored",
      playersOfTheGame: {
        first: "alpha-legacy",
      },
      playerStats: {
        "alpha-legacy": playerStat("Alpha Legacy", "alpha"),
      },
    });
    const summaries = build("elimination", "run-1", [
      impactGame(storedGame, [], { eventLogAvailable: false }),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.teamPogPointsLeaders[0]).toMatchObject({
      teamId: "alpha",
      points: 3,
    });
    expect(leaderboards.playerPogPointsLeaders[0]).toMatchObject({
      playerId: "alpha-legacy",
      points: 3,
    });
    expect(leaderboards.overallPogLeaders[0]).toMatchObject({
      playerId: "alpha-legacy",
      count: 1,
      pogPoints: 3,
    });
    expect(leaderboards.bestHitterLeaders).toEqual([]);
    expect(leaderboards.bestPitcherLeaders).toEqual([]);
    expect(leaderboards.bestBaserunnerLeaders).toEqual([]);
    expect(leaderboards.bestFielderLeaders).toEqual([]);
    expect(leaderboards.teamWpaLeaders).toEqual([]);
    expect(leaderboards.playerTotalWpaLeaders).toEqual([]);
    expect(leaderboards.roleWpaLeaders.batting).toEqual([]);
  });

  test("legacy at-bat fallback does not create role leaders", () => {
    const legacyGame = game({ gameId: "leaderboard-legacy" });
    const summaries = build("elimination", "run-1", [
      impactGame(legacyGame, [
        credit(legacyGame, "alpha-legacy", "Alpha Legacy", "alpha", "batting", 0.22, {
          basis: "Archived batting WPA fallback",
          confidence: "low",
        }),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.playerTotalWpaLeaders[0]).toMatchObject({
      playerId: "alpha-legacy",
      value: 0.22,
    });
    expect(leaderboards.overallPogLeaders[0]).toMatchObject({
      playerId: "alpha-legacy",
      count: 1,
      pogPoints: 3,
    });
    expect(leaderboards.bestHitterLeaders).toEqual([]);
    expect(leaderboards.bestPitcherLeaders).toEqual([]);
    expect(leaderboards.bestBaserunnerLeaders).toEqual([]);
    expect(leaderboards.bestFielderLeaders).toEqual([]);
    expect(leaderboards.roleWpaLeaders.batting).toEqual([]);
    expect(leaderboards.roleWpaLeaders.defense).toEqual([]);
    expect(leaderboards.dataQuality.legacyAtBatWpaTeamGames).toBe(2);
  });

  test("Manager Value team leaderboard remains separate from player WPA", () => {
    const managerOnlyGame = game({
      gameId: "leaderboard-manager",
      managerDecisions: [managerDecision("alpha-manager", "alpha", 0.12)],
      managerDeploymentStints: [managerDeployment("alpha-manager", "alpha", 0.08)],
      managerLineupDeltas: [managerLineupDelta("alpha-manager", "alpha", 0.3)],
    });
    const summaries = build("elimination", "run-1", [
      impactGame(managerOnlyGame, [
        credit(managerOnlyGame, "beta-bat", "Beta Bat", "beta", "batting", 0.2),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries);

    expect(leaderboards.managerValueTeamLeaders[0]).toMatchObject({
      teamId: "alpha",
      value: 0.08,
      bestManagerWins: 1,
      managerWpa: {
        tacticalManagerWpa: 0.12,
        deploymentWpa: 0.08,
        lineupDeltaWpa: 0.3,
        managerValue: 0.08,
      },
    });
    expect(leaderboards.bestManagerLeaders[0]).toMatchObject({
      teamId: "alpha",
      teamName: "Alpha",
      count: 1,
      managerValue: 0.08,
    });
    expect(leaderboards.teamWpaLeaders[0]).toMatchObject({
      teamId: "beta",
      value: 0.2,
    });
    expect(leaderboards.playerTotalWpaLeaders.some((entry) => entry.playerId === "alpha-manager")).toBe(false);
    expect(leaderboards.playerPogPointsLeaders.some((entry) => entry.playerId === "alpha-manager")).toBe(false);
    expect(leaderboards.overallPogLeaders.some((entry) => entry.playerId === "alpha-manager")).toBe(false);
  });

  test("limit parameter is respected across leaderboard groups", () => {
    const gameOne = game({
      gameId: "limit-1",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const gameTwo = game({
      gameId: "limit-2",
      awayTeamId: "gamma",
      awayTeamName: "Gamma",
      homeTeamId: "delta",
      homeTeamName: "Delta",
    });
    const summaries = build("elimination", "run-1", [
      impactGame(gameOne, [
        credit(gameOne, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.4),
        credit(gameOne, "beta-bat", "Beta Bat", "beta", "batting", 0.3),
      ]),
      impactGame(gameTwo, [
        credit(gameTwo, "gamma-bat", "Gamma Bat", "gamma", "batting", 0.2),
        credit(gameTwo, "delta-bat", "Delta Bat", "delta", "batting", 0.1),
      ]),
    ]);

    const leaderboards = buildTeamImpactLeaderboards(summaries, 1);

    expect(leaderboards.teamWpaLeaders).toHaveLength(1);
    expect(leaderboards.teamPogPointsLeaders).toHaveLength(1);
    expect(leaderboards.playerTotalWpaLeaders).toHaveLength(1);
    expect(leaderboards.playerPogPointsLeaders).toHaveLength(1);
    expect(leaderboards.overallPogLeaders).toHaveLength(1);
    expect(leaderboards.bestHitterLeaders).toHaveLength(1);
    expect(leaderboards.roleWpaLeaders.batting).toHaveLength(1);
  });

  test("all-exhibition leaderboard helper groups only exhibition-like games by real league scope", () => {
    const leagueAGame = game({
      gameId: "all-exhibition-a",
      competitionType: "exhibition",
      leagueId: "league-a",
      awayTeamId: "alpha",
      awayTeamName: "Alpha",
      homeTeamId: "beta",
      homeTeamName: "Beta",
    });
    const leagueBGame = game({
      gameId: "all-exhibition-b",
      competitionType: "exhibition",
      leagueId: "league-b",
      awayTeamId: "gamma",
      awayTeamName: "Gamma",
      homeTeamId: "delta",
      homeTeamName: "Delta",
    });
    const franchiseSameLeague = game({
      gameId: "all-exhibition-franchise",
      competitionType: "franchise",
      leagueId: "league-a",
      awayTeamId: "epsilon",
      awayTeamName: "Epsilon",
      homeTeamId: "zeta",
      homeTeamName: "Zeta",
    });

    const leaderboards = buildAllExhibitionTeamImpactLeaderboards([
      impactGame(leagueAGame, [
        credit(leagueAGame, "alpha-bat", "Alpha Bat", "alpha", "batting", 0.25),
      ]),
      impactGame(leagueBGame, [
        credit(leagueBGame, "gamma-bat", "Gamma Bat", "gamma", "batting", 0.35),
      ]),
      impactGame(franchiseSameLeague, [
        credit(franchiseSameLeague, "epsilon-bat", "Epsilon Bat", "epsilon", "batting", 1),
      ]),
    ]);

    expect(leaderboards.teamWpaLeaders.map((entry) => entry.teamId)).toEqual([
      "gamma",
      "alpha",
      "beta",
      "delta",
    ]);
    expect(leaderboards.teamWpaLeaders.some((entry) => entry.teamId === "epsilon")).toBe(false);
  });
});

function build(
  mode: TeamImpactMode,
  instanceId: string,
  games: TeamImpactGameInput[],
): TeamImpactSummary[] {
  return buildTeamImpactSummaries({ mode, instanceId, games });
}

function impactGame(
  completedGame: CompletedGameRecord,
  kblWpaCredits: KblWpaCredit[],
  options: Partial<TeamImpactGameInput> = {},
): TeamImpactGameInput {
  return {
    game: completedGame,
    kblWpaCredits,
    eventLogAvailable: true,
    ...options,
  };
}

function game(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: "game-1",
    date: 1,
    competitionType: "elimination",
    competitionId: "run-1",
    awayTeamId: "alpha",
    awayTeamName: "Alpha",
    homeTeamId: "beta",
    homeTeamName: "Beta",
    finalScore: { away: 1, home: 0 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  } as CompletedGameRecord;
}

function credit(
  completedGame: CompletedGameRecord,
  playerId: string,
  playerName: string,
  teamId: string,
  role: KblWpaRole,
  wpa: number,
  overrides: Partial<KblWpaCredit> = {},
): KblWpaCredit {
  return {
    eventId: `${completedGame.gameId}-${playerId}-${role}`,
    source: "at_bat",
    playerId,
    playerName,
    teamId,
    role,
    wpa,
    confidence: "high",
    basis: "KBL WPA",
    allocationMode: "ratio",
    ...overrides,
  };
}

function atBat(
  completedGame: CompletedGameRecord,
  eventId: string,
  overrides: Partial<AtBatEvent> = {},
): AtBatEvent {
  return {
    eventId,
    gameId: completedGame.gameId,
    eventIndex: 1,
    timestamp: 1,
    batterId: "alpha-bat",
    batterName: "Alpha Bat",
    batterTeamId: "alpha",
    pitcherId: "beta-pitcher",
    pitcherName: "Beta Pitcher",
    pitcherTeamId: "beta",
    result: "1B",
    rbiCount: 0,
    runsScored: 0,
    inning: 7,
    halfInning: "BOTTOM",
    outs: 1,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    wpaModelVersion: WPA_MODEL_VERSION,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

function playerStat(playerName: string, teamId: string) {
  return {
    playerName,
    teamId,
  } as CompletedGameRecord["playerStats"][string];
}

function managerDecision(
  managerId: string,
  teamId: string,
  managerWpa: number,
): ManagerDecisionRecord {
  return {
    decisionId: `${teamId}-decision`,
    gameId: "game-1",
    managerId,
    teamId,
    opponentTeamId: "beta",
    decisionType: "pinch_hitter",
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 7,
    half: "bottom",
    outs: 1,
    baseState: "---",
    scoreDifferentialForTeam: 0,
    linkedEventIds: [],
    involvedPlayerIds: [],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.5 + managerWpa,
    managerWpa,
    resolved: true,
    displayTitle: "Pinch hitter",
    displaySummary: "Pinch hitter",
    derivation: {
      derivedFromEventIds: [],
      derivedFromFields: [],
      manuallyPinned: false,
      stale: false,
    },
  };
}

function managerDeployment(
  managerId: string,
  teamId: string,
  managerDeploymentWpa: number,
): ManagerDeploymentStintRecord {
  return {
    stintId: `${teamId}-deployment`,
    gameId: "game-1",
    managerId,
    teamId,
    deploymentRole: "pinch_hitter_active",
    playerId: `${teamId}-bench`,
    sourceEventId: "bp-1",
    openedAtEventIndex: 1,
    tacticalExclusionEventIds: [],
    closedAtEventId: "ab-1",
    linkedEventIds: [],
    rawLinkedWpa: managerDeploymentWpa,
    managerShare: 1,
    managerDeploymentWpa,
    cap: 1,
    confidence: "high",
  };
}

function managerLineupDelta(
  managerId: string,
  teamId: string,
  managerWpa: number,
): ManagerLineupDeltaRecord {
  return {
    decisionId: `${teamId}-lineup`,
    gameId: "game-1",
    managerId,
    teamId,
    decisionType: "lineup_construction",
    inferenceMethod: "automatic",
    starterPlayerId: `${teamId}-starter`,
    battingOrderSlot: 1,
    defensivePosition: "SS",
    starterRole: "position_player",
    actualPlayerKblWpa: managerWpa,
    replacementExpectedKblWpa: 0,
    rawPerformanceDelta: managerWpa,
    managerShare: 1,
    managerWpa,
  };
}

function team(summaries: TeamImpactSummary[], teamId: string): TeamImpactSummary {
  const summary = summaries.find((entry) => entry.teamId === teamId);
  expect(summary).toBeDefined();
  return summary!;
}

function player(summary: TeamImpactSummary, playerId: string) {
  const leader = summary.playerLeaders.find((entry) => entry.playerId === playerId);
  expect(leader).toBeDefined();
  return leader!;
}
