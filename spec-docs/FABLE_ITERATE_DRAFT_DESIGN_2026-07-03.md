# FABLE DESIGN — ITERATE ON YOUR DRAFT (the re-plan loop)

**Date:** 2026-07-03 · **Designer:** Fable 5 · **Builder:** Codex · **Auditor:** Opus
**Status:** DESIGN COMPLETE — ready to contract. NO code in this doc; Codex builds to it.
**Sources (binding):** `FABLE_BEST22_DESIGN_2026-07-03.md` (FLOOR/TARGET, fit-first law,
designVerdict, canonical adapter) · `RosterDesigner.tsx` · `LeagueBuilderDraftSetup.tsx` ·
`src/engines/best22Target.ts` · `src/engines/rosterDesignFeasibility.ts` ·
`src/engines/archetypeBalanceSimulator.ts` (the identity climb + its option seam) ·
JK browser session 2026-07-03 (the edit wall, the pin want, the cap want, run-it-back).
**Verified against HEAD 2026-07-03:** every file:line cited below was re-read from source
this session.

**Interaction-model ruling (Opus under AUTH-4, JK may redirect):** re-planning is
DESIGNER-SIDE. The loop is *plan → extract → read the BEST-22 + Asst-GM verdicts → edit
priorities/pins → re-extract → draft → see results → run it back → repeat.* Live in-draft-room
pin/priority editing is a FUTURE extension (§7 notes the seam); nothing in this doc designs it.

Layout: §0 the loop and the laws · §1 edit-after-extract (the wall) · §2 pins (the core
want) · §3 the cap on the draft-setup screen · §4 RUN IT BACK · §5 copy-league semantics ·
§6 contract slicing · §7 future seams. Every fork is RULED inline.

---

## §0 — THE LOOP, NAMED

