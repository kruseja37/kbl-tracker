# OPUS AUDIT — CP Valuation Analysis (Codex xhigh)

**Date:** 2026-07-04 · **Auditor:** Opus (builder=Codex, auditor=Opus — triangle honored)
**Audits:** `spec-docs/CP_VALUATION_ANALYSIS_2026-07-04.md`
**Method:** 7-agent adversarial verification workflow (wf_d6aa99d1-a0c) — each verifier read the actual code and returned CONFIRMED / PARTIAL / REFUTED with file:line evidence.

---

## Verdict summary

| Claim | Codex asserted | Audit verdict |
|---|---|---|
| V1 rosterConstruction | `canRelieve` treats RP/CP/SP-RP identically; `isLegalRoster` has no closer minimum | **CONFIRMED** |
| V2 poolFromDemand | repair/reservation collapses CP into generic `rp`/`canRelieve` | **CONFIRMED** (demand-level `cellKeyOf` *can* carry a `cp` preference, but the reservation/repair execution layer does not) |
| V3 draftPoolExtractor | single generic `relievableArms` bucket ranked by IV → cheaper RP chosen over CP; no CP floor | **CONFIRMED** |
| V4 rosterDesignFeasibility | 4 generic RP slots, closer seat uses generic eligibility, no CP slot | **PARTIAL** — conclusion correct (no dedicated closer slot; seats accept CP among roles) but Codex mislabeled the mechanism as `canRelieve`; it is actually **inline role checks** (`role==='RP'||'CP'||'SP/RP'`). Line numbers loosely approximate. |
| V5 best22/archetypeSim/auctionBoard | bullpen seats generic RP1–RP4; RP+CP grouped as bullpen; no dedicated closer seat | **CONFIRMED** |
| V6 rosterNeed/auctionMarketModel | RP+CP fused into one `pureRelief`/bullpen-deficit hard requirement | **CONFIRMED** |
| V7 valuation ratio | CP 0.65×, RP 0.55× (ratio 1.18×); "1.18 < 1.27 pure-leverage benchmark ⇒ usage cap already discounted"; 0.67–0.68 in-band | **PARTIAL** — see below |

## The two findings that change the story

**1. The roster-construction squeeze is REAL and pervasive — this is the load-bearing, fully-confirmed conclusion.**
CP and RP are interchangeable at *every* selection layer (legality, pool demand/repair, structural floor, BEST-22, balance sim, auction board, need/market). Because each layer ranks a shared bullpen bucket by IV, the cheaper reliever is chosen before the pricier closer, and with no requirement forcing one in, closers can be excluded from the pool entirely. **A price change cannot fix this** — only a structural rule (require ≥1 CP + a dedicated, non-substitutable closer slot across those layers) will.

**2. Codex's PRICE justification does not survive audit — but the "keep 0.65" recommendation still stands, for a cleaner reason.**
- Numbers CONFIRMED: CP anchors = 0.65×SP, RP = 0.55×SP (ratio **1.18×**); CP acceptance band **[0.60, 0.70]**, so 0.67–0.68 is in-band.
- Reasoning UNSUPPORTED: the **"1.27× pure-leveraged-innings benchmark" appears nowhere** in the design doc or code — the doc's own leverage math implies ≈**1.20×** (0.6×SP / 0.5×SP). So the implemented 1.18× is essentially *at* the doc's leverage number, not a meaningful discount below a (non-existent) 1.27×. Furthermore the **SMB4 last-two-innings usage cap is not modeled in the pricing at all** — it is neither "already discounted" nor otherwise represented.
- **Corrected read:** 0.65 is a fair leverage/innings-based price. The two forces JK named — the last-2-innings usage limit (pushes CP value *down*, unmodeled) and closer scarcity (pushes *up*, unmodeled) — point in opposite directions and roughly offset, which is why "maybe we've got it right" is defensible. Keep 0.65; a nudge to 0.67–0.68 (to lean into scarcity) is optional and in-band, and would be a future IV oracle re-bless.

## Recommendation to JK
- **Price:** keep CP at 0.65 (defensible; the missing usage-cap drag and the missing scarcity premium offset). Optional in-band nudge to 0.67–0.68 if JK wants scarcity leaned into — future re-bless.
- **Real fix = roster construction:** require ≥1 closer per team + a dedicated closer slot in the pool and board so an RP cannot be substituted. Sizeable, multi-layer build (rosterConstruction, poolFromDemand, draftPoolExtractor, rosterDesignFeasibility, best22Target, archetypeBalanceSimulator, auctionBoardFrame, rosterNeed, RosterDesigner) — the "require a closer" item JK had earlier flagged/deferred. Interacts with archetype re-band + pool affordability.
