import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { getPlayersByTeam, getTeam } from '../../../utils/leagueBuilderStorage';
import type { LineupSlot, Player as StoredPlayer, Team } from '../../../utils/leagueBuilderStorage';
import type { OptimalLineupSnapshot } from '../../../types/managerWpa';
import { getAllFranchisePlayers, getFranchiseTeam } from '../../../utils/franchisePlayerStorage';
import type { Player as TeamRosterPlayer, Pitcher as TeamRosterPitcher } from '@/app/components/TeamRoster';

const PITCHER_POS = new Set(['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY']);
const FIELD_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

function formatName(first: string, last: string) {
  const initial = first?.charAt(0)?.toUpperCase() || '?';
  const upper = last?.toUpperCase() || 'PLAYER';
  return `${initial}. ${upper}`;
}

function buildFullName(first: string, last: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || formatName(first, last);
}

export interface FranchiseGameTrackerRoster {
  players: TeamRosterPlayer[];
  pitchers: TeamRosterPitcher[];
  optimalLineups?: {
    vsRHP?: OptimalLineupSnapshot;
    vsLHP?: OptimalLineupSnapshot;
  };
}

export interface FranchisePregameReadinessTeamInput {
  teamName: string;
  players: TeamRosterPlayer[];
  pitchers: TeamRosterPitcher[];
  selectedStarterIdx: number;
  useDH: boolean;
}

export interface FranchisePregameReadinessInput {
  teams: FranchisePregameReadinessTeamInput[];
}

export interface FranchisePregameReadinessTeam {
  teamName: string;
  isReady: boolean;
  issues: string[];
}

export interface FranchisePregameReadiness {
  isReady: boolean;
  issues: string[];
  teams: FranchisePregameReadinessTeam[];
}

const GAME_TRACKER_BATTING_ORDERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function isPitcherLineupPlayer(player: TeamRosterPlayer): boolean {
  return [player.position, player.primaryPosition].some((position) =>
    PITCHER_POS.has(String(position ?? '').trim().toUpperCase()),
  );
}

function formatOrders(orders: number[]): string {
  return orders.map((order) => `#${order}`).join(', ');
}

export function buildFranchisePregameReadiness(
  input: FranchisePregameReadinessInput,
): FranchisePregameReadiness {
  const teams = input.teams.map((team): FranchisePregameReadinessTeam => {
    const issues: string[] = [];
    const selectedStarter = team.pitchers[team.selectedStarterIdx];
    if (!selectedStarter) {
      issues.push(`${team.teamName}: select a starting pitcher.`);
    }

    const lineupPlayers = team.players.filter((player) => player.battingOrder != null);
    if (lineupPlayers.length < 9) {
      issues.push(
        `${team.teamName}: needs 9 batting-order players for GameTracker start; found ${lineupPlayers.length}.`,
      );
    }

    const orderCounts = new Map<number, number>();
    const invalidOrders: number[] = [];
    for (const player of lineupPlayers) {
      const order = player.battingOrder ?? 0;
      if (!Number.isInteger(order) || order < 1 || order > 9) {
        invalidOrders.push(order);
      }
      orderCounts.set(order, (orderCounts.get(order) ?? 0) + 1);
    }

    const duplicateOrders = Array.from(orderCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([order]) => order)
      .sort((left, right) => left - right);
    if (duplicateOrders.length > 0) {
      issues.push(`${team.teamName}: batting orders must be unique; duplicate ${formatOrders(duplicateOrders)}.`);
    }

    const missingOrders = GAME_TRACKER_BATTING_ORDERS.filter((order) => !orderCounts.has(order));
    if (missingOrders.length > 0) {
      issues.push(`${team.teamName}: batting orders must cover #1-#9; missing ${formatOrders(missingOrders)}.`);
    }

    if (invalidOrders.length > 0) {
      const uniqueInvalidOrders = Array.from(new Set(invalidOrders)).sort((left, right) => left - right);
      issues.push(`${team.teamName}: batting orders must stay between #1 and #9; found ${formatOrders(uniqueInvalidOrders)}.`);
    }

    const benchmarkSlotCount = lineupPlayers.filter((player) => !isPitcherLineupPlayer(player)).length;
    const requiredBenchmarkSlots = team.useDH ? 9 : 8;
    if (benchmarkSlotCount !== requiredBenchmarkSlots) {
      issues.push(
        `${team.teamName}: needs ${requiredBenchmarkSlots} non-pitcher lineup slots for ${team.useDH ? 'DH' : 'no-DH'} benchmark; found ${benchmarkSlotCount}.`,
      );
    }

    return {
      teamName: team.teamName,
      isReady: issues.length === 0,
      issues,
    };
  });
  const issues = teams.flatMap((team) => team.issues);

  return {
    isReady: issues.length === 0,
    issues,
    teams,
  };
}

