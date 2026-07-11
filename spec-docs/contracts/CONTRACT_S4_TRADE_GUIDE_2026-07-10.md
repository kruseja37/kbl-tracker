# CONTRACT S4 — THE TRADE GUIDE (posted prices, commissioner-executed pick trades)
Captain: Fable · Builder: Codex gpt-5.6-sol xhigh (critical lane) · Date: 2026-07-10
Branch: codex/snake-s4-trades · Base: main @ post PR #69

## AUTHORITY (read in this order)
1. spec-docs/SNAKE_DRAFT_VISION_2026-07-10.md — TRADES section (posted prices, Jimmy
   Johnson style; commissioner pushes through or declines; NO custom trades; R3 offer
   copy: "OFFER 14+41; RECEIVE 9+62 — legal now" / "No legal guide trade reaches pick 9").
2. spec-docs/SNAKE_DRAFT_V1_PROGRAM_2026-07-10.md — S4 lane + appendix rulings
   (offer lifecycle; trade-while-armed cancels ARM; correction window covers a trade as
   the most recent completed action; revalidation against the CURRENT session revision).
3. spec-docs/contracts/CONTRACT_S1A_FOUNDATIONS_ENGINE_2026-07-10.md — the W6 guide
   engine (searchSnakeGuidePackage / revalidateSnakeGuidePackage / execute + trade
   correction in snakeGuideTrade.ts) + audit note N2.
4. spec-docs/contracts/CONTRACT_S2_THE_ROOM_2026-07-10.md — the commissioner seam, the
   LIVE_PICK_MOVED reducer event + timer-cancel seam (already built and audited).
5. spec-docs/contracts/CONTRACT_S3_PRIVATE_DESK_2026-07-10.md — the privateDesk seam +
   the S4 carry-forward: NO "suggested trade / best return" surface, ever.

## LAWS (REJECT criteria)
- FIRST LAW: the guide is a PRICE LIST, not an agent. The GM chooses the target pick;
  the guide computes whether a legal package exists at posted prices and states it. It
  NEVER proposes which pick to target, never ranks trade opportunities, never nudges.
- POSTED PRICES ONLY: package math comes from derivePickValueChart via the S1a engine.
  No custom packages, no haggling UI, no value sliders.
- COMMISSIONER EXECUTES: the two GMs nod IN REAL LIFE; the commissioner pushes the
  trade through or declines on the shared main. No in-app offer messaging in v1.
- LEGALITY GATE: a package that strands either club's legal finish cannot be executed
  (the engine already enforces; render its verdict, never bypass).
- Advisory ≡ settlement · no percentages · copy law · auction frozen · engines are
  done (gaps = STOP). The reducer's five ritual states are untouchable.

