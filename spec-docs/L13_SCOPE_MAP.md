# L13 SCOPE MAP — Relationships-lite + Reporter accuracy

**Created:** 2026-06-19 (Captain grounding recon, READ-ONLY) · **Model:** Claude Opus 4.8 · **Reasoning:** high
**Method:** mirror of the L11/L12-4 recon — 4 decorrelated code readers → synthesis → adversarial critique
(explicit "am I re-opening a ruled question?" pass) → 6 load-bearing claims self-verified by direct file read.
**Status of design:** RULED (JK ruling pass 2026-06-18/19). This map GROUNDS the ruled design in code; it does
**not** re-decide anything. Source of truth for the rulings = `DECISIONS_LOG.md → "2026-06-18 (L11–L14 ruling
pass)"` (L13 block, lines 77–125) + `FRANCHISE_V1_LIVING_SEASON_SPEC.md §24` (lines 587–638) +
`L11_L14_OPEN_QUESTIONS.md` (L13 block, lines 257–396).

> **Autonomy note (AUTH-4):** Everything below is grounding + a dependency-ordered build split. The **one
> persistence-class item** (the new `kbl-tracker` store + version bump) and **two genuine code-grounded forks the
> rulings did not close** (per-game vs checkpoint cadence; the morale→performance spec-vs-code gap) are batched in
> §5 for a one-line JK confirmation. Nothing else needs a ruling — it's all already ruled.

---

## 1. PIVOTAL RESOLUTION — FEEDBACK, not narrative-only → **L13 is SIM-CRITICAL**

**Answer: L13 relationships FEED BACK into the morale channel AND, through it, into the value channel. They are
an accumulating per-game/per-checkpoint feedback loop — NOT narrative-downstream-only.** Therefore L13 must land
**before** the comprehensive L-SIM run, and the L-SIM's invariant set needs §5 relationship invariants.

### The verbatim ruled evidence (not inference)

- **§24.1 (spec line 591):** edges "*nudge morale*" and "*feed **player morale -> development***, are surfaced
  (fallibly) by the reporter, drive roster decisions, and charge specific matchups."
- **§24.8 (spec line 627):** "*trade/demote the troublemaker -> the edge resolves -> the victim's morale recovers
  -> his performance recovers*" — an explicit closed accumulating loop.
- **§24.10 (spec line 638):** "*The primary path is the one already built: relationship -> player morale ->
  performance -> fan morale.*"
- **L13-Q7 ruling (`DECISIONS_LOG.md:100-104`):** "*the morale **WRITE** routes through the L3 master matrix
  (`composeMoraleConsequence`)… relationshipEngine no longer writes morale directly — it only supplies the base
  delta the matrix scales.*" ⇒ relationships write the morale channel.
- **L13-Q6 ruling (`DECISIONS_LOG.md:96-99`):** charged matchups "*amplify MORALE*" (a per-game morale swing).
- **L13-Q10 ruling (`DECISIONS_LOG.md:112-114`):** indirect path "*drama → player morale → performance → fan
  morale always on*"; plus a small **DIRECT** fan-morale nudge for reporter-amplified drama.

The prompt's own dichotomy: *narrative-only = "never writing back into the value or morale channels."* L13 writes
**both**. ⇒ **FEEDBACK.**

### How much of that loop is LIVE in code today (the staff-engineer refinement)

The recon found the loop is **real and built — with one leg dormant**, so the §5 invariants must scope precisely:

| Leg | Wired today? | Anchor |
|-----|-------------|--------|
| relationship → player morale (the matrix write) | **L13 builds it (dark).** The matrix `relationship` tap is a **stub** returning neutral. | `masterMoraleMatrix.ts:408` `relationship: () => NEUTRAL_BASE_CONSEQUENCE` (self-verified). Worksheet's `:403` cite is stale — `:403` is now the `race` tap. |
| player morale → **development** (ratings drift) | **LIVE.** "*the signed move is on-field performance × the player's own morale alignment. High player morale amplifies gains… low player morale shrinks gains.*" | `ratingsDevelopment.ts:15-16,87-91`; `computeCheckpointRatingDevelopment` (`:106`) consumed by the checkpoint sweep (`franchiseCheckpointSweepCompute.ts:28-29`), fed `player.morale` (`:179` → `:251`) at 20% boundaries. |
| development → ratings → True Value → standings/awards/fame | **LIVE** (checkpoint sweep → TV pipeline). | `processCompletedGame.ts` TV/checkpoint cascade `:606-636`. |
| player morale → **in-game performance** (mojo/fitness stat-mult → WAR) | **NOT wired.** `mojoEngine.ts`, `fitnessEngine.ts`, `bwarCalculator.ts` have **zero** `morale` references (self-verified grep). | — |

