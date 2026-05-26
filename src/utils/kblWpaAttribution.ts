import { calculateWPA, type WPAResult } from "../engines/wpaCalculator";
import { WPA_MODEL_VERSION } from "../engines/wpaV2";
import type { AtBatResult, Position } from "../types/game";
import type { AtBatEvent, BetweenPlayEvent, FieldingEvent, RunnerState } from "./eventLog";

export type KblWpaRole =
  | "batting"
  | "pitching"
  | "catching"
  | "fielding"
  | "baserunning"
  | "managing";

export type KblWpaConfidence = "high" | "medium" | "low";
export type KblWpaAllocationMode = "ratio" | "raw_unit" | "counterfactual" | "overlay";

export interface KblWpaCredit {
  eventId: string;
  source: "at_bat" | "between_play";
  playerId: string;
  playerName: string;
  teamId: string;
  role: KblWpaRole;
  wpa: number;
  confidence: KblWpaConfidence;
  basis: string;
  allocationMode: KblWpaAllocationMode;
  isOverlay?: boolean;
}

export interface KblWpaDerivationInput {
  atBatEvents: AtBatEvent[];
  fieldingEvents?: FieldingEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  awayTeamId?: string;
  homeTeamId?: string;
  startingLineups?: KblWpaStartingLineups;
  includeManagerOverlays?: boolean;
}

export interface KblWpaLineupEntry {
  playerId: string;
  playerName: string;
  position?: string;
  fieldPosition?: string;
}

export interface KblWpaStartingLineups {
  away: KblWpaLineupEntry[];
  home: KblWpaLineupEntry[];
}

export interface KblWpaPlayerTotal {
  playerId: string;
  playerName: string;
  teamId: string;
  totalWpa: number;
  battingWpa: number;
  pitchingWpa: number;
  catchingWpa: number;
  fieldingWpa: number;
  baserunningWpa: number;
  managingWpa: number;
}

export interface KblWpaAggregationOptions {
  includeManager?: boolean;
  includeOverlays?: boolean;
}

interface PlayerRef {
  playerId: string;
  playerName: string;
  teamId: string;
}

interface RawUnit extends PlayerRef {
  role: KblWpaRole;
  units: number;
  confidence: KblWpaConfidence;
  basis: string;
}

interface AfterState {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
}

interface DerivationContext {
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  awayTeamId?: string;
  homeTeamId?: string;
  startingLineups?: KblWpaStartingLineups;
  includeManagerOverlays?: boolean;
}

interface ExtraInningRunnerPolicy {
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
}

type RunnerOutcomeEntry = NonNullable<AtBatEvent["runnerOutcomes"]>[number];

const EPSILON = 0.0000001;

const POSITION_TO_NUMBER: Partial<Record<Position, number>> = {
  P: 1,
  C: 2,
  "1B": 3,
  "2B": 4,
  "3B": 5,
  SS: 6,
  LF: 7,
  CF: 8,
  RF: 9,
};

const POSITION_LABELS: Record<number, string> = {
  1: "P",
  2: "C",
  3: "1B",
  4: "2B",
  5: "3B",
  6: "SS",
  7: "LF",
  8: "CF",
  9: "RF",
};

const HIT_RESULTS = new Set<AtBatResult>(["1B", "2B", "3B", "GRD", "ITPHR"]);
const MADE_OUT_RESULTS = new Set<AtBatResult>([
  "GO",
  "FO",
  "FLO",
  "LO",
  "PO",
  "DP",
  "TP",
  "FC",
  "SF",
  "SAC",
]);
const STRIKEOUT_RESULTS = new Set<string>(["K", "Kc", "\uA740"]);

export function deriveKblWpaCredits(input: KblWpaDerivationInput): KblWpaCredit[] {
  const fieldingByAtBat = new Map<string, FieldingEvent[]>();

  for (const fieldingEvent of input.fieldingEvents ?? []) {
    const rows = fieldingByAtBat.get(fieldingEvent.atBatEventId) ?? [];
    rows.push(fieldingEvent);
    fieldingByAtBat.set(fieldingEvent.atBatEventId, rows);
  }

  for (const rows of fieldingByAtBat.values()) {
    rows.sort((left, right) => left.sequence - right.sequence);
  }

  const credits: KblWpaCredit[] = [];

  for (const event of input.atBatEvents) {
    if (event.undoneAt) continue;
    try {
      credits.push(
        ...deriveAtBatCredits(
          event,
          fieldingByAtBat.get(event.eventId) ?? [],
          input,
        ),
      );
    } catch (error) {
      const fallbackCredits = deriveArchivedAtBatFallbackCredits(event, input);
      if (!isSparseArchivedAtBatEvent(event) || fallbackCredits.length === 0) {
        throw error;
      }
      credits.push(...fallbackCredits);
    }
  }

  for (const event of input.betweenPlayEvents ?? []) {
    if (event.undoneAt) continue;
    credits.push(
      ...deriveBetweenPlayCredits(event, {
        totalInnings: input.totalInnings,
        useGhostRunner: input.useGhostRunner,
        extraInningRunner: input.extraInningRunner,
        extraInningRunnerDelay: input.extraInningRunnerDelay,
        awayTeamId: input.awayTeamId,
        homeTeamId: input.homeTeamId,
      }),
    );
  }

  return credits;
}

function isSparseArchivedAtBatEvent(event: AtBatEvent): boolean {
  return (
    !event.eventId ||
    !event.result ||
    typeof event.inning !== "number" ||
    !event.halfInning ||
    typeof event.outs !== "number" ||
    typeof event.outsAfter !== "number" ||
    typeof event.awayScore !== "number" ||
    typeof event.homeScore !== "number" ||
    typeof event.awayScoreAfter !== "number" ||
    typeof event.homeScoreAfter !== "number"
  );
}

function deriveArchivedAtBatFallbackCredits(
  event: AtBatEvent,
  context: DerivationContext,
): KblWpaCredit[] {
  if (!event.batterId || !Number.isFinite(event.wpa)) {
    return [];
  }

  return [
    {
      eventId: event.eventId || `archived-at-bat-${event.batterId}`,
      source: "at_bat",
      playerId: event.batterId,
      playerName: event.batterName || event.batterId,
      teamId:
        event.batterTeamId ||
        (event.halfInning === "TOP"
          ? context.awayTeamId
          : event.halfInning === "BOTTOM"
            ? context.homeTeamId
            : undefined) ||
        "",
      role: "batting",
      wpa: roundWpa(event.wpa),
      confidence: "low",
      basis: "Archived batting WPA fallback",
      allocationMode: "ratio",
    },
  ];
}

