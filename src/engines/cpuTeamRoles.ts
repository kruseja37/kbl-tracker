/**
 * V2 §5 build-dark classifier for splitting pure-pressure CPU shills from
 * opt-in CPU-controlled franchise teams. RB-10b consumes this split when the
 * dissolve-to-pool bridge is wired.
 */
import type { AuctionSetupConfig } from '../data/auctionEngineConstants';
import type { AuctionSession } from './auctionStateMachine';
import type { CpuShillAuctionSession } from './cpuShillBidding';

export interface CpuTeamControlInfo {
  id: string;
  controlledBy?: 'human' | 'ai';
}

type CpuRoleSession = CpuShillAuctionSession &
  Pick<AuctionSession, 'config' | 'nominationOrder'> & {
    config: AuctionSetupConfig;
  };

export function deriveControlledCpuTeamIds(leagueTeams: readonly CpuTeamControlInfo[]): string[] {
  return leagueTeams.filter((team) => team.controlledBy === 'ai').map((team) => team.id);
}

export function deriveShillTeamIds(
  session: CpuShillAuctionSession | null,
  leagueTeams: readonly CpuTeamControlInfo[],
): string[] {
  if (!session) return [];
  if (session.config.excludeFromLeague === false) return [];

  const shillIds = deriveBaseShillCandidateIds(session);
  const controlledCpuTeamIds = new Set(deriveControlledCpuTeamIds(leagueTeams));

  return session.nominationOrder.filter((teamId) => shillIds.has(teamId) && !controlledCpuTeamIds.has(teamId));
}

export function classifyCpuTeams(
  session: CpuShillAuctionSession | null,
  leagueTeams: readonly CpuTeamControlInfo[],
): {
  shillTeamIds: string[];
  controlledCpuTeamIds: string[];
  allCpuTeamIds: string[];
} {
  if (!session) {
    return {
      shillTeamIds: [],
      controlledCpuTeamIds: [],
      allCpuTeamIds: [],
    };
  }

  const nominationOrderIds = new Set(session.nominationOrder);

  return {
    shillTeamIds: deriveShillTeamIds(session, leagueTeams),
    controlledCpuTeamIds: deriveControlledCpuTeamIds(leagueTeams).filter((teamId) => nominationOrderIds.has(teamId)),
    allCpuTeamIds: deriveAllCpuBidderTeamIds(session, leagueTeams),
  };
}

function deriveBaseShillCandidateIds(session: CpuRoleSession): Set<string> {
  const ids = new Set<string>();

  for (const teamId of Object.keys(session.cpuShills ?? {})) {
    ids.add(teamId);
  }

  const count = deriveLastNominationOrderCount(session.config, session.nominationOrder);
  if (count > 0) {
    for (const teamId of session.nominationOrder.slice(-count)) {
      ids.add(teamId);
    }
  }

  return ids;
}

function deriveAllCpuBidderTeamIds(
  session: CpuRoleSession,
  leagueTeams: readonly CpuTeamControlInfo[],
): string[] {
  const ids = new Set<string>();

  for (const team of leagueTeams) {
    if (team.controlledBy === 'ai') ids.add(team.id);
  }

  for (const teamId of Object.keys(session.cpuShills ?? {})) {
    ids.add(teamId);
  }

  const count = deriveLastNominationOrderCount(session.config, session.nominationOrder);
  if (count > 0) {
    for (const teamId of session.nominationOrder.slice(-count)) {
      ids.add(teamId);
    }
  }

  return session.nominationOrder.filter((teamId) => ids.has(teamId));
}

function deriveLastNominationOrderCount(
  config: AuctionSetupConfig,
  nominationOrder: readonly string[],
): number {
  return Math.max(0, Math.min(config.cpuShillCount ?? 0, nominationOrder.length));
}
