# Farm-Archetype → Scout-Confidence Table — DESIGN DRAFT

**Status: RATIFIED by Fable (captain design authority), 2026-07-08. Rulings on the three open questions are in �8. This table is the authored source for F2/F3.**
**Repo read (read-only): `/private/tmp/kbl-port2`. This file is the only write.**

## What this closes

Per `spec-docs/SCOUTING_INTELLIGENCE_SPEC.md` §7 and JK's Friday findings F2/F3
(`spec-docs/MODE1_PUNCHLIST_2026-07-08.md`), the farm Scout's confidence bands
(3 = tight/strong, 5 = average, 7 = wide/weak) are supposed to come from the team's
**Farm archetype** — but the archetype→per-area-confidence table has never been
authored. Today the bands come from the *hired scout's* generic specialty tags
(a shared, archetype-blind pool), which is the exact defect F2/F3 describe. This
draft is that missing table, plus where it should live and the two places that
need to start reading it.

---

## 1. The area vocabulary (derived from the engine, not invented)

`src/utils/prospectScoutingDraftEngine.ts` already defines the scoutable tool set —
these are literally the fields `scoutToolBands()` puts a band around:

```
HITTER_SCOUT_TOOLS  = ['power', 'contact', 'speed', 'fielding', 'arm']            (line 1173)
PITCHER_SCOUT_TOOLS = ['velocity', 'junk', 'accuracy', 'power', 'contact', 'speed', 'fielding']  (line 1174)
```

Union = **8 areas**: `power, contact, speed, fielding, arm, velocity, junk, accuracy`.
That's the area list the table uses — one column per area, for every archetype
(hitters use 5 of the 8, pitchers use 7 of the 8; the table itself doesn't need to
split by role, it just supplies a confidence number per area and the engine already
knows which subset applies to a given prospect).

## 2. Where the archetype's boosts/sacrifices come from

Ground truth is `src/data/historicalArchetypes.ts` — every archetype's `boosts` /
`nerfs` arrays (NOT the prose in `TEAM_ARCHETYPES_24.md`, which occasionally
rounds a minor effect into the "+" description that the code doesn't actually
count — e.g. Big Red Machine's prose says "+power" but its code `boosts` array is
only `['CON','FLD']`; `POW:0.5` in `spec` is real but too small to count as a
boosted identity area). Mapping the archetype's 11 stat codes onto the 8 scouting
areas:

| Archetype stat | Scouting area |
|---|---|
| POW | Power |
| CON | Contact |
| SPD | Speed |
| FLD | Fielding |
| ARM | Arm |
| ROT_VEL, PEN_VEL | Velocity |
| ROT_JNK, PEN_JNK | Junk |
| ROT_ACC, PEN_ACC | Accuracy |

