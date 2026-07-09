# CONTRACT_VOICE_2026-07-09 — Auction Copy Law

Build lane VOICE — auction copy law. Builder works in isolated worktree
(branched off main). Contract-first commit, then the change. Do NOT push,
do NOT merge, do NOT touch any file outside the worktree.

This is a DISPLAY-LAYER-ONLY lane: no engine enum, threshold, posture rule,
or CPU behavior may change. Captain's copy decisions are final — do not
reword them. Any string/enum member found that this contract doesn't cover
= STOP and report it by name, do not invent a label.

## BINDING SPEC (from spec-docs/AUCTION_WALKTHROUGH_WAVE_2026-07-09.md §1, captain-authored)

Files: src/src_figma/app/components/auction/WhisperPanel.tsx,
src/src_figma/app/components/auction/AuctionStage.tsx,
src/src_figma/app/pages/LeagueBuilderAuctionDraft.tsx (strings only),
src/engines/auctionBoardFrame.ts (display labels only), + their tests.

### 1.1 Live-call ladder (WhisperPanel.tsx ~1026-1037, rendered ~514-516)
display words only, engine liveCall enum unchanged:
- on-top: keep `ON TOP`
- push: `PUSH` → `STAY IN`
- cap: `CAP $X` → `STOP AT $X`
- out/walk: keep `WALK`

### 1.2 Money row (WhisperPanel.tsx ~775-792 + AuctionStage.tsx ~293-294)
- `MAX BID $X` → `CEILING $X`
- Wallet `Most you can bid` → `Ceiling` (same term as panel)
- `Fill Reserve $X` → `HELD BACK $X`; add Help line (in the panel's existing
  Help surface): "Held back — what finishing your roster will cost, tax
  included."
- `Room $X` → `TO SPEND $X`
- `Total Capacity $X` → REMOVE from default render; move behind the Help
  surface as `Before-tax ceiling $X` with the line: "Ignores tax — never bid
  to this." (Honors the F9 in-code ruling at WhisperPanel ~787-789.)
- New relationship line under the row, rendered ONLY when ceiling < your
  number: `Your number is what he's worth. Ceiling is what you can pay.`

### 1.3 Why-line (WhisperPanel.tsx ~1083-1089)
- `Fit and need move the raw IV to $X before chemistry.` → `Talent alone
  says ${base}. Your fit and need move him to ${adjusted}.` (base = the
  unadjusted IV figure already available in that code path; if the raw base
  figure is not already available at the render site, STOP and report — do
  not add engine plumbing)
- `Your fit and need sit right on the raw IV.` → `Straight talent price — no
  fit or need bump.`
- "raw IV" and "chemistry" as a math term must never render. Chemistry
  readout section (~637-641) unchanged.

### 1.4 Reason chips (WhisperPanel.tsx ~1097-1124, reasonCodeLabel)
map EVERY LiquidityReasonCode; add a unit test asserting exhaustiveness (no
raw slug can render; default case = generic `advisor note` in prod):
- emergency-fill: `must fill now`
- future-fill-protected: `saving for seats`
- priority-need: `fills a need`
- similar-replacements: `cheaper options left`
- scarce-replacement: `scarce at position`
- over-budget: `past your cash`
- legal-cap / above-legal-ceiling: `can't legally pay`
- bid-floor: `reserve price`
- late-cash: `late money edge`
- cash-tight: `cash tight` (keep)
- near-done: `roster nearly done`
- under-ceiling: `inside your cash`

Reconcile this table against the ACTUAL enum members in the engine source;
any member not listed = STOP-and-report with the member name.

### 1.5 Liquidity-state chip (WhisperPanel.tsx ~1092-1094)
today it special-cases two states and uppercases the raw enum otherwise
(`WITHIN-LIQUIDITY-CEILING` could render verbatim). Map every
LiquidityState: neutral → STEADY, constrained → TIGHT, aggressive → PRESS,
emergency-fill → MUST FILL, late-budget-surplus → CASH TO BURN,
within-liquidity-ceiling → STEADY. Same exhaustiveness test as 1.4. Display
only — posture classification rules untouchable.

### 1.6 Need/fit chips (WhisperPanel.tsx ~1130-1138)
keep `need +35%` / `fit +8%` style (lowercase). Add one Help line: "need /
fit — how much this club's roster hole and team identity move the price for
you." Thresholds/behavior unchanged.

### 1.7 Scattered fixes
- WhisperPanel.tsx ~807-810: `Next-best replacement ~$X` → `Fallback option
  ~$X`
- LeagueBuilderAuctionDraft.tsx ~447-464: `…not attractive enough for this
  profile` → `…not attractive enough for this club's plan`
- AuctionStage.tsx ~609-611: `The franchise wizard will refuse them…` →
  `Franchise setup will refuse them…`
- AuctionStage.tsx ~480-481: `…don't fit the legal 22 frame` → `…don't fit
  a legal 22`
- AuctionStage.tsx ~706-709: `Teams can meet the ask.` → `{N} teams can meet
  the ask.` (include the actual number)
- LeagueBuilderAuctionDraft.tsx ~1930: plain `-` → em dash `—`
- AuctionStage.tsx ~276 (UNSOLD overlay): `Nobody bid at that price. He'll
  get one more look later.` → `No takers at that price — he'll come around
  again.` (preserve any existing he/she pronoun logic)
- AuctionStage.tsx ~284 (GONE overlay): `Nobody bid. He's off the board for
  good.` → `No takers — he's off the board for good.` (same pronoun note)
- src/engines/auctionBoardFrame.ts ~177-178: `depth via {Name} (Two Way C)`
  → `depth via {Name} (two-way, covers C)`
- LeagueBuilderAuctionDraft.tsx ~1932: `Room up to $X while keeping money
  for the empty slots.` → `You can go to $X and still cover your empty
  seats.`

### 1.8 Explicitly KEPT — do not touch
`Let him go.` (headline and button, both sources), `YOUR NUMBER`, all three
roomRelation lines ("The room wants more than you should give." etc.),
`WALK`, `ON TOP`, the HELP_LINE, board/scout/log/handoff copy, ALL
designVerdict.ts strings (out of scope), the bid-rejection error map in
useAuctionDraft.ts (out of scope this lane).

### 1.9 Tests
grep every OLD string across src/ (including test files) and migrate pins
to the NEW string — assertions move, never weaken (exact stays exact). If
an old string appears in a snapshot, update the snapshot deliberately and
say so.

## GATES (all must pass, in the worktree)
`npx tsc -b` clean; `npm run build` exit 0; the auction suites
(LeagueBuilderAuctionDraft.test.tsx + any WhisperPanel/AuctionStage tests)
green; then ONE FULL `NODE_ENV= npx vitest run` — any new red anywhere is
the builder's problem to fix or STOP-and-report.

## Commit sequence
1. contract (this file, alone)
2. the change (+ test migrations)
3. a final report commit appending to this file: per-item disposition table
   (done / stopped+why), gate outputs (summary lines), and any STOP items.

Line numbers are from a 2026-07-09 inventory — re-located by string content
where drifted.
