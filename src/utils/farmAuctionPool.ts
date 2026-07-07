import {
  calculateIvBaseSalary,
  type PlayerForSalary,
  type PlayerPosition,
} from '../engines/salaryCalculator';
import type { AuctionPlayer } from '../engines/auctionStateMachine';
import {
  generateProspectPool,
  type LeagueBuilderProspectPlayerDto,
  type ProspectDraftTeam,
  type ProspectScoutDescriptor,
} from './prospectScoutingDraftEngine';

export const FARM_AUCTION_ROSTER_SLOTS_PER_TEAM = 10;
export const DEFAULT_FARM_AUCTION_POOL_MULTIPLIER = 3;

export interface BuildFarmAuctionPoolInput {
  leagueId: string;
  seasonNumber: number;
  seed: string;
  teamCount?: number;
  teamDraftOrder?: readonly ProspectDraftTeam[];
  scoutsByTeamId?: Record<string, ProspectScoutDescriptor | undefined>;
  poolMultiplier?: number;
}

export interface FarmAuctionPool {
  prospects: LeagueBuilderProspectPlayerDto[];
  auctionPlayers: AuctionPlayer[];
}

const SALARY_POSITIONS = new Set<string>([
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'RF',
  'DH',
  'SP',
  'RP',
  'CP',
  'SP/RP',
]);

function isProspectPitcher(position: LeagueBuilderProspectPlayerDto['primaryPosition']): boolean {
  return position === 'SP'
    || position === 'RP'
    || position === 'CP'
    || position === 'SP/RP'
    || (position as string) === 'P';
}

function toSalaryPosition(
  position: LeagueBuilderProspectPlayerDto['primaryPosition'] | LeagueBuilderProspectPlayerDto['secondaryPosition'],
): PlayerPosition {
  return position && SALARY_POSITIONS.has(position) ? position as PlayerPosition : 'UTIL';
}

function toPitcherRole(
  position: LeagueBuilderProspectPlayerDto['primaryPosition'],
): PlayerForSalary['pitcherRole'] {
  return position === 'SP' || position === 'RP' || position === 'CP' || position === 'SP/RP'
    ? position
    : 'SP';
}

export function toFarmAuctionSalaryPlayer(prospect: LeagueBuilderProspectPlayerDto): PlayerForSalary {
  // mirrors toSalaryPlayer (useLeagueBuilderData.ts:177)
  const isPitcher = isProspectPitcher(prospect.primaryPosition);

  return {
    id: prospect.id,
    name: `${prospect.firstName} ${prospect.lastName}`.trim(),
    isPitcher,
    primaryPosition: toSalaryPosition(prospect.primaryPosition),
    secondaryPosition: prospect.secondaryPosition ? toSalaryPosition(prospect.secondaryPosition) : undefined,
    pitcherRole: isPitcher ? toPitcherRole(prospect.primaryPosition) : undefined,
    ratings: isPitcher
      ? { velocity: prospect.velocity, junk: prospect.junk, accuracy: prospect.accuracy }
      : {
          power: prospect.power,
          contact: prospect.contact,
          speed: prospect.speed,
          fielding: prospect.fielding,
          arm: prospect.arm,
        },
    battingRatings: isPitcher
      ? {
          power: prospect.power,
          contact: prospect.contact,
          speed: prospect.speed,
          fielding: prospect.fielding,
          arm: prospect.arm,
        }
      : undefined,
    age: prospect.age,
    bats: prospect.bats,
    fame: prospect.fame,
    traits: [prospect.trait1, prospect.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: prospect.arsenal,
    armSlot: prospect.armSlot ?? null,
  };
}

export function priceFarmAuctionProspect(prospect: LeagueBuilderProspectPlayerDto): number {
  const iv = calculateIvBaseSalary(toFarmAuctionSalaryPlayer(prospect)).ivBase;
  if (!Number.isFinite(iv) || iv <= 0) {
    throw new Error(`Farm auction prospect ${prospect.id} priced to invalid IV: ${iv}`);
  }
  return iv;
}

function computeIvPercentiles(
  poolPlayers: readonly { id: string; iv: number }[],
): Map<string, number> {
  const sorted = [...poolPlayers].sort((left, right) => left.iv - right.iv || left.id.localeCompare(right.id));
  const denominator = Math.max(1, sorted.length - 1);
  const firstIndexByIv = new Map<number, number>();

  sorted.forEach((player, index) => {
    if (!firstIndexByIv.has(player.iv)) firstIndexByIv.set(player.iv, index);
  });

  return new Map(
    poolPlayers.map((player) => [
      player.id,
      sorted.length <= 1 ? 100 : ((firstIndexByIv.get(player.iv) ?? 0) / denominator) * 100,
    ]),
  );
}

function resolveTeamDraftOrder(input: BuildFarmAuctionPoolInput): ProspectDraftTeam[] {
  if (input.teamDraftOrder && input.teamDraftOrder.length > 0) {
    return input.teamDraftOrder.map((team) => ({ ...team }));
  }
  const teamCount = input.teamCount;
  if (typeof teamCount !== 'number' || !Number.isInteger(teamCount) || teamCount <= 0) {
    throw new Error('Farm auction pool requires a positive integer teamCount or non-empty teamDraftOrder.');
  }
  return Array.from({ length: teamCount }, (_, index) => ({
    teamId: `team-${index + 1}`,
    teamName: `Team ${index + 1}`,
  }));
}

function resolvePoolMultiplier(poolMultiplier: number | undefined): number {
  const multiplier = poolMultiplier ?? DEFAULT_FARM_AUCTION_POOL_MULTIPLIER;
  if (!Number.isInteger(multiplier) || multiplier <= 0) {
    throw new Error('Farm auction poolMultiplier must be a positive integer.');
  }
  return multiplier;
}

export function buildFarmAuctionPool(input: BuildFarmAuctionPoolInput): FarmAuctionPool {
  const teamDraftOrder = resolveTeamDraftOrder(input);
  const poolMultiplier = resolvePoolMultiplier(input.poolMultiplier);
  const poolSize = FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * teamDraftOrder.length * poolMultiplier;
  const prospects = generateProspectPool({
    leagueId: input.leagueId,
    seasonNumber: input.seasonNumber,
    seed: input.seed,
    teamDraftOrder,
    scoutsByTeamId: input.scoutsByTeamId,
  }, poolSize);
  const pricedProspects = prospects.map((prospect) => ({
    id: prospect.id,
    iv: priceFarmAuctionProspect(prospect),
  }));
  const percentiles = computeIvPercentiles(pricedProspects);
  const auctionPlayers = pricedProspects.map((player) => ({
    playerId: player.id,
    iv: player.iv,
    ivPercentile: percentiles.get(player.id) ?? 0,
  }));

  return {
    prospects,
    auctionPlayers,
  };
}
