# GameTracker UX Interview Transcript
**Started:** 2026-03-13
**Status:** IN PROGRESS
**Question count:** 0
**Layers touched:** (none yet)
**Layers untouched:** 1,2,3,4,5,6,7,8,9,10,11

---

## LOCKED DECISIONS (will not re-ask)
- LOCK-1: 1-tap recording paradigm — outcome tap → auto-advance → optional enrichment. (gospel spec §1.2, §3.2)
- LOCK-2: Quick Bar primary buttons: K, GO, FO, LO, 1B, BB, 2B, HR, [···]. Overflow: PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, Balk. (gospel spec §3.1)
- LOCK-3: No drag-and-drop anywhere in GameTracker. Tap-to-select for all substitutions and lineup management. (scope lock, GAMETRACKER_DRAGDROP_SPEC.md superseded)
- LOCK-4: EnhancedInteractiveField.tsx is deleted. GameDiamond.tsx is the live field component. (CURRENT_STATE.md §I)
- LOCK-5: Enrichment types are fixed: spray/location, fielding sequence, HR distance, pitch type, pitch count per AB, pitch count per half-inning, modifiers. (gospel spec §4.3)
- LOCK-6: Contextual disabling rules are fixed: SAC/2 outs, SF/2 outs or no R3, DP/2 outs or no runners, TP/<2 runners, D3K/1B occupied and <2 outs. (gospel spec §6.8)
- LOCK-7: Event model (AtBatEvent, BetweenPlayEvent interfaces) is settled. UX spec does not redefine data contracts. (foundation axiom 2)
- LOCK-8: Runner advancement defaults and baseball rules are settled. (gospel spec §6)
- LOCK-9: Stats pipeline, WAR, leverage index, clutch attribution — all settled. (gospel spec §8-§13)
- LOCK-10: Undo stack depth is 10, no confirmation dialogs on standard plays. (gospel spec §3.3)
- LOCK-11: Two entry points for substitutions: lineup card + diamond tap. (gospel spec §7.2, C-002)
- LOCK-12: Runner/fielder/enrichment/post-game UX cluster is deferred to this redesign — Scope Lock Ruling #8. Tactical fixes paused until design decisions are made here.
- LOCK-13: FullFenwayScoreboard.tsx + FenwayBoard.tsx coexist as separate components. (CURRENT_STATE.md §4)
- LOCK-14: iPad landscape in Safari is the primary platform. (gospel spec §3.7)
- LOCK-15: 5-zone layout concept exists: Fenway Board (top-left), Diamond (center), Play Log (right), Quick Bar (bottom-left), Modifier/Action (bottom-right). (gospel spec §3.7)

---

## INTERVIEW ENTRIES

(entries will be appended below as the interview proceeds)

### Q1 — Layer 1: Primary hand and grip
**Question:** When you're on the couch with the iPad in landscape, which hand is doing most of the tapping on the GameTracker — left thumb, right thumb, or index finger of either hand? And is the iPad typically in your lap propped against something, or flat on the cushion next to you?
**JK's initial answer:** "right middle finger; flat on the cushion next to you"
**Clarity/Challenge:** NONE
**JK's final answer:** Right middle finger is the primary tap finger. iPad is flat on the couch cushion beside him, landscape orientation.
**Confidence:** FIRM
**Status:** DECIDED

