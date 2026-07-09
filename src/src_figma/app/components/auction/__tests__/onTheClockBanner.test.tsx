import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import {
  OnTheClockBanner,
  TEXT_TONE_RGB,
  contrastRatio,
  onTheClockCopy,
  onTheClockTextTone,
  parseHexColor,
  relativeLuminance,
  type OnTheClockCopyInput,
} from "../onTheClockBanner";

afterEach(() => {
  cleanup();
});

describe("parseHexColor", () => {
  test("parses a 6-digit hex", () => {
    expect(parseHexColor("#FF6600")).toEqual([255, 102, 0]);
  });

  test("parses a 6-digit hex without the leading #", () => {
    expect(parseHexColor("001489")).toEqual([0, 20, 137]);
  });

  test("parses a 3-digit shorthand hex", () => {
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
  });

  test("returns null for a CSS var reference", () => {
    expect(parseHexColor("var(--ballpark-brass)")).toBeNull();
  });

  test("returns null for empty/undefined input", () => {
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor(undefined)).toBeNull();
  });
});

describe("relativeLuminance / contrastRatio -- WCAG anchors", () => {
  test("white is 1.0, black is 0.0", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 5);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0.0, 5);
  });

  test("white-on-black is the maximum 21:1, order-independent", () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 3);
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 3);
  });

  test("a color against itself is 1:1", () => {
    expect(contrastRatio([255, 102, 0], [255, 102, 0])).toBeCloseTo(1, 5);
  });
});

