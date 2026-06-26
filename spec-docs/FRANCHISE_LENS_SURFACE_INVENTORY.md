# Franchise Lens — Backend Surface Inventory (the build punch-list)

> Built from a 5-pass exhaustive backend audit (2026-06-26) of the actual code in this worktree
> (`src/engines`, `src/utils`, `src/types`, `src/hooks`), not the curated wish-list. Goal: find
> **everything the backend computes or remembers that a GM would want to see or act on**, decide where it
> should live in the aged-Fenway lens, and build those homes (mock-fed) BEFORE the real-data wiring — so we
> don't wire up data only to find half the game's richness never got a surface. Pairs with
> `LIVING_SEASON_DATA_SURFACE_MAP.md` (this supersedes it as the build backlog) and
> `RESUME_FRANCHISE_FENWAY_REDESIGN.md`.

## Legend
- 🟢 **LIVE** — computes + persists in normal play today (safe to wire now).
- 🟡 **DARK** — engine/store/types built, gated by a `franchisePhase2*` flag (reads return neutral/empty
  until the living season is switched on). Build the surface; it fills when the flag flips.
- ⚪ **ABSENT** — not built in this worktree (don't spec as a surfacing task; note for later merge/build).
- **Surfaced?** — Y / partial / N against the lens as built (Clubhouse · Roster · Standings&Races · Stadium
  · Player drawer · Tootwhistle · Checkpoint takeover · banner).

## The headline
What's already surfaced is the spine (standings, 3 awards races, all-star, roster economics, stadium spray,
the full player dossier, the impact-ranked paper, the checkpoint takeover). What the audit found UNSURFACED
falls into **8 build buckets** below. Two whole tabs (**Schedule**, **Almanac**) are still stubs over a lot
of live data. The soul layer (morale effects, relationship deltas, captain, ripples) is mostly 🟡 — build
the homes now. The moment tentpoles (firing / rebrand / ceremony / random-event confirm) have engines but
no takeover UI.

---

## Bucket 1 — The deeper player dossier  *(player-level depth — JK's stated priority)* ✅ BUILT
Opens from the drawer; add tabs/sections so the dossier is the true home of per-player depth.
**BUILT 2026-06-26** (mock-fed): nickname + career-phase badge + form chips (mojo/fitness) in the header;
a **Makeup** section (personality + the 4 hidden modifiers as bars); a morale **source breakdown** in the
ledger; a **Career** card (totals + awards-won chips); a **Milestones** section (achieved ★ vs on-the-chase
○). Mocked on Fenomeno (rising) + Stad (decline). Role-morale (deferred) left for the soul-layer pass.

| Surface | What it shows | Status | Surfaced? | Source (file) |
|---|---|---|---|---|
| **Career stats card** | total WAR, games, counting stats, awards-won counts (All-Star ×N, MVP ×N) | 🟢 | N | `careerStorage.ts` |
| **Milestones** | career (3000 hits, 300 W) + season (40 HR, 200 K) badges/timeline | 🟡 | N | `milestoneDetector.ts`, `fameEngine.ts:113` |
| **Personality + psychology card** | the canonical personality (Competitive/Relaxed/…) + the 4 hidden modifiers (loyalty / ambition / resilience / charisma) | 🟢 persisted, 🟡 effects | N | `game.ts:125`, `masterMoraleMatrix.ts:197` |
| **Current form chips** | mojo (Rattled→Jacked) + fitness (Fit/Strained/Hurt) state | 🟢 | N | `mojoEngine.ts:20`, `fitnessEngine.ts:20` |
| **Aging / career phase** | Development / Prime / Decline + retirement risk | 🟢 | partial | `agingEngine.ts:11` |
| **Nickname** | secondary label under the name | 🟢 | N | `nicknameEngine.ts` |
| **Morale source breakdown** | per-source contribution (relationships / designation / performance / fan-coupling) in the ledger | 🟡 | partial | `masterMoraleMatrix.ts` |
| **Role morale** | starter/bench expectation vs actual usage | 🟡 deferred | N | `franchisePlayerMoraleSpecAdapter.ts:75` |

