# FABLE P0 DESIGN — DJ-01 board frame · DJ-03 CPU club identity

**Author:** Fable 5 (design authority) · **Date:** 2026-07-02 · **Status:** BINDING design for
the two P0 draft-journey defects (FABLE_DRAFT_JOURNEY_AUDIT_2026-07-02.md §2, DJ-01 + DJ-03).
Codex builds from this document; no further design decisions are required or permitted — anything
found ambiguous comes back to Fable, not to the builder's judgment. Opus audits the diff.

**AMENDED 2026-07-03 (Fable, blocker FUZZ-1):** Opus's 6000-roster fuzz found a legal 22 that
strands a body in overflow — the 2nd catcher-coverer was a secondary-C HITTER already consumed
by his primary field seat, a corner the original §1.3 step 4c (which only rescued the seated
two-way-C ARM) did not cover. Fix: step 4c is generalized into a law-keyed capacity fallback on
`catcherCoverNeed === 0` (§1.3), the §1.5 backupC glow rule is confirmed unchanged, and §1.7
adds a seeded randomized property test over many random legal rosters. Amended text is marked
**[AMENDED 2026-07-03]** in place.

Design law referenced throughout: `src/data/rosterConstruction.ts` (LEGAL_ROSTER, canCover,
canStart, canRelieve, isLegalRoster) — the ONE roster law. The designer's 22-slot frame:
`src/engines/rosterDesignFeasibility.ts:70-79` (`buildDefaultDesignSlots`). Canonical
player→legality-shape adapter: `src/engines/rosterNeed.ts:47-69` (`toRosterSlotPlayer`).

---

## SECTION 1 — DJ-01 BOARD FRAME (the legal auction roster board)

### 1.0 The defect being replaced

- `src/src_figma/app/components/DraftRosterBoard.tsx:45-68` (`MLB_BOARD_SLOTS`) frames
  **23 seat definitions** for a 22-man roster: 9 field **including DH (DH-purge violation)**,
  5 SP, 6 RP, 1 CP, 1 depth bucket. The legal 22 is 8 field + backupC + 4 SP + 4 RP + 4 bench
  + 1 swing. Result: 3-4 pitcher seats glow "gap" forever on a finished legal club.
- `src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx:205-231` (`slotMatchesEntry` +
  `buildStageRosterSlots`) matches on `primaryPosition` only (secondaryPosition ignored, no
  two-way awareness) and **silently drops** every body that doesn't match a seat (the splice
  keeps only matched entries; only ONE depth seat exists).
- Both the live `AuctionStage` board (`BoardVM`/`RosterSlotVM`,
  `src/src_figma/app/components/auction/AuctionStage.tsx:84-97`) and the legacy
  `DraftRosterBoard` render from these frames.

### 1.1 The frame — 22 seats, identical to the designer's frame

One frame, one law. The seat list mirrors `buildDefaultDesignSlots()` slot-for-slot, using the
**same slotIds** so the designer's THE TWENTY-TWO and the auction board are visibly the same
object to a GM who just came from the Draft Room:

| # | slotId | GM-facing label | Group header | Seat class |
|---|--------|-----------------|--------------|-----------|
| 1 | `C` | C | THE EIGHT | field (primary-only) |
| 2 | `1B` | 1B | THE EIGHT | field |
| 3 | `2B` | 2B | THE EIGHT | field |
| 4 | `3B` | 3B | THE EIGHT | field |
| 5 | `SS` | SS | THE EIGHT | field |
| 6 | `LF` | LF | THE EIGHT | field |
| 7 | `CF` | CF | THE EIGHT | field |
| 8 | `RF` | RF | THE EIGHT | field |
| 9 | `SP1` | SP1 | ROTATION | rotation |
| 10 | `SP2` | SP2 | ROTATION | rotation |
| 11 | `SP3` | SP3 | ROTATION | rotation |
| 12 | `SP4` | SP4 | ROTATION | rotation |
| 13 | `RP1` | RP1 | BULLPEN | bullpen |
| 14 | `RP2` | RP2 | BULLPEN | bullpen |
| 15 | `RP3` | RP3 | BULLPEN | bullpen |
| 16 | `RP4` | RP4 | BULLPEN | bullpen |
| 17 | `backupC` | BACKUP C | THE BENCH | catcher-depth |
| 18 | `FLEX1` | BENCH | THE BENCH | capacity |
| 19 | `FLEX2` | BENCH | THE BENCH | capacity |
| 20 | `FLEX3` | BENCH | THE BENCH | capacity |
| 21 | `FLEX4` | BENCH | THE BENCH | capacity |
| 22 | `SWING` | SWING | THE BENCH | capacity |

