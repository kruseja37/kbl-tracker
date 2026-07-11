# Observer / Living-Season Groundwork Brief — 2026-07-11

**Status:** RULED by JK 2026-07-11 — see §5. Build day in progress.
**Sources:** Eight two-survey reconciled lane reports (A–H), each claim source-verified at `main` 90c971be.
Raw reports archived at `~/Projects/kbl-tracker-observer-groundwork-2026-07-11/` (final reports extractable
from the tail of each `reconcile-*.log`). Captain independently re-verified the headline claims 2026-07-11.

Lane map: A = narrative/news machinery · B = soul systems (fame/morale/relationships/L10-L13) ·
C = data histories & persistence · D = UI surfaces & mounting points · E = GameTracker event spine ·
F = franchise lifecycle & time · G = player development & economy · H = WAR/aggregation/L-SIM.

---

## 1. The reconciled picture (verified)

### What is strong and trustworthy today
- **The event spine.** Fully tracked games persist per-at-bat records with before/after state, LI, WP,
  WPA, runner outcomes, plus fielding and between-play ledgers (E). This is the canonical
  "big moment" source (H-impl 1).
- **True Value trajectory.** A real per-game snapshot series (TrueValue, value delta, WAR percentile)
  writes after every processed tracked game — the strongest ready-made player-trajectory feed (C, G).
- **Morale history.** Append-style event history (prev/current/delta/reason/source/actor/time) inside
  the snapshot — observer-ready when effects occur (B, C, G).
- **Transaction ledger.** Durable unique event rows; the authoritative roster-movement feed (the Lens
  "Wire" is NOT — see bug list) (G).
- **WAR family.** bWAR/pWAR/fWAR/rWAR live, recomputed league-wide per completed game, persisted (H).
- **Scope identity.** Franchise games carry `franchiseId + seasonId + statsScopeId`; playoff ingestion
  validates scope; regular-season ingestion does NOT (H — ruling 9c).

### The three headline gaps
1. **Player development computes changes but never applies them.** Ratings and trait sweeps (default-off)
   write `pending` proposals; the two apply functions (`applyConfirmedTraitOverlay`, ratings
   `confirmOverlay`) have **zero production callers** (captain re-verified). The CheckpointTakeover's
   "mark entered" checkboxes are local React state only — they persist nothing. Meanwhile the Lens
   player drawer displays every pending proposal as "Earned/Lost" — untruthful (G).
2. **The wire/news system has no live home.** Default emission config = zero SeasonNews. Of 7+ news
   adapters, only the L12 All-Star-honors seam is production-reachable (behind its default-off flag);
   the rest are dark or their callers live in unrouted FranchiseHome (A). Three narrative stacks exist;
   the legacy template narrator still executes at game end but its output is neither rendered nor
   persisted (A).
3. **Time is game-count, not calendar.** Authoritative order is `gameNumber`; `dayNumber` is a native
   grouping unit; `date`/`time` are optional user strings. The fictional `calendarEngine` has zero
   importers (captain re-verified). The `gamesPlayed/6` week counter misses score-only/skipped games (F).

### Other load-bearing structural facts
- **Soul systems are all default-OFF and activation is app-global + dev-console-only.** A default
  install runs no fame, morale, relationships, traits, ratings dev, L10, L11, L12, L13 (B, G).
  "No event" may mean "system OFF."
- **No live season finalization.** All `markSeasonComplete` / freeze / awards / honors triggers live in
  unrouted `FranchiseHome`. The routed Lens score-only/skip handlers just update the schedule row.
  Season N→N+1 transition is likewise unreachable, and half-built if invoked (F).
- **Three game-resolution classes.** Fully tracked (full evidence) / score-only (team result +
  standings only, no player evidence) / skipped (schedule state only). Standings merge tracked +
  score-only (C, E, F).
- **Season Summary is disconnected.** No live Lens link; playoff CTA broken (`?tab=bracket` unread);
  persisted-summary creation not wired into the live route (D).
- **Pending vs applied is a pervasive state distinction.** L10 overlays and trait/ratings proposals are
  pending; L10 trade demands inconsistently create active records immediately (B).

### Verified broken upstream truths (observer would inherit lies)
| Defect | Lane |
|---|---|
| Season counting milestones can never fire (totals written before detection; prev==current) | C, H |
| Milestone-generated fame never merges into the archived game | C, H |
| Career WAR fields never advance (season-to-career function has no caller) | H |
| Franchise firsts / franchise leaders storage = stubs returning `null` | C, E, H |
| Stadium records tap runs one completion late (reads archive before current game archived) | H |
| Player-morale → development feedback broken (sweeps read stale `player.morale`, not the snapshot) | G |
| Ordinary fame accumulation never ratchets reach floor (writer copies old floor) | B |
| `PITCHING_APPEARANCES` ledger has no production writer; `generateBoxScore` reads it (dead path, empty pitching lines) | E |
| Fame events flattened at game level with no PA link (inning/half stamped at serialization = unsafe join) | E |
| Regular-season ingestion doesn't reject `seasonId`/`statsScopeId` disagreement | H |
| Non-atomic season aggregation (partial-apply risk on late failure) | H |
| Exhibition games can aggregate into generic season stats | F |
| Sync/save-slot registry drift (3 stores missing from SYNC_REGISTRY; manifest stale) | F |

