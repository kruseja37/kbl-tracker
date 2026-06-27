import type {
  ScoutDecisionContext,
  ScoutPlayer,
} from "../engines/scoutMove";
import type {
  BenchDefenderRecommendationPlayer,
  DefenderRecommendationPlayer,
  HitterRecommendationPlayer,
  ManagerRecommendation,
  ManagerRecommendationInput,
  ManagerRecommendationType,
  PitchingRecommendationPlayer,
} from "./managerWpaRecommendations";

type TeamSide = "away" | "home";
type ThrowingHand = "L" | "R";
type BattingHand = "L" | "R" | "S";
type RecommendationMojo = NonNullable<HitterRecommendationPlayer["mojo"]>;
type RecommendationFitness = NonNullable<HitterRecommendationPlayer["fitness"]>;

export type ManagerScoutMojoGetter = (playerId: string) => unknown;
export type ManagerScoutFitnessGetter = (playerId: string) => unknown;

export interface ManagerScoutRawPlayer {
  name: string;
  playerId?: string;
  position?: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  battingOrder?: number;
  battingHand?: BattingHand;
  mojo?: unknown;
  fitness?: unknown;
  isOutOfGame?: boolean;
  power?: number;
  contact?: number;
  speed?: number;
  fieldingRating?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  trait1?: string | null;
  trait2?: string | null;
  throws?: ThrowingHand;
}

export interface ManagerScoutRawPitcher extends ManagerScoutRawPlayer {
  throwingHand?: ThrowingHand;
  throws?: ThrowingHand;
  isStarter?: boolean;
  isActive?: boolean;
}

export interface ManagerScoutLineupEntry {
  playerId: string;
  name: string;
  battingOrder?: number;
  batting?: boolean;
}

export interface ManagerScoutDefensiveDisplayPlayer {
  playerId: string;
  name: string;
  position?: string;
  isPitcher?: boolean;
}

export interface ManagerScoutBenchDefender {
  playerId: string;
  playerName: string;
  positions: string[];
  isAvailable?: boolean;
}

export interface ManagerScoutContextPlainState {
  gameId?: string;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  totalInnings?: number;
  leverageIndex?: number;
  count?: { balls: number; strikes: number };
  bases?: { first?: unknown; second?: unknown; third?: unknown };
  runnersOn?: boolean | number;
  risp?: boolean;
  battingTeam: TeamSide;
  fieldingTeam: TeamSide;
  battingTeamId: string;
  fieldingTeamId: string;
  offensiveManagerId: string;
  defensiveManagerId: string;
  scoreDifferentialForFieldingTeam?: number;
  currentBatterId?: string;
  resolvedCurrentBatterName: string;
  activePitcher?: ManagerScoutRawPitcher;
  battingTeamPlayers: ManagerScoutRawPlayer[];
  fieldingTeamPlayers: ManagerScoutRawPlayer[];
  fieldingTeamPitchers: ManagerScoutRawPitcher[];
  currentLineup: ManagerScoutLineupEntry[];
  defensiveColumnPlayers: ManagerScoutDefensiveDisplayPlayer[];
  fieldingBench: ManagerScoutBenchDefender[];
  pitcherStats?: ReadonlyMap<string, { pitchCount?: number }>;
  playerStats?: ReadonlyMap<string, { fieldingErrors?: number }>;
  getRosterEntityId: (
    entity: { name: string; playerId?: string },
    team: TeamSide,
  ) => string;
  suppressedRecommendationKeys?: Iterable<string>;
}

export interface ManagerRecommendationContextBundle {
  recommendationInput: ManagerRecommendationInput;
  scoutDecisionContexts: ScoutDecisionContext[];
}

