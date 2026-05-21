import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
  MatchupDramaBar,
  getMatchupDramaLevel,
} from "../../app/components/MatchupDramaBar";
import type { ReporterContext } from "../../app/engines/reporter/reporterContext";

function createContext(overrides: Partial<ReporterContext> = {}): ReporterContext {
  const base: ReporterContext = {
    batter: {
      id: "batter-1",
      name: "Ivy Sparks",
      nicknames: ["The Fuse"],
      effectiveFame: 3,
      baselineBackstory: "A patient hitter with a flair for late-count damage.",
      teamId: "away",
    },
    pitcher: {
      id: "pitcher-1",
      name: "Mara Stone",
      nicknames: [],
      effectiveFame: 3,
      baselineBackstory: "A strike-throwing ace who works fast.",
      teamId: "home",
    },
    battingTeam: {
      id: "away",
      name: "Away Comets",
      baselineBackstory: "A road club that survives on stubborn rallies.",
    },
    pitchingTeam: {
      id: "home",
      name: "Home Meteors",
      baselineBackstory: "A home club with old scoreboard mystique.",
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
    dramaticWeight: 1.25,
    gameState: {
      gameId: "game-1",
      atBatId: "game-1_4",
      inning: 4,
      halfInning: "TOP",
      outs: 1,
      bases: { first: null, second: null, third: null },
      awayScore: 1,
      homeScore: 1,
      battingTeamId: "away",
      pitchingTeamId: "home",
      batterId: "batter-1",
      pitcherId: "pitcher-1",
      competitionType: "exhibition",
    },
  };

  return { ...base, ...overrides };
}

describe("MatchupDramaBar", () => {
  test("classifies drama levels by reporter dramatic weight", () => {
    expect(getMatchupDramaLevel(0.75)).toBe("low");
    expect(getMatchupDramaLevel(2)).toBe("medium");
    expect(getMatchupDramaLevel(3.5)).toBe("high");
  });

  test("renders low drama with batter and pitcher fame context", () => {
    render(<MatchupDramaBar context={createContext()} />);

    expect(screen.getByTestId("matchup-drama-bar")).toHaveAttribute("data-drama-level", "low");
    expect(screen.getByText("Ivy Sparks")).toBeInTheDocument();
    expect(screen.getByText("Mara Stone")).toBeInTheDocument();
    expect(screen.getAllByText("Veteran 3/5")).toHaveLength(2);
    expect(screen.getByText("Routine matchup. Reporters are watching the count, not writing the lede yet.")).toBeInTheDocument();
  });

  test("renders medium drama with inning and WPA information", () => {
    render(
      <MatchupDramaBar
        context={createContext({
          dramaticWeight: 2.4,
          wpaMoment: {
            eventId: "game-1_4",
            leverageIndex: 1.9,
            winProbabilityBefore: 0.52,
            winProbabilityAfter: 0.61,
            wpa: 0.09,
          },
        })}
      />,
    );

    expect(screen.getByTestId("matchup-drama-bar")).toHaveAttribute("data-drama-level", "medium");
    expect(screen.getByText("Medium Drama")).toBeInTheDocument();
    expect(screen.getByText("2.40")).toBeInTheDocument();
    expect(screen.getByText("Top 4, 1 out")).toBeInTheDocument();
    expect(screen.getByText("+9.0 pp WPA")).toBeInTheDocument();
  });

  test("renders high drama for marquee fame and weight", () => {
    render(
      <MatchupDramaBar
        context={createContext({
          batter: {
            ...createContext().batter,
            effectiveFame: 5,
          },
          pitcher: {
            ...createContext().pitcher,
            effectiveFame: 4,
          },
          dramaticWeight: 4.15,
          gameState: {
            ...createContext().gameState,
            inning: 9,
            halfInning: "BOTTOM",
            outs: 2,
          },
          wpaMoment: {
            eventId: "game-1_9",
            leverageIndex: 3.8,
            winProbabilityBefore: 0.41,
            winProbabilityAfter: 0.29,
            wpa: -0.12,
          },
        })}
      />,
    );

    expect(screen.getByTestId("matchup-drama-bar")).toHaveAttribute("data-drama-level", "high");
    expect(screen.getByText("High Drama")).toBeInTheDocument();
    expect(screen.getByText("Superstar 5/5")).toBeInTheDocument();
    expect(screen.getByText("Captain 4/5")).toBeInTheDocument();
    expect(screen.getByText("Bot 9, 2 out")).toBeInTheDocument();
    expect(screen.getByText("-12.0 pp WPA")).toBeInTheDocument();
  });
});
