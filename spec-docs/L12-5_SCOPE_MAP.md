# L12-5 SCOPE MAP — AWARD/ALL-STAR EMISSION + L3 RACE-SNUB MORALE + honor→REACH-FLOOR + REPORTER TAP

> Produced by the L12-5 grounding recon (6 readers + synthesis + adversarial critique, 2026-06-19,
> workflow `wf_23cc345d-df4`). Anchors verified on `codex/franchise-v1-next`. BUILD-DARK behind
> `isFranchisePhase2L12Enabled` (default OFF, `franchisePhase2Flags.ts:85`); activate post-D13. Triangle applies.

---

## 1. SUBSYSTEM SURFACE

L12-5 is the **PAYOUT layer** of the Living-Season award/race stack: it consumes results the earlier tickets already
produced (the finalized `FranchiseAwardRow[]`, the locked All-Star roster, the recomputed standings) and fires three live
consequences for the **marquee honors** — (a) a reporter **emission** (`seasonNewsItems`), (b) a personality-scaled **snub
morale hit** via the L3 race tap, (c) a permanent **fame reach-floor ratchet** on a win/nod. **Boundary:** L12-5 does NOT
recompute standings (L12-3) and does NOT build/lock the roster (L12-4) — it only reads those outputs and pays out.

---

## 2. THE TRIGGER MAP (the crux — TWO trigger edges)

**All-Star pays at the 60% LOCK transition** (mid-season, inside the pure per-game spine, the L12-4d path). **MVP/CY pay at
SEASON-END finalize** (currently a React effect). Per Q6 only **MVP + CY + All-Star EMIT**; all other races visibility-only.

| Honor | Effect | Hook site | Timing | Path |
|---|---|---|---|---|
| **All-Star** | emission · reach-floor · snub | NEW branch in `processCompletedGame.ts` inside the existing L12 block (after `persistFranchiseAllStarRosterForCompletedGame` `:665`), fire ONLY when that returns status `'persisted-locked'` (`franchiseAllStarRosterCompute.ts:89`) | 60% lock | per-game spine (pure-ish, already L12-gated) |
| **MVP / CY** | emission · reach-floor · snub | NEW pure `emitFranchiseHonors(scope)`, called from the `isSeasonOver` finalize AFTER `computeAndPersistFranchiseWarAwards` (`FranchiseHome.tsx:3312` AND `:3346`) | season-end | React effect → pure module |
| all other races + TV-family | visibility-only | (nothing — perEventRate gate suppresses) | — | no emission |
| per-checkpoint "ebbs & flows" race narration | **DEFER v2** | the L12-3 recompute result is discarded at `processCompletedGame.ts:660` | — | not in Q6 EMIT set |

**⚠ The season-end finalize runs in the React/UI layer and is NOT L12-gated** (`FranchiseHome.tsx:3303-3322`). The L12-5
season-end hook MUST add its own `isFranchisePhase2L12Enabled` guard AND be **idempotent across BOTH caller paths** (`:3312`
useEffect-on-load + `:3346` `checkSeasonComplete`-after-game) or it double-emits / double-ratchets. → extract a **pure
`emitFranchiseHonors(scope)`** module (Fork F6), do NOT inline payout logic in the render effect.

---

## 3. THREE FLAGS — the gating reality (verified; do not under-document)

Each effect has a DIFFERENT flag dependency:
- **Emission** → `isFranchisePhase2L12Enabled` only.
- **Snub morale** → `isFranchisePhase2L12Enabled` (to construct/fire) **AND** `isFranchisePhase2MoraleEnabled` (the apply fn
  `applyFranchiseMoraleMatrixConsequence` self-gates → `'dark-noop'`, `franchiseMoraleState.ts:391`).
