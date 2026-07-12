import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import { PostGameRouteBoundary } from "./components/PostGameRouteBoundary";
import { FRANCHISE_MANUAL_SMOKE_SETUP_ROUTE } from "./utils/franchiseManualSmokeFixtureGate";
import { hydrateFranchisePhase2ActivationCache } from "./utils/franchisePhase2Activation";
import { isSnakeDraftPocEnabled, isSnakeDraftV1Enabled } from "./utils/franchisePhase2Flags";

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
const FranchiseLens = lazy(() =>
  import("./src_figma/app/pages/FranchiseLens").then((module) => ({
    default: module.FranchiseLens,
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
const LeagueBuilderSnakeDraft = lazy(() =>
  import("./src_figma/app/pages/LeagueBuilderSnakeDraft").then((module) => ({
    default: module.LeagueBuilderSnakeDraft,
  })),
);
const SnakeDraftRoom = lazy(() => import("./src_figma/app/pages/SnakeDraftRoom"));
const SnakeCompanion = lazy(() => import("./src_figma/app/pages/SnakeCompanion"));

function SnakeSetupRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/league-builder/draft-setup", search: location.search }} replace />;
}
const SeasonRulesPreview = lazy(() =>
  import("./src_figma/app/pages/SeasonRulesPreview").then((module) => ({
    default: module.SeasonRulesPreview,
  })),
);
const DraftGuidePreview = lazy(() =>
  import("./src_figma/app/pages/DraftGuidePreview").then((module) => ({
    default: module.DraftGuidePreview,
  })),
);
const ScoutPanelPreview = lazy(() =>
  import("./src_figma/app/pages/ScoutPanelPreview").then((module) => ({ default: module.ScoutPanelPreview })),
);
const LineupsTabPreview = lazy(() =>
  import("./src_figma/app/pages/LineupsTabPreview").then((module) => ({ default: module.LineupsTabPreview })),
);
const InGameAdvisorPreview = lazy(() =>
  import("./src_figma/app/pages/InGameAdvisorPreview").then((module) => ({ default: module.InGameAdvisorPreview })),
);
const ConstructionRailPreview = lazy(() =>
  import("./src_figma/app/pages/ConstructionRailPreview").then((module) => ({ default: module.ConstructionRailPreview })),
);
const EndOfDraftStaffingPreview = lazy(() =>
  import("./src_figma/app/pages/EndOfDraftStaffingPreview").then((module) => ({ default: module.EndOfDraftStaffingPreview })),
);
const ScoutHirePreview = lazy(() =>
  import("./src_figma/app/pages/ScoutHirePreview").then((module) => ({ default: module.ScoutHirePreview })),
);
const EndOfDraftStaffing = lazy(() =>
  import("./src_figma/app/pages/EndOfDraftStaffing").then((module) => ({ default: module.EndOfDraftStaffing })),
);
const ScoutHire = lazy(() =>
  import("./src_figma/app/pages/ScoutHire").then((module) => ({ default: module.ScoutHire })),
);
const MyTeamsSwitcherPreview = lazy(() =>
  import("./src_figma/app/pages/MyTeamsSwitcherPreview").then((module) => ({ default: module.MyTeamsSwitcherPreview })),
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
const AuctionStagePreview = lazy(() =>
  import("./src_figma/app/pages/AuctionStagePreview").then((module) => ({
    default: module.AuctionStagePreview,
  })),
);
const FranchiseLensPreview = lazy(() =>
  import("./src_figma/app/pages/FranchiseLensPreview").then((module) => ({
    default: module.FranchiseLensPreview,
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
const Phase2ActivationConsole = lazy(() =>
  import("./src_figma/app/pages/Phase2ActivationConsole").then((module) => ({
    default: module.Phase2ActivationConsole,
  })),
);
const LivingSeasonTestDrive = lazy(() =>
  import("./src_figma/app/pages/LivingSeasonTestDrive").then((module) => ({
    default: module.LivingSeasonTestDrive,
  })),
);
const enablePreviewRoutes = import.meta.env.DEV || import.meta.env.MODE === "test";
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
// Dev/test-only verification harness: seeds a deterministic demo franchise for the real-data lens.
const FranchiseLensSeed = enableFranchiseManualSmokeSetupRoute
  ? lazy(() =>
      import("./src_figma/app/pages/FranchiseLensSeed").then((module) => ({
        default: module.FranchiseLensSeed,
      })),
    )
  : null;
// Dev/test-only: seeds a demo franchise AND plays a season (flags on) so all surfaces populate.
const FranchiseLensSeedPlayed = enableFranchiseManualSmokeSetupRoute
  ? lazy(() =>
      import("./src_figma/app/pages/FranchiseLensSeedPlayed").then((module) => ({
        default: module.FranchiseLensSeedPlayed,
      })),
    )
  : null;

/**
 * KBL Tracker - Main App
 *
 * All routes use Figma-designed components which provide an exhaustive UI.
 * The franchise route lands on the FranchiseLens hub. Legacy FranchiseHome remains
 * in src_figma/app/pages as an unrouted fallback for regression coverage.
 * No separate routes are needed for:
 * - Season dashboard, Schedule, Roster, Leaders
 * - Awards ceremony flows
 * - Offseason flows (Free Agency, Draft, Trades, Retirements, etc.)
 * - Museum (Hall of Fame, Retired Numbers, etc.)
 *
 * Legacy pages are kept in src/pages/ and src/components/ for reference
 * but are no longer routed.
 */
function App() {
  const [phase2ActivationHydrated, setPhase2ActivationHydrated] = useState(false);
  const loadingFallback = (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-['Press_Start_2P'] text-xs">
      LOADING...
    </div>
  );

  useEffect(() => {
    let mounted = true;
    hydrateFranchisePhase2ActivationCache().finally(() => {
      if (mounted) setPhase2ActivationHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!phase2ActivationHydrated) return loadingFallback;

  return (
    <Suspense
      fallback={loadingFallback}
    >
      <Routes>
        {/* Main Menu - Figma Design */}
        <Route path="/" element={<AppHome />} />
        {enablePreviewRoutes ? (
          <>
            <Route path="/__preview/season-rules" element={<SeasonRulesPreview />} />
            <Route path="/__preview/draft-guide" element={<DraftGuidePreview />} />
            <Route path="/__preview/scout-panel" element={<ScoutPanelPreview />} />
            <Route path="/__preview/lineups" element={<LineupsTabPreview />} />
            <Route path="/__preview/ingame-advisor" element={<InGameAdvisorPreview />} />
            <Route path="/__preview/construction-rail" element={<ConstructionRailPreview />} />
            <Route path="/__preview/staffing" element={<EndOfDraftStaffingPreview />} />
            <Route path="/__preview/scout-hire" element={<ScoutHirePreview />} />
            <Route path="/__preview/my-teams" element={<MyTeamsSwitcherPreview />} />
          </>
        ) : null}

        {/* Franchise Flow - Figma Design */}
        <Route path="/franchise/select" element={<FranchiseSelector />} />
        <Route path="/franchise/setup" element={<FranchiseSetup />} />
        <Route
          path="/franchise/:franchiseId/season-summary"
          element={<SeasonSummary />}
        />
        <Route path="/franchise/:franchiseId" element={<FranchiseLens />} />

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
        <Route
          path="/league-builder/draft-config"
          element={<Navigate to="/league-builder/draft-setup" replace />}
        />
        {isSnakeDraftPocEnabled() ? (
          <Route path="/league-builder/snake-draft" element={<LeagueBuilderSnakeDraft />} />
        ) : null}
        <Route path="/snake-setup" element={<SnakeSetupRedirect />} />
        {isSnakeDraftV1Enabled() ? (
          <Route path="/snake-room" element={<SnakeDraftRoom />} />
        ) : null}
        {isSnakeDraftV1Enabled() ? (
          <Route path="/snake-companion" element={<SnakeCompanion />} />
        ) : null}
        <Route path="/league-builder/scout-hire" element={<ScoutHire />} />
        <Route
          path="/league-builder/auction-draft"
          element={<LeagueBuilderAuctionDraft />}
        />
        <Route
          path="/league-builder/farm-auction-draft"
          element={<LeagueBuilderFarmAuctionDraft />}
        />
        <Route path="/league-builder/staff-hire" element={<EndOfDraftStaffing />} />

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

        {/* Isolated component proof routes */}
        {enablePreviewRoutes ? (
          <>
            <Route path="/__preview/fame-pip" element={<FamePipPreview />} />
            <Route path="/__preview/auction-stage" element={<AuctionStagePreview />} />
            <Route path="/__preview/franchise-lens" element={<FranchiseLensPreview />} />
            <Route
              path="/__preview/franchise-lens/:franchiseId"
              element={<FranchiseLens />}
            />
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
            <Route
              path="/__preview/phase2-activation"
              element={<Phase2ActivationConsole />}
            />
            <Route
              path="/__preview/living-season-test-drive"
              element={<LivingSeasonTestDrive />}
            />
          </>
        ) : null}
        {enableFranchiseVisualSmokePreviewRoute ? (
          <Route
            path="/__preview/franchise-v1-visual-smoke"
            element={FranchiseV1VisualSmokeSeed ? <FranchiseV1VisualSmokeSeed /> : <NotFound />}
          />
        ) : null}
        {enableFranchiseManualSmokeSetupRoute ? (
          <Route
            path="/__preview/franchise-lens-seed"
            element={FranchiseLensSeed ? <FranchiseLensSeed /> : <NotFound />}
          />
        ) : null}
        {enableFranchiseManualSmokeSetupRoute ? (
          <Route
            path="/__preview/franchise-lens-seed-played"
            element={FranchiseLensSeedPlayed ? <FranchiseLensSeedPlayed /> : <NotFound />}
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
