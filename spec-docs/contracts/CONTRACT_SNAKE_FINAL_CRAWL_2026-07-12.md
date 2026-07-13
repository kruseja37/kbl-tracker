# CONTRACT — SNAKE FINAL STATIC AND UI CRAWL

**Date:** 2026-07-12
**Base checkpoint:** `6829a90b`
**Scope:** production snake setup, MLB room, private desks, companion, trades, farm room, recap, staffing handoff, Franchise Setup, and zero-schedule Living Season launch.

## Lane A — static state/wiring auditor

**ROUTE:** independent adversarial auditor | very high reasoning

Read-only. Crawl every production route, import, state transition, storage writer/reader, manifest,
board, trade, correction, roster commit, farm generator, freeze/morale consumer, franchise handoff,
and relevant test. Find correctness, privacy, persistence, idempotency, stale-write, backward-
compatibility, dead-route, and orphaned-feature gaps. Do not trust prior reports. Cite file and line
for every finding. Separate confirmed defects from risks/test gaps. Do not edit files.

## Lane B — UI/UX and orphan auditor

**ROUTE:** independent adversarial UX auditor | very high reasoning

Read-only. Crawl the same production path in code with an iPad-first, team-first lens. Attack player
discovery/selection, board and position views, roster/plan/money/chemistry hierarchy, team switching,
privacy covers, trade flow, farm fog, recap and next-step clarity, team colors/logos, responsive
breakpoints, focus/keyboard/touch behavior, loading/error/empty states, and Help-Button UI Law.
Inventory buttons/features/components that render without working, work without a route, or exist in
the tree but are superseded/duplicated. No beginner explainer copy. Cite file and line for every
finding. Do not edit files.

## Shared rules

- `origin/main` was fetched before this contract; base is a verified descendant of current main.
- Production paths only unless a dark/dev path can corrupt or confuse production state.
- Auction is regression-only and frozen for v2; do not recommend auction redesign.
- JK's browser walk is the sole acceptance gate.
- Report `VERIFIED` or `NOT VERIFIED`, major/minor counts, evidence, and residual risk.
- Use very high reasoning effort.

