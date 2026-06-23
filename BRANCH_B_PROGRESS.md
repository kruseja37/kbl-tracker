# BRANCH B PROGRESS LEDGER (Mode-1 parallel lane — `codex/mode1-v1-b`)

> Branch-only ledger for the parallel Mode-1 build thread (kickoff: `BRANCH_B_KICKOFF.md`).
> One committer per branch. Read top-to-bottom; newest entries at the bottom.
> At session end, JK relays the completion summary (tickets + SHAs + suite counts) to the
> Branch-A captain for central logging + the eventual lane-merge.

**Branch baseline:** sole characterized fail = `wpaRuntimeBoundary` (the suite has order-flakes;
re-run any suspected new red SOLO before judging it real). Pre-thread HEAD = `7d817965` (B12).

---

## 2026-06-23 — Thread start (B6)

### ✅ B6 — retire orphaned `traitPools.ts` — COMPLETE (`baeb9534`, branch-only, ZERO NEW REDS)

**Grounding finding (the ticket was ~90% already-satisfied in the canonical mode1-b generator):**
- **Position-appropriate carve-outs — already correct/moot.** `POSITION_PRIMARY_WEIGHTS`
  (`prospectScoutingDraftEngine.ts:278`) draws only the 8 fielders + {SP, SP/RP, RP, CP} —
  **no DH, no Two-Way primary** (RB-14 + §15.E). The binary `isPitcher ? PITCHER_POOL : HITTER_POOL`
  split (`:1285`) is therefore position-appropriate per `TRAIT_INTEGRATION_SPEC §5.2` for every
  generatable position: fielders → Hitting/Baserunning/Fielding pool; pitchers (incl. CP) → Pitching
  pool. Two-Way = pitcher-only-traits (DECISIONS_LOG:636) is already what the code enforces.
- **`Workhorse` — already correct.** JK-confirmed **pitcher-only** (DECISIONS_LOG Q9), present only in
  `PROSPECT_PITCHER_TRAIT_POOL` and priced in `traitPricing.ts:478` + `traitInteractionMatrix.ts:842`.
  The spec's "not in the trait registry" is **stale** (written vs the old kbl-tracker copy).
- **Orphan retire — the one real action (done).** `src/data/traitPools.ts` had no live importer; its
  only consumer was the dead, tsc-excluded `src/archived-components/awards/TraitLotteryWheel.tsx`
  (itself unreferenced). Deleted both (963 lines) so no dangling import remains. Git history preserves them.

**Deferred / flagged (NOT done here — out of Branch-B v1 scope):**
- The substantive prospect-trait pool work — roll from **all ~75 traits except Sign Stealer + Stimulated**,
  **scarcity-weighted**, **Two-Way rare-not-excluded** (DECISIONS_LOG 2026-06-23, supersedes spec §5.5's
  "positive/neutral only") — is **B13**, coupled to Branch-A **T-4**'s shared `traitWeight`. The kickoff
  lists B13 as DO-NOT-TOUCH; the pool expansion cannot be done without B13's weighting (else the
  most-valuable Two-Way traits would appear at uniform frequency instead of rare). Left for B13.
- **Spec-reconciliation pending (JK-flagged, DECISIONS_LOG:225):** `PROSPECT_GENERATION_SPEC.md`
  §3.4/§5.5/§15.B still mandate positive-only at generation — superseded by the negatives-in ruling but
  not yet folded into the spec. (Branch-A docs task; noted for the merge.)

**Gate (independent):** `NODE_ENV= tsc -b` → 0 · full suite **8074 pass / 1 fail (500 files)**, sole fail
`wpaRuntimeBoundary` (characterized) = **ZERO NEW REDS**. No `trackerDb` bump; no `iv_oracle.json` change.

**JK decision:** approved "delete the dead file" (attended, 2026-06-23). B6 closed.

**Next:** Scouting v2 lane (Queue B-W2) — **S1/S2** scout-draft phase + specialties — the next substantive
Branch-B item (serializes on `prospectScoutingDraftEngine.ts`; real logic → Codex-built / Opus-audited).
