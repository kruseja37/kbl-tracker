# Fame Integration Spec

**Companion to:** `BEAT_REPORTER_DATA_MODEL_SPEC.md`, `SPECIAL_EVENTS_SPEC.md`, `BEAT_REPORTER_VOICE_SPEC.md`
**Status:** Draft — v1 scoped to GameTracker + Exhibition + Elimination; Franchise documented but deferred
**Last Updated:** 2026-04-14

---

## 0. Purpose

Unifies the **two Fame concepts** (numeric Fame Score, editorial Fame Tier) and defines how they surface across modes (Exhibition, Elimination, Franchise) and UI surfaces (GameTracker, PlayerCardModal, Post-Game Summary, Franchise Home).

### The Two Concepts

| | Fame Score | Fame Tier |
|---|---|---|
| **Shape** | Numeric accumulator (int, can be negative) | Ordinal 1–5 |
| **Source** | Earned in-game per `SPECIAL_EVENTS_SPEC.md` (robberies, TOOTBLANs, walk-offs, etc.) | User-authored in League Builder; instance-override in franchise/elimination |
| **Mutates** | Automatically on event ingestion | Manually or via franchise-mode promotion suggestions |
| **Persists** | Per-game → season → career | On player (base) + instance override |
| **Purpose** | Achievement counter; MVP/All-Star voting; promotion trigger | Reputation/stature; shapes reporter tone & LI commentary weight |
| **Default** | 0 | 3 (Veteran) |
| **Spec** | `SPECIAL_EVENTS_SPEC.md` | `BEAT_REPORTER_DATA_MODEL_SPEC.md` §2 |

They **interact** but do not derive from each other:
- Fame Score earning during a franchise season *may suggest* a Fame Tier promotion (user approves or dismisses)
- Fame Tier *scales* commentary trigger thresholds (higher tier → routine moments can trigger coverage) but does NOT boost Fame Score earned

---

## 1. Prime Directive Recap

Per `BEAT_REPORTER_DATA_MODEL_SPEC.md` §0: the app ingests SMB4 reality. Neither Fame Score nor Fame Tier influences on-field probabilities, error rates, or game outcomes. Fame is a *lens* on observed play, not an input to simulation.

---

## 2. Current State (2026-04-14)

Per code audit:

### Fame Score — Backend complete, UI orphaned

| Layer | Status | Location |
|---|---|---|
| 67 FameEventType enum + FAME_VALUES | ✅ Wired | `src/types/game.ts:695–1075` |
| `useFameDetection` auto-detection hook | ✅ Wired | `src/hooks/useFameDetection.ts` |
| `fameIntegration` wrapper (LI/playoff multipliers) | ✅ Wired | `src/src_figma/app/engines/fameIntegration.ts` |
| `useFameTracking` React hook | ✅ Wired | `src/src_figma/app/hooks/useFameTracking.ts` |
| Per-game persistence (`gameState.fameEvents`) | ✅ Wired | `src/utils/gameStorage.ts` |
| Season aggregation | ✅ Wired | `src/utils/seasonAggregator.ts` |
| Auto-detection coverage | ⚠️ 6 of ~46 events | Perfect Game, No-Hitter, Maddux, Shutout, CG, +1 |
| In-game toast on trigger | ✅ Wired | `GameTracker.tsx` |
| PlayerCardModal Fame display | ❌ Orphaned | `getPlayerGameFame()` defined, never called |
| Post-Game Summary Fame section | ❌ Missing | — |
| `gameMode` threaded into Fame tracking | ❌ Not wired | GameTracker has it, hook doesn't receive it |
| Career rollup UI | ❌ Not surfaced | Aggregator exists |

### Fame Tier — Not yet implemented

Schema defined in `BEAT_REPORTER_DATA_MODEL_SPEC.md` §1.1 & §1.5. Implementation pending that spec's Step 1.

---

## 3. Mode × Surface Matrix

Complete vision across all three modes. **v1 implements Exhibition + Elimination only. Franchise documented for preservation of intent — do not implement in v1.**

### 3.1 Exhibition (v1 SCOPE)

**Purpose:** Storytelling / drama. Standalone games, no cross-game carryover. Fame is a reporter input and a post-game bragging reel.

| Surface | What shows |
|---|---|
| GameTracker in-game toast | Icon + event label + final Fame value (keep current behavior) |
| GameTracker Matchup Drama Bar | Fame **Tier** pips for batter & pitcher (see `BEAT_REPORTER_DATA_MODEL_SPEC.md` §7.5) |
| PlayerCardModal | Fame Tier pip row in header; **Game Fame** section (event list + running total) in body |
| Post-Game Summary | **Fame Leaderboard** card: top 3 Fame earners per side, with event breakdown |
| Cross-game career rollup | ❌ Exhibitions are standalone — no write to career totals |

### 3.2 Elimination (v1 SCOPE)

**Purpose:** Single-run tournament arc. Fame accumulates across the run and shapes storylines.

