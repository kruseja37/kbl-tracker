import type { CSSProperties } from "react";

/**
 * FLOORREFIT Move 1 -- THE ON THE CLOCK BANNER (spec-docs/AUCTION_FLOOR_REFIT_2026-07-09.md §2).
 *
 * Two small pure helpers (contrast + copy ladder) plus the presentational banner itself. Kept in
 * its own module so the luminance math and the copy ladder are unit-testable in isolation from the
 * (already large) AuctionStage.tsx render tree.
 */

/** Parses a 3- or 6-digit `#rrggbb`/`#rgb` hex string into 0-255 channel values. Returns null for
 * anything else (a CSS var reference like `var(--ballpark-brass)`, an empty string, undefined) --
 * that null is the caller's signal to use the brass-on-ink fallback band instead of team colors. */
export function parseHexColor(value: string | undefined | null): [number, number, number] | null {
  if (!value) return null;
  const trimmed = value.trim();
  const six = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (six) {
    const int = parseInt(six[1], 16);
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }
  const three = /^#?([0-9a-fA-F]{3})$/.exec(trimmed);
  if (three) {
    const [r, g, b] = three[1].split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  return null;
}

/** WCAG relative luminance -> a two-way text tone choice. `"ink"` (near-black) reads on light
 * backgrounds, `"chalk"` (the ballpark light text) reads on dark backgrounds. Returns null when the
 * input isn't a real hex color -- the banner falls back to the brass-on-ink band in that case
 * rather than guessing a tone for a CSS var it can't evaluate. */
export function onTheClockTextTone(hex: string | undefined | null): "ink" | "chalk" | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  const linear = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.5 ? "ink" : "chalk";
}

export interface OnTheClockCopyInput {
  teamName?: string;
  /** "bid" (OPEN_BIDDING / RESOLVE-claim) or "nomination" (NOMINATION) -- absent for states with no
   * well-defined acting team (SOLD/PASSED/AUCTION_COMPLETE transitional beats). */
  turnKind?: "bid" | "nomination";
  /** Whether the acting team is CPU/shill-controlled. */
  actingTeamIsCpu: boolean;
  /** Whether the acting team is the seat the local device/browser is currently playing --
   * per the app's existing pass-the-device convention (see WhisperPanel's HELP_LINE: "the club on
   * the clock" already means "you" whenever it's a human turn), the only signal available today is
   * the human/CPU split, so call sites pass `!actingTeamIsCpu`. Kept as an explicit, independent
   * parameter (rather than derived inside this function) so the full 4-branch ladder stays testable
   * even though today's callers only ever exercise 2 of the 4 branches -- see the FLOORREFIT
   * contract's honest finding on this. */
  isViewerSeat: boolean;
  /** The existing calm-wait text (today's `status.nowText`) -- reused verbatim for CPU turns and as
   * the safe default when no acting team is resolvable. */
  calmWaitText: string;
}

/** COCKPIT-adjacent copy ladder, first match wins (design doc §2 bullet 1): */
export function onTheClockCopy(input: OnTheClockCopyInput): string {
  const name = input.teamName?.trim();
  if (!name || input.actingTeamIsCpu) return input.calmWaitText;
  if (input.isViewerSeat) return `YOU'RE UP — ${name.toUpperCase()}`;
  if (input.turnKind === "nomination") return `${name.toUpperCase()} TO NOMINATE`;
  return `${name.toUpperCase()} IS ON THE CLOCK`;
}

export interface OnTheClockBannerStatus {
  teamName?: string;
  teamPrimary?: string;
  teamSecondary?: string;
  turnKind?: "bid" | "nomination";
  actingTeamIsCpu?: boolean;
  nowText: string;
}

export function OnTheClockBanner({ status }: { status: OnTheClockBannerStatus }) {
  const actingTeamIsCpu = Boolean(status.actingTeamIsCpu);
  const copy = onTheClockCopy({
    teamName: status.teamName,
    turnKind: status.turnKind,
    actingTeamIsCpu,
    isViewerSeat: !actingTeamIsCpu,
    calmWaitText: status.nowText,
  });

  const primaryTone = onTheClockTextTone(status.teamPrimary);
  const secondaryRgb = parseHexColor(status.teamSecondary);
  const hasTeamColors = primaryTone !== null && secondaryRgb !== null;

  // Remounts (and therefore replays the single 300ms arrival beat) whenever the acting team or the
  // situational text actually changes -- nowText already varies per turn/action, so it's a reliable
  // "did the turn move" signal without inventing a new one.
  const remountKey = `${status.teamName ?? "cpu"}|${status.nowText}`;

  return (
    <div
      key={remountKey}
      className={`otc-banner${hasTeamColors ? ` otc-team${primaryTone === "ink" ? " otc-ink-text" : ""}` : " otc-fallback"}`}
      style={
        hasTeamColors
          ? ({
              "--otc-bg": status.teamPrimary,
              "--otc-border": status.teamSecondary,
            } as CSSProperties)
          : undefined
      }
      data-testid="on-the-clock-banner"
    >
      {copy}
    </div>
  );
}
