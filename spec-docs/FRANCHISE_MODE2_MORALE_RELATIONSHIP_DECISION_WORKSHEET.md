# Franchise Mode 2 Morale / Relationship Decision Worksheet

> ## ⚠️ SUPERSEDED-BY-§24 (L13-Q11, ruling pass 2026-06-19)
> This 2026-06-02 worksheet's relationship decisions (empty checkboxes / "awaiting approval") are **SUPERSEDED** by
> `FRANCHISE_V1_LIVING_SEASON_SPEC.md §24` + REL-1..9 + the L13 rulings in `DECISIONS_LOG.md` ("L11–L14 ruling
> pass"). The relationship taxonomy (the §24 six affect-edges), formation gates, reporter accuracy, charged
> matchups, and morale coupling are all RULED there. Its **7 ENTITY-edges are a different axis (who-to-whom)** and
> fold into edge endpoints, NOT edge types (L13-Q1). Retained for historical context only; §24 + L13 are authority.

**Date:** 2026-06-02
**Branch:** `codex/franchise-v1-next`
**Current HEAD:** `45bec28 Document and surface Mode 2 foundation status`

## Purpose

This worksheet defines the decisions required before Franchise Mode 2 can mutate morale or relationship state. It is intentionally not an implementation spec yet.

Current Mode 2 foundation contracts classify morale and relationship inputs as read-only context. No morale state, relationship state, narrative event, random event, salary movement, designation persistence, or Mode 3/offseason effect should be implemented until the rules below are approved.

## Current Boundary

The current approved foundation may:

- Read scoped GameTracker archive facts as factual context.
- Read score-only rows as schedule/standings context only.
- Read roster movement and transaction rows as factual context.
- Read visible personality and chemistry as identity/context.
- Read salary baseline as context only.
- Read hidden FARM/prospect data only through hidden-safe views before reveal.

The current approved foundation must not:

- Create morale events.
- Create relationship events.
- Persist morale state.
- Persist relationship state.
- Convert profile edits into morale or relationship effects.
- Convert score-only games into player-level effects.
- Generate narrative/random events.
- Persist stories.
- Trigger salary movement, True Value, designations, awards, or Mode 3 execution.

## What Morale Means In Franchise Mode

Decision needed: approve one canonical definition.

Recommended definition:

Morale is a scoped, explainable state representing a player, team, or fanbase's current confidence, satisfaction, or frustration inside one franchise season. It should be event-backed, reversible through future events, and visible as context before it ever affects gameplay, salary, narrative, or offseason systems.

Candidate morale scopes:

| Scope | Meaning | V1 recommendation |
| --- | --- | --- |
| Player morale | A player's satisfaction with role, team situation, performance, and recent treatment. | Define now; mutate only after approved event rules. |
| Team morale | Aggregate clubhouse/team confidence. | Defer unless needed as display-only rollup. |
| Fan morale | Fanbase satisfaction with team direction, wins, trades, stars, and playoff stakes. | Define now; mutate only after approved event rules. |
| Prospect morale | FARM/prospect confidence or frustration. | Defer mutation until reveal/call-up policy is approved. |

Open approval:

- [ ] Morale is per-player only.
- [ ] Morale includes fanbase state.
- [ ] Morale includes team/clubhouse rollup.
- [ ] Morale includes unrevealed prospect state.
- [ ] Morale remains read-only/deferred for internal v1.

## What Relationships Mean In Franchise Mode

Decision needed: approve one canonical definition.

Recommended definition:

Relationships are scoped links between franchise entities that explain affinity, tension, trust, rivalry, mentorship, loyalty, or friction. Relationships should be durable only when created by approved events or manual user action. They should not be inferred silently from generic stats.

Candidate relationship dimensions:

| Dimension | Example | V1 recommendation |
| --- | --- | --- |
| Affinity | Teammates gel after sustained shared success. | Manual or explicitly event-backed only. |
| Tension | Player resents demotion or trade aftermath. | Manual or explicitly event-backed only. |
| Mentorship | Veteran and prospect relationship. | Defer unless manually assigned. |
| Rivalry | Opposing player/team history. | Read-only context first. |
| Manager trust | User/team trusts a player in high leverage. | Defer mutation until role rules are approved. |
| Fan attachment | Fanbase loves or rejects a player. | Defer until fan morale rules are approved. |

Open approval:

- [ ] Relationships are only manually created/edited.
- [ ] Relationships can be automatically suggested but require user approval.
- [ ] Some relationships can be automatically created from approved events.
- [ ] Relationships remain read-only/deferred for internal v1.

## Relationship Entities

| Relationship type | Allowed? | Notes / required boundary |
| --- | --- | --- |
| Player-player | Needs approval | Must preserve playerId continuity across trades/call-ups/send-downs. No hidden prospect truth before reveal. |
| Player-manager / user team | Needs approval | Must define whether "manager" means the human user, franchise team, or stored manager identity. |
| Player-team | Needs approval | Useful for loyalty/friction after trades, demotions, and role changes. Must be scoped by franchiseId/seasonId. |
| Player-fanbase | Needs approval | Depends on fan morale and designation/value rules. Should not infer Fan Favorite/Albatross until those gates are canonical. |
| Scout-player/prospect | Needs approval | Only visible-safe scouting relationship before reveal. Hidden scout truth and hidden modifiers stay blocked. |
| Team-team rivalry | Defer | Could be narrative context, but not required for first morale/relationship mutation slice. |
| Player-reporter | Defer | Narrative/reporter system is not approved as a mutation source yet. |

## Candidate Inputs

### GameTracker Archive-Backed Performance

Recommended status: eligible as read-only factual context; mutation requires explicit thresholds.

Can eventually affect:

- Player morale after confirmed performance streaks.
- Fan morale after wins, losses, walk-offs, collapses, playoff games, or championship outcomes.
- Player-player or player-team relationships only if an approved rule maps the event to a relationship effect.

Blocked until approved:

- Single-game stat spikes creating automatic morale swings without thresholds.
- WPA/Manager WPA directly creating relationship state.
- Archive rows missing franchiseId, seasonId, or statsScopeId.

Open decisions:

- [ ] Which stat/performance thresholds can create morale events?
- [ ] Should WPA/Manager WPA be morale context, or only narrative context?
- [ ] Should playoff games have stronger morale weight?

### Score-Only Games

Recommended status: schedule/standings context only.

Allowed:

- Team win/loss context.
- Standings and playoff seeding context.
- Possible fan morale context only if user approves a team-level score-only rule.

Blocked:

- Player morale.
- Player relationships.
- Player stats, WPA, WAR, milestones, awards, designations, salary movement, narrative/random-event inputs.

Open decision:

- [ ] Can score-only wins/losses affect fan morale at team level?
- [ ] Or must score-only rows remain entirely non-morale context?

### Call-Ups And Send-Downs

Recommended status: eligible for future explicit morale/relationship events.

Potential events:

- Call-up morale boost for the called-up player.
- Send-down morale hit or opportunity reset.
- Team/manager trust change after repeated movement.
- Prospect reveal unlocks full player morale/relationship eligibility.

Blocked until approved:

- Hidden prospect modifiers affecting visible morale before reveal.
- Automatic relationship effects without user-visible event explanation.
- Farm morale effects for unrevealed prospects unless hidden-safe policy is approved.

Open decisions:

- [ ] Should every call-up create a morale event?
- [ ] Should send-downs always create a morale event, or only after thresholds/repetition?
- [ ] Should call-up/reveal create any relationship with the user team?

### Trades

Recommended status: eligible for future explicit morale/relationship events.

Potential events:

- Traded player relationship with old/new team.
- Fan morale reaction to star traded away or acquired.
- Teammate morale/relationship reactions for major trades.

Blocked until approved:

- Salary/value-derived trade scrutiny until True Value and salary movement rules are canonical.
- AI trade valuation.
- Hidden morale effects on unrevealed prospects.

Open decisions:

- [ ] Should all manual trades create a player-team relationship event?
- [ ] Which trades are "major" enough for fan/team morale?
- [ ] Should user be prompted to approve trade morale effects?

### Profile Edits / Manual Rating Changes

Recommended status: player-local edit history only; no automatic morale/relationship effect.

Allowed:

- Read as profile edit context.
- Possibly show "manual edit happened" in player-local history.

Blocked:

- Automatic morale movement.
- Relationship movement.
- Official transaction logging.
- Narrative event creation.
- Salary/True Value/designation recalculation.

Open decision:

- [ ] Should manual rating edits ever be eligible for user-authored morale notes?
- [ ] Or should profile edits always remain outside morale/relationship systems?

### Salary Baseline And Future Salary Movement

Recommended status: salary baseline is read-only context only.

Allowed now:

- Show stored salary baseline.
- Use salary baseline as context in future approved rule discussions.

Blocked:

- Salary movement.
- Contract satisfaction.
- Luxury tax.
- Salary matching.
- AI trade salary valuation.
- Fan Favorite/Albatross from value delta.

Open decisions:

- [ ] Should salary satisfaction exist as player morale?
- [ ] Should salary/value delta affect fan morale?
- [ ] Should salary movement wait until Mode 3/offseason?

### Role / Lineup / Rotation Status

Recommended status: eligible only after durable role expectations are defined.

Potential events:

- Starter moved to bench.
- Pitcher removed from rotation.
- Prospect called up but unused.
- Role promise or preferred role manually set by user.

Blocked until approved:

- Inferring dissatisfaction from one lineup save.
- Any effect from stale lineup/rotation snapshots.
- Automatic role promises without user intent.

Open decisions:

- [ ] Should role expectations be explicit user-editable fields?
- [ ] Should durable lineup/rotation usage create role morale over time?
- [ ] Should GameTracker playing time affect role morale?

### Playoffs And Championships

Recommended status: eligible for future team/fan/player morale events after rules are approved.

Potential events:

- Clinched playoff berth.
- Series win/loss.
- Championship win/loss.
- Playoff hero/choke narrative context from archive-backed games.

Blocked until approved:

- Awards/designations from playoff-only stats unless stat boundary rules approve them.
- Narrative generation or story persistence.
- Mode 3/offseason effects.

Open decisions:

- [ ] Which playoff events create fan morale changes?
- [ ] Which playoff events create player morale changes?
- [ ] Should playoff relationship/rivalry arcs be manual-only?

### Personality / Chemistry

Recommended status: visible personality and chemistry are stable read-only context; hidden modifiers blocked before reveal.

Allowed:

- Visible personality/chemistry as context in UI.
- Visible personality/chemistry as future rule input only after approval.

Blocked:

- Hidden personality modifiers for unrevealed FARM/prospects.
- Chemistry state mutation.
- Relationship automation from chemistry alone.
- Captain/Fan Hopeful/Cornerstone until designation gates are canonical.

Open decisions:

- [ ] Which visible personality fields can influence morale rules?
- [ ] Which visible chemistry fields can influence relationship rules?
- [ ] Should chemistry modify event severity or only display context?

### Hidden Prospect Modifiers After Reveal

Recommended status: unlock only after call-up/reveal converts the player to full-detail profile eligibility.

Allowed after reveal:

- Full player ratings/profile display.
- Hidden modifiers may become eligible as approved rule inputs.

Blocked before reveal:

- True ratings.
- True grade.
- Hidden scout truth.
- Hidden personality modifiers.
- Hidden morale or relationship effects visible to the user.

Open decisions:

- [ ] Does reveal immediately initialize morale?
- [ ] Are hidden personality modifiers allowed to explain morale after reveal?
- [ ] Should pre-reveal events be stored privately or ignored until reveal?

## Inputs That Must Remain Blocked For Now

The following must remain blocked until a dedicated approval and implementation slice:

- True Value finalization.
- Value delta.
- Dynamic designation persistence.
- Fan Favorite, Albatross, Captain, Fan Hopeful, Cornerstone.
- Awards persistence.
- Salary movement.
- Contract satisfaction.
- Morale mutation from narrative text.
- Relationship mutation from narrative text.
- Random event generation.
- Story persistence.
- AI trades.
- Generated schedules.
- Mode 3/offseason execution.
- Cloud Sync diagnostics unless they directly block Mode 1/2 workflows.

## Manual Override Philosophy

Recommended policy:

Automation may suggest morale or relationship events only when the evidence is explicit and scoped. The user remains the commissioner and should be able to accept, edit, or reject suggested effects before durable mutation.

User should be able to manually edit:

- Player morale value, if morale state is approved.
- Fan morale value, if fan morale state is approved.
- Relationship type/intensity/status.
- Manual notes/reasons.
- Whether an event is active, archived, or ignored.

Automation may suggest but not force:

- Morale reactions to trades, call-ups, send-downs, role changes, playoff outcomes, and archive-backed performance.
- Relationship changes after repeated roster/story events.
- Fan morale reactions to major roster/team outcomes.

Automation should never silently mutate:

- Hidden prospect morale before reveal.
- Relationships involving hidden prospect truth before reveal.
- Salary movement.
- True Value.
- Designations or awards.
- Mode 3/offseason consequences.
- Narrative/random event state.

Open decisions:

- [ ] Manual overrides are required for every morale/relationship event.
- [ ] Low-impact events can auto-apply, high-impact events require approval.
- [ ] All automation is suggestion-only for internal v1.

## Hidden FARM / Prospect Policy

Before reveal:

- Unrevealed prospects may show visible-safe scouting/profile context only.
- No true ratings, true grade, hidden scout truth, or hidden personality modifiers may be shown.
- No hidden morale/relationship effect may leak hidden truth.
- Score-only and GameTracker events cannot affect unrevealed player morale unless the prospect is actually eligible and visible in the event context.

After call-up/reveal:

- Full-detail profile becomes available.
- Approved morale/relationship rules may use revealed personality/ratings/context.
- Pre-reveal events should not retroactively create hidden-derived effects unless explicitly approved.

Open decisions:

- [ ] Unrevealed prospects have no morale state.
- [ ] Unrevealed prospects have hidden morale state but it is not shown.
- [ ] Unrevealed prospects have visible-safe morale only.
- [ ] Scout-player/prospect relationships exist before reveal.
- [ ] Scout-player/prospect relationships begin only after reveal.

## UI Expectations

Recommended surfaces:

| Surface | Expected behavior |
| --- | --- |
| Team Hub player profile | Show compact morale/relationship context and event history once approved. |
| Team Hub roster rows | Optional small status chip only; avoid dense dashboards. |
| Team Hub FARM/prospect view | Hidden-safe morale/relationship copy only. No hidden truth. |
| Roster & Trades transaction desk | Show morale/relationship suggestions or results for roster moves only after approved. |
| FranchiseHome summary | Show high-level fan/team morale status only after durable state exists. |
| SeasonSummary | Include morale/relationship snapshots only after approved and scoped. |
| Almanac/player history | Read-only event history after durable event storage exists. |

iPad readability rules:

- Prefer one compact panel per player/team, not nested dashboards.
- Use 9-12px minimum utility text in the existing type scale.
- Use short labels: `Stable`, `Suggested`, `Needs approval`, `Blocked`.
- Keep reasons to one-line summaries with drilldown/details only where needed.
- Avoid mixing official transactions, profile edits, morale events, and narrative stories in one undifferentiated feed.

Open decisions:

- [ ] First UI slice is read-only status/context only.
- [ ] First mutation UI supports manual overrides.
- [ ] First mutation UI supports suggestion review.
- [ ] Team Hub is the first morale/relationship surface.
- [ ] Roster & Trades is the first morale/relationship surface.

## Mutation Boundaries

### Morale Event

A morale event should be created only when:

- It has franchiseId, seasonId, and statsScopeId where applicable.
- It identifies the affected entity.
- It identifies the approved source type.
- It includes a user-visible reason.
- It records whether it was automatic, suggested, or manual.
- It does not rely on blocked inputs.

Possible source types:

- `manual_override`
- `game_archive_performance`
- `score_only_team_result`, if approved
- `call_up`
- `send_down`
- `trade`
- `role_change`
- `playoff_result`
- `championship_result`

### Relationship Event

A relationship event should be created only when:

- It has franchiseId, seasonId, and statsScopeId where applicable.
- It identifies both entities.
- It identifies relationship type/direction.
- It identifies source event.
- It includes user-visible reason.
- It does not expose hidden prospect truth.

Possible source types:

- `manual_relationship_edit`
- `shared_game_context`
- `trade_context`
- `call_up_context`
- `send_down_context`
- `role_context`
- `playoff_context`

### Read-Only Context Only

The following are read-only context unless separately approved:

- Score-only rows.
- Player-local profile edit history.
- Salary baseline.
- TEAM_MVP/ACE preview eligibility.
- WPA/Manager WPA.
- Visible personality/chemistry.
- Roster movement history.
- GameTracker archive-backed facts.

## Relationship To Future Narrative / Random Events

Narrative systems may read:

- Approved morale state.
- Approved relationship state.
- Approved morale/relationship event history.
- GameTracker archive-backed facts.
- Official transaction history.
- Player-local edit history only as profile context, not official transaction/narrative history.
- Visible personality/chemistry.
- Hidden prospect data only after reveal and only if policy approves.

Narrative systems may not mutate:

- Morale state.
- Relationship state.
- Salary.
- True Value.
- Designations.
- Awards.
- Roster status.
- Farm reveal state.
- Mode 3/offseason state.

Random event systems remain blocked until:

- Event source rules are approved.
- Event storage is approved.
- Morale/relationship mutation boundaries are approved.
- Hidden FARM/prospect policy is approved.
- User approval/manual override policy is approved.

## Proposed First Implementation Slice After Approval

If the user approves this direction, the smallest safe next slice is:

1. Add durable, franchise-scoped morale/relationship event type definitions only.
2. Add pure validation/classification utilities for proposed morale/relationship events.
3. Add tests proving blocked inputs remain blocked.
4. Do not add UI mutation or storage writes yet.

Alternative first slice:

1. Add read-only Team Hub display of existing approved morale/relationship context.
2. Keep all mutation blocked.
3. Use the current foundation trust contracts as source.

## Open Decisions For User Approval

1. Should internal v1 implement morale mutation now, or keep morale read-only/deferred?
2. Should internal v1 implement relationship mutation now, or keep relationships read-only/deferred?
3. Is fan morale in scope before Mode 3/offseason?
4. Are score-only wins/losses allowed to affect fan morale?
5. Are call-ups/send-downs automatic morale events, suggested events, or manual-only context?
6. Are trades automatic morale/relationship events, suggested events, or manual-only context?
7. Should role/lineup/rotation expectations be explicit editable fields before role morale exists?
8. Can visible personality/chemistry affect event severity, or only display context?
9. Do unrevealed prospects have morale/relationships before reveal?
10. Should scout-player/prospect relationships exist before reveal?
11. Should automation ever auto-apply low-impact events, or should all effects require user approval?
12. Which UI surface comes first: Team Hub, Roster & Trades, FranchiseHome, or Player Profile?
13. Should narrative systems be allowed to read morale/relationship context before they can generate/persist stories?

## Decision Log

Use this section after review.

| Date | Decision | Approved by | Notes |
| --- | --- | --- | --- |
|  |  |  |  |
