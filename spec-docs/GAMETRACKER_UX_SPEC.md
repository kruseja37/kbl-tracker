# GAMETRACKER UX SPEC — V1 Build Document

**Version:** 1.0
**Status:** CANONICAL — Single source of truth for GameTracker UI/UX
**Created:** 2026-03-14
**Source:** Interactive interview with JK (49+ questions, transcript: GAMETRACKER_UX_TRANSCRIPT.md)
**Supersedes:** GAMETRACKER_DRAGDROP_SPEC.md, EnhancedInteractiveField.tsx design intent, GameDiamond.tsx layout assumptions, gospel spec §3.7 5-zone layout, any prior UI layout specs for GameTracker
**Companion to:** MODE_2_FRANCHISE_SEASON_UPDATED.md (logic/data), GAMETRACKER_FUNCTIONAL_TRUTH.md (current state), GAMETRACKER_SCOPE_LOCK.md (code disposition)
**TBD count:** 0 — all items resolved during interview

---

## 1. Physical Context & Design Constraints

The GameTracker is a second-screen companion for SMB4 on console/TV. The user plays SMB4 on the big screen and records outcomes on an iPad. [Q1-Q4]

**Device & orientation:** iPad in landscape, Safari browser. iPad sits flat on the couch cushion to the user's right. [Q1]

**Input model:** Right middle finger is the primary tap finger. Hand rests on lap/at right side between taps. Each tap is a deliberate reach from above — hand comes down to the screen, taps, returns to lap. No thumb-arc optimization applies. [Q1, Q2]

**Pace model:** User-controlled. User pauses SMB4 after an at-bat concludes, records the outcome on iPad, then unpauses. V1 does NOT require input between pitches within an at-bat — input happens after the at-bat is over. There is no time pressure from the game itself. [Q3]

**Attention model:** When recording, the user gives the iPad full visual attention. Full screen real estate is available. The UI does not need to be designed for glance-and-tap. [Q4]

**Design implications:** Since the user has full attention and no time pressure, the UI can be information-dense. Speed still matters (minimize pause duration to maintain gaming immersion), but precision and information density are viable. Touch targets do not need oversized fat-finger tolerance — deliberate taps with full visual attention. [Q1-Q4]

---

## 2. Screen Layout

### 2.1 Layout Architecture

The GameTracker uses a three-layer pinned layout with four content columns. The diamond visualization is removed entirely — replaced by live lineup columns that serve as both information display and interaction surfaces. [Q5]