**Net:** once L13's matrix tap is authored, the accumulating loop **relationship → morale → ratings-development →
True Value** is closed (per-checkpoint, value-channel feedback). Only the morale→in-game-WAR leg is dormant — and
§24.10's "performance" is satisfied by the **development** channel, so the spec's "already built" claim is
substantially TRUE (see §5 Fork C for the one wording caveat).

### L-SIM sequencing implication

- **Land L13 before the comprehensive L-SIM (Phase 4) run.** A multi-season L-SIM that tunes morale/development
  magnitudes with the relationship tap still neutral would tune against a world where ~1-3 edges/team contribute
  nothing — then the magnitudes rot the moment L13 activates.
- **The L-SIM §5 invariant set must include relationship invariants:** edge-count bound (~1-3 live/team), morale
  ledger no-double-count (Captain Charisma×2 routing vs the leadership composite — see §4 gotcha), intensity decay
  monotonicity + hysteresis (no flicker), charged-matchup amplification bounded, and "troublemaker traded →
  victim morale recovers" convergence (§24.8). These cover the **morale ledger + development drift**; they do **not**
  need WAR-perturbation invariants (that leg is unwired).
- **Doc note:** `L_SIM_ARCHITECTURE_AND_INVARIANTS_SPEC.md` is referenced by the dispatch but **does not exist yet**
  (`ls spec-docs/` confirms; DSTACK:171 only says "L-SIM tuning continuously"). When it is authored, this §5 set is
  its relationship-invariant seed, and L13 is a Phase-4 prerequisite.

---

## 2. BUILT vs MISSING — the L13 surface inventory

### Already BUILT (reuse — do not rebuild)

| Surface | State | Anchor |
|---------|-------|--------|
| L3 master morale matrix + `composeMoraleConsequence` | **LIVE**, wired per-game | `masterMoraleMatrix.ts:419`; called from `processCompletedGame.ts:677` (designation) + `franchiseRaceSnubMorale.ts:128` (race snub) |
| Morale write/apply path | **LIVE**, auto-applied (not confirmation-gated) | `applyFranchiseMoraleMatrixConsequence` `franchiseMoraleState.ts:388` → `applyFranchiseMoraleEffect:250` → `moraleSnapshots` store; `sourceKind:'matrix-auto'` |
| morale → development → value | **LIVE** at 20% checkpoints | `ratingsDevelopment.ts:106` ← `franchiseCheckpointSweepCompute.ts:179,251` |
| 20% checkpoint cadence primitive | **LIVE** | `isCheckpointBoundary` `franchiseCheckpointSweepCompute.ts:106-114` (5 equal windows) |
| Per-game dark-compute gate cascade | **LIVE** pattern (fame/flashpoint/checkpoint/traits/L10/L11/L12) | `processCompletedGame.ts:616-680` |
| Feature-flag module + dual-layer override pattern | **LIVE** | `franchisePhase2Flags.ts` (L10 `:61-66`, L11 `:73-78`, L12 `:85-95`) |
| Reporter `SeasonNewsEvent`/`SeasonNewsItem` + dark news-adapter pattern | **LIVE** (L11/L12 adapters; L11 dormant) | `seasonNewsGenerator.ts:11`; `reporter.ts:131-146`; `franchiseL11ManagerChangeNewsAdapter.ts:69`, `franchiseL12AwardNewsAdapter.ts:28`; emission seam `franchiseHonorEmission.ts:20-51`; store `seasonNewsStorage.ts:39-62` |
| L5 flashpoint-decay primitive (the intensity-decay template) | **LIVE** | engine `flashpointDecay.ts:74-100`; compute `franchiseFlashpointDecayCompute.ts:104-160`; store row `franchiseFlashpointDecayStorage.ts:16-28` (`consecutiveGamesUnresolved` + `accumulated*` + `updatedAtCheckpoint` re-entry guard) |
| Player `age` + `gender` (no L1 dependency — field-correction confirmed) | **LIVE, persisted** all 3 layers | `playerDatabase.ts:47-48` + `Gender='M'|'F'` `:16`; `unifiedPlayerStorage.ts:41-42`; `leagueBuilderStorage.ts:227,229` |
| `HiddenModifiers` (loyalty/ambition/resilience/charisma) | **TYPE defined**, optionally persisted | `game.ts:123-129`; on `leagueBuilderStorage` Player as `hiddenPersonalityModifiers?` `:251`; **NOT** on unifiedPlayer/playerDatabase → L1 persists for activation |
| `relationshipEngine` 9 literal types + `MORALE_EFFECTS` flat base | **LIVE** (imported by storage/hook/panel) | types `relationshipEngine.ts:12-22`; `MORALE_EFFECTS:38-48`; `createRelationship:132-145` (manual, no threshold) |
| LI revenge/romance multipliers (the independent pre-existing feature) | **DEFINED + wired into LI** (detectors not in live game loop) | `leverageCalculator.ts:606-654` + `calculateLIWithRelationships:774-825`; detectors `relationshipIntegration.ts:375-524` |

