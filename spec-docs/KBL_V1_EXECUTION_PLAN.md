# KBL Tracker — V1 Execution Plan

**Version:** 1.2
**Created:** 2026-06-08
**Updated:** 2026-06-08 (v1.2.5 — adaptive standards moved to first, salary v1 added, WAR/value trust gate split before designations, Phase 3 copy fixed)
**Status:** ACTIVE — canonical build order for Mode 2 v1 completion
**Source authority:** FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md, MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md, gap analysis session 2026-06-08

---

## How to Read This Plan

Three phases. Do not start Phase 2 until Phase 1 is approved. Do not start Phase 3 until Phase 2 surfaces have real data.

Each item has:
- **Status** — what the codebase currently has
- **What's needed** — the delta to get to v1
- **Routing** — tool + reasoning effort
- **Key files** — expected scope (not exhaustive — Codex will expand)
- **Gate** — what must be true before this ticket closes

---

## Routing Guide

All items use **Codex 5.5**. Reasoning effort varies by task complexity:

| Effort | When to use | Items |
|---|---|---|
| **very high** | State, persistence, engines, multi-file reasoning, anything touching the reducer or IndexedDB, any shared interface with large blast radius | All Phase 1, all Phase 2, 3.5 |
| **high** | Well-defined multi-step changes, single-system builds with clear inputs/outputs | Use if very high feels like overkill on a confirmed scoped item |
| **medium** | Presentation layer, copy cleanup, single-file display changes with no storage writes | Phase 3 except 3.5 |

**Rule:** If the task touches game state, persistence, the reducer, IndexedDB, or a shared config interface consumed by multiple engines — minimum very high. Never drop to medium for anything that writes to storage or defines a shared contract.

---

## Phase 1 — Functional Foundation

*Close all gaps that prevent the app from being a complete, trustworthy playable loop. Build in this exact order — each item is a dependency for something below it or for Phase 2. Do not reorder.*

---

### 1.1 — Adaptive Standards Infrastructure

**Status:** Referenced in worksheet M2-D030 as "critical infrastructure" for WAR, awards, designations, milestones, and salary inputs. Not confirmed as built. Spec is in `KBL_MORALE_MILESTONE_REPORTER_SPEC.md §5.5`.

**Why first:** Every engine built in Phase 1 consumes this config. Building salary, designations, awards, or milestones before this exists means hardcoded 162-game and 9-inning assumptions get baked into multiple engines. Retrofitting them later is expensive and error-prone. This must exist before any other engine is touched.

**What's needed:**
- Single `franchiseAdaptiveStandards.ts` exporting a `MilestoneConfig` interface and `scaledThreshold()` function per spec §5.5
- `adaptiveStandardsConfig` derived from franchise rules preset (gamesPerSeason, inningsPerGame) — one source of truth
- Consumed by: WAR engine, salary engine, awards engine, milestone detector, designation engine
- Audit all existing engine files for hardcoded `162`, `9`, or MLB-length assumptions — replace with `scaledThreshold()` calls
- No hardcoded MLB-length assumptions anywhere in the codebase after this ticket closes

**Gate:** Changing franchise rules preset (e.g. 32-game season) automatically scales all thresholds correctly across all engines. `grep -r "/ 162\|=== 162\|>= 162\|162 -" src/` returns zero matches outside this file and tests.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseAdaptiveStandards.ts`, all engine files that currently hardcode MLB lengths

---

### 1.2 — Salary System Per Spec

**Status:** Salary baseline exists as read-only display. True Value is preview-only. No formula weighting, no performance/fame modifiers, no salary lifecycle.

**What's needed:**
- Full multi-factor salary formula per `SALARY_SYSTEM_SPEC_UPDATED.md`: base ratings × position multiplier × age factor × trait modifier × performance modifier × personality modifier
- Fame modifier: reserved field only for v1 — set to 1.0 (neutral) until fame system is built; do not fabricate fame inputs
- Performance modifier wired to actual season stats
- Salary values persisted per player per season scope
- Team payroll calculated from roster salaries
- Finance tab shows real salary values, not preview-only labels
- Salary visible in trade UI and FA destination weighting
- All salary thresholds use `scaledThreshold()` from 1.1 — no hardcoded MLB amounts

**Gate:** Salary values update based on real player stats. Team payroll is accurate. Fame modifier field exists but is neutral. No "preview-only" or "READ ONLY" labels on salary surfaces.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseSalaryEngine.ts`, `franchiseSalaryStorage.ts`, `TeamHubFinanceTab.tsx`, `tradeEngine.ts`

