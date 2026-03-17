# PROMPT CONTRACT: Tier 3 Batch C — Lineup Enrichment Mode + Spray Zones + Pitch Count Triggers
# ROUTE: Claude Code CLI | Opus 4.6
# Branch: feature/gt-ux-t3c-lineup-enrich-spray-pitch
# Prerequisite: Tier 3 Batches A and B merged (or independent for 3.3/3.4)

---

You are a senior React/TypeScript engineer completing the final Opus items in the GameTracker UX redesign Tier 3. Three independent features.

## GOAL

Three items:
1. **(UX-024 + UX-058 / item 3.2)** Build defensive lineup enrichment mode: when user taps a play log entry to enrich fielding sequence, the defensive lineup column toggles into "FIELDING SEQUENCE" mode. Tapping fielders in the column builds the sequence visually. Done/Clear buttons. Same mode works for both AtBatEvent and BetweenPlayEvent throw sequences (resolves UX-058).
2. **(UX-029 / item 3.3)** Verify and implement context-sensitive spray zone counts per result type. The SprayGraphic built in 2.D renders but zone counts may not match spec §8.2 exactly.
3. **(UX-032 / item 3.4)** Verify pitch count prompt fires at all 3 trigger points: (a) pitcher replacement, (b) half-inning end, (c) game end. Fix any missing triggers.

## SOURCE OF TRUTH

- `spec-docs/GAMETRACKER_UX_SPEC.md` — §5.4 Defensive Lineup Enrichment Mode, §8.2 Spray Graphic Zones, §9.2 Pitch Count Prompts
- `spec-docs/GAMETRACKER_UX_GAP_ANALYSIS.md` — UX-024, UX-029, UX-032, UX-058

## BEFORE YOU WRITE ANY CODE

1. Read `spec-docs/GAMETRACKER_UX_SPEC.md` §5.4, §8.2, §9.2
2. Read `src/src_figma/app/components/DefensiveLineupColumn.tsx` — understand its current props and rendering
3. Read `src/src_figma/app/components/EnrichmentPanel.tsx` — find the SprayGraphic component and its current zone generation logic
4. In useGameState.ts, search for `PitchCountPrompt` type and find all places where pitch count prompts are triggered. Verify the three trigger points: 'pitching_change', 'end_inning', 'end_game'.
5. Create branch: `git checkout -b feature/gt-ux-t3c-lineup-enrich-spray-pitch`
6. Run `npm run build`

## CONSTRAINTS

### Files you WILL modify:
```
src/src_figma/app/components/DefensiveLineupColumn.tsx — Add enrichment mode toggle
src/src_figma/app/components/EnrichmentPanel.tsx        — Spray zone count verification/fix
src/src_figma/app/pages/GameTracker.tsx                  — Wire enrichment mode between play log and defensive column, verify pitch count triggers
```

### Files you MUST NOT modify:
```
src/utils/eventLog.ts
src/src_figma/hooks/useGameState.ts     — ONLY verify pitch count triggers here, do not change unless a trigger is missing
src/src_figma/app/components/QuickBar.tsx
src/src_figma/app/components/ScoreBug.tsx
Any file under src/components/
```

## EXACT CHANGES

### Item 3.2 (UX-024 + UX-058): Defensive lineup enrichment mode