export function aggregateKblWpaCredits(
  credits: KblWpaCredit[],
  options: KblWpaAggregationOptions = {},
): KblWpaPlayerTotal[] {
  const includeManager = options.includeManager ?? false;
  const includeOverlays = options.includeOverlays ?? false;
  const totals = new Map<string, KblWpaPlayerTotal>();

  for (const credit of credits) {
    if (!includeOverlays && credit.isOverlay) continue;
    if (!includeManager && credit.role === "managing") continue;

    const current =
      totals.get(credit.playerId) ??
      {
        playerId: credit.playerId,
        playerName: credit.playerName,
        teamId: credit.teamId,
        totalWpa: 0,
        battingWpa: 0,
        pitchingWpa: 0,
        catchingWpa: 0,
        fieldingWpa: 0,
        baserunningWpa: 0,
        managingWpa: 0,
      };

    current.totalWpa += credit.wpa;
    if (credit.role === "batting") current.battingWpa += credit.wpa;
    if (credit.role === "pitching") current.pitchingWpa += credit.wpa;
    if (credit.role === "catching") current.catchingWpa += credit.wpa;
    if (credit.role === "fielding") current.fieldingWpa += credit.wpa;
    if (credit.role === "baserunning") current.baserunningWpa += credit.wpa;
    if (credit.role === "managing") current.managingWpa += credit.wpa;
    totals.set(credit.playerId, current);
  }

  return Array.from(totals.values())
    .map((total) => ({
      ...total,
      totalWpa: roundWpa(total.totalWpa),
      battingWpa: roundWpa(total.battingWpa),
      pitchingWpa: roundWpa(total.pitchingWpa),
      catchingWpa: roundWpa(total.catchingWpa),
      fieldingWpa: roundWpa(total.fieldingWpa),
      baserunningWpa: roundWpa(total.baserunningWpa),
      managingWpa: roundWpa(total.managingWpa),
    }))
    .sort((left, right) => right.totalWpa - left.totalWpa || left.playerName.localeCompare(right.playerName));
}

export function deriveActualAtBatWpa(
  event: AtBatEvent,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
): WPAResult {
  if (isLegacyStoredAtBatWpa(event)) {
    return storedAtBatWpaResult(event);
  }

  const resolvedExtraPolicy = resolveAtBatExtraInningRunnerPolicy(
    event,
    extraPolicy,
  );
  return calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runnerStateToBases(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
      ...resolvedExtraPolicy,
    },
    {
      outs: event.outsAfter,
      bases: runnerStateToBases(event.runnersAfter),
      homeScore: event.homeScoreAfter,
      awayScore: event.awayScoreAfter,
    },
  );
}

function deriveAtBatCredits(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  context: DerivationContext,
): KblWpaCredit[] {
  if (isSparseArchivedAtBatEvent(event)) {
    const fallbackCredits = deriveArchivedAtBatFallbackCredits(event, context);
    if (fallbackCredits.length > 0) {
      return fallbackCredits;
    }
  }

  const actual = deriveActualAtBatWpa(event, context.totalInnings, context);
  const battingWpa = actual.battingTeamDelta;
  const defensiveWpa = actual.fieldingTeamDelta;

  return [
    ...normalizeCreditsToBudget(
      deriveOffensiveAtBatCredits(
        event,
        battingWpa,
        context.totalInnings,
        context,
        context.includeManagerOverlays,
      ),
      battingWpa,
    ),
    ...normalizeCreditsToBudget(
      deriveDefensiveAtBatCredits(event, fieldingEvents, defensiveWpa, context),
      defensiveWpa,
    ),
  ];
}

function isLegacyStoredAtBatWpa(event: AtBatEvent): boolean {
  return (
    event.wpaModelVersion !== WPA_MODEL_VERSION &&
    Number.isFinite(event.wpa)
  );
}

function storedAtBatWpaResult(event: AtBatEvent): WPAResult {
  const winProbabilityBefore = Number.isFinite(event.winProbabilityBefore)
    ? event.winProbabilityBefore
    : 0.5;
  const winProbabilityAfter = Number.isFinite(event.winProbabilityAfter)
    ? event.winProbabilityAfter
    : winProbabilityBefore;
  const battingTeamDelta = roundWpa(event.wpa);

  return {
    winProbabilityBefore,
    winProbabilityAfter,
    wpa: battingTeamDelta,
    wpaModelVersion: event.wpaModelVersion ?? "legacy-stored",
    homeDelta: roundWpa(winProbabilityAfter - winProbabilityBefore),
    battingTeamDelta,
    fieldingTeamDelta: roundWpa(-battingTeamDelta),
  };
}

function resolveAtBatExtraInningRunnerPolicy(
  event: AtBatEvent,
  fallback?: ExtraInningRunnerPolicy,
): ExtraInningRunnerPolicy {
  return {
    useGhostRunner:
      event.useGhostRunner ?? fallback?.useGhostRunner,
    extraInningRunner:
      event.extraInningRunner ?? fallback?.extraInningRunner,
    extraInningRunnerDelay:
      event.extraInningRunnerDelay ?? fallback?.extraInningRunnerDelay,
  };
}

