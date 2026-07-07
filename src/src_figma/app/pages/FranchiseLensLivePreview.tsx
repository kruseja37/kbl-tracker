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
  const [scoreOnlyGameId, setScoreOnlyGameId] = useState<string | null>(null);
  const [scoreOnlyAwayScore, setScoreOnlyAwayScore] = useState("");
  const [scoreOnlyHomeScore, setScoreOnlyHomeScore] = useState("");
  const [scoreOnlyError, setScoreOnlyError] = useState<string | null>(null);
  const [scoreOnlySaving, setScoreOnlySaving] = useState(false);
  const [pendingSkipGameId, setPendingSkipGameId] = useState<string | null>(null);
  const [skipSaving, setSkipSaving] = useState(false);

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
  const scoreOnlyGame = scoreOnlyGameId ? getScheduledGame(scoreOnlyGameId) : null;
  const pendingSkipGame = pendingSkipGameId ? getScheduledGame(pendingSkipGameId) : null;

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

  const openScoreOnlyModal = (scheduleGameId?: string) => {
    const game = getScheduledGame(scheduleGameId);
    if (!game || game.status !== "SCHEDULED") {
      setToastMessage("No scheduled game is available for score-only entry.");
      return;
    }
    setScoreOnlyGameId(game.id);
    setScoreOnlyAwayScore("");
    setScoreOnlyHomeScore("");
    setScoreOnlyError(null);
    setScoreOnlySaving(false);
  };

  const closeScoreOnlyModal = () => {
    setScoreOnlyGameId(null);
    setScoreOnlyAwayScore("");
    setScoreOnlyHomeScore("");
    setScoreOnlyError(null);
    setScoreOnlySaving(false);
  };

  const handleScoreOnlySubmit = async () => {
    if (!scoreOnlyGame) return;
    if (scoreOnlyAwayScore.trim() === "" || scoreOnlyHomeScore.trim() === "") {
      setScoreOnlyError("Enter both final scores");
      return;
    }
    const awayScore = Number(scoreOnlyAwayScore);
    const homeScore = Number(scoreOnlyHomeScore);
    try {
      setScoreOnlySaving(true);
      setScoreOnlyError(null);
      await scheduleData.completeFranchiseScoreOnly({
        scheduleGameId: scoreOnlyGame.id,
        seasonId,
        awayScore,
        homeScore,
      });
      reload();
      closeScoreOnlyModal();
      setToastMessage("Score-only final saved.");
    } catch (caught) {
      setScoreOnlyError(caught instanceof Error ? caught.message : "Failed to save final score");
      setScoreOnlySaving(false);
    }
  };

  const openSkipConfirm = (scheduleGameId?: string) => {
    const game = getScheduledGame(scheduleGameId);
    if (!game || game.status !== "SCHEDULED") {
      setToastMessage("No scheduled game is available to skip.");
      return;
    }
    setPendingSkipGameId(game.id);
  };

  const closeSkipConfirm = () => {
    setPendingSkipGameId(null);
    setSkipSaving(false);
  };

  const handleSkipGame = async () => {
    if (!pendingSkipGame) return;
    try {
      setSkipSaving(true);
      await scheduleData.updateStatus(pendingSkipGame.id, "SKIPPED");
      reload();
      setToastMessage("Game marked SKIPPED.");
      closeSkipConfirm();
    } catch (caught) {
      setToastMessage(caught instanceof Error ? caught.message : "Failed to skip game.");
      setSkipSaving(false);
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
          onScoreOnlyGame: openScoreOnlyModal,
          onSkipGame: openSkipConfirm,
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
      {scoreOnlyGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border-[6px] border-[#2A4A2F] bg-[#1A2433] p-6 text-[#F4F1E4] shadow-[8px_8px_0px_rgba(0,0,0,0.65)]">
            <div className="mb-4 text-center text-sm font-bold tracking-[0.18em]">SCORE ONLY</div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="text-[10px] uppercase tracking-[0.12em]">
                {teamNameMap[scoreOnlyGame.awayTeamId] ?? scoreOnlyGame.awayTeamId}
                <input
                  type="number"
                  min="0"
                  value={scoreOnlyAwayScore}
                  onChange={(event) => setScoreOnlyAwayScore(event.target.value)}
                  className="mt-2 w-full border-2 border-[#C4A853] bg-[#0F1720] px-3 py-2 text-sm text-[#F4F1E4]"
                />
              </label>
              <label className="text-[10px] uppercase tracking-[0.12em]">
                {teamNameMap[scoreOnlyGame.homeTeamId] ?? scoreOnlyGame.homeTeamId}
                <input
                  type="number"
                  min="0"
                  value={scoreOnlyHomeScore}
                  onChange={(event) => setScoreOnlyHomeScore(event.target.value)}
                  className="mt-2 w-full border-2 border-[#C4A853] bg-[#0F1720] px-3 py-2 text-sm text-[#F4F1E4]"
                />
              </label>
            </div>
            {scoreOnlyError ? <div className="mb-3 text-[10px] text-[#FFD7C6]">{scoreOnlyError}</div> : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeScoreOnlyModal}
                disabled={scoreOnlySaving}
                className="flex-1 border-2 border-[#53606A] bg-[#28323B] px-4 py-2 text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => void handleScoreOnlySubmit()}
                disabled={scoreOnlySaving}
                className="flex-1 border-2 border-[#2A2208] bg-[#CBA23F] px-4 py-2 text-xs font-bold text-[#1A2433]"
              >
                {scoreOnlySaving ? "SAVING" : "SAVE"}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingSkipGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border-[6px] border-[#7A2819] bg-[#1A2433] p-6 text-[#F4F1E4] shadow-[8px_8px_0px_rgba(0,0,0,0.65)]">
            <div className="mb-3 text-center text-sm font-bold tracking-[0.18em]">SKIP GAME</div>
            <div className="mb-5 text-center text-[11px] text-[#F4F1E4]/80">
              Mark {teamNameMap[pendingSkipGame.awayTeamId] ?? pendingSkipGame.awayTeamId} @ {teamNameMap[pendingSkipGame.homeTeamId] ?? pendingSkipGame.homeTeamId} as SKIPPED? This is permanent and cannot be scored later.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeSkipConfirm}
                disabled={skipSaving}
                className="flex-1 border-2 border-[#53606A] bg-[#28323B] px-4 py-2 text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => void handleSkipGame()}
                disabled={skipSaving}
                className="flex-1 border-2 border-[#7A2819] bg-[#FFD7C6] px-4 py-2 text-xs font-bold text-[#1A2433]"
              >
                {skipSaving ? "SKIPPING" : "SKIP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FranchiseLensLivePreview;
