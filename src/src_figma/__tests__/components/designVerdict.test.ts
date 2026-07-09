import { describe, expect, test } from "vitest";

import type { Best22Target } from "../../../engines/best22Target";
import type { DesignFeasibilityResult } from "../../../engines/rosterDesignFeasibility";
import {
  clubCheckFloorSecondaryCopy,
  clubCheckTargetCopy,
  clubCheckTaxOvershootCopy,
  clubCheckToneWithTaxOverride,
  designTargetChipCopy,
  designTargetStripCopy,
  designVerdictCopy,
  designVerdictTone,
  isBest22TargetTaxOvershoot,
  targetVerdictState,
  taxWatchBannerText,
} from "../../app/components/leagueBuilder/designVerdict";

function makeResult(overrides: Partial<DesignFeasibilityResult> = {}): DesignFeasibilityResult {
  return {
    feasible: true,
    totalCost: 12_000,
    budget: 50_000,
    headroom: 38_000,
    legal: true,
    slots: [],
    blockers: [],
    ...overrides,
  };
}

function makeTarget(overrides: Partial<Best22Target> = {}): Best22Target {
  return {
    picks: [],
    totalSalary: 28_000,
    totalTax: 2_000,
    allIn: 30_000,
    budget: 50_000,
    feasible: true,
    embodimentZ: 0.5,
    asksHonored: { honored: 2, asked: 3 },
    ...overrides,
  };
}

describe("designVerdict copy", () => {
  test("keeps the floor verdict copy byte-identical", () => {
    expect(designVerdictCopy(null, "quiet")).toBe("NOTHING TO CHECK AGAINST YET");
    expect(designVerdictCopy(makeResult(), designVerdictTone(makeResult(), 1))).toBe("BUILDS · $38,000 TO SPARE");
    expect(designVerdictCopy(makeResult({
      feasible: false,
      totalCost: 55_000,
      headroom: -5_000,
      blockers: [{ slotId: "budget", kind: "budget", message: "over" }],
    }), "amber")).toBe("OVER BUDGET · $5,000 OVER");
    expect(designVerdictCopy(makeResult({
      feasible: false,
      legal: false,
      blockers: [{ slotId: "legality", kind: "no-match", message: "illegal" }],
    }), "amber")).toBe("FILLS · NOT A LEGAL 22");
    expect(designVerdictCopy(makeResult({
      feasible: false,
      blockers: [
        { slotId: "SS", kind: "no-match", message: "missing SS" },
        { slotId: "RP1", kind: "no-match", message: "missing RP" },
      ],
    }), "red")).toBe("2 SPOTS WON'T FILL");
  });

  test("A6 pins the four designer chip line-2 target states", () => {
    const result = makeResult();
    const target = makeTarget();
    expect(designTargetChipCopy(result, "feasible", target))
      .toBe("TARGET $30,000 ALL-IN · FLOOR $12,000 OF $50,000");
    expect(designTargetChipCopy(result, "no-identity", null))
      .toBe("FLOOR $12,000 OF $50,000 · TARGET NEEDS AN IDENTITY");
    expect(designTargetChipCopy(result, "infeasible", makeTarget({ feasible: false })))
      .toBe("FLOOR $12,000 OF $50,000 · IDENTITY WON'T EXPRESS HERE");
    expect(designTargetChipCopy(null, "quiet", null)).toBe("FLOOR N/A");
  });

  test("pins target strip and CLUB CHECK segment copy", () => {
    expect(designTargetStripCopy("feasible", makeTarget()))
      .toBe("YOUR TARGET 22 · 2 OF 3 ASKS LAND · LOOKS LIKE YOUR IDENTITY");
    expect(designTargetStripCopy("feasible", makeTarget({ embodimentZ: 0, asksHonored: { honored: 0, asked: 0 } })))
      .toBe("YOUR TARGET 22 · THIN ON YOUR IDENTITY");
    expect(designTargetStripCopy("no-identity", null)).toBe("PICK AN MLB IDENTITY TO SEE YOUR TARGET 22");
    expect(designTargetStripCopy("infeasible", makeTarget({ feasible: false })))
      .toBe("THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS");

    expect(clubCheckTargetCopy("feasible", makeTarget())).toBe("TARGET $30,000");
    expect(clubCheckTargetCopy("no-identity", null)).toBe("NO IDENTITY");
    expect(clubCheckTargetCopy("infeasible", makeTarget({ feasible: false }))).toBe("IDENTITY WON'T EXPRESS");
  });

  test("resolves target states from pool, identity, and feasibility", () => {
    expect(targetVerdictState({ poolSize: 0, hasIdentity: false, target: null })).toBe("quiet");
    expect(targetVerdictState({ poolSize: 1, hasIdentity: false, target: null })).toBe("no-identity");
    expect(targetVerdictState({ poolSize: 1, hasIdentity: true, target: makeTarget({ feasible: false }) })).toBe("infeasible");
    expect(targetVerdictState({ poolSize: 1, hasIdentity: true, target: makeTarget() })).toBe("feasible");
  });
});