Rotation and bullpen both collapse onto the same 3 pitching areas because the farm
engine's tool bands don't distinguish "is this specifically a starter prospect vs.
a reliever prospect" — `PITCHER_SCOUT_TOOLS` is one set for any pitcher. Two
archetypes hit the **same** area from both Rotation and Bullpen with opposite
signs (a real conflict, not an edge case I'm inventing):

- **The Opener** (`PEN_VEL: 1.5` boost vs. `ROT_VEL: -1.5` nerf) → Velocity.
- **HDH Royals** (`PEN_ACC: 0.3` boost vs. `ROT_ACC: -0.25` nerf) → Accuracy.

**Resolution rule used below:** convert both sides to the actual cap-shift
fraction (`spec value × ARCHETYPE_STAT_UNIT` for that stat) and let the larger
magnitude win.
- The Opener: bullpen +0.30 vs. rotation −0.24 → net positive → **Velocity = boosted (3)**.
- HDH Royals: bullpen +0.09 vs. rotation −0.0625 → net positive → **Accuracy = boosted (3)**.

Both resolve to "the archetype's headline (bullpenning) wins" — which matches the
identity in plain language (The Opener *is* the bullpen-forward team; HDH Royals
*is* the lockdown-bullpen team), so the mechanical tie-break happens to agree with
the fiction. Flagged as an open question below in case you want a different rule.

## 3. Design rules applied

- **Core identity areas → 3-band** (in the archetype's `boosts` array): the org's
  scouts know exactly what they're building toward, so reads are tight.
- **Off-identity / sacrificed areas → 7-band** (in the archetype's `nerfs` array):
  the org doesn't invest in evaluating what it doesn't draft for, so reads are wide.
- **Everything untouched → 5-band** (average): no signal either way.
- **Farm bands stay wider than the numbers above suggest in isolation** — this
  table only sets the *tier*; the actual pixel/rating width per tier
  (`SCOUT_TOOL_BAND_WIDTHS = {high:30, medium:50, low:70}`,
  `prospectScoutingDraftEngine.ts:1161-1165`) is already wider than the MLB-side
  scout tiers elsewhere in the app — that's an existing engine constant, untouched
  by this table.
- **Balance check:** I counted the 3s and 7s in every row (table below). Totals
  across all 24 archetypes: **45 threes, 38 sevens** (avg row ≈ 1.9 tight areas,
  1.6 wide areas). No single archetype runs away with it — every row's own
  3-count minus 7-count is either 0 or +1, except Rangy Defenders at +1 (3 boosts,
  2 nerfs — it's the one archetype with three boosted areas). Nobody is at +2 or
  worse. I did **not** artificially force every row to exactly 1:1 — that would
  mean inventing sacrifice areas the archetype's own design doesn't have (e.g.
  Nasty Boys and Nasty-Boys-shaped archetypes that only touch two areas total).
  See open question 1.

---

## 4. THE TABLE (24 rows)

Columns: **Pw**=Power, **Ct**=Contact, **Sp**=Speed, **Fl**=Fielding, **Ar**=Arm,
**Vl**=Velocity, **Jk**=Junk, **Ac**=Accuracy. Values are the band width (3/5/7);
**bold = core (3)**, *italic = weak (7)*, plain = average (5).

| Archetype (`id`) | Pw | Ct | Sp | Fl | Ar | Vl | Jk | Ac | Rationale |
|---|---|---|---|---|---|---|---|---|---|
| Murderers' Row (`murderers-row`) | **3** | **3** | *7* | 5 | 5 | 5 | 5 | 5 | Org scouts obsess over bat-to-ball pop and hit tool; a Murderers' Row team never ran, so foot-speed reads were never sharpened. |
| Bomba Squad (`bomba-squad`) | **3** | *7* | *7* | 5 | 5 | 5 | 5 | 5 | Everything is trained on raw power projection; contact and speed reads get no attention on a swing-hard-or-miss profile. |
| Bash Brothers (`bash-brothers`) | **3** | 5 | 5 | 5 | **3** | 5 | 5 | *7* | Sharp on raw power and arm strength; this org has no real process for handicapping a pitcher's command, starter or reliever. |
| Whiteyball (`whiteyball`) | *7* | 5 | **3** | **3** | 5 | 5 | 5 | 5 | Speed and glove work are read precisely; power grading is fuzzy because this org has never drafted for it. |
| Go-Go Small Ball (`go-go-small-ball`) | *7* | **3** | 5 | **3** | 5 | 5 | 5 | 5 | Bat-to-ball skill and defensive actions are the scouting strength; raw power is guesswork the org rarely needs. |
| Dead-Ball Suppressors (`dead-ball-suppressors`) | *7* | **3** | 5 | 5 | 5 | *7* | **3** | 5 | Finesse-pitching feel and contact hitting are precise; raw power and bullpen velocity are outside the org's lens. |
| Billy Ball Burners (`billy-ball-burners`) | *7* | 5 | **3** | 5 | 5 | 5 | 5 | *7* | Foot speed is read sharply; both power projection and a starter's command are guesswork here. |
| Junkball Surgeons (`junkball-surgeons`) | *7* | 5 | 5 | 5 | 5 | *7* | **3** | **3** | Command and off-speed feel are the specialty; raw arm strength (velocity) and power get poor reads. |
| Flamethrowers (`flamethrowers`) | *7* | *7* | 5 | 5 | 5 | **3** | 5 | 5 | The radar-gun read on velocity is dead-on; no real process for grading a bat's power or contact. |
| Nasty Boys (`nasty-boys`) | 5 | 5 | 5 | 5 | 5 | **3** | 5 | *7* | Reads a reliever's velocity sharply; has never had a handle on command grades. |
| HDH Royals (`hdh-royals`) | *7* | 5 | **3** | 5 | 5 | 5 | 5 | **3** | Bullpen command and team speed are read with confidence; the org has no real feel for a hitter's raw power. (Accuracy conflict resolved to boost — see §2.) |
| The Opener (`the-opener`) | 5 | 5 | 5 | 5 | 5 | **3** | **3** | *7* | Built to evaluate short-burst stuff — velocity and arsenal depth; a starter's command projection is where the process breaks down. (Velocity conflict resolved to boost — see §2.) |
| The Oriole Way (`the-oriole-way`) | 5 | 5 | *7* | **3** | 5 | *7* | 5 | **3** | Glove work and a starter's command are read with precision; team speed and reliever velocity are unfamiliar territory. |
| Shift-Era Suppressors (`shift-era-suppressors`) | 5 | *7* | 5 | **3** | 5 | **3** | 5 | *7* | Defense and a starter's velocity are graded sharply; contact hitting and bullpen command are the blind spot. |
| Big Red Machine (`big-red-machine`) | 5 | **3** | 5 | **3** | 5 | *7* | 5 | *7* | Bat-to-ball and defensive value are nailed; the rotation's stuff and command are the org's known weak spot. |
| Hit 'Em Where They Ain't (`hit-em-where-they-aint`) | *7* | **3** | **3** | 5 | 5 | 5 | 5 | 5 | Contact and speed are bread and butter; a power grade is guesswork since it's never what they draft for. |
| Toolsy Burners (`toolsy-burners`) | **3** | 5 | **3** | *7* | 5 | 5 | 5 | *7* | The eye is trained on raw power and foot speed; pitcher command and infield/outfield actions get a shrug. |
| Cannon Corps (`cannon-corps`) | *7* | 5 | *7* | **3** | **3** | 5 | 5 | 5 | Arm and glove grades are precise; both power and speed reads are fuzzy — this org drafts for defense, not tools. |
| Gap-to-Gap (`gap-to-gap`) | **3** | **3** | 5 | 5 | 5 | *7* | 5 | *7* | Contact and raw pop are read precisely; no real feel for a pitcher's command or a reliever's fastball. |
| Web Gems (`web-gems`) | *7* | *7* | 5 | **3** | **3** | 5 | 5 | 5 | Fielding and arm evaluation is the org's whole identity; power and contact grades are little more than a guess. |
| Launch & Leather (`launch-and-leather`) | **3** | 5 | 5 | **3** | 5 | 5 | 5 | *7* | Sharp on power bats and defensive actions; pitching command (rotation or bullpen alike) is a blind spot. |
| No-Glove Offense (`no-glove-offense`) | **3** | **3** | 5 | *7* | *7* | 5 | 5 | 5 | Scouts grade the bat with confidence; glove and arm evaluations are an afterthought — the org has never cared. |
| Wheels & Cannons (`wheels-and-cannons`) | *7* | 5 | **3** | 5 | **3** | 5 | 5 | 5 | Speed and arm strength are read cleanly; no real feel for a hitter's raw power. |
| Rangy Defenders (`rangy-defenders`) | *7* | *7* | **3** | **3** | **3** | 5 | 5 | 5 | Speed, arm, and glove all get precise reads from a defense-first org; the bat is scouted blind. |

**Tally check** (3-count / 7-count per row, for the balance rule): 2/1, 1/2, 2/1,
2/1, 2/1, 2/2, 1/2, 2/2, 1/2, 1/1, 2/1, 2/1, 2/2, 2/2, 2/2, 2/1, 2/2, 2/2, 2/2,
2/2, 2/1, 2/2, 2/1, 3/2. Sums: **45 threes / 38 sevens** across 24 rows. Widest
single-row skew is +1 (eleven rows), one row at +1 with a 3-boost spread (Rangy
Defenders), the rest at 0 or −1 (Bomba Squad, Billy Ball Burners, Flamethrowers).
No archetype is systematically better-scouted than another.

---

## 5. Where this should live in code

**New pure data module:** `src/data/farmArchetypeScoutConfidence.ts` — same
pattern as `src/data/historicalArchetypes.ts` (no React, no engine-side effects,
just a typed table), keyed by the same `HistoricalArchetype.id` strings used
everywhere else (`murderers-row`, `bomba-squad`, …).

```ts
export type ScoutArea =
  | 'power' | 'contact' | 'speed' | 'fielding' | 'arm'
  | 'velocity' | 'junk' | 'accuracy';

export type ScoutConfidenceBand = 3 | 5 | 7;

export interface FarmArchetypeScoutConfidenceRow {
  archetypeKey: string;                          // HistoricalArchetype.id
  bands: Record<ScoutArea, ScoutConfidenceBand>;
  rationale: string;
}

export const FARM_ARCHETYPE_SCOUT_CONFIDENCE: Record<string, FarmArchetypeScoutConfidenceRow>;

/** Falls back to 5 (average) when the team has no farm archetype set yet. */
export function scoutConfidenceBandForArea(
  farmArchetypeKey: string | undefined,
  area: ScoutArea,
): ScoutConfidenceBand;
```

`ScoutArea` doesn't exist as a named type today — `prospectScoutingDraftEngine.ts`
only has the two untyped tuples (`HITTER_SCOUT_TOOLS`, `PITCHER_SCOUT_TOOLS`,
lines 1173-1182). Worth exporting `ScoutArea` from that engine file (or deriving
it as `typeof HITTER_SCOUT_TOOLS[number] | typeof PITCHER_SCOUT_TOOLS[number]`)
and importing it into the new data module, so the two can't drift apart.

## 6. The two consumer changes

**(a) `scoutTierForPosition` → reads the table via `Team.farmArchetypeKey`**
(`src/utils/prospectScoutingDraftEngine.ts:1152-1159`).

This is a bigger change than swapping the data source, because of a structural
mismatch: today `scoutTierForPosition(position, scout)` returns **one tier for
the whole prospect** (based on whether the hired scout's specialty list contains
that exact position code), and `scoutToolBands()`
(`prospectScoutingDraftEngine.ts:1216-1229`) then stamps that **same** tier onto
every tool in `HITTER_SCOUT_TOOLS`/`PITCHER_SCOUT_TOOLS` for that prospect — so
today a "high" prospect gets 3-band on power *and* contact *and* speed *and*
fielding *and* arm uniformly. The archetype table is explicitly **per-area**
(§7), so a Web Gems farm should show tight fielding/arm bands *and* wide
power/contact bands on the *same* prospect simultaneously. That means:
- `scoutToolBands`'s single `const tier = scoutTierForPosition(...)` (line 1222)
  needs to become a per-tool lookup inside its `for (const tool of tools)` loop:
  `const tier = scoutTierForArea(tool, farmArchetypeKey)`.
- `scoutTierForPosition` either retires or narrows to just feeding
  `scoutOverallGradeBand` (the headline grade band still needs one summary tier —
  candidate: the tier of the prospect's primary tool for their position).
- Both call sites currently only pass `scout`/`position`, never a team or
  archetype: `src/utils/leagueBuilderStartupFarmDraft.ts:1079-1085` (inside
  `buildBoardForSession`, which does have `pickSlot.teamId` in scope — the team
  lookup needs threading in) and
  `src/src_figma/app/pages/LeagueBuilderFarmAuctionDraft.tsx:126` (inside
  `scoutRangeForProspect`, which already takes `teamId` as an input — same kind
  of lookup). Neither call site needs new plumbing beyond resolving
  `teamId → team.farmArchetypeKey`, since both already have the team id in hand.

**(b) `ScoutHire`'s offered pool flavors from the same table, not the generic group**
(`src/src_figma/app/pages/ScoutHire.tsx` → `buildLiveScoutPool`,
`src/src_figma/app/utils/draftStaffingPersistence.ts:103-152, 237-254`).

Today's pool is a hardcoded 6-entry list (`SCOUT_ARCHETYPES`: Infielders / Arms /
Speed-and-glove / Power / Generalist / Catchers, `draftStaffingPersistence.ts:103-152`)
cycled by index — completely untethered to any team's identity, and it's
**league-wide**: `buildLiveScoutPool(leagueId, teamCount)`
(`draftStaffingPersistence.ts:237`) takes no team parameter at all, so every team
in the league picks from the exact same shared list today. To flavor from the
table, `specialtyLabel`/`specialties`/`weaknesses`/`summary` per candidate need
to come from that team's `FARM_ARCHETYPE_SCOUT_CONFIDENCE` row's core (3-band)
and off-identity (7-band) areas instead of the fixed list — see open question 2
for the shared-pool-vs-per-team-pool fork this implies.

---

## 7. Open design questions

1. **Row balance, exact vs. "roughly."** I kept every row's 3s/7s exactly as the
   archetype's own `boosts`/`nerfs` arrays dictate (no padding), which nets to
   45 threes / 38 sevens across 24 rows — close but not perfectly 1:1 per row.
   Forcing exact 1:1 on every row would mean inventing a sacrifice area for
   archetypes like Nasty Boys/Flamethrowers that the archetype design itself
   doesn't have (they only touch 2 areas total). Recommend accepting the
   "roughly balanced, no row is +2 or worse" result as-is — but flag if you want
   strict per-row parity instead.
2. **Rotation/Bullpen conflict tie-break (The Opener, HDH Royals).** I resolved
   both to "the bigger cap-shift number wins" (§2), which happens to match the
   archetype's plain-language headline in both cases. If you'd rather these two
   specific tools land at 5 (average) instead of picking a winner — i.e., "the
   org sends mixed signals here, so the scout genuinely doesn't know" — that's
   an equally defensible call and only touches 2 of 24 rows.
3. **ScoutHire's pool is currently league-wide, not per-team** (§6b). Flavoring
   it from each team's farm archetype forces a real fork: (i) make the pool
   **per-team** (each team sees a pool tailored to its own archetype — bigger
   change, matches "derives from the team's farm archetype" literally), or
   (ii) keep one **shared** pool but broaden it to cover the spread of
   archetypes actually in the league, so most teams find at least one
   well-matched option (smaller change, weaker fit). Given
   `SCOUTING_INTELLIGENCE_SPEC.md` §11 already rules that the whole scout-hire
   flow should eventually be **deprecated** in favor of full auto-specialization
   (the Scout just *is* your farm archetype's specialist, no picking required),
   there's a case for skipping (i)/(ii) entirely and going straight to
   "ScoutHire stops offering a specialty choice" — worth a captain call on
   whether this ticket does the interim fix or jumps to the end state.

---

## 8. CAPTAIN RULINGS (Fable, 2026-07-08 — closes §7)

1. **Row balance: rough balance ACCEPTED as drafted.** 45 threes / 38 sevens, no row skewed worse than +1. Forcing exact per-row parity would fabricate sacrifice areas the archetype designs themselves don't have. The table in §4 is final.
2. **Rotation/Bullpen conflicts (The Opener, HDH Royals): magnitude-wins tie-break KEPT.** Both resolve to boosted (3), matching each archetype's headline identity. No 5-neutralization.
3. **ScoutHire: execute the §11 deprecation now (auto-specialization).** Once bands derive from the farm archetype, a scout-hire choice changes nothing — a decorative knob, which the v1 prune rules forbid. Each team's scout auto-derives from its farm archetype row (specialties = the 3-band areas, weaknesses = the 7-band areas). The ScoutHire screen becomes a no-choice "meet your scout" reveal. Persistence record SHAPE unchanged (auto-fill the same fields the hire flow wrote), so staff carry-through (P5) keeps working. Journey placement is NOT moved in this ticket (P11 handles that separately).
4. **Overall grade band tier** (replacing the retired per-prospect uniform tier): the MEAN of the prospect's applicable per-area bands, rounded to the nearest of {3,5,7}; exact midpoints round to 5. Deterministic, no new judgment inputs.
