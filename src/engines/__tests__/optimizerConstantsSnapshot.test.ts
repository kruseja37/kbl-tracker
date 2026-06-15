import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  captureOptimizerConstantsSnapshot,
  OPTIMIZER_CONSTANTS_VERSION,
} from "../optimizerConstantsSnapshot";
import { MOJO_DELTAS } from "../../data/rosterEngineConstants";
import { IV_CURVES } from "../../data/ivCurves";
import { TRAIT_PRICING } from "../../data/traitPricing";
import { TRAIT_INTERACTION_MATRIX } from "../../data/traitInteractionMatrix";

describe("optimizer constants snapshot", () => {
  test("returns the version string and a deterministic content hash", () => {
    const first = captureOptimizerConstantsSnapshot();
    const second = captureOptimizerConstantsSnapshot();

    expect(first.version).toBe(OPTIMIZER_CONSTANTS_VERSION);
    expect(second).toEqual(first);
    expect(first.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  test("does not reference tierParams", () => {
    const source = readFileSync(
      "src/engines/optimizerConstantsSnapshot.ts",
      "utf8",
    );

    expect(source).not.toMatch(/tierParams/);
  });

  test("includes roster objective constants in the hash", () => {
    const before = captureOptimizerConstantsSnapshot().hash;
    const original = MOJO_DELTAS.Normal;

    try {
      (MOJO_DELTAS as Record<string, number>).Normal = original + 1;
      expect(captureOptimizerConstantsSnapshot().hash).not.toBe(before);
    } finally {
      (MOJO_DELTAS as Record<string, number>).Normal = original;
    }
  });

  test("includes IV curves and trait pricing in the hash", () => {
    const before = captureOptimizerConstantsSnapshot().hash;
    const originalCurve = IV_CURVES.C.attributes.POW?.primary.midSal;
    const originalPricing = TRAIT_PRICING[0].deltas.POW;

    try {
      if (originalCurve === undefined) throw new Error("missing C POW curve");
      IV_CURVES.C.attributes.POW!.primary.midSal = originalCurve + 1;
      expect(captureOptimizerConstantsSnapshot().hash).not.toBe(before);

      IV_CURVES.C.attributes.POW!.primary.midSal = originalCurve;
      TRAIT_PRICING[0].deltas.POW = originalPricing + 1;
      expect(captureOptimizerConstantsSnapshot().hash).not.toBe(before);
    } finally {
      if (originalCurve !== undefined) {
        IV_CURVES.C.attributes.POW!.primary.midSal = originalCurve;
      }
      TRAIT_PRICING[0].deltas.POW = originalPricing;
    }
  });

  test("includes trait interaction matrix values in the hash", () => {
    const before = captureOptimizerConstantsSnapshot().hash;
    const matrixEntry = TRAIT_INTERACTION_MATRIX.find(
      (entry) => entry.effect.kind === "ratingDelta" && entry.effect.deltas.POW !== undefined,
    );
    if (!matrixEntry || matrixEntry.effect.kind !== "ratingDelta") {
      throw new Error("missing matrix POW rating delta");
    }
    const originalDelta = matrixEntry.effect.deltas.POW;

    try {
      matrixEntry.effect.deltas.POW = (originalDelta ?? 0) + 1;
      expect(captureOptimizerConstantsSnapshot().hash).not.toBe(before);
    } finally {
      if (originalDelta === undefined) {
        delete matrixEntry.effect.deltas.POW;
      } else {
        matrixEntry.effect.deltas.POW = originalDelta;
      }
    }
  });
});