What JK is actually doing on this screen is **iterating a plan against a market**. Today the
machinery for one full lap exists but the UI only narrates the FIRST lap: after extraction,
every affordance reads as "you're done," and every re-entry point either hides (unlock),
scolds (the stale banner), or dead-ends (the disabled editor, the badge that says "Run it
back" and does nothing — `LeagueBuilderDraftSetup.tsx:1658-1662`, a static `<span>`).

**The loop this design makes first-class:**

```
  DESIGN (asks + pins) ──lock──► EXTRACT ──► READ (floor · target · shortlists · club check)
      ▲                                            │
      │                                       edit / pin / move money
      │                                            ▼
   RUN IT BACK ◄── DRAFT ◄── LOCK POOL ◄── RE-EXTRACT (apply the re-plan)
```

**Laws carried over unchanged (binding):**
1. **Fit is a filter, price is the order within the filter** — pins are the tightest filter
   of all (an explicit named player), so they sit at the top of that same hierarchy: pin →
   ask → identity fit → price. Nothing here reorders by salary.
2. **Feasibility-soft** — no new hard blocks. A pin, a cap change, or an unlocked design
   never bricks a gate that is green today. Every existing gate keeps its exact predicate;
   staleness gates gain honesty, not severity.
3. **One pool per screen** (DJ-23) — no surface below mints a new player basis. Everything
   reads `rosterDesignerPlayers` / the extracted pool exactly as today.
4. **Reuse the canonical mapper** (`leaguePlayerAdapter.ts`) — no hand-built engine inputs
   anywhere in this build (the three C4 bugs).
5. **Every element earns its place; tutorial copy hides behind the help button.**
6. **Persisted-shape changes are additive + migration-safe** — every new field below is
   optional; absent = today's behavior byte-for-byte.

---

## §1 — EDIT-AFTER-EXTRACT: KILLING THE WALL

### 1.1 Root cause, restated from source

- Extraction requires every human design locked (`handleExtractPool` throws "Lock every
  club's design first", `LeagueBuilderDraftSetup.tsx:1201`; EXTRACT disabled unless
  `modeAState === "ready"`, :1936). So post-extraction, ALL designs carry `lockedAt`.
- The designer hard-freezes on lock: `readOnly = disabled || Boolean(lockedAt)`
  (`RosterDesigner.tsx:347`). Clicking a slot opens a fully disabled `SlotEditor` with **no
  visible path out** — every control at 45% opacity, zero explanation (:622-776).
- UNLOCK exists (:447-449) and works (`unlockDesign` :385-391) — but the instant a design
  unlocks, `modeAStaleTeams` counts it (`!lockedAt || lockedAt > poolExtractedAt`,
  page :803-808), the amber banner appears ("Designs changed since this pool was drawn — …
  Extract again before locking.", :1947-1951) while RE-EXTRACT is **disabled** (it requires
  `allHumanDesignsLocked`, :1982). The user is told to do the one thing the screen won't let
  them do. That circle is the "editing never sticks" feel.
- The copy-league report is the same wall wearing a different hat: the copy shares team
  records, so it inherits `lockedAt` + `poolExtractedAt` (§5).

The mechanics are correct. The missing thing is a **named middle state** and copy that
narrates the lap instead of flagging it as damage.

### 1.2 The state model (derived, nothing new persisted)

Per human design, in design-first mode:

| State | Predicate (existing fields only) | Meaning |
|---|---|---|
| **DRAFTING** | `!lockedAt && !poolExtractedAt` | first lap, pre-extraction editing |
| **LOCKED-CURRENT** | `lockedAt && poolExtractedAt && lockedAt <= poolExtractedAt` | this design shaped the current pool |
| **RE-PLANNING** | `!lockedAt && poolExtractedAt` | unlocked after a draw — mid-edit |
| **LOCKED-AHEAD** | `lockedAt > poolExtractedAt` | re-locked; waiting on RE-EXTRACT |
| **LOCKED-PRE** | `lockedAt && !poolExtractedAt` | locked, pool not yet drawn |

Page-level: the pool is **CURRENT** when no design is RE-PLANNING or LOCKED-AHEAD, else
**TRAILING** (this is exactly today's `designsStale`, :809 — same predicate, new name, new
voice). All transitions use the existing actions — `lockDesign`, `unlockDesign`,
`handleExtractPool` — **no new state fields, no gate changes**:

```
LOCKED-CURRENT ──UNLOCK & EDIT──► RE-PLANNING ──LOCK DESIGN──► LOCKED-AHEAD ──RE-EXTRACT──► LOCKED-CURRENT
```

**RULED — the unit of unlocking stays the single design.** No global "EDIT DESIGNS" mode:
this is a multi-seat table (`humanTeams` can belong to different GMs) and one GM's re-plan
must never unlock another seat's design. The page RAIL (§1.4) aggregates; the ACTION stays
per-club.

### 1.3 The designer affordances (`RosterDesigner.tsx`)

**(a) The header button gains its consequence.** Replace the bare gold `UNLOCK` (:447-449):

- Button label: `UNLOCK & EDIT` (still `variant="gold"`, same `unlockDesign`).
- One dim line beside it (11px, chalk/55), only when `mode === "design-first" && lockedPool
  === false && poolExtractedAt` is in play (the page passes a new optional prop, below):
  `EDITS RE-OPEN THE PLAN — LOCK AGAIN AND RE-EXTRACT TO APPLY`.
- While RE-PLANNING (unlocked post-extraction), the existing LOCK DESIGN button's helper
  line (:456-458) becomes state-aware: instead of "Fix the blockers first…" when tone is
  green, show `LOCK TO QUEUE THE RE-EXTRACT — THE POOL STILL REFLECTS YOUR OLD PLAN`.

New optional prop on `RosterDesigner`: `poolDrawn?: boolean` (page passes
`Boolean(league.poolExtractedAt)`; absent = today's rendering, so pool-first and
pre-extraction render byte-identical). The designer needs to know only "does a drawn pool
exist that my edits will trail" — it never reads league state itself. The consequence line
and the state-aware LOCK helper line render only when `poolDrawn` is true.

**(b) The locked editor names the way out — the actual wall JK hit.** `SlotEditor` gains
two optional props: `lockedByDesign?: boolean` and `onUnlock?: () => void`. When the editor
is readOnly **because of the design lock** (not because of `disabled`/saved-draft), render
one row at the top of the editor panel, above the shape menu:

```
🔒 THE ASK IS LOCKED — THE POOL WAS DRAWN FROM IT     [ UNLOCK & EDIT ]
```

- Left: 11px bold, brass. Right: `PressButton size="sm" variant="gold"` calling `onUnlock`
  (the same `unlockDesign`). One click and the same editor is live — the user never leaves
  the slot they were trying to change.
- When readOnly because `disabled` (saved draft in progress), today's behavior stands and
  the row reads the existing `disabledReason` instead of offering unlock — a saved draft
  still outranks everything (`unlockDesign` already refuses on `disabled`, :386).

**(c) RESET stays lock-gated.** No change: RESET is an edit and edits require the unlocked
state. (It already respects `readOnly`, :433-441.)

### 1.4 The page: the stale banner becomes the RE-PLAN RAIL (`LeagueBuilderDraftSetup.tsx`)

Replace the amber stale banner (:1947-1951) with a **guide strip** in the same position —
same layout slot, new voice. It renders whenever the pool is TRAILING (and, after §3, when
the money/identity basis is stale):

```
RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT
  ✎ Sirloins (You) — editing            ◉ Herbisaurs (P2) — locked, waiting on re-extract
The current pool still reflects the old designs. Re-extract when every club locks.
```

- Border-left brass (not warn) — this is a state, not a wound. The per-club fragments:
  RE-PLANNING → `✎ {club} ({gm}) — editing`; LOCKED-AHEAD → `◉ {club} ({gm}) — locked,
  waiting on re-extract`.
- The last line swaps to `EVERY CLUB IS LOCKED — RE-EXTRACT TO APPLY THE NEW PLAN.` when
  all trailing clubs are LOCKED-AHEAD (i.e., RE-EXTRACT is now actually pressable) — the
  copy must NEVER point at a disabled control (the root of the circular feel).
- `startBlocker` copy (:921) softens to match: `finish the re-plan — lock the edits, then
  re-extract` (predicate unchanged).
- The LOCK POOL gate (`canModeALock` includes `!modeAStale`, :1369-1375) is UNCHANGED.
  EXTRACT/RE-EXTRACT gates UNCHANGED. This section is copy + one banner + two designer
  affordances; zero gate arithmetic moves.

**Club card sub-labels** (:1862-1874) become state-aware: LOCKED-CURRENT → today's
`design locked · view` becomes `design locked · view / unlock`; RE-PLANNING →
`✎ re-planning · edit`; LOCKED-AHEAD → `◉ locked · awaiting re-extract`.

### 1.5 Help-layer addition (behind ?)

Append one HelpNote to zone 4's design-first help (:1916):

> "Nothing here is final until the auction starts. Unlock any design to re-plan — the pool
> you drew stays put while you edit, and one RE-EXTRACT redraws it to the new asks. You can
> lap this as many times as you like: design, draw, read, adjust, redraw."

### 1.6 §1 acceptance tests

- **W1:** design-first league, extracted, all locked → open a slot → the lock row renders
  with UNLOCK & EDIT; clicking it makes the same SlotEditor's controls live (no reopen).
- **W2:** with `disabled` (saved draft), the lock row shows `disabledReason` and NO unlock
  button; `unlockDesign` unreachable.
- **W3:** unlock one club → rail shows `✎ … editing`, RE-EXTRACT disabled; lock it → rail
  shows `◉ … waiting on re-extract` and the rail's action line flips to the every-club-locked
  string exactly when `allHumanDesignsLocked` becomes true.
- **W4:** gate regression pins — `canModeALock`, `startReady`, `handleExtractPool`'s
  lock-requirement, and `modeAStaleTeams`'s predicate are byte-identical before/after (unit
  pins on extracted helpers or characterization via existing page tests).
