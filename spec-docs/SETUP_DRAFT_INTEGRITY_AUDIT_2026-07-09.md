# SETUP → DRAFT INTEGRITY AUDIT — 2026-07-09 (JK-ordered sweep, "can this league setup screw up my draft")

**Trigger:** after TEAMIDGUARD closed the archetype-identity clobber JK found by hand, JK asked the standing question behind it: what ELSE on the league-setup/team-editor surfaces can silently diverge from what the live auction actually charges or draws from, once a pool is locked or a draft is underway? This doc is that sweep, run before any more setup-adjacent lanes dispatch.

**Method:** 5 parallel Sonnet dimension sweepers — **MONEY** (the salary-cap field and its writers), **STALE-BASIS** (draft-setup + team-editor settings vs. the pool's own staleness/re-extract detector), **SEATS/TEAMS lifecycle** (add/delete/rename teams, seat/human-flag changes, run-it-back/copy-league, after draft artifacts exist), **PLAYER EDITS** (ratings/position edits vs. the locked pool, snapshot-vs-reference across the auction pipeline), and **SILENT-CLOBBER + shape drift** on save paths — each producing raw gap claims with file:line evidence. Every claim then went through an independent Opus adversarial verifier whose default stance was to REFUTE it: re-derive the file:line chain from scratch, trace the claimed divergence to its actual consumption point (does the auction/pricing/legality math really read the stale value, or does something re-derive it live/get blocked/get caught downstream), and only let a CONFIRMED-HAZARD verdict stand if no refutation held.

**Raw evidence:** the full sweeper output + every verifier verdict, file:line for file:line, is committed verbatim at `spec-docs/data/integrity-sweep-2026-07-09-raw.json` (175KB, JSON — `result.confirmed` / `result.downgraded` / `result.refuted` / `result.safe`). This document is the digest; that file is the record if anyone needs to re-check a specific claim's exact evidence.

**Result: 39 claims → 8 CONFIRMED · 10 downgraded (real mechanism, overstated severity/scope) · 4 refuted (wrong conclusion entirely) · 17 SAFE (verified protected as designed).**

---

## §1 The headline: nothing here breaks a draft in the normal path

Every claim that survived adversarial review either (a) requires an out-of-order, unusual sequence a normal user wouldn't hit, (b) only misleads an advisory/diagnostic readout rather than the real auction math, or (c) is confined to one specific mode (pool-first) that already has a fix lane written for it. **No confirmed claim lets a locked pool silently mis-price or mis-legalize the live auction in the ordinary lock → start flow.** The worst confirmed items are: pool-first mode is missing the staleness safety net design-first already has (two items, fix in progress), and two Duplicate-League/team-lifecycle bugs around copying a finished draft or deleting a team (fix queued). Full detail below.

---

## §2 JK's salary-cap question, answered directly

JK asked where the league's dollar cap lives, who can change it, and whether it can diverge from what the auction actually uses. The sweep answered all five parts:

1. **There is exactly ONE cap field** on the league record (`league.salaryCap`), not a per-team override. **MONEY-5 (SAFE):** no per-team budget override exists anywhere in the data model — the cap is strictly league-wide and identical for every real club and every shill.
2. **Draft Setup's own cap editor ("THE MONEY") is fully gated** across the whole lock → draft-start window — you cannot touch it once the pool is locked. **MONEY-3 (SAFE).**
3. **The auction always re-derives the budget fresh** at draft start from the live league record, not from anything frozen earlier — a cap edit made before the draft starts can't retroactively corrupt an in-progress auction. **MONEY-4 (SAFE).**
4. **The one real hole:** the League Editor page (a separate screen from Draft Setup) has its OWN cap-edit field, and its save-guard only checks "is a saved auction session already running" — it has no idea a pool is locked. In **design-first** mode this is harmless: an existing detector (the same one that already protects everything else in that mode) independently notices the cap changed and blocks Start Draft. In **pool-first** mode, that detector doesn't run at all today (see §3, SB-1/SB-2/SB-4), so a post-lock cap edit on the League Editor page can currently slip through with no warning. This is **MONEY-1**, downgraded from the sweep's initial "always-clickable" framing (that framing was wrong — design-first IS protected) to a real, narrower, pool-first-only gap. **It closes as a side effect of the STALEPARITY lane** (§3), which extends the same detector to pool-first and folds the cap into what it watches.
5. **What actually gates the cap:** a hard floor (always enough to legally afford a bare-minimum 22-man roster), a soft advisory band, the pre-lock "can every club build a legal 22 under this cap" check, and the live auction's per-lot bid-room math plus the marginal luxury tax. All verified live and working as designed.

**Bottom line for JK: the cap is a single, well-guarded number in the normal flow. The one crack is pool-first-only and is already being closed (STALEPARITY, in progress).**

---

## §3 The confirmed gaps — what's real, and where it's being fixed

Every row below is either a true CONFIRMED-HAZARD or a downgraded finding whose surviving (narrower) hazard is still worth a fix. Each has a disposition — a lane already dispatched, queued behind another lane, or ticketed for after v1.

| ID | What's actually wrong (plain) | Verdict | Disposition |
|---|---|---|---|
| SB-2 | A club's MLB archetype (identity) picker stays editable after a pool-first lock. The locked pool stays frozen at the OLD identity mix, but the live auction's CPU bidding picks up the NEW identity immediately — a real drift, no warning, Start Draft stays enabled. | CONFIRMED-HAZARD | **STALEPARITY lane — building.** Contract: `spec-docs/contracts/CONTRACT_STALEPARITY_2026-07-09.md`. |
| SB-4 | Two of the pool-shaping dials (pool quality center, pool balance preset) aren't tracked by the pool's own staleness snapshot in EITHER mode, and pool-first has no backstop at all — worse, the balance preset isn't even saved, so it silently resets on a page reload, changing the shaping target under an already-locked pool. | CONFIRMED-HAZARD | **STALEPARITY lane — building** (same contract; extends the basis snapshot to cover both dials). |
| MONEY-1 | League Editor's cap field ignores pool-lock state in pool-first mode (design-first is independently protected — see §2). | DOWNGRADED — real but narrower (pool-first only) | **STALEPARITY lane — building** (the extended basis snapshot folds in the cap, closing this as a side effect). |
| SEATS-02 | If a team is ever deleted while still a league member, its id is stuck in the league forever with no way to remove it through the UI — and clicking "Duplicate League" on that league silently does nothing (the failure is swallowed, no error shown). | CONFIRMED-HAZARD | **COPYFIX lane — queued** (behind STALEPARITY; both touch the league-builder storage layer). |
| SEATS-06 | Copying ("Duplicate League") an already-drafted pool-first league leaks the ORIGINAL draft's results (won players, minted farm prospects) into the copy's draftable pool — a degenerate copy. A correct fix for this was already built and audited clean once, but it's stranded on an unmerged branch and never made it to main. | CONFIRMED-HAZARD | **COPYFIX lane — queued.** Re-lands the stranded fix (`codex/iter-copy-postdraft`, commit `84a0a162`, `copyLeaguePoolMembership()`), verified still absent from current main. |
| F5 (Duplicate League roster-copy) | Duplicate League silently drops a GM's saved board-ranking preference on the copied team (keeps everything else) with no explanation for why that one field is dropped while a sibling field is kept. | LATENT — confirmed, low severity | **COPYFIX lane — queued** (same duplicate-league code path). |
| SEATS-04 | The "a saved auction is in progress, editing is locked" guard used on the Teams/Leagues/Players pages only checks for an MLB auction session — a live FARM auction is completely invisible to it. While a farm auction is paused mid-draft, someone could freely edit or delete the exact teams/players it's pricing off, with the lock message implying protection that isn't actually there for farm. | CONFIRMED-HAZARD | **COPYFIX lane — queued** (extends the same guard to also check the farm session). |
| SB-12 | Design-first mode's own stale-pool detector runs one render tick after an edit (a zero-delay timer), not instantly. A real person's mouse click always lands after that tick finishes, so this never actually misfires for a human — it would only matter to a scripted/automated tool clicking faster than a person can. | CONFIRMED, class LATENT — not reachable by a person | **Ticketed for v1.1** (harden only if the setup flow is ever scripted/automated). |
| F1 (board-rank vs. archetype-pick race) | A very tight timing window (under half a second: reorder your board → switch tabs → pick a new archetype, all within that half-second) can cause the archetype pick to visibly un-pick itself moments later. It's not silent — you'd see it revert on screen and could just re-pick it — but it's a real bug. | DOWNGRADED — real, but visible/recoverable, not silent | **Ticketed for v1.1.** |
| F2 (position captured live at Start Draft) | A player's price is frozen the moment the pool locks, but their POSITION is re-read fresh at the moment the draft starts. If someone edits a player's position (e.g. closer → starter) in the narrow window after locking but before starting — an unusual, out-of-order thing to do — the price could reflect the old position while roster legality uses the new one. | DOWNGRADED — real, but needs an unusual out-of-order edit | **Ticketed for v1.1.** |
| F3 (lock→start rating edits reach the tax math) | The luxury-tax calculation reads player ratings and team tax-identity live, not from anything frozen at lock. Normally that's fine because editing is blocked once a real auction session exists — but in the narrow window between locking the pool and actually starting the draft (before a session exists), a ratings edit on the Players page could change the tax number the draft opens with. | DOWNGRADED — real, narrow window, only affects the tax reservation (not the core price) | **Ticketed for v1.1.** |
| F7 (mutation guard is UI-layer, not storage-layer) | The "editing is locked while a draft is active" protection lives in the page components, not in the underlying save functions themselves. Today only three pages can edit this data and all three carry the guard, so there's no live bug — but any FUTURE edit surface (an import tool, a bulk-edit feature) added outside those three pages would silently skip the protection. | CONFIRMED, class LATENT — architecture note, no live bug | **Ticketed for v1.1** (a storage-layer invariant would close this permanently; not urgent). |

**Naming note:** this document's "GAUNTLET" lane (§5) is a distinct, newly-queued lane for proving full-draft completion holds up under REAL tax deductions — it is not the same thing as the Mode-1 punch-list's "gauntlet" validation grid (`MODE1_PUNCHLIST_2026-07-08.md` §3), which is a different, already-run exercise from 2026-07-08. Same word, two different pieces of work — flagged here so a future reader doesn't conflate them.

### §3b — downgraded further, no lane needed (transparency record)

Six more items were downgraded all the way to SAFE-in-practice or a non-blocking architecture note after adversarial review — real mechanisms, but the actual harmful path turned out to be already blocked by something the original claim missed. Recorded here so nothing gets quietly dropped:

- **SB-1** ("pool-first has zero staleness coverage of any kind") — true as a structural fact, but the specific harmful sequence it describes (lock a pool, freely edit the shaping dials, then start) is blocked in BOTH directions: every shaping input is disabled while the pool is locked, and you can't start an unlocked pool. The missing detector is correct-by-design for pool-first's self-contained shaping inputs; the real narrow gap (identity/dial edits — SB-2/SB-4) is what STALEPARITY actually fixes.
- **SB-5** ("team count changes with no lock-awareness") — a separate, mode-agnostic safety check (the pool's demand-sufficiency floor) already reads the live team count and blocks Start Draft if a locked pool falls short after a team is added. The real gap left is cosmetic (no "re-check recommended" nudge), not a broken-draft path.
- **SEATS-01** ("deleting a team leaves a stale count that feeds real pool sizing") — the specific number the claim pointed at is dead code nothing reads; the real auction seats and pool contents derive from a correctly-filtered team list. The actual, milder impact: a deleted-but-not-cleaned-up team can throw off the on-screen affordability/legality ADVICE shown to the user by one club's worth — worth a cleanup, not a hazard.
- **SEATS-03** ("farm tax-identity editor clobber, sibling to the just-fixed MLB bug") — the clobber mechanism is real, but unlike its MLB sibling (which prices real dollars), the one farm field that's actually read today only reorders a handful of advisory hint labels on the farm assistant-GM board — no dollars, no lot pricing. Downgraded to cosmetic.
- **SEATS-05** ("adding a new team after lock produces zero warning") — one specific detector does miss it, but two OTHER live checks (every club needs an assigned identity; the pool must still meet the size floor) already block Start Draft in exactly that scenario. No reachable path lets an under-sized pool start silently.
- **F1** ("pool lock doesn't block player-record edits, only an active session does") — true, but the part of the pool that's explicitly promised "frozen" (price/value) provably IS frozen — the auction reads it from the locked snapshot, never live. The only thing that can leak through this window is position/trait data feeding a soft, permissive nomination-preference hint — folded into the F2 ticket above since it's the same underlying gap.

---

## §4 The safe list — the good news that bounds the worry

Seventeen claims were checked and verified genuinely protected as designed. Listed in full because this is the part that should reassure, not just the gaps:

1. Draft Setup's own salary-cap edit path is fully gated across the lock → draft-start window (MONEY-3).
2. Auction session init always re-derives the budget fresh from the live league record — a mid-session cap edit can't retroactively corrupt an in-progress draft (MONEY-4).
3. No per-team budget override exists anywhere in the data model (MONEY-5).
4. Design-first mode is genuinely well-covered — two independent, largely redundant safety nets bound the worry there (SB-6).
5. Cap, pool-size multiplier, and draft pool sources are hard-blocked (not just staleness-flagged) while the pool is locked, in both modes (SB-7).
6. Reserve price (the auction's opening-ask floor) cannot go stale by construction — it's read live at the one-time draft-start commit, then correctly frozen inside the saved session afterward (SB-8).
7. Board-rank overrides and pin lists are defensively coded against dangling references to players who leave the pool (SB-9).
8. Individual team-editor edits (name/colors/stadium/tax-identity) don't feed pool extraction, so their weaker save-guard doesn't create a staleness gap on its own — though the general pattern is worth naming (SB-10).
9. Board-rank overrides / roster-design rank overrides with dangling player ids are handled safely by design (SEATS-07).
10. A dangling rivalry-opponent reference (from a deleted team) is safe at its one real consumption point; only a cosmetic blank dropdown remains in the Teams editor (SEATS-08).
11. Auction start correctly snapshots live team/seat/identity data exactly once — the intended snapshot-vs-reference pattern is implemented correctly (SEATS-09).
12. IV and salary — the actual auction pricing basis — genuinely freeze at lock/registration and are immune to post-lock rating edits (F4, player-edits dimension).
13. Once an auction session is actually active, player edits ARE comprehensively blocked (F5, player-edits dimension).
14. Pinned-player references (the design-first roster designer) degrade gracefully on deletion or pool removal (F6, player-edits dimension).
15. Backup/restore and cloud sync are raw whole-record round-trips — no field-level schema reconstruction, so newer team fields survive untouched (F3, silent-clobber dimension).
16. A saved auction session's team state never embeds tax-identity/board-rank/archetype data — those are always re-read live per lot, never snapshotted at draft start (F4, silent-clobber dimension).
17. The one identity-normalizer that reconstructs (rather than spreads) a team/league record anywhere in the codebase is deliberately narrow and doesn't touch anything else (F6, silent-clobber dimension).

---

## §5 The completion question, answered

JK's standing worry: can a draft ever finish with a team unable to fill its roster because of tax/budget pressure? **No — completion is guaranteed by construction**, not by luck: every lot has a per-lot solvency gate, and the terminal cleanup cascade clamps any untaxed backfill so nothing can get stranded. This was proven once already (M1Q/M1J, 2026-07-08 — see `V1_BUILD_STATUS.md` §0 items 1l/1m). **What hasn't been proven yet is that same guarantee holds with the REAL luxury tax now actually draining budgets** (TAXTEETH/TAXPRECISION, landed/in-flight this wave) — the completion proof predates real tax deductions. **A GAUNTLET lane is queued, behind TAXPRECISION**, to re-run that same completion proof with real tax active and confirm nothing changed.

---

## §6 Where the evidence lives

- Raw sweep output (all 39 claims, full file:line evidence, every verifier verdict): `spec-docs/data/integrity-sweep-2026-07-09-raw.json`.
- STALEPARITY lane contract (SB-2/SB-4/MONEY-1 fix, in progress): `spec-docs/contracts/CONTRACT_STALEPARITY_2026-07-09.md`.
- COPYFIX and GAUNTLET lanes are queued, not yet dispatched — no contract file exists for either as of this pass; see `CONTINUITY_CHECKPOINT.md` §3/§4 for the current queue order and what each is waiting behind.
