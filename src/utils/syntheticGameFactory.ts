/**
 * Synthetic Game Data Factory
 *
 * Generates realistic PersistedGameState objects for game simulation.
 * All data is random but statistically plausible for SMB4.
 *
 * Each team has 9 batters + 1 starter + 0-2 relievers.
 * Stats are sampled from realistic ranges.
 *
 * Adapted from test-utils/syntheticGameFactory.ts for production use.
 * Added: buildRosterFromPlayers() for real roster data
 * Added: generatePlayByPlay() for animated simulation overlay
 */

import type { PersistedGameState } from './gameStorage';
import { getPlayersByTeam } from './leagueBuilderStorage';

// ============================================
// ROSTER TEMPLATES
// ============================================

export interface RosterPlayer {
  playerId: string;
  playerName: string;
}

export interface TeamRoster {
  teamId: string;
  teamName: string;
  batters: RosterPlayer[];
  starter: RosterPlayer;
  relievers: RosterPlayer[];
}

/**
 * Generate a deterministic roster for a team.
 * Uses a seed-based approach for reproducibility.
 */
function generateRoster(teamId: string, teamName: string): TeamRoster {
  const batters: RosterPlayer[] = [];
  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  for (let i = 0; i < 9; i++) {
    batters.push({
      playerId: `${teamId}-bat-${i}`,
      playerName: `${teamName} ${positions[i]}`,
    });
  }

  const starter: RosterPlayer = {
    playerId: `${teamId}-sp-0`,
    playerName: `${teamName} SP`,
  };

  const relievers: RosterPlayer[] = [
    { playerId: `${teamId}-rp-0`, playerName: `${teamName} RP1` },
    { playerId: `${teamId}-rp-1`, playerName: `${teamName} RP2` },
  ];

  return { teamId, teamName, batters, starter, relievers };
}

// ============================================
// BUILD ROSTER FROM REAL PLAYERS
// ============================================

/** Positions considered "pitcher" */
const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CL']);

/**
 * Build a TeamRoster from real franchise player data stored in IndexedDB.
 *
 * Loads players via getPlayersByTeam(), splits by position,
 * takes first 9 position players as batters, first SP as starter,
 * remaining pitchers as relievers. Pads with generic names if short.
 */
export async function buildRosterFromPlayers(
  teamId: string,
  teamName: string
): Promise<TeamRoster> {
  let players;
  try {
    players = await getPlayersByTeam(teamId);
  } catch {
    // Fallback to generic roster if storage fails
    return generateRoster(teamId, teamName);
  }

  if (!players || players.length === 0) {
    return generateRoster(teamId, teamName);
  }

  // Separate batters from pitchers
  const positionPlayers = players.filter(
    (p) => !PITCHER_POSITIONS.has(p.primaryPosition)
  );
  const pitchers = players.filter(
    (p) => PITCHER_POSITIONS.has(p.primaryPosition)
  );

  // Build batter list — take first 9 position players
  const batters: RosterPlayer[] = [];
  for (let i = 0; i < 9; i++) {
    if (i < positionPlayers.length) {
      const p = positionPlayers[i];
      batters.push({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
      });
    } else {
      // Pad with generic name
      batters.push({
        playerId: `${teamId}-bat-${i}`,
        playerName: `${teamName} Player ${i + 1}`,
      });
    }
  }

  // Find starter — first SP, or first pitcher
  const starters = pitchers.filter((p) => p.primaryPosition === 'SP');
  const starterPlayer = starters[0] || pitchers[0];
  const starter: RosterPlayer = starterPlayer
    ? {
        playerId: starterPlayer.id,
        playerName: `${starterPlayer.firstName} ${starterPlayer.lastName}`,
      }
    : {
        playerId: `${teamId}-sp-0`,
        playerName: `${teamName} SP`,
      };

  // Remaining pitchers become relievers (max 2)
  const remainingPitchers = pitchers.filter(
    (p) => !starterPlayer || p.id !== starterPlayer.id
  );
  const relievers: RosterPlayer[] = remainingPitchers
    .slice(0, 2)
    .map((p) => ({
      playerId: p.id,
      playerName: `${p.firstName} ${p.lastName}`,
    }));

  // Pad relievers if needed
  while (relievers.length < 2) {
    const idx = relievers.length;
    relievers.push({
      playerId: `${teamId}-rp-${idx}`,
      playerName: `${teamName} RP${idx + 1}`,
    });
  }

  return { teamId, teamName, batters, starter, relievers };
}

