# TIER 1: WRONG RESULTS — Fix Plan
#
# 11 issues from manual testing. Game completes but data is wrong.
# Uses safe-fix-protocol for each fix.
#
# POST-TIER-0 REASSESSMENT:
#   T1-01 (fame events): T0-02 (pitcher switch) fixed the stat 
#     attribution. Fame may still have per-player tracking issues.
#   T1-07 (scoreboard): T0-13 auto-resolved in Tier 0 verification. 
#     MAY BE FIXED — needs re-check.
#   T1-08 (post-game summary): T0-06 (inflated stats) was caused by 
#     phantom data + pitcher not switching. With both fixed, post-game 
#     MAY BE BETTER — needs re-check.
#
# EXECUTION ORDER (by dependency):
#   Phase 1: DIAGNOSTIC — Re-check T1-01, T1-07, T1-08 (may be resolved)
#   Phase 2: T1-09 — Mojo/Fitness factors (affects all stat calculations)
#   Phase 3: T1-10 — Pitcher rotation in SIM (affects season stats)
#   Phase 4: T1-02, T1-03, T1-04 — Runner identity bugs (related cluster)
#   Phase 5: T1-05, T1-06 — Fielding inference + error prompt (related)
#   Phase 6: T1-11 — SMB4 traits verification
#   Phase 7: Verify all + re-check T1-01/07/08

---

## PHASE 1: RE-CHECK — Which Tier 1 bugs still exist?

Three Tier 1 bugs may have been resolved by Tier 0 fixes.
Check before writing fixes.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md.
Confirm: "Both read and acknowledged."

DIAGNOSTIC ONLY — DO NOT CHANGE CODE.

Play a franchise game in Playwright. During and after the game, 
check these three issues:

=== T1-01: Fame events tied to wrong player ===

Play through several at-bats. Watch for fame popups.
When a fame event fires:
  - Which player does it attribute to?
  - Is that the correct player? (the one who actually did the thing)
  - Does it correctly track INDIVIDUAL players, not aggregate to team?

Specifically test: if Player A hits a HR and Player B strikes out, 
do fame events correctly attribute to A and B separately?

Report: RESOLVED / STILL BROKEN — [details]

=== T1-07: Runs scored display sporadic on scoreboard ===

Tier 0 verification showed scoreboard updating correctly (1R/1H 
for Wild Pigs after HR). But the original report said it was 
sporadic — sometimes showing, sometimes not.

Play through at least 3 innings with runs scored. Check:
  - Does every run appear in the correct inning cell?
  - Does the R/H/E line update correctly?
  - Minimize and expand the scoreboard — does data persist?

Report: RESOLVED / STILL BROKEN — [details]

=== T1-08: End-of-game summary broken ===

Complete the game. Check post-game summary:
  - Are stats assigned to the correct players?
  - Does box score show stats from THIS game only?
  - Are batters listed in the box score?
  - Is the POG (Player of the Game) reasonable?

Compare against what the diagnostic showed before (IP=25.2, SO=56).
Are stats now reasonable? (starter IP ≤ 6.0, K ≤ 18 for 6 innings)

Report: RESOLVED / STILL BROKEN — [details]

=== SUMMARY ===

| ID | Issue | Status |
|----|-------|--------|
| T1-01 | Fame per-player tracking | RESOLVED / STILL BROKEN |
| T1-07 | Scoreboard display | RESOLVED / STILL BROKEN |
| T1-08 | Post-game summary | RESOLVED / STILL BROKEN |

Save to spec-docs/TIER1_DIAGNOSTIC.md.
Report results and wait for direction.
```

---

## PHASE 2: Mojo/Fitness Factors — T1-09

This affects all mojo-adjusted calculations. Fix early so 
downstream stat calculations use correct weights.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T1-09 — Mojo/Fitness weighted factors may be backwards.
Report says "Locked In is 1.1x but increased mojo should give 
temporarily higher ratings."

=== GATE 3: UNDERSTAND ===

STEP 1 — Find mojo/fitness multiplier definitions:
  grep -rn "mojoMultiplier\|fitnessMultiplier\|mojoFactor\|fitnessFactor\|LOCKED_IN\|lockedIn\|MojoState\|mojoWeight" \
    src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v node_modules | head -30
Paste ALL output.

STEP 2 — Read the multiplier values:
Find where mojo states map to multiplier values. Paste the full 
mapping (e.g., LOCKED_IN → 1.1, ON_FIRE → 1.2, COLD → 0.9, etc.)

STEP 3 — Understand the intended direction:
In SMB4:
  - HIGH mojo (Locked In, On Fire) = player performs BETTER
  - LOW mojo (Cold, Slumping) = player performs WORSE
  - HIGH fitness (Fresh) = player performs BETTER
  - LOW fitness (Tired, Exhausted) = player performs WORSE

How are these multipliers USED in calculations?
  grep -rn "mojoMultiplier\|fitnessMultiplier\|mojoFactor\|applyMojo\|adjustForMojo" \
    src/ --include="*.ts" | grep -v ".test." | head -20
Paste output. Read one usage. Paste it.

Is the multiplier applied as:
  a) rating * multiplier (1.1 = 10% boost) → CORRECT if high mojo = high multiplier
  b) difficulty * multiplier (1.1 = 10% harder) → BACKWARDS if high mojo = high multiplier
  c) something else?

STEP 4 — Determine if actually backwards:
Based on Steps 2-3, are the values correct or inverted?
State clearly: "The values ARE correct because..." or "The values 
ARE backwards because..."

If backwards: what should they be?
If correct: report "NOT A BUG — values are correct" and explain why.

=== GATE 4+: Only if actually backwards ===

If it's a real bug, propose and implement the fix.
If NOT a bug, skip to commit with: 
  "T1-09: VERIFIED CORRECT — no fix needed"

Follow remaining gates only if implementing a fix.
```

