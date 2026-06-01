# Franchise Mode 2 Value / Designation / Salary Audit

Date: 2026-05-31

Purpose: preserve the repo-first audit of the Mode 2 value, dynamic designation, salary, WAR/WPA, and park-factor spine before implementation. This document is audit/status only. It does not implement code, lock scope, or promote unproven systems into v1.

## Findings

### High: Dynamic designations are not a real Mode 2 product path yet

The utility supports only `TEAM_MVP`, `ACE`, `FAN_FAVORITE`, and `ALBATROSS`, with `projected`/`locked` status fields. No product caller was found that calculates and persists them from current franchise season data.

The only runtime integration found is trade remapping existing designation records by player/team.

Missing or intentionally absent:
- Captain
- Fan Hopeful
- Cornerstone
- Notifications
- Carryover lifecycle
- Full projected/locked designation lifecycle

Implication: do not build a designation UI or claim designation completion until there is a canonical calculation/persistence path.

### High: WAR is not trustworthy enough yet as the value/designation spine

Team Hub displays `WAR`, `pWAR`, `bWAR`, `rWAR`, and `fWAR`, but current WAR appears mostly computed on read from season stat rows. A dedicated `calculateAndPersistSeasonWAR` orchestrator exists but no product caller was found.

Risk: season scaling can diverge because manual-schedule franchise metadata may initialize schedule row count as `0`, while the intended season length lives in stored `gamesPerTeam` / innings metadata.

Implication: WAR should not feed v1 designations, awards, salary value, or final claims until season length/innings/adaptive context is proven.

### High: Salary initialization is stable but only a baseline

Franchise copy recalculates salary using the salary engine. The ratings/salary adapter explicitly defers True Value/performance salary adjustments until value inputs are complete.

Current gaps:
- No canonical season-performance salary/value pass
- No trusted True Value/value-delta spine
- No proven value input from WAR/WPA/park context

Implication: salary baseline can remain v1, but salary-derived value/designation systems need a separate proof pass.

### Medium: Park factors are preserved but not consumed by the active value spine

Mode 1 to Mode 2 copies `stadiumId` and seed `parkFactors`, and bWAR can accept park factors if passed. The audit did not find Team Hub/value/designation paths passing team/stadium park context into WAR, salary, True Value, or designations.

Custom, dynamic, and blended park factors appear correctly guarded/deferred.

Implication: park identity is v1-safe as metadata; park-adjusted value/WAR/designation claims are not yet safe.

### Medium: UI truth is mixed

FranchiseHome regular-season leaders now defer awards/voting clearly, and Team Hub gates True Value/value-delta. However, SeasonSummary can still auto-calculate MVP/Cy Young/Gold Glove-style sections from WAR when no persisted summary exists.

Implication: SeasonSummary needs a reporting-truth pass so it does not imply v1-ready awards/WAR confidence.

## Confirmed Good

- Mode 1 handoff persists salary baseline, rules, season length metadata, stadium snapshots, and schedule policy into stored franchise config.
- No Franchise v1 luxury tax or salary-matching execution appears to leak into the canonical manual transaction adapter.
- WPA and Manager Value are better separated and labeled than WAR/designations.
- Player WPA and Manager Value have stronger game/archive/display/test support than the broader WAR/designation spine.

## Implementation Matrix

| Subsystem | Implemented | Persisted | Displayed | Tested | v1 confidence |
|---|---:|---:|---:|---:|---|
| Team MVP / Ace utility | Yes | Only if utility called | No clear surface | Yes | Low as product |
| Fan Favorite / Albatross utility | Yes | Only if utility called | No clear surface | Yes | Low; needs True Value |
| Projected/locked status | Utility only | Possible on player record | Not surfaced | Partial | Low |
| Carryover | No | No | No | No | Not ready |
| Salary baseline | Yes | Yes | Contract/payroll surfaces | Yes | Medium-high |
| True Value/value delta | Engine exists | Not franchise spine | Gated/deferred | Engine tests only | Low |
| WAR components | Engines plus read-time hooks | Counting stats yes; WAR mixed/read-time | Team Hub/summary | Broad engine tests | Medium-low |
| WPA/Manager Value | Yes | Yes via game/archive paths | Game Detail/Almanac/leaders | Strong | High |
| Park seed identity | Yes | Yes | Read-only/deferred | Yes | Medium |
| Park-adjusted value/WAR | Engine capability only | No v1 path | No | Limited | Low |

## Recommended V1 Scope

Keep the visible v1 surface small:

- Read-only salary/contract and payroll baseline proof.
- WPA and Manager Value leaderboards where already stable.
- WAR preview/leaderboards only if season scaling is fixed and labels are clear.
- No formal dynamic designation product path until canonical value inputs are proven.
- If designations must appear before the full spine, limit to a clearly labeled preview of Projected Team MVP / Ace from stable current-season stats.
- Defer Fan Favorite and Albatross until True Value/value delta is canonical.

## Recommended Implementation Order

1. **Canonical value-input proof.**
   - Derive stable player value rows with season stats, salary, WAR/WPA inputs, roster status, team context, season length, innings, and park-adjustment flags.
   - Read from stored franchise config/season metadata rather than manual schedule row count alone.
   - Do not calculate final designations yet.

2. **WAR/adaptive hardening.**
   - Make `gamesPerTeam` and innings metadata drive WAR/adaptive context for manual-schedule franchises.
   - Clearly mark whether outputs are adjusted or unadjusted.

3. **UI truth guard.**
   - Gate or relabel SeasonSummary auto-award sections as stat leaders, not awards.
   - Keep Team Hub True Value/value-delta hidden unless canonical rows exist.

4. **True Value slice.**
   - Compute and persist position-relative True Value/value delta from canonical salary plus approved value inputs.

5. **Designation slice.**
   - Calculate/persist projected MVP/Ace/Fan Favorite/Albatross from canonical inputs.
   - Add explicit lock timing, trade continuity, and carryover rules.

## Tests To Add Before Or During Implementation

- Franchise creation stores salary baseline/stadium/rules/season-length metadata and value code reads those fields.
- WAR calculations use stored `gamesPerTeam` and innings metadata for a manual-schedule franchise, including zero-schedule startup.
- Park factors are either explicitly not applied and labeled unadjusted, or applied with seed identity proof.
- True Value/value delta is absent from UI until computed from canonical rows.
- Designation calculation persists only approved types and never invents Captain/Fan Hopeful.
- Trade/call-up/send-down preserve player identity history and either preserve or intentionally invalidate current projected designations.
- SeasonSummary does not present unfinalized awards as completed awards in internal v1.

## Next Slice Recommendation

The next implementation slice should be narrow:

**Mode 2 canonical value-input contract plus UI truth guard.**

This should produce a read-only value input layer and prevent misleading UI claims. It should not implement final True Value, dynamic designations, formal awards, morale, relationships, or Mode 3 execution.

