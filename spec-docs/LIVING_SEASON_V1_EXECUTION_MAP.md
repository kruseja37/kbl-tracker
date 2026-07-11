# LIVING SEASON V1 — EXECUTION MAP (2026-07-11)

**Status: DRAFT v1 — hunt results + Sol cross-exam pending; sections marked ⏳ will be finalized today.**
Authority chain: JK rulings (`OBSERVER_GROUNDWORK_BRIEF_2026-07-11.md` §5) → this map → slice contracts.
Inputs: 8 reconciled survey lanes · captain deep pass (`CAPTAIN_DEEP_PASS_2026-07-11.md`) · 12-lane
adversarially-verified quirk hunt (⏳ running) · knob registry (`LIVING_SEASON_KNOBS.md`) · Sol peer
review rounds 1-2 (accepted revisions logged in brief §6 + below).

## 0. Definition of done (v1 living season)
A season played through the routed Lens with the soul systems ON is TRUE everywhere a user can look:
1. Every completed game's soul processing either succeeded, is honestly marked failed/pending, or the
   system was off — never silently absent (outcome ledger).
2. Development proposals flow: sweep → takeover (correct labels) → user confirms/rejects against the
   SMB4 console → app state mirrors console → next checkpoint iterates from true state → change
   history browsable.
3. No UI surface displays a value whose source contradicts another surface (cohesion matrix below all
   green).
4. The ~134-knob tuning surface has explicit targets, an L-SIM baseline, and a sensitivity ranking;
   flags flip for real leagues only after the tuning gate + JK browser walk.

## 1. Slice sequence (Sol-revised, JK-ruled)

| # | Slice | Contract | State |
|---|---|---|---|
| 0A | Authority patch (brief committed, context card + roadmap overrides, V1 status entry) | — | **DONE** (3085170d) |
| 0B | Knob registry | — | **DONE** (acd88579); targets column ⏳ (slice 6) |
| 1 | KERNEL-TRUTH-1: completion-pipeline truth kernel (A-H incl. archive-early + outcome ledger, scope rejection, civil dates) | CONTRACT_KERNEL_TRUTH_2026-07-11 | **BUILDING** (codex/living-kernel) |
| 2 | MIRROR-1: console-mirror schema + service (state machine, CAS, history reader, double-merge kill) | CONTRACT_MIRROR_1_2026-07-11 | WRITTEN, HELD until deep-pass/hunt merge confirms scope |
| 3 | FIDELITY-1: L-SIM minimal bridge (synthetic games read current stored ratings + mojo×fitness; neutral + slump→recovery regimes; 7-step loop-closure proof). Acceptance language: proves CLOSURE, not final feel | ⏳ to write | QUEUED |
| 4 | MIRRORUI-1: takeover UI becomes real (confirm/reject/adjust per item, oldest-first, ordinal labels) + the UI-lies batch (Wire early-return, stories/wire dedup, morale trends, pending-vs-earned labels, checkpoint ordinal) — single lane, same file surface | ⏳ to write | QUEUED (after 1+2 merge) |
| 5 | HUNTFIX-1..n: confirmed hunt findings not covered by slices 1-4, batched by file surface | ENGINE + TRACKER dispatched; KERNEL2 (result-context: 27-out CG + walk-off) queued post-KERNEL | BUILDING |
| 2b | MIRROR-1b: generators stamp expectedPriorValue/proposedValue at sweep time (strict CAS tier) — AFTER KERNEL merges (same files) | ⏳ | QUEUED |
| 6 | TUNE-0: tuning targets + L-SIM baseline + one-factor sensitivity ranking (deliverable = ranked knob shortlist + target table, NOT converged tuning) | ⏳ to write | QUEUED |
| 7 | SWITCH-3A: per-league activation, built default-off, migration choice for existing leagues, tuning-profile version snapshot | ⏳ to write | STRETCH (cut first if day slips) |
| — | 3B production default flip | — | NOT TODAY (after tuning gate + JK walk) |

