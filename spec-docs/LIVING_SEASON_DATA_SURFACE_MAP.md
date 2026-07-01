# Living Season — Data Surface Map

> What the living season actually produces, where each piece should live in the hub, and whether it's
> **live now** or **waiting on a flag.** Built from a field-level code/spec deep dive (2026-06-26).
> This is the planning reference: we design each tab to the data it must hold, instead of retrofitting.
> Pairs with `FRANCHISE_DESIGN_SYSTEM.md`. Branch `codex/auction-draft-ux-rehaul`.

---

## 0. The headline (plain)

The data plumbing is **mostly real and persisting**. The new aged-Fenway hub is a polished shell still
fed by **mock** data. So the work ahead is mostly **wiring**, in two buckets:

- **LIVE NOW (no flags needed) — wire these first.** True Value + the salary-vs-value gap, the awards
  races, standings, the stadium spray charts, per-game fame, current traits + grade, team payroll.
- **DARK (built, switched off) — build the surface, it lights up when the flag flips.** Player & fan
  morale + their reasons-logs, relationships, designation *effects*, the ratings/trait *development*
  layer, the checkpoint sweep, accumulated fame, and the season-arc news ranking.

**Your salary-vs-value example proves the point:** True Value and the gap (`valueDelta = trueValue −
salary`) are computed and saved **every game**, and the Roster row *already has the fields* — both
hardcoded to "—". Surfacing it is a one-afternoon wire, not a build. (See §2 Roster.)

**Two caveats up front:** there is **no salary cap / luxury tax** in the code (don't design a cap UI —
v2). And **Captain + Fan-Hopeful** designations are policy-blocked, so only **4 of the 6** badges carry
real data short-term.

---

## 1. The two states (legend)

| | meaning |
|---|---|
| 🟢 **LIVE** | computes + persists in normal play today; safe to read and render now |
| 🟡 **DARK** | engine + store + types are built, but gated by a `franchisePhase2*` flag (default off) — reads return neutral/empty until the living season is switched on. Build the UI; it fills in later. |
| ⚪ **ABSENT** | not in this worktree / not built — do not spec as a "surfacing" task |

---

## 2. Surface-by-surface plan

### THE ROSTER tab — *give it the economic picture (the #1 win)*
The current columns (Name · Pos · Designation · WAR · Salary · Morale) miss the GM's core read. New shape:

| Column | Source (field) | State | Room |
|---|---|---|---|
| # · Pos · Name | `Player` | 🟢 | — |
| Grade | `Player.overallGrade` (current grade = `scoreSmb4Player` on merged ratings) | 🟢 | badge |
| Traits | `Player.trait1 / trait2` (chips) | 🟢 | 2 chips |
| WAR | season WAR | 🟢 | 1 col |
| **Salary** | `Player.salary` / `getVisibleSafeFranchisePlayerSalary` | 🟢 | 1 col |
| **True Value** ← new | `FranchiseTrueValueRow.trueValue` (`getFranchiseTrueValueRow`) | 🟢 *(field on row, hardcoded "—")* | 1 col |
| **Net (value gap)** ← new | `FranchiseTrueValueRow.valueDelta` (+$ green / −$ red) | 🟢 *(field `netDiff` exists, "—")* | 1 col |
| Designation | `FranchiseDesignationRow` badge | 🟢 (4 of 6) | badge |
| Morale | `FranchiseMoraleSnapshot.currentValue` + state | 🟡 (neutral 50 until on) | tap → ledger |

Plus a **team-header payroll chip** (`salaryBaseline.teamPayrolls[teamId]` — "Total payroll $X / N players"). 🟢
Tapping a player opens the **Player drawer** (below). *No cap meter — there is no cap.*

