# KBL Tracker - Decisions Log

> **Purpose**: Record of key decisions made during development with context and rationale
> **Format**: Reverse chronological (newest first)

---

## June 2026

### 2026-06-14: T8 (Mode 1 League Construction Suite) — scope rulings + split (JK)

**Context**: Opening the T8 ticket (IV spec §5/§6/§7 — pool registration, snake
draft, pick chart + trade validator, identity composition UI, scout-obscured farm
pricing, luxuryTax + balanceMode). Captain mapped scope across 6 surfaces
(`T8_SCOPE_MAP.md`) and surfaced 4 genuine decisions; JK ruled.

**Decisions (JK, 2026-06-14):**
1. **Split** — T8 ships as **four engine-first sub-tickets** (mirrors T6→T7):
   **T8a** pure `leagueConstruction.ts` engine + §12 constants → **T8b** tier/luxuryTax/
   balanceMode wiring + RegisteredPool persistence (`kbl-league-builder` v5→v6) + Path A
   IV re-pricing → **T8c** identity-composition UI → **T8d** snake draft (Path B) + pick
   chart + trade validator + solvency signals + potency overlay + farm scout-obscured IV.
2. **Pool scope** — T8 supports the **stock 440-pool only**; in-app custom/non-stock
   tier derivation is **deferred to T12** (Pool Recalibration Tool). T8 consumes the
   precomputed `tierParams.ts` (Juiced/Standard/Nerfed); spec §13 favors this.
3. **Identity composition — decreases are OPTIONAL, maximize customizability.** JK:
   "allow all-increase but also allow decreases … less requirements, better to allow
   the user to customize league texture." So `composeIdentity` does NOT force 2
   decreases (the §6.3 reference impl already defaults decreases to none); the T8c UI
   lets the creator freely edit the increase/decrease stack within the §6.2 envelope
   (≤2 increase + ≤2 decrease). The luxury tax + tier cap remain the balancers.
   Supersedes the open ID-9 design flag in `analyze-pool.py:1185-1188`.
