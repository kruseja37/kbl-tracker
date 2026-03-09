# GAMETRACKER BUILD PLAN

**Generated:** 2026-03-06
**Source:** GAMETRACKER_DELTA_REPORT.md (Sessions 1-3)
**Spec:** MODE_2_V1_FINAL.md §2-§7
**Total Actionable Tickets:** 55 (GAP-GT-3-A RESOLVED, excluded)

---

## Build Order Philosophy

Each layer's output feeds the next. Do NOT start a higher layer until the lower layer's tests pass.

```
Layer 1: Event Model Foundation (§2)     — The data atoms everything else stores
Layer 2: Quick Bar + 5-Zone Layout (§3)  — The scaffold UI attaches to
Layer 3: Baseball Rules (§6)             — Correct logic under the UI
Layer 4: Between-Play & Subs (§5, §7)   — Mid-game actions between at-bats
Layer 5: Enrichment & Play Log (§4)      — Post-hoc enrichment system
```

---

## Layer 1: Event Model Foundation (§2)

**Goal:** AtBatEvent interface matches spec. Shared types reconciled. BetweenPlayEvent exists.
**Branch:** `feature/gt-layer-1-event-model`
**Files touched:** `src/utils/eventLog.ts`, `src/types/game.ts`, `src/engines/mojoEngine.ts`, `src/engines/fitnessEngine.ts`, `src/data/playerDatabase.ts`, `src/src_figma/app/types/substitution.ts`, `src/utils/gameStorage.ts`

### Tier 1A: Type Definitions (no runtime changes)

These are pure type/interface changes — nothing breaks until wired.

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 1.1 | GAP-GT-2-L | Fix AtBatResult: rename KL→Kc, add WP_K, PB_K | S | tool | None |
| 1.2 | GAP-GT-2-B | Rename `sequence` → `eventIndex` in AtBatEvent | S | tool | None |
| 1.3 | GAP-GT-2-I | Fix runsScored: `number` → `string[]` (runner IDs) | S | tool | None |
| 1.4 | GAP-GT-2-P | Reconcile MojoLevel: numeric (-2..+2) → string enum | S | tool | None — engine files are protected, add adapter |
| 1.5 | GAP-GT-2-Q | Reconcile FitnessLevel: UPPERCASE → PascalCase | S | tool | None — same adapter approach |
| 1.6 | GAP-GT-2-R | Implement FameLevel type | S | tool | None |
| 1.7 | GAP-GT-2-T | Reconcile PitcherRole: 5-value spec enum | S | tool | None |
| 1.8 | GAP-GT-2-S | Implement HiddenModifiers interface | S | tool | None |

### Tier 1B: AtBatEvent Field Additions

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 1.9 | GAP-GT-2-A | Add seasonId, franchiseId, leagueId to AtBatEvent | S | tool | None |
| 1.10 | GAP-GT-2-G | Add parkContext group (stadiumId, parkFactors, lighting, dimensions) | S | model | None |
| 1.11 | GAP-GT-2-C | Add teamContext group (record, streak, divisionRank, isRivalry, series) | M | model | 1.9 |
| 1.12 | GAP-GT-2-D | Add batterContext snapshot (16 fields: position, order, mojo, stats, fame) | L | model | 1.4, 1.5, 1.6, 1.8 |
| 1.13 | GAP-GT-2-E | Add pitcherContext snapshot (15 fields: role, mojo, stats, fame) | L | model | 1.4, 1.5, 1.6, 1.7, 1.8 |
| 1.14 | GAP-GT-2-F | Add matchupContext group (rivalry, platoon, previous, relationship) | M | model | 1.12, 1.13 |
| 1.15 | GAP-GT-2-H | Add computed fields (runnerOutcomes[], outsRecorded, isQualityAtBat, milestoneTriggered) | M | model | None |
| 1.16 | GAP-GT-2-J | Add enrichment fields (10: fieldLocation, exitType, fieldingSeq, putouts, assists, errors, hrDistance, pitchType, pitchesInAtBat, modifiers) | M | model | None |
| 1.17 | GAP-GT-2-K | Add versioning (version + editHistory) | S | tool | None |

### Tier 1C: New Event Interfaces

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 1.18 | GAP-GT-2-M | Implement BetweenPlayEvent discriminated union (15 types) | L | model | 1.1-1.8 (needs reconciled types) |
| 1.19 | GAP-GT-2-N | Implement TransactionEvent interface | M | model | 1.18 |
| 1.20 | GAP-GT-2-O | Implement GameRecord matching spec (lineups, narrative, audit) | M | model | 1.9-1.17 |

