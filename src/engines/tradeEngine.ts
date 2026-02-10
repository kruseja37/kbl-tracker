/**
 * In-Season Trade Engine (GAP-B10-003)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §25
 *
 * Trade execution, stat splits, trade deadline, salary matching, trade history.
 */

// ============================================
// TYPES
// ============================================

export interface TradeRecord {
  tradeId: string;
  season: number;
  gameNumber: number;
  date?: string;
  fromTeamId: string;
  toTeamId: string;
  playersTraded: string[];   // player IDs moving from → to
  playersReceived: string[]; // player IDs moving to → from
  notes?: string;
}

export interface PlayerTeamStint {
  teamId: string;
  teamName: string;
  gameRange: { start: number; end: number | null };
  stats: TeamStintStats;
}

export interface TeamStintStats {
  games: number;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  war: number;
  // Pitcher stats
  outsRecorded?: number;
  earnedRuns?: number;
  strikeouts?: number;
}

export interface PlayerSeasonSplits {
  playerId: string;
  season: number;
  byTeam: PlayerTeamStint[];
  trades: TradeRecord[];
}

export interface RevengeGameRecord {
  playerId: string;
  playerName: string;
  formerTeamId: string;
  formerTeamName: string;
  departedSeason: number;
  departureType: 'TRADE' | 'FREE_AGENCY' | 'RELEASED';
  firstMeetingPlayed: boolean;
  duration: 3;
  performances: RevengeGamePerformance[];
}

export interface RevengeGamePerformance {
  gameId: string;
  gameNumber: number;
  season: number;
  stats: { ab?: number; hits?: number; hr?: number; rbi?: number; war?: number };
  headline?: string;
}

// ============================================
// TRADE WINDOW
// ============================================

/** Trade deadline triggers at 65% through the season */
export function getTradeDeadlineGame(totalGames: number): number {
  return Math.floor(totalGames * 0.65);
}

/** Check if trade window is open */
export function isTradeWindowOpen(currentGame: number, totalGames: number): boolean {
  return currentGame <= getTradeDeadlineGame(totalGames);
}

/** Check if trade deadline is approaching (within 5 games) */
export function isTradeDeadlineApproaching(currentGame: number, totalGames: number): boolean {
  const deadline = getTradeDeadlineGame(totalGames);
  return currentGame >= deadline - 5 && currentGame <= deadline;
}

// ============================================
// TRADE EXECUTION
// ============================================

/**
 * Execute a trade — creates the trade record.
 * Caller is responsible for updating roster/storage.
 */
export function executeTrade(
  season: number,
  gameNumber: number,
  fromTeamId: string,
  toTeamId: string,
  playersTraded: string[],
  playersReceived: string[],
  notes?: string,
): TradeRecord {
  return {
    tradeId: `trade-${season}-${gameNumber}-${Date.now()}`,
    season,
    gameNumber,
    fromTeamId,
    toTeamId,
    playersTraded,
    playersReceived,
    notes,
  };
}

// ============================================
// STAT SPLITS
// ============================================

/** Create initial season splits for a player */
export function createSeasonSplits(
  playerId: string,
  season: number,
  teamId: string,
  teamName: string,
  startGame: number,
): PlayerSeasonSplits {
  return {
    playerId,
    season,
    byTeam: [{
      teamId,
      teamName,
      gameRange: { start: startGame, end: null },
      stats: { games: 0, ab: 0, hits: 0, hr: 0, rbi: 0, war: 0 },
    }],
    trades: [],
  };
}

/** Record a trade in a player's season splits */
export function recordTradeInSplits(
  splits: PlayerSeasonSplits,
  trade: TradeRecord,
  newTeamId: string,
  newTeamName: string,
): void {
  // Close current stint
  const currentStint = splits.byTeam[splits.byTeam.length - 1];
  if (currentStint) {
    currentStint.gameRange.end = trade.gameNumber;
  }

  // Open new stint
  splits.byTeam.push({
    teamId: newTeamId,
    teamName: newTeamName,
    gameRange: { start: trade.gameNumber + 1, end: null },
    stats: { games: 0, ab: 0, hits: 0, hr: 0, rbi: 0, war: 0 },
  });

  splits.trades.push(trade);
}

