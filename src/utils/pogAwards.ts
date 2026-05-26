import type {
  ManagerDecisionRecord,
  ManagerDeploymentStintRecord,
  ManagerLineupDeltaRecord,
} from "../types/managerWpa";
import {
  aggregateKblWpaCredits,
  type KblWpaCredit,
  type KblWpaPlayerTotal,
} from "./kblWpaAttribution";
import { isActiveScoringManagerDecision } from "./managerValueTrace";
import type { StoredPlayersOfTheGame } from "./playersOfTheGame";
import { formatWpaPoints } from "./wpaDisplay";

export const MIN_POSITIVE_WPA = 0.005;

export type PogAwardType =
  | "overall"
  | "best_hitter"
  | "best_pitcher"
  | "best_baserunner"
  | "best_fielder"
  | "best_manager"
  | "team_standout";

export type PogDataQualitySource =
  | "kbl_wpa"
  | "legacy_at_bat_wpa"
  | "stored_pog"
  | "manager_value"
  | "box_score_fallback"
  | "unavailable";

export type PogAwardSource =
  | "kbl_wpa"
  | "legacy_at_bat_wpa"
  | "stored_pog"
  | "manager_value";

export interface PogDataQuality {
  source: PogDataQualitySource;
  warnings: string[];
}

export interface PogAward {
  awardType: PogAwardType;
  points: number;
  statRole: PogAwardStatRole;
  playerId?: string;
  playerName?: string;
  managerId?: string;
  managerName?: string;
  teamId: string;
  value: number;
  valueLabel: string;
  explanation: string;
  source: PogAwardSource;
}

export type PogAwardStatRole =
  | "hitter"
  | "pitcher"
  | "baserunner"
  | "fielder"
  | "manager";

export interface PogAwardBattingStatLine {
  ab: number;
  h: number;
  r: number;
  rbi: number;
  bb: number;
  k: number;
}

export interface PogAwardPitchingStatLine {
  outsRecorded: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
}

export interface PogAwardStatLineInput {
  battingStats?: PogAwardBattingStatLine;
  pitchingStats?: PogAwardPitchingStatLine;
}

export interface PogLegacyContext {
  rank: "second" | "third";
  playerId: string;
  playerName?: string;
  teamId?: string;
  source: "stored_pog";
}

export interface PogManagerValueTotal {
  managerId: string;
  managerName: string;
  teamId: string;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
  managerValue: number;
}

export interface PogAwardSet {
  awards: PogAward[];
  overall?: PogAward;
  playerRoleAwards: PogAward[];
  managerAward?: PogAward;
  teamStandouts: PogAward[];
  legacyContext: PogLegacyContext[];
  playerTotals: KblWpaPlayerTotal[];
  managerTotals: PogManagerValueTotal[];
  dataQuality: PogDataQuality;
}

export interface PogPlayerRef {
  playerId: string;
  playerName: string;
  teamId: string;
}

export interface PogManagerProfileRef {
  managerId: string;
  displayName: string;
}

export interface PogPlayerStatLike {
  playerName: string;
  teamId: string;
}

export interface PogPitcherStatLike {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
}

export interface GetGamePogAwardSetInput {
  kblWpaCredits?: KblWpaCredit[];
  playersOfTheGame?: StoredPlayersOfTheGame;
  pogPlayerId?: string;
  playerStats?: Record<string, PogPlayerStatLike>;
  pitcherGameStats?: PogPitcherStatLike[];
  playerRefs?: PogPlayerRef[];
  managerProfiles?: PogManagerProfileRef[];
  managerDecisions?: ManagerDecisionRecord[];
  managerDeploymentStints?: ManagerDeploymentStintRecord[];
  managerLineupDeltas?: ManagerLineupDeltaRecord[];
  eventLogAvailable?: boolean;
}

interface ManagerWorkingTotal {
  managerId: string;
  teamId: string;
  tacticalManagerWpa: number;
  deploymentWpa: number;
  lineupDeltaWpa: number;
}

type RoleAwardConfig = {
  awardType: Extract<
    PogAwardType,
    "best_hitter" | "best_pitcher" | "best_baserunner" | "best_fielder"
  >;
  label: string;
  value: (total: KblWpaPlayerTotal) => number;
};

