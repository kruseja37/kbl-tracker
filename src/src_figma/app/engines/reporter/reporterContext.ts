import { calculateLeverageIndex } from "../../../../engines/leverageCalculator";
import type { FameTier, PlayerArchetype, EraFlavor } from "../../../../types/reporter";
import { getEffectiveFame } from "../../../../utils/effectiveValues";
import {
  getLeaguePlayerOverride,
  getPlayer,
  getTeam,
  type LeaguePlayerOverrideRecord,
  type Player,
  type Team,
} from "../../../../utils/leagueBuilderStorage";
import {
  getAtBatEvent,
  getGameEvents,
  type AtBatEvent,
  type RunnerState,
} from "../../../../utils/eventLog";
import {
  getCompletedGameById,
  loadCurrentGame,
  type CompetitionType,
  type CompletedGameRecord,
  type PersistedGameState,
} from "../../../../utils/gameStorage";

const MAX_RECENT_ALMANAC_ENTRIES = 5;
const DEFAULT_LEGACY_SUMMARY = "";

export interface PlayerSnapshot {
  id: string;
  name: string;
  nickname?: string;
  nicknames: string[];
  effectiveFame: FameTier;
  archetype?: PlayerArchetype;
  baselineBackstory: string;
  signatureMoment?: string;
  teamId: string;
  handedness?: {
    bats?: Player["bats"];
    throws?: Player["throws"];
  };
}

export interface TeamSnapshot {
  id: string;
  name: string;
  abbreviation?: string;
  location?: string;
  nickname?: string;
  era?: EraFlavor;
  cityVibe?: string;
  baselineBackstory: string;
  ballparkNickname?: string;
}

export interface AlmanacEntry {
  id: string;
  entityId: string;
  gameId?: string;
  timestamp: number;
  headline: string;
  summary: string;
}

export interface ReporterRelationship {
  id: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  kind: string;
  intensity: number;
  note?: string;
}

export interface GameStateSnapshot {
  gameId: string;
  atBatId: string;
  inning: number;
  halfInning: AtBatEvent["halfInning"];
  outs: number;
  bases: {
    first: string | null;
    second: string | null;
    third: string | null;
  };
  awayScore: number;
  homeScore: number;
  battingTeamId: string;
  pitchingTeamId: string;
  batterId: string;
  pitcherId: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  leagueId?: string;
}

export interface WpaEvent {
  eventId: string;
  leverageIndex: number;
  winProbabilityBefore: number;
  winProbabilityAfter: number;
  wpa: number;
}

export interface ReporterContext {
  batter: PlayerSnapshot;
  pitcher: PlayerSnapshot;
  battingTeam: TeamSnapshot;
  pitchingTeam: TeamSnapshot;
  batterLegacySummary: string;
  pitcherLegacySummary: string;
  battingTeamLegacySummary: string;
  pitchingTeamLegacySummary: string;
  batterRecentAlmanac: AlmanacEntry[];
  pitcherRecentAlmanac: AlmanacEntry[];
  teamRecentAlmanac: AlmanacEntry[];
  activeOpposingRelationships: ReporterRelationship[];
  activeWithinTeamRelationships: ReporterRelationship[];
  teamRivalryIntensity: number;
  dramaticWeight: number;
  gameState: GameStateSnapshot;
  wpaMoment?: WpaEvent;
}

export interface ReporterContextDataSources {
  getAtBatEvent(eventId: string): Promise<AtBatEvent | null>;
  getGameEvents(gameId: string): Promise<AtBatEvent[]>;
  getCurrentGame(): Promise<PersistedGameState | null>;
  getCompletedGame(gameId: string): Promise<CompletedGameRecord | null>;
  getPlayer(playerId: string): Promise<Player | null>;
  getTeam(teamId: string): Promise<Team | null>;
  getLeaguePlayerOverride(
    leagueId: string,
    playerId: string,
  ): Promise<LeaguePlayerOverrideRecord | null>;
  getPlayerLegacySummary(playerId: string, instanceId?: string): Promise<string | null>;
  getTeamLegacySummary(teamId: string, instanceId?: string): Promise<string | null>;
  getRecentPlayerAlmanac(playerId: string, instanceId?: string): Promise<AlmanacEntry[]>;
  getRecentTeamAlmanac(teamId: string, instanceId?: string): Promise<AlmanacEntry[]>;
}

const defaultReporterContextDataSources: ReporterContextDataSources = {
  getAtBatEvent,
  getGameEvents: (gameId) => getGameEvents(gameId),
  getCurrentGame: loadCurrentGame,
  getCompletedGame: getCompletedGameById,
  getPlayer,
  getTeam,
  getLeaguePlayerOverride,
  getPlayerLegacySummary: async () => null,
  getTeamLegacySummary: async () => null,
  getRecentPlayerAlmanac: async () => [],
  getRecentTeamAlmanac: async () => [],
};

