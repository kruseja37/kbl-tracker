/**
 * DEV-ONLY living-season synthetic driver.
 *
 * Source of truth adapted here (never imported into production):
 * test-utils/lsim/syntheticGame.ts. The adapted seam intentionally reads stored
 * franchise ratings, applies the established mojo × fitness multiplier, and
 * never uses morale as a performance multiplier. Randomness is seed-derived
 * from (franchiseId, scheduleGameId); unseeded randomness is forbidden here.
 */

import type { FitnessState } from "../../../engines/fitnessEngine";
import { applyCombinedMultiplier } from "../../../engines/fitnessEngine";
import type { MojoLevel } from "../../../engines/mojoEngine";
import { getMojoStatMultiplier } from "../../../engines/mojoEngine";
import { getDeviceLocalCivilDate } from "../../../utils/civilDate";
import { loadFranchise, listFranchises, type FranchiseMetadata } from "../../../utils/franchiseManager";
import { getAllFranchisePlayers, getAllFranchiseTeams } from "../../../utils/franchisePlayerStorage";
import { getFranchiseSeasonId } from "../../../utils/franchisePersistenceContract";
import type { Player, Team } from "../../../utils/leagueBuilderStorage";
import { loadFranchiseConditionSnapshots } from "../../../utils/mojoFitnessStorage";
import {
  getCompletedGameById,
  getSoulOutcomes,
  type CompletedGameRecord,
  type LivingSeasonProcessing,
  type PersistedGameState,
} from "../../../utils/gameStorage";
import { processCompletedGame, type CompletedGameArchiveOptions } from "../../../utils/processCompletedGame";
import {
  completeGame as completeScheduleGame,
  getAllGamesByFranchise,
  getGame as getScheduledGame,
  getNextFranchiseGame,
  type ScheduledGame,
} from "../../../utils/scheduleStorage";
import { isCheckpointBoundary } from "../../../utils/franchiseCheckpointSweepCompute";

const POSITION_ORDER = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
const PITCHER_POSITIONS = new Set(["SP", "RP", "CP", "SP/RP", "TWO-WAY", "P"]);
const SYNTHETIC_EPOCH = Date.UTC(2026, 6, 11, 18, 0, 0);

export type TestDriveAvailability =
  | "ready"
  | "not-franchise"
  | "legacy-franchise"
  | "no-schedule"
  | "season-complete"
  | "no-current-roster";

export interface TestDriveFranchiseOption {
  franchiseId: string;
  name: string;
  seasonNumber: number;
  livingSeasonEnabled: boolean;
}

export interface LivingSeasonTestDriveState {
  availability: TestDriveAvailability;
  message: string;
  franchiseId: string;
  franchiseName?: string;
  seasonNumber?: number;
  currentGameNumber?: number;
  seasonLength?: number;
  remainingGames?: number;
  nextGame?: ScheduledGame;
  nextMatchup?: { awayName: string; homeName: string };
  seed?: string;
  nextCheckpointGameNumber?: number | null;
}

export interface DevSyntheticReceipt {
  gameId: string;
  scheduleGameId: string;
  gameNumber: number;
  seed: string;
  completedCivilDate: string;
  away: { name: string; score: number };
  home: { name: string; score: number };
  livingSeasonProcessing: LivingSeasonProcessing | null;
}

export type DevSyntheticPlayResult =
  | { kind: "processed"; receipt: DevSyntheticReceipt; state: LivingSeasonTestDriveState }
  | { kind: "refused"; state: LivingSeasonTestDriveState };

export interface DevSyntheticFastForwardResult {
  receipts: DevSyntheticReceipt[];
  state: LivingSeasonTestDriveState;
  stopped: boolean;
}

type TeamRoster = {
  team: Team;
  players: Player[];
  lineup: Player[];
  bench: Player[];
  starter: Player;
  reliever: Player;
};

type TeamBatting = {
  stats: PersistedGameState["playerStats"];
  score: number;
};