---

## PHASE 3: Pitcher Rotation in SIM — T1-10

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T1-10 — Franchise SIM doesn't correctly handle SP/RP/CL roles.
Example: Manny Kays is a starter (SP) but won reliever of the year 
with 48 saves during a simulated season.

=== GATE 3: UNDERSTAND ===

STEP 1 — Find the SIM's pitcher selection logic:
  grep -rn "startingPitcher\|selectPitcher\|pitcherRotation\|choosePitcher\|simPitcher\|getStarter" \
    src/ --include="*.ts" | grep -v ".test." | grep -v node_modules | head -20
Paste ALL output.

STEP 2 — Read the SIM engine:
  grep -rn "simGame\|simulateGame\|batchSim\|autoSim" \
    src/ --include="*.ts" | grep -v ".test." | grep -v node_modules | head -20
Paste output. Find the game simulation function. Read how it picks 
pitchers. Paste the relevant section.

Does it:
  a) Use a proper rotation (SP1 → SP2 → SP3 → SP4 → SP5)?
  b) Distinguish SP from RP from CL?
  c) Just pick randomly or always use the same pitcher?

STEP 3 — Check player position data:
  grep -rn "position.*SP\|position.*RP\|position.*CL\|pitcherRole\|pitchingRole" \
    src/ --include="*.ts" | grep -v ".test." | grep -v node_modules | head -20
Paste output.

Do players have SP/RP/CL designations in their data?

STEP 4 — Check save/win attribution in SIM:
  grep -rn "save\|win\|loss\|decision\|assignWin\|assignSave" \
    src/utils/processCompletedGame.ts src/engines/ -r --include="*.ts" | head -20
Paste output. Read the W/L/SV attribution logic. 

Does it correctly:
  - Give wins to starters (5+ IP) or relievers (team takes lead)?
  - Give saves to closers (finish game with ≤3 run lead)?
  - NOT give saves to starters?

=== GATE 4: PROPOSE ===

This could be a LARGE fix if the SIM has no pitcher rotation logic.
Classify: QUICK FIX / MEDIUM / LARGE

If LARGE (no rotation exists): build a basic rotation system:
  - 5 SPs rotate through starts
  - RPs used in relief (6th-8th innings of sim)
  - CL used in save situations (9th/final inning)
  - Saves only awarded to non-starters

