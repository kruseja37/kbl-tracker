/**
 * Lineup Loader Utility
 *
 * Loads stored lineups from League Builder or falls back to auto-generation.
 * Used by Exhibition mode to get game-ready rosters.
 */

import type { Player as RosterPlayer, Pitcher as RosterPitcher } from '../app/components/TeamRoster';
import type { Player as LBPlayer, TeamRoster, LineupSlot } from '../../utils/leagueBuilderStorage';

export interface LoadedLineup {
  players: RosterPlayer[];      // 9 lineup + bench players
  pitchers: RosterPitcher[];    // Starting pitcher active, rest inactive
  hasStoredLineup: boolean;     // Whether lineup came from League Builder
}

/**
 * Convert League Builder player to TeamRoster player format
 */
function convertToRosterPlayer(
  player: LBPlayer,
  battingOrder?: number,
  position?: string
): RosterPlayer {
  const fullName = `${player.firstName} ${player.lastName}`;
  return {
    name: fullName,
    position: position || player.primaryPosition || 'DH',
    battingOrder,
    stats: {
      ab: 0,
      h: 0,
      r: 0,
      rbi: 0,
      bb: 0,
      k: 0,
    },
    battingHand: player.bats === 'S' ? 'S' : (player.bats as 'L' | 'R'),
  };
}

/**
 * Convert League Builder player (pitcher) to TeamRoster pitcher format
 */
function convertToRosterPitcher(
  player: LBPlayer,
  isActive: boolean,
  isStarter?: boolean
): RosterPitcher {
  const fullName = `${player.firstName} ${player.lastName}`;
  return {
    name: fullName,
    stats: {
      ip: '0',
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      k: 0,
      pitches: 0,
    },
    throwingHand: player.throws,
    isStarter: isStarter ?? player.primaryPosition === 'SP',
    isActive,
  };
}

/**
 * Auto-generate lineup when no stored lineup exists.
 * Takes first 8 batters + starting pitcher batting 9th (NL-style, no DH).
 * SMB4 doesn't have DH, so pitcher always bats.
 */
function autoGenerateLineup(teamPlayers: LBPlayer[]): LoadedLineup {
  // Split into batters and pitchers
  const batters = teamPlayers.filter(
    p => !['SP', 'RP', 'CP'].includes(p.primaryPosition)
  );
  const pitchers = teamPlayers.filter(
    p => ['SP', 'RP', 'CP'].includes(p.primaryPosition)
  );

  // Find starting pitcher (first SP)
  const starters = pitchers.filter(p => p.primaryPosition === 'SP');
  const relievers = pitchers.filter(p => p.primaryPosition !== 'SP');
  const startingPitcher = starters[0];

  // Create lineup: first 8 batters + pitcher batting 9th (EXH-009)
  const lineupPlayers: RosterPlayer[] = batters.slice(0, 8).map((player, idx) =>
    convertToRosterPlayer(player, idx + 1, player.primaryPosition)
  );

  // Add starting pitcher to batting order at 9th spot
  if (startingPitcher) {
    lineupPlayers.push(
      convertToRosterPlayer(startingPitcher, 9, 'P')
    );
  }

  // Remaining batters become bench
  const benchPlayers = batters.slice(8).map(player =>
    convertToRosterPlayer(player, undefined, undefined)
  );

  const rosterPitchers: RosterPitcher[] = [
    // First starter is active
    ...starters.slice(0, 1).map(p => convertToRosterPitcher(p, true, true)),
    // Other starters inactive
    ...starters.slice(1).map(p => convertToRosterPitcher(p, false, true)),
    // Relievers inactive
    ...relievers.map(p => convertToRosterPitcher(p, false, false)),
  ];

  return {
    players: [...lineupPlayers, ...benchPlayers],
    pitchers: rosterPitchers,
    hasStoredLineup: false,
  };
}

/**
 * Load team lineup from League Builder storage.
 * Falls back to auto-generation if no stored lineup exists.
 *
 * @param teamId - The team ID to load lineup for
 * @param allPlayers - All players in the database (filtered to team)
 * @param getRoster - Function to fetch TeamRoster from storage
 */
