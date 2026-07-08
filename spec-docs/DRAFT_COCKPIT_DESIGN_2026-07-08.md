# THE DRAFT COCKPIT — Asst GM 10x Design

**Date:** 2026-07-08 · **Author:** Fable (captain, UI/UX authority per JK 2026-07-02 mandate)
**Status:** RATIFIED — JK 2026-07-08 ("good ideas on the draft cockpit: ratify"). §4 forks resolved per captain recommendations. Amended same day with the farm-bridge directive (§2.5) from JK's ratification message.
**Grounding:** three-tracer ground-truth sweep 2026-07-08 (spec archaeology / live-UI inventory / intelligence-engine menu). Every claim below is file:line-verified by that sweep; this doc cites the load-bearing ones only.

---

## §0 Why — JK's walkthrough verdict, translated to root causes

JK 2026-07-08: Asst GM feels half-baked, text-heavy, statically calculated; no archetype/tax guidance; no position rankings; no live adjustability; drag-and-drop ranking "lost"; won players not clickable.

Root causes found:
1. **The math is live, the presentation isn't.** The whisper recomputes every bid tick (`LeagueBuilderAuctionDraft.tsx:988` useMemo on session), but renders ~200–230 words / 35–45 same-weight lines per lot inside a default-collapsed panel (`WhisperPanel.tsx:105`). The best signal is the most buried.
2. **The ratified spec's back half was never dispatched.** `ASST_GM_DRAFT_INTELLIGENCE_SPEC_2026-07-04.md` (JK-ruled) calls the GM-sortable global + per-position board "the CORE value of the Assistant GM." B1/B2/B5 landed; **B3 (live board + auto-advance honoring rankOverrides) and B4 (posture dial) have no contract, no commit** (PROMPT_CONTRACTS ends at CODEX-B2B-RANK-DRAG-UI).
3. **Drag-to-rank isn't lost — it's marooned at setup.** RosterDesigner.tsx:1141–1187 (commit 7b5214ca) has full drag + arrow ranking, persisted to `rosterDesign.rankOverrides`, feeding `buildBest22Target` — but it's 3–4 clicks deep and **never reaches the live floor**: `assembleBoard` (rosterIntelligencePayload.ts:366) takes no rankOverrides.
4. **Tax is computed and thrown away.** `computeAuctionTeamProjectedTaxWithCaps` runs live per lot (`useAuctionDraft.ts:251` → `team.projectedTax`) and **no renderer reads it**; `auctionMarginalTax` (auctionLuxuryTax.ts:59) is built + tested with **zero callers**. Open ticket RB-3 confirms.
5. **Dead/dishonest surfaces.** BALANCE light is a hardcoded "Balance read coming." stub on every lot forever (rosterIntelligencePayload.ts:684). The farm whisper is mostly boilerplate: no board, no bid-vs-pass, no chemistry readout, 4 of 5 lights stubbed (FarmWhisperAssembly, rosterIntelligencePayload.ts:740; farm payload LeagueBuilderFarmAuctionDraft.tsx:490).
6. **Won players are inert text.** RosterSlotVM (AuctionStage.tsx:94) carries name strings only; `PlayerProfilePopover` is already used 3× on this same screen — the fix is one `player` field per VM + wrapping (playerById maps already in scope both pages).

**Free wins discovered:** `nominationOdds` (auctionMarketModel.ts:613) — closed-form P(next)/P(within-K), fully tested, **zero production callers**; `gradeBandPrice.ts` — "build-dark, no consumer yet" by its own header; chemistry synergy is ALREADY wired (P4 2026-07-08 — supersedes the 07-02 "unwired" finding).

---

## §1 Design principles (binding for all cockpit lanes)

1. **The 5-second rule.** A GM must be able to act on Tier 1 alone, mid-bid, in under 5 seconds. Depth is opt-in, never default.
2. **No new math.** Every number comes from an existing, tested engine. This wave is promotion, wiring, and finishing ratified spec items — accuracy cannot drift because nothing is re-derived.
3. **One ceiling.** Every new displayed number that involves affordability reads `worthToYou.suggestedMaxBid` — never a second `completionBidCeiling`/`capValue` call. (F9 ruling 2026-07-08 comments in rosterIntelligencePayload.ts:222/435/592/635 document the duplicate-ceiling bug class.) Each cockpit lane adds a regression test asserting displayed numbers share the single source.
4. **Honest surfaces.** No light, chip, or line renders unless its engine read is real for that tier. Dead stubs are removed, not decorated.
5. **Shared components** (JK Correction 7, 2026-07-04): popover and rank-reorder are the SAME components at setup and on the live floor.
6. **Every visible line must change with the lot or die.** Static boilerplate goes behind Help.
7. **Farm privacy holds.** All farm surfaces route through the existing scout-band gate (`draftProfileModel.shouldReveal`, ratingRevealState) — bands only, never true ratings.
8. **Nothing team-generic above the fold** (JK ruling 2026-07-08): any content that reads identically for every team's Asst GM is clutter — "users will look at the generic stuff once and never again." Every default-visible element must be conditioned on THIS team's roster and situation; generic explainers live behind Help only.

