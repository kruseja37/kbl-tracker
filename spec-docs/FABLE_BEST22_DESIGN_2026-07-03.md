# FABLE DESIGN — THE BEST-22 BOARD (DJ-08) + THREE DESIGNER RULINGS (DJ-11, DJ-16, DJ-17)

**Date:** 2026-07-03 · **Designer:** Fable 5 · **Builder:** Codex · **Auditor:** Opus
**Status:** DESIGN COMPLETE — ready to contract. NO code in this doc; Codex builds to it.
**Sources (binding):** `FABLE_DRAFT_JOURNEY_AUDIT_2026-07-02.md` §3 (DJ-08, DJ-11) + §4
(DJ-16, DJ-17) · `FABLE_POOL_SIZING_DESIGN_2026-07-03.md` §1 (the fit-first law) ·
`FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md` (tilt defaults, line ~146: SP1/C/SS/CP) ·
`ASST_GM_DESIGN.md` §6 (the whisper board contract).
**Verified against HEAD 2026-07-03:** every file:line cited below was re-read from source
this session (not inherited from the audit).

Layout of this doc: §1 = DJ-08 (the headline), §2 = DJ-11, §3 = DJ-16, §4 = DJ-17. Every
fork is RULED inline (tagged **RULED**). Each section ends with a wiring table + acceptance
tests. The captain cuts the Codex contract(s) from these sections; suggested slicing in §5.

---

## §1 — DJ-08: THE BEST-22 BOARD (MAJOR)

### 1.1 The two truths (the core ruling)

The designer currently answers ONE question and mislabels it as the plan: "EST. $X OF $Y /
$N TO SPARE" is the **cheapest legal fill** (`evaluateRosterDesign` → `totalCost`/`headroom`,
`src/engines/rosterDesignFeasibility.ts:276`), presented on the designer chip
(`RosterDesigner.tsx:234-253`, rendered :415-426) and zone-4 CLUB CHECK
(`LeagueBuilderDraftSetup.tsx:229-240`, rendered :1960-1971) as if it were the GM's roster.
Meanwhile the genuinely fit-first machinery is orphaned (`rankPoolForPreference`,
`rosterDesignFeasibility.ts:517`) or never surfaced (`buildIdentityRoster` +
`slotPreferenceBonus`, `archetypeBalanceSimulator.ts:695` + `:686`).

**RULED — two truths, both shown, neither replacing the other:**

| Truth | Question it answers | Engine | Role in UI |
|---|---|---|---|
| **THE FLOOR** | "Does this design build at all, and what's the cheapest legal way?" | `evaluateRosterDesign` — UNCHANGED, byte-identical | The verdict: tones, dots, blockers, LOCK gates. Relabeled from "EST." to "FLOOR". |
| **THE TARGET (BEST-22)** | "What's the best 22 I could walk out with — my identity + my asks, expressed under the cap?" | `buildIdentityRoster` with `slotPreferenceBonus` (the seam built for exactly this — comment at `archetypeBalanceSimulator.ts:678-686`) | The GM-facing plan: headline dollars, per-slot picks, the board ranking. |

The floor is the buildability guarantee; the target is the plan. The lie DJ-08 names is the
floor wearing the plan's clothes — the fix is to dress each in its own name, side by side.

**RULED — gating unchanged:** every existing gate stays floor-driven. `verdictTone`
(`RosterDesigner.tsx:142-149`), `canLock`, `designVerdictTone` (`LeagueBuilderDraftSetup.tsx:220-227`),
`nonGreenClubCount` (:1254), the LOCK POOL confirm copy (:1934-1936) — none of them read the
target. Target infeasibility is ADVISORY, never a blocker (a GM whose identity won't express
from a pool may still draft; the intent layer warns, it does not imprison).

### 1.2 How the BEST-22 is computed

**New engine module: `src/engines/best22Target.ts`** (pure, build-dark, no UI imports).

```
buildBest22Target(
  slots: readonly DesignSlot[],          // canonical order from seedRosterDesignSlots
  simPool: readonly SimPlayer[],         // via the canonical mapper (§1.7)
  classifiedById: ReadonlyMap<string, ShapeClassification>,  // classifier run once by the adapter
  archetype: SimArchetype,               // the club's MLB identity
  tier: TierKey,
  budget: number,
) → Best22Target
```

