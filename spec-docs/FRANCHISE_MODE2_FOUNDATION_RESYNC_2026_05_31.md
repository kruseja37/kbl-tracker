# Franchise Mode 2 Foundation Resync

Date: 2026-05-31

Purpose: compare the current Franchise v1 build against the earlier Mode 2 reconciliation decisions after the recent implementation/checkpoint work. This is a planning/status document only. It does not implement code, lock new scope, or promote manual-smoke feedback into the active lane.

Primary references:
- `MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `FRANCHISE_INTERNAL_V1_RELEASE_CANDIDATE_CHECKPOINT.md`
- `FRANCHISE_INTERNAL_V1_SCOUT_PROSPECT_DRAFT_CHECKPOINT.md`
- `FRANCHISE_INTERNAL_V1_ACTIVE_EXECUTION_PLAN.md`
- `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md`
- `PASS_2B_GAMEPLAY_STAT_PIPELINE_PLAN.md`

## Executive Reset

The active priority is back to Mode 2 foundation, not manual-smoke polish.

Manual-smoke feedback remains tracked in `FRANCHISE_INTERNAL_V1_MANUAL_SMOKE_FEEDBACK.md`. Those items should be pulled forward only when they block the foundation or when the matching system slice begins. The current Mode 2 work should continue from the approved reconciliation decisions and the latest repo state.

The immediate Mode 1 to Mode 2 blockers from the active execution plan have been repaired and committed:

- `Start Franchise` no longer leaves the user stuck after a successful save.
- Franchise save-slot delete works from the selector.
- Franchise schedule-to-GameTracker launch confirmation proceeds.
- The latest shared GameTracker number-button input UI has been ported without overwriting Franchise completion hardening.

The remaining Mode 2 work should therefore move from "can the playable loop launch?" to "are the downstream season systems trustworthy enough to build on?"

## Current Foundation Status

| Mode 2 area | Current status | Notes |
|---|---|---|
| Franchise Home shell | Implemented / keep | The Mode 2 hub exists and is the correct foundation. Placeholder/deferred tabs should continue to be judged separately. |
| Scoped franchise reads/writes | Mostly implemented / keep hardening | Core schedule, roster, game, playoff, transaction, completed-game, and summary paths carry franchise/season/stats scope. Advanced derived systems still need proof. |
| Manual/CSV schedule | Implemented for v1 | Empty startup, manual add/edit/delete, CSV import/review, score-only result, and no generated schedule path are covered by focused tests and browser smokes. |
| GameTracker launch/save/resume/completion | Implemented / active foundation | Launch uses current franchise-owned roster state, then freezes active-game snapshots. Completion/archive/schedule/playoff state is hardened and idempotency is covered by tests. |
| Regular-season standings | Implemented core | Core standings update from GameTracker and score-only results. Advanced clinch/magic/playoff-odds UI remains outside the current foundation. |
| Playoff setup/progression | Implemented core | Playoffs derive from standings and stored setup/rules. No-DH config is preserved. Tie handling and polish can wait unless it blocks a season finish. |
| Core stats / stat boundary | Mostly implemented | Regular-season vs playoff boundary and archive-derived trade stint projection have been added. Full event-sourced replay remains deferred per Pass 2B. |
| WPA / Manager Moments | Implemented enough to preserve | Player WPA and manager WPA/Manager Moments are among the stronger advanced systems and should remain distinct from WAR. |
| WAR / adaptive standards | Partial / needs proof before deeper consumers | Engines and UI references exist, but full trusted bWAR/pWAR/fWAR/rWAR consumption across designations/awards/salary still needs a dedicated proof pass. |
| Salary baseline | Implemented | Mode 1 initializes salaries and D2 salary recalculation exists. True Value/performance salary consequences remain conditional on trusted value inputs. |
| Dynamic designations | Partial but important | MVP, Ace, Fan Favorite, and Albatross are implemented/persisted in stable form. Captain/Fan Hopeful and full projection/locked/carryover behavior need a dedicated designations pass. |
| Trades | Implemented user-driven core | Manual MLB/FARM/mixed trades execute, log transactions, update assignments/farm records, and preserve player identity. AI trades and salary matching remain excluded. |
| Farm movement | Implemented user-driven core | Farm records, call-up/send-down, trade eligibility, and future GameTracker availability are wired. Morale/story/reveal depth remains conditional. |
| Team Hub roster/FARM/lineup/rotation | Implemented core | Team Hub can show MLB/FARM state and save durable lineup/rotation. Rich player profile UX is tracked as feedback, not current foundation. |
| Result reporting/history | Mostly implemented | Score-only rows are labeled, GameTracker rows link to Game Detail, playoff score display was corrected, and Team Hub transaction history is visible. |
| Narrative/news/history | Limited stable surfaces only | Game-derived/reporter/history surfaces are usable as evidence-backed flavor. Random events, morale mutation, relationships, and broad narrative outcomes remain unapproved as canonical systems. |
| Fan/player morale | Not foundation-complete | Engines/fields exist, but durable franchise-scoped state and effects are not proven. Keep deferred until the morale slice. |
| Relationships/chemistry effects | Not foundation-complete | Relationship/chemistry engines and fields exist, but durable franchise lifecycle and Mode 2 effects are not proven. Keep deferred until the relationship/chemistry slice. |
| Awards/watchlists | Deferred as formal system | Leaders are real. Awards logic must wait for trusted WPA/WAR/value/designation inputs. |
| Park factors/stadium analytics | Seed identity implemented, analytics partial | Known SMB4 seed park factors and stadium identity persist. Spray/stadium analytics and custom factors need a dedicated pass. |
| Mode 2 to Mode 3 handoff | Core implemented, derived outputs conditional | Season summary/handoff can carry core stats, standings, playoffs, roster/farm, salary, transactions. Derived systems enter only after their upstream proofs. |

## What Changed Since The Worksheet

Several worksheet rows were originally marked partial/unknown but have since moved forward:

- Schedule policy, manual schedule, CSV import, score-only results, and result reporting are now v1-shaped rather than speculative.
- User-driven trades and call-up/send-down are no longer deferred; the core roster mutation spine exists.
- Team Hub FARM visibility and durable lineup/rotation save exist.
- Playoff setup, no-DH playoff handoff, playoff GameTracker launch, and result display are materially stronger.
- Startup scout/prospect preparation became a Mode 1/League Builder foundation that feeds Mode 2 correctly.
- GameTracker input UI parity was restored for pitch count and HR distance entry.

The worksheet remains useful for decisions, but it should not be treated as current implementation status without this resync.

## Manual-Smoke Feedback Policy

Tracked feedback should stay parked unless it blocks a foundation slice.

| Feedback item | Current treatment |
|---|---|
| Immaculate inning false positive | Logged as GameTracker/Fame correctness bug; fix later in focused gameplay/fame slice. |
| DH in prospect/scout generation | Tracked as scout/prospect policy feedback; do not chase until returning to Mode 1 farm/scouting cleanup. |
| Scout accuracy tuning | Tracked as tuning; not foundational until the scout/prospect slice is reopened. |
| Scout/prospect name variety | Tracked as generation quality; not foundational until the scout/prospect slice is reopened. |
| Player profile visibility | Important Team Hub UX; hold until the player-inspection slice. |
| Franchise delete vs Almanac preservation | Important lifecycle policy; should become a save-slot/archive policy slice, not an ad hoc delete patch. |

## Recommended Next Foundation Slice

Next slice should be a documentation-first implementation audit:

**Mode 2 value/designation/salary proof pass.**

Reason:

- Dynamic designations are explicitly required by the Mode 2 decision worksheet.
- Designations depend on the systems most likely to create false confidence: WAR, WPA, salary/value, adaptive standards, park factors, roster/farm/trade continuity, and season length/innings scaling.
- The repo already has meaningful pieces, but "pieces exist" is not the same as a trustworthy v1 value spine.
- If this spine is proven or bounded, it unlocks awards/watchlists, salary/value display, Mode 3 handoff confidence, farm morale effects, fan/player morale decisions, and later narrative systems.

This should be an audit before implementation because the slice crosses multiple systems and specs.

## Proposed Audit Questions

1. Which dynamic designations are currently persisted and where are they displayed?
2. Which designation inputs are stable today: raw stats, WPA, manager WPA, WAR components, salary, true value, roster status, farm status, park factors, adaptive standards?
3. Which designation types are missing or intentionally guarded: Captain, Fan Hopeful, Cornerstone, projected vs locked state, carryover?
4. Does salary/value logic match `SALARY_SYSTEM_SPEC_UPDATED.md`, or are there placeholders/old formulas still present?
5. Are WAR outputs trustworthy enough to feed designations/awards/salary, or should WPA/stable stats be the internal-v1 source while WAR remains preview?
6. Are park factors/adaptive standards actually consumed by value logic, or merely stored as seed identity?
7. Do trades/call-ups/send-downs preserve designation continuity and future team context without rewriting historical archive context?
8. Which UI surfaces currently imply these systems are complete, and which should be labeled preview/deferred?
9. What is the smallest v1-safe designation/value scope that honors the worksheet without creating false confidence?

## Exact Next Prompt

```text
Recommended reasoning: High