function deriveOffensiveAtBatCredits(
  event: AtBatEvent,
  battingWpa: number,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
  includeManagerOverlays = false,
): KblWpaCredit[] {
  if (Math.abs(battingWpa) < EPSILON) return [];

  const batter = {
    playerId: event.batterId,
    playerName: event.batterName,
    teamId: event.batterTeamId,
  };

  if (event.result === "ITPHR") {
    return [
      makeCredit(event.eventId, "at_bat", batter, "batting", battingWpa * 0.7, "high", "ITPHR contact share"),
      makeCredit(event.eventId, "at_bat", batter, "baserunning", battingWpa * 0.3, "high", "ITPHR batter-as-runner share"),
    ];
  }

  if (event.result === "SF" || event.result === "SAC") {
    const runners = (event.runnerOutcomes ?? []).filter((outcome) => outcome.toBase !== "out");
    if (runners.length > 0) {
      const runnerBudget = battingWpa * 0.3;
      return [
        makeCredit(event.eventId, "at_bat", batter, "batting", battingWpa - runnerBudget, "high", `${event.result} batter team-play share`),
        ...runners.map((runner) =>
          makeCredit(
            event.eventId,
            "at_bat",
            {
              playerId: runner.runnerId,
              playerName: runner.runnerName,
              teamId: event.batterTeamId,
            },
            "baserunning",
            runnerBudget / runners.length,
            "medium",
            `${event.result} runner advancement share`,
          ),
        ),
      ];
    }
  }

  const runnerDelta = calculateRunnerDelta(
    event,
    battingWpa,
    totalInnings,
    extraPolicy,
  );
  if (!runnerDelta || Math.abs(runnerDelta.delta) < EPSILON) {
    return [makeCredit(event.eventId, "at_bat", batter, "batting", battingWpa, "high", "Batter owns offensive play budget")];
  }

  const runnerCredits: KblWpaCredit[] = [];
  let runnerCollapsedWpa = 0;
  const impacted = runnerDelta.impactedRunners.length > 0
    ? runnerDelta.impactedRunners
    : (event.runnerOutcomes ?? []).filter((outcome) => outcome.toBase !== "end");

  if (impacted.length === 0) {
    return [makeCredit(event.eventId, "at_bat", batter, "batting", battingWpa, "high", "Batter owns offensive play budget")];
  }

  const deltaPerRunner = runnerDelta.delta / impacted.length;
  for (const outcome of impacted) {
    const isNegativeRunnerEvent =
      deltaPerRunner < 0 &&
      (outcome.toBase === "out" || outcome.isTootblan || outcome.isOutAdvancing);
    const isScoreFromFirstOnSingle =
      deltaPerRunner > 0 &&
      event.result === "1B" &&
      outcome.fromBase === "first" &&
      outcome.toBase === "home";
    const runnerShare = isNegativeRunnerEvent
      ? 1
      : isScoreFromFirstOnSingle
        ? 0.6
        : deltaPerRunner > 0
          ? 0.7
          : 1;
    const runnerWpa = deltaPerRunner * runnerShare;
    runnerCollapsedWpa += runnerWpa;

    runnerCredits.push(
      makeCredit(
        event.eventId,
        "at_bat",
        {
          playerId: outcome.runnerId,
          playerName: outcome.runnerName,
          teamId: event.batterTeamId,
        },
        "baserunning",
        runnerWpa,
        outcome.isTootblan || outcome.isOutAdvancing ? "high" : "medium",
        outcome.isTootblan
          ? "TOOTBLAN runner delta"
          : outcome.isOutAdvancing
            ? "Out advancing runner delta"
            : "Runner advancement delta",
      ),
    );

    if (includeManagerOverlays && outcome.isOutAdvancing) {
      runnerCredits.push(
        makeCredit(
          event.eventId,
          "at_bat",
          {
            playerId: `${event.batterTeamId}:manager`,
            playerName: "Team Manager",
            teamId: event.batterTeamId,
          },
          "managing",
          deltaPerRunner * 0.7,
          "medium",
          "Out advancing manager overlay",
          true,
        ),
      );
    }
  }

  return [
    makeCredit(
      event.eventId,
      "at_bat",
      batter,
      "batting",
      battingWpa - runnerCollapsedWpa,
      "high",
      "Batter share after runner delta allocation",
    ),
    ...runnerCredits,
  ];
}

function deriveDefensiveAtBatCredits(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  defensiveWpa: number,
  context: DerivationContext,
): KblWpaCredit[] {
  if (Math.abs(defensiveWpa) < EPSILON) return [];

  const pitcher: PlayerRef = {
    playerId: event.pitcherId,
    playerName: event.pitcherName,
    teamId: event.pitcherTeamId,
  };

  if (event.result === "IBB") {
    return [
      makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "high", "IBB pitcher share"),
      ...(context.includeManagerOverlays
        ? [
            makeCredit(
              event.eventId,
              "at_bat",
              {
                playerId: `${event.pitcherTeamId}:manager`,
                playerName: "Team Manager",
                teamId: event.pitcherTeamId,
              },
              "managing",
              defensiveWpa,
              "medium",
              "IBB manager overlay",
              true,
            ),
          ]
        : []),
    ];
  }

  if (event.result === "BB" || event.result === "HBP") {
    return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "high", `${event.result} pitcher share`)];
  }

  if (STRIKEOUT_RESULTS.has(event.result)) {
    const catcher = resolveCatcher(event, fieldingEvents, context);
    if (!catcher) {
      return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "low", "Strikeout, catcher identity unavailable")];
    }
    return [
      makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa * 0.95, "high", "Strikeout pitcher share"),
      makeCredit(event.eventId, "at_bat", catcher, "catching", defensiveWpa * 0.05, "medium", "Strikeout catcher share"),
    ];
  }

  if (event.result === "WP_K" || event.result === "PB_K") {
    const catcher = resolveCatcher(event, fieldingEvents, context);
    if (event.result === "PB_K" && catcher) {
      return [
        makeCredit(event.eventId, "at_bat", catcher, "catching", defensiveWpa * 0.95, "high", "Passed-ball strikeout catcher blame"),
        makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa * 0.05, "medium", "Passed-ball strikeout pitcher residual"),
      ];
    }
    return [
      makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa * 0.95, "high", "Wild-pitch strikeout pitcher blame"),
      ...(catcher
        ? [makeCredit(event.eventId, "at_bat", catcher, "catching", defensiveWpa * 0.05, "medium", "Wild-pitch strikeout catcher residual")]
        : []),
    ];
  }

  if (event.result === "E" || event.batterReachedOnError || fieldingEvents.some((row) => row.playType === "error")) {
    return normalizeRawUnitsToCredits(
      event.eventId,
      "at_bat",
      defensiveWpa,
      buildErrorRawUnits(event, fieldingEvents, pitcher),
    );
  }

  const attempt = getFieldingAttempt(event, fieldingEvents);
  if (attempt === "robbed_hr") {
    return buildRobbedHrCredits(
      event,
      fieldingEvents,
      defensiveWpa,
      context.totalInnings,
      context,
      pitcher,
    );
  }

  const rescueUnits = buildBadThrowRescueRawUnits(event, fieldingEvents, pitcher);
  if (rescueUnits) {
    return normalizeRawUnitsToCredits(event.eventId, "at_bat", defensiveWpa, rescueUnits);
  }

  if (event.result === "HR") {
    return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "high", "Home run pitcher share")];
  }

  if (HIT_RESULTS.has(event.result)) {
    const baseSave = fieldingEvents.find((row) => row.playType === "base_save");
    if (baseSave) {
      return buildSavedBaseCounterfactualCredits(
        event,
        baseSave,
        defensiveWpa,
        context.totalInnings,
        context,
        pitcher,
      );
    }
    return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "high", "Clean hit pitcher share")];
  }

  if (MADE_OUT_RESULTS.has(event.result)) {
    const shares = getMadeOutDefensiveShares(event, attempt);
    const pitcherCredit = makeCredit(
      event.eventId,
      "at_bat",
      pitcher,
      "pitching",
      defensiveWpa * shares.pitcherShare,
      "high",
      shares.basis,
    );
    const fieldingBudget = defensiveWpa * shares.fieldingShare;
    const fieldingCredits = splitFieldingBudget(event, fieldingEvents, fieldingBudget, shares.basis);

    if (fieldingCredits.length === 0) {
      return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "low", "Made out, fielding identity unavailable")];
    }

    return [pitcherCredit, ...fieldingCredits];
  }

  return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "low", "Fallback defensive pitcher share")];
}

