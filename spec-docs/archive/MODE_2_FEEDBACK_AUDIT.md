# MODE 2 FEEDBACK AUDIT — What's In vs What's Missing

**Date:** 2026-02-25  
**Scope:** Every note from JK's feedback doc compared against MODE_2_FRANCHISE_SEASON.md v1.2  
**Legend:** ✅ = Incorporated | ⚠️ = Partially incorporated | ❌ = NOT incorporated / still missing

---

## 3.4 — Appeals not possible in SMB4

**Feedback:** Remove appeals since they don't exist in SMB4.

**Spec says (§6.3, line 836-837):** "Appeal play on preceding runner *(Note: appeal outs do not exist in SMB4 — included for baseball rules completeness only)*"

**Verdict: ⚠️ Partially.** The note is there acknowledging appeals don't exist in SMB4, but the rule text is still present rather than fully removed. It's kept for "completeness" with a disclaimer. JK said "leave it out" — the disclaimer approach may be acceptable, but it's not a clean removal.

---

## 3.7 — Fenway scoreboard should include game score, inning, outs; leverage existing scoreboard; replace enhanced field space

**Feedback:** Include game score, inning, outs on the Fenway scoreboard. Leverage existing scoreboard logic. Replace the enhanced field space.

**Spec says (§3.7, lines 636-668):** Fenway Board is top-left, includes "game score, inning, outs" explicitly in the zone table. Says "replaces the previous enhanced field space" and "leveraging the existing scoreboard UI component."

**Verdict: ✅ Fully incorporated.**

---

## 7.1 — Position swap event

**Feedback:** Position swap seems cleaner (vs two separate events).

**Spec says (§7.1, lines 951-953):** "Position Swap: Two players swap defensive positions mid-game... recorded as a single `substitution` event with `type: 'position_change'`... NOT two separate events."

**Verdict: ✅ Fully incorporated.**

---

## 8.3 — wpa vs clutchRating redundancy

**Feedback:** Seems like wpa and clutchRating are saying the same thing.

**Spec says (§13.1, lines 1677-1689):** Spec was simplified to WPA-based clutch. "Clutch attribution uses straight WPA... No separate clutch formula needed." The relationship between LI and WPA is explicitly clarified: "LI measures situation importance... WPA measures what actually happened. They are complementary, not redundant."

**Verdict: ✅ Addressed — WPA-based simplification resolves the redundancy concern.**

---

## 8.3 — per9 stats should scale for inningsPerGame

**Feedback:** All the "per9" stats should scale for inningsPerGame.

**Spec says (§8.3, lines 1072-1077):** `per9` block includes comment: "Per-9-innings rates, scaled by inningsPerGame" with formula example `(K × 9 × (9/inningsPerGame)) / IP`.

**Verdict: ✅ Fully incorporated.**

---

## 8.3 — Fielding percentage should include missedDives and missedLeaps in denominator

**Feedback:** Shouldn't fielding percentage include missedDives and missedLeaps in the denominator?

**Spec says (§8.3, line 1078):** `fieldingPct: number; // (PO + A) / (PO + A + E + missedDives + missedLeaps)`

**Verdict: ✅ Fully incorporated.**

---

## 8.3 — Web gems as a total count

**Feedback:** Probably web gems as a total (instead of games with a web gem).

**Spec says (§8.3, line 1088):** `webGems: number; // Total count (engine-derived from fWAR threshold, see §10.4)`

**Verdict: ✅ Fully incorporated.**

---

## 8.3 — Add all to achievements

**Feedback:** Add all those to achievements.

**Spec says (§8.3, lines 1081-1093):** Achievements block includes: qualityStarts, completeGames, shutouts, noHitters, perfectGames, cycles, multiHRGames, fiveHitGames, sixHitGames, webGems, goldenSombreros, titaniumSombreros, madduxGames, immaculateInnings.

**Verdict: ✅ Comprehensive achievements list present.** However, see 8.3 audit questions below for potential gaps (killed pitchers, nut shots in batting stats; web gems in fielding stats).

---

## 9.7 — Add all missing pitcher achievements

**Feedback:** Yes, add all those under "missing."

**Spec says (§9.7, lines 1233-1271):** Includes: quality start, Maddux, immaculate inning, perfect game, CGSO, 20K game (scaled), back-to-back shutouts, 10+ K game, save streak, win streak. No-hitter function `isNoHitter` is referenced inside `isPerfectGame` at line 1250.

**Verdict: ✅ No-hitter and other pitcher achievements are present.** The no-hitter is referenced via `isNoHitter()` function call. The list appears comprehensive.

---

## 10.4 — Web gems are engine-derived, not user-tagged; difficulty multipliers as enrichments in +fielding button

**Feedback:** Great fix — no longer need "web gems" as a modifier button. User just puts in what happened. Difficulty multipliers need to be accessible via +fielding button.

**Spec says (§10.4, lines 1355-1358):** "Star play categories are user-selected enrichments via the `[+fielding]` button... The user selects the difficulty category (diving, leaping, wall catch, etc.)... Web Gems are engine-derived, NOT user-tagged."

**Verdict: ✅ Fully incorporated.** Also noted in §4.3 line 731: "web_gem is NOT a modifier — web gems are engine-derived from fWAR thresholds."

---

## 11.2 — Keep clutch separate from WAR (except relievers); verify clutchAttribution logic for high-LI situations

**Feedback:** Keep clutch measurement separate from WAR (with the exception of relievers). Are we sure clutchAttribution logic is sound?

**Spec says (§11.2, lines 1504-1508):** Leverage multiplier is explicitly "relievers only." Starters don't get leverage-weighted pWAR. §13 (Clutch Attribution) is a fully separate system from WAR — it uses WPA, which is independent of WAR calculations.

**Verdict: ✅ Clutch is separate from WAR. Leverage applies to pWAR for relievers only.** The question about "is clutchAttribution logic sound" is a design review question, not a change request — the spec presents the WPA-based approach.

---

## 11.3 — fWAR should consider situational context, difficulty, errors while on the move

**Feedback:** Does fWAR take into consideration how valuable/costly each play is given context and difficulty? Do we track errors on the move? Are we calling everything else a generic error?

**Spec says (§10.7, lines 1404-1418):** `calculatePlayFWAR` uses `base × posMod × diffMod × liMod` where `liMod = Math.sqrt(leverageIndex)`. §10.5 (lines 1373-1380) has effort error classification: "Error on a difficult play" gets 50% reduced penalty. Three error types: fielding, throwing, mental. "Missed Dive/Leap" is its own category with 0 penalty.

**Verdict: ✅ fWAR incorporates context (LI), difficulty (star play multiplier), and has effort-based error classification.** The "errors while on the move" question is addressed by the effort error system (diving attempt = 50% reduced penalty) and missed dive/leap category.

---

## 11.5 — Context window closes at end of half-inning

**Feedback:** Agreed, context window closes at end of half-inning.

**Spec says (§10.7, line 1418):** "The context window closes at the end of the half-inning — runs that score later do not retroactively change fWAR for plays in earlier half-innings."

**Verdict: ✅ Fully incorporated.**

---

## 13.8 — WPA-based clutch simplification; net clutch rating

**Feedback:** Absolutely the right fix. Ensure flow-through impact is addressed across documentation.

**Spec says (§13.1, lines 1677-1691):** WPA-based clutch is the core. §13.8 (lines 1781-1793): `PlayerClutchStats` includes `totalWPA` (net), `positiveWPA`, `negativeWPA`, `clutchMoments`, `chokeMoments`, `gmLI`.

**Verdict: ✅ WPA-based clutch fully incorporated with net clutch rating (totalWPA = positiveWPA + negativeWPA).**

---

## 14.11 — Engine should still track games at various mojo/fitness states

