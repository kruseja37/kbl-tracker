# L11 MANAGER FIRINGS — CONTRACT-READY SCOPE MAP

> Produced by the L11 grounding recon (5 readers + synthesis, 2026-06-18, AUTH-4).
> All structural anchors verified against live code on `codex/franchise-v1-next`
> (TRACKER_DB_VERSION=23; 6 phase-2 flag blocks incl. L10; gate at
> processCompletedGame.ts:611-645; `MANAGER_FIRED` matrix row authored-dark at
> masterMoraleMatrix.ts:24/148/375 with ZERO emitters; `ManagerAssignment.fired`/
> `endDate` read-gated but never written). Build order:
> L11-1 → L11-2 → L11-3 → L11-4 → L11-5. Build-DARK, activate post-D13.
> Triangle applies (builder ≠ auditor per ticket). **MOY is OUT — Phase-1 D9, not L11.**

## 1. SUBSYSTEM SURFACE
A new Phase-2 **event + two consequence-writes** — not a new subsystem. L11 emits a
"manager fired" event that (i) bumps team **fan morale up** (the scapegoat relief bump),
(ii) sweeps the fired manager's active roster applying a **per-player morale delta =
f(True-Value sign, personality)** through the L3 master morale matrix, and (iii) **closes
the fired manager's recorded Almanac legacy** (sets the existing `fired`/`endDate` fields).
Framed in §12 as the **GM pressure-release valve** the GM can spend when fan morale craters —
breathing room at the cost of disruption that "reads the room player by player." Depends on
**L5** (fan-morale dampener / flashpoint-decay) and **L3** (master morale matrix).

**Greenfield (L11 builds):** the firing-event resolver/producer (decides a manager is fired,
sets `fired:true`+`endDate`+reason, emits `MANAGER_FIRED`, applies the relief bump + ripple);
the **performance gate** (net-negative-True-Value → exposed, net-positive → untouchable — does
NOT exist in the matrix today, which applies a flat −2 to everyone); a **manager personality
field** (NEITHER `ManagerProfile` type carries one); a new dark flag + a 6th-sibling gate
branch in processCompletedGame; a tenure-close legacy marker (fire date/reason) on the
Almanac aggregate; optionally a dedicated L11 overlay store (trackerDb v24).

**Reused (do NOT rebuild):** the `MANAGER_FIRED` matrix row (already authored: self −2,
fan +4, clubhouse −1 — masterMoraleMatrix.ts:375); the `composeMoraleConsequence` →
`applyFranchiseMoraleMatrixConsequence` seam (the proven shape at processCompletedGame.ts:387-416,
the same fan-write sink that becomes the relief bump at franchiseMoraleState.ts:437-449); the
`ManagerAssignment.fired`/`endDate` fields + their active-manager read-gates (already correct
on the consume side — managerIdentityStorage.ts:357/399/411, managerWpaDerivation.ts:213); the
Manager Almanac page + tenure aggregate + W-L record (ManagerAlmanac.tsx, almanacQueries.ts:193);
the dark-build mirror pattern from L10 (flags/trackerDb/store-list-pin/gate); HiddenModifiers
(loyalty/resilience/ambition/charisma) and the 7 CanonicalPersonalities as ripple inputs.