- **W5:** pool-first mode renders none of the new rail/lock-row surfaces (design-first only).

---

## §2 — INTERACTIVE PLAYER-TARGETING: PINS

JK's sentence, verbatim requirements: *swap a player from the target list into the primary
spot · move players around · reset the positional priorities · have the engine recalculate
around it.* "Reset priorities" already exists (the preference editor + RESET). The new
primitive is the **PIN**: a named player forced into a slot, with the BEST-22 recomputed
around the commitment.

### 2.1 Semantics (the ruling that makes everything else fall out)

**A pin is a claim: "I will win this player for this slot."** Therefore:

- **The pin ALWAYS occupies its slot in the target.** The engine never trades a pin away —
  the recompute answers "given these commitments, what's the best REST of the 22?" That is
  the recalculation JK asked for, and it is honest about consequence: if the rest can't
  complete legally/solvently around the pins, the target reports infeasible (advisory,
  §2.5) — the pick list still shows the pins plus the best attempt around them.
- **Pins live in the TARGET layer only. The FLOOR is pin-blind.** `evaluateRosterDesign`
  is untouched; `verdictTone`, `canLock`, the CLUB CHECK dot, LOCK POOL, START — every gate
  keeps reading the pin-free floor. A pin can never brick a lock (feasibility-soft law).
  The floor answers "does the DESIGN build"; the pin is part of the PLAN.
- **Pins outrank asks, asks outrank identity, identity outranks price** — the fit-first
  hierarchy extended one level up. A pinned player who doesn't match the slot's asked shape
  is legal and honored; the slot simply reports `honorsAsk` from the same `askSatisfaction`
  math as any pick (no special-casing).

### 2.2 Engine changes — flagged NOVEL

**(a) `buildIdentityRoster` gains a pin option** (`archetypeBalanceSimulator.ts` — options
record at :671-691, the same seam family as `slotPreferenceBonus`):

```
pinned?: ReadonlyArray<{ slotIndex: number; playerId: string }>
```

Exact semantics (Fable spec — Codex implements to the letter):
1. Pins are assigned FIRST, before the greedy seed (:555-565): each pinned player occupies
   its `IDENTITY_SLOT_PLAN` slot, is removed from every other slot's candidate set, and its
   salary joins the running spend. The pitcher-count context (`{ pitchers }`) is seeded from
   pins before the greedy walks the remaining slots.
2. The climb NEVER swaps a pinned slot's occupant and never moves a pinned player elsewhere.
   All other slots climb exactly as today around the fixed points.
3. The value floor, solvency, and legality checks run on the full 22 (pins included) —
   unchanged predicates.
4. Defensive contract: a pin whose player is absent from the pool, ineligible for the slot's
   plan kind (`identityEligible`), or duplicated across slots is DROPPED deterministically
   (first-listed pin wins a player-collision; the drop is silent at this layer because
   `buildBest22Target` validates first — item (b)). Absent/empty `pinned` ⇒ **byte-identical
   output** to today (the documented seam guarantee; test P1).

**NOVEL-MATH FLAG:** this pin-constrained recompute is the one genuinely new primitive in
this build. The semantics above are complete (this is a constrained extension of an existing
climb, not discovery-by-building — so per the mandate it is SPEC'D, not Fable-built), but:
the slice that implements it gets the tightest acceptance battery (§2.7 P1-P6), and **Fable
design-reviews the engine diff before the audit** (triangle: Codex builds, Opus audits,
Fable reviews the math).

**(b) `buildBest22Target` gains pins + reporting** (`best22Target.ts`):

```
buildBest22Target(slots, simPool, classifiedById, archetype, tier, budget,
  pins?: ReadonlyMap<string /* slotId */, string /* playerId */>)
```

- Validation BEFORE the build, through the feasibility engine's own doors (one rule set,
  one owner): player present in `simPool`; `eligibleForSlot` for the design slot (Codex
  exposes an `eligibleForSlot`-backed predicate from `rosterDesignFeasibility.ts` the same
  way `askSatisfaction` was exposed — never re-derive eligibility); one slot per player,
  one player per slot (a Map gives the latter for free).
