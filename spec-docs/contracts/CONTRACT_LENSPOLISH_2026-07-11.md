# CONTRACT LENSPOLISH-1 — the Lens clubhouse density pass + the transcription cockpit redesign
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable (UI authority — these are DESIGN DECISIONS, implement not re-derive)
Worktree: /Users/johnkruse/Projects/kbl-lenspolish (branch codex/lens-polish, cut from origin/main).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait; execute to completion.

## Why (captain's own browser review, seeded played season, 2026-07-11)
The takeover worklist is the screen JK will spend HOURS in (transcribing changes into SMB4), and
it currently renders every proposal fully expanded: 37 proposals mounted 74 `<select>`s × 73
options (~5,400 DOM nodes — the modal measurably hangs scrolling), ~135 buttons, no visual
hierarchy between confirm/adjust/reject, a from→to line crushed into a ~90px column, players
sorted lexicographically (Batter1, Batter10, Batter11...), and the clubhouse card says
"20 player changes" while the modal says "0 of 37". The clubhouse landing tab leaves the right
half of the viewport empty and renders ZERO Big Moments after a fully played season.

## D1. The transcription cockpit (takeover modal — the redesign)
1. **Row model:** one COMPACT row per proposal. Group by TEAM → then PLAYER (player header:
   name + position chip); NATURAL/numeric name sort (Batter2 before Batter10) — transcription
   follows SMB4 roster order.
2. **Progressive disclosure (kills the wall AND the DOM bomb):** collapsed row =
   `[kind icon] [change summary: "no traits → Cannon Arm" / "CON 79 → 78 (−1)"] [✓ ENTERED]
   [ADJUST] [REJECT]`. ADJUST/REJECT are quiet text-buttons that EXPAND the row inline; the
   slot dropdowns / numeric input / reason field MOUNT ONLY on expansion. At most one row
   expanded at a time.
3. **Visual hierarchy:** ✓ ENTERED is the one prominent (filled) button per row; adjust=quiet;
   reject=quiet-destructive. A confirmed row collapses to a slim receipt line (green check +
   summary) and the focus advances to the next unresolved row.
4. **Keyboard rhythm:** Enter confirms the focused row and advances; Tab cycles rows; the
   progress bar counts up live. (Test: 3 proposals confirmed with 3 Enter presses.)
5. **Sticky footer:** progress ("N remaining") + MARK ALL ENTERED (existing sequential
   semantics + stop-on-conflict UNCHANGED — service calls byte-identical, this is presentation).
6. **Copy truth:** the clubhouse card and the modal use one unit — "37 changes across 20
   players" both places (derive both counts from the same selector).
7. **Modal eyebrow** = "CHECKPOINT 4 OF 5 — GAME 24" (identity, not drama). The red
   "THE LEAGUE JUST SHIFTED" banner moves to (stays on) the clubhouse card only.
8. Works identically for RATING proposals (numeric from→to→delta, adjust = numeric input) and
   TRAIT proposals (slot semantics unchanged) — the seeded fixture surfaced an all-trait
   checkpoint; test both kinds explicitly.

## D2. Clubhouse density (the dead right half)
≥1200px: two columns. LEFT = NEEDS YOU NOW (unchanged cards). RIGHT = THE SEASON'S BIG MOMENTS
feed (moved up from the bottom) + a compact NEXT GAME strip (opponent, park, civil date — data
already in useFranchiseData). <1200px stacks as today. Tab bar: ONE row, horizontal scroll on
overflow, consistent casing/emphasis (no orphan second row, no half-dimmed tabs).

## D3. Big Moments truth (investigate BEFORE styling)
After a full played season the feed rendered ONLY the "🔔 Checkpoint" filter chip and zero
moments. Determine why from source: if moment rows EXIST in stores (fame events / milestones /
checkpoints from the played season) but the feed's query/filter drops them → that is a WIRING
BUG, fix it (display-side only; if the fix needs a storage/engine change, STOP that sub-item
with evidence). If the stores are genuinely empty for this fixture, render an honest, styled
empty state ("Big moments land here as the season breathes — none yet.") — never a bare chip.
Report which case it was with file:line evidence.

## D4. Accessibility
Every card-button gets an aria-label (the three NEEDS-YOU-NOW cards are currently NAMELESS
buttons). Add a test asserting no unnamed interactive elements on the clubhouse tab and in the
takeover modal.

## FENCE
Lens/hub/takeover component files under `src/src_figma/app/components/franchise/` +
`FranchiseLens.tsx`/hub + `useFranchiseLensData.ts`/`useFranchiseData.ts` (display-side only)
+ tests. Do NOT touch: `franchiseConsoleMirror.ts` or ANY service/storage/engine,
`processCompletedGame`, `App.tsx` (a concurrent lane owns it), GameTracker, flags. UI language:
ballpark-kit premium-retro is SET — extend, don't invent. MEMORY NOTE: franchise hub copy is
TEST-CHARACTERIZED (D11) — every copy-test you must update gets a one-line justification;
unlisted assertion edits are an audit failure.

## VERIFICATION (paste all)
1. Build exit 0. 2. Focused: all touched component test files + the new a11y + keyboard-rhythm
+ both-kinds proofs. 3. DOM perf proof: with a 37-proposal fixture, mounted `<select>` count in
the collapsed modal === 0 (was 74). 4. FULL vitest summary (characterized-flake protocol;
solo-verify any red, base-verify vs CURRENT origin/main by SHA). 5. Changed-files list.
6. OPTIONAL browser pre-check via the seed route (`/__preview/franchise-lens-seed-played`),
screenshots before/after — reported, not gate-closing.

FORMAT: files → D1-D4 → verification → "LENSPOLISH-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: D3 needs a non-display change → STOP that item with evidence; a D11 copy test
resists justification → STOP that string; items separable.

Use xhigh reasoning effort. Think step-by-step.

---
## AMENDMENT 1 (JK ruling, mid-build — apply before finishing) — the help-button law
JK ruling 2026-07-11: explanatory/instructional text in product UI goes BEHIND the screen's `?`
Help affordance (the Lens already has one, bottom-right) — inline copy is limited to labels,
values, states, and one-line action consequences. Apply to everything you're building:
- The worklist sub-header ("Record what SMB4 actually accepted. Every proposal gets its own
  durable receipt.") moves into Help content; the modal keeps only the checkpoint identity
  eyebrow + progress.
- Sweep BOTH surfaces you touch (clubhouse tab + takeover) for existing inline explainer
  sentences and relocate them into the Help affordance's content (extend it if it's static),
  each listed in your report. Labels/values/empty-states stay (the Big Moments empty-state
  one-liner is a STATE, it stays).
- Add one test: the takeover modal's visible text contains no sentence longer than 60 characters
  that isn't a proposal summary, player/team name, or action label (a blunt but effective
  tripwire — tune the allowlist as needed and justify).
