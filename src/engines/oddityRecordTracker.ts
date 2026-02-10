/**
 * Oddity Records Tracker (GAP-B10-001)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §15
 *
 * Tracks 19 unusual/funny records across play-by-play, end-of-game, and season-end.
 */

// ============================================
// TYPES
// ============================================

export type OddityRecordType =
  | 'SHORTEST_HOMER'
  | 'SLOWEST_TRIPLE'
  | 'WEAKEST_HOMER'
  | 'FLUKIEST_HOMER'
  | 'MARATHON_GAME'
  | 'EFFICIENT_CG'
  | 'SPEEDSTER_STRIKEOUT_KING'
  | 'POWER_OUTAGE'
  | 'CONTACT_HITTER_HOMER_SPREE'
  | 'MEATBALL_MAESTRO'
  | 'WILD_THING'
  | 'UNTOUCHABLE_LOSS'
  | 'TREVOR_HOFFMAN_SAVE'
  | 'SLOW_POKE_STEAL'
  | 'ERROR_MACHINE_WIN'
  | 'COMEBACK_FROM_DEAD'
  | 'BLOWN_LEAD_OF_SHAME'
  | 'SHO_HEY'
  | 'FLAILING_FIELDER';

export const ODDITY_RECORD_TYPES: OddityRecordType[] = [
  'SHORTEST_HOMER', 'SLOWEST_TRIPLE', 'WEAKEST_HOMER', 'FLUKIEST_HOMER',
  'MARATHON_GAME', 'EFFICIENT_CG', 'SPEEDSTER_STRIKEOUT_KING', 'POWER_OUTAGE',
  'CONTACT_HITTER_HOMER_SPREE', 'MEATBALL_MAESTRO', 'WILD_THING', 'UNTOUCHABLE_LOSS',
  'TREVOR_HOFFMAN_SAVE', 'SLOW_POKE_STEAL', 'ERROR_MACHINE_WIN', 'COMEBACK_FROM_DEAD',
  'BLOWN_LEAD_OF_SHAME', 'SHO_HEY', 'FLAILING_FIELDER',
];

export const ODDITY_LABELS: Record<OddityRecordType, string> = {
  SHORTEST_HOMER: 'Shortest Homer',
  SLOWEST_TRIPLE: 'Slowest Triple',
  WEAKEST_HOMER: 'Weakest Homer',
  FLUKIEST_HOMER: 'Flukiest Homer',
  MARATHON_GAME: 'Marathon Game',
  EFFICIENT_CG: 'Most Efficient CG',
  SPEEDSTER_STRIKEOUT_KING: 'Speedster Strikeout King',
  POWER_OUTAGE: 'Power Outage',
  CONTACT_HITTER_HOMER_SPREE: 'Contact Hitter Homer Spree',
  MEATBALL_MAESTRO: 'Meatball Maestro',
  WILD_THING: 'Wild Thing',
  UNTOUCHABLE_LOSS: 'Untouchable Loss',
  TREVOR_HOFFMAN_SAVE: 'Trevor Hoffman Save',
  SLOW_POKE_STEAL: 'Slow Poke Steal',
  ERROR_MACHINE_WIN: 'Error Machine Win',
  COMEBACK_FROM_DEAD: 'Comeback From the Dead',
  BLOWN_LEAD_OF_SHAME: 'Blown Lead of Shame',
  SHO_HEY: 'Sho-Hey!',
  FLAILING_FIELDER: 'Flailing Fielder',
};

export interface OddityRecordCandidate {
  recordType: OddityRecordType;
  playerId?: string;
  playerName?: string;
  value: number;
  ratingSnapshot?: { power?: number; contact?: number; speed?: number; fielding?: number };
  gameId: string;
  season: number;
  context: string;
}

export interface GameOddityState {
  maxDeficit: { team: 'home' | 'away'; deficit: number; inning: number };
  maxLead: { team: 'home' | 'away'; lead: number; inning: number };
  totalPitches: { home: number; away: number };
  errors: { home: number; away: number };
}