### MISSING (L13 builds — all DARK)

| Gap | Where it lands | Ruling |
|-----|---------------|--------|
| Canonical **6 AFFECT-edge** type + the 9→6 mapping + retire surplus | new edge model | L13-Q1 |
| Edge **record shape** `{player1,player2,type,intensity[0..1],formed,dissolved,accuracy}` | new store (§4) | L13-Q12 |
| Per-type **threshold gate** + input-modifier sets | formation engine | L13-Q2 |
| "young" predicate (reads real `age`) + **NEW co-rostered-games counter** ("extended time") | formation engine | L13-Q3 |
| **Scalar intensity + lapse-decay + hysteresis** (mirror flashpoint) | intensity lifecycle | L13-Q4 |
| **Captain effectiveness composite** `w1·Cha+w2·Loy+w3·Res−w4·Amb` suppress/catalyze | governor | L13-Q8 — **explicitly deferred-to-L13** in `captainMoraleRouter.ts:10-22` |
| Romance base-rates + same-gender weight (reads real `gender`) | formation engine | L13-Q9 |
| **Matrix `relationship` tap rows** (replace the `:408` neutral stub; base delta from `MORALE_EFFECTS`, personality cross in matrix) | morale write | L13-Q7 |
| **Charged-matchup MORALE amplification** (fresh; keyed off History edge + former-team flag) | per-game morale | L13-Q6 |
| **Reporter inaccuracy primitive (REP-4):** flat ~10% HEDGE/FLAG, FNV-1a seeded | reporter intel | L13-Q5 |
| Pre-move advisory heads-up (active OR potential edge) + relationship-flare news adapter | reporter tap | §24.5 / REP-4 |
| **Direct fan-morale nudge** gated on SEA-2 emission ("visible drama") | fan-morale tap | L13-Q10 |
| L13 **feature flag** + processCompletedGame gate branch | wiring | L13-Q13 |

---

## 3. BUILD SPLIT — L13-1 … L13-8 (dependency-ordered, all build-DARK, builder ≠ auditor)

> Activation gate: every sub-ticket ships behind `isFranchisePhase2L13Enabled()` (default `false`), inert until
> **post-D13**, mirroring L10–L12. L1 persisting the 4 hidden modifiers is the **activation** prerequisite, **not** a
> build blocker (L13-Q13). `age`/`gender` already exist → no L1 add for those.