- The slotId→slotIndex mapping rides the already-pinned frame alignment (BEST-22 test A4).
- `Best22Target` gains (additive):
  - `pins: { honored: Array<{ slotId: string; playerId: string }>; dropped: Array<{ slotId: string; playerId: string; reason: 'out-of-pool' | 'ineligible' | 'duplicate' }> }`
  - each `Best22TargetPick` gains `pinned: boolean`.
- `honorsAsk`, `asksHonored`, `embodimentZ`, `allIn` computed exactly as today over the
  resulting build — pinned picks flow through the same code path (they're just picks).

### 2.3 Persistence (additive, migration-safe)

`Team.rosterDesign` (`leagueBuilderStorage.ts:177`) and `RosterDesignSave`
(`RosterDesigner.tsx:50`) gain:

```
pins?: Record<string /* slotId */, string /* playerId */>
```

- Absent field = no pins = today's shape; no DB version bump (record-level schemaless, the
  RegisteredPool.locked precedent).
- **Orphan pins are user state — never silently deleted.** A pin whose player has left the
  pool (or lost eligibility after a player edit) is EXCLUDED from the compute (the engine
  drops it; the UI reports it, §2.4) but KEPT in storage: pools change lap to lap, and a
  re-extract can bring the player back. RESET clears pins along with everything else.
- Pinning/unpinning is an EDIT: gated by the same `readOnly` as every preference change —
  locked designs pin nothing (which is exactly why §1 must land with or before this).

### 2.4 UI surfaces (`RosterDesigner.tsx`)

**The shortlist becomes interactive** (`ShortlistRail` :778-819). Each row gains one
affordance on the right (edit mode only; hidden when `readOnly`):

- Unpinned row: a bordered chip-button `PIN` (panel-border; brass on hover).
- The pinned row: the chip renders filled brass `PINNED ✓` and clicking UNPINS.
- Pinning a player already pinned to another slot MOVES the pin (map semantics, one player
  one slot) — this is JK's "move players around" with zero extra UI.
- The existing gold `TARGET` chip stays; the fit-first display law stays (never re-sort by
  salary; the rail order is `rankPoolForSlot`'s).

**The slot card** (`SlotGroup` rows :575-615): a pinned slot's target line becomes the pin
line — `📌 {NAME} · {$salary}` in full brass (not the 70% dim of a computed pick; a
commitment reads stronger than a suggestion). When the pin is orphaned:
`📌 {NAME} — OUT OF THE POOL` in amber. `≈` prefix still applies when the pinned player
misses the asked shape (`honorsAsk === false`) — the ask stays honest about its own pin.

**The SlotEditor** gains one row between the temperament control and the shortlist:
- No pin: nothing (absence is the encoding).
- Pin: `PINNED TO THIS SLOT: {NAME} · {$salary}   [ UNPIN ]`; orphaned pin:
  `PINNED: {NAME} — LEFT THE POOL. RE-EXTRACT CAN BRING HIM BACK.   [ UNPIN ]` (amber).

**The target strip** (§1.3 of the BEST-22 design) appends a pin segment when pins exist:
- All honored: `· {n} PIN{S} LOCKED IN` (brass).
- Any dropped: `· {k} OF {n} PINS CAN'T LAND` (amber, advisory).
- Pinned-infeasible (target.feasible false with pins honored): the infeasible strip line
  becomes `THE 22 AROUND YOUR PINS BREAKS THE CAP OR THE ROSTER LAW — EASE A PIN OR RIDE IT`
  (amber; "ride it" is deliberate — feasibility-soft, the GM may keep the plan).

**Recompute policy:** pins join the existing 300ms debounced pass (:303-325) and its memo
key. One extra `buildIdentityRoster` call per edit at most — same duty cycle as the BEST-22
ruling. No render-path computation.

### 2.5 What a pin may NOT do (the guardrails, restated as one list)

- May not change any floor verdict, tone, dot, lock gate, or start gate (pin-blind floor).
- May not survive into the compute when out-of-pool/ineligible (dropped + reported).
- May not be silently discarded from storage (orphan reporting instead).
- May not reorder the shortlist by anything but `rankPoolForSlot`'s comparator.
- May not exist twice (one player, one slot — map + engine dedupe).

### 2.6 Pins ride the extraction (closing JK's actual loop)

`handleExtractPool` (:1197-1231) unions every LOCKED design's valid pins into
`extractPoolFromDemand`'s `pinnedIds` (today `ledger.handAdds`, :1048):

```
pinnedIds: [...folded.handAdds, ...lockedDesignPinPlayerIds]
```

So: Asst-GM whispers a name → GM pins him → re-extract → **the pinned player is guaranteed
in the drawn pool** → the target recomputes around him → the draft room is where he's won.
That's the full sentence JK spoke, wired end to end. (Hand-remove vs pin conflict: a
player both hand-removed and pinned resolves PIN-WINS — the explicit per-slot commitment
outranks the older pool-level exclusion; the extraction report already narrates hand-edits
and gains one clause: `{n} design pin(s) held in the pool.`)

