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