Deferred by JK ruling: season finalize/rollover (R4), digest build (R5/R10 — after truth layer),
quotes/interviews (v2), career-WAR repair (suppress in copy now, repair ticketed).

## 2. Frontend ↔ backend cohesion matrix (the routed Lens, per surface)

Legend: ✅ true today · 🔧 fixed by slice N · ⏳ hunt may add rows · ❌ needs new slice.

| Surface (FranchiseLens/Hub) | Backend source | Truth state |
|---|---|---|
| Clubhouse pulse: clubhouse avg | `player.morale` (STALE field) | 🔧 slice 4 — must read canonical snapshots (deep-pass #4) |
| Clubhouse pulse: fan morale + trend | canonical snapshot; trend hardcoded flat | 🔧 slice 4 |
| Clubhouse impact cards / next game | schedule + standings | ✅ |
| Roster rows: WAR | `useSeasonStats` recompute (leaderboard path) | ✅ display-only; official WAR = persisted rows (R9a) — verify no drift surfaced by hunt ⏳ |
| Roster rows: salary/TrueValue/gap | player.salary + TV snapshots | ✅ (unit coherence ⏳ hunt) |
| Drawer: ratings bars | base + merged overlays | 🔧 slice 2 (exclude applied) + slice 4 (from/to display uses row's expectedPrior) |
| Drawer: traits + timeline | trait overlays UNFILTERED by status | 🔧 slice 4 (pending ≠ Earned/Lost) |
| Drawer: morale + history | canonical snapshot | ✅ |
| Drawer: fame (heat/reach/channels) | fame records; REACH_LABELS 6-slot vs |rank| ratchet | 🔧 slice 5 + JK ruling on reach-is-reach (deep-pass #9) |
| Drawer: milestones | GLOBAL career store, no franchise filter | 🔧 slice 5 (deep-pass #3 cross-save bleed) |
| Drawer: fitness (editable) / mojo chip | condition snapshots / player.mojo | ✅ manual-state truth (auto progression = post-v1 ruling) |
| Checkpoint takeover | pending overlays; ordinal = GAME NUMBER; checkboxes write nothing | 🔧 slices 2+4 (deep-pass #1 + known) |
| Tootwhistle stories/wire | SeasonNews duplicated into both | 🔧 slice 4 dedup; emission wiring = digest phase |
| Trades tab: cards + moves | transaction ledger; early-return hides moves until first trade | 🔧 slice 4 |
| Standings & races | calculateStandings (500-game cap) + WAR race scores | ✅ for v1 scale; cap fix ticketed with digest phase |
| Schedule tab | schedule manager (full CRUD) | ✅ |
| Stadium tab | park identity/factors; spray shells empty | ✅ honest-empty (event-driven fill = post-v1) |
| Playoffs tab | playoff stores | ✅ read-only view (playoffs deferred) |
| Almanac tab | season stats + museum | ✅ (museum empty until finalize — deferred with R4) |
| GameTracker: fame quick-events | hook-local ref; **undo never rewinds fame** | 🔧 slice 5 (deep-pass #19) |
| GameTracker: mojo/fitness in-game | direct setters + between-play events | ✅ manual truth |
| PostGame: stories | fire-and-forget async | ✅ with stage-2 semantics (R9d) |

## 3. Defect → slice routing (deep pass; hunt rows append ⏳)

| Deep-pass finding | Slice |
|---|---|
| #1 checkpoint ordinal = game number | 4 (+2 carries ordinal in schema) |
| #2 fame honor-bump idempotency hole | 1 audit note (branch-level SUCCESS skip covers; auditor must verify) |
| #3 milestone cross-franchise bleed | 5 |
| #4 pulse stale morale | 4 |
| #5 27-out no-hitter/shutout | 5 (innings-aware CG detection) |
| #6 walk-off mislabel | 5 (with #5, same function) |
| #7 fame decay → negative morale | 6 (tuning fork → JK) |
| #8 villainy gravity erosion | 6 (tuning fork) |
| #9 reach-floor |rank| ratchet | JK ruling + L-SIM invariant either way |
| #10 age gravity moves ratings at zero signal | 6 (explicit target) |
| #11 confidence denominator league-vs-team units | verify in 3/6; fix in 5 if real |
| #12 boundaries recompute from live totalGames | 5 (freeze boundary plan) or explicit non-goal |
| #13-18 minors | 5 batch |
| #19 undo never rewinds fame | 5 (GameTracker surface — fenced from slices 1-4) |

## 3b. HUNT RESULTS (2026-07-11, 78 agents, dual-opus verification) — adjudicated + routed

47 raw findings → **15 confirmed / 12 contested (captain adjudicated: 9 real, 2 latent-note, 1 legacy-
scope) / 6 refuted.** Full detail: workflow `wf_790afef0-e54` journal.

| Finding | Verdict | Slice |
|---|---|---|
| C15 fWAR positional adj ∝ 1/seasonLength (**critical**, live WAR) | confirmed | HUNTFIX-ENGINE E1 (dispatched) + dedicated opus math audit |
| C2 resolveFameTier hardcodes LOCAL_HERO, discards floor magnitude (spec §20.3 violation) | confirmed | E2 |
| C3 trait being lost still blocks gaining its opposite (lossNames filter missing) | confirmed | E3 |
| X2 WPA defensive budget dropped on SB/CS without fielder ids (conservation break) | confirmed | E4 |
| X4 flashpoint "consecutive" counter is cumulative (never resets) | confirmed | E5 |
| C14+X9 event-driven RIVALRY edges blindly overwritten (overtake + formation writers) | confirmed | E6 |
| X3 classifyFameVsMerit bust-branch uses magnitude (DESPISED → 'bust') | confirmed (dark) | E7 |
| X12 INNING_MULTIPLIERS dead code + knob registry wrongly lists LIVE | confirmed | E8 + registry corrected |
| C4 immaculate inning checks CUMULATIVE pitches ===9 (per-inning counter is dead code) | confirmed | HUNTFIX-TRACKER T1 (dispatched) |
| C5 D3K persists runsScored:0 while the score advances (self-contradicting archive row) | confirmed | T2 |
| C6 quick-error path: run lost + bases/tracker/score three-way desync | confirmed | T3 |
| deep-pass #19 undo never rewinds fame | confirmed | T4 |
| C1 27-out CG detection (DEFAULT config is 7 innings!) + deep-pass #6 walk-off mislabel | confirmed | KERNEL2 follow-up (same file as in-flight KERNEL — do not amend mid-build) |
| X5 L11 firing idempotency + deep-pass #2 fame honor-bump guard | **FLIPPED TO FIX-NOW (Sol r3):** the crash window between a durable side effect and its SUCCESS receipt is NOT covered by branch-level skip — a retried game can fire the SUCCESSOR manager. Fix = game-scoped execution identity + expected-manager CAS (L11); honor-bump advances `updatedAtCheckpoint` (fame). | KERNEL2 |
| deep-pass #11 confidence denominator (league totalGames passed as gamesPerSeason) | **CONFIRMED (Sol r3):** 6-team league → thresholds inflated 3× → development suppressed as league size rises. Fix with frozen `gamesPerTeam`. | KERNEL2 (checkpoint file) |
| T4 undo-fame design gaps (Sol r3): provenance must be DURABLE (refresh→undo loses hook-local tags); grouped undo returns only primary id; web-gem at-bat linkage needs a GameTracker.tsx seam; TWO fame accumulators (useGameState array + page useFameTracking) need reconciliation; +refresh→undo & elimination archive tests | accepted | T4-AMENDMENT on HFT re-dispatch (let T1-T3 land first) |
| E1 test spec sharpened (Sol r3): same participation RATE across 24/50/162, incl. G=S and G=0.5S; equal absolute games across unequal seasons must NOT equal WAR | accepted | HFE audit enforces |
| C7 pulse stale morale (= deep-pass #4), C8 checkpoint Math.max stranding, C9 rank tiebreak mismatch, C10 .500 copy, C11 hardcoded L10-of-10 column, C12 'Tonight' home-slot highlight, C13 fitness picker shows unpersisted state, X7 global trophy case bleed, X8 global ceremony bleed, deep-pass #3 milestone bleed | confirmed | MIRRORUI-1 (slice 4 — one lane owns Lens/Hub files) |
| X6 firing always yields positive fan relief even for content fans | mechanics confirmed | JK tuning fork (with deep-pass #7/#8/#9/#10) |
| X10/X11 gamesPlayed/6 week counter unit mismatch + score-only bypass | confirmed, legacy surface | already ruled do-not-use (R7); remove the display with Season Summary repair (deferred R4) |
| X1 batterHand:'S' park factors | latent (no L/R split exists in any ParkFactors today) | note only; ticket rides with park-factor work |

## 4. Verification gates (every slice)
Build exit 0 → FULL vitest (read summary; two known solo-green flakes are baseline) → proving tests
per defect (fail-before/pass-after) → L-SIM smoke in-memory compare (canonical baselines regenerate
ONLY via the default-leg-last discipline) → builder≠auditor adversarial audit → branch PR to main.
Slice 3 adds: the 7-step loop-closure proof. Slice 6 adds: baseline + sensitivity artifacts committed.
Final gate for the whole program: 60-game L-SIM leg green + JK browser walk (sole acceptance).

## 4b. JK RULING QUEUE — **ALL RULED 2026-07-11 (recommendations accepted)**

- **R-A RULED (a):** fame reach floor ratchets on POSITIVE tiers only; negative history rides the
  existing `wasNegative` flag. `updateReachFloor` → `max(current, max(0, heatRank))`. E2 merge
  unblocked; HFE gets a post-build amendment adding the ratchet-side change; "reach+sentiment" model
  booked v1.1.
- **R-B RULED:** decay-only fame deltas do NOT move morale — only event/WPA/honor-driven deltas feed
  the morale seam. → KERNEL2.
- **R-C RULED:** age gravity stays at ~current strength as an explicit TUNE-0 dial with trajectory
  targets.
- **R-D RULED:** firing a beloved manager (fan morale ≥ 50) yields zero/negative relief — backfire is
  real. → KERNEL2.

- **R-A (BLOCKS the E2 merge): what does faded notoriety look like?** Reach floor currently ratchets on
  |tier rank|, so a DESPISED villain (rank −3) whose heat cools would — after E2 correctly honors the
  floor — display as NATIONAL_ICON. Options: (a) floor ratchets on POSITIVE tiers only; negative
  impression tracked by the existing `wasNegative` flag (REC — smallest true model for v1);
  (b) separate reach-magnitude + sentiment fields (bigger, honest "famously infamous" model, v1.1);
  (c) keep as-is (villainy converts to fame — probably not intended).
- **R-B:** should fame DECAY alone (quiet-but-fine game) move player morale down? REC: no — only
  event/WPA-driven deltas feed morale.
- **R-C:** age gravity moves ratings ±0.8-1.0/checkpoint at ZERO performance signal (teens drift up,
  36+ drift down, every checkpoint). Intended age curve — but confirm the magnitude as a tuning target.
- **R-D:** firing a manager always yields POSITIVE fan relief (floor at base 4) even when fans were
  happy. REC: allow negative/zero relief when morale ≥ 50 (beloved-manager backlash).
- Blind-spot falsifiers (Sol r3) adopted into gates: fame-exactly-once ledger test, crash-window
  injection suite, unit-provenance invariance suite (team count × innings × season length) — land in
  FIDELITY-1/TUNE-0.

## 5. Today's cut line (Sol-agreed)
Must land: 1, 2, 3, 4. Should land: 5 (confirmed criticals at minimum), 6.
Stretch: 7. Explicitly not today: 3B flip, digest, finalize/rollover.