**Feedback:** We still need the engine to track the number of games at various mojo and fitness states. User enters the state but engine tracks it.

**Spec says (§14.2, line 1825):** "Games at each mojo level (for narrative and designation purposes)." §14.11 (lines 1936-1939): `battingSplitsByMojo`, `battingSplitsByFitness`, `pitchingSplitsByMojo`, `pitchingSplitsByFitness`. §14.5 (line 1843): "Games played at each fitness state."

**Verdict: ✅ Fully incorporated.** Engine tracks mojo/fitness state per game and performance splits by state.

---

## 16.1 — Name generation for managers and scouts in Mode 1; user-editable names

**Feedback:** Name generation logic should apply to managers and scouts in Mode 1. Users should be able to edit names.

**Spec says (§16.1, lines 2083-2084):** "Beat reporter names are auto-generated using the same name generation system as players (Mode 1). This system also generates names for managers and scouts in Mode 1. All generated names are user-editable."

**Verdict: ✅ Fully incorporated.**

---

## 16.9 — X feed, Tootwhistle Times, post-game summary screen, pop-up narrative events; narrative → playerMorale impact

**Feedback:** There's an "X" feed in the game-tracker, "The Tootwhistle Times" on Franchise Home Page, post-game summary may need UI. Unexpected narrative events should pop up. Ensure narrative impacts playerMorale.

**Spec says (§16.10, lines 2256-2265):** Full table with four surfaces: X Feed (in-game), Tootwhistle Times (Franchise Home Page, filterable), Post-Game Summary (dedicated panel), Pop-Up Notifications (toast-style). Line 2265: "All narrative events that reference a specific player can influence that player's morale (§17.14)."

**Verdict: ✅ Fully incorporated.**

---

## 17.3/17.4 — Keep projected designations changing game-by-game; verify True Value wiring

**Feedback:** No actual designations, just projected changes game by game once activated. Verify True Value is wired.

**Spec says (§17, lines 2272-2273):** "All performance-based designations recalculate after every completed game. Mid-season values are always 'projected' (dotted border badge). Designations only become 'locked' (solid border) at season end."

**Spec says on True Value (§17.3, lines 2296-2297; §17.4, lines 2304-2306):** Both Fan Favorite and Albatross reference "Value Delta = True Value − Contract. True Value calculated per SALARY_SYSTEM_SPEC."

**Verdict: ✅ Projected designations game-by-game is incorporated.** True Value references SALARY_SYSTEM_SPEC — the wiring verification is a codebase concern, not a spec concern.

---

## 17.14 — Draft player morale spec; morale affecting clutch vs rating changes

**Feedback:** Draft playerMorale as 17.14. Good ideas except morale affecting clutch. Thoughts on morale leading to rating increases/decreases the user inputs into SMB4?

**Spec says (§17.14, lines 2457-2512):** Full playerMorale system present. Lines 2502-2510: "Morale → Rating Change Suggestions" — when morale hits sustained thresholds, engine generates narrative-surfaced suggestions. Line 2512: "Morale does NOT directly affect clutch." The rating change suggestion approach (user decides whether to apply in SMB4) is exactly what JK discussed.

**Verdict: ✅ Fully incorporated.** Morale doesn't affect clutch. Instead it generates rating change suggestions the user can optionally apply, preserving the "user is the bridge" paradigm.

---

## 18.2 — 5-hit game 1.5 fame, 6-hit game 2.0 fame

**Feedback:** 5-hit game should be 1.5; 6-hit game should be 2.0 fame.

**Spec says (§18.2, lines 2567-2568):** "5-Hit Game | 5 hits in a game | +1.5 | Major" and "6-Hit Game | 6+ hits in a game | +2.0 | Major."

**Verdict: ✅ Fully incorporated.**

---

## 18.2 — Mental errors in field should be -0.5 fame

**Feedback:** Mental errors in the field should also negatively affect fame (-0.5).

**Spec says (§18.2, line 2579):** "Mental Error | Wrong base, missed cutoff, etc. | -0.5 | Per §10.5"

**Verdict: ✅ Fully incorporated.**

---

## 18.2 — Terrible outings (5+ runs as pitcher, 0-for-5 at plate)

**Feedback:** Terrible outings should negatively affect fame.

**Spec says (§18.2, lines 2582-2583):** "Terrible Pitcher Outing | 5+ runs allowed in a start | -0.5 | Bad day on the mound" and "0-for-5+ Game | 0 hits in 5+ AB | -0.3 | Minor boner." Also in §10.5 line 1380: "Terrible pitcher outings (5+ runs allowed) receive -0.5 fame."

**Verdict: ✅ Fully incorporated.**

---

## 18.2 — No MLB equivalents; use 30/30, 40/40, 50/50 scaled; leave out 25/25

**Feedback:** No on the MLB equivalents direction. Do 30/30, 40/40, 50/50 scaled. Leave out 25/25. Don't go below 10 for any milestone.

**Spec says (§18.3, lines 2591-2599):** Table shows 30-30, 40-40, 50-50 clubs (no 25-25). All scaled. "A minimum floor of 10 applies to any individual threshold." §23.5 line 3090: `universalFloor: 10`.

**Verdict: ✅ Fully incorporated.** 25/25 removed. Floor of 10 applied.

---

## 18.5 — Increase minimumPA to 25, minimumIP to 20

**Feedback:** Increase minimumPA to 25 and minimumIP to 20.

**Spec says (§18.5, lines 2638-2640):** "minimumPA: 25 (batting leaders)" and "minimumIP: 20 (pitching leaders)."

**Verdict: ✅ Fully incorporated.**

---

## 18.7 — Trade aftermath: trading Albatross should improve morale (inverse of Fan Favorite trade)

**Feedback:** For trade aftermath, this should swing in both directions; trading the projected Albatross should improve all players' morale.

**Spec says (§18.7, line 2663):** "Trading away an Albatross improves remaining players' morale (+2 team-wide). Trading away a Fan Favorite or Cornerstone reduces morale (-3 to -5)."

**Verdict: ✅ Fully incorporated.**

---

## 18.8 — Great!

**Feedback:** Approval only, no changes needed.

**Verdict: ✅ N/A — approval noted.**

---

## 20.1 — Include playerMorale effects, not just fanMorale

**Feedback:** Include playerMorale effects here too, not just fanMorale.

**Spec says:** §17.14 is a full standalone playerMorale system. §20.8 line 2812 explicitly connects: "Fan morale ≥80 → +3 playerMorale adjustment. ≤30 → -3 playerMorale adjustment." §20.1 itself (fan morale formula) remains fan morale only, but the downstream link to playerMorale exists.

**Verdict: ⚠️ Partially.** The fan morale formula at §20.1 doesn't directly reference playerMorale as an output, but §20.8 does connect fan morale thresholds to playerMorale adjustments, and §17.14 covers the full playerMorale system. The wiring exists but isn't visible in §20.1 itself. Could be clearer with a cross-reference in §20.1.

---

## 20.3 — playerMorale should fire for own milestones; walk-offs should be major for fanMorale

**Feedback:** Does this apply to just fanMorale? playerMorale should fire for their own milestoneAchieved, right? Also, any type of walk-off should be considered major for fanMorale.

**Spec says:** §20.8 line 2812: "playerMorale fires for a player's own milestones even if minor." §17.14 line 2483: "Personal milestone (own) | +3 to +8 | Always fires, even for minor milestones." §20.3 line 2771: "Walk-off ±3 (ALWAYS major event for fanMorale regardless of context)."

**Verdict: ✅ Fully incorporated.** playerMorale fires on own milestones. Walk-offs explicitly marked as ALWAYS major for fanMorale.

---

## "Make sure everything isn't inference but actually in the spec"

**Feedback:** Ensure algorithms described are in the spec, not assumptions.