/** Get full-season combined stats */
export function getFullSeasonStats(splits: PlayerSeasonSplits): TeamStintStats {
  return splits.byTeam.reduce(
    (acc, stint) => ({
      games: acc.games + stint.stats.games,
      ab: acc.ab + stint.stats.ab,
      hits: acc.hits + stint.stats.hits,
      hr: acc.hr + stint.stats.hr,
      rbi: acc.rbi + stint.stats.rbi,
      war: acc.war + stint.stats.war,
    }),
    { games: 0, ab: 0, hits: 0, hr: 0, rbi: 0, war: 0 },
  );
}

/** Get stats for a specific team stint */
export function getTeamStintStats(splits: PlayerSeasonSplits, teamId: string): TeamStintStats | null {
  const stint = splits.byTeam.find(s => s.teamId === teamId);
  return stint?.stats ?? null;
}

// ============================================
// TRADE AWARD RULES
// ============================================

export type AwardStatSource = 'FULL_SEASON' | 'TEAM_SPLIT_ONLY' | 'AT_VOTING_TIME';

export const TRADE_AWARD_RULES: Record<string, AwardStatSource> = {
  MVP: 'FULL_SEASON',
  CY_YOUNG: 'FULL_SEASON',
  ALL_STAR: 'AT_VOTING_TIME',
  ROOKIE_OF_YEAR: 'FULL_SEASON',
  RELIEVER_OF_YEAR: 'FULL_SEASON',
  TEAM_MVP: 'TEAM_SPLIT_ONLY',
  GOLD_GLOVE: 'FULL_SEASON',
  SILVER_SLUGGER: 'FULL_SEASON',
};

// ============================================
// TRADE HAPPINESS EFFECTS
// ============================================

export interface TradeHappinessResult {
  teamId: string;
  effect: number;
  reason: string;
}

export function calculateTradeHappiness(
  trade: TradeRecord,
  playerWARs: Map<string, number>,
  playerFame: Map<string, number>,
  playerSeasons: Map<string, number>,
): TradeHappinessResult[] {
  const results: TradeHappinessResult[] = [];

  // Team that acquired players
  for (const playerId of trade.playersTraded) {
    const war = playerWARs.get(playerId) ?? 0;
    if (war >= 3.0) {
      results.push({ teamId: trade.toTeamId, effect: 8, reason: `Acquired star (${war.toFixed(1)} WAR)` });
    } else if (war >= 1.5) {
      results.push({ teamId: trade.toTeamId, effect: 3, reason: `Acquired solid player (${war.toFixed(1)} WAR)` });
    }
  }

  // Team that lost players
  for (const playerId of trade.playersTraded) {
    const war = playerWARs.get(playerId) ?? 0;
    const fame = playerFame.get(playerId) ?? 0;
    const seasons = playerSeasons.get(playerId) ?? 0;

    if (seasons >= 3 && fame >= 2) {
      results.push({ teamId: trade.fromTeamId, effect: -10, reason: 'Lost fan favorite' });
    } else if (war >= 3.0) {
      results.push({ teamId: trade.fromTeamId, effect: -5, reason: `Lost star (${war.toFixed(1)} WAR)` });
    }
  }

  return results;
}

// ============================================
// REVENGE GAMES (GAP-B10-004)
// ============================================

/** Create a revenge game record when a player departs */
export function createRevengeRecord(
  playerId: string,
  playerName: string,
  formerTeamId: string,
  formerTeamName: string,
  departedSeason: number,
  departureType: 'TRADE' | 'FREE_AGENCY' | 'RELEASED',
): RevengeGameRecord {
  return {
    playerId,
    playerName,
    formerTeamId,
    formerTeamName,
    departedSeason,
    departureType,
    firstMeetingPlayed: false,
    duration: 3,
    performances: [],
  };
}

/** Check if a revenge game is still active (within 3 seasons of departure) */
export function isRevengeActive(record: RevengeGameRecord, currentSeason: number): boolean {
  return currentSeason - record.departedSeason <= record.duration;
}

