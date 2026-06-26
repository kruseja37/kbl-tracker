import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { PostGameRouteBoundary } from "./components/PostGameRouteBoundary";
import { FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE } from "./utils/franchiseManualSmokeFixtureGate";

// Global styles
import "./styles/global.css";

// Legacy NavigationHeader removed - Figma pages have their own headers
const NotFound = lazy(() => import("./pages/NotFound"));

// Figma Design Pages (exhaustive UI replacement)
const AppHome = lazy(() =>
  import("./src_figma/app/pages/AppHome").then((module) => ({
    default: module.AppHome,
  })),
);
const FranchiseSetup = lazy(() =>
  import("./src_figma/app/pages/FranchiseSetup").then((module) => ({
    default: module.FranchiseSetup,
  })),
);
const FranchiseSelector = lazy(() =>
  import("./src_figma/app/pages/FranchiseSelector").then((module) => ({
    default: module.FranchiseSelector,
  })),
);
const EliminationSetup = lazy(() =>
  import("./src_figma/app/pages/EliminationSetup").then((module) => ({
    default: module.EliminationSetup,
  })),
);
const EliminationSelector = lazy(() =>
  import("./src_figma/app/pages/EliminationSelector").then((module) => ({
    default: module.EliminationSelector,
  })),
);
const FranchiseHome = lazy(() =>
  import("./src_figma/app/pages/FranchiseHome").then((module) => ({
    default: module.FranchiseHome,
  })),
);
const GameTracker = lazy(() =>
  import("./src_figma/app/pages/GameTracker").then((module) => ({
    default: module.GameTracker,
  })),
);
const PostGameSummary = lazy(() =>
  import("./src_figma/app/pages/PostGameSummary").then((module) => ({
    default: module.PostGameSummary,
  })),
);
const ExhibitionGame = lazy(() =>
  import("./src_figma/app/pages/ExhibitionGame").then((module) => ({
    default: module.ExhibitionGame,
  })),
);
const EliminationHome = lazy(() =>
  import("./src_figma/app/pages/EliminationHome").then((module) => ({
    default: module.EliminationHome,
  })),
);
const SeasonSummary = lazy(() =>
  import("./src_figma/app/pages/SeasonSummary").then((module) => ({
    default: module.SeasonSummary,
  })),
);
const LeagueBuilder = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilder").then((module) => ({
    default: module.LeagueBuilder,
  })),
);
const Builder = lazy(() =>
  import("./src_figma/app/pages/Builder").then((module) => ({
    default: module.Builder,
  })),
);
const LeagueBuilderLeagues = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderLeagues").then((module) => ({
    default: module.LeagueBuilderLeagues,
  })),
);
const LeagueBuilderTeams = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderTeams").then((module) => ({
    default: module.LeagueBuilderTeams,
  })),
);
const LeagueBuilderPlayers = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderPlayers").then((module) => ({
    default: module.LeagueBuilderPlayers,
  })),
);
const LeagueBuilderRosters = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderRosters").then((module) => ({
    default: module.LeagueBuilderRosters,
  })),
);
const LeagueBuilderDraft = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderDraft").then((module) => ({
    default: module.LeagueBuilderDraft,
  })),
);
const LeagueBuilderSnakeDraft = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderSnakeDraft").then((module) => ({
    default: module.LeagueBuilderSnakeDraft,
  })),
);
const LeagueBuilderAuctionDraft = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderAuctionDraft").then((module) => ({
    default: module.LeagueBuilderAuctionDraft,
  })),
);
const LeagueBuilderFarmAuctionDraft = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderFarmAuctionDraft").then((module) => ({
    default: module.LeagueBuilderFarmAuctionDraft,
  })),
);
const LeagueBuilderDraftSetup = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderDraftSetup").then((module) => ({
    default: module.LeagueBuilderDraftSetup,
  })),
);
const DraftSetupArchetypePreview = lazy(() =>
  import("./src_figma/app/pages/DraftSetupArchetypePreview").then((module) => ({
    default: module.DraftSetupArchetypePreview,
  })),
);
const LeagueBuilderRules = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderRules").then((module) => ({
    default: module.LeagueBuilderRules,
  })),
);
const AlmanacHome = lazy(() =>
  import("./src_figma/app/pages/AlmanacHome").then((module) => ({
    default: module.AlmanacHome,
  })),
);
const AlmanacNarratives = lazy(() =>
  import("./src_figma/app/pages/AlmanacNarratives").then((module) => ({
    default: module.AlmanacNarratives,
  })),
);
const ManagerAlmanac = lazy(() =>
  import("./src_figma/app/pages/ManagerAlmanac").then((module) => ({
    default: module.ManagerAlmanac,
  })),
);
const ExhibitionLeaders = lazy(() =>
  import("./src_figma/app/pages/ExhibitionLeaders").then((module) => ({
    default: module.ExhibitionLeaders,
  })),
);
const GameBrowser = lazy(() =>
  import("./src_figma/app/pages/GameBrowser").then((module) => ({
    default: module.GameBrowser,
  })),
);
const GameDetail = lazy(() =>
  import("./src_figma/app/pages/GameDetail").then((module) => ({
    default: module.GameDetail,
  })),
);
const PlayerDirectory = lazy(() =>
  import("./src_figma/app/pages/PlayerDirectory").then((module) => ({
    default: module.PlayerDirectory,
  })),
);
const PlayerInstanceCard = lazy(() =>
  import("./src_figma/app/pages/PlayerInstanceCard").then((module) => ({
    default: module.PlayerInstanceCard,
  })),
);
const TeamPage = lazy(() =>
  import("./src_figma/app/pages/TeamPage").then((module) => ({
    default: module.TeamPage,
  })),
);
const FamePipPreview = lazy(() =>
  import("./src_figma/app/pages/FamePipPreview").then((module) => ({
    default: module.FamePipPreview,
  })),
);
const PlayerInstanceCardPreview = lazy(() =>
  import("./src_figma/app/pages/PlayerInstanceCardPreview").then((module) => ({
    default: module.PlayerInstanceCardPreview,
  })),
);
const FameLeaderboardPreview = lazy(() =>
  import("./src_figma/app/pages/FameLeaderboardPreview").then((module) => ({
    default: module.FameLeaderboardPreview,
  })),
);
const MatchupDramaBarPreview = lazy(() =>
  import("./src_figma/app/pages/MatchupDramaBarPreview").then((module) => ({
    default: module.MatchupDramaBarPreview,
  })),
);
const CommentaryFeedPreview = lazy(() =>
  import("./src_figma/app/pages/CommentaryFeedPreview").then((module) => ({
    default: module.CommentaryFeedPreview,
  })),
);
const CommentaryFeedPersistencePreview = lazy(() =>
  import("./src_figma/app/pages/CommentaryFeedPersistencePreview").then((module) => ({
    default: module.CommentaryFeedPersistencePreview,
  })),
);
const BetweenInningSummaryPreview = lazy(() =>
  import("./src_figma/app/pages/BetweenInningSummaryPreview").then((module) => ({
    default: module.BetweenInningSummaryPreview,
  })),
);
const enableFranchiseVisualSmokePreviewRoute =
  import.meta.env.DEV || import.meta.env.MODE === "test";