---

### 1.2.5 — WAR And Value Trust Promotion Gate

**Status:** Required prerequisite before 1.3. Current repo state can promote a narrow scoped WAR consumer contract for TEAM_MVP/ACE designation input gating only. True Value/value delta, Fan Favorite/Albatross, awards, morale, salary movement, and Mode 3 remain blocked.

**What's needed:**
- Explicit row-level WAR consumer-trust contract from value inputs.
- Trust only scoped completed GameTracker archive evidence plus scoped season stat rows, current MLB roster/team context, and stored season-length/innings metadata.
- TEAM_MVP trust requires numeric total WAR from scoped season stats.
- ACE trust requires numeric pitching WAR from scoped season stats.
- Keep `finalWarTrusted`, final True Value, value-delta trust, awards, morale, salary movement, and Mode 3 false.
- Keep score-only rows blocked from player stats, WPA/WAR, awards, designations, player history, and relationships.
- Hidden/unrevealed FARM rows cannot feed trusted WAR/value consumers.

**Gate:** Analytics and value-input reports expose consumer-specific WAR trust for TEAM_MVP/ACE only. True Value/value delta remain preview-only and untrusted. 1.3 can resume only for TEAM_MVP/ACE promotion unless a later True Value/value-delta slice explicitly promotes Fan Favorite/Albatross inputs.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseValueInputs.ts`, `franchiseAnalyticsTrust.ts`, `franchiseTrueValuePreview.ts`, designation eligibility tests

---

### 1.3 — Dynamic Designations Fully Promoted

**Status:** TEAM_MVP and ACE are active persisted v1 designations when the scoped WAR consumer-trust gate passes. `DesignationEvent` objects are emitted for later consumers, but morale mutation is not wired. Fan Favorite, Albatross, Cornerstone, Fan Hopeful are blocked. Captain is blocked pending hidden-charisma policy. TWO-WAY routes pitcher-only through ACE.

**What's needed:**
- Consume the 1.2.5 WAR trust contract for TEAM_MVP/ACE only.
- True Value/value-delta audit remains a separate blocker before Fan Favorite/Albatross can be promoted.
- TEAM_MVP and ACE may be promoted from preview-only to active designations if 1.2.5 passes.
- Fan Favorite, Albatross, Cornerstone, and Fan Hopeful stay blocked unless separate trusted inputs are approved.
- Designation earning logic wired to trusted inputs
- Designation effects for v1: salary weighting, FA destination penalty/bonus, display in player profile/roster table/trade UI
- Morale effects: **not wired here** — designation events will be emitted as typed events that the morale engine (Phase 2, step 2.3) will consume; wire the event emission only, not the morale mutation
- Captain: keep blocked, hidden-charisma policy unresolved
- TWO-WAY: keep pitcher-only through ACE for v1

**Hard boundary:** Do not wire morale mutation in this ticket. Emit `DesignationEvent` objects with typed event types. Phase 2 step 2.3 consumes them. If this boundary is unclear to Codex, add it explicitly to the prompt contract.

**Gate:** TEAM_MVP/ACE can be earned and displayed from trusted scoped WAR inputs. Fan Favorite/Albatross are not promoted until True Value/value-delta trust is explicitly approved. Salary and FA effects apply only to promoted designation types. `DesignationEvent` objects are emitted but morale mutation is not yet connected. No preview-only labels on promoted designation surfaces.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseDesignationEngine.ts`, `franchiseDesignationStorage.ts`, `PlayerProfileCard.tsx`, `RosterTable.tsx`

