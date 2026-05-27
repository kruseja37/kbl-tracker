# Franchise v1 Stability Principles and Cut List

**Status:** Working guardrail document  
**Created:** 2026-05-27  
**Scope:** Franchise v1 operating principles across Mode 1, Mode 2, and Mode 3.  
**Purpose:** Preserve the v1 vision before implementation audit/build work begins.

This document captures the guiding decisions from the Mode 1, Mode 2, and paused Mode 3 reconciliation sessions. It is not an implementation roadmap and does not replace the mode-specific worksheets. Its job is to prevent scope drift, risky automation, dead-code loops, and half-wired feature claims while building a stable internal v1.

## 1. v1 north star

v1 should be a reliable, playable franchise loop with enough personality to feel alive.

The goal is not maximum feature count. The goal is a franchise experience where setup, rosters, schedules, games, stats, transactions, stories, and season transitions do not lose data, silently mutate the wrong records, or create false confidence.

## 2. Operating model

**Manual intent, deterministic math, auditable surprise.**

- The user supplies intent and external SMB4 reality.
- The engine validates, calculates, aggregates, and explains.
- Narrative/random systems may surprise the user, but important state changes must be logged, reviewable, and recoverable.

## 3. Automation policy

Automation is valuable when it serves one of these roles:

- deterministic calculation
- validation
- aggregation
- eligibility detection
- threshold scaling
- narrative/story option generation from stable inputs

Automation is risky when it tries to infer user intent, invent missing external SMB4 reality, or mutate canonical franchise state without review.

### 3.1 Good v1 automation

- Salary calculations from approved salary inputs.
- Park-factor calculations from known stadium dimensions or user overrides.
- Standings from completed games.
- Stat aggregation from GameTracker events and approved manual result records.
- WPA, LI, Clutch, and Manager Moments from gameplay data.
- Adaptive thresholds from season length, innings, league context, park context, and sample size.
- Roster validation.
- Playoff seeding from standings and approved playoff rules.
- Dynamic designation calculations once upstream inputs are stable.
- Narrative/random event eligibility when the event is explainable and logged.

### 3.2 Risky v1 automation

- Generated franchise schedules.
- Inferred roster fixes.
- AI game simulation.
- AI trades.
- Salary-matching enforcement for trades.
- Auto-selecting free agents, draft picks, trades, or lineup/roster changes.
- Auto-applying narrative/morale/relationship/designation effects without traceability.
- Creatively resolving missing data.
- Inferring playoff format at season end.

When automation is risky, the engine should ask the user for manual input instead.

## 4. Manual input policy

Use manual input for anything that reflects intent, SMB4 console reality, or a decision the engine cannot safely infer.

Examples:

- Schedule rows and schedule corrections.
- Playoff rules at setup.
- Unresolved playoff ties after run differential.
- Trades.
- Free-agent choices.
- Draft/farm choices unless a specific generation flow is approved.
- Call-ups and send-downs.
- Roster fixes.
- Final-score-only results.
- Stadium dimensions and park-factor overrides.
- Missing or ambiguous data needed for reliable calculations.

Manual input should not mean the app is passive. The engine should still validate, summarize consequences, flag missing data, and keep downstream state consistent.

## 5. Narrative and random event policy

Narrative automation is part of the v1 vision, but it must be reliable.

The narrative engine may determine when and what appears based on qualifying logic, stable inputs, and a controlled randomness layer. Randomness should make the season feel alive, not corrupt the save.

### 5.1 Event classes

**Story-only events**

These create flavor and do not require SMB4 console changes or canonical mutation.

Examples:

- Reporter reaction.
- Fanbase mood story.
- Rivalry hype.
- Teammate tension story.
- Pressure narrative around a player/team.

Story-only events may be generated automatically if they are logged and evidence-backed.

**Suggested-change events**

These suggest a change that may affect app state or SMB4 state. The engine explains why and asks for confirmation or manual input before canonical mutation.

Examples:

- Morale shift.
- Relationship shift.
- Designation change.
- Scouting reveal.
- Role expectation.
- Recommended lineup/roster consequence.

**Required-manual-sync events**

These require the user to mirror or confirm external changes in the SMB4 console or report SMB4 reality back to the app.

Examples:

- Injury/fitness/mojo state from SMB4.
- Roster move that must be mirrored in SMB4.
- Ratings/trait changes that must be entered into SMB4.
- Free-agent signing, trade, draft, retirement, or other roster mutation.

### 5.2 Required event audit fields

Any narrative/random event that matters downstream should preserve:

- event type
- affected franchise/season
- affected team/player/reporter/fanbase ids
- eligibility reason
- random seed/roll or deterministic selector when applicable
- proposed state changes
- user decision: confirmed, dismissed, pending, manually applied
- transaction/event log reference if mutation occurs

## 6. SMB4 console reality

SMB4 remains the gameplay source outside the app. The user must mirror certain app-generated changes into the console version of SMB4.

Therefore v1 should prefer:

- pending task cards
- confirm/dismiss/manual-entry controls
- clear "apply in SMB4" status
- transaction logs
- repairable state

The app should not silently assume SMB4 has been changed.

## 7. Data ownership rules

**Mode 1 owns setup snapshot.**

- League/team/player templates.
- Stadium templates and park-factor inputs.
- Rules and playoff config.
- Roster/farm setup.
- Salary initialization at roster finalization.
- Personality/chemistry/fame/trait fields.
- Active franchise metadata.

