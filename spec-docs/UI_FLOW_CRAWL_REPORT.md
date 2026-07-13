# Snake Draft UI Flow Crawl Report

**Date:** 2026-07-12  
**Initial verdict:** NOT VERIFIED  
**Target device:** iPad landscape, pass-around main device, optional same-room companion devices.

## Crawled path

League Builder -> Draft Setup -> snake room registration -> covered team lens -> private board -> player inspection -> pick -> trade/correction -> MLB recap -> Scout Hire -> farm room -> farm recap -> staffing -> Franchise Setup -> launch with no schedule -> Living Season schedule entry.

## Broken or illogical paths found

- The primary decision/action and live roster are not simultaneously available at iPad width.
- The active pick disappears in a 176-pick strip.
- COVER THIS DEVICE can automatically reveal private data again.
- Recap removes the final correction path before the user confirms completion.
- Farm correction reports success before durable save and may restore an old board snapshot.
- Error screens for room/staffing/companion writes are terminal or silent instead of retryable.
- Companion setup can produce a seat that cannot authenticate.
- A completed companion room remains claimable and can trap a device in an old draft.
- Post-draft Franchise Setup behaves as a generic pre-draft wizard and contradicts completed draft truth.
- Always-visible explanatory prose violates the Help-Button law on four production surfaces.
- Old snake POC routing and unused pass-cover input remain orphaned.

## Touch / accessibility defects

- Gavel is pointer-only; rank fallbacks and several buttons are undersized for reliable touch.
- Active board tabs, current pick, and selected club lack explicit selected semantics.
- Cover and launch-confirm overlays do not manage focus or inert background content.
- Farm reorder controls are raw triangles with weak affordance.

## Required recrawl gates

1. Clean-origin browser run on current worktree, never a cached PWA origin.
2. 1024x768 and 1180x820 landscape checks.
3. Actual clicks for seat reveal/cover, player inspect, board reorder, draft, correction, trade, recap return/confirm, companion cover/return, and zero-schedule launch.
4. Console errors/warnings captured at each stage.
5. Static focused tests, full relevant test gate, TypeScript, production build, and `git diff --check`.

JK's browser walk is the sole acceptance gate; automation can only make the build ready for that walk.