function buildErrorRawUnits(event: AtBatEvent, fieldingEvents: FieldingEvent[], pitcher: PlayerRef): RawUnit[] {
  const errorEvent = fieldingEvents.find((row) => row.playType === "error");
  const chargedPosition = event.batterErrorChargedToPosition ?? (errorEvent ? positionNumber(errorEvent.position) : undefined);
  const errorFielder = chargedPosition
    ? resolveFielderForPosition(event, fieldingEvents, chargedPosition)
    : errorEvent
      ? playerFromFieldingEvent(errorEvent)
      : undefined;

  if (!errorFielder) {
    return [{ ...pitcher, role: "pitching", units: -1, confidence: "low", basis: "Error fallback pitcher/team defensive share" }];
  }

  const errorType = event.batterErrorType ?? inferErrorTypeFromEnrichment(event, chargedPosition);
  const isDifficult =
    errorEvent?.difficulty === "50-50" ||
    errorEvent?.difficulty === "unlikely" ||
    errorEvent?.difficulty === "spectacular";

  if (isDifficult) {
    return [
      { ...pitcher, role: "pitching", units: 0.4, confidence: "medium", basis: "Difficult error pitcher expected-out credit" },
      { ...errorFielder, role: "fielding", units: -1.4, confidence: "medium", basis: "Difficult error fielder blame" },
    ];
  }

  if (errorType === "mental") {
    return [
      { ...pitcher, role: "pitching", units: 0.95, confidence: "high", basis: "Mental error pitcher expected-out credit" },
      { ...errorFielder, role: "fielding", units: -2.2, confidence: "high", basis: "Mental error fielder blame" },
    ];
  }

  if (errorType === "throwing") {
    const sequence = getFieldingSequence(event, fieldingEvents);
    const receiverPosition = sequence.length >= 2 ? sequence[sequence.length - 1] : undefined;
    const receiver = receiverPosition && receiverPosition !== chargedPosition
      ? resolveFielderForPosition(event, fieldingEvents, receiverPosition)
      : undefined;
    return [
      { ...pitcher, role: "pitching", units: 0.95, confidence: "high", basis: "Throwing error pitcher expected-out credit" },
      { ...errorFielder, role: "fielding", units: -2.05, confidence: "high", basis: "Throwing error fielder blame" },
      ...(receiver ? [{ ...receiver, role: "fielding" as const, units: 0.1, confidence: "medium" as const, basis: "Catchable throw receiver effort" }] : []),
    ];
  }

  return [
    { ...pitcher, role: "pitching", units: 0.95, confidence: "high", basis: "Routine error pitcher expected-out credit" },
    { ...errorFielder, role: "fielding", units: -1.95, confidence: "high", basis: "Routine error fielder blame" },
  ];
}

function buildBadThrowRescueRawUnits(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  pitcher: PlayerRef,
): RawUnit[] | null {
  if (!MADE_OUT_RESULTS.has(event.result)) return null;
  const sequence = getFieldingSequence(event, fieldingEvents);
  if (sequence.length < 2 || sequence[sequence.length - 1] !== 3) return null;
  const extraGems = new Set(event.enrichment?.extraGemCreditPositions ?? []);
  const rescuedThrow = event.enrichment?.rescuedThrow || extraGems.has(3);
  if (!rescuedThrow) return null;

  const throwerPosition = sequence.length >= 3 ? sequence[sequence.length - 2] : sequence[0];
  const thrower = resolveFielderForPosition(event, fieldingEvents, throwerPosition);
  const firstBase = resolveFielderForPosition(event, fieldingEvents, 3);

  return [
    { ...pitcher, role: "pitching", units: 0.8, confidence: "medium", basis: "Rescued throw pitcher share" },
    { ...thrower, role: "fielding", units: -0.4, confidence: "medium", basis: "Bad throw rescued by first base" },
    { ...firstBase, role: "fielding", units: 0.6, confidence: "high", basis: "First-base rescued throw" },
  ];
}

function buildRobbedHrCredits(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  defensiveWpa: number,
  totalInnings: number | undefined,
  extraPolicy: ExtraInningRunnerPolicy | undefined,
  pitcher: PlayerRef,
): KblWpaCredit[] {
  const fielder =
    fieldingEvents.find((row) => normalizeAttempt(row.specialPlayType) === "robbed_hr") ??
    fieldingEvents[fieldingEvents.length - 1];

  if (!fielder) {
    return [makeCredit(event.eventId, "at_bat", pitcher, "pitching", defensiveWpa, "low", "Robbed HR fallback pitcher share")];
  }

  const runners = runnerStateToBases(event.runners);
  const runsScored = 1 + Number(runners.first) + Number(runners.second) + Number(runners.third);
  const resolvedExtraPolicy = resolveAtBatExtraInningRunnerPolicy(
    event,
    extraPolicy,
  );
  const counterfactual = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runners,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
      ...resolvedExtraPolicy,
    },
    {
      outs: event.outs,
      bases: { first: false, second: false, third: false },
      homeScore: event.halfInning === "BOTTOM" ? event.homeScore + runsScored : event.homeScore,
      awayScore: event.halfInning === "TOP" ? event.awayScore + runsScored : event.awayScore,
    },
  );
  const pitcherCounterfactual = counterfactual.fieldingTeamDelta;
  const fielderCredit = defensiveWpa - pitcherCounterfactual;

  return [
    makeCredit(event.eventId, "at_bat", pitcher, "pitching", pitcherCounterfactual, "medium", "Counterfactual HR allowed", false, "counterfactual"),
    makeCredit(event.eventId, "at_bat", playerFromFieldingEvent(fielder), "fielding", fielderCredit, "high", "Robbed HR counterfactual save", false, "counterfactual"),
  ];
}

function buildSavedBaseCounterfactualCredits(
  event: AtBatEvent,
  baseSave: FieldingEvent,
  defensiveWpa: number,
  totalInnings: number | undefined,
  extraPolicy: ExtraInningRunnerPolicy | undefined,
  pitcher: PlayerRef,
): KblWpaCredit[] {
  const counterfactualAfter = buildSavedBaseCounterfactualAfterState(event, baseSave);
  if (!counterfactualAfter) {
    return normalizeRawUnitsToCredits(event.eventId, "at_bat", defensiveWpa, [
      { ...pitcher, role: "pitching", units: -1, confidence: "low", basis: "Saved-base fallback pitcher share" },
      { ...playerFromFieldingEvent(baseSave), role: "fielding", units: 0, confidence: "low", basis: "Saved-base fallback fielding context" },
    ]);
  }

  const resolvedExtraPolicy = resolveAtBatExtraInningRunnerPolicy(
    event,
    extraPolicy,
  );
  const counterfactual = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runnerStateToBases(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
      ...resolvedExtraPolicy,
    },
    counterfactualAfter,
  );
  const pitcherCounterfactual = counterfactual.fieldingTeamDelta;
  const fielderCredit = defensiveWpa - pitcherCounterfactual;

  return [
    makeCredit(event.eventId, "at_bat", pitcher, "pitching", pitcherCounterfactual, "medium", "Counterfactual hit/advance allowed", false, "counterfactual"),
    makeCredit(event.eventId, "at_bat", playerFromFieldingEvent(baseSave), "fielding", fielderCredit, "high", "Saved-base counterfactual credit", false, "counterfactual"),
  ];
}

