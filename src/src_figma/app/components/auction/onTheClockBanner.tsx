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

/** The two candidate text tones, as the literal RGB values behind the CSS the banner applies:
 * `chalk` = #E8E8D8 (`--ballpark-chalk`, the `.otc-team` default color) and `ink` = #1A1A1A (the
 * `.otc-ink-text` override). Exported so tests can assert the COMPUTED contrast of the chosen tone,
 * not merely which class was picked. If the CSS tones ever change, change these with them. */
export const TEXT_TONE_RGB: Record<"ink" | "chalk", [number, number, number]> = {
  ink: [26, 26, 26], // #1A1A1A
  chalk: [232, 232, 216], // #E8E8D8
};

/** WCAG 2.x relative luminance of an sRGB color. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG 2.x contrast ratio between two colors (order-independent, 1..21). */
export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Text-tone choice for the banner: computes the WCAG contrast ratio of BOTH candidate tones
 * (chalk and near-black ink) against the band color and picks the higher -- a direct comparison,
 * never a luminance threshold (FLOORREFIT R2: a 0.5 threshold picked the LOWER-contrast tone for
 * the whole mid-luminance window, e.g. chalk at 2.4:1 on the default team orange #FF6600 when ink
 * gives 5.9:1 -- a violation of the design's "no unreadable band ever" law). Returns null when the
 * input isn't a real hex color -- the banner falls back to the brass-on-ink band in that case
 * rather than guessing a tone for a CSS var it can't evaluate. */
export function onTheClockTextTone(hex: string | undefined | null): "ink" | "chalk" | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  return contrastRatio(rgb, TEXT_TONE_RGB.ink) >= contrastRatio(rgb, TEXT_TONE_RGB.chalk)
    ? "ink"
    : "chalk";
}

export interface OnTheClockCopyInput {
  teamName?: string;
  /** "bid" (OPEN_BIDDING / RESOLVE-claim) or "nomination" (NOMINATION) -- absent for states with no
   * well-defined acting team (SOLD/PASSED/AUCTION_COMPLETE transitional beats). */
  turnKind?: "bid" | "nomination";
  /** Whether the acting team is CPU/shill-controlled. */
  actingTeamIsCpu: boolean;
  /** The existing calm-wait text (today's `status.nowText`) -- reused verbatim for CPU turns and as
   * the safe default when no acting team is resolvable. */
  calmWaitText: string;
}

/** The copy ladder, first match wins (FLOORREFIT R3 ruling): every human turn is the viewer's turn
 * under the app's pass-the-device convention (WhisperPanel's HELP_LINE: "the club on the clock"
 * already means "you" for any human turn), so the ladder has exactly three live branches -- CPU/
 * unresolvable -> calm-wait, human nomination -> "YOU'RE UP — {TEAM} — NOMINATE", human bid ->
 * "YOU'RE UP — {TEAM}". The original 4-branch ladder's non-viewer branches ("{TEAM} IS ON THE
 * CLOCK" / "{TEAM} TO NOMINATE") were unreachable for humans and are DELETED per the R3 ruling. */
export function onTheClockCopy(input: OnTheClockCopyInput): string {
  const name = input.teamName?.trim();
  if (!name || input.actingTeamIsCpu) return input.calmWaitText;
  if (input.turnKind === "nomination") return `YOU'RE UP — ${name.toUpperCase()} — NOMINATE`;
  return `YOU'RE UP — ${name.toUpperCase()}`;
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
  const copy = onTheClockCopy({
    teamName: status.teamName,
    turnKind: status.turnKind,
    actingTeamIsCpu: Boolean(status.actingTeamIsCpu),
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