const ROLE_AWARD_CONFIGS: RoleAwardConfig[] = [
  {
    awardType: "best_hitter",
    label: "Best Hitter",
    value: (total) => total.battingWpa,
  },
  {
    awardType: "best_pitcher",
    label: "Best Pitcher",
    value: (total) => total.pitchingWpa,
  },
  {
    awardType: "best_baserunner",
    label: "Best Baserunner",
    value: (total) => total.baserunningWpa,
  },
  {
    awardType: "best_fielder",
    label: "Best Fielder",
    value: (total) => roundWpa(total.fieldingWpa + total.catchingWpa),
  },
];

const POG_AWARD_DISPLAY_LABELS: Record<PogAwardType, string> = {
  overall: "Overall POG",
  best_hitter: "Best Hitter",
  best_pitcher: "Best Pitcher",
  best_baserunner: "Best Baserunner",
  best_fielder: "Best Fielder",
  best_manager: "Best Manager",
  team_standout: "Team Standout",
};

export function getPogAwardDisplayLabel(awardType: PogAwardType): string {
  return POG_AWARD_DISPLAY_LABELS[awardType];
}

export function getPogAwardPointsLabel(award: PogAward): string {
  if (award.points === 0) {
    return "Display only";
  }

  return `${award.points} ${award.points === 1 ? "pt" : "pts"}`;
}

export function getPogAwardStatLineItems(
  award: PogAward,
  input: PogAwardStatLineInput = {},
): string[] {
  switch (award.statRole) {
    case "pitcher":
      if (input.pitchingStats) {
        return [
          `${formatPogInnings(input.pitchingStats.outsRecorded)} IP`,
          `${input.pitchingStats.strikeoutsThrown} K`,
          `${input.pitchingStats.earnedRuns} ER`,
        ];
      }
      return [`Pitching ${award.valueLabel}`];
    case "baserunner":
      return [`Baserunning ${award.valueLabel}`];
    case "fielder":
      return [`Fielding ${award.valueLabel}`];
    case "manager":
      return [award.valueLabel];
    case "hitter":
    default:
      if (input.battingStats) {
        return [
          `${input.battingStats.h}-${input.battingStats.ab}`,
          `${input.battingStats.bb} BB`,
          `${input.battingStats.k} SO`,
          `${input.battingStats.rbi} RBI`,
          `${input.battingStats.r} R`,
        ];
      }
      return [`Batting ${award.valueLabel}`];
  }
}