The demand-cell math is untouched — pins do not create demand cells (the ask already did);
they only guarantee membership. `modeAExtractedIds`/ledger folding unchanged.

### 2.7 §2 acceptance tests

- **P1 (byte-identity):** `buildIdentityRoster` with `pinned: []`/absent ⇒ identical output
  to today on the BEST-22 shared fixtures (deep-equal).
- **P2 (pin lands):** pin an eligible player → he occupies exactly that slot in
  `slotPicks`; no other slot holds him; `Best22TargetPick.pinned === true`.
- **P3 (recompute around):** pin an expensive player → total spend includes him and the
  rest of the 22 re-optimizes (differs from the unpinned build) while legality/solvency
  checks run over all 22.
- **P4 (drop taxonomy):** out-of-pool, ineligible-for-slot, and duplicate pins each land in
  `pins.dropped` with the right reason; the build completes without them.
- **P5 (floor blindness):** with any pin set, `evaluateRosterDesign` output and all
  tones/gates are byte-identical to the pin-free run (regression pin on shared fixture).
- **P6 (honorsAsk honesty):** a pin that mismatches the asked shape yields
  `honorsAsk:false` + the ≈ display path; a matching pin counts in `asksHonored`.
- **P7 (persistence):** save/reload a design with pins → pins restore; a legacy
  `rosterDesign` without `pins` loads clean (migration-safe).
- **P8 (extraction ride):** locked design with a pin → `extractPoolFromDemand` receives the
  id in `pinnedIds` and the drawn pool contains the player; pin-vs-hand-remove resolves
  pin-wins.
- **P9 (readOnly):** pin/unpin affordances absent when `readOnly`; orphan-pin row renders
  when the player leaves the pool and clears when he returns.

---

## §3 — THE CAP ON THE DRAFT-SETUP SCREEN

### 3.1 The problem and the placement

The hard-cap number is editable ONLY in league settings (`LeagueBuilderLeagues.tsx` — form
field :601-611, floor validation :156-166), a full screen away from the place where the GM
learns what money buys. `tierBudget = resolveLeagueSalaryCap(league)` (page :795-798)
already feeds the designer, extraction, recheck, solvency banner, and draftability — the
plumbing is one field write away.

**RULED — placement:** a compact **THE MONEY** control in zone 4's control rail, beside
POOL SIZE (:1509-1545 — the dial is its layout twin). Same panel grammar:

```
THE MONEY
$ [ 155,000 ]  [APPLY]
JUICED TIER PAR $150,000 · [RESET TO TIER]
```

- Line 1: label (10px brass tracking, identical to POOL SIZE).
- Line 2: the input (numeric text, `$`-prefixed display) + APPLY (PressButton sm). APPLY
  persists `saveLeagueTemplate({ ...league, salaryCap: parsed })`; everything downstream
  recomputes live because it already keys on `tierBudget`.
- Line 3: tier reference + reset. RESET TO TIER writes `salaryCap: undefined` (falls back
  to `TIER_CAPS[tier].tierCap` via `resolveLeagueSalaryCap`, storage :132-134). When the
  current cap equals the tier par, line 3 shows only `JUICED TIER PAR` (no reset — earns
  its place).
- Renders in BOTH pool modes (pool-first gets it in the rail beside the sufficiency chip).

### 3.2 Validation — one owner

Extract the Leagues page's parse/format/floor trio (`parseSalaryCapInput`,
`formatSalaryCapInput`, floor = `Math.ceil(22 * LEAGUE_MINIMUM_SALARY)`,
`LeagueBuilderLeagues.tsx:156-166`) into a shared module
`src/src_figma/app/utils/salaryCapInput.ts`; BOTH screens import it (the
`countEligibleForAsk` one-owner precedent). Identical rules on both surfaces: below-floor =
hard error (APPLY disabled, red line `SALARY CAP MUST BE AT LEAST {$floor}`); the Leagues
page's advisory band renders here as the same amber advisory line. No new rules minted.

### 3.3 Gating + staleness (the honesty piece)