| # | Ticket | Seam it fills | Key anchors / deps |
|---|--------|---------------|--------------------|
| **L13-1** | **Canonical edge model + 9→6 taxonomy map.** Author the 6 AFFECT-edge union (Rivalry/Feud/Mentorship/Friendship/Romance/History); map the 9 literals (Romance←DATING/MARRIED/DIVORCED/CRUSH; Feud←BULLY_VICTIM; Rivalry←RIVALS/JEALOUS; Friendship←BEST_FRIENDS; Mentorship←MENTOR_PROTEGE) + add History; retire surplus. 7-entity worksheet axis folds into endpoints, not types. | The edge contract every later ticket consumes. | `relationshipEngine.ts:12-22`. Pure types/const. Dep: none. |
| **L13-2** | **Persistence store (PERSISTENCE-CLASS — see §5 Fork A).** New `kbl-tracker` store for the edge record (rivalryScores does NOT fit). Version bump **24→25**; store-list **PIN** + backup DoD + sync + reset-list, all in-ticket. | The saved edge shape. | `trackerDb.ts:17,297`; PIN `franchiseSeasonLedgerStorage.test.ts:274-280`; `backupRestore.ts:308-317`; `syncConfig.ts:44`; `resetDerivedCompetitionData.ts:29`. Dep: L13-1. |
| **L13-3** | **Formation engine.** Per-type threshold gate (Q2) + trigger predicates: "young"=real `age` proxy, "extended time"=new co-rostered-games counter (Q3); potential-vs-active; romance base-rates + same-gender weight on real `gender` (Q9); **Captain effectiveness composite** suppress/catalyze (Q8). | Edge birth/lifecycle. | `captainMoraleRouter.ts:10-22` (deferred composite); `game.ts:123-129`; `playerDatabase.ts:47-48`. Dep: L13-1/2. |
| **L13-4** | **Intensity lifecycle.** Scalar intensity [0..1] + lapse-decay + hysteresis band (Q4), mirroring the flashpoint primitive. Fold intensity into the edge record (avoid a 2nd PIN — see §5 Fork A). | Edge strength over time + the §24.8 recovery quantity. | mirror `flashpointDecay.ts:74-100` + `franchiseFlashpointDecayStorage.ts:16-28`. Dep: L13-2/3. |
| **L13-5** | **Matrix relationship-tap authoring (the SIM-CRITICAL feedback write).** Replace the `masterMoraleMatrix.ts:408` neutral stub with per-edge rows; `MORALE_EFFECTS` supplies the base delta, the matrix applies the personality/modifier cross (Q7). relationshipEngine stops writing morale directly. | relationship → morale channel. | `masterMoraleMatrix.ts:408,419`; base `relationshipEngine.ts:38-48`; apply `franchiseMoraleState.ts:388`. Dep: L13-1/3. |
| **L13-6** | **Charged-matchup morale amplification (Q6).** Fresh per-game morale-swing amp keyed off the History edge + former-team flag. Independent of the LI multipliers — **do not delete, do not extend** them (Q1 eventually orphans them). | The "revenge game" morale swing. | new; leave `leverageCalculator.ts:606-654` untouched. Dep: L13-1/5. |
| **L13-7** | **Reporter integration.** REP-4 inaccuracy primitive (flat ~10% HEDGE/FLAG, FNV-1a seed off franchise+season+moveId, Q5); pre-move advisory heads-up (active OR potential, never a hard gate, §24.5); relationship-flare **news adapter** (mirror L11/L12 adapters, additive+dormant); direct **fan-morale nudge** gated on SEA-2 emission (Q10). | reporter tap + visible-drama fan nudge. | adapters `franchiseL11ManagerChangeNewsAdapter.ts:69` / `franchiseL12AwardNewsAdapter.ts:28`; emission seam `franchiseHonorEmission.ts:20-51`; per-personality voice table stays `narrativeEngine.ts` (Q5 scope split). Dep: L13-1/3. |
| **L13-8** | **Flag + per-game/checkpoint gate wiring.** Add `isFranchisePhase2L13Enabled()` + the `processCompletedGame` dark branch(es) on the chosen cadence (§5 Fork B). Activation-prereq doc note (L1 modifiers). | per-game/checkpoint dark cadence. | `franchisePhase2Flags.ts` (after `:95`); `processCompletedGame.ts:616-680`. Dep: all above. |

---

## 4. SEAMS / FORKS / GOTCHAS (file:line anchored)

- **`rivalryScores` does NOT fit the edge shape — confirmed, self-verified.** It is **team↔team and dormant**
  (`RivalryScore` `reporter.ts:175-186`: `{id,teamId,leagueId?,rivalTeamId,intensity,origin?,createdAt,lastUpdated,
  changed_at,deleted?}`; zero live readers/writers). It has only `intensity`; **no** `player1/player2/type/formed/
  dissolved/accuracy`. The keyPath is the generic `'id'`, so it *could* be abused as a schemaless bag — but its 5
  indexes (`teamId`/`rivalTeamId`/…) serve none of the player-edge queries, and co-mingling two record types in one
  store is exactly the kind of saved-shape ambiguity to avoid. ⇒ **The ruling L13-Q12's own conditional fires its
  fallback branch: a NEW `kbl-tracker` store.** This is *executing* the ruling, not re-opening it. (See §5 Fork A —
  flagged because it is persistence-class.)