export function scoutDecisionTypeForManagerRecommendationType(
  type: ManagerRecommendationType,
): ScoutDecisionContext["decisionType"] {
  switch (type) {
    case "consider_pitching_change":
      return "pitcher_change";
    case "consider_pinch_hitter":
      return "pinch_hit";
    case "consider_defensive_replacement":
      return "defensive_replacement";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export function scoutEvaluationKeyForRecommendation(
  recommendation: Pick<ManagerRecommendation, "type" | "trackedPlayerIds">,
): string | null {
  const incumbentPlayerId = recommendation.trackedPlayerIds[0];
  if (!incumbentPlayerId) return null;
  return scoutEvaluationKey(
    scoutDecisionTypeForManagerRecommendationType(recommendation.type),
    incumbentPlayerId,
  );
}

export function scoutEvaluationKey(
  decisionType: ScoutDecisionContext["decisionType"],
  incumbentPlayerId: string,
): string {
  return `${decisionType}:${incumbentPlayerId}`;
}

export function buildScoutDecisionContexts(
  plainState: ManagerScoutContextPlainState,
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
): ScoutDecisionContext[] {
  return buildManagerRecommendationContextBundle(
    plainState,
    getMojo,
    getFitness,
  ).scoutDecisionContexts;
}

export function buildManagerRecommendationContextBundle(
  plainState: ManagerScoutContextPlainState,
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
): ManagerRecommendationContextBundle {
  const recommendationInput = buildManagerRecommendationInput(
    plainState,
    getMojo,
    getFitness,
  );

  return {
    recommendationInput,
    scoutDecisionContexts: buildScoutContextsFromRecommendationInput(
      recommendationInput,
    ),
  };
}

function buildManagerRecommendationInput(
  plainState: ManagerScoutContextPlainState,
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
): ManagerRecommendationInput {
  const currentLineupBatter =
    plainState.currentLineup.find((player) => player.batting) ||
    plainState.currentLineup.find(
      (player) => player.playerId === plainState.currentBatterId,
    );
  const currentBatterRoster = plainState.battingTeamPlayers.find(
    (player) =>
      plainState.getRosterEntityId(player, plainState.battingTeam) ===
        (currentLineupBatter?.playerId || plainState.currentBatterId) ||
      player.name === plainState.resolvedCurrentBatterName,
  );
  const currentBatter: HitterRecommendationPlayer | undefined =
    currentLineupBatter || currentBatterRoster
      ? buildHitterRecommendationPlayer(
          currentBatterRoster,
          {
            playerId:
              currentLineupBatter?.playerId ||
              (currentBatterRoster
                ? plainState.getRosterEntityId(currentBatterRoster, plainState.battingTeam)
                : plainState.currentBatterId),
            playerName:
              currentLineupBatter?.name ||
              currentBatterRoster?.name ||
              plainState.resolvedCurrentBatterName,
            battingOrder:
              currentBatterRoster?.battingOrder ??
              currentLineupBatter?.battingOrder,
          },
          getMojo,
          getFitness,
        )
      : undefined;
  const benchHitters: HitterRecommendationPlayer[] =
    plainState.battingTeamPlayers
      .filter((player) => player.battingOrder === undefined)
      .map((player) => {
        const playerId = plainState.getRosterEntityId(player, plainState.battingTeam);
        return {
          ...buildHitterRecommendationPlayer(
            player,
            {
              playerId,
              playerName: player.name,
              battingOrder: player.battingOrder,
            },
            getMojo,
            getFitness,
          ),
          isAvailable: !player.isOutOfGame,
        };
      });

  const defenders: DefenderRecommendationPlayer[] =
    plainState.defensiveColumnPlayers
      .filter((player) => !player.isPitcher)
      .map((player) => {
        const rosterPlayer = plainState.fieldingTeamPlayers.find(
          (candidate) =>
            plainState.getRosterEntityId(candidate, plainState.fieldingTeam) ===
              player.playerId ||
            candidate.name === player.name,
        );
        return {
          playerId: player.playerId,
          playerName: player.name,
          position: player.position,
          primaryPosition:
            rosterPlayer?.primaryPosition ??
            rosterPlayer?.position ??
            player.position,
          fieldingErrors:
            plainState.playerStats?.get(player.playerId)?.fieldingErrors ?? 0,
          battingHand: rosterPlayer?.battingHand,
          bats: rosterPlayer?.battingHand,
          ...commonPlayerRecommendationFields(
            rosterPlayer,
            player.playerId,
            getMojo,
            getFitness,
          ),
        };
      });
  const benchDefenders: BenchDefenderRecommendationPlayer[] =
    plainState.fieldingBench
      .map((benchPlayer) => {
        const rosterPlayer = plainState.fieldingTeamPlayers.find(
          (candidate) =>
            plainState.getRosterEntityId(candidate, plainState.fieldingTeam) ===
              benchPlayer.playerId ||
            candidate.name === benchPlayer.playerName,
        );
        const positions =
          benchPlayer.positions.length > 0
            ? benchPlayer.positions
            : [
                rosterPlayer?.position,
                rosterPlayer?.secondaryPosition,
              ].filter((position): position is string => Boolean(position));
        return {
          playerId: benchPlayer.playerId,
          playerName: benchPlayer.playerName,
          positions,
          position: rosterPlayer?.position,
          primaryPosition:
            rosterPlayer?.primaryPosition ?? rosterPlayer?.position,
          battingHand: rosterPlayer?.battingHand,
          bats: rosterPlayer?.battingHand,
          ...commonPlayerRecommendationFields(
            rosterPlayer,
            benchPlayer.playerId,
            getMojo,
            getFitness,
          ),
          isAvailable: benchPlayer.isAvailable,
        };
      })
      .filter(
        (player) =>
          (player.positions ?? []).some((position) => position !== "P") &&
          player.isAvailable !== false,
      );

  const currentPitcherRecommendation = plainState.activePitcher
    ? buildPitchingRecommendationPlayer(
        plainState.activePitcher,
        plainState,
        getMojo,
        getFitness,
      )
    : undefined;

  return {
    gameId: plainState.gameId,
    inning: plainState.inning,
    half: plainState.half,
    outs: plainState.outs,
    totalInnings: plainState.totalInnings ?? 9,
    leverageIndex: plainState.leverageIndex,
    count: plainState.count,
    bases: plainState.bases,
    runnersOn: plainState.runnersOn,
    risp: plainState.risp,
    battingTeamId: plainState.battingTeamId,
    fieldingTeamId: plainState.fieldingTeamId,
    offensiveManagerId: plainState.offensiveManagerId,
    defensiveManagerId: plainState.defensiveManagerId,
    scoreDifferentialForFieldingTeam:
      plainState.scoreDifferentialForFieldingTeam,
    currentPitcher: currentPitcherRecommendation,
    availablePitchers: plainState.fieldingTeamPitchers
      .filter((pitcher) => !pitcher.isActive && !pitcher.isOutOfGame)
      .map((pitcher) =>
        buildPitchingRecommendationPlayer(
          pitcher,
          plainState,
          getMojo,
          getFitness,
        ),
      ),
    currentBatter,
    opposingPitcher: currentPitcherRecommendation,
    opposingBatter: currentBatter,
    benchHitters,
    defenders,
    benchDefenders,
    suppressedRecommendationKeys: plainState.suppressedRecommendationKeys,
  };
}

function buildScoutContextsFromRecommendationInput(
  input: ManagerRecommendationInput,
): ScoutDecisionContext[] {
  const contexts: ScoutDecisionContext[] = [];
  const common = {
    gameId: input.gameId,
    inning: input.inning,
    half: input.half,
    outs: input.outs,
    totalInnings: input.totalInnings ?? 9,
    leverageIndex: input.leverageIndex ?? 1,
    count: input.count,
    basesOccupied: {
      first: Boolean(input.bases?.first),
      second: Boolean(input.bases?.second),
      third: Boolean(input.bases?.third),
    },
    scoreDifferentialForFieldingTeam:
      input.scoreDifferentialForFieldingTeam ?? 0,
    battingTeamId: input.battingTeamId,
    fieldingTeamId: input.fieldingTeamId,
  };

  const currentPitcher = input.currentPitcher;
  const availablePitchers = (input.availablePitchers ?? []).filter(
    (candidate) => candidate.playerId !== currentPitcher?.playerId,
  );
  if (currentPitcher && availablePitchers.length > 0) {
    contexts.push({
      ...common,
      decisionType: "pitcher_change",
      incumbent: toScoutPlayer(currentPitcher),
      candidates: availablePitchers.map(toScoutPlayer),
      opposingBatter: input.opposingBatter
        ? toScoutPlayer(input.opposingBatter)
        : undefined,
    });
  }

  const currentBatter = input.currentBatter;
  const benchHitters = (input.benchHitters ?? []).filter(
    (candidate) => candidate.isAvailable !== false,
  );
  if (currentBatter && benchHitters.length > 0) {
    contexts.push({
      ...common,
      decisionType: "pinch_hit",
      incumbent: toScoutPlayer(currentBatter),
      candidates: benchHitters.map(toScoutPlayer),
      opposingPitcher: input.opposingPitcher
        ? toScoutPlayer(input.opposingPitcher)
        : undefined,
    });
  }

  const benchDefenders = (input.benchDefenders ?? []).filter(
    (candidate) => candidate.isAvailable !== false,
  );
  for (const defender of input.defenders ?? []) {
    const candidates = benchDefenders.filter((candidate) =>
      positionMatches(candidate, defender.position),
    );
    if (candidates.length === 0) continue;
    contexts.push({
      ...common,
      decisionType: "defensive_replacement",
      incumbent: toScoutPlayer(defender),
      candidates: candidates.map(toScoutPlayer),
      opposingBatter: input.opposingBatter
        ? toScoutPlayer(input.opposingBatter)
        : undefined,
    });
  }

  return contexts;
}

function normalizeRecommendationMojo(mojo: unknown): RecommendationMojo {
  if (mojo === -2 || mojo === "Rattled") return "Rattled";
  if (mojo === -1 || mojo === "Tense") return "Tense";
  if (mojo === 1 || mojo === "Locked In") return "Locked In";
  if (mojo === 2 || mojo === "On Fire") return "On Fire";
  if (mojo === 3 || mojo === "Jacked") return "Jacked";
  return "Normal";
}

function normalizeRecommendationFitness(fitness: unknown): RecommendationFitness {
  if (
    fitness === "JUICED" ||
    fitness === "FIT" ||
    fitness === "WELL" ||
    fitness === "STRAINED" ||
    fitness === "WEAK" ||
    fitness === "HURT"
  ) {
    return fitness;
  }
  return "FIT";
}

function pitcherRoleForRecommendation(
  pitcher: ManagerScoutRawPitcher,
): "SP" | "SP/RP" | "RP" | "CP" {
  const rawPosition = pitcher.secondaryPosition ?? "";
  if (rawPosition === "SP/RP" || rawPosition === "RP" || rawPosition === "CP") {
    return rawPosition;
  }
  return pitcher.isStarter ? "SP" : "RP";
}

function commonPlayerRecommendationFields(
  player: ManagerScoutRawPlayer | ManagerScoutRawPitcher | undefined,
  playerId: string,
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
) {
  return {
    power: player?.power,
    contact: player?.contact,
    speed: player?.speed,
    fieldingRating: player?.fieldingRating,
    fielding: player?.fielding ?? player?.fieldingRating,
    arm: player?.arm,
    velocity: player?.velocity,
    junk: player?.junk,
    accuracy: player?.accuracy,
    trait1: player?.trait1,
    trait2: player?.trait2,
    throws:
      player?.throws ??
      ("throwingHand" in (player ?? {})
        ? (player as ManagerScoutRawPitcher).throwingHand
        : undefined),
    secondaryPosition: player?.secondaryPosition,
    mojo: normalizeRecommendationMojo(getMojo(playerId) ?? player?.mojo),
    fitness: normalizeRecommendationFitness(getFitness(playerId) ?? player?.fitness),
  };
}

function buildHitterRecommendationPlayer(
  player: ManagerScoutRawPlayer | undefined,
  fallback: {
    playerId: string | undefined;
    playerName: string;
    battingOrder?: number;
  },
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
): HitterRecommendationPlayer {
  const playerId = fallback.playerId ?? fallback.playerName;
  return {
    playerId,
    playerName: player?.name ?? fallback.playerName,
    battingOrder: player?.battingOrder ?? fallback.battingOrder,
    battingHand: player?.battingHand,
    bats: player?.battingHand,
    position: player?.position,
    primaryPosition: player?.primaryPosition ?? player?.position,
    ...commonPlayerRecommendationFields(player, playerId, getMojo, getFitness),
  };
}

function buildPitchingRecommendationPlayer(
  pitcher: ManagerScoutRawPitcher,
  plainState: ManagerScoutContextPlainState,
  getMojo: ManagerScoutMojoGetter,
  getFitness: ManagerScoutFitnessGetter,
): PitchingRecommendationPlayer {
  const playerId = plainState.getRosterEntityId(pitcher, plainState.fieldingTeam);
  const role = pitcherRoleForRecommendation(pitcher);
  return {
    ...commonPlayerRecommendationFields(pitcher, playerId, getMojo, getFitness),
    playerId,
    playerName: pitcher.name,
    role,
    pitcherRole: role,
    position: role,
    primaryPosition: role,
    throws: pitcher.throws ?? pitcher.throwingHand,
    throwingHand: pitcher.throwingHand,
    pitchCount: plainState.pitcherStats?.get(playerId)?.pitchCount,
    isStarter: pitcher.isStarter,
    isAvailable: !pitcher.isOutOfGame,
  };
}

function positionMatches(
  benchPlayer: Pick<BenchDefenderRecommendationPlayer, "positions">,
  position?: string,
): boolean {
  if (!position) return true;
  const positions = benchPlayer.positions ?? [];
  return positions.includes(position) || positions.includes("UT");
}

function toScoutPlayer(
  player:
    | PitchingRecommendationPlayer
    | HitterRecommendationPlayer
    | DefenderRecommendationPlayer
    | BenchDefenderRecommendationPlayer,
): ScoutPlayer {
  return {
    playerId: player.playerId,
    playerName: player.playerName,
    bats: player.bats ?? player.battingHand,
    primaryPosition: player.primaryPosition ?? player.position,
    secondaryPosition: player.secondaryPosition,
    currentPosition: player.position,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding ?? player.fieldingRating,
    arm: player.arm,
    mojo: player.mojo,
    fitness: player.fitness,
    trait1: player.trait1 ?? undefined,
    trait2: player.trait2 ?? undefined,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    pitcherRole: player.pitcherRole ?? player.role,
  };
}
