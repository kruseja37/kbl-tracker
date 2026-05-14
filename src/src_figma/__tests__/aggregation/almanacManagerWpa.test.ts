import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockGetAllCanonicalPlayers,
  mockGetAllCompletedGames,
  mockGetGameEvents,
} = vi.hoisted(() => ({
  mockGetAllCanonicalPlayers: vi.fn().mockResolvedValue([]),
  mockGetAllCompletedGames: vi.fn(),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../utils/gameStorage", () => ({
  getAllCompletedGames: mockGetAllCompletedGames,
  resolveExhibitionLeagueId: (game: {
    leagueId?: string;
    competitionId?: string;
    competitionType?: string;
  }) =>
    game.leagueId ??
    (game.competitionType === "exhibition" || !game.competitionType
      ? game.competitionId
      : undefined),
}));

vi.mock("../../../utils/almanacStorage", () => ({
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
}));

vi.mock("../../../utils/eventLog", () => ({
  getGameEvents: mockGetGameEvents,
}));

import type { CompletedGameRecord } from "../../../utils/gameStorage";
import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
  ManagerProfile,
} from "../../../types/managerWpa";
import {
  aggregateCommittedManagerAlmanac,
  buildManagerAlmanacLeaderboards,
  getExhibitionBattingLeaders,
  getManagerAlmanacAggregates,
  getManagerAlmanacLeaderboards,
} from "../../../utils/almanacQueries";

function playerLine(playerName: string, teamId: string) {
  return {
    playerName,
    teamId,
    pa: 4,
    ab: 4,
    h: 2,
    singles: 2,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 1,
    r: 1,
    bb: 0,
    hbp: 0,
    k: 1,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
  };
}

function createDecision(
  overrides: Partial<ManagerDecisionRecord> = {},
): ManagerDecisionRecord {
  return {
    decisionId: overrides.decisionId ?? "game-1:away:steal",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    opponentTeamId: overrides.opponentTeamId ?? "home",
    decisionType: overrides.decisionType ?? "steal_send",
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 6,
    half: "top",
    outs: 1,
    baseState: "1--",
    scoreDifferentialForTeam: 0,
    leverageIndex: 1.8,
    decisionEventId: "event-1",
    linkedEventIds: ["event-1"],
    involvedPlayerIds: ["runner-1"],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.7,
    managerWpa: 0.2,
    rawWindowWpa: 0.2,
    managerShare: 1,
    resolved: true,
    resolvedAtEventId: "event-2",
    displayTitle: "Steal send",
    displaySummary: "Sent the runner",
    derivation: {
      derivedFromEventIds: ["event-1"],
      derivedFromFields: ["runnerAction"],
      manuallyPinned: false,
      stale: false,
    },
    ...overrides,
  };
}

function createLineupDelta(
  overrides: Partial<ManagerLineupDeltaRecord> = {},
): ManagerLineupDeltaRecord {
  return {
    decisionId: overrides.decisionId ?? "game-1:away:lineup",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    decisionType: "lineup_construction",
    inferenceMethod: "automatic",
    confidence: "low",
    starterPlayerId: "starter-1",
    starterPlayerName: "Starter One",
    battingOrderSlot: 1,
    defensivePosition: "SS",
    starterRole: "position_player",
    actualPlayerKblWpa: 0.4,
    replacementExpectedKblWpa: 0.05,
    replacementBaselineSource: "optimal_lineup_v2",
    replacementBaselineConfidence: "medium",
    rawPerformanceDelta: 0.4,
    managerShare: 0.25,
    managerWpa: 0.1,
    ...overrides,
  };
}

function createDeploymentStint(
  overrides: Partial<ManagerDeploymentStintRecord> = {},
): ManagerDeploymentStintRecord {
  return {
    stintId: overrides.stintId ?? "game-1:away:deployment",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    deploymentRole: overrides.deploymentRole ?? "pinch_hitter_remaining",
    playerId: "bench-1",
    playerName: "Bench One",
    sourceEventId: "bp-1",
    openedAtEventIndex: 1,
    tacticalExclusionEventIds: ["event-1"],
    closeReason: "game_end",
    linkedEventIds: ["event-2"],
    rawLinkedWpa: 0.2,
    managerShare: 0.15,
    managerDeploymentWpa: 0.03,
    cap: 0.15,
    confidence: "medium",
    ...overrides,
  };
}