const enableFranchiseManualSmokeSetupRoute =
  import.meta.env.DEV || import.meta.env.MODE === "test";
const FranchiseV1VisualSmokeSeed = enableFranchiseVisualSmokePreviewRoute
  ? lazy(() =>
      import("./src_figma/app/pages/FranchiseV1VisualSmokeSeed").then((module) => ({
        default: module.FranchiseV1VisualSmokeSeed,
      })),
    )
  : null;
const FranchiseManualSmokeSetup = enableFranchiseManualSmokeSetupRoute
  ? lazy(() =>
      import("./src_figma/app/pages/FranchiseManualSmokeSetup").then((module) => ({
        default: module.FranchiseManualSmokeSetup,
      })),
    )
  : null;

/**
 * KBL Tracker - Main App
 *
 * All routes use Figma-designed components which provide an exhaustive UI.
 * The FranchiseHome page includes all in-season, playoff, and offseason flows
 * as tabs and modals, so no separate routes are needed for:
 * - Season dashboard, Schedule, Roster, Leaders
 * - Awards ceremony flows
 * - Offseason flows (Free Agency, Draft, Trades, Retirements, etc.)
 * - Museum (Hall of Fame, Retired Numbers, etc.)
 *
 * Legacy pages are kept in src/pages/ and src/components/ for reference
 * but are no longer routed.
 */
