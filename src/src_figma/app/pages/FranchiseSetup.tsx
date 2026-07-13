import { useState, useMemo, useEffect, useRef, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, CircleHelp, Gamepad2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLeagueBuilderData, type LeagueTemplate, type Team } from "../../hooks/useLeagueBuilderData";
import type { FranchiseConfig } from "../../../types/franchise";
import { initializeFranchise } from "../../../utils/franchiseInitializer";
import {
  loadFranchiseFreezeSummary,
  type FranchiseFreezeSummary,
  type FranchiseFreezeTeamSummary,
} from "../../../utils/franchiseFreezeSummary";
import {
  isCompletedLegacySnakeDraftSession,
  readMlbDraftCompletion,
} from "../../../utils/mlbDraftCompletion";
import {
  createFarmAuctionSessionId,
  getAuctionSessionById,
  getMlbDraftSession,
} from "../../../utils/leagueBuilderStorage";
import { readSnakeDraftTruth } from "../../../utils/snakeDraftManifest";
import { FARM_SNAKE_SESSION_NUMBER } from "../../../engines/snakeFarmSlots";
import {
  validatePreparedLeagueBuilderFarmScoutingState,
  type LeagueBuilderFarmScoutingValidationReport,
} from "../../../utils/leagueBuilderFarmScoutingHandoff";

const INITIAL_CONFIG: FranchiseConfig = {
  league: null,
  leagueDetails: null,
  season: {
    gamesPerTeam: 32,
    inningsPerGame: 7,
    extraInningsRule: "Standard",
    scheduleType: "Balanced",
    allStarGame: false,
    tradeDeadline: false,
    mercyRule: false,
  },
  playoffs: {
    teamsQualifying: 4,
    format: "Bracket",
    seriesLengths: {
      wildCard: "3 games",
      divisionSeries: "3 games",
      championship: "5 games",
      worldSeries: "7 games",
    },
    homeFieldAdvantage: "2-3-2",
  },
  teams: {
    selectedTeams: [],
    mode: "single",
    playerAssignments: {},
  },
  roster: {
    mode: "existing",
    startupProspectDraft: {
      enabled: true,
      rounds: 10,
      mode: "auto-snake-v1",
    },
  },
  franchiseName: "Dynasty League Season 1",
};

const STANDARD_PLAYOFF_TEAM_COUNT_OPTIONS = [4, 6, 8, 10, 12];
type FranchiseConfigSetter = Dispatch<SetStateAction<FranchiseConfig>>;

// WT-C: Season length is manual-schedule metadata, not a schedule-generator input —
// franchiseInitializer.ts sets schedulePolicy.generatedSchedulesAllowed=false, so there is
// no divisibility/parity constraint to derive here. Bounds below match the documented v1
// product range (MODE_1_LEAGUE_BUILDER_FINAL.md §C-071: gamesPerTeam 8-200) and the SMB4
// regulation-length range for innings (3-9; extra innings extend naturally beyond that).
const GAMES_PER_TEAM_MIN = 8;
const GAMES_PER_TEAM_MAX = 200;
const INNINGS_PER_GAME_MIN = 3;
const INNINGS_PER_GAME_MAX = 9;
const GAMES_PER_TEAM_PRESETS = [16, 32, 40, 80, 128, 162];
const INNINGS_PER_GAME_PRESETS = [6, 7, 9];

function clampSeasonInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getValidPlayoffTeamCountOptions(teamCount: number): number[] {
  const standardOptions = STANDARD_PLAYOFF_TEAM_COUNT_OPTIONS.filter((count) => count <= teamCount);
  if (standardOptions.length > 0) return standardOptions;
  return teamCount >= 2 ? [2] : [];
}

function clampPlayoffTeamsQualifying(currentCount: number, teamCount: number): number {
  const options = getValidPlayoffTeamCountOptions(teamCount);
  if (options.length === 0) return currentCount;
  if (options.includes(currentCount)) return currentCount;
  return options[options.length - 1];
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not stored";
  return Math.round(value).toLocaleString();
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not stored";
  return `$${Math.round(value).toLocaleString()}`;
}

function formatMoraleRange(min: number | null, average: number | null, max: number | null): string {
  if (min === null || average === null || max === null) return "Not stored";
  return `${Math.round(min)} / ${Math.round(average)} / ${Math.round(max)}`;
}

function buildConfigForSelectedLeague(
  current: FranchiseConfig,
  leagueId: string,
  leagues: readonly LeagueTemplate[],
  teams: readonly Team[],
): FranchiseConfig | null {
  const league = leagues.find((candidate) => candidate.id === leagueId);
  if (!league) return null;
  const leagueTeamIds = league.teamIds ?? [];
  const leagueTeams = teams.filter((team) => leagueTeamIds.includes(team.id));
  const teamCount = leagueTeams.length || leagueTeamIds.length || 0;
  const persistedSeats = (league.draftSeats ?? [])
    .map((seat) => ({ id: seat.id, name: seat.name.trim() }))
    .filter((seat) => seat.id && seat.name);
  const fallbackSeat = persistedSeats[0] ?? { id: "seat-you", name: "You" };
  const seatById = new Map(persistedSeats.map((seat) => [seat.id, seat]));
  const humanTeams = leagueTeams.filter((team) => team.controlledBy !== "ai");
  const playerAssignments = Object.fromEntries(leagueTeams.map((team) => {
    if (team.controlledBy === "ai") return [team.id, "cpu"];
    return [team.id, team.gmSeatId || fallbackSeat.id];
  }));
  const derivedSeats = new Map(persistedSeats.map((seat) => [seat.id, seat]));
  for (const team of humanTeams) {
    const seatId = team.gmSeatId || fallbackSeat.id;
    const seatName = team.gmSeatName?.trim() || seatById.get(seatId)?.name || fallbackSeat.name;
    derivedSeats.set(seatId, { id: seatId, name: seatName });
  }
  const distinctHumanOwners = new Set(humanTeams.map((team) => playerAssignments[team.id]));
  return {
    ...current,
    league: leagueId,
    leagueDetails: {
      name: league.name,
      teams: teamCount,
      conferences: league.conferences?.length || 0,
      divisions: league.divisions?.length || 0,
    },
    playoffs: {
      ...current.playoffs,
      teamsQualifying: clampPlayoffTeamsQualifying(current.playoffs.teamsQualifying, teamCount),
    },
    // Seed from the Draft Setup hub's ownership choices when present.
    teams: {
      ...current.teams,
      selectedTeams: humanTeams.map((team) => team.id),
      mode: distinctHumanOwners.size >= 2 ? "multiplayer" : "single",
      playerAssignments,
      seats: [...derivedSeats.values()],
    },
  };
}

interface DraftHandoffCompletion {
  hasMlbDraft: boolean;
  mlbComplete: boolean;
  farmComplete: boolean;
  complete: boolean;
  blocker: string | null;
}

async function readDraftHandoffCompletion(leagueId: string): Promise<DraftHandoffCompletion> {
  const mlb = await readMlbDraftCompletion(leagueId, 1);
  const hasMlbDraft = Boolean(mlb.auctionSession?.session || mlb.snakeSession);
  if (!mlb.complete) {
    return {
      hasMlbDraft,
      mlbComplete: false,
      farmComplete: false,
      complete: false,
      blocker: hasMlbDraft ? "THE MLB DRAFT RECORD IS INCOMPLETE OR INVALID." : null,
    };
  }

  // Keep the two reads sequential. The storage layer caches an opened database,
  // not the in-flight open promise, so parallel cold reads are unsafe in tests.
  const farmSnakeSession = await getMlbDraftSession(leagueId, FARM_SNAKE_SESSION_NUMBER);
  const farmAuction = await getAuctionSessionById(createFarmAuctionSessionId(leagueId, 1));
  let snakeFarmComplete = false;
  if (mlb.snakeComplete) {
    if (mlb.snakeSession?.draftManifest) {
      if (farmSnakeSession?.draftManifest) {
        try {
          readSnakeDraftTruth(farmSnakeSession, "FARM");
          snakeFarmComplete = true;
        } catch {
          snakeFarmComplete = false;
        }
      }
    } else {
      snakeFarmComplete = isCompletedLegacySnakeDraftSession(farmSnakeSession, "FARM");
    }
  }
  const auctionFarmComplete = mlb.auctionComplete && farmAuction?.session.state === "AUCTION_COMPLETE";
  const farmComplete = snakeFarmComplete || auctionFarmComplete;
  return {
    hasMlbDraft,
    mlbComplete: true,
    farmComplete,
    complete: farmComplete,
    blocker: farmComplete ? null : "THE FARM DRAFT IS NOT COMPLETE OR ITS FROZEN RECORD IS INVALID.",
  };
}

