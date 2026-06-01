# Franchise Mode 2 Player Profile Edit Checkpoint

## Date / Branch / Latest Commit

- Date: 2026-06-01
- Branch: `codex/franchise-v1-next`
- Latest commit at checkpoint: `e93b016 Add franchise player profile manual edits`
- Recent related commits:
  - `e93b016 Add franchise player profile manual edits`
  - `cf203f2 Add read-only franchise player profiles`
  - `37c59ba Surface franchise value truth labels`

## Scope Completed

- Team Hub opens franchise-owned player profiles from MLB roster rows.
- Team Hub opens hidden-safe FARM prospect profiles from FARM cards.
- Manual profile edits save through the franchise-owned player path.
- Edit save refetches the current franchise player before applying changed fields.
- MLB/revealed profile edits support visible baseball identity, ratings, arsenal, traits, personality, chemistry, and validated grade fields.
- Secondary position can be cleared.
- Unrevealed FARM profile edits are limited to visible identity fields.
- Hidden FARM ratings, true grade, hidden modifiers, and hidden scout truth remain unavailable until call-up/reveal.
- Franchise player saves mark optimal lineup snapshots stale when player fields relevant to lineup/rotation/GameTracker launch change, including pitcher-relevant fields.

## Manual Smoke Confirmed

- Opened MLB player profiles from Team Hub.
- Edited MLB/revealed player profile fields.
- Cleared secondary position.
- Opened unrevealed FARM profiles.
- Confirmed hidden FARM ratings, true grade, and hidden modifiers stayed hidden.
- Edited limited FARM visible identity fields.
- Confirmed call-up/reveal continuity.
- Confirmed full-detail profile after call-up.
- Confirmed GameTracker launch used updated franchise-owned player data.

## Automated Verification

- `git status --short --branch`
  - Initial state before creating this checkpoint doc: clean on `codex/franchise-v1-next`.
- `git log --oneline -8`
  - Confirmed latest profile/edit commits are present, with `e93b016` at HEAD.
- `git diff --check`
  - Passed before doc creation.
- `npm test -- src/utils/tests/franchisePlayerProfileEdit.test.ts src/utils/tests/franchisePlayerProfile.test.ts src/src_figma/__tests__/franchiseMode/TeamHubContent.franchiseReads.test.tsx --reporter=dot`
  - Passed: 3 files, 29 tests.
- `npm test -- src/utils/tests/franchiseRosterMovement.test.ts src/src_figma/__tests__/franchiseMode/franchiseGameTrackerRoster.test.ts src/src_figma/__tests__/franchiseMode/FranchiseHomeLaunch.test.tsx --reporter=dot`
  - Passed: 3 files, 40 tests.
  - Known warning noise: React `act(...)` warnings in FranchiseHome launch tests and one intentional mocked roster-build failure log.
- `npm run build`
  - Passed.
  - Known warning noise: Vite large chunk warning.

## Known Deferred Items

- Franchise-scoped manual edit transaction/event.
- Broad franchise player directory for free agents and traded-away players.
- Salary/contract editing.
- Morale/relationship editing.
- Hidden prospect truth editing before reveal.
- True Value, designation, and salary recalculation.
- Formal player history/almanac drilldown polish.

## Recommended Next Slice

Add a narrow franchise player history/reporting slice: persist or project a non-transactional manual edit event stream for player profile edits, then surface it in the player profile/history view without mixing it into the official trade/call-up/send-down transaction desk.