**Mode 2 owns season state.**

- Schedule display/editing.
- GameTracker launches.
- Active-game snapshots.
- Completed game archive.
- Standings.
- Season/playoff stats.
- Player WPA, manager WPA, LI, Clutch, Manager Moments.
- In-season roster/trade/farm movement where approved.
- Narrative and random events during the season.
- Mode 2 to Mode 3 handoff.

**GameTracker owns gameplay data.**

GameTracker is the source of truth for gameplay-oriented data. Franchise hub systems consume and interpret GameTracker data; they do not reinvent it.

**Mode 3 owns offseason mutations.**

- Ratings/salary recalculation where approved.
- Retirements.
- Free agency.
- Draft.
- Offseason trades.
- Farm reconciliation.
- Final roster lock/cut/sign.
- Next-season handoff.

## 8. Hard v1 exclusions and cuts

These are excluded or narrowed for v1 unless explicitly reopened.

- No generated franchise schedules.
- No OCR schedule extraction.
- No AI game simulation.
- No AI trade logic.
- No salary matching requirement for trades.
- No luxury tax logic.
- No farm games.
- No abbreviated Playoff Mode inside Franchise Setup; Elimination Mode owns that use case.
- No user redesign of playoff format/series rules at season end.
- No final-score-only fabricated player stats, WPA, awards inputs, milestones, or derived analytics.
- No hidden canonical state mutation from narrative/random events.
- No half-wired optional branches presented as complete.

## 9. DH v1 cut recommendation

DH logic is a high-risk optional branch for roster movement, substitutions, pitcher changes, lineup snapshots, GameTracker restore, stat attribution, and playoff/rules handling.

Recommended v1 direction:

- Remove or hide DH from v1 franchise setup and Mode 2 launch paths.
- Normalize franchise games to a single non-DH lineup model.
- Guard or remove DH-specific UI toggles and dead branches from franchise v1 paths.
- Preserve future compatibility only if it does not create active v1 bugs.

This should be confirmed during the implementation audit before code changes.

## 10. League Builder and Mode 1 field expectations

League Builder should provide the raw user inputs and reusable templates that Mode 1 snapshots into a franchise.

Known Mode 1 inputs likely needed by Mode 2:

- League/team/player templates.
- Stadium templates, dimensions, and park-factor inputs.
- Team stadium assignment.
- Team identity and fanbase/team personality inputs where approved.
- Player ratings, positions, handedness, traits, chemistry, personality, fame, salary inputs.
- Roster and farm assignments.
- Prospect/farm/scouting setup inputs.
- Rules: innings, season length, playoff setup, roster sizes, tiebreaker, controlled teams.
- Empty/manual/CSV schedule state.

Important distinction:

- User inputs are pulled from League Builder and setup screens.
- Calculated outputs are produced deterministically from those inputs.
- Creative outputs are generated only where the system is designed to create audited narrative/prospect/story content.

## 11. Stadiums and park factors

League Builder should likely include a first-class Stadiums section for v1 or near-v1 if park factors and stadium analytics remain v1 goals.

Stadiums should support:

- stadium identity
- dimensions
- relevant wall/park metadata where available
- calculated park factors
- optional user-entered/custom park-factor overrides

Mode 1 should snapshot the assigned stadium and park-factor data into the franchise. Later League Builder edits should not mutate active saves.

Mode 2 should use stadium/park data for approved park-adjusted stats, WAR/value/designation inputs, and stadium analytics where stable. GameTracker spray-chart data should support stadium-linked analysis where feasible.

## 12. Transaction and event log principle

Transactions are a core app concept alongside at-bat and between-at-bat events.

Any canonical state mutation needs a scoped, durable, traceable record:

- roster moves
- trades
- signings
- releases
- retirements
- draft/farm additions
- call-ups/send-downs
- salary/rating changes where applicable
- confirmed narrative/random events that mutate state

Mutation paths should include:

- canonical franchise/season/stats scope
- affected entities
- before/after state where practical
- source: manual, ceremony, narrative, system calculation, import, correction
- rollback/repair status where applicable

Compensating rollback is acceptable for internal v1 if labeled honestly and tested.

## 13. Stability standard

A v1 feature should not be called complete unless it has:

- one clear data owner
- one clear mutation path
- franchise-scoped persistence
- truthful UI labels
- clear behavior when interrupted
- no hidden template/global reads in franchise paths
- no generated substitute for missing user intent
- tests for core success and failure paths where risk is high

If a feature does not meet this standard, it can be:

- hidden
- read-only
- preview-only
- marked incomplete
- replaced with manual input
- deferred

## 14. Immediate next step

Before more feature implementation, create a Mode 1/2 implementation audit plan from the approved worksheets and this guardrail document.

The audit should identify:

- what already works
- what is partially built
- what is missing
- what is unsafe or contradictory
- what dead/half-wired branches should be hidden or removed
- which deterministic engines are trusted
- which narrative/random event paths can be enabled safely

Recommended first audit areas:

1. Schedule generation removal, empty/manual schedule, and CSV import.
2. Mode 1 handoff completeness.
3. GameTracker launch/snapshot/resume/completion idempotency.
4. Roster/farm/trade transaction consistency.
5. Salary/designation/WPA/WAR/adaptive standards dependencies.
6. Stadium/park-factor data contract.
7. Narrative/random event safety model.
