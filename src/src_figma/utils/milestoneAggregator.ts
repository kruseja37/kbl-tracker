/**
 * Milestone Aggregator
 * Per MILESTONE_SYSTEM_SPEC.md - Wire milestone detection into aggregation flow
 *
 * This module connects the stat aggregation system with milestone detection,
 * triggering Fame events when milestones are crossed.
 */

import type { PersistedGameState } from './gameStorage';
import type { FameEvent } from '../app/types/game';
import type { PlayerSeasonBatting, PlayerSeasonPitching } from './seasonStorage';
import {
  getOrCreateBattingStats,
  getOrCreatePitchingStats,
} from './seasonStorage';
import {
  getOrCreateCareerBatting,
  getOrCreateCareerPitching,
  updateCareerBatting,
  updateCareerPitching,
  recordCareerMilestone,
  getPlayerMilestones,
  type PlayerCareerBatting,
  type PlayerCareerPitching,
  type CareerMilestone,
} from './careerStorage';
import {
  checkSeasonBattingMilestones,
  checkSeasonPitchingMilestones,
  checkCareerBattingMilestones,
  checkCareerPitchingMilestones,
  checkWARComponentMilestones,
  createMilestoneRecord,
  type MilestoneConfig,
  type MilestoneDetectionResult,
  SMB4_DEFAULT_GAMES,
  SMB4_DEFAULT_INNINGS,
} from './milestoneDetector';
// FameEventType used via MilestoneDetectionResult.eventType
import {
  recordFranchiseFirst,
  getMilestoneFirstKey,
  FRANCHISE_FIRST_FAME_VALUES,
  updateFranchiseLeader,
  isLeaderTrackingActive,
  type FranchiseFirst,
  type FranchiseLeaderEvent,
  type LeaderCategory,
  type FranchiseFirstKey,
} from './franchiseStorage';

// Default milestone configuration for SMB4
const DEFAULT_CONFIG: MilestoneConfig = {
  gamesPerSeason: SMB4_DEFAULT_GAMES,
  inningsPerGame: SMB4_DEFAULT_INNINGS,
};

// ============================================
// TYPES
// ============================================

export interface MilestoneAggregationResult {
  seasonMilestones: MilestoneDetectionResult[];
  careerMilestones: MilestoneDetectionResult[];
  fameEvents: FameEvent[];
  milestonesRecorded: CareerMilestone[];
  // Franchise tracking results
  franchiseFirsts: FranchiseFirst[];
  franchiseLeaderEvents: FranchiseLeaderEvent[];
}

// ============================================
// CAREER STAT AGGREGATION
// ============================================

/**
 * Aggregate game batting stats to career totals
 */
export async function aggregateGameToCareerBatting(
  gameState: PersistedGameState,
  playerId: string,
  playerName: string,
  teamId: string,
  gameStats: {
    pa: number;
    ab: number;
    h: number;
    singles: number;
    doubles: number;
    triples: number;
    hr: number;
    rbi: number;
    r: number;
    bb: number;
    k: number;
    sb: number;
    cs: number;
    hbp?: number;
    sf?: number;
    sac?: number;
    gidp?: number;
    grandSlams?: number;
  }
): Promise<{ previous: PlayerCareerBatting; current: PlayerCareerBatting }> {
  const previous = await getOrCreateCareerBatting(playerId, playerName, teamId);

  const current: PlayerCareerBatting = {
    ...previous,
    games: previous.games + 1,
    pa: previous.pa + gameStats.pa,
    ab: previous.ab + gameStats.ab,
    hits: previous.hits + gameStats.h,
    singles: previous.singles + gameStats.singles,
    doubles: previous.doubles + gameStats.doubles,
    triples: previous.triples + gameStats.triples,
    homeRuns: previous.homeRuns + gameStats.hr,
    rbi: previous.rbi + gameStats.rbi,
    runs: previous.runs + gameStats.r,
    walks: previous.walks + gameStats.bb,
    strikeouts: previous.strikeouts + gameStats.k,
    stolenBases: previous.stolenBases + gameStats.sb,
    caughtStealing: previous.caughtStealing + gameStats.cs,
    hitByPitch: previous.hitByPitch + (gameStats.hbp ?? 0),
    sacFlies: previous.sacFlies + (gameStats.sf ?? 0),
    sacBunts: previous.sacBunts + (gameStats.sac ?? 0),
    gidp: previous.gidp + (gameStats.gidp ?? 0),
    grandSlams: previous.grandSlams + (gameStats.grandSlams ?? 0),
    lastUpdated: Date.now(),
    lastGameId: gameState.gameId,
  };

  await updateCareerBatting(current);

  return { previous, current };
}

