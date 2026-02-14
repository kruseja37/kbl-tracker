# TIER 0 BATCH PROMPTS — SKILL-BASED EDITION
# 
# Prerequisites:
#   1. SAFE_FIX_PROTOCOL_SKILL.md installed at:
#      .claude/skills/safe-fix-protocol/SKILL.md
#   2. CLAUDE.md addendum applied
#   3. MANUAL_TESTING_BUG_FIX_PLAN.md saved to spec-docs/
#   4. TIER0_SAFE_EDITION.md saved to spec-docs/
#
# Each phase prompt is short because the rules live in the skill.
# CLI reads the skill at the start of every phase.

---

## PHASE 0: Diagnostic Snapshot

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md for project rules.
Confirm: "Both read and acknowledged."

DIAGNOSTIC ONLY. DO NOT CHANGE ANY CODE.

Setup:
  git status (must be clean)
  npm run dev
  Open Playwright

Do ALL of the following. Screenshot every step.

1. Create fresh franchise (SMB4 / Super Mega League)
   → Screenshot franchise home

2. Check schedule in IndexedDB
   → How many games? How many completed vs scheduled?

3. PLAY a game. Observe:
   → Top 1 pitcher: [name] ([team])
   → Bot 1 pitcher: [name] ([team])  
   → Top 2 pitcher: [name] ([team])
   → VERDICT: pitchers switching? YES/NO

4. Get to 2 outs. Get runner on base. Trigger baserunning out.
   → Does half-inning end at 3 outs? YES/NO/CANNOT TEST

5. Start at-bat. Click OTHER → E → select zone.
   → What happens? COMPLETES / DEAD END / CRASH

6. Play through to expected final inning.
   → Does game end at correct inning? YES/NO
   → Actual innings played: [N]

7. Return to franchise after game.
   → Next game shown (not same)? Schedule updated? Standings updated?

8. Capture ALL console errors.

Save diagnostic to spec-docs/TIER0_DIAGNOSTIC.md with this table:

| Bug | Reproduced? | Details |
|-----|-------------|---------|
| T0-01 End-game trigger | YES/NO/PARTIALLY | |
| T0-02 Pitcher switching | YES/NO/PARTIALLY | |
| T0-03 Basepath 3rd out | YES/NO/CANNOT TEST | |
| T0-04 Error flow | YES/NO/PARTIALLY | |
| T0-05 Game persistence | YES/NO/PARTIALLY | |
| T0-06 Pre-completed games | YES/NO | |

DO NOT PROCEED TO FIXES. Report results and wait.
```

---

## PHASE 1-A: End-Game Trigger (T0-01)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly as described in the skill.
Read CLAUDE.md for project rules.

Bug: T0-01 — End-of-game not triggered at correct inning.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-01 = REPRODUCED.

For Gate 3 (Understand), focus on:
  - Where is end-game checked? (useGameState.ts)
  - What triggers the check? (after half-inning? after out? never?)
  - How many innings is the game configured for? (6? 9? configurable?)
  - Does franchise pass innings config to GameTracker via route state?

Baseball end-game rules for reference:
  - After TOP of final inning: home leads → game over
  - After BOTTOM of final inning: either leads → game over; tied → extras
  - Bottom NOT played if home leads after top of final

Follow all 8 gates. Report in the format specified by the skill.
```

---

## PHASE 1-B: Pitcher Switching (T0-02)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly.
Read CLAUDE.md for project rules.

Bug: T0-02 — Pitcher doesn't change between half-innings.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-02 = REPRODUCED.

For Gate 3 (Understand), focus on:
  - How is current pitcher determined?
  - What happens during half-inning transition?
  - Does the transition swap which team's pitcher is active?
  - What other systems read "current pitcher"? (stats, ratings, display)

The rule:
  - Top of inning: AWAY bats, HOME pitches
  - Bottom of inning: HOME bats, AWAY pitches

CRITICAL RISK: Changing pitcher switching could break:
  - Pitcher stat accumulation (IP, K, BB go to wrong pitcher)
  - W/L decision logic (tracks who pitched which innings)
  - Lineup card display
  
In Gate 4 (Propose), explicitly address each of these risks.

