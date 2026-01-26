# KBL Tracker - Decisions Log

> **Purpose**: Record of key decisions made during development with context and rationale
> **Format**: Reverse chronological (newest first)

---

## January 2026

### 2026-01-25: SMB4 UI Cleanup - Removed Balk Button

**Context**: User manual testing revealed Balk button was still present in GameTracker despite balks not being possible in SMB4.

**Decision**: Remove BALK from event buttons entirely.

**Rationale**:
- SMB4 does not have balks as a game mechanic
- "Too many throws over" IS possible but is not a balk
- The button was creating confusion and wasting UI space
- Per SMB4_GAME_MECHANICS.md - only real baseball rules that SMB4 implements should have buttons

**Files Changed**:
- `src/components/GameTracker/AtBatButtons.tsx` - Removed 'BALK' from eventButtons array

---

### 2026-01-25: Added Position Switch Feature

**Context**: User feedback that there was no way to change a defensive player's position without first removing them from the game (Def Sub → new player at new position).

**Decision**: Add POS_SWITCH event type allowing position swaps between players on field.

**Rationale**:
- In baseball, managers can move players to different positions without substitution
- Example: Move SS to 2B and 2B to SS (defensive realignment)
- This is common for defensive positioning based on batter handedness or late-game situations

**Files Created/Changed**:
- `src/types/game.ts` - Added 'POS_SWITCH' to GameEvent, PositionSwitchEvent interface
- `src/components/GameTracker/PositionSwitchModal.tsx` - New modal component
- `src/components/GameTracker/AtBatButtons.tsx` - Added "Pos Switch" button
- `src/components/GameTracker/index.tsx` - Wired up modal

---

### 2026-01-25: Day 3 Spec Contradiction Resolution

**Context**: NFL audit identified 5 spec contradictions that appeared to conflict but actually represented intentional dual-purpose systems.

**Decisions** (per user):

1. **Mojo Jacked (WAR 0.90x vs Stat 1.18x)**: **Keep both** - These serve different purposes. The 0.90x WAR credit is for attribution (luck factor), while 1.18x stat boost is for simulated performance.

2. **Juiced Fitness (Fame 0.5x vs Stat 1.20x)**: **Keep both** - Fame credit (0.5x) applies to all games as PED stigma, stat boost (1.20x) primarily for simulated games. Clarifying note added to spec.

3. **Strained Fitness (WAR 1.10x vs Fame 1.15x)**: **Use both values** - Different contexts. WAR credit 1.10x for stat attribution, Fame credit 1.15x for achievement recognition ("playing through pain").

4. **Rattled Mojo (Clutch 1.30x vs WAR 1.15x)**: **Use both values** - Clutch 1.30x applies to leverage-weighted situations, WAR 1.15x for general attribution. Both reward overcoming adversity.

5. **FIP Constant (3.10 vs 3.15)**: **Use 3.15 for spec examples** - Updated PWAR_CALCULATION_SPEC.md. Actual SMB4 implementation uses 3.28 (calibrated from league data per ADAPTIVE_STANDARDS_ENGINE_SPEC.md).

**Rationale**: The apparent contradictions are intentional design - a nuanced system where stat performance, WAR attribution, Fame recognition, and clutch evaluation each have their own appropriate modifiers.

**Implications**:
- Clarifying notes added to MOJO_FITNESS_SYSTEM_SPEC.md
- FIP constant guidance updated in PWAR_CALCULATION_SPEC.md
- MASTER_SPEC_ERRATA.md should be updated to mark these as resolved

---

## January 2025

### 2025-01-21: Adaptive Learning Architecture

**Context**: Building fielding inference system - need probability matrices for which fielder handles balls by direction/type. No perfect MLB data source exists for exact percentages.

**Decision**: Implement "reasonable defaults + learn over time" architecture across ALL statistical systems, not just fielding.

**Design**:
1. Start with sensible defaults based on MLB research/first principles
2. Track expected vs. actual outcomes for every inference
3. Store historical data to refine probabilities over time
4. Apply learning to: fielding assignments, park factors (HR distance), batted ball outcomes, etc.

**Rationale**:
- Avoids over-engineering upfront with fake precision
- Real usage data from YOUR games is more relevant than MLB averages
- Creates a system that gets smarter the more you use it
- Allows for player-specific tendencies (e.g., "this CF has exceptional range to left-center")

