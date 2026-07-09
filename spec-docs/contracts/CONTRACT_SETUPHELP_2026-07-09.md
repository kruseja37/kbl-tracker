=== BINDING SPEC (from spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md §4) ===

Context: JK ruling — on the Draft Setup page, every explanatory text not tied to a user-manipulable control hides behind the Help button. A 2026-07-08 TEXTLAW sweep already gated the older surface (verified intact); ~1,400 lines of newer pool work added two RAW ENGINE DIAGNOSTIC dumps that render unconditionally to users.

File: src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx (+ its 5 split test files).

1. Move BOTH diagnostic dump lines behind the existing showHelp gate, byte-identical strings (they are tuning-valuable for JK/agents; GMs shouldn't see them):
   - `Production shape: Balanced · demand N · target N · actual N · slack …· nonce N · G1 +N · swaps N` — built at ~3766-3799 (numericShapeDiagnostics), rendered ~4770
   - `Manual pool: Balanced · actual N · … · hard overflow N · nonce N` — built at ~3801-3840 (manualShapeDiagnostics), rendered ~4771
   Use the page's established Help pattern: state `showHelp` at ~1467, toggle button ~4022-4029 (the "?" PressButton), and the established inline-gate variant `{showHelp ? … : null}` (as at ~3673, ~3845). Do NOT invent a new pattern, do NOT create a second toggle.

2. `Sized to {N} ({X}×): trimmed …, added … for affordability.` STAYS VISIBLE (it's a receipt of a user action — STATUS class). Do not gate it.

3. `{N} player(s) engine-generated to help fill the roster demand.` STAYS VISIBLE (live count).

4. NOTHING ELSE changes. The readiness panel, club check, tax watch, all control labels, and all previously-gated help notes stay exactly as they are.

Test migration (exact pins known from a 2026-07-09 inventory; re-locate by content if line numbers drifted):
- Assertions on `Production shape: Balanced` + substrings (`demand 88`, `target 110`, `actual 118`, `source Team roster priority`) at src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx ~343-349 and ~438 → must now click Help first (mirror the established pattern at LeagueBuilderDraftSetup.money.test.tsx ~273-306: `fireEvent.click(screen.getByRole("button", { name: "?" }))`, assert absent before / present after where practical).
- Assertions on `Manual pool: Balanced` + `legal no` at poolLock.test.tsx ~978-980 → same migration.
- The `Sized to` pins (money.test.tsx ~728, 750; poolLock.test.tsx ~240, 342, 393) DO NOT move — that string stays visible.
- Assertions move, never weaken: exact strings stay exact, no .skip, no regex widening.

=== END SPEC ===

=== BUILD REPORT (2026-07-09) ===

Branch: setuphelp/gate-pool-diagnostics-2026-07-09 (off main @ a4f61106)
Commits:
- 9ee60dcf — contract commit (this file, alone)
- b21d4b90 — the change + test migration

Disposition: BUILT AS SPECIFIED. Both diagnostic dumps now gate behind the
existing `showHelp` state using the established inline-gate variant, at the
single render site (src/src_figma/app/pages/LeagueBuilderDraftSetup.tsx
~4770-4774):

    {showHelp ? numericShapeDiagnostics : null}
    {showHelp ? manualShapeDiagnostics : null}

No new toggle, no new pattern. `sizingSummaryLine` ("Sized to ...") and the
engine-generated-count receipt were left untouched — confirmed still
unconditional. Repo-wide grep confirmed the two diagnostic strings/consts
have exactly one build site and one render site each, and appear in exactly
one test file (poolLock.test.tsx) — no stray references elsewhere.

Test migration: 3 assertions in
src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx now
click Help (`fireEvent.click(screen.getByRole("button", { name: "?" }))`)
before reading the gated strings, mirroring money.test.tsx's established
pattern. Two of the three migrations also added a `queryByText(...)
.not.toBeInTheDocument()` assertion proving the string is absent before Help
is opened — strictly stronger than the prior test, not weaker. No .skip, no
regex widening, no string changes. The "Sized to" pins were left untouched
(confirmed unaffected — that content stays visible without opening Help).

GATE RESULTS:
- `npx tsc -b` — clean, exit 0, no output.
- `npm run build` — exit 0 (Vite build succeeded; only the pre-existing
  >500kB chunk-size advisory warnings, unrelated to this change).
- Targeted run, all 6 LeagueBuilderDraftSetup split suites (setup, money,
  poolLock, universe, board, RankYourBoardZone): 6 files passed, 105/105
  tests passed, including the 3 migrated assertions and the untouched
  "manual pool diagnostics report illegal completion" test.
- Full suite (`NODE_ENV= npx vitest run`): 614 test files passed, 7 skipped
  (621 total) · 9451 tests passed, 11 skipped (9462 total) · 0 failed ·
  205.63s. The two suites CLAUDE.md flags as solo-green batch flakes
  (`LeagueBuilderDraftSetup*` and `franchiseManualSmokeFixture`) both passed
  clean inside this same full batch run — no new red anywhere.

STOP items: none. No scope deviation, no unresolved questions.
