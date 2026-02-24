# SpecRecon Step 3 — Domain 5: League Builder / Season Setup

**Domain**: League Builder, Season Setup, Schedule System
**Files analyzed**: 5 (3,594 lines total)
**Findings**: C-070 through C-080 (11 total)
**Status**: COMPLETE — all findings JK-approved

---

## Files Read (in order)

1. LEAGUE_BUILDER_SPEC.md (976 lines, full read)
2. SEASON_SETUP_SPEC.md (604 lines, full read)
3. LEAGUE_BUILDER_FIGMA_SPEC.md (776 lines, full read)
4. SEASON_SETUP_FIGMA_SPEC.md (770 lines, full read) — 0 findings
5. SCHEDULE_SYSTEM_FIGMA_SPEC.md (469 lines, full read)

---

## Findings

### C-070 | Personality type union includes Chemistry types | CONTRADICTION + INTERNAL_INCONSISTENCY

**Source A**: LEAGUE_BUILDER_SPEC.md lines 298-300
```typescript
type Personality = 'Competitive' | 'Spirited' | 'Crafty' | 'Scholarly' |
                   'Disciplined' | 'Tough' | 'Relaxed' | 'Egotistical' |
                   'Jolly' | 'Timid' | 'Droopy';  // 11 types
```

**Source B**: PERSONALITY_SYSTEM_SPEC.md §2 lines 22-29 — 7 visible types: COMPETITIVE, RELAXED, DROOPY, JOLLY, TOUGH, TIMID, EGOTISTICAL

**Source C**: LEAGUE_BUILDER_SPEC.md line 302 — Chemistry type has 5 values (Competitive, Spirited, Crafty, Scholarly, Disciplined) that overlap with 4 extras in Personality union

**Source D**: LEAGUE_BUILDER_SPEC.md line 902 (v1.1) — "1 visible personality type (7 options)" — contradicts its own Player interface

**JK Decision**: APPROVED
**Step 4 action**: Fix LEAGUE_BUILDER_SPEC Personality type to 7 values; remove Chemistry types from Personality union

---

### C-071 | Game count presets incomplete in LEAGUE_BUILDER_SPEC | CONTRADICTION

**Source A**: LEAGUE_BUILDER_SPEC.md line 595 — `gamesPerTeam: number; // 32 (standard), 40, 80, 162` (4 presets)

**Source B**: SEASON_SETUP_SPEC.md line 128 — `[16] [●32] [40] [80] [128] [162] [Custom: ___]` (6 presets + custom)

**Source C**: SEASON_SETUP_FIGMA_SPEC.md line 219 — same 6 presets

Missing from LEAGUE_BUILDER_SPEC: **16** and **128**

**JK Decision**: APPROVED
**Step 4 action**: Update LEAGUE_BUILDER_SPEC gamesPerTeam comment to include all 6 presets

---

### C-072 | Contraction toggle still present | STALE_REFERENCE

**Source**: LEAGUE_BUILDER_SPEC.md line 729 — `expansionContractionEnabled: boolean;`

**Prior decision**: C-041 (Domain 3) — contraction removed by JK decision

**JK Decision**: APPROVED
**Step 4 action**: Remove expansionContractionEnabled from LEAGUE_BUILDER_SPEC

---

### C-073 | 3-mode architecture not described in body | MISSING_MECHANIC

**Source A**: LEAGUE_BUILDER_SPEC.md line 974 — only a cross-references table entry: `SEPARATED_MODES_ARCHITECTURE.md | League Builder = Mode 1`

**Source B**: SEPARATED_MODES_ARCHITECTURE.md line 11 — "KBL operates across three distinct modes" with League Builder as Mode 1

**JK correction**: "this needs to be included in the league builder, right?" — confirmed League Builder must describe its Mode 1 role in the body

**JK Decision**: APPROVED
**Step 4 action**: Add Mode 1 architectural description to LEAGUE_BUILDER_SPEC body

---

### C-074 | Grade scale discrepancy: A- present vs absent | CONTRADICTION

**Source A**: LEAGUE_BUILDER_SPEC.md line 294 — 13 grades: `'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-'`

**Source B**: SCOUTING_SYSTEM_SPEC.md §2.1 line 23 — 9 grades: `A+, A, B+, B, B-, C+, C, C-, D` (A- absent; also missing S, D+, D-)

Escalated from Domain 4 WATCH item.

**JK Decision**: APPROVED
**Step 4 action**: Determine authoritative grade scale (13 or 9) and align both specs

---

### C-075 | WAR calculation weights configurable but undocumented | MISSING_MECHANIC

**Source A**: LEAGUE_BUILDER_SPEC.md lines 690-695
```typescript
warCalculationWeights: {
  batting: number;    // bWAR weight
  running: number;    // rWAR weight
  fielding: number;   // fWAR weight
  pitching: number;   // pWAR weight
};
```

**Source B**: BWAR_SPEC, PWAR_SPEC, FWAR_SPEC — all use fixed formulas where total WAR = sum of components at equal weight. No spec documents configurable weights.

**JK Decision**: APPROVED
**Step 4 action**: Determine if configurable WAR weights are intended; if yes, document in WAR specs; if no, remove from LEAGUE_BUILDER_SPEC

---

### C-076 | Franchise handoff steps omit salary and standings init | INCOMPLETE_SPEC

**Source A**: SEASON_SETUP_SPEC.md §8.4 lines 472-478 — 6 steps (create instance, copy league, copy rosters, copy rules, generate schedule, navigate)

