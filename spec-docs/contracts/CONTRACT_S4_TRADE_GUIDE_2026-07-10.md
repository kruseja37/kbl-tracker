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
