# CONTRACT — COMPANIONAUTH (2026-07-12)

**Lane:** codex/companion-auth · base `beaad38f` (current github/main)
**Builder:** Codex 5.6-sol, xhigh. **Auditor:** opus (independent). **Captain cuts all commits — the builder runs NO git write commands.**

CONFIRMED — this contract IS the captain confirmation the session-start ritual requires. Do not
re-run the ritual; do not wait for further confirmation. Work only in /private/tmp/kbl-companion.

## The defect (JK's real phone, 2026-07-11 — code-grounded)

`/snake-companion` on a second device cannot join a draft. Root cause chain (verified):

1. `src/src_figma/app/pages/SnakeCompanion.tsx` renders `CompanionClaimScreen` with NO sign-in
   path anywhere on the page. There is no `useAuth` usage, no login form, no auth state shown.
2. All companion data flows through `useLeagueBuilderData` (local IndexedDB) + `syncEngine.pull()`
   (`SnakeCompanion.tsx:88`). `src/utils/syncEngine.ts:453-459` — `pull()` reads
   `client.auth.getSession()` and pulls ONLY for `session.user.id`. On an unauthenticated device
   this silently no-ops.
3. Therefore a fresh phone has empty local leagues, `claimDesk` (`SnakeCompanion.tsx:106-119`)
   iterates zero/stale leagues and every code lands on `'THAT ROOM CODE DOES NOT MATCH.'` — with
   no hint that sign-in is the missing step.

The main device DOES push: storage modules broadly queue writes into `syncEngine` (recordWrite →
pushQueue), so once the phone is authenticated to the SAME account, pull → claim → push round-trip
is expected to work. The one missing product surface is companion sign-in.

## The fix (scope — exactly this, no more)

1. **Sign-in gate on `/snake-companion`.** When `useAuth().isAuthenticated` is false, render a
   sign-in screen (email + password + submit, matching the `LoginForm` in
   `src/src_figma/app/components/SyncModal.tsx:69`) BEFORE the claim screen. Fail closed: no claim
   UI until authenticated. Preferred shape: extract `LoginForm` from `SyncModal.tsx` into a shared
   component file consumed by BOTH SyncModal and the companion page — SyncModal's rendered
   behavior must stay byte-identical (its tests, if any, are the firewall).
2. **Post-sign-in flow:** after successful sign-in, run `syncEngine.pull()` and then enter the
   existing claim flow. While the first pull is in flight, show a state line (e.g. `PULLING YOUR
   LEAGUES…`) so the phone is never a dead mystery.
3. **Honest empty state:** when authenticated and pull complete but no league has an open snake
   room, the claim screen's failure copy must distinguish "no room found on this account" from
   "code does not match". One-line state copy only.
4. **Signed-in indicator + sign-out** on the claim screen (small, one line: account email + a
   SIGN OUT control) so JK can tell which account the phone is on.
5. **Help-button law (RATIFIED, non-negotiable — SESSION_RULES "Help-Button UI Law"):** NO inline
   explainer sentences. If the claim/sign-in screen needs instructions (e.g. "sign in with the
   same account as the main device, join over the same Wi-Fi"), that content goes behind a `?`
   Help affordance matching the Lens pattern. Inline copy = labels, values, states, one-line
   action consequences only. While you are in the companion tree, ALSO relocate any EXISTING
   inline explainer sentences on the companion screens behind the same `?` Help affordance, and
   list every relocated string in your builder report.

## Constraints

- Files owned: `src/src_figma/app/pages/SnakeCompanion.tsx`,
  `src/src_figma/app/components/snake/companion/**`, the extracted shared LoginForm file (new),
  `src/src_figma/app/components/SyncModal.tsx` (extraction only — zero behavior change), plus
  owned tests. NOTHING else. Do not touch `syncEngine.ts` semantics, storage shapes, engines,
  or any non-companion snake surface (a parallel lane owns setup/room/board).
- No new dependencies. No `any` without justification. No git write commands — leave the working
  tree dirty for the captain.
- `useAuth` hook is at `src/hooks/useAuth.ts` (verify path by reading the SyncModal import).

## Proof required (gates — run and paste real output into your report)

1. **Two-origin automated test** (the acceptance centerpiece): a vitest test simulating two
   devices with ISOLATED storage contexts —
   - Device A (main): authenticated (mock supabase session, user U), creates league + snake
     session with room code, writes flow into the push path.
   - Device B (fresh storage, `/snake-companion` mount): unauthenticated → sign-in screen renders,
     claim UI absent; after mocked sign-in as user U + pull → the claim with the correct room code
     SUBMITS; device A sees the pending claim; approval round-trips back to B.
   - Also: device B signed in as a DIFFERENT account → honest "no room on this account" state.
   Mock the supabase client at the seam syncEngine already exposes for tests (read existing
   syncEngine tests first and reuse their harness — do not invent a parallel mock layer).
2. `npx tsc --noEmit` clean; `npm run build` exit 0.
3. Owned suites green: companion tests + any SyncModal/auth tests + your new two-origin test.
4. One full `npx vitest run` at the end. Machine-load flake protocol applies ONLY to the
   pre-existing characterized files (LeagueBuilderDraftSetup family, franchiseManualSmokeFixture,
   franchiseOffseasonGuards, RosterDesigner, EliminationTeamHub): any of ≤3 solo attempts green
   counts. It NEVER applies to your own new tests.

## Report format

Append `## BUILDER REPORT` to THIS file: what changed (file:line), relocated-string list, gate
outputs pasted (real terminal text), uncertainties. Then print the completion marker line
`COMPANIONAUTH-COMPLETE-$(hostname -s)` as the last line of your run.

## STOP rules

Mid-build surprise, missing seam, or any need to touch un-owned files = STOP and report in this
file under `## BUILDER STOP`; do not improvise. An UNKNOWN is a stop, not a guess.
