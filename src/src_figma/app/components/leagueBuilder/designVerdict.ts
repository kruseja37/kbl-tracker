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

// SETUPTAX (2026-07-09): buildBest22Target's `feasible` folds three independent gates --
// legalRoster && solvent && floorMet (best22Target.ts:282) -- into one boolean. `solvent` is
// `salary + tax <= budget`, so insolvency is readable back out of fields ALREADY on
// Best22Target (totalSalary, allIn, budget, feasible) -- no engine change, no new field.
//
// REWORK (audit Finding 1, captain ruling 2026-07-09): tax must be the MARGINAL cause, so the
// predicate also requires totalSalary <= budget. Without that clause it reduced to plain
// !solvent -- a target whose SALARY ALONE blew the budget (tax $0) still took the amber
// "OVERSHOOTS WITH TAX" treatment and the strip rendered "OWES $0 TAX". When salary alone
// overshoots, this returns false and every caller falls through to the pre-lane generic
// infeasible path, byte-identical to before this lane.
export function isBest22TargetTaxOvershoot(target: Best22Target | null): boolean {
  return Boolean(target)
    && !target!.feasible
    && target!.totalSalary <= target!.budget
    && target!.allIn > target!.budget;
}

export function designTargetStripCopy(state: TargetVerdictState, target: Best22Target | null): string | null {
  if (state === "quiet") return null;
  if (state === "no-identity") return "PICK AN MLB IDENTITY TO SEE YOUR TARGET 22";
  if (state === "infeasible") {
    if (isBest22TargetTaxOvershoot(target)) {
      return `YOUR IDENTITY'S TARGET BUILD OWES ${formatVerdictMoney(target!.totalTax)} TAX — ${formatVerdictMoney(target!.allIn)} ALL-IN OVER YOUR ${formatVerdictMoney(target!.budget)} CAP; THE FLOOR STILL BUILDS`;
    }
    return "THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS";
  }
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

// SETUPTAX Item 1: THE CLUB CHECK row's PRIMARY verdict is the salary-floor tone/copy (today's
// behavior) unless the club's identity TARGET is specifically insolvent from tax -- in that one
// case the row can no longer read as unqualified green while a real auction budget would bounce
// this build. `taxOvershoot` gates all three helpers below; when false every one is a no-op
// (returns the input unchanged), so the "no identity" / "other infeasible cause" / "feasible"
// rows are byte-identical to pre-SETUPTAX behavior.
export function clubCheckToneWithTaxOverride(floorTone: VerdictTone, taxOvershoot: boolean): VerdictTone {
  return taxOvershoot && floorTone === "green" ? "amber" : floorTone;
}

export function clubCheckTaxOvershootCopy(target: Best22Target): string {
  return `TARGET OVERSHOOTS WITH TAX · ${formatVerdictMoney(target.allIn)} ALL-IN vs ${formatVerdictMoney(target.budget)} BUDGET`;
}

/** The floor verdict, demoted to the row's secondary clause and labeled so it isn't read as
 * describing the same (now tax-overshooting) target the primary clause names. */
export function clubCheckFloorSecondaryCopy(floorCopy: string): string {
  return `FLOOR ${floorCopy}`;
}

/** THE MONEY panel's tax-watch line (SETUPTAX Item 3) -- lists every club whose identity TARGET
 * overshoots the cap after tax, reusing target results the page already computes per club. */
export function taxWatchBannerText(clubNames: readonly string[]): string | null {
  if (clubNames.length === 0) return null;
  return `TAX WATCH: ${clubNames.join(", ")} — identity targets overshoot the cap after tax.`;
}