`Best22Target` (exported interface):
- `picks: Array<{ slotId: string; playerId: string; playerName?: string; salary: number; honorsAsk: boolean }>`
  — one entry per designer slot, `honorsAsk` = the pick expresses the slot's asked shape
  (primary, or runner-up when `allowRunnerUp`); `true` when the slot asked nothing.
- `totalSalary`, `totalTax`, `allIn` (= salary + tax), `budget`
- `feasible: boolean` (= the identity build's `legalRoster && solvent && floorMet`)
- `embodimentZ: number` (from `IdentityRosterResult.embodiment.boostZ`)
- `asksHonored: { honored: number; asked: number }` (slots with a shape ask only)

Internally: one call to `buildIdentityRoster(simPool, archetype, tier, budget,
{ slotPreferenceBonus })`. Posture stays the default `'optimal'`. `archetypeBalanceSimulator.ts`
itself is **NOT modified** — the seam already exists and its absent-bonus path is documented
byte-identical.

**The slot mapping (invariant, test-pinned):** the designer frame
(`buildDefaultDesignSlots`, `rosterDesignFeasibility.ts:70-79`: pos×8 → backupC → SP×4 →
RP×4 → FLEX×4 → SWING) is index-for-index aligned with `IDENTITY_SLOT_PLAN`
(`archetypeBalanceSimulator.ts:493-500`: pos×8 → backupC → sp×4 → rp×4 → flex×4 →
benchOrRp). `slotPreferenceBonus(playerId, slotIndex)` therefore reads
`slots[slotIndex].preference` directly. Acceptance test A4 pins the alignment so neither
frame can drift silently.

**The bonus (Fable math — exact spec):** all weights in units of **u = the standard
deviation of the identity fit score across `simPool`** (fit score =
`archetypeFitScorer(archetype, tier)`, `archetypeBalanceSimulator.ts:791`; if the σ is 0,
u = 1). Computed once per build by `buildBest22Target`. Exported tuning record:

```
BEST22_TUNING = {
  shapePrimaryMatch: 2.0,   // asked shape, classifier primary
  shapeRunnerUpMatch: 1.2,  // asked shape via runner-up (only when allowRunnerUp !== false)
  perTagMatch: 0.4,         // each asked tag the player satisfies (matchesTags semantics)
  tiltClean: 0.4,           // tilt asked (≠ 'any'): penalty 0 → +tiltClean; 1 → +tiltClean/2; 2 → 0
  bonusCap: 3.0,            // per-(player,slot) total cap
}
```

Rules baked in:
- **Additive-only, never negative.** An ask ATTRACTS its expression to the slot; it never
  punishes identity fit elsewhere (the C3 anti-starve lesson — a tilt/ask can't hollow a build).
- **2.0u dominance is deliberate:** players within one shape family sit ≲1u apart in
  identity fit, so an ask behaves as a *filter* at its slot whenever an expression exists,
  while remaining feasibility-soft (the climb may still trade it away to stay legal/solvent).
  This is the fit-first law's shape: the GM's explicit ask is the tightest filter, the
  identity is the objective, price enters only as the solvency/floor constraints —
  **price never outranks fit anywhere in this path** (law §1 compliance).
- Shape/tag matching MUST reuse the feasibility engine's own predicates — Codex exports
  `matchesShape`/`matchesTags`-equivalent helpers from `rosterDesignFeasibility.ts` (or a
  single `askSatisfaction(slotPreference, classification)` helper there) rather than
  re-deriving. One rule set, one owner (the `countEligibleForAsk` precedent, :483-500).

**RULED — identity required:** the BEST-22 exists only when the club has an MLB identity
(`team.mlbArchetypeKey`). Without one there is no fit objective to climb; the UI shows a
prompt (copy in §1.3), never a pseudo-target built from a neutral archetype. This also
feeds the product loop: the target headline is one more reason to pick an identity.

**RULED — target dollars are ALL-IN (salary + luxury tax).** The identity builder computes
tax; the target is what the club would actually spend. The floor stays salary-only (the
feasibility engine's documented v1 boundary, `rosterDesignFeasibility.ts:11-15`). The two
numbers carry different labels precisely so they are never read as the same basis.

**RULED — recompute policy:** the designer computes the target in the same debounced pass
that runs `evaluateRosterDesign`, memoized on (slot asks, pool player ids, budget,
`mlbArchetypeKey`, tier), 300ms debounce, cancel-on-unmount. Cost calibration: one
`buildIdentityRoster` call per edit vs the draftability ranker's 24×3 calls per pool change
— comfortably cheap. Zone-4's per-club targets (§1.5) recompute in an async effect keyed on
the same inputs per club (pool ids + design slots + identity + budget + tier), NOT in render.

### 1.3 Surface A — the designer chip + THE TWENTY-TWO grid (`RosterDesigner.tsx`)

**The chip** (`chipCopy` :234-253, rendered :415-426). Two lines, exact strings
(`formatMoney` throughout):

Line 1 — `chip.state`, floor verdict, UNCHANGED copy set and tone rules:
`BUILDS · $N TO SPARE` / `OVER BUDGET · $N OVER` / `N SPOT(S) WON'T FILL` /
`FILLS · NOT A LEGAL 22` / `NOTHING TO CHECK AGAINST YET`.

Line 2 — `chip.cost`, rebuilt (this is where "EST." dies):

| Condition | Copy |
|---|---|
| target feasible | `TARGET $Z ALL-IN · FLOOR $X OF $Y` |
| no MLB identity | `FLOOR $X OF $Y · TARGET NEEDS AN IDENTITY` |
| identity set, climb infeasible | `FLOOR $X OF $Y · IDENTITY WON'T EXPRESS HERE` |
| quiet (no pool) | `FLOOR N/A` |

$Z = `allIn`, $X = floor `totalCost`, $Y = budget. The word "EST." is removed everywhere.

**The slot cards** (`SlotGroup` :547-599, currently one-line rows). Each card gains a
second line — the target's answer to the ask — only when the target is feasible:

```
SS   SLICK GLOVE +1        ×4 ●
     → R. VIZCAÍNO · $4,200
```

- Dim gold text (`--ballpark-brass` at ~70%), 11px, `→ {NAME} · {$salary}`.
- When `honorsAsk === false`, prefix the existing near-miss glyph: `≈ → {NAME} · {$salary}`
  (the ≈ vocabulary is already established for runner-up matches, :590).
- No target (no identity / infeasible / quiet): no second line — the card stays exactly
  today's single line. Absence is the encoding; no placeholder noise (north-star: every
  element earns its place).

**The target strip** — one new line under the chip inside the sticky header (:407-464),
visible whenever a target computation has an outcome (feasible or not), design-first and
pool-first alike:

- Feasible: `YOUR TARGET 22 · {asksHonored.honored} OF {asksHonored.asked} ASKS LAND · LOOKS LIKE YOUR IDENTITY`
  — the last segment appears only when `embodimentZ > 0`; when `embodimentZ <= 0` it reads
  `· THIN ON YOUR IDENTITY` instead. When `asked === 0`, the asks segment is omitted.
- No identity: `PICK AN MLB IDENTITY TO SEE YOUR TARGET 22` (dim, one line).
- Infeasible: `THIS POOL CAN'T EXPRESS YOUR IDENTITY UNDER THE CAP — THE FLOOR STILL BUILDS`
  (amber text, advisory).

**Help-layer copy** (behind the ? button — JK rule: tutorial content hides there). Replace
the second HelpNote (:473-475, "The check fills your 22 with the cheapest players…") with:

> "Two numbers, two questions. FLOOR is the cheapest legal way to fill your 22 — proof it
> builds, not a plan. TARGET is the 22 this pool would hand you if the room broke your way —
> the best expression of your identity and your asks under the cap. Chase the target; trust
> the floor. Prices are asking prices — the room sets the real ones."

**RULED — DJ-15 rides along:** the floor copy set currently lives twice (`chipCopy` +
`designVerdictCopy`/`designVerdictTone` on the page, :220-240). This build consolidates both
into ONE shared module `src/src_figma/app/components/leagueBuilder/designVerdict.ts`
(tone + floor copy + the new target copy), imported by both surfaces. Same drift class as
DJ-00d; kill it while we're in the wound.

### 1.4 Surface B — THE ASK'S SHORTLIST (de-orphaning `rankPoolForPreference`)

**Engine change:** generalize the ranking door. `rankPoolForPreference`
(`rosterDesignFeasibility.ts:517`) only speaks TaxonomyPosition and cannot express `flex`
(any hitter), `backupC` (coverage), or `swing`. Add:

```
rankPoolForSlot(slot: DesignSlot, preference: SlotPreference, pool): RankedPoolEntry[]
```

— same scoring (matchScore desc → tiltPenalty asc → salary asc → id asc; runner-up ×0.9),
but eligibility through `eligibleForSlot(slot, …)` for ANY slot kind.
`rankPoolForPreference` becomes a thin delegate (existing callers/tests untouched). Ranking,
like counting, now goes through one door.

**UI:** the `SlotEditor` (open when a slot is selected, :509-517) gains a right-rail /
bottom section **THE ASK'S SHORTLIST**: the top **5** entries of `rankPoolForSlot` for the
selected slot's current preference. Each row: `{NAME} · {SHAPE} · {$salary}`, plus:
- a gold `TARGET` chip when that player is the BEST-22's pick for this slot,
- the ≈ glyph when the entry matches via runner-up.
Empty ranking (no eligible players): one dim line `NOBODY IN THE POOL FITS THIS ASK YET` —
the blocker cards already carry the relaxation detail; don't duplicate it here.
The shortlist re-ranks live with every preference edit (same memo pass as the counts).
This is a read-only rail — no pick/pin action in v1 (the draft room is where players are won).

**Fit-first display law for the shortlist:** the list is ordered by match quality FIRST,
price only within equal match — exactly `rankPoolForSlot`'s comparator. Never re-sort by
salary in the UI.

### 1.5 Surface C — zone-4 CLUB CHECK (`LeagueBuilderDraftSetup.tsx:1960-1971`)

Row today: `● {club} · {gm}` + right-aligned floor copy. New row — floor segment unchanged
(same tone color, same copy from the shared module), plus a second, dimmer right-aligned
segment:

| Condition | Segment |
|---|---|
| target feasible | `TARGET $Z` (dim gold) |
| no MLB identity | `NO IDENTITY` (dim chalk) |
| infeasible | `IDENTITY WON'T EXPRESS` (amber, dim) |

- Computed per HUMAN club (the rows are already `humanTeams`-only, :1249) against the SAME
  player set the club check's floor verdict uses (the `designVerdicts`/`liveClubVerdicts`
  pool — post-extraction that is the extracted/locked pool; DJ-23's collapse keeps this
  honest and is unaffected).
- The dot, `nonGreenClubCount`, and the lock-confirm sentence stay floor-only (§1.1 ruling).
- Async effect + state map `targetByTeamId`; recompute keyed on (pool ids, per-club design
  slots + `mlbArchetypeKey`, budget, tier). Tier basis on this page = `league.tier ?? "juiced"`
  (:990) — the same value extraction already uses; budget = `tierBudget` (the
  `resolveLeagueSalaryCap` basis). No new bases.

### 1.6 Surface D — the whisper board gains fit + need (`rosterIntelligencePayload.ts:201-216`)

`assembleBoard` today: `worth = iv + chemistry.premium`, sorted by worth desc. The IDENTITY
light beside it judges archetype fit while the board ignores it — the audit's core
incoherence. New contract:

**Input extensions** (all optional — absent inputs reproduce today's behavior exactly):
- `BoardCandidate` gains `shape?: RosterSlotPlayer` (the caller already holds
  `session.players[id].pos` — `LeagueBuilderAuctionDraft.tsx:982-990`) and
  `identityZ?: number`.
- `BoardInput` gains `need?: ReturnType<typeof rosterNeedBreakdown>` (Codex exports a named
  type from `rosterConstruction` if one doesn't exist).

**Caller computes identityZ** (`LeagueBuilderAuctionDraft.tsx`, in the payload memo
:960-1056): when `identityArchetype` resolves (:1009), score every board candidate with
`archetypeFitScorer(identityArchetype, tier)` (tier = `registeredPool?.tier ?? "standard"`,
the value already used at :1034), z-scored against the mean/σ of that scorer over
`comparisonPool` (:992-998 — already built). No identity → omit. The caller also passes
`need: rosterNeedBreakdown(rosterShapes)` (the same shapes already feeding the lights).

**Board entry derivation** (pure, inside `assembleBoard`):
- `needTag: string | null` — first match wins, plain draft-room nouns:
  primary position ∈ `missingPrimaries` → `FILLS {POS}` · `catcherCoverNeed > 0` and
  candidate `canCover('C')` → `CATCHER COVER` · pitcher and `rotationDeficit > 0` and
  `canStart` → `ROTATION` · pitcher and `bullpenDeficit > 0` and `canRelieve` → `BULLPEN` ·
  hitter and `hitterFloorNeed > 0` → `BENCH BAT` · pitcher and `pitcherFloorNeed > 0` →
  `STAFF DEPTH` · else null. (`need` or `shape` absent → null.)
- `fitTag: 'IDENTITY' | null` — `identityZ >= PAYLOAD_TUNING.identityGreenBoostZ` (the
  existing 0.35 constant, :110 — reuse, don't mint a new threshold) → `'IDENTITY'`, else null.
- `worth` UNCHANGED (= iv + chemistry premium). No invented money terms — fit and need enter
  as ORDER and LABEL, not as fake dollars.

**RULED — the board's sort is the fit-first law applied to advice:**
```
needTier (has needTag first) → fitTier (has fitTag first) → worth desc → playerId asc
```
Need outranks fit because an unfilled roster shape is a legality clock, and fit outranks
worth because that is the law: fit filters, value orders within the filter. With neither
input supplied the sort collapses to today's `worth desc → id` (back-compat pinned by test).

**Display** (`WhisperPanel.tsx` board section :139-180, `BoardRow`): after the player name,
up to two tiny chips in the existing whisper `.chip` vocabulary — the need chip first
(brass, e.g. `FILLS SS`), then the `IDENTITY` chip (gold border). Chips render only when
their tag is non-null; a bare row means "no open need, off-identity" — silence is the
encoding. `BoardEntry.matchedShape`/`note` behavior untouched.

Farm/nomination whisper surfaces stay out of scope (DJ-28's ticket family).

### 1.7 The canonical mapper (wiring prerequisite)

The BEST-22 adapter needs `Player → SimPlayer(+profile)` inside `RosterDesigner`, but the
canonical mapper `demandPlayerFromLeaguePlayer` lives on the page
(`LeagueBuilderDraftSetup.tsx:181-210`) and itself imports `buildRosterDesignPool` FROM
`RosterDesigner.tsx` — importing page→component→page would cycle.

**RULED:** consolidate the player-adapter layer in ONE new module
`src/src_figma/app/engines/leaguePlayerAdapter.ts` owning `buildRosterDesignPool`,
`demandPlayerFromLeaguePlayer`, `demandUniverseFromPlayers`, and their role/two-way helpers.
`RosterDesigner.tsx` and `LeagueBuilderDraftSetup.tsx` both import from it;
keep re-exports at the old sites for any stragglers (Codex greps all importers). This IS the
adapter-reuse mandate (three C4 bugs came from hand-built engine inputs — the mapper stays
singular). The BEST-22 path feeds `buildBest22Target` exclusively through this module.

New `RosterDesigner` props: `tier: TierKey` (page passes `league.tier ?? "juiced"`).
Identity comes from the existing `team.mlbArchetypeKey` (already read at :513);
`HISTORICAL_ARCHETYPES` lookup + `historicalToSimArchetype` (`draftabilityRanker.ts:72`)
turn it into the `SimArchetype`.

### 1.8 DJ-08 wiring table

| # | Change | File / function |
|---|---|---|
| 1 | New engine: `buildBest22Target`, `Best22Target`, `BEST22_TUNING` | `src/engines/best22Target.ts` (new) |
| 2 | Ask-satisfaction helper exported (shared predicates) | `src/engines/rosterDesignFeasibility.ts` (`matchesShape`/`matchesTags` exposure or `askSatisfaction`) |
| 3 | `rankPoolForSlot` (generalized door; `rankPoolForPreference` delegates) | `src/engines/rosterDesignFeasibility.ts:517` |
| 4 | Canonical adapter module (mapper consolidation) | `src/src_figma/app/engines/leaguePlayerAdapter.ts` (new); edits in `RosterDesigner.tsx`, `LeagueBuilderDraftSetup.tsx:181-214` |
| 5 | Shared verdict copy module (floor + target; kills DJ-15) | `src/src_figma/app/components/leagueBuilder/designVerdict.ts` (new); replaces `chipCopy` :234-253 + page `designVerdictTone/Copy` :220-240 |
| 6 | Chip line 2 + target strip + slot-card target line + shortlist rail + help copy | `src/src_figma/app/components/leagueBuilder/RosterDesigner.tsx` (:407-464 header, :547-599 cards, `SlotEditor` :509-517/rail, :473-475 help) |
| 7 | CLUB CHECK target segment (`targetByTeamId` effect) | `src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx` :1249-1254 rows, :1960-1971 render |
| 8 | `assembleBoard` need/fit inputs + strata sort; `BoardEntry.needTag/fitTag` | `src/engines/rosterIntelligencePayload.ts:125-137, 201-216` |
| 9 | Caller passes `shape`, `identityZ`, `need` | `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx:960-1056` |
| 10 | Board chips | `src/src_figma/app/components/auction/WhisperPanel.tsx` (`BoardRow`, :139-180) |

### 1.9 DJ-08 acceptance tests

- **A1 (byte-identity):** `buildBest22Target` with all-ANY asks → picks identical to plain
  `buildIdentityRoster` (bonus contributes exact 0; the seam's documented guarantee).
- **A2 (ask lands):** fixture pool where an asked shape has ≥2 feasible expressions → the
  build places an expression of the asked shape at the asked slot, and `honorsAsk` is true.
- **A3 (feasibility-soft):** an ask whose only expressions break solvency/legality → build
  stays feasible, `honorsAsk` false at that slot; floor verdict from `evaluateRosterDesign`
  unchanged in all cases (assert deep-equal on a shared fixture, before vs after this build).
- **A4 (frame alignment):** `buildDefaultDesignSlots()[i]` kind/position corresponds to
  `IDENTITY_SLOT_PLAN[i]` for all 22 indices (pos↔pos same position, backupC↔backupC,
  sp↔sp, rp↔rp, flex↔flex, swing↔benchOrRp) — pin via an exported plan-kinds probe or
  test-only export.
- **A5 (board strata):** need-filling off-identity candidate ranks above a no-need
  on-identity one; within a stratum worth desc; with `need`/`identityZ` absent, order equals
  today's exactly (regression pin on the existing assembleBoard test fixtures).
- **A6 (copy):** the four chip.cost states + the three CLUB CHECK target segments render the
  exact strings of §1.3/§1.5 (D11-style copy characterization; note franchise copy-lock
  protocol — these are league-builder surfaces, still grep test-pins before editing).
- **A7 (rankPoolForSlot):** flex slot ranks hitters including DEPTH shapes; backupC ranks
  covering hitters + Two Way (C) arms; `rankPoolForPreference` outputs byte-identical for
  all 12 taxonomy positions.
- **Verification tiers:** `npm run build` exit 0; full engine suites for
  `rosterDesignFeasibility`, `rosterIntelligencePayload`, new `best22Target`; L-SIM is NOT
  required (auction/designer modules are outside the L-SIM import graph — documented
  orthogonality; Codex greps the import graph and states it in the audit evidence).

---

## §2 — DJ-11: ARCHETYPE DRAFTABILITY IN THE IDENTITY PICKER

**Problem:** `ArchetypePicker` renders all 24 cards with only a uniform `disabled` prop
(`src/src_figma/app/components/draft/ArchetypePicker.tsx:154-171`; call site
`LeagueBuilderDraftSetup.tsx:1820-1827`) while per-archetype grading machinery exists and
already runs elsewhere on the page.

**RULED — the verdict source is `rankAllArchetypesForPool`**
(`src/engines/draftabilityRanker.ts:240` → `ArchetypeDraftability`: band GREEN/YELLOW/LOCKED
+ plain-language `reasons`). NOT `composition.outlooks` — composition only exists post-lock
(:918-935), and the picker's moment is pre-lock. Options: `{ budgetOverride: tierBudget }`
so the picker shares the page's cap basis (the hard-cap Phase-1 resolver), tier =
`league.tier ?? "juiced"`.

**RULED — the pool basis is `rosterDesignerPlayers`** — the SAME player set the page hands
the designer's check (passed at :1832). One basis for "what can build from here" per screen;
this surface must not mint a third pool (the DJ-23 lesson). Pre-extraction in design-first
that is the full player list (can this identity build from your universe at all — the
honest early read); post-extraction/lock it is the pool.

**Data flow:** page-side async effect (mirror the composition effect's shape :920-935):
compute `rankAllArchetypesForPool(simPool, tier, { budgetOverride: tierBudget })` where
simPool = `demandUniverseFromPlayers(rosterDesignerPlayers)` via the canonical adapter
(§1.7). Keyed on (player ids, tier, tierBudget); 400ms debounce; cancel-on-change; runs
off the render path (24×≤3 builds — the ranker's designed duty cycle). Result distilled to:

```
draftability?: Record<string, { band: 'GREEN' | 'YELLOW' | 'LOCKED'; reason?: string }>
```
(`reason` = `reasons[0]`), passed as a new optional `ArchetypePicker` prop. Absent prop =
today's rendering exactly (the component stays dumb).

**Encoding on the card** (`ArchetypeCard` :72-120):
- **GREEN:** no change, no line. Healthy is silent (every element earns its place).
- **YELLOW:** card stays fully pickable; one amber verdict line above the reserved matchup
  line: `▲ {reason}` (e.g. `▲ fragile — fails once its top targets are gone`).
- **LOCKED:** card grays (opacity ~0.55 + family color chip desaturated), verdict line in
  red: `✕ {reason}` (e.g. `✕ the pool cannot field a legal roster for this identity`).
- **RULED — LOCKED disable is per-slot:** unpickable for the **MLB** slot (picking an
  identity the pool provably cannot build is a trap, and the intent layer exists to kill
  silent traps), but REMAINS pickable for the **FARM** slot — farm identity steers the
  scout, not this pool; draftability is irrelevant to it. Implementation: the card's
  `disabled` for the active slot = `props.disabled || (slot === 'mlb' && band === 'LOCKED')`;
  the gray/verdict encoding shows regardless of the active slot.
- **RULED — grid order never re-sorts** by verdict. Cards keep catalog order; verdicts are
  decoration, not choreography (stable geography while the GM deliberates).
- **No verdicts yet** (empty pool / effect pending): cards render as today plus ONE quiet
  line under the TEAM IDENTITY header: `Draftability reads appear once your player list is in.`
  While a recompute is in flight over stale data, keep showing the previous verdicts (no
  flicker-to-blank).

**Wiring:** `ArchetypePicker.tsx` (props + card encoding + per-slot disable);
`LeagueBuilderDraftSetup.tsx` (effect + prop at :1820-1827).

**Acceptance tests:** B1 LOCKED card blocks `onPick` for mlb, fires for farm; B2 GREEN
renders no verdict line, YELLOW/LOCKED render `reasons[0]`; B3 grid order equals catalog
order regardless of bands; B4 absent `draftability` prop renders byte-identical DOM to
today (snapshot); B5 the effect recomputes on pool-membership change and not on designer
keystrokes (memo key = ids, not slot asks).

---

## §3 — DJ-16: THE CLOSER RULING (avoid-fragile default)

**Problem:** the taxonomy design names the key-role tilt default as SP1/C/SS/**CP**, but the
22-frame has no CP slot (SP1-4 + RP1-4) and `defaultPreferenceForSlot`
(`RosterDesigner.tsx:116-121`) grants `avoid-fragile` only to C/SS/SP1 — the closer's chair
never inherits it.

**RULED — THE TWENTY-TWO designates a closer: RP1 IS THE CLOSER.**
1. The frame already encodes rotation hierarchy by ordinal (SP1 = the ace — that's why SP1
   carries the tilt); the bullpen gets the same grammar: RP1 = the ninth-inning chair. The
   taxonomy spec's "CP" maps onto RP1. No new slot, no frame change, no persistence change.
2. **`slotId` NEVER changes** (saved designs pin slotIds). Display label only: `slotLabel`
   (:157-161) renders RP1 as `RP1 · CLOSER`. All other RP labels unchanged.
3. **The exact default** — `defaultPreferenceForSlot` becomes:
   ```
   personalityTilt: (slotId === "C" || slotId === "SS" || slotId === "SP1" || slotId === "RP1")
     ? "avoid-fragile" : "any"
   ```
4. **No retro-migration.** `seedRosterDesignSlots`/`mergePreference` (:123-140) let a SAVED
   preference win; an existing design whose RP1 carries `personalityTilt: "any"` keeps it —
   saved state is user state, and we cannot distinguish "chose ANY" from "never touched".
   Fresh designs (and RESET) get the new default. Document this in the contract; it is
   deliberate, not a gap.
5. Eligibility untouched: the `rp` kind already seats RP/CP/SP-RP arms
   (`rosterDesignFeasibility.ts:189`); the tilt remains a soft ordering, never a filter.

**Wiring:** `RosterDesigner.tsx:119` (default), `:157-161` (label). Update the taxonomy
design's default list annotation (CP → "CP = the frame's RP1") in
`FABLE_PLAYER_TAXONOMY_DESIGN_2026-07-02.md` as a one-line editorial note.

**Acceptance tests:** C1 fresh seed gives RP1 `avoid-fragile` and RP2-4 `any`; C2 a saved
RP1 preference of `any` survives re-seed; C3 label renders `RP1 · CLOSER`.

---

## §4 — DJ-17: TWO-WAY TAG SCOPE (the bricked-slot guard)

**Problem:** the TWO-WAY toggle renders unconditionally (`RosterDesigner.tsx:716-721`).
The classifier's `twoWay` tag is true only for two-way ARMS, and `matchesTags`
(`rosterDesignFeasibility.ts:134`) hard-filters on it — so on a `pos` field slot
(non-pitchers only, :180) or a `flex` slot (hitters only, :191) the toggle zeroes the
candidate set: the slot bricks by construction.

**RULED — a TWO-WAY tag may live only where a two-way player is ELIGIBLE:**

| Slot kind | TWO-WAY toggle | Why |
|---|---|---|
| `pos` (the 8 field positions) | **HIDDEN** | eligibility = hitters with that primary; a two-way arm can never satisfy it |
| `flex` (bench) | **HIDDEN** | hitters only — same brick |
| `backupC` | shown | Two Way (C) arms are first-class candidates (:181-185) |
| `sp` / `rp` | shown | two-way arms carry pitching roles |
| `swing` | shown | arms are eligible (:192-194) |

1. **Render guard:** new helper beside `slotKindIsHitter`/`slotKindIsPitcher` (:169-175):
   `slotKindAllowsTwoWay(slot) = kind ∈ {backupC, sp, rp, swing}`; the ToggleControl at
   :716-721 renders only when true.
2. **Seed-time sanitation (heals already-bricked designs):** `seedRosterDesignSlots`
   (:131-140) strips `tags.twoWay` from any saved `pos`/`flex` slot while merging. A stale
   saved `twoWay: true` on LF would otherwise keep the slot at ×0 forever with its control
   now invisible — sanitize at the door, not in the engine (the engine's filter semantics
   stay exactly as documented).
3. Engine untouched: `matchesTags` remains a hard filter; the fix is scoping the ASK, not
   softening the MATH.
4. `countEligibleForAsk` alignment is automatic — counts flow from the same preference
   object that just lost the impossible tag.

**Wiring:** `RosterDesigner.tsx` :169-175 (helper), :716-721 (guard), :131-140 (sanitize).

**Acceptance tests:** D1 toggle absent on all 8 `pos` slots + 4 `flex` slots, present on
backupC/SP×4/RP×4/SWING; D2 a saved design with `twoWay: true` on LF and on RP1 seeds with
LF stripped and RP1 preserved; D3 post-sanitize, the LF slot's candidate count is nonzero
on a pool where it was ×0 before (the healing proof).

---

## §5 — Contract slicing (suggested, captain's call)

1. **C-B22-ENGINE:** §1.2 + §1.4 engine work + §1.7 adapter module (pure, test-first —
   A1-A4, A7).
2. **C-B22-DESIGNER:** §1.3 + §1.4 UI + §3 + §4 (one component, one diff — A6, C1-C3, D1-D3).
3. **C-B22-PAGE:** §1.5 CLUB CHECK + §2 picker (page-level effects — B1-B5).
4. **C-B22-WHISPER:** §1.6 + board chips (A5 + payload suite).

Builder≠auditor triangle applies per slice; Fable design-reviews the rendered designer and
picker (screenshots in the audit evidence) before JK's browser pass.