export interface BuildReporterContextOptions {
  dataSources?: Partial<ReporterContextDataSources>;
}

function mergeDataSources(
  overrides?: Partial<ReporterContextDataSources>,
): ReporterContextDataSources {
  return { ...defaultReporterContextDataSources, ...overrides };
}

function formatPlayerName(player: Player | null, fallbackName: string): string {
  if (!player) return fallbackName;
  return [player.firstName, player.lastName].filter(Boolean).join(" ").trim() || fallbackName;
}

function runnerName(runner: RunnerState[keyof RunnerState]): string | null {
  return runner?.runnerName ?? null;
}

function capRecentAlmanac(entries: AlmanacEntry[]): AlmanacEntry[] {
  return entries
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECENT_ALMANAC_ENTRIES);
}

function toLeverageRunners(runners: RunnerState) {
  return {
    first: Boolean(runners.first),
    second: Boolean(runners.second),
    third: Boolean(runners.third),
  };
}

function resolveInstanceId(event: AtBatEvent, game?: PersistedGameState | CompletedGameRecord | null): string | undefined {
  return event.competitionId ?? game?.competitionId ?? event.leagueId ?? game?.leagueId;
}

function buildGameStateSnapshot(event: AtBatEvent): GameStateSnapshot {
  return {
    gameId: event.gameId,
    atBatId: event.eventId,
    inning: event.inning,
    halfInning: event.halfInning,
    outs: event.outs,
    bases: {
      first: runnerName(event.runners.first),
      second: runnerName(event.runners.second),
      third: runnerName(event.runners.third),
    },
    awayScore: event.awayScore,
    homeScore: event.homeScore,
    battingTeamId: event.batterTeamId,
    pitchingTeamId: event.pitcherTeamId,
    batterId: event.batterId,
    pitcherId: event.pitcherId,
    competitionType: event.competitionType,
    competitionId: event.competitionId,
    leagueId: event.leagueId,
  };
}

function buildWpaMoment(event: AtBatEvent): WpaEvent | undefined {
  if (
    event.leverageIndex === undefined ||
    event.winProbabilityBefore === undefined ||
    event.winProbabilityAfter === undefined ||
    event.wpa === undefined
  ) {
    return undefined;
  }

  return {
    eventId: event.eventId,
    leverageIndex: event.leverageIndex,
    winProbabilityBefore: event.winProbabilityBefore,
    winProbabilityAfter: event.winProbabilityAfter,
    wpa: event.wpa,
  };
}

function buildPlayerSnapshot(params: {
  eventPlayerId: string;
  eventPlayerName: string;
  teamId: string;
  player: Player | null;
  override: LeaguePlayerOverrideRecord | null;
}): PlayerSnapshot {
  const { eventPlayerId, eventPlayerName, teamId, player, override } = params;

  return {
    id: player?.id ?? eventPlayerId,
    name: formatPlayerName(player, eventPlayerName),
    nickname: player?.nickname,
    nicknames: player?.nicknames ?? [],
    effectiveFame: getEffectiveFame(player, override),
    archetype: player?.archetype,
    baselineBackstory: player?.backstory ?? "",
    signatureMoment: player?.signatureMoment,
    teamId,
    handedness: player
      ? {
          bats: player.bats,
          throws: player.throws,
        }
      : undefined,
  };
}

function buildTeamSnapshot(teamId: string, fallbackName: string, team: Team | null): TeamSnapshot {
  return {
    id: team?.id ?? teamId,
    name: team?.name ?? fallbackName,
    abbreviation: team?.abbreviation,
    location: team?.location,
    nickname: team?.nickname,
    era: team?.era,
    cityVibe: team?.cityVibe,
    baselineBackstory: team?.backstory ?? "",
    ballparkNickname: team?.ballparkNickname,
  };
}