Please perform a repo-first, skeptical audit of the Mode 2 value/designation/salary spine for Franchise internal v1.

Use these sources:
- spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md
- spec-docs/SALARY_SYSTEM_SPEC_UPDATED.md
- spec-docs/PARK_FACTOR_SEED_SPEC.md
- spec-docs/STADIUM_ANALYTICS_SPEC.md
- spec-docs/FRANCHISE_MODE2_FOUNDATION_RESYNC_2026_05_31.md

Audit only. Do not edit app code, docs, tests, staging, commits, or generated files.

Audit scope:
1. Dynamic designations:
   - Which designation types are implemented, persisted, displayed, and tested?
   - Which are missing, preview-only, or intentionally not invented?
   - Are projected/locked/carryover states real?
   - Do trades/call-ups/send-downs preserve future team context and historical archive context?

2. Salary/value:
   - Does current salary initialization/recalculation match SALARY_SYSTEM_SPEC_UPDATED.md?
   - Where does salary appear in Mode 2?
   - Are True Value/value delta inputs real or placeholders?
   - Is there any luxury tax/salary matching logic leaking into v1 despite being rejected?

3. WAR/WPA/adaptive inputs:
   - Which WAR components are fed from current franchise season stats and where are they persisted/displayed?
   - Is WPA/Manager Moments clearly separated from WAR/mWAR labels?
   - Which systems consume WPA vs WAR?
   - Are season length, innings, sample-size, and adaptive thresholds applied consistently?

4. Park/stadium inputs:
   - Are seed park factors and stadium IDs preserved through Mode 1 to Mode 2?
   - Are park factors actually consumed by salary/value/designation/WAR paths, or only stored?
   - Are custom/dynamic/blended factors guarded correctly?

5. UI/reporting truth:
   - Identify any surfaces that imply awards/designations/salary/value/WAR/park analytics are complete when they are not.
   - Identify the smallest v1-safe visible surface for designations/value.

Output:
- Findings first, ordered by severity.
- Confirmed good items.
- Current implementation matrix by subsystem.
- Recommended v1-safe scope.
- Specific implementation slices, but no code.
- Tests that should be added before implementation.
```

## Stop Conditions

Do not start morale, relationships, random events, awards ceremony, Mode 3 execution, player profile UX, scout tuning, or GameTracker fame bug work until the value/designation/salary audit either:

- proves they are not dependencies for the next foundation slice, or
- explicitly recommends a narrower prerequisite slice.

