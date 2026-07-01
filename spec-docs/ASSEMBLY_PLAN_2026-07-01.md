# ASSEMBLY PLAN — draft-UI + Mode-2 hub → trunk (lined up 2026-07-01, awaiting JK's fire order)

**Goal:** fold the two live UI streams onto trunk (`experiment/manager-wpa-window`) as the canonical base for new draft/scout UI (FABLE-C4), then advance `main` (Q5). **NOT YET EXECUTED — branch-only, never push, JK gives the go.**

## Pre-assessment (read-only `git merge-tree --write-tree`, run 2026-07-01)

The two primaries are COMPLEMENTARY (draft-ui = pre-season entry; hub = in-season home) and nearly clean against current trunk:

| Merge | Conflicts | Files |
|---|---|---|
| `claude/lineups-fenway-hub` → trunk | **0** | (clean) |
| `claude/v1-draft-ui` → trunk | **1** | `spec-docs/PROMPT_CONTRACTS.md` (doc-append collision — I appended the Fable contracts to trunk today; draft-ui also touched it) → **base-aware union** |
| `claude/v1-draft-ui` ↔ `lineups-fenway-hub` (the two-primary overlap) | **3** | `src/main.tsx` (additive route/import → **union**); `src/src_figma/app/components/auction/AuctionStage.tsx` (add/add → **keep draft-ui's live-wired 405-line version**); `src/src_figma/styles/auction-theme.css` (add/add → **keep draft-ui's**) |

Note: `src/App.tsx` auto-merges (not flagged). Total human-resolve surface across the whole assembly ≈ **4 files**, only 2 of which are true text merges (`PROMPT_CONTRACTS.md` + `main.tsx` unions); the other 2 are pick-draft-ui's. **Risk: LOW.**

## Runbook (per the safe-lane-merge technique)

1. **Isolated assembly worktree** off trunk HEAD (`git worktree add`), APFS-clone `node_modules` — trunk stays untouched until green + JK sign-off.
2. **Merge `claude/v1-draft-ui` first** (the tested, playable base). Resolve `PROMPT_CONTRACTS.md` by base-aware union (keep both the trunk-appended Fable contracts AND draft-ui's additions). **GATE:** `NODE_ENV= npm run build` exit 0 + FULL suite ZERO-NEW-REDS.
3. **Merge `claude/lineups-fenway-hub` second** (disjoint heavy files merge clean). Resolve the 3-file overlap: union `main.tsx` routes; **keep draft-ui's `AuctionStage.tsx` + `auction-theme.css`** (reconcile the hub's redesign styling as a C4 follow-up, not at merge time). **GATE:** build + FULL suite ZERO-NEW-REDS.
4. **Opus runs the L-SIM** (smoke + the 60g season leg last) — byte-identical proof or an explained, non-regressive delta.
5. **JK browser sign-off** — user-visible UI streams; the sole real-world acceptance gate.
6. **Only after green + JK:** fast-forward trunk to the assembled branch (or adopt it as trunk).
7. **Advance `main` (Q5):** fast-forward `main` → the assembled trunk (main is 1,108 behind / 0 ahead → clean FF). Local only, never push.

## Drop / park (from the worktree inventory)

- **Drop/delete:** `codex/draft-setup-ui` (100% ancestor subset of draft-ui), `codex/auction-draft-ux-rehaul` (100% ancestor subset of the hub), `claude/v1-soul-gaps` (0 unique commits — already in trunk).
- **Park:** `claude/v1-playoff-driver` (headless playoff engine; playoffs deferred per JK; independent lane, no bearing on this assembly).
- **`codex/draft-pipeline-fix`:** one docs-only alignment brief — cherry-pick the doc if wanted, else drop.

## Standing constraints
Branch-only; never push. Trunk is not touched until the assembled branch is green AND JK signs off in the browser. JK issues the fire order.