**Verdict:** This is a meta-directive, not a specific change. The spec does include explicit formulas, constants, and code throughout. Compliance is a continuous concern.

---

## 1.3 — Event immutability: how does user correct auto-advance mistakes?

**Feedback:** If events are immutable, how does user change event for auto-advance mistakes? Is it done by versioning?

**Spec says (§1.3, lines 73-74):** "Enrichment adds optional fields via versioned edits tracked in `editHistory[]`. Runner positions can be corrected post-save via the same versioning mechanism."

**Verdict: ✅ Addressed.** Versioned edits via `editHistory[]` handle corrections. Outcome is immutable; enrichment/runner positions are correctable via versioning.

---

## 2.1 — Does "traits: string[]" need breakout for trait1/trait2?

**Feedback:** Does traits need to be broken out for trait1 and trait2?

**Spec says:** The `AtBatEvent` interface at §2.1 does NOT include a `traits: string[]` field. Instead, it includes `personality?: PersonalityType` and `hiddenModifiers?: HiddenModifiers` in both batterContext and pitcherContext. Traits are not directly on the event — they're on the player entity in Mode 1.

**Verdict: ⚠️ Ambiguous.** The spec doesn't have `traits: string[]` on the event model. This may have been in an older version. The current approach snapshots personality and hidden modifiers. If JK wants per-at-bat trait context, it's not currently there. This needs clarification on whether the concern is resolved by the current architecture or still outstanding.

---

## 2.1 — What is "isClutchProfile"?

**Feedback:** What is "isClutchProfile"?

**Spec says:** No occurrence of `isClutchProfile` in the spec. Not in AtBatEvent or any interface.

**Verdict: ✅ Removed / not present.** The field was apparently from an older version and has been removed. If JK wanted it kept, this needs discussion.

---

## 2.1 — Should we pull in data from Stadium Analytics Spec for parkContext?

**Feedback:** Should we pull in stadium analytics data for parkContext?

**Spec says (§2.1, lines 225-229):** `parkContext` includes `stadiumId`, `parkFactors?: ParkFactors` with a comment referencing "Full ParkFactors from §24.1 (overall, runs, HR, hits, doubles, triples, K, BB, handedness splits, directionFactors, confidence, gamesIncluded, source)," plus `lighting` and `dimensions`.

**Verdict: ✅ Fully incorporated.** parkContext references the full ParkFactors structure from §24.1.

---

## 2.1 — What is "clutchValue"?

**Feedback:** What is clutchValue? Is it derived from Leverage Index?

**Spec says:** No occurrence of `clutchValue` in the current spec. The clutch system now uses straight WPA (§13.1). LI is captured as `leverageIndex` on the event.

**Verdict: ✅ Resolved.** clutchValue was replaced by the WPA-based simplification. The old field is gone.

---

## 2.1 — What is "MilestoneEvent" if not one of three event drivers?

**Feedback:** What is MilestoneEvent if it's not one of our three EVENT drivers?

**Spec says:** No standalone `MilestoneEvent` type in the spec. Milestones are tracked via `milestoneTriggered?: AchievedMilestone[]` on the AtBatEvent (§2.1 line 238) and the `AchievedMilestone` interface at §18.8.

**Verdict: ✅ Resolved.** Milestones are attributes of existing events, not a separate event type.

---

## 2.1 — FameLevel should match Mode 1 prospect levels

**Feedback:** Type FameLevel shows different categories than the LeagueBuilder for prospects. Go with prospect levels.

**Spec says (§2.1, line 275):** `type FameLevel = 'Unknown' | 'Local' | 'Regional' | 'National' | 'Superstar' | 'Legend'` with comment "Aligned with MODE_1_LEAGUE_BUILDER.md fame tiers."

**Verdict: ✅ Explicitly aligned with Mode 1.**

---

## 2.1 — PlayerPersonality should align with Mode 1's 7 types and 4 hidden modifiers

**Feedback:** Update personality interface to align with Mode 1's 7 personality types and 4 hidden modifiers (0-100).

**Spec says (§2.1, lines 296-308):** `PersonalityType = 'Competitive' | 'Relaxed' | 'Droopy' | 'Jolly' | 'Tough' | 'Timid' | 'Egotistical'` (7 types). `HiddenModifiers` has `loyalty`, `ambition`, `resilience`, `charisma` all 0-100.

**Verdict: ✅ Fully incorporated.** 7 personality types + 4 hidden modifiers 0-100 aligned with Mode 1.

---

## 2.2 — Substitution position fields: what do they do?

**Feedback:** For substitution, what does `position: FieldPosition` and `previousPosition?: FieldPosition` do? Tied to outPlayerId or inPlayerId?

**Spec says (§2.2, lines 357-365):** The substitution payload now has `outPosition: FieldPosition` (position the departing player was playing), `inPosition: FieldPosition` (position the entering player will play), and `previousPosition?: FieldPosition` (for position_change: what position they had before). Clear ownership.

**Verdict: ✅ Clarified.** Field names explicitly indicate which player they belong to.

---

## 2.2 — Mojo/fitness playerStateChange: does "reason" auto-pull most recent event?

**Feedback:** Does `reason?: string` automatically pull in the most recent event? Or does user manually answer?

**Spec says (§2.2, lines 367-374):** `playerStateChange` includes `linkedPlayId?: string` and `reason?: string`. §5.6 (line 801-802): "Changes save immediately as BetweenPlayEvent with linked play context."

**Verdict: ⚠️ Partially addressed.** The `linkedPlayId` provides automatic linkage to the triggering event. But whether `reason` is auto-populated or user-entered isn't explicitly stated. The `linkedPlayId` suggests automatic context capture, but `reason` appears optional/manual.

---

## 3.4 — Are all ways of making an out captured?

**Feedback:** Are we CERTAIN that all ways of making an out are captured by engine?

**Spec says (§3.4, lines 589-594):** Lists K, GO, FO, LO, PO (1 out each), DP (2 outs), TP (3 outs), caught stealing/pickoff (1 out each). §6.2 covers all result types.

**Verdict: ✅ Comprehensive.** All SMB4-possible out types are present. FC results in batter reaching (not an out for the batter but out for the lead runner).

---

## 3.5 — Does user add fielder who threw out runner at home as enrichment?

**Feedback:** Does user add the fielder who threw out the runner at home as an enrichment after the play outcome is registered?

**Spec says (§4.3, lines 703-705):** "Fielding Sequence: Tap numbered fielder icons in order... Reused for putouts, assists, errors, fielder's choice."

**Verdict: ✅ Yes, via enrichment.** The fielding sequence enrichment captures who was involved in any play, including throws home.

---

## 3.5 — Do we need more one-off situations or does correction logic handle all?

**Feedback:** Do we need more of these one-off situations or does correction logic infinitely solve for all possibilities?

**Spec says (§3.5, line 619):** "Key principle: Defaults handle common case silently. Corrections always available via play log. No correction requires >3 taps. No correction blocks the flow."

**Verdict: ✅ Addressed by design principle.** The play log correction system + enrichment is designed to be universal.

---

## 3.5 — How does user override runner auto-advancing from 3rd to home?

**Feedback:** How does user override a runner who auto-advanced from 3rd to home and scored who shouldn't have? Wouldn't the runner icon disappear?

**Spec says (§3.3, lines 580-582):** "Pressing undo: pops last event, reverses runner positions, restores previous batter/pitcher, reverses stats." §1.3 line 74: "Runner positions can be corrected post-save via the same versioning mechanism."

**Verdict: ⚠️ Partially addressed.** Undo handles it if caught immediately. Versioned edits handle it post-save. But the specific UX concern about the runner icon disappearing after auto-advance isn't directly addressed — the mechanism exists but the visual feedback during correction isn't specified.

---

