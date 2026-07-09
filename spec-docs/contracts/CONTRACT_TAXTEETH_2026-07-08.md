You are a builder lane on KBL Tracker (React+TS+Vite). Work ONLY in your assigned worktree on its branch; commit there; do NOT push or merge. An independent auditor reviews after. If node_modules missing: `cp -c -R /Users/johnkruse/Projects/kbl-tracker/node_modules ./node_modules`. Your branch is off main @ 88c34d30 (includes the CALLFIX merge — the LIVE CALL ladder and whisper TRUE COST are in your base).

FIRST COMMIT: write this entire prompt verbatim to spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md and commit before any code change.

═══ LANE: TAXTEETH — the luxury tax gets real teeth in the auction (JK RULING 2026-07-08) ═══
JK ruled (recorded decision): the luxury tax must actually drain budget during the auction. Today it is display-only — the whisper shows TRUE COST (salary + marginal tax) but settlement subtracts SALARY ONLY, and the bid ceiling passes a literal 0 for tax — so a tax-exposed team bids exactly like a clean one. Confirmed in the wiring audit (spec-docs/COCKPIT_WIRING_AUDIT_2026-07-08.md §2 row 10, §4).

READ FIRST: src/engines/auctionLuxuryTax.ts + src/engines/__tests__/auctionLuxuryTax.test.ts — this engine IS the canonical tax math (it already powers the whisper's TRUE COST line; it is the SINGLE SOURCE — you write NO new tax formulas). Also read the tax threshold/constants mentions in spec-docs/DRAFT_ECONOMY_RESET_2026-07-05.md and spec-docs/MODE_1_V1_RECONCILIATION_AND_DECISION_WORKSHEET.md. If the engine's constants and any spec doc CONFLICT, STOP and report — do not pick a side.

═══ ITEM 1 — Settlement charges the tax (repro-first MANDATORY) ═══
FIRST the failing test against unmodified code: drive a team past the tax threshold in an auction session, win a lot, assert the team's remaining budget dropped by salary + marginal tax — it will fail today (salary only, settlement at src/engines/auctionStateMachine.ts:~882). Run it, capture the failure into the contract. THEN fix: settlement computes the marginal tax for the winning acquisition via the auctionLuxuryTax engine (same call shape the whisper TRUE COST path uses — find it and share code, do not duplicate) and drains salary + tax from the team's remaining auction budget. Edge cases to test: team below threshold before AND after (tax = 0, budget math byte-identical to today); acquisition that CROSSES the threshold (marginal tax on the crossing portion only, exactly as the engine defines); already-deep-in-tax team (full marginal rate); reserve-price pass-outs and SET_ASIDE dispositions charge nothing (unchanged).

═══ ITEM 2 — The bid ceiling becomes tax-aware ═══
sessionBidCeiling → auctionMaxBid currently passes tax = 0 (auctionStateMachine.ts:~378). Fix: a bid B is only allowed if the team could actually SETTLE it — budget >= B + marginalTax(B, team's current payroll state). Use the same engine call; no new math. Consequences to verify and test: (a) human bid buttons/validation inherit the corrected ceiling; (b) CPU/shill bidders that consume sessionBidCeiling inherit teeth automatically — verify they do consume it (trace their bid logic; if any CPU path uses a DIFFERENT ceiling, STOP and report, do not fork behavior silently); (c) the whisper's liquidity maxBid (src/engines/liquidityAwareBidding.ts) — trace whether its budget ceiling already folds tax via its own inputs; if it would now DISAGREE with the settle-ability ceiling, reconcile so the advisor never recommends a bid the floor would reject (one-ceiling law F9: the whisper's suggestedMaxBid remains THE displayed ceiling; it must be <= the hard settle-ability ceiling). Add an invariant test: for a taxed team, suggestedMaxBid never exceeds the largest B with budget >= B + marginalTax(B).

═══ ITEM 3 — Coherence proof (TRUE COST === what actually happens) ═══
One test that runs the full loop: whisper shows TRUE COST for a price; team wins at that price; budget drop equals that TRUE COST exactly. This is the honesty guarantee JK is buying.

═══ ITEM 4 — Economy measurement evidence (bounded) ═══
If a runnable draft-economy measurement harness exists (check spec-docs/ECONOMY_MEASUREMENT_2026-07-07.md and test-utils/ for a script — e.g. a histogram/simulation leg), run it once on base and once with your change and put the comparison (spend distributions, tax incidence) in the contract file. If no runnable harness exists or it needs >15 min, SKIP and say so explicitly — do not build one.

═══ OUT OF SCOPE ═══
Farm floor stays tax-free (audit-confirmed deliberate). No whisper copy changes beyond what Item 2's reconciliation strictly requires. No tax constant/threshold changes — the engine's ratified numbers stand. No offseason/franchise tax surfaces.

═══ GUARDRAILS ═══
This is ECONOMY-CRITICAL: every behavior change must be test-locked, and the no-tax case (teams under threshold — the vast majority) must be provably byte-identical (assert exact budget numbers, not just "close"). The auction is per-pick persisted (saveAuctionSession) — if settlement's stored shape changes (e.g. recording tax paid), check the resume/crash-recovery path deserializes old sessions cleanly (a mid-draft save from BEFORE this change must load and continue — write a back-compat test if you touch the stored shape). Existing data-testids stable.

═══ GATES (paste real outputs into the contract) ═══
1. npx tsc -b clean; 2. npm run build exit 0; 3. Focused suites: auctionLuxuryTax, auctionStateMachine, liquidityAwareBidding, rosterIntelligencePayload, WhisperPanel, LeagueBuilderAuctionDraft, LeagueBuilderFarmAuctionDraft (must be UNCHANGED-green — farm is out of scope), plus any session-persistence suite you touch. NOT the full vitest suite (captain runs it post-merge).

═══ DELIVERABLE ═══
Contract-first commit; Item 1's failing-repro commit BEFORE its fix; logical commits per item; final commit updates the contract with per-item file:line evidence, repro fail→pass output, gate outputs, measurement results (or the explicit skip), and honestly-flagged deviations. Final message: summary + commit hashes + surprises. Any UNKNOWN or spec/engine conflict = STOP and report.