function buildSavedBaseCounterfactualAfterState(
  event: AtBatEvent,
  baseSave: FieldingEvent,
): AfterState | null {
  const after: AfterState = {
    outs: event.outsAfter,
    bases: runnerStateToBases(event.runnersAfter),
    homeScore: event.homeScoreAfter,
    awayScore: event.awayScoreAfter,
  };
  let changed = false;
  const addRun = () => {
    if (event.halfInning === "TOP") after.awayScore += 1;
    else after.homeScore += 1;
  };
  const clearBase = (base: RunnerOutcomeEntry["toBase"] | undefined) => {
    if (base === "first") after.bases.first = false;
    if (base === "second") after.bases.second = false;
    if (base === "third") after.bases.third = false;
  };
  const occupySavedBase = (base: RunnerOutcomeEntry["baseSaved"]) => {
    if (base === "2B") after.bases.second = true;
    if (base === "3B") after.bases.third = true;
    if (base === "HOME") addRun();
  };

  for (const outcome of event.runnerOutcomes ?? []) {
    if (!outcome.heldByOf || !outcome.baseSaved) continue;
    clearBase(outcome.toBase);
    occupySavedBase(outcome.baseSaved);
    changed = true;
  }

  if (!changed && (event.enrichment?.savedRun || baseSave.runsPreventedOrAllowed > 0)) {
    addRun();
    changed = true;
  }

  return changed ? after : null;
}

function getMadeOutDefensiveShares(event: AtBatEvent, attempt: string | undefined): { pitcherShare: number; fieldingShare: number; basis: string } {
  let fieldingShare = 0.05;
  let basis = "Routine made-out split";

  if (event.result === "FC") fieldingShare = 0.1;
  if (event.result === "DP") fieldingShare = 0.2;
  if (event.result === "TP") fieldingShare = 0.4;
  if (event.result === "SAC" || event.result === "SF") fieldingShare = 0.1;

  switch (attempt) {
    case "charging":
      fieldingShare = 0.2;
      basis = "Charging fielding attempt split";
      break;
    case "beat_runner":
      fieldingShare = 0.8;
      basis = "Beat-runner execution split";
      break;
    case "running":
    case "beat_throw":
      fieldingShare = 0.3;
      basis = "Range/execution fielding split";
      break;
    case "diving":
    case "sliding":
    case "leaping":
    case "jumping":
      fieldingShare = 0.75;
      basis = "Gem fielding attempt split";
      break;
    case "over_shoulder":
      fieldingShare = 0.5;
      basis = "Over-shoulder fielding split";
      break;
    case "wall":
      fieldingShare = 0.1;
      basis = "Wall catch split";
      break;
    default:
      break;
  }

  if (!attempt || attempt === "routine") {
    const contact = normalizeContact(event.enrichment?.exitType);
    if (contact === "hard") {
      fieldingShare += 0.05;
      basis = "Hard-contact routine made-out split";
    } else if (contact === "weak") {
      fieldingShare -= 0.02;
      basis = "Weak-contact routine made-out split";
    } else if (contact === "bloop") {
      fieldingShare += 0.03;
      basis = "Bloop-contact made-out split";
    }
  }

  fieldingShare = Math.max(0.01, Math.min(0.95, fieldingShare));
  return {
    pitcherShare: 1 - fieldingShare,
    fieldingShare,
    basis,
  };
}

function splitFieldingBudget(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  fieldingBudget: number,
  basis: string,
): KblWpaCredit[] {
  if (Math.abs(fieldingBudget) < EPSILON) return [];
  const sequence = getFieldingSequence(event, fieldingEvents);
  if (sequence.length === 0) return [];

  const weights = sequenceWeights(event, sequence);
  const totalWeight = Array.from(weights.values()).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return [];

  return Array.from(weights.entries())
    .filter(([, weight]) => weight > 0)
    .map(([position, weight]) =>
      makeCredit(
        event.eventId,
        "at_bat",
        resolveFielderForPosition(event, fieldingEvents, position),
        "fielding",
        fieldingBudget * (weight / totalWeight),
        "high",
        basis,
      ),
    );
}

function sequenceWeights(event: AtBatEvent, sequence: number[]): Map<number, number> {
  const weights = new Map<number, number>();
  const add = (position: number, weight: number) => {
    weights.set(position, (weights.get(position) ?? 0) + weight);
  };

  if (sequence.length === 1) {
    add(sequence[0], 1);
    return weights;
  }

  if (event.result === "DP") {
    if (sequence.length === 1) {
      add(sequence[0], 1);
    } else if (sequence[sequence.length - 1] === 3) {
      const starter = sequence[0];
      const pivot = sequence.length >= 3 ? sequence[1] : sequence[0];
      const extraGems = new Set(event.enrichment?.extraGemCreditPositions ?? []);
      const attempt = getFieldingAttempt(event, []);
      if (attempt && attempt !== "routine" && starter !== 3) {
        add(starter, 0.8);
        add(pivot, 0.2);
      } else if (extraGems.has(pivot)) {
        add(starter, 0.3);
        add(pivot, 0.7);
      } else {
        add(starter, sequence.length === 3 ? 0.45 : 0.5);
        add(pivot, sequence.length === 3 ? 0.55 : 0.5);
      }
    } else {
      add(sequence[0], 0.5);
      add(sequence[sequence.length - 1], 0.5);
    }
    return weights;
  }

  if (event.result === "TP") {
    add(sequence[0], 0.3);
    add(sequence[1] ?? sequence[0], 0.35);
    add(sequence[2] ?? sequence[sequence.length - 1], 0.35);
    return weights;
  }

  if (sequence.length === 2 && sequence[1] === 3) {
    add(sequence[0], 1);
    add(sequence[1], 0);
    return weights;
  }

  if (sequence.length === 2 && sequence[0] === 3 && sequence[1] === 1) {
    add(3, 1);
    add(1, 0);
    return weights;
  }

  const mechanic = normalizeAttempt((event.enrichment as Record<string, unknown> | undefined)?.playMechanic);
  if (mechanic === "relay") {
    add(sequence[0], 0.6);
    add(sequence[1] ?? sequence[0], 0.2);
    add(sequence[sequence.length - 1], 0.2);
    return weights;
  }

  if (mechanic === "rundown") {
    const unique = Array.from(new Set(sequence));
    for (const position of unique) add(position, 1 / unique.length);
    return weights;
  }

  if (mechanic === "tag_play") {
    add(sequence[0], 0.65);
    add(sequence[sequence.length - 1], 0.35);
    return weights;
  }

  add(sequence[0], 0.65);
  add(sequence[sequence.length - 1], 0.35);
  return weights;
}

