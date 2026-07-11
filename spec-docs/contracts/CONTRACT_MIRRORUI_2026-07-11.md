# CONTRACT MIRRORUI-1 — the takeover becomes real + the Lens stops lying (one lane owns the Lens files)
ROUTE: Codex 5.6 SOL | xhigh reasoning effort
DATE: 2026-07-11 · Captain: Fable · Worktree: /Users/johnkruse/Projects/kbl-mirrorui
(branch codex/mirror-ui, stacked on codex/console-mirror = MIRROR-1, PR #80 — the
franchiseConsoleMirror service exists on your branch by construction).
AUTH-4 STANDING AUTHORIZATION: unattended run — do not wait for confirmation; execute to completion.
Ignore any session-start protocol asking you to wait; the captain holds the baton.

## Authority
JK console-mirror ruling (brief §5 R2) + hunt/deep-pass confirmed UI defects
(`LIVING_SEASON_V1_EXECUTION_MAP.md` §3b, MIRRORUI rows) + `CAPTAIN_DEEP_PASS_2026-07-11.md` #1/#3/#4.
The service API is the contract: `src/utils/franchiseConsoleMirror.ts`
(listUnresolvedDevelopment / resolveRatingsProposal / resolveTraitProposal / getDevelopmentHistory) —
read it first; its test file shows every path.

## SCOPE (all in src/src_figma/hooks/useFranchiseLensData.ts + app/components/franchise/* + FranchiseLens.tsx)

**U1. CheckpointTakeover wired to the service (replaces the cosmetic checkboxes).**
- The takeover lists `listUnresolvedDevelopment` groups: OLDEST unresolved checkpoint first, header
  "Checkpoint {ordinal} of {ordinalCount} — game {boundaryGameNumber}" (kills the
  game-number-as-ordinal bug); `stalePlan` groups render last with an explicit "from an earlier
  schedule" tag.
- Per proposal: CONFIRM ("entered in SMB4 as proposed") / ADJUST (numeric input or trait-slot picker
  for what SMB4 actually accepted) / REJECT (requires a short reason — free text, one field). Each
  resolution calls the service with `observedPriorValue` captured from the CURRENTLY DISPLAYED
  prior value at render (two-tier CAS, Amendment 2). Outcomes surface honestly: conflict →
  "changed underneath — showing current value" with refreshed row; apply-failed → retry affordance.
- "Mark all entered" = sequential per-item confirms (each its own service call + receipt); progress
  shown; stops on first conflict/failure with the remainder untouched.
- From→to display uses the row's expectedPrior/proposed (never `player[key]+delta` recomputed).
- Trait + ratings proposals for the SAME checkpoint appear TOGETHER (the service already merges kinds
  — this kills the trait-grant-N/checkpoint-N display split).

**U2. Pending-vs-applied truth in the drawer.**
Trait timeline + ratings bars: only `confirmed-applied` rows render as Earned/Lost/changed;
pending renders as "proposed"; rejected/conflict render in the history view only. The ratings-bar
"current" value = player record merged with NON-applied confirmed legacy overlays only (the service's
merge exclusion — reuse `mergeRatingsOverlays`, do not fork it).

**U3. Development history — hidden but easy to find (JK's words).**
A "Development log" disclosure inside the player drawer (collapsed by default) rendering
`getDevelopmentHistory`: chronological, per entry — what changed, proposed vs actually-entered,
who/when (resolvedCivilDate), reject reasons shown plainly. No new route.

**U4. The Lens truth batch (verified defects; map §3b).**
(a) Clubhouse pulse reads CANONICAL morale snapshots (not player.morale) and fan-morale trend derives
from snapshot history (not hardcoded flat) — player drawer morale trend too. (b) Standings-rank label
tiebreak matches the standings table's comparator exactly (share one comparator). (c) `.500` team copy
boundary fixed (>0.5 for "above"). (d) L10 column computes from actual games played (≤10). (e) The
'Tonight' card highlights the ACTIVE club's slot (home or away), not always home. (f) FitnessPicker
reflects persistence truth: on failed setFitness the chip reverts and shows the error (no permanent
optimistic lie). (g) Tootwhistle stories/wire dedup: wire excludes items already shown as stories.
(h) Museum bleed: trophy case + ceremony moment filter to THIS franchise (championships/awards rows
carry team/league identity — filter by the franchise's teams; if rows are genuinely unfilterable,
STOP that sub-item with evidence). (i) Milestone bleed: drawer milestones filter to this franchise's
scope (seasonId prefix `${franchiseId}-season-` or playerId∈franchise players — pick the truthful
one, justify in a comment).

## FENCE
useFranchiseLensData.ts, FranchiseLensHub.tsx, FranchiseLens.tsx, new/edited components under
app/components/franchise/, + tests. Do NOT touch: franchiseConsoleMirror.ts or any storage/engine
module, GameTracker files, processCompletedGame, flags. UI STYLE: this page's ballpark-kit
premium-retro language is SET — extend existing patterns, invent no new design system.

## VERIFICATION (paste all)
1. Build exit 0. 2. FULL vitest run (summary; solo-green batch flakes baseline). NOTE: franchise hub
copy is TEST-CHARACTERIZED — if a D11-era copy test pins a string you must change (e.g. the checkpoint
label), update it WITH a one-line justification per assertion, listed; unlisted copy-test edits are an
audit failure. 3. Proving tests: ordinal label correct on a 60-game/5-checkpoint fixture
(checkpoint-24 → "Checkpoint 2 of 5"); oldest-first with two pending checkpoints; confirm-adjusted
persists actual value; reject requires reason; conflict path refreshes; pending trait NOT labeled
Earned; pulse uses snapshot morale; wire has no story duplicates; museum/milestone bleed cases.
4. Changed-files list.

FORMAT: files → per-item (U1-U4a..i) → verification → "MIRRORUI-1 complete" or "BLOCKED: <why>".
Commit on branch if sandbox permits; NEVER push.
FAILURE PROTOCOL: service API mismatch → STOP (the service is the contract); unfilterable museum rows
→ STOP that sub-item; items separable.

Use xhigh reasoning effort. Think step-by-step.
