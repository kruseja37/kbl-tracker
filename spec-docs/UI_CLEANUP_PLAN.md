# UI CLEANUP PLAN — FRANCHISE HUB (regular season + playoffs)

**Status:** READY — execute when JK greenlights. **Created/scoped:** 2026-06-18.
**SCOPE (JK ruling 2026-06-18):** the **Franchise Hub — regular-season + playoff tabs and their depth ONLY.**
EXCLUDES **GameTracker** (considered done) and the entire **offseason** (deferred). This is the live, in-use,
shipped surface.
**Source:** UI-remaining survey (`wf_1b45bbc1-3bb`) → re-scoped + re-grounded against the actual franchise hub tab
structure (Opus Captain + Explore map, every count verified against live code, 2026-06-18).

> **Headline:** within scope, the franchise hub is **~95% BUILT and production-ready** — all regular-season and
> playoff tabs render real data. So this is **NOT a build job, it's a cleanup pass**, and the cleanup is dominated by a
> single mechanical item: **~1,250 hardcoded hex colors across 4 files** with no theme tokens. **Timing: it's the live
> surface — independent of GameTracker, the offseason, and the D13/L-stack gates — so it can be done ANYTIME (no gate
> forces a wait).**

---

## BUILD STATUS (in scope) — essentially DONE (~95%)

All in-scope tabs render real data (`FranchiseHome.tsx`, ~4,907 lines + `TeamHubContent.tsx` ~6,697 + `ScheduleContent`
+ `AwardsWatchlist`):

- **Regular season:** News (Tootwhistle Times) · Today's Game (lineup review, sim, score-entry) · Schedule
  (IndexedDB grid + add/edit/import) · Standings · **Team Hub** (deep: summary / fan-morale / roster / directory /
  season-stats / stadium spray-chart / manager — each with player-profile-card drill-downs) · League Leaders · Awards
  Watchlist · Roster & Trades (live, dry-run) · Museum. — **all BUILT.**
- **Playoffs:** News · Bracket (+ seeding repair flow) · Series Results · Playoff Stats · Playoff Leaders · Awards ·
  Team Hub · Advance-to-Offseason gate · Museum. — **all BUILT** (playoff stats/leaders populate from GameTracker data
  by design).

**The only in-scope BUILD gaps (≈5%, all minor / optional):**
| Gap | Where | Note |
|---|---|---|
| All-Star tab is a stub | `FranchiseHome.tsx:1483`; gated `MODE_2_V1_ALL_STAR_UI_ENABLED=false` (`:181`) | Field-layout skeleton built; data-binding waits on the season-stats engine + the gate. Don't build until the gate flips. |
| Playoff game chips have no drill-down | `FranchiseHome.tsx:2314` (`PlayoffGameResultChip`, no onClick) | Can't click a playoff game → box score. Optional depth add. |
| 1 non-blocking TODO | `FranchiseHome.tsx:3443` ("load from careerStorage milestones") | Milestone detection WIP; not breaking. |

---

## THE CLEANUP PASS (the actual work)

### CLEAN-1 — Color/theme tokens + shared patterns (the dominant item) · ~3–5 days
The whole cleanup, basically. **~1,250 hardcoded hex literals** in `bg-[#......]`/`text-[#......]` className strings,
across exactly 4 in-scope files, all using the SAME consistent ~9-color palette → mechanical extraction to CSS
variables / a Tailwind theme:

| File | Hardcoded hex |
|---|---|
| `FranchiseHome.tsx` | **626** |
| `TeamHubContent.tsx` | **506** |
| `ScheduleContent.tsx` | **90** |
| `AwardsWatchlist.tsx` | **30** |

The palette is already consistent (`#567A50` page bg · `#6B9462` header/tabs · `#5A8352` · `#4A6844` borders ·
`#E8E8D8` text · `#C4A853` gold accent · `#00DD00` win · `#0066FF` · `#DD0000`). Map these to the official **KBL
8-color palette** tokens (see the `color_palette` design memory), define them once (CSS vars / Tailwind config), and
sweep the 4 files. (No shared `Button` component exists today — fold a small set of shared chip/card/button classes
into this pass.) **This is mechanical, not design-debate — the palette is already decided; it's just inlined 1,250×.**

### CLEAN-2 — Minor polish (≤1 day) · optional
- **Unify card components** — the All-Star field position boxes (`FranchiseHome.tsx:1507`) vs playoff performer cards
  (`:2429`) are divergent grids; one reusable card.
- **DRY the empty-state messages** — 2–3 "no playoff data yet" variants (`:2253`, `:2456`) say the same thing
  differently.
- **Loading skeletons** — 2–3 async sections (e.g. GameDayContent `:3222`) pop in without a loader.
- **Magic round integers** — `getRoundName(round)` on bare 1/2/3/4 (`:2267`).
- *(Optional build)* the playoff-game-chip → box-score drill-down (the one missing depth above).

**No dead/disabled buttons in scope, and almost no dummy data** (1 non-blocking TODO; mock data is IndexedDB-failure
fallback only). So the cleanup really is ~95% the color-token extraction.

---

## WHEN TO RUN IT

This is the **live, in-use franchise hub** — it has **no dependency** on GameTracker, the offseason, the L-stack
backend, or the D13 activation gate. **So it can be done ANYTIME, including now.** Nothing forces a wait.

- **If the drift bugs you now / you want a break from the L-stack backend → do it now.** It's mechanical, self-contained,
  improves the shipped app immediately, and it's a clean palette-cleanser between heavy backend tickets.
- **Mild bonus to doing the color tokens sooner:** the future post-D13 activation overlays (fame badges, designation
  chips, morale, narrative) will land *inside this same franchise hub* — so establishing the tokens now means those
  future surfaces inherit them for free (no second cleanup). But that's a nice-to-have, not a gate.
- **If you'd rather keep momentum on the L-stack backend** (L11→L14→L-SIM) → it's perfectly safe to defer; it'll be
  ready the moment you call it, and there's no penalty for waiting since it's decoupled from everything.

**Recommendation:** it's a ~1-week pass (mostly CLEAN-1), low-risk and decoupled — slot it whenever you want a focused
UI sprint; there's no "must be before/after X" for this scope. The only sequencing nicety is doing CLEAN-1 before the
hub's future activation overlays, which is far off.

---

## OUT OF CURRENT SCOPE (noted so it's not lost)

These are real UI work but **NOT** part of this franchise-hub cleanup pass:
- **GameTracker** — JK considers done (the 4-column refactor + audio + player-card buttons live here if ever revisited).
- **Offseason** — deferred; 10 phase tabs are gated read-only shells (`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED=false`).
- **Post-D13 soul-layer activation UI** (~12 surfaces: trait-confirm console, fame, designations, morale, narrative,
  races/awards, relationships, rebrand) — the big *build* backlog, gated behind D13 + L-SIM. Several of these will
  surface *inside* this franchise hub when activated — which is why CLEAN-1's tokens help them later.
- Settings page (missing), Almanac stub polish — separate.
