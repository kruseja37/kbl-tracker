/**
 * franchiseNextGameLineup — the engine seam the Lineups tab (Step 5b) and the collapsed pregame
 * layer (5c) both consume: given the active roster + the next opponent + how many games that opponent
 * has played, resolve the opponent's NEXT starting pitcher (rotation-aware, full profile) and run the
 * keystone optimizer against that specific pitcher.
 *
 * Pure / no React. CONSUMES the engine — never edits it:
 *   resolveOpponentStarterProfile(...)  (franchiseRotationResolver.ts — rotation-aware next SP)
 *   optimizeLineupVsStarter(...)        (lineupVsStarter.ts — the orphaned optimizer we wire in)
 *
 * The returned snapshot has snapshotId='' by the locked interface contract; the LANE mints
 * snapshotId/sourceConfidence at persist time. The optimal lineup is a SCOUT-DRIVEN ADVISOR — it is
 * NOT a manager-WPA input (do not route it into the mWAR track).
 */
import {
  optimizeLineupVsStarter,
  type OpponentStarterProfile,
} from "../../../engines/lineupVsStarter";
import {
  resolveOpponentStarterProfile,
  type OpponentStarterPlayerRecord,
  type OpponentStarterRosterLookup,
  type OpponentStarterTeamRecord,
} from "../../../utils/franchiseRotationResolver";
import type { OptimalLineupCandidate } from "../../../utils/optimalLineup";
import type { OptimalLineupSnapshot } from "../../../types/managerWpa";
import type { Player, Team } from "../../../utils/leagueBuilderStorage";

export interface FranchiseNextGameLineupInput {
  /** The club we're optimizing for. */
  activeTeamId: string;
  /** The active club's roster, already mapped to optimizer candidates (reuse toOptimalCandidate). */
  roster: OptimalLineupCandidate[];
  /** All franchise teams (for the opponent's startingRotation) + players (for the SP profile). */
  teams: Team[];
  allPlayers: Player[];
  /** The next opponent + how many games THEY have played (drives the rotation slot). */
  opponentTeamId: string;
  opponentGamesPlayed: number;
  dhEnabled?: boolean;
}

export interface FranchiseNextGameLineupResult {
  opponentStarter: OpponentStarterProfile;
  /** The optimizer output. snapshotId='' — the caller mints identity at persist time. */
  snapshot: OptimalLineupSnapshot;
}

function toStarterTeamRecord(team: Team | undefined): OpponentStarterTeamRecord | null {
  if (!team) return null;
  return { startingRotation: team.startingRotation ?? null };
}

function toStarterPlayerRecord(player: Player | undefined): OpponentStarterPlayerRecord | null {
  if (!player) return null;
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    throws: player.throws,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    trait1: player.trait1 ?? null,
    trait2: player.trait2 ?? null,
    arsenal: player.arsenal ?? null,
    armSlot: player.armSlot ?? null,
    primaryPosition: player.primaryPosition,
  };
}

/**
 * Run the next-game chain. Returns null when the opponent's next starter can't be resolved
 * (no rotation, missing pitcher record, or a non-L/R throws) — the tab then shows a fallback.
 */
export function resolveFranchiseNextGameOptimalLineup(
  input: FranchiseNextGameLineupInput,
): FranchiseNextGameLineupResult | null {
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  const playerById = new Map(input.allPlayers.map((player) => [player.id, player]));

  const lookup: OpponentStarterRosterLookup = {
    getTeam: (teamId) => toStarterTeamRecord(teamById.get(teamId)),
    getPlayer: (playerId) => toStarterPlayerRecord(playerById.get(playerId)),
  };

  const opponentStarter = resolveOpponentStarterProfile(
    input.opponentTeamId,
    input.opponentGamesPlayed,
    lookup,
  );
  if (!opponentStarter) return null;

  const snapshot = optimizeLineupVsStarter({
    teamId: input.activeTeamId,
    mode: "franchise",
    dhEnabled: input.dhEnabled,
    roster: input.roster,
    opponentStarter,
  });

  return { opponentStarter, snapshot };
}
