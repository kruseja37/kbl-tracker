import {
  getPlayer,
  getTeamRoster,
  type LeagueBuilderMlbDraftSession,
} from './leagueBuilderStorage';
import { isLegalRoster } from '../data/rosterConstruction';
import { toRosterSlotPlayer } from '../engines/rosterNeed';
import { readSnakeDraftTruth, validateSnakeRosterHandoff } from './snakeDraftManifest';

export interface SnakeRosterHandoffReadiness {
  phase: 'MLB' | 'FARM';
  ready: true;
  playerCount: number;
  teamCount: number;
}

/**
 * Proves this device has the roster/player rows named by the durable marker.
 * Cloud sync can deliver stores in separate pages, so marker validation alone
 * is intentionally insufficient for advancing the draft arc.
 */
export async function assertSnakeRosterHandoffReady(
  session: LeagueBuilderMlbDraftSession,
  phase: 'MLB' | 'FARM',
): Promise<SnakeRosterHandoffReadiness> {
  validateSnakeRosterHandoff(session, phase);
  const truth = readSnakeDraftTruth(session, phase);
  const picksByTeamId = new Map<string, typeof truth.completedPicks>();
  for (const pick of truth.completedPicks) {
    picksByTeamId.set(pick.teamId, [...(picksByTeamId.get(pick.teamId) ?? []), pick]);
  }

  for (const [teamId, picks] of picksByTeamId) {
    const roster = await getTeamRoster(teamId);
    if (!roster) throw new Error(`The ${phase} roster handoff is still syncing for ${teamId}.`);
    const rosterIds = phase === 'MLB' ? roster.mlbRoster : roster.farmRoster;
    const rosterSet = new Set(rosterIds);
    if (rosterSet.size !== rosterIds.length) {
      throw new Error(`The ${phase} roster handoff contains duplicate players for ${teamId}.`);
    }
    if (phase === 'MLB' && (rosterIds.length !== picks.length || rosterSet.size !== picks.length)) {
      throw new Error(`The MLB roster handoff does not match the frozen picks for ${teamId}.`);
    }
    if (picks.some((pick) => !rosterSet.has(pick.playerId))) {
      throw new Error(`The ${phase} roster handoff is missing a frozen pick for ${teamId}.`);
    }
    const storedPlayers = [];
    for (const pick of picks) {
      const player = await getPlayer(pick.playerId);
      const assignment = player?.leagueAssignments?.find((row) => row.leagueId === session.leagueId);
      if (!player || assignment?.teamId !== teamId || assignment.rosterStatus !== phase) {
        throw new Error(`The ${phase} player handoff is still syncing for ${pick.playerId}.`);
      }
      const salary = player.settledSalary ?? player.salary;
      if (!Number.isFinite(salary) || salary !== pick.launchSalary) {
        throw new Error(`The ${phase} salary handoff does not match the frozen pick for ${pick.playerId}.`);
      }
      storedPlayers.push(player);
    }
    if (phase === 'MLB') {
      const legalityPlayers = storedPlayers.map((player) => toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }));
      if (!isLegalRoster(legalityPlayers)) {
        throw new Error(`The MLB roster handoff for ${teamId} is not a legal 22-player roster.`);
      }
    }
  }

  return {
    phase,
    ready: true,
    playerCount: truth.completedPicks.length,
    teamCount: picksByTeamId.size,
  };
}

export async function isSnakeRosterHandoffReady(
  session: LeagueBuilderMlbDraftSession | null | undefined,
  phase: 'MLB' | 'FARM',
): Promise<boolean> {
  if (!session) return false;
  try {
    await assertSnakeRosterHandoffReady(session, phase);
    return true;
  } catch {
    return false;
  }
}