// ============================================
// STATE MANAGEMENT
// ============================================

export function createGameOddityState(): GameOddityState {
  return {
    maxDeficit: { team: 'home', deficit: 0, inning: 1 },
    maxLead: { team: 'home', lead: 0, inning: 1 },
    totalPitches: { home: 0, away: 0 },
    errors: { home: 0, away: 0 },
  };
}

export function updateGameOddityState(
  state: GameOddityState,
  homeScore: number,
  awayScore: number,
  inning: number,
  pitchCount?: number,
  isHomePitching?: boolean,
  errorOccurred?: { team: 'home' | 'away' },
): void {
  const diff = homeScore - awayScore;

  // Track max deficit for comeback records
  if (diff < 0 && Math.abs(diff) > state.maxDeficit.deficit && state.maxDeficit.team === 'home') {
    state.maxDeficit = { team: 'home', deficit: Math.abs(diff), inning };
  }
  if (diff > 0 && diff > state.maxDeficit.deficit && state.maxDeficit.team === 'away') {
    state.maxDeficit = { team: 'away', deficit: diff, inning };
  }

  // Track max lead for blown lead records
  if (diff > 0 && diff > state.maxLead.lead) {
    state.maxLead = { team: 'home', lead: diff, inning };
  }
  if (diff < 0 && Math.abs(diff) > state.maxLead.lead) {
    state.maxLead = { team: 'away', lead: Math.abs(diff), inning };
  }

  // Track pitch counts
  if (pitchCount !== undefined && isHomePitching !== undefined) {
    if (isHomePitching) {
      state.totalPitches.home += pitchCount;
    } else {
      state.totalPitches.away += pitchCount;
    }
  }

  // Track errors
  if (errorOccurred) {
    state.errors[errorOccurred.team]++;
  }
}

// ============================================
// PLAY-LEVEL ODDITY CHECKS
// ============================================

export function checkPlayOddities(
  play: {
    result: string;
    distance?: number;
    playerId: string;
    playerName: string;
    ratings: { power?: number; contact?: number; speed?: number };
  },
  gameId: string,
  season: number,
  currentRecords: Map<OddityRecordType, OddityRecordCandidate>,
): OddityRecordCandidate[] {
  const candidates: OddityRecordCandidate[] = [];

  // SHORTEST_HOMER: HR with shortest distance
  if (play.result === 'HR' && play.distance !== undefined && play.distance > 0) {
    const current = currentRecords.get('SHORTEST_HOMER');
    if (!current || play.distance < current.value) {
      candidates.push({
        recordType: 'SHORTEST_HOMER',
        playerId: play.playerId,
        playerName: play.playerName,
        value: play.distance,
        ratingSnapshot: { power: play.ratings.power },
        gameId,
        season,
        context: `${play.playerName} hit a ${play.distance}-foot homer`,
      });
    }
  }

  // SLOWEST_TRIPLE: Triple by player with lowest speed
  if (play.result === '3B' && play.ratings.speed !== undefined) {
    const current = currentRecords.get('SLOWEST_TRIPLE');
    if (!current || play.ratings.speed < current.value) {
      candidates.push({
        recordType: 'SLOWEST_TRIPLE',
        playerId: play.playerId,
        playerName: play.playerName,
        value: play.ratings.speed,
        ratingSnapshot: { speed: play.ratings.speed },
        gameId,
        season,
        context: `${play.playerName} (${play.ratings.speed} SPD) legged out a triple`,
      });
    }
  }

  // WEAKEST_HOMER: HR by player with lowest power
  if (play.result === 'HR' && play.ratings.power !== undefined) {
    const current = currentRecords.get('WEAKEST_HOMER');
    if (!current || play.ratings.power < current.value) {
      candidates.push({
        recordType: 'WEAKEST_HOMER',
        playerId: play.playerId,
        playerName: play.playerName,
        value: play.ratings.power,
        ratingSnapshot: { power: play.ratings.power },
        gameId,
        season,
        context: `${play.playerName} (${play.ratings.power} POW) somehow went deep`,
      });
    }
  }

  // FLUKIEST_HOMER: HR by player with lowest contact
  if (play.result === 'HR' && play.ratings.contact !== undefined) {
    const current = currentRecords.get('FLUKIEST_HOMER');
    if (!current || play.ratings.contact < current.value) {
      candidates.push({
        recordType: 'FLUKIEST_HOMER',
        playerId: play.playerId,
        playerName: play.playerName,
        value: play.ratings.contact,
        ratingSnapshot: { contact: play.ratings.contact },
        gameId,
        season,
        context: `${play.playerName} (${play.ratings.contact} CON) found the sweet spot`,
      });
    }
  }

  // SLOW_POKE_STEAL: Stolen base by player with lowest speed
  if (play.result === 'SB' && play.ratings.speed !== undefined) {
    const current = currentRecords.get('SLOW_POKE_STEAL');
    if (!current || play.ratings.speed < current.value) {
      candidates.push({
        recordType: 'SLOW_POKE_STEAL',
        playerId: play.playerId,
        playerName: play.playerName,
        value: play.ratings.speed,
        ratingSnapshot: { speed: play.ratings.speed },
        gameId,
        season,
        context: `${play.playerName} (${play.ratings.speed} SPD) stole a base!`,
      });
    }
  }

  return candidates;
}