| Surface | What shows |
|---|---|
| GameTracker in-game toast | Same as exhibition |
| GameTracker Matchup Drama Bar | Fame Tier pips + ⭡ promotion-earned hint if player has crossed a tier threshold mid-run |
| PlayerCardModal | Game Fame + **Run-to-date Fame** total |
| Post-Game Summary | Fame Leaderboard + **Run Standings** mini-table (cumulative Fame across elimination games in the run) |
| Tier promotion | Game-end suggestion banner if any player crossed threshold; user-accept writes to `fameOverride` for this elimination instance only |
| Cross-instance career rollup | ❌ Run-scoped only |

### 3.3 Franchise (DOCUMENTED — DO NOT IMPLEMENT IN v1)

**Purpose:** Long-form. Fame Score drives season leaderboards, MVP/All-Star voting (per `SPECIAL_EVENTS_SPEC.md`), and tier promotions. Career-level aggregation.

> ⚠️ **v1 implementation scope explicitly excludes all Franchise-mode Fame surfaces below.** They are specified here to preserve design intent and prevent scope drift during later phases. Do not build these in v1 even if tempted by adjacency.

| Surface | What shows |
|---|---|
| GameTracker in-game toast | Same |
| GameTracker Matchup Drama Bar | Fame Tier pips using effective (instance-override) fame |
| PlayerCardModal | Game Fame + **Season Fame** + **Career Fame** |
| Post-Game Summary | Fame Leaderboard + **Season top-10** mini-table |
| Franchise Home → new **Fame Hub** tab | Season leaders, career leaders, suggested tier promotions, Fame history by player |
| Season rollup screen | Tier promotion suggestions surfaced at season end |
| Career rollup | Aggregates to cross-season career Fame via existing `milestoneAggregator` |
| All-Star / MVP integration | Fame Score feeds voting weight per existing `SPECIAL_EVENTS_SPEC.md` |

---

## 4. Tier Promotion Rules (applies to Elimination v1; Franchise deferred)

Thresholds from `BEAT_REPORTER_DATA_MODEL_SPEC.md` §2.4, refined:

| Transition | Threshold (Fame Score earned in scope) |
|---|---|
| Prospect (2) → Veteran (3) | 30 |
| Veteran (3) → Captain (4) | 80 |
| Captain (4) → Superstar (5) | 150 |
| Unknown (1) → Prospect (2) | 10 |

**Scope:**
- Elimination: Fame earned during this run
- Franchise (deferred): Fame earned this season, with career totals also tracked for milestone references

**Behavior:**
- Crossing a threshold never auto-promotes
- Suggestion surfaces at end of elimination game / end of franchise season
- Dismiss = no change; Accept = writes `fameOverride` to the instance
- Baseline (League Builder) is NEVER auto-mutated

**Demotion:** Not supported in v1. Fame tier only suggests increases. A user can manually downgrade any player at any time via League Builder or the Fame Board.

---

## 5. Component Additions

### 5.1 `<FameEventToast />` — EXISTING, reuse
Already wired in GameTracker. No changes for v1 beyond visual polish to match dark chalkboard theme if not already aligned.

### 5.2 `<FamePip />` — NEW
Per `BEAT_REPORTER_DATA_MODEL_SPEC.md` §7.4. Pure visual primitive; size prop (sm/md/lg). Used everywhere fame tier is shown.
- File: `src/src_figma/app/components/FamePip.tsx`

### 5.3 `<PlayerFameSection />` — NEW
Rendered inside PlayerCardModal. Mode-aware:
- Exhibition: Game Fame events + total
- Elimination: Game Fame + Run-to-date total
- Franchise (deferred stub): Game + Season + Career

Reads from: `getPlayerGameFame()` (already exists, orphaned — finally call it) + new `getPlayerRunFame(runId)` helper.
- File: `src/src_figma/app/components/PlayerFameSection.tsx`

### 5.4 `<FameLeaderboardCard />` — NEW
Rendered in Post-Game Summary. Shows top 3 Fame earners per side with event breakdown. Mode-aware subtitle:
- Exhibition: "This Game"
- Elimination: "This Game — Run total: X/Y/Z"
- Franchise (deferred): "This Game — Season top-10"

- File: `src/src_figma/app/components/FameLeaderboardCard.tsx`

### 5.5 `<FamePromotionBanner />` — NEW (Elimination only in v1)
Surfaces at post-game when any player crossed a tier threshold this run. User taps Accept per player.
- File: `src/src_figma/app/components/FamePromotionBanner.tsx`

### 5.6 `<RunStandingsTable />` — NEW (Elimination only)
Small table in Post-Game Summary showing cumulative Fame across all games in the current elimination run.
- File: `src/src_figma/app/components/RunStandingsTable.tsx`

### 5.7 Franchise Fame Hub — DEFERRED, DO NOT BUILD IN v1
Documented for future phase. Will live in Franchise Home as a new tab.

---

## 6. Gap-Closure Items (must land as part of v1)

Ordered by dependency:

