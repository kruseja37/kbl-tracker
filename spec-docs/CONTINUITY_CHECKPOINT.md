# CONTINUITY CHECKPOINT — v1 push

**The one doc a cold-start successor reads to resume, with zero chat context.** Repo: `/private/tmp/kbl-port2`, branch `main-track` (tracks `origin/main`). Refreshed by a scribe pass at HEAD `46ebc2aa` (2026-07-08 — NIGHT COMPLETE, walkthrough-ready, awaiting JK's morning check-in; F20 landed post-close-out as the 18th lane merge, F22 ticketed as its residual).

## 0. How to use this doc + the update rule

Read this doc first, then `spec-docs/V1_CANON_2026-07-07.md` (definition + §6 rulings ledger), then `V1_BUILD_STATUS.md`. **If this doc and `git log`/`git worktree list` disagree, git wins** — treat any conflict as this doc being stale, not the repo being wrong. **Refresh rule:** a scribe agent (or the captain directly) updates this doc after every lane landing, merge, or JK ruling — same session, same day if possible. Update in place; do not fork a v2 of this file. When a lane in §3 finishes and merges, move its row to §2 with the real commit hash and delete it from §3.

**AUTH-4 AUTONOMOUS OVERNIGHT OPERATION (JK authorization, 2026-07-08 ~22:00, verbal):** the captain proceeds through the Mode-1 queue + Mode-2 morale-wave prep ALL NIGHT under the established lane protocol (§5: Codex builds → Opus adversarial audit → captain merge → scribe books). **ALL JK-gates — browser feel-passes and any NEW scope forks — DEFER TO the MORNING check-in**; nothing human-gated blocks overnight building. Machine is caffeinated (no sleep). **Solo-worker note (the AUTH-4 collision rule):** this session is the SOLE captain — no handoff-spawned second workers; if you are a fresh session reading this overnight, do NOT claim the baton or dispatch lanes — the running captain owns them until the morning check-in.

**JK OVERNIGHT PRIORITY DIRECTIVE (2026-07-08, later the same night):** **Mode-1 A-Z work has ABSOLUTE priority. Goal = JK walkthrough-ready by morning; the Mode-1 gauntlet RUNS BEFORE morning. Mode-2 BUILDS are deferred** (Mode-2 prep/design may proceed, but no season-side build lanes tonight — the morale-wave plan is parked as DRAFT, §4).

**Settings hardening (commit `52e4527c`):** pinned agent types committed to the repo — `.claude/agents/{auditor,scribe,tracer}.md` — plus a mandatory subagent MODEL policy in `CLAUDE.md` (no Fable inheritance for subagents) and matching SESSION_RULES lessons. Successors dispatch subagents through these pinned types.

## 1. Resume-here summary

**THE OVERNIGHT RUN IS COMPLETE. The draft is walkthrough-ready — the MORNING PACKET for JK is final at `spec-docs/MORNING_PACKET_2026-07-08.md`.** **ALL THREE GAUNTLET LEGS PASSED OR PROVED THEIR TARGET** (`MODE1_GAUNTLET_REPORT_2026-07-08.md`): leg 1 (8-team, pool-first, shills 0) — full draft A-Z, all clubs legal both auctions, 0 console errors, 0 manual adds; leg 2 (design-first, "GauntletD8") — **P2 CLOSED**, legal pool first roll, design targets 22/22 post-lock; leg 3 (shills full-draft) — **P10 CLOSED: shill dissolution PROVEN CLEAN** (IndexedDB-verified, 8 real clubs only, zero stranded players) + farm shill-absence + human-seat-never-CPU confirmed; leg 3's discovery (**F21** completion deadlock: pool-exhausted shortfall + settle gated on `AUCTION_COMPLETE` = circular trap) was **FIXED AND MERGED the same night** (lane M1Q `3f98eb06`). Seven findings ticketed from the walks (F15-F21; F21 already landed; F18 = a JK design fork for morning). **Eighteen lane merges this session (§2, git-counted), all pre-merge adversarially audited** (17 overnight + M1R `46ebc2aa` post-close-out: F20 "what you see is what locks" — audit APPROVE-WITH-NOTES, mechanism is a display-vs-final divergence detector that blocks LOCK until re-extraction plus a hard byte/set-identity guard that throws on drift, a stricter route than the finalize-upstream description first proposed; CUT2-2 floor semantics untouched, no new recompute cost; its own small residual **F22** — pool-first LOCK can refuse opaquely after a post-import roster change, no in-UI recovery hint until reload — is ticketed, not blocking). **F8/F11 (lane M1E) is PARKED, verdict FAILED-ON-HARNESS-ARTIFACT** (§3) — not a walkthrough blocker. **Codex flakiness: 5 startup stalls tonight — prefer Claude-side builders until it recovers.** **The morale-wave build plan is PARKED as DRAFT** (`spec-docs/MORALE_WAVE_BUILD_PLAN_2026-07-08.md`, awaiting ratification + the JK RIVALRY_SWEEP fork; builds after Mode-1). **The SOT register LANDED (`24b3e6c0`)** — per-system canonical-doc census + spec-vs-code verification of 10 Mode-2 systems, surfacing **~45 new unowned gaps** (its §4c) that feed the pre-tuning queue, 5 new JK ruling questions (its §4b), and a banner/correction action list (its §4a — executed this pass). **The 5 SOT-register §4b questions were RULED same evening** (canon ledger `34a1e8d1` + aging clarification `0d2f3802`/`4835cc9a`): matchup engine IN for v1 (ratify spec, then build); reporter pre-narrator mechanics RETIRED; REL-8 captain composite BUILDS in the morale wave; Reliever-of-Year = pitching WPA ratified as shipped; in-season 5-tier age drift IS v1 (verified built-and-fed) — only multi-season arcs stay deferred. **Late-evening batch (canon §6, recorded this pass):** (1) **V1 DRAFT SCALE = 8 TEAMS (+1-2 shills)** (`df9acc9a`) — the F8 economy gate and the gauntlet grid re-base to 8-team rooms; the 30-team closer shortfall + completion cascade are POST-v1 concerns, not blockers. (2) **RECORD-OVERTAKE REVERSAL** — the 2026-07-07 overtake→HISTORY ruling is reversed; overtake edges are genuine RIVALRY (correct-as-built) and charge future matchups per REL-6; the retype ticket is CANCELLED everywhere it was queued. (3) **MATCHUP ENGINE RATIFIED-AS-AMENDED** — `MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md` governs; spawn rule = MUTUAL-WPA (both players banked positive-WPA moments vs each other above a §16 threshold; one-sided domination never spawns); GameTracker recent-form suffix allowed, browser-gated (sole freeze exception). Zero open JK forks. Two standing human gates remain: JK's browser feel-pass on reserve prices (Lever A, k=0.65 default) and the final v1 acceptance walk (§0 of `V1_CANON`).

## 2. Merged today (git-verified, all pre-merge adversarially audited by Opus)

| Lane | Merge commit | What landed | Audit verdict |
|---|---|---|---|
| M1a | `1adb1183` | Per-draft nomination seed [F1] — nomination order derives from session id + persisted launch nonce; deterministic within a draft, differs across drafts | APPROVE |
| M1b | `dbfc2a48` | Prospect generation to spec curve [F4] — seeded pool-level largest-remainder grade quotas; before 8.8pp total abs deviation, after 0.0pp exact | APPROVE-WITH-NOTES |
| M2a | `2c3a906b` | Phase-2 flag production activation [M2a] — the 11 default-OFF soul flags now resolve `test override > persisted activation > compiled default`, reuses existing `kbl-app-meta.appSettings` key, no new DB/store | APPROVE-WITH-NOTES |
| M1c | `61f0421f` | CPU identity auto-assign [P1] — deterministic auto-fill of missing club identities, preserves user picks, visible leagueId:nonce seed | APPROVE-WITH-NOTES |
| M1G | `72d518ce` | Farm shill fix [F13] — farm CPU set = AI clubs only, legacy "last-N-teams-become-CPU" fallback removed (was silently hijacking human teams); MLB legacy-resume hole closed too | APPROVE-WITH-NOTES |
| M1D | `a71e9e67` | Farm scouting overhaul [F2/F3/F7/F10] — per-area scout bands now derive from the ratified 24×8 farm-archetype table (was: hired-scout descriptor); scout value = true IV opening ask with band fog; ScoutHire = deterministic no-choice reveal | APPROVE-WITH-NOTES |
| M2b | `d85137f7` | Arm-rating last mile [RA-8 / matrix gap #1] — `armThrowingRate` now receives a real performance signal in `expectedStatsCategoryRates.ts`; both feeder legs (catcher CS-rate w/ the spec's 95/5 credit split, OF assists) verified live by the audit; no arm-relevant exposure → null sample, not zero | APPROVE-WITH-NOTES. **Carry Note A:** the OF leg is currently a per-game VOLUME rate — revisit as a success rate once `extraBasesAllowed` gets a live writer |
| M1H | `3dfa1d38` | Farm follow-ups [F12a/F12b/§8.4-amended] — pitcher arm slots generated to the EXACT measured `playerDatabase.ts` distribution; farm auction lot card shows trait COUNT with no-leak verification (no names, no other fields); overall scout band = primary-area rule (replaces the dead constant-5 mean rule) | APPROVE-WITH-NOTES. **Carry the note:** only the Sub arm slot carries a pricing premium — that's the pre-existing IV model, not an M1H change |
| M1I | `8eb24037` | League handoff + staff carry-through [F6/P5] — leagueId threads staffing→Franchise Setup with auto-select (`2850f3cc`); hired reporter/manager identities reach the hub (`f99128ed`); honest draft-complete badge reads the auction session (M1I-B fix `ad4e5b46`) | APPROVE-WITH-NOTES + M1I-B fix. **Residuals (non-blocking):** URL param not cleared (low-likelihood re-snap); per-league badge scan perf-only; no empty-staffing coverage regression (M1I-B restored it) |
| M1J | `08236fdf` | Completion guarantee on every terminal path [F14] — exhaustion cleanup runs on EVERY auction terminal (`d8c64fa3`); genuinely-uncompletable pools surface an explicit `terminalShortfall` instead of a silent short roster | APPROVE-WITH-NOTES. **Audit rigor:** falsification check self-run by the auditor against genuine base; organic full-draft driver = zero incomplete rosters across all legs. **Residual:** F14b (UI drops `terminalShortfall` → error-toast soft-lock, not a graceful screen) ticketed in punch-list §1c — small UI lane, near-impossible to trigger at v1 scale |
| M1K | `e21b23cf` | Farm auction folds onto AuctionStage [P3] (`fc6d6742`) — the mid-journey UI register break is dead; MLB tier proven INERT under the fold; privacy DOM-verified (covered values absent from the DOM, not merely hidden) | APPROVE-WITH-NOTES. **Notes:** missing `.catch` on the load-init chain; bid increment fixed at 1000 → **VERIFY-DRAFT-SETUP-OWNERSHIP** follow-up |
| M1L | `11a80835` | Post-freeze summary screen [P6] (`d310db95`) — read-only display of what froze (salaries, morale baselines), honest about gaps | APPROVE-WITH-NOTES. **Notes:** roster fallback is derived when the store lacks it; add an empty-store branch test |
| M1M | `d35f6a62` | RULES-V1-PRUNE [P7] (`8ceaaf3e` + M1M-B `d2795095`) — every visible rules/season-config knob wired to real behavior or removed; unconsumed `defaultRulesPreset` dropdown deleted; playoff step marked deferred | APPROVE-WITH-NOTES (incl. the M1M-B follow-up) |
| M1N | `7714b82a` | Conference editor [P8] (`49d646d4`) — conference assignment in the league create/edit modal (single-conference, balanced split, rename, per-team assignment); validation blocks orphan/duplicate assignments; franchise standings reuse valid source membership; lens standings still one league-wide group (documented) | APPROVE-WITH-NOTES |
| M1O | `67b39e1b` | Scout reveal adjacent to farm phase [P11] (`391a0487`) — draft-arc order now coherent with the scout-is-farm-only canonical split; hub-based back-navigation | APPROVE-WITH-NOTES. **Note:** `proceedLabel` fallback flagged (non-blocking) |
| M1P | `500e66bf` | Whisper one-ceiling [F9] + farm Assistant-GM whisper [P4] — ONE liquidity-adjusted maxBid drives verdict, room-read AND budget light (`68570a39`, counter-fixture proved the old leak); farm whisper live (`ac1ed30f`) with budget-driven discrimination + honest "unknown" stubs; engine surfaces diff-verified untouched. Built Claude-side (codex reroute), same audit gate | CLEAN APPROVE |
| M1Q | `3f98eb06` | Shill reclamation in the terminal cascade — no completion deadlock [F21] (`27cac1f4`): the leg-3 live repro (pool-exhausted shortfall + settle gated on `AUCTION_COMPLETE` = circular trap, no UI escape) is dead — shill-held players reclaim automatically in the terminal cascade; theft structurally impossible; post-completion settle byte-identical | CLEAN APPROVE. **Notes:** the repro carried a naive-auto-bidding caveat; the "Can't afford her" spin-loop UX gotcha noted for automation |
| M1R | `46ebc2aa` | What you see is what locks [F20] (`fd8bd61c`): a display-vs-final divergence detector blocks LOCK until re-extraction, plus a hard set-equality guard in `lockLeaguePool` that throws on any drift — no silent swap possible, fit verdicts always reflect the displayed pool | APPROVE-WITH-NOTES. **Audit-corrected framing:** the mechanism is block-and-force-re-extraction, a STRICTER superset of the old lock gate, not the upstream-finalize description first proposed; CUT2-2 floor semantics untouched, no new recompute cost. **New residual: F22** — pool-first LOCK can refuse opaquely after a post-import roster change, no in-UI recovery hint until reload (`leagueBuilderPoolRegistration.ts:100-110` vs `LeagueBuilderDraftSetup.tsx:2006`'s once-per-league auto-import guard); ticketed, low severity |

Audit notes / landing detail for each lane live inline in `spec-docs/MODE1_PUNCHLIST_2026-07-08.md` §1/§1b ("landing note" lines) and `spec-docs/V1_BUILD_STATUS.md` §0 items 1i/1j. M1D's audit surfaced one amendment (overall grade band was a dead constant-5 "mean rule" knob) — ratified as PRIMARY-AREA in `01ff6b68`, riding lane M1H below. Housekeeping commit `fbdab22a` removed a stale tracked `DONE.txt` (M1D's EPERM-fallback report) from the repo root and preserved the M2b/M1H dispatch contracts in `spec-docs/contracts/`.

## 3. In-flight + parked

**Nothing is building.** The overnight run is complete — all lanes landed or parked; gauntlet legs 1-3 booked (`MODE1_GAUNTLET_REPORT_2026-07-08.md`). The next action is human: JK's morning check-in (§4).

**F8/F11 — PARKED (verdict: FAILED-ON-HARNESS-ARTIFACT; not a v1 walkthrough blocker).** The M1E-FINAL v1-scale gate FAILED on the repaired engine (M1/M2/M4 fail in both states; the sim-lane baseline itself unhealthy; the liveEngine gate-lane unjudgeable — the harness throws on auction-uncompletable). The gauntlet then proved real 8-team drafts complete cleanly in the browser → **the harness's pool construction is the artifact, not the product.** F8/F11 + the sim-fix work stay parked on `lane/m1e-diminish` (commits `b55da76d`/`13925f70` + gate report `6f6d0bbd`) pending a properly-based harness. DO-NOT-MERGE continues to apply to the parked branch. Settled chain history (don't re-litigate): 73/150 sim fail → M1E-DIAG BASE-fails-too (89/150) → live-driver surfaced F14 → M1J fixed the real engine (`08236fdf`) → final gate failed on the harness, gauntlet passed on reality. F16 is the same tuning family.

All lane worktrees follow the standard lane pattern (§5) and the known-flake list (§6).

## 4. Remaining queue (morning and after)

1. **JK MORNING CHECK-IN** — the walkthrough (P12; entry point + suggested route in `MORNING_PACKET_2026-07-08.md`), plus the owed forks: **F18** (farm position enforcement vs advisory-only), the morale-wave **RIVALRY_SWEEP** fork, and any deferred JK-gates from the overnight authorization.
2. **Post-walkthrough small fixes:** F15 (stale legality re-check) · F17 (farm-gaps sidebar staleness) · F19 (pool-gen first-try-legal, pool-first path) · F22 (pool-first LOCK refuses opaquely after a post-import roster change — surface a re-import/re-sync affordance or hint) — plus F14b (uncompletable-pool UI) and the VERIFY-DRAFT-SETUP-OWNERSHIP follow-up when convenient. *(F20 LANDED — M1R `46ebc2aa`, see §2.)*
3. **F16** — archetype market advisory tuning-class (same family as F8's market model).
4. **F8/F11 re-judgment** on a properly-based harness (parked, §3) — **P9** rides with it (same economy surfaces).
5. Remaining gauntlet legs: k=0, 6-team, RUN-IT-BACK — **legs 1-3 done** (`MODE1_GAUNTLET_REPORT_2026-07-08.md`).
6. **Mode-2 wave** (below) — unblocks after Mode-1 per the priority directive; morale plan awaits ratification.
7. **F5 reskin** (ballpark-kit design wave, cosmetic) after JK's walkthrough verdicts.

*(Landed/absorbed: P5+F6 → M1I `8eb24037`; P2 → gauntlet leg 2 PASS; P3 → M1K `e21b23cf`; P6 → M1L `11a80835`; P7 → M1M `d35f6a62`; P8 → M1N `7714b82a`; P11 → M1O `67b39e1b`; F9+P4 → M1P `500e66bf`; P10 → gauntlet leg 3 PASS; F21 → M1Q `3f98eb06`; F20 → M1R `46ebc2aa` — see §2/§3.)*

**JK design question parked (2026-07-08 morning, verbal, not yet built):** multi-league curated draft-pool sources — could a league's draft pool be curated FROM another league's roster/pool rather than only the global player database. Assessed **moderate** complexity; conceptually clean against the existing `leagueAssignments[]` multi-league player model (`LEAGUE_BUILDER_REFACTOR_SPEC.md`), no build undertaken. **Owes one tracer verification pass when JK commits to it** — confirm the pool-registration/import path (`leagueBuilderPoolRegistration.ts`) can source from an arbitrary league's player set, not just the global pool, before scoping a build lane.
**Morale W-lanes: PARKED.** The plan exists at `spec-docs/MORALE_WAVE_BUILD_PLAN_2026-07-08.md` — **DRAFT, awaiting captain ratification + the JK RIVALRY_SWEEP fork; builds AFTER Mode-1 per the JK priority directive.**

**Mode-2 wave order (JK-ruled sequencing, runs concurrently on disjoint season-side files while Mode-1 stays first priority):** ratings/trait adjustment matrix wiring remainder (the 2026-07-08 blocker — row-by-row spec-to-code reconciliation; M2b was the first row of this and is now LANDED, see §2) → morale 52-row full-wiring (incl. the ruled home-park-rival 2× amplifier + REL-8 captain composite + **the morale ledger write-back**) → **matchup-engine build lane** (M-L, RATIFIED 2026-07-08 — contract basis `MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md`; slots with/immediately after the morale wave; hard dep: the morale ledger write-back; spawn = mutual-WPA) → L10 (Random-Events) chain completion → C4-C in-season Assistant-GM rewiring (+ the 3 reporter/fame items assigned owners in `ORPHAN_WIRING_MATRIX_2026-07-07.md` §5 addendum) → TV-award family rewire to the TV spine → ~~rivalry record-overtake edge → HISTORY~~ **(CANCELLED — the 2026-07-08 reversal keeps RIVALRY as-built)** → a full `UI_TRUTH_MAP.md` re-walk → **only then** §16 sim-tuning (~100 feel-numbers). **The SOT register's §4c gap lists (~45 new unowned items — fame status/celebrity layer, awards/TV resolution holes, morale cross-cutting severances, relationship producers, reporter §16, L10 catalog) now feed this pre-tuning queue**; its §4b questions are all RULED (canon `34a1e8d1` + the ratification/reversal rows).

## 5. Lane protocol (how a successor dispatches or resumes a lane)

1. **Contract first.** Captain writes a bounded contract — either as a file in `spec-docs/contracts/` or inline as the `codex exec` prompt (both patterns are in active use; inline is common for smaller/well-scoped lanes, and inline contracts are preserved to `spec-docs/contracts/` after dispatch so the record survives the process — see `fbdab22a`). The contract names: working worktree/branch, the governing spec/design doc(s) to read FIRST, the exact deliverables, an UNTOUCHABLE list (files/systems other concurrent lanes own), required regression tests, the gate commands, the commit message(s), and an EPERM fallback (dirty tree + a `<LANE>_DONE.txt` summary if `git commit` fails in the sandbox).
2. **Codex builds** in an isolated `git worktree` off a fresh `origin/main`, with an APFS-cloned `node_modules` (`cp -c -R`) so installs aren't repeated per lane.
3. **Opus adversarial audit**, read-only, tries to break the diff and re-runs the gates itself independently (builder ≠ auditor, no exceptions).
4. **Captain merges** `--no-ff` with the audit verdict recorded in the merge commit message.
5. **Landing note** appended to the relevant punch-list/matrix doc (see the "landing note" pattern in `MODE1_PUNCHLIST_2026-07-08.md` §1/§1b).
6. **Push**, then update this checkpoint's §2/§3.

If a lane's design assumption proves false against the live code, the contract requires the lane to **STOP and write `BLOCKED.md`** rather than inventing a replacement — see M1E's history in §3 for the real example and how it was unblocked (a design amendment ruling, not a code workaround).

## 6. Known full-suite flakes (not regressions — always solo-rerun before judging a lane red)

- `LeagueBuilderDraftSetup.test.tsx` — the CUT2-2 30-club shill-pressure batch
- `AwardsWatchlist`
- `franchiseManualSmokeFixture`
- `GameTrackerLaunchState`

Every lane contract names this exact list. If one of these is red in a full-suite run, rerun it solo before flagging a regression.

## 7. Doc authority map (from `V1_CANON_2026-07-07.md` §7 — conflicts resolve upward, never down)

```
canon (V1_CANON_2026-07-07.md, JK-approved — §6 is the rulings ledger, dated, append-only)
  > binding specs
      FRANCHISE_V1_LIVING_SEASON_SPEC.md   (living-season backbone)
      MODE_2_V1_FINAL.md                    (engine-level home specs)
      SCOUTING_INTELLIGENCE_SPEC.md         (draft + in-season intelligence, v1 blocker)
      UX_NORTH_STAR.md                      (binding UI/UX design bible)
      TEAM_ARCHETYPES_24.md                 (the 24 locked identities)
      DRAFT_ECONOMY_RESET_2026-07-05.md     (draft-economy plan of record)
      FABLE_RESERVE_PRICE_DESIGN_2026-07-07.md (Lever A design, build-authorized)
      MATCHUP_ENGINE_RECONCILIATION_2026-07-08.md (matchup engine, RATIFIED-AS-AMENDED — governs PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md on conflict)
  > status
      V1_BUILD_STATUS.md                    ("THE one status doc for v1" — update in place, never fork)
  > execution
      PATHWAY_TO_V1_2026-07-07.md           (phased runbook, owners, gates)
      MODE1_PUNCHLIST_2026-07-08.md         (Mode-1 execution board, F1-F13 + P1-P12, landing notes)
      PROMPT_CONTRACTS.md                   (the Codex build-contract manifest)
      ORPHAN_WIRING_MATRIX_2026-07-07.md    (incl. §5 execution reconciliation addendum, 2026-07-08)
      MERGE_CERTIFICATION_2026-07-08.md     (stranded-code recovery register R1-R7)
      SOT_REGISTER_2026-07-08.md            (Mode-2 per-system SOT register + spec-vs-code verification, LANDED 24b3e6c0 — look up a system's governing doc HERE before trusting any other doc's claim about it; §4a banners executed 2026-07-08, §4b questions all RULED same evening (canon 34a1e8d1), §4c = the pre-tuning gap lists)
      UI_TRUTH_MAP.md                       (empirical route-truth snapshot — stale post-lens-flip, needs a re-walk before any UI-reachability claim is trusted)
  > superseded (do not plan from these — see V1_BUILD_STATUS.md §5 for the full list)
      ROADMAP_TO_V1.md, V1_BUILD_QUEUE.md, FRANCHISE_SETUP_TO_SEASON_ROADMAP.md,
      V1_ACTIVATION_READINESS_MAP.md, V1_STATUS_AND_ASSEMBLY_PLAN.md,
      MODE1_V1_VERIFICATION.md, MODE1_LEAGUE_BUILD_TO_DRAFT_VISION.md,
      MODE2_V1_COMPLETENESS.md, SCOUTING_INTELLIGENCE_SPEC_V2.md, AUCTION_DRAFT_SPEC.md
  > this doc (CONTINUITY_CHECKPOINT.md)
      A resume-pointer, not a source of truth. It cites the docs above; it never overrides them.
```

**Standing rule from canon §7, restated:** changes to `V1_CANON_2026-07-07.md` happen only via a dated JK ruling appended to its §6 — no silent edits. This checkpoint doc has no such protection; it is meant to be rewritten freely as work lands.