// ============================================
// END-OF-GAME ODDITY CHECKS
// ============================================

export interface EndOfGameData {
  gameId: string;
  season: number;
  winner: 'home' | 'away';
  homeScore: number;
  awayScore: number;
  oddityState: GameOddityState;
  pitcherStats: Array<{
    pitcherId: string;
    pitcherName: string;
    isStarter: boolean;
    team: 'home' | 'away';
    outsRecorded: number;
    hitsAllowed: number;
    walksAllowed: number;
    earnedRuns: number;
    pitchCount: number;
    decision?: 'W' | 'L' | 'SV';
    isCompleteGame: boolean;
  }>;
}

export function checkEndOfGameOddities(
  data: EndOfGameData,
  currentRecords: Map<OddityRecordType, OddityRecordCandidate>,
): OddityRecordCandidate[] {
  const candidates: OddityRecordCandidate[] = [];

  // MARATHON_GAME: Most total pitches in a game
  const totalPitches = data.oddityState.totalPitches.home + data.oddityState.totalPitches.away;
  const currentMarathon = currentRecords.get('MARATHON_GAME');
  if (totalPitches > 0 && (!currentMarathon || totalPitches > currentMarathon.value)) {
    candidates.push({
      recordType: 'MARATHON_GAME',
      value: totalPitches,
      gameId: data.gameId,
      season: data.season,
      context: `${totalPitches} total pitches thrown`,
    });
  }

  // EFFICIENT_CG: Fewest pitches in a complete game
  for (const p of data.pitcherStats) {
    if (p.isCompleteGame && p.pitchCount > 0) {
      const currentEfficient = currentRecords.get('EFFICIENT_CG');
      if (!currentEfficient || p.pitchCount < currentEfficient.value) {
        candidates.push({
          recordType: 'EFFICIENT_CG',
          playerId: p.pitcherId,
          playerName: p.pitcherName,
          value: p.pitchCount,
          gameId: data.gameId,
          season: data.season,
          context: `${p.pitcherName} threw a ${p.pitchCount}-pitch complete game`,
        });
      }
    }
  }

  // MEATBALL_MAESTRO: Win with most hits allowed
  const winningPitchers = data.pitcherStats.filter(p => p.team === data.winner && p.isStarter);
  for (const p of winningPitchers) {
    if (p.decision === 'W') {
      const current = currentRecords.get('MEATBALL_MAESTRO');
      if (!current || p.hitsAllowed > current.value) {
        candidates.push({
          recordType: 'MEATBALL_MAESTRO',
          playerId: p.pitcherId,
          playerName: p.pitcherName,
          value: p.hitsAllowed,
          gameId: data.gameId,
          season: data.season,
          context: `${p.pitcherName} won despite allowing ${p.hitsAllowed} hits`,
        });
      }
    }
  }

  // WILD_THING: Win with most walks issued
  for (const p of winningPitchers) {
    if (p.decision === 'W') {
      const current = currentRecords.get('WILD_THING');
      if (!current || p.walksAllowed > current.value) {
        candidates.push({
          recordType: 'WILD_THING',
          playerId: p.pitcherId,
          playerName: p.pitcherName,
          value: p.walksAllowed,
          gameId: data.gameId,
          season: data.season,
          context: `${p.pitcherName} won despite walking ${p.walksAllowed}`,
        });
      }
    }
  }

  // UNTOUCHABLE_LOSS: Fewest hits allowed in a loss (starter only)
  const loser = data.winner === 'home' ? 'away' : 'home';
  const losingStarters = data.pitcherStats.filter(p => p.team === loser && p.isStarter && p.decision === 'L');
  for (const p of losingStarters) {
    const current = currentRecords.get('UNTOUCHABLE_LOSS');
    if (!current || p.hitsAllowed < current.value) {
      candidates.push({
        recordType: 'UNTOUCHABLE_LOSS',
        playerId: p.pitcherId,
        playerName: p.pitcherName,
        value: p.hitsAllowed,
        gameId: data.gameId,
        season: data.season,
        context: `${p.pitcherName} lost despite allowing only ${p.hitsAllowed} hits`,
      });
    }
  }

  // TREVOR_HOFFMAN_SAVE: Save with earned runs
  const saveWithER = data.pitcherStats.filter(p => p.decision === 'SV' && p.earnedRuns >= 1);
  for (const p of saveWithER) {
    const current = currentRecords.get('TREVOR_HOFFMAN_SAVE');
    // Accumulate count — value = total saves with ER
    const newVal = (current?.value ?? 0) + 1;
    candidates.push({
      recordType: 'TREVOR_HOFFMAN_SAVE',
      playerId: p.pitcherId,
      playerName: p.pitcherName,
      value: newVal,
      gameId: data.gameId,
      season: data.season,
      context: `${p.pitcherName} earned save #${newVal} with earned runs allowed`,
    });
  }

  // ERROR_MACHINE_WIN: Win with most errors
  const winnerErrors = data.oddityState.errors[data.winner];
  if (winnerErrors > 0) {
    const current = currentRecords.get('ERROR_MACHINE_WIN');
    if (!current || winnerErrors > current.value) {
      candidates.push({
        recordType: 'ERROR_MACHINE_WIN',
        value: winnerErrors,
        gameId: data.gameId,
        season: data.season,
        context: `Won despite committing ${winnerErrors} errors`,
      });
    }
  }

  // COMEBACK_FROM_DEAD: Largest deficit overcome in a win
  if (data.oddityState.maxDeficit.team === data.winner && data.oddityState.maxDeficit.deficit > 0) {
    const current = currentRecords.get('COMEBACK_FROM_DEAD');
    if (!current || data.oddityState.maxDeficit.deficit > current.value) {
      candidates.push({
        recordType: 'COMEBACK_FROM_DEAD',
        value: data.oddityState.maxDeficit.deficit,
        gameId: data.gameId,
        season: data.season,
        context: `Overcame a ${data.oddityState.maxDeficit.deficit}-run deficit to win`,
      });
    }
  }

  // BLOWN_LEAD_OF_SHAME: Largest lead blown in a loss
  if (data.oddityState.maxLead.team !== data.winner && data.oddityState.maxLead.lead > 0) {
    const current = currentRecords.get('BLOWN_LEAD_OF_SHAME');
    if (!current || data.oddityState.maxLead.lead > current.value) {
      candidates.push({
        recordType: 'BLOWN_LEAD_OF_SHAME',
        value: data.oddityState.maxLead.lead,
        gameId: data.gameId,
        season: data.season,
        context: `Blew a ${data.oddityState.maxLead.lead}-run lead and lost`,
      });
    }
  }

  return candidates;
}

