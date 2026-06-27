# V1 STATUS & ASSEMBLY PLAN

> **Authored 2026-06-27 by Claude Opus 4.8 (Captain)** from a direct, source-verified cross-branch audit (2 multi-agent audits + targeted per-branch inspection).
> **This supersedes the stale readiness reads.** `V1_ACTIVATION_READINESS_MAP.md` and `CURRENT_STATE.md` materially UNDERCOUNTED built work and mis-stated the per-branch picture. Use this doc as the source of truth for v1 status until it is itself refreshed.
> **Confidence note:** branch *feature scope* and *design compatibility* were verified by reading the code. Per-branch *build/test green* is claimed by commit messages and was NOT re-run here except where noted — verify builds at each merge.

---

## BOTTOM LINE (plain)

v1 is **not reached**, but **more is built than the prior docs said** — the problem is assembly + tuning + activation, not missing engines.

- The engines are largely built (morale, fame, rivalries/grudges, awards, manager-value, **roster-optimizer**, rebrand).
- The franchise hub **IS wired to real data with the soul layer visible** — on a preview route, faithful to the franchise-lens redesign.
- The franchise **playoffs are playable** today (manually).
- The genuinely-big remaining gap is the one JK flagged: **§16 balance tuning is at ZERO.**

What's left: **assemble the unmerged branches → finish the headless playoff/sim driver + fame-wiring → run the §16 tuning sweep → flip the engine flags on → JK browser sign-off.**

---

## VERIFIED CORRECTIONS TO PRIOR DOCS / EARLIER STATEMENTS