- **honor→reach-floor** → `isFranchisePhase2L12Enabled` **AND** `isFranchisePhase2FameEnabled` — because the
  `FranchiseFameRecordRow` it ratchets is ONLY produced by the per-game dark fame writer
  (`persistDarkFameRecordsForCompletedGame`, gated at `processCompletedGame.ts:616` / `franchiseFameCompute.ts:78`). **If Fame
  is OFF there is no row to ratchet** → the reach-floor hook must **no-op cleanly** (do NOT mint an orphan fame row the per-game
  channel won't maintain). Whether Fame/Morale are co-enabled at the post-D13 flip is an ACTIVATION-ordering question (Fork F-flags).

---

## 4. GREENFIELD vs REUSED

**GREENFIELD (build):**
- The pure `buildFranchiseAwardSeasonNewsEvent(input) → SeasonNewsEvent` adapter (mirror `franchiseL11ManagerChangeNewsAdapter.ts`) + sibling test in `src/src_figma/__tests__/reporter/`.
- ONE new `NarrativeEventType` member **`AWARD_RESULT`** (`narrativeEngine.ts:77-89`) + its FORCED `hedgingModifier` Record entry (`:590-603`, value `1.0`) — **same commit** (the compile break IS the guardrail).
- The negative snub resolver body for `MORALE_TAP_REGISTRY.race` (`masterMoraleMatrix.ts:401`) — returns a **freshly-constructed** non-neutral `BaseMoraleConsequence`.
- The first-ever `{kind:'race', type:<severity-key>}` morale-event constructor (the make-or-break — see §6).
- A non-decaying `applyHonorHeatBump(heat, bump)` helper + a `honorHeatBump.{allStar,cyYoung,mvp}` §16 tuning block (`fameModel.ts`).
- The honor→fame write-back edge (read row → bump heat → `updateReachFloor` → `saveFranchiseFameRecordRows`).
- The first PRODUCTION caller of the emission bus (`shouldEmitSeasonNews`/`generateSeasonNewsTake` have ZERO live callers).
- The `perEventRate` ON-switch (`saveSeasonEmissionConfig`, **wholesale replace — read-merge-write**).
- The snub-set derivation (`candidates − selections` for All-Star; runners-up for MVP/CY).
- The MVP/CY overcounting valve (read-guard via `listSeasonNewsItemsByEvent`).
- (Optional, Fork F9) `allStarSelections` career-counter increment.

**REUSED (do not rebuild):**
- `updateReachFloor(currentReachFloor, heat)` pure ratchet (`fameModel.ts:176-189`) — takes HEAT, maps heat→tier rank, returns `max(current, rank)`; unknown rank → unchanged.
- `resolveFameTier` (`fameModel.ts:191`) — only sanctioned tier read; consumers auto-reflect the floor.
- `composeMoraleConsequence` + automatic personality scaling (`masterMoraleMatrix.ts:413-487`; the neutral-ref skip at `:424`).
- `applyFranchiseMoraleMatrixConsequence` (`franchiseMoraleState.ts:388-474`, `sourceKind:'matrix-auto'`, self-gates on Morale flag).
- The designation-morale apply LOOP `persistDesignationMoraleConsequencesAfterTrueValue` (`processCompletedGame.ts:378-426`) — reusable as a template for the per-player apply, **BUT the event CONSTRUCTION must change from `{type}` to `{kind:'race', type}`** (§6).
- The L11 pure adapter template (`franchiseL11ManagerChangeNewsAdapter.ts`).
- `shouldEmitSeasonNews` (`seasonNewsGenerator.ts:135-145`), `generateSeasonNewsTake` (`:147-200`, async LLM), `persistSeasonNewsItem` (`seasonNewsStorage.ts:39-118`).
- The 60%-lock fire-once edge (the `'persisted-locked'` status / `'locked-noop'` early return, `franchiseAllStarRosterCompute.ts:52-55,88-89`).
- `getReporterForTeam` (`reporterStorage.ts:75-82`); `saveFranchiseFameRecordRows`/`getFranchiseFameRecord` (`franchiseFameRecordsStorage.ts:78,:160`) — **NOTE: the awards engine imports only the BULK reader `getFranchiseFameRecordRowsByScope`; the WRITER + single-row read are greenfield to that module (critique correction — not a one-line import extension).**

---

## 5. THE EMISSION PIPELINE

`perEventRate` ON-switch → pure adapter builds `SeasonNewsEvent` → `shouldEmitSeasonNews` gate → `generateSeasonNewsTake`
(async LLM) → `persistSeasonNewsItem`.
- **Config (4a):** `saveSeasonEmissionConfig` **replaces `perEventRate` wholesale** — read-merge-write: `{...cur.perEventRate, AWARD_RESULT: 1}`. Keep `marqueeOnly:true` (every non-AWARD type stays gated). Default today `{marqueeOnly:true, perEventRate:{}, raceTopN:3}` ⇒ nothing emits.
- **Adapter (4b):** returns the 7-key `SeasonNewsEvent` (`seasonNewsGenerator.ts:11-19`): `{franchiseId, seasonId, seasonNumber, eventType:'AWARD_RESULT', subjectIds, facts, dramaticWeight}` — **NO id, NO createdAt** (minted downstream). PURE/sync; `facts` lifted verbatim from the resolved input (honor kind + winner + trigger phase ride `facts`, NOT extra union members). `dramaticWeight` via a local const clamped `[0,1]`.
- **Gate (4c):** `shouldEmitSeasonNews(eventType, config)` — `perEventRate[type]` defined → `rate>0` (boolean gate, NOT a sampler → use `1`); else `!marqueeOnly`.
- **Take (4d):** `generateSeasonNewsTake(event, reporter, config)` — async, `callClaudeMessages` (claude-sonnet-4-6), mints id/createdAt, returns `null` on failure. Needs a non-null `BeatReporter` from `getReporterForTeam` → null-guard → skip.
- **Persist (4e):** `persistSeasonNewsItem` → `seasonNewsItems` store, compound keyPath `[franchiseId, seasonId, id]` — **must carry non-empty franchiseId+seasonId** or the put key is malformed.
- **NarrativeEventType (4f):** `hedgingModifier: Record<NarrativeEventType, number>` (`:590-603`, no index sig) is the ONLY exhaustive Record on the union — adding `AWARD_RESULT` is a hard compile break until its entry lands. `highStakesEvents[]` is non-exhaustive (no forced entry). No exhaustive switches. **Blast radius = the union `:77-89` + the Record `:590-603`.**

---

## 6. THE L3 SNUB MORALE ROW (the make-or-break detail)

Fill `MORALE_TAP_REGISTRY.race` (`masterMoraleMatrix.ts:401`): return a **freshly-constructed** non-neutral
`BaseMoraleConsequence` `{selfPlayerMoraleDelta:<negative>, teamFanMoraleDelta:0, otherTouched:[], reason:'race.snub'}`
(mirror the positive `ALL_STAR_SELECTION` row `:324`, negated). **NEVER return the `NEUTRAL_BASE_CONSEQUENCE` reference** — the
`base === NEUTRAL_BASE_CONSEQUENCE` ref-check at `:424` would skip personality scaling and Q9's "personality-scaled" silently fails.

**⚠ THE ACTIVATION SEAM (verified — the #1 correctness detail):** `getBaseMoraleConsequence` (`:405-411`) routes to the tap
ONLY when `event.kind` is set (`if (event.kind && event.kind !== 'event')`). The designation apply template constructs
`{type: moraleEventType}` with **NO `kind`** (`processCompletedGame.ts:392-393`) → it hits `lookupBaseRow(event.type)` (the
EVENT table), NEVER the tap. **So the snub clone MUST change the event constructor to `{kind:'race', type:<severity-key>}`** —
that one field is what makes the otherwise-dark tap fire. The apply-loop BODY (`getFranchisePlayer → composeMoraleConsequence →
applyFranchiseMoraleMatrixConsequence`) is reusable; the event CONSTRUCTION is greenfield and is the real seam.

The tap event carries no magnitude/subject payload (`{kind, type:string}`) → encode honor + severity tier in the `type` key
(e.g. `'race.snub.mvp'`); the CALLER pre-computes severity + the snub set. Magnitude = a §16 `EVENT_DELTA` placeholder
(e.g. `allStarSnubSelf: -3`). Use a **deterministic unique `sourceEventId`** per snubbed player (avoid double-apply).

---

## 7. THE honor→REACH-FLOOR RATCHET

`updateReachFloor(reachFloor, heat)` takes HEAT (not an honor enum) → maps heat→tier rank → `max(current, rank)`. "Bigger
honor → higher floor" is realized ONLY by sizing a per-honor heat bump that crosses a higher tier threshold.

**Direct write-back at the honor edge (NOT the per-game channel feeder):**
```
row = getFranchiseFameRecord(scope, playerId)        // requires Fame flag on (§3) else no row → no-op
newHeat = applyHonorHeatBump(row.heat, honorHeatBump[honor])   // NON-decaying add+clamp
newReachFloor = updateReachFloor(row.reachFloor, newHeat)
saveFranchiseFameRecordRows([{...row, heat:newHeat, reachFloor:newReachFloor, updatedAtCheckpoint:<sentinel>}])
```
**⚠ TRAP (verified):** do NOT route the bump through `applyHeatUpdate` — it applies `decayPerUpdate=0.85` BEFORE adding
(`fameModel.ts:144`), silently stripping 15% of accumulated heat at the honor moment. Add the non-decaying helper.
`honorHeatBump.{mvp,cyYoung,allStarStarter,allStarReserve}` is a §16 placeholder block under `FAME_TUNING`; enforce the
ruled ladder `mvp ≥ cyYoung ≥ allStarStarter ≥ allStarReserve` (monotonic by construction). **The All-Star ratchet iterates
ALL `selections` (whole team — JK F9), bumping starters/wildcard by `allStarStarter` and reserves by `allStarReserve`.** Stamp
a sentinel `updatedAtCheckpoint` so the next per-game fame write doesn't clobber the ratcheted floor (reconcile vs the
checkpoint-skip guard `franchiseFameCompute.ts:90-92` — Risk 7).

---

## 8. RECOMMENDED SPLIT (risk-ordered; pure before impure)

- **L12-5a — pure reporter adapter + `AWARD_RESULT` union/Record (LOW).** `narrativeEngine.ts` union + the forced
  `hedgingModifier` entry (one commit) + `buildFranchiseAwardSeasonNewsEvent` (pure) + sibling test. Orphaned-pending.
- **L12-5b — emission config + emitter wiring (MED).** `saveSeasonEmissionConfig` ON-switch; the thin async emit-glue
  (resolve reporter → build event → `generateSeasonNewsTake` → `persistSeasonNewsItem`) at BOTH edges, each L12-gated + a
  `listSeasonNewsItemsByEvent` dedup read-guard.
- **L12-5c — L3 snub row (MED; touches the live morale tap).** Fill `MORALE_TAP_REGISTRY.race` (pure) + the `{kind:'race'}`
  event constructor + the snub-set derivation; clone the designation apply loop at both edges; respect the L12+Morale
  double-gate. Tests: dispatch reaches the tap, non-neutral, personality amplifies (EGOTISTICAL/TIMID > TOUGH/RELAXED).
- **L12-5d — honor→reach-floor (MED).** The non-decaying helper + `honorHeatBump` tuning (pure, fameModel) + read-bump-
  ratchet-write-back at both edges, gated L12+Fame (no-op if Fame off); the `allStarSelections` counter (Fork F9).

---

## 9. FORKS — genuine JK decisions vs Captain defaults

### Genuine product/design forks — ✅ RULED (JK 2026-06-19):
- **F2 — snub = the CLOSE LOSERS only** (JK). NOT everyone. The CALLER derives the "close losers" set: for MVP/CY = the top
  runner(s)-up by smallest `marginToWinner`; for All-Star = the highest-scoring non-selected qualified player(s) at the
  contested slot (the deserving who lost the fan vote / merit fill). A closeness threshold/top-N (§16 sim) bounds the set.
- **F7 — the new race tap = SNUB ONLY** (JK). LEAVE the legacy positive `ALL_STAR_SELECTION` nod row (`masterMoraleMatrix.ts:324`)
  exactly as-is; `MORALE_TAP_REGISTRY.race` carries ONLY the negative snub. **No double-count, smallest change.** (Routing the
  nod through the tap is explicitly NOT done — F7 option b rejected.)
- **F9 — reach-floor: WHOLE TEAM, starters get MORE** (JK). Everyone selected to the All-Star team (starters + reserves +
  wildcard) gets a permanent reach-floor bump, but **starters (+ wildcard) get a BIGGER bump than reserves**. ⇒ `honorHeatBump`
  needs role tiers for All-Star: `allStarStarter > allStarReserve`, and the full ladder is `mvp ≥ cyYoung ≥ allStarStarter ≥
  allStarReserve` (§16 sim magnitudes). The reach-floor ratchet iterates ALL `selections`, bumping by role. `allStarSelections`
  career-counter increment rides this (at the lock) — counts any selection (starter or reserve).

### Captain engineering defaults (taken; documented; JK may override):
- **F1** NarrativeEventType = ONE `AWARD_RESULT`, discriminate honor via `facts.honorKind` (1 Record entry; reuse `PLAYOFF_RACE` for visibility-only races). **F3** `perEventRate = 1` (the gate is boolean). **F4** honor heat magnitudes = §16 sim placeholders, named `honorHeatBump` block, `mvp ≥ cy ≥ allStar`. **F5** MVP/CY overcounting valve = `listSeasonNewsItemsByEvent` read-guard (no DB bump) + fire-once across the two FranchiseHome paths. **F6** MVP/CY payout in a PURE `emitFranchiseHonors(scope)` module, not the React effect. **F8** snub magnitude carrier = flat resolver keyed off `type` (graded-snub payload = v2). **F10** the non-decaying `applyHonorHeatBump` helper lands in `fameModel.ts` (the sanctioned ratchet-math home) — *light SMB4-asset note: it's additive math next to `applyHeatUpdate`, no existing fame behavior changes.* **F11** per-checkpoint "ebbs & flows" race narration DEFERRED to v2.

---

## 10. RISKS
1. **Exhaustive-Record compile break** — add `AWARD_RESULT` + its `hedgingModifier` entry in ONE commit (the break IS the guard; never `@ts-ignore`).
2. **The neutral-reference morale trap** — the snub resolver must return a NEW non-neutral object (`:424` ref-check) or personality scaling is skipped.
3. **The `kind:'race'` activation** — the snub event must set `kind:'race'`, not just `type`, or the tap is bypassed (§6).
4. **Emission inside a React effect → double-emission** — the `isSeasonOver` effect re-fires + has a twin (`:3346`); `createSeasonNewsId` embeds timestamp+random → re-runs append DUPLICATES. Mandatory: pure module + `seasonNewsItems` read-guard + fire-once.
5. **The `applyHeatUpdate` 15%-decay** — use the non-decaying helper for the honor bump.
6. **The TRIPLE-flag reality** (§3) — snub needs L12+Morale; reach-floor needs L12+Fame. A single-flag assumption silently no-ops.
7. **Season-end vs final-game fame write race + checkpoint-key collision** — order the honor write after the final per-game fame compute (or re-read/idempotent), and stamp a sentinel `updatedAtCheckpoint` that the checkpoint-skip guard (`franchiseFameCompute.ts:90-92`) won't clobber.
8. **UNVERIFIED upstream input shapes** — the exact `FranchiseAwardRow` winner/candidate fields + the MVP/CY runner-up shape the adapter/snub-set consume were NOT opened in this recon; the builder must confirm before lifting into `facts`. (All-Star `FranchiseAllStarSelection` = `{playerId,teamId,position,role,selectionScore}` is confirmed.)
9. **Read-then-write ordering within the finalize** — the awards engine reads `fame?.reachFloor` as an AWARD INPUT (`franchiseAwardsEngine.ts:858-859`); if the honor hook writes the floor at the SAME finalize, confirm the award uses the PRE-ratchet floor (write-back must run AFTER `computeAndPersistFranchiseWarAwards` resolves — it does, in the §2 design).

---

**Document path:** `spec-docs/L12-5_SCOPE_MAP.md`. Written by the Captain after folding in the adversarial critique's
corrections: the `kind:'race'` activation seam (verified live — the make-or-break), the TRIPLE-flag fame/morale dependency
(verified), the awards-engine import correction (only the bulk reader is imported; the writer is greenfield), the concrete
(not hypothetical) F7 double-count (the positive nod is already live via the event table), and the §8 anchor drift flags
(re-verify L10 adapter export ~`:49` + the fame-input read `:858-859/:893` at contract time).