## Bucket 2 — The two empty tabs
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **Schedule tab** ✅ BUILT | upcoming fixtures (date/opp, next = Play Ball) + recent results w/ scores (W yellow / L red); trade-deadline banner | 🟢 | Y | `scheduleStorage.ts:29` |
| **Almanac — league leaders** | batting (AVG/HR/RBI/SB/OPS/WAR) + pitching (ERA/W/K/WHIP/SV/WAR) leaderboards w/ category picker | 🟢 | N (stub) | `seasonStorage.ts:43,93` |
| **Almanac — records explorer** | single-season + all-time records by stat | 🟢/🟡 | N | `museumStorage.ts` |
| **Almanac — trophy case** | champions, past award winners, retired jerseys | 🟢 | partial (Museum) | `museumStorage.ts`, offseason awards |
| **Almanac — history/facts** | retrosheet/SABR tidbits, player/team history | 🟡 | N | `reporter.ts:199` |

## Bucket 3 — Awards, in full
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **Finalized awards (16 categories)** | season winners — MVP/Cy/ROY/Gold Glove/Silver Slugger/Manager/Reliever/Comeback/Bust/Kara Kawaguchi/Bench/Booger Glove… | 🟢 | N | `franchiseAwardsStorage.ts:16`, `awardEmblems.ts:12` |
| **More race categories** | extend the gap-bar races beyond MVP/Cy/ROY (Gold Glove, Silver Slugger, Manager, Reliever) | 🟢 | partial | `franchiseAwardsEngine.ts` |
| **Race fame component** | show the fame nudge inside a close race bar | 🟢 | N | `franchiseRaceStandingScorer.ts:14` |
| **All-Star lock countdown** | "voting closes in N games" before the 60% lock | 🟢 | N | `franchiseAllStarSelector.ts` |

## Bucket 4 — Standings, widened
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **Magic number / clinch / elimination** | games to clinch; clinched/eliminated markers | 🟢 derivable | N | `playoffEngine.ts:65` |
| **Wild-card watch** | the non-division race band | 🟢 | N | standings + games remaining |
| **Season progress** | "Week 9 / 20 · 45%" + next gate countdown | 🟢/🟡 | N | `useFranchiseData.ts:92`, season-length meta |
| **Playoff bracket** | seeds, series scores, advancement, home-field | 🟢 | N | `playoffStorage.ts:38` |

## Bucket 5 — Roster moves as first-class actions  *(the 22/10)*
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **The farm (10) + call-up/send-down** | the farm roster + drag/confirm move w/ cap+salary enforce | 🟢 | N | rosterAnalyzer, scheduleStorage |
| **Roster-analyzer advice** | "call up this kid / send this one down" recommendations | 🟢 | N | `rosterAnalyzerEngine.ts` |
| **Trade demands** | which players want out (loyalty break) | 🟡 | N | `tradeRequestGeneration.ts` |
| **Trades ledger** | recent trades + the beat-reporter reaction story | 🟢 | N | `tradeEngine.ts:12` |

## Bucket 6 — The newspaper, widened  *(all the story types + the reporter himself)*
The Tootwhistle tab shows GAME_RECAP + the recap stream. The backend has **12 more event types** with
adapters already written (L10–L13) but no home.

| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **League News feed** | all `SeasonNewsItem` by type: trade reaction, call-up, injury, milestone, streak, playoff race, manager change, award result, relationship flare | 🟢 adapters | N | `narrativeEngine.ts:77`, `franchiseL10–L13*NewsAdapter.ts` |
| **Reporter dossier** | the beat writer's reputation (Rookie→Legendary), accuracy, credibility, retractions | 🟢 | N | `narrativeEngine.ts:35,376` |
| **Per-story confidence/retraction** | "speculating" badge; a retraction when he's wrong | 🟢 | partial | `narrativeEngine.ts:151,665` |