// ============================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================

/**
 * Simple seeded PRNG (mulberry32).
 * Produces deterministic results for reproducible tests.
 */
function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================
// GAME GENERATION
// ============================================

export interface GameFactoryOptions {
  /** Random seed for reproducibility */
  seed?: number;
  /** Season ID for aggregation */
  seasonId?: string;
  /** Game number in season (for unique IDs) */
  gameNumber?: number;
  /** Override innings count (default: 9) */
  innings?: number;
}

/**
 * Generate a single synthetic completed game.
 *
 * Produces realistic baseball stat lines:
 * - Each batter gets 3-5 PA
 * - Hit rates ~.250, walk rate ~.08, K rate ~.22
 * - Pitcher stats derived from batters faced
 * - One team wins (no ties)
 * - Pitcher decisions assigned (W/L)
 */
export function generateSyntheticGame(
  awayRoster: TeamRoster,
  homeRoster: TeamRoster,
  options: GameFactoryOptions = {}
): PersistedGameState {
  const {
    seed = Date.now(),
    gameNumber = 1,
    innings = 9,
  } = options;

  const rng = createRng(seed + gameNumber);

  const gameId = `sim-game-${gameNumber}-${seed}`;

  // Generate batter stats for both teams
  const playerStats: PersistedGameState['playerStats'] = {};

  let awayRuns = 0;
  let homeRuns = 0;

  // Helper: generate one batter's game stats
  // Returns a stats object matching PersistedGameState['playerStats'][string]
  function generateBatterGame(player: RosterPlayer, teamId: string): PersistedGameState['playerStats'][string] {
    const pa = 3 + Math.floor(rng() * 3); // 3-5 PA
    let bb = 0, k = 0, h = 0, singles = 0, doubles = 0, triples = 0, hr = 0;

    let remaining = pa;

    // Walks (~8%)
    for (let i = 0; i < remaining && bb < 2; i++) {
      if (rng() < 0.08) { bb++; remaining--; }
    }

    // HBP (~1%) — counts as PA but not AB, absorbed into walk bucket for simplicity
    if (rng() < 0.03 && remaining > 0) { bb++; remaining--; }

    const ab = remaining;

    // Strikeouts (~22% of AB)
    for (let i = 0; i < ab; i++) {
      if (rng() < 0.22) k++;
    }

    // Hits (~25% of AB)
    const hitCount = Math.min(ab - k, Math.round(ab * (0.15 + rng() * 0.20)));
    h = hitCount;

    // Distribute hit types
    for (let i = 0; i < h; i++) {
      const roll = rng();
      if (roll < 0.05) { hr++; }
      else if (roll < 0.08) { triples++; }
      else if (roll < 0.25) { doubles++; }
      else { singles++; }
    }

    // RBI: HR always score 1+, other hits sometimes
    const rbi = hr + Math.floor((singles + doubles + triples) * rng() * 0.4);
    const r = (rng() < 0.3 ? 1 : 0) + (hr > 0 ? 1 : 0);

    // SB/CS
    const sb = rng() < 0.15 ? 1 : 0;
    const cs = sb > 0 && rng() < 0.25 ? 1 : 0;

    return {
      playerName: player.playerName,
      teamId,
      pa, ab, h, singles, doubles, triples, hr, rbi, r,
      bb, hbp: rng() < 0.03 ? 1 : 0, k, sb, cs,
      sf: rng() < 0.05 ? 1 : 0,
      sh: rng() < 0.02 ? 1 : 0,
      gidp: rng() < 0.08 ? 1 : 0,
      putouts: Math.floor(rng() * 4),
      assists: Math.floor(rng() * 2),
      fieldingErrors: rng() < 0.05 ? 1 : 0,
    };
  }

  // Generate away team batters
  for (const batter of awayRoster.batters) {
    const stats = generateBatterGame(batter, awayRoster.teamId);
    playerStats[batter.playerId] = stats;
    awayRuns += stats.r;
  }

  // Generate home team batters
  for (const batter of homeRoster.batters) {
    const stats = generateBatterGame(batter, homeRoster.teamId);
    playerStats[batter.playerId] = stats;
    homeRuns += stats.r;
  }

  // Ensure no tie — bump winner by 1 if equal
  if (awayRuns === homeRuns) {
    if (rng() < 0.5) {
      awayRuns += 1;
      // Give a run to a random away batter
      const idx = Math.floor(rng() * awayRoster.batters.length);
      playerStats[awayRoster.batters[idx].playerId].r += 1;
    } else {
      homeRuns += 1;
      const idx = Math.floor(rng() * homeRoster.batters.length);
      playerStats[homeRoster.batters[idx].playerId].r += 1;
    }
  }

  // Generate pitcher stats
  const pitcherGameStats: PersistedGameState['pitcherGameStats'] = [];

  function generatePitcherStats(
    pitcher: RosterPlayer,
    teamId: string,
    isStarter: boolean,
    outsRecorded: number,
    runsAllowed: number,
    entryInning: number
  ) {
    const ip = outsRecorded / 3;
    const battersFaced = Math.max(outsRecorded, Math.round(ip * 4.2 + rng() * 2));
    const hitsAllowed = Math.round(ip * (0.8 + rng() * 0.5));
    const walksAllowed = Math.round(ip * (0.2 + rng() * 0.2));
    const strikeoutsThrown = Math.round(ip * (0.7 + rng() * 0.6));
    const earnedRuns = Math.min(runsAllowed, Math.round(runsAllowed * (0.7 + rng() * 0.3)));
    const homeRunsAllowed = Math.floor(rng() * Math.max(1, runsAllowed));

    return {
      pitcherId: pitcher.playerId,
      pitcherName: pitcher.playerName,
      teamId,
      isStarter,
      entryInning,
      outsRecorded,
      hitsAllowed,
      runsAllowed,
      earnedRuns,
      walksAllowed,
      strikeoutsThrown,
      homeRunsAllowed,
      hitBatters: rng() < 0.15 ? 1 : 0,
      basesReachedViaError: 0,
      wildPitches: rng() < 0.10 ? 1 : 0,
      pitchCount: Math.round(ip * (14 + rng() * 4)),
      battersFaced,
      consecutiveHRsAllowed: 0,
      firstInningRuns: isStarter && entryInning === 1 ? Math.min(runsAllowed, Math.floor(rng() * 2)) : 0,
      basesLoadedWalks: rng() < 0.03 ? 1 : 0,
      inningsComplete: Math.floor(outsRecorded / 3),
      decision: null as 'W' | 'L' | 'ND' | null,
      save: false,
      hold: false,
      blownSave: false,
    };
  }

  // Away team pitching: starter + maybe reliever
  const awayStarterOuts = Math.min(innings * 3, 15 + Math.floor(rng() * 12)); // 5-9 IP
  const awayRelieverOuts = Math.max(0, innings * 3 - awayStarterOuts);
  const awayStarterRuns = Math.min(homeRuns, Math.round(homeRuns * (0.5 + rng() * 0.5)));
  const awayRelieverRuns = homeRuns - awayStarterRuns;

  pitcherGameStats.push(generatePitcherStats(
    awayRoster.starter, awayRoster.teamId, true, awayStarterOuts, awayStarterRuns, 1
  ));

  if (awayRelieverOuts > 0 && awayRoster.relievers.length > 0) {
    const relieverInning = Math.floor(awayStarterOuts / 3) + 1;
    pitcherGameStats.push(generatePitcherStats(
      awayRoster.relievers[0], awayRoster.teamId, false, awayRelieverOuts, awayRelieverRuns, relieverInning
    ));
  }

  // Home team pitching: starter + maybe reliever
  const homeStarterOuts = Math.min(innings * 3, 15 + Math.floor(rng() * 12));
  const homeRelieverOuts = Math.max(0, innings * 3 - homeStarterOuts);
  const homeStarterRuns = Math.min(awayRuns, Math.round(awayRuns * (0.5 + rng() * 0.5)));
  const homeRelieverRuns = awayRuns - homeStarterRuns;

  pitcherGameStats.push(generatePitcherStats(
    homeRoster.starter, homeRoster.teamId, true, homeStarterOuts, homeStarterRuns, 1
  ));

  if (homeRelieverOuts > 0 && homeRoster.relievers.length > 0) {
    const relieverInning = Math.floor(homeStarterOuts / 3) + 1;
    pitcherGameStats.push(generatePitcherStats(
      homeRoster.relievers[0], homeRoster.teamId, false, homeRelieverOuts, homeRelieverRuns, relieverInning
    ));
  }

  // Assign pitcher decisions (simplified from useGameState.ts:776)
  const winningTeam = homeRuns > awayRuns ? homeRoster.teamId : awayRoster.teamId;
  for (const ps of pitcherGameStats) {
    if (ps.teamId === winningTeam && ps.isStarter) {
      ps.decision = 'W';
    } else if (ps.teamId !== winningTeam && ps.isStarter) {
      ps.decision = 'L';
    } else {
      ps.decision = 'ND';
    }
  }

  return {
    id: 'current',
    gameId,
    savedAt: Date.now(),
    inning: innings,
    halfInning: 'BOTTOM' as const,
    outs: 3,
    homeScore: homeRuns,
    awayScore: awayRuns,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values(playerStats).reduce((sum, s) => sum + s.pa, 0),
    awayTeamId: awayRoster.teamId,
    homeTeamId: homeRoster.teamId,
    awayTeamName: awayRoster.teamName,
    homeTeamName: homeRoster.teamName,
    playerStats,
    pitcherGameStats,
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
  };
}