1. **Roster-optimizer engine — BUILT** (prior read said "not built"). 5 real engines + full test suites on `codex/draft-pipeline-fix`: `poolFeasibility.ts`, `derivedTraitPotency.ts`, `trueValue.ts`, `scoutMove.ts`, `lineupVsStarter.ts`. Per JK ruling (commit `117a918e`): manager lane wires them live, draft lane audits. Engines reportedly already merged to the live line build-dark (commit `f119ae48`) — **verify exact merge state at assembly.**
2. **Franchise hub on real data + soul layer visible — BUILT** (prior read said "100% demo data, never connected"). `src/src_figma/hooks/useFranchiseLensData.ts` (~1,200–1,800 lines) reads 14+ real franchise stores incl. relationship edges (grudges), fame, morale, designations, standings, news. Rendered in the hub. On a **parallel preview route** (`/__preview/franchise-lens/:franchiseId`); the live `/franchise/:franchiseId` route is untouched by design → needs **finishing + flipping live, not building.**
3. **Franchise playoffs — substantially BUILT + manually playable** (prior read said "no driver"). Seeding → bracket create → series tracking → auto-advance rounds → auto-crown champion → champion display all wired into `FranchiseHome.tsx` + `usePlayoffData.ts`. Missing: the **headless auto-sim driver** (`MODE_2_V1_SYNTHETIC_SIM_ENABLED = false`, the "SIM GAME" button is dead), **playoff fame/clutch wiring** (orphaned), and **L-SIM playoff coverage** (the season runner stops at regular season). Readiness map item 8 already names this.
4. **The two "draft" branches are COMPLEMENTARY, not duplicate.** `codex/draft-setup-ui` = the draft-setup SCREENS (9 preview pages) + the canonical 15 archetypes. `codex/draft-pipeline-fix` = the optimizer ENGINE. They share a base; only ONE file conflicts (`teamArchetypeCatalog.ts` — keep `draft-setup-ui`'s derived version).
5. **The two "mode1" branches are both already MERGED** into the trunk (0 ahead). Not a live duplicate.
6. **The canonical hub = `claude/lineups-fenway-hub`** — a CLEAN SUPERSET of the `codex/auction-draft-ux-rehaul` franchise-lens redesign. It forked from franchise-lens's tip; all additions are additive on the same design (byte-identical shell, same `fen-*` design system). The franchise-lens branch is **superseded** (confirm nothing unique stranded, then retire).

---

## BRANCH MAP (canonical decisions)

| Branch (worktree) | Holds | State | Decision |
|---|---|---|---|
| `experiment/manager-wpa-window` (main repo) | Live work line / integration target; Mode-1 merged, optimizer engines build-dark, home-park rivalry, stadium records, manager-WPA | the trunk work rides on | **Integration target** (named trunk `codex/franchise-v1-next`) |
| `claude/v1-soul-gaps` (kbl-soulgaps) | Rivalry/grudge engine (overtake + 3 envy triggers) + rebrand ruling | clean, current, engine-dark, self-verified green this session | **Merge — easy drop-in** |
| `claude/lineups-fenway-hub` (kbl-lineups-fenway) | **Canonical hub**: franchise-lens redesign + lineups, fitness, trades, award races, call-ups, milestones, playoffs view | superset of franchise-lens, additive | **Merge — the big user-visible piece** |
| `codex/auction-draft-ux-rehaul` (kbl-tracker--auction-ux) | franchise-lens redesign + real-data adapter | superseded by lineups-fenway | **Retire after confirming nothing unique stranded** |
| `codex/draft-pipeline-fix` (kbl-draftfix) | Optimizer engine (5 engines + tests) | engines build-dark; maybe already on live line | **Merge as draft base; verify engine merge state** |
| `codex/draft-setup-ui` (kbl-draft-ui) | Draft-setup screens + 15 archetypes | additive on top of draft-pipeline-fix | **Merge on top; keep its `teamArchetypeCatalog.ts`** |
| `claude/cranky-mcnulty-d3f4bb` | Home-park-rivals backup/sync registration (silent-data-loss fix) | infra fix | **Merge — low risk** |
| `codex/mode1-v1`, `codex/mode1-v1-b` | Mode-1 auction/setup | already merged (0 ahead) | **Done** |
| `codex/ratings-finish-c` (kbl-ratings-c) | Ratings finish | verify scope/merge state | **Audit then merge** |

---

## WHAT'S GENUINELY OUTSTANDING FOR V1

**Build work remaining (genuinely new):**
- **Headless playoff/sim driver** — flip the auto-sim path on + drive a full bracket headlessly; wire playoff **fame/clutch** amplification; add **L-SIM postseason coverage** (the harness stops at regular season). (Readiness map item 8 — NEW, CRITICAL.)
- **§16 balance tuning sweep** — **at ZERO.** ~100 placeholder "feel" knobs (morale swing sizes, event rates, rivalry sting, prize splits, identity strength). The single largest remaining piece. Gated on a feature freeze + a final all-features-on sim baseline.
- **Sim hardening** — the L-SIM currently proves the sim RUNS + is deterministic, NOT that the ~9 newest systems are correct. Add the missing correctness checks so it fails on wrong results, not just crashes.
- **Roster-optimizer live wiring** — the engines exist build-dark; wire them to the ~4 helper screens (draft guide / in-season scout / lineup-vs-opponent / in-game advisor).

**Assembly work:**
- Merge the unmerged lanes into one line (see order below).
- Reconcile the stopgap lineups tab on the old hub vs the canonical hub's lineups board (canonicalize one).
- Flip the live `/franchise/:franchiseId` route from the old hub to the canonical hub (JK sign-off gate).

**Activation (JK gates):**
- Declare **feature freeze** (unblocks tuning).
- **Flip the engine flags on** (all 11 Phase-2 L-flags default false; fame + morale must flip together; + the reporter).
- **Browser smoke test + sign-off** on real data.

**Open decisions still awaiting JK** (batch): award-WINNER fame/news payout (ROY/Reliever winners — currently snub-only); rivalry-decomp sequencing; final team-identity set; phantom-bidder count; conferences vs divisions; **when to freeze.**

---

## ASSEMBLY ORDER (Captain-driven; JK gates the user-visible flips)

1. **Low-risk independent merges first** (parallel-safe): the soul/grudge lane + the home-park-rivals infra fix. Gate each: build + full suite + (soul) L-SIM.
2. **The canonical hub** (`lineups-fenway`): merge into the line; reconcile the duplicate lineups implementation; keep on the preview route for now.
3. **The draft lanes**: `draft-pipeline-fix` as base + `draft-setup-ui`'s screens on top (resolve the one archetype-catalog file). Verify the optimizer-engine merge state vs the live line (avoid double-merge).
4. **Retire** `auction-draft-ux-rehaul` after confirming `lineups-fenway` carries all its unique work.
5. **In parallel (independent Codex lane):** build the headless playoff/sim driver + fame-wiring + L-SIM postseason coverage; harden the L-SIM.
6. **Freeze → final all-on sim baseline → §16 tuning sweep.**
7. **Flip the engine flags on → flip the live route to the canonical hub → JK browser sign-off.**

**Serialization rule:** independent builds run in parallel worktree lanes; **heavy vitest/L-SIM gates run one at a time** (concurrent heavy suites flake each other). Codex builds; Captain (Opus) audits the diff + gates; JK accepts the user-visible flips.

---

## MODEL / EFFORT GUIDANCE

- **Captain / orchestration / contracts / audits / merge-conflict judgment / soul-layer correctness:** Opus 4.8, high (xhigh for soul-layer / tricky merges).
- **Building from a tight spec (UI wiring, scoped engines):** Codex (gpt-5.5), high. Novel engines (playoff driver): xhigh. (Never `very-high` — invalid, silently no-ops.)
- **Broad reads / inventory / scouting:** cheap subagents (Sonnet / Explore), low–medium. Never burn Opus on file sweeps.
- **Sims / test suites:** tooling, no model; serialize the heavy ones.
- **Tuning analysis (read sim output, adjust knobs):** Opus, medium–high.

---

## JK RULINGS — 2026-06-27 (post-audit, AUTH-4 ultra-think)

1. **All award WINNERS get honored, SCALED BY RARITY.** Every award winner (not just MVP/Cy Young) gets a fame BUMP + news coverage, scaled by the RARITY of the win. The MAGNITUDE is a §16 tuning concern (JK wants it tuned) → build the scaled-by-rarity mechanism with a tunable placeholder magnitude. **Supersedes the ENVY-2A "snub-only" default** (ROY/Reliever winners now get honored too). OPEN-DECISION: the exact "rarity" metric (how rarity scales the bump + news prominence) — ground/define from the fame/honor system; magnitude = §16.
2. **Playoff games get fame/clutch amplification** — confirmed (readiness item 7 / PLAYOFF-DRIVER-3).
3. **Champion MVP: defer UNLESS an easy add** (a playoff-stats MVP resolver in PLAYOFF-DRIVER-2 only if trivial; else defer).
4. **FREEZE GATE (the v1 finish-line sequence):** feature freeze + engine-flag-flip + hub live-flip happen ONLY AFTER (a) the ENTIRE DRAFT-PROCESS features are built AND (b) all non-deferred LIVING-SEASON features are built. THEN the §16 TUNING sweep (a BIG pre-play step — so a draft/season isn't started only to hit wonky magnitude sliders). THEN JK's browser sign-off. ⇒ **Pre-freeze build scope = draft-process features (Stream B / STREAM_B_DRAFT_UIUX_BUILD_PLAN.md) + non-deferred living-season features (playoff driver, winner-honors, assembly, any remaining §0d items).**