- **PERSISTENCE PIN is in scope (MEMORY: broke L6b-1).** A new store ⇒ `TRACKER_DB_VERSION` 24→25 + update the
  hard-pinned store list at `franchiseSeasonLedgerStorage.test.ts:274-280` + the backup manifest
  `backupRestore.ts:308-317` (add the new store) + `syncConfig.ts:44` + `resetDerivedCompetitionData.ts:29` — **all
  in THIS ticket**, per the C4 backup DoD and the cross-ticket coupling table (`L11_L14_OPEN_QUESTIONS.md:515`).
- **Matrix double-count guard (the §5 invariant + a build gotcha).** Captain Charisma appears in **two** live
  morale roles that must not double-count: (1) the **Charisma×2 morale routing** already live in
  `captainMoraleRouter.ts:24-64`, and (2) the **new leadership-effectiveness composite** (Q8) that governs edge
  suppression/catalysis. REL-8 + §24.9 (spec `:632`) already rule them **distinct, no double-count**; the code
  comment at `captainMoraleRouter.ts:10-12` says the composite is L13's job. The build must keep the composite OFF
  the morale-routing multiplier path. An L-SIM §5 invariant should assert no edge's morale delta is scaled by
  Charisma twice.
- **One morale-application path (anti-FINDING-150).** L13-Q7's boundary: relationshipEngine supplies the **base
  delta only**; the **write** is the matrix (`composeMoraleConsequence` → `applyFranchiseMoraleMatrixConsequence`).
  Do not let the new edge code write `moraleSnapshots` directly — route every edge morale through
  `masterMoraleMatrix.ts:408` rows. This is the single boundary that keeps it out of the scatter anti-pattern.
- **Intensity store decision (avoid a 2nd PIN).** L13-Q4 needs an accumulator. The flashpoint template uses a
  **separate** store (`franchiseFlashpointDecay`). For L13, **fold `intensity` + `consecutiveGamesUnresolved`-style
  fields into the edge record** instead → one new store, one PIN. A separate decay store = a second version bump +
  second PIN churn for no benefit (the edge already needs a row).
