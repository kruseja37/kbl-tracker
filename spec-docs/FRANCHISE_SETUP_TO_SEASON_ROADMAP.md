> ⚠️ **SUPERSEDED (2026-07-01).** The single v1 source of truth is **`spec-docs/V1_BUILD_STATUS.md`**. The setup/flow here is superseded by the 2026-06-30 re-design (see `V1_HANDOFF_2026-06-30` §3.1); the 15-deep-archetype framing is overtaken by the 24 locked archetypes. Kept for history — do not plan from it.

# Franchise Mode — Setup → Draft → Launch-Season Roadmap

> Status: **IN PROGRESS** (decisions locked; current-state research in flight; build plan pending).
> Owner ruling source: JK design conversation, branch `codex/draft-pipeline-fix` (worktree kbl-draftfix), 2026-06-25.
> Goal: iron out, fully spec, and build the entire franchise-mode chain from **set up league → draft → launch season**.

---

## 1. Confirmed design decisions (JK-ratified this session)

These are locked; the build plan in §4 implements them.

### Already built this session (draft-setup redesign)
- New **Draft Setup** screen: two-pane IN/OUT pool shuttle, bulk add/remove, live per-player IV, lock/unlock, Start Draft.
- **4-man rotation** (SMB4), SP + SP/RP fill the rotation, extras to long relief.
- **Player edit** from Draft Setup, including **trait editing** (Trait 1 / Trait 2 dropdowns from the canonical trait list).
- **Option B** pool-relative team budget (cap scales with the actual pool's talent).

### Team archetype (the boost/nerf identity)
- Archetype = the existing **"cap identity"** system. It shifts each team's per-category luxury-tax ceilings, so it changes what's cheap vs expensive for that team to build. It is **live in the auction** today. The named SMB4 archetypes are the keys of the workbook's cap-modifier table.
- **UI model: pick ONE archetype** per team (not free category boosts/nerfs, not two archetypes).
  - Free category picks are exploitable (cherry-pick valuable boosts, dump cheap nerfs; bands aren't equal-sized — Power touches 1 rating, Rotation/Bullpen touch 3).
  - Two archetypes re-open the hack three ways: **free-boost stacking** (~2/3 of workbook archetypes are pure boosts with no nerf — stack two and boost two areas for free), **nerf cancellation** (one archetype's boosts erase the other's nerfs), **boost concentration** (stack the same stat past any single archetype's intent — e.g. fielding room +337 → +544).
  - One deep archetype is internally balanced (the workbook calibrated each), so it can't be gamed.
- **Curate to ~15 DEEP "give-and-take" archetypes**, dropping the thin pure-boosts (the inconsequential + exploitable ones). Deep set examples: Defense First, Call Your Shot, Fence Swingers, Great Bambino, Track Stars, Fireballers, Lazer Guns, Pinpoint Pitchers, We Got Gas, Well Rounded.
- Each archetype shown with a **plain-English readout** of what it boosts and what it costs (so the user commits to an understood trade-off, not a cryptic name).
- May **author additional archetypes** beyond the workbook's ~33, anchored to the workbook's per-stat **value scale** (luxury penalty curves) so they're balanced by construction — but parity is **proven, not asserted** (see balance simulator).

### Archetype balance simulator — NEW roadmap item (JK-confirmed 2026-06-25)
- Build a tool that runs **EV-flatness**: construct the best-achievable roster under each archetype from a real player pool and verify every archetype lands within **~10%** of the cross-archetype mean team strength.
- **Gate every archetype** — workbook-original or authored — through it. Reject/retune any that yields a strictly stronger team. This is the anti-gaming guarantee.
- **Reusable**: run on every archetype add or tweak, and per tier (juiced/standard/nerfed).
- Sequence: (1) validate the workbook's deep archetypes first, (2) author new ones only to fill genuine play-style gaps, (3) re-run on the full set; ship only the parity-flat ones.

### Who gets hired, and when (draft actors vs season staff)
- **GM + Scout = draft actors** → hired at **Draft Setup / early draft**. The GM makes the picks with the scout/draft-guide's help, so they must exist before the draft runs.
- **GM name = per-team**, set in Draft Setup (it's a draft-actor identity).
- **Manager + Reporter = season staff** → hired at **end of draft, before the freeze**. They don't affect the draft. Hiring the reporter pre-freeze lets the beat reporter **cover the draft** (opening recap). The freeze snapshot does not depend on them, so there's no ordering problem.
- For human-owned teams the user names/customizes these; CPU teams auto-fill (as today). Keep customization optional with auto-generated defaults.

### Team control model (multiplayer)
- Model is **human-controlled vs CPU teams**, where **one human can own multiple teams**. The UI must be **identical** whether 1, 4, or 8 humans play, in both the **draft** and the **franchise hub (clubhouse)**.
- Target first config: ~8 human-controlled teams (e.g. 4 humans × 2 teams each) — but the flow is the same for a single-player 1-human league.
- The draft still needs **CPU shills** to stay interesting; **shills carry team archetypes too**. Shill count likely scales off the human-team count (exact number TBD — see open decisions).
- **Draft Setup is the control hub**: designate human vs CPU teams, set shill count, hire GM + scout, pick each team's archetype.

---

## 2. Proposed end-to-end sequence (to be validated against current-state research)

1. **League Builder** — choose teams / structure / tier; (season rules: location TBD — see §3).
2. **Draft Pool setup** — assemble + lock the player pool (built).
3. **Draft Setup** — per team: human vs CPU control (one human may own several), archetype (one deep pick), GM name, hire GM + scout; set CPU shill count; lock.
4. **Draft** — auction and/or snake; humans draft their teams, CPU teams + shills bid with their archetypes.
5. **End of draft, before freeze** — hire manager + reporter (human teams; rest auto); confirm; (season rules if not in League Builder — TBD).
6. **Freeze** — snapshot the true-value baseline; Mode-1 → Mode-2 boundary.
7. **Launch season** → franchise hub (clubhouse).

---

## 3. Open product decisions (resolve after research, before build)

- **CPU shill count** — formula off human-team count? what number keeps the draft interesting without bloating it?
- **Where season rules live** — League Builder vs a post-draft season-setup step — AND the **season-rules rehaul**: current settings were guessed and don't match the real Mode-2 living-season dynamics; rebuild the rules surface to match what the season engines actually consume.
- **Archetype set** — keep the workbook's "specialize-in-one / pay-across-several" deep archetypes, or also author symmetric "+2 areas / −2 areas" identities to compare (sim-gated either way).

---

## 4. Current-state map (from 7-way research pass, 2026-06-25)

> Status legend: **BUILT+WIRED** (works) · **STUB** (placeholder/partial) · **DARK** (built but switched off) · **MISSING** (not built). Line refs are research-grounded; re-verify at point of use during build (per the FRANCHISE_API_MAP † re-verify rule).

### Pipeline backbone — the engines exist; the seams leak
Ordered flow as built: League Builder hub → leagues/teams/players/rosters → **draft-pool setup** (LeagueBuilderDraftSetup) → **MLB draft** (auction or snake) → **farm prospect draft** (scout-hire + prospects) → **Franchise Setup wizard** (6 steps) → **FREEZE** (`initializeFranchise`, franchiseInitializer.ts:606-853 — the Mode-1→Mode-2 boundary: deepCopy snapshot + computeDraftFreeze) → **Franchise Hub** (FranchiseHome, the clubhouse; all in-season flows are tabs).
- **Seam gaps:** farm-auction completion is a **dead end** (no "continue to Franchise Setup" button; MLB auction has its "proceed to farm" button, farm doesn't); the Franchise path (AppHome→/franchise/setup) and the construction path (League Builder drafts) are **two disconnected doors** with the required ordering only implicit; **two redundant hubs** (Builder vs League Builder); wizard Step 5 "Roster Mode" is a no-op (only "Use Existing Rosters"); the freeze boundary is invisible to the user.

### League Builder + season rules — mostly guessed
- **Two disconnected season-config surfaces:** the League Builder "Rules Presets" screen and the Franchise Setup wizard. **The franchise never reads the Rules Preset** — only the wizard's values reach Mode-2, so the entire Rules-Presets screen is cosmetic.
- **Genuinely wired:** `gamesPerTeam` (drives WAR scaling + checkpoint grid + fan-morale win baseline) and `tier` (juiced/standard/nerfed → draft budget). Playoffs config is consumed.
- **Dead/guessed settings (no consumer):** scheduleType, mercyRule, extraInningsRule, all-star timing, trade-deadline timing, pitch counts, mound visits. Schedules are manual (no generation by design).
- **Inconsistent defaults:** "Standard" = 50g/9inn in League Builder vs 32g/7inn in the wizard+spec. **Casing bug:** wizard writes capitalized "Standard"/"Balanced" while consumers compare lowercase → silent === misses.
- Divisions/conferences are spec-required but **unbuilt** (flat-only).

### Team control (human vs CPU, multi-team) — half-built
- **Config + auction support multi-team:** the stored config models `controlledTeams[]` + per-team human/ai; the **auction is genuinely multi-human** via hot-seat ("pass device to [team]", auto-plays only CPU bidders).
- **But it collapses to one human everywhere else:** `team.controlledBy` is **read but never written** by any UI (defaults to 'ai') — so the auction's human/CPU split is effectively unconfigured; `initializeFranchise` **collapses the array to [0]** for runtime identity; the **franchise hub has no "my teams"** concept (defaults to `teams[0]`, a free browser over all teams); the **snake draft hard-assumes one human team** and auto-drafts a human's other teams.

### CPU shills — inert
- Shills are the last N real league teams; **archetype fit is inert** (`archetypeWeights` never set → always returns 1.0); `session.cpuShills` never written in prod; **no phantom shills**, no dissolve-to-pool, **count not tied to human-team count**, no snake CPU auto-pick.

### GM & scout — opposite maturity
- **GM = name only.** One per-franchise identity (controlled team only), created at franchise init, consumed only by manager-change news copy. **Not a draft actor:** no per-team GM, no GM-makes-the-pick wiring, no draft board, **no pick-recommendation/"draft guide" engine exists.**
- **Scout = real, ~80% done.** Per-team entity, a working **scout-draft phase** (1 scout/team from a 3× pool) that runs before the prospect draft, the hire action, **v2 confidence bands** (per-tool obscured value), long-press reveal — all built, tested, rendered on /league-builder/draft. To finish: retire the leftover v1 Gaussian grade (S7 cleanup), replace the wizard's "bridge scout" stubs with the real hired scout, polish the UI.

### Manager / reporter / freeze — clean to move
- **GM** created at init; **manager + reporter** created **lazily at first game launch**, auto-named. The **freeze has ZERO dependency** on managers/reporters → hiring them at end-of-draft before the freeze is safe (creation fns are idempotent).
- **No draft-recap narrative exists** (DARK adapter; spec wants the GM-by-name draft voice). **Reporter dummy-name gap** (6-name era pool, not the SMB4 name DB).

### Mode-2 living-season dynamics — BUILT-DARK (the big one)
- The dynamics consume exactly **3 real knobs:** season length (`gamesPerTeam`), **development cadence** (`checkpointCadence`: standard=20% grid / frequent=10%), and innings. Plus playoffs.
- **Missing knobs:** dev cadence is only in the League Builder screen behind the L13 flag (not on the season screen); random-event **intensity** (Juiced/Standard/Nerfed, spec LS-16) is hardcoded 'standard' with an in-code "not wired in v1" comment.
- **THE ELEPHANT:** the entire living-season layer (morale, fame, development, designations, news, awards, races, relationships, managers) is **build-dark — every Phase-2 flag defaults false, only test setters flip them on. None of it runs in production today.** "Launch a living season" currently produces a static season (play games, track stats) with the living dynamics switched off. Activating them is gated (post-D13 per the DSTACK rule) and is its own decision.

---

## 5. Build plan (sequenced workstreams)

**WS-0 — Pipeline rail (seam fixes, low-risk, do first).** Add the farm-draft → Franchise Setup handoff button; collapse the two hubs to one canonical construction hub; deep-link the wizard to the missing League Builder step when a league isn't draft-prepared; make the freeze boundary explicit in the UI; remove the misleading "two-number freeze" copy.

**WS-1 — Draft Setup screen (the control hub).** Per team: human-vs-CPU designation (writes `controlledBy` — the missing write path), archetype (one deep pick — see §1), GM name; CPU shill count; lock. This is also where WS-2/WS-3 surface.

**WS-2 — Multi-team control + couch-coop seats (D1 RULED).** Write `controlledBy` from setup; replace singular `controlledTeamId` with a controlled-team **set**; franchise hub defaults to + badges the user's team(s); snake draft uses set-membership for "is user pick." PLUS per-human **seat identity** — a "who's playing / assign teams" setup step (player → [teamIds] via the existing `playerAssignments`), threaded through draft turn-passing, the hub ("whose team is this"), and news. (STOP-IF: metadata-shape/store changes may touch trackerDb version pins — flag before bumping.)

**WS-3 — Phantom CPU shills with archetypes (D5 RULED — required even all-human).** Synthetic phantom shill bidders appended to the auction (NOT just the real CPU teams — needed even when every team is human-controlled, for anti-collusion price pressure), dissolve-to-pool on commit, populate `archetypeWeights` so archetype fit activates, shills carry MLB archetypes, count is tunable for competitive unpredictability.

**WS-4 — Archetypes (see §1).** Curate to ~15 deep archetypes; build the **balance simulator** (EV-flatness gate); plain-English readout in the picker. **TWO picks per team:** MLB archetype (→ affordability/luxury caps; this is the balance-sim-gated one) + farm archetype (→ scout hole-prioritization), chosen independently.

**WS-5 — Scout finish (surface, don't rebuild).** Retire v1 Gaussian grade; replace bridge-scout stubs with the real hired scout; polish the scout-draft UI.

**WS-6 — Draft guide (D2+D7 RULED; mostly WIRING existing pieces, per AUCTION_DRAFT_SPEC_V2 §3–§4).** GM = the human picker; the guide is an assembly: **(a)** wire the MLB-archetype `projectedTax` back into the auction (`shiftLuxuryCaps`/`auctionMaxBid`) for the green/yellow/red AFFORDABILITY signal (V1 stubbed to 0); **(b)** add a `draft_prep` surface + thin adapter to the **existing Roster Analyzer Engine** for team-fit/hole detection (reuse, don't rebuild); **(c)** finish the SCOUT value oracle (price range + 20–80 grade, default-covered/long-press reveal — mostly built) weighted by the FARM archetype. CPU teams auto-pick via the same logic. (Open: exact advice strength — advisory only.)

**WS-7 — Manager + reporter at end-of-draft.** Move the lazy creation into a per-team loop before the freeze; fix the reporter name source (route through SMB4 name DB); build the **draft-recap news adapter** (fills a known DARK adapter).

**WS-8 — Season-rules rehaul + conferences (D4+D6 RULED).** One screen (Franchise Setup reads the league's preset). KEEP season length + innings + playoffs + **extra-innings rule** (SMB4/GameTracker). ADD: **custom numeric inputs** for games-per-season and innings-per-game (free entry, wired into the season AND all scaling — WAR, checkpoints), development cadence, a living-season intensity dial, and a **conferences toggle (on/off + naming)**. CUT the dead settings (scheduleType, mercy, all-star/deadline timing). Fix the casing bug; reconcile "Standard".

**WS-9 — Activate the living season (D3 RULED: v1 IS living).** Flip the Phase-2 flags on, with the intensity/cadence knobs driving it, so morale/development/news/awards/designations actually fire. Biggest lift; gated behind stabilization (post-D13); **sequenced LAST** — after the construction→draft→season pipeline is solid, then activate + tune.

---

## 6. Product decisions

### RULED (JK, 2026-06-25)
- **D1 — Multi-team = full couch-coop with seats.** Multiple humans each own a distinct set of teams with their own seat/identity. Build implication: per-human seat identity + a "who's playing / assign teams" setup step, threaded through draft, hub, and news (WS-2).
- **D2 — GM = the human picker; the SCOUT is the draft guide.** No separate GM draft-actor entity. The GM is the human's identity who makes the picks; the per-team scout (already built + hired at draft setup) becomes the recommendation engine — ranking/suggesting picks from its hidden-grade read + team needs + scarcity (better scout → better advice). Net-new = the scout's recommendation layer; CPU teams auto-pick via it (WS-6).
- **D3 — v1 is a LIVING season.** Activate the built-dark Phase-2 dynamics (morale, development, news, awards, designations). Biggest lift; gated behind stabilization (post-D13); sequenced LAST (WS-9).

### RULED (continued, 2026-06-26)
- **D4 — Season-rules rehaul (with mods).** KEEP season length, innings, playoffs, **and the extra-innings rule** (SMB4 has it; it's in the GameTracker code — do NOT cut). ADD development cadence + a living-season intensity dial, **plus a custom numeric text input for games-per-season AND innings-per-game** (free entry, not just preset buttons) that flows into the season **and every scaling element (WAR scaling, checkpoint grid, etc.)**. CUT the dead settings (scheduleType, mercy rule, all-star/trade-deadline timing). Fix the casing bug; reconcile "Standard" to one value.
- **D5 — Phantom CPU shills are REQUIRED even in all-human leagues.** The initial v1 season is 4 humans (multiple teams each), all human-controlled. Without phantom shills the humans could soft-bid and each grab their favorites at a discount; unpredictable CPU shills add real price pressure so nobody colludes into cheap rosters. So shills are phantom bidders independent of CPU-team count. Count = tunable to create competitive unpredictability (start sensible, validate by feel + the balance sim). Shills carry MLB archetypes too.
- **D6 — Conferences IN for v1.** Support conferences as a **toggle (on/off) + naming** when on (easy lever). Full divisions can still be deferred; conferences first.
- **D7 — Draft guide = an ASSEMBLY of mostly-existing pieces (spec-grounded, AUCTION_DRAFT_SPEC_V2 §3–§4).** Not one new engine: **(a)** green/yellow/red AFFORDABILITY signal = the MLB archetype's luxury-tax risk — wire `projectedTax` back into the auction (V1 stubbed it to 0) via `shiftLuxuryCaps`/`auctionMaxBid` (gentle, convex off-archetype tax); **(b)** TEAM-FIT / hole detection = **REUSE the already-built Roster Analyzer Engine** (`rosterAnalyzerEngine.ts`) — add a `draft_prep` surface + thin draft adapter, do NOT build a parallel one; **(c)** SCOUT value oracle (farm) = recommended price range `[$low,$high]` + 20–80 grade, width = scout confidence/specialty, default-covered/long-press reveal (mostly built). **TWO archetypes per team:** MLB archetype (→ affordability) + farm archetype (→ scout hole-prioritization + valuation), chosen independently at setup. Net: WS-6 is largely WIRING + a thin adapter, less net-new than first thought.
- **D8 — Seat identity ties into GM naming.** One setup flow: each human names themselves (their GM identity) and is assigned their teams; device passes around on the clock.

### Still tuning (not blocking the build)
- Exact shill COUNT number (tunable; validate by playtest + balance sim).
- Whether full divisions (beyond conferences) make v1.

---

## 7. UI/UX surface changes (translation for the UI/UX rework)

Plain list of the NEW or REWORKED screens this roadmap introduces — for the UI/UX effort to fold in. (Functional detail lives in §4–§6; this is the screen-level "what's new to design.")

1. **Construction navigation / rail.** Collapse the two redundant builder hubs into one canonical construction hub; a guided path with a "continue" button at every seam (the missing one is farm-draft → Franchise Setup); an explicit "this locks your franchise" confirmation at the freeze moment.
2. **Draft Setup hub (the big new screen).** Per team, in one place: **MLB archetype** pick (one of ~15 deep identities, with a plain-English boost/nerf readout) + **farm archetype** pick; **GM name**; **human-vs-CPU** designation; **seat assignment** (which human owns which teams) tied into GM naming; **shill count**; plus the existing pool shuttle + lock.
3. **Seat / "who's playing" setup.** Name each human (their GM identity) and assign their teams; single-device pass-around model. Folded into the GM-naming step.
4. **Draft guide overlay (auction + farm).** Per-player **green/yellow/red affordability** badge (luxury-tax risk vs your MLB archetype); **scout value read** (price range + 20–80 grade) **default-covered, long-press to reveal**; **team-fit / hole** callouts (from the Roster Analyzer). "Pass device to [team]" hot-seat prompts (built).
5. **Scout-draft phase.** Hire-a-scout-per-team screen (built; needs polish — it's "Basic UI TBD").
6. **End-of-draft staffing.** Hire **manager + reporter** for your teams (CPU auto-fills); optional **draft-recap** from your new beat reporter.
7. **Season-rules screen (rebuilt).** Custom numeric **games** + **innings** inputs; playoffs; **extra-innings** rule; "how often players develop" (cadence); "how lively is the season" (intensity dial); **conferences on/off + naming**. The dead settings are gone.
8. **Franchise hub (clubhouse).** A "**my teams**" concept — badge/sort the human's teams, switch among them; whose-team-is-whose for couch-coop. (Today it's a neutral all-teams browser.)
9. **Living-season surfaces.** Once the dynamics are switched on (D3): the hub tabs (morale, development, news, awards, designations) become **live and updating** instead of dark.