export function getGamePogAwardSet(input: GetGamePogAwardSetInput): PogAwardSet {
  const warnings: string[] = [];
  if (input.eventLogAvailable === false) {
    warnings.push("Event log unavailable; KBL WPA role awards may be unavailable.");
  }

  const playerRefs = buildPlayerRefMap(input);
  const creditBuckets = splitPlayerKblWpaCredits(input.kblWpaCredits ?? []);
  const managerTotals = deriveManagerTotals(input);
  const managerAward = buildBestManagerAward(managerTotals);
  const storedOverallId = input.playersOfTheGame?.first ?? input.pogPlayerId;
  const managerRecordsAvailable = hasManagerRecords(input);

  if (creditBuckets.full.length > 0) {
    if (creditBuckets.legacy.length > 0) {
      warnings.push(
        "Ignored archived at-bat WPA fallback credits while deriving full KBL WPA awards.",
      );
    }

    const playerTotals = applyPlayerRefsToTotals(
      aggregateKblWpaCredits(creditBuckets.full),
      playerRefs,
    );
    const fullAwardSet = buildKblWpaAwardSet({
      playerTotals,
      managerAward,
      managerTotals,
      warnings,
      source: "kbl_wpa",
    });

    if (!fullAwardSet.overall) {
      fullAwardSet.dataQuality.warnings.push(
        "No player cleared the meaningful positive WPA threshold for Overall POG.",
      );
    }

    return fullAwardSet;
  }

  if (creditBuckets.legacy.length > 0) {
    warnings.push(
      "Using archived at-bat WPA fallback for limited Overall POG only; role awards are unavailable.",
    );
    const playerTotals = applyPlayerRefsToTotals(
      aggregateKblWpaCredits(creditBuckets.legacy),
      playerRefs,
    );
    const overallTotal = topMeaningfulPlayerTotal(playerTotals);
    const overall = overallTotal
      ? buildPlayerAward({
          awardType: "overall",
          points: 3,
          total: overallTotal,
          value: overallTotal.totalWpa,
          valueLabelSuffix: "legacy batting WPA",
          explanation:
            "Legacy Overall POG from archived at-bat WPA fallback; secondary role awards are not derived from fallback credits.",
          source: "legacy_at_bat_wpa",
        })
      : undefined;

    if (!overall && storedOverallId) {
      warnings.push(
        "Archived at-bat WPA fallback did not clear the positive threshold; using stored legacy POG.",
      );
      const overallRef = resolvePlayerRef(storedOverallId, playerRefs);
      return buildAwardSet({
        overall: buildStoredOverallAward(
          storedOverallId,
          overallRef,
          getStoredOverallStatRole(storedOverallId, input),
        ),
        playerRoleAwards: [],
        managerAward,
        teamStandouts: [],
        legacyContext: buildStoredLegacyContext(input.playersOfTheGame, playerRefs),
        playerTotals,
        managerTotals,
        dataQuality: { source: "stored_pog", warnings },
      });
    }

    return buildAwardSet({
      overall,
      playerRoleAwards: [],
      managerAward,
      teamStandouts: [],
      legacyContext: [],
      playerTotals,
      managerTotals,
      dataQuality: { source: "legacy_at_bat_wpa", warnings },
    });
  }

  if (storedOverallId) {
    warnings.push(
      "Using stored legacy Players of the Game only; KBL WPA role awards are unavailable.",
    );
    const overallRef = resolvePlayerRef(storedOverallId, playerRefs);
    const overall = buildStoredOverallAward(
      storedOverallId,
      overallRef,
      getStoredOverallStatRole(storedOverallId, input),
    );

    return buildAwardSet({
      overall,
      playerRoleAwards: [],
      managerAward,
      teamStandouts: [],
      legacyContext: buildStoredLegacyContext(input.playersOfTheGame, playerRefs),
      playerTotals: [],
      managerTotals,
      dataQuality: { source: "stored_pog", warnings },
    });
  }

  if (managerRecordsAvailable) {
    if (managerAward) {
      warnings.push(
        "Only committed Manager Value records were available; player POG awards are unavailable.",
      );
    } else if (managerTotals.length > 0) {
      warnings.push(
        "Manager Value records were available, but no manager cleared the meaningful positive threshold for Best Manager.",
      );
    } else {
      warnings.push(
        "Manager records were available, but no committed Manager Value totals were available.",
      );
    }

    return buildAwardSet({
      playerRoleAwards: [],
      managerAward,
      teamStandouts: [],
      legacyContext: [],
      playerTotals: [],
      managerTotals,
      dataQuality: { source: "manager_value", warnings },
    });
  }

  warnings.push("No usable KBL WPA credits or stored POG ids were available.");
  return buildAwardSet({
    playerRoleAwards: [],
    managerAward,
    teamStandouts: [],
    legacyContext: [],
    playerTotals: [],
    managerTotals,
    dataQuality: { source: "unavailable", warnings },
  });
}

function hasManagerRecords(input: GetGamePogAwardSetInput): boolean {
  return (
    (input.managerDecisions?.length ?? 0) > 0 ||
    (input.managerDeploymentStints?.length ?? 0) > 0 ||
    (input.managerLineupDeltas?.length ?? 0) > 0
  );
}

function splitPlayerKblWpaCredits(credits: KblWpaCredit[]): {
  full: KblWpaCredit[];
  legacy: KblWpaCredit[];
} {
  const full: KblWpaCredit[] = [];
  const legacy: KblWpaCredit[] = [];

  for (const credit of credits) {
    if (!Number.isFinite(credit.wpa)) continue;
    if (credit.isOverlay || credit.role === "managing") continue;

    if (isLegacyAtBatWpaCredit(credit)) {
      legacy.push(credit);
    } else {
      full.push(credit);
    }
  }

  return { full, legacy };
}

function isLegacyAtBatWpaCredit(credit: KblWpaCredit): boolean {
  const basis = credit.basis.trim().toLowerCase();
  return (
    credit.source === "at_bat" &&
    credit.role === "batting" &&
    credit.confidence === "low" &&
    (basis === "archived batting wpa fallback" ||
      basis.includes("legacy") ||
      basis.includes("fallback"))
  );
}

