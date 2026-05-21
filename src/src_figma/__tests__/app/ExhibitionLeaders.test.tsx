import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ExhibitionLeaders } from "../../app/pages/ExhibitionLeaders";
import type { ExhibitionLeaderEntry } from "../../../utils/almanacQueries";
import type { TeamImpactLeaderboards } from "../../../utils/teamImpact";

const {
  mockGetExhibitionBattingLeaders,
  mockGetExhibitionPitchingLeaders,
  mockGetAllExhibitionTeamImpactLeaderboards,
} = vi.hoisted(() => ({
  mockGetExhibitionBattingLeaders: vi.fn(),
  mockGetExhibitionPitchingLeaders: vi.fn(),
  mockGetAllExhibitionTeamImpactLeaderboards: vi.fn(),
}));

vi.mock("../../../utils/almanacQueries", () => ({
  getExhibitionBattingLeaders: mockGetExhibitionBattingLeaders,
  getExhibitionPitchingLeaders: mockGetExhibitionPitchingLeaders,
}));

vi.mock("../../../utils/teamImpact", () => ({
  getAllExhibitionTeamImpactLeaderboards: mockGetAllExhibitionTeamImpactLeaderboards,
}));

describe("ExhibitionLeaders Team Impact panels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExhibitionBattingLeaders.mockResolvedValue([leaderEntry("alpha-star", "Alpha Star", 0.5)]);
    mockGetExhibitionPitchingLeaders.mockResolvedValue([leaderEntry("alpha-arm", "Alpha Arm", 2.25)]);
    mockGetAllExhibitionTeamImpactLeaderboards.mockResolvedValue(impactLeaderboards());
  });

  test("renders impact and POG panels without breaking batting and pitching leaderboards", async () => {
    renderPage();

    const impactPanel = await screen.findByTestId("team-impact-leaderboards");
    expect(mockGetAllExhibitionTeamImpactLeaderboards).toHaveBeenCalledWith(5);
    expect(within(impactPanel).getByText("Team Impact / POG Leaders")).toBeInTheDocument();
    expect(within(impactPanel).getByText("Team WPA")).toBeInTheDocument();
    expect(within(impactPanel).getByText("Overall POG")).toBeInTheDocument();
    expect(within(impactPanel).getByText("Best Manager")).toBeInTheDocument();
    expect(within(impactPanel).getAllByText("Impact Ace").length).toBeGreaterThan(0);

    expect(await screen.findByText("BATTING")).toBeInTheDocument();
    expect(await screen.findByText("PITCHING")).toBeInTheDocument();
    expect(screen.getAllByText("Alpha Star").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alpha Arm").length).toBeGreaterThan(0);
  });

  test("renders an honest empty Team Impact state", async () => {
    mockGetExhibitionBattingLeaders.mockResolvedValue([]);
    mockGetExhibitionPitchingLeaders.mockResolvedValue([]);
    mockGetAllExhibitionTeamImpactLeaderboards.mockResolvedValue(emptyImpactLeaderboards());

    renderPage();

    const impactPanel = await screen.findByTestId("team-impact-leaderboards");
    expect(
      within(impactPanel).getByText("No Team Impact or POG leaderboard data yet."),
    ).toBeInTheDocument();
  });

  test("renders partial-data warnings for legacy impact leaderboards", async () => {
    mockGetExhibitionBattingLeaders.mockResolvedValue([]);
    mockGetExhibitionPitchingLeaders.mockResolvedValue([]);
    mockGetAllExhibitionTeamImpactLeaderboards.mockResolvedValue(
      impactLeaderboards({
        dataQuality: {
          teamCount: 1,
          teamGameCount: 1,
          fullKblWpaTeamGames: 0,
          legacyAtBatWpaTeamGames: 1,
          storedPogTeamGames: 0,
          managerValueOnlyTeamGames: 0,
          unavailableTeamGames: 0,
          eventLogFailedTeamGames: 0,
          warnings: ["1 game(s) use legacy at-bat WPA fallback; role awards are limited."],
        },
      }),
    );

    renderPage();

    expect(
      await screen.findByText("1 game(s) use legacy at-bat WPA fallback; role awards are limited."),
    ).toBeInTheDocument();
  });
});