/** Check if this game is a revenge game */
export function isRevengeGame(
  playerTeamId: string,
  opponentTeamId: string,
  revengeRecords: RevengeGameRecord[],
): RevengeGameRecord | null {
  return revengeRecords.find(r => r.formerTeamId === opponentTeamId) ?? null;
}

/** Record revenge game performance */
export function recordRevengePerformance(
  record: RevengeGameRecord,
  gameId: string,
  gameNumber: number,
  season: number,
  stats: RevengeGamePerformance['stats'],
): string | null {
  const isFirst = !record.firstMeetingPlayed;
  record.firstMeetingPlayed = true;

  let headline: string | undefined;

  // Generate headline based on performance
  if (isFirst) {
    if ((stats.hr ?? 0) >= 1 || (stats.rbi ?? 0) >= 3) {
      headline = `${record.playerName} haunts former team with ${stats.hr ?? 0} HR, ${stats.rbi ?? 0} RBI!`;
    } else if ((stats.hits ?? 0) === 0) {
      headline = `${record.playerName} goes quiet in return to face ${record.formerTeamName}`;
    } else {
      headline = `${record.playerName} returns to face ${record.formerTeamName} for the first time`;
    }
  }

  record.performances.push({ gameId, gameNumber, season, stats, headline });

  return headline ?? null;
}

// ============================================
// TRADE HEADLINE TEMPLATES
// ============================================

export const TRADE_HEADLINES = {
  BLOCKBUSTER: '{team} lands {player} in blockbuster deal!',
  SALARY_DUMP: '{team} clears cap space, ships {player} to {newTeam}',
  PROSPECT_HAUL: '{team} trades {player}, receives promising package',
  REVENGE_FIRST: '{player} returns to face former team for first time',
  REVENGE_SUCCESS: '{player} haunts former team with {performance}!',
  REVENGE_FLOP: '{player} goes quiet in return to {formerTeam}',
  DEADLINE_APPROACHING: '⏰ TRADE DEADLINE APPROACHING',
} as const;

// ============================================
// THREE-WAY TRADE TYPES (S-TRD016/017)
// ============================================

/** A single player movement in a multi-team trade */
export interface PlayerMovement {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
}

/** Validation result for a three-way trade */
export interface ThreeWayValidationResult {
  valid: boolean;
  errors: string[];
}

/** Decision for a single team in a three-way trade */
export type ThreeWayTeamDecision = 'ACCEPT' | 'REJECT' | 'COUNTER';

/** Per-team evaluation detail */
export interface ThreeWayTeamEvaluation {
  teamId: string;
  decision: ThreeWayTeamDecision;
  warSent: number;
  warReceived: number;
  warDifferential: number;
  reason: string;
}

/** Info about a team participating in a three-way trade, used for evaluation */
export interface ThreeWayTeamInfo {
  teamId: string;
  /** Map of playerId to their WAR value */
  playerWARs: Map<string, number>;
}

// ============================================
// THREE-WAY TRADE VALIDATION (S-TRD016)
// ============================================

/**
 * Validate a three-way trade's player movements.
 *
 * Rules:
 * - Exactly 3 distinct teams must be involved
 * - Each team must send at least one player
 * - Each team must receive at least one player
 * - No team sends a player to itself
 * - No player appears in multiple movements
 */