**Source B**: GOSPEL §11.3 lines 1365-1376 — 6 steps including: "Initialize salary structure (per SALARY_SYSTEM_SPEC)", "Set initial standings (all 0-0)", "Create franchise record with franchiseId, seasonId=1", "not reference — copy, so League Builder changes don't affect active franchise"

Missing from SEASON_SETUP: salary init, standings init, franchiseId/seasonId creation, copy-not-reference data isolation

**JK Decision**: APPROVED
**Step 4 action**: Add missing handoff steps to SEASON_SETUP_SPEC §8.4

---

### C-077 | Missing Mode Transition screen LB-F016 | INCOMPLETE_SPEC

**Source A**: LEAGUE_BUILDER_FIGMA_SPEC.md lines 12-28 — screen inventory lists LB-F001 through LB-F015 (15 screens)

**Source B**: SEPARATED_MODES_ARCHITECTURE §5.1 — requires mode transition screen for League Builder → Franchise Season

**Source C**: RECONCILIATION_PLAN — previously flagged as "HIGH priority: missing LB-F016 Mode Transition screen"

Related to C-073 but distinct (logic spec vs Figma spec)

**JK Decision**: APPROVED
**Step 4 action**: Add LB-F016 Mode Transition screen to LEAGUE_BUILDER_FIGMA_SPEC

---

### C-078 | Fame slider scale incompatible with Fame system | CONTRADICTION

**Source A**: LEAGUE_BUILDER_FIGMA_SPEC.md Player Editor (LB-F008) line 465 — `Fame: [-2 ───●─── +2]` (continuous -2 to +2 range)

**Source B**: MILESTONE_SYSTEM_SPEC §4 — FameLevel is a 6-tier enum (unknown → rising → notable → star → superstar → legend) with accumulated FameBonus points (0.5, 1.0, etc.)

No Fame spec uses a -2 to +2 scale. No spec defines negative fame or mapping from this slider to the tier system.

**JK Decision**: APPROVED
**Step 4 action**: Replace Fame slider with FameLevel dropdown or initial fame seed that maps to tier system

---

### C-079 | "Empty start" contradicts GOSPEL schedule generation | CONTRADICTION

**Source A**: SCHEDULE_SYSTEM_FIGMA_SPEC.md line 21 — "Empty start — New seasons begin with no scheduled games"

**Source B**: GOSPEL §11.3 line 1369 — "Generate schedule from template (per SCHEDULE_SYSTEM_FIGMA_SPEC)"

**Source C**: SEASON_SETUP_SPEC.md §8.4 step 5 — "Generate initial schedule"

**Source D**: GOSPEL §11.1 line 1280 — "Schedule template (162-game grid)"

GOSPEL says franchise handoff pre-generates a schedule. SCHEDULE_SYSTEM says seasons begin empty.

**JK Decision**: APPROVED
**Step 4 action**: Resolve: either GOSPEL schedule generation feeds pre-built schedule, or "empty start" is the correct model and GOSPEL §11.3 needs updating

---

### C-080 | SIMULATE button contradicts no-simulation philosophy | CONTRADICTION

**Source A**: SCHEDULE_SYSTEM_FIGMA_SPEC.md line 212 — `[ SCORE GAME ] [ SIMULATE ] [ SKIP ]`

**Source B**: GOSPEL §10.1 lines 1094-1098 — "Franchise mode in KBL is a management layer that consumes events generated by real gameplay... Every stat, every narrative, every award is backed by actual gameplay. There's no simulation fudging."

A SIMULATE button that auto-generates game results contradicts the GOSPEL's core principle.

**JK Decision**: APPROVED
**Step 4 action**: Determine if SIMULATE should be removed, renamed (e.g., "Enter Score"), or if GOSPEL's no-simulation stance needs nuance for non-user-controlled teams

---

## WATCH Items

| # | Item | Source | Notes |
|---|------|--------|-------|
| W-1 | Mercy Rule in Season Setup but not League Builder rules | SEASON_SETUP_SPEC line 152 vs LEAGUE_BUILDER_SPEC rules config | May be intentional season-level addition |
| W-2 | Home Field Advantage patterns in Season Setup | SEASON_SETUP_SPEC line 233 | Verify against PLAYOFF_SYSTEM_SPEC |
| W-3 | GOSPEL §11.2 personality model stale (extends C-052) | GOSPEL line 1352 | Same OOTP model in different section; not separate finding |

---

## Summary by Type

| Type | Count | Finding IDs |
|------|-------|-------------|
| CONTRADICTION | 6 | C-070, C-071, C-074, C-078, C-079, C-080 |
| MISSING_MECHANIC | 2 | C-073, C-075 |
| INCOMPLETE_SPEC | 2 | C-076, C-077 |
| STALE_REFERENCE | 1 | C-072 |
| INTERNAL_INCONSISTENCY | 1 | C-070 (dual-classified) |

---

## Step 4 Decision Queue (Domain 5)

| # | Question | Options | Blocking? |
|---|----------|---------|-----------|
| 1 | Authoritative grade scale — 13 grades or 9? | C-074 | Yes — affects all grade references |
| 2 | Are configurable WAR weights intended? | C-075 | Yes — changes WAR pipeline architecture |
| 3 | Schedule model — pre-generated or empty start? | C-079 | Yes — changes franchise handoff flow |
| 4 | Should SIMULATE be removed, renamed, or kept? | C-080 | Yes — core philosophy question |
| 5 | Personality type — fix to 7 in LEAGUE_BUILDER? | C-070 | No — clear fix per PERSONALITY_SYSTEM_SPEC |
| 6 | What does Fame slider map to? | C-078 | No — needs new definition |

---

*Created: 2026-02-22*
*Protocol: Mandatory Single-File Analysis (one file at a time, full read, cross-reference, JK approval)*
