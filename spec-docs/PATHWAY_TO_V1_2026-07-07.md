# THE PATHWAY TO V1 — single plan of record
**Author:** Fable, 2026-07-07, from personal reads of every governing doc (last 10 days) married to git-verified repo state. Every claim below is evidence-classed: **[read]** = I read the doc/section myself · **[git]** = I ran the command myself · **[agent-✓]** = agent finding I spot-verified · **[UNVERIFIED]** = stated as unknown.

---

## PART 1 — WHERE PLANNING WENT WRONG (the post-mortem, plain language)

The last 10 days produced great work and a mess, for five compounding reasons:

1. **The real product never left your machine.** All v1 work since May lives on LOCAL branches (trunk = `experiment/manager-wpa-window`); the plan-of-record docs (V1_BUILD_STATUS, V1_PLAN) were never pushed. GitHub main sat frozen at May 21 [git: PRs #4–#7 all 2026-05-21, then nothing until today]. Anyone starting from GitHub — human or agent — sees a six-week-old app and no plan.
2. **The one rule "update the SOT in place" stopped being followed the moment the SOT went stale.** V1_BUILD_STATUS is dated 2026-07-01 and says "nothing draft/hub is on trunk yet" [read §2] — but the assembly it was waiting on happened right after [git: both branches merged into trunk; 74 trunk commits July 2–4]. Nobody updated it. So even the source of truth was wrong within a day, and every later agent had to choose between a stale SOT and raw git.
3. **July 5 broke trust and the recovery doc got stranded.** The stars/scrubs draft failure led to same-day slop builds that you reverted; the excellent reset plan written afterward (measure first → fix the pool at the source → fix auction economics → sim harness as the measurement gate) was never committed — it exists only as an untracked file in your root checkout [git: `?? spec-docs/DRAFT_ECONOMY_RESET_2026-07-05.md`] [read: full doc].
4. **July 7 (~today): a second universe was created.** The draft agent, working from GitHub, took the May-era main, snapshotted just the draft-economy slice of your local trunk onto it (PR #9 — byte-identical to trunk for 190 of 215 files [agent-✓ spot-checked]), and built the genuinely new pool-quality/cap-fit/liquidity work (PRs #10–#17) on top. All of #8–#17 were opened and merged TODAY [git: `gh pr list` — every one created 2026-07-07]. Its handoff presented this as the established arc, with its own new rules ("no luxury tax", "reserve prices deferred") that contradict your standing rulings (soft tax confirmed 6-30; reserve prices = the reset plan's Lever A).
5. **Today I compounded it.** I took that handoff at face value, treated GitHub main as the product, spent the day auditing and fixing the wrong line (some of it — the audits, the port map — turns out to be exactly what the recovery needs; some was out-of-v1 hygiene), and merged PR #18 onto it before you stopped me.

**The root cause in one sentence: there was never one pushed, protected trunk with the plan riding in it — so every fresh set of eyes rebuilt "the truth" from whatever slice it could see.**

## PART 2 — CURRENT STATE (verified today)

**Two lineages, split at a6520654 (May 21):**

| | OLD LINE (the product) | NEW LINE (GitHub main) |
|---|---|---|
| Tip | `experiment/manager-wpa-window` @ 7b5214ca, 2026-07-04 [git] | origin/main @ bc099d85 (PR #18), 2026-07-07 [git] |
| Has | The ENTIRE v1 build: assembled draft UI + hub [git: both merged], 24 archetypes, C1–C3 Asst-GM foundations + C2B second-price market + C3 pool sizing [read: CURRENT_STATE header], AUTH-4 batch, require-a-closer, pool-affordability arc, D17 [git: July 2–4 log], freeze→season handoff w/ options, soul layer (11 dark flags), score-only entry, awards/honors, All-Star engines, L-SIM (26 invariants + 44-case falsification + postseason driver), ~8,400-passing test suite [read: run-log gates] | May-era franchise surface + a partial snapshot of the old line's draft slice + the genuinely new economy work: pool balance/quality/source presets, cap-fit diagnostic, liquidity-aware bidding, cpuShill liquidity, **the 19-file auction sim harness** (= the reset plan's Lever 0, already built!), Whisper liquidity readout + today's route/backup/season-scope fixes |
| Missing | The new-line economy work (portable: 7 cherry-picks + 2 test unions [agent-✓ port map, spot-checked]) | ~1,194 commits of v1 [git]: soul, freeze options, score-only, awards, All-Star, L-SIM, the SOT docs; ships a LIVE simulate path (trunk also carries simulate code but hardcoded OFF — FranchiseHome.tsx:181 `MODE_2_V1_SYNTHETIC_SIM_ENABLED = false` [git-verified], spec-compliant behavior, dead code for the cut-over DELETE list; MODE_2 §22.3 Score/Skip verified by grep) |
| Suite | [UNVERIFIED — full suite never run this session on trunk; run-log's last recorded state ~8,4xx pass / 2 characterized fails] | 7,118 pass / 81 fail, of which ~38 salary-cluster failures are stale-snapshot artifacts that don't exist on the old line [agent-✓ commit-date evidence, not executed] |

**Working tree hazards [git]:** root checkout is on a stale PR branch with 1 modified file + ~20 untracked docs including the reset plan and MODE_2_V1_FINAL — must be parked/committed before anything else. The killed port attempt left uncommitted engine edits in `/private/tmp/kbl-port-draft-economy` (my scratch worktree — will be reset).

**Doc authority (ruled by freshness + declared supersession):** V1_BUILD_STATUS (SOT, needs the update this doc feeds) > V1_PLAN_2026-06-30 (Decisions A–E stand) > FRANCHISE_V1_LIVING_SEASON_SPEC + MODE_2_V1_FINAL (living season) > SCOUTING_INTELLIGENCE_SPEC + TEAM_ARCHETYPES_24 + UX_NORTH_STAR (design canon) > DRAFT_ECONOMY_RESET_2026-07-05 (draft-economy plan of record, must be committed) > everything in SOT §5 = superseded. The 7-07 handoff's "hard constraints" (no tax, no reserve prices) are OVERRULED where they contradict JK rulings.

## PART 3 — THE PATHWAY (phases, gates, owners)

**Phase 0 — One trunk, one truth (immediately, ~hours).**
0a. Park the root checkout's loose state: commit untracked spec docs (incl. the reset plan) to a docs branch off trunk; stash/branch the 1 modified file. Nothing gets deleted.
0b. **JK DECISION D1:** publish the old trunk to GitHub as the protected default branch (recommended: push as `main`, archiving today's new-line main to `archive/draft-economy-2026-07-07` — its unique value is being ported in Phase 1 anyway; PR #18's content already exists on trunk [agent-✓]).
0c. Update V1_BUILD_STATUS in place: assembly=DONE, C2B/C3=DONE, the July 2–4 landings, this lineage ruling, evidence-classed statuses. Commit it WITH the trunk push so plan and code travel together. (Rule restored: no work without updating the SOT.)

**Phase 1 — Reunify (today).** Execute the port map onto trunk: the 7 cherry-picks (#10–#17 content: pool presets/quality/cap-fit, liquidity bidding, auction sim harness, tuning-loop doc) + 2 test-file unions; skip list honored (App.tsx, franchiseInitializer, the EOD re-ports — trunk's versions are richer). Gate: build + full suite (this also establishes the trunk's true baseline) + L-SIM import-graph check + a real-browser draft-setup/auction smoke. Codex executes, Opus audits, I gate, JK is told in plain language. Nothing else builds until this lands.

**Phase 1.5 — THE UI TRUTH MAP + THE GREAT CUT-OVER (new, load-bearing — JK ground-truth 2026-07-07).**
JK's July 3–4 browser sessions establish what no doc records: the app is an **amalgamation of old and new UI/wiring** — new AuctionStage next to legacy scout-hire/staff-hire screens and a legacy farm-auction layout [read: SOT S2/S6 confirm these as known-outstanding], and a living season that still renders the OLD hub because the polished fenway hub was merged into the tree but the live `/franchise` route was never flipped [read: SOT S12 lists the flip as outstanding — merged ≠ routed]. **No tuning, no trust, until the old is gone.**
1.5a **Empirical truth map:** on the unified trunk, walk EVERY route in the live router in a real browser (and enumerate unrouted page components): record what actually renders, old-vs-new, which SOT stage it serves. Deliverable: `UI_TRUTH_MAP.md`, one row per screen with a verdict: **KEEP** (new canon) / **FLIP** (new exists — reroute to it) / **HIDE-DEFER** (out of v1: SIMULATE, playoffs UI, offseason flows, All-Star game screens) / **DELETE** (dead or superseded-old). My own UI claims are [UNVERIFIED] until this exists — JK's browser is the evidence source of record.
1.5b **JK reviews the map and rules the cut-over list** (this absorbs old D3 — the hub choice becomes one row).
1.5c **Execute the cut-over:** flip routes to the new surfaces (fenway hub first), delete or hard-hide every OLD screen so it is unreachable, one canonical surface per function, guards so out-of-v1 surfaces can't be navigated to.
**Gate:** a fresh end-to-end browser walk (league build → draft → staffing → franchise → season loop) encounters ONLY new-canon surfaces — zero legacy screens reachable — witnessed by JK.

**Phase 2 — Draft completability, per the reset plan (the current draft-thread headline).** On the unified trunk: run the §3 measurement (histogram + budget curves) using the now-ported sim harness (Lever 0 = already built by the draft agent — the one big silver lining of the fork). Then **JK DECISION D2 (already teed up in the reset doc §6):** Fork A (fix the auction: Lever A reserve prices, then Lever B curve-quota pulls) vs Fork B (snake-draft pivot). Reset doc recommends Fork A; each lever = design doc → JK ruling → Codex → Opus → sim re-measure → browser feel gate. Acceptance = the reset doc's economics numbers (budget ≥ ~35–45% at spot 11, zero free auto-fills, elite share ≤ ~12–15%), plus both stock imports lock legal first try (the CP-quota fix folds in here).
**The draft agent continues to own this thread** — but retargeted onto the unified trunk, under the reset plan's discipline, with the contradictory handoff constraints struck.

**Phase 3 — The v1 headline: Assistant-GM intelligence + draft depth (SOT §4 step 3).** Sequence per SOT: S2 setup re-design foundation (per-league identity layer — still NOT-BUILT [read §3], and a prerequisite for the intelligence inputs) → the remaining C-series (C4 setup UI + 24-archetype picker; C5 mass-sim tuning) → auction gaps (wrong-fit penalty Option-A [Decision B's "true cost"], mock-draft toggle, dissolve-to-pool FS-3 — verify against trunk, C3 may have fixed it [UNVERIFIED]) → scout archetype-derived bands (S4). Decision A's interrogation-first rule applies to any scout-spec work.

**Phase 4 — Living-season finish (SOT §4 steps 4–5).** Setup-spine seams (seat-write, freeze-confirm, draft-recap, post-freeze summary) → the L-SIM freeze→real-frozen-franchise bridge (the declared riskiest item — drives the schedule) → production activation mechanism for the 11 soul flags → All-Star voting/selections surfacing (your ruling today: in v1, no game) → score-only + Score/Skip proven through the WAR/awards path end-to-end in a browser.

**Phase 5 — Freeze → flip → tune → sign off (SOT §4 step 6, STRICT order).** Feature freeze (JK trigger) → saved-game migration check → flip the 11 flags ON → §16 tuning (~100 numbers, the largest remaining lift) → flip the live `/franchise` route → **JK browser sign-off on real data — the sole acceptance gate.**

**Standing rules restored (all phases):** one pushed trunk; SOT updated in-place with every landing; branch-per-slice; builder≠auditor; sim = measurement gate, browser = feel gate; no math/product change without a JK ruling in DECISIONS_LOG; no "ready" claims without same-session browser proof; superseded docs get banners.

## PART 4 — TODAY'S WORK, DISPOSITIONED
- **Keep (ports with Phase 1):** the draft agent's economy work (#10–#17) incl. the sim harness; my port map; the recon/audit corpus (feeds the SOT update); PR #18 content (already on trunk natively).
- **Park (new-line only, don't port):** Lane B season-scope/playoff fixes + Lane C backup/manifest fixes — they fix the May-era surface the old line already evolved past [agent-✓ for backup; UNVERIFIED for each Lane-B fix — re-audit against trunk ONLY if a matching symptom appears there].
- **Struck:** my earlier "offseason lane / sim-integrity lane" plans (out of v1); the handoff's no-tax/no-reserve constraints; every plan built on the new line as product.

## PART 5 — WHAT I STILL CANNOT PROVE (the honest gap — now including JK's correction)
0. **THE BIG ONE (JK ground-truth 2026-07-07): every UI/UX claim in this doc is code-tree truth, not browser truth.** JK's July 3–4 sessions prove the running app is an old/new amalgamation (old hub live, fenway hub merged-but-unrouted, legacy screens still in the flow). Until Phase 1.5's truth map exists, NO screen is assumed canonical. Doc statuses that say "UI DONE" mean "a new UI exists in the tree," not "the new UI is what renders."
1. ~~Trunk's full-suite baseline~~ **RESOLVED [git, executed 2026-07-07]: trunk build exit 0; full suite 8,983 pass / 1 fail / 8 skipped (589 files)** — vs the new line's 7,118/81. The 1 failure's identity wasn't captured in the output tail (presumed the long-documented characterized hard-fail; Phase 1's gate names it explicitly).
2. Which checkout Friday's draft ran (Phase 1's browser smoke re-proves the arc on the unified trunk regardless).
3. FS-3 dissolve-to-pool current status on trunk (targeted check in Phase 3).
4. Whether any Lane-B-class season bugs exist on the old line's season surfaces (the truth map + season walk will surface them empirically).

## PART 6 — DECISIONS NEEDED FROM JK (only these)
- **D1 (now, gates Phase 0):** publish old trunk as GitHub main (archive today's main)? — recommended YES.
- **D2 (after Phase-2 measurement):** Fork A (fix auction: reserve prices + curve quotas) vs Fork B (snake pivot) — reset doc and I recommend A.
- **D3 (Phase 1.5b):** rule the cut-over list from the UI truth map (which surface is canon per screen; what gets hidden/deferred/deleted). The hub choice is one row of this.
- **D4 (standing, from the reset doc):** ratify that the draft agent's thread now runs under the reset plan + your rulings (soft tax IN as design goal, reserve prices = Lever A candidate) instead of the handoff's constraint list.

## PART 7 — THE OPERATING PRINCIPLE THIS ALL SERVES (JK, 2026-07-07)
"We need to deeply understand the truth, then cut out/hide/defer everything that stands in the way of v1." Concretely: **truth map before trust; one canonical surface per screen; old code unreachable, not coexisting; tune the ~100 knobs only on a fully-canonical app.** Every phase gate above is an instance of this rule.