### Layer 1 Summary
- **Tickets:** 20
- **Effort:** S:10, M:6, L:4
- **Critical path:** 1.1 (AtBatResult fix) unblocks everything. 1.12+1.13 (context snapshots) are the largest items.
- **Risk:** Protected engines (mojoEngine, fitnessEngine) — use adapter pattern, not rewrites.

---

## Layer 2: Quick Bar + 5-Zone Layout (§3)

**Goal:** GameTracker restructured to spec's 5-zone iPad layout. Quick Bar is primary input. EnhancedInteractiveField assets become enrichment surface.
**Branch:** `feature/gt-layer-2-quick-bar-layout`
**Files touched:** `src/src_figma/app/pages/GameTracker.tsx`, new `QuickBar.tsx`, new `FenwayBoard.tsx`, new `PlayLog.tsx`

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 2.1 | GAP-GT-3-A | ✅ RESOLVED — architecture decided: Quick Bar + Field as enrichment | — | — | — |
| 2.2 | GAP-GT-3-E | Build K/Kc toggle button (single K with swipe/toggle for called vs swinging) | S | tool | 1.1 (KL→Kc rename) |
| 2.3 | GAP-GT-3-F | Add WP_K, PB_K to Quick Bar overflow menu | S | tool | 1.1 (WP_K/PB_K types added) |
| 2.4 | GAP-GT-3-H | Sac fly prompt: FO with R3 + <2 outs → "Sac fly?" | S | tool | None |
| 2.5 | GAP-GT-3-B | Undo stack depth: 5 → 10 (configurable) | S | tool | None |
| 2.6 | GAP-GT-3-J | Game end undo prevention — clear/disable undo after game completion | S | tool | None |
| 2.7 | GAP-GT-3-D | HR inline distance + pitch type capture prompts | M | model | 1.1 (PitchType type) |
| 2.8 | GAP-GT-3-G | Error enrichment flow: E → base → fielder → error type (3-4 taps) | M | model | None |
| 2.9 | GAP-GT-3-I | Play log correction capability (edit past entries) | M | model | 5.1 (Play Log must exist first) |
| 2.10 | GAP-GT-3-C | Between-inning summary screen (optional per spec §16.5) | M | model | None |

**Note:** GAP-GT-3-A (the 5-zone layout itself) is RESOLVED architecturally but the IMPLEMENTATION is implicit across 2.2-2.10. The actual layout restructure (splitting GameTracker.tsx into Fenway Board / Diamond / Play Log / Quick Bar / Modifier zones) is the scaffolding work that enables all Quick Bar tickets. This is tracked as the branch-level work for Layer 2, not a separate ticket.

### Layer 2 Summary
- **Tickets:** 9 (excluding resolved 3-A)
- **Effort:** S:5, M:4, L:0
- **Critical path:** 2.2+2.3 (K/Kc + WP_K/PB_K) depend on Layer 1 type fixes. 2.9 (play log correction) depends on Layer 5.
- **Largest item:** The 5-zone layout restructure itself — embedded in branch work, not a single ticket.

---

## Layer 3: Baseball Rules (§6)

**Goal:** Button availability correct. Special play rules enforced. Type fixes propagated.
**Branch:** `feature/gt-layer-3-baseball-rules`
**Files touched:** `src/src_figma/app/components/OutcomeButtons.tsx`, `src/utils/eventLog.ts`, `src/src_figma/hooks/useGameState.ts`, `src/types/game.ts`

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 3.1 | GAP-GT-6-F | Fix isAB filter: add IBB, change SH→SAC | S | tool | 1.1 (type alignment) |
| 3.2 | GAP-GT-6-G | Fix button availability: SF+DP add outs≥2 check, TP require ≥2 runners, D3K disable when 1B occupied & <2 outs | S | tool | None |
| 3.3 | GAP-GT-6-B | SF button: add outs ≥ 2 disable check | S | tool | Merged into 3.2 |
| 3.4 | GAP-GT-6-C | SAC button: add "no runners" disable check | S | tool | None |
| 3.5 | GAP-GT-6-D | GRD (Ground Rule Double) result type + 2-base runner advancement | M | model | 1.1 (add GRD to AtBatResult) |
| 3.6 | GAP-GT-6-E | Tag-up enforcement on fly outs — runners must return before advancing | M | model | None |
| 3.7 | GAP-GT-6-A | Time play rule — runner scores if crossed home before tag on non-force 3rd out | S | tool | None |

**Note:** GAP-GT-6-B and GAP-GT-6-C are subsumed by GAP-GT-6-G (all button fixes in one pass). Listed separately for traceability but should be done together.

