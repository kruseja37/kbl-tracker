import type { FameTier } from "../../../types/reporter";
import { FAME_TIER_LABEL } from "../../../types/reporter";
import { getEffectiveFame } from "../../../utils/effectiveValues";
import { getEliminationPlayer } from "../../../utils/eliminationPlayerStorage";
import {
  getLeaguePlayerOverride,
  setLeaguePlayerOverride,
  type LeaguePlayerOverrideRecord,
} from "../../../utils/leagueBuilderStorage";
import {
  getRunPromotionDecision,
  setRunPromotionDecision,
  type RunFameStanding,
  type RunPromotionDecision,
} from "../../../utils/eliminationRunFameStorage";

export interface FamePromotionCandidate {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  currentTier: FameTier;
  targetTier: FameTier;
  runTotalFame: number;
  gamesPlayed: number;
}

interface PromotionThreshold {
  tier: FameTier;
  threshold: number;
}

const PROMOTION_THRESHOLDS: PromotionThreshold[] = [
  { tier: 2, threshold: 10 },
  { tier: 3, threshold: 30 },
  { tier: 4, threshold: 80 },
  { tier: 5, threshold: 150 },
];

export function getPromotionTargetTier(
  currentTier: FameTier,
  runTotalFame: number,
): FameTier | null {
  let targetTier: FameTier | null = null;

  for (const threshold of PROMOTION_THRESHOLDS) {
    if (runTotalFame >= threshold.threshold && threshold.tier > currentTier) {
      targetTier = threshold.tier;
    }
  }

  return targetTier;
}

function getLatestTeamId(entry: RunFameStanding): string {
  return [...entry.events].sort((left, right) => right.timestamp - left.timestamp)[0]?.playerTeam ?? "";
}

function isPromotionHandled(
  decision: RunPromotionDecision | null,
  targetTier: FameTier,
): boolean {
  if (!decision) {
    return false;
  }

  return (
    (decision.acceptedTier ?? 0) >= targetTier ||
    (decision.dismissedTier ?? 0) >= targetTier
  );
}

export function buildPromotionCandidate(
  standing: RunFameStanding,
  currentTier: FameTier,
  teamName: string,
  decision: RunPromotionDecision | null,
): FamePromotionCandidate | null {
  const targetTier = getPromotionTargetTier(currentTier, standing.totalFame);

  if (!targetTier || isPromotionHandled(decision, targetTier)) {
    return null;
  }

  return {
    playerId: standing.playerId,
    playerName: standing.playerName,
    teamId: getLatestTeamId(standing),
    teamName,
    currentTier,
    targetTier,
    runTotalFame: standing.totalFame,
    gamesPlayed: standing.gamesPlayed,
  };
}

export async function getRunPromotionCandidates(
  runId: string,
  standings: RunFameStanding[],
  teamNamesById: Record<string, string>,
): Promise<FamePromotionCandidate[]> {
  const candidates = await Promise.all(
    standings.map(async (standing) => {
      const latestTeamId = getLatestTeamId(standing);
      const [player, override, decision] = await Promise.all([
        getEliminationPlayer(runId, standing.playerId),
        getLeaguePlayerOverride(runId, standing.playerId),
        getRunPromotionDecision(runId, standing.playerId),
      ]);
      const currentTier = getEffectiveFame(player, override);

      return buildPromotionCandidate(
        standing,
        currentTier,
        (teamNamesById[latestTeamId] ?? latestTeamId) || "Run Squad",
        decision,
      );
    }),
  );

  return candidates
    .filter((candidate): candidate is FamePromotionCandidate => Boolean(candidate))
    .sort(
      (left, right) =>
        right.targetTier - left.targetTier ||
        right.runTotalFame - left.runTotalFame ||
        left.playerName.localeCompare(right.playerName),
    );
}

export async function acceptFamePromotion(
  runId: string,
  playerId: string,
  targetTier: FameTier,
): Promise<LeaguePlayerOverrideRecord> {
  const existingOverride = await getLeaguePlayerOverride(runId, playerId);
  const override = await setLeaguePlayerOverride(
    runId,
    playerId,
    existingOverride?.overrides ?? {},
    { fameTierOverride: targetTier },
  );

  await setRunPromotionDecision(runId, playerId, {
    acceptedTier: targetTier,
  });

  return override;
}

export async function dismissFamePromotion(
  runId: string,
  playerId: string,
  targetTier: FameTier,
): Promise<void> {
  const currentDecision = await getRunPromotionDecision(runId, playerId);
  const nextDismissedTier =
    currentDecision?.dismissedTier && currentDecision.dismissedTier > targetTier
      ? currentDecision.dismissedTier
      : targetTier;

  await setRunPromotionDecision(runId, playerId, {
    dismissedTier: nextDismissedTier,
  });
}

export function formatPromotionLabel(tier: FameTier): string {
  return FAME_TIER_LABEL[tier];
}