function buildKblWpaAwardSet(input: {
  playerTotals: KblWpaPlayerTotal[];
  managerAward?: PogAward;
  managerTotals: PogManagerValueTotal[];
  warnings: string[];
  source: "kbl_wpa";
}): PogAwardSet {
  const overallTotal = topMeaningfulPlayerTotal(input.playerTotals);
  const overall = overallTotal
    ? buildPlayerAward({
        awardType: "overall",
        points: 3,
        total: overallTotal,
        value: overallTotal.totalWpa,
        valueLabelSuffix: "KBL WPA",
        explanation:
          "Highest meaningful positive total player KBL WPA across batting, pitching, fielding, baserunning, and catching.",
        source: input.source,
      })
    : undefined;
  const overallPlayerId = overall?.playerId;

  const playerRoleAwards = ROLE_AWARD_CONFIGS.flatMap((config) => {
    const winner = topMeaningfulRoleTotal(
      input.playerTotals,
      config.value,
      overallPlayerId,
    );
    if (!winner) return [];

    return [
      buildPlayerAward({
        awardType: config.awardType,
        points: 1,
        total: winner.total,
        value: winner.value,
        valueLabelSuffix: "KBL WPA",
        explanation: `${config.label} from highest meaningful positive role WPA, excluding the Overall POG.`,
        source: input.source,
      }),
    ];
  });

  return buildAwardSet({
    overall,
    playerRoleAwards,
    managerAward: input.managerAward,
    teamStandouts: buildTeamStandouts(input.playerTotals, input.source),
    legacyContext: [],
    playerTotals: input.playerTotals,
    managerTotals: input.managerTotals,
    dataQuality: { source: input.source, warnings: input.warnings },
  });
}

function topMeaningfulPlayerTotal(
  totals: KblWpaPlayerTotal[],
): KblWpaPlayerTotal | undefined {
  return [...totals]
    .filter((total) => isMeaningfulPositive(total.totalWpa))
    .sort(comparePlayerTotalsByValue((total) => total.totalWpa))[0];
}

function topMeaningfulRoleTotal(
  totals: KblWpaPlayerTotal[],
  getValue: (total: KblWpaPlayerTotal) => number,
  excludedPlayerId?: string,
): { total: KblWpaPlayerTotal; value: number } | undefined {
  return totals
    .map((total) => ({ total, value: getValue(total) }))
    .filter(
      ({ total, value }) =>
        total.playerId !== excludedPlayerId && isMeaningfulPositive(value),
    )
    .sort((left, right) => {
      return (
        right.value - left.value ||
        left.total.playerName.localeCompare(right.total.playerName) ||
        left.total.playerId.localeCompare(right.total.playerId)
      );
    })[0];
}

function buildPlayerAward(input: {
  awardType: PogAwardType;
  points: number;
  total: KblWpaPlayerTotal;
  value: number;
  valueLabelSuffix: string;
  explanation: string;
  source: Extract<PogAwardSource, "kbl_wpa" | "legacy_at_bat_wpa">;
}): PogAward {
  return {
    awardType: input.awardType,
    points: input.points,
    statRole: getPlayerAwardStatRole(input.awardType, input.total),
    playerId: input.total.playerId,
    playerName: input.total.playerName,
    teamId: input.total.teamId,
    value: roundWpa(input.value),
    valueLabel: `${formatSignedWpa(input.value)} ${input.valueLabelSuffix}`,
    explanation: input.explanation,
    source: input.source,
  };
}

function buildStoredOverallAward(
  playerId: string,
  playerRef: PogPlayerRef | undefined,
  statRole: PogAwardStatRole,
): PogAward {
  return {
    awardType: "overall",
    points: 3,
    statRole,
    playerId,
    playerName: playerRef?.playerName,
    teamId: playerRef?.teamId ?? "",
    value: 0,
    valueLabel: "Stored legacy POG",
    explanation:
      "Legacy stored Players of the Game first-place entry; no role awards are inferred.",
    source: "stored_pog",
  };
}

function getStoredOverallStatRole(
  playerId: string,
  input: GetGamePogAwardSetInput,
): PogAwardStatRole {
  if (
    input.pitcherGameStats?.some((pitcher) => pitcher.pitcherId === playerId)
  ) {
    return "pitcher";
  }

  return "hitter";
}

function buildTeamStandouts(
  playerTotals: KblWpaPlayerTotal[],
  source: Extract<PogAwardSource, "kbl_wpa" | "legacy_at_bat_wpa">,
): PogAward[] {
  const byTeam = new Map<string, KblWpaPlayerTotal>();
  for (const total of playerTotals) {
    if (!isMeaningfulPositive(total.totalWpa)) continue;

    const current = byTeam.get(total.teamId);
    if (!current || comparePlayerTotalsByValue((entry) => entry.totalWpa)(total, current) < 0) {
      byTeam.set(total.teamId, total);
    }
  }

  return Array.from(byTeam.values())
    .sort((left, right) => left.teamId.localeCompare(right.teamId))
    .map((total) =>
      buildPlayerAward({
        awardType: "team_standout",
        points: 0,
        total,
        value: total.totalWpa,
        valueLabelSuffix: source === "kbl_wpa" ? "KBL WPA" : "legacy batting WPA",
        explanation:
          "Team Standout is display-only in v1 and does not add POG points.",
        source,
      }),
    );
}

