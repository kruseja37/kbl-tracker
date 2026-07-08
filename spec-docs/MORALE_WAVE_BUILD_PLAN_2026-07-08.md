# MORALE WIRING WAVE — BUILD PLAN (contract basis for the next Mode-2 lanes)

**DRAFT — awaiting captain ratification + the JK RIVALRY_SWEEP fork (rows at :68/:95); builds AFTER Mode-1 per the JK priority directive (2026-07-08 overnight: Mode-1 A-Z has absolute priority, Mode-2 builds deferred). No W-lanes dispatch from this plan until both gates clear.**

**Assembled:** 2026-07-08/09 boundary, from `/private/tmp/kbl-port2` @ origin/main HEAD `96563e2b`.
**Governing authorities (in order):** `V1_CANON_2026-07-07.md` §6 rulings — MORALE FULL-WIRING (2026-07-07, :202), REL-8 captain→chemistry BUILDS in this wave (2026-07-08 five-ruling batch item 3, :206), HOME-PARK RIVAL 2× amplifier (2026-07-08, :205), RECORD-OVERTAKE REVERSAL (2026-07-08 late, :209) · `FRANCHISE_V1_LIVING_SEASON_SPEC.md` (LSD) §5-§7 (:92-148), §8 (:127-148), §13 (:221-237), §24.9 (:634-638) · `SOT_REGISTER_2026-07-08.md` §3.2 (player morale: 7 fed / 10 dark-by-flag / 45 dormant / 4 missing / 2 drift), §3.9 (fan morale), §4c cross-cutting severances (:410-414).
**Scope law:** wire ALL ~52 unwired Master Morale Matrix rows, no purge; rows dependent on out-of-v1 systems defer WITH their system (V1_CANON §6:202). All magnitudes stay §16 SIM-TUNE placeholders — this wave wires, it does not tune.

**The engine + store, verified:**
- Matrix: `src/engines/masterMoraleMatrix.ts` — 59 rows (`PLAYER_EVENT_BASE_TABLE`, :308-432), `composeMoraleConsequence` :473, personality tuning :204-254 (spec-exact per register §3.2), Charisma other-touched multiplier :752-754, fan-morale link :756-767.
- Ledger store: `src/utils/franchiseMoraleState.ts` — `applyFranchiseMoraleEffect` :357, `applyFranchiseMoraleMatrixConsequence` :495 (flag-gated at :498), `getFranchiseMoraleSnapshot` :228. **No new IndexedDB store is added anywhere in this wave** (avoids the 4-5-registry + trackerDb version-pin traps).
- Flag mechanism (merged M2a): `src/utils/franchisePhase2Flags.ts` (`isFranchisePhase2MoraleEnabled` :18, all defaults `false`) resolving through the persisted activation record in `src/utils/franchisePhase2Activation.ts` (`FRANCHISE_PHASE2_FLAG_KEYS` :6-18, 11 keys). Every new tap in this wave gates on the existing keys — no new flags.
- The 7 rows fed today (all via `src/utils/processCompletedGame.ts`, "pCG"): TEAMMATE_AWARD / FAN_FAVORITE_LOCKED / ALBATROSS_LOCKED (designation tap, compose at pCG:445, mapper :395-410), TRADE_DEMAND (pCG:594-668, compose :634), PARK_RECORD_SET (pCG:671-762, compose :697), RIVAL_GAME_WIN / RIVAL_GAME_LOSS (pCG:765-861, compose :792). Plus 3 non-row tap lanes: fame heat (pCG:525, called :1370), race snub (`franchiseRaceSnubMorale.ts:128`), relationship edges (`franchiseRelationshipMoraleCompute.ts:439`).

---

## 1. LANE W1 — KEYSTONES (unblocks everything downstream, including the M-L matchup-engine lane)