Rules of the frame:

- **NO DH seat. NO CP seat. NO 5th SP / 5th-6th RP seats.** A closer is a bullpen arm; it sits
  in an RP seat (its chip shows "CP"). Exactly 22 seats — never a 23rd definition.
- Group headers exactly: `THE EIGHT`, `ROTATION`, `BULLPEN`, `THE BENCH`. Four groups, no
  fifth. The bench group order is backupC first, then FLEX1-4, then SWING.
- Constants: seat count and target derive from `LEGAL_ROSTER` (`size: 22`,
  `startingPitchers: 4`, `minRelievers: 4`, `minBench: 4`, `minCatchers: 2`) — no bare
  literals. `MLB_BOARD_TARGET` (DraftRosterBoard.tsx:42) becomes `LEGAL_ROSTER.size` at its
  use sites (`stageRosterLabel`, LeagueBuilderAuctionDraft.tsx:193-197, keeps working).
- Test ids: `auction-board-slot-<slotId>` per seat; `auction-board-overflow` for the overflow
  rail (§1.4).

### 1.2 Player → seat eligibility (via the law, never a local re-derivation)

Every drafted body is first mapped to the legality shape with the **canonical adapter**
`toRosterSlotPlayer` (`src/engines/rosterNeed.ts:47-69`), fed from the stored player record:
`{ primaryPosition, secondaryPosition, traits: [trait1, trait2] }`. This yields
`{ isPitcher, position, role, secondaryPosition, twoWayVariant }` — the adapter already handles
pitcher-role normalization (SP/RP/CP/SP-RP; bare 'P'/'TWO-WAY' → role undefined) and the
Two Way trait variants. **Do not** hand-build this mapping in the UI (three C4 bugs came from
exactly that; see DECISIONS_LOG adapter-fidelity rule).

Seat eligibility, per seat class, expressed ONLY through the law's predicates:

- **field (`C`…`RF`)**: hitter whose PRIMARY position equals the seat
  (`!p.isPitcher && p.position === seat`). Primary-only — a moonlighter covering SS via a
  secondary does NOT sit in the SS seat (mirrors `isLegalRoster`'s primary rule and the
  designer's DJ-00a fix, rosterDesignFeasibility.ts:174-180).
- **rotation (`SP1-4`)**: `canStart(p)` (role SP or SP/RP).
- **bullpen (`RP1-4`)**: `canRelieve(p)` (role RP, CP, or SP/RP).
- **catcher-depth (`backupC`)**: hitter with `canCover(p,'C')` (secondary-C counts first-class),
  or a pitcher with `twoWayVariant === 'C'` — plus the generalized capacity fallback in §1.3
  step 4c **[AMENDED 2026-07-03]**: once `catcherCoverNeed === 0`, backupC accepts ANY unseated
  body, exactly like FLEX/SWING (depth is met; the seat's remaining job is capacity).
- **capacity (`FLEX1-4`, `SWING`)**: FLEX prefers hitters; SWING prefers a hitter or a
  `canRelieve` arm. Both accept ANY unseated body as a last resort (§1.3 steps 5-6) — a seat's
  job in the AUCTION board is to show what the club owns; the stricter bat-or-reliever
  semantics are the DESIGNER'S ask semantics and stay there. (Reason this is not optional: a
  club that legally wins five pure SPs — `isLegalRoster` caps nothing per-class above the
  minimums — must still display gap-free at 22; a leftover pure SP stands in SWING with its
  honest "SP" chip.)

### 1.3 The seating pass (deterministic; draft order = roster array order)

Single greedy pass in seat-priority order; ties broken by earliest draft order (the roster
array order on `session.teams[].roster`). "Unseated" always means not yet placed by an earlier
step.

1. **THE EIGHT** — for each position in the fixed order C, 1B, 2B, 3B, SS, LF, CF, RF: seat
   the earliest-drafted eligible hitter. A second primary-SS simply stays unseated here and
   falls through to the bench (truthful: he's a bench SS).
2. **SP1-4** — pure SP first (earliest first), then SP/RP swings. (Pure-before-swing keeps
   swings available for the pen; with step 3 this achieves the same optimal swing allocation
   as `teamRosterNeed`'s deficit math, rosterNeed.ts:80-88.)
3. **RP1-4** — pure RP/CP first (earliest first), then remaining SP/RP swings.
4. **backupC** — first match wins. **[AMENDED 2026-07-03 — FUZZ-1.]** The original 4c only
   rescued the corner where the 2nd C-coverer was a seated two-way-C ARM; it missed the
   symmetric corner where the 2nd coverer is a seated SECONDARY-C HITTER consumed by his
   primary field seat (repro: 13/9, an SS/C body seated at SS ⇒ legal 22 stranded a body in
   overflow with backupC open and dark). Principle: whenever the LAW says catcher depth is
   already met (`catcherCoverNeed === 0`) and no unseated C-coverer remains, backupC is a
   CAPACITY seat — its remaining job is to hold a body, never to manufacture a phantom gap.
   a. earliest unseated hitter with `canCover(p,'C')`;
   b. else earliest unseated pitcher with `twoWayVariant === 'C'`;
   c. else, **if `need.catcherCoverNeed === 0`** (from the same `teamRosterNeed` verdict §1.5
      reads — depth genuinely met, so the 2nd coverer is necessarily SEATED elsewhere: a
      secondary-C hitter at his primary field seat, a Two Way (C) arm in the staff, or any
      coverer shape the law admits; note two primary-C hitters never reach 4c — the 2nd is
      unseated after step 1 and 4a takes him) — seat the **earliest unseated hitter; if no
      hitter remains, the earliest unseated body of any kind** (same defensive semantics as
      FLEX, §1.3 step 5). Depth-note sub-line, sourced from the seated coverer: find the
      earliest-drafted SEATED body other than the C-seat occupant with `canCover(p,'C')` or
      `twoWayVariant === 'C'`, and render `depth via <name> (Two Way C)` for an arm or
      `depth via <name> (<primary pos>, covers C)` for a hitter — e.g.
      `depth via Ortiz (SS, covers C)`. (Such a body always exists here: coverNeed 0 ⇒ ≥2
      distinct coverers, none unseated per 4a/4b failing, one occupies the C seat, so the
      other is seated elsewhere. Defensive only: if the lookup somehow finds none, seat
      anyway and render no note — never let the note's absence strand a body.)
   d. else (`catcherCoverNeed > 0`) leave open — the ONLY state in which backupC stays open,
      and by construction it coincides exactly with the §1.5 glow.
5. **FLEX1-4** — earliest unseated hitters; if hitters are exhausted, any unseated body
   (defensive; keeps every body visible).
6. **SWING** — earliest unseated hitter or `canRelieve` arm; else any unseated body.
7. **OVERFLOW rail** (§1.4) — anything still unseated.

The pass is pure and lives engine-side: new module **`src/engines/auctionBoardFrame.ts`**
exporting `buildAuctionBoardFrame(roster: readonly { playerId, salary }[], positions:
RosterPositionMap): AuctionBoardFrame` (seats + overflow + gap states below). It imports ONLY
`rosterConstruction.ts` and `rosterNeed.ts`. Both the AuctionStage `BoardVM` builder
(replacing `buildStageRosterSlots`, LeagueBuilderAuctionDraft.tsx:217-231) and any surviving
`DraftRosterBoard` render consume this one output — though per audit DJ-25 the legacy
`DraftRosterBoard` MLB path is unreachable and slated kill-on-sight; if it is killed in the
same change, only the stage consumes the module. `slotMatchesEntry`, `positionTokens` (page
copy), and `MLB_BOARD_SLOTS`' MLB frame are deleted, not deprecated.

### 1.4 Overflow — nothing is ever silently dropped

Any body the pass cannot seat renders in an explicit **OVERFLOW** rail under THE BENCH group:
same entry-chip visual, rail header `OVERFLOW — <n> UNSEATED`, one plain sub-line
`These players don't fit the legal 22 frame — resolve before launch.` With the state machine's
strand guard live this rail is empty in normal play; it exists for position-blind resumed
sessions and any >22 anomaly, and it is the honest surface DJ-06's exit gate will point at.
The splice-and-drop behavior is forbidden.

### 1.5 Gap semantics — a gap is a LAW deficit, not an empty chair

Seats show OCCUPANCY (who stands there). Gap-glow shows the LAW's remaining demands, computed
from `teamRosterNeed(rosterIds, positions)` (`src/engines/rosterNeed.ts`) — the same authority
the in-flight strand guard already uses. Mapping:

- **field seat** glows iff its position ∈ `need.missingPrimaries`.
- **backupC** glows iff `need.catcherCoverNeed > 0` (fewer than 2 distinct C-coverers among
  ALL drafted bodies, counted via `canCover` — a seated Two Way (C) arm in the pen counts).
  **[CONFIRMED 2026-07-03]** This rule is UNCHANGED by the step-4c amendment and stays
  coverNeed-driven, never occupancy-driven: a backupC filled via the capacity fallback never
  glows (depth is met), and an open backupC glows exactly when depth is genuinely unmet —
  step 4d is now the only path that leaves it open, so glow and open-seat coincide.
- **SP seat** glows iff unoccupied after the pass (by the pure-first allocation this is
  exactly "startable arms < 4", i.e. a real rotation deficit).
- **RP seat** glows iff unoccupied after the pass (= relievable arms < 4 after optimal swing
  split).
- **FLEX / SWING seat** glows iff unoccupied AND total drafted < 22 (capacity need — "a body
  is still owed", not a positional lie). Empty capacity seat at 22 drafted never glows.

Glow visual: keep the existing dashed-amber gap treatment (GapCard language) restyled to the
chalk-and-ash kit tokens (`ballpark-kit.css` vars, not raw hexes). Filled seats: existing
entry-chip treatment; the chip inside always shows the player's REAL position/role
(a CP in an RP seat shows "CP"). No OF-group blurring: an open CF seat says `CF GAP`,
never "OF GAP" (delete the GapCard OF-collapse, DraftRosterBoard.tsx:210-223).

**The board invariant (the whole point of DJ-01):** for every roster where
`isLegalRoster(players)` is true, the board shows **exactly zero glowing seats and an empty
overflow rail**; for every roster where it is false, at least one seat glows. This is a
REQUIRED property test (§1.7).

Surplus display: a club with extra coverage (two primary SS, a 5th startable arm) shows the
extras seated truthfully in FLEX/SWING with their real chips — no "surplus" badge, no warning;
surplus is a strategy, not a defect. The bench group header may append the plain count
`BENCH <filled>/<6>` (backupC + 4 flex + swing); nothing else is added. Every element earns
its place: no new meters, no legends.

### 1.6 What the GM reads (copy, plain register)

- Header stays `<n> of 22 rostered` (existing `stageRosterLabel`, now LEGAL_ROSTER-anchored).
- `needLine` (BoardVM) is rebuilt from the SAME need object, in priority order, one line:
  1. any `missingPrimaries` → `Still need a starting <pos-list>.`
  2. else `catcherCoverNeed > 0` → `Need a second catcher — backup C or a Two Way (C) arm.`
  3. else rotation/bullpen deficits → `Need <k> more starter(s) / reliever(s).`
  4. else bodies < 22 → `Need <k> more bod(y/ies) to reach 22.`
  5. else → `Legal 22 — roster complete.`
  The analyzer-driven `buildStageNeedLine` priority text may remain as a SECOND line, but the
  law line above always leads and never disagrees with the glow.

### 1.7 Acceptance tests (Codex writes; all engine-level except the last)

1. **Legal-⇢-clean property test**: generate the legal-roster corpus (reuse/extend the
   generators in `src/engines/__tests__/` for rosterConstruction / rosterDesignFeasibility),
   including at minimum: 13/9 and 14/8 splits; second catcher via secondary-C; second catcher
   via Two Way (C) arm inside the staff minimums (the §1.3-4c corner); **[ADDED 2026-07-03]
   second catcher via a secondary-C hitter CONSUMED by his primary field seat (the FUZZ-1
   repro: 13/9 with an SS/C body seated at SS — backupC must fill via the capacity fallback
   with a truthful depth note, zero glow, empty overflow)**; a 5-pure-SP staff; a
   CP-heavy pen; 5 relievers via SWING. Assert zero glows + empty overflow for every
   `isLegalRoster === true` case, ≥1 glow for every illegal mutation (drop the primary SS,
   drop to 1 catcher, 3 startable, 21 bodies).
1b. **[ADDED 2026-07-03] Randomized invariant fuzz (REQUIRED — the fixed corpus above missed
   the FUZZ-1 class entirely)**: with a seeded PRNG (seed fixed in the test file for
   reproducibility), generate **≥ 5,000 random rosters** varying hitter/arm split (at least
   12/10 through 15/7), primary positions, secondary positions (including secondary-C on
   non-C primaries), pitcher roles (SP/RP/CP/SP-RP), and Two Way (C) variants. For EVERY
   generated roster: if `isLegalRoster === true`, assert **zero glowing seats AND empty
   overflow AND all 22 seats occupied**; if false, assert ≥1 glowing seat. Also assert the
   §1.7-2 no-drop sum on every draw. On any failure, print the full roster shape (positions
   + roles) so the counterexample is reproducible without re-running the fuzz.
2. **No-drop test**: any input roster (including 23 bodies, wrong shapes, missing positions)
   → seats + overflow lengths sum to the input length. Always.
3. **Determinism test**: same roster array → identical frame, twice.
4. **DH extinction**: grep-level assertion in the test file that the frame contains no `DH`
   seat and exactly 22 seats, sourced from LEGAL_ROSTER constants.
5. **Stage wiring**: RTL test that `AuctionStage` renders the four group headers and
   `auction-board-slot-backupC`, and that a legal-22 fixture shows no gap test-ids.

Out of scope for DJ-01: the farm board (target 10, no frame law — unchanged), the designer's
ask semantics, DJ-06's exit gate (it will consume the same `teamRosterNeed` verdict).

---

## SECTION 2 — DJ-03 CPU IDENTITY PROFILE (stable per-club bidding identity)

### 2.0 The defect being replaced

`resolveSessionShill` (`src/engines/cpuShillBidding.ts:453-459`) falls back to
`buildSeededCpuShill(teamId, seed)` for any bidder absent from `session.cpuShills` — and only
pure shills are ever present (`buildPureShillProfiles`,
`src/src_figma/app/hooks/useAuctionDraft.ts:228-237`, installed at :484). The seed is
per-decision (`cpuDecisionSeed`, LeagueBuilderAuctionDraft.tsx:288-300: includes
`results.length`, `highBid`, `stillIn`), so a REAL AI-controlled club's hidden archetype —
hence its band priorities, personality, and entire valuation lens — **re-rolls on every bid
event**. Meanwhile the market model prices that same club through its PUBLIC league-setup
demand shape (`bandPrioritiesByTeamId`, `src/engines/auctionMarketModel.ts:426-427,510`) —
which the bidder never reads. Two coherence breaks in one: club vs. its own archetype, and
bidder vs. market model.

A second latent bug this design heals: the page's market map
(`marketBandPrioritiesByTeamId`, LeagueBuilderAuctionDraft.tsx:528-536) reads ONLY
`team.capIdentity.bandPriorities` — but the archetype-selection path
(`archetypeToCapIdentity`, `src/engines/archetypeIdentity.ts:23-39`) never sets that field
(it sets `increase`/`decrease`/`rawShift`). Archetype-provenance clubs are therefore
INVISIBLE to the market model today (null → unknown-bidder path, auctionMarketModel.ts:298-300).

### 2.1 The ONE resolver: club identity → band priorities

New exported pure function in **`src/engines/archetypeIdentity.ts`** (it already owns the
archetype↔capIdentity bridge and imports `HISTORICAL_ARCHETYPES`, `archetypeCapShift`,
`luxKeyToModStat`):

```
resolveClubBandPriorities(input: {
  capIdentity?: TeamCapIdentity | null;      // leagueBuilderStorage.ts:161
  mlbArchetypeKey?: string | null;           // leagueBuilderStorage.ts:163 (provenance)
}): BandPriorities | null
```

Priority chain — first hit wins:

1. **`capIdentity.bandPriorities`** when present AND at least one band > 0 — the
   manually-slidered identity from LeagueBuilderTeams.tsx (:594,:793,:864 write it). This is
   the exact field the market map reads today → automatic bidder/market agreement.
2. **`mlbArchetypeKey`** → `HISTORICAL_ARCHETYPES` lookup →
   `archetypeBandPriorities(arch)` (`cpuShillBidding.ts:482-496` — the documented ONE
   archetype→band bridge; import direction archetypeIdentity → cpuShillBidding is new but
   acyclic today — cpuShillBidding does not import archetypeIdentity. If the builder prefers,
   `archetypeBandPriorities` may instead move to `leagueConstruction.ts` with a re-export
   from cpuShillBidding; either way ONE implementation).
3. **`capIdentity.rawShift`** → the identical lift computation inline:
   `lift[band] = Σ_{stat ∈ BAND_STATS[band]} max(0, rawShift[stat] ?? 0)`, normalize by the
   max band; if all ≤ 0 → all-1s uniform. (Provably identical to path 2 whenever capIdentity
   came from `archetypeToCapIdentity`: the lux-key↔ModStat map is bijective —
   `LUX_TO_MOD_STAT`, `leagueConstruction.ts:115-124`, 11↔11 — so `rawShift` carries the full
   `archetypeCapShift` mass with no collisions. Path 3 exists for custom identities whose
   provenance key is absent.)
4. **null** — no identity data at all. Callers treat null per §2.3/§2.4.

### 2.2 The profile: built at init, stored on the session, stable for its life

Reuse `CpuShillProfile` (`cpuShillBidding.ts:26-46`) unchanged — no new type. New builder in
**`cpuShillBidding.ts`** (beside `buildArchetypeShillProfile`):

```
buildClubCpuProfile(input: {
  teamId: string;
  leagueId: string;
  bandPriorities: BandPriorities;   // from resolveClubBandPriorities, non-null (see below)
  archetypeId?: string | null;      // = mlbArchetypeKey when present (provenance/debug only)
}): CpuShillProfile
```

Field mapping (exhaustive):

- `teamId` — the club's real team id.
- `personality` — **stable, identity-grade**: `personalities[hashString(
  `${leagueId}:${teamId}:club-personality`) % 3]` over the same
  `['sniper','spender','zealot']` list and the same `hashString`
  (cpuShillBidding.ts:503-513, :572). Keyed on (leagueId, teamId) — NOT the session seed —
  so a club's temperament is part of the club, surviving re-inits of the same league.
- `bandPriorities` — the resolver's output verbatim. When the resolver returns null (a club
  with zero identity data), pass the all-1s uniform vector explicitly — the profile is ALWAYS
  complete, so `resolveShillProfile`'s seed-dependent backfill (cpuShillBidding.ts:461-475)
  never fires for a real club.
- `archetypeId` — `mlbArchetypeKey` when present, else omitted. Never surfaced to a GM
  (walled-internals rule F4 — and DJ-02 is separately removing valuation display).
- `shillMaxWins` — **NEVER set for real clubs.** It is the pure-shill appetite cap
  (`buildPureShillProfiles` sets `SIZING_TUNING.winsPerShill`); on a completing club it would
  wedge the draft.
- `personalityBias` / `interestAggression` / `maxInterestProbability` — leave unset; they
  resolve from the stable `personality` via `CPU_SHILL_PERSONALITY_PROFILES` exactly as for
  shills.

**Where built and stored:** in `initAuction` (useAuctionDraft.ts:482-485):

```
cpuShills: {
  ...buildPureShillProfiles(leagueId, explicitShillCount),
  ...Object.fromEntries(
    nextLeagueTeams
      .filter((team) => team.controlledBy === 'ai')     // same predicate cpuTeamRoles uses
      .map((team) => [team.id, buildClubCpuProfile({
        teamId: team.id,
        leagueId,
        bandPriorities: resolveClubBandPriorities(team) ?? UNIFORM_BAND_PRIORITIES,
        archetypeId: team.mlbArchetypeKey ?? null,
      })]),
  ),
}
```

`session.cpuShills` already persists whole (`saveAuctionSession({ ..., session })`,
useAuctionDraft.ts:311-318) and already round-trips deep-copy — no storage change, no DB bump
(the profile map is additive on the session record). Human-controlled clubs get NO entry
(they never route through `cpuBidOnLot`). Pure-shill entries are untouched.

**Resume heal (legacy sessions):** on session load, if any team id in
`deriveControlledCpuTeamIds(leagueTeams)` ∩ `session.nominationOrder` lacks a `cpuShills`
entry, synthesize it with the SAME builder (inputs are all still available: leagueId from
context, team from leagueTeams) and persist once. Deterministic inputs → the heal is
idempotent and identical across machines. The `resolveSessionShill` seeded fallback REMAINS
as the last-resort crash rail, but after this change it is unreachable for real clubs and
untouched for pure shills.

### 2.3 Market coherence — the bidder and the predictor read the same shape

Replace the body of the `marketBandPrioritiesByTeamId` memo
(LeagueBuilderAuctionDraft.tsx:528-536) with the resolver: for each league team,
`resolveClubBandPriorities(team)`; skip nulls (null keeps today's unknown-bidder semantics at
auctionMarketModel.ts:298). Consequences, by construction:

- For every AI club, the market's `bidder.bandPriorities` (auctionMarketModel.ts:510) ===
  the profile's `bandPriorities` — the predictor prices the club with `bandFitMultiplier` +
  `cachedBandLift` (:293-297), which is the EXACT formula `evaluateCpuArchetypeFit` bids with
  (cpuShillBidding.ts:196-233, the single-math rule). The identity the market prices is the
  identity that bids.
- Archetype-provenance clubs become visible to the market for the first time (the §2.0
  latent bug).
- **Personality stays walled**: do NOT feed the profile's personality into the market view —
  the market keeps `MEAN_PERSONALITY_SPREAD` for clubs (personality is hidden identity; only
  band priorities are public league-setup information). The advised seat's own
  `ownBandPriorities` path (auctionMarketModel.ts:625-708) picks up the same resolver output
  via the same memo — no separate wiring.

### 2.4 The residual seed — noise ONLY, enumerated

The per-decision seed (`cpuDecisionSeed`: results.length, highBid, stillIn) keeps exactly two
jobs, both jitter on top of a now-fixed identity:

1. **Valuation jitter**: `shillNoiseMultiplier(`${seed}:${teamId}:${playerId}:valuation`)` —
   ±12% (`SHILL_NOISE_SPREAD`, cpuShillBidding.ts:131,449-451). Bid-to-bid wobble within a
   lot is accepted liveliness (audit ruling: "seed for noise only, small jitter").
2. **Bargain-interest dice**: `seededUnit(`${seed}:${teamId}:${playerId}:interest`)`
   (cpuShillBidding.ts:235-243) — the pass/pounce roll under
   `bargainInterestProbability`.

What the seed may NEVER touch again for a profiled club: archetype selection, band
priorities, personality, or any `resolveShillProfile` backfill — all fixed at init. No
engine-signature changes are needed: `cpuBidOnLot` / `cpuDecideLoneSurvivor` /
`evaluateCpuValuation` keep their seeds; the fix is that `session.cpuShills[teamId]` now
exists for real clubs, so `resolveSessionShill` finds a complete profile and the seed-derived
identity path is bypassed.

(V1.1 note, NOT in this build: consider re-keying valuation jitter to lot-stable components
so a club's read of one player is constant within a lot. Fable will rule with the economy
batch; do not do it here.)

### 2.5 Acceptance tests (Codex writes; engine + hook level)

1. **Determinism/stability**: init the same league twice → byte-identical club profiles.
   Within one session, `cpuBidOnLot` for the same (club, player) across seeds that differ in
   results.length/highBid/stillIn resolves the SAME `bandPriorities`/`personality`
   (assert via the profile on the session + valuation ratio staying inside the ±12% × interest
   envelope of one identity — a re-rolled archetype breaks the bound).
2. **Coherence**: for every `controlledBy === 'ai'` club,
   `marketBandPrioritiesByTeamId.get(id)` deep-equals `session.cpuShills[id].bandPriorities`.
3. **Provenance paths**: one club per resolver path — manual sliders (path 1), archetype key
   only (path 2: assert equals `archetypeBandPriorities(arch)` exactly), rawShift only
   (path 3: assert equals path 2's output for the same archetype — the bijectivity check),
   no identity (uniform).
4. **Shill isolation**: pure-shill profiles unchanged (same ids, same `shillMaxWins`,
   still hidden-archetype-seeded); real-club profiles have NO `shillMaxWins`.
5. **Resume heal**: a persisted session lacking club entries gains exactly the missing
   entries on load, identical to fresh-init profiles; human clubs never gain entries.
6. **Walled internals**: market view for clubs carries `personality: undefined`
   (MEAN spread path) — a test pinning that personality never leaks into the public view.

Out of scope for DJ-03: nomination strategy (no nomination surface exists for club CPUs yet —
audit DJ-28), `needAwareCompletion` enablement (DJ-26), and the CPU-panel valuation display
(DJ-02, separate contract).

---

*Both sections: build gates per SESSION_RULES — `npm run build` exit 0, suites green, and the
builder/auditor triangle (Codex builds, Opus audits the diff, Fable design-reviews the landed
frame + profile derivation against this document).*