export function collectFranchiseRosterPlayerIds(
  rosters: Array<{ players: TeamRosterPlayer[]; pitchers: TeamRosterPitcher[] }>
): Set<string> {
  const playerIds = new Set<string>();

  for (const roster of rosters) {
    for (const player of roster.players) {
      if (player.playerId) {
        playerIds.add(player.playerId);
      } else if (player.name) {
        playerIds.add(player.name);
      }
    }

    for (const pitcher of roster.pitchers) {
      if (pitcher.playerId) {
        playerIds.add(pitcher.playerId);
      } else if (pitcher.name) {
        playerIds.add(pitcher.name);
      }
    }
  }

  return playerIds;
}

export async function buildFranchiseGameTrackerRoster(
  teamId: string,
  context: { franchiseId?: string; leagueId?: string; useDH?: boolean } = {},
): Promise<FranchiseGameTrackerRoster> {
  let dbPlayers: StoredPlayer[];
  let storedTeam: Team | null = null;
  try {
    const { franchiseId } = context;

    if (franchiseId) {
      let leagueId = context.leagueId;
      if (!leagueId) {
        try {
          storedTeam = await getFranchiseTeam(franchiseId, teamId);
          leagueId = storedTeam?.leagueIds?.[0];
        } catch {
          leagueId = undefined;
        }
      } else {
        storedTeam = await getFranchiseTeam(franchiseId, teamId);
      }

      const franchisePlayers = await getAllFranchisePlayers(franchiseId);
      dbPlayers = franchisePlayers.filter((player) =>
        player.leagueAssignments?.some((assignment) =>
          assignment.teamId === teamId && (!leagueId || assignment.leagueId === leagueId),
        ),
      );
    } else {
      let leagueId = context.leagueId;
      if (!leagueId) {
        try {
          storedTeam = await getTeam(teamId);
          leagueId = storedTeam?.leagueIds?.[0];
        } catch {
          leagueId = undefined;
        }
      } else {
        storedTeam = await getTeam(teamId);
      }
      dbPlayers = await getPlayersByTeam(teamId, leagueId ?? '');
    }
  } catch {
    return { players: [], pitchers: [] };
  }

  if (!dbPlayers || dbPlayers.length === 0) {
    return { players: [], pitchers: [] };
  }

  const emptyBatterStats = { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 };
  const emptyPitcherStats = { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 };

  const positionPlayers = dbPlayers.filter(p => !PITCHER_POS.has(p.primaryPosition));
  const pitcherPlayers = dbPlayers.filter(p => PITCHER_POS.has(p.primaryPosition));
  const playerById = new Map(dbPlayers.map((player) => [player.id, player]));
  const useDH = context.useDH ?? false;
  const rotationStarter = storedTeam?.startingRotation
    ?.map((playerId) => pitcherPlayers.find((player) => player.id === playerId))
    .find((player): player is StoredPlayer => Boolean(player));
  const starterPitcher =
    rotationStarter ?? pitcherPlayers.find(p => p.primaryPosition === 'SP') ?? pitcherPlayers[0];
  const storedLineup = useDH ? storedTeam?.lineupWithDH : storedTeam?.lineupWithoutDH;
  const optimalLineups = storedTeam
    ? {
        vsRHP: useDH
          ? storedTeam.optimalLineupVsRHPWithDH
          : storedTeam.optimalLineupVsRHPWithoutDH,
        vsLHP: useDH
          ? storedTeam.optimalLineupVsLHPWithDH
          : storedTeam.optimalLineupVsLHPWithoutDH,
      }
    : undefined;

  const buildTeamRosterPlayer = (
    p: StoredPlayer,
    position: string,
    battingOrder: number | undefined,
  ): TeamRosterPlayer => {
    const fullName = buildFullName(p.firstName, p.lastName);
    return {
      playerId: p.id,
      name: formatName(p.firstName, p.lastName),
      fullName,
      position,
      battingOrder,
      stats: { ...emptyBatterStats },
      battingHand: p.bats,
      mojo: 0 as MojoLevel,
      fitness: 'FIT' as FitnessState,
      power: p.power,
      contact: p.contact,
      speed: p.speed,
      fieldingRating: p.fielding,
      arm: p.arm,
      trait1: p.trait1,
      trait2: p.trait2,
      age: p.age,
      secondaryPosition: p.secondaryPosition,
      throws: p.throws,
    };
  };

  const assigned = new Set<typeof positionPlayers[number]>();
  const assignedPlayerIds = new Set<string>();
  const filledPositions = new Map<string, typeof positionPlayers[number]>();
  const players: TeamRosterPlayer[] = [];

  if (storedLineup && storedLineup.length > 0) {
    const sortedLineup = [...storedLineup].sort((left, right) => left.battingOrder - right.battingOrder);
    for (const slot of sortedLineup) {
      const storedPlayer = playerById.get(slot.playerId);
      if (!storedPlayer) continue;
      const isPitcherSlot =
        slot.fieldingPosition === ('P' as LineupSlot['fieldingPosition']) ||
        PITCHER_POS.has(storedPlayer.primaryPosition);

      if (isPitcherSlot && useDH) continue;
      if (!isPitcherSlot) {
        assignedPlayerIds.add(storedPlayer.id);
      }

      players.push(
        buildTeamRosterPlayer(
          storedPlayer,
          String(slot.fieldingPosition),
          slot.battingOrder,
        ),
      );
    }

    if (!useDH && starterPitcher && !players.some((player) => player.playerId === starterPitcher.id)) {
      players.push(buildTeamRosterPlayer(starterPitcher, 'P', players.length + 1));
    }
  }

  if (players.length === 0) {
    for (const pos of FIELD_POS) {
      const candidate = positionPlayers.find(p => !assigned.has(p) && p.primaryPosition === pos);
      if (candidate) {
        filledPositions.set(pos, candidate);
        assigned.add(candidate);
        assignedPlayerIds.add(candidate.id);
      }
    }

    for (const pos of FIELD_POS) {
      if (filledPositions.has(pos)) continue;
      const candidate = positionPlayers.find(p => !assigned.has(p) && p.secondaryPosition === pos);
      if (candidate) {
        filledPositions.set(pos, candidate);
        assigned.add(candidate);
        assignedPlayerIds.add(candidate.id);
      }
    }

    for (const pos of FIELD_POS) {
      if (filledPositions.has(pos)) continue;
      const candidate = positionPlayers.find(p => !assigned.has(p));
      if (candidate) {
        filledPositions.set(pos, candidate);
        assigned.add(candidate);
        assignedPlayerIds.add(candidate.id);
      }
    }

    let order = 1;
    for (const [pos, p] of filledPositions) {
      players.push(buildTeamRosterPlayer(p, pos, order++));
    }

    if (useDH) {
      const dhPlayer = positionPlayers.find((p) => !assignedPlayerIds.has(p.id));
      if (dhPlayer) {
        assignedPlayerIds.add(dhPlayer.id);
        players.push(buildTeamRosterPlayer(dhPlayer, 'DH', order++));
      }
    } else if (starterPitcher) {
      players.push(buildTeamRosterPlayer(starterPitcher, 'P', order++));
    }
  }

  const benchPlayers = positionPlayers.filter(p => !assignedPlayerIds.has(p.id));
  for (const p of benchPlayers) {
    players.push(buildTeamRosterPlayer(p, p.primaryPosition, undefined));
  }

  const pitchers: TeamRosterPitcher[] = [];
  pitcherPlayers.forEach(p => {
    const isStarter = starterPitcher && p.id === starterPitcher.id;
    const fullName = buildFullName(p.firstName, p.lastName);
    pitchers.push({
      playerId: p.id,
      name: formatName(p.firstName, p.lastName),
      fullName,
      stats: { ...emptyPitcherStats },
      throwingHand: p.throws,
      isStarter: isStarter || false,
      isActive: isStarter || false,
      mojo: 0 as MojoLevel,
      fitness: 'FIT' as FitnessState,
      velocity: p.velocity,
      junk: p.junk,
      accuracy: p.accuracy,
      trait1: p.trait1,
      trait2: p.trait2,
      age: p.age,
      secondaryPosition: p.secondaryPosition,
      power: p.power,
      contact: p.contact,
      speed: p.speed,
      fieldingRating: p.fielding,
      arm: p.arm,
      throws: p.throws,
    });
  });

  return { players, pitchers, optimalLineups };
}
