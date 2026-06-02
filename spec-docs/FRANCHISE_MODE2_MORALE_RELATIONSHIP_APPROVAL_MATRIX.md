# Franchise Mode 2 Morale / Relationship Approval Matrix

**Date:** 2026-06-02
**Branch:** `codex/franchise-v1-next`
**Source docs:**
- `spec-docs/MODE_2_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md`
- `spec-docs/FRANCHISE_MODE2_MORALE_RELATIONSHIP_DECISION_WORKSHEET.md`

## Alignment Summary

The Mode 2 reconciliation worksheet treats fan morale, player morale, and relationships as desired Franchise systems, but not as proven internal v1 mutation systems. It repeatedly requires durable franchise-scoped state, evidence-backed inputs, explainable rules, hidden-prospect safety, and downstream boundaries before morale or relationship behavior can affect salary, designations, awards, narrative, or Mode 3/offseason handoff.

The morale/relationship decision worksheet aligns with that stance:

- It preserves current read-only foundation gates.
- It treats GameTracker archive facts, official transactions, visible personality/chemistry, salary baseline, and score-only rows as context until approved rules exist.
- It blocks hidden FARM/prospect truth before reveal.
- It blocks automatic morale/relationship mutation, narrative/random-event generation, story persistence, salary movement, True Value, awards, designations, and Mode 3 effects.
- It frames automation as suggestion-first or manual-confirm until the user approves exact rules.

## Approval Matrix

Legend for automation level:

- `blocked`: not allowed in current v1 behavior.
- `read-only`: may be displayed or used as context, but not mutated.
- `suggested`: system may propose an effect, but not apply it.
- `manual-confirm`: system may stage an effect and user must confirm before persistence.
- `automatic`: system may persist without user confirmation. This should remain rare and requires explicit approval.

| Area | Proposed v1 behavior | Automation level | Hidden prospect policy | Required storage, if any | UI surface | Needs user approval |
| --- | --- | --- | --- | --- | --- | --- |
| Player morale state | Define as player satisfaction/confidence context, but do not persist or mutate yet. | read-only | Unrevealed prospects show no hidden morale truth. | None now; future `morale_events` and player morale snapshot if approved. | Team Hub player profile or Foundation Status panel. | Yes, before mutation. |
| Fan morale state | Desired future team/fanbase state; keep read-only/deferred until event rules are approved. | blocked | No prospect-specific fan effects before reveal. | Future team/fan morale snapshot and event log. | FranchiseHome summary, Team Hub team panel, SeasonSummary. | Yes. |
| Team/clubhouse morale | Optional aggregate rollup only after player/team rules exist. | blocked | No hidden prospect inputs before reveal. | Future derived rollup, likely no direct mutation storage at first. | Team Hub or FranchiseHome. | Yes. |
| Player-player relationships | Preserve as future relationship type; no automatic creation from generic stats. | blocked | No relationships involving hidden prospect truth before reveal. | Future `relationship_events` and relationship snapshot. | Player Profile continuity/relationship panel. | Yes. |
| Player-team relationship | Future loyalty/friction/trust context from trades, call-ups, send-downs, role use. | suggested | Unrevealed prospects can only use visible-safe context. | Future `relationship_events`; player/team scoped snapshot if approved. | Team Hub profile, Roster & Trades. | Yes. |
| Player-fanbase relationship | Future fan attachment/friction, dependent on fan morale and approved value/designation rules. | blocked | No Fan Favorite/Fan Hopeful implications before reveal. | Future fan/player relationship event or fan morale event. | Team Hub profile, FranchiseHome. | Yes. |
| Player-manager/user-team relationship | Future manager trust or user-team relationship; must define whether manager means user, team, or stored manager identity. | blocked | Hidden prospect truth remains blocked. | Future relationship event with manager/user-team entity model. | Team Hub profile, GameTracker pregame, FranchiseHome. | Yes. |
| Scout-prospect relationship | Keep as visible-safe scouting context only; no morale/relationship mutation. | read-only | Scout reports must not expose hidden scout truth, true ratings, true grade, or hidden modifiers. | Existing scout/prospect metadata only; no relationship storage now. | League Builder scouting, Team Hub FARM profile. | Yes, before mutation. |
| Score-only result effects | Schedule/standings context only. No player morale, relationships, stats, WPA, awards, designations, or narrative inputs. | read-only | No prospect effects. | Existing schedule row only. | Schedule, standings, Foundation Status panel. | No for read-only; yes for any fan morale effect. |
| GameTracker archive-backed effects | Eligible as factual context. Do not mutate morale/relationships until thresholds and event types are approved. | read-only | Only revealed/current players can be candidates for future player effects. | Existing completed archive now; future event storage if approved. | Game Detail, Team Hub profile, FranchiseHome summaries. | Yes, before suggested/mutation use. |
| Call-up effects | Future candidate for morale boost/reveal/user-team relationship. Current behavior stays transaction/context only. | suggested | Call-up/reveal unlocks full-detail eligibility; no pre-reveal hidden truth. | Existing transaction now; future morale/relationship event if approved. | Roster & Trades, Team Hub profile. | Yes. |
| Send-down effects | Future candidate for morale hit, reset, or role-friction suggestion. Current behavior stays transaction/context only. | suggested | Unrevealed prospect effects blocked unless hidden-safe policy is approved. | Existing transaction now; future morale/relationship event if approved. | Roster & Trades, Team Hub profile. | Yes. |
| Trade effects | Future candidate for player-team/fan/team morale suggestions. Current behavior stays official transaction/context only. | suggested | Hidden prospect effects blocked before reveal. | Existing transaction now; future morale/relationship event if approved. | Roster & Trades, Team Hub profile, FranchiseHome. | Yes. |
| Role/lineup/rotation effects | Do not infer morale from one lineup/rotation save. Requires explicit role expectation model first. | blocked | FARM players excluded from MLB lineup/rotation role assumptions unless called up/revealed. | Future role expectation records plus event storage. | Team Hub lineup/rotation, profile. | Yes. |
| Salary effects | Salary baseline is read-only context. Salary movement, contract satisfaction, luxury tax, salary matching, and AI valuation stay blocked. | read-only | Salary can show only if visible-safe; no hidden value implications before reveal. | Existing salary baseline only. | Team Hub value/salary panel, profile. | Yes, before any morale effect. |
| Future salary movement | Keep blocked until True Value, salary lifecycle, and Mode 3/offseason rules are canonical. | blocked | Not applicable before reveal. | Future salary ledger if approved. | Mode 3/offseason or salary panel. | Yes. |
| Playoff/championship effects | Future candidate for fan/player morale and rivalry context, but only after playoff event rules are approved. | suggested | Only revealed/eligible player context; no hidden prospect truth. | Existing playoff/archive facts now; future event storage if approved. | FranchiseHome playoffs, SeasonSummary, Team Hub. | Yes. |
| Manual overrides | Recommended first mutation philosophy: user-authored or user-confirmed effects only. | manual-confirm | User cannot override hidden truth fields before reveal. | Future explicit manual override schema; no storage until approved. | Team Hub profile or Roster & Trades review panel. | Yes. |
| Hidden FARM/prospect behavior | Before reveal, prospects remain hidden-safe. No true ratings, true grade, hidden scout truth, hidden modifiers, or hidden morale/relationship effects. | blocked | Core policy: no hidden truth before reveal. | Existing hidden-safe farm/scouting metadata only. | Team Hub FARM profile, League Builder scouting. | No for current block; yes for any prospect morale. |
| Profile edits/manual rating changes | Player-local edit history only; no official morale, relationship, narrative, transaction, salary, or designation effect. | read-only | Hidden field edits blocked before reveal. | Existing player-local edit history only. | Team Hub player profile. | No for current read-only context. |
| Personality/chemistry | Visible personality and chemistry are identity/context. They may not mutate morale/relationships alone. | read-only | Hidden personality modifiers blocked before reveal. | Existing player profile fields only. | Team Hub profile. | Yes, before rule input use. |
| Narrative/random-event read access | Narrative may read approved facts/context in the future; it may not mutate morale/relationships or persist stories now. | read-only | Hidden prospect truth blocked before reveal. | None now; future story/event storage if separately approved. | Future narrative surface, SeasonSummary. | Yes, before narrative generation. |
| Narrative/random-event generation | Keep blocked. No random events, story persistence, morale mutation, relationship mutation, or Mode 3 effects. | blocked | Hidden prospect data blocked. | Future story/event storage only after approval. | None now. | Yes. |
| Mode 3/offseason handoff | Include morale/relationships only if upstream systems become approved, scoped, tested, and durable. | blocked | Hidden/prospect policy must carry forward. | Future season summary fields if approved. | SeasonSummary, Mode 3. | Yes. |

