#!/bin/bash
# Generate audit extracts from GameTracker large files
# Run from project root: bash spec-docs/audit-extracts/generate_extracts.sh

SRC_GT="src/src_figma/app/pages/GameTracker.tsx"
SRC_GS="src/src_figma/hooks/useGameState.ts"
OUT="spec-docs/audit-extracts"

echo "Generating audit extracts..."
echo "GameTracker.tsx: $(wc -l < "$SRC_GT") lines"
echo "useGameState.ts: $(wc -l < "$SRC_GS") lines"

# Structure extracts (first 300 + last 150 lines)
echo "--- First 300 lines ---" > "$OUT/extract_GT_structure.txt"
head -300 "$SRC_GT" | cat -n >> "$OUT/extract_GT_structure.txt"
echo "" >> "$OUT/extract_GT_structure.txt"
echo "--- Last 150 lines ---" >> "$OUT/extract_GT_structure.txt"
tail -150 "$SRC_GT" | awk -v total=$(wc -l < "$SRC_GT") '{print (total-149+NR-1) "\t" $0}' >> "$OUT/extract_GT_structure.txt"

echo "--- First 300 lines ---" > "$OUT/extract_GS_structure.txt"
head -300 "$SRC_GS" | cat -n >> "$OUT/extract_GS_structure.txt"
echo "" >> "$OUT/extract_GS_structure.txt"
echo "--- Last 150 lines ---" >> "$OUT/extract_GS_structure.txt"
tail -150 "$SRC_GS" | awk -v total=$(wc -l < "$SRC_GS") '{print (total-149+NR-1) "\t" $0}' >> "$OUT/extract_GS_structure.txt"

# §2-§3: Layout + Score Bug
grep -n -i -B3 -A10 "scoreBug\|ScoreBug\|score.bug\|scoreboard\|Scoreboard\|fenway\|Fenway\|grid-template\|grid-area\|display.*grid\|layout\|Layout.*zone\|column.*width\|overlay\|minimize\|expand.*score" "$SRC_GT" > "$OUT/extract_layout_scorebug.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_layout_scorebug.txt"
grep -n -i -B3 -A5 "scoreBug\|ScoreBug\|fenway\|Fenway\|scoreboard" "$SRC_GS" >> "$OUT/extract_layout_scorebug.txt" 2>/dev/null

# §4: Quick Bar
grep -n -i -B3 -A10 "QuickBar\|quickBar\|quick.bar\|handleOutcome\|handleQuickBar\|OUTCOME\|outcome.*button\|overflow\|START_GAME\|END_GAME\|startGame\|endGame\|phase\|preGame\|PRE_GAME\|POST_FINAL\|postFinal\|disabled.*button\|button.*disabled\|contextual.*disab\|SAC.*disabled\|SF.*disabled\|DP.*disabled\|TP.*disabled" "$SRC_GT" > "$OUT/extract_quickbar.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_quickbar.txt"
grep -n -i -B3 -A10 "handleOutcome\|handleQuickBar\|recordOutcome\|phase\|preGame\|START_GAME\|END_GAME\|gamePhase\|startGame\|endGame\|buttonAvail\|contextualDisab" "$SRC_GS" >> "$OUT/extract_quickbar.txt" 2>/dev/null

# §5: Lineup Columns
grep -n -i -B3 -A10 "lineup\|LineupCard\|Lineup.*column\|batting.*order\|fielding.*lineup\|playerCard\|PlayerCard\|player.*card\|enrichmentMode\|FIELDING_SEQUENCE\|fWAR\|pWAR\|pitchCount\|pitch.*count\|jerseyNumber\|jersey\|currentBatter\|current.*batter\|primaryColor\|team.*color\|leadoff\|next.*inning\|dotted.*outline" "$SRC_GT" > "$OUT/extract_lineup.txt" 2>/dev/null

# §6: Newsboard
grep -n -i -B3 -A10 "newsboard\|NewsBoard\|news.*board\|beatReporter\|beat.*reporter\|matchup\|matchupHistory\|batter.*line\|pitcher.*line\|game.*line\|rivalry\|milestone.*watch\|MilestoneWatch" "$SRC_GT" > "$OUT/extract_newsboard.txt" 2>/dev/null