1. Add state to GameTracker.tsx: `enrichmentModeActive: boolean` and `enrichmentFieldingSequence: number[]`
2. When the user taps a play log entry that has fielding enrichment AND the enrichment panel opens:
   - Set `enrichmentModeActive = true` on the defensive lineup column
   - The column header changes from "DEFENSE" (or team name) to "FIELDING SEQUENCE" in accent color (#C4A853)
   - Each fielder row becomes a tap target — tapping a fielder adds their position number to the sequence
   - The sequence builds visually: e.g., "6 → 4 → 3" displayed at the top of the column or in the enrichment panel
   - "Done" button saves the sequence to the enrichment data
   - "Clear" button resets the sequence
3. When the enrichment panel closes, `enrichmentModeActive` resets to false and the column returns to normal display.
4. This same mode works for both AtBatEvent fielding sequences (at-bat enrichment) and BetweenPlayEvent throw sequences (runner event enrichment). The interaction is identical — tap fielders to build a sequence.

### Item 3.3 (UX-029): Spray zone count verification

1. Read the SprayGraphic component in EnrichmentPanel.tsx. Check how many zones it currently generates per result type.
2. Verify against spec §8.2:
   - HR: 7 directions × 3 depths = 21 zones
   - GO: 6 directions × 3 depths = 18 zones (infield only)
   - FO: 9 directions × 3 depths = 27 zones (OF + foul)
   - LO: 13 directions × 3 depths = 39 zones (OF + med/deep IF + foul)
   - PO: 9 directions × 3 depths = 27 zones (IF + shallow OF + foul)
   - 1B/2B/3B/E/ITPHR/GRD: 14 directions × 3 depths = 42 zones (IF + OF)
3. The per-result ENRICHMENT_CONFIG (built in 2.D) has `sprayZones` counts. Verify the SprayGraphic component uses these counts to generate the correct number of zones.
4. If zone counts don't match → fix the zone generation logic. The graphic should dynamically generate zones based on the count from the config.
5. If the graphic currently has a fixed zone layout → make it configurable. Pass the zone count as a prop and generate the SVG sectors accordingly.

### Item 3.4 (UX-032): Pitch count trigger verification

1. Search useGameState.ts for all places where a PitchCountPrompt is triggered. Verify three trigger points exist:
   - `type: 'pitching_change'` — fires when a pitcher is substituted
   - `type: 'end_inning'` — fires at the end of every half-inning
   - `type: 'end_game'` — fires when the game ends (natural or manual)
2. For each trigger point, trace the code path to confirm it actually fires. Don't just find the type definition — find where `setPitchCountPrompt({ type: 'pitching_change', ... })` (or equivalent) is called.
3. If any trigger is missing → add it. The pitch count prompt modal already exists (built in earlier steps). You just need to ensure it's triggered at the right moments.
4. If all three triggers exist and fire correctly → document as "VERIFIED — all 3 trigger points confirmed."

## VERIFICATION

```bash
# 1. Build passes
npm run build

# 2. Tests pass
npm test

# 3. Enrichment mode on defensive column
grep -n "enrichmentMode\|FIELDING SEQUENCE\|enrichmentModeActive" src/src_figma/app/components/DefensiveLineupColumn.tsx | head -5
# Expected: mode prop + conditional header + tap targets

# 4. Spray zone counts match spec
grep -n "sprayZones\|zoneCount\|21\|18\|27\|39\|42" src/src_figma/app/components/EnrichmentPanel.tsx | head -10
# Expected: zone count references matching spec values

# 5. All 3 pitch count triggers exist
grep -n "pitching_change\|end_inning\|end_game" src/src_figma/hooks/useGameState.ts | head -10
# Expected: all 3 PitchCountPrompt types with trigger calls
```

## FORMAT

```
TIER 3 BATCH C COMPLETE

Files changed: [list with descriptions]

Defensive enrichment mode:
[Describe: toggle behavior, header change, sequence building, Done/Clear]

Spray zone counts:
[For each result type: expected count vs actual count — all should match]

Pitch count triggers:
[For each of 3 triggers: confirmed file:line where it fires]

Verification results: [all 5 checks]
Ready for JK browser verification.
```

## FAILURE PROTOCOL

- If the defensive column enrichment mode is complex (requires deep wiring between PlayLogPanel enrichment state and DefensiveLineupColumn) → build it as a prop-driven mode: `enrichmentMode?: { active: boolean; onFielderTap: (posNum: number) => void; sequence: number[]; onDone: () => void; onClear: () => void }`. GameTracker.tsx orchestrates.
- If spray zone generation for specific counts (39, 42) is geometrically complex → generate a simpler layout with the correct COUNT of zones even if the geometric distribution isn't perfect. Zones can be equal-sized sectors of the fan.
- If a pitch count trigger is missing and adding it requires significant useGameState.ts changes → document exactly where the trigger should fire and what code needs to change. Mark as "TRIGGER MISSING — implementation requires [specific change]."

## ANTI-PATTERNS

- Do NOT modify eventLog.ts.
- Do NOT modify QuickBar, ScoreBug, or BattingLineupColumn.
- Do NOT touch src/components/.
- Do NOT change baseball logic or stat calculations.

Use high reasoning effort. Read before writing. Build after every file change.