### Plain UI bugs (no ruling needed — fix-queue candidates)
- Wire hides all roster moves until the first trade (`buildTradesVM` early-return) (G).
- Trait proposals can't appear in the checkpoint takeover (`trait-grant-N` vs `checkpoint-N` ID mismatch) (G).
- Takeover hardcodes "Checkpoint N of 5" / N×20% — wrong under frequent-10 cadence (G).
- Lens duplicates the same SeasonNews rows into both `stories` and `wire` (A).
- Lens morale trend hardcoded to `flat` (B).
- `UI_TRUTH_MAP.md` stale ×3 (Lens cutover, Manifest row, preview gating) (D).

---

## 2. Ruling worksheet for JK

Each ruling: the fork, then the captain's recommendation (REC).

**R1. The master switch.** Soul systems are dark for real players.
(a) Should activation become per-league and player-facing (vs one global dev switch)?
(b) Which systems ship ON by default for v1: fame, morale, relationships, ratings dev, traits, L10
random events, L11 firing, L12 races/All-Star, L13 flares?
REC: per-league, player-facing at franchise setup with a sensible "full soul" default preset; ship ON:
fame, morale, relationships, L11, L12, ratings/traits *only after R2 closes the loop*; L10 opt-in.

**R2. Close the development confirmation loop (headline #1).**
(a) Make the CheckpointTakeover the authoritative confirm/apply action (per the two-tier confirmation
spec), wiring `confirmOverlay` + `applyConfirmedTraitOverlay`?
(b) Until applied, should pending proposals be invisible, or shown as clearly-labeled rumors/proposals?
(c) Traits: keep checkpoint cadence (current code) or move to spec's continuous cadence?
REC: (a) yes — takeover confirm becomes real; (b) show as "proposed" only inside the takeover, never in
the drawer as Earned/Lost; (c) keep checkpoint cadence for v1, amend the spec.

**R3. Repair-before-observe.** Which broken truths must be fixed before observer stories publish?
REC: repair now: season-milestone ordering, morale→development seam, fame reach-floor ratchet, stadium
one-game lag, Wire/trait-ID/label UI bugs. Formally retire (observer reconstructs instead):
`PITCHING_APPEARANCES`, `generateBoxScore`, legacy narrator, calendarEngine, franchise-firsts stubs
(rebuild later as one typed record ledger — see R9).

**R4. Season lifecycle.**
(a) Should the live Lens finalize the season when every schedule row is completed-or-skipped, via one
idempotent transaction-like service (not React effects)?
(b) Are skipped games sufficient to end a season?
(c) Season Summary: restore as a first-class Lens destination with working persistence + playoff link?
REC: (a) yes; (b) yes — completed-or-skipped for every row; (c) yes, it's the natural season-end
observer anchor.

**R5. Where the observer lives.**
REC (from D's mounting-point inventory): passive Clubhouse digest block (lowest cost, first delivery) +
narrative pieces into Tootwhistle Times + durable archive via the Almanac Reporter Archive (fixing its
franchise/season scope hole so MOVES/park records appear). Moments takeover reserved for
action-required events only (checkpoint confirmations). No unread/seen infrastructure in v1 — a fresh
computed digest per visit.

**R6. Evidence rules.**
(a) Score-only games: team-level digest lines ("A beat B 7–3"), labeled, no player claims?
(b) Skipped games: invisible except season-progress accounting?
(c) System OFF: section reads "not tracked this season" vs omitted?
(d) Exact-state history (races, awards preview, All-Star churn) needs new snapshot stores — add small
stores where stories need "moved 3rd→1st" copy, or accept replay-derived facts labeled as such?
REC: (a) yes; (b) yes; (c) "not tracked" marker — silence reads as emptiness; (d) add snapshot stores
only for merit races + awards preview + All-Star churn; everything else replay-labeled.

**R7. Time & cadence.**
REC: digest keyed to resolved `dayNumber` ("Game Day" digest) plus a separately labeled
since-last-visit recap; never the `gamesPlayed/6` counter; no fictional calendar in v1.

**R8. Voice, quotes, fallibility.**
(a) Reporter fallibility: modern stack is factual-only; the fibbing machinery is invisible legacy code.
Keep factual, or rebuild fallibility deliberately?
(b) Quotes/interviews: no schema exists. v2 with a grounded speaker/facts contract, or v1?
(c) Retire the legacy template narrator (executes, output discarded)?
REC: (a) factual-only for v1 — personality through tone, not errors; (b) v2; (c) retire.

**R9. Definitions the observer needs ruled.**
(a) Official WAR = persisted game-end rows (leaderboard recompute = display-only)?
(b) Manager value = deployment WPA only (already the STEP1 contract — confirm for observer copy)?
(c) "Hot/slump" = real rolling-window performance with opportunity floors (current L10 naming is
morale-biased random, not a stat)?
(d) "Game completed" for observer purposes = stage 1 (archive+stats durable), with stories arriving
later as stage 2?
(e) Fail closed on `seasonId`/`statsScopeId` disagreement at regular-season ingestion?
REC: yes to all five.

**R10. News/wire strategy (headline #2).**
Should the v1 digest be built on deterministic facts read directly from stores (LLM SeasonNews as
optional garnish, enabled per event family), rather than making the LLM pipeline load-bearing?
REC: yes — deterministic digest first; the LLM layer stays optional + per-family; `perEventRate`
renamed/reworked as a simple on/off (it is not a rate today); L12 honor emission moved from unrouted
FranchiseHome into the live completion/finalize path.

---

## 3. Deferred / explicitly out of v1 (flagged, no ruling urgency)
- Season N→N+1 rollover policy (mojo/morale/fame floors/contracts carryover) — v1 ends at regular season.
- Body evolution (no model exists), FARM in-season development, trade deadline (dead setting + dead
  helpers), injury automation (manual by design today), Juiced automation.
- Multi-season drift + real-export ingestion in L-SIM (already documented as deferred).

## 5. JK RULINGS — 2026-07-11 (binding)

- **R1 (master switch): YES** — per-league, player-facing activation, "if now's the right time" (captain: it is; sequenced after R2/R3).
- **R2 (confirmation loop): YES, AMENDED — the console-mirror model.** The user makes the actual
  ratings/trait changes in the SMB4 console for gameplay; the app's confirmation step exists so the
  app's state MIRRORS the console. Confirm = "I entered this in SMB4" → app applies the same change to
  its own player record so the next checkpoint iterates from true current state. Requirements:
  (a) an easy confirmation log UX; (b) user can REJECT any proposed change (bug guard);
  (c) full change history kept — hidden from the main flow but easy to find.
- **R3 (repair-before-observe): YES** — repair list + retirement list as recommended.
- **R4 (season lifecycle): DEFERRED** — intentional. End-season machinery finished later, once the
  in-season layer is pristine; JK will return to it after the season starts.
- **R5 (observer home): YES** — Clubhouse digest + Tootwhistle + Almanac archive shape.
- **R6–R10: YES** — captain recommendations stand as ruled.
- **NEW RULING — real dates:** stamp the actual real-world date on a game when it is scored, so the
  engine knows what day it is and reporters can say "on July 11" instead of "game #47." No fictional
  calendar; real dates only.
- **Priority directive:** this thread owns living-season v1 (Mode 2 / Franchise). Goal: fully
  functional per spec, sim-tuned (~100 knobs across interacting engines), maximal truth. Codex 5.6 Sol
  is standing sparring partner; mutual work-checking throughout. Other threads own legends library +
  snake draft.
- **Sequencing answer (JK asked):** sim-tuning comes BEFORE the production flag flip. L-SIM forces all
  flags ON inside its sandbox; we tune there, flip for real leagues only after invariants + tuning
  targets pass, then JK's browser walk is the acceptance gate.

## 6. Build plan of the day (2026-07-11)

- **Phase 0 — full tuning-surface inventory** (delegated): every tunable constant across the
  living-season engines → `spec-docs/LIVING_SEASON_KNOBS.md`. Structural/wiring understanding is
  already comprehensive (8 verified lanes); the knob catalog is the missing piece.
- **Phase 1 — truth repairs (R3):** milestone ordering, morale→development seam, fame reach-floor
  ratchet, stadium one-game lag, real-date stamping, and the six UI truth bugs (Wire early-return,
  trait-ID mismatch, N-of-5 label, pending-shown-as-Earned, stories/wire dup, flat morale trend).
- **Phase 2 — confirmation loop (R2 console-mirror):** takeover confirm/reject becomes real; applies
  overlays via the existing (currently orphaned) appliers; change-history ledger surface.
- **Phase 3 — master switch (R1):** per-league activation with a "full soul" preset at franchise
  setup; L12 honor emission moved into the live completion path.
- **Phase 4 — sim-tune:** L-SIM 60-game legs with the knob catalog; iterate until invariants + feel
  targets pass.
- **Phase 5 (stretch/next) — Game Day digest (R5/R10):** deterministic digest on Clubhouse +
  Tootwhistle + Almanac archive.
- Ship as branch-per-slice PRs; builder/auditor triangle enforced; JK browser walk = sole acceptance.

## 4. L-SIM acceptance rails for observer work (from H)
- 60-game full leg required for accumulation claims; 24-game smoke is preflight only.
- A new observer store needs: snapshot loading/types, store-digest inclusion, deterministic scenario
  data, invariant, falsification case — not just an invariant registration.
- Synthetic L-SIM ≠ GameTracker fidelity: add one real tracked-game journey to acceptance.
- New stores hit the five registries (trackerDb version, backup, SYNC_REGISTRY, per-write sync,
  save-slot manifest) + L-SIM sandbox delete-list; note existing drift (§1) before adding anything.