describe("onTheClockTextTone -- FLOORREFIT R2: direct contrast comparison, never a threshold", () => {
  // The R2 ruling's core law: for EVERY band color, the chosen tone must be the HIGHER-contrast
  // one of the two candidates, and for this palette (which deliberately includes the app's default
  // team orange #FF6600 and mid-green #4CAF50 -- the exact mid-luminance colors the old
  // luminance>0.5 threshold got WRONG) the winning ratio must clear WCAG AA 4.5:1.
  const palette: Array<{ hex: string; label: string }> = [
    { hex: "#FF6600", label: "the app's default team orange" },
    { hex: "#4CAF50", label: "mid-green" },
    { hex: "#005A9C", label: "mid-blue" },
    { hex: "#FFFFFF", label: "pure white (light extreme)" },
    { hex: "#000000", label: "pure black (dark extreme)" },
  ];

  test.each(palette)("$hex ($label): picks the higher-contrast tone and its COMPUTED ratio is >= 4.5", ({ hex }) => {
    const band = parseHexColor(hex)!;
    const tone = onTheClockTextTone(hex)!;
    const chosenRatio = contrastRatio(band, TEXT_TONE_RGB[tone]);
    const otherTone = tone === "ink" ? "chalk" : "ink";
    const otherRatio = contrastRatio(band, TEXT_TONE_RGB[otherTone]);

    expect(chosenRatio).toBeGreaterThanOrEqual(otherRatio); // the direct-comparison law itself
    expect(chosenRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA -- "no unreadable band ever"
  });

  test("the default team orange #FF6600 now picks ink (the old >0.5 threshold picked chalk at ~2.4:1; ink gives ~5.9:1)", () => {
    expect(onTheClockTextTone("#FF6600")).toBe("ink");
  });

  test("mid-green #4CAF50 picks ink (the other color the audit flagged)", () => {
    expect(onTheClockTextTone("#4CAF50")).toBe("ink");
  });

  test("mid-blue #005A9C picks chalk (ink only reaches ~2.4:1 there; chalk gives ~5.8:1)", () => {
    expect(onTheClockTextTone("#005A9C")).toBe("chalk");
  });

  test("white background -> ink text; black background -> chalk text (the extremes)", () => {
    expect(onTheClockTextTone("#FFFFFF")).toBe("ink");
    expect(onTheClockTextTone("#000000")).toBe("chalk");
  });

  test("a dark navy team color -> chalk", () => {
    expect(onTheClockTextTone("#001489")).toBe("chalk");
  });

  test("returns null (caller falls back to brass-on-ink) for a non-hex value", () => {
    expect(onTheClockTextTone("var(--ballpark-brass)")).toBeNull();
    expect(onTheClockTextTone(undefined)).toBeNull();
  });
});

describe("onTheClockCopy -- FLOORREFIT R3: the three-branch ladder, first match wins", () => {
  const base: OnTheClockCopyInput = {
    teamName: "Page Caps",
    turnKind: "bid",
    actingTeamIsCpu: false,
    calmWaitText: "Page Caps — raise or pass",
  };

  test("CPU/shill turn always renders the existing calm-wait copy, regardless of turnKind", () => {
    expect(onTheClockCopy({ ...base, actingTeamIsCpu: true })).toBe("Page Caps — raise or pass");
    expect(onTheClockCopy({ ...base, actingTeamIsCpu: true, turnKind: "nomination" })).toBe(
      "Page Caps — raise or pass",
    );
  });

  test("no resolvable team name falls back to the calm-wait copy too", () => {
    expect(onTheClockCopy({ ...base, teamName: undefined })).toBe("Page Caps — raise or pass");
    expect(onTheClockCopy({ ...base, teamName: "   " })).toBe("Page Caps — raise or pass");
  });

  test("a human bid turn reads YOU'RE UP — {TEAM}", () => {
    expect(onTheClockCopy({ ...base, turnKind: "bid" })).toBe("YOU'RE UP — PAGE CAPS");
  });

  test("a human nomination turn reads YOU'RE UP — {TEAM} — NOMINATE (R3: reachable, not dead)", () => {
    expect(onTheClockCopy({ ...base, turnKind: "nomination" })).toBe(
      "YOU'RE UP — PAGE CAPS — NOMINATE",
    );
  });

  test("a human turn with no turnKind (SOLD/PASSED transitional states) reads the plain bid form", () => {
    expect(onTheClockCopy({ ...base, turnKind: undefined })).toBe("YOU'RE UP — PAGE CAPS");
  });
});

describe("OnTheClockBanner component", () => {
  test("renders team-colored band with computed contrast text tone (dark navy -> chalk)", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Page Keys",
          teamPrimary: "#001489",
          teamSecondary: "#FFFFFF",
          turnKind: "bid",
          actingTeamIsCpu: false,
          nowText: "Page Keys — raise or pass",
        }}
      />,
    );
    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner).toHaveTextContent("YOU'RE UP — PAGE KEYS");
    expect(banner.className).toContain("otc-team");
    expect(banner.className).not.toContain("otc-ink-text");
    expect(banner.className).not.toContain("otc-fallback");
  });

  test("renders ink text on the default team orange (R2: the color the old threshold got wrong)", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Sun Devils",
          teamPrimary: "#FF6600",
          teamSecondary: "#000000",
          turnKind: "bid",
          actingTeamIsCpu: false,
          nowText: "Sun Devils — raise or pass",
        }}
      />,
    );
    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner.className).toContain("otc-ink-text");
  });

  test("a human nomination turn renders the R3 NOMINATE variant", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Page Caps",
          teamPrimary: "#001489",
          teamSecondary: "#FFFFFF",
          turnKind: "nomination",
          actingTeamIsCpu: false,
          nowText: "Page Caps — surface next lot",
        }}
      />,
    );
    expect(screen.getByTestId("on-the-clock-banner")).toHaveTextContent(
      "YOU'RE UP — PAGE CAPS — NOMINATE",
    );
  });

  test("falls back to the brass-on-ink band when team colors are missing/unpopulated", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Page Caps",
          teamPrimary: "var(--ballpark-brass)",
          teamSecondary: "var(--ballpark-chalk)",
          turnKind: "bid",
          actingTeamIsCpu: false,
          nowText: "Page Caps — raise or pass",
        }}
      />,
    );
    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner.className).toContain("otc-fallback");
    expect(banner.className).not.toContain("otc-team");
    expect(banner).toHaveTextContent("YOU'RE UP — PAGE CAPS");
  });

  test("CPU turns render the existing calm-wait copy inside the band, not the punchy copy", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Page Caps",
          teamPrimary: "#FF6600",
          teamSecondary: "#001489",
          turnKind: "bid",
          actingTeamIsCpu: true,
          nowText: "Page Caps — raise or pass",
        }}
      />,
    );
    const banner = screen.getByTestId("on-the-clock-banner");
    expect(banner).toHaveTextContent("Page Caps — raise or pass");
    expect(banner).not.toHaveTextContent("YOU'RE UP");
  });
});