Follow all 8 gates. Report in skill format.
```

---

## PHASE 1-C: Baserunning Outs (T0-03)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly.
Read CLAUDE.md for project rules.

Bug: T0-03 — Baserunning out (CS, thrown out) for 3rd out 
doesn't end the half-inning.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-03 = REPRODUCED.
If CANNOT TEST, attempt to trigger via page.evaluate() or skip.

For Gate 3 (Understand), focus on:
  - Where are baserunning outs recorded? (separate from at-bat outs?)
  - After a baserunning out, is the 3-out check called?
  - Is the 3-out check ONLY wired to at-bat resolution?

CRITICAL RISK: The half-inning-end function may clear runners. 
If it fires mid-baserunning-handler, it could corrupt state.
Ensure the out count increment → 3-out check → half-inning end 
sequence completes cleanly without conflicting with the handler 
that's still running.

Follow all 8 gates. Report in skill format.
```

---

## PHASE 1-D: Error Flow (T0-04)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly.
Read CLAUDE.md for project rules.

Bug: T0-04 — Selecting E from OTHER → zone selection → dead end.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-04 = REPRODUCED.

For Gate 3 (Understand), trace the COMPLETE flow through code:
  1. User clicks OTHER → [what handler?]
  2. User clicks E → [what state change?]
  3. Field zones render → [what component?]
  4. User clicks zone → [what callback?]
  5. After callback → [what should happen?]
  6. WHERE does execution stop?

The complete working flow should be:
  E selected → zone clicked → batter reaches 1B on error → 
  fielder gets E credit → runners advance → at-bat completes → 
  next batter

Find the specific break point. Fix only that break.

Follow all 8 gates. Report in skill format.
```

---

## PHASE 1-E: Game Persistence (T0-05)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly.
Read CLAUDE.md for project rules.

Bug: T0-05 — Completed games don't persist back to franchise. 
Schedule doesn't update. Standings don't update.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-05 = REPRODUCED.

NOTE: We already fixed the STATS pipeline (CRIT-01 through CRIT-06). 
This bug is about SCHEDULE and STANDINGS not updating.

For Gate 3 (Understand), map the post-game pipeline:
  1. Game ends → processCompletedGame() called? (stats)
  2. Schedule game marked completed? (schedule)
  3. Team records updated with W/L? (standings)
  4. FranchiseHome reads next uncompleted game? (display)

For each step: does the function EXIST? Is it CALLED?
A function that exists but is never called is the same as not existing.

Follow all 8 gates. Report in skill format.
```

---

## PHASE 1-F: Fresh Schedule (T0-06)

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates exactly.
Read CLAUDE.md for project rules.

Bug: T0-06 — Fresh franchise has pre-completed games in schedule.
Read spec-docs/TIER0_DIAGNOSTIC.md. Only proceed if T0-06 = REPRODUCED.

For Gate 3 (Understand), check:
  - Schedule generation: does it set any games to "completed"?
  - IndexedDB cleanup: is old data cleared when new franchise created?
  - Shared key space: could old franchise data leak into new one?

Follow all 8 gates. Report in skill format.
```

---

## PHASE 2: Integration Verification

```
Read the safe-fix-protocol skill at .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md for project rules.

INTEGRATION TEST — verify all Tier 0 fixes work TOGETHER.
Only run after all reproduced bugs are individually fixed and committed.

  npm run dev → Playwright

Full play-through:
1. Create fresh franchise → no pre-completed games
2. PLAY game manually:
   □ Pitchers switch each half-inning
   □ Baserunning out at 3 outs ends half-inning (if testable)
   □ Error flow: OTHER → E → zone → batter on 1st
   □ Game ends at correct inning
3. Return to franchise:
   □ Next game shown (not same one)
   □ Standings updated
   □ Schedule shows completed game
4. SIM one game → schedule advances, standings update
5. League Leaders still show real names (regression check)

Report table:
| Fix | Integration Result | Notes |
|-----|-------------------|-------|
| T0-01 | PASS/FAIL | |
| T0-02 | PASS/FAIL | |
| T0-03 | PASS/FAIL/SKIPPED | |
| T0-04 | PASS/FAIL | |
| T0-05 | PASS/FAIL | |
| T0-06 | PASS/FAIL | |
| Regressions | NONE/[details] | |

Save to spec-docs/TIER0_VERIFICATION.md
Update spec-docs/SESSION_LOG.md
```
