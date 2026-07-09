import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import {
  OnTheClockBanner,
  onTheClockCopy,
  onTheClockTextTone,
  parseHexColor,
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

describe("onTheClockTextTone -- both extremes", () => {
  test("white background -> near-black (ink) text", () => {
    expect(onTheClockTextTone("#FFFFFF")).toBe("ink");
  });

  test("black background -> chalk (light) text", () => {
    expect(onTheClockTextTone("#000000")).toBe("chalk");
  });

  test("a mid-bright team color (SMB4 orange, relative luminance ~0.31) -> chalk", () => {
    expect(onTheClockTextTone("#FF6600")).toBe("chalk");
  });

  test("a dark navy team color -> chalk", () => {
    expect(onTheClockTextTone("#001489")).toBe("chalk");
  });

  test("returns null (caller falls back to brass-on-ink) for a non-hex value", () => {
    expect(onTheClockTextTone("var(--ballpark-brass)")).toBeNull();
    expect(onTheClockTextTone(undefined)).toBeNull();
  });
});

describe("onTheClockCopy -- the ladder (design doc §2 bullet 1), first match wins", () => {
  const base: OnTheClockCopyInput = {
    teamName: "Page Caps",
    turnKind: "bid",
    actingTeamIsCpu: false,
    isViewerSeat: false,
    calmWaitText: "Page Caps — raise or pass",
  };

  test("CPU/shill turn always renders the existing calm-wait copy, regardless of other flags", () => {
    expect(onTheClockCopy({ ...base, actingTeamIsCpu: true, isViewerSeat: true })).toBe(
      "Page Caps — raise or pass",
    );
  });

  test("no resolvable team name falls back to the calm-wait copy too", () => {
    expect(onTheClockCopy({ ...base, teamName: undefined })).toBe("Page Caps — raise or pass");
    expect(onTheClockCopy({ ...base, teamName: "   " })).toBe("Page Caps — raise or pass");
  });

  test("the viewer's own seat gets the personal YOU'RE UP copy, regardless of turnKind", () => {
    expect(onTheClockCopy({ ...base, isViewerSeat: true, turnKind: "bid" })).toBe("YOU'RE UP — PAGE CAPS");
    expect(onTheClockCopy({ ...base, isViewerSeat: true, turnKind: "nomination" })).toBe(
      "YOU'RE UP — PAGE CAPS",
    );
  });

  // These two branches document the generic (non-viewer, non-CPU) copy the ladder defines --
  // per the FLOORREFIT contract's honest finding, today's callers always pass
  // isViewerSeat = !actingTeamIsCpu, so in practice every non-CPU turn takes the YOU'RE UP branch
  // above and these two are unreached in production. Kept independently testable (isViewerSeat is
  // a real, separate parameter) so the ladder is verifiably correct end to end, not just for the
  // combinations the current human/CPU-only data model happens to produce.
  test("a non-viewer bid turn reads TEAM IS ON THE CLOCK", () => {
    expect(onTheClockCopy({ ...base, isViewerSeat: false, turnKind: "bid" })).toBe(
      "PAGE CAPS IS ON THE CLOCK",
    );
  });

  test("a non-viewer nomination turn reads TEAM TO NOMINATE", () => {
    expect(onTheClockCopy({ ...base, isViewerSeat: false, turnKind: "nomination" })).toBe(
      "PAGE CAPS TO NOMINATE",
    );
  });

  test("a non-viewer turn with no turnKind (SOLD/PASSED transitional states) defaults to IS ON THE CLOCK", () => {
    expect(onTheClockCopy({ ...base, isViewerSeat: false, turnKind: undefined })).toBe(
      "PAGE CAPS IS ON THE CLOCK",
    );
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

  test("renders team-colored band with ink text tone on a light team color", () => {
    render(
      <OnTheClockBanner
        status={{
          teamName: "Sun Devils",
          teamPrimary: "#FFFFFF",
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
