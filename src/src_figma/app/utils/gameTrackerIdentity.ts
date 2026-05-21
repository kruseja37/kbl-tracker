import { getFranchiseSeasonId } from "../../../utils/franchisePersistenceContract";
import type { CompetitionType } from "../../../utils/gameStorage";
import {
  getEliminationStatsScopeId,
  validateModeCompetitionScope,
} from "../../../utils/modeCompetitionScope";

export interface GameTrackerIdentityNavigationState {
  gameMode?: "exhibition" | "franchise" | "playoff" | "elimination";
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  eliminationId?: string;
  franchiseId?: string;
  leagueId?: string;
  seasonId?: string;
  statsScopeId?: string;
  scheduleGameId?: string;
  playoffId?: string;
  seasonNumber?: number;
}

export interface RestoredGameTrackerIdentityContext {
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  franchiseId?: string;
  eliminationId?: string;
  scheduleGameId?: string;
  leagueId?: string;
  playoffId?: string;
}

export interface GameTrackerIdentityGameState {
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  playoffId?: string;
}

export interface ResolvedGameTrackerIdentity {
  competitionType: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  gameMode: "exhibition" | "franchise" | "playoff" | "elimination";
  eliminationId?: string;
  franchiseId?: string;
  leagueId?: string;
  seasonId?: string;
  statsScopeId?: string;
  scheduleGameId?: string;
  playoffId?: string;
  seasonNumber: number;
}

export function resolveGameTrackerIdentity(params: {
  navigationState?: GameTrackerIdentityNavigationState | null;
  restoredContext?: RestoredGameTrackerIdentityContext | null;
  gameState?: GameTrackerIdentityGameState | null;
  fallbackCompetitionType?: CompetitionType;
  fallbackGameMode?: "exhibition" | "franchise" | "playoff" | "elimination";
  fallbackCompetitionId?: string;
  fallbackStatsScopeId?: string;
  fallbackLeagueId?: string;
}): ResolvedGameTrackerIdentity {
  const {
    navigationState,
    restoredContext,
    gameState,
    fallbackCompetitionType = "exhibition",
    fallbackGameMode = "exhibition",
    fallbackCompetitionId,
    fallbackStatsScopeId,
    fallbackLeagueId,
  } = params;

  const competitionType =
    navigationState?.competitionType ||
    restoredContext?.competitionType ||
    fallbackCompetitionType;
  const seasonNumber =
    navigationState?.seasonNumber ??
    restoredContext?.seasonNumber ??
    gameState?.seasonNumber ??
    1;
  const rawFranchiseId =
    navigationState?.franchiseId ?? restoredContext?.franchiseId;
  const scheduleGameId =
    navigationState?.scheduleGameId ?? restoredContext?.scheduleGameId;
  const leagueId =
    navigationState?.leagueId ?? restoredContext?.leagueId ?? fallbackLeagueId;
  const competitionName =
    navigationState?.competitionName ?? restoredContext?.competitionName;
  const competitionId =
    navigationState?.competitionId ??
    (competitionType === "elimination"
      ? navigationState?.eliminationId
      : competitionType === "franchise"
        ? rawFranchiseId
        : competitionType === "playoff"
          ? navigationState?.playoffId
          : undefined) ??
    restoredContext?.competitionId ??
    (competitionType === "playoff" ? restoredContext?.playoffId : undefined) ??
    fallbackCompetitionId;
  const eliminationId =
    navigationState?.eliminationId ||
    restoredContext?.eliminationId ||
    (competitionType === "elimination" ? competitionId : undefined);
  const franchiseId =
    competitionType === "elimination" || competitionType === "exhibition"
      ? undefined
      : rawFranchiseId;
  const playoffId =
    navigationState?.playoffId ??
    restoredContext?.playoffId ??
    gameState?.playoffId ??
    (competitionType === "playoff" ? competitionId : undefined);
  const seasonId =
    competitionType === "elimination"
      ? undefined
      : navigationState?.seasonId ??
        restoredContext?.seasonId ??
        gameState?.seasonId ??
        (restoredContext?.statsScopeId?.includes("season-")
          ? restoredContext.statsScopeId
          : rawFranchiseId
            ? getFranchiseSeasonId(rawFranchiseId, seasonNumber)
            : `season-${seasonNumber}`);
  const statsScopeId =
    competitionType === "elimination" && eliminationId
      ? getEliminationStatsScopeId(eliminationId)
      : navigationState?.statsScopeId ||
        restoredContext?.statsScopeId ||
        gameState?.statsScopeId ||
        seasonId ||
        fallbackStatsScopeId;
  const gameMode =
    navigationState?.gameMode ||
    (competitionType === "elimination"
      ? "elimination"
      : competitionType === "playoff"
        ? "playoff"
        : competitionType === "franchise"
          ? "franchise"
          : fallbackGameMode);

  const resolved: ResolvedGameTrackerIdentity = {
    competitionType,
    competitionId,
    competitionName,
    gameMode,
    eliminationId,
    franchiseId,
    leagueId,
    seasonId,
    statsScopeId,
    scheduleGameId,
    playoffId,
    seasonNumber,
  };

  const scopeErrors = validateModeCompetitionScope(resolved);
  if (scopeErrors.length > 0) {
    console.warn("[GameTrackerIdentity] Resolved incomplete competition scope:", scopeErrors);
  }

  return resolved;
}
