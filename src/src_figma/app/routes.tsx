import { createBrowserRouter } from "react-router";
import { AppHome } from "@/app/pages/AppHome";
import { Builder } from "@/app/pages/Builder";
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
import { EliminationHome } from "@/app/pages/EliminationHome";
import { EliminationSelector } from "@/app/pages/EliminationSelector";
import { EliminationSetup } from "@/app/pages/EliminationSetup";
import { SeasonSummary } from "@/app/pages/SeasonSummary";
import { AlmanacHome } from "@/app/pages/AlmanacHome";
import { AlmanacNarratives } from "@/app/pages/AlmanacNarratives";
import { ExhibitionLeaders } from "@/app/pages/ExhibitionLeaders";
import { GameBrowser } from "@/app/pages/GameBrowser";
import { GameDetail } from "@/app/pages/GameDetail";
import { ManagerAlmanac } from "@/app/pages/ManagerAlmanac";
import { PlayerDirectory } from "@/app/pages/PlayerDirectory";
import { PlayerInstanceCard } from "@/app/pages/PlayerInstanceCard";
import { TeamPage } from "@/app/pages/TeamPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppHome,
  },
  {
    path: "/builder",
    Component: Builder,
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
    path: "/franchise/:franchiseId/season-summary",
    Component: SeasonSummary,
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
    path: "/elimination/select",
    Component: EliminationSelector,
  },
  {
    path: "/elimination/setup",
    Component: EliminationSetup,
  },
  {
    path: "/elimination/:eliminationId",
    Component: EliminationHome,
  },
  {
    path: "/almanac",
    Component: AlmanacHome,
  },
  {
    path: "/almanac/exhibition",
    Component: ExhibitionLeaders,
  },
  {
    path: "/almanac/elimination",
    Component: GameBrowser,
  },
  {
    path: "/almanac/franchise",
    Component: GameBrowser,
  },
  {
    path: "/almanac/games",
    Component: GameBrowser,
  },
  {
    path: "/almanac/games/:gameId",
    Component: GameDetail,
  },
  {
    path: "/almanac/managers",
    Component: ManagerAlmanac,
  },
  {
    path: "/almanac/narratives",
    Component: AlmanacNarratives,
  },
  {
    path: "/almanac/players",
    Component: PlayerDirectory,
  },
  {
    path: "/almanac/players/:canonicalId",
    Component: PlayerDirectory,
  },
  {
    path: "/almanac/players/:canonicalId/:instanceId",
    Component: PlayerInstanceCard,
  },
  {
    path: "/almanac/teams/:leagueId/:teamId",
    Component: TeamPage,
  },
]);