- **Editable only while the pool is UNLOCKED and no saved draft exists** (`poolEditingBlocked`
  gates it, same as the dial, :1521). Locked pool → control renders read-only with the dim
  line `UNLOCK THE POOL TO MOVE THE MONEY` (never a disabled control without a named way
  out — §1's lesson, applied at birth).
- **New additive league field**, written by `handleExtractPool` alongside `poolExtractedAt`:

  ```
  poolExtractedBasis?: {
    cap: number;
    poolSizeMultiplier: number;
    identityByTeamId: Record<string, string | null>;  // teamId → mlbArchetypeKey
  }
  ```

  `basisStale` = any component diverges from the live value. This closes THREE silent holes
  with one field: cap changes (new), pool-size dial changes post-draw (silent today), and
  MLB-identity changes post-draw (silent today — `modeAStaleTeams` keys on `lockedAt` only,
  :803-808, so an identity swap never trips it even though identities feed
  `extractPoolFromDemand`, :1035-1041). Structural comparison, no hashing.
- **Design-first:** `basisStale` joins the TRAILING predicate — the §1.4 rail gains a line:
  cap → `THE CAP MOVED ({$old} → {$new}) SINCE THE POOL WAS DRAWN — RE-EXTRACT TO SIZE THE
  POOL TO THE NEW MONEY.` · dial → `THE POOL-SIZE DIAL MOVED — RE-EXTRACT TO REDRAW.` ·
  identity → `{club} CHANGED ITS IDENTITY — RE-EXTRACT TO RESTOCK FOR IT.` And `basisStale`
  joins `designsStale` in the START gate (same severity as designs — the room should not
  open on a pool drawn for different money; the fix is the one-click RE-EXTRACT).
- **Pool-first:** no extraction, so no basis gate — a cap edit flows into the recheck key
  (already includes `cap: tierBudget`, :1321-1332) and the existing `pool changed —
  re-check` chip carries it. Advisory only.
- Migration: leagues with `poolExtractedAt` but no `poolExtractedBasis` (drawn before this
  build) are treated as basis-CURRENT (no retro-nagging; the next extract writes the basis).

### 3.4 Help-layer addition

> "The cap is the league's money supply. Nerf it and stars get lonely — juice it and the
> room can afford its asks. Change it any time before the pool locks; in design-first,
> re-extract after, so the pool is sized to the new money."

### 3.5 §3 acceptance tests

- **M1:** APPLY persists `salaryCap`; designer chip FLOOR $Y, CLUB CHECK, recheck header
  (`CAN EVERY CLUB BUILD … UNDER {$cap}`, :1551), and draftability all reflect it without
  reload (they key on `tierBudget`).
- **M2:** below-floor input → hard error, APPLY disabled; both screens render identical
  error strings from the shared module (copy characterization).
- **M3:** RESET TO TIER writes `salaryCap: undefined` and the control shows tier par.
- **M4:** design-first: extract → change cap → rail shows the cap line and START blocks;
  RE-EXTRACT → basis rewritten → rail clears, START opens.
- **M5:** identity swap post-extraction trips `basisStale` (the silent hole is closed);
  pool-size dial change likewise.
- **M6:** legacy league with `poolExtractedAt` and no basis → no staleness claim.
- **M7:** locked pool → read-only control with the unlock hint; no write path.

---

## §4 — RUN IT BACK: RE-RUN THIS DRAFT

### 4.1 What actually freezes today (verified)

A completed auction sets `session.state === "AUCTION_COMPLETE"`. The setup page then shows
the static `Drafted ✓ · Run it back` badge (:1658-1662) — display only. `hasSavedDraft` is
FALSE for a completed session (:594-595), so setup isn't gate-frozen — the real freeze is
that the completed session **squats on the session id**: START routes into the room, the
room loads the completed session (`useAuctionDraft.ts:542`) and reads "Auction complete."
Meanwhile the completed draft has already COMMITTED: MLB winners are written onto players
(`saveMlbAssignment` — assignment `{leagueId, teamId, 'MLB'}` + `salary`/`settledSalary`
overwritten with the settled price, `leagueBuilderAuctionPipeline.ts:192-206`) and onto
`TeamRoster.mlbRoster` (`commitTeamRoster` :172-190; called from `useAuctionDraft.ts:468`);
the farm draft mints NEW Player records (`farmProspectToPlayer` :208+, committed via
`useFarmAuctionDraft.ts:275`). "Re-run" therefore = clear sessions + UN-COMMIT.

### 4.2 The affordance

The badge becomes live: badge + `RUN IT BACK` (PressButton, `variant="destruct"`, header
rightSlot beside the badge). Click → the page's established inline confirm pattern
(SURE? ✓/✗, :1966-1978) with the consequence named:

```
SURE? ✓ ✗ — Clears the finished draft and every roster it handed out. Your pool, prices,
designs, and identities stay. You'll draft again from scout hire.
```

**RULED — guard: pre-franchise only.** `franchiseInitializer` consumes the completed
mlbSession (`franchiseInitializer.ts:114, 782`); re-running under a live franchise would
orphan it. If any franchise references this league, the button renders disabled with
`A FRANCHISE IS ALREADY RUNNING ON THIS DRAFT — RE-RUNNING WOULD PULL ITS FLOOR OUT.`
(Codex wires the existence check off the franchise storage's league linkage; if no direct
lookup exists, a minimal read-only scan at page load is acceptable — it runs once.)

**RULED — completed drafts only.** An IN-PROGRESS saved draft keeps today's resume-first
gate untouched; "abandon a live draft" is a different product decision (future seam, §7).

### 4.3 The un-commit algorithm (`leagueBuilderAuctionPipeline.ts` — new export
`resetCompletedDraftArc(leagueId)`; ordered, idempotent, re-runnable after a mid-way crash)

1. **READ FIRST** (before any delete): MLB session (`getAuctionSession(leagueId, 1)` —
   `MLB_AUCTION_SEASON`, pipeline :25), farm session (`getAuctionSessionById(
   createFarmAuctionSessionId(leagueId, 1))`, storage :1590-1592), startup draft session
   (`getStartupDraftSession`), and the registered pool (`getRegisteredPool` — the
   price-of-record snapshot, `leagueConstruction.ts:36-56`).
