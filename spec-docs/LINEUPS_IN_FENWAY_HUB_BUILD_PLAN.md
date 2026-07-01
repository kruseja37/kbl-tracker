# Build plan — Lineups feature in the Fenway franchise-lens hub

> Branch `claude/lineups-fenway-hub` (worktree `/Users/johnkruse/Projects/kbl-lineups-fenway`) =
> trunk `experiment/manager-wpa-window` (engine + my legacy Lineups tab) merged into the Stream-A
> Fenway hub (`codex/auction-draft-ux-rehaul`). Merge was conflict-free. JK 2026-06-26: "build it the
> right way in the new hub, I'll review the finished thing, no back-and-forth."

## Architecture decision
The Fenway hub (`FranchiseLensHub.tsx`) is a PURE VIEW fed `{teams, active, hub}` view-models. It does
NOT carry raw `Team[]`/`Player[]`, and the Lineups feature is INTERACTIVE (accept/adjust/reorder/mojo/
save to storage). So the Lineups surface is a SMART component that loads its own raw data + runs the
engine, styled with `--fen-*` tokens.

**Reuse the theme-agnostic logic; rebuild only the presentation:**
- Reuse as-is: the engine seam `franchiseNextGameLineup.ts`, the optimizer, and the pure domain util
  `franchiseLineupDomain.ts` (constants, 4-man cap, no-DH helpers, mappers).
- Extract two shared hooks (move logic out of the legacy components into their lasting home):
  - `useFranchiseLineupRotationEditor` — editor state + handlers + derived (bench/bullpen/validation/save).
  - `useFranchiseNextGameLineupAdvisor` — data load + opponent resolution + seam + accept + mojo.
- Two thin presentations over the hooks: the existing legacy ones (retired at swap) + new fen-styled ones.

## Steps
1. **Extract `useFranchiseLineupRotationEditor`** from `FranchiseLineupRotationEditor.tsx`; refactor the
   legacy editor to a thin presentation over it. Verify: tsc + the `TeamHubContent.franchiseReads` tests.
2. **Extract `useFranchiseNextGameLineupAdvisor`** from `LineupsTabContent.tsx`; refactor the legacy tab
   to a thin presentation. Verify: tsc.
3. **Thread `franchiseId`/`seasonNumber`/`leagueId`** into `FranchiseLensHub` (the adapter + live preview
   have them; add to the bundle or as hub props).
4. **Build the Fenway `LineupsTab`** in `FranchiseLensHub.tsx`: uses both hooks + a fen-styled editor;
   shows tonight's matchup (opponent + their next SP), the optimal lineup vs that SP, accept, 4-man
   rotation, bench/bullpen, mojo. Add `"Lineups"` to `TABS` + the content switch.
5. **Verify**: tsc 0, build 0, the full franchiseMode + seam suites green, render the live hub.

## Corrections already locked (JK 2026-06-26) — carry into the fen surface
4-man rotation (cap), bench + bullpen visible with swap, NO DH (config-sealed). Fitness not modeled.

## NOT in scope this pass
5c pregame collapse (separate JK design fork — modal picks both teams' starters). The live-swap of the
`/franchise` route to the Fenway hub (still gated).