- **LI multipliers are an independent feature — leave them.** `leverageCalculator.ts:606-654` +
  `calculateLIWithRelationships:774-825` amplify the **LEVERAGE INDEX** (a different quantity from morale), built on
  the dying 9-type taxonomy. L13-Q6 rules: charged matchups amplify **MORALE** via a **fresh** path; the LI
  multipliers stay untouched (Q1's retirement eventually orphans them — that's fine, not L13's job).
- **`relationshipEngine` UI surface may be a partial/legacy path.** It is imported by `src/components/
  RelationshipPanel.tsx:16` + `src/hooks/useRelationshipData.ts:15` (the `src/components` tree, where
  `GameTracker/index.tsx` is the known **un-routed** copy per CLAUDE.md). L13 reuses the engine's **constants**
  (`MORALE_EFFECTS`), not the panel; verify the panel's routing before assuming it's the live consumer (likely an
  orphan — does not affect the build).
- **Reporter scope split (Q5).** The live per-personality `REPORTER_ACCURACY_RATES` (0.65–0.95,
  `narrativeEngine.ts:351-361`) stays as **in-game-take VOICE flavor**; the relationship-intel rate is the **flat
  ~10%** HEDGE/FLAG. Two different knobs — do not unify them.
- **Doc-hygiene already applied (confirm, don't redo).** The DSTACK already RETIRES the separate
  `kbl-relationships` DB (`FRANCHISE_V1_LIVING_SEASON_DSTACK.md:19-20,128`). The two `FRANCHISE_MODE2_MORALE_
  RELATIONSHIP_*` docs still need the **SUPERSEDED-BY-§24** stamp (L13-Q11) before/at build — outstanding.

---

## 5. OPEN QUESTIONS — ✅ ALL RULED (JK, 2026-06-19; see `DECISIONS_LOG.md` 2026-06-19 entry)

> **A — APPROVED:** new `kbl-tracker` store (rivalryScores can't fit), full persistence discipline, isolated as the
> first sub-ticket **L13-1** (own audit + v24→v25 migration test), prioritized browser-verify item.
> **B — CONFIRMED:** mixed cadence — formation @ 20% checkpoint; decay + charged-matchup per-game; intensity folded into
> the edge record (no 2nd PIN).
> **C — CONFIRMED + spec fixed:** morale→in-game-performance stays OUT of L13 (deferred, not v1); §24.10/REL-9 corrected
> to morale→development; L-SIM invariants assert morale→development, never morale→WAR.
>
> **Build-split renumber (per ruling A):** the persistence store is now **L13-1** (was L13-2 in §3 below); taxonomy
> mapping is **L13-2**. The 8 contracts are authored in `PROMPT_CONTRACTS.md` (build-DARK, builder≠auditor, builds HELD
> until JK is sole mutator). §3's table reflects the original recon order — the authoritative dispatch order is
> store-first per the contracts.

The original fork text is retained below as the rationale that the rulings closed.

**Fork A — Persistence (PERSISTENCE-CLASS · surfaced per AUTH-4, not auto-decided).** Recon confirms `rivalryScores`
is team-scoped + dormant and **cannot** carry the player-edge shape, so the ruling L13-Q12's fallback fires.
Confirm: **create a new `kbl-tracker` store `franchiseRelationshipEdges`** holding `{id, player1, player2, type,
intensity, formed, dissolved, accuracy}` (+ folded decay fields), with version bump 24→25 and the full PIN/backup/
sync/reset DoD in-ticket — and **reject** any reuse of `rivalryScores`? *(Recommended: yes, new store; fold
intensity in → one store, one PIN.)*

**Fork B — Cadence (architecture; rulings are silent; recommend + confirm).** The code exposes both a per-game dark
branch (`processCompletedGame.ts:616-680`) and a 20% checkpoint primitive (`isCheckpointBoundary:106-114`).
Recommended split: **edge formation/re-evaluation at the 20% checkpoint** (a pairwise scan is too costly per game,
and it aligns with the morale→development checkpoint), **+ on-demand at roster moves** for the pre-move "potential"
intel; **intensity decay + charged-matchup morale per game** (decay mirrors flashpoint's per-game tax; a charged
matchup flags one specific game). Confirm this mixed cadence? *(Recommended: yes.)*

**Fork C — The §24.10 "performance" spec-vs-code gap (flag, likely confirmation-only).** §24.10 says relationship →
morale → **performance** → fan morale is "already built." In code, morale feeds **development** (ratings drift, LIVE
at checkpoint) but **not in-game performance** (mojo/fitness/WAR have zero morale input). So L13's feedback is
**morale + development/value**, not in-game-WAR. Confirm: **morale→in-game-performance stays OUT of L13** (it's a
separate dormant seam), and amend §24.10's wording from "performance" to "development" to match the built channel?
*(Recommended: yes — out of scope for L13; one-line spec wording fix.)*

---

## APPENDIX — adversarial-critique log (did I re-open anything ruled?)

- **Taxonomy / gate / triggers / intensity / reporter-rate / Captain weights / gender / age / storage substrate /
  doc supersession** — all already ruled (L13-Q1..Q13, `DECISIONS_LOG.md:77-125`). This map only *grounds* them.
  No re-ask. ✓
- **Fork A is NOT a re-open** — it executes the explicit conditional inside L13-Q12 ("…if it can't, a new
  `kbl-tracker` store forces the full C4 backup DoD…"). The recon merely resolves *which branch* the code lands on
  (the new-store branch). Surfaced only because it is persistence-class. ✓
- **Fork B is genuinely new** — no ruling pins L13's cadence; the 20% checkpoint primitive + per-game flashpoint are
  code facts the rulings predate. ✓
- **Fork C is a spec-vs-code discrepancy, not a design re-decision** — it scopes the L-SIM §5 invariants and fixes
  one spec word; it does not alter any L13 ruling. ✓
- **Citation corrections logged:** matrix relationship tap is at `masterMoraleMatrix.ts:408` (worksheet/auditor said
  `:403` — now the `race` tap). Reader-2's "morale is display-only / doesn't feed performance" was **incomplete**:
  morale DOES feed **development** via `ratingsDevelopment.ts` at the checkpoint sweep — corrected in §1.