---

### Mini-Smoke Checkpoint A — Salary + Designations

After 1.3, before building anything else:
1. Open real app on iPad
2. Verify salary values are real and update after game results
3. Verify team payroll is correct
4. Verify at least one designation is earned and displays correctly in player profile and roster table
5. Verify FA destination weighting reflects designation status
6. Do not proceed to 1.4 until this passes

---

### 1.4 — Farm System Per FARM_SYSTEM_SPEC.md (Core Roster Level)

**Status:** MLB/FARM status, call-up/send-down, hidden prospect boundaries, and transaction visibility are committed. Spec compliance at the full core roster management level is unconfirmed.

**What's needed:**
- Farm roster displays correctly: farm players listed separately from MLB roster, hidden until revealed
- Call-up: farm player moves to MLB roster, `RosterMoveEvent` emitted (morale engine consumes in Phase 2), transaction logged
- Send-down: MLB player moves to farm, `RosterMoveEvent` emitted, transaction logged
- Farm stats tracked separately from MLB stats within same season scope
- Roster counts enforced: MLB roster cap + farm cap, hard stop if either is exceeded
- Trade eligibility: hidden farm prospects cannot be traded (enforced at trade engine level)
- GameTracker player availability: only MLB-roster players available in GameTracker lineup builder
- All farm movement events emitted as typed `RosterMoveEvent` objects — morale mutation not wired yet

**Gate:** Farm and MLB rosters are distinct surfaces with correct player lists. Moves log correctly. Roster counts enforced. Farm players unavailable in GameTracker until called up. `RosterMoveEvent` objects emitted but morale not yet connected.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseFarmEngine.ts`, `franchiseRosterStorage.ts`, `FarmRosterView.tsx`, `GameTrackerLineupBuilder.tsx`

---

### 1.5 — Full Trade Execution With Continuity

**Status:** Movement continuity is committed. Full trade execution — roster updates, historical stats preserved, downstream systems following the new team — is not confirmed complete per worksheet M2-D022.

**Dependency:** Requires 1.2 (salary trusted) and 1.4 (farm hidden/revealed state reliable) before this ticket starts. Farm trade eligibility enforcement depends on 1.4's hidden/revealed state being correct.

**What's needed:**

*Engine work (must be done before UI):*
- Trade engine validates both sides: roster eligibility, farm eligibility (hidden prospects blocked per 1.4), salary cap checks
- Player historical stats (career scope) travel with player to new team — verify stat scope keys carry correctly
- Salary/payroll updates on both teams atomically — both succeed or both roll back
- `TradeEvent` emitted with both sides, traded players, and designation context (Cornerstone/Albatross/Fan Favorite trades emit typed events for morale engine in Phase 2 — emit only, no morale mutation)
- Transaction log records trade with both rosters and all moved players

*UI work (after engine is verified):*
- Trade UI: select players from both rosters, preview salary impact, confirm trade, execute
- Post-trade: both rosters immediately reflect changes, transaction log entry visible

**Gate:** Trade executes end-to-end. Both rosters correct. Career stats travel with player. Salary/payroll updates atomically. Transaction log entry complete. Farm eligibility enforced. `TradeEvent` emitted. Morale not yet connected.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseTradeEngine.ts`, `franchiseRosterStorage.ts`, `franchiseTransactionLog.ts`, `TradeUI.tsx`, `franchiseSalaryStorage.ts`

---

### 1.6 — Manager WPA Lineup Delta Visibility

**Status:** WPA and Manager Moments are committed as read-only archived evidence in Game Detail and Player Instance Card. Lineup delta — which lineup decisions added or subtracted WPA — is missing from Game Detail.

**What's needed:**

