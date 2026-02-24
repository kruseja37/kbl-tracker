# Step 3: Domain 3 — Franchise / Offseason / Farm / Salary / Trade / Modes

**Date:** 2026-02-22
**Attempt:** 2 (redo per JK instruction — "more careful this time")
**Cross-reference sources:**
- GOSPEL (KBL_UNIFIED_ARCHITECTURE_SPEC v1.2) — §9, §10, §11, §12 (lines 994-1487)
- OFFSEASON_SYSTEM_SPEC.md (2353 lines, full read)
- TRADE_SYSTEM_SPEC.md (1021 lines, full read)
- FARM_SYSTEM_SPEC.md (1718 lines, full read)
- SALARY_SYSTEM_SPEC.md (1118 lines, full read)
- FRANCHISE_MODE_SPEC.md (412 lines, full read)
- SEPARATED_MODES_ARCHITECTURE.md (210 lines, full read)
- EOS_RATINGS_ADJUSTMENT_SPEC.md (569 lines, full read)
- FRANCHISE_MODE_DEEP_DIVE.md (1043 lines — previously EXCLUDED, now included by JK)
- FRANCHISE_DEEPDIVE_FEEDBACK_NOTES.md (237 lines — JK's verbatim feedback)
- SPEC_RECONCILIATION_FINDINGS.md (already-resolved items excluded from findings)

**Already-resolved items NOT double-counted:**
CONFLICT-003 (Chemistry types), CONFLICT-004 (FA exchange ±20%), CONFLICT-005 (Draft grade range), Q-001 (Rookie salary by draft round), Q-002 (Run differential tiebreaker), Q-003 (Prospect draft in league builder), Q-004 (Stadium change v1 scope), Q-005 (Scout fat-tail), Q-006 (Team captain Charisma ≥70), Q-007 (Beat reporter pre-decision warning)

---

## Contradiction Matrix

| ID | Files | Topic | File A Says | File B Says | Type |
|----|-------|-------|-------------|-------------|------|
| **C-041** | **GOSPEL §12.1 line 1403 vs OFFSEASON_SYSTEM_SPEC line 33** | **Contraction phase** | **GOSPEL §12.1: "Phase 4: Contraction — Team record, fan morale, market size"** | **OFFSEASON_SYSTEM_SPEC line 33: "Contraction REMOVED from v1. Expansion kept as standalone optional feature." Phase 4 is now Expansion (optional) + Stadium Change** | **GOSPEL_OUTDATED** |
| **C-042** | **FARM_SYSTEM_SPEC line 121 vs GOSPEL §10.5 line 1210** | **Simulated AAA stats** | **FARM_SYSTEM_SPEC FarmMoraleFactors: `recentPerformance: number; // +/- based on AAA stats (simulated)`** | **GOSPEL §10.5 line 1210: "Their development is tracked through actual gameplay performance, not simulated." Line 1214: "A prospect's 'breakout' isn't a random roll — it's 30 games of the user watching them improve in SMB4"** | **CONTRADICTION** |
| C-043 | GOSPEL §10.5, §12.1 vs EOS_RATINGS_ADJUSTMENT_SPEC (full) | EOS adjustments for farm call-ups | GOSPEL §10.5 line 1211: "Rating adjustments at EOS are informed by events: 'This prospect hit .290 in his 30 call-up games'" — implies farm call-ups participate in EOS | EOS_RATINGS_ADJUSTMENT_SPEC: **ZERO** mentions of "farm", "call-up", "rookie", "prospect", "minor", or "AAA". No minimum games threshold. No rookie comparison category. | INCOMPLETE_SPEC |
| C-044 | EOS_RATINGS_ADJUSTMENT_SPEC vs DEEPDIVE_FEEDBACK lines 163-166 | Fan morale → ratings adjustments | EOS_RATINGS_ADJUSTMENT_SPEC: **ZERO** mentions of "morale". Inputs are WAR components only (bWAR, rWAR, fWAR, pWAR, mWAR). | JK feedback: "Fan morale should tie to ratings adjustments instead of contraction risk. Punishes teams for bad seasons while still giving draft priority." | MISSING_MECHANIC |
| C-045 | SEPARATED_MODES_ARCHITECTURE + FRANCHISE_MODE_SPEC vs DEEPDIVE_FEEDBACK lines 150, 217-220 | "The Spine" architecture | SEPARATED_MODES_ARCHITECTURE: 3 modes (League Builder → Franchise Season → Offseason Workshop) with IndexedDB persistence. FRANCHISE_MODE_SPEC: 3-mode architecture. Neither mentions a "Spine." | JK: "The Spine as thread running through all modes, called by other modes, each with individual save states. Should enable atomic season transitions." Also: "All architecture in app serves franchise mode for v1." | MISSING_CONCEPT |
| C-046 | NARRATIVE_SYSTEM_SPEC (lines 1701-2062) vs DEEPDIVE_FEEDBACK lines 115-120 vs SALARY_SYSTEM_SPEC | Random Event Generator | NARRATIVE_SYSTEM_SPEC v1.2: REG absorbed into AI-driven context-aware events with FULL mechanical effects — statChanges (ratings ±N, temp/perm), traitChanges, positionChanges, pitchChanges, teamChanges (STADIUM_CHANGE, MANAGER_FIRED/HIRED), moraleChanges, personalityChanges, relationshipChanges, specialEffects (WILD_CARD, FOUNTAIN_OF_YOUTH, etc.). Morale-influenced probability (lines 1717-1740). Covers all JK-requested mechanics. | **Minor gap only:** Mid-season rating changes via narrative statChanges should cascade to salary recalc, but SALARY_SYSTEM_SPEC triple recalc (Phases 3/8/10) is offseason-only. No mid-season salary adjustment trigger exists for narrative-driven rating changes. | **REFRAMED: MINOR_CASCADE_GAP** (was MISSING_SPEC — WITHDRAWN as false finding; REG IS fully captured in NARRATIVE_SYSTEM_SPEC) |
| C-047 | DYNAMIC_DESIGNATIONS_SPEC (812 lines, full read) + FARM_SYSTEM_SPEC vs DEEPDIVE_FEEDBACK lines 127-130 | Young Player Designation | DYNAMIC_DESIGNATIONS_SPEC: 6 types — Team MVP (line 9), Ace (line 16), Fan Favorite (line 24), Albatross (line 31), Cornerstone (line 38), Team Captain (line 45). Farm integration (lines 779-786) covers send-down morale effects only. No farm-player-specific designation. FARM_SYSTEM_SPEC: Has storylines + call-up urgency but no formal designation. | JK: "Fan-desired development player — randomly chosen from farm system. Drive strategic decisions on calling him up. Based on draft position?" | MISSING_SPEC |
| C-048 | FRANCHISE_MODE_SPEC + GOSPEL §10.2 vs TRADE_SYSTEM_SPEC vs DEEPDIVE_FEEDBACK lines 153-157 | AI-controlled teams | FRANCHISE_MODE_SPEC: Silent on AI teams. GOSPEL §10.2 line 1109: "162 games per team" with no mention of AI vs AI handling. | TRADE_SYSTEM_SPEC: Has 3 AI control modes (fully simulated, partially managed, fully managed). DEEPDIVE_FEEDBACK: "If one user-controlled team + rest AI, need simulated games/stats for AI vs AI." No spec covers AI game/stats simulation. | FRAGMENTED_SPEC |
| C-049 | GOSPEL §12.1 lines 1398-1410 vs OFFSEASON_SYSTEM_SPEC lines 12-24 (ToC), 36-49 (diagram), 52-58 (key changes), 2190-2234 (data models), 2346-2348 (old phase flow) | Offseason phase count: phases dropped to stay at 11 | GOSPEL §12.1: 11 phases including Farm Reconcile (Phase 8) and Chemistry (Phase 9). OFFSEASON_SYSTEM_SPEC top (lines 36-49): 11 phases with 3 salary recalcs displacing Farm Reconciliation and Chemistry Rebalancing. OFFSEASON_SYSTEM_SPEC bottom (lines 2346-2348): STILL lists Farm Reconciliation and Chemistry Rebalancing in old sequence. §17.6 (line 2190) and §17.7 (line 2216): Data models for both still defined. | Internal contradiction + dropped phases. Phase count must increase beyond 11 to include all operations (EOS, 3× Salary Recalc, Farm Reconciliation, Chemistry Rebalancing = 14+ phases). | **STRUCTURAL_ERROR** (upgraded from ALIGNMENT_GAP) |
| C-050 | FRANCHISE_MODE_DEEP_DIVE §3.8, §3.6, §3.11 vs SPEC_RECONCILIATION resolutions | DEEP_DIVE outdated references | DEEP_DIVE §3.8: FA exchange "salary within ±10%". §3.6: Discusses contraction as active feature. §3.11: Lists 4 chemistry types. | Resolved: FA exchange is ±20% True Value (CONFLICT-004). Contraction removed. Chemistry is 5 SMB4 types (CONFLICT-003). | STALE_REFERENCE |
| C-051 | SALARY_SYSTEM_SPEC vs DEEPDIVE_FEEDBACK line 109 | Salary cap question | SALARY_SYSTEM_SPEC: "No salary cap" — soft pressure via fan morale only. | JK: "We don't have a salary cap; question: is there a way to include one that makes sense? Review needed." | UNRESOLVED_QUESTION |

---

## Summary by Type

| Type | Count | IDs | Severity |
|------|-------|-----|----------|
| **CONTRADICTION** (direct conflict between specs) | 1 | C-042 | HIGH — FARM_SYSTEM_SPEC uses "simulated" stats that GOSPEL explicitly forbids |
| **GOSPEL_OUTDATED** (GOSPEL references removed feature) | 1 | C-041 | HIGH — contraction removed post-GOSPEL, GOSPEL §12 needs update |
| **STRUCTURAL_ERROR** (phases dropped to keep count at 11) | 1 | C-049 | HIGH — Farm Reconciliation + Chemistry Rebalancing displaced by salary recalcs; data models exist but no phase home; internal contradiction (top vs bottom of file) |
| **INCOMPLETE_SPEC** (key detail missing) | 1 | C-043 | HIGH — EOS spec has zero farm/rookie rules despite GOSPEL implying call-ups get EOS |
| **MISSING_MECHANIC** (JK intent not captured) | 1 | C-044 | MEDIUM — fan morale → ratings link is JK's replacement for contraction punishment |
| **MISSING_CONCEPT** (architecture concept unspecced) | 1 | C-045 | MEDIUM — "The Spine" exists in JK's vision but not in canonical specs |
| **MINOR_CASCADE_GAP** (narrative rating change → salary) | 1 | C-046 | LOW — REG IS in narrative spec; only gap is mid-season salary cascade |
| **MISSING_SPEC** (feature has no spec) | 1 | C-047 | MEDIUM — Young Player Designation |
| **FRAGMENTED_SPEC** (coverage split across docs) | 1 | C-048 | MEDIUM — AI team behavior is in TRADE_SYSTEM_SPEC but nowhere else |
| **STALE_REFERENCE** (doc outdated by decisions) | 1 | C-050 | LOW — DEEP_DIVE needs annotation before inclusion |
| **UNRESOLVED_QUESTION** (JK raised, no decision) | 1 | C-051 | LOW — salary cap question still open |

---

## Detailed Analysis Per Finding

### C-041 — Contraction in GOSPEL vs Removed in OFFSEASON_SYSTEM_SPEC

**GOSPEL §12.1 line 1403:**
> Phase 4: Contraction — Team record, fan morale, market size

**OFFSEASON_SYSTEM_SPEC line 33:**
> UPDATED February 2026: Contraction REMOVED from v1. Expansion kept as standalone optional feature.

**OFFSEASON_SYSTEM_SPEC line 53:**
> Phase 4: Now "Expansion" optional (was "Contraction/Expansion"). Contraction removed entirely

**What happened:** JK decided post-GOSPEL (per DEEPDIVE_FEEDBACK line 160): "Remove contraction due to very high architectural risk." The OFFSEASON_SYSTEM_SPEC was updated but the GOSPEL was not. The GOSPEL's §12.1 table, §12 phase descriptions, and the DEEP_DIVE's §3.6 all still reference contraction.

**Phase renumbering impact:** See C-049 for full details. The OFFSEASON_SYSTEM_SPEC restructured phases (salary recalc moved to dedicated phases 3/8/10), but GOSPEL still has the old numbering.

**Step 4 action:** GOSPEL §12.1 must be updated to reflect contraction removal and new phase structure.

---

### C-042 — Simulated AAA Stats vs GOSPEL "Not Simulated"

**FARM_SYSTEM_SPEC line 121:**
```typescript
recentPerformance: number;     // +/- based on AAA stats (simulated)
```

**GOSPEL §10.5 lines 1210-1214:**
> Their development is tracked through actual gameplay performance, not simulated.
> Rating adjustments at EOS are informed by events: "This prospect hit .290 in his 30 call-up games..."
> A prospect's "breakout" isn't a random roll — it's 30 games of the user watching them improve in SMB4 and recording the results.

**The conflict:** GOSPEL's philosophy is that KBL tracks REAL gameplay, not simulated outcomes. FARM_SYSTEM_SPEC's morale factor uses a "simulated" stat for prospects who haven't been called up. These prospects have NO gameplay events to draw from — they're on the farm with hidden ratings. The morale system needs SOMETHING to fill the `recentPerformance` slot.

**The tension:** Farm prospects who haven't been called up exist in a data void — no gameplay events, no stats. GOSPEL says "not simulated" but the farm morale system needs a performance signal. Either:
- (A) Accept simulated performance as a necessary exception for unknown-rating farm players
- (B) Remove the `recentPerformance` morale factor entirely for un-called-up prospects
- (C) Use a proxy (prospect rank, years waiting, potential rating) instead of simulated stats

**Step 4 action:** JK must decide how farm prospect performance is represented before call-up.

---

### C-043 — EOS Adjustments for Farm Call-Ups

**EOS_RATINGS_ADJUSTMENT_SPEC (569 lines, full read):**
- ZERO mentions of: "farm", "call-up", "called up", "rookie", "prospect", "minor", "AAA"
- No minimum games threshold for eligibility
- No rookie comparison category
- Inputs: WAR components only (bWAR, rWAR, fWAR, pWAR, mWAR)
- Position detection has thresholds based on starts/appearances, but no floor for "did they play enough to qualify for EOS?"

**GOSPEL §10.5 line 1211:**
> Rating adjustments at EOS are informed by events: "This prospect hit .290 in his 30 call-up games with a .320 average in high-leverage situations — adjust ratings upward."

**JK's intent (DEEPDIVE_FEEDBACK lines 173-177):**
> No adjustments unless called up (revealing actual ratings). If player didn't play "enough" → keeps same salary, considered rookie again next season. If met threshold → thrown in mix for EOS ratings adjustments with vets. Or: rookie category where rookies compared against each other.

**Gap:** JK has THREE specific rules that are completely absent from the EOS spec:
1. Farm players who never get called up are excluded from EOS
2. Called-up players who don't play "enough" games keep salary, treated as rookie next season
3. Possible rookie category where rookies are compared against each other (not mixed with veterans)

**Step 4 action:** EOS_RATINGS_ADJUSTMENT_SPEC needs a farm call-up section with eligibility threshold and rookie treatment rules.

---

### C-044 — Fan Morale → Ratings Adjustments

**EOS_RATINGS_ADJUSTMENT_SPEC:** Zero mentions of "morale." System is purely WAR-based.

**FAN_MORALE_SYSTEM_SPEC:** Covers the 60/20/10/10 formula and franchise health warning (replacing contraction). Does NOT mention feeding into EOS.

**JK's intent (DEEPDIVE_FEEDBACK lines 163-166):**
> Fan morale should tie to ratings adjustments instead of contraction risk. Punishes teams for bad seasons while still giving draft priority (lower expected WAR). Forces rebuild via FA (luck), draft (skill), trades (skill), call-ups.

**Gap:** JK explicitly wants fan morale to be a PUNISHMENT MECHANIC for poorly performing teams, implemented through ratings adjustments. This creates a downward spiral: bad season → low fan morale → ratings adjustments penalized → worse team → higher draft pick (recovery mechanism). No spec captures this feedback loop.

**Step 4 action:** Define the fan morale → EOS adjustment mechanic. Is it a modifier on the adjustment formula? A separate penalty phase? A cap on positive adjustments for low-morale teams?

---

### C-045 — "The Spine" Architecture Concept

**SEPARATED_MODES_ARCHITECTURE.md (210 lines):**
Three modes defined: League Builder → Franchise Season → Offseason Workshop. State persistence via IndexedDB. Mode transitions described. No "Spine" concept.

**FRANCHISE_MODE_SPEC.md (412 lines):**
Three-mode architecture. Dynamic schedule. Fictional dates. No "Spine."

**GOSPEL §10-12:** Describes mode flow (League Builder → Season → Offseason → Next Season) but no explicit "Spine" as architectural component.

**FRANCHISE_MODE_DEEP_DIVE §2:** Uses "The Event-Driven Spine" as a conceptual metaphor for the event bus. This is Claude's analysis, not canonical spec.

**JK's vision (DEEPDIVE_FEEDBACK lines 150, 217-220):**
> "The Spine" as thread running through all modes, called by other modes, each with individual save states. Should enable atomic season transitions. All architecture in app serves franchise mode for v1.

**Also lines 143-149:**
> Offseason as its own Mode in main menu. Pulls data from recently completed season. Individual save slots per season (KBL Season 1, KBL Season 2, etc). Separate: preseason + regular season + offseason.

**Gap:** JK's "Spine" implies a shared state management layer that:
- Connects all three modes
- Manages individual save states per season
- Enables atomic season transitions (all-or-nothing)
- Serves as the single architectural backbone

The SEPARATED_MODES_ARCHITECTURE describes mode transitions and IndexedDB storage but doesn't formalize this as a distinct architectural component with the properties JK describes.

**Step 4 action:** Determine if "The Spine" needs its own spec or if SEPARATED_MODES_ARCHITECTURE adequately captures the concept with minor additions (save state management, atomic transitions).

---

### C-046 — Random Event Generator (REFRAMED — was false MISSING_SPEC finding)

**Correction:** Initial analysis claimed REG was missing from specs. This was a shallow-read error. NARRATIVE_SYSTEM_SPEC v1.2 has EXTENSIVE REG coverage with full mechanical effects.

**What NARRATIVE_SYSTEM_SPEC actually covers (lines 1701-2062):**

The v1.2 changelog (line 9) states: "Removed REG as standalone — events are now AI-driven and context-aware." The v1.1 changelog (line 10) added "full mechanical effects from old random events system."

**Mechanical state changes the narrative system CAN make:**
1. **Player ratings** — statChanges: `{ stat: "POW|CON|SPD|FLD|ARM|VEL|JNK|ACC", change: +/-N, duration: N games or "season", isPermanent: boolean }` (lines 1982-1995)
2. **Player traits** — traitChanges: add/remove/swap (lines 1982-1995)
3. **Player positions** — positionChanges: primary or secondary (lines 1997-2003)
4. **Pitch repertoire** — pitchChanges: add/remove (lines 2005-2010)
5. **Team stadium** — teamChanges.STADIUM_CHANGE: mechanically applied (line 2651)
6. **Manager fired/hired** — teamChanges (lines 2021-2031)
7. **Player morale** — moraleChanges (lines 1962-1964)
8. **Player personality** — personalityChanges (lines 1962-1964)
9. **Relationships** — formation/evolution/ending (lines 1966-1980)
10. **Special effects** — WILD_CARD, FOUNTAIN_OF_YOUTH, SECOND_WIND, REDEMPTION_ARC, HEEL_TURN (lines 2045-2062)

**Morale-influenced probability (v1.2, lines 1717-1740):**
`MoraleEventModifiers { playerMorale, fanMorale, teamPerformanceGap }` — low morale → more negative events, high morale → more positive events.

**Explicitly NOT mechanical:** Injuries (deprecated — SMB4-reported), mojo/fitness (read-only), cosmetic changes (logged but no gameplay effect).

**Cross-reference against JK's DEEPDIVE_FEEDBACK:**

| JK Want (lines 115-120) | Covered? | Where |
|--------------------------|----------|-------|
| "Tabletop RPG element, random changes in-season" | ✅ | AI-driven events with mechanical consequences |
| "Tie to beat reporter narrative elements" | ✅ | IS the narrative/beat reporter system |
| "Morale influences probability" | ✅ | Lines 1717-1740, MoraleEventModifiers |
| "Overperforming players develop faster in-season" | ✅ | statChanges with duration or isPermanent |
| "Ratings bump mid-season = salary bump" | ⚠️ | statChanges exist, but SALARY_SYSTEM_SPEC has no mid-season recalc trigger |
| "Mid-season stadium change" | ✅ | teamChanges.STADIUM_CHANGE |

**Remaining minor gap:** When a narrative event triggers a permanent rating change mid-season (e.g., +2 POW), this should cascade to salary recalculation. But SALARY_SYSTEM_SPEC's triple recalc (Phases 3/8/10) is offseason-only. No spec defines a mid-season salary adjustment trigger for narrative-driven rating changes. JK noted this tension: "ratings bump mid-season = salary bump = harder to get EOS boost."

**Step 4 action (LOW priority):** Confirm whether mid-season narrative rating changes should trigger immediate salary recalc or defer to offseason. If immediate, SALARY_SYSTEM_SPEC needs a "narrative event" trigger alongside the triple offseason recalc.

---

### C-047 — Young Player Designation Missing

**DYNAMIC_DESIGNATIONS_SPEC (812 lines, full read):** 6 designation types, not 4:
1. **Team MVP** (line 9) — Highest total WAR on team
2. **Ace** (line 16) — Highest pWAR among team's pitchers
3. **Fan Favorite** (line 24) — Highest positive Value Delta (True Value - Contract)
4. **Albatross** (line 31) — Most negative Value Delta
5. **Cornerstone** (line 38) — Special: awarded to previous season's Team MVP
6. **Team Captain** (line 45) — Special: `"Player with the highest Charisma hidden modifier on the team, provided Charisma ≥ 70"`

Farm integration (lines 779-786) covers send-down morale effects: Albatross Send-Down (+8 happiness), Fan Favorite Send-Down (-12), Cornerstone Send-Down (-15), eliminated team prospect call-ups (+3 to +7). No farm-player-specific designation type.

**FARM_SYSTEM_SPEC:** Has farm storylines (BLOCKED_BY_VETERAN, PROVING_DOUBTERS_WRONG, etc.) and call-up urgency scoring, but no formal "Young Player Designation."

**JK's intent (DEEPDIVE_FEEDBACK lines 127-130):**
> Fan-desired development player — randomly chosen from farm system. Drive strategic decisions on calling him up. Based on draft position?

**Gap:** This is a new designation type that creates fan pressure to call up a specific farm player. It bridges the DYNAMIC_DESIGNATIONS_SPEC and the FARM_SYSTEM_SPEC — the designation creates strategic tension between developing the prospect and satisfying fan demand.

**Step 4 action:** Define Young Player Designation: selection criteria, fan morale impact of calling up / not calling up, interaction with existing designations.

---

### C-048 — AI-Controlled Teams Fragmented

**TRADE_SYSTEM_SPEC:** Has 3 AI control modes:
- Fully simulated (AI plays games, AI makes all decisions)
- Partially managed (user plays some games, AI handles rest)
- Fully managed (user controls everything)

**FRANCHISE_MODE_SPEC:** Silent on AI teams.

**GOSPEL §10.1-10.2:** Describes franchise as "user played it, system interprets" but doesn't address multi-team scenarios where only one team is user-controlled.

**JK's concern (DEEPDIVE_FEEDBACK lines 153-157):**
> If one user-controlled team + rest AI, need simulated games/stats for AI vs AI. Event-driven engine still used for human vs AI games. One-player setup vs all AI teams = meaningful testing from dev standpoint.

**Gap:** No single spec covers the full AI team lifecycle:
- How are AI vs AI game stats generated?
- Do AI teams use the same stat pipeline (requiring simulated events)?
- How do AI teams make roster, trade, and draft decisions?
- Does the GOSPEL "not simulated" philosophy apply to AI teams?

**Step 4 action:** Determine if AI team simulation needs a dedicated spec for v1. Note: this may conflict with C-042 (simulated vs not simulated).

---

### C-049 — Phase Numbering: Phases Dropped to Maintain Count of 11

**GOSPEL §12.1 table (lines 1398-1410):**

| Phase | GOSPEL Content |
|-------|----------------|
| 1 | Season End |
| 2 | Awards |
| 3 | Ratings Adj |
| 4 | Contraction |
| 5 | Retirement |
| 6 | Free Agency |
| 7 | Draft |
| 8 | Farm Reconcile |
| 9 | Chemistry |
| 10 | Trades |
| 11 | Season Prep |

**OFFSEASON_SYSTEM_SPEC (current) — ToC lines 12-24 and ASCII diagram lines 36-49:**

| Phase | Current Content |
|-------|----------------|
| 1 | Season End Processing |
| 2 | Awards Ceremony |
| 3 | **Salary Recalculation #1** |
| 4 | **Expansion (Optional) + Stadium Change** |
| 5 | Retirements |
| 6 | Free Agency |
| 7 | Draft |
| 8 | **Salary Recalculation #2** |
| 9 | **Offseason Trades** |
| 10 | **Salary Recalculation #3** |
| 11 | Finalize & Advance |

**Key changes section (lines 52-58), quoted:**
> - Phase 3: Now "Salary Recalculation #1" (was "True Value Recalibration")
> - Phase 4: Now "Expansion" optional (was "Contraction/Expansion"). Contraction removed entirely
> - Phase 8: Now "Salary Recalculation #2" (was "Farm System Reconciliation")
> - Phase 9: Now "Offseason Trades" (was "Chemistry Rebalancing")
> - Phase 10: Now "Salary Recalculation #3" (new)

**The problem:** The OFFSEASON_SYSTEM_SPEC added 3 salary recalculation phases (3, 8, 10) but kept the total at 11 by displacing Farm Reconciliation and Chemistry Rebalancing. These features were NOT removed — they still exist:

- **§17.6 (line 2190):** `FarmReconciliationResult` interface still defined with full structure (promotions, demotions, needsReconciliation fields)
- **§17.7 (line 2216):** `ChemistryResult` interface still defined with full structure (previousChemistry, newChemistry, delta, changes array with VETERAN_LEADER/TEAMMATE_BOND/NEW_PLAYER/CONFLICT/DRAIN/CHAMPIONSHIP_CORE types)
- **Lines 2346-2348** (bottom of file "Phase Flow" section): Still lists the OLD sequence including both: `"8. Farm Reconciliation → 9. Chemistry Rebalancing → 10. Offseason Trades → 11. New Season Prep"`

**Internal contradiction within OFFSEASON_SYSTEM_SPEC:** The TOP of the file (lines 36-58) says Phase 8 = Salary Recalc #2 and Phase 9 = Offseason Trades. The BOTTOM of the file (lines 2346-2348) says Phase 8 = Farm Reconciliation and Phase 9 = Chemistry Rebalancing. Same file, two different phase sequences.

**Also: EOS Ratings Adjustment location is ambiguous.** Phase 3 is titled "Salary Recalculation #1" in the ToC (line 16) and §5 heading (line 617), but the Interaction Map (line 117) labels it `"PHASE 3: RATINGS ADJUSTMENT"` and §5.1 (line 625) states: `"Ratings Adj: EOS adjusts player salaries to match True Value (50% of difference)"`. So EOS ratings and salary recalc are MERGED into Phase 3 — but this merge means Phase 3 does double duty (EOS + salary recalc) while Farm Reconciliation and Chemistry Rebalancing have NO phase home.

**Step 4 action:** The phase count must INCREASE beyond 11 to accommodate all required phases. The complete set of offseason operations includes: Season End, Awards, EOS Ratings, Salary Recalc #1, Expansion (Optional), Retirements, Free Agency, Draft, Farm Reconciliation, Chemistry Rebalancing, Salary Recalc #2, Offseason Trades, Salary Recalc #3, Finalize & Advance = **14 phases**. JK to confirm the correct phase sequence and total count.

---

### C-050 — FRANCHISE_MODE_DEEP_DIVE Outdated

**DEEP_DIVE was written before these JK decisions:**
- CONFLICT-003: Uses 4 chemistry types (Spirited/Crafty/Tough/Flashy) → now 5 SMB4 types
- CONFLICT-004: Uses ±10% salary FA exchange → now ±20% True Value
- Contraction: Discusses as active Phase 4 → now removed
- Draft grades: References "B to C- only" → now A through D on farm

**DEEP_DIVE §3.15 line 549** recommends "max single-event morale change cap (suggest ±15 points)" — this recommendation may or may not have been captured in FAN_MORALE_SYSTEM_SPEC.

**Step 4 action:** Annotate DEEP_DIVE with supersession notes before including in spec corpus. Tag outdated sections. Preserve valid architectural insights (event bus, dependency graph, build order recommendations).

---

### C-051 — Salary Cap Open Question

**SALARY_SYSTEM_SPEC:** Confirms no hard salary cap. Soft pressure via fan morale.

**JK (DEEPDIVE_FEEDBACK line 109):**
> "We don't have a salary cap; question: is there a way to include one that makes sense? Review needed."

**Step 4 action:** JK decides — is this a v1 feature, v2 feature, or explicitly out of scope?

---

## Step 4 Decision Queue (Domain 3)

| Priority | ID | Topic | Core Question for JK |
|----------|-----|-------|---------------------|
| 1 | **C-042** | Simulated AAA stats | GOSPEL says "not simulated." Farm morale needs a performance signal for un-called-up prospects. Accept simulation exception, remove the factor, or use a proxy? |
| 2 | **C-041 + C-049** | Contraction removal + phase count increase | GOSPEL §12 needs updating. Phase count must increase beyond 11 to restore Farm Reconciliation and Chemistry Rebalancing alongside triple salary recalc. Proposed 14-phase sequence needs JK approval. Internal contradiction in OFFSEASON_SYSTEM_SPEC (top vs bottom) must be resolved. |
| 3 | **C-043** | EOS for farm call-ups | What's the minimum games threshold? Rookie comparison category or mixed with veterans? What happens to under-threshold rookies? |
| 4 | **C-046** | REG salary cascade | Should mid-season narrative rating changes (statChanges) trigger immediate salary recalc, or defer to offseason? LOW priority — REG mechanics are fully captured. |
| 5 | **C-044** | Fan morale → ratings | How does fan morale feed into EOS? Modifier on adjustment formula? Separate penalty? Cap on positive adjustments? |
| 6 | **C-047** | Young Player Designation | Selection criteria? Fan morale impact? Interaction with existing designations? |
| 7 | **C-045** | "The Spine" | Is SEPARATED_MODES_ARCHITECTURE sufficient with additions, or does "The Spine" need its own spec? |
| 8 | **C-048** | AI-controlled teams | Does AI team simulation need a dedicated spec for v1? How are AI vs AI stats generated? |
| 9 | **C-050** | DEEP_DIVE outdated | Annotate with supersession notes? Archive or keep as reference? |
| 10 | **C-051** | Salary cap | v1 scope, v2, or out? |

---

## Cross-Reference: DEEPDIVE_FEEDBACK Items Verification

Items JK raised in DEEPDIVE_FEEDBACK and whether they're captured:

| JK Item | Captured In Spec? | Finding ID |
|---------|-------------------|------------|
| Random Event Generator | ✅ FULLY in NARRATIVE_SYSTEM_SPEC v1.2 (lines 1701-2062) — 10 mechanical effect types, morale-influenced probability. Minor gap: mid-season salary cascade. | C-046 (reframed) |
| Young Player Designation | ❌ NOT in any spec | C-047 |
| "The Spine" architecture | ❌ NOT in canonical specs | C-045 |
| Fan morale → ratings | ❌ NOT in EOS spec | C-044 |
| EOS for farm call-ups | ❌ NOT in EOS spec | C-043 |
| Rookie category in EOS | ❌ NOT in EOS spec | C-043 |
| Salary cap question | ⚠️ Explicitly "no cap" but JK asked to review | C-051 |
| AI-controlled teams (full lifecycle) | ⚠️ Partial — only in TRADE_SYSTEM_SPEC | C-048 |
| Contraction removed | ✅ In OFFSEASON_SYSTEM_SPEC | C-041 (GOSPEL not updated) |
| Stadium change in offseason | ✅ In OFFSEASON_SYSTEM_SPEC Phase 4 §6.2b | — |
| No salary matching on trades | ✅ In TRADE_SYSTEM_SPEC | — |
| Triple salary recalculation | ✅ In OFFSEASON_SYSTEM_SPEC Phases 3/8/10 | — |
| Phase 11 signing round | ✅ In OFFSEASON_SYSTEM_SPEC §13.4 | — |
| Unlimited farm during season | ✅ In FARM_SYSTEM_SPEC | — |
| 3-options limit | ✅ In FARM_SYSTEM_SPEC | — |
| Rookie salary by draft round | ✅ In FARM_SYSTEM_SPEC (resolved Q-001) | — |
| Beat reporter pre-decision warning | ✅ In FARM_SYSTEM_SPEC line 195 | — |
| Scouting accuracy by position | ✅ In SCOUTING_SYSTEM_SPEC | — |
| Separated modes architecture | ✅ In SEPARATED_MODES_ARCHITECTURE | — |
| Dynamic schedule | ✅ In FRANCHISE_MODE_SPEC | — |
| Fictional dates | ✅ In FRANCHISE_MODE_SPEC §11.3 | — |

**Score: 15 of 21 DEEPDIVE_FEEDBACK items are captured in specs. 5 are missing or incomplete. 1 is an open question.**

---

## Cross-Spec Re-Scan Findings (Domain 3) — Added 2026-02-22

*These findings were identified by re-scanning all Domain 3 specs against each other (not just against GOSPEL), per the cross-spec reconciliation rule added to SKILL.md after the FAN_FAVORITE_SYSTEM_SPEC protocol failure.*

### C-063 — Trait Assignment Timing Sequence
- **Files:** OFFSEASON_SYSTEM_SPEC.md vs EOS_RATINGS_ADJUSTMENT_SPEC.md
- **OFFSEASON (lines 100-118):** Phase 2 (Awards) includes Trait Assignments → Phase 3 (Ratings Adjustment). Traits assigned FIRST.
- **EOS (line 455):** "Traits are assigned AFTER ratings adjustments, during the Awards Ceremony phase." Ratings adjusted FIRST.
- **Conflict:** Sequence reversed. OFFSEASON says traits → ratings; EOS says ratings → traits.
- **Type:** CONTRADICTION

### C-064 — Trait Pool Chemistry-Weighting vs Unrestricted Assignment
- **Files:** OFFSEASON_SYSTEM_SPEC.md vs EOS_RATINGS_ADJUSTMENT_SPEC.md
- **OFFSEASON (line 535):** "MVP Winner → Random positive trait (chemistry-weighted)" — chemistry type influences trait selection
- **EOS (lines 464-466):** "Traits can come from ANY Chemistry type. A player's own Chemistry type does NOT restrict which traits they can receive. Chemistry affects POTENCY, not eligibility."
- **Conflict:** OFFSEASON implies chemistry-weighted selection pool; EOS explicitly says chemistry affects potency only, NOT eligibility.
- **Type:** CONTRADICTION

---

*Domain 3 complete. Cross-spec re-scan added 2 findings (C-063, C-064) on 2026-02-22.*