function seedHash(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string): number {
  return seedHash(seed) / 0x1_0000_0000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fullName(player: Pick<Player, "firstName" | "lastName">): string {
  return `${player.firstName} ${player.lastName}`.trim();
}

function isPitcher(player: Player): boolean {
  return PITCHER_POSITIONS.has(player.primaryPosition);
}

function legacyMojoLevel(player: Player): MojoLevel {
  if (player.mojo === "On Fire") return 2;
  if (player.mojo === "Hot") return 1;
  if (player.mojo === "Cold") return -1;
  if (player.mojo === "Ice Cold") return -2;
  return 0;
}

function playsPosition(player: Player, position: string): boolean {
  return player.primaryPosition === position || player.secondaryPosition === position;
}

function stablePlayerOrder(left: Player, right: Player): number {
  return left.id.localeCompare(right.id);
}

function selectTeamRoster(team: Team, players: Player[]): TeamRoster {
  const hitters = players.filter((player) => !isPitcher(player)).sort(stablePlayerOrder);
  const pitchers = players.filter(isPitcher).sort(stablePlayerOrder);
  if (hitters.length < POSITION_ORDER.length || pitchers.length === 0) {
    throw new Error(`${team.name} does not have a current playable MLB roster for the dev driver.`);
  }

  const selected: Player[] = [];
  const remaining = new Set(hitters.map((player) => player.id));
  for (const position of POSITION_ORDER) {
    const eligible = hitters.find(
      (player) => remaining.has(player.id) && playsPosition(player, position),
    ) ?? hitters.find((player) => remaining.has(player.id));
    if (!eligible) {
      throw new Error(`${team.name} cannot form a nine-player lineup for the dev driver.`);
    }
    selected.push(eligible);
    remaining.delete(eligible.id);
  }

  const starter = pitchers.find((player) => player.primaryPosition === "SP") ?? pitchers[0];
  const reliever = pitchers.find((player) => player.id !== starter.id) ?? starter;
  return {
    team,
    players,
    lineup: selected,
    bench: hitters.filter((player) => !selected.some((lineupPlayer) => lineupPlayer.id === player.id)),
    starter,
    reliever,
  };
}

function scoreLine(score: number, seed: string): Array<{ away: number; home: number }> {
  const bins = Array.from({ length: 9 }, () => 0);
  for (let run = 0; run < score; run += 1) {
    bins[Math.floor(seededUnit(`${seed}:inning:${run}`) * bins.length)] += 1;
  }
  return bins.map((runs) => ({ away: runs, home: 0 }));
}

function combineScoreLines(
  awayScore: number,
  homeScore: number,
  seed: string,
): Array<{ away: number; home: number }> {
  const away = scoreLine(awayScore, `${seed}:away`);
  const home = scoreLine(homeScore, `${seed}:home`);
  return away.map((inning, index) => ({ away: inning.away, home: home[index].away }));
}

function conditionFor(
  player: Player,
  conditionByPlayerId: Map<string, { mojoLevel: MojoLevel; fitnessState: FitnessState }>,
): { mojoLevel: MojoLevel; fitnessState: FitnessState } {
  return conditionByPlayerId.get(player.id) ?? {
    mojoLevel: legacyMojoLevel(player),
    fitnessState: "FIT",
  };
}

function effectiveRating(
  player: Player,
  key: "power" | "contact" | "speed" | "fielding" | "arm" | "velocity" | "junk" | "accuracy",
  conditionByPlayerId: Map<string, { mojoLevel: MojoLevel; fitnessState: FitnessState }>,
): number {
  const condition = conditionFor(player, conditionByPlayerId);
  return applyCombinedMultiplier(
    player[key],
    getMojoStatMultiplier(condition.mojoLevel),
    condition.fitnessState,
  );
}

function allocateRuns(
  stats: PersistedGameState["playerStats"],
  score: number,
  seed: string,
): void {
  const rows = Object.entries(stats).sort(([left], [right]) => left.localeCompare(right));
  if (rows.length === 0) return;
  let assigned = rows.reduce((total, [, row]) => total + row.r, 0);
  let cursor = 0;
  while (assigned < score) {
    const index = Math.floor(seededUnit(`${seed}:run:${cursor}`) * rows.length);
    rows[index][1].r += 1;
    assigned += 1;
    cursor += 1;
  }
  while (assigned > score) {
    const candidate = rows.find(([, row]) => row.r > 0);
    if (!candidate) break;
    candidate[1].r -= 1;
    assigned -= 1;
  }
}

function battingFor(
  roster: TeamRoster,
  seed: string,
  conditionByPlayerId: Map<string, { mojoLevel: MojoLevel; fitnessState: FitnessState }>,
): TeamBatting {
  const stats: PersistedGameState["playerStats"] = {};
  let score = 0;
  roster.lineup.forEach((player, index) => {
    const contact = effectiveRating(player, "contact", conditionByPlayerId);
    const power = effectiveRating(player, "power", conditionByPlayerId);
    const speed = effectiveRating(player, "speed", conditionByPlayerId);
    const fielding = effectiveRating(player, "fielding", conditionByPlayerId);
    const arm = effectiveRating(player, "arm", conditionByPlayerId);
    let singles = 0;
    let doubles = 0;
    let triples = 0;
    let hr = 0;
    let bb = 0;
    let k = 0;
    const pa = index % 3 === 0 ? 5 : 4;
    for (let appearance = 0; appearance < pa; appearance += 1) {
      // Ratings are part of the deterministic draw namespace, so a persisted
      // ratings confirmation necessarily changes this player's next-game
      // outcome stream instead of merely being read and ignored.
      const scope = `${seed}:${player.id}:${Math.round(contact)}:${Math.round(power)}:${appearance}`;
      if (seededUnit(`${scope}:walk`) < clamp(0.035 + contact / 2600, 0.035, 0.09)) {
        bb += 1;
        continue;
      }
      if (seededUnit(`${scope}:hit`) >= clamp(0.09 + contact / 430 + speed / 2200, 0.1, 0.38)) {
        if (seededUnit(`${scope}:strikeout`) < clamp(0.31 - contact / 500, 0.08, 0.27)) k += 1;
        continue;
      }
      const extraBaseRoll = seededUnit(`${scope}:power`);
      const extraBaseRate = clamp(0.06 + power / 320, 0.08, 0.38);
      if (extraBaseRoll < extraBaseRate * 0.32) hr += 1;
      else if (extraBaseRoll < extraBaseRate * 0.8) doubles += 1;
      else if (extraBaseRoll < extraBaseRate && speed >= 60) triples += 1;
      else singles += 1;
    }
    const hits = singles + doubles + triples + hr;
    const rbi = hits === 0 ? 0 : singles + (2 * doubles) + (2 * triples) + (3 * hr);
    score += rbi;
    stats[player.id] = {
      playerName: fullName(player),
      teamId: roster.team.id,
      pa,
      ab: pa - bb,
      h: hits,
      singles,
      doubles,
      triples,
      hr,
      rbi,
      r: hits > 0 ? 1 : 0,
      bb,
      hbp: 0,
      k,
      sb: speed >= 75 && hits > 0 && seededUnit(`${seed}:${player.id}:steal`) > 0.45 ? 1 : 0,
      cs: 0,
      sf: 0,
      sh: 0,
      gidp: 0,
      putouts: Math.max(1, Math.round(fielding / 16)),
      assists: Math.max(0, Math.round(arm / 28)),
      fieldingErrors: seededUnit(`${seed}:${player.id}:error`) > clamp(0.92 + fielding / 1200, 0.92, 0.995) ? 1 : 0,
      grandSlams: 0,
      d3kOutcomes: 0,
      divingCatches: fielding >= 86 && seededUnit(`${seed}:${player.id}:dive`) > 0.56 ? 1 : 0,
      robberies: 0,
      nutshots: 0,
    };
  });
  if (score === 0) {
    stats[roster.lineup[0].id].rbi = 1;
    score = 1;
  }
  allocateRuns(stats, score, `${seed}:runs`);
  return { stats, score };
}

function pitcherStatsFor(
  roster: TeamRoster,
  opponentScore: number,
  won: boolean,
  seed: string,
): PersistedGameState["pitcherGameStats"] {
  const starterRuns = Math.min(opponentScore, Math.floor(opponentScore * 0.72));
  const relieverRuns = opponentScore - starterRuns;
  const starter = roster.starter;
  const reliever = roster.reliever;
  return [
    {
      pitcherId: starter.id,
      pitcherName: fullName(starter),
      teamId: roster.team.id,
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: Math.max(3, starterRuns + 4),
      runsAllowed: starterRuns,
      earnedRuns: starterRuns,
      walksAllowed: Math.floor(seededUnit(`${seed}:starter:bb`) * 4),
      strikeoutsThrown: 4 + Math.floor(seededUnit(`${seed}:starter:k`) * 6),
      homeRunsAllowed: Math.min(starterRuns, Math.floor(starterRuns / 2)),
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 78 + Math.floor(seededUnit(`${seed}:starter:pitches`) * 21),
      battersFaced: 23 + Math.min(8, starterRuns),
      consecutiveHRsAllowed: 0,
      firstInningRuns: Math.min(2, starterRuns),
      basesLoadedWalks: 0,
      inningsComplete: 6,
      decision: won ? "W" : "L",
      save: false,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
    {
      pitcherId: reliever.id,
      pitcherName: fullName(reliever),
      teamId: roster.team.id,
      isStarter: false,
      entryInning: 7,
      outsRecorded: 9,
      hitsAllowed: Math.max(1, relieverRuns + 1),
      runsAllowed: relieverRuns,
      earnedRuns: relieverRuns,
      walksAllowed: Math.floor(seededUnit(`${seed}:reliever:bb`) * 2),
      strikeoutsThrown: 2 + Math.floor(seededUnit(`${seed}:reliever:k`) * 4),
      homeRunsAllowed: relieverRuns > 1 ? 1 : 0,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 30 + Math.floor(seededUnit(`${seed}:reliever:pitches`) * 17),
      battersFaced: 9 + Math.min(5, relieverRuns),
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 3,
      decision: "ND",
      save: won && opponentScore >= 1,
      hold: false,
      blownSave: false,
      comebackerInjuries: 0,
    },
  ];
}

function buildLineupState(roster: TeamRoster): NonNullable<PersistedGameState["awayLineupState"]> {
  const lineup = roster.lineup.map((player, index) => ({
    playerId: player.id,
    playerName: fullName(player),
    position: POSITION_ORDER[index],
    battingOrder: index + 1,
    enteredInning: 1,
    isStarter: true,
  }));
  return {
    lineup,
    bench: roster.bench.map((player) => ({
      playerId: player.id,
      playerName: fullName(player),
      positions: [player.primaryPosition, player.secondaryPosition].filter(Boolean) as string[],
      isAvailable: true,
    })),
    usedPlayers: lineup.map((entry) => entry.playerId),
    currentPitcher: {
      playerId: roster.starter.id,
      playerName: fullName(roster.starter),
      position: roster.starter.primaryPosition,
      battingOrder: 10,
      enteredInning: 1,
      isStarter: true,
    },
  };
}

function playerBelongsToTeam(player: Player, teamId: string): boolean {
  return (player.leagueAssignments ?? []).some(
    (assignment) => assignment.teamId === teamId && assignment.rosterStatus === "MLB",
  );
}

function seedFor(franchiseId: string, scheduleGameId: string): string {
  return `${franchiseId}:${scheduleGameId}`;
}

function nextCheckpointGameNumber(nextGameNumber: number, seasonLength: number): number | null {
  for (let gameNumber = nextGameNumber; gameNumber <= seasonLength; gameNumber += 1) {
    if (isCheckpointBoundary(gameNumber, seasonLength)) return gameNumber;
  }
  return null;
}

function baseState(
  availability: TestDriveAvailability,
  message: string,
  franchiseId: string,
): LivingSeasonTestDriveState {
  return { availability, message, franchiseId };
}

export async function listLivingSeasonTestDriveFranchises(): Promise<TestDriveFranchiseOption[]> {
  const summaries = await listFranchises();
  const metadata = await Promise.all(summaries.map((summary) => loadFranchise(summary.id)));
  return metadata
    .filter((franchise): franchise is FranchiseMetadata => franchise !== null)
    .map((franchise) => ({
      franchiseId: franchise.franchiseId,
      name: franchise.name,
      seasonNumber: franchise.currentSeason ?? 1,
      livingSeasonEnabled: franchise.livingSeason?.enabled === true,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getLivingSeasonTestDriveState(
  franchiseId: string,
): Promise<LivingSeasonTestDriveState> {
  const franchise = await loadFranchise(franchiseId);
  if (!franchise) {
    return baseState("not-franchise", "This save does not exist as a franchise.", franchiseId);
  }
  if (franchise.livingSeason?.enabled !== true) {
    return {
      ...baseState(
        "legacy-franchise",
        "This franchise is a legacy save. Turn on Living Season through its normal setup before using this dev fixture.",
        franchiseId,
      ),
      franchiseName: franchise.name,
      seasonNumber: franchise.currentSeason ?? 1,
    };
  }

  const seasonNumber = franchise.currentSeason ?? 1;
  const games = await getAllGamesByFranchise(franchiseId, seasonNumber);
  if (games.length === 0) {
    return {
      ...baseState("no-schedule", "This franchise has no regular-season schedule to drive.", franchiseId),
      franchiseName: franchise.name,
      seasonNumber,
    };
  }

  const nextGame = await getNextFranchiseGame(franchiseId, seasonNumber);
  const seasonLength = Math.max(...games.map((game) => game.gameNumber));
  const completedCount = games.filter((game) => game.status === "COMPLETED").length;
  if (!nextGame) {
    return {
      ...baseState(
        "season-complete",
        "The regular season is complete. Finalize and rollover remain deliberately deferred.",
        franchiseId,
      ),
      franchiseName: franchise.name,
      seasonNumber,
      currentGameNumber: completedCount,
      seasonLength,
      remainingGames: 0,
    };
  }

  const teams = await getAllFranchiseTeams(franchiseId);

  return {
    availability: "ready",
    message: "Ready to drive the next scheduled game through the real completion pipeline.",
    franchiseId,
    franchiseName: franchise.name,
    seasonNumber,
    currentGameNumber: completedCount,
    seasonLength,
    remainingGames: games.filter((game) => game.status === "SCHEDULED").length,
    nextGame,
    nextMatchup: {
      awayName: teams.find((team) => team.id === nextGame.awayTeamId)?.name ?? nextGame.awayTeamId,
      homeName: teams.find((team) => team.id === nextGame.homeTeamId)?.name ?? nextGame.homeTeamId,
    },
    seed: seedFor(franchiseId, nextGame.id),
    nextCheckpointGameNumber: nextCheckpointGameNumber(nextGame.gameNumber, seasonLength),
  };
}

async function buildSyntheticCompletedGame(
  franchise: FranchiseMetadata,
  scheduleGame: ScheduledGame,
): Promise<{ gameState: PersistedGameState; archiveOptions: CompletedGameArchiveOptions; seed: string }> {
  const franchiseId = franchise.franchiseId;
  const seasonNumber = franchise.currentSeason ?? 1;
  const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
  if (scheduleGame.seasonId && scheduleGame.seasonId !== seasonId) {
    throw new Error(`Schedule game ${scheduleGame.gameNumber} belongs to a different season scope.`);
  }
  if (scheduleGame.statsScopeId && scheduleGame.statsScopeId !== seasonId) {
    throw new Error(`Schedule game ${scheduleGame.gameNumber} has a mismatched stats scope.`);
  }

  const [teams, players, conditionSnapshots] = await Promise.all([
    getAllFranchiseTeams(franchiseId),
    getAllFranchisePlayers(franchiseId),
    loadFranchiseConditionSnapshots(franchiseId),
  ]);
  const awayTeam = teams.find((team) => team.id === scheduleGame.awayTeamId);
  const homeTeam = teams.find((team) => team.id === scheduleGame.homeTeamId);
  if (!awayTeam || !homeTeam) {
    throw new Error("The next scheduled game does not match the franchise's current stored teams.");
  }
  const awayRoster = selectTeamRoster(awayTeam, players.filter((player) => playerBelongsToTeam(player, awayTeam.id)));
  const homeRoster = selectTeamRoster(homeTeam, players.filter((player) => playerBelongsToTeam(player, homeTeam.id)));
  const conditionByPlayerId = new Map(
    conditionSnapshots.map((snapshot) => [snapshot.playerId, {
      mojoLevel: snapshot.mojoLevel,
      fitnessState: snapshot.fitnessState,
    }]),
  );

  const seed = seedFor(franchiseId, scheduleGame.id);
  const awayBatting = battingFor(awayRoster, `${seed}:away`, conditionByPlayerId);
  const homeBatting = battingFor(homeRoster, `${seed}:home`, conditionByPlayerId);
  if (awayBatting.score === homeBatting.score) {
    const homeLead = homeBatting.stats[homeRoster.lineup[0].id];
    homeLead.rbi += 1;
    homeBatting.score += 1;
    allocateRuns(homeBatting.stats, homeBatting.score, `${seed}:home:tiebreak`);
  }
  const inningScores = combineScoreLines(awayBatting.score, homeBatting.score, seed);
  const awayLineup = awayRoster.lineup.map((player, index) => ({
    playerId: player.id,
    playerName: fullName(player),
    position: POSITION_ORDER[index],
  }));
  const homeLineup = homeRoster.lineup.map((player, index) => ({
    playerId: player.id,
    playerName: fullName(player),
    position: POSITION_ORDER[index],
  }));
  const completedCivilDate = getDeviceLocalCivilDate();
  const gameId = `dev-synthetic-${franchiseId}-${scheduleGame.id}`;
  const savedAt = SYNTHETIC_EPOCH + (seedHash(seed) * 1000);
  const pitcherGameStats = [
    ...pitcherStatsFor(awayRoster, homeBatting.score, awayBatting.score > homeBatting.score, `${seed}:away`),
    ...pitcherStatsFor(homeRoster, awayBatting.score, homeBatting.score > awayBatting.score, `${seed}:home`),
  ];
  const featuredPlayer = homeRoster.lineup[0];
  const ratingsInputStamp = [...awayRoster.lineup, ...homeRoster.lineup, awayRoster.starter, homeRoster.starter]
    .map((player) => `${player.id}:${Math.round(effectiveRating(player, "power", conditionByPlayerId))}/${Math.round(effectiveRating(player, "contact", conditionByPlayerId))}/${Math.round(effectiveRating(player, "velocity", conditionByPlayerId))}`)
    .sort()
    .join("|");
  const gameState: PersistedGameState = {
    id: "current",
    gameId,
    savedAt,
    completedCivilDate,
    inning: 9,
    halfInning: "BOTTOM",
    outs: 3,
    homeScore: homeBatting.score,
    awayScore: awayBatting.score,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: Object.values({ ...awayBatting.stats, ...homeBatting.stats }).reduce((total, row) => total + row.pa, 0),
    awayTeamId: awayTeam.id,
    homeTeamId: homeTeam.id,
    awayTeamName: awayTeam.name,
    homeTeamName: homeTeam.name,
    seasonNumber,
    stadiumName: homeTeam.stadium,
    stadiumId: homeTeam.stadiumId,
    parkFactors: homeTeam.parkFactors,
    gamePhase: "FINALIZED",
    gameStartedAt: savedAt,
    currentBatterId: featuredPlayer.id,
    currentBatterName: fullName(featuredPlayer),
    currentPitcherId: homeRoster.reliever.id,
    currentPitcherName: fullName(homeRoster.reliever),
    playerStats: { ...awayBatting.stats, ...homeBatting.stats },
    pitcherGameStats,
    fameEvents: [{
      id: `dev-synthetic-fame-${gameId}`,
      gameId,
      eventType: "WEB_GEM",
      playerId: featuredPlayer.id,
      playerName: fullName(featuredPlayer),
      playerTeam: homeTeam.id,
      teamId: homeTeam.id,
      teamName: homeTeam.name,
      opponentTeamId: awayTeam.id,
      opponentTeamName: awayTeam.name,
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      competitionType: "franchise",
      competitionId: franchiseId,
      scheduleGameId: scheduleGame.id,
      fameValue: 3,
      fameType: "bonus",
      inning: 8,
      halfInning: "TOP",
      timestamp: savedAt,
      autoDetected: true,
      description: "Dev synthetic game defensive highlight",
    }],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [
      `Dev synthetic living-season game ${scheduleGame.gameNumber}`,
      `Ratings input stamp ${ratingsInputStamp}`,
    ],
    scoreboard: {
      innings: inningScores,
      away: { runs: awayBatting.score, hits: Object.values(awayBatting.stats).reduce((total, row) => total + row.h, 0), errors: 0 },
      home: { runs: homeBatting.score, hits: Object.values(homeBatting.stats).reduce((total, row) => total + row.h, 0), errors: 0 },
    },
    seasonId,
    statsScopeId: seasonId,
    franchiseId,
    scheduleGameId: scheduleGame.id,
    competitionType: "franchise",
    competitionId: franchiseId,
    competitionName: franchise.name,
    leagueId: franchise.leagueId,
    totalInnings: 9,
    awayUsesDh: true,
    homeUsesDh: true,
    awayLineup,
    homeLineup,
    awayLineupState: buildLineupState(awayRoster),
    homeLineupState: buildLineupState(homeRoster),
    pitcherNamesEntries: pitcherGameStats.map((stats) => [stats.pitcherId, stats.pitcherName]),
    substitutionLog: [],
    useGhostRunner: false,
    extraInningRunner: false,
    extraInningRunnerDelay: 2,
    awayTeamColor: awayTeam.colors.primary,
    homeTeamColor: homeTeam.colors.primary,
  };
  const archiveOptions: CompletedGameArchiveOptions = {
    finalScore: { away: awayBatting.score, home: homeBatting.score },
    inningScores,
    seasonId,
    context: {
      statsScopeId: seasonId,
      competitionType: "franchise",
      competitionId: franchiseId,
      competitionName: franchise.name,
      leagueId: franchise.leagueId,
      franchiseId,
      scheduleGameId: scheduleGame.id,
      totalInnings: 9,
      useGhostRunner: false,
      extraInningRunner: false,
      extraInningRunnerDelay: 2,
      completedCivilDate,
      devSynthetic: true,
    },
  };
  return { gameState, archiveOptions, seed };
}

function receiptFrom(record: CompletedGameRecord, scheduleGame: ScheduledGame, seed: string): DevSyntheticReceipt {
  return {
    gameId: record.gameId,
    scheduleGameId: scheduleGame.id,
    gameNumber: scheduleGame.gameNumber,
    seed,
    completedCivilDate: record.completedCivilDate ?? "Unknown date",
    away: { name: record.awayTeamName, score: record.finalScore.away },
    home: { name: record.homeTeamName, score: record.finalScore.home },
    livingSeasonProcessing: getSoulOutcomes(record),
  };
}

/** Durable receipt reader used by the dev page after a completed synthetic game. */
export async function getLivingSeasonTestDriveReceipt(
  gameId: string,
  scheduleGameId: string,
  seed: string,
): Promise<DevSyntheticReceipt | null> {
  const [record, scheduleGame] = await Promise.all([
    getCompletedGameById(gameId),
    getScheduledGame(scheduleGameId),
  ]);
  if (!record || !scheduleGame) return null;
  return receiptFrom(record, scheduleGame, seed);
}

export async function playNextLivingSeasonTestDriveGame(
  franchiseId: string,
): Promise<DevSyntheticPlayResult> {
  const state = await getLivingSeasonTestDriveState(franchiseId);
  if (state.availability !== "ready" || !state.nextGame) return { kind: "refused", state };
  return playLivingSeasonTestDriveScheduleGame(franchiseId, state.nextGame.id);
}

/**
 * Sequential only: the fast-forward control deliberately reuses the same
 * one-game call as PLAY NEXT GAME, so it cannot invent a parallel season path.
 */
export async function fastForwardLivingSeasonTestDriveGames(
  franchiseId: string,
  requestedGames: number,
  onProgress?: (complete: number, total: number, receipt: DevSyntheticReceipt) => void,
): Promise<DevSyntheticFastForwardResult> {
  let state = await getLivingSeasonTestDriveState(franchiseId);
  if (state.availability !== "ready") return { receipts: [], state, stopped: true };
  const normalizedRequest = Number.isFinite(requestedGames) ? Math.floor(requestedGames) : 1;
  const total = Math.max(1, Math.min(normalizedRequest, state.remainingGames ?? 0));
  const receipts: DevSyntheticReceipt[] = [];
  for (let index = 0; index < total; index += 1) {
    const result = await playNextLivingSeasonTestDriveGame(franchiseId);
    state = result.state;
    if (result.kind === "refused") return { receipts, state, stopped: true };
    receipts.push(result.receipt);
    onProgress?.(index + 1, total, result.receipt);
    if (state.availability !== "ready" && index + 1 < total) {
      return { receipts, state, stopped: true };
    }
  }
  return { receipts, state, stopped: false };
}

/** Exposed for refusal tests; the page only ever calls the next-game entry point. */
export async function playLivingSeasonTestDriveScheduleGame(
  franchiseId: string,
  scheduleGameId: string,
): Promise<DevSyntheticPlayResult> {
  const franchise = await loadFranchise(franchiseId);
  if (!franchise || franchise.livingSeason?.enabled !== true) {
    return { kind: "refused", state: await getLivingSeasonTestDriveState(franchiseId) };
  }
  const scheduledGame = await getScheduledGame(scheduleGameId);
  if (!scheduledGame || scheduledGame.franchiseId !== franchiseId) {
    return { kind: "refused", state: await getLivingSeasonTestDriveState(franchiseId) };
  }
  if (scheduledGame.status === "COMPLETED") {
    return {
      kind: "refused",
      state: {
        ...baseState("season-complete", "That scheduled game is already completed and cannot be driven again.", franchiseId),
        franchiseName: franchise.name,
        seasonNumber: franchise.currentSeason ?? 1,
      },
    };
  }
  if (scheduledGame.status !== "SCHEDULED") {
    return {
      kind: "refused",
      state: {
        ...baseState("no-current-roster", "Only the next pending scheduled game can be driven by this fixture.", franchiseId),
        franchiseName: franchise.name,
        seasonNumber: franchise.currentSeason ?? 1,
      },
    };
  }

  const expected = await getNextFranchiseGame(franchiseId, franchise.currentSeason ?? 1);
  if (!expected || expected.id !== scheduledGame.id) {
    return {
      kind: "refused",
      state: {
        ...baseState("no-current-roster", "This is not the next scheduled game. The fixture will not skip schedule order.", franchiseId),
        franchiseName: franchise.name,
        seasonNumber: franchise.currentSeason ?? 1,
      },
    };
  }

  const generated = await buildSyntheticCompletedGame(franchise, scheduledGame);
  const processResult = await processCompletedGame(
    generated.gameState,
    {
      seasonId: generated.gameState.statsScopeId,
      franchiseId,
      currentGame: scheduledGame.gameNumber,
      currentSeason: generated.gameState.seasonNumber,
      gamesPerTeam: (await getAllGamesByFranchise(franchiseId, generated.gameState.seasonNumber))
        .filter((game) => game.awayTeamId === scheduledGame.awayTeamId || game.homeTeamId === scheduledGame.awayTeamId)
        .length,
      gamesPerSeason: (await getAllGamesByFranchise(franchiseId, generated.gameState.seasonNumber))
        .filter((game) => game.awayTeamId === scheduledGame.awayTeamId || game.homeTeamId === scheduledGame.awayTeamId)
        .length,
    },
    generated.gameState.leagueId,
    generated.archiveOptions,
  );
  if (processResult.aggregation.success !== true) {
    throw new Error(processResult.aggregation.error ?? "Synthetic game did not complete season aggregation.");
  }

  const archive = await getCompletedGameById(generated.gameState.gameId);
  if (!archive || archive.aggregationStatus === "incomplete") {
    throw new Error("Synthetic game did not produce a complete archive. Schedule advancement was stopped.");
  }
  await completeScheduleGame(scheduledGame.id, {
    awayScore: generated.gameState.awayScore,
    homeScore: generated.gameState.homeScore,
    winningTeamId: generated.gameState.awayScore > generated.gameState.homeScore
      ? generated.gameState.awayTeamId
      : generated.gameState.homeTeamId,
    losingTeamId: generated.gameState.awayScore > generated.gameState.homeScore
      ? generated.gameState.homeTeamId
      : generated.gameState.awayTeamId,
    gameLogId: generated.gameState.gameId,
    completedCivilDate: generated.gameState.completedCivilDate,
  });
  return {
    kind: "processed",
    receipt: receiptFrom(archive, scheduledGame, generated.seed),
    state: await getLivingSeasonTestDriveState(franchiseId),
  };
}

/** Test-only pure seam: allows deterministic shape assertions without IndexedDB writes. */
export async function previewLivingSeasonTestDriveGame(
  franchiseId: string,
  scheduleGameId: string,
): Promise<{ gameState: PersistedGameState; archiveOptions: CompletedGameArchiveOptions; seed: string }> {
  const franchise = await loadFranchise(franchiseId);
  const scheduleGame = await getScheduledGame(scheduleGameId);
  if (!franchise || !scheduleGame) throw new Error("Cannot preview a missing franchise schedule game.");
  return buildSyntheticCompletedGame(franchise, scheduleGame);
}