### W1.1 Morale ledger → development read-back (the "morale never reaches development" severance)
**Gap (SOT §3.2 row 2, §4c):** the ledger is written by every fed tap, but the three development consumers read the static draft-seeded `player.morale` forever:
- `src/utils/franchiseCheckpointSweepCompute.ts:445` — `playerMorale: player.morale` inside `resolveCheckpointRoster` (the seam the matchup reconciliation cited; note the SAME function already reads **team fan** morale from the ledger correctly at :423-429 — the pattern to copy is 20 lines up).
- `src/utils/franchiseTraitGrantCompute.ts:135` — `currentMorale: player.morale` inside `resolveTraitGrantRoster`.
- `src/utils/franchiseL10SweepCompute.ts:153` — `playerMorale: player.morale` (same file already ledger-reads fan morale at :134-139).

**Proposed seam (RECOMMENDED — read-side redirect, not a store write-back):** at each of the three sites, resolve `(await getFranchiseMoraleSnapshot(scope, 'player', player.id))?.currentValue ?? player.morale` (batched per roster, mirroring the existing per-team fan-morale promise-map pattern at `franchiseCheckpointSweepCompute.ts:423-429`). Flag-gating is inherited: each site already sits inside its own Phase-2 gate (`isFranchisePhase2CheckpointEnabled` / `TraitsEnabled` / `L10Enabled` — pCG:1411/:1418 and the compute headers), and `getFranchiseMoraleSnapshot` is read-only, so no extra flag is needed. **Explicitly NOT building** a write-back that mutates `player.morale` in the franchise players store: that changes a live store's data source (JK-fork class per the captain's buttonup heuristic), risks double-application, and adds nothing the three reads don't get. If a later UI surface needs `player.morale` itself synced, that is a separate JK fork.
Also fold in the same one-line redirect for the trade-propensity gate (SOT §3.8 row 2 — same `franchiseL10SweepCompute.ts:153` read feeds the L10 trade-demand discontent term, so it lands for free).

### W1.2 `otherTouchedPlayerIds` resolution (Charisma + Captain routing are no-ops until this lands)
**Gap (SOT §3.2 row 1, §4c):** `ApplyFranchiseMoraleMatrixConsequenceInput.otherTouchedPlayerIds` exists (`franchiseMoraleState.ts:86`) and is consumed (:558-573), but **zero production callers pass it** — every fed row's teammate/clubhouse ripple silently drops, and the Charisma multiplier (`masterMoraleMatrix.ts:539-551`, :752-754) multiplies deltas that never get a target.

**Build:**
1. **API widen (backward-compatible):** the current mapping is 1 id per `otherTouched` entry by index (`franchiseMoraleState.ts:559`) — structurally wrong for `clubhouse`/`teammate` relations that touch N players. Widen to accept `otherTouchedPlayerIds?: Array<string[] | string>` (per-entry id LIST), fanning writes out per id with `sourceEventId` suffix `:other:{index}:{playerId}` (pattern already at :568).
2. **New pure resolver** `src/utils/franchiseMoraleTouchedResolver.ts` (new file, engine-free, testable): `resolveOtherTouchedPlayerIds(relation, ctx) → string[]` per `MoraleRelation` (`masterMoraleMatrix.ts:43-48`):
   - `teammate` / `clubhouse` → all MLB-rostered players on `teamId` minus the subject (roster source: `getAllFranchisePlayers` + `getPlayerRosterStatusForLeague`, the exact pattern at `franchiseTraitGrantCompute.ts:117-127`).
   - `captain_teammate` → teammates when the subject IS the captain (`team.captainPlayerId`, already loaded on the rival-game tap at pCG:772-775).
   - `young_teammate` → teammates under the age cutoff (age already on the franchise player record; cutoff = §16 SIM-TUNE placeholder).
   - `position_group` → same staff group (pitchers for BLOWN_SAVE — role via `getPlayerIsPitcher`, as at `franchiseTraitGrantCompute.ts:129`).
