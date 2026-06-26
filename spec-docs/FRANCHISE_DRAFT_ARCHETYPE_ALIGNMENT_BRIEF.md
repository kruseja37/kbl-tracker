# Franchise / Draft / Archetype — Alignment Brief

> Purpose: a single entry point to share this session's decisions + plans with a concurrent thread.
> Branch: `codex/draft-pipeline-fix` (worktree kbl-draftfix). Date: 2026-06-26. Owner rulings: JK.
> Detailed docs this links to: `FRANCHISE_SETUP_TO_SEASON_ROADMAP.md`, `ARCHETYPE_BALANCE_SIM_RESULTS.md`.

## 1. Where we are
We redesigned the Mode-1 Draft Setup and went deep on **team archetypes**. Net: the team-archetype system is now grounded in **real historical team identities**, **sim-balanced** so a league of them is dynamic but fair, and we identified a **keystone roster-optimizer** that pays off across the whole franchise arc (pre-draft → draft → in-season). Plus a precise fix for the fielding-undervaluation risk.

## 2. Archetype system (DECIDED)
- **One archetype per team, picked from a curated set** (NOT free boost/nerf — exploitable; NOT two stacked — exploitable). Per the auction spec there are **two picks per team**: an **MLB archetype** (→ affordability / luxury-cap shift) and a **farm archetype** (→ steers the scout). See `ARCHETYPE_BALANCE_SIM_RESULTS.md`.
- The set is built from **historical team archetypes** (15 distinct identities: Murderers' Row, Bomba Squad, Whiteyball, Go-Go/'26 Rays small-ball, '95 Braves Junkball Surgeons, Flamethrowers, Nasty Boys, HDH Royals, The Opener, The Oriole Way, Shift-Era Suppressors, Big Red Machine, Bash Brothers, Billy Ball, Dead-Ball Suppressors).
- **Balance simulator** (`src/engines/archetypeBalanceSimulator.ts`) is the EV-flatness gate: builds the best affordable roster per archetype on the **real frozen IV values** + the **real luxury-tax engine**, flags any archetype outside ±10%. Result: **15/15 within band** (max dev 5.7%, standard tier).
- Key value-economy insights (drive how archetypes are authored): an archetype "boost" = **permission to over-stack a stat past cap without tax, NOT a player upgrade**; boosts on cheap/non-binding stats (fielding, speed) are nearly inert; you can't fund a pitching nerf with a hitter boost; **vividness comes from the diverse team SHAPES each archetype lets you build competitively, not from IV swings** — balance = no archetype builds a stronger team.

## 3. Keystone roster-optimizer (DECIDED — BUILD IT)
The balance sim's roster-builder is a prototype of a **generalized roster-optimizer** that should power THREE things with one engine:
- **Pre-draft pool-feasibility:** point it at the *locked* pool → tell each GM whether their archetype is supported or starved by this specific pool (prevents picking an archetype the pool can't deliver).
- **Draft guide:** the brain behind pick recommendations (best picks for your archetype + the pool).
- **In-season scout:** call-up/send-down/trade/lineup recommendations.
- **Current state (verified):** today's roster analyzer is **mostly a DIAGNOSTIC** (describes holes/depth/profile, live in the franchise hub). It HAS a real **lineup optimizer** (wired to game-prep) and a **basic own-farm call-up advisor**. It does NOT do roster optimization, trade recs, or league-relative ranking (the league-compare plumbing is a dead field). Pre-draft pool-feasibility is greenfield (but the team-profile/distance/generator math is reusable). So this is a real build that **generalizes the optimizer we already prototyped**.

## 4. Fielding value — the correction plan (DECIDED)
- **Confirmed:** our IV engine deliberately leaves fielding's **mojo payoff (web gems / diving catches) UNPRICED** — the workbook predates that SMB4 mechanic (spec D17, "post-workbook SMB4 update"). It's symmetric: the engine **undervalues good gloves AND overvalues bad gloves** (the spec's "mojo-sink hypothesis").
- **Risk:** a text flag is NOT enough — the bad-glove overvaluation corrupts the draft guide's **rankings** (it would recommend an all-bat/no-glove player too highly).
- **Fix:** keep the **canonical IV frozen** (it runs the economy — salaries, budgets, auction prices). Give the **roster-optimizer/draft-guide its own fielding-corrected "true value"** so its rankings/recommendations price fielding properly (both directions). The resulting **price ≠ true-value gap IS the scout's edge** — it surfaces bargains (underpriced good gloves) and traps (overpriced bad gloves). Calibrate the fielding magnitude empirically (spec's Mode-2 loop); start conservative + flag the disparity for transparency. **Never change the frozen IV** for this.

## 5. Pipeline + multiplayer (DECIDED — see FRANCHISE_SETUP_TO_SEASON_ROADMAP.md)
- Flow: League Builder → draft-pool setup → **Draft Setup hub** (archetype + GM name + human/CPU + seats + shills) → draft → end-of-draft staffing (manager + reporter) → **freeze** → living-season hub.
- **Couch-coop with seats** (multiple humans, each owns a set of teams). **GM = the human picker; the SCOUT is the draft guide** (no separate GM actor). **v1 IS a living season** (activate the built-dark Mode-2 dynamics, gated post-stabilization). Season-rules screen rebuilt (custom games/innings, dev cadence, intensity dial, conferences toggle; keep extra-innings; cut dead settings). **Phantom CPU shills required even all-human** (anti-collusion). Manager+reporter hired end-of-draft before the freeze.

## 6. Open / next
- Build the keystone roster-optimizer (generalize the sim builder) → pre-draft feasibility + draft guide + in-season scout.
- Fine-tune the 15 archetype magnitudes to taste; confirm across all three tiers.
- Wire the fielding-corrected true-value into the guide layer (provisional magnitude; empirical calibration later).
- Resolve the smaller draft decisions (shill count, divisions scope) and execute the pipeline seam-fixes + Draft Setup hub.