/**
 * Aggregate game pitching stats to career totals
 */
export async function aggregateGameToCareerPitching(
  gameState: PersistedGameState,
  pitcherStats: {
    pitcherId: string;
    pitcherName: string;
    teamId: string;
    isStarter: boolean;
    outsRecorded: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeoutsThrown: number;
    homeRunsAllowed: number;
    hitBatters: number;
    wildPitches: number;
    // Accept EITHER win/loss booleans OR decision string (pitcherGameStats uses decision)
    win?: boolean;
    loss?: boolean;
    decision?: 'W' | 'L' | 'ND' | null;
    save?: boolean;
    hold?: boolean;
    blownSave?: boolean;
  }
): Promise<{ previous: PlayerCareerPitching; current: PlayerCareerPitching }> {
  const previous = await getOrCreateCareerPitching(
    pitcherStats.pitcherId,
    pitcherStats.pitcherName,
    pitcherStats.teamId
  );

  // Check for achievements
  const isQualityStart = pitcherStats.isStarter &&
                         pitcherStats.outsRecorded >= 18 &&
                         pitcherStats.earnedRuns <= 3;
  const isCompleteGame = pitcherStats.isStarter &&
                         pitcherStats.outsRecorded >= 27;
  const isShutout = isCompleteGame && pitcherStats.runsAllowed === 0;
  const isNoHitter = isCompleteGame && pitcherStats.hitsAllowed === 0;
  const isPerfectGame = isNoHitter &&
                        pitcherStats.walksAllowed === 0 &&
                        pitcherStats.hitBatters === 0;

  const current: PlayerCareerPitching = {
    ...previous,
    games: previous.games + 1,
    gamesStarted: previous.gamesStarted + (pitcherStats.isStarter ? 1 : 0),
    outsRecorded: previous.outsRecorded + pitcherStats.outsRecorded,
    hitsAllowed: previous.hitsAllowed + pitcherStats.hitsAllowed,
    runsAllowed: previous.runsAllowed + pitcherStats.runsAllowed,
    earnedRuns: previous.earnedRuns + pitcherStats.earnedRuns,
    walksAllowed: previous.walksAllowed + pitcherStats.walksAllowed,
    strikeouts: previous.strikeouts + pitcherStats.strikeoutsThrown,
    homeRunsAllowed: previous.homeRunsAllowed + pitcherStats.homeRunsAllowed,
    hitBatters: previous.hitBatters + pitcherStats.hitBatters,
    wildPitches: previous.wildPitches + pitcherStats.wildPitches,
    wins: previous.wins + ((pitcherStats.win || pitcherStats.decision === 'W') ? 1 : 0),
    losses: previous.losses + ((pitcherStats.loss || pitcherStats.decision === 'L') ? 1 : 0),
    saves: previous.saves + (pitcherStats.save ? 1 : 0),
    holds: previous.holds + (pitcherStats.hold ? 1 : 0),
    blownSaves: previous.blownSaves + (pitcherStats.blownSave ? 1 : 0),
    qualityStarts: previous.qualityStarts + (isQualityStart ? 1 : 0),
    completeGames: previous.completeGames + (isCompleteGame ? 1 : 0),
    shutouts: previous.shutouts + (isShutout ? 1 : 0),
    noHitters: previous.noHitters + (isNoHitter ? 1 : 0),
    perfectGames: previous.perfectGames + (isPerfectGame ? 1 : 0),
    lastUpdated: Date.now(),
    lastGameId: gameState.gameId,
  };

  await updateCareerPitching(current);

  return { previous, current };
}

// ============================================
// MILESTONE DETECTION & FAME EVENTS
// ============================================

/**
 * Convert milestone detection result to Fame event
 */
