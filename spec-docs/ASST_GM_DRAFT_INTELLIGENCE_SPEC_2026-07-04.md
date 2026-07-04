# ASSISTANT-GM DRAFT INTELLIGENCE — Buildable Spec (2026-07-04)

**Status:** RATIFIED design (JK rulings 2026-07-04), buildable. **Author:** Opus (synthesis of the existing
corpus + JK's 4 rulings), per JK "write it up and build."
**Re-elevation ruling (JK 2026-07-04):** the GM-manipulable per-position ranking board + the value/chemistry
fit-optimizer is the **CORE value of the Assistant GM**, NOT optional polish. This deliberately RE-ELEVATES the
central board-calibration + roster-optimizer design of `DRAFT_GUIDE_INTELLIGENCE_SPEC.md` §8/§10 over the
"light-touch, optional" softening in `SCOUTING_INTELLIGENCE_SPEC.md` §4 (which had superseded it). Where the two
conflict on how central the GM's ranking manipulation is, THIS doc wins.
**Companions (grounding):** `SCOUTING_INTELLIGENCE_SPEC.md` (market/bid-vs-pass vision), `DRAFT_GUIDE_INTELLIGENCE_SPEC.md`
§8/§10 (board calibration + optimizer), `FABLE_C2B_DESIGN_2026-07-01.md` + `C2B_AUDIT_VERDICT_2026-07-02.md`
(the built market engine), `ASST_GM_DESIGN.md` + `FABLE_WHISPER_PANEL_LAYOUT_2026-07-02.md` (the whisper).

---

## 0. THE VALUE (one paragraph)
The Assistant GM turns the GM's **per-position player rankings** — recommended from team+player archetype fit ×
IV, then nudged by the GM's own read — into a **live best-roster-build PATH** that fits as many top-ranked
players as possible under the cap while maximizing value and chemistry (mix set by the posture dial). During the
live auction it (a) shows a **value-anchored recommended number** (what the player is worth to you / will clear
for — NOT your affordability ceiling), (b) shows the **bid-vs-pass board projection** ("bid this → here's the
roster you can still complete; pass → here's what's left"), and (c) **auto-advances** the board as players sell
("your #1 SS just went → your #2 is now the target"). Same brain persists into the season.

## 1. THE FOUR LOCKED RULINGS (JK 2026-07-04)
1. **Manual rank = STRONG NUDGE.** The GM's per-position order is a heavy weight in the optimizer's objective
   (a large `gmPreferenceWeight`), NOT a hard constraint — the engine may still override the GM's order when a
   markedly better-fitting / cheaper player is clearly superior. (Rank authority.)
2. **Live = AUTO-ADVANCE + RE-FIT.** When the top-available player at a position is drafted, promote the GM's
   next-ranked to the top and re-fit the whole board live. The GM's manual order PERSISTS across the re-fit;
   only availability changes.
3. **Value↔chemistry mix = POSTURE-CONTROLLED.** The existing 3-posture dial sets the trade-off:
   **Conservative** leans chemistry/safety, **Aggressive** leans raw value, **Optimal** balanced. (Not a fixed
   co-equal weight — the dial moves it.)
4. **Rank at SETUP + nudge IN-DRAFT.** Rankings are set at draft setup (carried into the live draft); the GM can
   still nudge live, but the in-draft HEADLINE is the adaptive board + the bid-vs-pass projection.

## 2. THE THREE LAYERS
- **A — SETUP STRATEGY (pre-draft, RosterDesigner):** GM picks MLB+Farm archetype, per-position player-archetype
  targets / tags / tilt, posture; the Asst-GM generates the recommended per-position rankings + the best-22 path;
  GM drag-reorders players per position (strong nudge) + pins. LOCKS at draft start: archetype + posture (the
  auction lock). Rankings + pins CARRY into the draft as the starting board.
- **B — CARRY-IN (draft start):** the setup rankings/board/pins/posture become the live board's initial state.
- **C — IN-DRAFT ADAPTIVE (live, whisper + board):** re-fit on every sale (auto-advance); value-anchored number;
  bid-vs-pass projection; market read; the GM may nudge live (re-drag) and flip posture live.

## 3. THE GM-RANKING BOARD (the core)
### 3.1 Recommended rankings (per position)
Derived from: `archetypeFit(player, team+slot archetype) × IV × needMultiplier(pos) × chemistryContribution`.
BUILT today: `rankPoolForSlot` (rosterDesignFeasibility.ts:860-895) ranks candidates per slot by match/tilt/salary;
`buildBest22Target` (best22Target.ts:158-268) already fits top-ranked players together under cap maximizing value
AND chemistry via `buildIdentityRoster` + `slotPreferenceBonus`. GAP: chemistryContribution is inside the target
build but NOT exposed as a per-player ranking input; needMultiplier scarcity is market-side (C2B) not folded into
the setup ranking yet.
### 3.2 Manual reorder = STRONG NUDGE (ruling 1)
NEW: a per-position drag-reorder list in the RosterDesigner (and a lighter in-draft nudge). Store the GM's order
as `team.rosterDesign.rankOverrides[pos] = playerId[]` (per-league team layer). The optimizer adds a large
`gmPreferenceWeight` bonus for honoring the GM's order (rank 1 gets the biggest bonus, decaying down), on TOP of
value+chemistry — so the GM's order usually wins but a clearly-superior fit can override. (DRAFT_GUIDE §10.1/10.4
`gm_preference_weight`.) Favorites/avoids = extreme nudges (favorite = huge bonus, avoid = exclude).
### 3.3 Fit-optimizer (value + chemistry, posture-controlled — ruling 3)
Reuse `buildBest22Target`/`buildIdentityRoster`. Add a posture-driven value↔chemistry weight:
`objective = valueWeight(posture)·Σvalue + chemWeight(posture)·chemistryScore + gmPreferenceWeight·rankHonor`,
under cap+legality. Conservative: chemWeight up, tax=0. Aggressive: valueWeight up, tax allows scrubs. Optimal:
balanced. (Magnitudes = post-build §16 tuning.)
### 3.4 Auto-advance (ruling 2)
On each sale, recompute per-position availability; the GM's rankOverrides persist; the top-AVAILABLE per position
becomes the live target; re-run the best-22 fit on the shrunk pool. This is the "X gone → promote Y" behavior.
### 3.5 Chemistry = the 5-type potency mechanic (JK clarification 2026-07-04)
"Chemistry" means each player's chemistry TYPE — one of FIVE: **Competitive · Crafty · Disciplined · Scholarly ·
Spirited** (`ChemistryType`, traitPricing.ts:21). Clustering same-type players raises that type's **trait potency
tier**: `<3 = L1`, `≥3 = L2`, `≥7 = L3` (derivedTraitPotency.ts `POTENCY_L2_MIN=3` / `POTENCY_L3_MIN=7`). So
chemistry is NOT a vague score — it is the **count-driven potency ladder that amplifies traits**. The fit-optimizer's
chemistry objective (ruling 3, posture-weighted) = push the roster's per-type counts toward the L2 (3) and L3 (7)
thresholds where potency jumps, weighting a candidate by how much he advances a type toward the next tier. Data is
READY: `chemistryProfileForPlayers` (chemistryIntelligence.ts, already used at rosterIntelligencePayload.ts:361)
aggregates the roster's per-type profile + tiers.

## 4. THE IN-DRAFT WHISPER (fixes + the killer feature)
### 4.1 "YOUR NUMBER" — value-anchored (FIX the bug)
TODAY (BUG): WhisperPanel.tsx:222 renders `worth.capValue` (the affordability ceiling) as YOUR NUMBER → it
recommends bidding your whole budget. FIX: YOUR NUMBER = the **value-anchored recommendation** = the market
predicted clearing (`estimateMarket` median / your `ownValue` from projectBidVsPass), NOT capValue. Keep capValue
as the SEPARATE "most you can bid" guard line (already shown). Verdict stays push/cap/pass but keyed off surplus
(ownValue − predictedMedian), not off capValue≥median.
### 4.2 Bid-vs-pass projection — WIRE THE BUILT ENGINE (the killer feature)
BUILT but ORPHANED: `projectBidVsPass` (auctionMarketModel.ts:660-770) returns `{bid, pass}` BoardProjection with
budget-after, remaining hard requirements, and top-N surplus-ranked targets per branch — deterministic. NO
consumer today. WIRE it into the whisper/draft-room: a two-branch view "BID $X → this board going forward / PASS →
this board going forward." FIX its known bug (C2B audit F3): filter out legally-unsignable targets (add the
would-strand / cheapestLegalCompletion check the audit flagged as incomplete).
### 4.3 The board section (FIX the toggle)
TODAY (BUG): the "FULL BOARD" toggle renders the expanded well inside `.whisper-body` (max-height 480px, overflow
hidden) → clipped/invisible (WhisperPanel.tsx:328-336 + 446-453). FIX: make `.whisper-body` scroll when expanded
(overflow-y:auto) or lift its max-height on expand. Also: the board is the full ranked remaining pool — feed it
the GM's per-position rankOverrides (§3.2) so it reflects the GM's order, and label whether it's the big-board or
the per-position view.
### 4.4 Player profile (the PUBLIC full profile, MLB only)
SCOUTING_INTELLIGENCE_SPEC §5: PUBLIC = the player up for bid + full profile (ratings/traits/chemistry/personality/
age/handedness) for MLB; FARM keeps hidden (scout bands only). TODAY: the Lot card shows name/positions/personality/
age but NO ratings. BUILD: a click-to-inspect profile reusing PlayerInstanceCard `AttributeCell` (:591-604); gate
full ratings to `tier==='mlb'` (farm keeps scoutedGrade/scoutRange + respects `ratingRevealState:'hidden'`).
### 4.5 Live cumulative chemistry readout (JK requirement 2026-07-04)
The whisper must show, as the roster fills, the **cumulative count in each of the 5 chemistry categories** with its
current potency tier and distance to the next — e.g. "Scholarly 4 → L2 (3 to L3) · Competitive 2 → L1 (1 to L2) ·
Crafty 1 · Disciplined 0 · Spirited 1". Feed it from `chemistryProfileForPlayers` (already computed at
rosterIntelligencePayload.ts:361). This makes the CHEMISTRY light concrete: the GM sees which type the candidate on
the block advances and how close each type is to its next potency jump. On the candidate on the block, show the
DELTA (what claiming him does to his type's count/tier — e.g. "+1 Scholarly → tips L3"). This IS the "cumulative
values for each of the five categories" the GM needs while constructing the roster.

## 5. WHAT'S BUILT vs THE GAP (build plan)
**REUSE (built):** RosterDesigner setup (per-slot archetype/tag/tilt + pins), `rankPoolForSlot`, `buildBest22Target`
(value+chem fit), `buildIdentityRoster`, the C2B market engine (`estimateMarket` wired; `projectBidVsPass` built,
orphaned), the whisper panel (5 lights + board + verdict + room-relation), `PlayerInstanceCard` ratings grid,
the farm hidden-rating gate, the per-league override pattern.
**BUILD (the gap), sequenced:**
- **B1 (fast, highest-value): whisper truth-up** — YOUR NUMBER → value-anchored (§4.1); wire `projectBidVsPass`
  as the bid-vs-pass view + fix its unsignable-target filter (§4.2); fix the FULL BOARD CSS clip (§4.3). Engine
  math exists → mostly wiring + one bug.
- **B2: GM per-position drag-reorder (strong nudge)** — the RosterDesigner reorder UI + `rankOverrides` store
  (per-league team layer) + `gmPreferenceWeight` in the fit-optimizer (§3.2/3.3); carry into the draft (§2B).
- **B3: auto-advance** — re-fit-on-sale honoring rankOverrides (§3.4); surface the promoted target in the whisper.
- **B4: posture-controlled value↔chem weight** in the optimizer (§3.3).
- **B5: MLB player-profile inspect** (§4.4).
- **B6 (parallel, not draft-UI): scout farm bands from archetype** (V1_BUILD_STATUS S4 — separate).
Each slice: Codex builds → Opus audits (builder≠auditor) → gate → JK browser sign-off.

## 6. ACCEPTANCE + KNOWN BUGS TO CLEAR
- YOUR NUMBER never equals the affordability ceiling on a value pick; equals the value/market number.
- The FULL BOARD toggle reveals the rest of the board (no CSS clip).
- The bid-vs-pass projection renders both branches and NEVER lists a legally-unsignable target (C2B F3 fixed).
- A GM drag-reorder measurably moves the fitted board toward the GM's order (strong nudge), but a clearly-superior
  cheaper fit can still override (assert both).
- On a sale of the GM's #1 at a position, the #2 becomes the live target (auto-advance).
- Posture flip visibly shifts the value↔chem mix.
- The whisper shows a live per-type chemistry readout (5 categories: Competitive/Crafty/Disciplined/Scholarly/
  Spirited) with counts + potency tier (L1<3 / L2≥3 / L3≥7) + distance-to-next; the candidate on the block shows
  the delta (what claiming him does to his type's count/tier). [build: folds into the whisper work, B1b/B2.]
- Farm profile NEVER shows true ratings.
- Full test suite at CURRENT_STATE baseline; no ivCurves/oracle/GameTracker touched.
