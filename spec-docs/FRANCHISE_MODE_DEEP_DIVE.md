# KBL Tracker — Franchise Mode Deep-Dive Analysis

**Version**: 1.0
**Date**: February 19, 2026
**Author**: Claude (Opus 4.6) for JK
**Scope**: Comprehensive analysis of every franchise subsystem through two lenses:
1. **Event-Driven Architecture** — GameTracker-level granularity applied to franchise operations
2. **Competitor Trade Secrets** — Insights from OOTP, Diamond Mind, Strat-O-Matic, PureSim, SMB3/4

**Method**: Read 20+ KBL spec documents totaling ~15,000 lines, 1,217 lines of OOTP architecture research, web research on 4 additional competitors, and the KBL Unified Architecture Spec V1.2.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Event-Driven Spine](#2-the-event-driven-spine)
3. [System-by-System Analysis](#3-system-by-system-analysis)
   - 3.1 Season Management & Schedule
   - 3.2 Standings & Playoff Race
   - 3.3 The 11-Phase Offseason
   - 3.4 Awards Ceremony (Phase 2)
   - 3.5 EOS Ratings Adjustments (Phase 3)
   - 3.6 Contraction & Expansion (Phase 4)
   - 3.7 Retirements (Phase 5)
   - 3.8 Free Agency (Phase 6)
   - 3.9 Draft System (Phase 7)
   - 3.10 Farm System (Phase 8)
   - 3.11 Chemistry Rebalancing (Phase 9)
   - 3.12 Offseason Trades (Phase 10)
   - 3.13 Finalize & Advance (Phase 11)
   - 3.14 Salary & Contracts
   - 3.15 Fan Morale
   - 3.16 Narrative & Beat Reporter
   - 3.17 Mojo & Fitness
   - 3.18 Dynamic Designations
   - 3.19 Stadium Analytics
   - 3.20 Milestones & Hall of Fame
   - 3.21 Trade System (In-Season)
   - 3.22 Player Development & Aging
4. [Cross-Cutting Concerns](#4-cross-cutting-concerns)
5. [Competitor Landscape Analysis](#5-competitor-landscape-analysis)
6. [The Seven Design Conversations](#6-the-seven-design-conversations)
7. [Recommendations](#7-recommendations)

---

## 1. Executive Summary


KBL Tracker's franchise mode is architecturally ambitious — it specifies 22 interconnected subsystems across ~15,000 lines of documentation. The design philosophy is sound: follow OOTP's proven structural patterns while preserving SMB4's distinctive flavor (mojo, chemistry types, personality-driven destinations, dice roll ceremonies).

After systematic analysis, three findings emerge:

**Finding 1: The specs are remarkably complete but not yet event-driven.** Each subsystem is specified in isolation with rich detail (the offseason spec alone is 2,279 lines), but the event contracts between systems — the "when system A fires, systems B, C, D react" bindings — are implicit rather than explicit. This is the single biggest architectural risk: building 22 systems that work individually but don't cascade correctly.

**Finding 2: KBL's "game night" interaction model is a genuine competitive advantage.** No competitor (OOTP, Diamond Mind, Strat-O-Matic, PureSim, SMB3/4) has attempted to make the offseason a dramatic, social, ceremonial experience. OOTP's offseason is a spreadsheet. SMB4's is a slot machine. KBL's dice rolls, personality reveals, and ceremony animations represent a fundamentally different product category: tabletop-RPG-meets-franchise-sim. This must be protected.

**Finding 3: The stat pipeline is still the critical path.** The OOTP research (Section 10) correctly identified that every franchise system is a *consumer* of stat pipeline output. Awards need season stats. EOS ratings need WAR. Free agency needs salary calculations. Fan morale needs win/loss records. Draft order needs expected WAR. The pipeline must be solid before any offseason phase can function.

### What This Document Delivers

For each of the 22 franchise subsystems, this analysis provides:
- **Event contract**: What triggers it, what it emits, what systems consume its output
- **Data dependencies**: Exactly what data must exist before this system can run
- **Competitor insight**: How OOTP/others solve the same problem and what KBL can learn
- **Architecture risk**: Where the spec is ambiguous, contradictory, or missing detail
- **Recommendation**: Specific next action

---

## 2. The Event-Driven Spine

### 2.1 The Core Insight

KBL's architecture can be understood as a single event bus with 22 consumers. The GameTracker produces atomic events (at-bat outcomes). Everything else — stats, standings, WAR, milestones, narrative, fan morale, designations, awards, offseason — is a chain reaction from those atomic events.

```
                    ┌──────────────────────────────────────────────┐
                    │              EVENT BUS                       │
                    │                                              │
  GameTracker ─────►│  AT_BAT_COMPLETE                            │
  (atomic source)   │  GAME_COMPLETE                              │
                    │  SEASON_MILESTONE_REACHED                   │
                    │  TRADE_EXECUTED                              │
                    │  ROSTER_CHANGE                               │
                    │  OFFSEASON_PHASE_COMPLETE                   │
                    │  SEASON_CLOSED                               │
                    │  SEASON_OPENED                               │
                    └──────┬───────────────────────────────────────┘
                           │
              ┌────────────┼────────────────────────┐
              ▼            ▼                        ▼
         SeasonStats    Standings              Fan Morale
              │            │                        │
              ▼            ▼                        ▼
           WAR Engine   Playoff Race           Beat Reporter
              │            │                        │
              ▼            ▼                        ▼
         Milestones    Schedule Engine         Narrative Events
              │                                     │
              ▼                                     ▼
         Record Book                          Special Events
              │
              ▼
         Career Stats ─────► HOF Eligibility
              │
              ▼
         Designations (MVP, Ace, Fan Fav, Albatross)
```

### 2.2 The Season Lifecycle as Event Sequence

```
SEASON_OPENED
  │
  ├── For each game in schedule:
  │     GAME_STARTED
  │       ├── AT_BAT_COMPLETE (×N per game)
  │       │     ├── SeasonStats.accumulate()
  │       │     ├── Mojo.update()
  │       │     ├── Fitness.decay()
  │       │     └── SpecialEvents.check()
  │       │
  │     GAME_COMPLETE
  │       ├── Standings.update()
  │       ├── WAR.recalculate()
  │       ├── Milestones.check()
  │       ├── FanMorale.react()
  │       ├── Narrative.evaluate()
  │       ├── Designations.project()
  │       ├── StadiumAnalytics.recordParkFactor()
  │       └── MojoCarryover.calculate()
  │
  ├── At TRADE_DEADLINE (65% of season):
  │     TRADE_WINDOW_CLOSED
  │       ├── FanMorale.react()
  │       ├── ExpectedWins.recalculate()
  │       └── Narrative.tradeDeadlineSummary()
  │
  ├── REGULAR_SEASON_COMPLETE
  │     ├── Designations.lockAll()
  │     ├── PlayoffSeeding.calculate()
  │     └── FinalStats.lock()
  │
  ├── PLAYOFFS (if applicable):
  │     ├── SERIES_COMPLETE (×N)
  │     └── CHAMPION_CROWNED
  │           ├── FanMorale.championshipBoost()
  │           └── Narrative.championshipArticle()
  │
  SEASON_CLOSED
    │
    └── OFFSEASON_SEQUENCE (11 phases, strictly ordered)
          ├── Phase 1: SEASON_END_PROCESSING
          ├── Phase 2: AWARDS_CEREMONY
          ├── Phase 3: EOS_RATINGS_ADJUSTMENT
          ├── Phase 4: CONTRACTION_EXPANSION
          ├── Phase 5: RETIREMENTS
          ├── Phase 6: FREE_AGENCY
          ├── Phase 7: DRAFT
          ├── Phase 8: FARM_RECONCILIATION
          ├── Phase 9: CHEMISTRY_REBALANCING
          ├── Phase 10: OFFSEASON_TRADES
          └── Phase 11: NEW_SEASON_PREP → SEASON_OPENED
```

### 2.3 The Offseason Data Cascade

Each offseason phase consumes the output of all prior phases. This is why ordering is non-negotiable:

| Phase | Depends On | Produces | Consumed By |
|-------|-----------|----------|-------------|
| 1. Season End | Final standings, playoff results | Championship, postseason MVP, mojo reset | Phase 2, 3, 4, 5, 6, 7 |
| 2. Awards | Season stats, WAR | Award winners, trait assignments, salary impacts | Phase 3, 5, 6 |
| 3. EOS Ratings | WAR, salary data, awards | Rating changes, salary adjustments, bonus points | Phase 4, 5, 6, 7 |
| 4. Contraction | Fan morale (from full season) | Contracted teams, dispersal draft pool, expansion teams | Phase 5, 6, 7, 8 |
| 5. Retirements | Age, morale, salary, demotion history | Retired players removed from rosters, jersey retirements | Phase 6, 7, 8 |
| 6. Free Agency | Available players (post-retirement), personality, team records | Player movements, salary changes, roster changes | Phase 7, 8, 9 |
| 7. Draft | Draft order (from expected WAR), farm roster state | New prospects added to farm | Phase 8, 9 |
| 8. Farm Reconciliation | MLB + Farm rosters post-FA/draft | Validated 22+10 rosters per team | Phase 9, 10, 11 |
| 9. Chemistry | New roster composition, personality data | Chemistry scores, veteran leader assignments | Phase 10, 11 |
| 10. Offseason Trades | Complete rosters, chemistry data | Final roster changes | Phase 11 |
| 11. New Season Prep | Everything above | Validated state for new season | SEASON_OPENED |

**Critical Insight**: If any phase corrupts its output, every downstream phase fails. This is why OOTP's `closeSeason()` is atomic — either all phases complete or none do.


---

## 3. System-by-System Analysis

### 3.1 Season Management & Schedule

**What the spec says**: Season Setup Wizard (6 steps: league, season settings, playoffs, team control, roster mode, confirm). League Builder provides reusable templates. Schedule generated for configurable game counts (default 128 for SMB4).

**Event Contract**:
- **Trigger**: User completes Season Setup Wizard
- **Emits**: `SEASON_OPENED { yearId, franchiseId, schedule[], teams[], config }`
- **Consumers**: Schedule Engine, Standings, Stat Accumulators, Fan Morale (initial expected wins), Mojo (reset all to neutral)

**Data Dependencies**: League template, team rosters (22 MLB + 10 Farm per team), stadium assignments, playoff config, DH rules.

**Competitor Insight (OOTP)**: OOTP's schedule generation handles interleague play, unbalanced divisions, and mid-season schedule adjustments (rain-outs, makeup games). KBL's schedule is simpler (user plays games on their own time), but should support series groupings for narrative coherence ("3-game series at home vs. rival").

**Architecture Risk**: **LOW**. The League Builder and Season Setup specs are well-defined. The main gap is that schedule generation doesn't account for rivalry weighting — OOTP gives extra games to division rivals and interleague "natural" rivals, which creates narrative tension.

**Recommendation**: Consider a "rivalry series" concept where divisional opponents face each other more frequently. This is a replayability multiplier — OOTP forum users consistently cite "division race" as the #1 driver of engagement.

---

### 3.2 Standings & Playoff Race

**What the spec says**: Standings update after every game. Playoff seeding by division winners + wildcards (4/6/8/10/12 team configs). Bracket visualization with progressive reveal.

**Event Contract**:
- **Trigger**: `GAME_COMPLETE`
- **Emits**: `STANDINGS_UPDATED { teamId, wins, losses, gb, divisionRank, playoffPosition }`
- **Consumers**: Fan Morale (pace vs expected wins), Narrative (playoff race articles), Dynamic Designations (team context for MVP), Draft Order (reverse expected WAR for next season)

**Data Dependencies**: Game results, division/conference structure, tiebreaker rules.

**Competitor Insight (OOTP)**: OOTP tracks magic number, elimination number, and games back with 0.5 increments. The "playoff race" UI updates daily with clinching scenarios. This is a massive engagement driver — users check standings obsessively during September pennant races.

**Competitor Insight (Diamond Mind)**: Diamond Mind's appeal is purely statistical. Their standings reports include run differential, Pythagorean W-L, and strength of schedule. KBL could adopt Pythagorean W-L as a "projected" record alongside actual record.

**Architecture Risk**: **LOW** for basic standings. **MEDIUM** for playoff race — the spec doesn't detail tiebreaker rules, magic numbers, or clinching scenarios. These are essential for narrative generation ("Team X has clinched!" or "Team Y eliminated from contention").

**Recommendation**: Add `PLAYOFF_CLINCHED` and `PLAYOFF_ELIMINATED` events to the event bus. These are high-drama narrative triggers that Beat Reporters should react to.

---

### 3.3 The 11-Phase Offseason (Architecture Overview)

**What the spec says**: 2,279-line Offseason System Spec (v3) defines the complete 11-phase sequence. Phases are strictly ordered. Each phase has a "game night" social experience with dice rolls, reveals, and ceremonies.

**Event Contract**: The offseason is itself a sequential event chain:
```
SEASON_CLOSED
  → OFFSEASON_PHASE_1_COMPLETE
    → OFFSEASON_PHASE_2_COMPLETE
      → ... (each triggers the next)
        → OFFSEASON_PHASE_11_COMPLETE
          → SEASON_OPENED
```

**Competitor Insight (OOTP)**: OOTP's offseason is 11 discrete steps (Section 4.2 of OOTP research): Awards → HOF → FA begins → Rule 5 protection → Rule 5 Draft → Arbitration → Trades → Retirements → Relocations → Spring Training. The ordering is similar to KBL's but with different emphasis: OOTP front-loads awards and HOF, KBL front-loads awards and ratings adjustments.

**Critical Difference**: OOTP's offseason is *automated* — you click "advance to next phase" and watch. KBL's offseason is *interactive* — you roll dice, make selections, watch reveals. This is KBL's competitive advantage and must be protected. But it also means the implementation is 10x more complex because every phase needs UI, animation, user interaction, AND the underlying engine.

**Competitor Insight (SMB3/4 Franchise)**: SMB3/4's offseason was widely criticized on Steam forums. Players called it "shallow," "RNG-based," and "frustrating." The key complaints:
1. Player development was random dice rolls with low success rates (~10%)
2. No meaningful draft system
3. Loyalty events were anti-fun (negative events during win streaks)
4. No trade depth
5. Budget constraints too tight

KBL's spec directly addresses every one of these complaints. The 11-phase system with personality-driven outcomes, salary-based trade matching, and farm-first draft model is a direct response to SMB community feedback.

**Architecture Risk**: **HIGH**. The offseason is the most complex subsystem. The risk is in phase interdependencies — if Phase 4 (contraction) removes a team, every subsequent phase must handle the cascading effects (orphaned players, draft order changes, division restructuring). The spec addresses these cascades but the implementation will require rigorous state machine management.

**Recommendation**: Build the offseason engine as an explicit state machine with Phase as an enum, `canAdvance()` guards that verify preconditions, and rollback capability if a phase fails mid-execution. OOTP's atomic `closeSeason()` pattern should be the model.

---

### 3.4 Awards Ceremony (Phase 2)

**What the spec says**: Sequential award presentation: League Leaders → Gold Glove (9 positions, fWAR 55% + Clutch 25% + Eye Test 20%) → Platinum Glove → Booger Glove → Silver Slugger → Reliever of the Year → Bench Player of the Year → ROY → Cy Young → MVP → Manager of the Year → Special Awards (Kara Kawaguchi, Bust, Comeback).

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_1_COMPLETE`
- **Emits**: `AWARD_GRANTED { playerId, awardType, league, season }` (one per award)
- **Side Effects**: Trait assignments (e.g., Most K's → WHIFFER trait), salary impacts, Gold Glove winner +5 FLD rating
- **Consumers**: Phase 3 (EOS ratings need award context), Phase 5 (retirement decisions reference career awards), Phase 6 (FA desirability), Narrative (award articles), Hall of Fame (career award accumulation)

**Data Dependencies**: Complete season stats (batting, pitching, fielding), WAR calculations, clutch play tracking, eye test metrics. ALL of these must be finalized before awards can be calculated.

**Competitor Insight (OOTP)**: OOTP's award voting uses weighted formulas combining stats, team performance, and positional value. The exact formulas are not public, but community reverse-engineering shows WAR is the dominant factor (~60-70%) with additional weight for traditional stats (batting average for MVP, wins for Cy Young) and team success (playoff teams get a boost). OOTP also allows user override — you can manually assign awards in commissioner mode.

**Competitor Insight (PureSim)**: PureSim's award system was simpler — primarily stat-based with no eye test or clutch component. This made awards predictable and less engaging. KBL's multi-factor approach (fWAR + clutch + eye test for Gold Glove) adds unpredictability and narrative interest.

**Architecture Risk**: **MEDIUM**. The spec is very detailed on award criteria and UI flow. The risk is in the **trait assignment side effects**. When an award triggers a trait (Most K's → WHIFFER), that trait must persist on the player object and flow into Phase 3's salary calculations and all future seasons. The trait assignment is a write to the player entity that cascades into multiple downstream systems.

**Recommendation**: Define a `PlayerTraitEvent { playerId, trait, source, season }` that gets appended to the player's permanent record. Traits should be immutable once assigned (they represent historical facts: "won Gold Glove in Season 3").

---

### 3.5 EOS Ratings Adjustments (Phase 3)

**What the spec says**: Two systems run sequentially. System A: Rating adjustments based on WAR performance vs. salary expectations (if player outperformed, ratings go up; underperformed, ratings go down). System B: Salary adjustments at 50% of the gap between current salary and "true" salary. User gets bonus points to distribute as manager discretion.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_2_COMPLETE` (awards must be finalized first — award-winning players may get different adjustment treatment)
- **Emits**: `RATING_ADJUSTED { playerId, oldRating, newRating, reason }`, `SALARY_ADJUSTED { playerId, oldSalary, newSalary, delta }`
- **Consumers**: Phase 5 (salary affects retirement decision), Phase 6 (salary affects FA market value and exchange rules), Phase 7 (draft order uses expected WAR which incorporates new ratings), Salary System (global recalculation)

**Data Dependencies**: WAR (both batting and pitching), salary data, position detection (the spec has detailed position detection thresholds that scale with season length), award results from Phase 2.

**Competitor Insight (OOTP)**: OOTP doesn't do explicit "end of season rating adjustments" — player ratings evolve continuously through the 10-factor development model. What OOTP does do is *salary arbitration*, which is functionally similar: a player's salary adjusts based on performance. KBL's approach of making this a visible ceremony ("here's why your rating changed") is more transparent and educational than OOTP's black-box development system.

**Architecture Risk**: **MEDIUM-HIGH**. The EOS spec has detailed position detection logic with scaling thresholds, DH-aware calculations, and tiered adjustment formulas. The risk is in **salary cascade effects**: when System B adjusts salaries at 50% of the gap, this changes the salary landscape for every subsequent phase. Free agency exchange rules (Phase 6) use salary matching within 10%, so even small adjustments here can change which players are exchangeable.

**Recommendation**: This phase should emit a comprehensive `EOS_ADJUSTMENT_REPORT` event that includes all rating changes and salary changes as a batch. Downstream phases should read from this report rather than querying live player data, to ensure they see a consistent snapshot.

---

### 3.6 Contraction & Expansion (Phase 4)

**What the spec says**: Teams with fan morale below threshold face contraction risk. Probability: 0-9 morale = 85%, 10-19 = 60%, 20-29 = 35%, 30-39 = 15%, 40-49 = 5%, 50+ = safe. Dice roll determines fate. Voluntary sale option. Protection selection (4 players per contracted team). Legacy Cornerstone designation. Expansion draft. Scorned player effects. Defunct Team Museum.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_3_COMPLETE`
- **Emits**: `TEAM_CONTRACTED { teamId, method: 'FORCED' | 'VOLUNTARY', protectedPlayers[], dispersalPool[] }`, `TEAM_EXPANDED { teamId, expansionDraftPicks[] }`, `SCORNED_PLAYER { playerId, scorned: true }`
- **Consumers**: Phase 5 (contracted team players need retirement processing), Phase 6 (dispersal pool feeds into FA), Phase 7 (draft order restructured), Phase 8 (farm rosters restructured), Division alignment (fewer teams), Schedule (recalculation needed)

**Data Dependencies**: Fan morale for every team (accumulated over entire season), team financial state, roster data for protection selection.

**Competitor Insight (OOTP)**: OOTP supports contraction and expansion but treats them as commissioner actions, not probabilistic events. The user (or AI commissioner) decides to contract/expand. There's no dice roll or fan morale threshold. KBL's approach of tying contraction to fan morale and making it a dramatic ceremony is unique — no competitor does this.

**Architecture Risk**: **VERY HIGH**. Contraction is the most disruptive event in the franchise lifecycle. When a team disappears:
1. Division alignment changes (potentially unbalanced divisions)
2. Schedule must be regenerated for next season
3. All players on that team must be redistributed
4. Career stats must still reference the defunct team
5. Draft order changes
6. Salary cap implications for expansion team
7. Scorned player effects create long-term personality modifications
8. The "Defunct Team Museum" needs persistent storage separate from active franchise

The spec covers all of these but implementation requires touching nearly every other system. This is the highest-risk phase.

**Recommendation**: Contraction should be implemented LAST among offseason phases. Build Phases 1-3, 5-11 first, then add Phase 4 as an optional feature. This limits the blast radius during initial development.

---

### 3.7 Retirements (Phase 5)

**What the spec says**: Team-by-team ceremony. Players retire based on age-weighted dice rolls. Goal: 1-2 retirements per team per season. Reverse age order (oldest considered first). Jersey retirement is entirely user discretion (not tied to career stats). Retirement probability factors: age, years of service, salary, prior demotions, morale.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_4_COMPLETE`
- **Emits**: `PLAYER_RETIRED { playerId, teamId, age, careerStats, personalityType }`, `JERSEY_RETIRED { playerId, teamId, number }`
- **Side Effects**: Player status → RETIRED, career stats locked, roster spot opened
- **Consumers**: Phase 6 (retired players removed from FA pool), Phase 7 (roster vacancies affect draft needs), Phase 8 (farm reconciliation), HOF Museum (player becomes eligible after waiting period), Career Record Book (final career stats)

**Data Dependencies**: Player age, morale, salary, demotion history (from Farm System spec — cumulative demotion count affects retirement risk), award history (award winners have more pride → higher retirement risk when sent down), personality type (DROOPY personality has higher base retirement rate per Offseason spec).

**Competitor Insight (OOTP)**: OOTP's retirement is algorithmic — players retire when their ratings decline below a threshold relative to their age. There's no dice roll. Young stars never randomly retire; aging journeymen frequently do. The retirement decision also factors in `loyalty` and `desire_for_winner` personality traits. OOTP's approach is more predictable but less dramatic.

**Competitor Insight (PureSim)**: PureSim uses a "full career and aging model with no limit on seasons" — retirement is purely based on age and declining performance. No personality factors.

**KBL's Edge**: The dice roll ceremony makes retirement dramatic and unpredictable. A 34-year-old star rolling the dice and surviving is a narrative moment. But the spec correctly bounds the randomness (1-2 per team target, probability weighted by age) to prevent absurd outcomes.

**Architecture Risk**: **MEDIUM**. The retirement probability formula has many inputs (age, morale, salary, demotion history, personality). The risk is ensuring all inputs are correctly populated. The demotion history, in particular, comes from the Farm System spec's `careerDemotionCount` — if this isn't tracked correctly during the season, retirement probabilities will be wrong.

**Recommendation**: The `DemotionRecord` tracking (from Farm System spec) must be wired into the roster management flow during the season. Every send-down must increment the counter. This is a data integrity requirement, not just a retirement phase requirement.


---

### 3.8 Free Agency (Phase 6)

**What the spec says**: Two rounds. Protection phase (each team protects players). Dice roll system (2-12 on two dice) for top 11 free agents. Personality-driven destinations: COMPETITIVE → rival team, RELAXED → random/may stay, DROOPY → retires, JOLLY → stays, TOUGH → highest OPS team, TIMID → champion team, EGOTISTICAL → worst team. Player exchange rule: salary-based (±10% of true value), pitchers CAN be exchanged for position players. Fallback: if no players meet threshold, must give player CLOSEST in salary.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_5_COMPLETE`
- **Emits**: `FREE_AGENT_SIGNED { playerId, fromTeamId, toTeamId, salary, personality, destinationReason }`, `PLAYER_EXCHANGED { playerId, fromTeamId, toTeamId, exchangeReason: 'SALARY_MATCH' | 'CLOSEST_FALLBACK' }`
- **Side Effects**: Roster changes on both teams, salary recalculation, morale shifts
- **Consumers**: Phase 7 (updated rosters affect draft needs), Phase 8 (farm reconciliation needs current MLB roster), Phase 9 (new players affect chemistry), Fan Morale (acquiring star = boost, losing star = drop), Narrative (FA signing articles)

**Data Dependencies**: Protected player lists (user input), player salaries (post-Phase 3 adjustments), personality types, team records (for TOUGH/TIMID/EGOTISTICAL destinations), available roster spots.

**Competitor Insight (OOTP)**: OOTP's free agency is a realistic market simulation. Players have demands (years, salary, no-trade clauses). Teams bid. The AI weighs greed, loyalty, desire-for-winner, and market size. Type A/B free agent compensation adds strategic depth (signing a Type A costs you a draft pick). The market runs for weeks of game-time with multiple bidding rounds.

KBL's approach is fundamentally different — it's a ceremony, not a market. The dice roll + personality reveal creates dramatic moments but removes negotiation strategy. This is a deliberate design choice favoring the "game night" experience over spreadsheet management.

**Architecture Risk**: **HIGH**. The exchange rule (salary within ±10%) creates a complex constraint satisfaction problem. When Team A acquires Player X, they must send back a player within 10% of Player X's salary. But that sent-back player might be protected. And the fallback rule ("closest in salary") could force sending an undesirable player. The spec handles this with a clear priority chain, but implementation needs careful validation:
1. Check unprotected players within 10% salary range
2. If none found, find closest salary match among unprotected players
3. Cross-position exchanges are allowed (pitcher for position player)
4. Verify roster constraints post-exchange (still have 22 MLB players?)

**Recommendation**: Build the exchange matching as a pure function: `findExchangePlayer(receivingTeam, incomingPlayerSalary, protectedPlayerIds) → Player | null`. Unit test this extensively with edge cases (all unprotected players far from salary, only one unprotected player, etc.).

---

### 3.9 Draft System (Phase 7)

**What the spec says**: Farm-First Model — all picks go to Farm roster (10 players), grade range B to C- only (no A-tier). New Potential Ceiling attribute. Flow: Pre-Draft Inactive Player Selection → Draft Class Preview → Draft Order Reveal → Draft Board → Pick Selection → Release Player (if Farm full) → Pick Confirmation → Undrafted Player Retirements → Draft Summary. Draft order by reverse average expected WAR. Minimum one pick per team. AI-generated prospects: max A- avg B-.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_6_COMPLETE`
- **Emits**: `PLAYER_DRAFTED { playerId, teamId, round, pick, rating, potential }`, `PLAYER_RELEASED { playerId, teamId, reason: 'FARM_FULL' }`, `UNDRAFTED_PLAYER_RETIRED { playerId }`
- **Consumers**: Phase 8 (farm rosters now have new players), Narrative (draft articles), Fan Morale (drafting high-potential prospect = hope)

**Data Dependencies**: Draft order (calculated from team expected WAR — worse teams pick earlier), farm roster state (need to know if farm is full → must release to make room), inactive player database (optional source of draft-eligible players), AI-generated prospect class.

**Competitor Insight (OOTP)**: OOTP's draft is the crown jewel of its franchise mode. Key features KBL doesn't have:
1. **Scouting inaccuracy** — Scout reports show estimated ratings, not true ratings. Better scouts = more accurate reports. This creates genuine draft-day uncertainty.
2. **Signability** — Top picks demand large bonuses. If you can't sign them, you lose the pick.
3. **Multi-round depth** — 20+ rounds with decreasing talent. Late-round gems are possible.
4. **Development arcs** — Drafted players spend 3-5 years in minors before reaching MLB.

KBL's "Farm-First" model with B to C- grade range is simpler but creates a meaningful strategic layer: prospects are NOT immediately useful (unlike SMB3/4 where new players enter at full strength). The Potential Ceiling attribute adds the OOTP-style "will he develop?" uncertainty.

**Competitor Insight (SMB3/4)**: SMB4's offseason player acquisition was essentially random — you get offered players and pick from them. No scouting, no development arcs, minimal strategy. Community feedback was uniformly negative. KBL's draft system is a massive improvement.

**Architecture Risk**: **MEDIUM**. The main risk is AI prospect generation. The spec defines rating distributions (B: 10%, B-: 20%, C+: 35%, C: 25%, C-: 10%) and potential ceiling probabilities, but the actual generation of prospect names, positions, and personalities needs to produce believable, varied players season after season. After 10+ seasons, the system needs to avoid repetitive archetypes.

**Recommendation**: Build prospect generation as a composable pipeline: `generateName() → assignPosition() → rollRatings() → rollPotential() → assignPersonality() → generateBackstory()`. Each stage should have enough variance to prevent staleness. Consider a "memorable prospect" rare event where a prospect enters with an unusual combination (C- rated with A potential — the ultimate project player).

---

### 3.10 Farm System (Phase 8)

**What the spec says**: 22 MLB + 10 Farm = 32 total per team. Call-up (Farm → MLB) triggers rookie salary calculation, happiness effects. Send-down (MLB → Farm) triggers morale hit (-15 to -25), demotion counter increment, immediate retirement risk assessment. Cumulative demotion history affects retirement probability. Farm players have full personality, relationships, and narrative storylines. Farm storyline types: BLOCKED_BY_VETERAN, MENTOR_RELATIONSHIP, RIVALRY_WITH_PROSPECT, ROMANTIC_ACROSS_LEVELS, PROVING_DOUBTERS_WRONG, etc.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_7_COMPLETE` (for Phase 8 reconciliation), but also triggered mid-season by user roster moves
- **Emits**: `PLAYER_CALLED_UP { playerId, fromFarm: true, rating, potential, rookieSalary }`, `PLAYER_SENT_DOWN { playerId, toFarm: true, moraleHit, retirementRisk, careerDemotionCount }`, `IMMEDIATE_RETIREMENT { playerId, cause: 'REFUSED_DEMOTION' }`
- **Consumers**: Salary System (rookie salary on call-up), Morale (player and team), Narrative (prospect debut articles, demotion drama), Fan Morale (call-up = hope, especially for bad teams), Dynamic Designations (rookies can earn Fan Favorite)

**Data Dependencies**: MLB roster (22), Farm roster (10), player ratings, morale, demotion history, salary data (for rookie salary calculation).

**Competitor Insight (OOTP)**: OOTP's minor league system is 6 levels deep (Rookie, A, A+, AA, AAA, MLB) with full statistical simulation at each level. Players spend years developing in minors. Service time tracking determines arbitration/FA eligibility. Options (3 per player) limit how many times you can send a player down. This creates genuine strategic tension: "If I send him down now, I burn an option."

KBL simplifies to 2 levels (MLB + Farm) which is appropriate for a tracker (not a simulator), but the spec adds emotional depth through farm storylines and relationship mechanics. A farm player "BLOCKED_BY_VETERAN" creates a natural narrative arc that resolves when the veteran retires/is traded.

**Architecture Risk**: **HIGH**. The farm system touches almost every other system:
- Salary System (rookie salary calculation)
- Morale (demotion effects cascade)
- Retirement (immediate retirement on demotion)
- Narrative (farm storylines)
- Relationships (cross-level relationships: farm player dating MLB player)
- Draft (new prospects enter farm)
- Trade (farm prospects are tradeable assets)
- EOS Adjustments (farm players don't get EOS adjustments — or do they?)

The spec for `FarmMoraleFactors` has 7 components (baseline, yearsWaiting, passedOver, mentorship, recentPerformance, teamProspectRank, callUpProximity). Each of these needs a data source. `passedOver` (-10 each time a worse prospect is called up first) requires tracking call-up order — this is a non-trivial cross-player comparison.

**Recommendation**: Implement farm system in two phases. Phase A: Basic roster management (call-up/send-down with salary and retirement effects). Phase B: Farm storylines, morale factors, and cross-level relationships. Phase A is required for the offseason to function. Phase B is a replayability enhancer that can be added later.

---

### 3.11 Chemistry Rebalancing (Phase 9)

**What the spec says**: After all roster changes, chemistry scores recalculate. Veteran leaders identified. Teammate bonds assessed. New player adjustments. Personality conflicts detected.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_8_COMPLETE`
- **Emits**: `CHEMISTRY_UPDATED { teamId, overallScore, veteranLeaders[], newConflicts[], newBonds[] }`
- **Consumers**: Phase 10 (chemistry data informs trade AI decisions), Phase 11 (final chemistry state persists into new season), Narrative (chemistry articles: "New signing creates clubhouse tension"), Fan Morale (good chemistry = stable morale)

**Data Dependencies**: Complete roster (post-FA, post-draft, post-farm reconciliation), personality types for all players, existing relationship data, veteran status (years of service).

**Competitor Insight (OOTP)**: OOTP's Team Chemistry page shows player-manager relations, overall chemistry score, and morale component breakdown. Chemistry is influenced by: winning/losing (biggest factor), leadership trait, work ethic, roster stability. OOTP allows chemistry to be disabled entirely in league settings.

KBL's 7-personality system (COMPETITIVE, RELAXED, DROOPY, JOLLY, TOUGH, TIMID, EGOTISTICAL) creates more deterministic chemistry outcomes than OOTP's 6-trait continuous scale. This is a design choice: more predictable but more memorable.

**Architecture Risk**: **LOW-MEDIUM**. Chemistry rebalancing is a read-only aggregation — it reads roster and personality data, calculates scores, and emits results. It doesn't modify player state. The risk is in ensuring the calculation is consistent across the season (same formula used for in-season chemistry checks and offseason rebalancing).

**Recommendation**: Extract chemistry calculation into a pure function that takes roster + personality data and returns a chemistry report. Use this same function for both in-season updates and offseason rebalancing.

---

### 3.12 Offseason Trades (Phase 10)

**What the spec says**: Dedicated trade window after draft completion. AI-initiated trade proposals. Combined contract values within 10% matching rule. Same validation as in-season trades.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_9_COMPLETE`
- **Emits**: `TRADE_EXECUTED { tradeId, teams[], playersTraded[], draftSwaps[], contractValues[] }`
- **Consumers**: Phase 11 (final roster validation), Salary System (payroll recalculation), Fan Morale (trade reactions), Narrative (trade articles), Chemistry (recalculate if significant move)

**Data Dependencies**: Complete rosters, contract values, salary data, farm rosters, draft swap positions.

**Competitor Insight (Strat-O-Matic)**: Strat-O-Matic's community leagues show that human-to-human trade negotiation is the #1 engagement driver. Players cite "trade discussions" as more fun than actual games. KBL's multiplayer trade interface (from Trade Figma spec) supports this — side-by-side panels, running totals, beat reporter warnings.

**Architecture Risk**: **LOW**. This phase reuses the in-season trade engine. The main difference is timing (no trade deadline) and context (post-draft players are tradeable). If the in-season trade system works, this phase works.

**Recommendation**: Ensure the trade validation engine treats post-draft farm prospects identically to existing players for contract value matching. A just-drafted C+ prospect with $700K salary should be tradeable like any other asset.

---

### 3.13 Finalize & Advance (Phase 11)

**What the spec says**: Central hub for roster management before advancing. MLB (22/22) and Farm (10/10) rosters shown side-by-side. Call-up/Send-down with confirmation modals. AI processing summary for non-user teams. Validation summary (cannot advance until all rosters valid). Transaction report for easy SMB4 replication. Season transition processing. Chemistry rebalancing summary. Advance confirmation.

**Event Contract**:
- **Trigger**: `OFFSEASON_PHASE_10_COMPLETE` + user clicks "Advance"
- **Emits**: `SEASON_TRANSITION { fromYearId, toYearId }`, `SEASON_OPENED { yearId, franchiseId }`
- **Preconditions**: ALL teams have exactly 22 MLB + 10 Farm. All contract values valid. Schedule generated for new season.
- **Side Effects**: Mojo reset (all players → neutral), stat accumulators reset (all counting stats → 0), standings reset (all teams → 0-0), career stats preserved (season stats archived), Cornerstone designations persist, Fan Favorite/Albatross persist until 10% threshold.

**Data Dependencies**: Complete roster state for every team, validated rosters, generated schedule, archived season data.

**Competitor Insight (OOTP)**: OOTP's `openSeason()` validates: every team has valid 26/40-man roster, all contracts valid, budget set, schedule exists, no orphaned player references, standings initialized, stat accumulators initialized. KBL's validation is simpler (22+10) but the same principle applies: never advance to a new season with invalid state.

**Architecture Risk**: **CRITICAL**. This is the most dangerous transition in the entire application. The data contract between "Season N complete" and "Season N+1 ready" must be airtight. Common failure modes (from OOTP experience):
1. Orphaned players (on rosters but missing from player database)
2. Stale contracts (expired but not cleaned up)
3. Stat accumulation errors (Season N stats not locked before Season N+1 starts)
4. Development not applied (ratings from Season N carried unchanged)
5. Record book staleness (career records not updated)

**Recommendation**: Build `validateSeasonTransition()` as a comprehensive check that runs BEFORE allowing the advance. Return a list of blocking issues. The "Transaction Report" from the Figma spec is excellent — it serves as both a user-facing summary and an implementation verification tool.


---

### 3.14 Salary & Contracts

**What the spec says**: Single-season salaries recalculated after year-end awards/adjustments. Position player rating weights: 3:3:2:1:1 (Power:Contact:Speed:Fielding:Arm). Pitcher weights: 1:1:1 (Velocity:Junk:Accuracy). Position multipliers range from C (1.15) to RP (0.85). Age factor, trait modifier, performance modifier, fame modifier, personality modifier (new team only). Minimum salary $500K. DH-aware pitcher batting bonus. Two-way players: both salaries combined with 25% premium.

**Event Contract**:
- **Trigger**: Multiple — recalculated after EOS adjustments (Phase 3), after every roster move, after call-ups (rookie salary assignment)
- **Emits**: `SALARY_CALCULATED { playerId, salary, components: { baseRating, positionMultiplier, ageFactor, traitMod, performanceMod, fameMod, personalityMod } }`
- **Consumers**: Free Agency (exchange matching within 10%), Trade System (contract value matching within 10%), Fan Morale (salary vs performance perception), EOS Ratings (salary expectations vs WAR creates adjustment direction), Dynamic Designations (Albatross = most negative value delta where value = salary vs WAR)

**Data Dependencies**: Player ratings (all skills), position, age, traits, WAR (performance mod), fame score, personality (only on new team), league DH rules (for pitcher batting bonus).

**Competitor Insight (OOTP)**: OOTP uses multi-year contracts with annual salaries, signing bonuses, no-trade clauses, options (player/team/mutual/vesting), and arbitration eligibility. The financial system is a full simulation: team revenue depends on market size, wins, attendance, TV deals. Payroll is constrained by owner budget, not a hard cap.

KBL deliberately simplifies to single-season salaries. This is the right call — multi-year contracts add enormous complexity (backloaded deals, dead money from trades, luxury tax calculations) without proportional fun. The single-season model keeps salary as a **rating-derived value** rather than a negotiated one, which aligns with the tracker philosophy.

**Architecture Risk**: **MEDIUM**. The salary formula has 7 components that must all be populated. The DH-aware pitcher batting bonus (adjusted by rotation factor 0.25) is a subtle interaction — it means a pitcher's salary changes if the league DH rule changes between seasons. The two-way player calculation (both salaries + 25% premium) requires reliable position detection across both batting and pitching roles.

**Recommendation**: The salary calculation should be a deterministic pure function: `calculateSalary(ratings, position, age, traits, war, fame, personality, leagueConfig) → number`. Cache the component breakdown for display in the EOS Ratings ceremony. Never store salary as an independent field — always derive it from current inputs. This prevents stale salary bugs.

---

### 3.15 Fan Morale

**What the spec says**: Dynamic 0-99 scale. States: EUPHORIC (90-99), EXCITED (75-89), CONTENT (55-74), RESTLESS (40-54), FRUSTRATED (25-39), APATHETIC (10-24), HOSTILE (0-9). Expected Wins recalculates at key moments. Complete event catalog covering game results, milestones, roster moves, trades, injuries, awards, playoffs, and offseason moves. Trade reaction amplifier (2-3x impact).

**Event Contract**:
- **Trigger**: Nearly everything — `GAME_COMPLETE`, `TRADE_EXECUTED`, `PLAYER_CALLED_UP`, `PLAYER_SENT_DOWN`, `INJURY`, `AWARD_GRANTED`, `PLAYOFF_CLINCHED`, `PLAYOFF_ELIMINATED`, `CHAMPION_CROWNED`, `FREE_AGENT_SIGNED`, `PLAYER_DRAFTED`, `PLAYER_RETIRED`, `TEAM_CONTRACTED`
- **Emits**: `FAN_MORALE_CHANGED { teamId, oldValue, newValue, oldState, newState, cause }`
- **Consumers**: Contraction (Phase 4 — fan morale below threshold = contraction risk), Narrative (beat reporter references fan mood), Trade AI (AI considers fan morale when making offers), Retirement (morale affects retirement probability)

**Data Dependencies**: Team win/loss record, expected wins (calculated from roster True Values), game results, trade history, roster changes, injury reports.

**Competitor Insight (OOTP)**: OOTP has owner expectations (set at season start) and fan interest (attendance-driven), but no equivalent to KBL's fan morale system. OOTP's closest parallel is the player morale system (5 categories), not team-level fan sentiment. KBL's fan morale is a unique system with no direct competitor equivalent.

**Competitor Insight (SMB3/4)**: SMB4's "Team Mojo" was team-level but didn't have the granular event catalog or Expected Wins recalculation. Community feedback wanted MORE transparency in how team mood changed — KBL's detailed event catalog and state labels directly address this.

**Architecture Risk**: **MEDIUM**. The Expected Wins calculation is the key dependency. It uses "sum of roster True Values converted to win expectation" — but True Value is itself derived from salary, which is derived from ratings. This creates a 3-level dependency chain: `ratings → salary → True Value → Expected Wins → Fan Morale`. If any layer is stale, fan morale calculations are wrong.

The trade reaction amplifier (2-3x) also creates risk: a big deadline trade could swing fan morale 20+ points in a single event, potentially pushing a team from CONTENT to EUPHORIC or from RESTLESS to APATHETIC. The spec should define a maximum single-event swing to prevent absurd outcomes.

**Recommendation**: Implement Expected Wins as a cached value that invalidates on any roster change (trade, call-up, send-down, injury). Add a max single-event morale change cap (suggest ±15 points per event) to prevent whiplash.

---

### 3.16 Narrative & Beat Reporter

**What the spec says**: Each team has assigned reporter with hidden personality (10 types: OPTIMIST, PESSIMIST, BALANCED, DRAMATIC, ANALYTICAL, HOMER, CONTRARIAN, INSIDER, OLD_SCHOOL, HOT_TAKE). 80/20 personality alignment. Reporters observe, report, influence fanbase. Context engine analyzes lineups, matchups, history, disparities. Output channels: League News, Team Feed, Pre-Game, Post-Game, In-Game, Offseason.

**Event Contract**:
- **Trigger**: Every significant game and franchise event — this system is the widest consumer on the event bus
- **Emits**: `NARRATIVE_ARTICLE { reporterId, teamId, channel, headline, body, sentiment, references[] }`, `FAN_MORALE_INFLUENCE { teamId, delta, cause: narrativeArticleId }`
- **Consumers**: Fan Morale (reporter articles influence fan sentiment), UI (article display in Team Feed, League News), Offseason ceremonies (beat reporter commentary during awards, trades, etc.)

**Data Dependencies**: Game results, stats, standings, roster, personality data, historical context (streaks, records, milestones), reporter personality, trade history, injury reports.

**Competitor Insight (OOTP)**: OOTP's storyline engine has 350+ categories with XML-based text generation using 300+ variable tokens. The system produces news articles, interactive choice events, and era-specific storylines. OOTP's text generation is template-based (fill in `[%personname]`, `[%teamname]`) — functional but repetitive after many seasons.

KBL's beat reporter personality system adds a layer OOTP doesn't have: the same event produces different coverage depending on which reporter covers it. A DRAMATIC reporter and an ANALYTICAL reporter will frame a walk-off homer completely differently. This creates emergent narrative variety without requiring more templates.

**Competitor Insight (Diamond Mind)**: Diamond Mind has no narrative system. It's pure statistics. This is why Diamond Mind appeals to stats purists but lacks the emotional engagement of OOTP. KBL's narrative system is a core differentiator.

**Architecture Risk**: **HIGH** for content quality, **LOW** for architecture. The narrative engine is a pure consumer — it reads events and produces text. It never modifies game state (except indirectly through fan morale influence). The risk is in content generation: producing text that feels fresh after 100+ seasons. Template fatigue is OOTP's #1 narrative complaint on forums.

**Recommendation**: Consider an LLM-assisted narrative generation pipeline for post-v1. The beat reporter personality + game context would make excellent prompts. For v1, use templates with high variance (10+ templates per event type, with reporter personality selecting which template family to use). The 80/20 personality alignment rule helps — reporters occasionally write "against type," which adds surprise.

---

### 3.17 Mojo & Fitness

**What the spec says**: Mojo: 5-level scale (-2 to +2) with stat modifiers from -15/20% to +15/20%. Triggers from in-game events. Amplification in high-pressure situations (1.2-1.5x). 30% carryover between games. Fitness: 6 categorical states from Juiced (120%) to Hurt (0%, IL). Fitness decay per game based on activity. Catcher-specific faster decay.

**Event Contract**:
- **Trigger**: `AT_BAT_COMPLETE` (mojo updates), `GAME_COMPLETE` (fitness decay, mojo carryover), `SEASON_OPENED` (mojo reset to neutral)
- **Emits**: `MOJO_CHANGED { playerId, oldLevel, newLevel }`, `FITNESS_CHANGED { playerId, oldState, newState }`, `PLAYER_INJURED { playerId, fitnessState: 'HURT' }`
- **Consumers**: GameTracker (stat modifiers applied to at-bat resolution), Narrative (hot/cold streaks), Dynamic Designations (sustained mojo informs MVP projection), Special Events (mojo amplification in clutch situations)

**Data Dependencies**: In-game event outcomes, player position (catcher decay), game count (fitness decay accumulates), pressure situation context (runners on, close game, late innings).

**Competitor Insight (OOTP)**: OOTP doesn't have a mojo/momentum system. Player performance varies through rating-based probability with random variance, not a cumulative momentum mechanic. Some OOTP forum users have requested a "hot/cold streak" system for years. KBL's mojo system fills this gap.

The Fitness system parallels OOTP's fatigue/injury system but with SMB4's categorical approach rather than a continuous decay. The Juiced state (120% performance but 0.50x Fame credit) is unique — it creates a risk/reward decision: do you want your player performing at peak if it means their fame accrues slower?

**Architecture Risk**: **LOW** for the mojo/fitness engines themselves (already connected in GameTracker). **MEDIUM** for cross-session persistence: mojo carryover (30% between games) requires storing mojo state per player between game sessions. Fitness state must persist across games within a season. Both must reset at season boundary.

**Recommendation**: Ensure mojo and fitness are stored on the player entity within the franchise database (not just in-memory during GameTracker). The season transition must reset mojo to neutral and fitness to a configurable starting state.

---

### 3.18 Dynamic Designations

**What the spec says**: Four designation types: Team MVP (highest WAR, min 20% games, earns Cornerstone), Ace (highest pWAR, min 20% games, min 0.5 pWAR), Fan Favorite (highest positive Value Delta), Albatross (most negative Value Delta). Projected (dotted border) vs locked (solid border). Cornerstone: permanent while on team, multiple can exist. Lifecycle: season start → projected after 10%/20% → locked at season end.

**Event Contract**:
- **Trigger**: `GAME_COMPLETE` (recalculate projections after every game), `REGULAR_SEASON_COMPLETE` (lock all designations), `SEASON_OPENED` (MVP converts to Cornerstone, Ace clears, Fan Fav/Albatross persist until 10%)
- **Emits**: `DESIGNATION_PROJECTED { playerId, teamId, type, confidence }`, `DESIGNATION_LOCKED { playerId, teamId, type }`, `CORNERSTONE_EARNED { playerId, teamId }`
- **Consumers**: Narrative (designation changes are article triggers), Trade System (Cornerstones have narrative weight — trading one is news), Retirement (Cornerstones retiring is a bigger ceremony), Fan Morale (losing a Cornerstone to trade is devastating)

**Data Dependencies**: WAR (for MVP/Ace), Value Delta = WAR vs salary expectation (for Fan Favorite/Albatross), games played %, season progress %.

**Competitor Insight**: No direct competitor equivalent. OOTP tracks "Franchise Player" and "Team Captain" as informal roles. KBL's formal designation system with projected/locked states and visual indicators is unique.

**Architecture Risk**: **LOW**. Designations are derived values — they're calculated from WAR and Value Delta, which are already calculated by the stat pipeline. The main risk is the Cornerstone persistence rule: a Cornerstone earned in Season 3 must persist through Season 4, 5, etc. as long as the player remains on the team. This requires checking Cornerstone status during every trade validation ("are you sure you want to trade your Cornerstone?").

**Recommendation**: Store Cornerstones as a list on the Team entity, not as a flag on the Player entity. This makes it clear that Cornerstone is a team-player relationship, not a player attribute.

---

### 3.19 Stadium Analytics

**What the spec says**: Park factors calculated from actual game results, not arbitrary values. Per-stat, per-handedness breakdowns. Historical tracking over seasons. Seed park factors from stadium dimensions, then adjust dynamically from game data. Range typically 0.85-1.15.

**Event Contract**:
- **Trigger**: `GAME_COMPLETE` (update park factor running averages from game data)
- **Emits**: `PARK_FACTORS_UPDATED { stadiumId, factors: { BA, HR, '2B', '3B', BB, SO, perHandedness } }`
- **Consumers**: WAR Engine (park-adjusted stats), Salary System (if salary considers park context), Narrative (reporter references park effects), Trade AI (evaluating player value in context of their home park)

**Data Dependencies**: Game results with venue identification, batting stats per handedness, historical game data (multiple seasons for stable factors).

**Competitor Insight (OOTP)**: OOTP seeds park factors from real ballpark dimensions and adjusts over time. Park factors affect all stat calculations including WAR. This is standard practice.

**Competitor Insight (Diamond Mind)**: Diamond Mind was praised specifically for park factor accuracy — they model weather, altitude, fence distances, and even wind patterns. This is the deepest park factor system in the genre.

**Architecture Risk**: **LOW-MEDIUM**. The seed-then-adjust approach is sound. The risk is in early seasons where sample sizes are small — park factors derived from 10 games are unreliable. The spec handles this by seeding from dimensions first, then weighting actual data more heavily as games accumulate.

**Recommendation**: Use a Bayesian approach: start with a prior (seed factors from dimensions), then update with observed data weighted by sample size. After ~50 home games, observed data should dominate the prior.

---

### 3.20 Milestones & Hall of Fame

**What the spec says**: Three scopes: Single-Game (4 HR game, no-hitter), Season (30-30 club, Triple Crown), Career (500 HR, 3000 hits). Adaptive threshold scaling based on franchise config (gamesPerSeason, inningsPerGame). SMB4 defaults: 128 games, 6 innings. Milestone Watch for approaching milestones. Hall of Fame is entirely user discretion (not stat-based), accessible anytime.

**Event Contract**:
- **Trigger**: `GAME_COMPLETE` (check single-game milestones), `SEASON_CLOSED` (check season milestones), ongoing career stat accumulation (check career milestones)
- **Emits**: `MILESTONE_ACHIEVED { playerId, milestoneType, scope, value, scaledThreshold }`, `MILESTONE_APPROACHING { playerId, milestoneType, currentValue, threshold, gamesRemaining }`
- **Consumers**: Narrative (milestone articles, "record chase" storylines), Fame System (milestone = +1 Fame Bonus), Special Events (no-hitter ceremony), Hall of Fame (career milestones inform user's HOF decisions)

**Data Dependencies**: Career stats (sum of all season stats), current season stats, game-level stats, franchise config (for threshold scaling).

**Scaling Example**: MLB 500 HR threshold scales to KBL as:
`500 × (128/162) × (6/9) = 500 × 0.790 × 0.667 = 264 HR`
This dual scaling (season length AND game length) is a unique KBL innovation — no competitor accounts for variable innings per game.

**Competitor Insight (OOTP)**: OOTP tracks milestones via the Milestone Watch screen. Approaching milestones generate anticipatory articles. Achievement generates celebration articles. OOTP does NOT scale thresholds for non-162-game seasons — users must mentally adjust.

**Architecture Risk**: **LOW** for milestone detection (it's a comparison against thresholds). **MEDIUM** for the adaptive scaling — the dual scaling formula must be applied consistently everywhere thresholds appear (UI display, milestone detection, narrative text, record book comparisons). If one system uses scaled thresholds and another uses raw MLB thresholds, milestones will appear inconsistent.

**Recommendation**: Create a `ScaledThreshold` utility that wraps every threshold value with the franchise config. Never use raw MLB threshold numbers in code — always go through the scaler.

---

### 3.21 Trade System (In-Season)

**What the spec says**: Two-way and three-way trades. Contract values within 10% matching. Trade windows: in-season (after Week 4, closes at 65% of season), offseason (Phase 10). Tradeable: MLB players, farm prospects, draft swaps (upcoming year only). No restrictions on recently traded players, cornerstones, or contract status. Beat reporter warnings (advisory, don't block). AI responses: Accept/Reject/Counter. AI-initiated proposals inbox. Waiver wire claims with priority order.

**Event Contract**:
- **Trigger**: User-initiated trade proposal, AI-initiated trade proposal, waiver wire claim
- **Emits**: `TRADE_PROPOSED { proposalId, teams[], players[], draftSwaps[] }`, `TRADE_EXECUTED { tradeId, ... }`, `TRADE_REJECTED { proposalId, reason }`, `WAIVER_CLAIMED { playerId, claimingTeamId }`
- **Consumers**: Fan Morale (2-3x amplified reaction), Narrative (trade articles, beat reporter analysis), Chemistry (immediate recalculation), Salary System (payroll rebalance), Expected Wins (recalculate), Dynamic Designations (traded Cornerstone triggers narrative)

**Data Dependencies**: Player contract values, roster compositions, farm rosters, draft swap positions, trade deadline status, waiver priority order.

**Competitor Insight (OOTP)**: OOTP's trade engine is the genre benchmark. Key features:
1. **Trade value model** — AI evaluates players on a comprehensive scale including age, contract, potential, positional scarcity
2. **Diminishing returns** — Trading 5 average players for 1 star doesn't work; AI values quality over quantity
3. **Contextual need** — AI considers their roster holes; a team needing a catcher values catchers higher
4. **Trade deadline fever** — Contending teams become more aggressive; sellers accept lower returns
5. **No-trade clauses** — Some players can block trades (not in KBL's simplified model)

**Competitor Insight (Strat-O-Matic leagues)**: Community leagues universally cite trades as the #1 fun factor. The human negotiation aspect — bluffing, leverage, package-building — is irreplaceable by AI. KBL's multiplayer trade interface directly supports this.

**Architecture Risk**: **MEDIUM**. The 10% contract value matching rule is simple but creates edge cases:
- What about players with minimum salary ($500K)? 10% = $50K variance. Almost all minimum-salary players match each other.
- Three-way trades: does the 10% rule apply per-leg or to the overall trade? The spec should clarify.
- Draft swap valuation: how is a "1st round pick next year" valued in contract terms for the 10% rule?

**Recommendation**: The spec needs explicit rules for draft swap valuation in trades. Suggest: draft swaps are valued at the average salary of players drafted in that round historically (or a fixed table: Round 1 = $X, Round 2 = $Y).

---

### 3.22 Player Development & Aging

**What the spec says**: Not a dedicated spec document, but referenced across multiple specs. EOS Ratings (Phase 3) handles between-season rating changes. Farm System spec references potential ceiling development. Mojo/Fitness spec handles in-game performance fluctuation.

**Event Contract**:
- **Trigger**: `SEASON_CLOSED` (between-season development), ongoing during season (farm player development from play time)
- **Emits**: `PLAYER_DEVELOPED { playerId, ratingChanges[], agingEffects[] }`, `POTENTIAL_REALIZED { playerId, skill, oldPotential, newRating }`
- **Consumers**: Salary System (rating changes → salary changes), EOS Ratings (feeds into adjustment calculations), Narrative (prospect breakout articles, veteran decline stories), Scouting (if implemented — development reveals hidden potential)

**Data Dependencies**: Player age, ratings (current + potential ceiling), playing time, team coaching quality (if implemented), personality (work ethic equivalent).

**Competitor Insight (OOTP)**: OOTP's 10-factor development model is the most sophisticated in the genre:
1. Coaching quality (GM + 4 coaches rated)
2. Playing time (minor leaguers need it)
3. Potential (high potential ≠ guaranteed development)
4. Age (peak ~25, decline ~30+)
5. Challenge level (overmatched = slower dev)
6. Injuries (regress both current AND potential)
7. Spring training (development opportunity)
8. Chance ("light bulb" random events)
9. Development speed modifiers (configurable)
10. Target age ranges (early/normal/late bloomer)

This creates genuine uncertainty — a 5-star prospect can bust, a 2-star can surprise. It's the #1 replayability driver.

**KBL's Current Approach**: The EOS Ratings system provides between-season adjustments based on WAR performance vs salary expectations. This is simpler than OOTP's 10-factor model but creates a different dynamic: players improve because they PERFORMED well (evidence-based), not because of hidden development factors (simulation-based).

The Farm System's Potential Ceiling attribute adds OOTP-style uncertainty for prospects: a C+ rated player with A potential might develop into a star... or might plateau.

**Architecture Risk**: **HIGH**. Player development is the #1 gap in KBL's current specs. The EOS Ratings system handles between-season adjustments, but there's no spec for:
- In-season development (farm players improving from playing time)
- Age-based decline curves (when do players start declining?)
- Injury impact on development (does a season-ending injury affect next season's ratings?)
- Potential realization (when does a prospect's Potential Ceiling start converting to actual rating?)

Without these, multi-season franchise play becomes predictable: players are only as good as their last WAR, with no organic growth or decline arcs.

**Recommendation**: This is one of the Seven Design Conversations (Section 6). JK needs to decide: does KBL use a simplified evidence-based model (EOS adjustments only) or build toward a multi-factor development model? The answer affects the entire franchise experience.


---

## 4. Cross-Cutting Concerns

### 4.1 The Persistence Problem

Every franchise subsystem needs to read and write data that persists across sessions and seasons. The current architecture uses IndexedDB with separate databases per franchise (~19MB per season, ~190MB for 10 seasons per the Franchise Mode Spec). This creates several cross-cutting concerns:

**Concern 1: Transaction Boundaries**. When a game completes, the stat pipeline must atomically update: season stats, standings, WAR, milestones, mojo, fitness, fan morale, designations, and narrative. If the browser crashes mid-update, partial writes could leave the franchise in an inconsistent state. IndexedDB supports transactions, but they must be used correctly (all writes in a single transaction, not sequential independent writes).

**Concern 2: Season Archive vs Active State**. Season N's stats must be locked and archived before Season N+1 begins. The archive must remain queryable (for career stats, record book, historical comparisons) but immutable. This suggests a two-tier storage model: active state (current season, mutable) and archive (past seasons, immutable).

**Concern 3: Multi-Franchise Isolation**. The spec calls for separate IndexedDB per franchise, which is correct. But shared resources (player templates from League Builder, stadium definitions) need to be in a shared database. The `franchiseId` scoping identified in the audit's Deferred Technical Debt Register is relevant here.

**Recommendation**: Implement a `FranchiseStore` abstraction with three layers:
1. `ActiveSeason` — mutable, current season data
2. `SeasonArchive` — immutable, past season snapshots
3. `SharedResources` — league templates, stadium definitions, player database

### 4.2 The Calculation Dependency Graph

Many franchise calculations depend on other calculations in a specific order. The full dependency graph:

```
Player Ratings (base data)
  → Salary Calculation (derived from ratings + position + age + traits)
    → True Value (derived from salary)
      → Expected Wins (derived from sum of team True Values)
        → Fan Morale (reacts to actual wins vs expected)
          → Contraction Risk (derived from fan morale)
  → WAR Calculation (derived from stats + park factors + league context)
    → Value Delta (WAR vs salary expectation)
      → Fan Favorite / Albatross designations
      → EOS Adjustments direction (outperformed vs underperformed)
    → MVP / Ace designations
    → Milestone proximity
    → Award voting weights
```

**Critical Rule**: Whenever player ratings change (EOS adjustments, trait assignments, development), the ENTIRE dependency chain must recalculate. This is why the EOS phase (Phase 3) must complete before Free Agency (Phase 6) — the salary changes from Phase 3 affect the exchange matching rules in Phase 6.

### 4.3 The AI Problem

Multiple systems require AI behavior: AI-managed teams during the season, AI trade responses, AI free agency decisions for non-user teams, AI draft picks, AI roster management in Finalize & Advance. The quality of AI behavior determines whether the franchise feels alive or robotic.

**OOTP's approach**: 25+ years of AI tuning. AI GMs have personality profiles (aggressive/conservative, rebuild/compete, analytics/traditional). AI in-game managers use tendencies calibrated from real MLB play-by-play data. The AI is so well-tuned that it correctly predicted World Series participants 3 years running.

**KBL's challenge**: Building AI behavior for 22 subsystems is a massive undertaking. The smartest approach is to tier AI complexity:

**Tier 1 (Required for launch)**: AI roster management during Finalize & Advance, AI responses to trade proposals (Accept/Reject/Counter), AI draft picks.

**Tier 2 (Required for engagement)**: AI-initiated trade proposals, AI free agency decisions, AI contraction/expansion handling.

**Tier 3 (Polish)**: AI personality profiles (aggressive GM vs conservative GM), AI strategic planning (rebuild vs compete), AI-generated storylines.

### 4.4 The "Game Night" UX Contract

KBL's defining feature is that franchise management is a social, ceremonial experience — not a spreadsheet. Every offseason phase has UI ceremonies: dice rolls, card reveals, personality unveilings, wheel spins. This creates a UX contract:

**Rule 1**: Every phase must have a "skip" or "streamlined" mode for solo play (per Offseason spec's Streamlined Mode).

**Rule 2**: Ceremonies must be interruptible and resumable. If the browser closes during an Awards Ceremony, reopening should restore the ceremony state, not skip it or restart it.

**Rule 3**: Ceremony results must be deterministic from inputs. The dice roll animation is cosmetic — the outcome is calculated before the animation plays. This ensures consistent results if a ceremony is replayed or reviewed.

**Rule 4**: Every ceremony must produce a summary that can be reviewed later. The Transaction Report in Finalize & Advance is the model.

---

## 5. Competitor Landscape Analysis

### 5.1 OOTP (Out of the Park Baseball)

**Strengths KBL should learn from**:
- The stat pipeline as the architectural spine (Section 10 of OOTP research)
- Atomic season transitions with comprehensive validation
- 10-factor player development model creating genuine uncertainty
- Scouting inaccuracy adding information asymmetry to drafts
- AI personality profiles for computer GMs
- 25 years of simulation engine calibration

**Weaknesses KBL can exploit**:
- Overwhelming UI — new users report 20+ hour learning curves
- Spreadsheet-driven offseason with no ceremony or drama
- Template-based narrative that becomes repetitive after ~5 seasons
- No social/multiplayer experience for offseason activities
- No mobile presence (PC-only until recent iOS port)
- OOTP 27 costs $40+; KBL is a free tracker

**KBL's Competitive Position vs OOTP**: KBL is NOT competing with OOTP on simulation depth. KBL is creating a new category: **the tabletop franchise experience**. OOTP is a solo spreadsheet game. KBL is a social game night with dice rolls, reveals, and ceremonies that happens to track real baseball statistics. These are fundamentally different products serving overlapping but distinct audiences.

### 5.2 Diamond Mind Baseball

**Strengths**: Statistical accuracy (used by ESPN for season predictions), pitch-by-pitch simulation, park factor depth (weather, altitude, wind patterns), historical database spanning 1919-2025.

**Weaknesses**: No franchise mode in the traditional sense (replays historical seasons, doesn't generate fictional ones), aging Windows-only UI, no player development or aging system, no narrative engine, no mobile presence.

**Relevance to KBL**: Diamond Mind's park factor system is the genre benchmark. KBL's stadium analytics spec draws on similar principles (seed from dimensions, adjust from data). Diamond Mind's statistical accuracy standards should inform KBL's stat pipeline validation — if KBL's simulation produces implausible statistical distributions, it will lose credibility with the stats-minded audience.

### 5.3 Strat-O-Matic

**Strengths**: 60+ year heritage creating deep community loyalty, emphasis on managerial strategy over front-office management, card-based system creates tangible "ownership" of players, thriving league community with human-to-human trading.

**Weaknesses**: Windows 95-era UI, steep learning curve, no integrated franchise management (leagues handle this externally), no player development, no narrative system, no mobile presence.

**Relevance to KBL**: Strat-O-Matic's community leagues prove that human trade negotiation is the #1 engagement driver in baseball sims. KBL's multiplayer trade interface directly targets this insight. Strat-O-Matic also proves that nostalgia and history are powerful hooks — KBL's career tracking and Hall of Fame features should lean into "tell the story of your franchise's history."

### 5.4 PureSim Baseball

**Strengths**: User-friendly interface (praised as the most accessible baseball sim), fictional universe support, full career and aging model, almanac/encyclopedia generation, multiple league levels (A/AA/AAA).

**Weaknesses**: Slow simulation speed (90 minutes for a season with 24 teams), predictable player performance (high ratings always produce good stats), AI trade logic criticized (offered scrubs for your best player repeatedly), development abandoned after 2007.

**Relevance to KBL**: PureSim's almanac feature (automatically generated encyclopedia of player/team history) is exactly what KBL's Record Book and Hall of Fame should aspire to. PureSim's accessibility is also relevant — KBL should maintain ease of use even as feature depth grows.

### 5.5 Super Mega Baseball 3/4 (SMB)

**Strengths**: Charming art style, accessible gameplay, cross-platform, franchise mode with player development, EGO difficulty system.

**Weaknesses (from community feedback)**:
- Franchise mode player development is random and frustrating (~10% success rate)
- No meaningful draft system
- Loyalty events are anti-fun (negative events during win streaks)
- Shallow trade system
- Budget constraints too tight
- SMB4 widely seen as a cash-grab with minimal franchise improvements

**Relevance to KBL**: KBL's spec documents are a direct response to SMB community complaints. The 11-phase offseason, personality-driven free agency, farm-first draft, and salary-based trade matching address every major criticism. KBL's target audience likely includes disappointed SMB franchise mode players.

### 5.6 Competitive Position Summary

| Feature | OOTP | Diamond Mind | Strat-O-Matic | PureSim | SMB3/4 | **KBL** |
|---------|------|-------------|---------------|---------|--------|---------|
| Franchise depth | ★★★★★ | ★★ | ★★★ | ★★★★ | ★★ | ★★★★ (target) |
| Offseason ceremony | ★ | ★ | ★ | ★ | ★★ | ★★★★★ |
| Social/multiplayer | ★★ | ★★ | ★★★★ | ★ | ★★★ | ★★★★ (target) |
| Narrative system | ★★★★ | ★ | ★ | ★★ | ★ | ★★★★ (target) |
| Accessibility | ★★ | ★ | ★★ | ★★★★ | ★★★★★ | ★★★★ (target) |
| Player development | ★★★★★ | ★ | ★ | ★★★ | ★★ | ★★★ (current spec) |
| Statistical accuracy | ★★★★★ | ★★★★★ | ★★★★ | ★★★ | ★★ | ★★★★ (target) |
| Platform | PC/iOS | PC | PC | PC | All | Web/Mobile |

**KBL's unique value proposition**: The only baseball franchise experience designed for social game nights with dramatic ceremonies, personality-driven outcomes, and accessible web/mobile play. Not a simulator. Not a spreadsheet. A franchise RPG.

---

## 6. The Seven Design Conversations

These are decisions that emerged from the analysis where the specs are either silent, ambiguous, or where competitor research suggests alternatives worth considering. Each requires JK's input before implementation.

### Conversation 1: Player Development Model

**The Question**: Should KBL use the EOS-only model (players change between seasons based on WAR performance) or build toward a multi-factor development model (OOTP-style with coaching, playing time, potential, age, chance)?

**Current Spec**: EOS Ratings (Phase 3) + Farm System Potential Ceiling. No in-season development. No coaching quality factor.

**OOTP Reference**: 10-factor model drives genuine uncertainty and replayability. It's the #1 reason OOTP franchises last 20+ seasons.

**Trade-offs**:
- EOS-only: Simpler to implement, transparent to users, evidence-based ("you played well → you improved"). But predictable after a few seasons.
- Multi-factor: More unpredictable, creates prospect development arcs, requires more systems (coaching staff, development sliders). But more complex and potentially opaque.

**Recommendation**: Start with EOS-only (already specified) + Potential Ceiling realization for farm players. Add coaching and playing time factors in a future version. This gives KBL development uncertainty through the farm system without requiring the full 10-factor model.

### Conversation 2: Contraction Timing

**The Question**: Should contraction be built during initial development or deferred?

**Current Spec**: Phase 4, between EOS Ratings and Retirements.

**Risk Assessment**: Contraction is the highest-blast-radius feature — it touches division alignment, schedule, roster management, career stats, draft order, and fan morale for every team.

**Recommendation**: Defer to v2. Build Phases 1-3 and 5-11 first with a placeholder for Phase 4. This reduces initial implementation risk by ~30%.

### Conversation 3: Draft Swap Valuation

**The Question**: How are draft pick swaps valued in trade contract matching?

**Current Spec**: Silent on this. The Trade spec says "draft swaps (upcoming year only)" are tradeable, and the matching rule is "combined Contract Values within 10%." But draft swaps don't have contract values.

**Options**:
- Fixed table: Round 1 pick = $2M, Round 2 = $1M, etc.
- Dynamic: Value based on drafting team's expected pick position
- Excluded: Draft swaps don't count toward contract value matching

**Recommendation**: Fixed table. Simple, transparent, easy to explain to users. The table should be defined in the Trade spec.

### Conversation 4: AI Depth for Launch

**The Question**: How sophisticated should AI behavior be at launch?

**Current Spec**: AI responses to trades (Accept/Reject/Counter), AI draft picks, AI roster management in Finalize & Advance.

**Minimum Viable**: AI that makes reasonable (not optimal) decisions. Accepts trades that improve their roster by contract value. Drafts best available player for their weakest position. Fills rosters with available players.

**Aspirational**: AI with personality profiles (aggressive/conservative), contextual need assessment, rebuild/compete strategic planning.

**Recommendation**: Launch with Minimum Viable AI. Document the AI decision functions so they can be enhanced iteratively. The "game night" social experience means human players are the primary interaction — AI just needs to be "not dumb," not "brilliant."

### Conversation 5: Narrative Engine Scope

**The Question**: How many narrative templates should exist at launch? Should LLM-assisted generation be on the roadmap?

**Current Spec**: 2,927-line Narrative System spec with beat reporter personalities, 6 output channels, context engine.

**OOTP Reference**: 350+ storyline categories, 300+ variable tokens. Still becomes repetitive.

**Recommendation**: Launch with 3-5 templates per event type × 10 reporter personalities = 30-50 total templates per event. This provides sufficient variety for the first 5-10 seasons. Add LLM-assisted generation as a v2 feature — the beat reporter personality + game context make excellent prompts.

### Conversation 6: Record Book Scope

**The Question**: What records should the Record Book track?

**Current Spec**: Mentioned in Milestone spec but no dedicated Record Book spec exists.

**OOTP Reference**: Single-season records (batting, pitching, fielding), career records, franchise records, league records. Records are displayed in League → History and referenced by the narrative engine.

**PureSim Reference**: Auto-generated almanac with thousands of pages covering every player and team in league history. This was PureSim's standout feature.

**Recommendation**: Build a dedicated Record Book spec covering:
1. Single-season records (per stat category, scaled thresholds)
2. Career records (per stat category)
3. Franchise records (per team: best season, worst season, longest streak)
4. Game records (most HR in a game, most K in a game)
5. Records should be queryable and displayed in a dedicated UI

### Conversation 7: Playoff Stats Separation

**The Question**: Should playoff stats be tracked separately from regular season stats?

**Current Spec**: The Playoff spec defines three game modes (Franchise, Exhibition, Playoff Series) but doesn't explicitly state whether playoff stats are in separate accumulators.

**OOTP/Lahman Reference**: Playoff stats are in separate tables (BattingPost, PitchingPost, FieldingPost). Regular season stats and postseason stats are NEVER combined. This is standard across baseball data.

**Recommendation**: Playoff stats MUST be in separate accumulators. A player's regular season batting average should not be affected by their playoff performance. This is both baseball convention and data integrity requirement. The stat pipeline needs two modes: regular season accumulation and postseason accumulation.

---

## 7. Recommendations

### 7.1 Implementation Priority (Build Order)

Based on dependency analysis, competitor research, and risk assessment:

**Phase A: The Spine (Prerequisites for everything)**
1. Stat Pipeline — `GAME_COMPLETE → SeasonStats → WAR → Standings`
2. Career Stats Calculator — `SUM(PlayerSeasonStats) WHERE playerId`
3. Salary Calculator — Pure function from ratings/position/age/traits
4. Season Transition Engine — `closeSeason()` / `openSeason()` with validation

**Phase B: The Core Offseason (Minimum viable multi-season)**
5. Awards Ceremony (Phase 2) — Needs finalized season stats
6. EOS Ratings Adjustments (Phase 3) — Needs WAR + salary
7. Retirements (Phase 5) — Needs age + morale + salary
8. Free Agency (Phase 6) — Needs personality + salary matching
9. Finalize & Advance (Phase 11) — Needs roster validation

**Phase C: Depth Systems**
10. Draft System (Phase 7) — Needs draft order + prospect generation
11. Farm System (Phase 8) — Needs call-up/send-down + rookie salary
12. Trade System (in-season + Phase 10) — Needs contract value matching
13. Dynamic Designations — Needs WAR + Value Delta
14. Fan Morale — Needs Expected Wins + event catalog

**Phase D: Engagement Systems**
15. Narrative Engine — Needs all game/franchise events as input
16. Milestone System — Needs career stats + scaled thresholds
17. Stadium Analytics — Needs game-level park data
18. Chemistry Rebalancing (Phase 9) — Needs personality data
19. Record Book — Needs career + season stats + milestone data

**Phase E: High-Risk/Optional**
20. Contraction & Expansion (Phase 4) — Highest blast radius
21. Hall of Fame pipeline — Needs career stats + user discretion UI
22. Advanced AI (personality profiles, strategic planning)

### 7.2 Architectural Principles

1. **Event bus as the spine**. Every system publishes and subscribes to typed events. No system directly calls another — they communicate through events. This enables testing systems in isolation and adding new consumers without modifying producers.

2. **Pure functions for calculations**. Salary, WAR, EOS adjustments, fan morale, milestones — all should be pure functions with explicit inputs and deterministic outputs. This enables unit testing, caching, and debugging.

3. **Atomic season transitions**. `closeSeason()` and `openSeason()` must be all-or-nothing. Use IndexedDB transactions to ensure consistency. If any step fails, roll back to pre-transition state.

4. **Separate postseason stats**. Never mix regular season and postseason accumulators. This is baseball convention and data integrity.

5. **Scaled thresholds everywhere**. Every threshold in the system should go through the `ScaledThreshold` utility that accounts for games-per-season and innings-per-game.

6. **Ceremonies are cosmetic, calculations are deterministic**. The dice roll animation plays AFTER the outcome is calculated. This enables: review/replay of ceremonies, save/restore of ceremony state, unit testing of outcomes without UI.

7. **AI is a replaceable module**. Every AI decision point should have a clear interface (`evaluateTrade(proposal) → Accept | Reject | Counter`). This enables iterative AI improvement without touching the systems that call it.

### 7.3 The One Thing That Matters Most

The stat pipeline is the foundation. Without it:
- Awards can't be calculated (no season stats)
- EOS adjustments can't run (no WAR)
- Fan morale can't react (no win/loss records)
- Milestones can't trigger (no career stats)
- Designations can't project (no WAR or Value Delta)
- Narrative can't fire (no events to react to)
- Draft order can't be determined (no expected WAR)
- The entire offseason is disconnected from gameplay

Build the pipeline. Test the pipeline. Trust the pipeline. Everything else is a consumer.

---

*End of Franchise Mode Deep-Dive Analysis v1.0*
*Total systems analyzed: 22*
*Total spec documents read: 26 (20+ KBL specs + OOTP research + competitor research)*
*Total source material: ~17,000 lines of specifications*