export async function loadTeamLineup(
  teamId: string,
  teamPlayers: LBPlayer[],
  getRoster: (teamId: string) => Promise<TeamRoster | null>
): Promise<LoadedLineup> {
  // Try to fetch stored roster
  const roster = await getRoster(teamId);

  // If no roster or no lineup configured, auto-generate
  if (!roster || !roster.lineupVsRHP || roster.lineupVsRHP.length < 9) {
    return autoGenerateLineup(teamPlayers);
  }

  // Create player lookup map
  const playerMap = new Map<string, LBPlayer>();
  teamPlayers.forEach(p => playerMap.set(p.id, p));

  // Build lineup from stored LineupSlots (default to vs RHP)
  const lineup = roster.lineupVsRHP;
  const lineupPlayerIds = new Set(lineup.map(slot => slot.playerId));

  // Find starting pitcher
  const pitcherPlayers = teamPlayers.filter(
    p => ['SP', 'RP', 'CP'].includes(p.primaryPosition)
  );
  const starters = pitcherPlayers.filter(p => p.primaryPosition === 'SP');
  const startingPitcherId = roster.startingRotation?.[0] || starters[0]?.id;
  const startingPitcher = teamPlayers.find(p => p.id === startingPitcherId);

  // Check if lineup includes a pitcher (SMB4 doesn't have DH)
  const lineupHasPitcher = lineup.some(slot => {
    const player = playerMap.get(slot.playerId);
    return player && ['SP', 'RP', 'CP'].includes(player.primaryPosition);
  });

  const lineupPlayers: RosterPlayer[] = [];
  for (let i = 0; i < lineup.length; i++) {
    const slot = lineup[i];
    const player = playerMap.get(slot.playerId);

    // If this is spot 9 and no pitcher in lineup, replace with starting pitcher (EXH-009)
    if (!lineupHasPitcher && slot.battingOrder === 9 && startingPitcher) {
      lineupPlayers.push(
        convertToRosterPlayer(startingPitcher, 9, 'P')
      );
      continue;
    }

    if (player) {
      lineupPlayers.push(
        convertToRosterPlayer(player, slot.battingOrder, slot.fieldingPosition)
      );
    }
  }

  // If lineup has 8 players and no pitcher, add starting pitcher at 9
  if (!lineupHasPitcher && lineupPlayers.length === 8 && startingPitcher) {
    lineupPlayers.push(
      convertToRosterPlayer(startingPitcher, 9, 'P')
    );
  }

  // Bench players: MLB roster minus lineup players
  const mlbRosterIds = new Set(roster.mlbRoster || []);
  const benchPlayers: RosterPlayer[] = [];

  for (const player of teamPlayers) {
    // Skip pitchers (they go in pitchers list)
    if (['SP', 'RP', 'CP'].includes(player.primaryPosition)) continue;

    // Skip if already in lineup
    if (lineupPlayerIds.has(player.id)) continue;

    // Add to bench if in MLB roster, or if no mlbRoster defined
    if (mlbRosterIds.size === 0 || mlbRosterIds.has(player.id)) {
      benchPlayers.push(convertToRosterPlayer(player, undefined, undefined));
    }
  }

  // Build pitcher list (reuse pitcherPlayers from above)
  const rosterPitchers: RosterPitcher[] = [];
  for (const player of pitcherPlayers) {
    const isActive = player.id === startingPitcherId;
    const isInRotation = roster.startingRotation?.includes(player.id);
    rosterPitchers.push(convertToRosterPitcher(player, isActive, isInRotation));
  }

  // Sort pitchers: active first, then starters, then relievers
  rosterPitchers.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.isStarter && !b.isStarter) return -1;
    if (!a.isStarter && b.isStarter) return 1;
    return 0;
  });

  return {
    players: [...lineupPlayers, ...benchPlayers],
    pitchers: rosterPitchers,
    hasStoredLineup: true,
  };
}