function milestoneToFameEvent(
  milestone: MilestoneDetectionResult,
  playerId: string,
  playerName: string,
  teamId: string,
  gameId: string,
  inning: number = 0,
  halfInning: 'TOP' | 'BOTTOM' = 'TOP'
): FameEvent {
  return {
    id: `fame_${milestone.eventType}_${playerId}_${Date.now()}`,
    gameId,
    playerId,
    playerName,
    playerTeam: teamId,  // FameEvent uses 'playerTeam' not 'teamId'
    eventType: milestone.eventType,
    fameType: milestone.isNegative ? 'boner' : 'bonus',
    fameValue: milestone.fameValue,
    inning,
    halfInning,
    timestamp: Date.now(),
    autoDetected: true,  // Milestones are auto-detected
    description: milestone.description,
  };
}

/**
 * Get set of already achieved milestones for a player
 */
async function getAchievedMilestonesSet(playerId: string): Promise<Set<string>> {
  const milestones = await getPlayerMilestones(playerId);
  return new Set(milestones.map(m => m.milestoneType));
}

/**
 * Check for and process season milestones for a batter
 */
export async function checkAndProcessSeasonBattingMilestones(
  playerId: string,
  playerName: string,
  teamId: string,
  currentStats: PlayerSeasonBatting,
  previousStats: PlayerSeasonBatting | null,
  gameId: string,
  config: MilestoneConfig = DEFAULT_CONFIG
): Promise<{ milestones: MilestoneDetectionResult[]; fameEvents: FameEvent[] }> {
  const achievedSet = await getAchievedMilestonesSet(playerId);

  const milestones = checkSeasonBattingMilestones(
    currentStats,
    previousStats,
    achievedSet,
    config
  );

  const fameEvents = milestones.map(m =>
    milestoneToFameEvent(m, playerId, playerName, teamId, gameId)
  );

  return { milestones, fameEvents };
}

/**
 * Check for and process season milestones for a pitcher
 */
export async function checkAndProcessSeasonPitchingMilestones(
  playerId: string,
  playerName: string,
  teamId: string,
  currentStats: PlayerSeasonPitching,
  previousStats: PlayerSeasonPitching | null,
  gameId: string,
  config: MilestoneConfig = DEFAULT_CONFIG
): Promise<{ milestones: MilestoneDetectionResult[]; fameEvents: FameEvent[] }> {
  const achievedSet = await getAchievedMilestonesSet(playerId);

  const milestones = checkSeasonPitchingMilestones(
    currentStats,
    previousStats,
    achievedSet,
    config
  );

  const fameEvents = milestones.map(m =>
    milestoneToFameEvent(m, playerId, playerName, teamId, gameId)
  );

  return { milestones, fameEvents };
}

/**
 * Check for and process career milestones for a batter
 */
export async function checkAndProcessCareerBattingMilestones(
  playerId: string,
  playerName: string,
  teamId: string,
  currentStats: PlayerCareerBatting,
  previousStats: PlayerCareerBatting | null,
  gameId: string,
  seasonId: string,
  config: MilestoneConfig = DEFAULT_CONFIG
): Promise<{
  milestones: MilestoneDetectionResult[];
  fameEvents: FameEvent[];
  records: CareerMilestone[];
}> {
  const achievedSet = await getAchievedMilestonesSet(playerId);

  const milestones = checkCareerBattingMilestones(
    currentStats,
    previousStats,
    achievedSet,
    config
  );

  const fameEvents: FameEvent[] = [];
  const records: CareerMilestone[] = [];

  for (const milestone of milestones) {
    // Create Fame event
    fameEvents.push(
      milestoneToFameEvent(milestone, playerId, playerName, teamId, gameId)
    );

    // Create and record milestone record
    const record = createMilestoneRecord(
      milestone,
      playerId,
      playerName,
      gameId,
      seasonId
    );
    records.push(record);
    await recordCareerMilestone(record);
  }

  return { milestones, fameEvents, records };
}

/**
 * Check for and process career milestones for a pitcher
 */