| # | Item | Scope | Effort |
|---|---|---|---|
| G1 | Thread `gameMode` from GameTracker into `useFameTracking` so elimination/playoff multipliers apply | All modes | S |
| G2 | Create `<FamePip />` primitive | Foundation | S |
| G3 | Add Fame Tier pip row to PlayerCardModal header | Exh + Elim | S |
| G4 | Add `<PlayerFameSection />` body to PlayerCardModal | Exh + Elim | M |
| G5 | Add `<FameLeaderboardCard />` to Post-Game Summary | Exh + Elim | M |
| G6 | Implement run-scoped aggregation (`getPlayerRunFame(runId)`) | Elim | M |
| G7 | Add `<RunStandingsTable />` to Post-Game Summary | Elim | S |
| G8 | Add `<FamePromotionBanner />` at Post-Game Summary | Elim | M |
| G9 | Implement next auto-detections: Triple Play, Blown Save, TOOTBLAN, Back-to-Back HRs, Walk-off HR | All modes | M |
| G10 | Dark chalkboard theme pass on Fame toast if not already aligned | All modes | S |

**Explicitly NOT in v1:**
- Franchise Fame Hub tab
- Season-end promotion suggestions
- Career rollup UI surfaces
- Cross-instance career aggregation read paths in PlayerCardModal
- MVP/All-Star voting integration UI (backend may already exist per `SPECIAL_EVENTS_SPEC.md`, but no GameTracker/Post-Game surface in v1)

---

## 7. Data Flow Trace (v1 scope)

### Exhibition at-bat → Fame toast → post-game leaderboard

```
[SMB4 user input] → recordPlayOutcome()
    ↓
GameTracker.tsx → useFameTracking.recordFameEvent()
    ↓
fameIntegration.ts → apply LI multiplier (NOW mode-aware per G1)
    ↓
gameState.fameEvents[] updated → IndexedDB save
    ↓
FameEventToast renders
    ↓
(Game ends) → PostGameSummary.tsx
    ↓ reads gameState.fameEvents
FameLeaderboardCard renders top-3-per-side
```

### Elimination at-bat → run-scoped aggregation

```
[All of the above, plus:]
    ↓
On game-end: eliminationRunStorage.ts → append fameEvents to run aggregate
    ↓
PostGameSummary.tsx → getPlayerRunFame(runId) → RunStandingsTable renders
    ↓
tierPromotionDetector(runFame, effectiveFame) → if threshold crossed
    ↓
FamePromotionBanner renders with per-player Accept buttons
    ↓
Accept → write fameOverride to elimination instance
```

---

## 8. Storage Additions (v1)

### Elimination run Fame aggregate
New IndexedDB store or extension of existing elimination storage:
```ts
interface EliminationRunFameAggregate {
  runId: string;
  playerFame: Record<string, {
    totalFame: number;
    events: FameEvent[];
    gamesPlayed: number;
  }>;
  lastUpdatedAt: string;
}
```

Written at end of each elimination game. Read at post-game and start of next elimination game for display.

### Fame instance override
Per `BEAT_REPORTER_DATA_MODEL_SPEC.md` §1.5 — `RosterPlayerInstance.fameOverride`. Already part of that spec; no new work here beyond ensuring elimination storage persists it.

---

## 9. Testing Checklist (v1 gate)

Before declaring v1 Fame integration complete:

### Exhibition
- [ ] Fame toast fires on auto-detected event
- [ ] PlayerCardModal shows Fame Tier pip in header (reads base or override correctly)
- [ ] PlayerCardModal shows Game Fame section with event list + total
- [ ] Post-Game Summary shows Fame Leaderboard card
- [ ] No career/season aggregate appears anywhere
- [ ] Build passes, existing tests pass

### Elimination
- [ ] All Exhibition checks PLUS:
- [ ] Run Standings Table renders at post-game
- [ ] Crossing a tier threshold surfaces promotion banner
- [ ] Accepting promotion writes `fameOverride` to instance
- [ ] Next game in run reads promoted tier
- [ ] Base tier in League Builder unchanged

### Both
- [ ] `gameMode` correctly threaded — elimination games apply run multiplier; exhibition does not
- [ ] No Franchise-mode surfaces appear anywhere (Fame Hub absent, Season/Career rollups hidden)
- [ ] Dark chalkboard theme applied to all new components

---

## 10. Implementation Sequencing

1. **G1** — Thread `gameMode` (foundation; blocks all mode-correct behavior)
2. **G2** — `<FamePip />` primitive
3. **G3 + G4** — PlayerCardModal header pip + Fame section
4. **G5** — Post-Game Fame Leaderboard (Exhibition complete after this)
5. **G6** — Run aggregation helpers
6. **G7** — Run Standings Table
7. **G8** — Promotion Banner
8. **G9** — Additional auto-detections
9. **G10** — Theme polish pass

Each step builds → tests pass → commit → push before moving on (per project NFL discipline).

---

## 11. Non-Goals (v1)

- All Franchise-mode Fame surfaces (Hub tab, season/career rollups, season-end promotion suggestions)
- Tier demotion suggestions (manual-only in v1)
- Automatic backfill of Fame events for games already logged before G9 auto-detections ship
- MVP/All-Star voting UI integration
- Beat reporter voice integration with Fame (that's downstream, per `BEAT_REPORTER_VOICE_SPEC.md`)
- Cross-instance career Fame aggregation UI