export function FranchiseSetup() {
  const navigate = useNavigate();
  const {
    leagues,
    teams,
    isLoading,
    error,
    seedSMB4Data,
    refresh,
  } = useLeagueBuilderData();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<FranchiseConfig>(INITIAL_CONFIG);
  const [livingSeasonEnabled, setLivingSeasonEnabled] = useState(false);
  const [postFreezeSummary, setPostFreezeSummary] = useState<FranchiseFreezeSummary | null>(null);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [draftHandoffChecks, setDraftHandoffChecks] = useState<Record<string, DraftHandoffCompletion>>({});
  const [draftCompletionErrors, setDraftCompletionErrors] = useState<Record<string, string>>({});
  const [draftCompletionChecked, setDraftCompletionChecked] = useState(false);
  const [draftCompletionRevision, setDraftCompletionRevision] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [farmScoutingReport, setFarmScoutingReport] =
    useState<LeagueBuilderFarmScoutingValidationReport | null>(null);
  const [farmScoutingLoading, setFarmScoutingLoading] = useState(false);
  const [farmScoutingError, setFarmScoutingError] = useState<string | null>(null);
  const [farmValidationRevision, setFarmValidationRevision] = useState(0);
  const autoSeedAttempted = useRef(false);
  const handoffLeagueApplied = useRef(false);
  const handoffLivingSeasonApplied = useRef(false);
  const requestedLeagueId = useMemo(() => new URLSearchParams(window.location.search).get("leagueId"), []);
  const leagueIdsKey = leagues.map((league) => league.id).join("|");

  // Auto-seed SMB4 data if no leagues exist (first-time setup)
  useEffect(() => {
    if (!isLoading && !error && leagues.length === 0 && !autoSeedAttempted.current) {
      autoSeedAttempted.current = true;
      console.log('[FranchiseSetup] No leagues found, auto-seeding SMB4 data...');
      seedSMB4Data(false).catch((err) => {
        console.error('[FranchiseSetup] Auto-seed failed:', err);
      });
    }
  }, [isLoading, error, leagues.length, seedSMB4Data]);

  useEffect(() => {
    if (handoffLeagueApplied.current || !requestedLeagueId || isLoading || leagues.length === 0) return;
    if (!leagues.some((league) => league.id === requestedLeagueId)) return;
    handoffLeagueApplied.current = true;
    setConfig((current) => {
      const nextConfig = buildConfigForSelectedLeague(current, requestedLeagueId, leagues, teams);
      return nextConfig ?? current;
    });
    setExpandedLeague(requestedLeagueId);
  }, [isLoading, leagues, requestedLeagueId, teams]);

  useEffect(() => {
    if (isLoading) {
      setDraftCompletionChecked(false);
      return;
    }
    if (leagues.length === 0) {
      setDraftHandoffChecks({});
      setDraftCompletionErrors({});
      setDraftCompletionChecked(true);
      return;
    }
    setDraftCompletionChecked(false);
    let cancelled = false;
    Promise.all(leagues.map(async (league) => {
      try {
        return { leagueId: league.id, check: await readDraftHandoffCompletion(league.id), error: null };
      } catch (caught) {
        return {
          leagueId: league.id,
          check: null,
          error: caught instanceof Error ? caught.message : "Draft completion could not be read.",
        };
      }
    })).then((results) => {
      if (cancelled) return;
      setDraftHandoffChecks(Object.fromEntries(results.flatMap((result) => result.check ? [[result.leagueId, result.check]] : [])));
      setDraftCompletionErrors(Object.fromEntries(results.flatMap((result) => result.error ? [[result.leagueId, result.error]] : [])));
      setDraftCompletionChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, leagueIdsKey, draftCompletionRevision]);

  useEffect(() => {
    if (!config.league) {
      setFarmScoutingReport(null);
      setFarmScoutingError(null);
      setFarmScoutingLoading(false);
      return;
    }

    let cancelled = false;
    setFarmScoutingLoading(true);
    setFarmScoutingError(null);
    validatePreparedLeagueBuilderFarmScoutingState(config.league)
      .then((report) => {
        if (cancelled) return;
        setFarmScoutingReport(report);
      })
      .catch((err) => {
        if (cancelled) return;
        setFarmScoutingReport(null);
        setFarmScoutingError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setFarmScoutingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.league, farmValidationRevision]);

  // Get teams that belong to the selected league
  const leagueTeams = useMemo(() => {
    if (!config.league) return [];
    const selectedLeague = leagues.find(l => l.id === config.league);
    if (!selectedLeague) return [];
    // Filter teams that are in the selected league's teamIds array
    return teams.filter(t => selectedLeague.teamIds?.includes(t.id));
  }, [config.league, leagues, teams]);

  useEffect(() => {
    const teamCount = config.leagueDetails?.teams ?? leagueTeams.length;
    if (!config.league || teamCount <= 0) return;
    const clampedTeamsQualifying = clampPlayoffTeamsQualifying(config.playoffs.teamsQualifying, teamCount);
    if (clampedTeamsQualifying === config.playoffs.teamsQualifying) return;
    setConfig({
      ...config,
      playoffs: {
        ...config.playoffs,
        teamsQualifying: clampedTeamsQualifying,
      },
    });
  }, [config, leagueTeams.length]);

  const draftedLeagueIds = useMemo(
    () => new Set(Object.entries(draftHandoffChecks).filter(([, check]) => check.complete).map(([leagueId]) => leagueId)),
    [draftHandoffChecks],
  );
  const requestedHandoffCheck = requestedLeagueId ? draftHandoffChecks[requestedLeagueId] : null;
  const requestedCompletionError = requestedLeagueId ? draftCompletionErrors[requestedLeagueId] ?? null : null;
  const requestedHandoffBlocker = requestedHandoffCheck?.hasMlbDraft && !requestedHandoffCheck.complete
    ? requestedHandoffCheck.blocker
    : null;
  const draftHandoffMode = Boolean(
    requestedLeagueId
      && draftCompletionChecked
      && config.league === requestedLeagueId
      && requestedHandoffCheck?.complete,
  );
  const handoffCheckPending = Boolean(requestedLeagueId && !draftCompletionChecked && !isLoading && !error);
  const handoffGateStopped = Boolean(requestedCompletionError || requestedHandoffBlocker);
  const stepLabels = draftHandoffMode
    ? ["Season", "Confirm"]
    : ["League", "Season", "Playoffs", "Teams", "Rosters", "Confirm"];
  const totalSteps = stepLabels.length;

  useEffect(() => {
    if (!draftHandoffMode || handoffLivingSeasonApplied.current) return;
    handoffLivingSeasonApplied.current = true;
    setLivingSeasonEnabled(true);
  }, [draftHandoffMode]);

  const handleNext = async () => {
    if (isInitializing) return;
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Start franchise — persist to IndexedDB and navigate
      setIsInitializing(true);
      setInitError(null);
      try {
        let handoffValidation = config.league
          ? await validatePreparedLeagueBuilderFarmScoutingState(config.league)
          : null;
        if (handoffValidation) {
          setFarmScoutingReport(handoffValidation);
          if (handoffValidation.status === 'blocked') {
            throw new Error(`League Builder farm/scouting handoff blocked: ${handoffValidation.blockers.join(' ')}`);
          }
        }

        if (handoffValidation && handoffValidation.status !== 'prepared') {
          throw new Error(`League Builder farm/scouting handoff is not prepared: ${[
            ...handoffValidation.blockers,
            ...handoffValidation.warnings,
          ].join(' ')}`);
        }
        const franchiseId = await initializeFranchise(
          config,
          livingSeasonEnabled ? { livingSeason: true } : undefined,
        );
        const summary = await loadFranchiseFreezeSummary(franchiseId);
        setPostFreezeSummary(summary);
        setIsInitializing(false);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : 'Failed to create franchise');
        setIsInitializing(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    if (draftHandoffMode && config.league) {
      navigate(`/league-builder/staff-hire?leagueId=${encodeURIComponent(config.league)}`);
      return;
    }
    navigate("/");
  };

  const handleEnterFranchise = () => {
    if (!postFreezeSummary) return;
    navigate(`/franchise/${postFreezeSummary.franchiseId}`, {
      replace: true,
      state: {
        createdFromSetup: true,
        franchiseId: postFreezeSummary.franchiseId,
      },
    });
  };

  const canProceed = () => {
    if (draftHandoffMode) {
      if (currentStep === 1) return config.league !== null;
      return config.teams.selectedTeams.length > 0
        && !farmScoutingLoading
        && farmScoutingReport?.status === "prepared";
    }
    switch (currentStep) {
      case 1:
        return config.league !== null;
      case 4:
        return config.teams.selectedTeams.length > 0;
      default:
        return true;
    }
  };
  const canAdvance = !isInitializing && !handoffCheckPending && canProceed();

  const jumpToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] flex items-center justify-center p-6">
      {/* Initialization overlay */}
      {isInitializing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#4A6A42] border-[6px] border-[#E8E8D8] p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <Loader2 className="w-12 h-12 animate-spin text-[#C4A853] mx-auto mb-4" />
            <p className="text-lg text-[#E8E8D8] font-bold tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>CREATING FRANCHISE</p>
            <p className="text-xs text-[#E8E8D8]/70 mt-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Initializing empty season schedule...</p>
          </div>
        </div>
      )}

      {showFreezeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="freeze-confirm-title"
            className="w-full max-w-[520px] bg-[#4A6A42] border-[6px] border-[#E8E8D8] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
          >
            <h2 id="freeze-confirm-title" className="text-lg font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
              Start the franchise?
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#E8E8D8]/85" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              This LOCKS your rosters, starting morale, and league rules — it can't be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowFreezeConfirm(false)}
                className="px-6 py-3 bg-transparent border-4 border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#E8E8D8]/10 transition-all active:scale-95 font-bold text-sm tracking-wide"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowFreezeConfirm(false);
                  void handleNext();
                }}
                disabled={isInitializing}
                className={`px-6 py-3 border-4 border-[#E8E8D8] font-bold text-sm tracking-wide transition-all ${
                  isInitializing
                    ? "bg-[#3A5A32] text-[#8A9A82] border-[#8A9A82] cursor-not-allowed"
                    : "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                }`}
                style={!isInitializing ? { textShadow: '1px 1px 0px rgba(0,0,0,0.2)' } : {}}
              >
                Start Franchise
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[800px] bg-[#5A7A52] border-[6px] border-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        {/* Init error banner */}
        {initError && (
          <div className="bg-[#DD0000]/20 border-b-4 border-[#DD0000] px-6 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#DD0000] shrink-0" />
            <p className="text-xs text-[#DD0000]">{initError}</p>
            <button onClick={() => setInitError(null)} className="ml-auto text-xs text-[#DD0000]/70 hover:text-[#DD0000]">[Dismiss]</button>
          </div>
        )}

        {/* Header */}
        <div className="bg-[#4A6A42] border-b-[6px] border-[#E8E8D8] px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>{draftHandoffMode ? "FRANCHISE LAUNCH" : "NEW FRANCHISE"}</h1>
            <span className="text-sm text-[#E8E8D8]/80" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>Step {currentStep} of {totalSteps}</span>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {stepLabels.map((_, idx) => {
              const step = idx + 1;
              return (
              <div key={step} className="flex items-center" style={{ flex: idx < stepLabels.length - 1 ? 1 : 0 }}>
                <button
                  onClick={() => jumpToStep(step)}
                  disabled={step > currentStep}
                  className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${
                    step < currentStep
                      ? "bg-[#00CC00] border-[#00CC00] cursor-pointer hover:scale-110"
                      : step === currentStep
                      ? "bg-[#C4A853] border-[#C4A853] animate-pulse"
                      : "bg-transparent border-[#8A9A82]"
                  }`}
                >
                  {step < currentStep ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs text-[#4A6A42] font-bold">{step}</span>
                  )}
                </button>
                {idx < stepLabels.length - 1 && (
                  <div
                    className={`h-1 mx-2 flex-1 ${
                      step < currentStep
                        ? "bg-[#00CC00]"
                        : step === currentStep
                        ? "bg-gradient-to-r from-[#C4A853] to-[#8A9A82]"
                        : "bg-[#8A9A82] opacity-30"
                    }`}
                  />
                )}
              </div>
            );})}
          </div>

          {/* Step Labels */}
          <div className="flex items-center justify-between mt-2">
            {stepLabels.map((label, idx) => (
              <div
                key={label}
                className="text-[9px] text-[#E8E8D8]/70 text-center"
                style={{ flex: idx < stepLabels.length - 1 ? 1 : 0, width: idx === stepLabels.length - 1 ? "60px" : "auto", textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {isLoading || handoffCheckPending ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
              <span className="ml-3 text-[#E8E8D8]">{handoffCheckPending ? "Checking completed draft..." : "Loading leagues..."}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
              <p className="text-[#DD0000] mb-2">Failed to load leagues</p>
              <p className="text-xs text-[#E8E8D8]/70">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-4 inline-flex items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-2 text-xs font-bold text-[#4A6A42]"
              >
                <RefreshCw className="h-4 w-4" /> RETRY LEAGUES
              </button>
            </div>
          ) : requestedCompletionError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
              <p className="font-bold text-[#DD0000] mb-2">DRAFT HANDOFF COULD NOT LOAD</p>
              <p className="text-xs text-[#E8E8D8]/70">{requestedCompletionError}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setDraftCompletionRevision((current) => current + 1)} className="inline-flex items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-2 text-xs font-bold text-[#4A6A42]">
                  <RefreshCw className="h-4 w-4" /> RETRY DRAFT HANDOFF
                </button>
                <button type="button" onClick={() => navigate(`/league-builder/staff-hire?leagueId=${encodeURIComponent(requestedLeagueId ?? "")}`)} className="border-4 border-[#E8E8D8] px-4 py-2 text-xs font-bold text-[#E8E8D8]">
                  BACK TO STAFFING
                </button>
              </div>
            </div>
          ) : requestedHandoffBlocker ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#FFD27A] mb-3" />
              <p className="font-bold text-[#FFD27A] mb-2">DRAFT HANDOFF NOT READY</p>
              <p className="text-xs text-[#E8E8D8]/75">{requestedHandoffBlocker}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => setDraftCompletionRevision((current) => current + 1)} className="inline-flex items-center gap-2 border-4 border-[#E8E8D8] bg-[#C4A853] px-4 py-2 text-xs font-bold text-[#4A6A42]">
                  <RefreshCw className="h-4 w-4" /> RECHECK DRAFTS
                </button>
                <button type="button" onClick={() => navigate(`/league-builder/staff-hire?leagueId=${encodeURIComponent(requestedLeagueId ?? "")}`)} className="border-4 border-[#E8E8D8] px-4 py-2 text-xs font-bold text-[#E8E8D8]">
                  BACK TO STAFFING
                </button>
              </div>
            </div>
          ) : leagues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
              <p className="text-[#E8E8D8] mb-2">No leagues found</p>
              <p className="text-xs text-[#E8E8D8]/70 mb-4">Create a league in League Builder first</p>
              <button
                onClick={() => navigate("/league-builder")}
                className="px-6 py-3 bg-[#C4A853] border-4 border-[#E8E8D8] text-[#4A6A42] font-bold text-sm hover:bg-[#B59A4A] transition-all"
              >
                GO TO LEAGUE BUILDER
              </button>
            </div>
          ) : (
            <>
              {postFreezeSummary ? (
                <PostFreezeSummaryPanel summary={postFreezeSummary} />
              ) : (
                <>
                  {draftHandoffMode ? (
                    <>
                      {currentStep === 1 && <Step2SeasonSettings config={config} setConfig={setConfig} />}
                      {currentStep === 2 && <DraftHandoffConfirm
                        config={config}
                        setConfig={setConfig}
                        leagueTeams={leagueTeams}
                        farmScoutingReport={farmScoutingReport}
                        farmScoutingLoading={farmScoutingLoading}
                        farmScoutingError={farmScoutingError}
                        onRetryHandoff={() => setFarmValidationRevision((current) => current + 1)}
                        livingSeasonEnabled={livingSeasonEnabled}
                        setLivingSeasonEnabled={setLivingSeasonEnabled}
                      />}
                    </>
                  ) : (
                    <>
                      {Object.keys(draftCompletionErrors).length > 0 ? (
                        <div className="mb-5 border-4 border-[#FFD27A] bg-[#6B3A3A] p-3 text-xs font-bold text-[#FFE8B0]">
                          DRAFT STATUS COULD NOT LOAD FOR {Object.keys(draftCompletionErrors).length} LEAGUE{Object.keys(draftCompletionErrors).length === 1 ? "" : "S"}.
                          <button type="button" onClick={() => setDraftCompletionRevision((current) => current + 1)} className="ml-3 underline">RETRY</button>
                        </div>
                      ) : null}
                      {currentStep === 1 && <Step1SelectLeague config={config} setConfig={setConfig} expandedLeague={expandedLeague} setExpandedLeague={setExpandedLeague} leagues={leagues} teams={teams} draftedLeagueIds={draftedLeagueIds} />}
                      {currentStep === 2 && <Step2SeasonSettings config={config} setConfig={setConfig} />}
                      {currentStep === 3 && <Step3PlayoffSettings config={config} setConfig={setConfig} />}
                      {currentStep === 4 && <Step4TeamControl config={config} setConfig={setConfig} leagueTeams={leagueTeams} />}
                      {currentStep === 5 && <Step5RosterMode config={config} setConfig={setConfig} leagueTeams={leagueTeams} farmScoutingReport={farmScoutingReport} farmScoutingLoading={farmScoutingLoading} farmScoutingError={farmScoutingError} />}
                      {currentStep === 6 && <Step6Confirm config={config} setConfig={setConfig} jumpToStep={jumpToStep} leagues={leagues} leagueTeams={leagueTeams} farmScoutingReport={farmScoutingReport} farmScoutingLoading={farmScoutingLoading} farmScoutingError={farmScoutingError} livingSeasonEnabled={livingSeasonEnabled} setLivingSeasonEnabled={setLivingSeasonEnabled} />}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-[6px] border-[#E8E8D8] px-8 py-5 flex items-center justify-end gap-3 bg-[#4A6A42]">
          {handoffGateStopped ? null : postFreezeSummary ? (
            <button
              onClick={handleEnterFranchise}
              className="px-8 py-3 border-4 border-[#E8E8D8] bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] font-bold text-sm tracking-wide flex items-center gap-2 transition-all"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              <Gamepad2 className="w-4 h-4" />
              ENTER YOUR FRANCHISE
            </button>
          ) : (
            <>
              {(currentStep > 1 || draftHandoffMode) && (
                <button
                  onClick={currentStep > 1 ? handleBack : handleCancel}
                  className="px-6 py-3 bg-transparent border-4 border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#E8E8D8]/10 transition-all active:scale-95 font-bold text-sm tracking-wide flex items-center gap-2"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  {currentStep > 1 ? "BACK" : "BACK TO STAFFING"}
                </button>
              )}
              {!draftHandoffMode ? (
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 text-[#DD0000] hover:text-[#FF0000] transition-all font-bold text-sm tracking-wide"
                  style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                >
                  CANCEL
                </button>
              ) : null}
              <button
                onClick={currentStep === totalSteps ? () => setShowFreezeConfirm(true) : handleNext}
                disabled={!canAdvance}
                className={`px-8 py-3 border-4 border-[#E8E8D8] font-bold text-sm tracking-wide transition-all flex items-center gap-2 ${
                  canAdvance
                    ? "bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                    : "bg-[#3A5A32] text-[#8A9A82] border-[#8A9A82] cursor-not-allowed"
                }`}
                style={canAdvance ? { textShadow: '1px 1px 0px rgba(0,0,0,0.2)' } : {}}
              >
                {currentStep === totalSteps ? (
                  <>
                    <Gamepad2 className="w-4 h-4" />
                    START FRANCHISE
                  </>
                ) : (
                  <>
                    NEXT
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FreezeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/40 p-3">
      <p className="text-[9px] uppercase tracking-wide text-[#E8E8D8]/60" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{label}</p>
      <p className="mt-1 text-sm font-bold text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{value}</p>
    </div>
  );
}

function FreezeTeamRow({ team }: { team: FranchiseFreezeTeamSummary }) {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 border-t border-[#E8E8D8]/20 py-2 text-[10px] text-[#E8E8D8]/80">
      <span className="font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{team.teamName}</span>
      <span>{formatMoney(team.payrollBaseline)}</span>
      <span>{formatNumber(team.mlbRosterCount)} MLB / {formatNumber(team.farmRosterCount)} FARM</span>
      <span>{formatNumber(team.fanMoraleBaseline)}</span>
    </div>
  );
}

function PostFreezeSummaryPanel({ summary }: { summary: FranchiseFreezeSummary }) {
  const shownTeams = summary.teams.slice(0, 8);
  const hiddenTeamCount = Math.max(0, summary.teams.length - shownTeams.length);

  return (
    <div>
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>FREEZE SUMMARY</h2>
      <p className="text-xs text-[#E8E8D8]/70 mb-6" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
        Read-only snapshot loaded from the franchise save after initialization.
      </p>

      <div className="bg-[#3A5A32] border-4 border-[#E8E8D8] p-5 space-y-5">
        <div>
          <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FROZEN LEDGER</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FreezeStat label="Franchise" value={summary.leagueName} />
            <FreezeStat label="Player rows" value={formatNumber(summary.frozenPlayerRows)} />
            <FreezeStat label="Settled salaries" value={formatNumber(summary.settledSalaryPlayerRows)} />
            <FreezeStat label="Draft TV rows" value={formatNumber(summary.draftBaselineRows)} />
          </div>
        </div>

        <div>
          <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FOUR FREEZE NUMBERS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FreezeStat label="Contract values" value={formatNumber(summary.draftBaselineContractRows)} />
            <FreezeStat label="Player morale" value={formatNumber(summary.morale.playerCount)} />
            <FreezeStat label="Fan morale" value={formatNumber(summary.morale.teamFanCount)} />
            <FreezeStat label="Roster snapshot" value={`${formatNumber(summary.rosterTotals.mlb)} MLB / ${formatNumber(summary.rosterTotals.farm)} FARM`} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <FreezeStat label="Player morale min / avg / max" value={formatMoraleRange(summary.morale.playerMin, summary.morale.playerAverage, summary.morale.playerMax)} />
          <FreezeStat label="Fan morale min / avg / max" value={formatMoraleRange(summary.morale.teamFanMin, summary.morale.teamFanAverage, summary.morale.teamFanMax)} />
        </div>

        <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 pb-2 text-[9px] uppercase tracking-wide text-[#C4A853]">
            <span>Team</span>
            <span>Payroll baseline</span>
            <span>Roster count</span>
            <span>Fan morale</span>
          </div>
          {shownTeams.map((team) => <FreezeTeamRow key={team.teamId} team={team} />)}
          {hiddenTeamCount > 0 && (
            <p className="border-t border-[#E8E8D8]/20 pt-2 text-[10px] text-[#E8E8D8]/60">
              +{hiddenTeamCount} more teams frozen in the same persisted roster snapshot.
            </p>
          )}
        </div>

        {summary.notDisplayable.length > 0 && (
          <div className="bg-[#1A3A12] border-2 border-[#C4A853] p-4">
            <p className="text-xs text-[#C4A853] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>NOT DISPLAYABLE FROM PERSISTED FREEZE DATA</p>
            <ul className="space-y-1">
              {summary.notDisplayable.map((gap) => (
                <li key={gap} className="text-[10px] leading-5 text-[#E8E8D8]/75">{gap}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 1: Select League
function Step1SelectLeague({
  config,
  setConfig,
  expandedLeague,
  setExpandedLeague,
  leagues,
  teams,
  draftedLeagueIds,
}: {
  config: FranchiseConfig;
  setConfig: FranchiseConfigSetter;
  expandedLeague: string | null;
  setExpandedLeague: (id: string | null) => void;
  leagues: LeagueTemplate[];
  teams: Team[];
  draftedLeagueIds: Set<string>;
}) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const selectLeague = (leagueId: string) => {
    setConfig((current) => buildConfigForSelectedLeague(current, leagueId, leagues, teams) ?? current);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SELECT A LEAGUE</h2>
        <button type="button" aria-label="LEAGUE SELECTION HELP" aria-expanded={helpOpen} onClick={() => setHelpOpen((current) => !current)} className="flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]">
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {helpOpen ? (
        <aside aria-label="League selection instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs text-[#E8E8D8]/80">
          CHOOSE THE LEAGUE TEMPLATE FOR THIS FRANCHISE. A DRAFT COMPLETE BADGE MEANS BOTH DRAFT LEGS HAVE COHERENT COMPLETION RECORDS.
        </aside>
      ) : null}

      <div className="space-y-4">
        {leagues.map((league) => {
          const isSelected = config.league === league.id;
          const isExpanded = expandedLeague === league.id;
          const isDrafted = draftedLeagueIds.has(league.id);
          const leagueTeamCount = teams.filter(t => league.teamIds?.includes(t.id)).length;
          const conferenceCount = league.conferences?.length || 0;
          const divisionCount = league.divisions?.length || 0;

          return (
            <div
              key={league.id}
              onClick={() => selectLeague(league.id)}
              className={`border-4 p-4 transition-all cursor-pointer ${
                isSelected
                  ? "border-[#C4A853] bg-[#C4A853]/10"
                  : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${
                    isSelected ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8] bg-transparent"
                  }`}
                >
                  {isSelected && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
                </div>

                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{league.name.toUpperCase()}</h3>
                    {isDrafted ? (
                      <span className="border-2 border-[#C4A853] bg-[#243024] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#FFD27A]">
                        Draft complete
                      </span>
                    ) : null}
                  </div>
                  <div className="h-[1px] bg-[#E8E8D8]/30 mb-2" />
                  <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                    {leagueTeamCount || league.teamIds?.length || 0} teams
                    {conferenceCount > 0 && ` • ${conferenceCount} conferences`}
                    {divisionCount > 0 && ` • ${divisionCount} divisions`}
                  </p>
                  {league.description && (
                    <p className="text-xs text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{league.description}</p>
                  )}

                  {/* Show conferences/divisions if expanded */}
                  {isExpanded && (league.conferences?.length || 0) > 0 && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                      {league.conferences?.map((conf) => (
                        <div key={conf.id}>
                          <p className="text-xs text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{conf.name}</p>
                          <div className="ml-4 space-y-1">
                            {league.divisions?.filter(d => d.conferenceId === conf.id).map((div) => (
                              <p key={div.id} className="text-[10px] text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                                ├─ {div.name} ({div.teamIds?.length || 0} teams)
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show teams list if expanded and no conferences */}
                  {isExpanded && (league.conferences?.length || 0) === 0 && (league.teamIds?.length || 0) > 0 && (
                    <div className="mt-4 animate-in fade-in duration-300">
                      <p className="text-xs text-[#E8E8D8] font-bold mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>Teams in this league:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {teams.filter(t => league.teamIds?.includes(t.id)).map(team => (
                          <div key={team.id} className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full border border-[#E8E8D8]/30"
                              style={{ backgroundColor: team.colors?.primary || '#666' }}
                            />
                            <span className="text-[10px] text-[#E8E8D8]/70">{team.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {((league.conferences?.length || 0) > 0 || (league.teamIds?.length || 0) > 0) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedLeague(isExpanded ? null : league.id); }}
                    className="text-[#E8E8D8]/50 hover:text-[#E8E8D8] text-xs"
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => navigate("/league-builder/leagues?new=true")}
          className="w-full border-4 border-dashed border-[#E8E8D8]/30 p-4 text-[#E8E8D8]/50 hover:text-[#E8E8D8] hover:border-[#E8E8D8]/50 transition-all text-xs"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
        >
          [+] Create New League in League Builder
        </button>
      </div>
    </div>
  );
}

// Step 2: Season Settings
function Step2SeasonSettings({
  config,
  setConfig,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
}) {
  const selectedExtraInningsRunnerDelay = config.season.extraInningsRunnerDelay ?? 1;
  const ghostRunnerStartInning = config.season.inningsPerGame + selectedExtraInningsRunnerDelay;
  const formatOrdinal = (value: number) => {
    const remainder = value % 100;
    if (remainder >= 11 && remainder <= 13) return `${value}th`;
    switch (value % 10) {
      case 1:
        return `${value}st`;
      case 2:
        return `${value}nd`;
      case 3:
        return `${value}rd`;
      default:
        return `${value}th`;
    }
  };
  const extraInningsHint =
    config.season.extraInningsRule === "Runner on 2nd"
      ? `ℹ️ Ghost runner takes second starting the ${formatOrdinal(ghostRunnerStartInning)} inning`
    : "ℹ️ Standard: No runner placed, play until there's a winner";

  const presets = [
    { id: "standard", name: "Standard", games: 32, innings: 7 },
    { id: "quick", name: "Quick Play", games: 16, innings: 6 },
    { id: "full", name: "Full Season", games: 162, innings: 9 },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setConfig({
      ...config,
      season: {
        ...config.season,
        gamesPerTeam: preset.games,
        inningsPerGame: preset.innings,
      },
    });
  };

  const isCustomGamesActive = !GAMES_PER_TEAM_PRESETS.includes(config.season.gamesPerTeam);
  const isCustomInningsActive = !INNINGS_PER_GAME_PRESETS.includes(config.season.inningsPerGame);

  const [customGamesText, setCustomGamesText] = useState(String(config.season.gamesPerTeam));
  const [customInningsText, setCustomInningsText] = useState(String(config.season.inningsPerGame));
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setCustomGamesText(String(config.season.gamesPerTeam));
  }, [config.season.gamesPerTeam]);

  useEffect(() => {
    setCustomInningsText(String(config.season.inningsPerGame));
  }, [config.season.inningsPerGame]);

  const commitCustomGames = () => {
    const parsed = Number.parseInt(customGamesText, 10);
    const clamped = Number.isFinite(parsed)
      ? clampSeasonInt(parsed, GAMES_PER_TEAM_MIN, GAMES_PER_TEAM_MAX)
      : config.season.gamesPerTeam;
    setCustomGamesText(String(clamped));
    if (clamped !== config.season.gamesPerTeam) {
      setConfig({ ...config, season: { ...config.season, gamesPerTeam: clamped } });
    }
  };

  const commitCustomInnings = () => {
    const parsed = Number.parseInt(customInningsText, 10);
    const clamped = Number.isFinite(parsed)
      ? clampSeasonInt(parsed, INNINGS_PER_GAME_MIN, INNINGS_PER_GAME_MAX)
      : config.season.inningsPerGame;
    setCustomInningsText(String(clamped));
    if (clamped !== config.season.inningsPerGame) {
      setConfig({ ...config, season: { ...config.season, inningsPerGame: clamped } });
    }
  };

  const commitOnEnter = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      commit();
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SEASON SETTINGS</h2>
        <button
          type="button"
          aria-label="FRANCHISE SETUP HELP"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]"
        >
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {helpOpen ? (
        <aside aria-label="Franchise setup instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs leading-5 text-[#E8E8D8]/80">
          <p>PRESETS FILL THE GAMES AND INNINGS VALUES; CUSTOM VALUES ALLOW {GAMES_PER_TEAM_MIN}–{GAMES_PER_TEAM_MAX} GAMES AND {INNINGS_PER_GAME_MIN}–{INNINGS_PER_GAME_MAX} INNINGS.</p>
          <p className="mt-2">THE FRANCHISE STARTS WITH AN EMPTY SCHEDULE. ADD GAMES MANUALLY OR IMPORT A CSV FROM THE LIVING SEASON SCHEDULE SCREEN.</p>
        </aside>
      ) : null}

      {/* Quick Presets */}
      <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4 mb-6">
        <p className="text-xs text-[#E8E8D8]/70 mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>QUICK PRESETS</p>
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset) => {
            const isActive =
              config.season.gamesPerTeam === preset.games && config.season.inningsPerGame === preset.innings;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-4 py-2 rounded-full border-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                    : "bg-transparent border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
                }`}
                style={{ textShadow: isActive ? '1px 1px 0px rgba(0,0,0,0.2)' : '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                {preset.name} {isActive && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Games Per Team */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>GAMES PER TEAM</p>
        <div className="flex gap-2 flex-wrap items-stretch">
          {GAMES_PER_TEAM_PRESETS.map((num) => (
            <button
              key={num}
              onClick={() =>
                setConfig({
                  ...config,
                  season: { ...config.season, gamesPerTeam: num },
                })
              }
              className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                config.season.gamesPerTeam === num
                  ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                  : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
              }`}
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              {num}
            </button>
          ))}
          <div
            className={`flex items-center gap-2 h-10 px-3 border-4 text-sm font-bold transition-all ${
              isCustomGamesActive
                ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] focus-within:border-[#C4A853]"
            }`}
          >
            <label
              htmlFor="season-games-per-team-custom"
              className="text-[10px] uppercase tracking-wide"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              Custom
            </label>
            <input
              id="season-games-per-team-custom"
              type="number"
              inputMode="numeric"
              min={GAMES_PER_TEAM_MIN}
              max={GAMES_PER_TEAM_MAX}
              value={customGamesText}
              onChange={(e) => setCustomGamesText(e.target.value)}
              onBlur={commitCustomGames}
              onKeyDown={commitOnEnter(commitCustomGames)}
              className="w-14 bg-transparent border-0 outline-none text-sm font-bold text-inherit"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            />
          </div>
        </div>
      </div>

      {/* Innings Per Game */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>INNINGS PER GAME</p>
        <div className="flex gap-2 flex-wrap items-stretch">
          {INNINGS_PER_GAME_PRESETS.map((num) => (
            <button
              key={num}
              onClick={() =>
                setConfig({
                  ...config,
                  season: { ...config.season, inningsPerGame: num },
                })
              }
              className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                config.season.inningsPerGame === num
                  ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                  : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
              }`}
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              {num}
            </button>
          ))}
          <div
            className={`flex items-center gap-2 h-10 px-3 border-4 text-sm font-bold transition-all ${
              isCustomInningsActive
                ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] focus-within:border-[#C4A853]"
            }`}
          >
            <label
              htmlFor="season-innings-per-game-custom"
              className="text-[10px] uppercase tracking-wide"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            >
              Custom
            </label>
            <input
              id="season-innings-per-game-custom"
              type="number"
              inputMode="numeric"
              min={INNINGS_PER_GAME_MIN}
              max={INNINGS_PER_GAME_MAX}
              value={customInningsText}
              onChange={(e) => setCustomInningsText(e.target.value)}
              onBlur={commitCustomInnings}
              onKeyDown={commitOnEnter(commitCustomInnings)}
              className="w-14 bg-transparent border-0 outline-none text-sm font-bold text-inherit"
              style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
            />
          </div>
        </div>
      </div>

      {/* Extra Innings Rule */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>EXTRA INNINGS RULE</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          {/* WT-C: box-button treatment (matching Games/Innings above) replaces the prior
              flat radio-dot rows — JK's walkthrough missed this control entirely because it
              was the only Season Settings choice without the bold selected/unselected
              contrast the rest of the step uses. */}
          <div className="flex gap-2 flex-wrap mb-2">
            {["Standard", "Runner on 2nd"].map((rule) => (
              <button
                key={rule}
                onClick={() =>
                  setConfig({
                    ...config,
                    season: {
                      ...config.season,
                      extraInningsRule: rule,
                      ...(rule === "Runner on 2nd"
                        ? { extraInningsRunnerDelay: config.season.extraInningsRunnerDelay ?? 1 }
                        : {}),
                    },
                  })
                }
                className={`px-4 h-10 border-4 text-xs font-bold transition-all ${
                  config.season.extraInningsRule === rule
                    ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                    : "bg-[#4A6A42] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                {rule}
              </button>
            ))}
          </div>
          {config.season.extraInningsRule === "Runner on 2nd" && (
            <div className="border-t-2 border-[#E8E8D8]/20 mt-3 pt-3">
              <p className="text-[10px] text-[#E8E8D8]/70 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>GHOST RUNNER ARRIVES</p>
              <div className="flex gap-4">
                {[
                  { label: "1st extra inning", value: 1 as const },
                  { label: "2nd extra inning", value: 2 as const },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setConfig({
                        ...config,
                        season: { ...config.season, extraInningsRunnerDelay: option.value },
                      })
                    }
                    className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        selectedExtraInningsRunnerDelay === option.value ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                      }`}
                    >
                      {selectedExtraInningsRunnerDelay === option.value && (
                        <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                      )}
                    </div>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
            {extraInningsHint}
          </p>
        </div>
      </div>

      <div className="mb-6 border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
        <p className="text-xs font-bold tracking-wide text-[#E8E8D8]">SCHEDULE AT LAUNCH: EMPTY</p>
      </div>

    </div>
  );
}

// Step 3: Playoff Settings
function Step3PlayoffSettings({
  config,
  setConfig,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
}) {
  const leagueTeamCount = config.leagueDetails?.teams || 16;
  const playoffTeamCountOptions = getValidPlayoffTeamCountOptions(leagueTeamCount);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>PLAYOFF SETTINGS (playoffs deferred -- settings saved for later)</h2>
        <button type="button" aria-label="PLAYOFF SETTINGS HELP" aria-expanded={helpOpen} onClick={() => setHelpOpen((current) => !current)} className="flex h-11 w-11 shrink-0 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]">
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {helpOpen ? (
        <aside aria-label="Playoff settings instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs leading-5 text-[#E8E8D8]/80">
          <p>THESE DEFERRED SETTINGS SAVE A FUTURE POSTSEASON STRUCTURE.</p>
          <p className="mt-2">BRACKET IS A TRADITIONAL ELIMINATION TOURNAMENT.</p>
          <p className="mt-2">2-3-2 GIVES THE HIGHER SEED GAMES 1-2 AND 6-7 AT HOME; THE LOWER SEED HOSTS GAMES 3-5.</p>
        </aside>
      ) : null}

      {/* Teams Qualifying */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TEAMS QUALIFYING</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-2 mb-3">
            {playoffTeamCountOptions.map((num) => (
              <button
                key={num}
                aria-label={`Top ${num} teams qualify`}
                onClick={() =>
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, teamsQualifying: num },
                  })
                }
                className={`w-16 h-10 border-4 text-sm font-bold transition-all ${
                  config.playoffs.teamsQualifying === num
                    ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                    : "bg-[#3A5A32] border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]"
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            With {leagueTeamCount} teams in league: Top {config.playoffs.teamsQualifying} teams
            qualify
          </p>
        </div>
      </div>

      {/* Playoff Format */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PLAYOFF FORMAT</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["Bracket", "Pool Play", "Best Record Bye"].map((format) => {
              const isDeferred = format !== "Bracket";
              return (
              <button
                key={format}
                disabled={isDeferred}
                onClick={() => {
                  if (isDeferred) return;
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, format },
                  });
                }}
                className={`flex items-center gap-2 text-xs text-[#E8E8D8] ${
                  isDeferred ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.playoffs.format === format ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.playoffs.format === format && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {format}
                {isDeferred && <span className="text-[#E8E8D8]/50">(deferred)</span>}
              </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Series Lengths */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SERIES LENGTHS</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="space-y-3">
            {[
              { key: "wildCard", label: "Wild Card", options: ["1 game", "3 games"] },
              { key: "divisionSeries", label: "Division Series", options: ["3 games", "5 games"] },
              { key: "championship", label: "Championship", options: ["5 games", "7 games"] },
              { key: "worldSeries", label: "World Series", options: ["5 games", "7 games"] },
            ].map((round) => (
              <div key={round.key} className="flex items-center justify-between">
                <span className="text-xs text-[#E8E8D8]/70 w-40" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{round.label}:</span>
                <div className="flex gap-2">
                  {round.options.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setConfig({
                          ...config,
                          playoffs: {
                            ...config.playoffs,
                            seriesLengths: {
                              ...config.playoffs.seriesLengths,
                              [round.key]: option,
                            },
                          },
                        })
                      }
                      className={`px-4 py-1 border-2 text-xs transition-all ${
                        config.playoffs.seriesLengths[round.key as keyof typeof config.playoffs.seriesLengths] ===
                        option
                          ? "bg-[#C4A853] border-[#C4A853] text-[#4A6A42]"
                          : "bg-transparent border-[#E8E8D8]/30 text-[#E8E8D8] hover:border-[#E8E8D8]"
                      }`}
                      style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Home Field Advantage */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>HOME FIELD ADVANTAGE</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-4">
          <div className="flex gap-4 mb-2">
            {["2-3-2", "2-2-1", "Alternating"].map((format) => (
              <button
                key={format}
                onClick={() =>
                  setConfig({
                    ...config,
                    playoffs: { ...config.playoffs, homeFieldAdvantage: format },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.playoffs.homeFieldAdvantage === format ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.playoffs.homeFieldAdvantage === format && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                {format}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bracket Preview */}
      <div>
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BRACKET PREVIEW</p>
        <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-6">
          <div className="flex items-center justify-center">
            <div className="space-y-4 text-xs text-[#E8E8D8]/70 font-mono" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              <div className="flex items-center">
                <span className="w-16">#1 ──┐</span>
              </div>
              <div className="flex items-center ml-8">
                <span className="w-32">├── Semifinal ──┐</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#4 ──┘</span>
              </div>
              <div className="flex items-center ml-20">
                <span className="w-32">├── Finals</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#2 ──┐</span>
              </div>
              <div className="flex items-center ml-8">
                <span className="w-32">├── Semifinal ──┘</span>
              </div>
              <div className="flex items-center">
                <span className="w-16">#3 ──┘</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4: Team Control
function Step4TeamControl({
  config,
  setConfig,
  leagueTeams,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  leagueTeams: Team[];
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const defaultSeatId = config.teams.seats?.[0]?.id ?? "seat-you";
  const toggleTeam = (teamId: string) => {
    const isSelected = config.teams.selectedTeams.includes(teamId);
    const newSelected = isSelected
      ? config.teams.selectedTeams.filter((id) => id !== teamId)
      : [...config.teams.selectedTeams, teamId];
    const team = leagueTeams.find((candidate) => candidate.id === teamId);
    const priorOwner = config.teams.playerAssignments[teamId];

    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: newSelected,
        playerAssignments: {
          ...config.teams.playerAssignments,
          [teamId]: isSelected
            ? "cpu"
            : team?.gmSeatId || (priorOwner && priorOwner !== "cpu" ? priorOwner : defaultSeatId),
        },
      },
    });
  };

  const selectAll = () => {
    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: leagueTeams.map((t) => t.id),
        playerAssignments: Object.fromEntries(leagueTeams.map((team) => [
          team.id,
          team.gmSeatId
            || (config.teams.playerAssignments[team.id] !== "cpu" ? config.teams.playerAssignments[team.id] : undefined)
            || defaultSeatId,
        ])),
      },
    });
  };

  const clearAll = () => {
    setConfig({
      ...config,
      teams: {
        ...config.teams,
        selectedTeams: [],
        playerAssignments: Object.fromEntries(leagueTeams.map((team) => [team.id, "cpu"])),
      },
    });
  };

  const selectedCount = config.teams.selectedTeams.length;
  const uncontrolledCount = leagueTeams.length - selectedCount;

  if (leagueTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-8 h-8 text-[#C4A853] mb-3" />
        <p className="text-[#E8E8D8] mb-2">No teams in selected league</p>
        <p className="text-xs text-[#E8E8D8]/70">Add teams to this league in League Builder first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>SELECT YOUR TEAM(S)</h2>
        <button type="button" aria-label="TEAM CONTROL HELP" aria-expanded={helpOpen} onClick={() => setHelpOpen((current) => !current)} className="flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]">
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {helpOpen ? (
        <aside aria-label="Team control instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs text-[#E8E8D8]/80">
          SELECT THE TEAMS YOU CONTROL. UNSELECTED TEAMS USE MANUAL SCORE ENTRY.
        </aside>
      ) : null}

      {/* Quick Select */}
      <div className="bg-[#4A6A42] border-4 border-[#E8E8D8] p-3 mb-6 flex gap-2 flex-wrap">
        <span className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>QUICK SELECT:</span>
        <button onClick={selectAll} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          [Select All]
        </button>
        <button onClick={clearAll} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
          [Clear All]
        </button>
      </div>

      {/* Teams Grid */}
      <div className="mb-6">
        <div className="h-[2px] bg-[#E8E8D8] mb-2" />
        <p className="text-sm text-[#E8E8D8] font-bold mb-2 tracking-wider" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>LEAGUE TEAMS</p>
        <div className="h-[2px] bg-[#E8E8D8] mb-4" />

        <div className="grid grid-cols-4 gap-3">
          {leagueTeams.map((team) => {
            const isSelected = config.teams.selectedTeams.includes(team.id);
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`relative border-4 p-4 text-center transition-all ${
                  isSelected
                    ? "border-[#C4A853] bg-[#C4A853]/10 scale-102"
                    : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-[#C4A853] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#4A6A42]" />
                  </div>
                )}
                {/* Team color icon */}
                <div
                  className="w-10 h-10 mx-auto mb-2 rounded-full border-2 border-[#E8E8D8]/30"
                  style={{ backgroundColor: team.colors?.primary || '#666' }}
                >
                  {team.colors?.secondary && (
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background: `linear-gradient(135deg, transparent 50%, ${team.colors.secondary} 50%)`,
                      }}
                    />
                  )}
                </div>
                <div className="text-xs font-bold text-[#E8E8D8] mb-1 truncate" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{team.name.toUpperCase()}</div>
                <div className="text-[10px] text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{team.abbreviation}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#3A5A32] border-4 border-[#E8E8D8] p-4">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SUMMARY</p>
        <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
        <div className="space-y-2 mb-4">
          <p className="text-xs text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            SELECTED: <span className="text-[#C4A853] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{selectedCount} teams</span>
            {selectedCount > 0 && (
              <span className="text-[#E8E8D8]/70">
                {" "}
                (
                {config.teams.selectedTeams
                  .map((id) => leagueTeams.find((t) => t.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
                )
              </span>
            )}
          </p>
          <p className="text-xs text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
            UNCONTROLLED: <span className="text-[#E8E8D8]/50">{uncontrolledCount} teams</span>
          </p>
        </div>

        {selectedCount >= 2 && (
          <div className="border-t-2 border-[#E8E8D8]/30 pt-4">
            <p className="text-xs text-[#E8E8D8]/70 mb-3" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Mode:</p>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    teams: { ...config.teams, mode: "single" },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.teams.mode === "single" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.teams.mode === "single" && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
                </div>
                Single Player
              </button>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    teams: { ...config.teams, mode: "multiplayer" },
                  })
                }
                className="flex items-center gap-2 text-xs text-[#E8E8D8]"
                style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    config.teams.mode === "multiplayer" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8]"
                  }`}
                >
                  {config.teams.mode === "multiplayer" && (
                    <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />
                  )}
                </div>
                Multiplayer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 5: Roster Mode
function Step5RosterMode({
  config,
  setConfig,
  leagueTeams,
  farmScoutingReport,
  farmScoutingLoading,
  farmScoutingError,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  leagueTeams: Team[];
  farmScoutingReport: LeagueBuilderFarmScoutingValidationReport | null;
  farmScoutingLoading: boolean;
  farmScoutingError: string | null;
}) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const farmStatusText = farmScoutingLoading
    ? "Checking League Builder farm/scouting handoff..."
    : farmScoutingError
      ? `Validation unavailable: ${farmScoutingError}`
      : farmScoutingReport?.status === "prepared"
        ? "League Builder farm/scouting state is prepared. Franchise Setup will validate and copy it."
        : farmScoutingReport?.status === "repairable-by-bridge"
          ? "League Builder farm/scouting state is incomplete. Run the startup scout + prospect draft in League Builder before starting."
          : farmScoutingReport?.status === "blocked"
            ? "League Builder farm/scouting state has blockers. Fix League Builder rosters before starting."
            : "Select a league to check League Builder farm/scouting state.";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>ROSTER MODE</h2>
        <button
          type="button"
          aria-label="ROSTER MODE HELP"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((open) => !open)}
          className="inline-flex items-center gap-2 border-2 border-[#C4A853] bg-[#3A5A32] px-3 py-2 text-xs font-bold text-[#C4A853] hover:bg-[#4A6A42]"
        >
          <CircleHelp className="h-4 w-4" /> HELP
        </button>
      </div>

      {helpOpen ? (
        <aside className="mb-5 border-2 border-[#C4A853] bg-[#3A5A32] p-4 text-xs text-[#E8E8D8]/80" role="note">
          <p className="mb-3 font-bold text-[#C4A853]">Choose how team rosters will be populated.</p>
          <div className="space-y-2">
            <p>Start with the current rosters from League Builder. Teams keep their assigned players.</p>
            <p>Franchise creation validates all {leagueTeams.length} teams. Required contract: 22 MLB + 10 FARM players per team.</p>
            <p>Startup farm/scouting belongs to League Builder. Franchise Setup validates and copies prepared state.</p>
            <p>{farmStatusText}</p>
            <p>Use League Builder Draft to hire one scout for every team, then draft FARM prospects one pick at a time.</p>
            <p>Franchise Setup does not auto-fill farms. It only validates and copies prepared League Builder state.</p>
            <p>Drafted prospects keep true ratings and hidden personality modifiers hidden until call-up.</p>
            <p>No fantasy MLB draft, AI game simulation, or generated regular-season schedule is enabled.</p>
            <p>Franchise v1 uses existing League Builder MLB rosters. Fantasy MLB drafting stays deferred.</p>
          </div>
        </aside>
      ) : null}

      {/* Existing Rosters Option */}
      <div
        className={`border-4 p-5 mb-4 transition-all ${
          config.roster.mode === "existing"
            ? "border-[#C4A853] bg-[#C4A853]/10 border-l-[8px]"
            : "border-[#E8E8D8] bg-[#4A6A42]"
        }`}
      >
        <button
          onClick={() =>
            setConfig({
              ...config,
              roster: { mode: "existing" },
            })
          }
          className="flex items-start gap-3 w-full text-left"
        >
          <div
            className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${
              config.roster.mode === "existing" ? "border-[#C4A853] bg-[#C4A853]" : "border-[#E8E8D8] bg-transparent"
            }`}
          >
            {config.roster.mode === "existing" && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>USE EXISTING ROSTERS</h3>
          </div>
        </button>

        {config.roster.mode === "existing" && (
          <div className="ml-9 mt-4 bg-[#3A5A32] border-2 border-[#E8E8D8]/30 p-4">
            <p className="text-xs text-[#E8E8D8]/70 mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>ROSTER SUMMARY</p>
            <div className="h-[1px] bg-[#E8E8D8]/30 mb-3" />
            <div className="space-y-2 mb-3">
              <p className="text-xs font-bold text-[#00CC00]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>22 MLB + 10 FARM</p>
              <p className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                HANDOFF: {farmScoutingLoading ? "CHECKING" : farmScoutingReport?.status === "prepared" ? "PREPARED" : farmScoutingError ? "UNAVAILABLE" : "BLOCKED"}
              </p>
            </div>
            <button onClick={() => navigate('/league-builder/players')} className="text-xs text-[#C4A853] hover:text-[#FFD700] underline" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>[Review League Builder Players]</button>
          </div>
        )}
      </div>

      {/* Fantasy Draft Option */}
      <div
        className="border-4 p-5 transition-all border-[#E8E8D8]/40 bg-[#4A6A42] opacity-60"
      >
        <button
          disabled
          className="flex items-start gap-3 w-full text-left cursor-not-allowed"
        >
          <div
            className="w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 border-[#E8E8D8] bg-transparent"
          />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FANTASY DRAFT (DEFERRED)</h3>
          </div>
        </button>
      </div>
    </div>
  );
}

function DraftHandoffConfirm({
  config,
  setConfig,
  leagueTeams,
  farmScoutingReport,
  farmScoutingLoading,
  farmScoutingError,
  onRetryHandoff,
  livingSeasonEnabled,
  setLivingSeasonEnabled,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  leagueTeams: Team[];
  farmScoutingReport: LeagueBuilderFarmScoutingValidationReport | null;
  farmScoutingLoading: boolean;
  farmScoutingError: string | null;
  onRetryHandoff: () => void;
  livingSeasonEnabled: boolean;
  setLivingSeasonEnabled: (enabled: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const selectedTeams = leagueTeams.filter((team) => config.teams.selectedTeams.includes(team.id));
  const handoffReady = farmScoutingReport?.status === "prepared" && !farmScoutingError;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[#C4A853]">DRAFT HANDOFF</p>
          <h2 className="mt-1 text-lg font-bold tracking-wide text-[#E8E8D8]" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>CONFIRM &amp; LAUNCH</h2>
        </div>
        <button
          type="button"
          aria-label="FRANCHISE SETUP HELP"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((current) => !current)}
          className="flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]"
        >
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>

      {helpOpen ? (
        <aside aria-label="Franchise launch instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs leading-5 text-[#E8E8D8]/80">
          <p>THE COMPLETED MLB AND FARM DRAFTS SUPPLY THE ROSTERS. THEY CANNOT BE CHANGED IN FRANCHISE SETUP.</p>
          <p className="mt-2">PLAYOFF SETUP IS DEFERRED. THE FRANCHISE LAUNCHES WITH NO SCHEDULE; ADD GAMES MANUALLY OR IMPORT A CSV FROM THE LIVING SEASON SCHEDULE SCREEN.</p>
          <p className="mt-2">LIVING SEASON LETS RATINGS, FAME, MORALE, RELATIONSHIPS, AND NARRATIVE CHANGE AS GAMES ARE PLAYED. THIS CHOICE LOCKS AT CREATION.</p>
          <p className="mt-2">THE GM NAME APPEARS ON ROSTER AND DRAFT MOVES. LEAVE IT BLANK TO GENERATE ONE.</p>
        </aside>
      ) : null}

      <section className="mb-6 border-4 border-[#E8E8D8] bg-[#3A5A32] p-4" aria-label="Completed draft handoff">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-[#E8E8D8]">{config.leagueDetails?.name ?? "LEAGUE"}</p>
            <p className="mt-1 text-[10px] font-bold text-[#C4A853]">MLB + FARM DRAFT PICKS COMPLETE</p>
          </div>
          <p className={`text-xs font-bold ${handoffReady ? "text-[#9FE0A0]" : "text-[#FFD27A]"}`}>
            {farmScoutingLoading ? "CHECKING HANDOFF" : handoffReady ? "ROSTERS READY" : "ROSTER HANDOFF BLOCKED"}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {selectedTeams.map((team) => (
            <div
              key={team.id}
              className="flex min-w-[150px] items-center gap-2 border-2 bg-[#2A4A22] p-2"
              style={{ borderColor: team.colors?.primary || '#E8E8D8' }}
            >
              {team.logoUrl ? (
                <img alt="" src={team.logoUrl} className="h-9 w-9 object-contain" />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                  style={{
                    backgroundColor: team.colors?.primary || '#666',
                    borderColor: team.colors?.secondary || '#E8E8D8',
                    color: team.colors?.secondary || '#E8E8D8',
                  }}
                >
                  {team.abbreviation}
                </span>
              )}
              <span className="text-[10px] font-bold text-[#E8E8D8]">{team.name}</span>
            </div>
          ))}
        </div>
        {!farmScoutingLoading && !handoffReady ? (
          <div className="mt-4 border-2 border-[#FFD27A] bg-[#6B3A3A] p-3">
            <p className="text-xs font-bold text-[#FFE8B0]">{farmScoutingError ?? farmScoutingReport?.blockers.join(' ') ?? "THE COMPLETED FARM HANDOFF COULD NOT BE VERIFIED."}</p>
            <button type="button" onClick={onRetryHandoff} className="mt-3 inline-flex items-center gap-2 border-2 border-[#E8E8D8] bg-[#C4A853] px-3 py-2 text-xs font-bold text-[#1A1A1A]">
              <RefreshCw className="h-4 w-4" /> RECHECK HANDOFF
            </button>
          </div>
        ) : null}
      </section>

      <label className="mb-5 block text-xs font-bold tracking-wide text-[#E8E8D8]">
        FRANCHISE NAME
        <input
          type="text"
          value={config.franchiseName}
          onChange={(event) => setConfig({ ...config, franchiseName: event.target.value })}
          className="mt-2 w-full border-4 border-[#E8E8D8] bg-[#2A4A22] px-4 py-3 text-sm text-[#E8E8D8]"
        />
      </label>

      <label className="mb-5 block text-xs font-bold tracking-wide text-[#E8E8D8]">
        GM NAME
        <input
          type="text"
          value={config.gmName ?? ''}
          onChange={(event) => setConfig({ ...config, gmName: event.target.value })}
          className="mt-2 w-full border-4 border-[#E8E8D8] bg-[#2A4A22] px-4 py-3 text-sm text-[#E8E8D8]"
        />
      </label>

      <button
        type="button"
        role="switch"
        aria-checked={livingSeasonEnabled}
        onClick={() => setLivingSeasonEnabled(!livingSeasonEnabled)}
        className={`mb-5 flex w-full items-center justify-between border-4 p-4 text-left ${livingSeasonEnabled ? "border-[#C4A853] bg-[#3A5A32]" : "border-[#E8E8D8] bg-[#4A6A42]"}`}
      >
        <span className="text-xs font-bold tracking-[0.16em] text-[#E8E8D8]">LIVING SEASON</span>
        <span className="text-xs font-bold text-[#C4A853]">{livingSeasonEnabled ? "ON" : "OFF"}</span>
      </button>

      <div className="grid gap-2 border-4 border-[#E8E8D8] bg-[#3A5A32] p-4 text-xs font-bold text-[#E8E8D8] sm:grid-cols-3">
        <span>{config.season.gamesPerTeam} GAMES</span>
        <span>{config.season.inningsPerGame} INNINGS</span>
        <span>SCHEDULE: EMPTY</span>
      </div>
    </div>
  );
}

// Step 6: Confirm & Start
function Step6Confirm({
  config,
  setConfig,
  jumpToStep,
  leagues,
  leagueTeams,
  farmScoutingReport,
  farmScoutingLoading,
  farmScoutingError,
  livingSeasonEnabled,
  setLivingSeasonEnabled,
}: {
  config: FranchiseConfig;
  setConfig: (config: FranchiseConfig) => void;
  jumpToStep: (step: number) => void;
  leagues: LeagueTemplate[];
  leagueTeams: Team[];
  farmScoutingReport: LeagueBuilderFarmScoutingValidationReport | null;
  farmScoutingLoading: boolean;
  farmScoutingError: string | null;
  livingSeasonEnabled: boolean;
  setLivingSeasonEnabled: (enabled: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const selectedTeams = leagueTeams.filter((t) => config.teams.selectedTeams.includes(t.id));
  const farmScoutingSummary = farmScoutingLoading
    ? "Checking League Builder farm/scouting handoff"
    : farmScoutingError
      ? "Farm/scouting validation unavailable"
      : farmScoutingReport?.status === "prepared"
        ? "League Builder farm/scouting prepared"
        : farmScoutingReport?.status === "repairable-by-bridge"
          ? "Run League Builder startup scout + prospect draft before starting"
          : farmScoutingReport?.status === "blocked"
            ? "Farm/scouting blockers must be fixed in League Builder"
            : "Farm/scouting handoff not checked";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#E8E8D8] tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>CONFIRM &amp; START</h2>
        <button type="button" aria-label="FRANCHISE CONFIRM HELP" aria-expanded={helpOpen} onClick={() => setHelpOpen((current) => !current)} className="flex h-11 w-11 items-center justify-center border-4 border-[#E8E8D8] bg-[#4A6A42]">
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>
      {helpOpen ? (
        <aside aria-label="Franchise confirmation instructions" className="mb-6 border-4 border-[#C4A853] bg-[#3A5A32] p-4 text-xs leading-5 text-[#E8E8D8]/80">
          <p>REVIEW THE SAVED SETTINGS BEFORE STARTING THE FRANCHISE.</p>
          <p className="mt-2">LIVING SEASON LETS RATINGS, FAME, MORALE, RELATIONSHIPS, AND NARRATIVE CHANGE AS GAMES ARE PLAYED. THIS CHOICE LOCKS AT CREATION.</p>
          <p className="mt-2">THE GM NAME APPEARS ON ROSTER AND DRAFT MOVES. LEAVE IT BLANK TO GENERATE ONE.</p>
        </aside>
      ) : null}

      {/* Franchise Name */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FRANCHISE NAME</p>
        <input
          type="text"
          value={config.franchiseName}
          onChange={(e) =>
            setConfig({
              ...config,
              franchiseName: e.target.value,
            })
          }
          className="w-full px-4 py-3 bg-[#2A4A22] border-4 border-[#E8E8D8] text-[#E8E8D8] text-sm"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
          placeholder="Enter franchise name..."
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={livingSeasonEnabled}
        onClick={() => setLivingSeasonEnabled(!livingSeasonEnabled)}
        className={`mb-6 w-full border-4 p-4 text-left transition-all ${
          livingSeasonEnabled
            ? "border-[#C4A853] bg-[#3A5A32]"
            : "border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]"
        }`}
      >
        <span className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-6 w-11 shrink-0 items-center border-2 p-0.5 transition-colors ${
              livingSeasonEnabled
                ? "justify-end border-[#C4A853] bg-[#C4A853]"
                : "justify-start border-[#E8E8D8] bg-[#2A4A22]"
            }`}
          >
            <span className="h-4 w-4 bg-[#E8E8D8]" />
          </span>
          <span>
            <span className="block text-xs font-bold tracking-[0.16em] text-[#E8E8D8]">
              LIVING SEASON
            </span>
          </span>
        </span>
      </button>

      {/* GM Name — the user IS the GM (§8) */}
      <div className="mb-6">
        <p className="text-xs text-[#E8E8D8] font-bold mb-3 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>GM NAME</p>
        <input
          type="text"
          value={config.gmName ?? ''}
          onChange={(e) =>
            setConfig({
              ...config,
              gmName: e.target.value,
            })
          }
          className="w-full px-4 py-3 bg-[#2A4A22] border-4 border-[#E8E8D8] text-[#E8E8D8] text-sm"
          style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}
          placeholder="Enter your GM name (or leave blank for a generated one)..."
        />
      </div>

      {/* Settings Summary */}
      <div className="bg-[#3A5A32] border-4 border-[#E8E8D8] p-5">
        <p className="text-xs text-[#E8E8D8] font-bold mb-4 tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SETTINGS SUMMARY</p>
        <div className="h-[2px] bg-[#E8E8D8] mb-4" />

        <div className="space-y-4">
          {/* League */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>LEAGUE</p>
              <button onClick={() => jumpToStep(1)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>{config.leagueDetails?.name}</p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.leagueDetails?.teams} teams • {config.leagueDetails?.conferences} conferences •{" "}
              {config.leagueDetails?.divisions} divisions
            </p>
          </div>

          {/* Season */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON</p>
              <button onClick={() => jumpToStep(2)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.season.gamesPerTeam} games • {config.season.inningsPerGame} innings •{" "}
              manual schedule policy
            </p>
          </div>

          {/* Playoffs */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PLAYOFFS</p>
              <button onClick={() => jumpToStep(3)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.playoffs.teamsQualifying} teams • {config.playoffs.format} format
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              Championship: {config.playoffs.seriesLengths.championship} • World Series:{" "}
              {config.playoffs.seriesLengths.worldSeries}
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Home field: {config.playoffs.homeFieldAdvantage}</p>
          </div>

          {/* Your Teams */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>YOUR TEAMS</p>
              <button onClick={() => jumpToStep(4)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              {selectedTeams.slice(0, 4).map((team) => (
                <div key={team.id} className="bg-[#1A3A12] border-2 border-[#E8E8D8]/30 p-2 text-center">
                  <div
                    className="w-8 h-8 mx-auto mb-1 rounded-full border-2 border-[#E8E8D8]/30"
                    style={{ backgroundColor: team.colors?.primary || '#666' }}
                  />
                  <div className="text-[9px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{team.abbreviation}</div>
                </div>
              ))}
              {selectedTeams.length > 4 && (
                <div className="flex items-center text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>+{selectedTeams.length - 4} more</div>
              )}
            </div>
            <p className="text-xs text-[#E8E8D8]/70 mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.teams.mode === "multiplayer" ? "Multiplayer" : "Single Player"}: {selectedTeams.length} player
              {selectedTeams.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-[#E8E8D8]/50" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {leagueTeams.length - selectedTeams.length} uncontrolled teams
            </p>
          </div>

          {/* Rosters */}
          <div className="bg-[#2A4A22] border-2 border-[#E8E8D8]/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ROSTERS</p>
              <button onClick={() => jumpToStep(5)} className="text-xs text-[#C4A853] hover:text-[#C4A853]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                [Edit]
              </button>
            </div>
            <p className="text-xs text-[#E8E8D8]/70" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
              {config.roster.mode === "existing"
                ? `Using League Builder rosters. ${farmScoutingSummary}.`
                : "Fantasy draft deferred in Franchise v1"}
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-[#DD0000]/10 border-2 border-[#DD0000] p-4">
        <p className="text-xs text-[#DD0000] mb-1">
          ⚠️ This will create a new franchise save slot.
        </p>
        <p className="text-xs text-[#DD0000]/70">You can have multiple franchises saved simultaneously.</p>
      </div>
    </div>
  );
}