---

## §2 The three-tier cockpit

### Tier 1 — THE CALL (always visible on the stage, zero taps)
One verdict strip replacing the collapsed-whisper-first posture:
- **VERDICT word** (PUSH / VALUE / CAP $X / WALK) — existing liquidityAwareBidding verdict.
- **YOUR NUMBER** and **TRUE COST**: `bid + auctionMarginalTax` rendered as one figure — "$40K (really $52K after tax)". Sources: team.projectedTax (already live) + auctionMarginalTax (RB-3). Tax line renders only when marginal tax ≠ 0.
- **FIT chip** (existing archetype ±% + identity color).
- **ONE reason phrase** — the top-priority reasonCode only (the other 11 move to Tier 2 tap-through).

### Tier 2 — THE READ (one glance below, no taps)
- **Bid-vs-Pass** promoted out of the collapsed panel to a permanent two-row readout (it is the killer feature; today it's hidden).
- **WAIT/CHASE chip** — `nominationOdds`: "Next CF: ~72% within 3 lots" — directly answers *chase this one or wait*. Zero-caller engine, pure math, sub-ms.
- **Grade sanity chip** — `gradeBandPrice`: "Normal for a B+: $35–55K."
- **Lights become icons.** SHAPE / IDENTITY / CHEMISTRY / BUDGET as four color-state icons, sentence on tap. **BALANCE light is REMOVED** until the HANDEDNESS-SIGNAL constants spec exists (Fable authors separately; §5).
- Word budget for Tiers 1+2 combined: **≤ 60 words**.

### Tier 3 — THE BOARD (one tap, persistent open-state per session)
Finishes ASST_GM_DRAFT_INTELLIGENCE_SPEC B3 + Corrections 5/7 exactly as JK ruled:
- **Global big board + per-position lists 5-deep**, both views toggleable.
- **GM-sortable live** using the SAME drag/arrow component as RosterDesigner (shared, not forked), reading and writing the SAME `rankOverrides` store — setup order carries in, in-draft nudges persist back.
- **Auto-advance / re-fit-on-sale (B3):** on every sale, recompute availability, promote the GM's next-ranked target per position, re-run fit, and surface the promoted target as a single Tier-2 line ("Next up for CF: Ramírez — your #2").
- `assembleBoard` gains a `rankOverrides` parameter; GM order is a strong nudge blended with worth (spec S3.4 semantics via `gmPreferenceWeight`, same as best22Target:168).

### Cross-cutting — clickable everything (extends WT-D)
`PlayerProfilePopover` wraps: roster-board won-player names (RosterSlotVM + `player` field), overflow rail, **lot log** (LogItemVM gains playerId), and the **farm on-the-block name** (farm lot VM gains `player`, band-gated). Pattern proven at AuctionStage.tsx:552.

### §2.5 Farm cockpit — the MLB bridge (JK directive at ratification, 2026-07-08 — BINDING)
JK: the farm auction must NOT feel like the MLB auction — fog is the point. The farm Asst GM's core value is **bridging the 22-man MLB roster with the farm board**: *"who should we go after given who we have sitting in front of them at the MLB level."*
- **Coverage-aware positional need.** Recommendations must reason about secondary positions and flexibility. JK's canonical examples: a star SS who can play IF/OF (Utility-class, e.g. Handley Dexterez) → be MORE open to drafting a dedicated SS prospect, because the star covers everywhere else; a pure SS with no secondary (Ozzie Smith type) → do NOT recommend SS early and never overpay for one; a weak bullpen → aggressively chase the best highly-scouted RP/CP on the board.
- **Chemistry bridge.** Surface how a prospect's chemistry would fit the MLB roster's chemistry profile (candidates: `chemistryFitValue` / `chemistryAdviceForCandidate` run against the MLB roster, fog-respecting).
- **Scout confidence stays archetype-tilted** (existing farmArchetypeScoutConfidence): the scout grades best what aligns with the chosen farm archetype. The bridge prioritizes targets THROUGH the fog; it never sharpens the fog itself.
- **Anti-generic rule applies doubly here** (principle 8): the current farm whisper's permanent stubs and boilerplate are exactly the look-once-never-again clutter — deleted, replaced only by team-conditioned reads.
- **GROUND-TRUTH RESULT (tracer, 2026-07-08 — gate cleared):** JK's "we have this already" is MOSTLY TRUE. Verified: (i) need math IS coverage-aware — `canCover`/`depthReport`/`rosterNeedBreakdown` (rosterConstruction.ts:113/:176, rosterNeed.ts:147) honor `secondaryPosition` including group values (`IF/OF` etc. — the Handley encoding), and the in-season call-up/send-down advisor runs the SAME shared engine; (ii) the MLB roster is ALREADY in scope on the farm floor and already drives the board's PRIORITY GAPS text line (LeagueBuilderFarmAuctionDraft.tsx:380-437, RB-9c-3b); (iii) the MLB roster's chemistry-family counts are already computed on the farm hook and never read (useFarmAuctionDraft.ts:206-230) — `chemistryFitPriceMultiplier` (chemistryFitValue.ts:50) takes exactly that shape, pure wiring; (iv) the hard-deficit price bump (`ownNeedMultiplier`, auctionMarketModel.ts:398) is proven on the MLB whisper and slots into `assembleFarmWhisper`'s existing `needMultiplier` input (rosterIntelligencePayload.ts:765) — one ceiling preserved. THE ONE GAP (sanctioned principle-2 exception, confirmed): the thin-vs-covered signal only ever becomes a SENTENCE today, never a NUMBER — W1d builds one small bounded `depthAwareNeedNudge(depthReport, position)` multiplier (clamp pattern per liquidityAwareBidding.ts:81) so the SS example has teeth. Note: the `Utility` TRAIT governs out-of-position ratings penalty only and feeds no coverage math (except optimalLineup.ts:595) — coverage comes from `secondaryPosition`; the W1d contract must not conflate them. Farm SHAPE light un-stubs for free once mlbNeed/depthReport are computed per lot.
- Carried from the honesty pass: real farm board (prospects ranked by scouted value-range midpoint, fog-respecting) killing the "board's bare" boilerplate (WhisperPanel.tsx:60); lights on farm render ONLY BUDGET + SHAPE; chemistry-fit chip ships dark-first (fork 3, RESOLVED YES).

### Setup discoverability
The existing shortlist rank control stays where it is but gets a first-class entry: a "RANK YOUR BOARD" affordance in the Draft Setup flow (zone 4) jumping straight into RosterDesigner's shortlist, plus one hint line on first draft entry. No new ranking surface at setup — the built one surfaces.

---

## §3 Build waves & lane partition

**Wave 1 — wiring + presentation (no engine changes; fastest visible 10x):**
W1a: Tier-1 verdict strip + TRUE COST tax line + single-reason discipline. W1b: Tier-2 promotion (bid-vs-pass out of collapse, nominationOdds chip, gradeBand chip, lights→icons, BALANCE removal, ≤60-word budget). W1c: popovers-everywhere (absorbs WT-D). W1d: farm honesty pass (real farm board, stub removal).
SEQUENCING (as-executed at ratification): W1c dispatched first (WT-D lane, in flight). W1a+W1b run as ONE lane (shared files: WhisperPanel + rosterIntelligencePayload + LeagueBuilderAuctionDraft) dispatched after WT-D lands (same-page overlap). W1d (farm bridge, §2.5) dispatched after the ground-truth tracer reports AND W1a/b lands (shared rosterIntelligencePayload.ts).

**Wave 2 — the board (B3 + Corrections 5/7):** shared rank component extraction → assembleBoard rankOverrides → global/per-position views → auto-advance-on-sale. Single lane; heaviest UI work; browser-walk gated.

**Wave 3 — gated on JK:** posture dial (B4) — value↔chemistry weight control, most design-sensitive, Fable specs the dial semantics first. Wrong-fit penalty Option A (P9) stays an ECONOMY lane, not a cockpit lane; the cockpit reserves a Tier-1 slot for its debit display when it lands.

**Deferred explicitly:** HANDEDNESS-SIGNAL constants spec (Fable-authored, then BALANCE returns); live budget-pace readout (Lever C — parked v1.1 per DRAFT_ECONOMY_RESET); in-season chemistry removal advice (earmarked for the in-season analyzer, out of draft scope).

**Gates per lane:** tsc + build + focused suites + opus adversarial audit + captain merge; full vitest once per wave on the merged tree; JK browser feel-pass closes each wave (sole acceptance gate).

---

## §4 Forks — RESOLVED at ratification (JK 2026-07-08, per captain recommendations)

1. **BALANCE light removal until the handedness spec lands** — RESOLVED YES (honest surface beats a dead promise).
2. **Wave 3 posture dial** — RESOLVED PARK until Wave 2 is felt in-browser; the dial modulates a board the GM hasn't met yet.
3. **Farm chemistry-fit chip** — RESOLVED YES, build-dark first, JK feel-gates.

*(SOT updates on ratification: V1_BUILD_STATUS §5 refresh — its S5 body is stale per the sweep — and UI_TRUTH_MAP rows for the whisper/stage. Scribe books.)*