### Layer 3 Summary
- **Tickets:** 7 (5 unique after merging 6-B/6-C into 6-G)
- **Effort:** S:5, M:2, L:0
- **Critical path:** 3.1 (isAB fix) is quick and high-impact. 3.2 (button availability) fixes actual gameplay bugs.
- **Low priority:** 3.6 (tag-up) and 3.7 (time play) are edge cases that rarely affect SMB4 gameplay.

---

## Layer 4: Between-Play & Substitutions (§5, §7)

**Goal:** Runner actions via tap popover. Diamond tap → substitution modals. Validation constraints.
**Branch:** `feature/gt-layer-4-between-play-subs`
**Files touched:** `src/src_figma/app/pages/GameTracker.tsx`, `src/src_figma/app/components/modals/`, `src/src_figma/app/components/EnhancedInteractiveField.tsx`, `src/src_figma/app/components/PlayerCardModal`

### Tier 4A: Runner Actions

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 4.1 | GAP-GT-5-A | Runner tap → popover menu with [Steal] [Pickoff] [WP] [PB] [Advance] | M | model | 2.1 (layout must exist for runner tap zone) |
| 4.2 | GAP-GT-5-B | WP/PB: add "tap destination" for non-standard advances | S | tool | 4.1 |

### Tier 4B: Substitution Modals

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 4.3 | GAP-GT-7-A | Wire diamond tap → substitution flow: port modals + connect to makeSubstitution() | M | model | None (SubstitutionModalBase already in active path) |
| 4.4 | GAP-GT-5-C | Add [Substitute] option to diamond tap PlayerCardModal | S | tool | 4.3 |
| 4.5 | GAP-GT-5-F | Add [Move Position] to diamond tap popover for non-sub position changes | S | tool | 4.3 |
| 4.6 | GAP-GT-5-E | Verify/add tappable pitcher name in scoreboard → Change Pitcher | S | tool | None |

### Tier 4C: Validation & Polish

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 4.7 | GAP-GT-7-B | Lineup size validation — min/max 9 enforcement | S | tool | None |
| 4.8 | GAP-GT-7-C | PH-must-bat-first validation | S | tool | None |
| 4.9 | GAP-GT-7-D | Add ❌ emoji to used player display in lineup/bench | S | tool | None |
| 4.10 | GAP-GT-5-G | Track innings at each position for Gold Glove / dWAR | M | model | None |

### Tier 4D: Verification

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 4.11 | GAP-GT-5-D | Verify Manager Moment best/worst WPA in season aggregation | S | tool | None |

### Layer 4 Summary
- **Tickets:** 11
- **Effort:** S:7, M:3, L:0 (+ 1 verification)
- **Critical path:** 4.3 (port substitution modals) unblocks 4.4+4.5. 4.1 (runner popover) is the biggest new UI component.
- **Low priority:** 4.9 (❌ emoji), 4.11 (verify WPA), 4.10 (innings-at-position).

---

## Layer 5: Enrichment & Play Log (§4)

**Goal:** Visible play log with enrichment panel. Pitch type per AB. Between-inning enrichment prompts.
**Branch:** `feature/gt-layer-5-enrichment`
**Files touched:** `src/src_figma/app/pages/GameTracker.tsx`, new `PlayLogPanel.tsx`, new `EnrichmentPanel.tsx`

| Order | ID | Description | Effort | Route | Deps |
|-------|-----|------------|--------|-------|------|
| 5.1 | GAP-GT-4-A | Build visible Play Log component with enrichment panel entry point | L | model | Layer 2 (5-zone layout provides the right panel zone) |
| 5.2 | GAP-GT-4-B | K/Kc toggle badge on strikeout plays in play log | S | tool | 1.1 (Kc type), 5.1 (play log exists) |
| 5.3 | GAP-GT-4-C | Pitch type selector per at-bat (4F\|2F\|CF\|SL\|CB\|CH\|SB\|FK\|UNK), filtered by pitcher repertoire | M | model | 1.16 (enrichment fields on AtBatEvent) |
| 5.4 | GAP-GT-4-D | QAB detection — 7+ pitches = quality at-bat | S | tool | 1.15 (isQualityAtBat field) |
| 5.5 | GAP-GT-4-G | Persist batter position + defensive alignment per AtBatEvent | S | tool | 1.12 (batterContext has position) |
| 5.6 | GAP-GT-4-H | Auto-prompt IFR when PO with R1+R2 or bases loaded and <2 outs | S | tool | None |
| 5.7 | GAP-GT-4-E | Between-inning enrichment prompt for unenriched plays | M | model | 5.1 (play log tracks enrichment state) |
| 5.8 | GAP-GT-4-F | Post-game enrichment summary with unenriched count | S | tool | 5.1 |