3. **Captain routing activation** (`src/engines/captainMoraleRouter.ts` — self-documented "WIRING is a DEFERRED seam, NOT built" :17-23): at the resolver/apply seam, (a) when a touched teammate's ripple originates from the badge-holding captain, scale by `applyCaptainCharismaRouting` (:59, ×2 canonical per §4/LS-6); (b) when the consequence's SUBJECT is the captain, scale team-wide `otherTouched` deltas by `applyCaptainPerformanceSwingAmplification` (:66). Anti-double-count rules in the file header are binding (routing ≠ REL-8 effectiveness composite).
4. **Retro-fit the 7 fed call sites** to pass resolved ids: pCG:445/:544/:634/:697/:792 taps + `franchiseRaceSnubMorale.ts:128` + `franchiseRelationshipMoraleCompute.ts:439` (relationship rows emit `otherTouched: []` today — no-op there, wire the param anyway for uniformity).

### W1.3 REL-8 Captain→chemistry effect (spec-locked; punt overturned 2026-07-08)
**Spec:** LSD §24.9:634-638 — high-Charisma players, ESPECIALLY the Captain, suppress negative edges and catalyze positive ones; **effectiveness = 4-modifier composite (Charisma + Loyalty + Resilience, tempered by low Ambition)**; absolute composite for v1. Distinct from W1.2's morale routing (Charisma ×2) and from selection (2 modifiers) — three uses, no double-count (`captainMoraleRouter.ts:8-16` header + `franchiseMoraleRelationshipTrust.ts:512-515` both marked it deferred; the 2026-07-08 ruling overturns that).
**Build site:** the edge-formation threshold gate, `src/engines/relationshipFormation.ts:139-151` — candidates from `scoreRivalry/scoreFeud/scoreMentorship/scoreFriendship` (:212/:228/:242/:261) pass when `candidate.score ≥ effectiveThreshold` (:149-150). Add a pure `computeCaptainLeadershipComposite(modifiers)` (new export, lives in `captainMoraleRouter.ts` or a sibling engine file) and a threshold SHIFT: negative edge types (FEUD, RIVALRY-from-clash) get their threshold RAISED, positive types (MENTORSHIP, FRIENDSHIP) LOWERED, proportional to the captain's composite (shift magnitudes = §16 SIM-TUNE placeholders). Captain identity + modifiers thread through the roster resolution in `src/utils/franchiseRelationshipFormationCompute.ts` (`resolveRelationshipFormationRoster` :59, tap `persistDarkRelationshipFormationForCompletedGame` :94, invoked pCG:1427 under `isFranchisePhase2L13Enabled`). Flag gate: L13 (inherited).

### W1.4 One-matrix hygiene guard (small, rides W1)
Gate or delete the legacy non-matrix morale writer `franchiseRandomEventLogStorage.ts:378` (`applyFranchiseMoraleEffect` via legacy formulas — violates the LSD §5 one-matrix rule; register flags it "delete/gate before flag flip"; its sole consumer is unrouted).

**W1 size: M** (three surgical builds + one guard, no new stores, no new flags). **Hard dependency note:** the ratified matchup-engine lane M-L (V1_CANON §6:210) names the morale ledger write-back as its hard dep — W1.1 landing unblocks M-L.

---

## 2. THE 52-ROW WIRING TABLE (lanes W2a / W2b / W2c)

Rows = `PLAYER_EVENT_BASE_TABLE` keys, `masterMoraleMatrix.ts:308-432`. 59 total − 7 fed = 52 unwired. Flag gate for every new dispatch = `isFranchisePhase2MoraleEnabled` (matrix apply already re-gates at `franchiseMoraleState.ts:498`), plus the surface's own flag where noted. All new pCG taps follow the established dark-tap pattern (compose → `applyFranchiseMoraleMatrixConsequence` with idempotent `sourceEventId`) inside the `trueValueScope` block (pCG:1332-1543); each new module wired into pCG needs the test-only mock stub (known partial-mock load break — see §4).