2. **Farm un-commit:** delete the farm-minted Player records — identified as players whose
   `leagueAssignments` carry `{leagueId, rosterStatus:'FARM'}` AND whose ids appear in the
   farm session's committed results (both conditions; never delete on rosterStatus alone).
   Clear `TeamRoster.farmRoster` for every league team.
3. **MLB un-commit:** for every player with an assignment `{leagueId, teamId !== ''}`:
   rewrite the assignment to `{leagueId, teamId:'', rosterStatus:'FREE_AGENT'}` (pool
   membership survives — `isPlayerInLeaguePool` keys on leagueId only,
   `leagueBuilderPoolBuilder.ts:51-53`); restore `salary` from the RegisteredPool entry
   (`players[].salary` — the frozen ask; the commit overwrote it with the settled price);
   clear `settledSalary`. Clear `TeamRoster.mlbRoster` for every league team.
4. **Delete sessions:** farm auction session, MLB auction session
   (`deleteAuctionSession`, storage :1841), startup draft session
   (`deleteStartupDraftSession`, :1703), and the league's scout profiles
   (`deleteScoutProfilesForLeague`, :1641) — the scout-hire round is part of the draft arc
   and re-runs with it.
5. **Keep untouched:** the registered pool (locked, prices frozen — the whole point of
   re-drafting the same market), designs + their pins + `lockedAt`, identities, seats,
   league fields (`poolExtractedAt`/basis stay — the pool wasn't redrawn).

After: the completion probe (:592-597) flips `hasCompletedDraft` false on refresh → badge
gone → the full §1-§3 loop is available (unlock a design, move the cap, re-extract, or just
START straight away and re-draft the identical pool). START routes to scout hire as a true
fresh start (:1246-1253).

**Morale freeze — clean by construction:** the checkpoint-0 draft-seed lives in
`franchiseMoraleState.ts` (:300-340) and seeds at FRANCHISE initialization from the
completed mlbSession (skip-guarded by an existing 'draft-seed' history entry). Because
RUN IT BACK is gated pre-franchise (§4.2), no morale state exists to clean; the next
franchise init seeds the freeze from the NEW draft's session. Re-run = clean slate without
touching the morale store.

### 4.4 §4 acceptance tests (integration — extend `draftPipeline.integration.test.ts`,
which already drives commit end-to-end at :890)

- **R1:** complete MLB+farm on a fixture league → `resetCompletedDraftArc` → all three
  sessions gone; scout profiles gone; every pooled player back to
  `{teamId:'', 'FREE_AGENT'}` with the registered-pool ask price restored and
  `settledSalary` cleared; team `mlbRoster`/`farmRoster` empty; farm-minted players deleted;
  registered pool + designs + pins byte-identical before/after.
- **R2 (idempotent):** running it twice = same end state, no throw.
- **R3 (partial arc):** MLB complete, farm never run → reset succeeds (absent farm session
  tolerated).
- **R4 (guard):** franchise linked to the league → button disabled with the exact string;
  `resetCompletedDraftArc` refuses (throws a named error) as defense-in-depth.
- **R5 (UI):** completed draft → badge + RUN IT BACK render; confirm → after refresh the
  badge is gone, START reads `START THE DRAFT`, and the room no longer resumes a completed
  session.
- **R6 (membership):** `isPlayerInLeaguePool` still true for every pre-draft pool member
  after reset (the pool did not shrink).

---

## §5 — COPY-LEAGUE: A COPY STARTS CLEAN

### 5.1 The bug (verified)

`duplicateLeague` (`useLeagueBuilderData.ts:317-334`) is a shallow league-record copy:
`{...original, id: undefined, name: name + ' Copy'}`. Consequences:
- **`teamIds` points at the SAME team records** → the copy shares `rosterDesign`
  (slots + `lockedAt`), `mlbArchetypeKey`, seats — and any edit in either league mutates
  both. This is the "same wall in the copy league" JK hit, and it's live data corruption
  waiting on any divergent edit.
- **`poolExtractedAt` + `modeAExtractedIds` + hand ledgers copy over** while pool
  MEMBERSHIP does not (it lives on `Player.leagueAssignments`, keyed by the new league id)
  → the copy claims "pool drawn" over an empty pool.

### 5.2 RULED — deep-copy semantics

`duplicateLeague` becomes:

1. **Deep-copy every team:** for each `teamId`, create a NEW team record copying the
   flavor + plan (name, colors, stadium, identity keys, capIdentities, `gmSeatId/Name`,
   `rosterDesign.slots` **and `rosterDesign.pins`**) with:
   - `lockedAt` CLEARED (a copy starts editable — the §1 wall never inherits),
   - rosters/lineups cleared (`lineupWithDH`, rotation, optimal snapshots — draft output,
     not plan), `leagueIds` pointing at the new league only,
   - a fresh empty `TeamRoster` created iff team creation normally creates one (parity with
     `createTeam` — Codex verifies and matches whatever a freshly created team has).