**Implications**:
- Data persistence becomes even more critical (must store historical data)
- Need schema design that supports expected/actual tracking
- Future features: "confidence intervals" on inferences, anomaly detection

---

### 2025-01-21: UI/UX Deferred Until Feature Complete

**Context**: Current UI is functional but rough. Question arose: design now or later?

**Decision**: Complete all backend logic/features first, then do comprehensive UI/UX pass.

**Rationale**:
- Designing before features are complete risks rework
- One coherent design pass is better than incremental patches
- Well-documented specs make future design a "translation" exercise
- Risk of designing wrong thing > cost of designing later

**Implications**: Current UI will remain rough during development phase.

---

### 2025-01-21: UI Testing Protocol Established

**Context**: Needed to verify that code logic worked correctly through the actual UI, not just unit tests.

**Decision**: Established comprehensive UI testing protocol using browser automation to click through all scenarios.

**Rationale**: Unit tests verify logic in isolation, but UI tests catch:
- Modal interaction bugs
- State not updating correctly
- Button enable/disable issues
- Visual feedback problems

**Outcome**: 17 UI test scenarios documented in WORST_CASE_SCENARIOS.md

---

### 2025-01-21: Video Game Tracker Clarification

**Context**: Initial edge case list included real-baseball scenarios like catcher interference, kids league rules.

**Decision**: Removed inapplicable scenarios. This is a VIDEO GAME tracker (MLB The Show style), not real baseball.

**Implications**:
- No umpire judgment calls needed
- No catcher interference, balk detection by system
- User manually inputs all outcomes (game tells them what happened)
- DH rules still apply (can be removed mid-game)
- Substitution rules still apply

**Rationale**: User clarified the use case. Real baseball has scenarios that don't occur or matter in video games.

---

### 2025-01-21: DP Out Counting Fix

**Context**: DP was adding 3 outs instead of 2 (DP result + runner marked as out).

**Decision**: DP result adds exactly 2 outs. Runner outcomes during DP that show "Out" are part of the DP, not additional outs.

**Code Change**: Modified `handleAtBatFlowComplete` to not double-count runner outs on DP.

**Test**: Verified with bases loaded, 1 out. DP should result in exactly 3 outs (1+2), not 4.

---

### 2025-01-21: Base Clearing Bug Fix

**Context**: When R2 scored, wrong base was being cleared (third instead of second).

**Decision**: Fixed line 183 in index.tsx to clear `second` base, not `third`.

**Root Cause**: Copy-paste error during initial implementation.

---

### 2025-01-21: Extra Events Processing Fix

**Context**: Extra events (SB, WP, PB, Balk) recorded during at-bat weren't being processed when at-bat completed.

**Decision**: Added `extraEvents` processing in `handleAtBatFlowComplete`.

**Rationale**: Events during an at-bat need to be applied to game state before moving to next batter.

---

### 2025-01-XX: RBI Exclusion Rules

**Context**: Needed to define when RBIs should NOT be credited.

**Decision**: No RBI credited for:
- Runs scored on errors (E)
- Runs scored on double plays (DP)
- Runs scored on wild pitches (WP)
- Runs scored on passed balls (PB)
- Runs scored on balks

**Rationale**: Follows MLB Official Scoring Rules. These are not "driven in" by the batter.

---

### 2025-01-XX: Force Play Logic

**Context**: Needed to determine when runners are forced to advance.

**Decision**: Implemented `getMinimumBase()` function with rules:
- Walk/HBP: Only force if all bases behind are occupied
- Single: R1 forced to 2B minimum
- Double: R1/R2 forced to 3B minimum
- Triple/HR: All runners must score

**Rationale**: Follows baseball rules - a runner is forced when the batter (or another forced runner) takes their base.

---

### 2025-01-XX: 3rd Out on Force Play Rule

**Context**: If 3rd out is a force play, runs that crossed plate before the out do NOT count.

**Decision**: Implemented check in scoring logic - if 3rd out is force, nullify any runs scored on that play.

**Rationale**: MLB Rule 5.08 - run cannot score if third out is force out at any base.

---

## Template for New Entries

```markdown
### YYYY-MM-DD: [Brief Title]

**Context**: [What situation led to this decision?]

**Decision**: [What was decided?]

**Alternatives Considered**: [Optional - what else was considered?]

**Rationale**: [Why this choice?]

**Implications**: [What does this affect going forward?]

**Outcome**: [Optional - what happened as a result?]
```

---

*Add new decisions at the top of this document.*