## 3.7 — Fenway Board positioning (top/bottom for horizontal layout)

**Feedback:** As the Fenway Scoreboard is horizontal, should it be at the top or bottom of the iPad layout? Vertical side seems poor use of space. Play log should be scrollable vertical.

**Spec says (§3.7, lines 636-668):** Layout shows Fenway Board at top-left as a panel. Play Log is on the right side, vertical, with scrollable entries. The spec positions it as designed.

**Verdict: ✅ Layout is specified.** Fenway Board is top-left panel (horizontal), Play Log is vertical right panel. JK's concerns about positioning appear addressed by the current layout. Whether this is exactly what JK envisioned may need visual confirmation during implementation.

---

## 4.1 — Enrichment critical for deep stadium analytics

**Feedback:** Enrichment additions are also critical to having deep stadium analytics, per the stadium_analytics_spec.

**Spec says (§4.1, line 676-677):** "Enrichment adds: spray charts, fielding credit, exit type refinement, HR distance, fielding range metrics, GO/AO ratio, BABIP splits by direction." §24 covers stadium analytics consuming this data.

**Verdict: ✅ Addressed.** Enrichment feeds stadium analytics as designed.

---

## 4.3 — Leverage current field UI for spray chart; foul-out handling; pitch count per at-bat optional

**Feedback:** Can we leverage current field UI? Ensure mini-diamond isn't too small. Does this handle foul-outs? Is pitch count per at-bat optional?

**Spec says (§4.3):** Mini-diamond is the spray chart input. No explicit note about leveraging existing field UI vs building new. Foul-outs: Not explicitly called out in spray chart context. Foul territory mentioned in §24.4 for park factors. §4.3 lines 718-721: Pitch count per at-bat is a numeric input, but the general rule about only inputting 7+ pitch ABs isn't in the spec.

