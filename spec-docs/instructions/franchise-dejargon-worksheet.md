> **HISTORICAL — ruled OBSOLETE 2026-07-07** (see `spec-docs/V1_CANON_2026-07-07.md` §6): this worksheet referenced the old hub UI and is no longer an active JK markup task; the de-jargon principle is already canon via `UX_NORTH_STAR.md` §6 banned-words list. Kept for reference only, not for execution.

# Franchise Hub — DE-JARGON WORKSHEET (for JK iPad review)

**Status:** PROPOSAL ONLY — nothing applied. Per JK ruling 2026-06-19: produce
this worksheet; JK picks/edits wording on iPad; then execute as **ONE coordinated
ticket** (copy + test updates together). Do NOT trial-edit against the
characterized tests.

**How to use:** in the "JK wording" column, keep / edit / reject each. Anything
you approve, I change the string AND the listed test assertion in the same commit.

**Held out of this worksheet (per rulings):**
- **Relationship-context text → L13.** `TeamHubContent.tsx:4174` + the
  engine-generated copy in `franchiseRelationshipContextPreview` (evidencePolicy)
  / `franchiseSeasonEndReadiness` (limitations). It's engine output (a behavior
  change) and L13 is in recon — fold the wording there, not here.
- **Status panels → keep as-is** (ruling #5, D11-ratified). Listed in the
  "EXCLUDED" section below for completeness, not for editing.

---

## A. Candidates — fan-facing descriptive prose

| # | File:line | Current text | Suggested plain wording | Test assertion to update | JK wording (keep / edit / reject) |
|---|---|---|---|---|---|
| W1 | `AwardsWatchlist.tsx:169` | "Final awards from the season-end **D9 awards store**." | "Final awards for the season." | `SeasonSummary.pass5.test.tsx:333` — `findByText(/Final awards from the season-end D9 awards store/i)` | |
| W2 | `TeamHubContent.tsx:5120` | "**Graphic plot from scoped** completed-game spray evidence. Heat map **remains deferred**." | "Plotted from completed-game spray data. Heat map isn't available yet." | `TeamHubContent.franchiseReads.test.tsx:1506` — `getByText(/Graphic plot from scoped completed-game spray evidence/i)` | |
| W3 | `TeamHubContent.tsx:3471` | "**Franchise v1** shows **archive-backed** spray rows in Team Hub Stadium. Full heat maps and stadium diagrams **remain deferred**." | "Spray rows come from completed games. Full heat maps and stadium diagrams aren't available yet." | **none** (not asserted) — no test change | |
| W4 | `TeamHubContent.tsx:5965` | "Generated from **scoped archive**, schedule, roster, profile, or stadium facts." | "Built from your completed games, schedule, and rosters." | **none** (not asserted) — no test change | |
| W5 | `FranchiseHome.tsx:2581` | "Offseason **execution is deferred** in **Franchise v1**" | "The offseason isn't available yet." | `FranchiseHome.test.tsx:246` — `getByText(/Offseason execution is deferred/i)` | ⚠ offseason-adjacent — may prefer to handle with offseason work |

Notes:
- W1: awards ARE live; "D9 awards store" is pure internal jargon. The honest
  projected→final framing elsewhere is untouched.
- W2/W3: spray rows are live; the heat-map/stadium-diagram part is genuinely
  not-yet — the suggestions keep that honest, just plainer.

---

## B. EXCLUDED — status panels / chips (ruling #5: keep as-is)

Listed so you have the full jargon picture. If any read badly on the iPad, mark
them and I'll fold them into the approved subset.

| File:line | Text | Why excluded |
|---|---|---|
| `FranchiseHome.tsx:213` | "Use Museum and season summary surfaces for read-only review." | gate panel (193–217) |
| `FranchiseHome.tsx:2956` | "Deferred" | status chip |
| `FranchiseHome.tsx:2964` | "No Mutation" | status chip |
| `TeamHubContent.tsx:3908` | "Deferred / Blocked" | status chip |
| `TeamHubContent.tsx:4854` | "No final True Value or offseason mutation" | status line |
| `TeamHubContent.tsx:4883` | "Blocked: expected-wins persistence, final True Value handoff authority, salary movement, morale/relationship mutation, offseason, Mode 3." | honest blocked-families list |
| `TeamHubContent.tsx:5615+` | entire "MODE 2 FOUNDATION STATUS" panel ("READ ONLY", `formatTruthStatus` lines, "Hidden-safe boundary") | engineering transparency readout |
| `TeamHubContent.tsx:5875` | "Deferred / Blocked" | status chip |
| `TeamHubContent.tsx:6050` | "Safe-effect preview" | status label |
| `TeamHubContent.tsx:6180+` | "VALUE / SALARY / DESIGNATION TRUTH" panel | status panel |
| `TeamHubContent.tsx:6241` | "Blocked / deferred designation reasons" | status label |
| `SeasonSummary.tsx:881` | "Read-only awards-aware handoff package" | D11-ratified manifest phrase |

---

## C. Held for L13

| File:line | Text | Disposition |
|---|---|---|
| `TeamHubContent.tsx:4174` | "Read-only / draft-only proposal context. No durable relationship state exists in Franchise v1." | engine-mirrored (`franchiseRelationshipContextPreview` evidencePolicy + `franchiseSeasonEndReadiness` limitations); tests `TeamHubContent.franchiseReads.test.tsx:2292-2293`, `franchiseRelationshipContextPreview.test.ts:86`, `franchiseSeasonEndReadiness.test.ts:70`. **Fold wording into L13.** |