function buildStoredLegacyContext(
  stored: StoredPlayersOfTheGame | undefined,
  playerRefs: Map<string, PogPlayerRef>,
): PogLegacyContext[] {
  return (["second", "third"] as const).flatMap((rank) => {
    const playerId = stored?.[rank];
    if (!playerId) return [];
    const ref = resolvePlayerRef(playerId, playerRefs);
    return [
      {
        rank,
        playerId,
        playerName: ref?.playerName,
        teamId: ref?.teamId,
        source: "stored_pog",
      },
    ];
  });
}

function deriveManagerTotals(input: GetGamePogAwardSetInput): PogManagerValueTotal[] {
  const profileById = new Map(
    (input.managerProfiles ?? []).map((profile) => [
      profile.managerId,
      profile.displayName,
    ]),
  );
  const totals = new Map<string, ManagerWorkingTotal>();

  for (const decision of input.managerDecisions ?? []) {
    if (!isActiveScoringManagerDecision(decision)) continue;
    const total = getManagerWorkingTotal(totals, decision.managerId, decision.teamId);
    total.tacticalManagerWpa += decision.managerWpa;
  }

  for (const stint of input.managerDeploymentStints ?? []) {
    if (!isResolvedManagerDeploymentStint(stint)) continue;
    const total = getManagerWorkingTotal(totals, stint.managerId, stint.teamId);
    total.deploymentWpa += stint.managerDeploymentWpa;
  }

  for (const delta of input.managerLineupDeltas ?? []) {
    if (!Number.isFinite(delta.managerWpa)) continue;
    const total = getManagerWorkingTotal(totals, delta.managerId, delta.teamId);
    total.lineupDeltaWpa += delta.managerWpa;
  }

  return Array.from(totals.values())
    .map((total) => {
      const tacticalManagerWpa = roundWpa(total.tacticalManagerWpa);
      const deploymentWpa = roundWpa(total.deploymentWpa);
      const lineupDeltaWpa = roundWpa(total.lineupDeltaWpa);
      return {
        managerId: total.managerId,
        managerName: profileById.get(total.managerId) ?? titleCase(total.managerId),
        teamId: total.teamId,
        tacticalManagerWpa,
        deploymentWpa,
        lineupDeltaWpa,
        managerValue: roundWpa(
          tacticalManagerWpa + deploymentWpa + lineupDeltaWpa,
        ),
      };
    })
    .sort(
      (left, right) =>
        right.managerValue - left.managerValue ||
        left.managerName.localeCompare(right.managerName) ||
        left.managerId.localeCompare(right.managerId),
    );
}

function getManagerWorkingTotal(
  totals: Map<string, ManagerWorkingTotal>,
  managerId: string,
  teamId: string,
): ManagerWorkingTotal {
  const key = `${managerId}::${teamId}`;
  const current = totals.get(key);
  if (current) return current;

  const created = {
    managerId,
    teamId,
    tacticalManagerWpa: 0,
    deploymentWpa: 0,
    lineupDeltaWpa: 0,
  };
  totals.set(key, created);
  return created;
}

function isResolvedManagerDeploymentStint(
  stint: ManagerDeploymentStintRecord,
): boolean {
  return (
    Number.isFinite(stint.managerDeploymentWpa) &&
    (Boolean(stint.closeReason) ||
      Boolean(stint.closedAtEventId) ||
      typeof stint.closedAtEventIndex === "number")
  );
}

function buildBestManagerAward(
  managerTotals: PogManagerValueTotal[],
): PogAward | undefined {
  const winner = managerTotals.find((total) =>
    isMeaningfulPositive(total.managerValue),
  );
  if (!winner) return undefined;

  return {
    awardType: "best_manager",
    points: 1,
    statRole: "manager",
    managerId: winner.managerId,
    managerName: winner.managerName,
    teamId: winner.teamId,
    value: winner.managerValue,
    valueLabel: `${formatSignedWpa(winner.managerValue)} Manager Value`,
    explanation:
      "Best Manager from committed tactical Manager WPA, deployment WPA, and lineup delta WPA.",
    source: "manager_value",
  };
}