// ============================================
// PLAY-BY-PLAY GENERATION
// ============================================

export interface PlayByPlayEntry {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  text: string;
  awayScore: number;
  homeScore: number;
}

/**
 * Generate play-by-play entries from a completed game.
 *
 * Walks playerStats looking for notable events (HRs, XBH, Ks, RBIs)
 * and spreads them across innings 1-9. Tracks running score.
 * Produces ~20-25 entries for the simulation overlay.
 */
export function generatePlayByPlay(game: PersistedGameState): PlayByPlayEntry[] {
  const entries: PlayByPlayEntry[] = [];
  let awayScore = 0;
  let homeScore = 0;

  // Collect notable events from player stats
  interface PlayerEvent {
    playerName: string;
    teamId: string;
    type: 'HR' | 'DOUBLE' | 'TRIPLE' | 'K' | 'RBI_HIT' | 'WALK' | 'GROUNDOUT' | 'FLYOUT';
    runs: number;
  }

  const awayEvents: PlayerEvent[] = [];
  const homeEvents: PlayerEvent[] = [];

  for (const [_playerId, stats] of Object.entries(game.playerStats)) {
    const isAway = stats.teamId === game.awayTeamId;
    const events = isAway ? awayEvents : homeEvents;

    // Home runs
    for (let i = 0; i < stats.hr; i++) {
      events.push({
        playerName: stats.playerName,
        teamId: stats.teamId,
        type: 'HR',
        runs: 1 + Math.floor(Math.random() * 2), // 1-2 runs per HR
      });
    }

    // Doubles
    for (let i = 0; i < stats.doubles; i++) {
      events.push({
        playerName: stats.playerName,
        teamId: stats.teamId,
        type: 'DOUBLE',
        runs: Math.random() < 0.3 ? 1 : 0,
      });
    }

    // Triples
    for (let i = 0; i < stats.triples; i++) {
      events.push({
        playerName: stats.playerName,
        teamId: stats.teamId,
        type: 'TRIPLE',
        runs: 1,
      });
    }

    // Strikeouts (notable)
    if (stats.k >= 2) {
      events.push({
        playerName: stats.playerName,
        teamId: stats.teamId,
        type: 'K',
        runs: 0,
      });
    }

    // Walks
    if (stats.bb >= 1) {
      events.push({
        playerName: stats.playerName,
        teamId: stats.teamId,
        type: 'WALK',
        runs: 0,
      });
    }
  }

  // Distribute events across innings
  const totalInnings = game.inning || 9;

  // Add opening entry
  entries.push({
    inning: 1,
    halfInning: 'TOP',
    text: `Play ball! ${game.awayTeamName} at ${game.homeTeamName}`,
    awayScore: 0,
    homeScore: 0,
  });

  // Spread away events across top halves
  for (let i = 0; i < awayEvents.length; i++) {
    const ev = awayEvents[i];
    const inning = Math.min(totalInnings, 1 + Math.floor((i / awayEvents.length) * totalInnings));
    awayScore += ev.runs;

    let text = '';
    switch (ev.type) {
      case 'HR':
        text = ev.runs > 1
          ? `${ev.playerName} crushes a ${ev.runs}-run HOME RUN!`
          : `${ev.playerName} goes deep! Solo HOME RUN!`;
        break;
      case 'DOUBLE':
        text = ev.runs > 0
          ? `${ev.playerName} doubles to the gap, RBI!`
          : `${ev.playerName} lines a double to left-center.`;
        break;
      case 'TRIPLE':
        text = `${ev.playerName} triples to deep right, scoring a run!`;
        break;
      case 'K':
        text = `${ev.playerName} goes down on strikes.`;
        break;
      case 'WALK':
        text = `${ev.playerName} draws a walk.`;
        break;
      default:
        text = `${ev.playerName} grounds out.`;
    }

    entries.push({
      inning,
      halfInning: 'TOP',
      text,
      awayScore: Math.min(awayScore, game.awayScore),
      homeScore: Math.min(homeScore, game.homeScore),
    });
  }

  // Spread home events across bottom halves
  for (let i = 0; i < homeEvents.length; i++) {
    const ev = homeEvents[i];
    const inning = Math.min(totalInnings, 1 + Math.floor((i / homeEvents.length) * totalInnings));
    homeScore += ev.runs;

    let text = '';
    switch (ev.type) {
      case 'HR':
        text = ev.runs > 1
          ? `${ev.playerName} crushes a ${ev.runs}-run HOME RUN!`
          : `${ev.playerName} goes deep! Solo HOME RUN!`;
        break;
      case 'DOUBLE':
        text = ev.runs > 0
          ? `${ev.playerName} doubles to the gap, RBI!`
          : `${ev.playerName} lines a double to left-center.`;
        break;
      case 'TRIPLE':
        text = `${ev.playerName} triples to deep right, scoring a run!`;
        break;
      case 'K':
        text = `${ev.playerName} goes down on strikes.`;
        break;
      case 'WALK':
        text = `${ev.playerName} draws a walk.`;
        break;
      default:
        text = `${ev.playerName} grounds out.`;
    }

    entries.push({
      inning,
      halfInning: 'BOTTOM',
      text,
      awayScore: Math.min(awayScore, game.awayScore),
      homeScore: Math.min(homeScore, game.homeScore),
    });
  }

  // Sort by inning, then TOP before BOTTOM
  entries.sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning;
    if (a.halfInning !== b.halfInning) return a.halfInning === 'TOP' ? -1 : 1;
    return 0;
  });

  // Fix running scores to be monotonically increasing toward final
  let runningAway = 0;
  let runningHome = 0;
  for (const entry of entries) {
    runningAway = Math.min(game.awayScore, Math.max(runningAway, entry.awayScore));
    runningHome = Math.min(game.homeScore, Math.max(runningHome, entry.homeScore));
    entry.awayScore = runningAway;
    entry.homeScore = runningHome;
  }

  // Ensure final entry has correct score
  if (entries.length > 0) {
    entries[entries.length - 1].awayScore = game.awayScore;
    entries[entries.length - 1].homeScore = game.homeScore;
  }

  // Add pitcher stats summary
  const winPitcher = game.pitcherGameStats.find((p) => p.decision === 'W');
  const losePitcher = game.pitcherGameStats.find((p) => p.decision === 'L');

  if (winPitcher && losePitcher) {
    entries.push({
      inning: totalInnings,
      halfInning: 'BOTTOM',
      text: `W: ${winPitcher.pitcherName} | L: ${losePitcher.pitcherName}`,
      awayScore: game.awayScore,
      homeScore: game.homeScore,
    });
  }

  return entries;
}

