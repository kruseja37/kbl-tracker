import {
  DEFAULT_AUCTION_SETUP_CONFIG,
  type AuctionSetupConfig,
} from '../data/auctionEngineConstants';
import { initAuctionSession } from '../engines/auctionStateMachine';
import type { CpuShillAuctionSession } from '../engines/cpuShillBidding';
import {
  buildFarmAuctionPool,
  type FarmAuctionPool,
} from './farmAuctionPool';
import {
  buildFarmAuctionTeamInputs,
  computeFarmTierCap,
} from './farmAuctionWallet';
import type { ProspectScoutDescriptor } from './prospectScoutingDraftEngine';

export interface BuildFarmAuctionSessionInput {
  leagueId: string;
  seasonNumber?: number;
  teams: readonly {
    teamId: string;
    teamName?: string;
    farmRosterPlayerIds?: readonly string[];
    committedFarmSalaries?: number;
    mlbBudgetCarryover?: number;
  }[];
  scoutsByTeamId?: Record<string, ProspectScoutDescriptor | undefined>;
  seed: string;
  config?: Partial<AuctionSetupConfig>;
  sessionId?: string;
  sessionLaunchNonce?: string;
  poolMultiplier?: number;
}

export interface FarmAuctionSessionResult {
  session: CpuShillAuctionSession;
  pool: FarmAuctionPool;
  farmTierCap: number;
}

export function buildFarmAuctionSession(
  input: BuildFarmAuctionSessionInput,
): FarmAuctionSessionResult {
  const pool = buildFarmAuctionPool({
    leagueId: input.leagueId,
    seasonNumber: input.seasonNumber ?? 1,
    seed: input.seed,
    teamDraftOrder: input.teams.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName ?? team.teamId,
    })),
    scoutsByTeamId: input.scoutsByTeamId,
    poolMultiplier: input.poolMultiplier,
  });
  const farmTierCap = computeFarmTierCap(pool.auctionPlayers.map((player) => player.iv));
  const teamInputs = buildFarmAuctionTeamInputs({
    teams: input.teams.map((team) => ({
      teamId: team.teamId,
      farmRosterPlayerIds: team.farmRosterPlayerIds ?? [],
      committedFarmSalaries: team.committedFarmSalaries,
      mlbBudgetCarryover: team.mlbBudgetCarryover,
    })),
    farmTierCap,
  });
  const config: AuctionSetupConfig = {
    ...DEFAULT_AUCTION_SETUP_CONFIG,
    ...input.config,
    nominationOrderSeed: input.seed,
  };
  const session = initAuctionSession({
    teams: teamInputs,
    players: pool.auctionPlayers,
    config,
    sessionId: input.sessionId,
    sessionLaunchNonce: input.sessionLaunchNonce,
  }) as CpuShillAuctionSession;

  return { session, pool, farmTierCap };
}