function buildAwardSet(input: {
  overall?: PogAward;
  playerRoleAwards: PogAward[];
  managerAward?: PogAward;
  teamStandouts: PogAward[];
  legacyContext: PogLegacyContext[];
  playerTotals: KblWpaPlayerTotal[];
  managerTotals: PogManagerValueTotal[];
  dataQuality: PogDataQuality;
}): PogAwardSet {
  return {
    awards: [
      ...compact([input.overall]),
      ...input.playerRoleAwards,
      ...compact([input.managerAward]),
      ...input.teamStandouts,
    ],
    overall: input.overall,
    playerRoleAwards: input.playerRoleAwards,
    managerAward: input.managerAward,
    teamStandouts: input.teamStandouts,
    legacyContext: input.legacyContext,
    playerTotals: input.playerTotals,
    managerTotals: input.managerTotals,
    dataQuality: input.dataQuality,
  };
}

function buildPlayerRefMap(input: GetGamePogAwardSetInput): Map<string, PogPlayerRef> {
  const refs = new Map<string, PogPlayerRef>();

  for (const ref of input.playerRefs ?? []) {
    refs.set(ref.playerId, ref);
  }

  for (const [playerId, stats] of Object.entries(input.playerStats ?? {})) {
    refs.set(playerId, {
      playerId,
      playerName: stats.playerName,
      teamId: stats.teamId,
    });
  }

  for (const pitcher of input.pitcherGameStats ?? []) {
    refs.set(pitcher.pitcherId, {
      playerId: pitcher.pitcherId,
      playerName: pitcher.pitcherName,
      teamId: pitcher.teamId,
    });
  }

  return refs;
}

function resolvePlayerRef(
  playerId: string,
  playerRefs: Map<string, PogPlayerRef>,
): PogPlayerRef | undefined {
  return playerRefs.get(playerId);
}

function applyPlayerRefsToTotals(
  totals: KblWpaPlayerTotal[],
  playerRefs: Map<string, PogPlayerRef>,
): KblWpaPlayerTotal[] {
  return totals
    .map((total) => {
      const ref = resolvePlayerRef(total.playerId, playerRefs);
      if (!ref) return total;

      const hasUsefulName =
        total.playerName.trim().length > 0 &&
        total.playerName !== total.playerId;

      return {
        ...total,
        playerName: hasUsefulName ? total.playerName : ref.playerName,
        teamId: total.teamId.trim().length > 0 ? total.teamId : ref.teamId,
      };
    })
    .sort(comparePlayerTotalsByValue((total) => total.totalWpa));
}

function comparePlayerTotalsByValue(
  getValue: (total: KblWpaPlayerTotal) => number,
): (left: KblWpaPlayerTotal, right: KblWpaPlayerTotal) => number {
  return (left, right) =>
    getValue(right) - getValue(left) ||
    left.playerName.localeCompare(right.playerName) ||
    left.playerId.localeCompare(right.playerId);
}

function isMeaningfulPositive(value: number): boolean {
  return Number.isFinite(value) && value > MIN_POSITIVE_WPA;
}

function formatSignedWpa(value: number): string {
  return formatWpaPoints(roundWpa(value));
}

function getPlayerAwardStatRole(
  awardType: PogAwardType,
  total: KblWpaPlayerTotal,
): PogAwardStatRole {
  switch (awardType) {
    case "best_hitter":
      return "hitter";
    case "best_pitcher":
      return "pitcher";
    case "best_baserunner":
      return "baserunner";
    case "best_fielder":
      return "fielder";
    case "best_manager":
      return "manager";
    case "overall":
    case "team_standout":
    default:
      return getPrimaryPlayerStatRole(total);
  }
}

function getPrimaryPlayerStatRole(total: KblWpaPlayerTotal): PogAwardStatRole {
  const roleValues: Array<{ role: PogAwardStatRole; value: number }> = [
    { role: "hitter", value: total.battingWpa },
    { role: "pitcher", value: total.pitchingWpa },
    { role: "baserunner", value: total.baserunningWpa },
    { role: "fielder", value: roundWpa(total.fieldingWpa + total.catchingWpa) },
  ];

  const positiveLeader = roleValues
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value)[0];
  if (positiveLeader) return positiveLeader.role;

  return roleValues.sort((left, right) => right.value - left.value)[0]?.role ?? "hitter";
}

function formatPogInnings(outsRecorded: number): string {
  const fullInnings = Math.floor(outsRecorded / 3);
  const remainder = outsRecorded % 3;
  return `${fullInnings}.${remainder}`;
}

function roundWpa(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function compact<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}