### Layer 5 Summary
- **Tickets:** 8
- **Effort:** S:5, M:2, L:1
- **Critical path:** 5.1 (Play Log) is the foundation — everything else attaches to it.
- **5.1 depends on Layer 2** (5-zone layout provides the right panel zone where Play Log lives).

---

## Cross-Layer Dependency Map

```
Layer 1 (Types)
  ├── 1.1 AtBatResult fix ──→ 2.2 K/Kc toggle, 2.3 WP_K/PB_K, 3.1 isAB fix
  ├── 1.4-1.8 Enum reconciliation ──→ 1.12-1.13 Context snapshots
  ├── 1.12 batterContext ──→ 5.5 Position per AB
  ├── 1.15 Computed fields ──→ 5.4 QAB detection
  └── 1.16 Enrichment fields ──→ 5.3 Pitch type selector

Layer 2 (Layout)
  ├── 5-zone restructure ──→ 5.1 Play Log panel zone
  └── 2.9 Play log corrections ──→ 5.1 Play Log must exist

Layer 3 (Rules)
  └── 3.5 GRD type ──→ 1.1 AtBatResult

Layer 4 (Between-Play)
  ├── 4.3 Port modals ──→ 4.4 Substitute option, 4.5 Move Position
  └── 4.1 Runner popover ──→ 4.2 WP/PB destination

Layer 5 (Enrichment)
  └── 5.1 Play Log ──→ 5.2 K/Kc badge, 5.7 Between-inning prompt, 5.8 Post-game summary
```

---

## Build Routing

| Layer | Primary Route | Backup Route |
|---|---|---|
| 1 - Event Model (types, persistence) | Claude Code CLI \| opus | — |
| 2 - Quick Bar + Layout (UI restructure) | Codex \| 5.3 \| very high | Claude Code CLI \| opus |
| 3 - Baseball Rules (logic fixes) | Codex \| 5.3 \| high | — |
| 4 - Between-Play + Subs (UI + state) | Codex \| 5.3 \| high | Claude Code CLI \| opus |
| 5 - Enrichment (UI + persistence) | Codex \| 5.3 \| high | — |

---

## Totals

| Layer | Tickets | S | M | L | Est. Hours |
|-------|---------|---|---|---|-----------|
| 1 - Event Model | 20 | 10 | 6 | 4 | 40-70 |
| 2 - Quick Bar + Layout | 9 | 5 | 4 | 0 | 18-30 |
| 3 - Baseball Rules | 7 | 5 | 2 | 0 | 10-18 |
| 4 - Between-Play + Subs | 11 | 7 | 3 | 0 (+1 verify) | 16-28 |
| 5 - Enrichment + Play Log | 8 | 5 | 2 | 1 | 18-30 |
| **TOTAL** | **55** | **32** | **17** | **5** (+1 resolved) | **~102-176** |

---

## Quick Wins (Can Do Now, No Dependencies)

These tickets have zero dependencies and can be done in any order as warm-up:

| ID | Description | Effort | Layer |
|----|-------------|--------|-------|
| GAP-GT-3-B | Undo stack 5→10 | S | 2 |
| GAP-GT-3-J | Game end undo prevention | S | 2 |
| GAP-GT-6-G | Fix button availability (SF/DP/TP/D3K) | S | 3 |
| GAP-GT-6-C | SAC "no runners" disable | S | 3 |
| GAP-GT-6-A | Time play rule | S | 3 |
| GAP-GT-7-B | Lineup size validation | S | 4 |
| GAP-GT-7-C | PH-must-bat-first validation | S | 4 |
| GAP-GT-7-D | ❌ emoji on used players | S | 4 |
| GAP-GT-5-D | Verify Manager Moment WPA | S | 4 |
| GAP-GT-4-H | IFR auto-prompt | S | 5 |
| GAP-GT-3-H | Sac fly prompt for FO+R3 | S | 2 |

**11 quick wins, all S effort, ~11-16 hours total.**

---

## Critical Path (Minimum Viable for Elimination Playthrough)

To play through an Elimination bracket with spec-compliant GameTracker, these are the MUST-HAVE items:

1. **1.1** AtBatResult fix (KL→Kc, WP_K/PB_K) — correct event data
2. **1.9** Add seasonId/franchiseId/leagueId — context for aggregation
3. **3.1** Fix isAB filter — correct batting average calculation
4. **3.2** Button availability fixes — prevent illegal plays
5. **2.5** Undo depth 5→10 — quality of life
6. **2.4** Sac fly prompt — prevent missed SF recording

Everything else is enrichment, polish, or deferred features that don't block the core gameplay loop.
