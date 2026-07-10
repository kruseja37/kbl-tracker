# CONTRACT — SNAKEFIX: the POC's solvency reserve is wrong (2026-07-10)

**Builder:** Codex (xhigh). **Auditor:** independent opus. **Captain:** Fable.
**Branch:** codex/snake-poc-salary-fix. Base: current main (post PR #59).
**Git discipline:** no git write commands; captain cuts commits; APPEND report here.
UNKNOWN = STOP-and-report.

## JK's field report (screenshot evidence, first minutes of a real POC draft)
2-team league (California Angels, Houston Astros), PICK 1 ROUND 1, both clubs $0 spent /
$1,064,387 headroom / 0 of 22 players / pool 1,166 available. EVERY candidate card shows NO
ROOM: "This pick leaves the club $288,421 short after saving enough to finish the 22"
(Nolan Ryan, TRUE COST $184,356); Fenomeno (SP/RP two-way, IV $124,165) shows "$3,288,589
short" AND a TRUE COST of $214,149 — i.e. ~$90k marginal tax ON AN EMPTY ROSTER. The draft is
unplayable from lot one.

## The three defects to find and fix (repro-first, each)
1. **The completion reserve is absurd.** Back-math: blocking Ryan at $184,356 with $1,064,387
   headroom implies a reserve of ~$1.17M for 21 remaining seats (~$55.6k/seat). The ruled
   semantics (TRADITIONAL_DRAFT_PROGRAM §3 + the POC contract item 4): the reserve is the
   CHEAPEST legal completion — minimum-IV players satisfying LEGAL_ROSTER position needs from
   the actual remaining pool (1,166 players — cheap bodies abound) — plus that completion's
   INCREMENTAL tax under the CORRECT league-size-scaled caps. Find what the POC's
   evaluateSnakePick/solvency path actually reserves (likely mean-priced or top-priced fills,
   or a per-slot constant, or tax with unscaled caps) and fix to the ruled semantics. Repro:
   a 2-team fixture, empty rosters, deep cheap pool → the top player MUST be draftable at
   pick 1; pin the reserve to cheapest-fills + incremental tax within tight bounds.
2. **Tax on an empty roster.** Fenomeno's $90k marginal tax as the FIRST player is suspect on
   two axes: (a) caps must be the league-size-normalized ones (2 teams → (20/2)^0.55 ≈ 3.55×
   relaxation — verify the snake path routes through normalizeAuctionLuxuryCapsForLeagueSize
   with the REAL club count, not a default-20 or shill-inflated count); (b) two-way players
   may be double-counted across batter AND pitcher cap rows — check how the auction path
   handles two-way cap membership and make the snake path identical. Repro: empty-roster
   marginal tax for a two-way and a pure pitcher in a 2-team fixture, pinned to the
   auction-path-equivalent values.
3. **Cosmetic:** the cap-ledger header renders "TAX SO" / "AR" overlapping ("TAX SO FAR"
   column collides with the HEADROOM value). Fix the layout so the three figures read cleanly.

## Non-goals
No auction-path changes (the normalize function and auctionMarginalTaxWithCaps are shared —
consume them correctly, do not modify them; if a shared function IS the bug, STOP-and-report).
No design changes beyond the fix. TRUE COST/STEAL semantics unchanged.

## Gates
tsc; build; the POC suites + a NEW end-to-end sanity: a scripted 2-team draft from the real
production pool shape completes all 44 picks with picks legal at every step; ONE full vitest
(known solo flakes list applies). APPEND report: root causes with file:line, repro red proof,
the reserve decomposition before/after for the Ryan case, gate outputs.

---

## BUILDER REPORT — SNAKEFIX (2026-07-10)

**Result:** implementation complete; all SNAKEFIX/focused/build gates green. The required single
full-suite run had one unrelated Draft Setup batch-pressure timeout; that complete split suite
passed solo 21/21. No second full-suite run was made. Independent opus audit and JK browser feel
check remain outside the builder role.

### Root causes and fixes

1. **The reserve was legal-player-correct but tax-basis-wrong.** `evaluateSnakePick` already called
   `cheapestLegalCompletion`, and the screenshot-shaped production fixture proves those 21 legal
   bodies cost only **$336,000**. The apparent ~$1.17M reserve came from adding **$832,452.25 of
   completion tax computed against the unscaled stock 20-team caps**. The engine input accepted an
   already-shifted cap array, so it had no real-team count and could not enforce the auction's
   small-league normalization. Fix: the gate now accepts base caps + cap identity + real club count,
   calls `normalizeAuctionLuxuryCapsForLeagueSize`, then applies the identity shift
   (`src/engines/snakeDraftPoc.ts:106-146`). The reserve is now explicitly decomposed as cheapest
   legal-completion salaries plus only the completion's incremental tax
   (`src/engines/snakeDraftPoc.ts:151-175`).
2. **Every visible snake tax caller also skipped small-league normalization.** The board's TRUE
   COST, resumed ledger fallback, and pick gate all consumed `pool.luxuryCaps` directly. They now
   normalize with `leagueTeams.length` before calling the unchanged shared auction marginal-tax
   helper (`src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx:187-213,227-304,404-447`). The
   shared auction functions and auction page/hook were not modified. The existing construction
   mapping handles Fenomeno identically on both paths; there was no separate snake-only two-way
   membership bug. The $89,984 first-pick charge came entirely from the missing 2-team cap scaling.
3. **The ledger allocated too-narrow cards and allowed labels/values to wrap.** The outer grid no
   longer forces four narrow columns at XL; all three labels and monetary values are now no-wrap,
   tabular figures (`src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx:892-912`).

### Repro-first red proof

Before product edits, the new focused run failed **4 tests**:

- Ryan production-shape repro: `confirmable: false`; repository-fixture IV $136,784,
  completion salaries $336,000, headroom **-$240,849.25**. Holding the same completion/tax and
  substituting JK's screenshot IV $184,356 yields **-$288,421.25**, matching the live report.
- Fenomeno empty-roster marginal tax: snake **$89,984.05** vs normalized auction **$0**.
- Scripted 1,166-player, two-team draft: no selectable player at pick 1.
- Ledger regression: `TAX SO FAR` lacked `whitespace-nowrap`.

The permanent tests live at `src/engines/__tests__/snakeDraftPoc.test.ts:174-309` and
`src/src_figma/__tests__/pages/LeagueBuilderSnakeDraft.test.tsx:207-250`.

### Ryan reserve decomposition — screenshot case

| Component | Before | After |
|---|---:|---:|
| Candidate IV | $184,356 | $184,356 |
| Cheapest legal 21-player completion salaries | $336,000 | $336,000 |
| Completion incremental tax | $832,452.25 (wrong 20-team basis) | $0 (correct 2-team basis) |
| Total completion reserve | $1,168,452.25 | $336,000 |
| Headroom after candidate + legal finish | -$288,421.25 | **$544,031** |
| Pick result | NO ROOM | **draftable** |

The green test pins 1,166 production players, 21 completion picks, the exact $336,000 salary
reserve, $0 completion tax, and $544,031 headroom.

### Gate outputs

- Repro red: 2 files, **4 failed / 10 passed** before the fix.
- POC + activation gate: 3 files, **20/20 passed**.
- New production sanity: full **44/44** picks completed; both clubs finished legal 22-player
  rosters from the real 1,166-player production universe.
- `NODE_ENV= npx tsc -b --pretty false`: **exit 0**, clean output.
- `NODE_ENV= npm run build`: **exit 0**; 2,650 modules transformed; PWA generated. Existing
  Browserslist, mixed import, and chunk-size warnings only.
- `git diff --check`: **exit 0**.
- Required one full Vitest: **620 files passed / 1 failed / 8 skipped; 9,545 tests passed / 1
  failed / 15 skipped**. Sole red: `LeagueBuilderDraftSetup.poolLock.test.tsx > manual exclusion
  does not beat a roster-design pin during regeneration`, timing out while waiting for a pool
  option. That file is outside the changed surface.
- Exact classification rerun of the failed split suite: **1 file, 21/21 passed**. This disproves a
  deterministic SNAKEFIX regression; no second full run was made.

### Changed paths

Five paths are left modified for the captain:

1. `src/engines/snakeDraftPoc.ts`
2. `src/engines/__tests__/snakeDraftPoc.test.ts`
3. `src/src_figma/app/pages/LeagueBuilderSnakeDraft.tsx`
4. `src/src_figma/__tests__/pages/LeagueBuilderSnakeDraft.test.tsx`
5. `spec-docs/contracts/CONTRACT_SNAKEFIX_2026-07-10.md` (this appended report)

Pre-existing untracked `dispatch-prompt.txt` was not read, changed, or included. No git write
command was run.