### THE PLAYER DRAWER — *the deep dive (net-new surface)*
Opened from a roster name. Where all the per-player depth lives so the table stays glanceable:
- **Identity:** name, pos, age, B/T, grade, True Value + a **value sparkline** (`FranchiseTrueValueSnapshotRow` per checkpoint). 🟢
- **Ratings:** the 8 numbers; base→current with ▲/▼ when the overlay layer is on (`mergeRatingsOverlays`). base 🟢 / development 🟡
- **Traits:** current chips + a **gain/lose timeline** ("Earned *Magic Hands* at checkpoint 3", from `FranchiseTraitOverlayRow`). current 🟢 / history 🟡
- **Morale block:** value ring + state word + risk chip + trend + the **reasons-log** (`FranchiseMoraleHistoryEntry`). 🟡 (store + view-model shipped)
- **Ties:** relationship edges (`RelationshipEdgeRow` — partner, type icon, intensity bar, "since game N"). 🟡 *(needs a per-player filter + partner-name lookup helper)*
- **Designations + effects:** badge row + effect text ("Captain: charisma counts double"). 🟡 effects
- **Fame:** the per-game events strip (🟢, already on PlayerInstanceCard) + heat / immortality meter / channel breakdown when on (`FranchiseFameRecordRow`). 🟡 accumulated

### THE CLUBHOUSE (Season Home) — *already built; wire the ranking*
Lead story = highest **`SeasonNewsItem.dramaticWeight`** 🟡 · impact cards ranked by morale-risk / checkpoint-timing / awards-race move · next game · pulse. (Mostly built to mock; wiring = the news sort + the impact signals.)

### STANDINGS & RACES (league) — *mostly live, not yet rendered in the lens*
- **Standings:** the full `TeamStanding` (W/L/winPct/GB/streak/last-10/run-diff/home-away) via `calculateStandings`. 🟢 *(the current grouped projection drops streak/L10 — surface the full row)*
- **Races:** drop in `AwardsWatchlist` (frontrunner + `marginToWinner` gap bars per category — MVP/Cy/ROY…). 🟢 **end-to-end live**
- **All-Star board:** `getFranchiseAllStarRoster` (starters/reserves by position, lock at 60%). 🟢 engine/store — *but the live board's 4 getters return empty; point them at the roster.* Snubs feed morale.

### STADIUM — *live spray charts; V2 records absent here*
- **Spray-chart panel:** `FranchiseSprayChartRow/Summary` via `buildFranchiseStadiumFoundationReport` — renders real batting/pitching/fielding rows with zones/outcomes. 🟢 *(port the working `FranchiseStadiumFoundationPanel` from TeamHubContent)*
- **Records:** the 8-type catalog 🟢. The **V2 fame-bearing catalog** (farthest HR by hand, WPA house-of-horrors, clutch/goat swings) is ⚪ **absent in this worktree** — it landed on `franchise-v1-next`; merge or rebuild later.
- **Park factors:** seed factors 🟢; adaptive factors preview-only.

### THE TOOTWHISTLE TIMES — *real stories exist; sort by impact*
Build the live adapter: lead = top-`dramaticWeight` `SeasonNewsItem`, secondary stories under it, `GameStory`
per-game recaps as the stream. 🟡 *(the data's persisted; the legacy tab shows GameStory only and doesn't
rank by dramaticWeight — that ranking is the single biggest narrative win.)*

### THE CHECKPOINT CONFIRMATION worklist — *moment-driven takeover (net-new)*
At each 20% checkpoint: group the `pending` ratings/trait overlays by player (`sourceEventId =
"checkpoint-{n}"`) → "POW 62→65 ▲, gained *Magic Hands* (displaces *Butter Fingers*)" as a transcription
checklist the GM works through and confirms (flips `pending→confirmed`). 🟡 *(there's no separate change
store — the overlays ARE the change record; new = base + delta.)* Full-screen, one card per player.

---

## 3. Build order this implies

1. **Roster economic columns (True Value + Net) + payroll chip** — highest value, lowest effort, data
   already live and waiting. Directly answers "am I getting value?"
2. **Standings & Races** + **Stadium spray** — live data, port/render in the lens.
3. **The Player drawer** — the home for all the per-player depth (lets the table stay clean).
4. **Tootwhistle live feed** sorted by `dramaticWeight` — the biggest narrative win.
5. **Morale / ties / designation effects / fame / development / checkpoint** — build the surfaces now;
   they fill with real values when the franchise team flips the Phase-2 flags (and we can seed/mock to
   verify the layouts before then).

**Reuse note:** the legacy `TeamHubContent.tsx` already wires several of these live (morale + designation
roster columns, the stadium spray panel, `AwardsWatchlist`). It's the proven read-pattern to copy into
the new lens — we're not inventing the data access, just giving it the right home and look.