function calculateRunnerDelta(
  event: AtBatEvent,
  actualBattingWpa: number,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
): { delta: number; impactedRunners: NonNullable<AtBatEvent["runnerOutcomes"]> } | null {
  if (!event.runnerOutcomes || event.runnerOutcomes.length === 0) return null;
  const defaultAfter = buildDefaultAfterState(event);
  if (!defaultAfter) return null;

  const resolvedExtraPolicy = resolveAtBatExtraInningRunnerPolicy(
    event,
    extraPolicy,
  );
  const defaultWpa = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runnerStateToBases(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
      ...resolvedExtraPolicy,
    },
    defaultAfter,
  ).battingTeamDelta;

  const impactedRunners = event.runnerOutcomes.filter((outcome) => {
    const expected = defaultDestinationForRunner(event, outcome.fromBase);
    return outcome.toBase !== expected;
  });

  return {
    delta: actualBattingWpa - defaultWpa,
    impactedRunners,
  };
}

function buildDefaultAfterState(event: AtBatEvent): AfterState | null {
  const basesBefore = runnerStateToBases(event.runners);
  const after = {
    outs: event.outs,
    bases: { first: false, second: false, third: false },
    homeScore: event.homeScore,
    awayScore: event.awayScore,
  };
  const addRun = () => {
    if (event.halfInning === "TOP") after.awayScore += 1;
    else after.homeScore += 1;
  };
  const scoreRunner = (occupied: boolean) => {
    if (occupied) addRun();
  };
  const batterOuts = outsForResult(event.result);
  after.outs = Math.min(3, event.outs + batterOuts);

  switch (event.result) {
    case "HR":
    case "ITPHR":
      scoreRunner(basesBefore.first);
      scoreRunner(basesBefore.second);
      scoreRunner(basesBefore.third);
      addRun();
      break;
    case "1B":
      scoreRunner(basesBefore.third);
      after.bases.third = basesBefore.second;
      after.bases.second = basesBefore.first;
      after.bases.first = true;
      break;
    case "2B":
    case "GRD":
      scoreRunner(basesBefore.third);
      scoreRunner(basesBefore.second);
      after.bases.third = basesBefore.first;
      after.bases.second = true;
      break;
    case "3B":
      scoreRunner(basesBefore.third);
      scoreRunner(basesBefore.second);
      scoreRunner(basesBefore.first);
      after.bases.third = true;
      break;
    case "BB":
    case "IBB":
    case "HBP": {
      if (basesBefore.first && basesBefore.second && basesBefore.third) addRun();
      after.bases.third = basesBefore.third && !(basesBefore.first && basesBefore.second);
      after.bases.third ||= basesBefore.second && basesBefore.first;
      after.bases.second = basesBefore.second && !basesBefore.first;
      after.bases.second ||= basesBefore.first;
      after.bases.first = true;
      break;
    }
    case "E":
    case "D3K":
    case "WP_K":
    case "PB_K":
      scoreRunner(basesBefore.third);
      after.bases.third = basesBefore.second;
      after.bases.second = basesBefore.first;
      after.bases.first = true;
      break;
    case "DP":
      after.outs = Math.min(3, event.outs + 2);
      after.bases.third = basesBefore.third;
      after.bases.second = basesBefore.second;
      break;
    case "TP":
      after.outs = 3;
      after.bases.third = basesBefore.third;
      break;
    case "FC":
      after.bases.third = basesBefore.third;
      after.bases.second = basesBefore.second;
      after.bases.first = true;
      break;
    case "SAC":
      after.bases.third = basesBefore.third || basesBefore.second;
      after.bases.second = basesBefore.first;
      break;
    case "SF":
      scoreRunner(basesBefore.third);
      after.bases.second = basesBefore.second;
      after.bases.first = basesBefore.first;
      break;
    default:
      after.bases = { ...basesBefore };
      break;
  }

  if (after.outs >= 3) {
    after.bases = { first: false, second: false, third: false };
  }

  return after;
}

function defaultDestinationForRunner(event: AtBatEvent, fromBase: "batter" | "first" | "second" | "third"): "first" | "second" | "third" | "home" | "out" | "end" {
  if (fromBase === "batter") {
    if (["1B", "BB", "IBB", "HBP", "E", "FC", "D3K", "WP_K", "PB_K"].includes(event.result)) return "first";
    if (event.result === "2B" || event.result === "GRD") return "second";
    if (event.result === "3B") return "third";
    if (event.result === "HR" || event.result === "ITPHR") return "home";
    return "out";
  }

  if (event.result === "HR" || event.result === "ITPHR" || event.result === "3B") return "home";
  if (event.result === "1B") {
    if (fromBase === "third") return "home";
    if (fromBase === "second") return "third";
    return "second";
  }
  if (event.result === "2B" || event.result === "GRD") {
    if (fromBase === "first") return "third";
    return "home";
  }
  if (event.result === "DP" && fromBase === "first") return "out";
  if (event.result === "TP" && (fromBase === "first" || fromBase === "second")) return "out";
  if (event.result === "FC" && fromBase === "first") return "out";
  if (event.result === "SF" && fromBase === "third") return "home";
  if (event.result === "SAC") {
    if (fromBase === "first") return "second";
    if (fromBase === "second") return "third";
  }
  return fromBase;
}

