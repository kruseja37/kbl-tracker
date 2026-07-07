import type { Best22Target } from "../../../../engines/best22Target";
import type { DesignFeasibilityResult } from "../../../../engines/rosterDesignFeasibility";

export type VerdictTone = "red" | "amber" | "green" | "quiet";
export type TargetVerdictState = "quiet" | "no-identity" | "infeasible" | "feasible";

export function formatVerdictMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value).toLocaleString()}`;
}

export function designVerdictTone(result: DesignFeasibilityResult | null, poolSize: number): VerdictTone {
  if (poolSize === 0 || !result) return "quiet";
  if (result.blockers.some((blocker) => blocker.kind === "no-match" && blocker.slotId !== "legality")) return "red";
  if (result.blockers.some((blocker) => blocker.slotId === "legality")) return "amber";
  if (result.blockers.some((blocker) => blocker.kind === "budget")) return "amber";
  if (result.feasible) return "green";
  return "quiet";
}

export function designVerdictCopy(result: DesignFeasibilityResult | null, tone: VerdictTone): string {
  if (!result || tone === "quiet") return "NOTHING TO CHECK AGAINST YET";
  if (tone === "red") {
    const count = result.blockers.filter((blocker) => blocker.kind === "no-match" && blocker.slotId !== "legality").length;
    return `${count} SPOT${count === 1 ? "" : "S"} WON'T FILL`;
  }
  if (result.blockers.some((blocker) => blocker.slotId === "legality")) return "FILLS · NOT A LEGAL 22";
  if (result.blockers.some((blocker) => blocker.kind === "budget")) {
    return `OVER BUDGET · ${formatVerdictMoney(Math.max(0, result.totalCost - result.budget))} OVER`;
  }
  return `BUILDS · ${formatVerdictMoney(result.headroom)} TO SPARE`;
}

export function targetVerdictState({
  poolSize,
  hasIdentity,
  target,
}: {
  poolSize: number;
  hasIdentity: boolean;
  target: Best22Target | null;
}): TargetVerdictState {
  if (poolSize === 0) return "quiet";
  if (!hasIdentity) return "no-identity";
  if (!target?.feasible) return "infeasible";
  return "feasible";
}

export function designTargetChipCopy(
  result: DesignFeasibilityResult | null,
  state: TargetVerdictState,
  target: Best22Target | null,
): string {
  if (!result || state === "quiet") return "FLOOR N/A";
  const floor = `FLOOR ${formatVerdictMoney(result.totalCost)} OF ${formatVerdictMoney(result.budget)}`;
  if (state === "feasible" && target) return `TARGET ${formatVerdictMoney(target.allIn)} ALL-IN · ${floor}`;
  if (state === "no-identity") return `${floor} · TARGET NEEDS AN IDENTITY`;
  return `${floor} · IDENTITY WON'T EXPRESS HERE`;
}

export function designTargetStripCopy(state: TargetVerdictState, target: Best22Target | null): string | null {
  if (state === "quiet") return null;
  if (state === "no-identity") return "PICK AN MLB IDENTITY TO SEE YOUR TARGET 22";
  if (state === "infeasible") return "THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS";
  if (!target) return null;
  const identitySegment = target.embodimentZ > 0 ? "LOOKS LIKE YOUR IDENTITY" : "THIN ON YOUR IDENTITY";
  const askSegment = target.asksHonored.asked > 0
    ? ` · ${target.asksHonored.honored} OF ${target.asksHonored.asked} ASKS LAND`
    : "";
  return `YOUR TARGET 22${askSegment} · ${identitySegment}`;
}

export function clubCheckTargetCopy(state: TargetVerdictState, target: Best22Target | null): string | null {
  if (state === "quiet") return null;
  if (state === "feasible" && target) return `TARGET ${formatVerdictMoney(target.allIn)}`;
  if (state === "no-identity") return "NO IDENTITY";
  return "IDENTITY WON'T EXPRESS";
}
