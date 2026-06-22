# MODE-1 AUCTION REBUILD — BATCHED JK BACKLOG

**Purpose:** the SINGLE consolidated list of everything parked for JK on the Mode-1 auction
stream (AUC-5.1 + the RB rebuild) — browser-verify scenarios, code deferrals, and open
design decisions. Batched per the SESSION_RULES "Batched browser verification" rule:
none of these block the build loop; the **browser-verify batch CLEARS before the
D0 / flag-flip / iPad-playtest gate (F-141)**. Updated as new RB tickets land.

**Last updated:** 2026-06-21 (RB-1 SPLIT + RB-1b chemistry-fit model RULED [DECISIONS_LOG 2026-06-21]; RB-1a dispatched. After RB-0 complete: RB-0a `edb94d31` · RB-0b-2 `16ca8d61` · RB-0b-1 `fde093ed`).
**Scope:** Mode-1 auction rebuild ONLY. The Mode-2 L-stack (L1–L14) has its OWN separate
post-D13 flag-flip browser batch — tracked in the L-stack section of CURRENT_STATE/the ledger, NOT here.

---

## A. BROWSER-VERIFY OUTSTANDING (batched — JK's sole real-world acceptance gate)

> The whole auction surface is build-DARK (behind routes / mid-rebuild). Per the rebuild plan the
> WHOLE surface gets JK sign-off AFTER the rebuild, not piecemeal. PERSISTENCE / saved-shape items are
> PRIORITIZED (a deferred data-corruption discovery costs more than a visual one).

| # | Priority | Scenario | From |
|---|---|---|---|
| **BV-1** | 🔴 persistence | A real `kbl-league-builder` DB migrates **v7→v8** with NO data loss; **mid-draft resume** restores the in-progress auction session faithfully. | AUC-3.1 |
| **BV-2** | 🔴 persistence | A real draft stamps all **3 personality axes** (a 7-type personality spread — no longer 100% 'Competitive' — + 4 hidden modifiers + target-balanced chemistry) onto league players; they **persist** and **carry into the franchise** (via `deepCopyLeagueToFranchise`) into Mode-2; the franchise-init hidden-modifier backfill is a **no-op** (players already have modifiers). | **RB-0b-1 (new)** |
| **BV-3** | 🟡 visual | The **WHOLE auction surface end-to-end** (subsumes all AUC-5.1-era surface items): MLB + farm auction, §2 OPEN_BIDDING round-robin turn view, the persistent "Now: [TEAM] — [action]" banner + single-iPad hot-seat handoff (CPU turns never hand off), engine nomination + one-chance flow, SOLD/PASSED notices, the scout **price-range + 20–80 grade** display (§3.3, covered-by-default + long-press reveal), the roster board, raise presets + claim-at-reserve, the MLB→farm "Proceed to Farm Auction →" link, names-not-IDs, and the 4-number freeze → Mode-2. | AUC-4.x/5.1 + RB-1/9/11 |

---

## B. CODE DEFERRALS (parked work — re-pick when relevant)

