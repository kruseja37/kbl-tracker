> ⚠️ **SUPERSEDED (2026-07-01).** The single v1 source of truth is **`spec-docs/V1_BUILD_STATUS.md`**. This map predates the 2026-06-30 draft re-design; its branch-map is stale (git now shows soul-gaps merged, several codex branches contained). Kept for history — do not plan from it.

# V1 ACTIVATION READINESS MAP
### The true road from today to a playable, flippable franchise — grounded in the last 24–48h of real git/code, not the stale planning docs.

> **Created:** 2026-06-26 (attended, JK asked "map the road to flip-on"). **Method:** a 10-agent
> decorrelated sweep (6 grounded readers, one per active front + the flip-on gate + the JK backlog;
> 3 adversarial verifiers: flip-readiness, cross-front convergence, independent git-reality) — ~979k
> tokens, 164 tool uses, every claim git/code-grounded.
>
> **⚠ SUPERSEDES, for the activation question, the stale planning docs.** `MODE2_V1_COMPLETENESS.md`
> + `MODE1_TO_MODE2_V1_LAUNCH_READINESS.md` are ~2026-06-20; `FRANCHISE_SETUP_TO_SEASON_ROADMAP.md` is
> ~2026-06-25. A LARGE amount shipped in the last 24h that none capture. Where they conflict with this
> doc's git evidence, **this doc wins** for "what is actually built / what gates the flip" — but the
> roadmap remains the design source for the front-door workstreams. (JK directive 2026-06-26: ground in
> last-24h git, not the docs; anything pre-2026-06-10 is obsolete.)

---

## 0. UPDATE — 2026-06-26 (+ the Franchise-Lens real-data adapter plan)

JK surfaced `FRANCHISE_LENS_REALDATA_ADAPTER_PLAN.md` (on the `auction-draft-ux-rehaul` worktree). It is
the hub team's recipe for "swap mock → real data" — **PLAN ONLY, no code, awaiting JK greenlight**
(verified: the `useFranchiseLensData` hook + the real-data route do not exist yet; the hub is still fed by
hardcoded mock view-models). It **de-risks the scariest item on this map and refines the §3 coupling**:

- **The hub is a confirmed pure VIEW component** — it takes one bundle `{teams, active, hub}` and draws it;
  it doesn't know or care where the data comes from. So wiring real data is a clean, contained *translator*
  (one new hook + one new parallel preview route), **zero hub changes, live app untouched.** Only two
  fields in the bundle are required, so it ships **incrementally** (spine first, the rest fills in).
- **The engine↔hub coupling decomposes into THREE stages, not one big-bang:**
  1. **Hub on real data, engine OFF → "the spine lights up."** Real standings, roster, money, value,
     stadium, schedule, stat leaders — with the soul layer (morale/feuds/events) rendering its real-but-
     *neutral* state (morale reads a flat 50, no history; no auto-events). **LOW risk, immediately
     browser-verifiable, and gated only on a JK greenlight — NOT on the engine flip.** This can start now.
  2. **Same hub, engine ON (test save) → "the living season comes alive."** The neutral surfaces *fill in*
     with real movement, **no UI rework** — the hub was built so they light up the moment the flag flips.
     This is the visibility payoff, and it needs the flip gates (§4).
  3. **The LIVE swap** (point the real home screen at the new hub, rewrite the locked tests) — separate,
     destructive, explicitly greenlit, deferred. The only HIGH-risk part.
- **Net effect on the road:** stage 1 lets the hub-wiring proceed *ahead of* the flip and *in parallel*,
  turning "flip engine + land hub together" from a risky simultaneous drop into **"wire the hub on real
  data now (flags off) → then the flip is just watching an already-wired hub come alive."** The §5 item
  "wire the hub to real data" drops from *[wire-up, large/scary]* to **planned, file:line-verified,
  pure-additive, low-risk for the first two phases** — greenlight-gated, not exploratory.
- **New JK decisions this raises** (folded into §6): greenlight the parallel-route adapter (rec: yes);
  for the first real-data pass keep the engine OFF (honest spine) then do a dedicated flags-ON verify pass
  (rec: OFF first); which existing franchise save to verify against. The hub front is ~83 commits behind
  the engine trunk and **must rebase** to pick up the rivalry seam it displays.

---

## 0c. PATHWAY TO THE FULL-V1-SIM — the operative plan (2026-06-27)

> JK's near-term target: run a FULL-SEASON sim with EVERY v1 system switched on, for assurance + §16
> number-tuning — BEFORE finishing the UI rework + manual browser tests. Re-grounded in current code
> (8-agent audit, post-build). **This is now the operative plan; the §5/§5b build lists are PARTLY
> SUPERSEDED** — the optimizer/mWAR/Stream-A-B/data-loss/name work has LANDED.

**What just landed — and whether the sim needs it:** the roster optimizer + manager-WPA (mWAR) engine
layer, Stream A/B UI, and the data-loss/invented-names/Manager-of-the-Year fixes are DONE — and **all
orthogonal to this milestone.** The optimizer is advisory (writes no living-season state); mWAR is already
exercised by the sim (feeds Manager-of-the-Year only, drives no morale/fame/development); the fielding
true-value stays in the guide layer (canonical value frozen); UI/data fixes aren't sim inputs.

