import {
  BALANCE_MODE_DEFAULT,
} from '../data/rosterEngineConstants';
import {
  calculateIvBaseSalary,
  type PlayerForSalary,
  type PlayerPosition as SalaryPosition,
} from '../engines/salaryCalculator';
import { registerPool, type RegisteredPool } from '../engines/leagueConstruction';
import {
  getAllPlayers,
  getLeagueTemplate,
  getTeamRoster,
  resolveLeagueSalaryCap,
  saveRegisteredPool,
  type Player,
} from './leagueBuilderStorage';

function toSalaryPosition(position: Player['primaryPosition'] | Player['secondaryPosition']): SalaryPosition {
  const salaryPositions = new Set<string>([
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
  return position && salaryPositions.has(position) ? position as SalaryPosition : 'UTIL';
}

function toPitcherRole(position: Player['primaryPosition']): PlayerForSalary['pitcherRole'] {
  return position === 'SP' || position === 'RP' || position === 'CP' || position === 'SP/RP'
    ? position
    : 'SP';
}

export function toSalaryPlayer(player: Player): PlayerForSalary {
  const isPitcher = player.primaryPosition === 'SP'
    || player.primaryPosition === 'RP'
    || player.primaryPosition === 'CP'
    || player.primaryPosition === 'SP/RP'
    || player.primaryPosition === 'P';

  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`.trim(),
    isPitcher,
    primaryPosition: toSalaryPosition(player.primaryPosition),
    secondaryPosition: player.secondaryPosition ? toSalaryPosition(player.secondaryPosition) : undefined,
    pitcherRole: isPitcher ? toPitcherRole(player.primaryPosition) : undefined,
    ratings: isPitcher
      ? { velocity: player.velocity, junk: player.junk, accuracy: player.accuracy }
      : {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          arm: player.arm,
        },
    battingRatings: isPitcher
      ? {
          power: player.power,
          contact: player.contact,
          speed: player.speed,
          fielding: player.fielding,
          arm: player.arm,
        }
      : undefined,
    age: player.age,
    bats: player.bats,
    fame: player.fame,
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    arsenal: player.arsenal,
    armSlot: player.armSlot ?? null,
  };
}

export async function registerLeaguePoolForLeague(leagueId: string): Promise<RegisteredPool> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) throw new Error('League not found');

  const allPlayers = await getAllPlayers();
  const poolPlayerIds = new Set<string>();
  const playerById = new Map(allPlayers.map((player) => [player.id, player]));

  for (const player of allPlayers) {
    if (player.leagueAssignments?.some((assignment) => assignment.leagueId === league.id)) {
      poolPlayerIds.add(player.id);
    }
  }

  const includeRosterUnion = (league.draftPoolMode ?? 'pool-first') !== 'design-first';
  if (includeRosterUnion) {
    for (const teamId of league.teamIds) {
      const roster = await getTeamRoster(teamId);
      for (const playerId of [...(roster?.mlbRoster ?? []), ...(roster?.farmRoster ?? [])]) {
        if (playerById.has(playerId)) {
          poolPlayerIds.add(playerId);
        }
      }
    }
  }

  const leaguePlayers = allPlayers.filter((player) => poolPlayerIds.has(player.id));

  const registeredPool = registerPool({
    leagueId: league.id,
    tier: league.tier ?? 'juiced',
    balanceMode: league.balanceMode ?? BALANCE_MODE_DEFAULT,
    totalSlots: league.teamIds.length * 22,
    salaryCap: resolveLeagueSalaryCap(league),
    players: leaguePlayers.map((player) => ({
      id: player.id,
      iv: calculateIvBaseSalary(toSalaryPlayer(player)).ivBase,
      salary: player.salary,
    })),
  });

  await saveRegisteredPool(registeredPool);
  return registeredPool;
}