function App() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white font-['Press_Start_2P'] text-xs">
          LOADING...
        </div>
      }
    >
      <Routes>
        {/* Main Menu - Figma Design */}
        <Route path="/" element={<AppHome />} />
        <Route path="/__preview/draft-archetypes" element={<DraftSetupArchetypePreview />} />

        {/* Franchise Flow - Figma Design */}
        <Route path="/franchise/select" element={<FranchiseSelector />} />
        <Route path="/franchise/setup" element={<FranchiseSetup />} />
        <Route
          path="/franchise/:franchiseId/season-summary"
          element={<SeasonSummary />}
        />
        <Route path="/franchise/:franchiseId" element={<FranchiseHome />} />

        {/* Game Flow - Figma Design */}
        <Route path="/game-tracker/:gameId" element={<GameTracker />} />
        <Route
          path="/post-game/:gameId"
          element={
            <PostGameRouteBoundary>
              <PostGameSummary />
            </PostGameRouteBoundary>
          }
        />

        {/* Exhibition Game - Figma Design */}
        <Route path="/exhibition" element={<ExhibitionGame />} />

        {/* Elimination Mode (Playoffs) - Figma Design */}
        <Route path="/elimination/select" element={<EliminationSelector />} />
        <Route path="/elimination/setup" element={<EliminationSetup />} />
        <Route
          path="/elimination/:eliminationId"
          element={<EliminationHome />}
        />

        {/* Builder - Figma Design */}
        <Route path="/builder" element={<Builder />} />

        {/* League Builder - Figma Design */}
        <Route path="/league-builder" element={<LeagueBuilder />} />
        <Route
          path="/league-builder/leagues"
          element={<LeagueBuilderLeagues />}
        />
        <Route path="/league-builder/teams" element={<LeagueBuilderTeams />} />
        <Route
          path="/league-builder/players"
          element={<LeagueBuilderPlayers />}
        />
        <Route
          path="/league-builder/rosters"
          element={<LeagueBuilderRosters />}
        />
        <Route
          path="/league-builder/draft-setup"
          element={<LeagueBuilderDraftSetup />}
        />
        <Route path="/league-builder/draft" element={<LeagueBuilderDraft />} />
        <Route
          path="/league-builder/snake-draft"
          element={<LeagueBuilderSnakeDraft />}
        />
        <Route
          path="/league-builder/auction-draft"
          element={<LeagueBuilderAuctionDraft />}
        />
        <Route
          path="/league-builder/farm-auction-draft"
          element={<LeagueBuilderFarmAuctionDraft />}
        />
        <Route path="/league-builder/rules" element={<LeagueBuilderRules />} />

        {/* Almanac - Figma Design */}
        <Route path="/almanac" element={<AlmanacHome />} />
        <Route path="/almanac/narratives" element={<AlmanacNarratives />} />
        <Route path="/almanac/managers" element={<ManagerAlmanac />} />
        <Route path="/almanac/exhibition" element={<ExhibitionLeaders />} />
        <Route path="/almanac/elimination" element={<GameBrowser />} />
        <Route path="/almanac/franchise" element={<GameBrowser />} />
        <Route path="/almanac/games" element={<GameBrowser />} />
        <Route path="/almanac/games/:gameId" element={<GameDetail />} />
        <Route path="/almanac/players" element={<PlayerDirectory />} />
        <Route
          path="/almanac/players/:canonicalId"
          element={<PlayerDirectory />}
        />
        <Route
          path="/almanac/players/:canonicalId/:instanceId"
          element={<PlayerInstanceCard />}
        />
        <Route path="/almanac/teams/:leagueId/:teamId" element={<TeamPage />} />

        {/* Isolated component proof route */}
        <Route path="/__preview/fame-pip" element={<FamePipPreview />} />
        <Route
          path="/__preview/player-instance-card"
          element={<PlayerInstanceCardPreview />}
        />
        <Route
          path="/__preview/fame-leaderboard"
          element={<FameLeaderboardPreview />}
        />
        <Route
          path="/__preview/matchup-drama-bar"
          element={<MatchupDramaBarPreview />}
        />
        <Route
          path="/__preview/commentary-feed"
          element={<CommentaryFeedPreview />}
        />
        <Route
          path="/__preview/commentary-feed-persistence"
          element={<CommentaryFeedPersistencePreview />}
        />
        <Route
          path="/__preview/between-inning-summary"
          element={<BetweenInningSummaryPreview />}
        />
        {enableFranchiseVisualSmokePreviewRoute ? (
          <Route
            path="/__preview/franchise-v1-visual-smoke"
            element={FranchiseV1VisualSmokeSeed ? <FranchiseV1VisualSmokeSeed /> : <NotFound />}
          />
        ) : null}
        {enableFranchiseManualSmokeSetupRoute ? (
          <Route
            path={FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE}
            element={FranchiseManualSmokeSetup ? <FranchiseManualSmokeSetup /> : <NotFound />}
          />
        ) : null}

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