**Verdict: ⚠️ Partially addressed.** Foul-out handling in spray charts isn't explicit. JK's note that "if an out takes place in foul territory, it's always a foul-out via pop-fly, never a ground-out and rarely a line-drive" is NOT codified. The pitch count per at-bat optionality is partially there (it's in the enrichment section, so inherently optional), but JK's specific rule about "user will only input 7+ pitch at-bat" isn't stated.

---

## 6.2 — Remove CI (Catcher Interference) from at-bat outcomes

**Feedback:** CI is not a thing in SMB4 and should be removed.

**Spec says (§6.2, line 829):** "Note: CI (catcher's interference) does not exist in SMB4 — removed from event model."

**Verdict: ✅ Fully incorporated.**

---

## 6.7 — OBP should include IBB

**Feedback:** OBP should include IBB.

**Spec says (§6.7, line 919):** `OBP = (H + BB + HBP) / (AB + BB + HBP + SF)` with comment "Note: BB includes IBB for OBP purposes."

**Verdict: ✅ Fully incorporated.**

---

## 7.1 — Defensive sub can happen anytime, not just between innings

**Feedback:** Defensive Sub can happen anytime, not just "between innings."

**Spec says (§7.1, line 948):** Table shows Defensive Sub as "Between innings."

**Verdict: ❌ NOT incorporated.** The spec still says defensive subs happen "between innings" only. JK's feedback says they can happen anytime. This needs correction.

---

## 7.1 — Fielders can swap positions (SS and 3B swap, both stay in game)

**Feedback:** Fielders can swap positions with each other in the field, both stay in the game.

**Spec says (§7.1, lines 951-953):** "Position Swap: Two players swap defensive positions mid-game... No new player enters — recorded as a single substitution event."

**Verdict: ✅ Fully incorporated.** However, the table at line 948 says Position Swap happens "Between innings" — JK may want this anytime as well (consistent with defensive sub feedback above).

---

## 8.2 — Cycle detection: hit order is irrelevant

**Feedback:** For cycle detection, hit order is irrelevant. Should check for one player getting all four hit types in any order.

**Spec says (§8.2, line 1015):** `hitOrder: ('1B' | '2B' | '3B' | 'HR')[]  // For cycle detection` — the field name "hitOrder" and the fact it's an array suggests order tracking, but the actual cycle detection implementation at §18.2 line 2563 just says "Cycle | 1B+2B+3B+HR." The array could be used for detection regardless of order.

**Verdict: ⚠️ Ambiguous.** The field is named `hitOrder` which implies order matters, but the milestone definition doesn't require order. Renaming to something like `hitTypes` would be clearer. The logic should be explicitly stated as order-irrelevant.

---

## 8.3 — Web Gems tracked by fielding stats

**Feedback:** Web Gems need to be tracked by fielding stats.

**Spec says (§8.3):** `webGems` appears in the `achievements` block (line 1088), not in the `fielding` block (lines 1065-1066). The fielding block only has games, putouts, assists, errors, and byPosition.

**Verdict: ❌ NOT incorporated.** Web gems are in achievements, not fielding stats. JK specifically said they should be tracked in fielding stats.

---

## 8.3 — Killed Pitchers and Nut Shots tracked in batting stats

**Feedback:** Killed Pitchers and Nut Shots need to be tracked for batting stats.

**Spec says (§8.3):** Neither `killedPitchers` nor `nutShots` appear in the batting stats section. They're referenced as modifiers in §4.3 line 731: `modifiers: ['nut_shot', 'killed']`.

**Verdict: ❌ NOT incorporated as batting stats.** They exist as event modifiers but are not tracked as countable batting statistics in the season stats interface.

---

## 8.3 — Comprehensive review of what's missing in calculated and achievements

**Feedback:** Let's carefully review this section; what are we missing in "calculated:" and "achievements:"?

**Verdict: ⚠️ This was a discussion request.** The spec has expanded both sections substantially. Whether everything is captured depends on a detailed baseball knowledge review. Some gaps already identified above (web gems in fielding, killed pitchers / nut shots in batting).

---

## 8.4 — Career stats accessible anytime via Almanac, not just season end

**Feedback:** Are career totals only calculated at season's end? Can user access career stats anytime via search/filters?

**Spec says (§8.4, line 1108):** "Season → Career: On season end, finalizeSeason() adds season totals to career." Career stats are only explicitly updated at season end.

**Verdict: ❌ NOT fully addressed.** The spec only shows career stat accumulation at season end. JK asked about in-season Almanac access to career stats. The spec doesn't address whether career stats are accessible mid-season (they should be: current career + in-progress season stats).

---

## 9.7 — Pitcher achievements list is sparse; no-hitter missing?

**Feedback:** The list of pitcher special achievements is sparse. No hitter for sure, right? What else?

**Spec says (§9.7):** Includes: quality start, Maddux, immaculate inning, perfect game (which references `isNoHitter`), CGSO, 20K game, back-to-back shutouts, 10+ K game, save streak, win streak. No-hitter is used inside `isPerfectGame` and tracked in achievements (`noHitters: number` at line 1084).

**Verdict: ✅ No-hitter and comprehensive list present.**

---

## 9.8 — DO NOT estimate pitch count; get rid of estimation system; require input

**Feedback:** DO NOT estimate pitch count. Remove "Estimation system." Require pitch count input anytime it's needed, don't make it optional.

**Spec says (§9.8, lines 1280-1288):** The estimation system is STILL PRESENT in the spec. `PITCHES_PER_BATTER_ESTIMATE` constants are still there with the header "Estimation system (when user doesn't provide)."

**Verdict: ❌ NOT incorporated.** The estimation system was NOT removed despite JK explicitly saying to remove it. The spec still has the fallback estimation constants. This needs to be deleted and replaced with mandatory pitch count input at specified capture points.

---

## 10.1 — Missing fielding chance inputs? Foul-out?

**Feedback:** Are we missing any fielding chance inputs? Foul-out? Or is that tied to the hit type?

**Spec says (§10.1, lines 1300-1311):** Table includes GO, FO, LO, PO, DP, SF, FC, Error, D3K as fielding chances. Foul-outs would be PO (pop-out), which is listed. FO (fly out) is also listed. The distinction between fair territory and foul territory isn't explicit in fielding chance rules.

**Verdict: ⚠️ Partially addressed.** Foul-outs as PO are implicitly covered, but there's no explicit foul-out fielding chance category or special handling for foul territory plays (which JK raised as a concern).

---

## 10.3 — Exhaustive DP chains or inferential logic?

**Feedback:** Do we need an exhaustive list of possible DP chains? Or is this just a reference?

**Spec says (§10.3, lines 1343-1351):** Shows 6 common DP chains with inference by direction. States "DP inference by direction" with primary patterns.

**Verdict: ✅ Addressed as inferential logic with common examples.** Not exhaustive, which appears to be the intent (inference handles the rest).

---

## 10.4 — Use combo of LI and webGem modifiers to simplify; difficulty modifier tied to 10.7

**Feedback:** How can we use a combo of Leverage Index and webGem modifiers to simplify? Is this the difficulty modifier tied into 10.7?

**Spec says (§10.7, lines 1404-1416):** `calculatePlayFWAR` uses `base × posMod × diffMod × liMod`. `diffMod` comes from `getDifficultyMultiplier(event.starPlayCategory)` which maps to §10.4 star play categories. `liMod = Math.sqrt(leverageIndex)`. The comment explicitly says "diffMod maps to §10.4 star play categories."

**Verdict: ✅ Fully incorporated.** LI and difficulty multiplier are combined in the fWAR calculation at §10.7. The web gem concept is now engine-derived from the resulting fWAR value.

---

## 10.5 — Can we leverage LI to add context to errors? Track if error led to run scoring?

**Feedback:** Can we leverage LI for error context? Can we track if the error led to that player scoring?

**Spec says (§10.5, lines 1374-1379):** Error categories have base fWAR penalties and "Context Modifiers" including "×1.5 if allowed run." §10.7 applies `liMod = Math.sqrt(leverageIndex)` to all fielding plays including errors.

**Verdict: ✅ Addressed.** LI is factored via §10.7 calculation. Error context modifiers include "×1.5 if allowed run" which tracks run-scoring consequences.

---

## 10.6 — On assist line: relay and cutoff are the same thing; remove cutoff, keep relay

**Feedback:** Relay and cutoff are essentially the same thing. Remove cutoff; keep relay.

**Spec says (§10.6, line 1388):** `assist: { infield: 0.04, outfield: 0.08, relay: 0.03, cutoff: 0.02 }`

**Verdict: ❌ NOT incorporated.** Both `relay` and `cutoff` still appear in the assist run values. JK said to remove cutoff, keeping only relay.

---

## 10.7 — Where does diffMod come from? Should it be LI? Fielding should determine web gems automatically

**Feedback:** Where does diffMod come from? Should this be LI? If done right, should remove webGem altogether.

**Spec says (§10.7, lines 1408-1416):** `diffMod = getDifficultyMultiplier(event.starPlayCategory)` — from §10.4 user enrichment. `liMod` is separate. Web gems are engine-derived from fWAR thresholds per §10.4 line 1357.

**Verdict: ✅ Fully addressed.** diffMod comes from user-selected difficulty enrichment (§10.4). LI is separate via liMod. Web gems ARE automatically determined by the engine based on fWAR output.

---

## 11.1/11.2 — Use SMB4-calibrated replacement level numbers; remove MLB version

**Feedback:** For replacement level, use SMB4-calibrated numbers, remove MLB version (17.5).

**Spec says (§11.1, line 1479):** `(PA / 600) × 17.5` (MLB) or `(PA / 600) × 12.0` (SMB4-calibrated).

**Verdict: ❌ NOT incorporated.** Both MLB (17.5) and SMB4 (12.0) versions still present. JK said to remove the MLB version to eliminate risk. Only the SMB4-calibrated value should remain.

---

## 11.1/11.2 — pWAR has leverage multiplier but bWAR does not; intentional?

**Feedback:** Looks like pWAR has a leverage multiplier but bWAR does not. Is this intentional?

**Spec says (§11.2, lines 1504-1508):** Leverage multiplier is "relievers only" on pWAR. §11.1 bWAR has no leverage multiplier.

**Verdict: ⚠️ Addressed but may need discussion.** This is by design (leverage applies to reliever pWAR only). But JK asked "What about starters in high leverage moments? Batters, too? Runners?" — the spec only applies leverage to reliever pWAR. This design choice may need explicit confirmation or a documented rationale.

---

## 11.3 — fWAR doesn't seem to calculate anything; is everything from 10.4-10.7 the proxy?

**Feedback:** fWAR doesn't seem to calculate anything independently. Is everything from §10.4-10.7 used as a proxy?

**Spec says (§11.3, lines 1512-1528):** fWAR section references §10 calculations and adds positional adjustments. The actual per-play fWAR is calculated at §10.7. §11.3 provides the positional adjustment table and scaling notes.

**Verdict: ✅ Addressed.** fWAR = sum of per-play fWAR values from §10.7 + positional adjustments from §11.3. The per-play calculation IS the fWAR mechanism.

---

## 11.5 — Is mWAR logically integrated? IBB→scores/doesn't score? How are manager decisions evaluated?

**Feedback:** Are we certain mWAR is logically integrated? How does the system know if an IBB'd batter doesn't score before the third out vs does score? How are pitching changes and pinch hitters determined success/failure?

**Spec says (§11.5, lines 1547-1578):** Manager decisions are tracked via `managerMoment` events (§2.2 lines 392-398) which include `outcomeEventId` and `outcomeWPA`. Decision outcomes are evaluated by WPA: positive WPA = success, negative = failure. Detailed success/failure values are in the decision table (pitching change, PH, steal call, IBB, etc.).

**Verdict: ✅ Addressed via WPA-based outcome evaluation.** The system uses WPA to determine success/failure of manager decisions. An IBB where the runner scores produces negative WPA for that decision. The `outcomeWPA` field on `managerMoment` captures this.

---

## 13.1 — Where does baseValue come from? Why is contactQuality×inverse of LI? Do we need clutch attribution if we have LI?

**Feedback:** Not sure where baseValue comes from or why contactQuality is associated with clutchValue multiplied by inverse of LI. Do we need clutch attribution if we have LI?

**Spec says (§13.1, lines 1677-1691):** This entire concern was resolved by the WPA-based simplification. The old baseValue × contactQuality × √(LI) formula is GONE. "Clutch attribution uses straight WPA... No separate clutch formula needed."

**Verdict: ✅ Resolved by WPA simplification.** The problematic formula was removed entirely.

---

## 13.8 — Net clutch rating for all-star and awards voting

**Feedback:** Seems like there's value in a net Clutch rating, especially for all-star and awards voting.

**Spec says (§13.8, lines 1783-1793):** `PlayerClutchStats` includes `totalWPA` (net), `positiveWPA`, `negativeWPA`, `gmLI` (average leverage faced). totalWPA IS the net clutch rating.

**Verdict: ✅ Fully incorporated.**

---

## 14 — Remove sections 14.2, 14.3, 14.5, 14.6, 14.8; mojo/fitness comes from user input only

**Feedback:** Remove 14.2, 14.3, 14.5, 14.6, 14.8. The app engine only reflects and tracks current state from user input.

**Spec says:** The section numbering has been reorganized. §14.1 (Mojo Levels) exists. §14.2 is "Mojo State Changes (User-Observed)" — rewritten to user-observed paradigm. §14.4 is Fitness States. §14.5 is "Fitness State Changes (User-Observed)" — also rewritten. The header at lines 1800-1803 says "CRITICAL USER-ONLY PARADIGM: The KBL engine never initiates mojo or fitness changes. All state changes come from the user." §14.7 (Juiced) still exists. §14.8 (Injury Tracking) is "User-Observed." Old predictive/proactive sections appear removed.

**Verdict: ✅ Substantially incorporated.** The user-only paradigm is clearly stated. Auto-calculation/proactive intervention sections appear removed. However, see 14.7 note below about juicedCooldown.

---

## 14.7 — Remove any engine-initiated mojo/fitness changes

**Feedback:** KBL cannot inject a change in state for mojo or fitness. That MUST come from the user. Remove any proactive intervention.

**Spec says:** The user-only paradigm is established. HOWEVER, §14.7 (lines 1857-1869) still has `juicedCooldown` logic and a `checkJuicedEligibility` function that implies the ENGINE determines eligibility. Also, "Random Event ('Hot Streak')" at line 1859 implies engine-initiated state changes.

**Verdict: ⚠️ Partially incorporated.** The paradigm statement is correct, but §14.7's `checkJuicedEligibility` function and "Random Event" triggers contradict the user-only paradigm. If Juiced is only observed in SMB4, the engine shouldn't have eligibility checks or cooldowns.

---

## 14.10 — Do we need getClutchMultiplier? Wrap back into section 10 decisions about clutch

**Feedback:** Do we need getClutchMultiplier here? May not need if LI meets our needs.

**Spec says (§14.10, lines 1917-1921):** `getClutchMultiplier` is still present, mapping mojo states to multipliers. This adjusts clutch attribution based on mojo state (performing well while Rattled = bonus).

**Verdict: ⚠️ Still present — may need removal.** JK questioned whether this is needed given LI. The function is still in the spec. Since clutch is now WPA-based, applying a separate mojo-based clutch multiplier on top of WPA could be double-counting (mojo already affects the player's performance in SMB4, which affects the actual outcome, which affects WPA). This needs a design decision.

---

## 14.11 — Remove juicedCooldown

**Feedback:** Remove juicedCooldown (see section 14 notes about user-only paradigm).

**Spec says (§14.11, line 1934):** `juicedCooldown: number; // Games until can be Juiced again` — STILL PRESENT.

**Verdict: ❌ NOT incorporated.** `juicedCooldown` was NOT removed from the data schema despite JK's explicit instruction.

---

## 15.1 — How are ModifierCategory, ModifierTrigger, ModifierScope wired?

**Feedback:** I need a clear explanation of how these are wired and what effects they have on event data and UX/UI.

**Spec says (§15.1-15.4):** ModifierCategory (7 types), ModifierScope (3 levels), ModifierTrigger (6 triggers) are defined. §15.2 shows EffectType and EffectTarget. §15.3 explains stacking, duration, conflict resolution. §15.4 gives an example.

**Verdict: ⚠️ Partially addressed.** The types are defined and an example is given, but a comprehensive wiring explanation (how each category connects to each trigger and scope, and how the effects flow through the UI) isn't provided. JK asked for "a clear explanation on how these are wired" — the spec defines the structures but doesn't provide a narrative explanation of the flow.

---

## 15.4 — Remove random event logic triggering mojo/fitness changes

**Feedback:** Remove any random event logic that triggers changes to mojo_fitness.

**Spec says (§15.4, lines 2033-2051):** The HOT_STREAK example is still a `RANDOM_EVENT` trigger that changes FITNESS to Juiced. This contradicts the user-only paradigm for mojo/fitness.

**Verdict: ❌ NOT incorporated.** The HOT_STREAK modifier example still shows a random event triggering a fitness change. This should either be removed or rewritten to show the engine RECOGNIZING a user-input state change rather than initiating one.

---

## 16.1 — Beat reporter name derived from SMB4 names file; random personality assignment; when assigned?

**Feedback:** Reporter name from SMB4 names file. Random personality? When does assignment happen?

**Spec says (§16.1, lines 2083-2084):** "Beat reporter names are auto-generated using the same name generation system as players (Mode 1)." §16.2 (line 2111-2114): Personality weights defined for random assignment. §16.1 line 2099: `hiredDate: GameDate` suggests assignment timing. §16.6 (line 2179): "On firing, a new reporter is hired immediately."

**Verdict: ⚠️ Partially addressed.** Name generation and personality weights are specified. But WHEN reporters are initially assigned to teams during franchise creation isn't explicitly stated (presumably Mode 1 setup, but not documented).

---

## 16.2 — Are personality distributions static or per-reporter?

**Feedback:** Are these static distributions or will each reporter have a different balance of weights?

**Spec says (§16.2, lines 2111-2114):** Static weights used for initial assignment. Each reporter gets ONE personality from the weighted distribution. It's not that each reporter has a blend — they get a single personality type.

**Verdict: ✅ Addressed.** Static distribution weights determine personality assignment. Each reporter has one personality (with the 80/20 on-brand/off-brand rule at §16.4).

---

## 16.7/16.8/16.9 — Is LLM routing adequate for rich narrative? Missing anything?

**Feedback:** Is the LLM routing adequate for rich narrative? Are we missing anything that renders narrative elements orphaned?

**Spec says (§16.7-16.9):** 50/50 cloud split, local-only for simple events, cloud-only for major events, shared pool for medium. Player quotes with 80/20 personality rule. Full narrative data model with types, tones, priorities.

**Verdict: ⚠️ This was a discussion/review request.** The routing architecture is documented. Whether it's "adequate" for richness is a judgment call that requires implementation testing.

---

## 17.5 — Multiple Cornerstones allowed per team

**Feedback:** A player should always have the cornerstone badge if previously won Team MVP. Multiple Cornerstones per team.

**Spec says (§17.5, lines 2315-2320):** "Awarded to previous season's Team MVP... Carries Over: Yes, permanently while player remains on team. Multiple: A team can have multiple Cornerstones."

**Verdict: ✅ Fully incorporated.**

---

## 17.7 — Designation renamed to Fan Hopeful

**Feedback:** Designation name changed to Fan Hopeful (per Spine).

**Spec says (§17.7, line 2333):** "Fan Hopeful Designation (Per C-047, renamed per Spine)."

**Verdict: ✅ Fully incorporated.**

---

## 17.8 — Fan Hopeful badge: yellow on baby blue background

**Feedback:** Missing Fan Hopeful on badge list. Make yellow on baby blue.

**Spec says (§17.8, line 2352):** "Fan Hopeful | Yellow (#FACC15) | Baby blue (#93C5FD)."

**Verdict: ✅ Fully incorporated.**

---

## 17.10 — Fan Hopeful fan morale effects and playerMorale section

**Feedback:** Add Fan Hopeful to fan morale effects. Need a playerMorale section.

**Spec says:** Fan Hopeful is NOT in the §17.10 `DESIGNATION_HAPPINESS` table (lines 2375-2383). However, §17.14 line 2494: "Fan Hopeful designation | +5 | Excitement of being highlighted" covers the playerMorale effect. §17.7 line 2340: "no mechanical effects on stats" for Fan Hopeful.

**Verdict: ⚠️ Partially.** Fan Hopeful has playerMorale effects in §17.14 but is NOT added to the fan morale effects table at §17.10. JK asked for it to be added there.

---

## 17.13 — Do we need to add Fan Hopeful to designation data?

**Feedback:** Do we need Fan Hopeful here? Or no since it's fixed for entire season?

**Spec says (§17.13, lines 2419-2454):** `PlayerDesignationStatus` and `TeamDesignationState` do NOT include Fan Hopeful fields. No `projectedFanHopeful` or `fanHopeful` field.

**Verdict: ⚠️ Not present.** JK was asking whether it should be added. Since Fan Hopeful is fixed at season start (not performance-based), it may not need to be in the designation status interface. But it's not tracked in the data schema either. Should at minimum be on TeamDesignationState.

---

## 18.2 — Other single-game milestones? Walk-off hit?

**Feedback:** Do we need other single-game milestones? Any walk-off hit should count for something.

**Spec says (§18.2, line 2564):** "Walk-Off Grand Slam | +3.0" is listed. Regular walk-off hits are not explicitly in the single-game milestones table. However, §20.3 line 2771 says "Walk-off ±3 (ALWAYS major event for fanMorale)."

**Verdict: ❌ NOT fully incorporated.** Walk-off grand slam is there, but generic walk-off hit (single, double, homer) is not in the milestones table. JK said "any old walk-off hit should account for something." Fan morale captures it, but the milestone/fame system does not.

---

## 18.3 — Club scaling is backwards; needs to scale DOWN from MLB

**Feedback:** The scaling is working backwards (25-25 scales up to 32-32 instead of scaling down). Same for 30-30 and 40-40.

**Spec says (§18.3, lines 2591-2598):** The table now shows MLB thresholds being scaled DOWN: "30 HR + 30 SB" (MLB) → "16 HR + 16 SB" (KBL 128g/6inn). The scaling direction appears correct now.

**Verdict: ✅ Fixed.** Scaling now goes from MLB baseline down to KBL equivalent.

---

## 18.4 — Career milestones for hits, doubles, triples, HRs, RBIs, SBs, runs, Ks, wins, saves; negative career milestones

**Feedback:** Need career milestones for all major counting stats. Also need negative milestones tied to fameBoner.

**Spec says (§18.4, lines 2612-2629):** Career HR fixed floors shown. Career WAR thresholds shown. Awards (no scaling). But specific career milestone tiers for hits, doubles, triples, RBIs, SBs, runs, Ks, wins, saves are NOT enumerated — only HR and WAR floors are explicitly listed.

**Verdict: ❌ NOT fully incorporated.** Only career HR and career WAR milestones are explicitly detailed. JK asked for career milestones across all major stats AND negative career milestones. These are missing.

---

## 18.5 — Franchise Leaders activation timing; inflation concerns; pitcher small sample size

**Feedback:** When does Franchise Leaders activate? Game one will inflate fame. Trigger at 4-game mark. What about pitchers with small samples?

**Spec says (§18.5, lines 2633-2640):** "Franchise Leaders: Activate at game 4 of the season." MinimumPA: 25, MinimumIP: 20.

**Verdict: ✅ Fully incorporated.** Game 4 activation + minimum PA/IP thresholds address the inflation and small sample concerns.

---

## 18.7 — Insert playerMorale wherever fanMorale is included

**Feedback:** This is another natural spot to insert playerMorale. Give me ideas.

**Spec says (§18.7, line 2663):** "Trade aftermath affects both fanMorale (§20) and playerMorale (§17.14)." Trade-specific morale effects are documented. General team milestone → playerMorale linkage isn't explicitly in §18.7 beyond trade aftermath.

**Verdict: ⚠️ Partially incorporated.** Trade aftermath covers both morale types. But the broader ask was "anywhere fanMorale is included as a default, consider including playerMorale." Not all fan morale triggers in §18.7 have corresponding playerMorale effects documented.

---

## 18.8 — How are milestones noticed/tracked as they happen?

**Feedback:** Is AchievedMilestone what triggers the engine to look for milestones? How are we sure milestones will be noticed?

**Spec says (§3.2, line 572):** "Fire event hooks (async, non-blocking): Milestone detection, clutch attribution, narrative triggers, fame check." §2.1 line 238: `milestoneTriggered?: AchievedMilestone[]` on every AtBatEvent.

**Verdict: ✅ Addressed.** Milestone detection fires as an async hook on every at-bat event. When triggered, AchievedMilestone is attached to the event.

---

## 19.1 — fanMorale boost when Albatross is traded away

**Feedback:** fanMorale should receive a boost when Albatross is traded away. Inverse of trading Fan Favorite.

**Spec says:** §19.1 (line 2706-2723) covers Albatross trade discount mechanics but does NOT explicitly state a fan morale boost when Albatross is traded. §18.7 line 2663 mentions playerMorale improvement (+2) when Albatross is traded. §17.14 line 2497: "Albatross traded away | +2."

**Verdict: ⚠️ Partially.** Player morale boost is documented. Fan morale boost for trading away an Albatross is NOT explicitly documented in §19 or §20. Only player morale is addressed.

---

## 20.1 — Will win expectation recalculate live after trades?

**Feedback:** Will trading a star player recalculate win expectations based on new team salary? This is important because trading a star hurts fanMorale but could lower expectations and make it easier to meet them.

**Spec says (§26.1, lines 3323-3324):** TransactionEvent → "Expected Wins recalculation." §20.5 line 2787: Trade scrutiny tracking.

**Verdict: ✅ Addressed.** Expected wins explicitly recalculate on transactions per §26.1 data flow. The mechanism for lowered expectations benefiting future morale is implicitly supported by the performance gap calculation in §20.1.

---

## 20.3 — Limit which milestones influence fanMorale

**Feedback:** Having every player milestone influence fanMorale will be too much. Better limit to certain ones, both positive and negative.

**Spec says (§20.3, line 2775):** "Player milestone +4" — appears to be a single category. No granularity about which milestones trigger fan morale.

**Verdict: ❌ NOT incorporated.** The spec doesn't distinguish between milestone types for fan morale purposes. JK specifically said to limit which milestones affect fan morale. A selection/filtering mechanism is needed.

---

## 20.5 — How does 14-game trade scrutiny work logically? Scale by season games.

**Feedback:** How would the 14-game tracking period be logically applied? Needs to be scaled by season games.

**Spec says (§20.5, line 2787):** "14-game tracking period (scaled by gameFactor)."

**Verdict: ✅ Scaling addressed.** The period scales by gameFactor. The specific tracking logic is summarized (verdict evolution) but detailed mechanics aren't fully specified.

---

## 20.9 — MoraleEventType changes; is it separate from three key events?

**Feedback:** Do we need to change some MoraleEventType based on notes above? Is this separate from the three key events or attached as a modifier?

**Spec says (§20.9, lines 2838-2847):** MoraleEventType is its own type with ~24 event types. It's separate from the three core event streams (AtBatEvent, TransactionEvent, OffseasonEvent) — it's a derived/consuming type.

**Verdict: ⚠️ Present but relationship not explicit.** The types exist but whether they're standalone events or modifiers on existing events isn't clearly documented. They appear to be entries in the `eventHistory` array on TeamFanMorale, making them derivative records rather than core events.

---

## 21.2 — Tiebreaker: run differential, then user decides

**Feedback:** Change to: (1) Run differential, (2) User decides via prompt.

**Spec says (§21.2, line 2892):** "Tiebreaker: Run differential. If teams are still tied after run differential, the user is prompted to decide the outcome."

**Verdict: ✅ Fully incorporated.**

---

## 21.3 — Should reflect Mode 1 custom rules setup wizard changes

**Feedback:** Should reflect changes in Mode 1 to custom rules setup wizard.

**Spec says (§21.3, line 2896):** "Playoff structure... is fully configurable in Mode 1's rules preset (see MODE_1 §9.2)."

**Verdict: ✅ Cross-references Mode 1.**

---

## 22.1/22.2 — See changes to Mode 1 regarding schedule entry

**Feedback:** Align with Mode 1.

**Spec says (§22.1, lines 2924-2926):** "Per C-079: Schedule is user-provided and editable. Users create the schedule during franchise setup via CSV upload, Screenshot/OCR extraction, or manual game-by-game entry (see MODE_1 §10)."

**Verdict: ✅ Aligned with Mode 1 reference.**

---

## 22.3 — Remove simulate button for v1; only "Score Game" and "Skip Game"

**Feedback:** Remove simulate button for v1. Should only have "Score Game" and "Skip Game."

**Spec says (§22.3, lines 2958-2962):** SIMULATE button is STILL PRESENT, scoped to AI games. Also, "Skip Game" is NOT mentioned anywhere in this section.

**Verdict: ❌ NOT incorporated.** The spec still has the SIMULATE button. JK said to remove it for v1 and only have "Score Game" and "Skip Game." Neither change was made.

---

## 22.4 — Remove section

**Feedback:** Remove section 22.4.

**Spec says (§22.4, lines 2964-2971):** Season Classification section is STILL PRESENT.

**Verdict: ❌ NOT incorporated.** Section 22.4 (Season Classification) was not removed.

---

## 23.4 — Does 3.1 PA/game scale for inningsPerGame?

**Feedback:** Does the 3.1 × gamesPerTeam calculation make sense? Shouldn't it scale for inningsPerGame?

**Spec says (§23.4, lines 3071-3074):** `getQualifyingPA` now includes `* (config.inningsPerGame / 9)` — it DOES scale for inningsPerGame.

**Verdict: ✅ Fully incorporated.**

---

## 23.5 — Ensure milestone floor logic applies to all season/career milestones

**Feedback:** Looks like this clears it up, but ensure logic applies to all milestones.

**Spec says (§23.5, lines 3083-3091):** Universal minimum floors defined including `universalFloor: 10` and `clubMinimum: 10`.

**Verdict: ✅ Floor logic present.** Whether it's applied comprehensively across ALL milestones is an implementation verification concern.

---

## 24.1 — See Spine changes for hit direction, HR distance, fence height in park factors

**Feedback:** See changes in Spine for additions to park factor structure.

**Spec says (§24.1, lines 3118-3136):** ParkFactors interface includes `directionFactors: Record<Direction, number>`. §24.4 mentions wall height and avg distance for seed factors. §24.5 covers spray chart system with 7 zones. §2.1 line 229: dimensions include `avgDistance`, `wallHeight`, `foulTerritory`.

**Verdict: ✅ Incorporated.** Direction factors, HR distance, and fence height are all in the park factor structure.

---

## 24.6 — Integrate stadium records from Stadium_Analytics_Spec into narrative system

**Feedback:** Ensure record-breaking events integrate into narrative system.

**Spec says (§24.6, lines 3181-3183):** "Track single-game records... HR distance records by zone, career records at each stadium, and team records. Record-breaking events feed into the narrative system."

**Verdict: ✅ Fully incorporated.**

---

## Section 25 — Defer entire section to v2; no simulated games in v1

**Feedback:** Defer this whole section to v2. No simulated games in v1. Track what we've removed for future deferral.

**Spec says (§25, line 3190):** "V2 DEFERRAL: The full AI Game Engine... is deferred to V2."

**Verdict: ⚠️ Partially.** The section is marked as V2 deferred, but it's still a full 85+ line section in the spec. Additionally, §22.3 still references the SIMULATE button and AI Game Engine as if they're active. The deferral isn't clean — §22.3 should be updated to remove SIMULATE (per JK's §22.3 feedback above). The V2/Deferred table at §27 does list it.

---

## 26.1 — Add playerMorale as a Parallel Consumer

**Feedback:** Need to add playerMorale as a Parallel Consumer in the data flow.

**Spec says (§26.1, lines 3312-3319):** Parallel consumers list: Standings, Milestones, Designations, Fan Morale, Narrative, Mojo/Fitness, Modifier Registry. **playerMorale is NOT listed.**

**Verdict: ❌ NOT incorporated.** playerMorale is missing from the parallel consumers list in the franchise data flow diagram.

---

## SUMMARY

### ✅ Fully Incorporated (33 items)
- 3.7 (Fenway board layout)
- 7.1 (Position swap as single event)
- 8.3 (WPA/clutch simplification)
- 8.3 (per9 scaling)
- 8.3 (fielding % denominator)
- 8.3 (web gems as total)
- 8.3 (achievements list)
- 9.7 (pitcher achievements)
- 10.4 (web gems engine-derived / +fielding enrichment)
- 11.2 (clutch separate from WAR)
- 11.3 (fWAR with context + difficulty)
- 11.5 (context window closes at half-inning)
- 13.8 (WPA-based clutch + net rating)
- 14.11 (engine tracks mojo/fitness states)
- 16.1 (name generation for managers/scouts)
- 16.9 (narrative surfaces + playerMorale link)
- 17.3/17.4 (projected designations + True Value ref)
- 17.14 (playerMorale system + rating change suggestions)
- 18.2 (5-hit/6-hit fame values, mental errors, terrible outings)
- 18.2 (30/30, 40/40, 50/50 clubs; no 25/25; floor of 10)
- 18.3 (scaling direction fixed)
- 18.5 (minimumPA 25, minimumIP 20, game 4 activation)
- 18.8 (milestone detection via event hooks)
- 20.1 (win expectation recalculation)
- 21.2 (tiebreaker: run differential → user)
- 23.4 (PA qualification scales for innings)
- 24.1 (park factor structure expanded)
- 24.6 (stadium records → narrative)
- 6.2 (CI removed)
- 6.7 (OBP includes IBB)
- 17.5 (multiple Cornerstones)
- 17.7 (Fan Hopeful rename)
- 17.8 (Fan Hopeful badge colors)
- Various design clarifications (2.1 personality, FameLevel, parkContext, etc.)

### ⚠️ Partially Incorporated (15 items)
- 3.4 (appeals disclaimer instead of full removal)
- 20.1 (playerMorale effects not cross-referenced in §20.1)
- 2.1 (traits: string[] — field not present, may be resolved or stale)
- 2.2 (reason field on playerStateChange — linkedPlayId exists but auto-population unclear)
- 3.5 (runner override UX for disappeared icons)
- 4.3 (foul-out handling in spray charts; pitch count optional rule)
- 8.2 (hitOrder field name suggests order matters; should clarify)
- 14 (user-only paradigm stated but §14.7 and §15.4 have engine-initiated contradictions)
- 14.10 (getClutchMultiplier still present; may be redundant with WPA)
- 15.1 (types defined but wiring narrative not provided)
- 16.1 (reporter initial assignment timing not documented)
- 17.10 (Fan Hopeful not in fan morale effects table)
- 18.7 (playerMorale partially linked; not comprehensive alongside fanMorale)
- 19.1 (player morale for Albatross trade documented; fan morale boost NOT)
- 25 (marked V2 deferred but still referenced as active in §22.3)

### ❌ NOT Incorporated (12 items)
1. **7.1** — Defensive sub still says "between innings" only; should be "any time"
2. **8.3** — Web gems not in fielding stats (only in achievements)
3. **8.3** — Killed Pitchers / Nut Shots not tracked as batting stats
4. **8.4** — Career stats not accessible mid-season via Almanac
5. **9.8** — Pitch count estimation system NOT removed (JK said explicitly to remove it)
6. **10.6** — `cutoff` still in assist run values (JK said remove, keep relay only)
7. **11.1** — MLB replacement level (17.5) still present alongside SMB4 (12.0); should remove MLB version
8. **14.11** — `juicedCooldown` NOT removed from data schema
9. **15.4** — HOT_STREAK random event still triggers fitness change (contradicts user-only paradigm)
10. **18.2** — Walk-off hits (non-grand-slam) not in milestone/fame system
11. **18.4** — Career milestones missing for most counting stats + no negative career milestones
12. **20.3** — No filtering mechanism for which milestones affect fan morale
13. **22.3** — SIMULATE button not removed; "Skip Game" not added
14. **22.4** — Section not removed
15. **26.1** — playerMorale not listed as parallel consumer in data flow
