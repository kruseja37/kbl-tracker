# Franchise Hub — BUSY-SPOTS INVENTORY (for JK iPad review)

**Status:** PROPOSAL ONLY — nothing refactored. Per JK ruling 2026-06-19:
inventory the dense spots; JK marks up on iPad which are **genuinely busy** vs
**characterfully dense (retro)**; then I execute only the approved subset. No
layout restructuring either way — spacing/size tweaks only.

**Audit headline:** the in-scope **primary** cards already follow good density
(`p-4`, `gap-3`, ≤5 data points, one emphasis — e.g. playoff performer cards
`FranchiseHome.tsx:2430`). The density is concentrated in **150 `text-[8px]`**
(+ a few `text-[7px]`) caption/table clusters that are largely the intentional
retro SNES look. Zero tight-padding cards. So this is a "pick the few that hurt
readability" pass, not a refactor.

**Retro-identity flag legend:** 🟢 low risk (table/data, safe to enlarge) ·
🟡 medium (compact card, enlarging changes feel) · 🔴 high (the density IS the
retro aesthetic — enlarging breaks the look/fit).

**How to use:** in "JK verdict", mark each cluster **FIX** / **KEEP** (and tweak
the proposed treatment if you want). I apply only the FIX rows.

---

## Clusters

| # | File:line range | What it is | Density observation | Proposed lighter treatment | Identity risk | JK verdict |
|---|---|---|---|---|---|---|
| D1 | `FranchiseHome.tsx:3177-3182` | **Standings table header** (TEAM/W/L/GB/RD) | column labels at `text-[8px]` | headers `text-[8px]→text-[9px]`; `gap-2→gap-3` | 🟢 | |
| D2 | `FranchiseHome.tsx:1989-2141` | Playoff bracket / series rows | ~10 `text-[8px]` in matchup rows | bump matchup names `8px→10px`; keep meta at 8px | 🟡 | |
| D3 | `FranchiseHome.tsx:4413-4544` | Today's-game lineup / grid rows | ~13 `text-[8px]` packed rows | `space-y` +1 step on row groups; primary names `8px→10px` | 🟡 | |
| D4 | `FranchiseHome.tsx:4661-4793` | News (Tootwhistle) card meta | ~7 `text-[8px]` byline/meta | leave body, bump headline only if <10px | 🟡 | |
| D5 | `FranchiseHome.tsx:1516-1708` | **All-Star field position boxes** | ~14 `text-[8px]` | — | ⏸ **SKIP**: tab gated OFF (`MODE_2_V1_ALL_STAR_UI_ENABLED=false`), not rendered/verifiable | |
| D6 | `TeamHubContent.tsx:4263-4541` | Roster / season-stats **compact list cards** | `text-[7px]` titles + `text-[8px]` 4-entry lists | titles `7px→8px`; list `space-y-1→space-y-2` | 🟡 | |
| D7 | `TeamHubContent.tsx:2998-3216` | Roster / directory rows | ~24 `text-[8px]` row cluster | primary name col `8px→10px`; secondary stays | 🟡 | |
| D8 | `TeamHubContent.tsx:6356-6665` | Season-stats deep tables | ~20 `text-[8px]` table cells | row padding `py-0.5→py-1`; header `8px→9px` | 🟢 | |
| D9 | `ScheduleContent.tsx` (23×) | **Schedule calendar grid** game chips | dense grid of `text-[8px]` cells | (optional) chip `8px→9px` only if grid still fits | 🔴 the dense grid IS the retro scoreboard look | |

**Excluded from this inventory (per ruling #5 — status panels stay as-is):**
the `text-[8px]` inside `TeamHubContent.tsx:6178+` ("VALUE / SALARY / DESIGNATION
TRUTH") and `5615+` ("MODE 2 FOUNDATION STATUS") are status-panel captions —
left alone.

---

## Cross-cutting options (apply only where a cluster above is marked FIX)

- **Smallest-text floor:** raise any `text-[7px]` → `text-[8px]` first (D6) —
  the clearest readability win, lowest risk.
- **Primary vs caption:** only enlarge the ONE primary value/name per card/row;
  keep secondary metadata at 8px to preserve the look.
- **Breathing room over size:** prefer a `space-y`/`py` bump (separation) to a
  font-size bump where it's a list/table — less identity drift.

Nothing here changes data, logic, or layout structure — only Tailwind
spacing/size utilities on the approved spots.