// ============================================
// SEASON-END ODDITY CHECKS
// ============================================

export interface SeasonPlayerStats {
  playerId: string;
  playerName: string;
  ratings: { power?: number; contact?: number; speed?: number; fielding?: number };
  hr: number;
  strikeouts: number;
  ab: number;
  ops?: number;
  fwar?: number;
}

export function checkSeasonEndOddities(
  playerStats: SeasonPlayerStats[],
  seasonLength: number,
  currentRecords: Map<OddityRecordType, OddityRecordCandidate>,
  gameId: string,
  season: number,
): OddityRecordCandidate[] {
  const candidates: OddityRecordCandidate[] = [];
  const scaledHRThreshold = Math.round(20 * (seasonLength / 162));

  // SPEEDSTER_STRIKEOUT_KING: Most Ks by 90+ speed player
  const speedsters = playerStats.filter(p => (p.ratings.speed ?? 0) >= 90);
  for (const p of speedsters) {
    const current = currentRecords.get('SPEEDSTER_STRIKEOUT_KING');
    if (!current || p.strikeouts > current.value) {
      candidates.push({
        recordType: 'SPEEDSTER_STRIKEOUT_KING',
        playerId: p.playerId,
        playerName: p.playerName,
        value: p.strikeouts,
        ratingSnapshot: { speed: p.ratings.speed },
        gameId, season,
        context: `${p.playerName} (${p.ratings.speed} SPD) struck out ${p.strikeouts} times`,
      });
    }
  }

  // POWER_OUTAGE: Most AB without HR by 70+ power player
  const powerHitters = playerStats.filter(p => (p.ratings.power ?? 0) >= 70 && p.hr === 0);
  for (const p of powerHitters) {
    const current = currentRecords.get('POWER_OUTAGE');
    if (!current || p.ab > current.value) {
      candidates.push({
        recordType: 'POWER_OUTAGE',
        playerId: p.playerId,
        playerName: p.playerName,
        value: p.ab,
        ratingSnapshot: { power: p.ratings.power },
        gameId, season,
        context: `${p.playerName} (${p.ratings.power} POW) went ${p.ab} AB without a homer`,
      });
    }
  }

  // CONTACT_HITTER_HOMER_SPREE: Most HRs by lowest power player (min 20 scaled)
  const lowPowerSluggers = playerStats
    .filter(p => p.hr >= scaledHRThreshold)
    .sort((a, b) => (a.ratings.power ?? 99) - (b.ratings.power ?? 99));
  if (lowPowerSluggers.length > 0) {
    const p = lowPowerSluggers[0];
    const current = currentRecords.get('CONTACT_HITTER_HOMER_SPREE');
    if (!current || p.hr > current.value) {
      candidates.push({
        recordType: 'CONTACT_HITTER_HOMER_SPREE',
        playerId: p.playerId,
        playerName: p.playerName,
        value: p.hr,
        ratingSnapshot: { power: p.ratings.power },
        gameId, season,
        context: `${p.playerName} (${p.ratings.power} POW) mashed ${p.hr} homers`,
      });
    }
  }

  // SHO_HEY: Highest OPS with lowest fielding WAR
  const shoHeyPlayers = playerStats.filter(p => p.ops !== undefined && p.fwar !== undefined);
  const bestOPSWorstField = shoHeyPlayers
    .sort((a, b) => (b.ops! - a.ops!) || (a.fwar! - b.fwar!));
  if (bestOPSWorstField.length > 0) {
    const p = bestOPSWorstField[0];
    if (p.ops! >= 0.800 && p.fwar! <= 0) {
      const current = currentRecords.get('SHO_HEY');
      if (!current || p.ops! > current.value) {
        candidates.push({
          recordType: 'SHO_HEY',
          playerId: p.playerId,
          playerName: p.playerName,
          value: p.ops!,
          gameId, season,
          context: `${p.playerName} hit ${p.ops!.toFixed(3)} OPS with ${p.fwar!.toFixed(1)} fWAR`,
        });
      }
    }
  }

  return candidates;
}