function renderPage() {
  render(
    <MemoryRouter>
      <ExhibitionLeaders />
    </MemoryRouter>,
  );
}

function leaderEntry(playerId: string, playerName: string, value: number): ExhibitionLeaderEntry {
  return {
    canonicalId: playerId,
    instanceId: "league-1",
    leagueId: "league-1",
    playerId,
    playerName,
    teamId: "alpha",
    teamName: "Alpha",
    value,
  };
}

function impactLeaderboards(overrides: Partial<TeamImpactLeaderboards> = {}): TeamImpactLeaderboards {
  return {
    teamWpaLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 3,
        value: 0.6,
        perGameWpa: 0.2,
        identityLabel: "Lineup carried them",
      },
    ],
    teamPogPointsLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 3,
        points: 6,
        overallWins: 1,
        bestManagerWins: 1,
        mostDecoratedPlayer: {
          playerId: "impact-ace",
          playerName: "Impact Ace",
          points: 4,
        },
      },
    ],
    playerTotalWpaLeaders: [
      {
        rank: 1,
        playerId: "impact-ace",
        playerName: "Impact Ace",
        teamId: "alpha",
        teamName: "Alpha",
        games: 3,
        value: 0.45,
        perGameWpa: 0.15,
        roleSplit: roleWpa(0.45, 0.35),
        pogPoints: 4,
      },
    ],
    playerPogPointsLeaders: [],
    overallPogLeaders: [playerAward("impact-ace", "Impact Ace", "alpha", "Alpha", 1, 4)],
    bestHitterLeaders: [playerAward("impact-ace", "Impact Ace", "alpha", "Alpha", 1, 4)],
    bestPitcherLeaders: [],
    bestBaserunnerLeaders: [],
    bestFielderLeaders: [],
    bestManagerLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        count: 1,
        managerValue: 0.1,
      },
    ],
    roleWpaLeaders: {
      batting: [],
      pitching: [],
      defense: [],
      baserunning: [],
    },
    managerValueTeamLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 3,
        value: 0.1,
        managerWpa: {
          tacticalManagerWpa: 0.04,
          deploymentWpa: 0.03,
          lineupDeltaWpa: 0.03,
          managerValue: 0.1,
        },
        bestManagerWins: 1,
      },
    ],
    highLeverageWpaLeaders: [],
    dataQuality: {
      teamCount: 1,
      teamGameCount: 3,
      fullKblWpaTeamGames: 3,
      legacyAtBatWpaTeamGames: 0,
      storedPogTeamGames: 0,
      managerValueOnlyTeamGames: 0,
      unavailableTeamGames: 0,
      eventLogFailedTeamGames: 0,
      warnings: [],
    },
    ...overrides,
  };
}

function emptyImpactLeaderboards(): TeamImpactLeaderboards {
  return impactLeaderboards({
    teamWpaLeaders: [],
    teamPogPointsLeaders: [],
    playerTotalWpaLeaders: [],
    playerPogPointsLeaders: [],
    overallPogLeaders: [],
    bestHitterLeaders: [],
    bestPitcherLeaders: [],
    bestBaserunnerLeaders: [],
    bestFielderLeaders: [],
    bestManagerLeaders: [],
    roleWpaLeaders: {
      batting: [],
      pitching: [],
      defense: [],
      baserunning: [],
    },
    managerValueTeamLeaders: [],
    highLeverageWpaLeaders: [],
    dataQuality: {
      teamCount: 0,
      teamGameCount: 0,
      fullKblWpaTeamGames: 0,
      legacyAtBatWpaTeamGames: 0,
      storedPogTeamGames: 0,
      managerValueOnlyTeamGames: 0,
      unavailableTeamGames: 0,
      eventLogFailedTeamGames: 0,
      warnings: [],
    },
  });
}

function playerAward(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  count: number,
  pogPoints: number,
) {
  return {
    rank: 1,
    playerId,
    playerName,
    teamId,
    teamName,
    count,
    pogPoints,
  };
}

function roleWpa(total: number, batting = 0) {
  return {
    total,
    batting,
    pitching: 0,
    fielding: 0,
    baserunning: 0,
    catching: 0,
  };
}
