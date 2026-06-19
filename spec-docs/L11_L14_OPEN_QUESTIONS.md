# L11–L14 OPEN QUESTIONS — JK DECISION WORKSHEET

**Created:** 2026-06-18 (attended). **Purpose:** "get ahead of the curve" — consolidate every open design
question across the four remaining Tier-3 L-tickets into one worksheet JK can rule through, so the durable
decisions are made *before* each ticket's build instead of one-at-a-time at the gate.

**Provenance.** L11 = `L11_SCOPE_MAP.md §7` (recon already done; 4 forks already ruled 2026-06-18). L12/L13/L14
= workflow `wf_1f3e2c10-e94` (6 agents: a deep-dive reader + an **adversarial auditor** per ticket). Every
`file:line` was read/grepped by the readers and **spot-verified by the auditor stage** (which caught and fixed
real errors — see each ticket's audit note). These are **Captain-recommended defaults for JK to rule on**, not
settled decisions.

---

> ## ✅ STATUS: RULED (JK ruling pass, 2026-06-19)
> **All 43 open questions across L11–L14 are now ruled** — see the authoritative record in
> `DECISIONS_LOG.md` → **"2026-06-18/19 (L11–L14 ruling pass)"** (per-ticket rulings, with JK's overrides and the
> two field corrections below). This worksheet is retained as the rationale/citation map; the DECISIONS_LOG entry
> is the source of truth for what was decided.
>
> **JK overrides of the Captain default** (don't assume the default below was taken): L12-Q1 (season-race slots
> now, defer the 2 one-shots) · L12-Q2 (single weighted composite, reconciled to per-race-type weights) · L12-Q8
> (L6 owns the whole status layer) · L12-Q13 (lock at 60%, not 50%) · L13-Q7 (keep flat base constants + matrix
> multiplier) · L14-Q2 (clear non-Captain badges + re-seed a new Fan Hopeful) · L14-Q3 (rebrand DOES reset the
> whole roster's fame — a 2nd reset valve, amend FAME-7).
>
> **Field corrections (workflow gaps that were WRONG):** player **`gender`** AND **`age`** both already exist as
> persisted player fields (`playerDatabase`/`unifiedPlayerStorage`/`leagueBuilderStorage` + Builder UI) — so L13-Q3
> ('young' reads real age) and L13-Q9 (romance reads real gender) need **no new field and no L1 dependency**; the
> agents missed them by checking `HiddenModifiers`/`ManagerProfile` instead of the player record.
>
> **Spec-doc reconciliation follow-ups (doc-hygiene, apply before/at each build):** amend FAME-7 (L14-Q3) · stamp
> the two `FRANCHISE_MODE2_MORALE_RELATIONSHIP_*` docs SUPERSEDED-BY-§24 (L13-Q11) · retire the DSTACK
> `kbl-relationships` DB wording (L13-Q12) · reconcile the stale DSTACK · schedule the fame double-ladder collapse
> as a pre-L12 cleanup (L12-Q10).

---

## THE FRAMING DECISION (read first)

There is a real tension to settle before ruling anything:

- **`L11_L14_READINESS_AUDIT.md` says:** *don't rule all ~34 gaps now — rulings made far from build rot before
  use* (the exact staleness that caused FINDING-150: a "LOCKED" spec section that hid scattered/contradictory
  measurements). Ratify each ticket **right before its build**.
- **JK's ask:** get ahead of the curve.

**The reconciliation (how this doc resolves it):** every question is tagged by **timing**, so you harvest the
durable decisions now and defer only the volatile ones.

| Tag | Meaning | Action |
|-----|---------|--------|
| **🟢 SAFE-NOW** | Taxonomy / canonical-value reconciliation / scope / architecture / which-data-artifact. Will **not** rot. | **Rule now.** This is the "ahead of the curve" payload. |
| **🟡 MIXED** | Structural half is safe-now; a sim-tuned magnitude rides inside it. | **Rule the structure now**, code the magnitude as a named §16 placeholder. |
| **🔴 DEFER** | A pure sim-tuned magnitude §16 will settle. | **Don't rule.** Listed only so it's off your plate. |

Second axis — **build impact:** **⛔ BLOCKS-BUILD** (the ticket stalls without an answer) vs **▶ CAN-PROCEED**
(a documented default carries it).

> **Two doc-hygiene actions the readiness audit wants done regardless** (not JK magnitude rulings — just
> ratify the direction): (a) reconcile the **stale DSTACK** so no builder rebuilds the now-built fame/awards
> engines; (b) the **fame double-ladder collapse §20.8** (L12-Q10) and the **relationship cross-ref
> supersession** (L13-Q11) as pre-ticket cleanups.

---

## TALLY

| Ticket | Subsystem | Open Qs | 🟢 SAFE-NOW | 🟡 MIXED | 🔴 DEFER | ⛔ Blocks build | Already ruled |
|--------|-----------|:------:|:----------:|:-------:|:-------:|:--------------:|:------------:|
| **L11** | Manager firings | 9 | 9 | 0 | 0 | 1 (Q7) | 4 forks |
| **L12** | Race + All-Star + Awards | 13 | 6 | 6 | 1 | 4 | 13 points |
| **L13** | Relationships-lite + reporter | 13 | 5 | 8 | 0 | 8 | 13 points |
| **L14** | Rebrand circuit-breaker | 8 | 6 | 2 | 0 | 4 | 6 points |
| **TOTAL** | | **43** | **26** | **16** | **1** | **17** | |

**The harvestable payload = the 26 🟢 SAFE-NOW + the structural half of the 16 🟡 MIXED.** Only **1** pure 🔴
DEFER exists (L12-Q12, the fame fickle/sticky numbers). Translation: almost everything here is *get-ahead-able*
— the spec's open work is overwhelmingly architecture/taxonomy, not sim magnitudes.

---

## 🟢 HARVEST-NOW SHORTLIST (the fast path)

If you only rule one pass, rule these — all stable, none rot, and they unblock the most build:

- **L11:** manager-personality home (Q7 ⛔), successor identity (Q8), legacy-record shape + store granularity (Q9), one-fan-write (Q6), confirm-MOY-out (Q12).
- **L12:** ratify the **6-slot award-category extension** (Q1 — the LSD-1 seam gap), **TV-family math basis** (Q7 ⛔), **All-Star roster shape** (Q5 ⛔), the **fame double-ladder collapse sequencing** (Q10), All-Star lock cadence (Q13).
- **L13:** ratify the **canonical relationship taxonomy** (Q1 ⛔ — the triple-conflict), **charged-matchup = morale not LI** (Q6 ⛔), **deltas belong in the L3 matrix** (Q7 ⛔), **storage substrate** (Q12 ⛔ — kill the phantom `kbl-relationships` DB), **supersede the stale cross-ref docs** (Q11).
- **L14:** **badge-reset enumeration** over the 6-designation set (Q2 ⛔), **cascade ORDER** (Q4 ⛔), **fame-persists-through-rebrand** (Q3), **team-identity source + relocation-marker schema** (Q5 ⛔), the **L11↔L14 firing call contract** (Q8 = L11-Q11).

---
---

# L11 — MANAGER FIRINGS

**Scope:** a Phase-2 event + two consequence-writes (fan-relief bump + per-player morale ripple) + close the
fired manager's Almanac legacy. The GM pressure-release valve. Full recon: `L11_SCOPE_MAP.md`.

**✅ ALREADY RULED (JK 2026-06-18 — do NOT re-ask):**
1. **Trigger = BOTH + L14** — manual GM action AND an auto-backstop roll on sustained low fan morale (revive the orphaned `managerFireProbability`) AND the L14 cascade, all through **one shared resolver**.
2. **Personality ripple = BUILD FULL NOW, dark** — incl. the personality half; inert until L1 + a new manager-personality field.
3. **Performance gate = SCALED** by how underwater (gradient, zero for net-positive) off the live `valueDelta`.
4. **Fan-relief bump = SCALED by team struggle** (not flat), emitted once per firing.
> Plus **MOY is OUT of L11** (Phase-1 D9). The trigger *threshold/duration* is §16 sim-tuned.

**The 9 still-open L11 questions** (`L11_SCOPE_MAP.md §7` Q5–Q13):

| id | title | timing | build |
|----|-------|:------:|:-----:|
| **L11-Q5** | **Clubhouse / other-touched ripple — flat vs sign-variable.** The row hard-codes `touch('clubhouse', smallTeammateDrop)` = uniform −1, but §12 says "some tighten, some are relieved" (mixed sign). Keep flat −1, or make each teammate's sign depend on their own TV/personality? **Default:** keep flat −1 for v1. | 🟢 SAFE-NOW | ▶ |
| **L11-Q6** | **Fan-write multiplicity.** If the resolver loops per-player for the ripple, the team-fan relief bump must emit **exactly once** (not once-per-player) or it multi-counts (`sourceEventId` dedupe only helps if the id is reused). **Default:** one separate fan write. | 🟢 SAFE-NOW | ▶ |
| **L11-Q7** | **Manager personality — source + home.** No manager type carries a personality field. Reuse the canonical **7-personality enum** (player-only today) or a manager-specific one? Store on the **identity** `ManagerProfile` (`managerWpa.ts:68`, `kbl-manager-identity`) or the **career-stats** one (`mwarCalculator.ts:144`, `kbl-manager`)? Note: **D9 retires `mwarCalculator`** — don't build new legacy on the soon-dead type. **Default:** reuse the 7-enum on the identity `ManagerProfile`. | 🟢 SAFE-NOW | ⛔ |
| **L11-Q8** | **Successor manager identity.** On firing, who replaces — auto-generate a default (`buildDefaultManagerProfile`), promote an unassigned profile, or user-picks? L14's auto-fire needs the same answer. **Default:** auto-generate the "new voice." | 🟢 SAFE-NOW | ▶ |
| **L11-Q9** | **Legacy record shape + store granularity.** Should `ManagerTeamTenureAggregate` (`almanacQueries.ts:193`) gain hire/fire dates + an end-reason (fired/resigned/relocated)? Does L11 need its OWN overlay store (trackerDb v24 + ledger-pin churn + backup-parity guard), or ride the existing morale/L10 substrate? **Default:** ride existing substrate, no new store; add end-reason field. | 🟢 SAFE-NOW | ▶ |
| **L11-Q10** | **L1 dependency.** The ripple needs persisted loyalty/resilience. HiddenModifiers are defined (`game.ts:124-129`) but not attached/persisted to a Player until **L1**. Is L1 a hard prerequisite for the personality half, or does L11 build dark against the type and rely on L1 before switch-on? **Default:** build dark; L1 is an activation prerequisite, not a build blocker. | 🟢 SAFE-NOW | ▶ |
| **L11-Q11** | **L14 contract surface** *(= L14-Q8 — rule once, both sides).* What signature must L11 expose for L14's auto-fire (e.g. `fireManager({teamId, reason:'rebrand', skipUserConfirm:true})`)? Does the rebrand path **suppress the fan-relief bump** (morale is reset to ~70 anyway)? **Default:** suppress the relief bump on rebrand; player ripple still applies. | 🟢 SAFE-NOW | ▶ |
| **L11-Q12** | **Confirm MOY is OUT of L11.** Explicit confirmation L11 touches no manager fame/award/ceremony code (DSTACK:33 / D9). **Default:** confirmed OUT. | 🟢 SAFE-NOW | ▶ |
| **L11-Q13** | **GM hot-seat surface in v1?** Does the "Fire Manager" button + hot-seat pressure framing ship in v1, or defer? No firing UI exists today. **Default:** minimal GM action exists; full pressure framing later. | 🟢 SAFE-NOW | ▶ |

---
---

# L12 — RACE SYSTEM + ALL-STAR + PLAYER AWARDS (+ the fame they depend on)

**Scope:** the season-long Race primitive (WAR+fame standing) → fan-vote All-Star + the award races (merit
fame-tilt + the TV-family KK/Bust/Comeback + negative/bench + season-end one-shots), fill the §20 status-layer
+ race-emission seams, collapse the §20.8 fame double-ladder. Builds dark on the **live D9 merit engine** +
the **dark-built L6 fame substrate**. *Largest gap set.*

**Auditor note:** SOUND with one correction — **Q11 (fame→fan-morale channel A) was demoted to confirmation-only**
because the L6 plan already ruled that plug stays dark ("note the seam, don't fill", `DECISIONS_LOG:1462-1463`).
All citations spot-verified; no other re-asks found.

**✅ ALREADY RULED (do NOT re-ask) — the big ones:**
- **Award merit base** (MVP=totalWAR, CY=pWAR, SS=batWAR, GG=fWAR, RoY) — built + live (`franchiseAwardsEngine.ts:242-256`). [AWARD-2]
- **TV out of merit awards; TV powers only KK/Bust/Comeback.** [AWARD-3]  ·  **Ratings never gate/tilt awards.** [AWARD-4]
- **Award rewards = fame+morale+badge only** (no rating/trait rewards). [AWARD-6]  ·  **Ceremony → season-end, vote-weight salary→fame** (voteWeight already nullable). [AWARD-8]
- **MOY is D9, not L12.** [AWARD-7 / MOY-1..7]
- **The whole §20 fame design** (nine-tier ladder, Heat/Reach ratchet, trade-only reset, fame-vs-merit classifier) — built dark in `fameModel.ts` + `franchiseFameCompute.ts`; only magnitudes (`FAME_TUNING`) + the un-wired status layer remain. [FAME-1..14 / L6 plan]
- **L6 dark-seam ruling:** the §20.5/§20.6 fame→morale plug stays DARK; defensive-fame + role-player sub-aggregates are built L6 deliverables. **L12 only READS fame.** [L6 plan, `DECISIONS_LOG:1437-1463`]
- **Race architecture** (one primitive, two snubs, fame-guardrail, Visibility-vs-Emission, payout shape) — concepts locked; only formulas/boundaries/which-subset-emits open. [RACE-1..5 / ASG-1..3]
- **Season-emission config** = a sim-tunable bus keyed by event taxonomy (per-event rate + per-race Top-N + marquee flag). [SEA-2]
- **D9 fame-ready seams built** — `marginToWinner`, GoldGlove `{fWar,totalWar}` split, nullable voteWeight, KK/Comeback/Bust storage slots, `franchiseTrueValueSnapshots` store. **L12 fills these; does not rebuild.** [LSD-1]
- **Award/race badges ride the 16-emblem `awardEmblems` system, separate from the 6-team-designation strip.** [DESIG-RECON]

**The 13 open L12 questions:**

### L12-Q1 — Persistable award-category surface extension (the LSD-1 gap) · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Ratify extending `FranchiseAwardCategory` to add the **6 slots the seam did NOT reserve** — `ALL_STAR`,
`BENCH_PLAYER`, `BOOGER_GLOVE`, `RELIEVER_OF_YEAR`, `PLATINUM_GLOVE`, `WORLD_SERIES_MVP` — and confirm
**All-Star = a multi-selection roster record**, not a single-winner row.
**Gap:** LSD-1 reserved only the 3 TV slots; `franchiseAwardsStorage.ts:16-27` has exactly 9 slots. The full
`AwardType` union (`awardEmblems.ts:12-17`) defines all 6 missing — none in the persistable Extract. The
"no-rebuild" seam didn't cover the L12 surface.
**Default:** Extract all 6 now, All-Star as its own roster record — fold into ONE ledger bump + the C4 backup
DoD (MEMORY: the ledger PIN broke L6b-1; do it once). *Options: all-6-now / season-races-only-then-defer-2 / separate-All-Star-store.*

### L12-Q2 — Race standing formula: WAR×fame combine + band boundaries · 🟡 MIXED · ⛔ BLOCKS
**Q:** How do merit (WAR) and fame combine in the standing — single composite (merit primary + bounded fame
tilt), rank-then-tiebreak, or two-axis sort? And how are projected-winner / bubble / field **bands** defined?
**Gap:** §21.1/21.2 + RACE-1 give direction only; the award engine sorts purely by WAR (`franchiseAwardsEngine.ts:288-325`),
no fame term, no band concept; the race engine is greenfield.
**Default:** Composite — merit spine + fame as a bounded **close-race tilt** (Q3); bands = leader / inside-margin /
rest. Structure safe-now; tilt magnitude + band margin defer.

### L12-Q3 — Close-race fame-tilt window + magnitude + "genuinely-great" floor · 🟡 MIXED · ▶
**Q:** Define RACE-4's three quantities: the close-race margin window, the max tilt magnitude, the minimum
absolute-merit floor before fame may tilt up.
**Gap:** §21.4/RACE-4 — all three undefined; the seam exists (`marginToWinner`) but no tilt applied.
**Default:** Pin the **functional form** now (fame tilts only when `|margin| < window` AND both merit > floor);
leave window/magnitude/floor as `FAME_TUNING` placeholders.

### L12-Q4 — Gold-Glove defensive-fame share: the exact % + blend · 🟡 MIXED · ▶
**Q:** Pick the single share within the ratified "~15-25%" and confirm the blend `GG = fWAR + share·defensive_fame`
(defensive-channel sub-aggregate, NOT total fame).
**Gap:** AWARD-2 + LSD-1 fix the basis; substrate built (`fameModel.ts:24` defensive channel, `aggregateDefensiveFame`);
engine's GG today is pure `fieldingWar` (`franchiseAwardsEngine.ts:252`).
**Default:** Pin the blend **form** now (additive defensive-channel term), seed share at **20%** as a §16 placeholder.

### L12-Q5 — All-Star roster construction · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Pin roster size, per-position starter slots (fan-vote layer), reserve count (merit layer), the
performance floor gating fame-led starters, and the fame→fan-vote map. A roster can't be built without these.
**Gap:** ASG-2 gives outcomes (start/reserve/snub) + "maps onto the archived screen" but no counts/floor/formula;
the selection engine is greenfield.
**Default:** By-position starter template + fixed reserve block mirroring the archived screen; performance floor
reuses the existing `minPlateAppearances`/`minInningsPitched` gate (`franchiseAwardsEngine.ts:261-271`). Structure
safe-now; only counts/threshold are sim-nudgeable.

### L12-Q6 — Visibility-vs-Emission: which races emit + Top-N depth · 🟡 MIXED · ▶
**Q:** Decide the curated subset that EMITS fame/morale (vs merely VISIBLE) + default Top-N emission depth.
Confirm it rides SEA-2.
**Gap:** RACE-5 names the ~13-race set but not the marquee subset or depths; SEA-2 owns the gate shape.
**Default:** Pin the v1 EMITTING subset as taxonomy (MVP, Cy Young, All-Star emit; rest visibility-only); Top-N
depth = SEA-2/§16 placeholder.

### L12-Q7 — TV-family scoring formulas (KK / Bust / Comeback) · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Pin the three formulas: KK = best value level (raw `trueValue` / `valueDelta` / league-rank?); Bust = KK
inverted; Comeback = current TV minus the player's own running season-low, from the snapshot store.
**Gap:** AWARD-3/5 define them conceptually; data ready (`franchiseTrueValueSnapshotsStorage.ts:19-21`); the math is
unpinned and **never scored** in the engine (slots exist in storage only).
**Default:** KK = league-wide **`valueDelta`** ranking (spec calls KK "the league-wide Fan Favorite" = value-vs-expectation,
§23.3:540); Bust = same inverted; Comeback = `max(currentTV − own running season-low)` over checkpoints. The basis
(which TV field) is stable; unblocks the snapshot reader.

### L12-Q8 — §20.4 status-layer fame: ownership + structural mappings · 🟡 MIXED · ▶
**Q:** The status layer (draft seed → starting tier; call-up +; send-down −; bench ~0.5×; league-leader by rank)
is DEFINED but has zero compute. Which ticket owns wiring it (L6 plan didn't list it)? Pin the structural
mappings, flag magnitudes.
**Gap:** `franchiseFameCompute.ts` feeds only wpa_spine/defensive/role_player/iconic; the `status` channel slot
(`fameModel.ts:23`) is fed by nothing. Ownership (L6 vs L12 vs L1) is genuinely unassigned.
**Default:** **league-leader → L12** (a race/leaderboard output); draft-seed/call-up/send-down/bench-mult → player-lifecycle
(L1/L6). Pin mappings as SAFE, defer magnitudes.

### L12-Q9 — Race resolution payouts: honor→Reach-floor map + snub personality scaling · 🟡 MIXED · ▶
**Q:** Does each winner's fame boost raise the Reach floor by an honor-sized amount (using the built
`updateReachFloor`), and is the snub morale hit personality-scaled through the L3 matrix? Confirm the honor→floor
sizing (All-Star→Regional; MVP→higher).
**Gap:** RACE-2/§21.6/ASG-3 — ratchet built (`fameModel.ts:176`) but per-honor floor targets + morale magnitudes
unpinned; snub-hit routes through an L3 row not yet authored.
**Default:** Pin the honor→Reach-floor **map** as taxonomy (bigger honor → higher floor via `FAME_TIER_RANK`); snub
hit personality-scaled via a new L3 race-snub row; magnitudes defer.

### L12-Q10 — Fame double-ladder collapse (§20.8): sequence BEFORE L12 · 🟢 SAFE-NOW · ▶
**Q:** The legacy `getFameTier` (with the spec-FORBIDDEN "Fan Favorite"/"Villain" labels) is still imported
LIVE. In-scope for L12, or a separate pre-L12 cleanup? Confirm which ladder the displayed/race-consumed tier reads.
**Gap:** §20.8/FAME-14 — `fameEngine.ts:359/363` still returns the forbidden labels, still imported by
`fameIntegration.ts` + `useFameTracking.ts` + `index.ts`. L6 left it parallel-run. Races would read the NEW
model while UI shows the OLD ladder (readiness cross-cutting #2).
**Default:** Separate pre-L12 cleanup ticket, but a **hard prerequisite**: races MUST read `resolveFameTier`, and
the forbidden-label ladder must be retired **before any race goes live** (else "Fan Favorite" collides with the
designation). Doc-hygiene, not a magnitude — confirm it's sequenced before L12 activation.

### L12-Q11 — §20.6 fame→fan-morale channel A: confirm OUT of L12 · 🟢 SAFE-NOW · ▶ *(confirmation-only)*
**Q:** Confirm L12 only READS fame and does NOT wire the §20.6 channel-A coupling.
**Gap:** Already ruled — the L6 plan put the §20.5/20.6 plug as a deferred post-D13 integration ("note the seam,
don't fill", `DECISIONS_LOG:1462-1463`). Channel C (naming nudge) is built (`designationFameNudge.ts:20-23`).
**Default:** Confirm channel A stays OUT (scope-boundary confirmation, not a new decision).

### L12-Q12 — WAR-floor gravity strength + Heat decay (the fickle-vs-sticky numbers) · 🔴 DEFER · ▶
**Q:** Confirm these two §20.9 numbers are sim-owned placeholders L12 does NOT rule.
**Gap:** Both already have placeholder values (`fameModel.ts:94` decay 0.85, `:111` gravity 0.2), marked
sim-gate-owned. Pure magnitudes.
**Default:** **No L12 ruling** — §16 sim. Listed only to keep it off the pre-rule plate.

### L12-Q13 — All-Star lock timing + race-standing cadence · 🟢 SAFE-NOW · ▶
**Q:** Confirm the All-Star race runs opening-day→break and **LOCKS at the break** (mid-season) while award races
run all season and resolve at season-end. Where does the "break" sit (a season-game fraction)? Confirm standings
recompute on the per-completed-game spine.
**Gap:** ASG-1/AWARD-1 name the break but no game-number/fraction; no mid-season checkpoint concept in code.
**Default:** Break = **50% scheduled-games** (configurable); standings recompute per completed game; All-Star
locks at that checkpoint, awards finalize at season end.

---
---

# L13 — RELATIONSHIPS-LITE + REPORTER ACCURACY

**Scope:** six threshold-gated edges (potential vs active, Captain/Charisma-governed, charged matchups, pre-move
intel) with per-edge personality-scaled morale deltas **authored in the L3 master matrix**, plus the seeded
reporter-inaccuracy primitive (REP-4). Built dark, activated post-D13.

**Auditor note:** APPROVED with corrections — no re-asks (grep confirmed zero rulings on
taxonomy-reconcile/gender/charged-matchup-quantity/captain-weights/worksheet-supersession). Added a **spec-vs-spec
substrate conflict** to Q12 (DSTACK names a separate `kbl-relationships` DB that contradicts SEA-3's
shared-DB lean). Citation fix: the matrix relationship tap → `NEUTRAL_BASE_CONSEQUENCE` is at
`masterMoraleMatrix.ts:403`.

**✅ ALREADY RULED (do NOT re-ask):**
- **Six-edge AFFECT taxonomy is the design intent** (Rivalry/Feud/Mentorship/Friendship/Romance/History) — but NOT yet reconciled vs the code's 9 / worksheet's 7 (that's Q1). [REL-1/LS-27]
- **Threshold gate + ~1-3 edges/team target** (shape only). [REL-2]  ·  **Potential vs Active structure.** [REL-3]
- **Pre-move reporter heads-up is ADVISORY, never a hard gate.** [REL-4/SEA-4]
- **Romance direction** (cross-gender default; same-gender gendered; friendship ≫ romance). [REL-5]
- **Charged matchup amplifies MORALE** (concept). [REL-6]  ·  **Edge lifecycle endpoints; trade/send-down ends an edge.** [REL-7]
- **Captain & Charisma govern** edges; effectiveness = Charisma+Loyalty+Resilience−Ambition, absolute for v1. [REL-8]
- **Relationships→fan-morale is light + reporter-mediated.** [REL-9]
- **Reporter cadence + canonical news + accuracy-model home** — L13 owns the seeded inaccuracy primitive. [REP-1..4]
- **Season-news substrate + emission bus.** [SEA-1..3]

**The 13 open L13 questions:**

### L13-Q1 — Canonical relationship taxonomy: resolve the triple-conflict · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Ratify the §24 **six AFFECT-edges** as canonical, and rule how the code's **9 LITERAL types** and the
worksheet's **7 ENTITY-edges** are mapped or retired (none is a superset).
**Gap:** (a) §24/REL-1 six AFFECT-edges; (b) worksheet's 7 entity-edges (`DECISION_WORKSHEET:89-97`); (c) code's
9 literals `relationshipEngine.ts:12-22` (DATING/MARRIED/DIVORCED/BEST_FRIENDS/MENTOR_PROTEGE/RIVALS/BULLY_VICTIM/JEALOUS/CRUSH).
The 9 also drive the LI revenge/romance detectors, so "retire" has downstream consequences.
**Default:** Ratify the **§24 six** (the only ruled set); map the 9 into them (Romance←DATING/MARRIED/DIVORCED/CRUSH;
Feud←BULLY_VICTIM; Rivalry←RIVALS/JEALOUS; Friendship←BEST_FRIENDS; Mentorship←MENTOR_PROTEGE) + add History; retire
the surplus. The 7-entity worksheet is a different axis (who-to-whom) → fold into edge endpoints; it's the
un-ratified "awaiting approval" doc, not authority.

### L13-Q2 — Threshold-gate product formula + per-type thresholds · 🟡 MIXED · ⛔ BLOCKS
**Q:** Which personality/modifier inputs multiply into the "product" that must cross a threshold, and does each
of the six types get its own threshold constant?
**Gap:** REL-2/§24.3 rule the shape but pin no inputs, no per-type structure; §24.2 gives qualitative recipes;
code has no threshold gate (manual `createRelationship`).
**Default:** Each type declares its input modifier set (per §24.2 recipes) + its OWN threshold; constants = §16
placeholders.

### L13-Q3 — Per-type trigger predicates: "young" + "extended time" · 🟡 MIXED · ⛔ BLOCKS
**Q:** What makes a player "young" (mentorship trigger) and what counts as "extended time together" (friendship),
given **no player-age field exists** (`age?` is on `ManagerProfile` only).
**Gap:** §24.3/REL-2 require both; neither measurable today; no co-rostering-duration counter.
**Default:** "young" = rookie/low-service-time proxy (no new age field for v1); "extended time" = a new
co-rostered-games counter; cutoffs defer to §16. Flag the age-field to L1.

### L13-Q4 — Edge intensity, decay, hysteresis · 🟡 MIXED · ⛔ BLOCKS
**Q:** Does an edge carry a scalar intensity, decay when its trigger lapses, and have hysteresis (anti-flicker)?
**Gap:** REL-7 rules endpoints only; code has a binary `isActive` flag. The "trade-troublemaker→victim recovers"
loop has no quantity to recover without intensity. L5 flashpoint-decay is the existing template, unwired to edges.
**Default:** Scalar intensity [0..1] + lapse-decay (mirror L5 flashpoint-decay) + a hysteresis band; magnitudes defer.

### L13-Q5 — Reporter inaccuracy: meaning, rate, seeding (REP-4 owner) · 🟡 MIXED · ⛔ BLOCKS
**Q:** Rule the three open parameters: what "inaccurate" MEANS (hedge/flag vs distort content), the single rate
(flat ~10% vs per-personality), the seeding key.
**Gap:** THREE conflicting: §24.5/REL-4 "~10% flat"; live `REPORTER_ACCURACY_RATES` per-personality 0.65-0.95
(`narrativeEngine.ts:351-361`); REP-4 left the meaning unruled "when §24 is drafted" — **this is that draft**.
**Default:** **Flat ~10%** (§24.5), meaning = **HEDGE/FLAG only** (mark a take "unconfirmed", never distort the
edge), seeded FNV-1a off franchise+season+moveId. Reconcile by **scope**: relationship intel = flat 10%; the
per-personality 0.65-0.95 table stays as in-game-take VOICE flavor. Content-distortion → v1.1.

### L13-Q6 — Charged matchup amplifies MORALE not LI — reconcile spec-vs-code · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Confirm the amplified quantity is the player's MORALE swing (REL-6), and rule the disposition of the code
that instead amplifies the LEVERAGE INDEX.
**Gap:** §24.7/REL-6 say morale; live `detectRevengeArcs`/`detectRomanticMatchups` return `liMultiplier`
(`relationshipIntegration.ts:375-524`, `REVENGE_ARC_MULTIPLIERS` 0.9-1.75 / `ROMANTIC_MATCHUP_MULTIPLIERS` 1.3-1.6)
— a different quantity, built on the dying 9-type taxonomy.
**Default:** **MORALE canonical** — build a fresh morale-swing amplification keyed off the §24 History edge +
former-team flag. Keep the LI multipliers as an INDEPENDENT pre-existing in-game feature (don't delete, don't
extend); Q1's taxonomy retirement eventually orphans them.

### L13-Q7 — Per-edge morale deltas belong in the L3 matrix, not relationshipEngine · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Confirm per-edge morale deltas are authored as personality-scaled rows in the **L3 master matrix** (§5), and
that the flat constants in `relationshipEngine` are retired.
**Gap:** §5 mandates ONE matrix; relationship deltas live OUTSIDE it as flat, non-personality-scaled constants
`MORALE_EFFECTS` (`relationshipEngine.ts:38-48`), contradicting §24.2 + §5. The matrix's `relationship` tap
returns `NEUTRAL_BASE_CONSEQUENCE` (`masterMoraleMatrix.ts:403`) — zero edge rows authored. **This is the exact
FINDING-150 anti-pattern** (measurement scattered outside the one matrix).
**Default:** Author personality-scaled relationship-edge rows in the L3 matrix per §5 + §24.2 (Feud target eats the
hit / aggressor unaffected); retire `relationshipEngine`'s flat `MORALE_EFFECTS` as the morale authority. Magnitudes defer.

### L13-Q8 — Captain-governor composite weights + suppression magnitude · 🟡 MIXED · ⛔ BLOCKS
**Q:** Rule the weighting structure of the Captain-effectiveness composite (relative weights on
Charisma+Loyalty+Resilience−Ambition) and how much it suppresses negative / catalyzes positive edges.
**Gap:** REL-8 rules the four inputs + absolute-for-v1 + no-double-count, but pins no weights, no
suppression/catalysis magnitude. Inputs data-ready (`game.ts:124-129`).
**Default:** Pre-rule the composite **structure** (`w1·Cha + w2·Loy + w3·Res − w4·Amb`, normalized [0..1]; suppression =
multiplier on negative-edge deltas, catalysis = boost to positive-edge odds); weights + magnitudes = §16 placeholders.

### L13-Q9 — Romance base-rates + gender weights + the missing gender DATA artifact · 🟡 MIXED · ⛔ BLOCKS
**Q:** Confirm the base-rate structure (friendship ≫ romance, cross-gender default, same-gender gendered) and rule
the SOURCE of the player-gender signal (no gender field on Player; `gender?` is on `ManagerProfile` only).
**Gap:** REL-5/§24.6 rule direction; the gender weighting needs a per-player gender signal that doesn't exist.
**Default:** Base-rate structure (friendship ≫ romance + a same-gender multiplier keyed on pair genders), magnitudes
defer; gender SOURCE = a new **`Player.gender` field flagged to L1** as a hard data dependency (build dark against it).
Do not invent gender.

### L13-Q10 — Relationship→fan-morale coupling + visible-drama gate · 🟡 MIXED · ▶
**Q:** Confirm the rule (light, reporter-mediated, VISIBLE-dramas only) and rule the gate for what makes a drama
"visible" enough to touch fan morale.
**Gap:** REL-9/§24.10 rule the rule; "visible" unmeasured; SEA-2 emission gate is the natural home but the coupling
+ coefficient are unspecified.
**Default:** The direct effect fires ONLY for edges that clear the **SEA-2 emission gate** (reporter-amplified =
"visible"), small coefficient = placeholder; primary player-morale→performance→fan path always on.

### L13-Q11 — Supersede the stale "LOCKED-but-approval-pending" cross-ref docs · 🟢 SAFE-NOW · ▶
**Q:** Confirm §24/REL-1..9 supersede the un-ratified `FRANCHISE_MODE2` approval-matrix + worksheet, so L13 builds
from §24 (not the "awaiting approval" docs).
**Gap:** **The exact FINDING-150 mechanism** (readiness cross-cutting #3): §24 says "LOCKED" but the APPROVAL_MATRIX
marks every relationship row "Awaiting user approval" and the worksheet's decision log is empty checkboxes — a
builder reading those would conclude relationships are BLOCKED, contradicting REL-1..9 + LSD-6.
**Default:** Ratify §24/REL-1..9 as the sole L13 authority; stamp the two `FRANCHISE_MODE2` docs **SUPERSEDED-BY-§24**.
Pure doc-hygiene — harvest now to prevent the trait-loss replay.

### L13-Q12 — Storage substrate: reserved `rivalryScores` vs a separate `kbl-relationships` DB · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Where do persisted edges + the accuracy field live: reuse the reserved `rivalryScores` store in the shared
`kbl-tracker` DB (SEA-3 lean), a new store, or the separate `kbl-relationships` DB the DSTACK names?
**Gap:** **SPEC-VS-SPEC** — SEA-3 leans to `rivalryScores` in `kbl-tracker` (`trackerDb.ts:297`); DSTACK C4/item-8
names a separate `kbl-relationships` DB the backup parity-guard never inspects. `rivalryScores`' schema (keyPath
`id`, team/league-scoped) may not fit `{player1,player2,type,intensity,formed/dissolved,accuracy}`. MEMORY: the
ledger-pin + version bump must be in-ticket on any `kbl-tracker` store add (broke L6b-1).
**Default:** **Reuse `rivalryScores` in `kbl-tracker`** IF its schema can carry the edge shape (avoids the version
bump AND the separate-DB backup hole); if not, a new `kbl-tracker` store forces the full C4 backup DoD + the
`franchiseSeasonLedgerStorage.test.ts` pin in-ticket. **Reject the separate `kbl-relationships` DB** (reopens the
DSTACK-item-8 backup-parity hole). Decide schema-fit now; **retire the DSTACK's `kbl-relationships` wording as
superseded by SEA-3.**

### L13-Q13 — L1 dependency (charisma/loyalty/resilience + gender/age on Player) · 🟢 SAFE-NOW · ▶
**Q:** Is L1 a hard prerequisite for L13's edge formation, or does L13 build dark against the type and rely on L1
before switch-on?
**Gap:** L13's gate (Q2), youth trigger (Q3), gender weighting (Q9), Captain composite (Q8) all consume per-player
modifiers + gender + age. HiddenModifiers defined (`game.ts:124-129`) but not persisted to Player until L1;
gender/age don't exist on Player. DSTACK L13 deps DO list L1 (unlike L11).
**Default:** Build dark against the types now; L1 persisting the modifiers + adding gender/age is an **activation**
prerequisite, not a build blocker. Flag age/gender as explicit L1 additions.

---
---

# L14 — REBRAND CIRCUIT-BREAKER

**Scope:** the team-rebuild escape hatch — on sustained bottomed-out fan morale, atomically reset fan morale to
~70, reset all team/fanbase-tied badges except Captain, auto-fire the manager via **L11's shared resolver**,
relocate to a user-picked SMB-pool stadium, wipe dead money, persist stats/record/development, stamp one
continuous franchise history with a relocation marker.

**Auditor note:** APPROVED with corrections — **removed a re-ask** (stadium AGENCY: LSD-5 already rules user-pick;
the residual is build-wiring, not a JK decision → folded into Q5). **Fixed miscited file:lines** — all fan-morale
band/`seasonLow`/`trendStreak` refs were wrongly pinned to `franchise.ts`; they live in `fanMoraleEngine.ts`
(bands `:31-38`/`:267-272`, `trendStreak :54`, `seasonLow :64`). Gap reinforced: `trendStreak` is "consecutive
*same-direction changes*", **not** an at-or-below-band dwell counter — L14 must build a new counter.

**✅ ALREADY RULED (do NOT re-ask):**
- **Stadium source + agency = USER picks from the built-in SMB pool** (no custom); pull dimensions/name/park-factors so analytics recompute. The only residual is build-wiring (the shared `pickStadiumFromPool` auto-picks today). [LSD-5]
- **The 6-designation set** (Team MVP/Ace/Albatross/Fan Favorite/Captain/Fan Hopeful; Captain + Fan Hopeful are real badges; Cornerstone CUT) — defines the badge universe "reset all except Captain" operates over. [DESIG-RECON 2026-06-17]
- **Living season (incl. rebrand) is v1**; budget pressure + FA-attraction CUT to v1.1; offseason flag stays FALSE. [LSD-6/2/4]
- **Manager auto-fire routes through L11's ONE shared resolver** (L14 owns cascade ordering + non-firing resets); the "sustained low" arming threshold/duration is §16 SIM-TUNE. [L11 rulings 2026-06-18 / LS-20]
- **Manager Almanac tenure end-reason includes "relocated"** (L11 owns the manager-side history). [L11 defaults]
- **Reset direction: fan morale ~70; persist stats/record/development; one continuous history w/ relocation marker** (don't split into eras). [LS-20 / §14]

**The 8 open L14 questions:**

### L14-Q1 — Rebrand trigger: dwell-counter structure + GM-gated vs auto-cascade · 🟡 MIXED · ⛔ BLOCKS
**Q:** Which fan-morale band arms the rebrand, for how many consecutive games must the team dwell there, and is
the rebrand **GM-initiated** (a button once armed) or **auto-cascaded** the instant the dwell trips?
**Gap:** §14:244 + §16:272 defer the MAGNITUDE (sim-tuned, already ruled). But the STRUCTURE is missing:
`fanMoraleEngine.ts` has bands + `seasonLow` + `trendStreak`, but `trendStreak` is same-direction-changes, NOT a
dwell measurement (`grep dwell/consecutiveGamesAtOrBelow` → empty). Also unreconciled: §12 frames firing as a
GM-spendable valve while §14:242 frames the rebrand cascade as auto — who pulls the trigger is undefined.
**Default:** Build a NEW `consecutiveGamesAtOrBelowBand` counter (the engine has no such primitive) keyed to a named
band (default APATHETIC-or-below ≤24) + placeholder window (~15-20 games); make the rebrand **GM-GATED** (offered,
not forced) per §14's "escape hatch the GM reaches for". Counter structure ships now; band + window are §16.

### L14-Q2 — Badge-reset enumeration over the 6-designation set + does Fan Hopeful survive · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Map "reset all badges except Captain" onto the 6 designations: which of Team MVP / Ace / Albatross / Fan
Favorite / Fan Hopeful clear, which travel? Specifically, does **Fan Hopeful** clear (tied to the old fanbase's
hope) or survive (tied to the prospect)?
**Gap:** §14:245 was ill-posed against the live 4-type union (`franchiseDesignations.ts:3-7`) where Captain isn't a
badge; the 2026-06-17 ruling now defines 6 incl. Captain + Fan Hopeful as badges — but the spec hasn't been mapped
onto it.
**Default:** Clear the four team/fanbase-tied {Team MVP, Ace, Albatross, Fan Favorite}; exempt **Captain only** —
Fan Hopeful is a fanbase-hope cushion, so it clears (a relocated team gets a fresh ~70 fanbase anyway). Because
stats persist, value-gated badges re-assign at the next checkpoint, so "clear" = drop + let the engine re-derive.

### L14-Q3 — Does rebrand reset player FAME? · 🟢 SAFE-NOW · ▶
**Q:** On relocation, does each player's fame reset (trade-style) or fully persist?
**Gap:** §14's reset-list and persist-list both **omit fame**. Meanwhile FAME-7 says "trade is the only reset
valve" for Reach. No FAME-1..14 entry addresses rebrand. A genuine gap — players either keep all earned fame in a
new market, or rebrand acts like a mass-trade fame reset.
**Default:** **Fame PERSISTS** through rebrand — FAME-7 is explicit (trade is the ONLY reset valve), and §14's spirit
is "earned progress intact." Resetting the roster's fame would be a hidden second escape-hatch. **Add a one-line
note to §14 + §20.3** stating rebrand does NOT reset fame.

### L14-Q4 — Atomic cascade ORDER: firing's fan-relief ripple vs the morale-to-70 reset · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Does the firing's fan-relief bump land BEFORE the ~70 reset (and get overwritten) or AFTER (starting the new
era above 70)?
**Gap:** §14:245 reads firing-ripple-THEN-fresh-fanbase, but also resets fan morale TO ~70. Both write the same
`team-fan` sink (`franchiseMoraleState.ts:120`). Order is load-bearing + undefined. Overlaps L11-Q11.
**Default:** Sequence: (1) close manager legacy + apply firing's PLAYER ripple, (2) reset non-Captain badges, (3)
relocate stadium, (4) wipe dead money, (5) HARD-SET fan morale LAST — and **SUPPRESS the firing's team-fan relief
bump on the rebrand path** (the ~70 reset is the authoritative fan outcome). Player ripple still lands; only the
redundant fan write is skipped. Ties to Q8/L11-Q11.

### L14-Q5 — New team identity source + relocation-marker schema (no field exists) · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** Where does the new identity (city/name/colors) come from — user-entered, pool-picked, auto-generated — and
what's the persisted relocation-marker schema ("formerly known as X")?
**Gap:** §14:247 mandates the marker but `franchise.ts` has NO relocation/former-name/identity-history field
(`grep formerName/teamHistory/relocatedAt` → empty). LSD-5 settled the STADIUM but is silent on team name/city.
(The manager-side "relocated" end-reason is already handled by L11.)
**Default:** **USER enters** the new name/city (consistent with LSD-5's user-pick agency); persist the marker as an
appended `{formerTeamName, formerStadiumName, relocatedAtSeason, relocatedAtGame}` record on a new `teamHistory`
array. Wrap the already-ruled pool-pick (LSD-5) in a user-facing picker (excluding the current park) — a build
task. Colors deferred.

### L14-Q6 — Dead-money "wipe" target — the carried-balance ledger doesn't exist · 🟢 SAFE-NOW · ⛔ BLOCKS
**Q:** What does "dead money cleared" clear, given no persisted carried-balance store exists (only a per-move
`DEAD_MONEY_RATE`)? Is the wipe dependent on the economy ticket?
**Gap:** §14:245 lists it as a core reset, but `grep carriedDeadMoney/deadMoneyBalance/deadMoneyLedger` → empty;
dead money is only a per-move rate (`franchiseRosterMovement.ts:21,379`). DSTACK L14 deps include
`economy(dead money)`.
**Default:** Build the cascade with a **clearly-stubbed seam** (`clearCarriedDeadMoney(teamId)`) but DEFER the real
impl to the economy ticket that owns the carry ledger; if that ledger isn't in v1 scope, the wipe is a documented
no-op. **Confirm with JK whether an in-season dead-money CARRY ledger is in v1 at all** (LSD-4 cut next-season
budget pressure but didn't address the carry ledger).

### L14-Q7 — Confirm the reset integer ~70 — final or §16 placeholder · 🟡 MIXED · ▶
**Q:** Is ~70 a FINAL ratified integer or a §16 placeholder?
**Gap:** LS-20/§14 present "~70" as ratified, but §16:272 lists "rebrand thresholds" (the trigger) not the reset
VALUE; the "~" signals approximation (readiness audit flags exactly this). 70 sits inside CONTENT (55-74); EXCITED
starts at 75.
**Default:** Code as a named constant `REBRAND_RESET_MORALE` (default 70) — structure fixed (fresh fanbase in
upper-CONTENT), integer §16-tunable. *(If JK wants the literal "fresh, excited fanbase", 75 is the lower EXCITED edge.)*

### L14-Q8 — L14 ↔ L11 firing call contract (= L11-Q11 — rule once) · 🟢 SAFE-NOW · ▶
**Q:** What exact signature does L14 invoke on L11's shared resolver, and does rebrand suppress the fan-relief bump?
**Gap:** §14:245 says rebrand auto-fires via "the existing firing event"; L11_SCOPE_MAP open-Q11 lists the call
contract as UNVERIFIED. A coupling to rule ONCE so both tickets agree (overlaps Q4).
**Default:** `fireManager({teamId, reason:'rebrand', skipUserConfirm:true, suppressFanReliefBump:true})` — player
ripple applies, relief bump suppressed (the ~70 hard-set is authoritative). **Pin this signature in BOTH the L11
and L14 contracts** so the triangle audit checks both sides.

---
---

## CROSS-TICKET COUPLINGS (rule once, applies to both)

| Coupling | Tickets | Rule it in |
|----------|---------|-----------|
| **Firing call contract + fan-relief suppression on rebrand** | L11-Q11 ≡ L14-Q8; L14-Q4 cascade order | One ruling, pinned in both contracts. |
| **Manager personality field** (new) feeds the firing ripple | L11-Q7 | L11 (L14 inherits). |
| **Envy edge born from a race** | L12 (race state) → L13-Q1/Q3 (envy trigger) | L12 ships race state; L13 consumes. |
| **Fame substrate** the races read | L12 (reads L6 fame) — channel A stays dark (L12-Q11) | Already ruled dark; confirm only. |
| **L1 data dependency** (HiddenModifiers + gender/age persisted to Player) | L11-Q10, L13-Q13, L13-Q9 | L1 scope must absorb gender/age; both build dark against the type. |
| **Backup/store DoD** on any new `kbl-tracker` store | L11-Q9, L13-Q12 | The `franchiseSeasonLedgerStorage.test.ts` pin + version bump must be in-ticket (broke L6b-1). |

---

## RECOMMENDATION

1. **Harvest the 🟢 SAFE-NOW shortlist now** (26 questions + the structural half of the 16 🟡 MIXED). These are
   taxonomy/canonical-value/scope/architecture decisions that will not rot — exactly the "ahead of the curve"
   payload, and they unblock the **17 ⛔ BLOCKS-BUILD** items.
2. **Leave the 1 🔴 DEFER (L12-Q12) and the magnitude-halves of the 🟡 MIXED** as named §16 placeholders — ruling
   them now just rots them.
3. **Do the 3 doc-hygiene actions regardless of any magnitude ruling:** (a) reconcile the stale DSTACK; (b)
   sequence the fame double-ladder collapse (L12-Q10) before L12; (c) supersede the stale relationship cross-ref
   docs (L13-Q11) — all three are FINDING-150-prevention.
4. **Per the readiness audit, still do a focused §0-style ratification pass right before each ticket's build** to
   fold these rulings + reconcile the cross-ref specs. This worksheet is the map that pass closes; pre-ruling the
   SAFE set here just front-loads the durable half so the per-ticket pass is short.

> **Net:** ~26 decisions are genuinely get-ahead-able today; only sim magnitudes need to wait. The L-stack's
> remaining open work is overwhelmingly architecture, not numbers.
