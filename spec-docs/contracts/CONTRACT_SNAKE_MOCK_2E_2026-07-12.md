# CONTRACT — SNAKE MOCK 2E: IMMUTABLE DRAFT MANIFEST AND FRANCHISE LAUNCH

**Date:** 2026-07-12
**Base checkpoint:** `1ffabbf5`
**Builder/auditor law:** separate agents; JK browser walk is the sole acceptance gate.

## Binding rulings

- Confirmation freezes the completed MLB/farm draft truth before roster commit and launch.
- Recap, roster commit, draft-freeze/morale inputs, and franchise initialization must agree on the same persisted picks, salaries, teams, versions, and locked archetypes.
- Franchise launch requires no schedule. It initializes with zero schedule rows; CSV/manual schedule entry remains inside Living Season.

## Required behavior

1. Add a backward-compatible immutable snake draft manifest per completed session with phase, league/season, frozen timestamp, source session id/revision, workflow/engine versions, seed, locked clubs/archetypes, pick order, completed picks (including explicit unknown legacy money), version state, and pool membership identity needed to validate provenance.
2. Build/validate manifests with pure helpers. Reject incomplete, duplicate-player, wrong-pick, wrong-team, missing-pool, non-finite-money, or phase-mismatched truth. Farm validates frozen absolute slot salary.
3. On CONFIRM MLB/FARM, persist the manifest first. Retry reuses an identical existing valid manifest; never regenerate from later mutable state.
4. Recap reads manifest after freeze and live session before freeze, with identical visible result.
5. Roster commit and draft-freeze/franchise consumers use or validate against the manifest so post-freeze session mutation cannot change launch truth.
6. Preserve idempotent retry: failed roster/launch write stays on recap; retry does not duplicate players, salaries, morale, or manifest.
7. Extend the season gauntlet: MLB confirm -> farm confirm -> staffing -> Franchise Setup -> launch -> Living Season with zero schedule rows -> CSV/manual schedule affordances.
8. No auto-generated test schedule and no schedule prerequisite at any draft/staff/setup/launch gate.

## Tests first

Prove manifest validation failures, byte-stable retry, post-freeze session mutation immunity, recap parity, idempotent commits, complete franchise provenance, and zero-row schedule launch with both schedule entry paths visible. Preserve all existing gates.

## Allowed files

- `src/utils/leagueBuilderStorage.ts`
- a new narrow `src/utils/snakeDraftManifest.ts` plus tests
- snake completion/commit/freeze/initializer adapters and direct tests
- `src/src_figma/app/pages/SnakeDraftRoom.tsx`, `SnakeDraftRecap.tsx`, and direct tests
- season gauntlet / schedule launch tests and execution docs

No auction behavior, tax/chemistry formula, staffing redesign, auto-schedule generation, or unrelated franchise UI change. No commit/push by builder.

## Verification

Focused manifest/completion/gauntlet tests; existing snake/farm/companion/performance/auction; production build; diff-check. End `SNAKE MOCK 2E COMPLETE` or `BLOCKED`.

## Auditor Amendment 1 — immutable-write and source-pool hardening

Independent source review found three remaining fail-closed gaps that must be repaired before 2E can checkpoint:

1. Once a persisted session has a manifest, neither `saveMlbDraftRoomSession` nor the generic session writer may remove or replace it. A stale room write without a manifest must fail loudly; a concurrent/retry confirmation carrying a manifest must reuse the already-persisted byte-identical truth.
2. MLB manifest creation must prove every frozen active-pool id exists with a finite, non-negative IV in the locked RegisteredPool price map. Do not freeze a provenance list that only covers the drafted subset while containing missing source members.
3. Completion detection must not treat an arbitrary/corrupt truthy manifest object as a completed draft; it must validate the session-bound manifest and fail closed.

Add discriminating storage/helper/completion tests, then rerun the 2E focused gate, broad snake/farm/companion/performance/auction gate, TypeScript, production build, and diff-check. No new scope.