function createGame(
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return {
    gameId: overrides.gameId ?? "game-1",
    date: overrides.date ?? Date.UTC(2026, 4, 11),
    competitionType: overrides.competitionType ?? "exhibition",
    competitionId: overrides.competitionId ?? "league-a",
    leagueId: overrides.leagueId ?? "league-a",
    competitionName: overrides.competitionName,
    seasonId: overrides.seasonId,
    awayTeamId: overrides.awayTeamId ?? "away",
    awayTeamName: overrides.awayTeamName ?? "Away Club",
    homeTeamId: overrides.homeTeamId ?? "home",
    homeTeamName: overrides.homeTeamName ?? "Home Club",
    finalScore: overrides.finalScore ?? { away: 5, home: 3 },
    innings: overrides.innings ?? 9,
    fameEvents: overrides.fameEvents ?? [],
    playerStats:
      overrides.playerStats ?? {
        "player-one": playerLine("Player One", overrides.awayTeamId ?? "away"),
      },
    pitcherGameStats: overrides.pitcherGameStats ?? [],
    activityLog: overrides.activityLog,
    managerDecisions: overrides.managerDecisions,
    managerDeploymentStints: overrides.managerDeploymentStints,
    managerLineupDeltas: overrides.managerLineupDeltas,
  } as CompletedGameRecord;
}

const profile: ManagerProfile = {
  managerId: "away-manager",
  displayName: "Casey Strategy",
  createdByUser: true,
  defaultManager: false,
};