export async function checkAndProcessCareerPitchingMilestones(
  playerId: string,
  playerName: string,
  teamId: string,
  currentStats: PlayerCareerPitching,
  previousStats: PlayerCareerPitching | null,
  gameId: string,
  seasonId: string,
  config: MilestoneConfig = DEFAULT_CONFIG
): Promise<{
  milestones: MilestoneDetectionResult[];
  fameEvents: FameEvent[];
  records: CareerMilestone[];
}> {
  const achievedSet = await getAchievedMilestonesSet(playerId);

  const milestones = checkCareerPitchingMilestones(
    currentStats,
    previousStats,
    achievedSet,
    config
  );

  const fameEvents: FameEvent[] = [];
  const records: CareerMilestone[] = [];

  for (const milestone of milestones) {
    // Create Fame event
    fameEvents.push(
      milestoneToFameEvent(milestone, playerId, playerName, teamId, gameId)
    );

    // Create and record milestone record
    const record = createMilestoneRecord(
      milestone,
      playerId,
      playerName,
      gameId,
      seasonId
    );
    records.push(record);
    await recordCareerMilestone(record);
  }

  return { milestones, fameEvents, records };
}

/**
 * Check for WAR component career milestones (bWAR, pWAR, fWAR, rWAR)
 * These track excellence in specific WAR components across a career
 */
async function checkAndProcessWARComponentMilestones(
  playerId: string,
  playerName: string,
  teamId: string,
  currentBatting: PlayerCareerBatting | null,
  previousBatting: PlayerCareerBatting | null,
  currentPitching: PlayerCareerPitching | null,
  previousPitching: PlayerCareerPitching | null,
  gameId: string,
  seasonId: string,
  config: MilestoneConfig
): Promise<{ milestones: MilestoneDetectionResult[]; fameEvents: FameEvent[]; records: CareerMilestone[] }> {
  const milestones: MilestoneDetectionResult[] = [];
  const fameEvents: FameEvent[] = [];
  const records: CareerMilestone[] = [];

  // Get previously achieved milestones for this player
  const achievedMilestones = await getPlayerMilestones(playerId);
  const achievedSet = new Set(achievedMilestones.map(m => `${m.milestoneType}_${m.thresholdValue}`));

  // Check WAR component milestones
  const warMilestones = checkWARComponentMilestones(
    currentBatting,
    currentPitching,
    previousBatting,
    previousPitching,
    achievedSet,
    config
  );

  for (const milestone of warMilestones) {
    if (milestone.achieved) {
      milestones.push(milestone);

      // Create Fame event
      const fameEvent = milestoneToFameEvent(
        milestone,
        playerId,
        playerName,
        teamId,
        gameId
      );
      fameEvents.push(fameEvent);

      // Record the milestone
      const record = createMilestoneRecord(
        milestone,
        playerId,
        playerName,
        gameId,
        seasonId
      );
      records.push(record);
      await recordCareerMilestone(record);
    }
  }

  return { milestones, fameEvents, records };
}

// ============================================
// FRANCHISE TRACKING HELPERS
// ============================================

/**
 * Check for and record franchise firsts for detected milestones
 */
async function checkFranchiseFirsts(
  franchiseId: string,
  milestones: MilestoneDetectionResult[],
  playerId: string,
  playerName: string,
  seasonId: string,
  gameId: string
): Promise<{ franchiseFirsts: FranchiseFirst[]; fameEvents: FameEvent[] }> {
  const franchiseFirsts: FranchiseFirst[] = [];
  const fameEvents: FameEvent[] = [];

  for (const milestone of milestones) {
    const firstKey = getMilestoneFirstKey(milestone.eventType);
    if (!firstKey) continue;

    // Try to record as franchise first
    const first = await recordFranchiseFirst(
      franchiseId,
      firstKey,
      playerId,
      playerName,
      seasonId,
      gameId,
      milestone.actualValue,
      `First ${milestone.description} in franchise history`
    );

    if (first) {
      franchiseFirsts.push(first);

      // Create Fame event for the franchise first
      const fameValue = FRANCHISE_FIRST_FAME_VALUES[firstKey as FranchiseFirstKey] ?? 0.5;
      const fameEvent: FameEvent = {
        id: `fame_franchise_first_${firstKey}_${playerId}_${Date.now()}`,
        gameId,
        playerId,
        playerName,
        playerTeam: first.franchiseId,
        eventType: `FRANCHISE_FIRST_${firstKey.toUpperCase()}` as any,
        fameType: 'bonus',
        fameValue,
        inning: 0,
        halfInning: 'TOP',
        timestamp: Date.now(),
        autoDetected: true,
        description: `First player to ${milestone.description} in franchise history! (+${fameValue} Fame)`,
      };
      fameEvents.push(fameEvent);
    }
  }

  return { franchiseFirsts, fameEvents };
}