function computeReporterDramaticWeight(params: {
  event: AtBatEvent;
  batterFame: FameTier;
  pitcherFame: FameTier;
}): number {
  const { event, batterFame, pitcherFame } = params;
  const leverageIndex =
    event.leverageIndex ??
    calculateLeverageIndex({
      inning: event.inning,
      halfInning: event.halfInning,
      outs: Math.min(Math.max(event.outs, 0), 2) as 0 | 1 | 2,
      runners: toLeverageRunners(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    }).leverageIndex;

  // v1-slim deliberately excludes relationship, affinity, and rivalry boosts.
  return Number((leverageIndex + (batterFame + pitcherFame - 2) * 0.1).toFixed(3));
}

async function resolveAtBatEvent(
  gameId: string,
  atBatId: string,
  dataSources: ReporterContextDataSources,
): Promise<AtBatEvent> {
  const direct = await dataSources.getAtBatEvent(atBatId);
  if (direct && direct.gameId === gameId) return direct;

  const events = await dataSources.getGameEvents(gameId);
  const byId = events.find((event) => event.eventId === atBatId);
  if (byId) return byId;

  const eventIndex = Number(atBatId);
  const byIndex = Number.isFinite(eventIndex)
    ? events.find((event) => event.eventIndex === eventIndex)
    : undefined;
  if (byIndex) return byIndex;

  throw new Error(`Reporter context at-bat not found: ${gameId}/${atBatId}`);
}

/**
 * Shared reporter seam for Phase H commentary and Phase J post-game columns.
 *
 * This is intentionally read-only. It resolves present-tense identity, fame,
 * compressed-history placeholders, and current-moment context without making
 * LLM calls or mutating gameplay/player state.
 */
export async function buildReporterContext(
  gameId: string,
  atBatId: string,
  options: BuildReporterContextOptions = {},
): Promise<ReporterContext> {
  const dataSources = mergeDataSources(options.dataSources);
  const event = await resolveAtBatEvent(gameId, atBatId, dataSources);
  const currentGame = await dataSources.getCurrentGame();
  const game =
    currentGame?.gameId === gameId
      ? currentGame
      : await dataSources.getCompletedGame(gameId);
  const leagueId = event.leagueId ?? game?.leagueId;
  const instanceId = resolveInstanceId(event, game);

  const [
    batterPlayer,
    pitcherPlayer,
    battingTeam,
    pitchingTeam,
    batterOverride,
    pitcherOverride,
    batterLegacySummary,
    pitcherLegacySummary,
    battingTeamLegacySummary,
    pitchingTeamLegacySummary,
    batterRecentAlmanac,
    pitcherRecentAlmanac,
    battingTeamRecentAlmanac,
  ] = await Promise.all([
    dataSources.getPlayer(event.batterId),
    dataSources.getPlayer(event.pitcherId),
    dataSources.getTeam(event.batterTeamId),
    dataSources.getTeam(event.pitcherTeamId),
    leagueId ? dataSources.getLeaguePlayerOverride(leagueId, event.batterId) : Promise.resolve(null),
    leagueId ? dataSources.getLeaguePlayerOverride(leagueId, event.pitcherId) : Promise.resolve(null),
    dataSources.getPlayerLegacySummary(event.batterId, instanceId),
    dataSources.getPlayerLegacySummary(event.pitcherId, instanceId),
    dataSources.getTeamLegacySummary(event.batterTeamId, instanceId),
    dataSources.getTeamLegacySummary(event.pitcherTeamId, instanceId),
    dataSources.getRecentPlayerAlmanac(event.batterId, instanceId),
    dataSources.getRecentPlayerAlmanac(event.pitcherId, instanceId),
    dataSources.getRecentTeamAlmanac(event.batterTeamId, instanceId),
  ]);

  const batter = buildPlayerSnapshot({
    eventPlayerId: event.batterId,
    eventPlayerName: event.batterName,
    teamId: event.batterTeamId,
    player: batterPlayer,
    override: batterOverride,
  });
  const pitcher = buildPlayerSnapshot({
    eventPlayerId: event.pitcherId,
    eventPlayerName: event.pitcherName,
    teamId: event.pitcherTeamId,
    player: pitcherPlayer,
    override: pitcherOverride,
  });

  return {
    batter,
    pitcher,
    battingTeam: buildTeamSnapshot(event.batterTeamId, event.teamContext?.battingTeam.teamName ?? event.batterTeamId, battingTeam),
    pitchingTeam: buildTeamSnapshot(event.pitcherTeamId, event.teamContext?.fieldingTeam.teamName ?? event.pitcherTeamId, pitchingTeam),
    batterLegacySummary: batterLegacySummary ?? DEFAULT_LEGACY_SUMMARY,
    pitcherLegacySummary: pitcherLegacySummary ?? DEFAULT_LEGACY_SUMMARY,
    battingTeamLegacySummary: battingTeamLegacySummary ?? DEFAULT_LEGACY_SUMMARY,
    pitchingTeamLegacySummary: pitchingTeamLegacySummary ?? DEFAULT_LEGACY_SUMMARY,
    batterRecentAlmanac: capRecentAlmanac(batterRecentAlmanac),
    pitcherRecentAlmanac: capRecentAlmanac(pitcherRecentAlmanac),
    teamRecentAlmanac: capRecentAlmanac(battingTeamRecentAlmanac),
    activeOpposingRelationships: [],
    activeWithinTeamRelationships: [],
    teamRivalryIntensity: 0,
    dramaticWeight: computeReporterDramaticWeight({
      event,
      batterFame: batter.effectiveFame,
      pitcherFame: pitcher.effectiveFame,
    }),
    gameState: buildGameStateSnapshot(event),
    wpaMoment: buildWpaMoment(event),
  };
}
