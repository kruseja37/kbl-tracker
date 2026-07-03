# PLAYER NUMERIC GRADE & LEAGUE LEADERBOARD — DESIGN SPEC

> **STATUS: DRAFT — DESIGN THREAD ONLY. NOT APPROVED. NO CODE.**
> Author: Claude Opus 4.8 (Captain) · Date: 2026-06-24 · For: JK ruling
> This document is a design proposal. It must not be built from until JK approves.
> It does **not** modify any in-flight branch (`codex/franchise-v1-next`, `codex/mode1-v1-b`).
> Grounded in research workflows over the live code + the frozen 440-man pool (`spec-docs/reference/iv_oracle.json`, read-only).

---

## 0. One-paragraph summary

Today a player's overall quality shows as a **letter grade**. This spec replaces that letter with a
**precise number**, and—because that number can be ranked—grows it into a **league-wide player
power-ranking / leaderboard**: a real-time, display-only system that ranks every player across the
whole pool and slices them by team, position, and **player archetype** ("#3 Glove Wizard in the
SML"). It is purely presentational: it reads numbers the engines already produce, never feeds any
calculation, and never touches the frozen valuation oracle.

---

## 1. The four numbers a player carries

| # | Number | Type | Answers | Fed by (existing output, read-only) |
|---|--------|------|---------|-------------------------------------|
| 1 | **Overall (0–99)** | Absolute | "How good is this player, on SMB4's own grade scale?" | The canonical fitted grade (`scoreSmb4Player` numeric score), tidied to 0–99. This is the un-binned version of today's letter. |
| 2 | **Talent percentile / rank** | Relative (ratings) | "Where do their ratings rank vs the league?" | #1 ranks players by their Overall across **current MLB rosters only** (farm excluded). |
| 3 | **Performance rank** | Relative (results) | "Where do their *actual results* rank, vs positional peers?" | **WAR** and **WPA**, within position/role group. |
| 4 | **True Value ($)** | Absolute (value) | "What is this player worth?" | The existing IV/TV dollar valuation. A third lens; its own concept. |

Numbers 1 and 2 ride together on a player's card; 3 and 4 live on the leaderboard alongside them.

---

## 2. Scale decisions (RULED with JK)

- **Per-card headline = the 0–99 Overall, with the talent percentile beside it.** The letter is
  **replaced**, not shown alongside.
- **0–99 was chosen** because: (a) it is literally the number already under the letter — "just
  surface it"; (b) every tool rating (power, speed…) is already 0–99, so an overall on the same
  scale reads instantly; (c) it deliberately does **not** reuse scouting's **20–80**, keeping the
  precise, full-information leaderboard visually distinct from the **foggy, banded** scouting view.
- The raw fitted score is unbounded but clusters ~15–97; for display it is clamped/tidied into a
  clean **0–99**. The number stays **absolute** (a player's Overall does not move just because the
  pool changed); the *relative* story is carried entirely by the percentile/rank.

---

## 3. Talent percentile / league rank (ratings-based — number #2)

- Ranks players by their **Overall (#1)**.
- **Denominator switches by context:** during the **draft** it is vs the **draft pool**; once **Mode 2**
  is initialized it is vs the **league**.
- **Farm rosters are excluded** — this is an **MLB-level** ranking. It **recomputes in real time
  whenever an MLB roster changes** (call-up, send-down, trade, release).
- Shown as a percentile ("better ratings than 87% of the league") and/or an ordinal rank (#/N).
- This is *talent/potential*, independent of results.

---

## 4. Performance rank (results-based — number #3)

- Ranks players by **actual in-game performance, ignoring ratings**, **within position/role group**:
  "#1 shortstop," "#3 closer," "#18 reliever."
- **Two parallel sub-rankings, both shown:**
  - **WAR** — steady, season-long value ("most valuable SS all year").
  - **WPA** — clutch / leverage ("the guy who actually swung the most games").
  A player can be #1 by WAR and #4 by WPA, or vice-versa — that contrast is the point.
- Relievers/closers rank among their own role (leverage-aware reliever WAR).
- **Role-relevant flavor stats** show beside the rank (HR/AVG for sluggers, saves for closers,
  ERA/K for starters), so each board reads like a baseball card.
- Recomputes **as games are played**. Surfaces the player's **top archetype** (§5).

---

## 5. Archetype system (earned + multi — holistic identities, NOT trait restatements)

### 5.0 Design correction (JK, 2026-06-24) — archetypes ≠ traits
The §5.2 taxonomy below **over-indexed on traits and must be reworked.** JK's ruling: when 23 of 27
"archetypes" are trait-gated, they aren't archetypes — they're **traits with a new name** ("has Big
Hack → Power Masher" is circular). A real archetype is an **emergent player TYPE** — a recognizable
kind of ballplayer identifiable from the **shape of the whole tool + position profile even with the
trait names hidden** (e.g. "three-true-outcomes corner slugger," "slap-and-dash leadoff," "glove-first
up-the-middle defender," "crafty junkballer," "power closer"). **Traits are MODIFIERS/sub-flavor on
top of a profile-shape archetype, never the definition of one.** Next pass: discover ~10–16 holistic
profile-shape clusters first (tools + position), then let traits refine/sub-type within them — do not
mint an archetype whose only gate is a trait the player already visibly has. *(Status: archetype
sub-design REOPENED; the rest of this spec — §1–§4, §6–§9 — stands.)*

### 5.1 The model (relationship — stands)
- An archetype is a **signature you EARN** by genuinely fitting it — defined by a **fusion of tools +
  named traits + position**, not a generic single-tool bucket (JK directive 2026-06-24).
- **Multi-membership:** a player may wear **several** badges, or **none**. Players with no standout
  identity simply earn no badge — there is no forced "everyone else" label.
- A player's **"top archetype"** = the badge they rank **highest** in (best fit-percentile).
- Each archetype has a **fit-ranking stat** → a leaderboard ("#3 Vacuum Cleaner in the SML").
- **Tool-based boards too:** alongside the archetype boards, simple Top-Power / Top-Speed /
  Top-Defense / Top-Pitching boards are trivial sorts on existing ratings.

### 5.2 The proposed taxonomy (from the 440-pool analysis)
Discovered by clustering the **real** pool on tools + the **actual** trait vocabulary (which is far
richer than the model's flag list — Sign Stealer, Butter Fingers, Dive Wizard, Ace Exterminator,
RBI Hero, Mind Gamer, Distractor, Specialist, Crossed Up, Volatile…) + position. **23 of 27 are
trait-driven.** Counts are at the analysis's first-pass thresholds (a **tuning pass** will adjust
them); they show which badges are rare vs common and which need tuning.

**Hitter archetypes**

| Archetype | Identity | Basis | ~Members |
|-----------|----------|-------|----------|
| Power Masher | Raw HR producer | POW + Big Hack | 20 |
| Contact Master | Elite bat control, rarely whiffs | CON + Consistent/Ace Exterminator | 17 |
| Speed Demon | Burner, steals + stretches | SPD + Sprinter/Stealer | 13 |
| Utility Contributor | Versatile depth, fills roles | Utility trait / balanced | 13 |
| Clutch Situational Hero | Rises in big spots | Clutch / RBI Hero | 4 |
| Cannon Arm Boss | Elite throwing arm | ARM (tool) | 4 |
| Slap Technician | Crafty contact + mobility | Little Hack + CON/SPD | 3 |
| Field General | Cerebral pitch-caller (C) | Sign Stealer (C) | 3 |
| Vacuum Cleaner | Acrobatic range at premium D positions | FLD + Magic Hands/Dive Wizard | 3 |
| Pinch Specialist | Off-bench virtuoso | Pinch Perfect | 3 |
| Mind Gamer | Plate psychologist | Mind Gamer | 2 |
| Defensive Fortress | Elite glove + arm | FLD + ARM (tool) | 1 |
| Tough Out | Unbreakable grinder | Tough Out | 1 |
| Contact+Speed Hybrid | Table-setter | CON + SPD + Sprinter | 1 |
| *Off-Speed Technician* | Breaking-ball killer | Off-Speed Hitter + POW/CON | *tune* |
| *Ace Exterminator* | Neutralizes elite stuff | Ace Exterminator + CON | *tune* |
| *Distractor* | Disrupts pitcher rhythm | Distractor | *tune* |
| *Stealer / Base Thief* | Constant steal threat | Stealer / SPD + disruptor | *tune* |
| *Ballpark Architect* | Elite power **and** speed | POW + SPD (tool) | *cut (0, too strict)* |

**Pitcher archetypes**

| Archetype | Identity | Basis | ~Members |
|-----------|----------|-------|----------|
| Command Virtuoso | Works ahead, surgical control | Gets Ahead + ACC | 36 |
| Deceptive Deceiver | Movement/spin confusion | Crossed Up + JNK | 16 |
| Strikeout Assassin | Power-K fastball | K Collector + VEL/JNK | 12 |
| Rally Stopper | Shuts down rallies | Rally Stopper | 8 |
| Two-Way Athlete | Pitcher dangerous at the plate | POW (tool) | 7 |
| Volatile Wildcard | Nasty but inconsistent | Volatile | 6 |
| Specialist Fireman | One-situation master | Specialist | 5 |
| Workhorse Ironman | Innings-eating backbone | Workhorse + ACC | 4 |

### 5.3 Known tuning items (build pass, not design blockers)
- **Coverage** at first-pass thresholds: ~**34%** of players earn ≥1 badge, ~0.41 badges/player.
  Loosening tool thresholds ~5–10 pts lifts this to ~40–50%. → *Decision: how special should a
  badge be (see §10).*
- A handful of trait-driven archetypes returned 0 members purely because the validation's trait
  **name-matching** missed the real strings (e.g. "Off-Speed Hitter", "Ace Exterminator" exist in
  the data) — a reconciliation/threshold fix, not an empty concept.
- **Command Virtuoso** (36) is too broad; tighten. **Ballpark Architect** (0) is too strict; cut or merge.
- **Pure-tool badges** (Cannon Arm Boss, Defensive Fortress, Two-Way Athlete) carry identity from the
  tool itself — *Decision: keep a few honest tool-elite badges, or require trait flavor everywhere (see §10).*

---

## 6. The dedicated leaderboard display

- A **dedicated, real-time leaderboard page** (sibling to the existing Fame leaderboard surface).
- **Filters:** whole-league · team · position · archetype.
- **Columns/lenses:** Overall (#1) · talent percentile/rank (#2) · performance WAR & WPA (#3) ·
  True Value $ (#4) — the user can sort/compare players across talent, results, and value.
- **Aligns with the TV display** (lives alongside it) while staying a distinct concept.
- Reuses existing ranking UI patterns (descending sort, #N rows) already proven on the Fame board.

---

## 7. Real-time vs checkpoint (RULED)

- Every number here is a **pure function of current ratings/results**, so **"real-time" is free** —
  recompute on render; nothing to store; always current. This is the **live projection**.
- The **official** board + **trend arrows** ("was #12, projecting #8") come from a **lightweight
  snapshot taken at each checkpoint**, riding the checkpoint cadence the season already uses.
- So: **live = recompute on the fly; official = checkpoint snapshot.** No confidence band — the
  number is precise (unlike scouting's bands, which model uncertainty for *unknown* prospects).

---

## 8. What reads it / what it never touches (RULED)

- **Nothing in the engine ever reads these numbers.** Trades, roster/AI decisions, salary, awards —
  all keep using the underlying ratings, WAR/WPA, and dollar value they use today. The leaderboard
  number is **downstream** of those; engines must never depend on a display artifact.
- **Legitimate reuse = other *display* surfaces only.** A trade screen may *show* each side's rank
  for human context; the trade *math* underneath still uses value, not this number.
- **The frozen IV/grade oracle is never touched.** This system only *reads* existing outputs, writes
  nothing back into valuation, and adds no new calculation to the value/grade path.

---

## 9. Data sources (display-only wiring sketch)

| Number | Source (read-only) |
|--------|--------------------|
| Overall 0–99 | `scoreSmb4Player` numeric score → clamp/tidy to 0–99 |
| Talent percentile/rank | rank Overall across current MLB rosters; percentile machinery already exists in the historical-player adapter |
| Performance WAR | existing bWAR/pWAR/rWAR calculators (season-to-date) |
| Performance WPA | existing WPA/leverage attribution (season-to-date) |
| True Value $ | existing IV/TV valuation (oracle untouched) |
| Archetype fit | recipes over the 0–99 ratings + traits + position (§5) |

No new persistence is required for the live view. A small checkpoint snapshot store (parallel to the
existing checkpoint snapshots) backs the official board + trend arrows — **no `trackerDb` bump
implied** if it reuses an existing snapshot surface (to be confirmed at build).

---

## 10. Open forks for JK ruling

1. **Badge rarity / coverage.** Keep badges **special & rare** (~a third of players wear ≥1, as the
   first pass produced), or **loosen** so ~half-to-most "interesting" players wear at least one?
   *(Recommendation: tune slightly looser to ~40–50% — a badge should mean something, but most
   characterful players should have one.)*
2. **Pure-tool badges.** Keep a few honest **tool-elite** badges (Cannon Arm, Defensive Fortress)
   even without a trait, or require **trait flavor on every** archetype? *(Recommendation: keep a
   small number where the tool *is* the identity; cut the truly empty ones.)*
3. **Taxonomy size.** ~22–24 distinctive archetypes after cutting empties — good, or trim tighter?
   *(Recommendation: ~20–24 is rich but tractable; cut the 0-member ones, tighten Command Virtuoso.)*
4. **Naming pass.** The names above are the analysis's; want a deliberate naming pass for tone
   (punchy/funny vs straight)? *(Recommendation: yes, a quick naming polish before build.)*

---

## 11. Out of scope / v2 candidates

- Historical/all-time leaderboards (retroactively numbering past seasons' letter grades).
- Archetype *evolution* over a career (badges earned/lost as ratings change across seasons).
- Cross-archetype "who's the better #1" meta-ranking.
- Surfacing the number inside narrative/reporter copy.