export function validateThreeWayTrade(movements: PlayerMovement[]): ThreeWayValidationResult {
  const errors: string[] = [];

  if (movements.length === 0) {
    errors.push('No player movements provided');
    return { valid: false, errors };
  }

  // Collect all distinct team IDs
  const allTeamIds = new Set<string>();
  for (const m of movements) {
    allTeamIds.add(m.fromTeamId);
    allTeamIds.add(m.toTeamId);
  }

  if (allTeamIds.size !== 3) {
    errors.push(`Three-way trade must involve exactly 3 teams, found ${allTeamIds.size}`);
  }

  // Check: no team sends a player to itself
  for (const m of movements) {
    if (m.fromTeamId === m.toTeamId) {
      errors.push(`Player ${m.playerId} cannot be traded from a team to itself (${m.fromTeamId})`);
    }
  }

  // Check: no player appears in multiple movements
  const seenPlayers = new Set<string>();
  for (const m of movements) {
    if (seenPlayers.has(m.playerId)) {
      errors.push(`Player ${m.playerId} appears in multiple movements`);
    }
    seenPlayers.add(m.playerId);
  }

  // Check: each team sends AND receives at least one player
  const teamSends = new Map<string, number>();
  const teamReceives = new Map<string, number>();
  for (const m of movements) {
    teamSends.set(m.fromTeamId, (teamSends.get(m.fromTeamId) ?? 0) + 1);
    teamReceives.set(m.toTeamId, (teamReceives.get(m.toTeamId) ?? 0) + 1);
  }

  for (const teamId of allTeamIds) {
    if ((teamSends.get(teamId) ?? 0) === 0) {
      errors.push(`Team ${teamId} does not send any players`);
    }
    if ((teamReceives.get(teamId) ?? 0) === 0) {
      errors.push(`Team ${teamId} does not receive any players`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// THREE-WAY TRADE EVALUATION (S-TRD017)
// ============================================

/**
 * Evaluate a three-way trade from each team's perspective independently.
 *
 * Each team evaluates the WAR differential of players they receive vs.
 * players they send. Trade succeeds only if ALL three teams accept.
 *
 * Decision thresholds (WAR differential):
 *   >= -0.5  -> ACCEPT  (gaining value or losing very little)
 *   >= -1.5  -> COUNTER (marginal, might negotiate)
 *   < -1.5   -> REJECT  (losing too much value)
 */
export function evaluateThreeWayTrade(
  movements: PlayerMovement[],
  teams: ThreeWayTeamInfo[],
): { decisions: Map<string, ThreeWayTeamDecision>; evaluations: ThreeWayTeamEvaluation[] } {
  const teamInfoMap = new Map<string, ThreeWayTeamInfo>();
  for (const t of teams) {
    teamInfoMap.set(t.teamId, t);
  }

  const evaluations: ThreeWayTeamEvaluation[] = [];

  // Collect all team IDs from movements
  const allTeamIds = new Set<string>();
  for (const m of movements) {
    allTeamIds.add(m.fromTeamId);
    allTeamIds.add(m.toTeamId);
  }

  for (const teamId of allTeamIds) {
    const teamInfo = teamInfoMap.get(teamId);

    // WAR of players this team is sending away
    const sending = movements.filter(m => m.fromTeamId === teamId);
    const warSent = sending.reduce((sum, m) => {
      // Look up WAR from the team's own data
      const war = teamInfo?.playerWARs.get(m.playerId) ?? 0;
      return sum + war;
    }, 0);

    // WAR of players this team is receiving
    const receiving = movements.filter(m => m.toTeamId === teamId);
    const warReceived = receiving.reduce((sum, m) => {
      // Look up WAR from the sending team's data
      const senderInfo = teamInfoMap.get(m.fromTeamId);
      const war = senderInfo?.playerWARs.get(m.playerId) ?? 0;
      return sum + war;
    }, 0);

    const warDifferential = warReceived - warSent;

    let decision: ThreeWayTeamDecision;
    let reason: string;

    if (warDifferential >= -0.5) {
      decision = 'ACCEPT';
      reason = warDifferential > 0
        ? `Gaining ${warDifferential.toFixed(1)} WAR in the deal`
        : 'Fair trade, minimal WAR loss';
    } else if (warDifferential >= -1.5) {
      decision = 'COUNTER';
      reason = `Losing ${Math.abs(warDifferential).toFixed(1)} WAR, wants sweetener`;
    } else {
      decision = 'REJECT';
      reason = `Losing ${Math.abs(warDifferential).toFixed(1)} WAR, deal is too lopsided`;
    }

    evaluations.push({
      teamId,
      decision,
      warSent: Math.round(warSent * 10) / 10,
      warReceived: Math.round(warReceived * 10) / 10,
      warDifferential: Math.round(warDifferential * 10) / 10,
      reason,
    });
  }

  const decisions = new Map<string, ThreeWayTeamDecision>();
  for (const ev of evaluations) {
    decisions.set(ev.teamId, ev.decision);
  }

  return { decisions, evaluations };
}

// ============================================
// AI TRADE EVALUATION & PROPOSAL GENERATION
// (GAP-B13-007 / S-TRD014-015)
// ============================================

/**
 * Lightweight player shape used by the AI trade engine.
 * Mirrors the local Player interface in TradeFlow.tsx so both layers share
 * the same data without importing React component types.
 */
export interface TradePlayer {
  id: string;
  name: string;
  position: string;
  overall: number;
  salary: number;
  age: number;
  war?: number;
  isFarm?: boolean;
  isDraftee?: boolean;
}

/** Lightweight team shape used by the AI trade engine. */
export interface TradeTeam {
  id: string;
  name: string;
  players: TradePlayer[];
  payroll: number;
  isUserTeam?: boolean;
}

/** Result of AI evaluating a trade proposed by the user. */
export interface AITradeEvaluation {
  decision: 'ACCEPT' | 'COUNTER' | 'REJECT';
  warDifferential: number;
  reasoning: string;
  /** When decision is COUNTER, which player the AI wants added/removed. */
  counterSuggestion?: {
    action: 'ADD_TO_USER_SIDE' | 'ADD_TO_AI_SIDE';
    player: TradePlayer;
  };
}

/** A single AI-generated trade proposal targeting the user's team. */
export interface AITradeProposal {
  id: string;
  fromTeam: TradeTeam;
  offering: TradePlayer[];
  wanting: TradePlayer[];
  salaryImpact: number;
  beatReporterNote: string;
  isNew: boolean;
  reasoning: string;
}

// ---- Position need helpers ----

/** Key positions ordered by defensive importance. */
const KEY_POSITIONS = ['C', 'SS', 'CF', 'SP', '2B', '3B', 'RF', 'LF', '1B', 'RP', 'DH'] as const;

/**
 * Return positions where the team is weakest (lowest overall starter or
 * completely missing a key position).
 */
function getTeamPositionNeeds(team: TradeTeam): string[] {
  const positionBest = new Map<string, number>();
  for (const p of team.players) {
    const cur = positionBest.get(p.position) ?? 0;
    if (p.overall > cur) positionBest.set(p.position, p.overall);
  }

  const needs: string[] = [];
  for (const pos of KEY_POSITIONS) {
    const best = positionBest.get(pos);
    // Missing entirely or very weak (<75 OVR)
    if (best === undefined || best < 75) {
      needs.push(pos);
    }
  }
  return needs;
}

/**
 * Estimate WAR for a player. Uses actual WAR when available, otherwise
 * falls back to an OVR-based approximation (common during offseason
 * before season stats are generated).
 */
function estimatePlayerWAR(player: TradePlayer): number {
  if (player.war !== undefined && player.war !== 0) return player.war;
  // Rough OVR-to-WAR: 90 OVR ~ 3.3, 80 ~ 1.8, 70 ~ 0.3
  return Math.max(0, (player.overall - 68) * 0.15);
}

function totalPlayerWAR(players: TradePlayer[]): number {
  return players.reduce((sum, p) => sum + estimatePlayerWAR(p), 0);
}

// ---- Core AI evaluation ----

/**
 * Evaluate a user-proposed trade from the AI team's perspective.
 *
 * Decision thresholds (WAR differential = what AI gives up minus what AI gets):
 *   diff < 0.5  -> ACCEPT  (AI is getting fair or better value)
 *   0.5 - 2.0   -> COUNTER (close, but AI wants a sweetener)
 *   > 2.0       -> REJECT  (too lopsided against AI)
 *
 * Position need and salary considerations can shift the effective differential.
 */
export function evaluateTradeForAI(
  aiTeam: TradeTeam,
  aiGivingUp: TradePlayer[],
  aiReceiving: TradePlayer[],
  userTeam: TradeTeam,
): AITradeEvaluation {
  const warGiving = totalPlayerWAR(aiGivingUp);
  const warReceiving = totalPlayerWAR(aiReceiving);
  let warDiff = warGiving - warReceiving; // positive = AI loses value

  // ---- Position-need adjustment ----
  const aiNeeds = getTeamPositionNeeds(aiTeam);
  for (const p of aiReceiving) {
    if (aiNeeds.includes(p.position)) {
      warDiff -= 0.5; // each position-need match is worth ~0.5 WAR
    }
  }

  // ---- Salary adjustment ----
  const salaryIn = aiReceiving.reduce((s, p) => s + p.salary, 0);
  const salaryOut = aiGivingUp.reduce((s, p) => s + p.salary, 0);
  const salaryDelta = salaryIn - salaryOut;
  if (salaryDelta < 0) {
    warDiff -= 0.3; // shedding salary makes AI more willing
  }

  // ---- Age adjustment ----
  const avgAgeReceiving = aiReceiving.length > 0
    ? aiReceiving.reduce((s, p) => s + p.age, 0) / aiReceiving.length
    : 30;
  const avgAgeGiving = aiGivingUp.length > 0
    ? aiGivingUp.reduce((s, p) => s + p.age, 0) / aiGivingUp.length
    : 30;
  if (avgAgeReceiving < avgAgeGiving - 2) {
    warDiff -= 0.3; // getting younger players is attractive
  }

  // ---- Decision ----
  if (warDiff < 0.5) {
    return {
      decision: 'ACCEPT',
      warDifferential: warDiff,
      reasoning: warDiff < 0
        ? `${aiTeam.name} see this as a clear upgrade and jump at the deal.`
        : `${aiTeam.name} view this as a fair swap and agree to the terms.`,
    };
  }

  if (warDiff <= 2.0) {
    const counterSuggestion = findCounterSuggestion(userTeam, aiReceiving, aiNeeds, warDiff);
    return {
      decision: 'COUNTER',
      warDifferential: warDiff,
      reasoning: counterSuggestion
        ? `${aiTeam.name} like the core of the deal but want ${counterSuggestion.player.name} included to balance it out.`
        : `${aiTeam.name} feel the value isn't quite right and would need a sweetener to make this work.`,
      counterSuggestion,
    };
  }

  return {
    decision: 'REJECT',
    warDifferential: warDiff,
    reasoning: `${aiTeam.name} don't see enough coming back their way. The ${warDiff.toFixed(1)} WAR gap is too large.`,
  };
}

/** Find a player the AI would ask the user to add to balance a counter-offer. */
function findCounterSuggestion(
  userTeam: TradeTeam,
  aiReceiving: TradePlayer[],
  aiNeeds: string[],
  warGap: number,
): AITradeEvaluation['counterSuggestion'] | undefined {
  const receivingIds = new Set(aiReceiving.map(p => p.id));

  const candidates = userTeam.players
    .filter(p => !receivingIds.has(p.id))
    .map(p => ({
      player: p,
      war: estimatePlayerWAR(p),
      needBonus: aiNeeds.includes(p.position) ? 0.3 : 0,
    }))
    .sort((a, b) => {
      // Prefer player whose value is closest to the gap
      const aDist = Math.abs((a.war + a.needBonus) - warGap);
      const bDist = Math.abs((b.war + b.needBonus) - warGap);
      return aDist - bDist;
    });

  if (candidates.length > 0) {
    return { action: 'ADD_TO_USER_SIDE', player: candidates[0].player };
  }
  return undefined;
}

// ---- AI proposal generation ----

/** Beat-reporter note templates keyed by trigger reason. */
const AI_REPORTER_NOTES: Record<string, string[]> = {
  POSITION_NEED: [
    '{aiTeam} are desperate for a {position} upgrade. {wantName} fits the bill perfectly.',
    "Sources say {aiTeam}'s front office has been eyeing {wantName} all offseason.",
    'The {aiTeam} need help at {position} and {wantName} keeps coming up in their trade talks.',
  ],
  SALARY_DUMP: [
    '{aiTeam} are looking to shed payroll. Expect them to dangle {offerName} for anything reasonable.',
    "Word is {aiTeam} want to get under the cap and {offerName}'s salary is on the block.",
  ],
  TALENT_UPGRADE: [
    '{aiTeam} think they can contend if they add {wantName}. They are willing to pay the price.',
    'The front office believes {wantName} is the missing piece for {aiTeam}.',
  ],
  REBUILD: [
    '{aiTeam} are in full rebuild mode and shopping {offerName} for younger talent.',
    'Sources indicate {aiTeam} are ready to move on from {offerName} and build for the future.',
  ],
};

function pickRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillNoteTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Generate 1-3 AI trade proposals from CPU teams targeting the user's team.
 *
 * Strategy per S-TRD014 trigger list:
 *   - Position surplus / need matching
 *   - Salary dump
 *   - Talent upgrade (contender adds talent)
 *   - Rebuild (vet for youth)
 */
export function generateAIProposals(
  teams: TradeTeam[],
): AITradeProposal[] {
  const userTeam = teams.find(t => t.isUserTeam);
  if (!userTeam) return [];

  const aiTeams = teams.filter(t => !t.isUserTeam && t.players.length > 0);
  if (aiTeams.length === 0) return [];

  const userNeeds = getTeamPositionNeeds(userTeam);
  const proposals: AITradeProposal[] = [];
  let proposalCounter = 0;

  for (const aiTeam of aiTeams) {
    const proposal = buildSingleProposal(aiTeam, userTeam, userNeeds, proposalCounter);
    if (proposal) {
      proposals.push(proposal);
      proposalCounter++;
    }
    if (proposals.length >= 3) break;
  }

  return proposals;
}

/**
 * Attempt to build one trade proposal where aiTeam wants something from
 * userTeam and offers something in return.
 */
function buildSingleProposal(
  aiTeam: TradeTeam,
  userTeam: TradeTeam,
  userNeeds: string[],
  index: number,
): AITradeProposal | null {
  const aiNeeds = getTeamPositionNeeds(aiTeam);

  // 1. Find a user player the AI wants (position need first, then talent)
  let target: TradePlayer | undefined;
  let triggerReason = 'TALENT_UPGRADE';

  for (const need of aiNeeds) {
    const candidate = userTeam.players
      .filter(p => p.position === need)
      .sort((a, b) => b.overall - a.overall)[0];
    if (candidate && candidate.overall >= 75) {
      target = candidate;
      triggerReason = 'POSITION_NEED';
      break;
    }
  }

  // Fallback: pick user's 2nd-best player (skip best = unrealistic target)
  if (!target) {
    const sorted = [...userTeam.players].sort((a, b) => b.overall - a.overall);
    target = sorted[Math.min(1, sorted.length - 1)];
    if (!target) return null;
  }

  // 2. Find what the AI can offer in return
  let offer: TradePlayer | undefined;

  for (const need of userNeeds) {
    const candidate = aiTeam.players
      .filter(p => p.position === need)
      .sort((a, b) => b.overall - a.overall)[0];
    if (candidate) {
      offer = candidate;
      break;
    }
  }

  if (!offer) {
    const sorted = [...aiTeam.players].sort((a, b) => b.overall - a.overall);
    offer = sorted[0];
    if (!offer) return null;

    if (offer.salary > target.salary * 1.5) {
      triggerReason = 'SALARY_DUMP';
    }
  }

  // 3. Sanity check: WAR gap < 3.0 so proposal isn't absurd
  const offerWAR = estimatePlayerWAR(offer);
  const targetWAR = estimatePlayerWAR(target);
  if (Math.abs(offerWAR - targetWAR) > 3.0) {
    return null;
  }

  // 4. Salary impact for user team (positive = user takes on salary)
  const salaryImpact = offer.salary - target.salary;

  // 5. Beat reporter note
  const noteTemplates = AI_REPORTER_NOTES[triggerReason] ?? AI_REPORTER_NOTES['TALENT_UPGRADE'];
  const note = fillNoteTemplate(pickRandomItem(noteTemplates), {
    aiTeam: aiTeam.name,
    position: target.position,
    wantName: target.name,
    offerName: offer.name,
  });

  return {
    id: `ai-prop-${Date.now()}-${index}`,
    fromTeam: aiTeam,
    offering: [offer],
    wanting: [target],
    salaryImpact,
    beatReporterNote: note,
    isNew: true,
    reasoning: `${aiTeam.name} ${triggerReason === 'POSITION_NEED' ? 'need' : 'want'} a ${target.position} and believe ${offer.name} is fair value for ${target.name}.`,
  };
}