### Lane W2a — GAME-EVENT ROWS (tap surface: pCG per-game; 29 rows) — size L
| Row (matrix line) | Trigger event | Data source (exists today) | Tap site | Notes / defer marker |
|---|---|---|---|---|
| WIN :309 / LOSS :310 | team game result | `deriveCompletedGameResultContext` pCG:883-935 (win/loss per team already computed) | NEW `persistDarkGameResultMoraleForCompletedGame` in pCG, called next to Channel A (:1402) | Cheapest tranche per register — self-morale target: per-player rows for the game's rostered players, or captain-as-proxy (design choice for the contract; recommend all players who appear in `gameState.playerStats`/`pitcherGameStats`) |
| WALK_OFF_WIN :311 / WALK_OFF_LOSS :314 | walk-off | same context, `isWalkOff` pCG:906 | same new tap | subject = walk-off hitter if resolvable from `playerWpaTotals` (pCG:937-946 standout helper), else team-wide |
| NO_HITTER :317 / GOT_NO_HIT :320 | CG no-hitter | same context, pCG:894-903 (`pitcherGameStats` starter, 27 outs, 0 H) | same | subject = the pitcher (id on `pitcherGameStats`) |
| SHUTOUT_WIN :321 / SHUTOUT_LOSS :322 | CG shutout | same context :898-900 | same | subject = the pitcher |
| WIN_STREAK_3/5/7 :323-:327, LOSE_STREAK_3/5/7 :328-:332, WIN_STREAK_BROKEN :333, LOSE_STREAK_BROKEN :334 (8 rows) | team streak thresholds | **detector already built:** `buildFranchiseFanMoraleStreakEffects` (`franchiseFanMoraleStreakFormula.ts:159`, all 8 types typed :5-13) — currently consumed only by the legacy `franchiseRandomEventGenerator.ts` | NEW streak sub-tap in the same pCG module, fed from completed-game history for the two teams | needs season game-36+ coverage in verification (smoke misses it — see §4) |
| PLAYER_HOT_STREAK :387 / PLAYER_SLUMP :390 | per-player recent form | per-player recent game logs (archived `playerGameStats`); L10 already emits hot_streak/slump placeholders from TV `valueDelta` signal (`franchiseL10SweepCompute.ts:143-145`) | same pCG tap; reuse the L10 `normalizePerformanceSignal` threshold as the detector | thresholds = SIM-TUNE |
| CLUTCH_HIT :391 / CLUTCH_OUT :394 | high-leverage PA result | `gameState.playerWpaTotals` + leverage (clutch attribution live on pCG path) | same | fire for the game's top clutch swing above a threshold |
| BLOWN_SAVE :395 / GAME_SAVING_PLAY :398 | fame events | `gameState.fameEvents` (channel is SPARSE — ORPHAN_WIRING_MATRIX §14) | same | wire now; fires when events present; inherits the fame-events persistence fix (separate owned ticket) |
| ROOKIE_BREAKOUT :401 / ROOKIE_STRUGGLE :404 | rookie perf | rookie flag on franchise player + same perf signal | same | |
| TEAMMATE_INJURY :408 | fitness → HURT | franchise fitness is settable via `saveFranchiseFitness` (`mojoFitnessStorage.ts:74`, `franchise:<id>` scope :64-71) | dispatch at the fitness-set seam (NOT pCG) — the one W2a row on a different surface | subject = injured player; `clubhouse` ripple via W1.2 |
| CAPTAIN_BIG_GAME :421 / CAPTAIN_SLUMP :424 | captain's own game | `team.captainPlayerId` (pCG:772-775) × the same WPA/perf signals | same pCG tap | `captain_teammate` ripple ×2 via W1.2/W1.3-adjacent router |
| RIVALRY_SWEEP :375 / SWEPT_BY_RIVAL :378 | series sweep vs rival | **MISSING input** — schedule has no series semantics (register §3.2 row 11) | derive "series" = consecutive scheduled games vs same opponent (`scheduleStorage` game numbers) + `areRivals` (`src/data/leagueStructure.ts:197`) / home-park rival | **flagged JK-fork by the register**; recommend build-the-derivation (no new user input) under the wire-all ruling; if JK declines, these 2 rows defer explicitly |

