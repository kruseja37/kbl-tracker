# SMB4 Player Database Extraction — Session Rules

## Overview
Extract all player data from 20 SMB4 teams (5 screenshots per team) into a single canonical markdown database.

---

## Screenshot Map (5 per team)

| # | View | Columns Extracted |
|---|------|-------------------|
| 1 | **Team Visuals** | Team name confirmation only (no player data) |
| 2 | **Roster Info** | Name, OVR, P.Pos, S.Pos, Age, Bat, Thr |
| 3 | **Player Stats** | POW, CON, SPD, FLD, ARM |
| 4 | **Pitching Stats** | VEL, JNK, ACC, Arsenal (pitchers only; position players show `-`) |
| 5 | **Chem & Traits** | Chem, Trait 1, Trait 2 |

---

## Output Schema (column order)

```
| Name | Gender | Age | OVR | P.Pos | S.Pos | Bat | Thr | Chem | POW | CON | SPD | FLD | ARM | VEL | JNK | ACC | Arsenal | Trait 1 | Trait 2 |
```

### Column Rules

| Column | Source | Format | Notes |
|--------|--------|--------|-------|
| Name | Img 2 | Text | Exact spelling from screenshot |
| Gender | Inferred | M / F | Guess from first name (see Gender Rules) |
| Age | Img 2 | Integer | |
| OVR | Img 2 | Letter grade | S, A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D- |
| P.Pos | Img 2 | Text | SP, RP, CP, C, 1B, 2B, 3B, SS, LF, CF, RF |
| S.Pos | Img 2 | Text | Same codes, or SP/RP for swing pitchers. Blank if none. |
| Bat | Img 2 | L / R / S | |
| Thr | Img 2 | L / R | |
| Chem | Img 5 | Full word | Expand abbreviations: DIS→Disciplined, SPI→Spirited, CRA→Crafty, CMP→Competitive, SCH→Scholarly |
| POW | Img 3 | Integer | For pitchers: still record the value shown (used for pitcher batting) |
| CON | Img 3 | Integer | Same — record what's shown |
| SPD | Img 3 | Integer | Same |
| FLD | Img 3 | Integer | Same |
| ARM | Img 3 | Integer or `-` | Position players get integer; pitchers show `-` |
| VEL | Img 4 | Integer or `-` | Position players = `-`; pitchers = integer |
| JNK | Img 4 | Integer or `-` | Same |
| ACC | Img 4 | Integer or `-` | Same |
| Arsenal | Img 4 | Text | Pipe-separated pitch codes: 4F, 2F, CF, CB, SL, CH, FK, SB. Position players = blank. |
| Trait 1 | Img 5 | Text | Exact name. Blank if none. |
| Trait 2 | Img 5 | Text | Exact name. Blank if none. |

---

## Gender Inference Rules

1. **Default to M** unless the first name is clearly female.
2. **Female indicators**: Common female names (e.g., Gina, Irene, Carla, Rhiannon, Sancha, Shania, Bertha, Ruby, Helena, Joanna, Mindy, Wanda, Shayanne, etc.)
3. **Ambiguous names**: If genuinely ambiguous, check the character model in Image 1/2 if visible, or default M.
4. **"Joke" names**: Treat phonetically (e.g., "Stallion" = M, "Swirly" = M, "Wiggles" = M).

---

## Extraction Workflow (per team)

1. **Receive** 5 screenshots + team name from JK.
2. **Cross-reference** all 5 images to build complete player rows. Use NAME column (present in all views) as the join key.
3. **Count verification**: Confirm player count matches across all 5 screenshots (typically 22 per team).
4. **Write** team section to working file in schema order.
5. **Verify**: Grep the written output and confirm row count + spot-check 2-3 players.
6. **Report** to JK: "[Team] — done. [N] players extracted. Ready for next."
7. **Update Progress Tracker** in this file immediately after each team is verified. Mark status ✅ and record player count. This must happen before moving to the next team.

---

## File Structure

```markdown
# KBL Tracker — SMB4 Player Database

**Total Players**: 440 | **Teams**: 20

---

## [Team Name] ([N] players)

| Name | Gender | Age | OVR | P.Pos | S.Pos | Bat | Thr | Chem | POW | CON | SPD | FLD | ARM | VEL | JNK | ACC | Arsenal | Trait 1 | Trait 2 |
|------|--------|-----|-----|-------|-------|-----|-----|------|-----|-----|-----|-----|-----|-----|-----|-----|---------|---------|---------|
| ...  | ...    | ... | ... | ...   | ...   | ... | ... | ...  | ... | ... | ... | ... | ... | ... | ... | ... | ...     | ...     | ...     |
```

Player order: Lineup (1-9) → Bench (BN) → Rotation (ROT) → Bullpen (PEN), matching screenshot order top-to-bottom.

---

## Error Handling

- **Obscured/cut-off values**: Flag with `?` and note to JK.
- **Conflicting data between screenshots**: Flag discrepancy, use most legible source.
- **Name spelling variations**: Use Image 2 (Roster Info) as canonical source.

---

## Progress Tracker

| # | Team | Status | Players |
|---|------|--------|---------|
| 1 | Moose | ✅ | 22 |
| 2 | Herbisaurs | ✅ | 22 |
| 3 | Wild Pigs | ✅ | 22 |
| 4 | Freebooters | ✅ | 22 |
| 5 | Hot Corners | ✅ | 22 |
| 6 | Moonstars | ✅ | 22 |
| 7 | Blowfish | ✅ | 22 |
| 8 | Sawteeth | ✅ | 22 |
| 9 | Sand Cats | ✅ | 22 |
| 10 | Wideloads | ✅ | 22 |
| 11 | Platypi | ✅ | 22 |
| 12 | Grapplers | ✅ | 22 |
| 13 | Heaters | ✅ | 22 |
| 14 | Overdogs | ✅ | 22 |
| 15 | Buzzards | ✅ | 22 |
| 16 | Crocs | ✅ | 22 |
| 17 | Nemesis | ✅ | 22 |
| 18 | | ⬜ | |
| 19 | | ⬜ | |
| 20 | | ⬜ | |