/**
 * Update franchise leaders based on career stats
 */
async function updateBattingLeaders(
  franchiseId: string,
  playerId: string,
  playerName: string,
  careerStats: PlayerCareerBatting,
  seasonId: string,
  gameId: string
): Promise<{ leaderEvents: FranchiseLeaderEvent[]; fameEvents: FameEvent[] }> {
  const leaderEvents: FranchiseLeaderEvent[] = [];
  const fameEvents: FameEvent[] = [];

  // Map career stats to leader categories
  const categoryMap: Array<[LeaderCategory, number]> = [
    ['career_hr', careerStats.homeRuns],
    ['career_hits', careerStats.hits],
    ['career_rbi', careerStats.rbi],
    ['career_runs', careerStats.runs],
    ['career_sb', careerStats.stolenBases],
    ['career_doubles', careerStats.doubles],
    ['career_triples', careerStats.triples],
    ['career_walks', careerStats.walks],
    ['career_games', careerStats.games],
  ];

  for (const [category, value] of categoryMap) {
    const event = await updateFranchiseLeader(
      franchiseId,
      category,
      playerId,
      playerName,
      value,
      seasonId,
      gameId
    );

    if (event) {
      leaderEvents.push(event);

      // Create Fame event for leadership change
      const fameEvent: FameEvent = {
        id: `fame_leader_${category}_${playerId}_${Date.now()}`,
        gameId,
        playerId,
        playerName,
        playerTeam: franchiseId,
        eventType: `FRANCHISE_${event.type.toUpperCase()}_${category.toUpperCase()}` as any,
        fameType: 'bonus',
        fameValue: event.fameBonus,
        inning: 0,
        halfInning: 'TOP',
        timestamp: Date.now(),
        autoDetected: true,
        description: event.type === 'took_lead'
          ? `New franchise leader in ${category.replace('career_', '')}! (${value})`
          : `Extended franchise record in ${category.replace('career_', '')}! (${value})`,
      };
      fameEvents.push(fameEvent);
    }
  }

  return { leaderEvents, fameEvents };
}

/**
 * Update franchise leaders based on pitching career stats
 */
async function updatePitchingLeaders(
  franchiseId: string,
  playerId: string,
  playerName: string,
  careerStats: PlayerCareerPitching,
  seasonId: string,
  gameId: string
): Promise<{ leaderEvents: FranchiseLeaderEvent[]; fameEvents: FameEvent[] }> {
  const leaderEvents: FranchiseLeaderEvent[] = [];
  const fameEvents: FameEvent[] = [];

  // Calculate IP from outs
  const inningsPitched = careerStats.outsRecorded / 3;

  // Map career stats to leader categories
  const categoryMap: Array<[LeaderCategory, number]> = [
    ['career_wins', careerStats.wins],
    ['career_saves', careerStats.saves],
    ['career_strikeouts', careerStats.strikeouts],
    ['career_ip', inningsPitched],
    ['career_shutouts', careerStats.shutouts],
    ['career_complete_games', careerStats.completeGames],
  ];

  // Add rate stats only if qualified (min IP)
  const minIP = 50;  // Minimum innings to qualify for rate stats
  if (inningsPitched >= minIP) {
    const era = (careerStats.earnedRuns / inningsPitched) * 9;
    const whip = (careerStats.walksAllowed + careerStats.hitsAllowed) / inningsPitched;
    categoryMap.push(['career_era', era], ['career_whip', whip]);
  }

  for (const [category, value] of categoryMap) {
    const event = await updateFranchiseLeader(
      franchiseId,
      category,
      playerId,
      playerName,
      value,
      seasonId,
      gameId
    );

    if (event) {
      leaderEvents.push(event);

      // Create Fame event for leadership change
      const fameEvent: FameEvent = {
        id: `fame_leader_${category}_${playerId}_${Date.now()}`,
        gameId,
        playerId,
        playerName,
        playerTeam: franchiseId,
        eventType: `FRANCHISE_${event.type.toUpperCase()}_${category.toUpperCase()}` as any,
        fameType: 'bonus',
        fameValue: event.fameBonus,
        inning: 0,
        halfInning: 'TOP',
        timestamp: Date.now(),
        autoDetected: true,
        description: event.type === 'took_lead'
          ? `New franchise leader in ${category.replace('career_', '')}! (${value.toFixed(category.includes('era') || category.includes('whip') ? 2 : 0)})`
          : `Extended franchise record in ${category.replace('career_', '')}!`,
      };
      fameEvents.push(fameEvent);
    }
  }

  return { leaderEvents, fameEvents };
}