### Q2 — Layer 1: Reach and resting position
**Question:** With the iPad flat on the cushion to your right, where does your right hand naturally rest — hovering over the center of the screen, resting on the edge/bezel, or does your hand come from above each time you need to tap (like it's on your lap between taps)?
**JK's initial answer:** "yep, comes from above each time like it's on your lap/at your right"
**Clarity/Challenge:** NONE
**JK's final answer:** Hand rests on lap/at his right side between taps. Comes from above to tap the screen each time — not hovering or resting on the bezel. Hand returns to lap between interactions.
**Confidence:** FIRM
**Status:** DECIDED

### Q3 — Layer 1: Pace pressure
**Question:** When a play happens in SMB4, how much time do you typically have before the next pitch? Are we talking 3-5 seconds between plays, or is it more like 8-15 seconds where you have breathing room? And does it vary — like routine outs are fast but hits with runners moving give you more time?
**JK's initial answer:** "it's all the same because the user can pause the game; also, to be clear, we are not entering info between pitches in v1, we're only entering input data after the atbat finishes"
**Clarity/Challenge:** NONE
**JK's final answer:** Pace pressure is user-controlled — user pauses SMB4 after the at-bat finishes, records the outcome, then unpauses. V1 does NOT require input between pitches within an at-bat. Input happens after the at-bat concludes. The user controls the pace entirely via pause.
**Confidence:** FIRM
**Status:** DECIDED

### Q4 — Layer 1: Eyes and attention during recording
**Question:** When you pause SMB4 and go to record the at-bat, are you looking fully at the iPad with your full attention — or are you still glancing at the TV while tapping? In other words, do you have the iPad's full visual real estate to work with, or does the UI still need to be legible at a glance?
**JK's initial answer:** "full real-estate"
**Clarity/Challenge:** NONE
**JK's final answer:** When recording, JK gives the iPad his full visual attention. Full screen real estate is available — UI does not need to be designed for glance-and-tap. User pauses SMB4, looks at iPad fully, records, then returns to TV.
**Confidence:** FIRM
**Status:** DECIDED

### Q5 — Layer 2: 5-zone layout redesign
**Question:** The gospel spec §3.7 defines five zones: Fenway Board (top-left), Diamond (center), Play Log (right column), Quick Bar (bottom-left), Modifier/Action (bottom-right). Now that we know you have full attention and no time pressure from the game itself — does this zone layout still feel right to you, or would you reorganize it? Specifically: is the Quick Bar in the right place at the bottom-left, or should the primary tap target be somewhere else given that your hand comes from the right side?
**JK's initial answer:** "it should be redesigned in some form:

Scoreboard should be thoughtfully redesigned; possibly an expanded version that looks like a 90s video-game retro version of the actual scoreboard with the home team's stadium name atop

There could be a minimize function that minimizes the scoreboard if user clicks anywhere on scoreboard; still shows teams, score, outs, inning

quickbar and play-log are non-negotiables; so is the pitcher/batter names, stats, and matchup history, upcoming milestones if on the verge in the form of beat reporter notes, as well as any interesting info on any players on field

to discuss:

can we leverage touch-based buttons that show field zones in vertical next to lineup for batting team and fielding 'lineup' for pitching/fielding team? We then click any player and it pulls up their player card, also options to sub out or swap positions with another player in the game? For pitcher, it would show same

So a scoreboard atop, with four columns below and quickbar below the four columns and extending across bottom of horizontal layout

Four columns (from left to right):
-pitcher/batter matchup, historical data/rivalry, beat reporter notes (let's call this the newsboard)
-Batting team's current lineup
-Fielders/Pitcher current defensive lineup
-expandable/scrollable Play Log with most recent play at top

In this way, lineups (offense and defense) are embedded; can we have clickable functionality, where if a player in the current lineup is clicked, the player card pops up (with mojo/fitness state, stats, attributes) where user can also hit button to 'sub out' or 'swap position'; if user selects the sub out option, a new window pops up with all bench players (both position and pitchers) available to sub in; if user selects 'swap position' then only the players currently in the game are clickable, which would swap positions for those two players.

For play log, when user clicks a play from the play log, user can then add enhancements, but this will require far more space than the lineups combined will, so we'll need the newsboard to take up about a fifth of the horizontal space, the lineups a fifth each, and the play-log/enrichment window two-fifths.

How does all of this sound so far?"

Attached reference image: Fenway Park Green Monster scoreboard — retro aesthetic reference for scoreboard design.

**Clarity/Challenge:** (pending — multi-part response needed, will log resolution separately)
**JK's final answer:** (pending — see follow-up entries)
**Confidence:** LEANING (JK asked "how does all of this sound so far?" — seeking design partner input)
**Status:** OPEN — requires decomposition and challenge/clarity on several sub-decisions

### Q5a — Layer 2: Base state without diamond (follow-up to Q5)
**Question:** (Agent pushback) You're removing the diamond entirely. The diamond serves two functions: visual display of who's on base, and tap targets for runner actions. Where does the user see base state? Where does the user initiate runner actions?
**JK's initial answer:** "for who's on base, we'll have to have an outline of the runner's spot in the lineup with an exponent of what base they occupy; this will be a visual cue and allow for the user to tap on the runner in the lineup, which will know he's on base and add more options when the player card pops up, which will offer all of the 'BetweenPlayEvents' like SB, CS, Pickoff, TOOTBLAN, advance, etc per spec.

I like the idea of embedding a compact base-state indicator in the top-right of the screen in the scoreboard strip, similar to what you see in score bugs during baseball broadcasts on tv"
**Clarity/Challenge:** CHALLENGE (agent raised diamond removal concern)
**Agent pushback:** Diamond removal loses base state visibility and runner action tap targets. Proposed alternative: compact base indicator + runner actions triggered from batting lineup column.
**JK's resolution:** Accepted both mechanisms — (1) runners in batting lineup get visual outline + base exponent superscript, tapping them opens player card with BetweenPlayEvent actions; (2) compact base-state indicator embedded in scoreboard strip top-right, TV broadcast score-bug style.
**JK's final answer:** Two-mechanism base state: lineup-embedded runner highlighting with base exponent + scoreboard-embedded compact base indicator (TV score bug style). Runner actions initiate from tapping the highlighted runner in the batting lineup column → player card → BetweenPlayEvent options (SB, CS, Pickoff, TOOTBLAN, advance, etc).
**Confidence:** FIRM
**Status:** DECIDED

### Q6 — Layer 2: Column proportions and enrichment expansion
**Question:** You said the four columns should be roughly: Newsboard 1/5, Batting Lineup 1/5, Defensive Lineup 1/5, Play Log 2/5. But you also said when the user taps a play from the play log to enrich it, enrichment needs "far more space than the lineups combined." What happens to the other columns when enrichment opens — does the enrichment panel expand over/replace the lineup columns, does it push them off screen, or does it take over the full width below the scoreboard?
**JK's initial answer:** "on second thought, 2/5 of the screen should be enough, but the play-log entry that user selects would have to push down any plays below it in order to allow for enough space to expand the options for enrichment data entry

So we would need the enrichment fields within a play-log to expand north-south but not east-west"
**Clarity/Challenge:** NONE — JK self-corrected from prior answer. Enrichment no longer needs extra horizontal space.
**JK's final answer:** Play log stays at 2/5 width permanently. No column resizing on enrichment. When user taps a play log entry, the enrichment fields expand vertically (north-south) within the play log column, pushing subsequent plays downward. Enrichment is inline within the play log, not a separate panel. No east-west expansion.
**Confidence:** FIRM
**Status:** DECIDED

### Q7 — Layer 2: Outs indicator and count
**Question:** You've got the TV score bug in the scoreboard strip for base state. Where do outs live — also in the score bug (like broadcast does it with dots), somewhere in the scoreboard, or somewhere else? And the current batter's count (balls/strikes) — does V1 track pitch-by-pitch count, or is that not in scope?
**JK's initial answer:** "outs live under the inning indicator in the minimized score bug, with respective scores and teams on either side of the inning indicator, base-state indicator on the right of the home team"
**Clarity/Challenge:** CLARITY — JK did not address balls/strikes count question. Will ask separately.
**JK's final answer:** Minimized score bug layout: away team + score on left, inning indicator in center, home team + score on right, outs indicator directly under the inning indicator, base-state diamond to the right of the home team. Broadcast score-bug style.
**Confidence:** FIRM
**Status:** DECIDED (outs placement decided; balls/strikes count deferred to next question)

### Q8 — Layer 2: Balls/strikes count and score bug layout
**Question:** Does V1 track the pitch-by-pitch ball/strike count during an at-bat, or is the count not tracked until after the at-bat ends (via the "pitch count per AB" enrichment field)? This determines whether the score bug needs a count display or not.
**JK's initial answer:** "first, let's keep the score bug information all on one line so we can save vertical space; so base-state on the right and outs bubbles to right of that

v1 DOES NOT track pitch-by-pitch but offers the option for the user to enrich the at-bat data with the total pitches in an at-bat after the at-bat ends; so, no, the score does not need to show count"
**Clarity/Challenge:** NONE — also contains a layout correction: score bug is single-line, not stacked.
**JK's final answer:** (1) Score bug is a single horizontal line to save vertical space. Layout: away team + score | inning indicator | home team + score | base-state indicator | outs bubbles. All on one line. (2) V1 does not track pitch-by-pitch count. Total pitches per at-bat is an optional post-at-bat enrichment field. No count display needed in score bug.
**Confidence:** FIRM
**Status:** DECIDED

### Q9 — Layer 2: Expanded scoreboard behavior
**Question:** You mentioned the scoreboard can expand (tap to minimize, presumably tap again to expand). When it's expanded — the retro Fenway-style scoreboard with stadium name, inning-by-inning linescore, R/H/E — how much vertical space are you imagining it takes? Roughly a quarter of the screen height? A third? And does the expanded scoreboard push the four columns down, or does it overlay on top of them?
**JK's initial answer:** "yes, a quarter of the screen height; expanded scoreboard pushes everything down and allows for scrollable screen; thoughts? is that going to cause problems? should the tracker not be scrollable other than the play-log?"
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Making the whole tracker scrollable means the Quick Bar — your highest-frequency tap target — could scroll off screen when the scoreboard is expanded. If you expand the scoreboard to check the linescore and then need to record a play, you'd have to scroll down to reach the Quick Bar first. That's a 2-step action (scroll + tap) for what should always be 1 tap. The Quick Bar and the minimized score bug should be pinned on screen at all times.

The risk is: every scoreboard expand/collapse becomes friction on the primary recording flow if it moves the Quick Bar.

Alternative to consider:
→ Expanded scoreboard overlays downward from the score bug line, covering the top portion of the four columns (newsboard/lineups/play log) but NOT pushing the Quick Bar. Quick Bar stays pinned at the bottom. The four columns are temporarily obscured but the user tapped the scoreboard deliberately — they're looking at the linescore, not recording a play. Tap anywhere outside (or tap the scoreboard again) to collapse back. The columns underneath never actually move.

Your call — scrollable page, pinned Quick Bar with overlay, or something else?
**JK's resolution:** (pending)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — waiting for JK's response to pushback

### Q9a — Layer 2: Expanded scoreboard resolution (follow-up to Q9)
**Question:** (Agent pushback) Scrollable page means Quick Bar could scroll off screen when scoreboard expands. Proposed alternative: expanded scoreboard overlays downward from score bug, covering top of columns, Quick Bar pinned at bottom, tap outside to collapse.
**JK's initial answer:** (see Q9)
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Scrollable tracker page means Quick Bar scrolls off screen when scoreboard expands. Recording a play would become scroll + tap instead of 1 tap. Proposed overlay instead — scoreboard expands over columns, Quick Bar stays pinned.
**JK's resolution:** "sounds good" — accepted overlay alternative.
**JK's final answer:** Expanded scoreboard overlays downward from the score bug line, covering the top portion of the four columns. Quick Bar stays pinned at the bottom of the viewport at all times. Tap anywhere outside the expanded scoreboard (or tap it again) to collapse. The page is NOT scrollable — only the play log column scrolls internally.
**Confidence:** FIRM
**Status:** DECIDED

### Q10 — Layer 3: Quick Bar positioning and button order
**Question:** The Quick Bar spans the full bottom width. Your tapping hand comes from the right side. The gospel spec had 9 buttons + overflow (K, GO, FO, LO, 1B, BB, 2B, HR, [···]). Should the buttons be evenly distributed across the full width, or clustered toward one side? And is the button order still what you want?
**JK's initial answer:** "yes, that's the right order; we also need to account for an 'undo' button and a 'end game' button somewhere; should those be at the top? Would it make sense to have the quickbar at the top and the scorebug at the bottom, with the undo and end game buttons smaller and off to the bottom right? Of course, we'd need an 'Are you sure?' prompt if user accidentally hits end game."
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Flipping the Quick Bar to the top and score bug to the bottom inverts the layout we just built. The four columns sit between score bug and Quick Bar. If Quick Bar is at top and score bug at bottom, the columns are sandwiched the same way — but the expanded scoreboard overlay behavior changes. Right now the scoreboard expands downward from the top and the Quick Bar is safe at the bottom. If you flip them, the scoreboard expands upward from the bottom and the Quick Bar is at the top — the overlay now covers the columns from below, which is more disorienting (content disappearing upward is less natural than content being covered from above).

More importantly: there's no strong ergonomic reason to flip. Your hand comes from above/right regardless — the Quick Bar is equally reachable at top or bottom. And "are you sure?" on End Game conflicts with LOCK-10 (no confirmation dialogs on standard plays) — but End Game is explicitly NOT a standard play, so a confirmation dialog here is actually correct. The gospel spec §3.3 already says "NOT undoable: Game end (requires confirmation)."

My recommendation: keep Quick Bar at bottom, score bug at top. Put Undo and End Game as smaller buttons at the far right end of the Quick Bar row (or just above it in a utility strip). End Game gets a confirmation prompt. This keeps the layout stable and puts utility actions near but visually separated from outcome buttons.

Your call — flip the layout, keep it as-is with utility buttons in the Quick Bar row, or something else?
**JK's resolution:** (pending)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — waiting for JK's response to pushback

### Q10a — Layer 3: Quick Bar position and utility buttons resolution (follow-up to Q10)
**Question:** (Agent pushback) Flipping Quick Bar to top and score bug to bottom inverts the layout and breaks the scoreboard overlay behavior from Q9a. Proposed alternative: keep Quick Bar at bottom, score bug at top, add utility strip near Quick Bar with smaller Undo and End Game buttons.
**JK's initial answer:** (see Q10)
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Flipping layout breaks scoreboard overlay (Q9a). No ergonomic reason to flip. Proposed: keep layout as-is, add utility strip near Quick Bar for Undo and End Game.
**JK's resolution:** "utility button near the quick bar seems best" — accepted alternative, keeping current layout.
**JK's final answer:** Quick Bar stays pinned at bottom. Score bug stays pinned at top. Button order confirmed: K, GO, FO, LO, 1B, BB, 2B, HR, [···] left to right. Undo and End Game are smaller utility buttons near the Quick Bar (exact placement TBD — near/above/beside). End Game gets "Are you sure?" confirmation prompt. Layout is NOT flipped.
**Confidence:** FIRM
**Status:** DECIDED (utility button exact placement to be refined in later question)

### Q11 — Layer 3: Undo and End Game exact placement
**Question:** Two options for utility buttons: (a) Far right of the Quick Bar row after [···] with a visual divider, or (b) thin utility strip above the Quick Bar. Which feels right?
**JK's initial answer:** "A"
**Clarity/Challenge:** NONE
**JK's final answer:** Undo and End Game buttons go at the far right end of the Quick Bar row, after the [···] overflow button, with a small visual gap/divider separating them from outcome buttons. Full row reads: [K] [GO] [FO] [LO] [1B] [BB] [2B] [HR] [···] | [↩ Undo] [End Game]. Utility buttons are smaller than outcome buttons to visually distinguish them.
**Confidence:** FIRM
**Status:** DECIDED

### Q12 — Layer 3: Quick Bar visual feedback on tap
**Question:** When you tap an outcome button — say [1B] — what should happen visually to confirm the tap registered? Options: (a) button flashes highlight briefly then result shows in columns, (b) button stays depressed/highlighted until event fully processed then releases, (c) whole Quick Bar flashes result text large. Or something else?
**JK's initial answer:** "B"
**Clarity/Challenge:** NONE
**JK's final answer:** Button stays depressed/highlighted until the event is fully processed (event saved, runners advanced, play log updated, lineup advanced), then releases. Visual hold confirms tap landed and processing completed before button returns to normal state.
**Confidence:** FIRM
**Status:** DECIDED

### Q13 — Layer 3: Overflow menu behavior
**Question:** The [···] overflow button contains 13 secondary outcomes. When you tap [···], how should those options appear? Options: (a) grid/panel pops up above Quick Bar showing all 13 at once, tap one to record, tap outside to dismiss; (b) overflow replaces primary Quick Bar inline with back arrow; (c) scrollable horizontal row slides in.
**JK's initial answer:** "A"
**Clarity/Challenge:** NONE
**JK's final answer:** Overflow menu appears as a grid/panel that pops up above the Quick Bar, showing all 13 secondary outcome buttons at once. Tap an outcome to record it (dismisses the panel). Tap outside the panel to dismiss without recording. Panel does not replace or displace the Quick Bar — it floats above it.
**Confidence:** FIRM
**Status:** DECIDED

### Q14 — Layer 4: Batting lineup column — current batter and runner display
**Question:** The batting lineup column shows the 9-batter order. How should the current batter be distinguished from the rest of the lineup? And should the lineup auto-scroll to keep the current batter visible, or is 9 batters short enough to always show all of them?
**JK's initial answer:** "9 batters is short enough to show all of them in a static space; there should be an outline around the batter in the team's primary color for the current batter and any runners on base should be bolded with an exponent of the base they're on"
**Clarity/Challenge:** NONE
**JK's final answer:** All 9 batters are always visible — no scrolling needed. Current batter gets an outline/border in the team's primary color. Runners on base are bolded with a superscript exponent indicating their base (e.g., "3. Hayata²" means Hayata is on 2nd base). Static layout, no auto-scroll.
**Confidence:** FIRM
**Status:** DECIDED

### Q15 — Layer 4: Defensive lineup column content and both-column ordering
**Question:** The defensive lineup column shows the fielding/pitching team. What information should be visible per player? Should each row show position + name, position + name + a key stat? Is the pitcher at the top with special treatment?
**JK's initial answer:** "Both teams should be ordered in batting order, showing player name, current position, and jersey number; we've discussed the specifics of the team currently at-bat, but the team currently in the field should have an outline around their current pitcher in the team's primary color, and each fielder should show their current fWAR. The player who will bat first next inning should have a dotted outline in the team's secondary color."
**Clarity/Challenge:** NONE
**JK's final answer:** Both lineup columns (batting and fielding) are ordered by batting order (1-9), not by defensive position. Each player row shows: player name, current defensive position, jersey number. Team at bat: current batter gets solid outline in team's primary color, runners bolded with base superscript (per Q14). Team in field: current pitcher gets solid outline in team's primary color, each fielder shows their current fWAR. For both teams: the player who will lead off next inning gets a dotted outline in the team's secondary color.
**Confidence:** FIRM
**Status:** DECIDED

### Q15a — Layer 4: Lineup display details and typography (follow-up to Q15)
**Question:** (JK volunteered additional detail unprompted)
**JK's initial answer:** "also, pitcher should show pitch count and pWAR

this should all be thoughtfully displayed in 'Press Start 2P' font with position and name on top row with jersey number (ie #37) and additional stats in the row below"
**Clarity/Challenge:** NONE
**JK's final answer:** Pitcher row additionally shows pitch count and pWAR (alongside the solid team-color outline from Q15). All lineup entries use "Press Start 2P" font (retro pixel/arcade font — matches the 90s retro scoreboard aesthetic from Q5). Each player entry is two rows: top row = position + name + jersey number (e.g., "SS Hayata #37"), bottom row = relevant stats (fWAR for fielders, pitch count + pWAR for pitcher, base superscript for runners on the batting side).
**Confidence:** FIRM
**Status:** DECIDED

### Q16 — Layer 10: Visual identity confirmation — "Scoreboard Chalk Retro"
**Question:** (JK volunteered — provided screenshot of existing KBL Tracker theme)
**JK's initial answer:** "btw we've been calling the design theme 'Scoreboard Chalk Retro' and it's shown in the attached screenshot"
**Clarity/Challenge:** NONE — agent confirmed visual processing of screenshot
**JK's final answer:** The established design theme is "Scoreboard Chalk Retro." Key characteristics confirmed from screenshot: Press Start 2P font throughout, muted olive/sage green background (aged chalkboard), lighter green panels for content sections, white/cream text (chalk-on-board), team colors for accents only, flat with no shadows, generous spacing. The GameTracker must match this existing theme — it is not a new design language, it's the existing one carried into the GameTracker.
**Confidence:** FIRM
**Status:** DECIDED

### Q17 — Layer 4: Player card popup content
**Question:** What stats and attributes should the player card show when tapped? Compact (5-6 key stats) or detailed (full stat line)? What's useful mid-game when deciding whether to pinch hit, sub, or leave someone in?
**JK's initial answer:** "compact card with 5-6 key traditional stats but full attributes that come from their player ID (name, primary/secondary positions, age, gender, ratings, traits, player morale, fitness, mojo)"
**Clarity/Challenge:** CLARITY — need to nail down which 5-6 traditional stats, and clarify "ratings" scope.
**Agent probe:** (will ask in next question)
**JK's final answer:** Player card is compact on stats (5-6 key traditional stats, specific stats TBD) but shows full player identity attributes from League Builder: name, primary/secondary positions, age, gender, ratings, traits, player morale, fitness, mojo. Plus sub/swap action buttons per Q5.
**Confidence:** FIRM on structure (compact stats + full attributes + actions). OPEN on which specific 5-6 stats.
**Status:** DECIDED on card structure. Specific stats to be clarified next.

### Q18 — Layer 4: Player card — which 5-6 stats
**Question:** For position players, the obvious candidates for compact mid-game stats are: AVG, HR, RBI, OPS, WAR, SB. For pitchers: ERA, W-L, K, WHIP, IP, pWAR. Are those the right ones? And are these season stats, current-game stats, or both?
**JK's initial answer:** "yep, good"
**Clarity/Challenge:** CLARITY — JK confirmed the stat selections but did not address season vs current-game. Will ask separately.
**JK's final answer:** Player card stats confirmed. Position players: AVG, HR, RBI, OPS, WAR, SB. Pitchers: ERA, W-L, K, WHIP, IP, pWAR. Season vs current-game scope TBD — deferred to next question.
**Confidence:** FIRM on stat selection
**Status:** DECIDED on which stats. Season vs game scope to be clarified.

### Q19 — Layer 4: Player card stats scope — season vs game
**Question:** The 5-6 stats on the player card — are these season stats, current game line, or both?
**JK's initial answer:** "this should be for the season (or in Elimination Mode for the current tournament); the first column with pitcher/batter data should show the batter's line for THIS game"
**Clarity/Challenge:** NONE
**JK's final answer:** Player card stats are season-scoped (or tournament-scoped in Elimination Mode). The Newsboard column (column 1 — pitcher/batter matchup) is the place that shows the current batter's game line for THIS game. So there's a clear separation: Newsboard = this game's context, Player card = season/tournament identity.
**Confidence:** FIRM
**Status:** DECIDED

### Q20 — Layer 6: Newsboard column content and behavior
**Question:** Let's detail the Newsboard (column 1, 1/5 width). What's the priority order if space gets tight vertically? Does the Newsboard content change dynamically as the current batter changes, or is it static for the whole half-inning?
**JK's initial answer:** "The newsboard is dynamic and changes with each batter/pitcher matchup; so if an at-bat ends and new batter comes up, the data refreshes; if the pitcher then gets taken out and there's a new pitcher/batter matchup, the data refreshes again; the user should see the current line for the batter and pitcher for the game, but also the historical matchup data between the batter and pitcher

the respective beat reporters for each team will give the user fun anecdotes and tid-bits for the batter or pitcher or the fielder who just made a great play or the runner who just stole a base or score; these beats should be both positive and negative insights, can be tied to milestones, streaks, fan impacts, player morale, etc. A lot will ultimately be coming in from the beat reporters throughout games when this is launched in Elimination and Franchise Modes.

The pitcher/batter stats and matchup data should always be at the top of the column; the beat reporters content should be sorted most recent at top and be scrollable down the window; is that possible without hurting UX?"
**Clarity/Challenge:** CHALLENGE (pending — agent needs to respond to "is that possible without hurting UX?" question)
**JK's final answer:** (pending — see follow-up)
**Confidence:** FIRM on structure, OPEN on scrolling feasibility
**Status:** OPEN — JK asked for agent input on scrollability

### Q20a — Layer 6: Newsboard matchup data format and scrollability (follow-up to Q20)
**Question:** (Agent asked whether matchup history should be capped at 5 at-bats to keep header compact)
**JK's initial answer:** "the matchup history shouldn't be a log of prior at-bats, it should be aggregated (ie 3 for 12; 1 HR, 2 doubles and 5 Ks; or 3 for 12 but 3 for his last 3 with a homer in his last AB)

It shouldn't get too long for the vertical space, it's stats after all, not narrative; the beat reporters can bring in the narrative elements"
**Clarity/Challenge:** CLARITY (agent proposed log of at-bats, JK corrected to aggregated stats)
**Agent probe:** Should matchup history be capped at last 5 at-bats with "see all"?
**JK's clarification:** Not a log of individual at-bats — aggregated summary stats. e.g., "3-for-12, 1 HR, 2 2B, 5 K" or "3-for-12 but 3-for-last-3 with HR in last AB." Compact by nature since it's stats not narrative.
**JK's final answer:** Newsboard column structure is: (1) Pinned header at top — batter's current game line, pitcher's current game line, aggregated matchup history (compact stat summary, not at-bat log). This stays compact naturally. (2) Below that — scrollable beat reporter feed, most recent at top. Beat reporters provide narrative (anecdotes, milestones, streaks, fan impacts, morale, positive and negative insights). Feed scrolls independently within the Newsboard column. Clear separation: stats in the header, narrative in the feed.
**Confidence:** FIRM
**Status:** DECIDED

### Q21 — Layer 7: Play log entry format and enrichment data capture
**Question:** What information should each play log entry show in its collapsed state? The gospel spec suggested inning, batter name, result, and enrichment badges.
**JK's initial answer:** JK provided a Codex-generated "UX Capture Contract" document enumerating every backend data point that needs a UX home. JK also mentioned wanting to leverage the defensive lineup column for fielding sequence entry during enrichment mode (tapping fielder positions in the lineup rather than abstract position numbers in the play log pane). JK asked agent to process the document and come back with questions to sort through the play log entry format.

Key concepts from the Codex document relevant to play log:
- Play log is the source of historical review — everything recorded appears here
- Play log supports: at-bats, runner events, substitution/pitching rows, context/modifier rows
- Tapping a play log entry opens a context-sensitive editor for that row type
- Pre-commit runner correction is a REQUIRED step between outcome selection and final commit (not optional)
- Seven interaction zones identified: live outcome pad, runner correction gate, field/base interaction, play log, event editor panel, lineup manager, context/modifier entry path
- Enrichment captured after commit: fielding sequence, field location, hit type, exit type, pitch type, pitch count, K/Kc, catch type, fielding play type, HR distance
- Context captured after commit: mojo, fitness, injury, manager moments

**Clarity/Challenge:** (pending — agent will decompose into focused follow-up questions)
**JK's final answer:** (pending — requires decomposition)
**Confidence:** (pending)
**Status:** OPEN — multiple sub-decisions needed

### Q22 — Layer 8: Pre-commit runner correction gate
**Question:** The Codex capture contract calls out a required pre-commit runner correction step between tapping outcome and event committing. The gospel spec (§3.5) treats runner correction as post-commit (auto-apply defaults, tap runner to override). Which model: (a) post-commit correction (gospel spec — 1 tap, corrections are versioned edits), or (b) pre-commit gate (Codex doc — confirm/adjust before commit, adds a tap to every play)?
**JK's initial answer:** "A"
**Clarity/Challenge:** NONE — decisive, aligns with gospel spec §3.5 and LOCK-1 (1-tap paradigm).
**JK's final answer:** Post-commit correction model. Tap outcome → event commits immediately with default runner advancement → user corrects runners after if needed via tapping runner in batting lineup (per Q5a). Corrections are versioned edits on committed events. No pre-commit gate. The 1-tap paradigm is preserved — ~80% of plays need zero correction taps.
**Confidence:** FIRM
**Status:** DECIDED

### Q23 — Layer 7: Play log collapsed entry format
**Question:** Each play log entry in collapsed state — proposed: inning indicator (T7/B7), batter name, result code, enrichment badges ([+fld], [+loc], [K?]). Between-play events as visually distinct rows. Does that match, or would you change anything?
**JK's initial answer:** "yes, that's exactly what i'm picturing; should probably add dynamic style to each player name (team's primary color as outline) to differentiate (or small letters of team name abbreviation)"
**Clarity/Challenge:** NONE
**JK's final answer:** Play log collapsed entry format confirmed: inning indicator (T7/B7), batter name, result code (1B/GO/K etc.), enrichment badges showing what's available to add. Player names get dynamic team-color styling (team's primary color as outline or small team abbreviation letters) to visually differentiate which team the play belongs to. Between-play events (SB, pitching changes, subs, etc.) also appear as rows but visually distinct from at-bat entries.
**Confidence:** FIRM
**Status:** DECIDED

### Q24 — Layer 5: Fielding sequence entry via defensive lineup column
**Question:** You mentioned leveraging the defensive lineup column for fielding sequence entry during enrichment. Walk me through: say Hayata hit GO, you tap it in the play log to enrich. You want to enter 6-4-3. Are you tapping "SS Lee" → "2B Park" → "1B Chen" in the defensive lineup column?
**JK's initial answer:** "yes, that's what i was thinking; i imagine the lineup can toggle into 'enrichment mode' where clicking on the players in the defensive lineup log them in the fielding/throw sequence and does not bring up a popover; is there a better way? we could pull in the lineup into the enrichment pane at a smaller scale for the user to select each player but that seems redundant and unnecessary."
**Clarity/Challenge:** CHALLENGE (pending — agent needs to evaluate the toggle-mode concept)
**JK's final answer:** (pending — see follow-up)
**Confidence:** LEANING
**Status:** OPEN — agent to respond with evaluation

### Q24a — Layer 5: Fielding sequence enrichment mode resolution (follow-up to Q24)
**Question:** (Agent pushback) Enrichment mode toggle on defensive lineup creates a modal state — tapping a fielder does different things depending on mode. If mode isn't visually obvious, user can't predict tap behavior. Proposed: unmistakable visual state change on the column (header changes to "FIELDING SEQUENCE" in accent color, tap-target treatment on fielder rows, sequence builds visually as tapped e.g. "6 → 4 → 3", Done/Clear buttons, column returns to normal when enrichment closed).
**JK's initial answer:** (see Q24)
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Modal state on defensive lineup column risks confusion between normal tap (player card) and enrichment tap (fielding sequence). Proposed: obvious visual state change — header swap, accent color, sequence assembly display, Done/Clear buttons.
**JK's resolution:** "yes, that matches my thinking" — accepted enrichment mode visual state change.
**JK's final answer:** Defensive lineup column toggles into enrichment mode when user taps a play log entry to enrich fielding sequence. In enrichment mode: column header changes to "FIELDING SEQUENCE" (or similar) in accent color, fielder rows get tap-target treatment, tapping a fielder adds them to the sequence (no player card popover), sequence builds visually as tapped (e.g. "6 → 4 → 3" displayed at top of column or in enrichment pane), Done/Clear buttons appear to exit mode. Column returns to normal when enrichment is closed (Done, tap outside, or collapse play log entry). Normal mode tapping (player card) is suppressed during enrichment mode.
**Confidence:** FIRM
**Status:** DECIDED

### Q25 — Layer 5: Play log enrichment — which fields appear inline
**Question:** When you tap a play log entry and it expands, what enrichment fields show up? The Codex capture contract lists ~9 post-commit enrichable fields. Not all apply to every play type. Should the expanded entry only show fields relevant to that specific result type, or all fields always visible?
**JK's initial answer:** "i think the engine should infer what enrichment options should show up based on one-tap button in the quickbar"
**Clarity/Challenge:** NONE — clean and aligns with the engine's existing knowledge of result types.
**JK's final answer:** Enrichment fields are context-sensitive based on the at-bat result type. The engine determines which enrichment options are relevant for the recorded outcome and only shows those. For example: GO shows fielding sequence trigger + field location + pitch type + pitch count. K shows K/Kc toggle + pitch type + pitch count. HR shows HR distance + pitch type + field location. BB shows only pitch count. No irrelevant fields clutter the expanded entry.
**Confidence:** FIRM
**Status:** DECIDED

### Q26 — Layer 5: Orphan check — catch type, exit type, field location
**Question:** Are catch type (diving, leaping, wall, robbed HR, etc.) and fielding play type selectors you want in V1? Is exit type an enrichable field or is the Quick Bar button the final word?
**JK's initial answer:** "button should not be enrichable; but we need to make sure the inference logic is correct. Catch should be included for GO's as well because a fielder can make a diving play on a ground ball; also, a line drive can hit off a pitcher, which is logged as a killed pitcher or a nut shot, but could end up as a GO if the pitcher or another fielder still gets the out at first; it could also be a single or potentially other outcomes.

so yes, we want catch types included; exit type should be inferred on outs but not on hits; catch types should default to 'Routine' with the option for the user to change it to something else, if appropriate"
**Clarity/Challenge:** CLARITY — need to unpack the exit type inference rules and catch type applicability.
**Agent probe:** (will confirm understanding below)
**JK's clarification:** (pending)
**JK's final answer:** Three decisions:
(1) Quick Bar button result is NOT enrichable — the outcome button is the final word on the result. You don't change a GO to a FO after the fact (use undo for that).
(2) Exit type is inferred from the result button on outs (GO = ground ball, FO = fly ball, LO = line drive, PO = popup) but NOT inferred on hits (a single could be a ground ball, line drive, or fly ball — exit type is unknown without enrichment on hits).
(3) Catch type IS included in V1. Applies to all outs where a fielder made a play — including GOs (diving play on grounder), FOs, LOs, POs. Defaults to "Routine" — user only changes it if something notable happened (diving, leaping, wall, robbed HR, etc.). Important edge case noted: line drives off pitcher (KP/NUT events) can still result in outs or hits depending on what happens next.
**Confidence:** FIRM
**Status:** DECIDED

### Q26a — Layer 5: Catch type and exit type inference rules (follow-up to Q26)
**Question:** (Agent proposed inference logic map) For outs: exit type inferred from button, catch type defaults to Routine. For hits: exit type NOT inferred, becomes enrichment field. Catch type doesn't apply to hits. For errors: no exit type inferred. Does that check out?
**JK's initial answer:** "catch type could apply to certain hit types on a missed leap or missed dive, so it needs to be an option

for errors, you're right, no exit type can be inferred"
**Clarity/Challenge:** CLARITY (agent's initial logic was wrong on catch type for hits)
**Agent probe:** Proposed catch type doesn't apply to hits.
**JK's clarification:** Catch type DOES apply to certain hits — a missed leap, missed dive, etc. It needs to be an option on hits too.
**JK's final answer:** Complete inference/enrichment rules:

OUTS (GO, FO, LO, PO):
- Exit type: INFERRED from button (GO→ground ball, FO→fly ball, LO→line drive, PO→popup). Not enrichable.
- Catch type: defaults to "Routine," enrichable to diving/leaping/charging/sliding/over-shoulder/wall/robbed HR/etc.
- Fielding sequence: enrichable via defensive lineup column (Q24a).

HITS (1B, 2B, 3B):
- Exit type: NOT inferred. Enrichable (could be ground ball, line drive, fly ball).
- Catch type: IS an option — covers missed leap, missed dive, etc. (attempt that didn't result in an out).
- Fielding sequence: enrichable for plays where fielders touched the ball.

HR:
- Exit type: inferred (fly ball). Not enrichable.
- Catch type: not applicable (unless robbed HR which would be an out not a HR).
- HR distance: enrichable.

ERRORS (E):
- Exit type: NOT inferred. Not enrichable either — play went wrong, classification ambiguous.
- Catch type: option available (missed dive, missed leap could cause the error).

BB, IBB, HBP, WP_K, PB_K:
- No exit type, no catch type, no fielding sequence.
- Only pitch type and pitch count enrichable.

All result types: pitch type and pitches-in-at-bat enrichable.
**Confidence:** FIRM
**Status:** DECIDED

### Q27 — Layer 5: Field location (spray chart) entry
**Question:** Diamond is removed from layout. How should field location be captured in the expanded play log enrichment? Options: (a) small inline spray chart graphic with tappable zones, (b) labeled zone buttons, (c) something else.
**JK's initial answer:** "not sure on this one; this is what i'm imagining though, you tell me whether this is optimal:

no need for a graphic, unless its easy to render; what we need is to account for Left-field line, left-field, left-center, center, right-center, right-field line; then warning track, deep, normal, shallow versions of each; then shallow, medium, deep infield versions of each; then foul-left, foul-right, foul-center (ie behind home plate).

I know that's a lot, which is why i'd rather not have a graphic if we can simplify with buttons; but if a graphic is feasible and more intuitive for the user, maybe that's best"
**Clarity/Challenge:** CHALLENGE (pending — agent needs to evaluate zone count and recommend graphic vs buttons)
**JK's final answer:** (pending)
**Confidence:** LEANING toward graphic if feasible
**Status:** OPEN — agent to respond with evaluation

### Q27a — Layer 5: Field location graphic resolution (follow-up to Q27)
**Question:** (Agent recommended graphic over buttons) 45 zones as buttons is unusable. SVG fan-shaped field diagram with tappable zones is more intuitive, faster, and saves space. Chalk-line aesthetic fits Scoreboard Chalk Retro theme.
**JK's initial answer:** (see Q27)
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** 45 zone buttons is unusable — too many labels to scan. A graphic is the only sane option. SVG fan-shaped field with tappable zones, color-coded by depth band, ~200×150pt inline. Spatial by nature — user's eyes find the zone instantly.
**JK's resolution:** "yep, let's go with the graphic as long as it won't be a fat-finger risk"
**JK's final answer:** Field location captured via inline SVG fan-shaped field graphic inside expanded play log entry. Zones per JK's spec: 6 horizontal directions (LF line, LF, LC, C, RC, RF line) × 4 outfield depths (warning track, deep, normal, shallow) + 6 directions × 3 infield depths (shallow, medium, deep) + 3 foul zones (foul-left, foul-right, foul-center/behind plate) = 45 total zones. Tappable regions, color-coded by depth band. Chalk-line aesthetic matching Scoreboard Chalk Retro theme. Fat-finger mitigation is a design requirement — zones must be large enough to tap accurately.
**Confidence:** FIRM (contingent on fat-finger-safe zone sizing)
**Status:** DECIDED — fat-finger sizing to be addressed in implementation/visual design

### Q27b — Layer 5: Home run zones for field location graphic (follow-up to Q27a)
**Question:** (JK raised) Don't we also need home run zones on the field location graphic?
**JK's initial answer:** "don't we also need seven homerun zones, too?"
**Clarity/Challenge:** NONE — JK is right, HR zones were missing from the zone count.
**JK's final answer:** Yes, the field location graphic also needs home run zones beyond the outfield wall. Seven HR zones: LF line, LF, LC, C, RC, RF, RF line. These represent where the ball left the park. Updated zone count: 45 fair/foul zones + 7 HR zones = 52 total tappable zones on the graphic.
**Confidence:** FIRM
**Status:** DECIDED

### Q28 — Layer 8: Substitution flow and trigger mechanism
**Question:** Sub-out flow: you tap a player, player card opens, hit "Sub Out" — does the replacement picker replace the player card, overlay on top, or dismiss first? Is bench list grouped by position vs pitchers?
**JK's initial answer:** "sub screen should replace the player card info and it should include all players on the bench, regardless of position, as position players can pitch and pitchers can play other positions, if the user wants that

Is there a better way to trigger subs/swaps? Like having 'Sub' and 'Swap' at the bottom of the lineup, then when the user selects one of those, the game prompts user to select a player in the lineup before the sub window pops up or the user is prompted to choose another player already in the lineup to swap positions with?"
**Clarity/Challenge:** CHALLENGE (pending — JK asked for agent input on trigger mechanism)
**JK's final answer:** (pending — sub screen replaces player card decided, bench list ungrouped decided, trigger mechanism open)
**Confidence:** FIRM on sub screen behavior, OPEN on trigger mechanism
**Status:** OPEN — agent to respond on trigger mechanism

### Q28a — Layer 8: Substitution trigger mechanism resolution (follow-up to Q28)
**Question:** (Agent evaluated two patterns) Pattern A (player-first): tap player → card → Sub/Swap. Pattern B (action-first): Sub/Swap buttons at bottom of lineup → select player. Agent recommended Pattern A.
**JK's initial answer:** (see Q28)
**Clarity/Challenge:** CHALLENGE
**Agent pushback:** Pattern A is better — decision to sub starts with the player mentally ("Lee is struggling"), not the action. Pattern B adds permanent UI clutter for an action that happens 3-5 times per game. Discoverability isn't a problem since every player is tappable.
**JK's resolution:** "agreed - pattern A is better here"
**JK's final answer:** Player-first substitution flow (Pattern A). Tap player in lineup → player card opens → "Sub Out" replaces card with full bench list (all players regardless of position — position players can pitch and vice versa, ungrouped). "Swap Position" prompts user to tap another in-game player to swap with. No persistent Sub/Swap buttons in the lineup columns.
**Confidence:** FIRM
**Status:** DECIDED

### Q27c — Layer 5: Context-sensitive field location zones (follow-up to Q27a/Q27b)
**Question:** (JK raised) Does adding 7 HR zones (now 21 with three depth levels) push us to two-tap? JK proposed context-sensitive zone display: HR shows only HR zones (21), hits show no foul zones, GO shows no foul or outfield zones. Asked agent to evaluate.
**JK's initial answer:** "what about this: if the user taps HR, the engine knows the only options should be the seven zones beyond the fence, so it only shows the HR zones; however, HRs typically have three levels: just over the fence, medium, and major blasts; so the HR button triggers 21 zones to choose from; when its not a HR, none of those zones show up in the enrichment pane. If it's a hit, no foul zones show up; if it's a GO, no foul or outfield zones show up. That should free up lots of space in intuitive ways. Is that enough? Maybe as we've eliminated the HR zones for everything not entered as HR. If not, we could shrink the infield zones a bit by splitting the depth into two zones.

Thoughts?"
**Clarity/Challenge:** CHALLENGE (pending — agent evaluating context-sensitive zone approach)
**JK's final answer:** (pending)
**Confidence:** LEANING
**Status:** OPEN — agent to respond with evaluation

### Q27d — Layer 5: Context-sensitive zone refinements (follow-up to Q27c)
**Question:** (Agent evaluated context-sensitive zones, JK provided baseball corrections)
**JK's initial answer:** "for LO, we could remove the 6 shallow infield zones, since no line drives can be caught there (even a caught comebacker to the pitcher could be called medium-center-infield)

PO needs to include the shallow outfield zones

agreed that the graphic height should adapt to the zone count, not a fixed size"
**Clarity/Challenge:** NONE — baseball-correct refinements from JK.
**JK's final answer:** Context-sensitive field location graphic with result-specific zone sets:

HR: 7 directions × 3 depths (just over, medium, blast) = 21 zones. Beyond-the-fence graphic only.

GO: Infield only. 6 directions × 3 depths (shallow, medium, deep) = 18 zones.

FO: Outfield + foul. 6 directions × 4 depths (shallow, normal, deep, warning track) + 3 foul = 27 zones.

LO: Outfield + medium/deep infield (no shallow infield — line drives aren't caught there; comebacker to pitcher = medium-center-infield). 6 directions × (2 IF depths + 4 OF depths) + 3 foul = 39 zones.

PO: Infield + shallow outfield + foul. 6 directions × (3 IF depths + 1 shallow OF) + 3 foul = 27 zones.

1B/2B/3B (hits): Infield + outfield, no foul, no HR. 6 directions × (3 IF + 4 OF) = 42 zones.

E (errors): Same as hits — infield + outfield = 42 zones.

Graphic height adapts to the zone count — more zones gets a taller graphic, fewer zones gets a more compact one. Single-tap design target, with two-step fallback (direction then depth) only if implementation testing reveals accuracy problems.
**Confidence:** FIRM
**Status:** DECIDED

### Q29 — Layer 8: Mojo, fitness, injury changes — UX home
**Question:** Mojo, fitness, and injury need a visible, durable event path. The gospel spec had diamond taps for state popovers — but diamond is gone. Should mojo/fitness/injury be additional buttons on the player card alongside Sub and Swap?
**JK's initial answer:** "Yes, with one exception: Injuries should be automatically logged by the engine whenever the user updates to the fitness to 'weak', 'strained', or 'hurt' (so 'fit' and 'well' are considered NOT injured)"
**Clarity/Challenge:** NONE
**JK's final answer:** Mojo and fitness updates live on the player card as additional action buttons alongside Sub Out and Swap Position. Tapping "Update Mojo" or "Update Fitness" lets the user change the player's current state. Injury is NOT a separate manual action — injuries are automatically logged by the engine whenever fitness is updated to "weak", "strained", or "hurt." Fitness levels "fit" and "well" are considered NOT injured. So the user only ever updates fitness directly; the engine infers and logs the injury event automatically based on the fitness level chosen.

Player card action buttons are now: Sub Out, Swap Position, Update Mojo, Update Fitness. No separate injury button.
**Confidence:** FIRM
**Status:** DECIDED

### Q30 — Layer 8: Pitcher change flow and pitch count prompt
**Question:** Pitcher changes require outgoing pitcher's pitch count (gospel spec §7.4). Where does the pitch count prompt appear — before or after selecting the replacement?
**JK's initial answer:** "the pitch count prompt should appear as a step after selecting the replacement, so pitch count is only entered if the pitcher is taken out (because it should also be prompted every half-inning for the pitcher that ended the half-inning in the game)

we do not need to include functionality for a clickable name for either the pitcher or batter in the newsboard, since we now have them covered in the lineup cards"
**Clarity/Challenge:** NONE
**JK's final answer:** Pitcher change flow: tap pitcher in defensive lineup → player card → Sub Out → bench list (all players) → select replacement → THEN pitch count prompt for outgoing pitcher. Pitch count is entered after replacement is chosen, not before. This same pitch count prompt also fires at the end of every half-inning for the pitcher who finished the half-inning (not just on removal). Newsboard column does NOT have clickable pitcher/batter names — lineup columns are the sole interaction surface for player actions. Newsboard is display-only (stats + beat reporter feed).
**Confidence:** FIRM
**Status:** DECIDED

### Q31 — Layer 8: Position changes (non-substitution) and pre-game lineup management
**Question:** Position swaps where no new player enters — is it always a clean two-player swap in SMB4, or can you move one player to a new position without specifying who takes their old spot?
**JK's initial answer:** "in SMB4, you're either swapping positions with another player already in the lineup or swapping spots in the lineup with a player on the bench. Players can also swap spots in the lineup (batting order) but only if done before the game begins. Not sure we can add that functionality (same with starting pitchers) before the game officially starts, but it seems like we could once we launch the gametracker; for example, the user launches the game in the gametracker and is allowed to make any changes to the lineup freely without permanent consequences. Once they're ready to start the game, any changes are now treated as in-game changes, so once a player is removed from the lineup, they are not allowed to come back into the game."
**Clarity/Challenge:** CHALLENGE (pending — this introduces a pre-game phase concept that doesn't exist in the current flow)
**JK's final answer:** (pending — see follow-up)
**Confidence:** LEANING
**Status:** OPEN — agent to respond

### Q31a — Layer 8/9: Pre-game phase and position/order swap resolution (follow-up to Q31)
**Question:** (Agent proposed pre-game phase concept with "START GAME" button as one-way gate. Asked if V1 or V2.)
**JK's initial answer:** "like your idea of the 'START GAME' button; this is v1 and the pre-game adjustments should be identical to in-game adjustments with the exception of re-ordering the batting order, which would require an additional option in the player card to 'swap order' and would act just like swap position except it would swap their order in the lineup and not change their fielding position; pitcher subs would be the same as in-game without the permanent sub-outs that are required in-game; otherwise, the functionality should be the same as in-game"
**Clarity/Challenge:** NONE — clean and decisive.
**JK's final answer:** Pre-game phase is V1. Two distinct GameTracker phases:

PRE-GAME PHASE (before "START GAME"):
- Quick Bar is disabled or replaced with "START GAME" button
- Lineup columns are fully editable via same player card UI
- Player card has all in-game options PLUS "Swap Order" (swaps batting order position with another player without changing fielding positions)
- Pitcher subs work same as in-game but WITHOUT permanent sub-out consequences (removed player can come back)
- Position swaps work same as in-game
- No changes are permanent — everything is freely adjustable
- "START GAME" requires confirmation prompt ("Lock lineups and begin recording?")

LIVE GAME PHASE (after "START GAME"):
- Quick Bar activates
- All changes are now permanent in-game transactions
- Removed players cannot re-enter (no re-entry rule)
- Pitch count required on pitcher removal
- "Swap Order" option is REMOVED from player card (batting order is locked once game starts)
- All other player card actions remain: Sub Out, Swap Position, Update Mojo, Update Fitness

The transition from pre-game to live is a one-way gate.
**Confidence:** FIRM
**Status:** DECIDED

### Q32 — Layer 8: Manager moments — UX home and logging
**Question:** Where should the manager moment visual indicator appear? Does the user need to do anything explicit to log a manager moment, or is it purely automatic?
**JK's initial answer:** "seems like the manager moment should automatically log in the play-log with an icon consistent with whatever is used as the visual indicator. the indicator should probably be in the score bug area (top-right); some manager moments are logged as the manager NOT doing something (ie, leaving a pitcher in that's struggling) so the play-log would have to have a text log that says what the move was and what the outcome was via a separate play log or an updated version of the play when the result is activated"
**Clarity/Challenge:** CLARITY — the "not doing something" case and the two-phase logging need unpacking.
**Agent probe:** (will ask in next question)
**JK's final answer:** Manager moment indicator appears in the score bug area (top-right) — likely ⚡ or similar icon that activates when LI exceeds threshold. The moment auto-logs in the play log as a between-play entry with its own icon. Two logging scenarios:

(1) ACTIVE decision (pitcher change, pinch hit, steal attempt, etc.): The manager moment play-log entry records what the decision was. When the resulting at-bat or play resolves, the play-log entry updates to show the outcome and WPA impact.

(2) PASSIVE decision (leaving a struggling pitcher in, NOT calling for a steal, etc.): The manager moment still logs in the play log as "left pitcher in" or similar. The NEXT play's outcome then retroactively updates the manager moment entry with the result (e.g., "Left Bender in → next batter hit HR, -0.32 WPA").

Key design implication: manager moment play-log entries are TWO-PHASE — they log the decision first, then update with the outcome when it resolves. This is distinct from at-bat entries which are single-phase.
**Confidence:** FIRM on indicator placement and auto-logging. LEANING on two-phase update mechanism — needs more detail.
**Status:** DECIDED on concept. Two-phase play-log update mechanics to be refined.

### Q33 — Layer 8: Manager moments — passive decision logging
**Question:** For passive manager decisions ("leaving the pitcher in"), how does the system log a conscious non-action? (a) System infers automatically — next Quick Bar tap after manager moment indicator = "stayed the course," or (b) User explicitly taps "Stay the Course" button to acknowledge the decision before recording next at-bat.
**JK's initial answer:** "Let's go with B"
**Clarity/Challenge:** NONE
**JK's final answer:** Passive manager moments use explicit acknowledgment. When the manager moment indicator is active in the score bug (⚡ or similar, top-right), a "Stay the Course" button appears. User taps it to explicitly log the passive decision ("left pitcher in"). This logs as a manager moment entry in the play log. The next play's outcome then retroactively updates the manager moment entry with the WPA result. One extra tap — but the passive decision is now an intentional, recorded action, not an inference.

Complete manager moment flow:
- LI exceeds threshold → ⚡ indicator appears in score bug (top-right)
- ACTIVE path: user makes a sub/steal/etc. through normal player card flow → system tags it as manager moment → play log entry records decision + outcome when resolved
- PASSIVE path: user taps "Stay the Course" → system logs "stayed the course" in play log → next play's outcome updates the entry with WPA
- ⚡ indicator clears after either path resolves
**Confidence:** FIRM
**Status:** DECIDED

### Q34 — Layer 9: Half-inning transition and pitch count prompt
**Question:** When 3 outs recorded and half-inning ends, what happens? Where does pitch count prompt appear? How do teams swap in the lineup columns?
**JK's initial answer:** "what do you recommend?"
**Clarity/Challenge:** CLARITY — JK deferred to agent for recommendation.
**Agent probe:** (recommendation follows)
**JK's final answer:** (pending — waiting for JK to accept/reject agent recommendation)
**Confidence:** (pending)
**Status:** OPEN

### Q34a — Layer 9: Half-inning transition resolution (follow-up to Q34)
**Question:** (JK deferred to agent recommendation on half-inning transition)
**JK's initial answer:** "what do you recommend?"
**Clarity/Challenge:** CLARITY — JK deferred to agent.
**Agent recommendation:** Three-part transition: (1) Pitch count prompt fires immediately as compact modal overlay with numeric input + Skip option. (2) After dismissal, lineup columns swap — role-based, not team-based (column 2 = always batting team, column 3 = always fielding team). Score bug updates inning. Newsboard refreshes with new matchup. Current batter/pitcher highlights shift. (3) No between-inning summary screen — play log and Newsboard feed carry that information. Transition is instant, no animation.
**JK's resolution:** "yes, agreed on all of that"
**JK's final answer:** Half-inning transition flow:
1. Third out recorded → pitch count modal overlay fires immediately (compact, center-screen, numeric input + Skip)
2. After pitch count dismissed → lineup columns swap content (NOT position — column 2 is always "batting team," column 3 is always "fielding team"). Score bug inning indicator updates. Newsboard refreshes with new batter/pitcher matchup. Current batter outline appears on new half's leadoff hitter. Pitcher outline shifts to new pitching team's pitcher.
3. No between-inning summary screen. Beat reporter notes about the completed half-inning appear at top of Newsboard feed.
4. Transition is instant — no animation. User sees new state and is ready to record.

Columns are ROLE-BASED: column 2 = batting team (always), column 3 = fielding team (always). Teams swap between columns on half-inning change. User always knows left = batting, right = fielding.
**Confidence:** FIRM
**Status:** DECIDED

### Q35 — Layer 9: End of game flow
**Question:** When final out recorded or walk-off occurs — does the system auto-transition to post-game, or prompt first? What does the user see between last out and leaving the GameTracker? Any final enrichment opportunity?
**JK's initial answer:** "both scenarios are valid; there needs to be a prompt when game naturally ends so the user can finish any final enrichment before advancing to postgamesummary, user should also be prompted to enter pitch count for final pitcher. Maybe with natural ending, user is notified of game ending and asked to enter final pitch count and told to enter final enrichment before clicking 'END GAME' which is now in the quickbar spot, just like the 'START GAME' was to end pre-game adjustments and launch game. Once user clicks end game app advances to postgame screen."
**Clarity/Challenge:** NONE — clean and elegant, mirrors the pre-game START GAME pattern.
**JK's final answer:** End of game flow:

NATURAL ENDING (system detects game over):
1. System detects final out / walk-off
2. Notification appears: game has ended, final pitch count prompt for the last pitcher fires
3. Quick Bar outcome buttons are replaced with a single "END GAME" button (mirrors pre-game "START GAME" pattern)
4. User is in a "post-final-out" phase — can still scroll play log, tap entries to enrich, do any final enrichment before leaving
5. When user is ready, they tap "END GAME" → app advances to PostGameSummary

MANUAL ENDING (user taps End Game mid-game):
1. User taps End Game button in the Quick Bar utility area
2. Confirmation prompt: "Are you sure?" (per Q10a)
3. If confirmed → pitch count prompt for current pitcher → app advances to PostGameSummary

This creates a three-phase GameTracker lifecycle:
- PRE-GAME: Quick Bar shows "START GAME" — free lineup editing
- LIVE GAME: Quick Bar shows outcome buttons + utility buttons — active recording
- POST-FINAL-OUT: Quick Bar shows "END GAME" — enrichment window before leaving

Symmetry between START GAME and END GAME is a strong UX pattern — bookends the experience.
**Confidence:** FIRM
**Status:** DECIDED

### Q36 — Layer 9: Extra innings UI changes
**Question:** Does anything change in the UI when a game goes to extra innings? Score bug indicator, expanded scoreboard handling for >9 innings, beat reporter narratives, or no special treatment?
**JK's initial answer:** "your ideas are good"
**Clarity/Challenge:** CLARITY — JK accepted agent's proposed ideas but needs to be concrete about which ones.
**Agent probe:** Agent proposed: score bug visual indicator for extras, expanded scoreboard handles >9 inning columns, beat reporter surfaces extra-innings narratives.
**JK's clarification:** Accepted all three.
**JK's final answer:** Extra innings UI changes:
1. Score bug gets a visual indicator that the game is in extras (exact treatment TBD — could be a color change, "EXTRA" label, or similar)
2. Expanded scoreboard (retro Fenway board) handles more than 9 inning columns — scrollable or condensed to fit additional innings
3. Beat reporter feed surfaces extra-innings-specific narratives (tension, fatigue, historic context)
4. Otherwise, the UI just keeps going — T10, B10, T11, etc. No structural layout changes. All columns, Quick Bar, and interactions work identically.
**Confidence:** FIRM
**Status:** DECIDED

### Q37 — Layer 10: Animation philosophy
**Question:** Is zero animation the global rule throughout the GameTracker? Or are there specific cases where brief animation would help — runner base exponent changing, play log entry sliding in, score incrementing?
**JK's initial answer:** "not sure what's possible for animations and how risky they are given possible bug introduction; what do you think?"
**Clarity/Challenge:** CLARITY — JK deferred to agent for recommendation on animation risk/reward.
**Agent probe:** (recommendation follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent to respond with recommendation

### Q37a — Layer 10: Animation philosophy resolution (follow-up to Q37)
**Question:** (JK deferred to agent) Zero animation globally, or specific cases where brief animation helps?
**JK's initial answer:** "not sure what's possible for animations and how risky they are given possible bug introduction; what do you think?"
**Clarity/Challenge:** CLARITY — JK deferred to agent.
**Agent recommendation:** "CSS-only, cosmetic-only" animation philosophy. Safe animations (CSS transitions, near-zero bug risk): button press/release 100ms, play log entry fade-in, score bug number flash on run scored, runner exponent highlight on change. Risky animations to avoid in V1: anything that delays event processing, moves tap targets mid-animation, requires JS animation libraries, or implies intermediate states (like runner movement between bases). Rule: if it's a CSS `transition` property on a single element, it's safe. If it requires JS orchestration, defer to V2.
**JK's resolution:** "yes, let's go with your ideas here"
**JK's final answer:** CSS-only, cosmetic-only animation philosophy for V1:

SAFE (implement in V1):
- Quick Bar button press/release: 100ms background-color CSS transition
- Play log new entry: fade-in or slide-down via CSS opacity/transform transition
- Score bug run scored: number briefly highlights (bright for 200ms, fades back to white)
- Lineup row updates (runner exponent change, batter highlight shift): brief highlight on updated row via CSS transition

AVOID (defer to V2):
- Anything that delays event processing or waits for animation to complete before committing
- Anything that moves tap targets mid-animation
- JS animation libraries or requestAnimationFrame timing
- Runner "movement" animations between bases (implies intermediate states not in data model)

Rule: CSS `transition` on a single element = safe. JS orchestration or sequencing = V2.
All animations are decorative, never load-bearing. If they break, the app still works perfectly.
**Confidence:** FIRM
**Status:** DECIDED

### Q38 — Layer 11: Undo visual feedback
**Question:** When user taps Undo, the play log entry disappears, lineup state rolls back, score bug updates. Is that sufficient visual feedback, or do you want a brief toast message like "Undone: T7 Hayata 1B"?
**JK's initial answer:** "A brief toast message would be good to have in addition to your ideas here"
**Clarity/Challenge:** NONE
**JK's final answer:** Undo visual feedback includes: (1) most recent play log entry disappears/reverts, (2) batting lineup runner highlights/exponents revert, (3) score bug updates if run was involved, (4) brief toast message appears and fades — format: "Undone: [inning] [batter] [result]" (e.g., "Undone: T7 Hayata 1B"). Toast is CSS fade-in/fade-out per the animation philosophy (Q37a) — cosmetic, not load-bearing.
**Confidence:** FIRM
**Status:** DECIDED

### Q39 — Layer 11: Network loss mid-game
**Question:** If the user loses network mid-game — does the GameTracker even need network? Everything is IndexedDB (local storage on the device). Is there any network dependency during active gameplay?
**JK's initial answer:** "is everything indexed locally? doesn't seem like temporarily losing the network connection would be a problem; how would it sync? Would it keep trying until it got the network back? would it wait until the game ends and then sync?"
**Clarity/Challenge:** CLARITY — JK asking for clarification on the architecture. Agent to explain.
**Agent probe:** (explanation follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent to clarify architecture

### Q39a — Layer 11: Network loss, data persistence, and mid-game app close (follow-up to Q39)
**Question:** (Agent explained KBL Tracker is 100% local IndexedDB, no network dependency. JK asked about "last saved" indicator and mid-game app close recovery.)
**JK's initial answer:** "probably need a 'last saved' function; what if the user closes the app mid game? can they come back to it without data loss?"
**Clarity/Challenge:** CLARITY — JK asking about recovery architecture. Agent to explain current state.
**Agent probe:** (explanation follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent to clarify recovery architecture and recommend UX treatment

### Q39b — Layer 11: Mid-game resume and last-saved indicator (follow-up to Q39a)
**Question:** (Agent explained recovery architecture — events persist to IndexedDB on every tap, replay reconstructs state. Proposed "✓ Saved" indicator, auto-resume on reopen, no manual save button.)
**JK's initial answer:** "yes, makes sense, but we'll need to have a way to resume saved game from the home screen or from the 'Today's Game' in the franchise home or elimination home if a game is abandoned midway through. Otherwise, the user will have to save the URL at the beginning of each game to re-find the last-saved game state.

Also, let's make sure the UI for last saved isn't noticeable every time it saves anew, otherwise it will distract from the rest of the gametracker experience"
**Clarity/Challenge:** NONE — both points are sharp.
**JK's final answer:** Mid-game persistence and resume:

1. RESUME ENTRY POINTS: If a game has events but isComplete is false, the franchise home / elimination home / "Today's Game" surfaces a "Resume Game" entry point (not just a fresh "Play Game" button). User can navigate back to the in-progress game without needing to remember the URL.

2. LAST-SAVED INDICATOR: Must be subtle/passive — NOT a flashing or updating timestamp that draws attention on every tap. Recommendation: a small, static "✓" or similar indicator tucked into the score bug area that is always present (indicating saves are happening), but does NOT visibly update/animate/flash on each save. It's a trust signal that's there if you look for it, not a distraction. Only draws attention if something goes wrong (e.g., indicator changes to "⚠" if a write fails).

3. NO MANUAL SAVE BUTTON: Every event writes immediately to IndexedDB. No explicit save action needed.

4. AUTO-RESUME: Navigating to a gameId with isComplete: false replays the event log and restores full game state — lineups, score, play log, enrichments, everything.
**Confidence:** FIRM
**Status:** DECIDED

### Q40 — Layer 11: Batch catch-up when user falls behind
**Question:** If the user plays through 3 at-bats without pausing, then pauses to record — should the UI do anything differently for batch entry, or does the user just tap Quick Bar multiple times and correct after?
**JK's initial answer:** "that's sufficient because the gametracker doesn't need to know that the user is behind the console reality; all that matters is that the user is entering the correct data when all is said and done. In practice, the entries will happen in real time right after they happen on screen (maybe two at a time when the user gets good at quick navigation and builds quick habits) so this isn't going to be an issue."
**Clarity/Challenge:** NONE
**JK's final answer:** No batch catch-up mode needed. The GameTracker has no awareness of console state — it just records what the user tells it. If the user falls behind, they tap Quick Bar multiple times in sequence and correct/enrich after. In practice, entries will happen in near-real-time (1-2 at-bats at a time once user builds habits). No dedicated batch entry UI.
**Confidence:** FIRM
**Status:** DECIDED

### Q41 — Layer 5: Fielding play type as enrichment field
**Question:** The Codex capture contract lists "fielding play type" alongside catch type and fielding sequence. Is fielding play type a third dimension — the TYPE of play (relay, cutoff, rundown, unassisted, DP turn)? Or is this already covered by catch type + fielding sequence + result button?
**JK's initial answer:** "it seems valuable to add the fielding play types: relay throw (applies to the cutoff man on an outfield assist, so the engine knows that both players should get an assist, right? not sure on how baseball statisticians account for plays like these or how relay throw is different than cutoff), rundown, unassisted, DP turn, others? It would be good to have the engine understand what role each fielder played in a multi-player sequence. Would this also make the DP quick button easier for the engine to understand so that it doesn't have to make assumptions; how would the engine understand DP with only the SS selected in the fielding sequence if we didn't also specify 'Unassisted'? Seems like we may have leftover logic in the code that infers who's involved in double-plays or how they played out. Not sure."
**Clarity/Challenge:** CLARITY — JK is asking several architecture questions. Agent needs to address: relay vs cutoff distinction, how fielding play type helps the engine, and how this interacts with the fielding sequence.
**Agent probe:** (see Q41a for agent response)
**JK's final answer:** Fielding play type IS a separate enrichment dimension. Types identified so far: relay throw, cutoff, rundown, unassisted, DP turn. Purpose is to let the engine understand each fielder's ROLE in the sequence (not just that they touched the ball). This disambiguates cases like a DP with only one fielder in the sequence (must be unassisted) vs. a DP with 6-4-3 (standard DP turn). JK wants the engine to not have to make assumptions about play mechanics.
**Confidence:** FIRM on including fielding play type. OPEN on exact type list.
**Status:** DECIDED on inclusion. Type list and relay/cutoff distinction to be refined.

### Q42 — Layer 5: KP/NUT and modifiers — UX home
**Question:** (Agent identified KP/NUT and general modifiers as orphan risks) Where do modifiers live in the new layout?
**JK's initial answer:** "KP/NUT are optional modifiers on any play where the batter hits the ball, so it needs to be included on those specific entries just in case; beat throw should be a modifier on hits only; beat runner on contact-related outs only; TOOTBLAN on outs only, including betweenplayevents (because it can be a runner who started the at-bat on base or a batter who stupidly gets thrown out after a hit (that's on the runner), which is different than 'Out advancing' which is a managerial decision to send the runner to stretch a single into a double or a double into a triple or triple into an inside-the-park homer and getting thrown out (that's on the manager).

Modifiers should live in the enrichment pane but be logically surfaced, if not too complex to add; also need to ensure no redundancy"
**Clarity/Challenge:** NONE — JK gave detailed modifier applicability rules.
**JK's final answer:** Modifiers live in the enrichment pane (expanded play log entry), context-sensitive like other enrichment fields (Q25). Modifier applicability rules:

- KP (Killed Pitcher): optional on any play where batter hits the ball (contact plays only)
- NUT (Nut Shot): optional on any play where batter hits the ball (contact plays only)
- Beat Throw: modifier on hits only (batter beat the throw to the base)
- Beat Runner: modifier on contact-related outs only (fielder beat the runner)
- TOOTBLAN: modifier on outs only — applies to at-bat events AND between-play events. Distinct from "Out Advancing" — TOOTBLAN is a runner's baserunning blunder (runner's fault), Out Advancing is a managerial decision to send the runner that didn't work out (manager's fault, feeds mWAR)
- Out Advancing: modifier on outs only — managerial decision, distinct from TOOTBLAN

Engine must surface only applicable modifiers per result type — no redundancy, no irrelevant options. Same context-sensitive display pattern as other enrichment fields.
**Confidence:** FIRM
**Status:** DECIDED

### Q43 — Layer 10: Backwards K emblem for called strikeouts
**Question:** (JK raised) Can we have a backwards "K" instead of "Kc" — like a little emblem of a backwards K?
**JK's initial answer:** "can we have a backwards 'K' instead of 'Kc'? like a little emblem of a backwards K or something?"
**Clarity/Challenge:** NONE — this is a standard baseball convention. A backwards K (Ꝁ or mirrored K) is universally recognized in baseball as a called strikeout (looking). It's a perfect fit for the Scoreboard Chalk Retro aesthetic.
**JK's final answer:** Called strikeouts display as a backwards K emblem (mirrored K character) throughout the UI — play log entries, enrichment badges, and anywhere strikeout type is shown. This replaces the "Kc" text label. The backwards K is a universally recognized baseball convention that fits the retro scoreboard aesthetic. Swinging strikeouts remain as standard "K".
**Confidence:** FIRM
**Status:** DECIDED

### Q44 — Layer 5: Fielding play type list, overlap with catch types, and default logic
**Question:** (Agent proposed fielding play type list: Routine, DP Turn, Unassisted, Relay/Cutoff, Rundown, Tag Play.) JK raised overlap concerns between catch type and fielding play type, and asked about default-deselect logic.
**JK's initial answer:** "we have to be careful to cover all our bases while not adding confusing redundancy; Unassisted and Tag Play are different in subtle ways but similar. For instance, on a FO or PO or LO, these are unassisted outs but are they routine? Not necessarily, they could be diving, jumping, running catches. They don't involve a tag, either. But a FC where the SS tags a runner advancing from 2B to 3B instead of throwing to 1B is an unassisted FC-6 putout on a tag play, so we'd likely want to check both boxes.

Let's be sure our logic is sound and we have everything accounted for without introducing redundancies. Seems like this list may have overlap with the catch types list; do we need to default to routine for both lists unless the user clicks something else, at which point 'routine' automatically deselects itself?"
**Clarity/Challenge:** CHALLENGE — agent needs to reconcile the two enrichment dimensions and ensure no overlap or ambiguity.
**Agent probe:** (detailed analysis follows in Q44a)
**JK's final answer:** (pending — requires agent analysis)
**Confidence:** (pending)
**Status:** OPEN — agent to produce clean taxonomy

### Q44a — Layer 5: Complete fielding enrichment taxonomy (follow-up to Q44)
**Question:** (JK raised multiple edge cases and overlap concerns) How do errors and dropped third strikes fit? What Quick Bar buttons haven't been accounted for? HR should show missed robbed HR. Hits need Dimension B for runners thrown out advancing. How do modifiers fit? Also: use "relay" not "relay/cutoff," use "jumping" not "leaping/jumping," use "routine" wherever "standard" was proposed.
**JK's initial answer:** [see full text above — multiple concerns raised]
**Clarity/Challenge:** CHALLENGE — agent needs to produce a complete, non-redundant enrichment taxonomy that covers every Quick Bar result type, both dimensions, and modifiers without overlap.
**Agent probe:** (complete taxonomy follows)
**JK's final answer:** (pending — waiting for agent to produce clean taxonomy)
**Confidence:** (pending)
**Status:** OPEN — agent producing comprehensive analysis

### Q44b — Layer 5: Complete fielding enrichment taxonomy v2 (follow-up to Q44a)
**Question:** (JK raised multiple corrections to proposed taxonomy)
**JK's initial answer:** Multiple corrections:
1. Layer 1 needs "missed" versions for all catch types — some apply to errors, others to hits
2. Layer 2: need to account for ball bouncing off one player and another picking it up
3. No KP/NUT on HRs, SF, or SAC
4. Pitch type should be added to BB
5. All catch types are possible for errors
6. Bunt should be a modifier on anything in the infield including SAC
7. How to account for errant throw/catch on dropped third strike (WP_K/PB_K)?
8. No need to include Balk
9. CRITICAL CORRECTION: Missed dives are NOT errors. Error = scorer expects the player to make the play. Non-routine catch attempts that fail are NOT errors — they're fielding chances with missed catches. If a player makes an errant throw or mental error AFTER the missed dive/jump, that IS a separate error and we need to account for both the missed catch AND the subsequent error.
**Clarity/Challenge:** CHALLENGE — agent must produce corrected taxonomy that accounts for all edge cases.
**Agent probe:** (comprehensive revised taxonomy follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent producing revised taxonomy

### Q44c — Layer 5: Enrichment taxonomy v3 — ITPHR, TOOTBLAN on hits, baserunning attribution, K/Ꝁ in Quick Bar (follow-up to Q44b)
**Question:** (JK raised multiple corrections and new issues to taxonomy v2)
**JK's initial answer:** Multiple points:
1. Inside-the-park HRs need coverage — anything that applies to 3B could apply to ITPHR. Make it its own overflow button. Field zones = everything but foul and HR zones.
2. TOOTBLAN CAN happen on hits — runner rounds first too aggressively and gets back-picked. Make it available any time a runner is on base.
3. Is there a difference between TOOTBLAN tied to the batter vs a runner on the same at-bat? Who made the baserunning error? Should users click the player card to add TOOTBLAN? Same for batter? Are we introducing enrichment redundancy between play-log enrichment and player card? Are we conflating running/batting in our enrichment logic?
4. Same concern for Out Advancing on hits.
5. Quick Bar should have both K and Ꝁ as separate buttons — strikeouts happen a lot, no need to enrich every called K. Save enrichment for pitch count/type only.

**Clarity/Challenge:** CHALLENGE — agent must resolve the baserunning attribution problem (play-level vs player-level enrichment) and address all new issues.
**Agent probe:** (comprehensive analysis follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent producing revised taxonomy v3

### Q44d — Layer 5: Runner event recording and enrichment in play log (follow-up to Q44c)
**Question:** (JK asking for clarification) Does the runner out at home get recorded in the play log? Can the user then click on the play-log entry and add fielding enrichment to the runner event? How does fielding enrichment work when it's tied to the runner and not the at-bat?
**JK's initial answer:** "we'll need to ensure this is clear in the spec so it doesn't get lost; it requires fielding enrichment in two places or at least behind the scenes and will have to allow the user to record the fielding sequence and enrichment data as tied to the runner and not the respective play in the play-log; however, doesn't this outcome get recorded in the play log so the user can make versioned edits later on, if necessary; maybe i'm misunderstanding the flow: does the out at home (in the tanaka example) get recorded in the play log? Then the user is able to click on the play-log and add fielding enrichment?"
**Clarity/Challenge:** CLARITY — JK needs the flow clarified. The answer is YES, runner events appear in the play log.
**Agent probe:** (detailed flow explanation follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent clarifying

### Q44e — Layer 5: Runner outcomes — AtBatEvent or BetweenPlayEvent? (follow-up to Q44d)
**Question:** (JK challenging the event classification) Tanaka was thrown out during the at-bat's outcome (the single), not between plays. This should be an AtBatEvent sub-event, not a BetweenPlayEvent. BetweenPlayEvent would mean he was thrown out stealing or picked off, which is a different thing entirely.
**JK's initial answer:** "the thing is that it's not a betweenplayevent because tanaka was thrown out at home during the last play, right? otherwise, the logic reads that he was thrown out during the atbat and not during the atbat's outcome (ie, thrown out stealing home or picked off)

Do we need to have runnerEvent as its own thing or does it need to be classified as either atbatevent or betweenplayevent? Seems like it should be an atbatevent, since it happened on the same play as the single (atbatevent)

i do like how we separate the runner outcome fielding sequence and the batter outcome fielding sequence tho"
**Clarity/Challenge:** CHALLENGE — JK is right. This is an architectural distinction that affects the data model.
**Agent probe:** (analysis follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — critical data model implication

### Q44f — Layer 5: Runner sub-entries in play log and two enrichment pathways (follow-up to Q44e)
**Question:** (JK raised two issues) (1) Option B implies a sub-entry for EVERY runner on EVERY play since defaults auto-advance, not just when something notable happens. JK likes this approach. (2) Clarification needed: at-bat-associated runner outcomes enter enrichment via the play log pane (sub-entries), but BetweenPlayEvent runner outcomes (SB, CS, pickoff) enter via the player card pathway — then where does enrichment happen for BetweenPlayEvents?
**JK's initial answer:** "i like both options but here's the issue i see with option B: here you have the sub-entry saying 'Tanaka Out at Home' but this isn't how the play auto-logs; it would auto-log as 'Tanaka Advances to 3rd', which would imply that it would have a sub-entry for every runner on base every play; i DO like this approach as it's clearer to the user if they need to enrich the batter's outcome or ANY of the runners' outcomes. As long as we have a scrollable enrichment pane, we should be fine to do it this way.

so this implies that the user enters atbat-associated runner outcomes in the enrichment pane and betweenplayevents that are runner outcomes in the player card pathway, which will then log as a play in the play-log where the user can then enter enrichment data? or does the user still enter that enrichment data in the player card only?"
**Clarity/Challenge:** CLARITY — two-pathway enrichment model needs explicit definition.
**Agent probe:** (detailed clarification follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent clarifying the two pathways

### Q44g — Layer 5: Default pitcher/catcher attribution on BetweenPlayEvents (follow-up to Q44f)
**Question:** (JK raised) Do BetweenPlayEvents auto-assign the current pitcher and catcher? Engine should track this for CS%, pickoff stats, wild pitches, etc.
**JK's initial answer:** "do we have default pitchers/catchers assigned to the enrichment for betweenplayevents? I imagine the engine already tracks that so it should be easy to have those players selected by default for betweenatbatevents, similar to defaulting to the pitcher/catcher combo for Ks and backwards Ks, right? That way, we have the data to see how a catcher's or pitcher's particular CS% or how many pickoffs they have, wild pitches, etc."
**Clarity/Challenge:** NONE — JK is correct and this is architecturally straightforward.
**JK's final answer:** BetweenPlayEvents auto-assign the current pitcher and catcher at the time the event is recorded. This is the same pattern as AtBatEvents, which already snapshot pitcher/batter context. The engine knows who the current pitcher and catcher are at all times (they're in the defensive lineup). So:

- SB: pitcher and catcher auto-assigned (catcher gets CS/SB tracked, pitcher gets SB-allowed tracked)
- CS: pitcher and catcher auto-assigned (catcher gets CS credit, throw sequence enrichable for who tagged)
- Pickoff: pitcher auto-assigned (pickoff count), fielder who applied tag enrichable
- WP: pitcher auto-assigned (wild pitch count for pWAR)
- PB: catcher auto-assigned (passed ball count for fWAR)
- K and Ꝁ: pitcher and catcher already auto-assigned via AtBatEvent context

User can override the defaults if needed (e.g., a pickoff where the catcher initiated the throw, not the pitcher — or a pickoff where a different fielder applied the tag). But defaults are correct ~95% of the time.

This gives the engine everything it needs for: pitcher pickoff stats, catcher CS%, catcher PB count, pitcher WP count, pitcher SB-allowed rate — all from auto-captured defaults with optional enrichment correction.
**Confidence:** FIRM
**Status:** DECIDED

### Q45 — Layer 10: Haptic and audio feedback
**Question:** Should the iPad provide haptic feedback on Quick Bar taps or other interactions? Any audio — click sounds, scoreboard sounds, chimes?
**JK's initial answer:** "i like the idea of retro baseball video game sounds for scoring plays, quick bar taps, home runs, etc. what do you have in mind?"
**Clarity/Challenge:** CLARITY — JK likes the concept, asking agent for specific recommendations.
**Agent probe:** (recommendation follows)
**JK's final answer:** (pending)
**Confidence:** LEANING toward audio
**Status:** OPEN — agent to propose specific audio treatments

### Q45a — Layer 10: Audio feedback resolution (follow-up to Q45)
**Question:** (Agent proposed retro 8-bit audio treatments) Quick Bar click, run scored chime, HR fanfare, strikeout descending tone, half-inning whistle, undo rewind bloop, Start/End Game jingle. Silent on enrichment, scrolling, corrections. Global mute toggle. No haptics in V1.
**JK's initial answer:** "sounds good, i like all of it; one thing: what if we added a short typewriter sound each time a beat reporter blurb is added? maybe we make that toggle on/off as well in case its too frequent"
**Clarity/Challenge:** NONE — good addition.
**JK's final answer:** Retro 8-bit audio feedback confirmed:

GAME SOUNDS (global mute toggle):
- Quick Bar tap: short mechanical scoreboard flip click
- Run scores: 8-bit ascending chime (~300ms)
- HR / ITPHR: 8-bit fanfare, 4-note ascending with sustain (~500ms)
- Strikeout (K or Ꝁ): quick descending two-note tone
- End of half-inning (3 outs): short 8-bit whistle/arpeggio
- Undo: descending rewind bloop
- Start Game / End Game: more substantial 8-bit jingle (~1 second)

AMBIENT SOUNDS (separate toggle):
- Beat reporter blurb added: short typewriter sound. Separate on/off toggle from game sounds in case frequency is annoying.

SILENT (no audio):
- Play log scrolling
- Enrichment actions
- Runner sub-entry corrections
- Newsboard stat updates
- Lineup column updates

HAPTICS: None in V1 (inconsistent Safari support). Revisit if native app.

CONTROLS: Two audio toggles in score bug area or settings:
1. Game sounds on/off (default: ON)
2. Beat reporter sounds on/off (default: ON)
**Confidence:** FIRM
**Status:** DECIDED

### Q46 — Layer 11: Retroactive runner correction after multiple plays
**Question:** If the user doesn't notice a runner auto-advanced incorrectly until 3-4 at-bats later — can they scroll back, tap the old runner sub-entry, and correct it retroactively? If so, does this trigger replay/recalculation of subsequent events?
**JK's initial answer:** "that feels risky; should we just say that users will have to be thorough for things like that? enrichments are one thing but missing runner outcomes or quickbar events seem costly; unless i'm overthinking this and it's easier than i realize to replay/recalculate on versioned edits?"
**Clarity/Challenge:** CLARITY — JK asking agent to assess difficulty of retroactive runner correction with replay.
**Agent probe:** (assessment follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent to assess

### Q46a — Layer 11: Retroactive runner correction risk assessment (follow-up to Q46)
**Question:** (JK concerned about Option 1 introducing bugs for something that likely won't happen beyond undo depth in V1)
**JK's initial answer:** "i'm concerned that this sort of thing will introduce weird bugs for something i don't see happening beyond the 10-step undo function in v1; how risky is Option 1?"
**Clarity/Challenge:** CLARITY — JK asking for honest risk assessment.
**Agent probe:** (risk assessment follows)
**JK's final answer:** (pending)
**Confidence:** (pending)
**Status:** OPEN — agent assessing risk

### Q46b — Layer 11: Retroactive runner correction — final decision (follow-up to Q46a)
**Question:** (Agent recommended locking runner outcomes past undo depth for V1) Lock structural changes (who scored, who was out, which base reached) past undo depth, keep enrichment always editable, defer full retroactive correction with replay to V2.
**JK's initial answer:** "lock runner outcomes past undo depth for v1"
**Clarity/Challenge:** NONE
**JK's final answer:** Runner outcome correction rules for V1:
- Within undo depth (10 events): full correction via undo stack — pop events, fix state, re-record
- Runner sub-entries in play log make errors visible immediately after each at-bat, encouraging real-time correction
- Beyond undo depth: structural runner outcomes are LOCKED (who scored, who was out, which base reached). Cannot be changed.
- Beyond undo depth: enrichment fields remain editable forever (fielding sequence, catch quality, play mechanic, modifiers, pitch type, pitch count, etc.)
- V2: full retroactive correction with replay-from-checkpoint for structural changes beyond undo depth

This is the conservative approach. The play log's runner sub-entries + 10-deep undo + full attention on iPad make missed runner calls extremely unlikely.
**Confidence:** FIRM
**Status:** DECIDED

### Q47 — Layer 11: Wrong Quick Bar button — correction affordance
**Question:** The Quick Bar result is not enrichable (Q26). Correction path is always undo + re-record. Should there be any additional affordance — like tapping the play log entry showing a "wrong result? use undo" hint?
**JK's initial answer:** "yeah, you can add that as long as it's not distracting"
**Clarity/Challenge:** NONE
**JK's final answer:** When a user taps a play log entry's result code (the outcome itself, not the enrichment badges), a subtle hint appears — something like a small tooltip or inline text: "Use ↩ Undo to change result." This is passive guidance, not a modal or popup. It doesn't appear unprompted — only when the user taps the locked result field. Non-distracting, discoverable only when the user is looking for it.
**Confidence:** FIRM
**Status:** DECIDED

### Q48 — Layer 5: Hit type / contact type taxonomy
**Question:** The Codex capture contract lists "hit type" as a separate enrichable field. Is this the same as exit type, or distinct?
**JK's initial answer:** "Hit type is the same as exit type; let's change that to Hit type across; but it probably has something to do with contact quality; how about some version of weak groundball, solid groundball, hard groundball, bloop, line-drive, smoked line-drive, pop fly, fly ball, moonshot

the problem with some of these is we can derive deep line-drives and fly balls' contact quality by the distance, whether from fielding zones or homerun distances, so it seems redundant; however, ground ball quality and differentiating between bloops and line-drives is valuable, so maybe all we need is three types of ground-balls, and bloop, line-drive, pop fly, and fly ball

For contact quality, the engine could call hard ground-balls, line-drives, and fly balls as quality contact, while weak and normal ground balls, bloops, and pop flys are weak contact; but maybe this is where bunts should live, as well, instead of as a modifier; bunt is a type of hit type/contact type

the engine could then determine the difference between a line-drive that lands in shallow outfield versus a line drive that hits the wall; what's the difference between a pop-out and a fly-out? i normally would say pop-outs land in the infield or on the edge of the outfield grass, or are fielded by an infielder; a fly caught by an outfielder is a fly-out.

seems like we could get pretty nerdy in the almanac with calculating launch angle by triangulating home plate/contact type/landing zone

should we call this 'contact type' instead of hit type?"
**Clarity/Challenge:** CHALLENGE — agent needs to sort through the overlap between contact type, the Quick Bar buttons (which already imply exit type for outs), and the spray graphic (which captures location). Need to produce a clean, non-redundant taxonomy.
**Agent probe:** (analysis follows)
**JK's final answer:** (pending)
**Confidence:** LEANING
**Status:** OPEN — agent producing clean taxonomy

### Q48a — Layer 5: Contact type final taxonomy (follow-up to Q48)
**Question:** (Agent proposed 5-option contact type: Weak, Normal, Hard, Bloop, Bunt) JK corrected: all contact types need to be available on all contact plays, and bloops can be caught (web gem territory) so they're not limited to hits.
**JK's initial answer:** "yes, it does, just need to be sure that weak, normal, hard, and bloop are available on all of those mentioned above; some say only normal/hard and i think bloops can be caught by fielders making great plays (web gems, which are derived by engine) so they're not limited to hits"
**Clarity/Challenge:** CLARITY — agent's original table restricted some options too narrowly.
**JK's final answer:** Contact type is renamed from "exit type" across the entire spec. Five options:

CONTACT TYPE (enrichable on ALL contact plays):
- Normal (default — auto-deselects when another is picked)
- Weak (soft contact, low exit velocity)
- Hard (squared up, high exit velocity)
- Bloop (soft fly ball, dying quail — can be a hit OR caught for an out by a great fielding play)
- Bunt (intentional bunt — covers SAC bunts, bunt groundouts, drag/push bunt singles)

Available on: GO, FO, LO, PO, 1B, 2B, 3B, HR, ITPHR, E, FC, DP, TP, SAC, SF
NOT available on: K, Ꝁ, BB, IBB, HBP, WP_K, PB_K (no contact)

ALL FIVE options are available on ALL contact plays. No restrictions by result type. The engine derives contact quality from the combination:
- Quality contact: Hard + any trajectory, Normal + line drive zone
- Weak contact: Weak + any trajectory, Bloop, Bunt (typically)
- Launch angle (estimated): triangulate contact type + spray zone depth

Bunt is moved from modifier list to contact type. Modifier list is now: KP, NUT, Beat Throw, Beat Runner.
TOOTBLAN and Out Advancing remain on runner-level only (Q44c).
**Confidence:** FIRM
**Status:** DECIDED

### Q49 — Layer 5: BetweenPlayEvent throw sequences — same enrichment mode
**Question:** When the user enriches a BetweenPlayEvent in the play log (e.g., caught stealing), does the defensive lineup enrichment mode (Q24a) also activate for throw sequences? Same pattern — tap CS entry, defensive lineup toggles, user taps fielders to build throw sequence?
**JK's initial answer:** "yes, same enrichment mode"
**Clarity/Challenge:** NONE
**JK's final answer:** Defensive lineup enrichment mode works identically for BetweenPlayEvents as for AtBatEvents. When user taps a BetweenPlayEvent entry in the play log (SB, CS, pickoff, etc.) and needs to record a throw/fielding sequence, the defensive lineup column toggles into enrichment mode — same visual state change (header, accent color, tap-target treatment), same sequence-building behavior, same Done/Clear exit. The throw sequence data is stored on the BetweenPlayEvent rather than the AtBatEvent, but the UX interaction is identical.

Unified rule confirmed: defensive lineup enrichment mode is the ONE way to enter fielding/throw sequences, regardless of whether the event being enriched is an AtBatEvent or BetweenPlayEvent.
**Confidence:** FIRM
**Status:** DECIDED