```
┌─────────────────────────────────────────────────────────────────────┐
│ SCORE BUG (pinned top — single line)                                │
│ NYY 3  |  T7  |  BOS 2  |  ◆◇◇  ●●○            [✓] [Ⓜ] [🔊]   │
├──────────┬──────────┬──────────┬────────────────────────────────────┤
│NewsBoard │ CURRENT  │ CURRENT  │         PLAY LOG                   │
│  1/5     │ BATTERS  │ FIELDERS │          2/5                       │
│          │  1/5     │  1/5     │                                    │
│ Pinned:  │          │          │  T7 Hayata  1B  [+fld] [+loc]      │
│ Game line│ 1.Smith  │ P Bender │      └ Tanaka 2B→3B   [+fld]       │
│ Matchup  │ 2.Jones  │ C Davis  │      └ Hayata →1B                  │
│ ──────── │ 3.Hayata²│ 1B Chen  │  T7 Tanaka  GO  [+fld]             │
│ Scrolls: │  ↑on 2nd │ 2B Park  │  T7 Sato    K                      │
│ Beat rptr│ 4.Tanaka │ SS Lee   │                                    │
│ feed     │ ...      │ ...      │                                    │
├──────────┴──────────┴──────────┴────────────────────────────────────┤
│[K][Ꝁ][GO][FO][LO][1B][BB][2B][HR][···] | [↩ Undo] [End Game]     │
│ QUICK BAR (pinned bottom — full width)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pinned Elements

Two elements are pinned to the viewport at all times and never scroll or move: [Q9a, Q10a]

**Score Bug (top):** Single horizontal line containing all critical game state. [Q7, Q8]

**Quick Bar (bottom):** Full-width outcome button row with utility buttons. [Q10a, Q11]

The four content columns fill the space between score bug and Quick Bar. The page is NOT scrollable — only the play log column and the NewsBoard beat reporter feed scroll internally. [Q9a]

### 2.3 Column Proportions

| Column | Width | Content |
|--------|-------|---------|
| NewsBoard | 1/5 | Pitcher/batter context, matchup, beat reporter feed |
| Current Batters | 1/5 | 9-batter order for team at bat |
| Current Fielders | 1/5 | 9-player order for team in field |
| Play Log | 2/5 | Chronological play-by-play with inline enrichment |

Columns are ROLE-BASED, not team-based. Column 2 is always the batting team. Column 3 is always the fielding team. Teams swap between columns on half-inning changes. [Q34a]

### 2.4 Expanded Scoreboard

Tapping the score bug expands a retro Fenway-style scoreboard (stadium name, inning-by-inning linescore, R/H/E). Takes ~25% of screen height. Overlays downward from the score bug, covering the top portion of the four columns. Quick Bar remains pinned and visible. Tap outside or tap the scoreboard again to collapse. The columns underneath do not move — the overlay just covers them temporarily. [Q5, Q9a]

---

## 3. Score Bug

### 3.1 Layout

Single horizontal line, minimizing vertical footprint (~30-40pt). [Q8]

```
AWAY 3  |  T7  |  HOME 2  |  ◆◇◇  ●●○                    [✓] [Ⓜ] [🔊]
```

Left to right: away team abbreviation + score | inning indicator (T/B + number) | home team abbreviation + score | base-state indicator (TV broadcast diamond) | outs bubbles (filled/empty circles). Far right: save indicator [✓] | manager moment indicator [Ⓜ] | audio toggles [🔊]. Indicators and toggles pushed as far right as possible. [Q7, Q8]

### 3.2 Base-State Indicator

Compact diamond graphic in the style of TV broadcast score bugs. Filled/empty diamonds represent occupied/empty bases. At-a-glance reading surface for base state. [Q5a]

### 3.3 Outs Indicator

Filled/empty circles to the right of the base-state indicator. Three positions, filled = recorded out. [Q7, Q8]

### 3.4 No Count Display

V1 does not track pitch-by-pitch ball/strike count. Total pitches per at-bat is an optional post-at-bat enrichment field. No count display in the score bug. [Q8]

### 3.5 Manager Moment Indicator

Ⓜ icon appears in the score bug area (far right) when leverage index exceeds threshold. Accompanied by a "Stay the Course" button for passive decisions. Clears after the manager moment resolves (active decision taken or passive decision acknowledged). [Q32, Q33]

### 3.6 Save Indicator

Small, static "✓" indicator tucked into the score bug area. Always present (indicating auto-saves are happening). Does NOT visibly update, animate, or flash on each save. Changes to "⚠" only if a write fails. Trust signal, not a distraction. [Q39b]

### 3.7 Audio Toggles

Two toggles: game sounds on/off, beat reporter sounds on/off. Small speaker icons. [Q45a]

---

## 4. Quick Bar

### 4.1 Button Layout

Full-width bar pinned at bottom of viewport. Primary outcome buttons left-to-right, utility buttons separated by a visual divider at far right. [Q10a, Q11, Q44c]

```
[K] [Ꝁ] [GO] [FO] [LO] [1B] [BB] [2B] [HR] [···]  |  [↩ Undo] [End Game]
```

K and Ꝁ (backwards K) are separate buttons — no enrichment toggle needed for called vs. swinging strikeouts. [Q43, Q44c]

### 4.2 Overflow Menu

[···] opens a grid/panel that pops up above the Quick Bar showing all secondary outcome buttons at once. Tap an outcome to record (dismisses panel). Tap outside to dismiss without recording. Panel floats above the Quick Bar — does not replace or displace it. [Q13]

**Overflow contents:** PO, 3B, HBP, E, FC, DP, TP, SAC, SF, IBB, WP_K, PB_K, ITPHR [Q44c]

### 4.3 Visual Feedback on Tap

Button stays depressed/highlighted until the event is fully processed (event saved, runners advanced, play log updated, lineup advanced), then releases. [Q12]

### 4.4 Utility Buttons

Undo and End Game are smaller than outcome buttons, separated by a visual gap/divider. End Game requires "Are you sure?" confirmation prompt. [Q11, Q10a]

### 4.5 Contextual Disabling

Per gospel spec §6.8: SAC disabled when 2 outs; SF disabled when 2 outs or no R3; DP disabled when 2 outs or no runners; TP disabled when <2 runners; D3K disabled when 1B occupied and <2 outs. Disabled buttons are greyed out, not hidden. [LOCK-6]

### 4.6 Three-Phase Quick Bar Lifecycle

The Quick Bar transforms at each game phase: [Q31a, Q35]

| Phase | Quick Bar State |
|-------|----------------|
| PRE-GAME | Outcome buttons disabled/hidden. "START GAME" button centered. |
| LIVE GAME | Full outcome buttons + overflow + Undo + End Game. |
| POST-FINAL-OUT | Outcome buttons disabled. "END GAME" button centered. |

---

## 5. Lineup Columns

### 5.1 Shared Format

Both lineup columns are ordered by batting order (1-9), not by defensive position. Each player entry is two rows in Press Start 2P font: [Q14, Q15, Q15a]

**Top row:** Position abbreviation + player name + jersey number (e.g., "SS Hayata #37")
**Bottom row:** Relevant stats (context-dependent — see below)

All 9 batters are always visible — no scrolling. [Q14]

### 5.2 Batting Lineup Column (Column 2 — always the team at bat)

**Current batter:** Solid outline/border in team's primary color. [Q14]

**Runners on base:** Player row is bolded with a superscript exponent indicating their base (e.g., "3. Hayata²" = on 2nd base). [Q14, Q5a]

**Tapping a runner:** Opens player card with BetweenPlayEvent options (Steal, Advance, WP, PB, Pickoff, etc.) in addition to standard player card actions. [Q5a]

### 5.3 Defensive Lineup Column (Column 3 — always the team in field)

**Current pitcher:** Solid outline/border in team's primary color. Bottom row shows pitch count + pWAR. [Q15, Q15a]

**Fielders:** Bottom row shows current fWAR. [Q15]

**Next-inning leadoff hitter:** Dotted outline in team's secondary color. [Q15]

### 5.4 Enrichment Mode

When the user taps a play log entry to enrich fielding sequence, the defensive lineup column toggles into enrichment mode: [Q24a]

- Column header changes to "FIELDING SEQUENCE" (or similar) in accent color
- Fielder rows get tap-target visual treatment
- Tapping a fielder adds them to the sequence (no player card popover)
- Sequence builds visually as tapped (e.g., "6 → 4 → 3")
- Done/Clear buttons appear to exit mode
- Column returns to normal when enrichment is closed

Enrichment mode works identically for AtBatEvent fielding sequences and BetweenPlayEvent throw sequences (SB, CS, pickoff). [Q49]

### 5.5 Player Card

Tapping any player in either lineup opens a compact player card popup. [Q17, Q18, Q19]

**Stats (season/tournament-scoped):**
- Position players: AVG, HR, RBI, OPS, WAR, SB
- Pitchers: ERA, W-L, K, WHIP, IP, pWAR

**Attributes (from League Builder player ID):** Name, primary/secondary positions, age, gender, ratings, traits, player morale, fitness, mojo. [Q17]

**Action buttons:** [Q28a, Q29, Q31a]

| Action | Available | Description |
|--------|-----------|-------------|
| Sub Out | All phases | Replaces card with full bench list (all players, ungrouped). |
| Swap Position | All phases | Prompts user to tap another in-game player to swap defensive positions. |
| Swap Order | PRE-GAME only | Swaps batting order position with another player without changing fielding positions. Removed after START GAME. |
| Update Mojo | LIVE + POST | Changes player's current mojo state. |
| Update Fitness | LIVE + POST | Changes player's current fitness state. Injury auto-logged by engine when fitness set to "weak", "strained", or "hurt." |

Runner options (additional, when player is on base): Steal, Advance, WP, PB, Pickoff, Out at Home, etc. [Q5a]

---

## 6. NewsBoard (Column 1)

### 6.1 Structure

The NewsBoard is 1/5 width with two zones: [Q20, Q20a]

**Pinned header (always visible):** Current batter's game line, current pitcher's game line, aggregated matchup history (compact stat summary, e.g., "3-for-12, 1 HR, 2 2B, 5 K"). [Q19, Q20a]

**Scrollable feed (below header):** Beat reporter notes, most recent at top. Scrolls independently within the NewsBoard column. [Q20a]

### 6.2 Dynamic Content

NewsBoard refreshes with each batter/pitcher matchup. When an at-bat ends and a new batter comes up, the header updates. When a pitcher is changed, the header refreshes again. [Q20]

### 6.3 Beat Reporter Feed

Beat reporters provide narrative content: anecdotes, milestones, streaks, fan impacts, player morale insights — both positive and negative. Content is contextual (reacts to plays, fielding, stolen bases, scoring). [Q20]

### 6.4 Display Only

The NewsBoard has NO clickable elements. Lineup columns are the sole interaction surface for player actions. Pitcher/batter names in the NewsBoard are not tappable. [Q30]

---

## 7. Play Log (Column 4)

### 7.1 Position & Sizing

Rightmost column at 2/5 width. Scrollable internally. Most recent play at top. [Q5, Q6]

### 7.2 Entry Format

Each at-bat entry shows: inning indicator (T7/B7), batter name (styled in team's primary color), result code, enrichment badges showing what's available to add. [Q23]

```
T7  Hayata  1B   [+fld] [+loc] [+ct]
    └ Tanaka 2B→3B   [+fld]
    └ Hayata →1B