**THE TRAP (headline):** a naive "flip everything + run" TODAY would falsely report all-green while FOUR
ratified systems sit silently dead — two have a switch flipped-on but wired to nothing (rebrand, fame
merit-floor), two have no switch and just aren't built (the fielding credits) — AND the sim's test reports
green even when a critical check fails (it never reads its own results), AND the two newest databases are
invisible to the determinism check. "It ran green" today would be meaningless. The pathway closes this.

**Remaining ENGINE work — the 6 soul gaps (wire the sim's inputs):**

| Gap | Wire or build | Size | Note |
|---|---|---|---|
| Rebrand/relocation TRIGGER | wire (trigger only) | small | all machinery built; nothing fires it per game. **JK fork: in/out for v1.** Re-bakes. |
| Fame merit-floor | wire | small | finished function, never called; the sim's check passes vacuously (false comfort). Upward-only. Re-bakes. |
| Race/All-Star-envy → rivalry edge | build | medium | rivalries only form from personality today; competition/snubs don't. Genuine new source. Re-bakes. |
| Record-overtake rivalry (hop-6) | partial build | medium | the rivalry writer already runs; the overtake trigger is unbuilt + **pending JK design pass.** Re-bakes. |
| ~~1B-scoop fielding stat~~ | ✅ DONE | — | **FIELD-CREDITS-1 (`7484e9c8`).** rescuedThrow → position-3 fielder credit, aggregated into season stats; persistence + WPA-attribution grounded; +1 fix-iter (throws→graceful skip); L-SIM re-baked clean. |
| ~~bases-saved fielding stat~~ | ✅ DONE | — | Same ticket — basesSaved → held-runner fielder, summed by value. |

(The 7th prior item — fame↔morale coupling — already runs in the all-on sim; nothing to build. Note: it is
NOT morale-guarded, so a fame-only test leg would still write morale — a policy call, not a blocker.)

**Remaining SIMULATOR work (make it fit to be the judge):**
- ✅ **DONE (SIM-DBCAP-1, commit `11371b50` on `claude/v1-soul-gaps`).** Captured stadium-records + home-park-rivals
  into the sim snapshot — the determinism digest + every invariant now see them (was: reset-but-invisible, a
  stadium-record/rival divergence could corrupt fame and still "pass"). Codex-built, Captain-audited-real-diff,
  L-SIM re-baked (determinism held, structural diff = only the 2 new rowCounts + digest, existing data byte-identical).
- **Add a real full-season run + one command** (today only a 60-game checkpoint leg exists; the milestone
  has no runnable object yet — and it must be the long leg, not the short smoke).
- **Make the test gate on its own results** (today RC stays green even on a critical failure).
- **Author correctness checks for the ~9 newest soul systems** (today even a fully-wired run only proves "it
  runs," not "it's right").

**The ordered pathway** *(Triangle in force: Codex builds · Captain audits + runs the sim · JK decides + manual sign-off):*
0. **JK rules the gating decisions** (below) — blocks everything downstream.
1. **Wire the 6 gaps.** Parallel-safe: the two fielding stats + fame-floor + the DB-capture harness fix. Serialize: the two rivalry gaps (share a file); land rebrand **last** (loudest mover). **One baseline re-bake at a time.**
2. **Finish the harness** (full-season run + gate-on-summary + the ~9 missing checks).
3. **Knob-completeness pass** — every tunable number pulled into a named, default-neutral knob (no behavior change), so the sweep can move it.
4. **JK declares FEATURE FREEZE** — the line after which the sim is the judge.
5. **Final full-season all-on sim** (Captain runs / JK accepts) = the committed sign-off baseline.
6. **§16 number-tuning sweep** against the frozen baseline.
7. **THEN UI rework + JK manual browser tests** (sole real-world acceptance gate).

**JK decisions gating the path:** (1) rivalry sequencing — **✅ RULED: ONE combined relationship engine** (record-overtake
+ race/All-Star-envy ship together); (2) rebrand in/out — **✅ RULED: IN for v1** (machinery built; wire the trigger,
land it last among the wires); (3) dump `kbl-franchise-stadium-records` + `kbl-franchise-home-park-rivals` into the sim
snapshot [Stage-2 harness fix, do it — yes]; (4) re-grade store + RA-7 park-adjust — **documented default: DEFERRED**
(set-aside JK forks, not ratified-in; NOT in the full-sim scope unless JK pulls them in); (5) the freeze declaration
timing — Stage 4, JK; (6) non-blocking: should fame-writes require the morale switch too — document, move on.

**Captain must independently gate before trusting "green":** the just-landed mWAR Manager-of-the-Year commit
(`5b7f1e33`) deliberately re-baked all 6 sim checkpoints + widened a critical check — I (Captain) must re-run
build + full suite + the L-SIM and confirm byte-identical reproduction before any of this counts as a clean
base. (Static audit only; no build/test/browser run performed here.)

---

## 0d. WIDENED — THE WHOLE-ARC ASSURANCE (2026-06-27)

> ⚠ **§0c was TOO NARROW.** JK flagged that "v1 ready" must mean the WHOLE user arc is proven — auction draft
> A-Z → freeze/data-carry → full living season → **PLAYOFFS** → end (no offseason) — not just the season soul
> layer. A 9-agent re-audit confirms: **today's assurance covers the MIDDLE THIRD only.** §0c's plan (wire 6
> soul gaps → finish harness → final sim → tune) is the SPINE; this widens it to the two ends + two seams.

**Corrected coverage map:**
- ✅ HAVE: roster-under-budget (draft internals), the season soul layer, season-end awards, full-length reach.
- ⚠ PARTIAL: auction bidding (runs headless but **CPU shills OFF — they never bid**, so competitive
  price-formation is never exercised), farm/scout draft, archetype+salary, the FREEZE data-carry (rosters/
  identities/salaries carry, but **archetype doesn't carry**, **fame isn't seeded**, no soul-carry assertion),
  clean-end (verified by reading code, not by a run landing on it).
- ❌ GAP (no coverage): **drive-the-sim-from-a-REAL-drafted-franchise** (the sim uses a SYNTHETIC seed → the
  freeze→season seam is driven by nothing), **milestone/records/Almanac correctness** (accumulate but nothing
  asserts they're right → silent-wrong risk), **the entire PLAYOFF finale** (NO automated run ever crowns a
  champion — zero playoff drive code, only bracket math, no series simulator), **playoff fame/clutch
  amplification** (unwired orphan).

**The three legs the prior plan missed:** (1) the freeze→season handoff, (2) milestone/Almanac correctness,
(3) the whole playoff finale through to a champion. **GOOD NEWS:** the long-feared missing piece — a headless
auction driver — **already exists** (stale worry). The single genuinely-NEW engine build is the **headless
PLAYOFF driver**.

**Widened pathway (strict SUPERSET of §0c; [NEW]=added; Codex builds · Captain audits+runs · JK decides):**
1. Wire the 6 soul gaps (§0c) — lane A. · 2. [NEW] Lift the existing headless auction driver into a shared
helper — lane B (S). · 3. [NEW] Shills ON + competitive-bid/solvency/determinism/position-legality asserts —
lane B (S). · 4. [NEW] Milestone/Almanac correctness invariant — lane A (M). · 5. [NEW] Soul-carry-post-freeze
asserts (morale/fan-morale/captain/GM/value-baseline) — lane B (S). · 6. [NEW] Freeze→season BRIDGE: sim runs
on a REAL frozen franchise, not the synthetic seed — single lane (L). · 7. [NEW] Wire live playoff context →
fame/clutch amplification — lane A (M). · 8. **[NEW, CRITICAL] Build the headless PLAYOFF driver → bracket →
series → champion + MVP** — single lane (L). · 9. [NEW] Clean-end asserts (champion+MVP recorded, no offseason
entered) — S. · 10. Assemble the whole-arc object (build league → auction shills-on → freeze → full season →
playoffs → ceremony) + run the §16 tuning sweep over the frozen baseline — Captain assembles / JK greenlights.
Then: UI rework + JK manual browser tests (last gate).

**TUNING REPORT (deliverable, confirmed):** both surfaces, tuned against the ASSEMBLED all-arc baseline —
(a) season soul (morale matrix, fame, relationships, traits, event rates, dampener, award qualifiers, freeze
morale deltas — almost all placeholder-flagged); (b) draft (shill aggressiveness, scout noise, archetype
EV-parity band, salary weights — but the luxury-cap + archetype-fraction tables are WORKBOOK-derived →
regenerate via script, do NOT hand-tune). "Wonky" detectors: morale saturate/flatline · fame runaway/dead ·
rivalries all-dissolve/spam · award misfires · milestone spam/silence · salary blowout · archetype escaping the
band · any same-seed determinism drift (must be zero before trusting any tuning verdict).

**Direct answers:** (a) full experience now in the plan ✅; (b) **UI rework concurrent ✅ — no collision**
(assurance work is engines/storage/harness; UI is page/component layer on stable seams); serialize the heavy
test gates + ONE coordinated storage field (`archetypeKey` on the franchise team record) both lanes need; carve
the archetype-chooser + scout-privacy UI to the UI lanes; (c) tuning report ✅ confirmed.

**JK decisions added by the widening:** extend-the-sim vs separate harness [rec: extend]; fame-at-freeze
(seed vs leave unseeded — prior G5 read = leave) ; **archetype carry — already RULED** (store + carry the
archetype name, per the Stream B ruling); draft-baseline value rows (wire a reader vs delete the orphan — the
old G1 fork); playoff amplification (confirm playoff games worth more fame/clutch for v1 [rec: yes, small wire]);
gate strength (harden the test to fail on regression [rec: yes]); tuning-sweep timing (AFTER the assembled arc).

---

## 1. Bottom line

The living-season engine is far more built than any written doc says — the heart of it (team and player
morale, fame, feuds, trade demands, stadium records, the home-park rivalry) is finished, running in
simulation, and quietly green. **v1 is no longer gated on building the engine. It's gated on three
things, in this order: a decision from JK, a screen for JK to look at, and JK's hands-on sign-off.**

The single biggest realization: **flipping the engine "on" by itself shows the player almost nothing.**
Most of what the engine produces (fame, feuds, stadium records, rebrands) has no place on screen in
today's live app — the screen that *would* show it is the new "old ballpark" franchise hub, which is
fully designed but still running on fake demo data on a separate track. So a real v1 isn't "flip the
engine on." **It's "flip the engine on *and* land the new hub at the same time"** — otherwise you turn
on a living season nobody can see.

The remaining road is short on engine code and long on the human stretch: a final full-season
simulation, a scattered number-tuning pass ("make it feel right"), the hands-on smoke test, the playable
sign-off, then the flip. None of those four human/tuning gates have happened, and the standing rule
across every doc is still "do **not** flip the engine on."

---

## 2. The four fronts, in plain English

**Front 1 — The living-season engine (the "brain") — `codex/franchise-v1-next`.** The most advanced and
most surprising. Nearly the whole thing shipped quietly behind an off-switch: morale, fame, feuds and
player relationships, trade demands, stadium records, and — just today — the entire home-park rivalry
(rivals shown in red, rival games swinging fans and the captain's mood a little harder). It runs
end-to-end in the season simulator and the simulator is green. **Done-dark** — built, wired, tested,
simulating, switched off. The only true engine pieces *left* are small and specific: one merit-based
fame floor that was wired up but never plugged in; the rebrand/relocation feature (the cascade math
exists but **nothing triggers it — flipping its switch today does literally nothing**); and one small
"rivalry between two players" writer that's the next ticket in the queue. **Verdict: done-ish, a few
small slivers left.**

**Front 2 — The draft pipeline + archetype balance (the "front-door logic") — `codex/draft-pipeline-fix`.**
The real draft — pool → auction → into your franchise — is fixed and working, and the team-identity
system (15 historical flavors like Murderers' Row, Bomba Squad, Whiteyball) is built *and proven fair*:
every one of the 15 lands within a tight balance band on the real money engine across all three power
tiers. The two-pick big-league/farm identity model touches the real auction, not a demo. **What's left
is the next big build, not started: a "roster optimizer / scout's-edge" tool** (tells you which
identities your pool can actually support, and gives the draft guide a fielding-aware "true value" so it
doesn't oversell a slugger with no glove). **Verdict: mid-build — logic solid, the marquee next tool is
greenfield.**

**Front 3 — The draft-setup screens (the "front-door look") — `codex/draft-setup-ui`** (forked off
Front 2 ~37 min before this snapshot; effectively one front, recently split). All ~11 pre-season screens
— pick-your-identity, set up seats/GM/CPU opponents, season rules, the draft-guide card, the in-season
scout/lineup helpers — exist and look right in the KBL style. **But every one runs on fake demo data;
none is wired to a real engine or saved anywhere; none has replaced a real screen.** They live on hidden
preview routes for review. **Verdict: mock, not real — a reviewable look, zero plumbing.**

**Front 4 — The franchise hub redesign (the "old ballpark" clubhouse) — `codex/auction-draft-ux-rehaul`.**
A gorgeous, aged-Fenway / Green-Monster-scoreboard reimagining of the in-season franchise home: player
dossiers, schedule, the trophy board, a rich stadium tab, widened standings and the newspaper, and the
"soul layer" (mood swings, feuds, the firing/rebrand/ceremony moment takeovers) made visible. Fully
built, builds clean, zero errors. **But it too is 100% fake demo data, sits on a hidden preview route,
and has never been merged into the live app.** "Backlog complete" here means *visually* done — not live.
**Verdict: mock, not real — but this is the screen the whole living season needs to be seen.**

---

## 3. The pivotal coupling — the thing that reframes "v1"

**Turning the engine on and landing the new hub are one milestone, not two.**

The engine writes its drama (moods, fame, feuds, records) into storage. **Today's live app has almost
nowhere to show that drama** — only basic team morale has a real on-screen home. Fame, feuds, stadium
records, and rebrands have *no live display at all*; the only thing that reads them is the AI reporter,
and the reporter is itself switched off. So if you flip the engine on with today's hub, **the user sees
essentially nothing change** — a living season running invisibly.

The new "old ballpark" hub *is* the surface that renders all of it. But the reverse trap is just as real:
ship that beautiful hub *without* flipping the engine, and it shows neutral, empty placeholders, because
the engine it reads from is still dark.

**So neither half is "v1" on its own.** A perceivable living season = the engine flipped on **and** the
new hub wired to real data, shipped together. Right now those two are on separate tracks, owned and
scheduled independently, and **nobody's plan says they must ship in the same release.** This is the most
underweighted fact in the whole picture, and it should become one named milestone: **"living season made
visible."**

> **Refined by §0 (the lens adapter plan):** this coupling decomposes into three stages — the hub can be
> wired on real data *before* the flip (engine off, low-risk, verifiable now), so the flip becomes "watch
> an already-wired hub come alive," not a risky simultaneous big-bang.

---

## 4. The road to flip-on (the gate chain)

A six-link chain. Only the first link is done.

1. **Merge the build lanes into one trunk — ✅ DONE.** The auction/draft half (`mode1-v1-b`) and the
   ratings half (`ratings-finish-c`) are both git-confirmed fully folded into the engine trunk (0 commits
   behind). The old worry that "the engine branch has no auction code and that merge still blocks D12" is
   **stale — that merge already happened.** The combined tree exists today.

2. **Final full-season simulation — 🟡 PARTIAL.** The simulator runs every day as a regression safety net
   and is green at the 60-game checkpoint (latest re-bakes byte-identical). But the *final*, full-length,
   "feature list is frozen, run it to the end and sign it off" pass has **not** happened — and can't
   honestly happen while new engine tickets land every few hours. No declared freeze yet. A real remaining
   step that is partly a discipline call, not just compute.

3. **Number-tuning sweep ("make it feel right") — 🔴 NOT STARTED, real lift.** Roughly a hundred "feel"
   knobs sit at placeholder values across the engine — mood-swing size, random-event frequency, how much a
   rival game stings, the draft wallet splits. The *shapes* are locked; the *numbers* are guesses awaiting
   this sweep, which can only be calibrated against the final simulation. No single ticket — it's
   scattered, and it's the largest piece of remaining *work*.

4. **Hands-on smoke test — 🔴 NOT STARTED (JK).** Play the app by hand, confirm the living season is
   genuinely *off* — no phantom moods, nothing firing while it's supposed to be dark. The test that
   *proves* "built-dark" held. Needs the merged tree (now exists).

5. **Playable-v1 sign-off — 🔴 NOT STARTED (JK).** Acceptance, on real data, that the franchise plays
   end-to-end. The only real-world acceptance gate in the whole system.

6. **The flip — 🔴 NOT STARTED.** Turn the engine switches on (all confirmed off today). **Honesty:** the
   11 living-season switches are *not* the whole switch — there are component-level switches still off (the
   in-app simulate buttons, the All-Star screen, the offseason flow) and the AI-reporter emission config
   (defaults to "marquee only," so reporter takes stay mostly dark even after the flip). And the switches
   are **not** cleanly independent (see §below): fame-on with morale-off would write moods anyway and
   *fail* the smoke test — fame and morale must flip as a pair.

**Honest read:** links 2–6 are all open; the heavy lifts are the tuning sweep (work) and the two manual
gates (JK). The engine code is *not* the bottleneck.

> **Pre-flip cleanup still pending (small):** the awards-ceremony flow still imports the old
> `calculateMOYVotes`/`mwarCalculator` (the MOY-5 "retire + re-point" half); the `getFameTier` label-purge
> is deferred to the fame-activation ticket. Both are pre-activation hygiene, not blockers to building.

---

## 5. What's genuinely LEFT to BUILD (de-duplicated across all fronts)

**Needed for a flippable v1:**

- **Plug in the merit-based fame floor** — *[wire-up, small].* The piece that keeps fame honest (so a
  fluke hot streak doesn't crown someone) was built but never connected. Confirmed still orphaned.
- **Give the rebrand/relocation feature a trigger + flag-wiring** — *[build, medium].* The cascade math
  exists and is unit-tested, but the **entire offer→apply→cascade chain has zero callers** and isn't in
  the per-game flow at all; flipping its switch does nothing today. The single largest engine system still
  needing real wiring. (Correcting the stale doc *and* an earlier optimistic read — it's deader than both
  said.)
- **The small "two-player rivalry" writer** — *[build, small].* Next ticket in the queue; JK asked it not
  be built in isolation (see §6).
- **The roster-optimizer / scout's-edge tool + fielding-aware true value** — *[build, large].* The marquee
  next tool on the draft side; greenfield. The draft-guide/scout screens can't show real numbers until it
  stabilizes.
- **Wire the draft-setup screens to real data** — *[wire-up, large].* All ~11 are fake demo today; needs
  the save-path for seats/GM/CPU-opponents/identities and the link to the optimizer above.
- **Wire the new franchise hub to real data** — *[wire-up; LOW risk phases 1-2, planned].* **De-risked
  by the adapter plan (§0):** the hub is a pure view component fed one bundle, so this is a contained,
  pure-additive translator (one hook + one parallel preview route, zero hub changes, live app untouched),
  shippable incrementally and verifiable on real data *with the engine still off*. **Greenlight-gated, not
  exploratory.** The separate *live swap* (point the real home screen at it + rewrite locked tests) is the
  only HIGH-risk part and is deferred.
- **CPU "phantom bidder" opponents in the auction** — *[BUILT — verified 2026-06-26].* Correction: the
  shill bidding engine (`cpuShillBidding.ts`, `cpuBidOnLot`) is built and wired into the live auction hooks;
  CPU bidding AI exists. The Jun-25 "shills inert" note is STALE. The ONLY remaining piece is the setup
  count + league-size scaling + pre-auction persistence — folded into Stream B's rulings.
- **Conferences on/off toggle wired to what the season actually uses** — *[build, medium].*
- **The number-tuning sweep** — *[tuning, large].* The biggest scattered lift (§4).

**Nice-to-have / v1.1 (don't let these block the flip):**

- The full pitcher-vs-batter "matchup history" rivalry engine — *[build, large]* — design-captured, 5 open
  questions, not v1-required.
- The fame "status" layer (call-up/send-down/bench multipliers) — *[build, medium]* — already a logged
  deferral.
- The AI reporter's written "takes" — *[wire-up + tuning]* — separately switched off; can follow the
  visual flip.
- The empirical "which identity beats which" matchup matrix — *[tuning, large]* — needs real season data;
  inherently post-flip.
- All-Star counter, per-stadium stat displays, Almanac chip/icon polish — *[polish, small each].*

---

## 5b. NEWLY FOUND — adversarial completeness sweep (2026-06-26 PM)

A 9-agent adversarial sweep (refuted ~18 candidates, 7 survived) found these v1 builds the §5 list missed.
Two were independently re-verified by the Captain (A confirmed; the fame/morale "already safe" claim REFUTED —
see note). No hidden economy bomb (the frozen value-baseline is stamped → a decision, not a build).

- **A — rivalry store missing from BACKUP and SYNC registries** — *[fix, small, HARD data-loss blocker].*
  `kbl-franchise-home-park-rivals` (shipped this week) is in neither `backupRestore.ts` nor `syncConfig.ts`,
  while the sibling `kbl-franchise-stadium-records` is in both (Captain-verified). Backup/restore or cross-device
  play silently drops all rival history. Fix = register it in both, mirroring stadium-records. → data-integrity.
- **D — race / All-Star-envy → relationship-edge formation source NOT built** — *[build, medium, correctness].*
  Edges form only from personality clashes; the §22.4/§24.10 race-competition + snub source has no edge writer
  (the snub *morale* fires, but creates no lasting edge). → engine / L13.
- **B — 1B scoop (rescuedThrow) never reaches season fielding/ratings** — *[build, small, correctness].* Captured
  + affects in-game WPA, but no season aggregation. JK-ruled v1 credit on an un-merged branch (`3617b8c6`). → RA fielding.
- **C — bases-saved never reaches season fielding counting stat** — *[build, small, correctness].* Same ruling/branch. → RA fielding.
- **E — reporter byline names are invented** (`reporterNameGenerator` era pool), live + un-flag-gated — *[fix, small,
  rule violation].* The reporter NAME, distinct from the deferred LLM "words". → launch-contract cleanup.
- **F — two bridge scout labels are invented placeholders** ("Startup Farm Scout N" / "Franchise Setup Bridge Scout N")
  shown next to real prospects — *[fix, small, rule violation].* Interactive path already uses the real pool. → Stream B / launch-contract.
- **G — setup→season seams have no connective tissue (WS-0)** — *[build, medium, clean-first-run blocker].* Farm-draft
  dead-end, two live construction hubs, no freeze confirmation, misleading copy. JK-ruled "do first," unowned. → its own pass or Stream B.

> **CAPTAIN CORRECTION (don't lose this):** the sweep listed "fame writes phantom morale when flags mismatched" as a
> knocked-down false alarm ("a guard blocks it"). **REFUTED by direct read:** `persistFameMoraleConsequencesAfterFame`
> (`processCompletedGame.ts:524-566`) has NO internal morale guard; its call site is gated by the FAME flag only. So
> fame-on/morale-off DOES write the morale ledger → the §4 "fame+morale must flip as a pair" constraint STANDS (or add
> a tiny internal morale guard). Small, but real.

**Confidence (honest):** static code/git tracing only — no build/test/browser run. JK's next manual smoke pass is what
catches purely-runtime defects this can't see. The stranded GameTracker/elimination repair branches were sampled, not
per-commit-diffed (one residual UNSURE thread — worth a one-time triage). The sweep self-corrected twice and the Captain
caught one of its over-refutations, so treat it as "the list was incomplete by ~7 small-to-medium items," not as final.

---

## 6. What needs JK

> **RULINGS LOG (2026-06-26 PM, attended):** Stream A (lens hub real-data adapter) **GREENLIT** — parallel
> preview route, engine OFF first, then a flags-ON verify pass; GO prompt issued. Stream B (draft-setup
> wiring) decisions RULED: **draft tier = budget only** (ratings stay frozen — unblocks the optimizer) ·
> **CPU shill count = scales with league size + setup override, persisted** · **season rules = one canonical
> home, FREE-TYPED games/innings (no preset "Standard" length), retire the redundant preset screen** ·
> **store the chosen archetype name on each team** · **build preview-first** · **scout-hire = reuse the
> existing scout-draft engine, don't rebuild** (corrected — the plan undersold it). **Conferences** already
> ruled (toggle, default ON, divisions deferred). **STILL OPEN:** the final **archetype set** (a parallel
> thread is finalizing the 15 sim-balanced identities — Stream B reads the canonical module, doesn't
> hardcode) · the **player-rivalry sequencing** + **rebrand-in-or-out** engine forks (below) · the
> activation/flip gates.

**Decisions to make (most blocking first):**

1. **Sequencing of the player-rivalry work.** Does the small "two-player rivalry" writer ship now as a
   narrow slice, or fold into one coordinated player-rivalry build together with the feud-amplification
   work and the bigger matchup engine? This is the *currently open ticket*, so it's blocking right now.
   (Recommended: coordinate the three so they write into the same place, rather than ship the sliver
   alone — per JK's own 2026-06-26 flag.)
2. **Is rebrand/relocation in scope for v1?** The single largest engine system still needing real wiring
   (and deader than the docs admit). A yes/no sizes the remaining engine work.
3. **The draft "tier" question.** When a GM picks a power tier (juiced/standard/nerfed), does that weaken
   the player *ratings* or only the *budget*? This blocks the optimizer build.
4. **Greenlight the Franchise-Lens real-data adapter (§0).** Approve building the hub on real data behind a
   *new parallel preview route* (live app untouched), and confirm the first pass runs with the engine OFF
   (honest spine: real standings/roster/money/stadium; soul layer neutral) before a separate flags-ON
   verify pass. (Recommended: yes to both — it de-risks the flip and unblocks the whole hub track now.)
   Then: which existing franchise save to verify against.
5. **Smaller "feel" calls** — CPU phantom-bidder count, the team-identity set + magnitudes, conferences vs
   full divisions, the fielding "true value" magnitude. Sensible defaults exist for each; JK just confirms.

**Things to look at on the iPad (sign-offs owed):**

1. **The new "old ballpark" franchise hub** (the big one — never seen; the surface the whole living season
   needs).
2. **The ~11 draft-setup preview screens** (identity picker, setup hub, season rules, draft guide,
   scout/lineup helpers).
3. **The home-park rivalry on a real franchise** (rivals in red + the heavier rival-game mood) — freshest,
   shipped today.
4. **Two changes already *live* on real data** needing eyes: ballpark now nudging displayed WAR, and the
   missed-catch fix.

**Go/no-go activation calls (the wall):**

1. **Hands-on smoke test** — prove the season is genuinely off.
2. **Playable-v1 sign-off** — accept it plays end-to-end on real data.
3. **Authorize the flip.** Standing rule everywhere: *do not flip until you've reviewed the whole wave.*

---

## 7. The convergence risk — four branches must become one app

**The merge picture is healthier than feared.** The two big build lanes (auction/draft + ratings) are
already folded into the engine trunk — git-confirmed, not just claimed. The two UI tracks (draft-setup
screens and the new hub) are clean against each other and clean against the *live* hub — they share only a
trivial append-only route-registration file (`App.tsx`) and two append-log docs; neither touches the live
`FranchiseHome`. The new hub added no new database tables. **No live merge conflict today.**

**The real landmines are timing and one coupling, not collisions:**

- **The two UI/draft tracks forked ~2 days ago and are now ~138 commits behind the fast-moving engine
  trunk** (the lens front ~83 behind); that rebase debt grows by tens of commits a day. The new hub in
  particular *must* rebase onto the current trunk to pick up the rivalry data it needs to display.
- **The biggest integration landmine is the engine↔hub coupling from §3** — two gates owned and scheduled
  separately, with no plan tying them together.
- **One coordination rule going forward:** any new database table (the optimizer's cache, a rivalry ledger,
  the offseason flow) must be added *only* through the engine trunk, each taking the next version number,
  or two branches grab the same number and collide on a pinned test. (Trunk is currently at v26.)
- **Two genuinely uncovered areas** the four fronts all assume but nobody owns: the **game-playing screen
  itself** (GameTracker) is being repaired across a dozen scratch worktrees with no fold-back plan, and the
  **offseason / season-1→season-2 rollover** is barely touched. A franchise you can't roll into a second
  season is a one-season demo. Neither is a *flip* blocker, but both are *playable-v1* blockers worth
  naming.

---

## 8. Recommendation

**The engine ("captain") loop should stop adding new engine systems and pivot to making the engine
*visible and verifiable*, because that — not more engine code — is now the v1 bottleneck.** In order:

1. **Declare the engine feature list frozen** (resolve the one open rivalry ticket per §6, plug in the fame
   floor, decide rebrand in-or-out). The simulator's "final pass" can't happen while features keep landing.
2. **Run the one true final full-season simulation** against the frozen tree — the sign-off pass, not the
   daily safety net.
3. **In parallel, start the number-tuning sweep** against that simulation (biggest remaining *work*; only
   this loop can drive it).
4. **Treat the hub-wiring as a first-class v1 task, not a separate track's problem** — flipping the engine
   without it produces an invisible season. Pull the hub's real-data wiring onto the critical path and
   rebase it onto the trunk now, before the rebase debt worsens.

**Smartest overall sequencing:** freeze → final sim → tune → (hub wired to real data, in parallel) → smoke
test → playable sign-off → **flip the engine + land the hub together** → then open the reporter. UI follows
logic everywhere (draft screens wire to the optimizer *after* it stabilizes; the hub wires *after* the
rebase).

**The one decision to put to JK first:** *Do we draw the line on new engine features now — fame floor in,
rebrand decided, rivalry sequenced — and shift the engine loop to the final simulation + tuning + getting
the new hub onto real data, treating "engine-on + new hub live" as one shipped milestone?* Everything
downstream waits on that line being drawn.

---

## 9. Evidence appendix (hashes/files — checkable; verified last-24-48h)

**Engine (`codex/franchise-v1-next`, head `b012238c`; checked-out `experiment/manager-wpa-window` = +3
docs-only, head `27a3460f`):**
- Home-park rivalry shipped today: `64dd9ab1` (rival engine + per-game tap), `5370747e`/`76cb4b29`
  (rival-red standings/races), `bd60f945` ("the grudge" fan ±2 / captain ±1).
- Stadium records: `86ffea39`/`8ae5e683`/`a97b50b8` (detect), `219bdb3a` (fame swap), `6805ab74` (fan
  buzz), `20732a1c` (reporter adapter dormant), `84175be3` (Almanac derived view).
- Trade-demand wired (no longer orphaned): `93d39584` + `c87ff779` (store, trackerDb v25→**v26**).
- Morale taps live: `masterMoraleMatrix.ts:439` `resolveFameTap` (§20.5 NOW WIRED — contradicts stale
  "no fame term"), `:453-463` registry (fame/designation/race/relationship), `:621` `resolveRelationshipTap`
  real (not the no-op the doc claims). **`:455` `designation` tap IS a hardcoded neutral — by design**
  (designation morale routes via the event table at `processCompletedGame.ts:394`, not the tap).
- **Fame floor confirmed orphaned:** `applyWarLegitimacyGravity` `fameModel.ts:161` — callers = that file +
  its test only.
- **L14 rebrand confirmed inert:** `franchiseRebrandCascade.ts`/`Apply.ts`/`Offer.ts`/`Dwell.ts` exist with
  tests, flag exists `franchisePhase2Flags.ts:113`, but `getRebrandOffer`/`acceptRebrandOffer` have **zero
  non-test callers**; not imported into `processCompletedGame`. Flag-flip = no-op.
- **Cross-flag coupling hazard (HIGH):** `processCompletedGame.ts:1366` wraps
  `persistFameMoraleConsequencesAfterFame` (def `:524`) under the **fame** flag with no internal morale
  guard → fame-on/morale-off writes the morale ledger = phantom-morale risk → fame+morale must flip as a
  pair.
- **Most outputs invisible (HIGH):** grep `src/src_figma/**/*.tsx` for `franchiseFameRecords` /
  `franchiseRelationshipEdges` / rebrand offers → zero UI components; only readers are the (off) reporter
  LLM adapters.
- L-SIM green: `test-utils/lsim/results/lsim-h2-baseline-checkpoint-060.json` findings `[]` @ game 60;
  rowCounts show the living season firing (relationshipEdges, chargedMatchups=6, fameRecords=66,
  l10Overlays=124, ratingsOverlays=429, traitOverlays=644, `moraleToWarLeaks=0`). Only 60g checkpoints — no
  full-season convergence pass.
- Rivalry/matchup vision: `PLAYER_RIVALRY_MATCHUP_ENGINE_SPEC.md` (`27a3460f`, 5 open questions).
- Stale source corrected: `MODE2_V1_COMPLETENESS.md:142,154,196,200-202` (L13-5 stub / §20.5 unwired / WAR
  floor / L14 missing) — live code now contradicts the first three; the fourth is cascade-built /
  trigger-not.

**Draft pipeline (`codex/draft-pipeline-fix`, head `c66d680f`):** pool fix `c230872b`/`fea49672`/`ed6409fc`;
balance sim `e97c45ae`/`915b5539`/`5969e0e9` (`archetypeBalanceSimulator.ts`, real luxury-tax engine); 15
identities `13fb1ab3`/`0c98b38b` (`historicalArchetypes.ts`, test 15/15 in band); greenfield (zero src
hits): `evaluateScoutMove`, `optimizeLineupVsStarter`, `poolFeasibility`; potency still pinned
`effectiveRatings.ts:370`.

**Draft-setup UI (`codex/draft-setup-ui`, head `70a4324c`; forked off pipeline-fix ~37 min before
snapshot):** screens `3c18783e`/`d95f8200`/`712221a1`/`8f645111`/`e166ee12`; routed preview-only
`App.tsx:294-304`; all import no engine/store/hook (mock); catalog drift `teamArchetypeCatalog.ts` (17 keys)
vs `historicalArchetypes.ts` (15).

**Franchise-lens hub (`codex/auction-draft-ux-rehaul`, head `1e880e22`):** 8-bucket build;
`FranchiseLensHub.tsx` (~1728 LOC) imports only `react`; fed by hardcoded const view-models; route
`App.tsx:346` flagless; wiring recipe `FRANCHISE_LENS_DATA_WIRING.md` (notes morale reads neutral-50 until
flag flips); merge-base `434920a4` (Jun 25) predates the rivalry seam → must rebase.

**Flip-state anchors:** 11 Phase-2 flags `= false` (`franchisePhase2Flags.ts`); component flags off
`FranchiseHome.tsx:180/182/183` (synthetic-sim / All-Star UI / offseason-execution); reporter emission
`marqueeOnly=true` default; `trackerDb` v26 (engine trunk owns it; neither draft branch touches it). L-SIM
run: `NODE_ENV= npx vitest run -c test-utils/lsim/season.config.ts` (read the summary JSON, not the exit
code).

**Git reality:** ~245 commits / 24h tree-wide. Engine trunk = busiest (70/24h, docs-heavy from the
hop-by-hop contract cadence). `ratings-finish-c` (V8) + `mode1-v1-b` (auction, v26) = 0 ahead of trunk
(merged). UI fronts ~83–138 behind trunk and widening. `draft-pipeline-fix` + `draft-setup-ui` = one front
split ~37 min ago.