4. **Identity band-priority input** — **point-allocation** (the spec'd input), not
   rank-order.

**Rationale**: Engine-first isolates the highest-correctness-risk surface (a port of
the spec-faithful Python oracle `analyze-pool.py`) for hard audit before any consumer
wires onto it; the data layer (`tierParams.ts`) already exists and is the first
production consumer here. Stock-only keeps T8 bounded and avoids duplicating T12.
Optional decreases makes identity a creative texture tool rather than a forced
trade-off, per JK's product taste.

**Trade-offs**: Optional decreases means a rational creator may take pure-upside
identities; the luxury concentration tax (not the identity stack) is then the sole
balancer of those gains — acceptable and intended. Custom-pool leagues are not
tier-calibrated until T12.

**Routing**: each sub-ticket Codex 5.5 | very high → Opus 4.8 audit (Fable unavailable;
auditor ≠ builder). T8b/T8c/T8d persistence/UI audits non-negotiable per §13.

**T8b rulings + scope refinement (2026-06-14):**
- (a) **Migration is ADDITIVE-ONLY** (JK): the `kbl-league-builder` v5→v6 upgrade adds
  `tier`/`balanceMode` (optional, on `LeagueTemplate`) + a `RegisteredPool` store; existing
  saved leagues are NOT re-priced — re-pricing applies to new construction only. No data rewrite.
- (b) **balanceMode lives in the League Builder only** (JK); the Franchise Setup Wizard
  INHERITS it (no wizard control — honors §7.1 "no wizard changes").
- (c) **SCOPE FINDING (Captain, first-hand verified):** "Path A IV re-pricing" is LARGELY
  ALREADY DONE. T5/D15 rebuilt `calculateSalary` on `computeIV().kblIV`
  (`salaryCalculator.ts:739-776`; `leagueBuilderStorage.computeInitialSalary → calculateSalary`
  at `:1653-1680`). Pool salaries are already IV-based AND tier-invariant (a player's IV never
  changes with tier; tier only shifts caps + the generated-player nerf). So T8b shrinks to:
  `registerPool` assembly (IV + tierCap + luxuryCaps + pickValueChart + balanceMode) + additive
  v5→v6 persistence + tier/balanceMode League-Builder UI — NOT a salary rewrite. The mapping
  agent's "pool priced by the OLD salaryCalculator" was imprecise; corrected here.

---

### 2026-06-14: AI-team setup reconciliation (Captain pass over Codex's setup)

**Context**: Codex built the shared operating setup (entry below). A Captain
review against existing canon (SESSION_RULES + AUDIT_PLAN + the prompt-contract
pipeline) found it ~85% aligned, with one conflict, stale facts, and three new
policies needing a JK ruling. Reconciled in one session; committed with the
setup.

**Decisions (JK-ruled 2026-06-14)**:
1. **One session-start ritual.** CLAUDE.md's startup block was reading 3 files
   (CURRENT_STATE/SESSION_LOG/DECISIONS); corrected to the canonical 5
   (SESSION_RULES → AUDIT_LOG → AUDIT_PLAN → SESSION_LOG → CURRENT_STATE) so
   every runtime boots identically. AI_TEAM_OPERATING_MODEL's build-loop opener
   aligned to the same list.
2. **Stale facts purged from CLAUDE.md.** useGameState.ts corrected to ~12,585
   lines (both prior figures — 4,647 and 2,344 — were wrong); test count no
   longer hardcoded (pointed at CURRENT_STATE live baseline, currently
   7,140/383); skill counts de-hardcoded (dirs are source of truth).
3. **Browser-verification gate.** Codex pre-checks via Playwright and reports,
   but JK's manual sign-off on real data is the SOLE closing gate. A browser
   pre-check never closes a ticket on its own.
4. **Self-Improvement Loop uses a pending-ratification pen.** Agents WRITE the
   proposed rule immediately into a `Lessons Learned (pending JK ratification)`
   section of SESSION_RULES (Write-First), but it is a PROPOSAL until JK says
   "ratify." No agent promotes its own rule or edits ratified rules without JK.
   (Chosen over fully-automatic to prevent unsupervised edits to the governing
   rulebook — the canon-drift failure mode.)
5. **Subagent strategy kept as-is** (low-risk, no conflict).
6. **CURRENT_STATE split.** The 693-line file became a ~40-line live header +
   CURRENT_STATE_HISTORY.md (full arc trail, verified byte-identical on split).
   Session-end protocol updated to match (append outgoing snapshot to history,
   rewrite live header in place).

**Rationale**: The existing system is mature; the goal was to close drift, not
add a framework. The conflict (#1) was the only true partnership-breaker — a
fresh runtime would otherwise skip its own rules file. The footgun blocks
(NODE_ENV= prefix + characterized baseline; builder-reporting completeness)
were folded into SESSION_RULES because they had been living only in scattered
CURRENT_STATE notes.

**Implications**:
- Three docs now agree on the session-start ritual; no second source of truth.
- Roles/routing/loops live in AI_TEAM_OPERATING_MODEL.md (resolves the stale
  3-role table in SESSION_RULES' Accountability section by reference).
- The current Codex session that authored the setup is now stale (files changed
  underneath it); T6 should start in a FRESH Codex session reading committed
  canon — this is a sanctioned exception to "continue long sessions" (arc
  boundary).

---

### 2026-06-14: Shared Codex / Claude Opus 4.8 Operating Model (initial setup)

**Context**: JK wants Codex, Claude Opus 4.8, and himself working as a tighter build/audit team on KBL Tracker, with less setup drift and stronger handoffs.

**Decision**: Keep `CLAUDE.md` as the canonical repo instruction file. Add `AGENTS.md` as a short Codex bridge, add `spec-docs/AI_TEAM_OPERATING_MODEL.md` as the shared team protocol, mirror selected Claude/project skills into `.agents/skills/` by symlink for Codex discovery, and mirror Playwright MCP into `.codex/config.toml`.

**Rationale**: One canonical instruction source prevents Claude/Codex drift. Symlinked skills let both runtimes share workflow definitions without copying. Separate MCP configs let both runtimes use browser tooling. The builder/auditor triangle keeps speed from eroding verification quality.

**Implications**:
- Future Codex sessions should read `AGENTS.md`, then `CLAUDE.md`, then the team operating model for multi-agent work.
- Future Claude sessions should treat Codex as the default builder/local verifier unless JK routes otherwise.
- Claude Opus 4.8 can audit Codex work when Fable is unavailable, but no agent audits its own diff.
- New shared skills should be added to the source skill folder and mirrored into `.agents/skills/` when Codex should discover them.

---

## Deferred Technical Debt Register
> Items explicitly deferred during Phase 1/2 audit (2026-02-18). Each has a trigger condition — the event that makes it worth picking up.

| ID | Finding | Item | Trigger to Re-open |
|----|---------|------|--------------------|
| DEFER-001 | F-107 | **franchiseId scoping** — seasonStorage, gameStorage, offseasonStorage have no franchiseId scope. Stats are seasonId-scoped only. Single-franchise constraint masks the gap today. | **Multi-franchise support.** When a second franchise is added, stats will bleed across franchises without this fix. Must be resolved before multi-franchise ships. |
| DEFER-002 | F-109 | **Career stats idempotency** — incremental write pattern (accepted over derive-on-read). Risk: mid-pipeline failure causes career ↔ season drift. | Any reported career stat discrepancy, OR when a write-failure bug is found in the aggregation pipeline. Add transaction-level guard at that point. |
| DEFER-003 | F-115 | **Salary service time** — age-based salary calc accepted as KBL design. No service time, no contract eligibility tiers. | If KBL adds free agency, arbitration, or contract negotiation features that require eligibility gating. |
| DEFER-004 | F-121 | **Player Dev Engine** — no 10-factor growth model exists. Design deferred. | Phase 2 design session with JK. Implement season-close development pass once model is defined. |
| DEFER-005 | F-101C | **Fan morale localStorage → IndexedDB** — will be fixed in same pass as Bug A/B per Phase 2 plan. Listed here for completeness. | Included in Phase 2 FIX-CODE execution. Not a future defer. |

> **DEFER-001 is the most important.** Multi-franchise is a planned feature. When it's on the roadmap, pull F-107 immediately — it requires touching storage, hooks, and every stats display that reads season data.

---

## February 2026

### 2026-02-18: Phase 2 Fix Queue Decisions (11 FIX-DECISION items resolved)

**Context**: Phase 1 audit complete. 11 FIX-DECISION items required JK calls before Phase 2 fix execution could begin.

**Decisions Made**:
| # | Finding | Decision |
|---|---------|----------|
| 1 | F-101C | Fan morale localStorage → IndexedDB: **same pass** as Bug A/B fix |
| 2 | F-107 | franchiseId scoping: **DEFER** — see DEFER-001 above |
| 3 | F-109 | Career stats model: **accept incremental write** + add idempotency guard |
| 4 | F-113 | Playoff stats write path: **wire it** — GameTracker → PLAYOFF_STATS during playoff games |
| 5 | F-114 | Mojo auto-update: **stay manual**. Persistence between games: **YES** (IndexedDB) |
| 6 | F-115 | Salary service time: **accept age-based** as KBL design — see DEFER-003 |
| 7 | F-119 | Relationships system: **re-enable** (add persistence + wire to LI + dev rate) |
| 8 | F-120A | Narrative persistence: **persist recaps to IndexedDB** |
| 9 | F-120B | Headline engine: **wire it** into the pipeline |
| 10 | F-121 | Player Dev Engine: **defer design** — JK has idea, define in Phase 2 before implement |
| 11 | F-122 | Record Book: **wire oddityRecordTracker AND build standard record book** |



### 2026-02-05: D3K (Dropped Third Strike) Confirmed in SMB4

**Context**: Spec documents (`RUNNER_ADVANCEMENT_RULES.md` line 23, `archive/SMB4_GAME_MECHANICS.md` line 16) incorrectly stated "Dropped 3rd Strike: ❌ NO". However, `RUNNER_ADVANCEMENT_RULES.md` line 253 correctly described D3K rules, creating an internal contradiction. The `recordD3K()` function was already fully implemented in `useGameState.ts` and fires via specific 2-3 fielding sequence detection.

**Decision**: D3K **exists** in SMB4. Updated all spec docs to reflect ✅ YES. Code implementation (`recordD3K`) is correct and requires no changes.

**Rationale**: User confirmed from direct gameplay experience that D3K is a real mechanic in Super Mega Baseball 4. The original spec entries were wrong.

**Files Changed**:
- `spec-docs/RUNNER_ADVANCEMENT_RULES.md` — Line 23: ❌ NO → ✅ YES
- `spec-docs/archive/SMB4_GAME_MECHANICS.md` — Line 16: ❌ NO → ✅ YES

**Implications**: The existing `recordD3K()` code in `useGameState.ts` is correct as-is. D3K detection via 2-3 fielding sequence can remain active.

---

### 2026-02-03: Testing Plan Expanded to Cover Complete Figma UI

**Context**: Testing Implementation Plan originally focused heavily on GameTracker and calculation engines. User requested comprehensive coverage of ALL Figma UI components.

**Decision**: Expand testing plan from 6 phases to 11 phases, covering every page and component in the Figma codebase.

**Rationale**:
- Original plan would leave 60+ UI components untested
- League Builder, Franchise Mode, Exhibition, and Playoffs all have significant business logic
- Offseason flows (Trade, Draft, Free Agency, etc.) have complex state management
- Complete coverage ensures no orphaned or broken UI code

**Phases Added**:
| Phase | Coverage | Tests |
|-------|----------|-------|
| Phase 6 (Expanded) | GameTracker UI Components | 50+ |
| Phase 7 | League Builder (7 pages) | 40+ |
| Phase 8 | Franchise Mode (15 components, 6 hooks) | 80+ |
| Phase 9 | Exhibition Mode | 15+ |
| Phase 10 | Playoff/World Series | 25+ |
| Phase 11 | Navigation | 10+ |

**Sprint Plan Extended**:
- 5 sprints → 8 sprints
- Sprint 5-8 cover Phases 6-11

**Target Changes**:
- Test files: 55+ → 120+
- Passing tests: 1800+ → 3000+

**Intentionally Skipped**:
- 45 shadcn/ui primitive components (library code, not business logic)
- DragDropFieldDemo.tsx (demo component)
- SubstitutionModalBase.tsx (tested via derived modals)

**Document Updated**: `spec-docs/TESTING_IMPLEMENTATION_PLAN.md`

---

### 2026-02-03: Legacy↔Figma Codebase Reconciliation Complete

**Context**: Build was failing with 42 TypeScript errors after Phase 1 & 2 Figma buildout.

**Decision**: Fix API mismatches in integration wrappers rather than rewriting integrations.

**Rationale**:
- Root cause was AI-generated integration files that hallucinated API signatures
- Integration wrappers assumed different function signatures than actual legacy engines
- Fixing to match actual APIs is faster and preserves existing architecture

**Root Cause Pattern Identified**:
```
Integration file assumed: processEndOfSeasonAging(age, rating)
Actual legacy API:       processEndOfSeasonAging(age, {overall: rating}, fame, modifier)
```

**Files Fixed**: 7 integration/hook files
**Files Created**: 2 stub files for missing franchiseStorage

**Special Case**: `useFanMorale.ts` was stubbed out (not imported anywhere, 21 errors)

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
## Feb 15, 2026 — Park Dimensions as Canonical Data

**Decision:** Use Billy Yank's Guide to Super Mega Baseball (3rd Edition) as the canonical source for all SMB4 park dimensions (fence distances and wall heights).

**Context:** The app needs real park dimensions for two features: (1) HR distance validation during at-bat recording, and (2) park factor derivation for WAR calculations. The existing ParkFactors interface in src/types/war.ts had abstract multipliers but no connection to actual stadium geometry.

**Rationale:** Billy Yank's Guide is the most comprehensive community resource for SMB4 data. The fence distances were manually compiled from in-game measurements across all 23 stadiums. Wall heights are categorized as low/medium/high.

**Implementation:** src/data/smb4-parks.json + src/data/parkLookup.ts. Consumed by upcoming R2 (park factor derivation) and B3 (stadium association + HR validation).

**Trade-offs:** The dimensions are representative, not pixel-perfect. Parks have variable geometry that a simple LF/CF/RF + wall height model doesn't fully capture (e.g., Lafayette Corner's frequent wall height variations, Stade Royale's unusual outfield shape). This is acceptable for v1; refinement is deferred.

---

## Feb 15, 2026 — Shim Modules for src_figma Imports

**Decision:** Create re-export shim modules in src/src_figma/utils/ rather than mass-renaming import paths.

**Context:** The src_figma directory tree had stale imports pointing to ../../utils/gameStorage etc. that broke when the root utils modules were restructured. The options were: (a) fix every import path in src_figma, or (b) create thin shim modules that re-export from the correct locations.

**Rationale:** Shims minimize churn and risk. Changing dozens of import paths across components and tests is high-risk for a non-functional change. Shims achieve the same result with 4 small files.

**Trade-offs:** Adds a layer of indirection. If src_figma is ever consolidated into the main source tree, the shims should be removed and imports updated directly.

---

## Feb 15, 2026 — Archived Code Excluded from Build

**Decision:** Exclude src/archived-pages/ and src/archived-tests/ from TypeScript compilation via tsconfig.app.json rather than deleting them.

**Context:** 16 of 26 pre-existing build errors came from archived files referencing modules that no longer exist. These files are not used by the running application.

**Rationale:** Excluding preserves git history and allows future reference. Deleting would be cleaner but irreversible without git archaeology.

**Trade-offs:** The files still exist on disk and could confuse future contributors. A comment in tsconfig.app.json explains why they're excluded.

---

## Jun 14, 2026 — Recommendation surfaces may never consume hidden information (no-oracle-leak principle)

**Decision:** Any KBL recommendation surface (Mode 2 call-up/send-down recs = T7b; in-game sub recs = T9; any future advisory surface) may consume ONLY scout-visible / user-visible information when valuing a player whose true ratings are hidden. Farm prospects are valued from `scoutedGrade` + `scoutConfidence` (the scouted view), NEVER from true ratings / true IV. MLB players (known commodities) use the true TV2 value.

**Context:** Drafting T7b (§8.3 call-up/send-down recs), the proposed v1 valued farm prospects on their internal trueIV. JK caught that this leaks: a rec built on true value is an oracle — an astute user back-calculates relative value, and thereby the hidden ratings, regardless of scouting accuracy.

**Rationale:** (1) Preserves §7.4 (scout-obscured farm IV) — the rec adds no information the user doesn't already have. (2) Preserves the risk/reward asymmetry: MLB players are KNOWN (true value); farm prospects are UNCERTAIN (scouted estimate carries noise w = scoutNoiseBase × (1 − scoutAccuracy)) — so calling up a prospect is a genuine gamble and sending down a known commodity is the certain side. (3) Preserves call-up excitement: true ratings reveal ONLY at call-up; the rec never knew them.

**Trade-offs:** The rec is only as good as the scouting (it can be wrong) — which is the intended design, not a defect. A richer scouted-distribution / expected-value model (vs the v1 scouted point-estimate + confidence label) is a flagged follow-up. Governs T7b; cite in T9.

---

## Jun 14, 2026 — T8d scope rulings (snake-draft suite)

**Decision (4 rulings, JK via AskUserQuestion):** For T8d (the §7.3 snake-draft surface):
1. **Solvency budget source = tierCap for every team.** No new per-team budget field is added in v1.
   `budget` in the §7.3:491 solvency inequality = `TIER_CAPS[tier].tierCap`. Per-team divergence in the
   GREEN/YELLOW/RED/BLOCKED signals comes ONLY from identity-shifted luxury caps + each team's drafted
   roster, not from per-team budgets. (§5.2's "budgets may be set below tier cap" is NOT implemented in v1.)
2. **`cheapestFillCost` = position-agnostic for v1.** The reserve term is `slotsRemaining × (cheapest
   available salary in the live remaining pool)`, ignoring the 22-man positional skeleton (which the spec
   never enumerates). Luxury tax + tier cap remain the real balancers.
3. **Potency overlay (R12) DEFERRED to a fast-follow.** The chemistry count→tier (L1/L2/L3) numeric
   mapping is undefined anywhere (not §12, not constants, not any SMB4 reference doc). Building it now would
   mean inventing thresholds (a spec-discipline violation). T8d ships without the potency overlay; R12
   returns once the SMB4 in-game thresholds are known. Note: the prior `T8_SCOPE_MAP.md` claim that an
   `effectiveRatings.potencyTier` function exists is FALSE — `potencyTier` is a TYPE only
   (`rosterEngineConstants.ts:11`); the resolver function must be built when R12 is undeferred.
4. **Farm scope = MLB board only; §7.4 scout-obscured farm IV (R9) DEFERRED to a fast-follow.** T8d builds
   ONLY the 22-man MLB snake board. The existing farm/prospect draft (`LeagueBuilderDraft.tsx`, scoutedGrade
   model) stays exactly as-is, protecting the working farm-scouting handoff. The §7.4 trueIV-range display
   becomes a clean follow-on (which will then resolve the scoutedGrade-vs-trueIV-range model collision).

**Context:** Captain mapped T8d via a 7-agent decorrelated fan-out (`T8d_SCOPE_MAP.md`). Four design forks
genuinely gated the build (no defensible default existed). JK ruled all four to the recommended (leanest)
option.

**Implications:** T8d collapses from 4 sub-tickets to **3**: T8d-1 (snake + solvency engine, pure),
T8d-2 (draft-session persistence v6→v7 + snake-board shell + dual-write + handoff verify), T8d-3 (board
overlays: pick chart + trade validator + per-team signals). R9 + R12 are tracked fast-follows. Two
constants enter the registry now (`solvencyRedMargin` 0.10; `solvencySevereTaxFrac` ≈ 0.20 Captain default
for the RED "severe tax" band, proceed-unless-vetoed); `scoutNoiseBase` defers with R9.

**Trade-offs:** Position-agnostic `cheapestFillCost` can theoretically let a team overspend and be unable
to fill a specific position — acceptable for v1 (tax+cap are the real guardrails; revisit if playtest shows
position starvation). MLB-first defers the farm IV-range, leaving two farm-value models un-unified until R9.

---

## Jun 14, 2026 — T9 scope rulings (GameTracker sub-recommendation rebuild)

**Decision (4 rulings, JK via AskUserQuestion):** For T9 (IV spec §10 — rebuild the in-game
`generateManagerRecommendations` placeholder onto effectiveRatings, the "third surface"):
1. **Delta metric = IV-of-effectiveRatings (kblIV).** `delta = computeIV(effectiveRatings(sub)).kblIV −
   computeIV(effectiveRatings(current)).kblIV`, identical to T7a `optimizeLineup` / §8.1 — "one truth,
   three surfaces." Leverage enters via pressure→mojo amplification inside effectiveRatings; the dedicated
   leverage-weighted surface is T10 (Lineup Delta WPA), kept separate.
2. **`subRecThreshold` = per-type** (pinch-hit / defensive-replacement / pitcher-change), in kblIV-dollar
   units, CALIBRATE/playtest-tunable. (kblIV magnitudes differ by rec type, so a single global threshold
   would over/under-fire by type.)
3. **New pure engine module** `src/engines/subRecommendations.ts` (`recommendSubs` → neutral
   `SubRecommendation[]`); `managerWpaRecommendations.ts` becomes a thin adapter mapping
   `SubRecommendation → ManagerRecommendation`. Matches §11's pure-engine boundary.
4. **Split = 2 tickets** (engine-first): **T9a** pure engine (+ `subRecThreshold`), exhaustively unit-tested,
   standing auto-commit; **T9b** GameTracker integration (widen the call-site mapping, derive the pressure
   band, rebuild the 3 generators to call the engine, rewrite generation tests) — user-visible +
   GameTracker-state → audit non-negotiable + JK surface before commit.

**Context:** Captain mapped T9 via a 4-agent decorrelated fan-out (`T9_SCOPE_MAP.md`). Decisive finding:
full ratings + traits are ALREADY in live state (the rec call-site just strips them), so T9 needs no deep
`useGameState` plumbing — only a widened call-site mapping + a derived pressure band + `subRecThreshold`.

**Implications:** T9a is a clean isolated engine addition (new file + additive type exports + an
`activeTraitNames` helper on effectiveRatings.ts for justification naming + the per-type constant);
rosterAnalyzer/T7 stays byte-unchanged (the scorer is reimplemented and the audit diffs it for
equivalence vs `rosterAnalyzer.ts:535-571`). The `ManagerRecommendation` output type + watch/decision
plumbing + NewsBoard UI are preserved by T9b.

**Captain defaults (proceed-unless-vetoed):** pressure band none<1.5≤high<3.0≤extreme (builds on the
existing isClutch LI≥1.5 precedent, CALIBRATE); role-misuse applied as a mojo-LEVEL down-shift on the
candidate before scoring (CP early-entry inning derived from totalInnings); defensive-sub folds
DefensivePlacementRisk into the kblIV delta (mirrors T7a `assignmentEntry`) AND surfaces it as
justification; no-oracle-leak N/A for T9 (active known 22-man roster).

**Trade-offs:** kblIV for a pitcher-change compares two pitchers' arsenal-dominated kblIV — a coarse but
consistent in-game signal; refine via T10 if playtest shows need. Reimplementing the scorer duplicates ~15
lines of clamp+assemble mapping (audit-diffed) rather than refactoring T7 — chosen to keep T9a isolated.

**T9b firing-gate addendum (JK 2026-06-14):** in-game sub recs fire on a **PURE IV-delta gate** — emit
whenever the best sub's per-type IV-delta > `SUB_REC_THRESHOLD[type]`, with NO separate situational
pre-filter. The rebuild REMOVES the placeholder's situational firing heuristics entirely (leverage floor,
batting-order 7-9 pinch-hit gate, pitcher meltdown triggers: consecutive baserunners / runs-allowed-in-
inning). Rationale (JK): fatigue is baked into the tiring player's effectiveRatings and leverage amplifies
via mojo/pressure, so the IV-delta self-limits — spec-literal "replace, do not patch." Accepted tradeoff: a
situational meltdown with no ratings drop (e.g. a pitcher walking the bases loaded) won't trigger a rec, and
recs may surface in low-leverage spots; revisit in playtest if the firing cadence feels off. (Captain had
recommended a situational-gate + IV-delta hybrid; JK chose the pure gate.)

---

## Jun 15, 2026 — T10 scope rulings (Lineup Delta WPA standard + constants snapshotting)

**Context:** Captain mapped T10 (IV §9 Lineup Delta WPA standard + §12 per-season constants snapshot) via a
6-agent decorrelated fan-out + 2 critics (`T10_SCOPE_MAP.md`). All decision-determining claims independently
Captain-verified (file:line). Decisive findings: (1) the §8.1 optimizer (`optimizeLineup`) and the lineup-lock
snapshots are already built; (2) the LITERAL §9 delta already exists but display-only —
`summarizeLineupSnapshotComparison` (`optimalLineup.ts:416-429`) returns
`projectedOpportunityCostTotal = chosen.projectedTeamLineupKblWpa − optimal.projectedTeamLineupKblWpa`; (3) the
ALREADY-PERSISTED `ManagerLineupDeltaRecord.managerWpa` (`managerWpaGameState.ts:929-941`) is a DIFFERENT
number — realized-vs-projected (`actualChosenKblWpa` realized in-game WPA − projected IV), a unit mix; (4)
"WPA" is a misnomer — per D9 the values are IV-of-effectiveRatings dollars rescaled by a ÷10,000,000 divisor
(`rosterEngineConstants.ts:260`); (5) no constants-snapshot mechanism exists (greenfield); (6) a pre-existing
defect: `backupRestore.ts` is stale at v12 and silently drops the v13/v14/v15 stores (separate ticket).

**JK rulings (3 forks, recommendations adopted):**
1. **§9 semantics = IV-of-effectiveRatings (NOT literal win-probability).** Per D9 + all shipped code. "WPA"
   is legacy branding; the misnomer is documented in spec + code comment, and any field rename is DEFERRED to
   a v2 ticket (renaming would touch persisted records + ~30 readers).
2. **The §9 standard = the LITERAL pure projected-vs-projected scalar, persisted additively; the existing
   realized-vs-projected `managerWpa` is KEPT SEPARATE and UNTOUCHED.** They measure two legitimately
   different things (ex-ante opportunity cost vs ex-post manager credit). The new §9 scalar is sourced from
   `summarizeLineupSnapshotComparison` and persisted as a NEW, additive, audit-only field — it does NOT fold
   into the `managerValue` rollup (would double-count the per-slot deltas already summed there) and MUST NOT
   regress any of the 5 live surfaces or `almanacManagerWpa.test.ts`.
3. **Constants snapshot = full-dependency CONTENT HASH stamped on `SeasonMetadata`; single "high" T10 ticket.**
   Hash the full optimizer dependency set — the optimizer subset of `rosterEngineConstants` + `ivCurves` +
   `traitPricing` + `traitInteractionMatrix`; **`tierParams` EXCLUDED** (not imported by any of the 3 optimizer
   engines, verified). Stamp `optimizerConstantsVersion`/`optimizerConstantsHash` additively on `SeasonMetadata`
   (precedent: `gamesPerTeam`; no DB bump; travels in backup since `seasonMetadata` IS registered). Mechanism =
   prove-no-change (hash + version), NOT a value-copy blob (the per-game §9 scalar is already persisted, so the
   value is recoverable; the snapshot only certifies WHICH constants produced it). Write-once per season,
   assert-immutable with a LOUD warn on divergence (never silent overwrite).

**Split (auto-resolved by ruling 3):** single **T10** build ticket — Codex 5.5 | high → Opus 4.8 audit
(auditor ≠ builder). NOT split, because the SeasonMetadata-hash mechanism adds NO DB migration. (Would have
split T10a/T10b only if a dedicated season store or value-copy had been chosen.)

**Captain default (proceed-unless-vetoed, Q5):** persist the §9 scalar whenever an optimizer baseline is
computed (all modes that lock a lineup); require/stamp the season constants snapshot only for games carrying a
`seasonId`; for snapshot-less modes (exhibition/elimination) record the live constants `version` string so the
delta stays traceable.

**Asset gate:** T10 reads mojo/fitness/traits only as optimizer INPUTS and snapshots constants READ-ONLY — it
modifies none of the SMB4-protected engines. No asset-gate approval required beyond these rulings.

**Persistence note:** T10 adds new persisted fields (per-game §9 summary + per-season constants hash) → it is a
persistence / saved-data-shape change → per the risk-scoped ruling it SURFACES to JK before commit (NOT
auto-commit) and is prioritized in the browser-verify batch.

---

### 2026-06-16: Reporter (§18.1 verification read) — franchise wiring rulings (JK)

**Context**: First of the four `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §18 verification reads. Captain ran a
`reporter-certification-read` workflow (8 dimension-mappers + 5 adversarial verifiers; full doc
`spec-docs/REPORTER_CERTIFICATION.md`). Certified: the base reporter is a **certify-and-connect** job for
franchise (downstream engine is already franchise-aware, no mode gate), with one genuine **build** gap (the
accuracy model). Key facts behind the forks: (a) only two of five cadence beats fire live in any mode —
between-inning summaries + post-game columns; per-play + preamble are orphaned everywhere; (b) TWO reporter
systems coexist — the live `GameStory`/`PostGameColumns` system (wired into Exhibition/Elimination) vs the
legacy `narrativeEngine.ts` template that FranchiseHome's hub actually shows; (c) assignment + lookup key on
`leagueId` only, but franchise scope is `franchiseId/seasonId`; (d) the ~10% inaccuracy model §24.5/§24.7 needs
exists only on the legacy engine — flag-only (never distorts text), orphaned at consumption, absent from the
live pipeline. §5 invariant (LLM narrates, never decides) CONFIRMED safe; reporter persistence CONFIRMED
backup-safe (the v12 defect drops only the v13-15 franchise-economy stores, not reporter data).

**Decisions (JK, 2026-06-16):**
1. **REP-1 — Franchise reporter cadence v1 = POST-GAME COLUMNS ONLY.** Leaner than the Captain's "match
   Exhibition/Elimination" recommendation: franchise v1 skips live in-game commentary entirely (no
   between-inning summaries, no per-play, no preamble) — the reporter speaks only after the game. Implication:
   the `liveBeatReporterEnabled` flag is not needed for franchise; only `postGameColumnsEnabled` must be set on
   franchise launch. Smallest connect surface + lowest LLM cost.
2. **REP-2 — Canonical franchise news = the LIVE `GameStory`/`PostGameColumns` system.** Rewrite
   `FranchiseHome.BeatReporterNews` to read the persisted `GameStory` records; retire the legacy
   `generateGameRecap` template path for franchise. One system, the real reporter columns.
3. **REP-3 — Franchise reporters keyed by `franchiseId`** (stable across the franchise's life, not per-season).
   Avoids collision with Exhibition reporters that share `teamId+leagueId`. Requires reconciling
   assignment/`getReporterForTeam` (currently `leagueId`-keyed) to a `franchiseId` scope for franchise games.
4. **REP-4 — The ~10% inaccuracy model is BUILT FRESH inside the §24 relationships-lite ticket, not the base
   reporter-connect ticket.** Base reporter ships WITHOUT it. The §24 build adds a reusable **seeded**
   inaccuracy primitive + a persisted accuracy field; meaning recommended as hedge/flag in v1 with
   content-distortion deferred (final meaning ruled when §24 is drafted). Unblocks the base reporter now.

**Non-blocking (noted, not gating cadence):** the whole backup/restore feature + the reporter-almanac
"living-memory" writer are both orphaned (no user trigger today); Claude column spend has no client-side rail
(Grok-only 500/day); the reporter is server-key/network-dependent (no offline fallback). Bump the
`backupRestore` v12 pin → 15 remains a separate tracked ticket.

**Asset gate:** none required — this is a read + design ruling; no SMB4-protected engine is touched. The build
tickets these rulings unblock are persistence/user-visible → they SURFACE to JK before commit per the
risk-scoped rule.

---

### 2026-06-16: Reporter SEASON-LONG cadence (§18.1b) — publish-bus model + rulings (JK)

**Context**: JK flagged that the REP-1 ruling settled only the IN-GAME cadence (post-game columns); the
SEASON-LONG narrative cadence — how the reporter tells the morale / relationship / race / designation story
BETWEEN games — was never addressed (logged as a scoping lesson in SESSION_RULES pen). Captain ran a second
read (`reporter-season-cadence-read` workflow, 7 mappers + 5 adversarial verifiers; full doc
`REPORTER_CERTIFICATION.md` Part 2 §K-O). **Decisive finding:** unlike the in-game half (certify-and-connect),
the season-long narrative is **overwhelmingly UNBUILT** and is a downstream consumer of nearly every Phase-2
system — the reporter narrates what the deterministic matrix produces, and most of those event SOURCES (live
designations/flips, races, random events §10, the auto/logged morale ledger, relationships, manager firings)
ARE the unbuilt Phase-2 features. Certified gaps: no season-news record type (only game-bound `GameStory` +
`CommentaryFeedEntryRecord`); the season-memory substrate (almanac/legacy-summary) is half-wired (read-back
live, write/regen orphaned → prompt input always empty); no sim-tunable emission gate; pre-action hooks
(§24.5/§24.7) are build-from-scratch (the revenge substrate in `tradeEngine.ts`/`headlineEngine.ts` exists but
orphaned; relationship data source empty). Today only game-end drives a take; trade/roster moves fire as bare
transactions with morale/relationship riders hardcoded `false`.

**Decisions (JK, 2026-06-16):**
1. **SEA-1 — Accept the PUBLISH-BUS cadence model; build the reporter foundation EARLY.** The season-long
   cadence is event-driven, not a clock: a Phase-2 system produces a narratable outcome → emits a
   `NarrativeEvent` → a sim-tunable emission gate (marquee-only default) decides if it warrants a take → the
   canonical reporter renders it into a persisted `SeasonNewsItem` → seeds reporter season-memory → surfaces on
   the franchise hub feed + Almanac. The foundation (news record + emission gate + a non-game generation method
   on the canonical live reporter + hub season-feed + wiring the orphaned season-memory) is built EARLY as
   Phase-2 infrastructure; each later soul-layer system then adds its event tap as it lands. The reporter is
   near the FRONT of the Phase-2 dependency order, not a late standalone ticket.
2. **SEA-2 — Separate season-emission-config.** The sim-tunable emission gate is a NEW config keyed by the
   season-event taxonomy (per-event-type base rate + per-race Top-N depth + global marquee-only flag),
   sim-writable, kept DISTINCT from the player-facing in-game `narrativeIntensity` dial. (The season analog of
   the in-game `notabilityScorer`; emission volume settled by the Simulation Gate §16 per the 2026-06-16
   "let the sim decide" ruling.)
3. **SEA-3 (deferred to data-model design)** — whether to fold season news into one `SeasonNewsItem` vs reuse
   the two reserved-but-dead stores (`narrativeContext` for storyline/momentum state, `rivalryScores` for §24
   relationship-edge state). Captain lean: one `SeasonNewsItem` for news + `rivalryScores` for relationship
   edges; finalized when the record is designed.
4. **SEA-4 (Captain reconciliation, JK did not veto) — pre-move heads-up is ADVISORY, never a hard gate.**
   §24.5 ("a pre-commit heads-up, NEVER a hard gate") supersedes the older `FARM_SYSTEM_SPEC` blocking-modal
   wording (FINDING-133, which has zero code anyway).
5. **SEA-5 (Captain reconciliation, JK did not veto) — REP-2 holds for season takes.** Generation lives on the
   canonical LIVE reporter; the orphaned legacy `generateTradeNarrative`/`generateMilestoneNarrative` templates
   are NOT revived — their `NarrativeEventType` vocabulary is reused, the generation is rebuilt on the live
   system.

**Status:** §18.1 (reporter) verification read is now COMPLETE — both the in-game cadence (REP-1..4) and the
season-long narrative cadence (SEA-1..5) are settled. The reporter-foundation build ticket + the per-source
event taps fold into the Phase-2 "living-season D-stack" sequencing the Captain drafts after the remaining §18
reads. Asset gate: none (read + design only).

---

### 2026-06-16: Traits-from-reality (§18.2 / §9) — full trait→signal model (JK)

**Context**: Second §18 verification read. Captain ran a `trait-to-signal-mapping` workflow (4 ground-truth readers
+ 5 per-chemistry mappers covering all 72 traits + 3 adversarial verifiers) → `TRAIT_SIGNAL_CERTIFICATION.md`.
Certified the crux (`typed ≠ populated`): the pressure spine (leverage/WPA/clutch/runners/RBI) is auto-populated,
but the discriminating signals (count, pitch type, pitch location, fielding difficulty, chase, handedness, mojo)
are absent / typed-but-unwritten / manual-opt-in. Initial triage 13 A / 24 B / 35 C; then a JK design session
worked the 33-deep C bucket down to **1 cut + everything else buildable**. Also certified: the §9 *engine* (3
layers — log-reconstructed activation context, strength scoring, trait grant/write-back) is entirely UNBUILT, but
`traitInteractionMatrix.ts` already encodes every activation predicate (the foundation).

**Decisions (JK, 2026-06-16):**
1. **TS-1 — Acquisition formula:** P(gain/lose) = f(reality-percentile-vs-peers, personality-tilt, current-morale),
   min-sample gated, gain-high/lose-low hysteresis, 2-trait cap (strength-ranked displacement, no offsetting pair).
2. **TS-2 — Peer-relative is mandatory** for both valences (anti-dilution + it IS the strength score; rides the
   Adaptive Standards machinery; auto-scales by season length + pool talent).
3. **TS-3 — Min-sample safety valve** ⇒ enrichment is opt-in ("Franchise-lite"); thin data = trait dormant, never
   flickers; also guards against confirmation spam (trait changes are confirmed per §11).
4. **TS-4 — Season-length-scaled thresholds** for count-based triggers (mirrors WAR's `RUNS_PER_WIN` scaling;
   percentile model handles most for free). E.g. Injury Prone: 40g→2 injuries, 80g→3, 120g→4.
5. **TS-5 — Personality weighting** in two layers: universal (Ambition↑ positive-gain, low-Resilience↑
   negative-catch) + four "image" axes (Composure / Hustle / Big-game / Approach — see cert §VI.3). Personality is
   PRIMARY where the measured signal is thin (Stimulated, Gets Ahead/Falls Behind, Big/Little Hack), a TILT where
   strong. Mechanical splits (vs L/RHP, Specialist, Reverse Splits, Pick Officer, K Neglecter, Utility) = no
   personality image.
6. **TS-6 — Role eligibility (crystal):** 24 pitcher-only, 40 position-player-only (25 batting / 7 baserunning /
   8 fielding), 7 universal (Clutch, Choker, Durable, Injury Prone, Consistent, Volatile, Stimulated), 1 cut.
   Full lists in cert §VI.2. Two Way is pitcher-only and the GATEWAY (a pitcher who hits elite-for-a-pitcher →
   everyday player → then eligible for batting traits). Captain-default edge cases (veto open): Wild Thrower +
   Pinch Perfect = position-player-only.
7. **TS-7 — Sign Stealer CUT** entirely, including from draft-class generation (least-valuable, no signal).
8. **TS-8 — Reclassified from C via JK rulings:** Easy Target = chase-for-OUTS (negative mirror of Bad Ball
   Hitter = chase-for-HITS, same signal split by outcome); the steal-vulnerability trait is **Easy Jumps**
   (SB-allowed/IP percentile, pitcher); Metal Head = pitcher hit by KP+nut-shot ≥2 combined → protective grant;
   Mind Gamer = high walk + pitch-grinding rate (batter); Distractor = high rWAR (baserunner); Crossed Up =
   passed-ball-on-advance (catcher); Wild Thing = wild-pitch-on-advance (pitcher); Consistent/Volatile =
   mojo-change frequency vs peers; Stimulated = late-game performance vs peers + PED-personality.
9. **TS-9 — Two Way corrected** to pitcher-batting-excellence (super-rare); Dive Wizard += `beat_runner`;
   Sprinter += `beat_throw`, Slow Poke += `beat_runner`; Sprinter/Slow Poke stay event-driven (not profile).
10. **TS-10 — Big/Little Hack** = the one "not earned from a log event" trait: profile-weighted (POW/CON ratio) +
    personality, probabilistically applied.
11. **TS-11 — Capture surface:** net-new = pitch zone, OF extra-base-credit (bWAR expected-extra-bases), injury
    accumulator (folds into fitness/dev engine); everything else reuses existing fields/events; handedness JOIN
    (`bats`/`throws`) is a low-cost win unlocking 6 split traits.
12. **TS-12 — Build the §9 engine on `traitInteractionMatrix`** (log-reconstructed context + peer-relative
    strength scorer + grant/write-back to the franchise-instance `traits` field). All thresholds/bands/weights →
    Simulation Gate (§16).

13. **TS-13 — Role-eligibility corrections + refinements (JK, same session):** **Crossed Up is PITCHER-ONLY**
    (a pitcher trait whose effect manifests as the catcher dropping the pitch — attribute the passed-ball signal
    to the PITCHER). Revised counts: **25 pitcher-only / 39 position-player-only (25 batting / 7 baserunning /
    7 fielding) / 7 universal / 1 cut.** Wild Thrower + Pinch Perfect confirmed position-player-only. **Two-Way
    grant** (evolution or generation) randomly assigns the pitcher a two-way fielding position (IF / OF / C).
    **Roster-role tilt:** bench classification raises acquisition likelihood for **Pinch Perfect** and **Utility**
    (starter lowers it) — a role input separate from personality.

**Status:** §18.2 (traits-from-reality) verification read COMPLETE. Asset gate: none yet (read + design); the
build ticket touches the SMB4-protected trait/mojo/fitness systems → SURFACES to JK per the asset rule when drafted.
Next: §18 read (3) — draft/salary/farm economics.

---

### 2026-06-16: Draft/Salary/Farm economics (§18.3) — DSF rulings (JK)

**Context**: Third §18 read (`draft-salary-farm-economics-read` workflow; full doc `DRAFT_SALARY_FARM_CERTIFICATION.md`).
Certified (salary core 3-way corroborated; the 2 dedicated salary mappers + verifiers 529'd mid-run and are
re-running to harden): 22-man salary = IV-based + tier-invariant; farm-prospect = a flat 4-row draft-round table
(CALIBRATE bridge), unchanged at call-up (F-127); rookie scale = absolute 0.50× age-replacement — so the two
scales are DISCONNECTED today. The pick-value chart is already relative-to-pool but MLB-22-only and unconsumed by
salary; the IVs it ranks are RAW (the tier-scale constants TIER_SHIFTS/FARM_NERF_SCALES exist in tierParams.ts but
are ORPHANED); pick-trade execution does NOT exist (validateTrade is advisory-only); per-draft grade distribution
has no knob (round-keyed, tier-independent). Startup drafts (LeagueBuilderSnakeDraft MLB-22 + LeagueBuilderDraft
farm-10) + scout-obscuring (R9) are LIVE; the in-season franchise draft is dry-run only.

**Decisions (JK, 2026-06-16):**
1. **DSF-1 — UNIFY on the tier-scaled pool anchor.** Connect TIER_SHIFTS[tier].scale into the pool-IV feed
   (useLeagueBuilderData.ts:414) so pickValueChart[0] becomes tier-sensitive; then peg BOTH 22-man rookie pricing
   AND farm-prospect pricing to that tier-scaled pool top, tapering down the slots — REPLACING the absolute 0.50×
   rookie factor AND the flat farm-round table. One coherent relative-to-pool, tier-sensitive scale (nerfed pool →
   lower top-slot price; "is this pick worth it?" stays live).
2. **DSF-2 — Tradeable asset = DRAFT PICKS (order positions).** Build a pick-ownership model + a pick-trade
   executor that mutates/persists pickOrder (gated behind validateTrade), and extend derivePickValueChart +
   validateTrade to the farm round. (Not roster-vacancies, not the prospects-via-player-trade.)
3. **DSF-3 — Farm grade mode = MULTIPLICATIVE SHIFT.** Add farmGradeMode (Juiced/Standard/Nerfed) that skews the
   existing round-keyed roundGradeWeights tables via FARM_NERF_SCALES, independent of the 22-man pool tier
   (enables nerfed-22-man + juiced-farm). Reuses the validated bell curve; sim-tunable.
4. **DSF-4 (Captain default, not vetoed) — in-season annual draft DEFERRED to the offseason (post-v1, per LS-1).**
   The League Builder startup draft suffices for v1; the dry-run franchiseDraftAdapter apply path is post-v1.

**Status:** §18.3 verification read COMPLETE (salary verification hardening re-running post-529). Asset gate: none
(read + design); the build ticket touches salary/tier economics (not an SMB4-protected engine) but is
persistence/economics → SURFACES to JK per the risk rule when drafted. Next: §18 read (4) — Manager WPA
reconciliation for MOY (the last §18 read).

---

### 2026-06-16: Manager-WPA / Manager-of-the-Year (§18(4) + AWARD-7) — MOY rulings (JK + Captain)

**Context**: Fourth and LAST §18 read (`moy-reconciliation-read` workflow — 5 mappers + 3 adversarial verifiers + a
completeness critic; full doc `MANAGER_WPA_MOY_CERTIFICATION.md`). Certified: the v2 Manager-WPA truth-layer is real,
live-wired, and persisted — decision-WPA = a true team win-probability delta × per-type manager share
(`managerWpaDerivation.ts:1734-1747`). The three §23.7 reconciliations are all real and all UNIMPLEMENTED. The read
forced three corrections to AWARD-7's framing: (i) the live composite is FOUR quantities (tactical decision-WPA +
**deployment-WPA** + lineup-delta), not three, and **team record is not in the live sum at all**; (ii) MOY is NOT
greenfield — `pogAwards.ts:589-590` ships a live, persisted, displayed per-game `best_manager` award on the exact
composite (gated `MIN_POSITIVE_WPA = 0.005`), so season MOY is a season-grain aggregation of it; (iii) a name/scale
trap — the live composite sums the CAPPED REALIZED record `delta.managerWpa`, while §23.7 literally names the T10
`ManagerLineupDeltaSummary.lineupDeltaWpaStandard` (built + persisted but **orphaned**, read nowhere). The deprecated
salary MOY (`calculateMOYVotes`, `getExpectedWinPct = 0.35 + salaryScore×0.30`) is dead-gated behind
`FRANCHISE_V1_OFFSEASON_EXECUTION_ENABLED = false` → retiring it re-points, never breaks.

**Decisions — JK (the design/scope forks):**
1. **MOY-1 — Input set = FOUR.** Season MOY = decision-WPA + deployment-WPA + lineup-delta + team record. Deployment
   kept as a distinct scored term (already built/capped/shown); team record ADDED as the new fourth input. (Closes
   AWARD-7's undercount.)
2. **MOY-2 — Lineup quantity DEFERRED to build time.** Capped realized record (`delta.managerWpa`, the live composite
   input) vs T10's pure projected `lineupDeltaWpaStandard` (the §23.7-named, currently-orphaned Summary field) is
   resolved when the MOY engine is drafted, both on the table; structure locked around the open slot. (Realized record
   is already aggregated + commensurate; the T10 standard needs a new aggregator + denomination fix.)
3. **MOY-3 — Record term = EXPECTATION-RELATIVE on the D6 trusted-value artifact.** Wins-above-roster-strength-
   expectation, expectation = the D6/D8 trusted True-Value projection (NOT raw W-L, NOT the untrusted
   `franchiseExpectedWinsPreview`). Drops the salary-based expectation per (c). **HARD-couples the MOY build to D6** —
   consistent with the D-stack order (D9 → D8 → D6); MOY cannot be built before the value-trust gate.
4. **MOY-4 — No fame tilt for v1.** MOY is a PURE truth-layer computation; managers sit outside the player fame
   economy; legacy = the Almanac record. (Diverges deliberately from §21/RACE-4's player merit-award fame tilt.)
   Manager-fame is a post-v1 revisit.

**Decisions — Captain (engineering / architecture / sim-deferred; JK-overridable):**
5. **MOY-5 (architecture) — Build as a season aggregation of the existing `pogAwards` per-game composite.** Reuse
   `PogManagerValueTotal` → extend to season grain; wrap in the absent `franchiseAwardsEngine`/`franchiseAwardsStorage`;
   NOT a parallel engine. Retire `calculateMOYVotes` + the deprecated `mwarCalculator` salary path + the orphaned
   `useMWARCalculations` hooks. Re-point `AwardsCeremonyFlow`/`RatingsAdjustmentFlow` off `calculateMOYVotes` BEFORE any
   offseason flag flip.
6. **MOY-6 (common-scale, reconciliation a) — Pool-relative normalization for the SEASON award.** Normalize each of the
   4 inputs across the manager pool (rank/z-score) BEFORE weighting — dissolves the denomination mismatch without
   inventing an IV→WP constant or touching the frozen value layer. The per-game `pogAwards` raw-sum + caps stay unchanged.
7. **MOY-7 (weighting, reconciliation b — sim-deferred) — Composite weights → Simulation Gate (§16).** Lock structure
   now (4 pool-normalized inputs, record expectation-relative on D6); the weight split (the 60/40's 4-way successor) is
   a sim-tuned starting guess.

**Status:** §18(4) verification read COMPLETE → **all four §18 reads DONE.** Asset gate: none (read + design); the MOY
build ticket is greenfield awards + persistence + a D6 dependency → SURFACES to JK per the risk rule when drafted, and
sequences POST-D6/D8 inside D9. Next: Captain drafts the Phase-2 "living-season D-stack" sequencing (fold in the §18-
unblocked tickets; reconcile the D9/D7 couplings) for JK ratification.

---

### 2026-06-16: Phase-2 "Living-Season D-stack" (the L-stack) — sequencing draft + five fork rulings (JK)

**Context**: Captain drafted the dependency-ordered Phase-2 build sequence (`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`,
tickets L1–L14 + L-SIM + an economy track) from `FRANCHISE_V1_LIVING_SEASON_SPEC.md` §5–§24 + the four §18 certs,
then hardened it with a 12-agent decorrelated verification workflow (`wf_b5734e06-e2c`: 7 grounding code-readers +
5 adversarial ordering critics, ~1.26M tokens). The audit forced structural corrections folded into the doc:
**(i)** MOY is a Phase-1 **D9** sub-ticket (the §18(4) read specifies the D9 manager-award contract — MOY-1..7), NOT
a Phase-2 ticket (MOY-4 bars manager fame → no Phase-2 layer); removed from L12c. **(ii)** New ticket **L1.5** (Team
Captain initial assignment at Mode-1 league finalization) closes a BLOCKER gap — the handoff is unbuilt in both
stacks (`franchiseInitializer.ts:335-433` has zero Captain assignment; CAPTAIN hard-blocked at
`franchiseDesignationEligibility.ts:151-157`). **(iii)** L1's hidden modifiers are generated mis-named + un-persisted
(`prospectScoutingDraftEngine.ts:542-547` emits leadership/volatility/adaptability/pressure, not loyalty/ambition/
resilience/charisma) → L1 is a real build. **(iv)** Reporter base split out (L4a, no morale-matrix dep) + hoisted to
Tier 0 per SEA-1; trait-capture (L9a) hoisted to Tier 0 (longest data lead). **(v)** DSF-1 is COUPLED to the value/IV
spine (re-prices the frozen draft-IV anchor) → sequence before the v1 franchise's draft/salary freeze. **(vi)** Backup
parity escalated — the D2 guard covers only `kbl-tracker`; Phase-2 stores land in separate DBs; export/restore is
orphaned + a stale-pin restore destroys newer stores → re-scope the guard to all DBs + a prerequisite hardening ticket
+ a per-ticket backup DoD. **(vii)** Floating TV is built but overwrites one cumulative row → KK/Comeback need a NEW
`franchiseTrueValueSnapshots` store captured from game 1. **Parallelism rule:** BUILD Phase-2 foundations dark in
parallel with the late D-stack, ACTIVATE strictly after D13 (the §5 "no phantom morale" + D12 smoke gate).

**Five fork rulings (JK, 2026-06-16):**

1. **LSD-1 (F1) — D9 fame-ready seam checklist RATIFIED; build the award engine ONCE.** Fame IS in full v1 (Phase-2
   L6), but the award *engine* is built at the Phase-1 checkpoint before fame exists, so build it once with the fame
   hooks left empty and let L12 fill them — no rebuild. The four seams baked into the D9 contract NOW: (1) store
   per-award **candidate margins** (not winner-only) for the close-race fame tilt; (2) store the **fWAR vs total-WAR
   split** on Gold Glove for the later defensive-fame blend (~15–25%); (3) make the ceremony **vote-weight field
   pluggable/nullable** (salary→fame swap without migration); (4) reserve the **KK/Bust/Comeback award-type slots +
   the `franchiseTrueValueSnapshots` store**, capturing TV from game 1 (or season-1 Comeback data is lost). Fame's
   award role is a **merit-led TILT** (§21.4 — flips only a genuinely-close race), **defensive-fame** on Gold Glove,
   **fame-weighted** ceremony votes (replacing salary), **fame-led** All-Star *starters* (the one exception); the
   TV-family runs on True Value, not fame; awards pay fame+morale+badge only (no rating rewards). *(Captain rec'd (a);
   (b) build-then-rework = two builds, (c) hold-D9-for-fame reopens the D0 "real awards in Phase-1" ruling — both declined.)*
2. **LSD-2 (F2) — FA-attraction DEFERRED to v1.1; FA-gravity struck from §13 "live teeth."** Keep only the in-season
   **trade-request generation** (loyalty/morale-scaled roster destabilization) in L5 (+ an L10 event tap + an L13
   trade-demander flashpoint). Free-agent attraction/destination weighting is an offseason concept incompatible with
   the one-season v1 (LS-1) → v1.1.
3. **LSD-3 (F3) — Cornerstone CUT from v1.** Matches the D0 deferral; L7 drops it. ("Last season's MVP; accumulates"
   is structurally impossible in a single-season v1.) Revisit at the offseason/multi-season bridge.
4. **LSD-4 (F4) — Budget pressure CUT from v1.** The §13 "optional/capped" tooth is next-season spending room =
   offseason = post-v1. Revisit v1.1.
5. **LSD-5 (F5) — Stadium change = pick from the EXISTING Super Mega stadium pool in League Builder; NO custom
   stadiums.** On relocation (L14) the user chooses from the built-in stadium list; the build must **pull the full
   stadium record (dimensions, name, park factors) into the franchise** so stadium analytics recompute correctly
   after the move. The L10 independent random-event stadium-change leg (fan-morale-suppressed rate) uses the same
   pool-pick mechanism. (No custom-stadium entry — consistent with the standing hard exclusion.)

**Status:** Phase-2 sequencing DRAFTED + all 5 forks RULED + folded into `FRANCHISE_V1_LIVING_SEASON_DSTACK.md`
(Status: PROPOSED). No product code, nothing committed (JK commits). Asset gate: none (design/docs only) — each L-ticket
re-gates when contracted (Codex builds → Opus audits → JK browser sign-off). Remaining ratification gates before any
build contract: (a) JK explicit sign-off on the L-stack structure; (b) D0 ratification (still PROPOSED). First Tier-0
critical-path opener to contract = **L1** (personality/modifier substrate). Living-season spec §4/§13/§14 carry
amendment notes for the cuts (Cornerstone, FA-attraction, budget pressure, stadium pool-pick).

---

### 2026-06-16 (follow-up): Release-boundary ruling — the living season IS part of v1 (LSD-6)

**Context**: With the L-stack sequenced + LSD-1..5 ruled, JK was asked whether (a) Phase-1 "Playable-V1" (the
D-stack, soul-layer-excluded) ships as a standalone milestone with the living season as a true follow-on, or (b)
the living season is part of "v1" proper — v1 isn't done until both stacks + the sim gate complete. This reconciles
the D0 doc's older "Phase-2 automation → v1.1" deferral language with the week's living-season design.

**Ruling — JK (2026-06-16): (B).** The living season (Phase-2 L-stack) is **PART OF v1**, not v1.1.
- **v1 = Phase-1 (D-stack D1–D13) + Phase-2 (L-stack L1–L14 + economy track) + the L-SIM gate.** One release — the
  full living, playable season (draft → champion *with* the soul layer).
- **"Playable-V1" (D0's D13) is reframed as an INTERNAL Phase-1 checkpoint**, NOT the v1 release. D13 approves the
  value-spine-live milestone; the v1 release sign-off comes after the L-stack + the L-SIM gate.
- **Sequencing UNCHANGED:** the D-stack still builds first; Phase-2 foundations build dark in parallel; the soul
  layer activates after D13; every magnitude is sim-gated.
- **D0's "Phase-2 automation → v1.1" deferral is SUPERSEDED for the soul layer** — morale / fame / development /
  traits / relationships / managers / rebrand / the morale-gated designations are **v1** (Phase-2), not v1.1.
- **Genuinely post-v1 / v1.1 (unchanged):** the offseason / Season-2 bridge (LS-1); the three LSD cuts (Cornerstone
  LSD-3, FA-attraction LSD-2, budget pressure LSD-4); the tracked JK-gated fast-follows (R9, R12, FINDING-148).
- **The v1 exit gate (iPad playtest) is of the FULL living season** (after L-stack + L-SIM), not the stats-only D13
  checkpoint; the offseason flag stays FALSE throughout v1 (offseason remains post-v1).

**Status:** Release boundary RULED. Reconciliation notes added to `FRANCHISE_PLAYABLE_V1_DEFINITION.md` (D0),
`FRANCHISE_V1_LIVING_SEASON_DSTACK.md`, and `CURRENT_STATE.md`. No code impact (labeling/scope-boundary only).