## Bucket 7 — The clubhouse soul, made visible  *(mostly 🟡 — build the homes)*
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **Designation effects (real numbers)** | "Fan Favorite +0.5 fan morale/game · +25% positive swings"; Albatross tilt | 🟡 | partial (badge only) | `designationFanMorale.ts:45` |
| **Relationship morale deltas** | who lifts/drags whom and by how much; reporter-intel confidence/"rumored" | 🟡 | partial (ties shown, no deltas) | `relationshipEngine.ts:81`, edges `:33` |
| **Captain charisma routing** | the Captain badge + "charisma ×2 to teammates · swings ×1.5" | 🟡 | N | `captainMoraleRouter.ts:37` |
| **Other-touched ripples** | "his walk-off lifted 3 teammates +1" | 🟡 | N | `masterMoraleMatrix.ts:47` |
| **Fan↔player coupling + dampener** | team euphoria nudging player morale; high morale dampening bad news | 🟡 | N | `masterMoraleMatrix.ts:194`, `fanMoraleDampener.ts:33` |
| **Full morale event catalog** | the 40+ player-centric events (clutch hit, rookie breakout, snub, captain big game…) | 🟡 | partial (fan events only) | `masterMoraleMatrix.ts:20` |

## Bucket 8 — The big moments (tentpole takeovers) + stadium curiosities
| Surface | What it shows | Status | Surfaced? | Source |
|---|---|---|---|---|
| **Manager firing takeover** | the pressure-release valve: morale ripple + relief bump + news | 🟢 engine | N | `franchiseL11FiringEngine.ts:23` |
| **Rebrand / relocation takeover** | fan-floor circuit-breaker: rename/relocate + fame reset | 🟡 | N | `franchiseRebrandCascade.ts:19` |
| **Season-end ceremony / awards night** | the capstone — winners revealed + news | 🟢 (UI exists) | partial | `AwardsCeremonyFlow`, `franchiseL12AwardNewsAdapter.ts` |
| **Random-event confirmation takeover** | the L10 sweep's 8 event families (hot streak, gain/lose pitch, earn/lose trait, trade demand, stadium change…) confirmed before applying | 🟢 sweep / 🟡 confirm | N | `franchiseL10EventEngine.ts:102` |
| **Stadium oddity records** | the 19 curiosities (shortest HR, marathon game, error machines, comebacks) | 🟢 | N | `oddityRecordTracker.ts:17` |
| **V2 fame-bearing stadium records** | farthest-HR-by-hand / WPA house-of-horrors / clutch-goat | ⚪ ABSENT (on `franchise-v1-next`) | N | — merge later |

---

## Recommended build order (mock-fed, same pattern as the tabs so far)
**P1 — high value, mostly 🟢, fills the obvious holes**
1. Bucket 1 — deeper player dossier (career + milestones + personality/psychology + current form + aging).
2. Bucket 2a — the **Schedule** tab (upcoming + results).
3. Bucket 2b — the **Almanac** tab (league-leader stat boards first; records/trophy case next).
4. Bucket 3 — awards in full (finalized awards + more race categories).

**P2 — valuable, rounds out the league + the paper + roster control**
5. Bucket 4 — standings widened (magic number / wild-card / season progress / bracket).
6. Bucket 5 — roster moves + the farm (22/10) + analyzer advice + trade demands.
7. Bucket 6 — the widened newspaper (League News feed across all event types + reporter dossier).
8. Bucket 8 (partial) — stadium oddity records.

**P3 — the "lights up later" soul + the moments**
9. Bucket 7 — the soul layer made visible (designation effects, relationship deltas, captain, ripples). 🟡
10. Bucket 8 — the tentpole takeovers (firing → ceremony → rebrand) + the random-event confirm takeover.

**Then** — the real-data adapter (GREENLIGHT-GATED), swapping mock → live across everything above.

## Build notes
- Keep every new surface's VM **field-aligned to the live type** (file:line above) so the adapter stays a
  clean map — the pattern used for Standings/Stadium/Drawer/Tootwhistle/Checkpoint.
- 🟡 surfaces render from mock now and light up when the franchise team flips the `franchisePhase2*` flags.
- ⚪ V2 fame-bearing stadium records are genuinely absent here — don't build, flag for the later
  `franchise-v1-next` merge.