## CAPTAIN RULING on S1a-N2 (pick-timing strand) — decided, build to this
The guide validator guards MONEY and ROSTER-LEGALITY, not pick TIMING (trading down
can cost you a scarce position to an earlier rival pick — that is GM judgment, and the
desk's risk reads already surface it). v1 accepts timing risk explicitly. Required
honesty: the trade confirm surface shows each club's post-trade next-pick number
("YOUR NEXT PICK MOVES: #9 → #14") so the timing cost is visible fact, not fine print.
No probabilistic warnings.

## SCOPE
### T1. THE GUIDE (destination, both surfaces)
A tap-down destination: the full posted price chart (every pick slot, its price) and
the one interaction: "WHAT WOULD IT COST TO REACH PICK N?" → the engine's package
answer verbatim ("OFFER 14+41; RECEIVE 9+62 — LEGAL NOW" or "NO LEGAL GUIDE TRADE
REACHES PICK 9"). Available to every seat (public info — posted prices and pick
ownership are public), on the desk and via the shared main's guide button.

### T2. THE COMMISSIONER TRADE FLOW (shared main)
Commissioner opens TRADE (the S2 seam): selects the two clubs + the target pick →
the guide surfaces the package (engine search) → both next-pick moves shown (the N2
honesty line) → EXECUTE or DECLINE. Execute path: revalidateSnakeGuidePackage against
the CURRENT session revision (a stale offer refuses with "THE DRAFT MOVED ON —
REFRESH"), then the engine's execute (ownership moves; snake geometry never changes),
persisted per-pick with a correction snapshot (a trade IS the most recent completed
action — the existing commissioner CORRECTION must undo it byte-identically).
- Trade-while-armed: executing a trade that moves the live pick fires the existing
  LIVE_PICK_MOVED path (ARM cancels, hold timer cancels — already built in S2; wire
  tradeRevision so it actually fires, it is currently constant 0) and the room
  re-clocks to the new owner instantly, colors and all.

### T3. FALLOUT (private desks)
After any executed trade: each affected seat's board/plan recomputes (existing desk
machinery — bills re-derive from session state); the affected seats get ONE advisor
LOG line each, facts only ("YOU TRADED PICKS 14+41 FOR 9+62 — YOUR NEXT PICK: #9").
Order strip ownership updates everywhere (S2 order strip re-reads pickOrder).

## FILE SURFACE
- NEW: src/src_figma/app/components/snake/trade/ (guide chart, package card,
  commissioner flow) + tests.
- ALLOWED small integration edits: SnakeDraftRoom.tsx + SnakeDraftRoomView.tsx (wire
  the S2 commissioner seam + tradeRevision + the desk guide button), desk/ additions
  for the guide destination (do not restructure S3 models).
- FORBIDDEN: src/engines/* edits · auction files · App.tsx · flags ·
  leagueBuilderStorage.ts schema · the reducer's ritual states (wiring the existing
  LIVE_PICK_MOVED/tradeRevision inputs is allowed; new states are not).

## TESTS
Guide answer verbatim from the engine (legal package + no-package cases) · stale-
revision refusal · execute round-trip: pickOrder ownership moves, geometry unchanged,
per-pick persisted, correction restores byte-identical pre-trade session · live-pick
trade mid-ARM and mid-HOLD: ARM cancels, nothing records, new owner on the clock
(extend the existing S2 tests via tradeRevision) · next-pick-moves honesty line both
clubs · desk fallout LOG lines facts-only · no-suggestion tripwire: no API/UI surface
enumerates or ranks trade TARGETS (grep + a test asserting the guide only answers the
GM's asked pick) · copy law · no percentages.

## GATES (real output)
1. tsc --noEmit clean. 2. npm run build exit 0. 3. Owned + S2/S3 snake suites green.
4. Auction suites green. 5. ONE full vitest run (known solo-flakes: the
LeagueBuilderDraftSetup family, franchiseManualSmokeFixture — verify solo if red).

## PROTOCOL
No git write commands (captain cuts commits). Spec-first tests. UNKNOWN or engine gap
= STOP and report. Builder report appended here: file:line, REAL gate outputs, STOPs,
auditor attack list.

---

## BUILDER REPORT — Codex S4 (2026-07-10) — COMPLETE

### Outcome

Built S4 inside the contract-owned UI/test surface. The snake room now has a public
posted-price guide and a separate commissioner-only execute/decline flow; the private
desk has its own GUIDE destination. Every search begins with the GM's explicitly asked
pick. No production API or UI enumerates, compares, ranks, or recommends trade targets.

Execution revalidates against the current session revision, persists through the
existing `mlbDraftSessions` helper, changes ownership only, preserves snake geometry,
feeds the existing one-action correction snapshot, re-clocks the room only when the
live pick owner changes, and writes one fact-only receipt to each affected private LOG.
No git write command was run. The tree is intentionally dirty for the captain.

No engine, auction, App route, flag, storage schema, `leagueBuilderStorage.ts`, setup,
or ritual reducer file was edited. The three pre-existing untracked captain artifacts
`DISPATCH_PROMPT.txt`, `run_lane.sh`, and `sentinel.sh` were not modified.

### Changed-path inventory

Final `git status` contains 15 paths: 12 S4-owned changed paths plus the 3 pre-existing
untracked captain artifacts named above.

S4-owned paths (12):

1. `spec-docs/contracts/CONTRACT_S4_TRADE_GUIDE_2026-07-10.md`
2. `src/src_figma/app/pages/SnakeDraftRoom.tsx`
3. `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx`
4. `src/src_figma/app/components/snake/__tests__/SnakeDraftRoomView.test.tsx`
5. `src/src_figma/app/components/snake/desk/PrivateDesk.tsx`
6. `src/src_figma/app/components/snake/desk/__tests__/PrivateDesk.test.tsx`
7. `src/src_figma/app/components/snake/trade/tradeGuideModel.ts`
8. `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx`
9. `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx`
10. `src/src_figma/app/components/snake/trade/TradePackageCard.tsx`
11. `src/src_figma/app/components/snake/trade/__tests__/tradeGuideModel.test.ts`
12. `src/src_figma/app/components/snake/trade/__tests__/SnakeTradeGuide.test.tsx`

### Spec-first proof

The S4 tests were created before implementation. Their required red run failed only
because the new modules did not exist:

```text
FAIL .../SnakeTradeGuide.test.tsx
Error: Failed to resolve import "../SnakeCommissionerTrade"

FAIL .../tradeGuideModel.test.ts
Error: Failed to resolve import "../tradeGuideModel"

Test Files  2 failed (2)
Tests       no tests
```

### What was built

- `src/src_figma/app/components/snake/trade/tradeGuideModel.ts:10-131` is the thin S4
  adapter over the finished S1a engine. `guideForAskedPick` accepts exactly one target;
  `executeAskedPickTrade` revalidates/executes via `snakeGuideTrade`, detects a live-pick
  owner change, and emits two fact-only private receipts. It contains no package math.
- `src/src_figma/app/components/snake/trade/SnakeTradeGuide.tsx:6-81` renders the full
  `derivePickValueChart` posted-price list plus one numeric asked-pick input. It renders
  the engine legal/no-package answer verbatim and resets on session revision changes.
- `src/src_figma/app/components/snake/trade/SnakeCommissionerTrade.tsx:6-100` implements
  the IRL-nod commissioner flow: choose buyer, seller, and seller-owned target pick;
  check one engine package; show both post-trade next-pick moves; EXECUTE or DECLINE.
  Target changes, decline, execution, and session revision changes kill the open package.
- `src/src_figma/app/components/snake/trade/TradePackageCard.tsx:1-28` is the shared
  package/next-pick honesty surface.
- `src/src_figma/app/pages/SnakeDraftRoom.tsx:154-181,528-576,583-649` derives the posted
  chart from the selected pool's IV curve, supplies the real current W3 seating proof
  inputs, persists the S1a executed session, drives live-pick movement separately from
  ordinary trade auto-cover, removes corrected trade receipts, and mounts both guide
  destinations plus the commissioner flow.
- `src/src_figma/app/components/snake/SnakeDraftRoomView.tsx:43-119,191-227` replaces the
  S4 placeholder with separate THE GUIDE / TRADE buttons and wires the already-audited
  live-pick cancellation seam without adding a ritual state. `tradeRevision` still
  auto-covers on every trade; `livePickMoveRevision` cancels ARM/HOLD only when ownership
  of the live pick actually changes.
- `src/src_figma/app/components/snake/desk/PrivateDesk.tsx:11-43` adds only the GUIDE
  destination tab; the S3 board/rankings/LOG models are unchanged.

### Adversarial tests / tripwires

- `tradeGuideModel.test.ts:77-136`: documented 14+41 / 9+62 package, exact no-package
  answer, current-revision refusal, ownership-only geometry invariance, byte-identical
  correction, live-pick movement, dual fact-only receipts, and API-key no-suggestion
  tripwire.
- `SnakeTradeGuide.test.tsx:27-111`: full chart, only the typed target reaches the
  callback, both timing lines, execute/decline, stale refusal, revision invalidation,
  and no suggestion/percentage copy.
- `SnakeDraftRoomView.test.tsx:39-53,150-161`: separate shared-main destinations and
  the existing mid-HOLD live-pick cancellation with zero record call.
- `PrivateDesk.test.tsx:27-72`: the GUIDE stays inside the private-desk destination.
- Production tripwire:

```text
$ rg -n -i "suggest|recommend|best|rank.*target|target.*rank|%" \
    src/src_figma/app/components/snake/trade --glob '!**/__tests__/**'
(exit 1; no matches)
```

### Final Gates 1→5 — real terminal output

**Gate 1 — `NODE_ENV= npx tsc --noEmit`**

```text
(exit 0; no compiler output)
```

**Gate 2 — `NODE_ENV= npm run build`**

```text
> kbl-tracker@0.0.0 build
> tsc -b && vite build

✓ 2675 modules transformed.
✓ built in 11.18s
PWA v1.2.0
precache  197 entries (5453.40 KiB)
files generated
  dist/sw.js
  dist/workbox-1d305bb8.js
(exit 0)
```

Only the existing Browserslist, dynamic-import, and chunk-size warnings were emitted.

**Gate 3 — owned + S2/S3 snake suites**

```text
Test Files  18 passed (18)
Tests       86 passed (86)
Duration    4.31s
(exit 0)
```

The run emitted only the existing `SnakeDraftSetup` React `act(...)` warning.

**Gate 4 — all current auction-named suites**

```text
GATE4_FILE_COUNT=34
Test Files  34 passed (34)
Tests       371 passed (371)
Duration    61.49s
(exit 0)
```

**Gate 5 — the one full `NODE_ENV= npx vitest run` invocation**

```text
FAIL  src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx
> LeagueBuilderDraftSetup > manual exclusion does not beat a roster-design pin during regeneration
Error: Test timed out in 15000ms.

Test Files  1 failed | 636 passed | 8 skipped (645)
Tests       1 failed | 9630 passed | 15 skipped (9646)
Duration    235.39s
(exit 1)
```

This is the contract's named `LeagueBuilderDraftSetup` batch-flake family. The exact
solo verification passed:

```text
✓ src/src_figma/__tests__/pages/LeagueBuilderDraftSetup.poolLock.test.tsx
  (21 tests | 20 skipped) 2262ms
  ✓ manual exclusion does not beat a roster-design pin during regeneration 2260ms

Test Files  1 passed (1)
Tests       1 passed | 20 skipped (21)
Duration    4.45s
(exit 0)
```

Final `git diff --check` exited 0 with no output.

### STOPs / surprises

- No unresolved UNKNOWN and no engine gap was found.
- The S2 seam had already advanced from the contract's "constant 0" description to
  `session.trades.length`. S4 preserved that all-trade auto-cover signal and added a
  separate live-owner-change revision so a future-pick trade does not falsely announce
  that the live pick moved. This stayed entirely in the allowed S2 integration surface.
- No browser run was part of the contract's Gates 1→5. JK's browser walk remains the
  acceptance gate after independent audit/landing.

### Auditor: attack these first

1. Execute a live-pick trade at 999ms of ANNOUNCE and while the pick-save promise is
   pending; storage must remain untouched before the trade and no late RECORDED/thock may
   appear. Then trade only future picks and prove ARM is covered but no false live-pick
   movement notice appears.
2. Change the session revision between CHECK THE GUIDE and EXECUTE; the package must die
   with the engine's exact stale message. Also change seller/target and press DECLINE to
   prove no prior package survives.
3. Run a real mid-draft legal-finish squeeze with tax and version retirement. Confirm the
   page's current W3 input matches each club's picked roster, remaining all-in budget,
   locked archetype, remaining pool, and version state; no UI bypass may execute.
4. Execute then CORRECT a trade. Pick ownership, current owner, geometry, correction
   window, both LOG receipts, order strip, club lens, and affected desks must return to
   the pre-trade state; the session object itself must restore byte-identically.
5. Grep/render every S4 production surface for any destination advice, ranked targets,
   percentages, custom-package controls, offer messaging, or auction language. The only
   destination input must remain the GM/commissioner's explicitly selected pick.

---

## AUDIT — opus, independent, 2026-07-10 — VERDICT: APPROVE
All eight vectors sound under independent gates + attacks: the tradeRevision/
livePickMoveRevision split correct (future-only trades never false-cancel the ritual;
mid-hold live-pick trade = zero storage calls, no late thock; reducer byte-identical
to base) · First Law holds (asked-pick-only, no target ranking, tripwire clean, no
percentages) · money gate un-bypassable (every execute routes through revalidate →
simultaneous seating proof on REAL mid-draft inputs, each traced to source) ·
correction round-trip byte-identical; trade→pick→correct undoes the pick and keeps
trade receipts · geometry preserved, no schema change · honesty line renders before
EXECUTE · privacy/copy clean · partition exact (12 paths).
NOTES (non-blocking): tradeRevision prop vestigial in the page path (candidate cleanup);
correction byte-identity test covers the no-prior-snapshot case only; the
livePickMoveRevision seam lacks one end-to-end View test; theoretical trade-during-
pick-save race unreachable under the single-commissioner device model.
CARRY-FORWARDS: S5 — SnakeTradeGuide is public-safe/read-only, companion-mountable;
execute lives only in SnakeCommissionerTrade. S6 — this flow is PICK-trade-specific;
farm/player trades need their own engine keyed on player assets (no drop-in reuse).