// ============================================
// FULL GAME AGGREGATION WITH MILESTONES
// ============================================

/**
 * Aggregate a completed game's stats and detect all milestones
 * This is the main entry point for game-end processing
 */
/**
 * Options for game aggregation with milestone detection
 */
export interface AggregationOptions {
  config?: MilestoneConfig;
  franchiseId?: string;           // Required for franchise tracking
  currentGame?: number;           // Game number in season (for leader tracking activation)
  currentSeason?: number;         // Season number (1 = first season)
}

export async function aggregateGameWithMilestones(
  gameState: PersistedGameState,
  seasonId: string,
  config: MilestoneConfig = DEFAULT_CONFIG,
  options?: Omit<AggregationOptions, 'config'>
): Promise<MilestoneAggregationResult> {
  const result: MilestoneAggregationResult = {
    seasonMilestones: [],
    careerMilestones: [],
    fameEvents: [],
    milestonesRecorded: [],
    franchiseFirsts: [],
    franchiseLeaderEvents: [],
  };

  // Determine if franchise tracking is enabled
  const franchiseId = options?.franchiseId;
  const shouldTrackFranchise = !!franchiseId;
  const leaderTrackingActive = shouldTrackFranchise && options?.currentGame && options?.currentSeason
    ? isLeaderTrackingActive(options.currentGame, config.gamesPerSeason, options.currentSeason)
    : false;

  // Process each batter
  for (const [playerId, gameStats] of Object.entries(gameState.playerStats)) {
    const playerName = playerId; // TODO: Get from roster
    const teamId = gameState.awayTeamId; // TODO: Determine from roster

    // Get previous season stats for comparison
    const previousSeasonStats = await getOrCreateBattingStats(
      seasonId,
      playerId,
      playerName,
      teamId
    );

    // Aggregate to career and get before/after
    const careerResult = await aggregateGameToCareerBatting(
      gameState,
      playerId,
      playerName,
      teamId,
      gameStats
    );

    // Check season milestones
    // Note: Season stats should be updated by seasonAggregator first
    const currentSeasonStats = await getOrCreateBattingStats(
      seasonId,
      playerId,
      playerName,
      teamId
    );

    const seasonMilestoneResult = await checkAndProcessSeasonBattingMilestones(
      playerId,
      playerName,
      teamId,
      currentSeasonStats,
      previousSeasonStats,
      gameState.gameId,
      config
    );

    result.seasonMilestones.push(...seasonMilestoneResult.milestones);
    result.fameEvents.push(...seasonMilestoneResult.fameEvents);

    // Check career milestones
    const careerMilestoneResult = await checkAndProcessCareerBattingMilestones(
      playerId,
      playerName,
      teamId,
      careerResult.current,
      careerResult.previous,
      gameState.gameId,
      seasonId,
      config
    );

    result.careerMilestones.push(...careerMilestoneResult.milestones);
    result.fameEvents.push(...careerMilestoneResult.fameEvents);
    result.milestonesRecorded.push(...careerMilestoneResult.records);

    // Check WAR component milestones (bWAR, fWAR, rWAR for position players)
    const warMilestoneResult = await checkAndProcessWARComponentMilestones(
      playerId,
      playerName,
      teamId,
      careerResult.current,
      careerResult.previous,
      null,  // No pitching stats for position player
      null,
      gameState.gameId,
      seasonId,
      config
    );
    result.careerMilestones.push(...warMilestoneResult.milestones);
    result.fameEvents.push(...warMilestoneResult.fameEvents);
    result.milestonesRecorded.push(...warMilestoneResult.records);

    // Check for franchise firsts (if franchise tracking enabled)
    if (shouldTrackFranchise && franchiseId) {
      const allMilestones = [
        ...seasonMilestoneResult.milestones,
        ...careerMilestoneResult.milestones,
        ...warMilestoneResult.milestones
      ];
      const franchiseFirstResult = await checkFranchiseFirsts(
        franchiseId,
        allMilestones,
        playerId,
        playerName,
        seasonId,
        gameState.gameId
      );
      result.franchiseFirsts.push(...franchiseFirstResult.franchiseFirsts);
      result.fameEvents.push(...franchiseFirstResult.fameEvents);

      // Update franchise leaders (if past midpoint)
      if (leaderTrackingActive) {
        const leaderResult = await updateBattingLeaders(
          franchiseId,
          playerId,
          playerName,
          careerResult.current,
          seasonId,
          gameState.gameId
        );
        result.franchiseLeaderEvents.push(...leaderResult.leaderEvents);
        result.fameEvents.push(...leaderResult.fameEvents);
      }
    }
  }

  // Process each pitcher
  for (const pitcherStats of gameState.pitcherGameStats) {
    // Get previous season stats for comparison
    const previousSeasonStats = await getOrCreatePitchingStats(
      seasonId,
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId
    );

    // Aggregate to career and get before/after
    const careerResult = await aggregateGameToCareerPitching(gameState, pitcherStats);

    // Check season milestones
    const currentSeasonStats = await getOrCreatePitchingStats(
      seasonId,
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId
    );

    const seasonMilestoneResult = await checkAndProcessSeasonPitchingMilestones(
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId,
      currentSeasonStats,
      previousSeasonStats,
      gameState.gameId,
      config
    );

    result.seasonMilestones.push(...seasonMilestoneResult.milestones);
    result.fameEvents.push(...seasonMilestoneResult.fameEvents);

    // Check career milestones
    const careerMilestoneResult = await checkAndProcessCareerPitchingMilestones(
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId,
      careerResult.current,
      careerResult.previous,
      gameState.gameId,
      seasonId,
      config
    );

    result.careerMilestones.push(...careerMilestoneResult.milestones);
    result.fameEvents.push(...careerMilestoneResult.fameEvents);
    result.milestonesRecorded.push(...careerMilestoneResult.records);

    // Check WAR component milestones (pWAR for pitchers)
    // Note: Pitchers in SMB4 can also bat, so they might have bWAR/fWAR/rWAR too
    const warMilestoneResult = await checkAndProcessWARComponentMilestones(
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId,
      null,  // Pitchers don't have batting career stats in this context
      null,
      careerResult.current,
      careerResult.previous,
      gameState.gameId,
      seasonId,
      config
    );
    result.careerMilestones.push(...warMilestoneResult.milestones);
    result.fameEvents.push(...warMilestoneResult.fameEvents);
    result.milestonesRecorded.push(...warMilestoneResult.records);

    // Check for franchise firsts (if franchise tracking enabled)
    if (shouldTrackFranchise && franchiseId) {
      const allMilestones = [
        ...seasonMilestoneResult.milestones,
        ...careerMilestoneResult.milestones,
        ...warMilestoneResult.milestones
      ];
      const franchiseFirstResult = await checkFranchiseFirsts(
        franchiseId,
        allMilestones,
        pitcherStats.pitcherId,
        pitcherStats.pitcherName,
        seasonId,
        gameState.gameId
      );
      result.franchiseFirsts.push(...franchiseFirstResult.franchiseFirsts);
      result.fameEvents.push(...franchiseFirstResult.fameEvents);

      // Update franchise leaders (if past midpoint)
      if (leaderTrackingActive) {
        const leaderResult = await updatePitchingLeaders(
          franchiseId,
          pitcherStats.pitcherId,
          pitcherStats.pitcherName,
          careerResult.current,
          seasonId,
          gameState.gameId
        );
        result.franchiseLeaderEvents.push(...leaderResult.leaderEvents);
        result.fameEvents.push(...leaderResult.fameEvents);
      }
    }
  }

  return result;
}