// ============================================
// QUICK RESULT (for batch simulation)
// ============================================

/**
 * Quick game result — just a winner/loser and score.
 * No player stats, no PersistedGameState, no pipeline processing.
 * Used for batch simulation where speed matters.
 */
export interface QuickGameResult {
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  winningTeamId: string;
  losingTeamId: string;
}

/**
 * Generate a quick W/L outcome for batch simulation.
 * Uses seeded PRNG for deterministic results.
 * Produces realistic-ish scores (0-12 range, no ties).
 */
export function generateQuickResult(
  awayTeamId: string,
  homeTeamId: string,
  seed: number
): QuickGameResult {
  const rng = createRng(seed);

  // Generate scores: each team gets 0-8 runs, biased toward 2-5
  let awayScore = Math.floor(rng() * 4) + Math.floor(rng() * 5); // 0-8, median ~3-4
  let homeScore = Math.floor(rng() * 4) + Math.floor(rng() * 5);

  // Slight home-field advantage (~54%)
  if (rng() < 0.08 && homeScore <= awayScore) {
    homeScore += 1;
  }

  // No ties allowed
  if (awayScore === homeScore) {
    if (rng() < 0.5) {
      awayScore += 1;
    } else {
      homeScore += 1;
    }
  }

  const winningTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
  const losingTeamId = homeScore > awayScore ? awayTeamId : homeTeamId;

  return {
    awayTeamId,
    homeTeamId,
    awayScore,
    homeScore,
    winningTeamId,
    losingTeamId,
  };
}

// ============================================
// EXPORTED ROSTER FACTORY
// ============================================

export { generateRoster };