describe("Almanac Manager WPA aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCanonicalPlayers.mockResolvedValue([]);
  });

  test("aggregates committed manager decisions and lineup deltas", () => {
    const aggregates = aggregateCommittedManagerAlmanac(
      [
        createGame({
          managerDecisions: [
            createDecision({ managerWpa: 0.2 }),
            createDecision({
              decisionId: "game-1:away:bunt",
              decisionType: "bunt_call",
              managerWpa: undefined,
              rawWindowWpa: undefined,
              teamWinProbabilityAfter: undefined,
              resolved: false,
              resolvedAtEventId: undefined,
            }),
            createDecision({
              decisionId: "game-1:home:pitching",
              managerId: "home-manager",
              teamId: "home",
              opponentTeamId: "away",
              decisionType: "pitching_change",
              displayTitle: "Pitching change",
              managerWpa: -0.12,
            }),
          ],
          managerDeploymentStints: [
            createDeploymentStint({ managerDeploymentWpa: 0.03 }),
          ],
          managerLineupDeltas: [
            createLineupDelta({ managerWpa: 0.075 }),
            createLineupDelta({
              decisionId: "game-1:home:lineup",
              managerId: "home-manager",
              teamId: "home",
              managerWpa: -0.025,
            }),
          ],
        }),
      ],
      {},
      [profile],
    );

    const away = aggregates.find((entry) => entry.managerId === "away-manager");
    expect(away).toMatchObject({
      managerName: "Casey Strategy",
      gamesManaged: 1,
      wins: 1,
      losses: 0,
      tacticalManagerWpa: 0.2,
      deploymentWpa: 0.03,
      lineupDeltaWpa: 0.075,
      managerValue: 0.305,
      decisionCount: 4,
      tacticalDecisionCount: 2,
      deploymentStintCount: 1,
      lineupDecisionCount: 1,
      resolvedDecisionCount: 1,
      pendingDecisionCount: 1,
    });
    expect(away?.bestDecision).toMatchObject({
      title: "Steal send",
      value: 0.2,
    });
    expect(away?.tendencies.stealRate).toBe(0.5);
    expect(away?.tendencies.buntRate).toBe(0.5);
    expect(away?.tendencies.lineupConstructionRate).toBe(0.333);

    const home = aggregates.find((entry) => entry.managerId === "home-manager");
    expect(home).toMatchObject({
      managerName: "Home Club Manager",
      tacticalManagerWpa: -0.12,
      deploymentWpa: 0,
      lineupDeltaWpa: -0.025,
      managerValue: -0.145,
    });
  });

  test("does not lazily derive Manager WPA from games without committed manager records", async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      createGame({
        managerDecisions: undefined,
        managerLineupDeltas: undefined,
        activityLog: ["Pitching change recorded in old text log"],
      }),
    ]);

    await expect(getManagerAlmanacAggregates()).resolves.toEqual([]);
    expect(mockGetGameEvents).not.toHaveBeenCalled();
  });

  test("keeps manager leaderboards separate from player leaderboards", async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      createGame({
        managerDecisions: [createDecision({ managerWpa: 0.42 })],
        managerLineupDeltas: [createLineupDelta({ managerWpa: 0.08 })],
      }),
    ]);

    const playerLeaders = await getExhibitionBattingLeaders("h", false, 5);
    const managerLeaderboards = await getManagerAlmanacLeaderboards({}, 5);

    expect(playerLeaders).toEqual([
      expect.objectContaining({
        playerId: "player-one",
        playerName: "Player One",
      }),
    ]);
    expect(playerLeaders.some((entry) => entry.playerId === "away-manager")).toBe(false);
    expect(managerLeaderboards.managerValue[0]).toMatchObject({
      managerId: "away-manager",
      managerValue: 0.5,
    });
    expect(
      managerLeaderboards.managerValue.some(
        (entry) => entry.managerId === "player-one",
      ),
    ).toBe(false);
  });

  test("keeps Tactical WPA, Deployment WPA, Lineup Delta, and Manager Value distinct", () => {
    const [aggregate] = aggregateCommittedManagerAlmanac([
      createGame({
        managerDecisions: [createDecision({ managerWpa: 0.2 })],
        managerDeploymentStints: [
          createDeploymentStint({ managerDeploymentWpa: 0.04 }),
        ],
        managerLineupDeltas: [createLineupDelta({ managerWpa: -0.05 })],
      }),
    ]);

    expect(aggregate.tacticalManagerWpa).toBe(0.2);
    expect(aggregate.deploymentWpa).toBe(0.04);
    expect(aggregate.lineupDeltaWpa).toBe(-0.05);
    expect(aggregate.managerValue).toBe(0.19);

    const leaderboards = buildManagerAlmanacLeaderboards([aggregate], 5);
    expect(leaderboards.tacticalManagerWpa[0].value).toBe(0.2);
    expect(leaderboards.deploymentWpa[0].value).toBe(0.04);
    expect(leaderboards.lineupDeltaWpa[0].value).toBe(-0.05);
    expect(leaderboards.managerValue[0].value).toBe(0.19);
  });

  test("ignores active or non-numeric deployment stints in manager aggregates", () => {
    const [aggregate] = aggregateCommittedManagerAlmanac([
      createGame({
        managerDeploymentStints: [
          createDeploymentStint({ managerDeploymentWpa: 0.03 }),
          createDeploymentStint({
            stintId: "game-1:away:active-deployment",
            closeReason: undefined,
            closedAtEventId: undefined,
            closedAtEventIndex: undefined,
            managerDeploymentWpa: 0.09,
          }),
          createDeploymentStint({
            stintId: "game-1:away:bad-deployment",
            managerDeploymentWpa: Number.NaN,
          }),
        ],
      }),
    ]);

    expect(aggregate).toMatchObject({
      deploymentWpa: 0.03,
      managerValue: 0.03,
      decisionCount: 1,
      deploymentStintCount: 1,
    });
  });

  test("applies team, mode, and instance filters", () => {
    const games = [
      createGame({
        gameId: "exh-1",
        competitionType: "exhibition",
        competitionId: "league-a",
        leagueId: "league-a",
        awayTeamId: "away",
        awayTeamName: "Away Club",
        managerDecisions: [createDecision({ gameId: "exh-1", managerWpa: 0.1 })],
      }),
      createGame({
        gameId: "elim-1",
        competitionType: "elimination",
        competitionId: "run-1",
        leagueId: undefined,
        awayTeamId: "elim-team",
        awayTeamName: "Elim Club",
        managerDecisions: [
          createDecision({
            decisionId: "elim-1:elim-team:ph",
            gameId: "elim-1",
            managerId: "elim-manager",
            teamId: "elim-team",
            opponentTeamId: "home",
            decisionType: "pinch_hitter",
            managerWpa: 0.4,
          }),
        ],
      }),
    ];

    expect(
      aggregateCommittedManagerAlmanac(games, { mode: "exhibition" }),
    ).toHaveLength(1);
    expect(
      aggregateCommittedManagerAlmanac(games, { mode: "elimination" })[0],
    ).toMatchObject({
      managerId: "elim-manager",
      tacticalManagerWpa: 0.4,
    });
    expect(
      aggregateCommittedManagerAlmanac(games, { instanceId: "league-a" })[0],
    ).toMatchObject({
      managerId: "away-manager",
      tacticalManagerWpa: 0.1,
    });
    expect(
      aggregateCommittedManagerAlmanac(games, { teamId: "elim-team" })[0],
    ).toMatchObject({
      managerId: "elim-manager",
      teamIds: ["elim-team"],
    });
  });
});
