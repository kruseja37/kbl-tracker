/**
 * FranchiseLensLivePreview — the REAL-DATA franchise-lens hub, behind the parallel route
 * /__preview/franchise-lens/:franchiseId (non-destructive; the live /franchise/:franchiseId
 * route and the mock /__preview/franchise-lens route are untouched).
 *
 * This is the thin page wrapper: read the franchiseId from the URL, run the real-data adapter
 * hook, and render the unchanged pure-view FranchiseLensHub. Seed a demo franchise via
 * /__preview/franchise-lens-seed (dev only) to get a reproducible :franchiseId, or point this
 * at any real save's franchiseId. See FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { FranchisePregameLaunchOverlay } from "../components/FranchisePregameLaunchOverlay";
import { FranchiseLensHub } from "../components/franchise/FranchiseLensHub";
import { useFranchiseLensData } from "../../hooks/useFranchiseLensData";
import { useScheduleData } from "../../hooks/useScheduleData";
import { repairFranchisePersistence } from "../../../utils/franchiseInitializer";
import {
  buildFranchiseGameTrackerNavigation,
  FranchiseGameLaunchBlockedError,
  loadFranchisePregameMilestoneWatchesForData,
  markFranchisePostGameColumnsPending,
  prepareFranchisePregameData,
  resolveFranchiseGameUseDH,
  type FranchisePregameData,
} from "../utils/franchiseGameLaunch";

export function FranchiseLensLivePreview() {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();
  const [searchParams] = useSearchParams();
  const seasonNumber = Number(searchParams.get("season") ?? "1") || 1;
  const [viewedTeamId, setViewedTeamId] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPreparingGameLaunch, setIsPreparingGameLaunch] = useState(false);
  const [preGameData, setPreGameData] = useState<FranchisePregameData | null>(null);

  const scheduleData = useScheduleData(seasonNumber, { franchiseId });
  const {
    teams,
    active,
    hub,
    isLoading,
    error,
    reload,
    seasonId,
    franchiseConfig,
    teamNameMap,
    stadiumMap,
    callUp,
    sendDown,
    executeTrade,
    setFitness,
  } =
    useFranchiseLensData(franchiseId, seasonNumber, viewedTeamId);
  const leagueId = franchiseConfig?.league ?? hub.lineups?.leagueId ?? "sml";
  const useDH = resolveFranchiseGameUseDH(franchiseConfig);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const getScheduledGame = (scheduleGameId?: string) => {
    if (scheduleGameId) {
      const byId = scheduleData.games.find((game) => game.id === scheduleGameId);
      if (byId) return byId;
    }
    return scheduleData.nextGame;
  };

  const repairLensPersistence = async () => {
    if (!franchiseId || !franchiseConfig?.league) return;
    const result = await repairFranchisePersistence(franchiseId, seasonNumber);
    if (result.rosterBackfilled || result.seasonMetadataCreated || result.seasonMetadataUpdated) {
      await scheduleData.refresh();
      reload();
    }
  };

  const getTeamRecord = (teamId: string): string => {
    for (const division of hub.standings?.divisions ?? []) {
      const row = division.rows.find((standing) => standing.teamId === teamId);
      if (row) return `${row.wins}-${row.losses}`;
    }
    return "0-0";
  };

  const handleScoreGame = async (scheduleGameId?: string) => {
    if (isPreparingGameLaunch) return;
    const nextGame = getScheduledGame(scheduleGameId);
    setIsPreparingGameLaunch(true);
    try {
      const prepared = await prepareFranchisePregameData({
        franchiseId,
        leagueId: leagueId ?? undefined,
        useDH,
        nextGame,
        completedGames: scheduleData.completedGames ?? [],
        teamNameMap,
        repairFranchisePersistence: repairLensPersistence,
      });
      setPreGameData(prepared);
      void loadFranchisePregameMilestoneWatchesForData({
        data: prepared,
        seasonId,
      }).then((watches) => {
        setPreGameData((current) =>
          current && current.scheduleGameId === prepared.scheduleGameId
            ? { ...current, milestoneWatches: watches }
            : current,
        );
      }).catch((caught) => {
        console.warn("[FranchiseLens] Milestone watch computation failed:", caught);
      });
    } catch (caught) {
      setToastMessage(
        caught instanceof FranchiseGameLaunchBlockedError
          ? caught.message
          : caught instanceof Error && caught.message
          ? `GameTracker launch blocked: ${caught.message}`
          : "GameTracker launch blocked. Try reloading the franchise.",
      );
    } finally {
      setIsPreparingGameLaunch(false);
    }
  };

  const handleLaunchGame = async () => {
    if (!preGameData) return;
    try {
      const navigation = await buildFranchiseGameTrackerNavigation({
        data: preGameData,
        franchiseId,
        leagueId: leagueId ?? undefined,
        seasonId,
        seasonNumber,
        franchiseConfig,
        stadiumMap,
        getTeamRecord,
      });
      markFranchisePostGameColumnsPending();
      navigate(navigation.pathname, { state: navigation.state });
      setPreGameData(null);
    } catch (caught) {
      setToastMessage(
        caught instanceof FranchiseGameLaunchBlockedError
          ? caught.message
          : caught instanceof Error && caught.message
          ? `GameTracker launch blocked: ${caught.message}`
          : "GameTracker launch blocked. Try reloading the franchise.",
      );
    }
  };

  if (error) {
    return (
      <div className="fen-root">
        <div className="fen-wrap" style={{ padding: 24 }} data-testid="franchise-lens-error">
          Could not load franchise <strong>{franchiseId}</strong>: {error}
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="fen-root">
        <div className="fen-wrap" style={{ padding: 24 }} data-testid="franchise-lens-loading">
          {isLoading
            ? "Loading the ballpark…"
            : `No franchise data found for "${franchiseId}". Seed the demo at /__preview/franchise-lens-seed.`}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="franchise-lens-live">
      <FranchiseLensHub
        teams={teams}
        active={active}
        hub={hub}
        onSelectTeam={setViewedTeamId}
        actions={{
          onCallUp: callUp,
          onSendDown: sendDown,
          onExecuteTrade: executeTrade,
          onSetFitness: setFitness,
          onScoreGame: handleScoreGame,
        }}
      />
      {isPreparingGameLaunch && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-[#1A2433] px-5 py-3 text-[11px] text-[#F4F1E4] shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
          PREPARING GAME...
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-[#1A2433] px-5 py-3 text-[11px] text-[#F4F1E4] shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
          {toastMessage}
        </div>
      )}
      {preGameData && (
        <FranchisePregameLaunchOverlay
          data={preGameData}
          onChange={setPreGameData}
          onBack={() => setPreGameData(null)}
          onLaunch={handleLaunchGame}
        />
      )}
    </div>
  );
}

export default FranchiseLensLivePreview;
