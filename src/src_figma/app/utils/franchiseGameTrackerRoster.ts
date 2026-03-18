import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState } from '../../../engines/fitnessEngine';
import { getPlayersByTeam, getTeam } from '../../../utils/leagueBuilderStorage';
import type { Player as TeamRosterPlayer, Pitcher as TeamRosterPitcher } from '@/app/components/TeamRoster';

const PITCHER_POS = new Set(['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY']);
const FIELD_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

function formatName(first: string, last: string) {
  const initial = first?.charAt(0)?.toUpperCase() || '?';
  const upper = last?.toUpperCase() || 'PLAYER';
  return `${initial}. ${upper}`;
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
  context: { franchiseId?: string; leagueId?: string } = {},
): Promise<{
  players: TeamRosterPlayer[];
  pitchers: TeamRosterPitcher[];
}> {
  let dbPlayers;
  try {
    let leagueId = context.leagueId;
    if (!leagueId) {
      try {
        const team = await getTeam(teamId);
        leagueId = team?.leagueIds?.[0];
      } catch {
        leagueId = undefined;
      }
    }
    dbPlayers = await getPlayersByTeam(teamId, leagueId ?? '');
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

  const assigned = new Set<typeof positionPlayers[number]>();
  const filledPositions = new Map<string, typeof positionPlayers[number]>();

  for (const pos of FIELD_POS) {
    const candidate = positionPlayers.find(p => !assigned.has(p) && p.primaryPosition === pos);
    if (candidate) {
      filledPositions.set(pos, candidate);
      assigned.add(candidate);
    }
  }

  for (const pos of FIELD_POS) {
    if (filledPositions.has(pos)) continue;
    const candidate = positionPlayers.find(p => !assigned.has(p) && p.secondaryPosition === pos);
    if (candidate) {
      filledPositions.set(pos, candidate);
      assigned.add(candidate);
    }
  }

  for (const pos of FIELD_POS) {
    if (filledPositions.has(pos)) continue;
    const candidate = positionPlayers.find(p => !assigned.has(p));
    if (candidate) {
      filledPositions.set(pos, candidate);
      assigned.add(candidate);
    }
  }

  const players: TeamRosterPlayer[] = [];
  let order = 1;
  for (const [pos, p] of filledPositions) {
    players.push({
      playerId: p.id,
      name: formatName(p.firstName, p.lastName),
      position: pos,
      battingOrder: order++,
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
    });
  }

  if (pitcherPlayers.length > 0) {
    const starter = pitcherPlayers.find(p => p.primaryPosition === 'SP') || pitcherPlayers[0];
    players.push({
      playerId: starter.id,
      name: formatName(starter.firstName, starter.lastName),
      position: 'P',
      battingOrder: order++,
      stats: { ...emptyBatterStats },
      battingHand: starter.bats,
      power: starter.power,
      contact: starter.contact,
      speed: starter.speed,
      fieldingRating: starter.fielding,
      arm: starter.arm,
      trait1: starter.trait1,
      trait2: starter.trait2,
      age: starter.age,
      throws: starter.throws,
      secondaryPosition: starter.secondaryPosition,
    });
  }

  const benchPlayers = positionPlayers.filter(p => !assigned.has(p));
  for (const p of benchPlayers) {
    players.push({
      playerId: p.id,
      name: formatName(p.firstName, p.lastName),
      position: p.primaryPosition,
      battingOrder: undefined,
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
    });
  }

  const pitchers: TeamRosterPitcher[] = [];
  const starterPitcher = pitcherPlayers.find(p => p.primaryPosition === 'SP') || pitcherPlayers[0];
  pitcherPlayers.forEach(p => {
    const isStarter = starterPitcher && p.id === starterPitcher.id;
    pitchers.push({
      playerId: p.id,
      name: formatName(p.firstName, p.lastName),
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

  return { players, pitchers };
}
