# SMB4 Game Mechanics Reference

> **Purpose**: Document what baseball mechanics ARE and ARE NOT in Super Mega Baseball 4
> **Usage**: All other spec documents should reference this to avoid implementing non-existent features

---

## Quick Reference: What's NOT in SMB4

| Mechanic | In SMB4? | Notes |
|----------|----------|-------|
| **Balks** | ❌ NO | No balk mechanic exists |
| **Catcher Interference** | ❌ NO | Not implemented |
| **Infield Fly Rule** | ✅ YES | Called with R1+R2 or loaded, <2 outs |
| **Obstruction** | ❌ NO | Not implemented |
| **Dropped 3rd Strike** | ❌ NO | K is always an out |
| **Pitch Clock** | ❌ NO | No time limits |
| **Shift Restrictions** | ❌ NO | Free defensive positioning |
| **Runner Lead-offs** | ❌ NO | Runners don't lead off |
| **Pick-off Attempts** | ❌ NO | No pick-off throws |
| **Intentional Balk** | ❌ NO | N/A (no balks) |

---

## What IS in SMB4

### Batting Events
- ✅ Single (1B)
- ✅ Double (2B)
- ✅ Triple (3B)
- ✅ Home Run (HR)
- ✅ Walk (BB)
- ✅ Intentional Walk (IBB)
- ✅ Hit By Pitch (HBP)
- ✅ Strikeout (K) - swinging and looking
- ✅ Ground Out (GO)
- ✅ Fly Out (FO)
- ✅ Line Out (LO)
- ✅ Pop Out (PO)
- ✅ Fielder's Choice (FC)
- ✅ Double Play (DP)
- ✅ Triple Play (TP) - rare
- ✅ Sacrifice Fly (SF)
- ✅ Sacrifice Bunt (SAC)
- ✅ Ground Rule Double (GRD) - stadium dependent
- ✅ Error (E) - fielding and throwing

### Base Running Events
- ✅ Stolen Base (SB)
- ✅ Caught Stealing (CS)
- ✅ Wild Pitch (WP)
- ✅ Passed Ball (PB)
- ✅ Runner advancement on hits
- ✅ Tag-up on fly balls
- ✅ Force outs
- ✅ Tag outs

### Pitching Mechanics
- ✅ Different pitch types (fastball, curve, slider, etc.)
- ✅ Pitcher fatigue (Mojo system)
- ✅ Pitching changes
- ❌ NO pitch count display in-game (must track manually)
- ❌ NO pitch location data
- ❌ NO pitch velocity data

### Fielding
- ✅ Free defensive positioning
- ✅ Diving catches
- ✅ Wall catches
- ✅ Throwing errors
- ✅ Fielding errors
- ✅ Double plays
- ❌ NO defensive shift restrictions

### Game Flow
- ✅ 9 innings (or custom)
- ✅ Extra innings
- ✅ Pinch hitters
- ✅ Pinch runners
- ✅ Defensive substitutions
- ✅ Pitching changes
- ❌ NO replay challenges
- ❌ NO ejections
- ❌ NO rain delays
- ❌ NO injuries during play

---

## SMB4-Specific Mechanics

### Mojo System
- Player performance affects "Mojo" (confidence meter)
- High Mojo = better stats, Low Mojo = worse stats
- Mojo carries between at-bats
- **For tracking**: Note when Mojo is very high/low for narrative

### Power Swing / Contact Swing
- Players can choose swing type
- Power = more HR potential, less contact
- Contact = better contact, less power
- **For tracking**: Not directly visible, inferred from results

### Special Pitches
- Each pitcher has unique pitch set
- No velocity/movement data exposed
- **For tracking**: Track pitch types used if observable

---

## Implementation Notes

### What to Track
Focus implementation on events that actually exist in SMB4:
1. All batting outcomes (hits, outs, walks, etc.)
2. Base running (SB, CS, WP, PB, advancement)
3. Pitching changes and appearances
4. Errors (fielding and throwing)
5. Player substitutions

### What NOT to Track
Do not waste development time on:
1. Balks - don't exist
2. Catcher interference - doesn't exist
3. Pick-offs - don't exist
4. Any mechanic not in the game

### When in Doubt
If unsure whether a mechanic exists in SMB4:
1. Check this document first
2. Test in actual gameplay
3. Update this document with findings

---

## Spec Document Cross-References

Documents that should reference this spec:
- RUNNER_ADVANCEMENT_RULES.md ✅ Updated
- PWAR_CALCULATION_SPEC.md
- INHERITED_RUNNERS_SPEC.md
- CLUTCH_ATTRIBUTION_SPEC.md
- FIELD_ZONE_INPUT_SPEC.md
- (Any future specs)

---

*Last Updated: January 22, 2026*
*Version: 1.0 - Initial SMB4 mechanics documentation*