### Lane W2b — TRANSACTION / ROSTER-MOVE ROWS (tap surface: hub transaction commits; 11 rows + 1 new row) — size M
| Row | Trigger | Data source | Tap site | Notes |
|---|---|---|---|---|
| TRADE_ACQUIRE_STAR :335 / TRADE_LOSE_STAR :338 / TRADE_SALARY_DUMP :341 / TRADE_DEPTH :342 | manual trade commit | `TradeEvent` (salary impact + designation context already on it, `franchiseTradeAdapter.ts:580-600`) | trade execute path — the event self-documents `moraleMutationApplied: false` at `franchiseTradeAdapter.ts:224` (type) / :592 (built event) — flip to a real dispatch + set the field true | needs a small star/salary-dump/depth classifier (TV percentile + salary delta, both on the event); all-trades-MANUAL ruling respected (V1_CANON §6:192) |
| CALL_UP_TOP_PROSPECT :343 / CALL_UP_REGULAR :346 | call-up commit | `franchiseRosterMovement.ts` ledger event, `moraleMutationApplied: false` at :98 (type) / :269 (built) | roster-movement success path | top-prospect = scout grade/IV top-N of farm |
| **SEND_DOWN (NEW ROW)** | send-down commit | same roster-movement path | same | **matrix has no SEND_DOWN member** (`PlayerCentricMoraleEventType` :20-39) — add row + type member; required by V1_CANON §5:148 ("morale-tied demotion" IS v1); registered MISSING in SOT §3.2 |
| PLAYER_DFA :353 | DFA/release commit | roster-movement path (release kind) | same | |
| STAR_TO_IL :347 / STAR_RETURNS :350 | fitness HURT / recovery for a star | `saveFranchiseFitness` seam (`mojoFitnessStorage.ts:74`) — no IL system exists; HURT is the ruled analog | fitness-set seam (shared with W2a TEAMMATE_INJURY — build the seam once in whichever lane lands first, serialize) | star = TV/salary top-N |
| MANAGER_FIRED :411 | firing | `franchiseManagerFiring.ts:174-197` applies BESPOKE deltas via raw `applyFranchiseMoraleEffect`, never `composeMoraleConsequence` — the matrix row is dead weight (DRIFT, register §3.2 row 5) | route the firing ripple through an exact-delta matrix tap (the `exactSelfPlayerMoraleDelta` pattern, `masterMoraleMatrix.ts:95,699-712`) so the ledger reason-trail is matrix-uniform; L11 flag inherited | owned (ORPHAN §3 item 6) |
| TRADE_DEMAND resolution (not a new row) | trade of a demander | `franchiseTradeDemandStorage.ts:18` — status never set 'resolved'; a traded demander taxes his OLD team forever (SOT §3.8 row 4) | hook the same trade execute path: mark demand resolved + reset the flashpoint counter | rides the trade tap |

