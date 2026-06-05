# Franchise Mode 2 Dynamic Designation Morale Bridge

Recommended reasoning effort: high for implementation, medium for audits/doc checkpoints.

## Purpose

Dynamic designations are a first-class morale dependency for Franchise Mode 2 v1. They should connect player identity, contract/value perception, roster moves, and performance moments to fan/player morale through the existing confirmation-gated random-event workflow.

This bridge does not make designations automatic morale mutations. It defines which designation contexts may become safe prompt candidates once their inputs are trusted.

## V1 Direction

- `Team MVP` and `Ace` can produce preview recognition prompt candidates from the eligibility context adapter. They are not awarded, locked, or persisted in internal v1.
- `Team MVP` is position-player only in internal v1. `TWO-WAY` identities are routed as pitcher-only for v1 and may only appear through `Ace` when pitcher evidence qualifies. Stricter two-way Team MVP criteria are deferred.
- `Fan Favorite` represents positive fan attachment and surplus-value identity. Current v1 can inspect preview surplus context, but it cannot amplify fan reaction to trades, send-downs, clutch moments, or manual narrative prompts until value-delta inputs and durable designation state are trusted.
- `Albatross` represents negative contract/value sentiment. Current v1 can inspect preview deficit context, but it cannot create player morale risk, fan frustration, or fan/player relief prompts until value-delta inputs and durable designation state are trusted.
- `Cornerstone` represents earned franchise trust. It remains blocked until durable designation state and roster-move consequence policy are trusted.
- `Captain` can amplify morale effects only after hidden-charisma/leadership reveal safety is approved; it is blocked in current v1.
- `Fan Hopeful` can create prospect-safe player morale excitement only from explicit visible-safe prospect context. The eligibility/context adapter does not surface it yet, and hidden FARM truth must not be exposed.

## Internal V1 App-Facing Policy Matrix

| Designation | App-facing v1 status | Context adapter output | Blocker |
|---|---|---|---|
| TEAM_MVP | Active preview-only | Yes, player morale recognition context only | Position-player only; no persistence/final award. |
| ACE | Active preview-only | Yes, player morale recognition context only | Pitcher pWAR evidence required; no persistence/final award. |
| TWO-WAY | Pitcher-only routing | ACE only | Stricter two-way MVP criteria are deferred. |
| FAN_FAVORITE | Blocked | No | Trusted True Value/value-delta and durable fan attachment policy missing. |
| ALBATROSS | Blocked | No | Trusted True Value/value-delta and salary/value policy missing. |
| CORNERSTONE | Blocked | No | Durable designation state and roster-move consequence policy missing. |
| CAPTAIN | Blocked | No | Hidden charisma/leadership safety policy missing. |
| FAN_HOPEFUL | Blocked in eligibility | No | Visible-safe prospect assignment source not promoted; hidden FARM truth remains blocked. |

## Prompt Contract

The first implementation slice should be a pure read-only contract utility:

- Input: designation type, status, team/player identity, change/performance/roster-move context, scope identity, and hidden-safety flags.
- Output: eligible fan/player morale prompt candidates, blockers, limitations, and `safeEffectPreview` values.
- All actionable effects must flow through the durable random-event log confirmation path.

Allowed prompt families:

- Recognition: MVP/Ace preview-recognized or Fan Hopeful prospect-safe highlighted context.
- Attachment: Fan Favorite or Cornerstone traded, sent down, retained, or performs in a fan-relevant moment.
- Relief/frustration: Albatross moved, benched, or fails in high-leverage context.
- Amplification: Captain-related morale effects only when hidden-charisma policy is approved.

## Blocked Until Trusted

- Durable designation locking/carryover if the designation state itself is not trusted.
- True Value/value-delta finalization for Fan Favorite and Albatross.
- Random-event Fan Favorite/Albatross morale prompts from preview-only readiness rows.
- Hidden Captain charisma/leadership effects.
- Relationship mutation.
- Salary/free-agency/Mode 3/offseason effects.
- Automatic player-profile edits or designation persistence.
- Unrevealed FARM hidden-truth evidence.

## Relationship To Expected Wins

Dynamic designations are morale context, not expected-wins inputs.

- Expected wins should remain based on roster True Value once that path is trusted.
- Fan Favorite/Albatross should describe surplus/deficit contract sentiment and roster-move reaction.
- Preview-only Fan Favorite/Albatross readiness rows are inspection context only; they are not random-event prompt authority.
- Overperforming a contract should generally raise fan sentiment through Fan Favorite/value-delta prompts, not raise the baseline expectation so sharply that success becomes disappointment.

## Audit Targets

- MVP/Ace recognition produces player morale prompt candidates only.
- Fan Favorite trade/send-down produces negative fan/player morale prompt candidates.
- Albatross move produces fan/player morale relief prompt candidates.
- Cornerstone move produces stronger negative fan/player morale prompt candidates.
- Captain and hidden prospect effects remain blocked when hidden truth is required.
- No salary, relationship, profile, True Value, designation persistence, or Mode 3 mutation is introduced.