2. **Remap ids everywhere they're referenced on the league:** `teamIds`, and every
   `conferences[]`/`divisions[]` team membership (old id → new id; Codex greps the exact
   division shape).
3. **Reset extraction state on the copy:** `poolExtractedAt`, `modeAExtractedIds`,
   `modeAHandAdds`, `modeAHandRemoves`, `poolExtractedBasis` → all `undefined`.
4. **Keep the knobs:** `tier`, `salaryCap`, `draftPoolMode`, `draftFormat`,
   `poolSizeMultiplier`, `draftSeats`, `balanceMode`, `checkpointCadence`, flavor fields.
5. **Do NOT copy** (all keyed by leagueId — they stay behind naturally, but the contract
   states it so nobody "fixes" it later): pool membership, registered pool, auction/farm/
   startup sessions, scout profiles.

Result: a copy is *the same plan pointed at a fresh market* — designs and pins intact and
editable, mode preserved, first lap not yet run. Design-first copy lands in `waiting`
(lock designs → extract); pool-first copy re-seeds membership via the auto-importer
(:995-1008).

### 5.3 §5 acceptance tests

- **C1:** duplicate → editing a design in the copy leaves the original team record
  byte-identical (distinct team ids; the shared-record bug is dead).
- **C2:** copy has no `poolExtractedAt`/`modeAExtractedIds`/basis; design-first copy shows
  `modeAState === 'waiting'` with designs present but unlocked; pins survived the copy.
- **C3:** `teamIds` and division/conference memberships reference only new ids; counts
  match the original.
- **C4:** sessions/scouts/registered pool queries against the copy's id return
  null/empty; the original league's are untouched.
- **C5:** pool-first copy auto-imports membership on first open (existing effect, new
  league id).

---

## §6 — CONTRACT SLICING (captain's call)

Ordered so every slice lands green on its own; builder≠auditor triangle per slice. L-SIM is
NOT required on any slice — designer/auction modules sit outside the L-SIM import graph
(documented orthogonality; each contract has Codex grep the import graph and state it in
the audit evidence). Every slice: `npm run build` exit 0 + the named suites + the slice's
acceptance battery.

1. **C-ITER-ENGINE — pins in the math** (§2.2): `buildIdentityRoster.pinned` +
   `buildBest22Target` pins param + `Best22Target.pins`/`pick.pinned` + the
   eligibility-predicate exposure from `rosterDesignFeasibility.ts`. Pure, test-first:
   **P1-P6**. ⚑ NOVEL-math slice — Fable design-reviews the diff before Opus audits.
2. **C-ITER-DESIGNER — the edit loop + pin UI** (§1.3, §2.3, §2.4): unlock affordances
   (header consequence line, SlotEditor lock row + `onUnlock`), `RosterDesignSave.pins` +
   save path, shortlist PIN/UNPIN, slot-card pin line, orphan-pin surfaces, strip pin
   segment, `poolTrailing` prop. Tests **W1-W2, P7, P9** + copy characterization.
3. **C-ITER-PAGE — the rail, the money, the basis** (§1.4, §3, §2.6): re-plan rail
   replacing the stale banner, club-card sub-labels, THE MONEY control + shared
   `salaryCapInput.ts` module (Leagues page repointed), `poolExtractedBasis` write +
   staleness join, pins→`pinnedIds` in extraction. Tests **W3-W5, M1-M7, P8**.
4. **C-ITER-RERUN — run it back** (§4): `resetCompletedDraftArc` in the pipeline +
   the header button/confirm + the franchise guard. Tests **R1-R6** (extend
   `draftPipeline.integration.test.ts`).
5. **C-ITER-COPY — deep duplicate** (§5): `duplicateLeague` deep-copy + remap + reset.
   Tests **C1-C5**.

Dependencies: 2 needs 1 (pin types); 3 needs 2 (pins persisted before they ride
extraction; rail copy references designer states); 4 and 5 are independent of 1-3 and of
each other — they may run as a parallel lane if the file-surface partition is proven
(4 touches pipeline/page-header; 5 touches the data hook; overlap only on the setup page's
header region for slice 4 — keep 4 and 3 serialized on that file).

**Novel-math ledger:** ONE novel primitive (pin-constrained best-22 recompute, §2.2a) —
spec'd here, Codex-built, Fable-reviewed. Everything else is reuse: `askSatisfaction`,
`rankPoolForSlot`, `evaluateRosterDesign`, `extractPoolFromDemand.pinnedIds`,
`resolveLeagueSalaryCap`, the designVerdict copy module, the canonical
`leaguePlayerAdapter` (no new mappers anywhere).

---

## §7 — FUTURE SEAMS (noted, not designed)

- **In-draft-room re-planning:** the whisper board (BEST-22 §1.6) is the natural surface —
  a PIN chip on a board row feeding the same `rosterDesign.pins` field, target recompute
  live between lots. The §2 persistence shape was chosen so this needs no migration.
- **Abandon a live draft:** the in-progress cousin of RUN IT BACK. Different confirm
  weight; same `resetCompletedDraftArc` core with a partial-session path.
- **Shill count in the extraction basis:** `shills` is transient page state (not persisted
  on the league), so §3.3's basis omits it — if shill count ever persists, it joins the
  basis record.