**⚠ BOUNDARY — MOY is NOT part of L11.** Manager-of-the-Year is a **Phase-1 D9 award**
(DSTACK:33 catch #1 "MOY is a Phase-1 D9 ticket, NOT a Phase-2 L-ticket… MOY-4 bars manager
fame → there is **no** Phase-2 MOY fame layer"; FRANCHISE_PLAYABLE_V1_DEFINITION.md:90/:104).
L11 carries **no manager fame, no award engine, no ceremony.** Do NOT modify or extend
D9's targets — `mwarIntegration.ts`, `AwardsCeremonyFlow.tsx`, `AwardsWatchlist.tsx`,
`RatingsAdjustmentFlow.tsx`, `mwarCalculator`/`calculateMOYVotes`. L11's "legacy" = the
**tenure / record / firing history**, never an award. ⚠ **Naming guard:** the only existing
`fired?` flag (managerWpa.ts:86, `ManagerAssignment`) is the per-team active-manager link;
do NOT confuse it with the per-decision `fired?` field that is an unrelated pull/pitch
decision-WPA context — that one is NOT a firing event.

## 2. v1 MECHANIC (FRANCHISE_V1_LIVING_SEASON_SPEC.md:209-216, §12; LS-18 :321; magnitudes SIM-tuned)
Four moving parts; spec gives **direction, not numbers** for every one.

1. **The firing trigger** (§12:216 "a pressure-release valve the GM can spend when fan morale
   craters"). Spec frames it as something the GM *spends* (manual valve) — only L14 auto-fires.
   Spec pins **no threshold, no duration, no cadence, no cooldown.** A conflicting orphaned
   auto-roll artifact exists (`calculateFanExpectations`, salaryCalculator.ts:1263 →
   `managerFireProbability` 0.15/0.08/0.05 by payroll band :1278-1294) with **zero callers** —
   unreconciled with §12's GM-discretionary valve.
2. **The fan-relief bump** (§12:214 "a relief bump when a struggling team fires its manager —
   the scapegoat discharge"). Routes through the matrix row's `teamFanMoraleDelta` → the
   `team-fan` write at franchiseMoraleState.ts:437-449 (the relief-bump sink), riding L5's
   fan-morale dampener/flashpoint machinery. **Magnitude undefined in spec** — and FOUR
   conflicting code/spec values exist (see Open Q2).
3. **The (performance × personality) player ripple** (§12:215). Two halves:
   - *Performance gate:* "a player who has been **net-negative on True Value** has reason to
     worry under a new regime; a **net-positive performer is untouchable.**" True Value =
     production vs the player's FIXED draft-IV baseline (SPEC.md:49, JK-ratified 2026-06-15).
     **This gate does not exist in the matrix today** — the live row applies a flat −2 to
     every player regardless of TV sign. L11 must add it (skip/zero net-positive players, or
     pass a TV-aware per-player delta into the matrix).
   - *Personality on top:* "a **loyal** player takes a morale hit, a **resilient** one shrugs
     it off, a producing **egotist** barely notices." Note §12 mixes one **visible type**
     (Egotistical) with two **hidden modifiers** (Loyalty, Resilience). Personality IS already
     honored by `composeMoraleConsequence`, but loyalty currently only touches the fan→player
     link (calculateFanMoraleLink, masterMoraleMatrix.ts:558-569), NOT the firing self-hit;
     resilience touches the self-delta only on negative events.
4. **The manager legacy / tenure record** (§12:211 "a firing ends a recorded legacy… Tracked:
   WPA, record, tenure"). Spec says "mostly exists" — confirmed. L11 sets `fired:true`+`endDate`
   on the `ManagerAssignment` (managerWpa.ts:79-87) to terminate the legacy, and surfaces a
   "fired" tenure-close marker on the Almanac aggregate (`ManagerTeamTenureAggregate`,
   almanacQueries.ts:193 — which has NO fire/hire-date field today).

**The matrix seam (where the ripple computes):** `MANAGER_FIRED` is a fully-authored matrix
event end-to-end — union member (masterMoraleMatrix.ts:24), EVENT_DELTA scalar
`managerFiredSelf:-2` (:148), base-row `row(managerFiredSelf, loseStreakBrokenFan /*+4 fan*/,
[touch('clubhouse', smallTeammateDrop /*−1*/)], 'manager.fired')` (:375-377) — but it has
**ZERO emitters** (the live designation→morale map at processCompletedGame.ts:344-351 maps only
TEAM_MVP/ACE/FAN_FAVORITE/ALBATROSS). L11 is the missing producer; it does NOT author the row.

## 3. RECOMMENDED SPLIT (risk-ascending)
- **L11-1 — pure firing-event + ripple engine** (greenfield, pure TS, no I/O). Given a fired
  manager's team snapshot + per-player {True-Value sign, personality, hidden modifiers} +
  fan-morale read → a `FranchiseL11FiringReport` (the relief-bump delta + per-player ripple
  deltas, seeded/deterministic). Owns the **performance gate** (the half missing from the
  matrix). Routes the ripple through L3's `composeMoraleConsequence` (RESOLVED deltas as the
  weight, not raw params). Mirror the compute shape of the sibling dark engines
  (`franchiseL10SweepCompute.ts`) minus I/O. Deps: L3 (`masterMoraleMatrix`). **Risk: low.**
- **L11-2 — dark store + legacy marker**. EITHER a new `franchiseL11Overlays` store
  (trackerDb v23→**24**, mirror `franchiseL10OverlayStorage.ts`) **OR** ride the existing
  morale/L10 overlay substrate (Open Q on store granularity). PLUS the tenure-close legacy
  field on `ManagerTeamTenureAggregate` + the `setManagerFired` mutator on
  `managerIdentityStorage` (sets `fired`/`endDate`/reason). **Risk: medium — IF a new store
  is added, the full 8-site mirror INCLUDING the `franchiseSeasonLedgerStorage.test.ts`
  store-list PIN (toBe(23)→24 + alpha-insert + v23→v24 migration test) must all be in THIS
  ticket** (MEMORY: this exact pin broke L6b-1). If no new store, the trackerDb bump + pin
  steps are skipped and risk drops to low-med.
- **L11-3 — flag + dark firing hook/resolver**. New `isFranchisePhase2L11Enabled` flag block
  (clone the L10 block franchisePhase2Flags.ts:61-71) + a callable
  `persistDarkL11Firing(...)` resolver gated by the flag; wires L11-1 → L11-2 + the L3 matrix
  sink (`applyFranchiseMoraleMatrixConsequence`, already dark-gated by the OFF-by-default
  morale flag). Expose the resolver as a **single callable unit** (not inline-in-a-button)
  so L14 can invoke it. If L11 also gets a per-completed-game "hot seat available" eligibility
  compute, insert the 7th gate branch after processCompletedGame.ts:645. **Risk: medium
  (live path, but doubly dark-gated — L11 flag AND morale flag).**
- **L11-4 — Almanac legacy write + tenure-end surfacing**. Persist the firing (date, team,
  reason: user-initiated vs rebrand-auto, fan-morale-at-firing) and surface a "fired" marker
  in the existing TenureTable (ManagerAlmanac.tsx:314). Extends an existing Almanac — does NOT
  build one. **Risk: low-med (the page/aggregate/W-L/route already exist).**
- **L11-5 — reporter tap (optional in v1)**. Applied firing → a SeasonNewsEvent via the same
  reporter pipeline L10-5 uses (`seasonNewsGenerator.ts` → `seasonNewsStorage.ts`
  `seasonNewsItems`). **Risk: low.** *(UNVERIFIED that a firing-specific reporter eventType
  exists — confirm whether to reuse an existing eventType or add one.)*

## 4. FORKS — ✅ 4 RESOLVED BY JK 2026-06-18 (see DECISIONS_LOG); rest = Captain defaults

> **JK RULINGS (2026-06-18) — these SUPERSEDE the AUTH-4 defaults below:**
> - **Trigger = BOTH + L14** — manual GM action AND an auto backstop roll on sustained low fan morale (revive the orphaned
>   `managerFireProbability` as the backstop) AND the L14 cascade, all through ONE shared resolver. (Was: button-only.)
> - **Personality ripple = BUILD FULL NOW, dark vs the types** — incl. the personality half; inert until L1 + a new
>   manager-personality field (home = the identity `ManagerProfile`, reuse the 7-enum). §12 directions verbatim.
> - **Performance gate = SCALED by how underwater** (gradient, not a hard binary; zero for net-positive), off the LIVE
>   `valueDelta`. (Was: hard binary.)
> - **Fan-relief bump = SCALED by team struggle** (not flat +4/+15), emitted once per firing. (Was: flat +4.)
>
> The Q1/Q2/Q3/Q4 lines in §7 are answered by the above. The remaining §4 bullets stand as Captain defaults.

## 4(orig). FORKS — AUTH-4 DEFAULTS TAKEN (proceed unless JK overrides)
- **Trigger model:** firing is a **GM-spendable discrete action** (the valve), NOT a
  per-completed-game auto-roll — and L14 invokes the SAME resolver automatically. The orphaned
  `calculateFanExpectations` auto-probability roll is left dead/unwired (default). The dark
  per-game hook, if any, only computes **"hot seat available" eligibility**, not the firing.
- **L10-vs-L11 shape:** unlike L10 (continuous auto-sweep), L11 is an **event resolver** both a
  GM UI action and L14 can call. (Default.)
- **Performance gate:** **hard binary** at the moment of firing — net-negative True Value
  (`valueDelta < 0`, season-to-date) = exposed/ripple applies; net-positive = zero ripple
  (untouchable), per §12's "untouchable." TV read point-in-time (the single live cumulative
  row; no trough history exists — memory C5). (Default; JK may want a softened curve / the D6
  frozen artifact instead.)
- **Personality routing:** ripple keys off **both** the visible type (Egotistical) and the
  hidden modifiers (Loyalty, Resilience), via the existing `composeMoraleConsequence`
  personality + ambition/resilience wiring. (Default — but loyalty does NOT currently touch
  the self-hit; see Open Q4 on whether a bespoke loyalty term is needed.)
- **Fan-relief bump:** the matrix row's `teamFanMoraleDelta` (currently `loseStreakBrokenFan`
  = +4) as the seed, emitted **once** per firing (not once-per-player in the ripple loop).
  Conditional on the team actually struggling (low fan morale). (Default; magnitude unratified.)
- **Manager personality field:** reuse the canonical 7-personality enum (currently player-only,
  masterMoraleMatrix.ts:4-11) for managers rather than a manager-specific enum, stored on the
  identity `ManagerProfile`. (Default — JK ruling needed; see Open Q on which `ManagerProfile`.)
- **Store granularity:** prefer riding the existing morale/L10 overlay substrate to AVOID a
  trackerDb bump + the ledger-pin churn, UNLESS JK wants a separable revertible L11 store.
- **Legacy terminator:** reuse the existing `ManagerAssignment.fired`/`endDate`
  (`kbl-manager-identity` DB) as the legacy end-marker. (Default.)
- **Successor manager:** auto-assign a generated default identity
  (`buildDefaultManagerProfile`, managerIdentityStorage.ts:170-187) as the "new voice." (Default.)
- **Determinism:** seed any rolls FNV-1a off franchise+season+gameNumber (matches L8/L9/L10
  dark-compute determinism); no `Math.random`/`Date.now`.

## 5. SEAMS + FILE:LINE ANCHORS (✅ = verified on codex/franchise-v1-next)
- **Matrix row (the ripple substrate):** `MANAGER_FIRED` union member
  `masterMoraleMatrix.ts:24` ✅; `managerFiredSelf:-2` `:148` ✅; base-row `:375-377` ✅
  (self `managerFiredSelf`, fan `loseStreakBrokenFan`=+4, clubhouse `smallTeammateDrop`=−1, tap
  `'manager.fired'`). **Orphan check: zero emitters** — only `:24` + `:375` reference it in
  src/ (grep, non-test) ✅. CanonicalPersonality `:4-11`; `composeMoraleConsequence` :413-487;
  personality tuning :184-234; fan→player link (loyalty) :558-569.
- **Matrix call seam (copy this shape):** `composeMoraleConsequence(...)` +
  `applyFranchiseMoraleMatrixConsequence({...})` pair at `processCompletedGame.ts:387-416` ✅
  (the designation path); current-morale read `currentMoraleValue(...)` :363-371 wrapping
  `getFranchiseMoraleSnapshot` (franchiseMoraleState.ts:207-218); team-fan read at
  processCompletedGame.ts:386.
- **Fan-relief-bump sink + dark gate:** `applyFranchiseMoraleMatrixConsequence` early-returns
  `dark-noop` unless `isFranchisePhase2MoraleEnabled()` — `franchiseMoraleState.ts:388-400` ✅
  (flag default false, franchisePhase2Flags.ts:1 ✅); the team-fan write IS the relief bump at
  `franchiseMoraleState.ts:437-449` ✅; ledger DB `kbl-franchise-morale`, store `moraleSnapshots`.
- **Manager identity + the firing fields:** `ManagerAssignment` (managerWpa.ts:79-87 ✅, has
  `startDate?`/`endDate?`/`fired?` :85-86); active-manager gate reads
  `!fired && !endDate` at managerIdentityStorage.ts:357/399/411 ✅ + managerWpaDerivation.ts:213 ✅;
  **NO writer of `fired:true` exists** (grep src/ non-test, empty) ✅ — the act of firing is
  greenfield; `buildDefaultManagerProfile` managerIdentityStorage.ts:170-187 (successor seed);
  DB `kbl-manager-identity` v2 :12-18.
- **TWO divergent ManagerProfile types (a real fork):** identity `managerWpa.ts:68-77`
  (no personality; persisted to `kbl-manager-identity`) vs career-stats
  `mwarCalculator.ts:144-156` (no personality; persisted to `kbl-manager` via
  managerStorage.ts:22-30). Neither has a personality field — L11 must add one and pick a home.
- **Almanac legacy (mostly exists):** page `ManagerAlmanac.tsx` (routed App.tsx:298 /
  routes.tsx:133 → `/almanac/managers`), TenureTable :314, W-L :242/:350; aggregate
  `ManagerTeamTenureAggregate` almanacQueries.ts:193 ✅ (**no fire/hire-date field today**);
  builders `getOrCreateManagerTenure` :1066, `finalizeManagerTenure` :1203,
  `getManagerTeamTenures` :1768 ✅; backup/restore already registers `managerProfiles` +
  `managerAssignments` (backupRestore.ts:462/469/520).
- **Orphaned auto-roll trigger (do NOT silently wire):** `calculateFanExpectations`
  salaryCalculator.ts:1263 → `managerFireProbability` 0.15/0.08/0.05 by payroll band
  :1278-1294 ✅ — **zero callers** (grep, empty) ✅; unreconciled with §12's GM valve.
- **Ripple inputs (already on the table):** True-Value sign via `FranchiseTrueValueRow.valueDelta`
  (franchiseTrueValueStorage.ts:41, signed; L10 normalizes via `normalizePerformanceSignal`);
  `normalizePersonality()` masterMoraleMatrix.ts:489; HiddenModifiers game.ts:124-129 ✅
  (loyalty/ambition/resilience/charisma, 0-100); the loyal-hit/resilient-shrug/egotist-ignore
  curve already exists in `applyFanMoraleDampener` (fanMoraleDampener.ts:43, L5).
- **L5 deps present:** `fanMoraleDampener.ts:43` (`applyFanMoraleDampener`); `flashpointDecay.ts:74`
  (`computeFlashpointGameTax`) + `franchiseFlashpointDecayCompute.ts`/`...Storage.ts` (the
  "sustained pressure compounding over games" template, `consecutiveGamesUnresolved`).
- **Dark-build mirror (if a new store is added — clone L10):** flag block
  franchisePhase2Flags.ts:61-71 (L10) → new L11 block; trackerDb.ts:17 bump 23→**24** + guarded
  `onupgradeneeded` store block; new `franchiseL11OverlayStorage.ts` (clone
  `franchiseL10OverlayStorage.ts`); syncConfig.ts:18 registry; backupRestore.ts:168 block; **the
  store-list PIN `franchiseSeasonLedgerStorage.test.ts:276 toBe(23)→24 + :28-70 alpha-insert +
  the v23→v24 migration test** (must be in the same ticket) ✅. gate-branch import
  processCompletedGame.ts:63, sibling branches :611/:618/:625/:632/:639 ✅ — 7th branch after :645.
- **L14 downstream coupling:** rebrand auto-fires the manager via "the existing firing event,
  triggered automatically" (SPEC.md:245 ✅, DSTACK:94 `depends: …L11(firing)…`). L11's resolver
  must accept a programmatic invocation (e.g. `{teamId, reason:'rebrand', skipUserConfirm:true}`);
  rebrand resets all badges except Captain. *(Exact L14 call signature UNVERIFIED — JK to rule.)*

## 6. TRIGGER / CADENCE MODEL
**L11 is NOT continuous like L10.** §12 frames the firing as a **discrete GM-spendable action**
("a pressure-release valve the GM can spend"), and L14 invokes the **same** firing event
automatically — so L11 is an **event resolver**, not a per-completed-game auto-sweep.

This is the deliberate contrast with the JK Q5 (2026-06-18) ruling that made **L10 continuous**:
L10's independent per-player dice rolls fire on every completed game. L11 does not roll dice on
a cadence — it fires when the GM spends the valve (or when L14 cascades a rebrand). The only
per-completed-game compute L11 *might* run is a dark **"hot seat available" eligibility** read
(is fan morale cratered enough to offer the valve), which would gate at the same
processCompletedGame seam — but the firing itself is event-triggered, not checkpoint- or
sweep-triggered. The percentile-vs-peers periodic systems (trait adaptation L9b, ratings dev
L8) are unrelated to L11 and keep their 20% checkpoint.

```
Firing = GM action (or L14 cascade) → resolver:
  1. close legacy:  ManagerAssignment.fired=true, endDate, reason  (+ Almanac tenure-close marker)
  2. fan-relief:    ONE team-fan write = teamFanMoraleDelta (relief bump), conditional on struggling
  3. player ripple: for each rostered player →
        if TrueValue.valueDelta >= 0:  no effect (untouchable)
        else:  composeMoraleConsequence(MANAGER_FIRED, personality, {loyalty,resilience,…})
               → applyFranchiseMoraleMatrixConsequence  (per-player morale delta)
  4. successor:     assign new default manager identity ("new voice")
```
All deltas are §16 / Sim-Gate placeholders. Doubly dark (L11 flag + morale flag) until post-D13.
The "fan morale craters / sustained low" measurement does NOT exist in code (only `seasonLow`/
`trendStreak` in fanMoraleEngine.ts; threshold/duration is Sim-Gate-owned and unbuilt).

## 7. OPEN QUESTIONS FOR JK (genuine rulings; AUTH-4 defaults taken meanwhile)

> **✅ ALL RULED (ruling pass, JK 2026-06-19).** Every question below is now ruled — see `DECISIONS_LOG.md`
> "L11–L14 ruling pass" + `L11_L14_OPEN_QUESTIONS.md`. Q1–Q6 + the §4 forks were settled at the L11 kickoff
> (DECISIONS_LOG 2026-06-18: trigger=both+L14, scaled gate/relief, flat-clubhouse, one-fan-write, MOY-out). Q7–Q13
> ruled in the pass: Q7 personality on the identity profile (7-enum) · Q8 auto-generate successor · Q9 ride existing
> stores + tenure end-reason · Q10 build-dark/L1-gates-activation · Q11 the L14 firing-call contract
> (`suppressFanReliefBump`) · Q12 MOY-out confirmed · Q13 minimal "Fire Manager" surface (framing later). Retained
> below as the rationale/citation map.
1. **Firing trigger model + threshold.** §12 = GM-discretionary "valve"; the orphaned
   `calculateFanExpectations` (salaryCalculator.ts:1278-1294) encodes an auto-probability roll
   (0.05–0.15 by payroll band) + the salary spec adds a 25%-games gate. **Button vs auto-roll
   vs both?** What fan-morale floor + duration arms the valve? (§12 pins no number; no
   "sustained-low" measurement exists.) (Default: GM button + L14 cascade; orphan stays dead.)
2. **Canonical fan-relief bump — FOUR conflicting values.** §12 prose "a relief bump" /
   FAN_MORALE catalog `±0` / SALARY_SYSTEM_SPEC_UPDATED.md `+15` / **live matrix `+4`**
   (`loseStreakBrokenFan`, masterMoraleMatrix.ts:375). Which single value wins? Flat or
   context-scaled (worse record → bigger relief)? And does the fan delta get its **own
   dedicated EVENT_DELTA key** instead of borrowing `loseStreakBrokenFan`?
3. **Performance-gate FORMULA (the missing half of "performance × personality").** Live row is
   flat −2 for everyone; §12 wants net-positive untouchable. **Hard gate at TV=0 vs scaled by
   TV magnitude?** WHICH TV artifact — live `valueDelta` season-to-date (memory C5: single
   cumulative row, point-in-time only), the **D6 frozen trusted-value artifact**, or a snapshot
   store? Does the resolver zero net-positive players or pass a per-player scaled delta in?
   (Default: hard binary on live `valueDelta < 0`.)
4. **Personality / loyalty mapping into the firing SELF-hit.** Today `loyalty` only touches the
   fan→player link (masterMoraleMatrix.ts:558-569), NOT the self-delta; resilience touches the
   self-delta only on negative events. §12 wants loyal-hit-harder / resilient-shrug /
   producing-egotist-barely-notices on the firing itself. Is the current wiring sufficient, or
   does `MANAGER_FIRED` need a **bespoke loyalty term** on the self-hit? And does the ripple key
   off the visible type, the hidden modifiers, or both?
5. **Clubhouse / other-touched ripple: flat vs sign-variable.** The row hard-codes
   `touch('clubhouse', smallTeammateDrop)` = uniform −1, but §12 prose says "some players
   tighten, some are relieved" (mixed sign). Keep flat −1, or make each teammate's sign depend
   on their own TV/personality? (Default: keep flat.)
6. **Fan-write multiplicity.** If the resolver loops per-player to vary the ripple, the team-fan
   relief bump must be emitted **exactly once** (else multi-count; `sourceEventId` dedupe at
   franchiseMoraleState.ts:299-310 only helps if the same id is reused). Confirm L11 emits one
   separate fan write, NOT one-per-player. (Default: one separate fan write.)
7. **Manager personality — source + home.** No manager type has a personality field. **Reuse
   the canonical 7-personality enum** (player-only today) or define a manager-specific one? And
   store it on WHICH `ManagerProfile` — the identity one (managerWpa.ts:68, `kbl-manager-identity`)
   or the career-stats one (mwarCalculator.ts:144, `kbl-manager`)? Consolidate the two divergent
   types first, or pick one? (Note: D9 *retires* `mwarCalculator` — don't build new legacy on the
   soon-dead type.)
8. **Successor manager identity.** On firing, who replaces — auto-generate a default
   (`buildDefaultManagerProfile`), promote an existing unassigned profile, or user-picks? L14's
   auto-fire path needs the same answer. (Default: auto-generate the "new voice.")
9. **Legacy record shape + store granularity.** Should `ManagerTeamTenureAggregate`
   (almanacQueries.ts:193) gain hire/fire dates + an end-reason ("fired" vs "resigned" vs
   "relocated")? Does L11 need its OWN overlay store (trackerDb v24 + the ledger-pin churn +
   D2 backup-parity guard), or can the firing event + ripple ride the existing morale/L10
   overlay substrate? (Default: ride existing substrate; no new store.)
10. **L1 dependency (implicit).** The ripple needs persisted loyalty/resilience. Per memory,
    HiddenModifiers are defined (game.ts:124-129) but not attached/persisted to a Player entity
    until **L1** (the rename/wire ticket). DSTACK lists L11 deps as only L5/L3 — is L1 a hard
    prerequisite for the personality half to function, or does L11 build dark against the
    type now and rely on L1 wiring before switch-on?
11. **L14 contract surface.** What exact signature must L11 expose for L14's auto-fire (e.g.
    `fireManager({teamId, reason:'rebrand', skipUserConfirm:true})`)? Does the rebrand path
    **suppress the fan-relief bump** (fan morale is reset to ~70 anyway) or still fire the morale
    ripple as §14 implies ("its morale ripple")? (UNVERIFIED — needs ruling.)
12. **Confirm MOY is OUT of L11.** DSTACK:33 / §D + FRANCHISE_PLAYABLE_V1_DEFINITION.md:104 put
    MOY in Phase-1 D9; L11 must not touch any manager fame/award/ceremony code. Explicit
    confirmation requested (already flagged in L11_L14_READINESS_AUDIT.md:37-52).
13. **GM hot-seat surface in v1?** §13's "GM hot seat (stated mandate)" tooth — does the
    firing-trigger UI (a "Fire Manager" button) + the hot-seat pressure framing ship in v1, or
    defer? No firing UI exists today. (Default: minimal GM action exists; pressure framing later.)
