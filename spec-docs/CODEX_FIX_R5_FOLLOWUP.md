# CODEX BUG FIX: R5 Follow-Up — Base Correction Wipe + Play Log OA Display
# ROUTE: Codex 5.4 | high
# Branch: fix/r5-followup
# Skill: .claude/skills/gametracker-bug-repro/SKILL.md

---

## Bug A (HIGH): Runner base correction wipes batter from 1B

**What the user does:** WP_K with runner on 2B, 1B open. Batter reaches 1B (dropped third strike). Runner auto-advances to 3B. User corrects runner sub-entry from 3B back to 2B ("held").

**What should happen:** After correction: runner on 2B, batter on 1B. Both occupied.

**What actually happens:** After correction: runner moves to 2B, but batter DISAPPEARS from 1B entirely. The batter is gone for good — subsequent plays don't have a runner on 1B.

**Root cause:** `applyBasesCorrection` or `buildLiveBasesFromRunnerOutcomes` is rebuilding bases ONLY from the corrected runner outcomes on that specific at-bat event. It doesn't account for the BATTER who also reached base on that play. When it rebuilds bases from runner outcomes, the batter's position (1B) is not included in `runnerOutcomes` — runnerOutcomes only tracks inherited runners, not the batter.

**What to investigate:**
```bash
cat src/src_figma/app/utils/liveBaseCorrection.ts
```
Read `buildLiveBasesFromRunnerOutcomes` and `buildLiveBasesFromRunnersAfter`. Check: does it include the batter's destination base? On a WP_K where the batter reaches 1B, the batter's base should be part of the corrected base state.

**What to fix:** When rebuilding live bases from a corrected at-bat event, include the batter's destination:
1. Read the at-bat result (e.g., WP_K → batter reached 1B)
2. Check if `batterOutAdvancing` is set (if so, batter is NOT on base)
3. If batter reached and is not out advancing, include their base in the rebuilt bases
4. THEN overlay the corrected runner outcomes on top

**Test to write:** Call `buildLiveBasesFromRunnerOutcomes` with: batter reached 1B, runner corrected from 3B to 2B. Assert result: `{ first: true, second: true, third: false }`.

**Browser verify:** WP_K with R2 → batter on 1B, runner on 3B → correct runner to 2B → bases show 1B AND 2B occupied.

---

## Bug B (LOW): Batter Out Advancing doesn't show in play log inline

**What the user sees:** Records 2B → toggles "Batter Out Advancing" in enrichment → ScoreBug outs increment (correct) → but the play log entry still just shows "2B" with no indication the batter was thrown out.

**What should happen:** The play log entry should show something like "2B OA" or "2B ✗" or a visual indicator that the batter was out advancing, similar to how runner sub-entries show "OA" for out advancing.

**What to investigate:**
```bash
grep -n "batterOutAdvancing\|batter.*out.*advancing\|batterOA" src/src_figma/app/utils/gameTrackerPlayLog.ts | head -5
```

**What to fix:** In `mapAtBatEventToPlayLogEntry` (gameTrackerPlayLog.ts), check if the at-bat event has `batterOutAdvancing === true`. If so, append an indicator to the result display. Options:
- Add `" OA"` suffix to the result string (e.g., "2B OA")
- Or add a separate field on PlayLogEntry like `batterOutAdvancing: boolean` and render it in PlayLogPanel
- The simplest: in the play log mapper, when `batterOutAdvancing` is true, set the result display to include the OA tag

Also check `PlayLogPanel.tsx` — does it render any special indicator when `batterOutAdvancing` is present?

**Browser verify:** Record 2B → toggle Batter Out Advancing → play log shows "2B OA" or equivalent visual indicator.

---

## Execution Order

1. Bug A first (functional — affects game state)
2. Bug B second (display only)

## VERIFY

```bash
npm run build
npx vitest run src/src_figma/__tests__/gameTracker/bugfix-r5-03-wpk-live-bases.test.ts
```

Browser: WP_K with R2 + batter on 1B → correct runner to 2B → both 1B and 2B occupied. Record 2B → toggle Batter OA → play log shows OA indicator.