If MEDIUM (rotation exists but doesn't filter by role):
  - Add SP/RP/CL filtering to pitcher selection

If QUICK (logic exists but has a bug):
  - Fix the specific bug

=== GATES 5-8: Standard protocol ===

For GATE 7: SIM 10+ games. Check:
  - Do different starters appear across games?
  - Do saves go to relievers/closers, not starters?
  - Are win/loss decisions reasonable?

  git add -u && git commit -m "T1-10: Fix pitcher rotation and role-based usage in SIM"
```

---

## PHASE 4: Runner Identity Bugs — T1-02, T1-03, T1-04

These three are related: player identity is lost on the basepaths.
Fix together but diagnose individually.

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

THREE RELATED BUGS — Runner identity on basepaths.

First, diagnose all three. Then fix. One commit per bug.

=== T1-02: Pinch runner doesn't get credit ===

GATE 2 (Reproduce): 
  In Playwright, get a runner on base. Sub in a pinch runner.
  Check: does the runner name on base change to the new player?
  If the runner scores or steals, check: does the PR get credit?

GATE 3 (Understand):
  grep -n "pinchRunner\|pinch.*runner\|substituteRunner\|replaceRunner\|swapRunner" \
    src/src_figma/hooks/useGameState.ts | head -20
  grep -n "pinchRunner\|pinch.*runner" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste ALL output.

Read the pinch runner substitution code. When a PR is inserted:
  - Does it update the runner's playerId on the base? YES/NO
  - Does it update the runner's name in the display? YES/NO
  - If the runner later scores, which playerId gets the run? 
    Original batter or PR?

=== T1-03: Runner name becomes "R3" after stolen base ===

GATE 2 (Reproduce):
  Get runner on 1B or 2B. Trigger a stolen base to 3B.
  Check: does the runner name change to "R3"?

GATE 3 (Understand):
  grep -n "R1\|R2\|R3\|runnerLabel\|runnerName\|baseRunner.*name\|runnerDisplay" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste output.

Is the display using actual player names or generic labels 
(R1/R2/R3) for base positions? If generic: the display needs to 
read from game state (which tracks real player IDs).

=== T1-04: Ghost runner after thrown out advancing ===

GATE 2 (Reproduce):
  Get a hit where batter tries to advance (e.g., single, tries 
  for 2B, thrown out). Check: does a runner icon remain on base?

GATE 3 (Understand):
  When a runner is thrown out advancing:
  grep -n "thrownOut\|outAdvancing\|runnerOut\|advanceOut\|removeRunner" \
    src/src_figma/hooks/useGameState.ts | head -20
Paste output.

Is the runner removed from base state after being thrown out? 
Or does the state still show them on base?

=== FIX EACH, ONE COMMIT PER BUG ===

After diagnosing all three, fix them one at a time.
Each gets its own Gates 4-8 cycle and commit.

If any cannot be reproduced in Playwright: report and skip.
```

---

## PHASE 5: Fielding Inference — T1-05, T1-06

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

TWO RELATED BUGS — fielding credit inference.

=== T1-05: Drag-and-drop fielding inference not auto-inferring ===

REPORT: User drags 3B → 2B → 1B, selects DP, but is STILL 
prompted to assign putouts and assists manually.

GATE 3 (Understand):
  grep -rn "inferFielding\|autoAssign\|putout\|assist\|fieldingCredit\|assignFielding\|dragFielder" \
    src/src_figma/ --include="*.tsx" --include="*.ts" | head -30
Paste ALL output.

Read the fielding inference logic. Does it exist?
  IF YES: why isn't it working? What's the gap?
  IF NO: is there infrastructure to build on, or is this a new feature?

Standard inference rules:
  - Last fielder in chain gets putout
  - All other fielders get assists
  - DP: two putouts (one per out), assists to all others in chain
  - Flyout: catching fielder gets putout
  - Flyout + tag throw: catcher gets putout, thrower gets assist

=== T1-06: OUT triggers error prompt incorrectly ===

REPORT: Selecting OUT and dragging infielder → 1B sometimes 
triggers an error prompt even though E wasn't selected.

GATE 3 (Understand):
  grep -n "errorPrompt\|showError\|errorModal\|askError\|errorQuestion" \
    src/src_figma/app/pages/GameTracker.tsx | head -20
Paste output.

When does the error prompt fire? What condition triggers it?
Is it firing on ANY fielding play, or only under certain conditions?

=== FIX EACH, ONE COMMIT PER BUG ===

T1-05 may be a LARGE fix if no inference logic exists.
T1-06 is likely a QUICK FIX (wrong condition on error prompt).

Classify, propose, implement per safe-fix-protocol.
```

---

## PHASE 6: SMB4 Traits Verification — T1-11

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Follow ALL 8 gates. Read CLAUDE.md.
Confirm: "Both read and acknowledged."

Bug: T1-11 — Traits may be made-up, not real SMB4 traits.

This is a VERIFICATION task, not necessarily a fix.

STEP 1 — Find the trait definitions:
  grep -rn "trait\|Trait\|TRAIT" \
    src/ --include="*.ts" | grep -v ".test." | grep -v node_modules | head -30
Paste ALL output.

STEP 2 — List all traits currently in the code:
Extract every trait name. List them all.

STEP 3 — Compare against SMB4 reference:
  grep -rn "trait" spec-docs/ --include="*.md" | head -20
  find . -name "*smb4*" -o -name "*SMB4*" -o -name "*reference*" | head -10
Paste output.

Is there an SMB4 reference document in the project?
If YES: compare code traits against reference traits.
If NO: list the traits and report "CANNOT VERIFY — no SMB4 reference"

STEP 4 — Report:
  - Traits that match SMB4: [list]
  - Traits that appear made-up: [list]
  - Traits missing from code but in SMB4: [list]

If there ARE made-up traits: propose replacing them.
If all traits are correct: report "VERIFIED CORRECT — no fix needed."

  git add -u && git commit -m "T1-11: [Fix/Verify] SMB4 traits — [outcome]"
```

---

## PHASE 7: FINAL VERIFICATION

```
Read .claude/skills/safe-fix-protocol/SKILL.md.
Read CLAUDE.md.

TIER 1 FINAL VERIFICATION. Play a full franchise game and verify 
ALL Tier 1 issues are resolved.

Play a game in Playwright (at least 4 innings with varied events).

Check:
| ID | Issue | Status | Evidence |
|----|-------|--------|----------|
| T1-01 | Fame per-player | | |
| T1-02 | Pinch runner credit | | |
| T1-03 | Runner name R3 | | |
| T1-04 | Ghost runner | | |
| T1-05 | Fielding inference | | |
| T1-06 | Error prompt trigger | | |
| T1-07 | Scoreboard runs | | |
| T1-08 | Post-game summary | | |
| T1-09 | Mojo factors | | |
| T1-10 | Pitcher rotation | | |
| T1-11 | SMB4 traits | | |

Save to spec-docs/TIER1_VERIFICATION.md.
Update spec-docs/SESSION_LOG.md.
Report full results.
```