### Lane W2c — TENTPOLE / SEASON-ARC ROWS (tap surface: checkpoint + standings + season-end; 12 rows) — size M
| Row | Trigger | Data source | Tap site | Notes |
|---|---|---|---|---|
| PLAYER_MILESTONE :354 | milestone crossed | `aggregation.milestones` from `aggregateGameToSeason` (pCG:1297-1301) | small pCG sub-tap reading the aggregation result | |
| ALL_STAR_SELECTION :360 | AS lock (60%) | `runFranchiseAllStarLockPayouts` (`franchiseAllStarLockPayouts.ts:105`) already pays SNUB morale (:131 via `franchiseRaceSnubMorale`) but never the SELECTEE row (register §3.2 row 7) | one dispatch inside the existing payout loop | L12 flag inherited |
| WEEKLY_AWARD :357 | weekly award | **MISSING system** — no weekly award exists anywhere (register §3.2 row 12) | n/a | **DEFERS WITH ITS SYSTEM** (or JK rules "ride POG-of-the-week"); explicitly out of this wave unless ruled |
| LEAD_DIVISION :363 | first place taken | standings recompute after every game (MODE_2 §21) + L12 standings recompute (pCG:1461-1466) | standings-transition detector in the L12 recompute tap | fire on transition into 1st, not per-game |
| OPENING_DAY :373 | game 1 of season | schedule `gameNumber === 1` (resolver pattern pCG:846-861) | pCG tap, once per team per season | |
| ALL_STAR_BREAK :374 | AS lock tentpole | neutral row (0/0 deltas) | no dispatch needed — NEUTRAL-BY-DESIGN | record in the lane test as intentionally inert |
| EXPECTED_WINS_UPDATE :381 / NATURAL_DRIFT :382 / SEASON_ASSESSMENT :383 | system rows | neutral rows (0/0) — exist so `FanMoraleEventType` unions don't fall through | no dispatch needed — NEUTRAL-BY-DESIGN | " |
| CLINCH_PLAYOFF :364 / CLINCH_DIVISION :367 / ELIMINATED :370 / CHAMPIONSHIP :384 | playoff-race state | playoffs engine | n/a | **DEFER WITH PLAYOFFS** (JK Decision E + V1_CANON §6:202 carve-out; register §3.2 row 13) — 4 rows, no v1 action |
| Season-end snub leg port (not a new row) | season completion | the awards-snub morale second caller is stranded on unrouted `FranchiseHome.tsx` (isSeasonOver trigger :3253-3261, chain calls :3272/:3312 per register §3.2 row 6) | port the season-complete effect into the routed `FranchiseLens` path (`useFranchiseLensData.ts`) — same fix as the known fame-honors stranding (owned, §3.7 row 1) | coordinate with the L12 finalize-chain ticket; the morale wave only asserts the snub/honoree morale legs fire |
| race.win WINNER morale row (NEW ROW, optional-in-wave) | race/honor resolution | honors payout sites (register §3.7 row 7: snub wired, winner boost MISSING everywhere) | add a `race.win` event row + dispatch at the two payout sites | small; recommend in-wave since it touches the same payout files as ALL_STAR_SELECTION |

**Row accounting:** W2a 29 + W2b 11 + W2c 12 = 52 (of which: 4 defer-with-playoffs, 1 defers-with-missing-system (WEEKLY_AWARD), 2 JK-fork (RIVALRY_SWEEP pair), 4 neutral-by-design no-ops; 2 NEW rows added: SEND_DOWN, race.win). Everything else dispatches from data already on the GameTracker/hub pipeline — the wire-all ruling's premise verified above per row.

---

## 3. LANE W3 — FAN-MORALE COMPLETION — size S/M

