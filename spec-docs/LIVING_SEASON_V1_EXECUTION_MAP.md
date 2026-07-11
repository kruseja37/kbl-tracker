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
| 5 | HUNTFIX-1..n: confirmed hunt findings not covered by slices 1-4, batched by file surface | ⏳ after hunt | QUEUED |
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

## 4. Verification gates (every slice)
Build exit 0 → FULL vitest (read summary; two known solo-green flakes are baseline) → proving tests
per defect (fail-before/pass-after) → L-SIM smoke in-memory compare (canonical baselines regenerate
ONLY via the default-leg-last discipline) → builder≠auditor adversarial audit → branch PR to main.
Slice 3 adds: the 7-step loop-closure proof. Slice 6 adds: baseline + sensitivity artifacts committed.
Final gate for the whole program: 60-game L-SIM leg green + JK browser walk (sole acceptance).

## 5. Today's cut line (Sol-agreed)
Must land: 1, 2, 3, 4. Should land: 5 (confirmed criticals at minimum), 6.
Stretch: 7. Explicitly not today: 3B flip, digest, finalize/rollover.
