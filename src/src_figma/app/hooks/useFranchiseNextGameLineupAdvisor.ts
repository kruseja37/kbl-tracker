import { useEffect, useMemo, useState } from "react";
import type { MojoState, Player, Team } from "../../../utils/leagueBuilderStorage";
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import { resolveFranchiseNextGameOptimalLineup } from "../utils/franchiseNextGameLineup";
import {
  applyFranchiseTeamUpdateWithStaleOptimalSnapshots,
  isActiveFranchisePlayerForTeam,
  lineupSlotsFromOptimalSnapshot,
  normalizeFranchiseLineupSlots,
  toOptimalCandidate,
} from "../utils/franchiseLineupDomain";

/**
 * useFranchiseNextGameLineupAdvisor — the next-game optimal-lineup advisor LOGIC, shared by the legacy
 * Lineups tab AND the Fenway-hub Lineups surface. Loads the active club's raw roster, runs the engine
 * seam against the opponent's rotation-aware next starter, and exposes accept (apply the optimal batting
 * order to the durable no-DH lineup) + per-player mojo edit.
 *
 * The CALLER resolves the opponent (id + games-played) from its own data — the two hubs expose next-game
 * + standings differently — and passes them in. Franchise mode is sealed no-DH, so dhEnabled is always
 * false. The optimal lineup is a SCOUT ADVISOR, never a manager-WPA input.
 */
export interface UseFranchiseNextGameLineupAdvisorInput {
  franchiseId: string | undefined;
  leagueId: string | undefined;
  activeTeamId: string | null;
  /** Resolved by the caller (whichever of next-game's two teams is not the active club). */
  opponentTeamId: string | null;
  /** The opponent's games-played this season (drives their rotation slot). */
  opponentGamesPlayed: number;
}

export function useFranchiseNextGameLineupAdvisor({
  franchiseId,
  leagueId,
  activeTeamId,
  opponentTeamId,
  opponentGamesPlayed,
}: UseFranchiseNextGameLineupAdvisorInput) {
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [franchiseTeam, setFranchiseTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId || !activeTeamId) {
      setAllTeams([]);
      setAllPlayers([]);
      setFranchiseTeam(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [teams, players] = await Promise.all([
          getAllFranchiseTeams(franchiseId),
          getAllFranchisePlayers(franchiseId),
        ]);
        if (cancelled) return;
        setAllTeams(teams);
        setAllPlayers(players);
        setFranchiseTeam(teams.find((team) => team.id === activeTeamId) ?? null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load lineup data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseId, activeTeamId]);

  const rosterPlayers = useMemo(
    () =>
      activeTeamId
        ? allPlayers.filter((player) => isActiveFranchisePlayerForTeam(player, activeTeamId, leagueId))
        : [],
    [allPlayers, activeTeamId, leagueId],
  );

  const seamResult = useMemo(() => {
    if (!activeTeamId || !opponentTeamId || rosterPlayers.length === 0) return null;
    try {
      return resolveFranchiseNextGameOptimalLineup({
        activeTeamId,
        roster: rosterPlayers.map(toOptimalCandidate),
        teams: allTeams,
        allPlayers,
        opponentTeamId,
        opponentGamesPlayed,
        dhEnabled: false,
      });
    } catch {
      return null;
    }
  }, [activeTeamId, opponentTeamId, rosterPlayers, allTeams, allPlayers, opponentGamesPlayed]);

  const optimalSlots = useMemo(() => {
    if (!seamResult) return [];
    return seamResult.snapshot.slots.slice().sort((a, b) => a.battingOrderSlot - b.battingOrderSlot);
  }, [seamResult]);

  const lineupMojoPlayers = useMemo(() => {
    const byId = new Map(rosterPlayers.map((player) => [player.id, player]));
    return optimalSlots
      .map((slot) => byId.get(slot.playerId))
      .filter((player): player is Player => Boolean(player));
  }, [optimalSlots, rosterPlayers]);

  const handleAcceptOptimal = async () => {
    if (!franchiseId || !franchiseTeam || !seamResult) return;
    setIsApplying(true);
    setApplyMessage(null);
    setApplyError(null);
    try {
      const lineup = normalizeFranchiseLineupSlots(
        rosterPlayers,
        lineupSlotsFromOptimalSnapshot(seamResult.snapshot),
        false,
      );
      const update: Partial<Team> = { lineupWithoutDH: lineup };
      const nextTeam = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(franchiseTeam, update);
      const savedTeam = await saveFranchiseTeam(franchiseId, nextTeam);
      setFranchiseTeam(savedTeam);
      setApplyMessage("Optimal lineup applied. Fine-tune below, or launch when ready.");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply the optimal lineup.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleMojoChange = async (player: Player, mojo: MojoState) => {
    if (!franchiseId) return;
    const updated: Player = { ...player, mojo };
    setAllPlayers((prev) => prev.map((existing) => (existing.id === player.id ? updated : existing)));
    try {
      await saveFranchisePlayer(franchiseId, updated);
    } catch {
      setAllPlayers((prev) => prev.map((existing) => (existing.id === player.id ? player : existing)));
    }
  };

  return {
    loading,
    loadError,
    franchiseTeam,
    setFranchiseTeam,
    rosterPlayers,
    seamResult,
    optimalSlots,
    lineupMojoPlayers,
    isApplying,
    applyMessage,
    applyError,
    handleAcceptOptimal,
    handleMojoChange,
  };
}