| # | Item | Why deferred | Follow-up |
|---|---|---|---|
| **D-1** | Tighten `PlayerData.chemistry: string` → the 5-literal `ChemistryCode` union | Blocked: ~440 Title-Case entries in `ALL_MLB_PLAYERS` (typed `PlayerData[]`) would break; needs a data-normalization pass to 3-letter codes FIRST. (Or leave `chemistry` loose.) | RB-0a-2 (data normalization) |
| **D-2** | Consolidate `ovrCalculator.normalizeChemistry` / `CHEMISTRY_ABBREV_MAP` into the canonical module | Frozen-OVR/grade-oracle-adjacent — a behavior shift would touch the IV/grade oracle. | only with a byte-identical OVR-output proof |
| **D-3** | A `regeneratedAt` guard so `initAuction` skips re-regen on resume | Idempotent-by-seed today (re-run re-writes identical values) → correctness is fine; this is a resume-perf optimization only. | optional, anytime |
| **D-4** | The league-setup **FORMAT-PICKER UI** (auction-default vs snake) | AUC-5.1d-3 landed the `draftFormat` field + reader; the picker UI is the deferred follow-up. | RB-13 |
| **D-5** | `POSITION_POOL` SP/RP gap | The prospect generator's `POSITION_POOL` (`prospectScoutingDraftEngine.ts` ~:252) needs SP/RP added + corrected weights. | RB-14 |
| **D-6** | Farm Opening/reserve still derives from true IV (`reservePriceCurve(ivPct)×iv`, `auctionStateMachine.nominatePlayer`) — a secondary back-solvable IV leak the RB-1a band re-anchor does NOT close. | RB-1a is the DISPLAY re-anchor only; obscuring the reserve/opening touches the shared state machine. | **RB-2** (nomination/reserve rework already touches it). |
| **D-7** | Per-bidder scouted GRADE (§3.6: rival scouts genuinely disagree on the letter, not just band width). RB-1a re-anchors the band CENTER per-bidder but still displays the single stored `scoutedGrade` + its 20–80. | Per-bidder grade plumbing belongs with the scout-privacy reveal surface. | **RB-11** (scout-privacy UI). |
| **D-8** | **RB-9 MUST consume the chemistry value BIDIRECTIONALLY** (JK 2026-06-21). The in-season recommendation engine must value both a call-up's chemistry ADD (level-up/buffer) AND a send-down's chemistry REMOVE (a category dropping below a tier floor = a COST) — not one-directionally. RB-1b ships the bidirectional pure primitive `marginalChemistryValue(count, 'add'\|'remove')`; RB-9 must use the `'remove'` direction for send-down move costs. | RB-1b only needs the `'add'` direction for the draft scout price; the `'remove'` consumer is the season recommender. | **RB-9** (scout-as-bridge + roster board) — reuse the RB-1b primitive, do NOT re-derive. |
| **D-9** | RB-1b second-order refinements: (i) per-trait amplification of the prospect's OWN traits by the roster (literal DECISION-2 per-trait); (ii) weight the level-up by N = existing roster traits of the category (§7.3 "upgrades N existing traits"). | v1 uses the prospect's chemistry-category marginal value (the dominant §7.3 effect); these refine the magnitude. | RB-16 sim-tune / a fast-follow. |

---

## C. OPEN DECISIONS / FLAGS (async JK rulings — non-blocking; AUTH-4 defaults taken meanwhile)

| # | Decision | AUTH-4 default taken | Notes |
|---|---|---|---|
| **O-1** | `draftFormat` default for NEW leagues | `snake` (back-compat) | VISION §9.A makes AUCTION the v1 PRIMARY → JK may want NEW leagues to default `auction`. |
| **O-2** | Shill sim-tune (AUC-2.2) | conservative defaults, commented sim-tune | `bargainInterestCurve` + the sniper/spender/zealot shill profiles. |
| **O-3** | Bid-rotation order (AUC-4.2) | (current) | nominator-first vs team-after-nominator sub-fork — both terminate; shifts the CPU bid sequence. |
| **O-4** | Raise presets (AUC-4.1b) | start at `minBid + 1×increment` (no bare-minimum one-tap) | confirm, or add a min-tap preset. |
| **O-5** | Resume persistence shape (AUC-3.1) | persist the WHOLE serialized session blob (lossless) | confirm the default. |
| **O-6** | Prospect age generation (B8) | (current) | §10 "drop the age" — the generator age handling. |
| **O-7** | `CHEMISTRY_TARGET_DISTRIBUTION` shares (RB-0a) | JK's rounded `.21/.20/.20/.20/.19` (sums to 1.0) | within tolerance of the measured 21.14/18.86 source — honors JK's exact 2026-06-21 ruling. Informational. |
| **O-8** | FA chemistry form (RB-0a) | FAs excluded from the target/regen | The spec note "FAs carry full-word chemistry" was WRONG — FAs use 3-letter codes too. Informational correction. |
| **O-9** | RB-1b same-chemistry-COUNT → potency-TIER thresholds (how many same-chem teammates → L1/L2/L3) | Captain conservative default at RB-1b build + sim-tune (RB-16) | Model already RULED per-trait-count / 3-tier / perception-layer (DECISIONS_LOG 2026-06-21); only the numeric count→tier cut-points stay open. JK may pin them; else the documented default stands. |

---

## How this clears
- **Browser-verify (A):** JK does the batch on real franchise data; PERSISTENCE items (BV-1/BV-2) first. Must clear before D0 / the flag-flip / iPad playtest.
- **Deferrals (B):** picked up as their follow-up RB tickets come due (D-4=RB-13, D-5=RB-14) or opportunistically (D-1/D-2/D-3).
- **Open decisions (C):** JK gives a one-line ruling per row whenever; the Captain folds each into the relevant RB ticket. Until then the documented default stands.