// SETUPTAX (2026-07-09): the setup screens stop promising what settlement won't honor. These
// pin the tax-overshoot detection + the copy/tone it drives, and prove the existing
// "infeasible for a non-tax reason" fixture above (allIn 30,000 < budget 50,000) is UNCHANGED.
describe("SETUPTAX tax-overshoot copy", () => {
  function makeTaxInsolventTarget(overrides: Partial<Best22Target> = {}): Best22Target {
    return {
      picks: [],
      totalSalary: 900_000,
      totalTax: 330_000,
      allIn: 1_230_000,
      budget: 1_000_000,
      feasible: false,
      embodimentZ: 0.5,
      asksHonored: { honored: 2, asked: 3 },
      ...overrides,
    };
  }

  test("isBest22TargetTaxOvershoot fires ONLY when infeasible AND allIn exceeds budget", () => {
    expect(isBest22TargetTaxOvershoot(makeTaxInsolventTarget())).toBe(true);
    // The pre-existing "infeasible for another reason" fixture (designVerdict.test.ts's
    // makeTarget({feasible: false}): allIn 30,000 < budget 50,000) must NOT trip tax-overshoot.
    expect(isBest22TargetTaxOvershoot(makeTarget({ feasible: false }))).toBe(false);
    expect(isBest22TargetTaxOvershoot(makeTarget())).toBe(false); // feasible: true
    expect(isBest22TargetTaxOvershoot(null)).toBe(false);
  });

  test("designTargetStripCopy names TAX as the cause only for a tax-driven infeasible target", () => {
    expect(designTargetStripCopy("infeasible", makeTaxInsolventTarget())).toBe(
      "YOUR IDENTITY'S TARGET BUILD OWES $330,000 TAX — $1,230,000 ALL-IN OVER YOUR $1,000,000 CAP; THE FLOOR STILL BUILDS",
    );
    // Byte-identical to the pre-SETUPTAX characterized string for the non-tax infeasible case.
    expect(designTargetStripCopy("infeasible", makeTarget({ feasible: false }))).toBe(
      "THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS",
    );
  });

  test("clubCheckTaxOvershootCopy names the exact ALL-IN vs BUDGET figures", () => {
    expect(clubCheckTaxOvershootCopy(makeTaxInsolventTarget())).toBe(
      "TARGET OVERSHOOTS WITH TAX · $1,230,000 ALL-IN vs $1,000,000 BUDGET",
    );
  });

  test("clubCheckToneWithTaxOverride escalates green to amber but never downgrades an existing warning", () => {
    expect(clubCheckToneWithTaxOverride("green", true)).toBe("amber");
    expect(clubCheckToneWithTaxOverride("green", false)).toBe("green");
    expect(clubCheckToneWithTaxOverride("amber", true)).toBe("amber");
    expect(clubCheckToneWithTaxOverride("red", true)).toBe("red");
    expect(clubCheckToneWithTaxOverride("quiet", true)).toBe("quiet");
  });

  test("clubCheckFloorSecondaryCopy labels the demoted floor clause", () => {
    expect(clubCheckFloorSecondaryCopy("BUILDS · $38,000 TO SPARE")).toBe("FLOOR BUILDS · $38,000 TO SPARE");
  });

  test("taxWatchBannerText lists every overshooting club or returns null", () => {
    expect(taxWatchBannerText([])).toBeNull();
    expect(taxWatchBannerText(["Murderers Row — GM Bob"])).toBe(
      "TAX WATCH: Murderers Row — GM Bob — identity targets overshoot the cap after tax.",
    );
    expect(taxWatchBannerText(["Murderers Row — GM Bob", "Whiteyball — GM Sue"])).toBe(
      "TAX WATCH: Murderers Row — GM Bob, Whiteyball — GM Sue — identity targets overshoot the cap after tax.",
    );
  });
});