function deriveBetweenPlayCredits(
  event: BetweenPlayEvent,
  context: {
    totalInnings?: number;
    useGhostRunner?: boolean;
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
    awayTeamId?: string;
    homeTeamId?: string;
  },
): KblWpaCredit[] {
  if (!event.gameState || !event.runnerAction) return [];

  const isTop = event.gameState.halfInning === "TOP";
  const battingTeamId = isTop ? context.awayTeamId ?? "" : context.homeTeamId ?? "";
  const defensiveTeamId = isTop ? context.homeTeamId ?? "" : context.awayTeamId ?? "";
  const beforeBases = {
    first: !!event.gameState.runnersOn?.first,
    second: !!event.gameState.runnersOn?.second,
    third: !!event.gameState.runnersOn?.third,
  };
  const snapshotBases = { ...beforeBases };
  const fromKey = baseNumberToKey(event.runnerAction.fromBase);
  const toKey = baseNumberToKey(event.runnerAction.toBase);
  const runnerSnapshotBase = findRunnerSnapshotBase(
    event.gameState.runnersOn,
    event.runnerAction.runnerId,
  );
  const snapshotLooksAfterSafeScore =
    event.runnerAction.outcome === "safe" &&
    event.runnerAction.toBase === 4 &&
    !!fromKey &&
    !snapshotBases[fromKey];
  const snapshotLooksAfterSafeAdvance =
    event.runnerAction.outcome === "safe" &&
    ((!!toKey &&
      (runnerSnapshotBase === event.runnerAction.toBase ||
        (!!fromKey && !snapshotBases[fromKey] && snapshotBases[toKey]))) ||
      snapshotLooksAfterSafeScore);

  const actualBeforeBases = snapshotLooksAfterSafeAdvance
    ? {
        ...snapshotBases,
        ...(toKey ? { [toKey]: false } : {}),
        ...(fromKey ? { [fromKey]: true } : {}),
      }
    : { ...snapshotBases };
  const afterBases = { ...snapshotBases };
  let outsBefore = event.gameState.outs;
  let outsAfter = event.gameState.outs;
  let homeScoreBefore = event.gameState.score.home;
  let awayScoreBefore = event.gameState.score.away;
  let homeScoreAfter = event.gameState.score.home;
  let awayScoreAfter = event.gameState.score.away;

  if (snapshotLooksAfterSafeAdvance) {
    if (event.runnerAction.toBase === 4) {
      if (isTop) awayScoreBefore = Math.max(0, awayScoreBefore - 1);
      else homeScoreBefore = Math.max(0, homeScoreBefore - 1);
    }
  } else if (event.runnerAction.outcome === "out") {
    if (fromKey) afterBases[fromKey] = false;
    outsAfter += 1;
  } else if (event.runnerAction.toBase === 4) {
    if (fromKey) afterBases[fromKey] = false;
    if (isTop) awayScoreAfter += 1;
    else homeScoreAfter += 1;
  } else {
    if (fromKey) afterBases[fromKey] = false;
    if (toKey) afterBases[toKey] = true;
  }

  if (outsAfter >= 3) {
    afterBases.first = false;
    afterBases.second = false;
    afterBases.third = false;
  }

  const battingWpa = calculateWPA(
    {
      inning: event.gameState.inning,
      isTop,
      outs: outsBefore,
      bases: actualBeforeBases,
      homeScore: homeScoreBefore,
      awayScore: awayScoreBefore,
      totalInnings: event.gameState.totalInnings ?? context.totalInnings,
      useGhostRunner:
        event.gameState.useGhostRunner ?? context.useGhostRunner,
      extraInningRunner:
        event.gameState.extraInningRunner ?? context.extraInningRunner,
      extraInningRunnerDelay:
        event.gameState.extraInningRunnerDelay ??
        context.extraInningRunnerDelay,
    },
    {
      outs: outsAfter,
      bases: afterBases,
      homeScore: homeScoreAfter,
      awayScore: awayScoreAfter,
    },
  ).battingTeamDelta;
  const defensiveWpa = -battingWpa;
  const runner: PlayerRef = {
    playerId: event.runnerAction.runnerId,
    playerName: event.runnerAction.runnerName ?? event.runnerAction.runnerId,
    teamId: battingTeamId,
  };
  const pitcher = event.runnerAttribution?.pitcherId
    ? {
        playerId: event.runnerAttribution.pitcherId,
        playerName: event.runnerAttribution.pitcherName ?? event.runnerAttribution.pitcherId,
        teamId: defensiveTeamId,
      }
    : undefined;
  const catcher = event.runnerAttribution?.catcherId || event.wildPitchOrPassedBall?.catcherId
    ? {
        playerId: event.runnerAttribution?.catcherId ?? event.wildPitchOrPassedBall?.catcherId ?? "",
        playerName: event.runnerAttribution?.catcherName ?? event.runnerAttribution?.catcherId ?? event.wildPitchOrPassedBall?.catcherId ?? "",
        teamId: defensiveTeamId,
      }
    : undefined;
  const fielder = event.runnerAttribution?.fielderId
    ? {
        playerId: event.runnerAttribution.fielderId,
        playerName: event.runnerAttribution.fielderName ?? event.runnerAttribution.fielderId,
        teamId: defensiveTeamId,
      }
    : undefined;

  const credits = [
    makeCredit(event.eventId, "between_play", runner, "baserunning", battingWpa, "high", `${event.type} runner WPA`),
  ];

  if (event.type === "caught_stealing") {
    if (catcher) credits.push(makeCredit(event.eventId, "between_play", catcher, "catching", defensiveWpa * 0.95, "high", "Caught stealing catcher share"));
    if (pitcher) credits.push(makeCredit(event.eventId, "between_play", pitcher, "pitching", defensiveWpa * (catcher ? 0.05 : 1), "medium", "Caught stealing pitcher share"));
  } else if (event.type === "stolen_base") {
    if (pitcher) credits.push(makeCredit(event.eventId, "between_play", pitcher, "pitching", defensiveWpa * 0.55, "medium", "Stolen base pitcher share"));
    if (catcher) credits.push(makeCredit(event.eventId, "between_play", catcher, "catching", defensiveWpa * (pitcher ? 0.45 : 1), "medium", "Stolen base catcher share"));
  } else if (event.type === "wild_pitch" || event.type === "balk") {
    if (pitcher) credits.push(makeCredit(event.eventId, "between_play", pitcher, "pitching", defensiveWpa, "high", `${event.type} pitcher share`));
  } else if (event.type === "passed_ball") {
    if (catcher) credits.push(makeCredit(event.eventId, "between_play", catcher, "catching", defensiveWpa, "high", "Passed ball catcher share"));
  } else if (event.type === "pickoff") {
    if (pitcher) credits.push(makeCredit(event.eventId, "between_play", pitcher, "pitching", defensiveWpa * 0.8, "medium", "Pickoff pitcher share"));
    if (fielder) credits.push(makeCredit(event.eventId, "between_play", fielder, "fielding", defensiveWpa * (pitcher ? 0.2 : 1), "medium", "Pickoff tag fielder share"));
  } else if (fielder) {
    credits.push(makeCredit(event.eventId, "between_play", fielder, "fielding", defensiveWpa, "medium", "Runner advance fielder attribution"));
  }

  const offensive = normalizeCreditsToBudget(credits.filter((credit) => credit.teamId === battingTeamId), battingWpa);
  const defensive = normalizeCreditsToBudget(credits.filter((credit) => credit.teamId !== battingTeamId), defensiveWpa);
  return [...offensive, ...defensive];
}

function normalizeRawUnitsToCredits(
  eventId: string,
  source: "at_bat" | "between_play",
  budget: number,
  units: RawUnit[],
): KblWpaCredit[] {
  const rawTotal = units.reduce((sum, unit) => sum + unit.units, 0);
  if (Math.abs(rawTotal) < EPSILON) return [];
  if (budget * rawTotal < 0) {
    const unitMagnitudeTotal = units.reduce((sum, unit) => sum + Math.abs(unit.units), 0);
    if (unitMagnitudeTotal < EPSILON) return [];
    const magnitudeScale = Math.abs(budget) / unitMagnitudeTotal;
    const signedCredits = units.map((unit) =>
      makeCredit(
        eventId,
        source,
        unit,
        unit.role,
        unit.units * magnitudeScale,
        unit.confidence,
        unit.basis,
        false,
        "raw_unit",
      ),
    );
    const signedSum = signedCredits.reduce((sum, credit) => sum + credit.wpa, 0);
    const diff = budget - signedSum;
    const diffDirection = Math.sign(diff);
    const balancingCredit =
      [...signedCredits].reverse().find((credit) => Math.sign(credit.wpa) === diffDirection) ??
      signedCredits[signedCredits.length - 1];

    return signedCredits.map((credit) =>
      credit === balancingCredit
        ? { ...credit, wpa: roundWpa(credit.wpa + diff) }
        : { ...credit, wpa: roundWpa(credit.wpa) },
    );
  }
  const scale = budget / rawTotal;
  return units.map((unit) =>
    makeCredit(eventId, source, unit, unit.role, unit.units * scale, unit.confidence, unit.basis, false, "raw_unit"),
  );
}