*Engine work (do not skip — the display data doesn't exist yet):*
- Extend `franchiseWPAEngine.ts` to compute per-lineup-slot expected contribution baseline from historical batting order data
- Compute actual vs. expected delta per slot for the completed game
- Compute manager decision quality: substitutions and pinch hits with WPA impact
- Store lineup delta and decision summary in game archive record

*Display work (after engine verified):*
- Game Detail panel: lineup delta view showing each batting order slot's over/underperformance
- Manager decision summary: each substitution with WPA impact clearly labeled
- Distinguish player WPA (what happened) from manager WPA (decision quality) — two separate sections

**Gate:** Game Detail shows lineup delta panel with per-slot deltas. Substitution decisions have WPA impact attached. Engine changes have passing tests before UI is touched.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseWPAEngine.ts`, `GameDetail.tsx`, `GameDetailManagerPanel.tsx`, game archive storage

---

### 1.7 — Spray Chart Full Filter Set

**Status:** Spray chart exists as "provisional functional visualization." Archive-backed batting/pitching/fielding spray projection works. Full filter set is incomplete per worksheet M2-D020.

**Important pre-work:** Before implementing filters, Codex must query the archive storage schema to understand the actual shape of spray event records — specifically which fields exist for player, team, handedness, outcome, zone, and how batting/pitching/fielding events are distinguished. Do not assume the schema matches the spec without verifying. Include this as the first step in the prompt contract.

**What's needed:**
- Three view modes: Batting, Pitching, Fielding (tab or toggle)
- Filters: player, team, stadium, franchise/season/stats scope, handedness (L/R/S), outcome (hit/out/HR/strikeout/etc.), zone
- Sort: by frequency, by outcome, by player
- Filter state persists within session (not across sessions — in-memory is fine)
- Visual: spray zones clearly labeled, outcome density represented

**Gate:** All three views work. All filter combinations return correct data from real archive. iPad-readable layout. Filter state persists within session.

**ROUTE: Codex 5.5 | very high**
Key files: `StadiumSprayChart.tsx`, `SprayChartFilters.tsx`, `franchiseStadiumAnalyticsEngine.ts`, archive storage schema (read first)

---

### 1.8 — Playoff Confirmation + Tiebreaker Resolution

**Status:** Season-end readiness report exists as read-only. Playoff seeding and run-differential tiebreaker resolution are not implemented per worksheet §6.2.

**What's needed:**
- Season-end review step: standings displayed with current seeding
- Tiebreaker surface: when teams are tied in W-L, show run differential and resolve seeding; user confirms resolution
- Playoff bracket generated from confirmed seedings
- User confirms bracket before playoff play begins — no auto-advance
- Elimination status correctly computed and enforced: eliminated teams cannot appear in bracket
- All seeding thresholds use `scaledThreshold()` from 1.1

**Gate:** User can complete a regular season, resolve tiebreakers, confirm playoff bracket, and enter playoffs. Bracket is correct. Eliminated teams are absent.

**ROUTE: Codex 5.5 | very high**
Key files: `franchisePlayoffEngine.ts`, `franchiseStandingsEngine.ts`, `PlayoffBracket.tsx`, `SeasonEndReview.tsx`

---

### 1.9 — Awards / Watchlists

**Status:** Not in the active roadmap. Worksheet says "v1 goal — must wait for WAR, salary/value, dynamic designations, and season-length weighting."

**Hard prerequisite — WAR trust audit:** Before this ticket starts, confirm WAR is trusted (not preview-only). This is a named hard gate, not a soft check. If WAR is still preview-only at this point, stop and promote WAR to trusted as the first action of this ticket. Do not build award logic on untrusted WAR inputs.

**What's needed (post 1.1–1.3 and WAR trusted):**
- Award categories: MVP, Cy Young, Rookie of Year, Gold Glove, Silver Slugger, Manager of Year
- Award logic: WAR + position-relative True Value + designation status + milestone weighting
- All thresholds use `scaledThreshold()` from 1.1 — no hardcoded MLB season lengths
- Watchlist: top candidates surfaced in franchise hub during season, updated after each game
- Season-end: awards finalized and stored in franchise history
- Award history visible in player profile and Almanac

**Gate:** WAR confirmed trusted before build starts. All award categories compute correct winners at season end. Watchlist updates during season. Awards stored in franchise history and visible in player profile and Almanac.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseAwardsEngine.ts`, `franchiseAwardsStorage.ts`, `AwardsWatchlist.tsx`, `PlayerProfileCard.tsx`, `Almanac.tsx`

---

### 1.10 — Mode 2 → Mode 3 Handoff Contract

**Status:** Season handoff plan exists as a "pure read-only blocked migration manifest." Mode 3 execution is deferred, but the handoff contract — what Mode 2 produces at season end — is Mode 2's responsibility and is not fully built.

**Dependency:** Requires all of Phase 1 to be complete. The handoff output package includes: salary/payroll (1.2), designation statuses (1.3), roster/farm state (1.4), transaction history (1.5), award winners (1.9), playoff results (1.8). Do not start this ticket until 1.1–1.9 are all passing smoke.

**What's needed:**
- Season-end output package written to IndexedDB: final standings, stats, roster/farm state, salary/payroll, transaction history, award winners, playoff results, designation statuses
- Handoff stored as a scoped season-complete record — one record per season, keyed by franchiseId + seasonId
- Season Summary view: read-only display of what happened and what carries forward; no Mode 3 execution from this surface
- Clear "Season Complete" state in franchise hub
- Mode 3 execution: remains blocked and deferred — this ticket produces the data contract only

**Gate:** After full season + playoffs, Season Summary shows correct final data for all categories. Handoff record written to IndexedDB. Mode 3 execution button/path does not exist.

**ROUTE: Codex 5.5 | very high**
Key files: `franchiseSeasonHandoffEngine.ts`, `franchiseSeasonHandoffStorage.ts`, `SeasonSummary.tsx`

---

### Phase 1 Gate — Full Manual Smoke Before Phase 2

After 1.1–1.10 are complete:
1. Run full manual smoke checklist on iPad
2. Verify: salary, designations, trades, farm, WPA lineup delta, spray charts, playoffs, awards, handoff all work end-to-end
3. Verify: no hardcoded MLB-length assumptions remain (`grep -r "/ 162" src/` outside adaptive standards file = zero)
4. Verify: all typed events (DesignationEvent, RosterMoveEvent, TradeEvent) are emitted but morale mutation is not yet connected — no phantom morale changes
5. Get explicit approval before starting Phase 2

---

## Phase 2 — Automated Morale + Milestone + Reporter

*Build on top of the functional foundation. All five steps are fully specced in `KBL_MORALE_MILESTONE_REPORTER_SPEC.md v1.2`. The typed events wired in Phase 1 (DesignationEvent, RosterMoveEvent, TradeEvent) are now consumed here.*

---

### 2.1 — Player Morale Engine

Build `franchisePlayerMoraleEngine.ts` and `franchisePlayerMoraleStorage.ts`. Pure functions, no side effects. All event types × all personality combinations × hidden modifier edge cases covered by tests. Consumes typed events emitted in Phase 1.

**ROUTE: Codex 5.5 | very high**

---

### 2.2 — Fan Morale Engine (Automated)

Replace/extend confirmation-gated engine with automated `franchiseFanMoraleEngine.ts`. Wire fan personality noise (seeded per team, set at franchise creation). Full 50/20/10/10 formula. Extend `franchiseCanonicalMoraleStorage.ts`. Add `fanPersonalitySeed` and `fanPersonalityVolatility` to Mode 1 team creation.

**ROUTE: Codex 5.5 | very high**

---

### 2.3 — Milestone Engine Wiring

Wire `milestoneDetector.ts` → playerMoraleEngine + fanMoraleEngine. Connect Phase 1 typed events (DesignationEvent, RosterMoveEvent, TradeEvent) to morale engines. All milestones checked post-game, not batched at season end. Wire Franchise Firsts and Leaders tracker.

**ROUTE: Codex 5.5 | very high**

---

### 2.4 — Beat Reporter Entity and Pop-Up

`franchiseBeatReporter.ts` + `franchiseReporterStoryGenerator.ts`. Two pop-up variants: GT banner (real-time, compact) + hub modal (post-game, full). Tootwhistle Times feed. Reporter assignment wired to Mode 1 league creation (just before scouts). Fire reporter UI in Team Hub/Franchise Settings.

**ROUTE: Codex 5.5 | very high**

---

### 2.5 — Integration Pass

End-to-end: GT completion → morale deltas committed atomically → reporter pop-up in hub. In-game milestone → real-time GT pop-up → delta buffered → committed at completion. Score-only path still confirmation-gated, no player morale effect. iPad smoke for both pop-up variants.

**ROUTE: Codex 5.5 | very high**

---

### Phase 2 Gate — Morale Smoke

1. Play 10 games — verify fan and player morale change as expected
2. Trigger a streak, a trade, a designation — verify morale responds and reporter covers each
3. Verify no partial state if app closed mid-GT session
4. Verify score-only rows don't affect player morale
5. Get explicit approval before starting Phase 3

---

## Phase 3 — UI Cleanup

*Now surfaces have real data. Clean everything. Do this surface by surface — each surface is a separate Codex prompt, not one giant sweep.*

---

### 3.1 — Team Hub

Remove all audit-progress wording. Remove "preview-only," "READ ONLY," "blocked," "trust boundary" copy from user-facing panels. Replace with compact labels, badges, and short contextual notes where state genuinely matters. Morale section now shows real automated values — remove confirmation-gated wording. Finance section shows real salary — remove preview labels.

**ROUTE: Codex 5.5 | medium**

---

### 3.2 — Schedule

Remove implementation-progress prose. Score-only rows should be visually distinct but not over-explained. Game Detail should feel like a game recap, not an audit report.

**ROUTE: Codex 5.5 | medium**

---

### 3.3 — Almanac

Clean up franchise/player/team history surfaces. Remove "Coming Soon" placeholders that should now be populated. Archive-backed game links should feel like a record book, not a data inspector.

**ROUTE: Codex 5.5 | medium**

---

### 3.4 — Player Profile

Remove spec-document language from profile panels. Designation display should be compact badge-style. Morale history should be a simple trend line, not a data dump. Relationship context should be readable prose, not field/value rows.

**ROUTE: Codex 5.5 | medium**

---

### 3.5 — Spray Chart Final Visual Design

The spray chart was explicitly flagged as "provisional functional visualization, not final design." Now that the full filter set is built (1.7), give it a proper visual treatment: clear zone labels, outcome density gradients, readable on iPad.

**ROUTE: Codex 5.5 | very high** (full component reasoning required — filter system from 1.7 must be preserved exactly)

---

### 3.6 — League Builder Stadium Status

Remove "source/status" audit copy from stadium display. Stadium status should be surfaced as simple trust indicators, not implementation notes.

**ROUTE: Codex 5.5 | medium**

---

### 3.7 — Random Event Log / Tootwhistle Times

By Phase 3 the confirmation-gated random event log is largely replaced by automated morale + reporter. The remaining confirmation-gated items (score-only rows, rating suggestions, designation promotion) should have clean UX that matches the product — not the legacy audit-panel style.

**ROUTE: Codex 5.5 | medium**

---

### Phase 3 Gate — Product Smoke

1. Walk every surface as a new user — does it feel like a product or an audit tool?
2. Verify trust boundaries are still clear without being verbose
3. iPad layout check on all cleaned surfaces
4. Get explicit v1 approval

---

## What Is Explicitly Deferred (Not V1)

Locked out until a separate approval decision after v1 ships:

- Quirky Random Event Generator (d20 system)
- Fame system (fame modifier in salary is a reserved neutral field for now)
- Captain designation (hidden-charisma policy unresolved)
- Mode 3 / offseason execution
- Auto-draft / AI simulation
- Generated schedules
- Relationship mutation (events wired, mutation stays blocked)
- Adaptive park-factor persistence
- Custom stadium factor entry
- Beat reporter INSIDER mechanic
- Full morale drift/recovery tuning (engine built in Phase 2; tuning post-v1)

---

## Summary Table

| # | Item | Phase | Route | Depends On |
|---|---|---|---|---|
| 1.1 | Adaptive standards infra | 1 | Codex 5.5 very high | — |
| 1.2 | Salary system per spec | 1 | Codex 5.5 very high | 1.1 |
| 1.2.5 | WAR/value trust promotion gate | 1 | Codex 5.5 very high | 1.1, 1.2 |
| 1.3 | Dynamic designations promoted | 1 | Codex 5.5 very high | 1.1, 1.2, 1.2.5 |
| ☑ | Mini-smoke A: salary + designations | — | Manual | 1.3 |
| 1.4 | Farm system core | 1 | Codex 5.5 very high | 1.1 |
| 1.5 | Full trade execution | 1 | Codex 5.5 very high | 1.2, 1.4 |
| 1.6 | Manager WPA lineup delta | 1 | Codex 5.5 very high | — |
| 1.7 | Spray chart full filters | 1 | Codex 5.5 very high | — |
| 1.8 | Playoff confirmation + tiebreaker | 1 | Codex 5.5 very high | 1.1 |
| 1.9 | Awards / watchlists | 1 | Codex 5.5 very high | 1.1, 1.2, 1.3, WAR trusted |
| 1.10 | Mode 2 → 3 handoff contract | 1 | Codex 5.5 very high | All Phase 1 |
| ☑ | Phase 1 gate: full smoke | — | Manual | 1.10 |
| 2.1 | Player morale engine | 2 | Codex 5.5 very high | Phase 1 ✓ |
| 2.2 | Fan morale engine automated | 2 | Codex 5.5 very high | 2.1 |
| 2.3 | Milestone + event wiring | 2 | Codex 5.5 very high | 2.1, 2.2 |
| 2.4 | Beat reporter | 2 | Codex 5.5 very high | 2.3 |
| 2.5 | Integration pass | 2 | Codex 5.5 very high | 2.4 |
| ☑ | Phase 2 gate: morale smoke | — | Manual | 2.5 |
| 3.1 | Team Hub cleanup | 3 | Codex 5.5 medium | Phase 2 ✓ |
| 3.2 | Schedule cleanup | 3 | Codex 5.5 medium | Phase 2 ✓ |
| 3.3 | Almanac cleanup | 3 | Codex 5.5 medium | Phase 2 ✓ |
| 3.4 | Player Profile cleanup | 3 | Codex 5.5 medium | Phase 2 ✓ |
| 3.5 | Spray chart final design | 3 | Codex 5.5 very high | 1.7 |
| 3.6 | League Builder stadium | 3 | Codex 5.5 medium | Phase 2 ✓ |
| 3.7 | Random event log / Tootwhistle | 3 | Codex 5.5 medium | Phase 2 ✓ |
| ☑ | Phase 3 gate: product smoke + v1 approval | — | Manual | 3.7 |

---

## Before Starting Any Item

Per SESSION_RULES.md operating protocol (all routes use Codex 5.5):

1. Read `FRANCHISE_MODE2_V1_CONTEXT_CARD.md`
2. Read `FRANCHISE_MODE2_V1_COMPLETION_ROADMAP.md`
3. Read the feature-specific spec being touched
4. State current slice, phase, routing, hard boundaries, and typed event contract in the prompt
5. After implementation: build passes, tests pass, smoke in real app, explicit confirm before closing ticket