T7  Tanaka  GO   [+fld] [+loc]
T7  Sato    K
```

**Runner sub-entries:** Every runner on base at the time of an at-bat gets a nested sub-entry showing their outcome (default advance or correction). Runner sub-entries are independently enrichable. [Q44e, Q44f]

**Between-play events:** SB, CS, pitching changes, substitutions, manager moments, mojo/fitness changes appear as standalone entries, visually distinct from at-bat entries. [Q23]

### 7.3 Inline Enrichment

Tapping a play log entry expands enrichment fields vertically within the play log column, pushing subsequent plays downward. No east-west expansion — the play log stays at 2/5 width. [Q6]

Enrichment fields are context-sensitive — the engine determines which fields are relevant based on the result type and only shows those. [Q25]

### 7.4 Result Locking

The Quick Bar result code is NOT enrichable — it is the final word on the outcome. Tapping the locked result field shows a subtle tooltip: "Use ↩ Undo to change result." [Q26, Q47]

### 7.5 Structural vs. Enrichment Locking

Within undo depth (10 events): full correction via undo stack. Beyond undo depth: structural outcomes (who scored, who was out, which base reached) are LOCKED. Enrichment fields remain editable forever. [Q46b]

---

## 8. Enrichment System

### 8.1 Enrichment Layers

Every contact play can be enriched across four independent dimensions. All default to their base value. The user only touches what's notable. [Q44a-Q48a]

**Layer A — Fielding Attempt** (how did the fielder physically make the play?)

Two sub-fields: Attempt Type + Attempt Outcome [Q44b]

Attempt Type options:
- Routine (default — auto-deselects when another is picked)
- Diving
- Jumping
- Sliding
- Charging (barehanded, coming in hard)
- Over-the-shoulder (running catch, back to infield)
- Wall (at the wall)
- Robbed HR (at the fence, HR-saving)

Attempt Outcome: Made (default for outs) or Missed (for hits where fielder attempted, errors, HR where outfielder's attempt failed). [Q44b]

**Critical rule:** A missed non-routine catch attempt is NOT an error. Errors only apply when the scorer expects the player to make the play. A missed diving attempt is a fielding chance, not an error. If a player makes an errant throw or mental error AFTER a missed non-routine catch, that IS a separate error. Both the missed catch AND the subsequent error are captured. [Q44b]

**Layer B — Play Mechanic** (what type of play structure unfolded?)

- Routine (default)
- Relay (outfield throw through a middle man)
- Rundown (pickle — runner caught between bases)
- Tag Play (fielder applied tag to runner, not force)
- Unassisted (one fielder completed the entire play alone)
- Deflection (ball bounced off one player, another completed the play)

[Q44a, Q44b]

**Layer C — Contact Type** (how did the ball come off the bat?)

Renamed from "exit type" across the spec. [Q48, Q48a]

- Normal (default)
- Weak (soft contact, low exit velocity)
- Hard (squared up, high exit velocity)
- Bloop (soft fly ball, dying quail — can be hit or caught)
- Bunt (intentional bunt — SAC, bunt groundout, drag/push bunt)

Available on ALL contact plays. Not available on K, Ꝁ, BB, IBB, HBP, WP_K, PB_K. [Q48a]

Engine derives: quality contact = Hard + any trajectory, Normal + line drive zone. Weak contact = Weak, Bloop, Bunt. Launch angle estimated by triangulating contact type + spray zone depth. [Q48a]

**Layer D — Modifiers** (what else happened that matters?)

Play-level modifiers (on the at-bat):
- KP (Killed Pitcher): contact plays only, NOT on HR/SF/SAC
- NUT (Nut Shot): contact plays only, NOT on HR/SF/SAC
- Beat Throw: hits only
- Beat Runner: contact outs only

Runner-level modifiers (on the runner's sub-entry):
- TOOTBLAN: runner's baserunning blunder — runner's fault
- Out Advancing: manager sent runner, thrown out — manager's fault (feeds mWAR)

[Q42, Q44c]

### 8.2 Field Location (Spray Graphic)

Inline SVG fan-shaped field graphic inside the expanded play log entry. Chalk-line aesthetic matching Scoreboard Chalk Retro theme. Context-sensitive zone sets per result type: [Q27a-Q27d]

| Result | Zones Shown | Count |
|--------|-------------|-------|
| HR | 7 directions × 3 depths (just over, medium, blast) | 21 |
| ITPHR | IF + OF (no foul, no HR zones) | 42 |
| GO | Infield only: 6 dirs × 3 depths | 18 |
| FO | OF + foul: 6 dirs × 4 depths + 3 foul | 27 |
| LO | OF + med/deep IF: 6 dirs × (2 IF + 4 OF) + 3 foul | 39 |
| PO | IF + shallow OF + foul: 6 dirs × (3 IF + 1 OF) + 3 foul | 27 |
| 1B/2B/3B | IF + OF: 6 dirs × (3 IF + 4 OF) | 42 |
| E | IF + OF | 42 |

Graphic height adapts to zone count. Single-tap design target — two-step fallback (direction then depth) only if implementation testing reveals accuracy problems. [Q27d]

**Zone directions (6):** LF line, LF, LC, C, RC, RF line
**Outfield depths (4):** Shallow, normal, deep, warning track
**Infield depths (3):** Shallow, medium, deep
**HR depths (3):** Just over fence, medium, blast
**Foul zones (3):** Foul-left, foul-right, foul-center (behind plate)

### 8.3 Fielding Sequence

Entered via defensive lineup enrichment mode (§5.4). User taps fielders in the defensive lineup column to build the sequence. Sequence displays as position numbers (e.g., "6 → 4 → 3"). [Q24a]

Works identically for AtBatEvent fielding and BetweenPlayEvent throw sequences. [Q49]

### 8.4 Other Enrichment Fields

- **HR distance:** Numeric input (SMB4 displays distance on screen). [LOCK-5]
- **Pitch type:** Selector filtered by current pitcher's repertoire. Available on all plays including BB. [Q48a]
- **Pitch count per at-bat:** Numeric input — total pitches in the at-bat. 7+ = QAB. [LOCK-5]
- **Pitch count per half-inning:** Prompted at end of each half-inning (compact modal overlay) and on pitcher removal. [Q30, Q34a]
- **Error type:** Fielding / Throwing / Mental — on E results. [gospel spec §3.5]
- **Error by:** Position selector — on E results. [gospel spec §3.5]
- **Batter destination on errors:** Which base the batter reached (1B/2B/3B). [gospel spec §3.5]
- **WP_K/PB_K batter destination:** If batter reaches beyond 1B due to subsequent error. [Q44b]

### 8.5 Result-to-Enrichment Map

| Result | Spray | Fielding Attempt | Play Mechanic | Contact Type | Modifiers | Other |
|--------|-------|-----------------|---------------|-------------|-----------|-------|
| K | — | — | — | — | — | Pitch type, pitch count |
| Ꝁ | — | — | — | — | — | Pitch type, pitch count |
| GO | IF (18) | All types, Made | All | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| FO | OF+foul (27) | All types, Made | Relay, Tag Play | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| LO | OF+IF (39) | All types, Made | All | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| PO | IF+OF+foul (27) | All types, Made | Tag Play | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| 1B/2B/3B | IF+OF (42) | All types, Missed | Relay, Tag Play | All 5 | KP, NUT, Beat Throw | Fielding seq, pitch type, pitch count |
| HR | HR (21) | Missed Robbed HR only | — | All 5 | — | HR distance, pitch type, pitch count |
| ITPHR | IF+OF (42) | All types, Missed | Relay, Tag Play | All 5 | KP, NUT | Fielding seq, pitch type, pitch count |
| BB | — | — | — | — | — | Pitch type, pitch count |
| IBB | — | — | — | — | — | Pitch count |
| HBP | — | — | — | — | — | Pitch type, pitch count |
| E | IF+OF (42) | All types, Made or Missed | All | All 5 | KP, NUT | Fielding seq, error type, error by, batter dest, pitch type, pitch count |
| FC | IF (18) | All types, Made | Tag Play, Unassisted, Deflection | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| DP | IF+OF (42) | All types | Unassisted, Relay, Rundown, Deflection | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| TP | IF+OF (42) | All types | Unassisted, Rundown | All 5 | KP, NUT, Beat Runner | Fielding seq, pitch type, pitch count |
| SAC | IF (18) | All types | Tag Play | All 5 | — | Fielding seq, pitch type, pitch count |
| SF | OF (24) | All types | Relay | All 5 | — | Fielding seq, pitch type, pitch count |
| WP_K | — | — | — | — | — | Pitch type, pitch count, batter dest if beyond 1B |
| PB_K | — | — | — | — | — | Pitch type, pitch count, batter dest if beyond 1B |

### 8.6 Two-Pathway Enrichment Model

Play-level enrichment and runner-level enrichment are separate concerns stored in separate data locations: [Q44c-Q44f]

**Play-level (on the AtBatEvent):** Describes the batted ball — fielding sequence, field location, contact type, catch quality, play mechanic, pitch type, pitch count, KP/NUT/Beat Throw/Beat Runner.

**Runner-level (on AtBatEvent.runnerOutcomes[]):** Describes what happened to a specific runner — destination correction, fielding/throw sequence on the runner play, play mechanic (relay, tag play), TOOTBLAN, Out Advancing.

**BetweenPlayEvent enrichment (SB, CS, pickoff, etc.):** Describes a between-at-bat event — throw sequence, play mechanic, TOOTBLAN/Out Advancing.

**One enrichment surface:** The play log is the ONE place enrichment happens. Player cards initiate events; the play log records them; enrichment always happens by tapping a play log entry or sub-entry. [Q44f]

### 8.7 Default Attribution

AtBatEvents auto-snapshot current pitcher and batter context. BetweenPlayEvents auto-assign current pitcher and catcher at event creation time. User can override defaults if needed. [Q44g]

---

## 9. Substitutions & Between-Play Actions

### 9.1 Substitution Flow (Player-First)

Tap player in lineup → player card opens → "Sub Out" → card content replaced with full bench list (all players regardless of position, ungrouped) → select replacement. [Q28a]

For pitcher changes: after selecting replacement, pitch count prompt fires for outgoing pitcher. [Q30]

### 9.2 Position Swap Flow

Tap player in lineup → player card → "Swap Position" → user taps another in-game player → positions swap. [Q28a]

### 9.3 Batting Order Swap (Pre-Game Only)

Tap player in lineup → player card → "Swap Order" → user taps another player → batting order positions swap without changing fielding positions. This option is removed from the player card after START GAME. [Q31a]

### 9.4 Runner Actions

Tap a runner (bolded with base exponent) in batting lineup → player card opens with additional runner options: Steal, Advance, WP, PB, Pickoff, Out at Home, etc. [Q5a]

Selecting a runner action creates a BetweenPlayEvent that appears as a standalone entry in the play log. Enrichment happens via the play log entry, not the player card. [Q44f]

### 9.5 Mojo & Fitness Updates

Tap any player → player card → "Update Mojo" or "Update Fitness." Injury is auto-logged by the engine when fitness is set to "weak," "strained," or "hurt." [Q29]

### 9.6 Manager Moments

When LI exceeds threshold: Ⓜ indicator appears in score bug (far right). [Q32]

- **Active path:** User makes a sub/steal/etc. through normal player card flow → system tags it as manager moment → play log entry records decision + outcome when resolved.
- **Passive path:** User taps "Stay the Course" button → system logs "stayed the course" → next play's outcome updates the entry with WPA. [Q33]

Manager moment play log entries are two-phase — they log the decision first, then update with the outcome. [Q32]

---

## 10. Game Flow & Transitions

### 10.1 Three-Phase Lifecycle

| Phase | Entry | Quick Bar | Rules |
|-------|-------|-----------|-------|
| PRE-GAME | GameTracker launch | "START GAME" button | Free lineup editing, all changes reversible, "Swap Order" available. |
| LIVE GAME | "START GAME" tap + confirmation | Full outcome buttons | Permanent subs, no re-entry, pitch count on pitcher removal, batting order locked. |
| POST-FINAL-OUT | System detects game over | "END GAME" button | Final enrichment window, pitch count prompt for last pitcher. |

"START GAME" requires confirmation: "Lock lineups and begin recording?" [Q31a]

### 10.2 Half-Inning Transition

1. Third out recorded → pitch count modal overlay fires (compact, center-screen, numeric input + Skip). [Q34a]
2. After dismissal → lineup columns swap content (role-based: column 2 = batting team, column 3 = fielding team). Score bug inning indicator updates. NewsBoard refreshes. Batter/pitcher highlights shift. [Q34a]
3. No between-inning summary screen. Beat reporter notes about the completed half-inning appear at top of NewsBoard feed. [Q34a]
4. Transition is instant — no animation. [Q34a]

### 10.3 End of Game

**Natural ending:** System detects final out / walk-off → notification + final pitch count prompt → Quick Bar switches to "END GAME" → user can enrich freely → tap "END GAME" → PostGameSummary. [Q35]

**Manual ending:** User taps End Game → "Are you sure?" → pitch count prompt → PostGameSummary. [Q35]

### 10.4 Extra Innings

Score bug gets a visual indicator for extras. Expanded scoreboard handles >9 inning columns (scrollable or condensed). Beat reporter surfaces extra-innings narratives. No structural layout changes. [Q36]

### 10.5 Mid-Game Resume

All events write to IndexedDB immediately on commit. No manual save needed. If the user closes the app mid-game, navigating back to the gameId replays the event log and restores full game state. Franchise home / elimination home / "Today's Game" surfaces a "Resume Game" entry point for incomplete games. [Q39b]

---

## 11. Visual Identity

### 11.1 Theme: Scoreboard Chalk Retro

Established design language carried into the GameTracker: [Q16]

- **Font:** Press Start 2P throughout (Google Font — retro 8-bit/arcade aesthetic)
- **Background:** Muted olive/sage green (aged chalkboard)
- **Panels:** Lighter green for content sections against darker green background
- **Text:** White/cream (chalk-on-board)
- **Accents:** Team colors for outlines and highlights only
- **Style:** Flat, no shadows, generous spacing

### 11.2 Expanded Scoreboard

Retro Fenway Park-inspired design with home team's stadium name at top. Inning-by-inning linescore, R/H/E. Visual reference: Green Monster scoreboard. [Q5]

### 11.3 Backwards K

Called strikeouts display as a backwards K emblem (mirrored K character) throughout the UI — Quick Bar button, play log entries, and anywhere strikeout type is shown. Standard baseball convention. [Q43]

### 11.4 Animation Philosophy: CSS-Only, Cosmetic-Only

Safe animations (implement in V1): [Q37a]
- Quick Bar button press/release: 100ms background-color transition
- Play log new entry: fade-in or slide-down via CSS opacity/transform
- Score bug run scored: number briefly highlights (bright 200ms, fades to white)
- Lineup row updates: brief highlight on changed row
- Undo toast: CSS fade-in/fade-out

Avoid in V1: anything that delays event processing, moves tap targets mid-animation, requires JS animation libraries, or implies intermediate states. [Q37a]

Rule: CSS `transition` on a single element = safe. JS orchestration = V2.

### 11.5 Audio

Retro 8-bit audio feedback matching the Scoreboard Chalk Retro aesthetic: [Q45a]

**Game sounds (global toggle, default ON):**
- Quick Bar tap: mechanical scoreboard flip click
- Run scores: 8-bit ascending chime (~300ms)
- HR / ITPHR: 8-bit fanfare, 4-note ascending (~500ms)
- Strikeout: descending two-note tone
- End of half-inning: short 8-bit whistle/arpeggio
- Undo: descending rewind bloop
- Start Game / End Game: 8-bit jingle (~1 second)

**Ambient sounds (separate toggle, default ON):**
- Beat reporter blurb: short typewriter sound

**Silent:** Play log scrolling, enrichment actions, runner corrections, NewsBoard updates, lineup updates.

**Haptics:** None in V1 (inconsistent Safari support). [Q45a]

---

## 12. Edge Cases & Error Recovery

### 12.1 Undo

10-deep undo stack. Undo button at far right of Quick Bar row. [LOCK-10, Q11]

Visual feedback: play log entry disappears/reverts, lineup state rolls back, score bug updates, toast message appears: "Undone: [inning] [batter] [result]." [Q38]

### 12.2 Wrong Outcome Button

Result codes are not enrichable — undo + re-record is the only correction path. Tapping a locked result field shows a subtle tooltip: "Use ↩ Undo to change result." [Q47]

### 12.3 Runner Correction Beyond Undo Depth

Within undo depth: full correction via undo stack. Beyond undo depth: structural runner outcomes (scored, out, base reached) are LOCKED. Enrichment fields remain editable forever. V2 adds full retroactive correction with replay. [Q46b]

### 12.4 Network Loss

Non-issue for V1. All data is 100% local in IndexedDB. No server, no cloud sync, no network dependency during gameplay. [Q39]

### 12.5 App Close / Resume

Events persist to IndexedDB on every commit. Reopening an incomplete game replays the event log to restore state. "Resume Game" entry points surface in franchise/elimination home screens. [Q39b]

### 12.6 Batch Catch-Up

No special mode needed. The GameTracker has no awareness of console state. If the user falls behind, they tap Quick Bar multiple times and correct/enrich after. [Q40]

---

## 13. Data Model Implications

UX decisions from this spec that require data model changes (each references the interview question where the decision was made): [Q44e, Q44c, Q48a, Q44b, Q43, Q31a, Q44g]

1. **`runnerOutcomes[]` array on AtBatEvent** — Runner outcomes that occur as part of the at-bat (not between at-bats) belong on the AtBatEvent as a sub-event array, each independently enrichable with fielding sequence, play mechanic, catch quality, and runner-level modifiers. [Q44e]

2. **Contact type replaces exit type** — Five options: Normal, Weak, Hard, Bloop, Bunt. Available on all contact plays. [Q48a]

3. **Bunt moved from modifier to contact type** — Bunt is a type of contact, not a play modifier. [Q48a]

4. **TOOTBLAN and Out Advancing are runner-level** — These modifiers live on the runner outcome (AtBatEvent.runnerOutcomes[] or BetweenPlayEvent), not on the play-level enrichment. [Q44c]

5. **ITPHR added to AtBatResult** — Inside-the-park home run as a distinct result type in the overflow menu. [Q44c]

6. **K and Ꝁ are separate AtBatResult values** — No longer a post-hoc enrichment toggle on a single K type. Backwards K (Ꝁ) is a display convention throughout the UI. [Q43, Q44c]

7. **Pre-game phase state** — GameTracker needs a phase field (PRE_GAME, LIVE, POST_FINAL_OUT) that gates which actions are available. "Swap Order" is pre-game only. [Q31a]

8. **BetweenPlayEvent auto-snapshots battery** — Current pitcher and catcher auto-assigned at event creation for all BetweenPlayEvents. [Q44g]

9. **Fielding attempt as two sub-fields** — Attempt Type + Attempt Outcome (Made/Missed) rather than a single catch type. Supports the "missed non-routine catch ≠ error" rule. [Q44b]

10. **Play mechanic includes Deflection** — Ball bouncing off one player and completed by another is a distinct play structure. [Q44b]

---

## 14. What This Spec Does NOT Cover

These are explicitly out of scope — they belong to companion specs, not this UX spec:

- **AtBatEvent and BetweenPlayEvent interfaces** — MODE_2_FRANCHISE_SEASON_UPDATED.md §2
- **Runner advancement defaults and baseball rules** — MODE_2_FRANCHISE_SEASON_UPDATED.md §6
- **Stats pipeline calculations** — MODE_2_FRANCHISE_SEASON_UPDATED.md §8-§11
- **WAR calculations (all 5 components)** — MODE_2_FRANCHISE_SEASON_UPDATED.md §11
- **Leverage index and win probability** — MODE_2_FRANCHISE_SEASON_UPDATED.md §12
- **Clutch attribution** — MODE_2_FRANCHISE_SEASON_UPDATED.md §13
- **Narrative system and beat reporter content generation** — MODE_2_FRANCHISE_SEASON_UPDATED.md §16
- **Dynamic designations** — MODE_2_FRANCHISE_SEASON_UPDATED.md §17
- **Milestone detection logic** — MODE_2_FRANCHISE_SEASON_UPDATED.md §18
- **Fan morale calculations** — MODE_2_FRANCHISE_SEASON_UPDATED.md §20
- **PostGameSummary page design** — separate spec TBD
- **Franchise home / elimination home "Resume Game" UX** — impacts those pages, not the GameTracker itself

---

## Appendix A: Full Interview Transcript

See: `spec-docs/GAMETRACKER_UX_TRANSCRIPT.md` (49+ questions, complete verbatim transcript)

---

## Appendix B: Decision Log

| ID | Decision | Source | Confidence |
|----|----------|--------|------------|
| UX-001 | Right middle finger, iPad flat on cushion, hand from above | Q1, Q2 | FIRM |
| UX-002 | User pauses SMB4, full attention on iPad when recording | Q3, Q4 | FIRM |
| UX-003 | 4-column layout: NewsBoard, Batting Lineup, Defensive Lineup, Play Log | Q5 | FIRM |
| UX-004 | Diamond removed — base state via lineup exponents + score bug indicator | Q5a | FIRM |
| UX-005 | Column proportions: 1/5, 1/5, 1/5, 2/5 | Q6 | FIRM |
| UX-006 | Score bug single-line: teams, scores, inning, base state, outs | Q7, Q8 | FIRM |
| UX-007 | No pitch-by-pitch count in V1 | Q8 | FIRM |
| UX-008 | Expanded scoreboard overlays downward, Quick Bar pinned | Q9a | FIRM |
| UX-009 | Quick Bar at bottom, score bug at top, not flipped | Q10a | FIRM |
| UX-010 | Undo + End Game at far right of Quick Bar with divider | Q11 | FIRM |
| UX-011 | Button stays depressed until processing complete | Q12 | FIRM |
| UX-012 | Overflow menu: grid/panel floating above Quick Bar | Q13 | FIRM |
| UX-013 | All 9 batters visible, current batter outlined in team primary color | Q14 | FIRM |
| UX-014 | Both lineups ordered by batting order with position + name + jersey # | Q15 | FIRM |
| UX-015 | Press Start 2P font, two-row player entries | Q15a | FIRM |
| UX-016 | Scoreboard Chalk Retro theme confirmed | Q16 | FIRM |
| UX-017 | Player card: compact stats + full attributes + action buttons | Q17 | FIRM |
| UX-018 | Player card stats: AVG/HR/RBI/OPS/WAR/SB (pos) or ERA/W-L/K/WHIP/IP/pWAR (pitch) | Q18 | FIRM |
| UX-019 | Player card = season stats; NewsBoard = game stats | Q19 | FIRM |
| UX-020 | NewsBoard: pinned stats header + scrollable beat reporter feed | Q20a | FIRM |
| UX-021 | Matchup history is aggregated stats, not at-bat log | Q20a | FIRM |
| UX-022 | Post-commit runner correction (no pre-commit gate) | Q22 | FIRM |
| UX-023 | Play log entries with team-color styled player names | Q23 | FIRM |
| UX-024 | Defensive lineup enrichment mode for fielding sequences | Q24a | FIRM |
| UX-025 | Context-sensitive enrichment fields per result type | Q25 | FIRM |
| UX-026 | Quick Bar result NOT enrichable — undo to correct | Q26 | FIRM |
| UX-027 | Catch type included in V1, defaults to Routine, applies to outs AND hits | Q26, Q26a | FIRM |
| UX-028 | Context-sensitive spray graphic with result-specific zones | Q27d | FIRM |
| UX-029 | HR zones: 7 directions × 3 depths = 21 | Q27b, Q27c | FIRM |
| UX-030 | Player-first substitution flow | Q28a | FIRM |
| UX-031 | Mojo/fitness on player card, injury auto-inferred from fitness level | Q29 | FIRM |
| UX-032 | Pitch count prompted after replacement selection + every half-inning | Q30 | FIRM |
| UX-033 | NewsBoard is display-only, no clickable names | Q30 | FIRM |
| UX-034 | Pre-game phase with START GAME gate is V1 | Q31a | FIRM |
| UX-035 | Swap Order available pre-game only | Q31a | FIRM |
| UX-036 | Manager moment: Ⓜ indicator (far right of score bug) + Stay the Course for passive decisions | Q32, Q33 | FIRM |
| UX-037 | Half-inning: pitch count prompt → role-based column swap → no summary screen | Q34a | FIRM |
| UX-038 | Three-phase lifecycle: Pre-game → Live → Post-final-out | Q35 | FIRM |
| UX-039 | CSS-only cosmetic animation philosophy | Q37a | FIRM |
| UX-040 | Undo toast message: "Undone: [inning] [batter] [result]" | Q38 | FIRM |
| UX-041 | 100% local IndexedDB, no network dependency, auto-save | Q39 | FIRM |
| UX-042 | Resume Game entry points on franchise/elimination home | Q39b | FIRM |
| UX-043 | Subtle save indicator, no manual save button | Q39b | FIRM |
| UX-044 | No batch catch-up mode needed | Q40 | FIRM |
| UX-045 | Fielding play type IS a separate enrichment dimension | Q41 | FIRM |
| UX-046 | KP/NUT not on HR/SF/SAC | Q44a | FIRM |
| UX-047 | TOOTBLAN and Out Advancing are runner-level only | Q44c | FIRM |
| UX-048 | K and Ꝁ as separate Quick Bar buttons | Q44c | FIRM |
| UX-049 | ITPHR added to overflow menu | Q44c | FIRM |
| UX-050 | Runner outcomes on AtBatEvent as runnerOutcomes[] array | Q44e | FIRM |
| UX-051 | Runner sub-entries visible in play log under each at-bat | Q44f | FIRM |
| UX-052 | Play log is the ONE enrichment surface — player card initiates only | Q44f | FIRM |
| UX-053 | BetweenPlayEvents auto-snapshot current pitcher/catcher | Q44g | FIRM |
| UX-054 | Retro 8-bit audio with two toggles (game sounds + beat reporter) | Q45a | FIRM |
| UX-055 | Runner outcomes locked past undo depth in V1 | Q46b | FIRM |
| UX-056 | Subtle "Use ↩ Undo to change result" tooltip on locked results | Q47 | FIRM |
| UX-057 | Contact type (5 options) replaces exit type | Q48a | FIRM |
| UX-058 | Same enrichment mode for AtBatEvent and BetweenPlayEvent sequences | Q49 | FIRM |

---

## Appendix C: Open Items (TBD)

None. All items resolved during interview.
