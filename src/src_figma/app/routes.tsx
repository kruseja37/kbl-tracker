import { createBrowserRouter } from "react-router";
import { AppHome } from "@/app/pages/AppHome";
import { LeagueBuilder } from "@/app/pages/LeagueBuilder";
import { LeagueBuilderLeagues } from "@/app/pages/LeagueBuilderLeagues";
import { LeagueBuilderTeams } from "@/app/pages/LeagueBuilderTeams";
import { LeagueBuilderPlayers } from "@/app/pages/LeagueBuilderPlayers";
import { LeagueBuilderRosters } from "@/app/pages/LeagueBuilderRosters";
import { LeagueBuilderDraft } from "@/app/pages/LeagueBuilderDraft";
import { LeagueBuilderRules } from "@/app/pages/LeagueBuilderRules";
import { FranchiseHome } from "@/app/pages/FranchiseHome";
import { FranchiseSelector } from "@/app/pages/FranchiseSelector";
import { FranchiseSetup } from "@/app/pages/FranchiseSetup";
import { GameTracker } from "@/app/pages/GameTracker";
import { PostGameSummary } from "@/app/pages/PostGameSummary";
import { ExhibitionGame } from "@/app/pages/ExhibitionGame";
import { WorldSeries } from "@/app/pages/WorldSeries";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppHome,
  },
  {
    path: "/league-builder",
    Component: LeagueBuilder,
  },
  {
    path: "/league-builder/leagues",
    Component: LeagueBuilderLeagues,
  },
  {
    path: "/league-builder/teams",
    Component: LeagueBuilderTeams,
  },
  {
    path: "/league-builder/players",
    Component: LeagueBuilderPlayers,
  },
  {
    path: "/league-builder/rosters",
    Component: LeagueBuilderRosters,
  },
  {
    path: "/league-builder/draft",
    Component: LeagueBuilderDraft,
  },
  {
    path: "/league-builder/rules",
    Component: LeagueBuilderRules,
  },
  {
    path: "/franchise/select",
    Component: FranchiseSelector,
  },
  {
    path: "/franchise/setup",
    Component: FranchiseSetup,
  },
  {
    path: "/franchise/:franchiseId",
    Component: FranchiseHome,
  },
  {
    path: "/game-tracker/:gameId",
    Component: GameTracker,
  },
  {
    path: "/post-game/:gameId",
    Component: PostGameSummary,
  },
  {
    path: "/exhibition",
    Component: ExhibitionGame,
  },
  {
    path: "/world-series",
    Component: WorldSeries,
  },
]);