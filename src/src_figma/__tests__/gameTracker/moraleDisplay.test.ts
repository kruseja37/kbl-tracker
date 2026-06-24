import { describe, expect, test } from "vitest";

import {
  getMoraleColor,
  getMoraleDisplay,
  getMoraleState,
  toSuperscript,
} from "../../app/utils/moraleDisplay";

describe("moraleDisplay", () => {
  test("converts numbers to superscript digits", () => {
    expect(toSuperscript(78)).toBe("⁷⁸");
  });

  test("maps morale color bands at boundary values", () => {
    expect(getMoraleColor(80)).toBe("#22c55e");
    expect(getMoraleColor(60)).toBe("#4ade80");
    expect(getMoraleColor(40)).toBe("#9ca3af");
    expect(getMoraleColor(20)).toBe("#f97316");
    expect(getMoraleColor(19)).toBe("#ef4444");
  });

  test("maps morale state bands at boundary values", () => {
    expect(getMoraleState(80)).toBe("Ecstatic");
    expect(getMoraleState(60)).toBe("Happy");
    expect(getMoraleState(40)).toBe("Content");
    expect(getMoraleState(20)).toBe("Unhappy");
    expect(getMoraleState(19)).toBe("Miserable");
  });

  test("clamps and composes display data", () => {
    expect(getMoraleDisplay(78)).toEqual({
      superscript: "⁷⁸",
      color: "#4ade80",
      value: 78,
      state: "Happy",
    });
    expect(getMoraleDisplay(150)).toEqual({
      superscript: "⁹⁹",
      color: "#22c55e",
      value: 99,
      state: "Ecstatic",
    });
    expect(getMoraleDisplay(-10)).toEqual({
      superscript: "⁰",
      color: "#ef4444",
      value: 0,
      state: "Miserable",
    });
  });
});