## High-Priority Approval Questions

These are the decisions most likely to block any mutation slice.

1. Should internal v1 implement durable morale state now, or keep morale read-only/deferred?
2. Should internal v1 implement durable relationship state now, or keep relationships read-only/deferred?
3. Should all morale/relationship effects require manual confirmation, or can any approved low-impact events auto-apply?
4. Can score-only wins/losses affect fan morale at team level, or must score-only rows remain non-morale context?
5. Are call-up and send-down effects automatic, suggested, or manual-only context?
6. Are trade effects automatic, suggested, or manual-only context?
7. Should role expectations be explicit user-editable fields before any role morale exists?
8. Can visible personality/chemistry affect rule severity, or only display context?
9. Do unrevealed prospects have no morale state, hidden-only state, or visible-safe morale?
10. Can scout-prospect relationships exist before reveal, or only after call-up/reveal?
11. Which UI surface should receive the first approved interaction: Team Hub profile, Roster & Trades, FranchiseHome, or SeasonSummary?
12. Can narrative systems read morale/relationship context before narrative generation is approved?

## Recommended Next Implementation Slice

Recommended safe next slice before final approvals:

**Explicit manual override schema draft only, no mutation.**

Scope:

- Define proposed TypeScript/domain shapes for morale event proposals and relationship event proposals.
- Define validation rules for allowed source types, scope identity, hidden prospect redaction, and blocked inputs.
- Keep the utilities pure/read-only.
- Do not create storage.
- Do not add UI mutation.
- Do not save morale state or relationship state.
- Do not generate narrative/random events.

Rationale:

- A schema/validator draft turns the approval matrix into concrete reviewable contracts without committing to persistence or UI behavior.
- It lets tests prove blocked inputs remain blocked before any durable state exists.
- It avoids prematurely choosing automation behavior while preserving the original Mode 2 goal of eventual morale/relationship systems.

Alternate safe slice:

**Read-only Team Hub relationship/morale context panel only.**

This is safe only if it reads existing foundation reports and clearly labels morale/relationships as blocked/deferred. It should not create state, suggest effects, or add edit controls.

## Approval Status

| Decision area | Status |
| --- | --- |
| Morale state mutation | Awaiting user approval |
| Relationship state mutation | Awaiting user approval |
| Score-only fan morale | Awaiting user approval |
| Call-up/send-down morale | Awaiting user approval |
| Trade morale/relationships | Awaiting user approval |
| Role expectation model | Awaiting user approval |
| Hidden prospect morale/relationships | Awaiting user approval |
| Narrative read access | Awaiting user approval |
| Manual override schema draft | Recommended as next safe slice |