1. **2× home-park-rival amplifier (RULED 2026-07-08, V1_CANON §6:205 — the wired starting point, §16-tunable).** Current state (register §3.1 row 5 + §3.6 row 2): `fanMoraleEngine.ts:405` `rivalMultiplier: 1.5` applied only via static division `vsRival` (`areRivals`, `leagueStructure.ts:197`) in `createGameMoraleEvent` (:977-1019, rival branch :1014); the home-park-rival engine is live (`franchiseHomeParkRivalCompute.ts:44` single-directional sticky rival; pre-game snapshot already captured at pCG:1347-1362 as `preGameHomeParkRivals`). **Build:** thread `preGameHomeParkRivals` into `persistDarkChannelAFanMoraleForCompletedGame` (pCG:1034, called :1402) and when the opponent IS the team's home-park rival, apply a 2.0× fan-swing multiplier (named SIM-TUNE constant `HOME_PARK_RIVAL_FAN_SWING_MULTIPLIER = 2.0`) in place of the generic 1.5×. The flat grudge rows (RIVAL_GAME_WIN/LOSS, matrix :171-172/:427-428) stay as-is — the 2× ruling targets the fan swing.
2. **Tooth #2 — flashpoint decay must BITE.** `franchiseFlashpointDecayCompute.ts` header :15-18 self-documents "does NOT mutate any fan-morale snapshot"; the accumulator runs at pCG:1394-1400 under `isFranchisePhase2FlashpointEnabled`. **Build:** after accumulation, apply the per-game tax to the team-fan ledger via `applyFranchiseMoraleEffect` (idempotent per game via the same checkpoint-keyed sourceEventId pattern). Gate: flashpoint AND morale flags.
3. **Four-teeth status (LSD §13:225-229):** Tooth 1 (dampener) — **WIRED-DARK, done**: `fanMoraleDampener.ts:19-31` consumed by `ratingsDevelopment.ts:176` inside the checkpoint sweep, which already reads team-fan morale from the ledger (`franchiseCheckpointSweepCompute.ts:423-429`); no work. Tooth 2 — item 2 above. Tooth 3 (indirect via player morale) — **BUILT in-matrix** (`calculateFanMoraleLink`, matrix :756-767, personality-scaled per §13:228); it fires on every composed row, so its reach scales automatically with W2. Tooth 4 (rebrand circuit-breaker) — **OWNED ELSEWHERE**: engine chain complete (`franchiseRebrandApply.ts:246-250`) but `getRebrandOffer`/`acceptRebrandOffer` have zero live callers; the GM-offer UI is the already-owned ORPHAN §11 ticket, NOT this wave; W3 only records the dependency.
4. **Supporting teeth (small, in-wave):** reporter-intensity hookup — `computeReporterHeat` (`reporterIntensity.ts:47-67`) built, live reporter hardcodes 'medium' (register §3.9 row 3): one read at reporter activation. GM hot-seat sustained-low mandate (register §3.9 row 4, DRIFT) — recommend ratify-the-event-roll reading (defer build); flag to JK in the lane report, do not build unless ruled.
5. **Adjacent, NOT in wave (recorded so the contract doesn't re-scope):** "Wants Out" hub panel feed (display layer), Ambition-semantics + Droopy-asymmetry prose questions (both §16 Simulation-Gate calls, register §3.9 rows 5-6).

---

## 4. TEST / GATE STRATEGY (per lane)

**Every lane, in order:**
1. `npm run build` exit 0.
2. Targeted unit suites: `src/engines/__tests__/masterMoraleMatrix.test.ts`, `src/utils/tests/franchiseMoraleState.test.ts`, plus the per-tap suites of every touched module (each existing dark tap has one; new taps ship with one). W1 adds: resolver unit tests (per-relation), captain-router activation tests, REL-8 threshold-shift tests (formation engine is pure — cheap), read-back redirect tests on the three sweeps.
3. **Full vitest gate, serialized** (count/copy flips hide in fixtures — full-surface rule). Do not run two lanes' full gates concurrently.
4. **L-SIM legs (flags-ON via `forceAllPhase2FlagsOn`, `test-utils/lsim/flags.ts:10`):**
   - Per-lane smoke: `NODE_ENV= npx vitest run -c test-utils/lsim/smoke.config.ts` (24g).
   - W2a additionally REQUIRES a season leg — streak rows (WIN/LOSE_STREAK_5/7) and LEAD_DIVISION transitions can't trip inside 24 games (smoke misses game-36+ trips, known gap).
   - **Baseline-regeneration cadence trap:** the season scenario (`test-utils/lsim/seasonRunner.scenario.ts` via `season.config.ts`) WRITES the canonical baselines — run the **default 60g leg LAST** in every lane's verification, after any non-default leg, or the anchor corrupts.
   - Read the SUMMARY JSON (`test-utils/lsim/results/`), never the exit code alone; new soul invariants for newly-fed rows go in `test-utils/lsim/invariants/soul.ts` (per-tier thresholds; beware cross-ticket invariant staleness — a later lane's new ledger rows can trip an earlier lane's stale assertion once, fix the assertion not the row).
   - No new own-DB stores in this wave ⇒ no `DB_NAMES_TO_DELETE` sandbox additions and no trackerDb version-pin updates needed; assert this in each lane's report.
5. **Zero-new-reds known-flakes list:** `historicalArchetypes.test` flakes in big batches (re-verify solo before calling it red) · wiring any NEW module import into `processCompletedGame.ts` breaks partial-mock tests at module load (fix = test-only mock stub in the affected suites, established pattern) · `franchiseSeasonLedgerStorage.test` pins TRACKER_DB_VERSION + store list (should not fire — no store changes) · franchise hub user-facing copy is D11-test-locked (W3 touches no copy; keep it that way).
6. **W1 extra gate:** because W1.1 changes what checkpoint/traits/L10 READ, expect legitimate baseline drift in L-SIM development distributions — regenerate baselines once (60g leg LAST) and document the delta as the read-back landing, not a regression.

---

## 5. SEQUENCE, SIZES, COLLISIONS

| Order | Lane | Size | Content |
|---|---|---|---|
| 1 | **W1 KEYSTONES** | **M** | ledger read-back (3 sites) + otherTouched resolver/API widen + captain-router activation + REL-8 composite/threshold shift + legacy-writer guard |
| 2 | **W2a game-event rows** | **L** | 29 rows on the pCG per-game surface (+ fitness-seam TEAMMATE_INJURY) |
| 3 | **W2b transaction rows** | **M** | 11 rows + SEND_DOWN row on trade/roster/firing/fitness commits + trade-demand resolution |
| 4 | **W2c tentpole rows** | **M** | 12 rows on checkpoint/standings/season-end surfaces + season-end port coordination + race.win row |
| 5 | **W3 fan-morale completion** | **S/M** | 2× home-park amplifier + flashpoint apply + reporter-intensity + teeth status |

**Serialization constraints (file collisions):**
- `franchiseMoraleState.ts` (API widen) is W1-only — **W1 strictly first**; every W2 lane consumes the widened API.
- `processCompletedGame.ts` is touched by W2a, W2c, and W3 (Channel A + flashpoint region) — **serialize W2a → W2c → W3**; do NOT run them as parallel worktree lanes against pCG (shared-branch commit-atomicity rule applies if a lane must overlap).
- `masterMoraleMatrix.ts` row/type additions: W2b (SEND_DOWN) and W2c (race.win) both edit the table — serialize (already sequential above).
- The fitness-set seam is shared by W2a (TEAMMATE_INJURY) and W2b (STAR_TO_IL/RETURNS) — build the seam once in W2a, W2b consumes.
- W2b and W2c are file-disjoint from each other EXCEPT the matrix table — safe to compress if a second Codex lane is available, provided the matrix edit is assigned to exactly one.
- The M-L matchup-engine lane (separate contract) slots with/immediately after this wave and hard-depends on W1.1 (V1_CANON §6:210).

**Out of scope for this wave (defer with their systems):** CLINCH_PLAYOFF / CLINCH_DIVISION / ELIMINATED / CHAMPIONSHIP (playoffs, Decision E) · WEEKLY_AWARD (no weekly-award system) · rebrand GM-offer UI (owned ORPHAN §11) · L10 confirm/apply pipeline + catalog holes (owned separately under the same full-wiring ruling — a sibling lane, not this wave) · the 8-dark-emission-kinds reporter wave (owned) · production flip surface for the flags (launch blocker, not a wiring blocker).