function normalizeCreditsToBudget(credits: KblWpaCredit[], budget: number): KblWpaCredit[] {
  if (credits.length === 0) return credits;
  const collapsedCredits = credits.filter((credit) => !credit.isOverlay);
  if (collapsedCredits.length === 0) return credits;

  const sum = collapsedCredits.reduce((total, credit) => total + credit.wpa, 0);
  const diff = budget - sum;
  if (Math.abs(diff) < EPSILON) {
    return credits.map((credit) => ({ ...credit, wpa: roundWpa(credit.wpa) }));
  }

  const lastCollapsed = collapsedCredits[collapsedCredits.length - 1];
  return credits.map((credit) =>
    credit === lastCollapsed
      ? { ...credit, wpa: roundWpa(credit.wpa + diff) }
      : { ...credit, wpa: roundWpa(credit.wpa) },
  );
}

function makeCredit(
  eventId: string,
  source: "at_bat" | "between_play",
  player: PlayerRef,
  role: KblWpaRole,
  wpa: number,
  confidence: KblWpaConfidence,
  basis: string,
  isOverlay = false,
  allocationMode: KblWpaAllocationMode = isOverlay ? "overlay" : "ratio",
): KblWpaCredit {
  return {
    eventId,
    source,
    playerId: player.playerId,
    playerName: player.playerName,
    teamId: player.teamId,
    role,
    wpa,
    confidence,
    basis,
    allocationMode,
    ...(isOverlay ? { isOverlay: true } : {}),
  };
}

function getFieldingSequence(event: AtBatEvent, fieldingEvents: FieldingEvent[]): number[] {
  const sequence = event.enrichment?.fieldingSequence;
  if (sequence && sequence.length > 0) return sequence;
  return fieldingEvents
    .map((row) => positionNumber(row.position))
    .filter((position): position is number => typeof position === "number");
}

function getFieldingAttempt(event: AtBatEvent, fieldingEvents: FieldingEvent[]): string | undefined {
  const explicit = normalizeAttempt(event.enrichment?.fieldingPlayType);
  if (explicit) return explicit;
  const special = fieldingEvents.map((row) => normalizeAttempt(row.specialPlayType)).find(Boolean);
  if (special) return special;
  return undefined;
}

function normalizeAttempt(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (normalized === "wall_catch") return "wall";
  if (normalized === "robbed_hr") return "robbed_hr";
  if (normalized === "over_shoulder") return "over_shoulder";
  if (normalized === "missed_dive" || normalized === "missed_leap" || normalized === "failed_robbery") return normalized;
  return normalized;
}

function normalizeContact(value: unknown): "weak" | "normal" | "hard" | "bloop" | "bunt" {
  if (typeof value !== "string") return "normal";
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("weak")) return "weak";
  if (normalized.includes("hard")) return "hard";
  if (normalized.includes("bloop")) return "bloop";
  if (normalized.includes("bunt")) return "bunt";
  return "normal";
}

function resolveCatcher(
  event: AtBatEvent,
  fieldingEvents: FieldingEvent[],
  context: DerivationContext,
): PlayerRef | null {
  const catcher = fieldingEvents.find((row) => row.position === "C");
  if (catcher) return playerFromFieldingEvent(catcher);

  if (event.catcherContext?.playerId) {
    return {
      playerId: event.catcherContext.playerId,
      playerName: event.catcherContext.playerName || event.catcherContext.playerId,
      teamId: event.catcherContext.teamId || event.pitcherTeamId,
    };
  }

  const side =
    event.pitcherTeamId === context.homeTeamId
      ? "home"
      : event.pitcherTeamId === context.awayTeamId
        ? "away"
        : undefined;
  const lineup = side ? context.startingLineups?.[side] : undefined;
  const lineupCatcher = lineup?.find((player) => {
    const position = (player.position ?? player.fieldPosition ?? "").toUpperCase();
    return position === "C";
  });

  return lineupCatcher
    ? {
        playerId: lineupCatcher.playerId,
        playerName: lineupCatcher.playerName,
        teamId: event.pitcherTeamId,
      }
    : null;
}

function resolveFielderForPosition(event: AtBatEvent, fieldingEvents: FieldingEvent[], position: number): PlayerRef {
  const row = fieldingEvents.find((fieldingEvent) => positionNumber(fieldingEvent.position) === position);
  if (row) return playerFromFieldingEvent(row);
  if (position === 1) {
    return {
      playerId: event.pitcherId,
      playerName: event.pitcherName,
      teamId: event.pitcherTeamId,
    };
  }
  const label = POSITION_LABELS[position] ?? `POS ${position}`;
  return {
    playerId: `${event.pitcherTeamId}:position:${position}`,
    playerName: label,
    teamId: event.pitcherTeamId,
  };
}

function playerFromFieldingEvent(row: FieldingEvent): PlayerRef {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.teamId,
  };
}

function positionNumber(position: Position): number | undefined {
  return POSITION_TO_NUMBER[position];
}

function inferErrorTypeFromEnrichment(
  event: AtBatEvent,
  chargedPosition: number | undefined,
): "fielding" | "throwing" | "mental" | undefined {
  return event.enrichment?.errors?.find((error) => error.position === chargedPosition)?.type;
}

function runnerStateToBases(
  runners?: RunnerState | null,
): { first: boolean; second: boolean; third: boolean } {
  return {
    first: !!runners?.first,
    second: !!runners?.second,
    third: !!runners?.third,
  };
}

function outsForResult(result: AtBatResult): number {
  if (["K", "Kc", "\uA740", "GO", "FO", "FLO", "LO", "PO", "FC", "SF", "SAC", "D3K"].includes(result)) return 1;
  if (result === "DP") return 2;
  if (result === "TP") return 3;
  return 0;
}

function baseNumberToKey(base: number): "first" | "second" | "third" | null {
  if (base === 1) return "first";
  if (base === 2) return "second";
  if (base === 3) return "third";
  return null;
}

function findRunnerSnapshotBase(
  runnersOn: NonNullable<BetweenPlayEvent["gameState"]>["runnersOn"],
  runnerId: string,
): 1 | 2 | 3 | null {
  if (!runnersOn) return null;
  if (runnersOn.first === runnerId) return 1;
  if (runnersOn.second === runnerId) return 2;
  if (runnersOn.third === runnerId) return 3;
  return null;
}

function roundWpa(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