# §7: Play Log
grep -n -i -B3 -A10 "PlayLog\|playLog\|play.*log\|PlayLogPanel\|playLogEntry\|runner.*sub\|runnerOutcome\|runner.*outcome\|inline.*enrich\|badge\|enrichment.*badge" "$SRC_GT" > "$OUT/extract_playlog.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_playlog.txt"
grep -n -i -B3 -A10 "runnerOutcome\|runner.*outcome\|playLog\|play.*log" "$SRC_GS" >> "$OUT/extract_playlog.txt" 2>/dev/null

# §8: Enrichment
grep -n -i -B3 -A10 "enrichment\|Enrichment\|EnrichmentPanel\|spray\|sprayChart\|fieldLocation\|field.*location\|catchType\|catch.*type\|contactType\|contact.*type\|exitType\|exit.*type\|hitType\|hit.*type\|fieldingSequence\|fielding.*sequence\|playMechanic\|play.*mechanic\|modifier\|KP\|NUT\|TOOTBLAN\|tootblan\|bunt\|Bunt\|deflection\|Deflection\|routine\|Routine\|diving\|jumping\|sliding\|charging\|over.shoulder\|wall.*catch\|robbed.*HR" "$SRC_GT" > "$OUT/extract_enrichment.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_enrichment.txt"
grep -n -i -B3 -A10 "enrichment\|spray\|catchType\|contactType\|exitType\|fieldingSequence\|modifier\|KP\|NUT\|TOOTBLAN" "$SRC_GS" >> "$OUT/extract_enrichment.txt" 2>/dev/null

# §9: Subs + Between-Play
grep -n -i -B3 -A10 "substitut\|subOut\|sub.*out\|swapPosition\|swap.*position\|swapOrder\|swap.*order\|pitcherChange\|pitcher.*change\|mojo\|Mojo\|fitness\|Fitness\|injury\|Injury\|managerMoment\|manager.*moment\|stayTheCourse\|stay.*course\|leverage\|BetweenPlay\|betweenPlay\|between.*play\|RunnerPopover\|FielderPopover" "$SRC_GT" > "$OUT/extract_subs.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_subs.txt"
grep -n -i -B3 -A10 "substitut\|pitcherChange\|pitcher.*change\|mojo\|fitness\|injury\|managerMoment\|BetweenPlay\|betweenPlay\|between.*play\|leverage" "$SRC_GS" >> "$OUT/extract_subs.txt" 2>/dev/null

# §10: Game Flow
grep -n -i -B3 -A10 "halfInning\|half.*inning\|transition\|endGame\|end.*game\|END_GAME\|START_GAME\|startGame\|start.*game\|phase\|preGame\|pre.*game\|postFinal\|post.*final\|walkOff\|walk.*off\|extraInning\|extra.*inning\|resume\|Resume\|isComplete\|gameOver\|game.*over\|pitchCount.*prompt\|pitch.*count.*modal" "$SRC_GT" > "$OUT/extract_gameflow.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_gameflow.txt"
grep -n -i -B3 -A10 "halfInning\|half.*inning\|endGame\|END_GAME\|START_GAME\|startGame\|phase\|preGame\|postFinal\|walkOff\|extraInning\|resume\|isComplete\|gameOver" "$SRC_GS" >> "$OUT/extract_gameflow.txt" 2>/dev/null

# §11: Visual
grep -n -i -B3 -A10 "PressStart\|Press.Start\|chalk\|retro\|animation\|@keyframe\|transition\|audio\|sound\|Sound\|haptic\|vibrat\|backwards.*K\|Kc\|called.*strike" "$SRC_GT" > "$OUT/extract_visual.txt" 2>/dev/null

# §12: Edge Cases
grep -n -i -B3 -A10 "undo\|Undo\|undoStack\|undo.*stack\|undoDepth\|undo.*depth\|locked\|LOCKED\|toast\|Toast\|IndexedDB\|indexedDB\|autosave\|auto.*save\|resume\|recover" "$SRC_GT" > "$OUT/extract_edgecases.txt" 2>/dev/null
echo "--- useGameState.ts ---" >> "$OUT/extract_edgecases.txt"
grep -n -i -B3 -A10 "undo\|Undo\|undoStack\|undo.*depth\|locked\|LOCKED\|autosave\|auto.*save\|resume\|recover\|replay" "$SRC_GS" >> "$OUT/extract_edgecases.txt" 2>/dev/null

echo ""
echo "=== EXTRACT SUMMARY ==="
for f in "$OUT"/extract_*.txt; do
    lines=$(wc -l < "$f")
    echo "$(basename $f): $lines lines"
done
echo ""
echo "Extracts complete. Opus should read MANIFEST.md first."
