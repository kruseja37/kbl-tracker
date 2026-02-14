# Free Agency Player Exchange - Figma Update Blurb

> **For**: Figma Design Team
> **Feature**: Player Exchange (Screen 4)
> **Updated**: January 29, 2026

---

## Summary of Changes

The Player Exchange logic has been updated with **two key changes**:

### 1. Salary-Based Matching (replaces grade-based)

**OLD**: Players had to match by grade
**NEW**: Players must be within **±10% of incoming player's salary (True Value)**

**Example**:
- Incoming player: $15M True Value
- Valid return range: **$13.5M - $16.5M**
- A $14M player = ✓ WITHIN RANGE (-7%)
- A $8M player = ✗ TOO LOW (-47%)

### 2. No Position Matching Required

**OLD**: Pitchers could only be exchanged for pitchers, position players for position players
**NEW**: **Any player can be exchanged for any player** regardless of position type

**Rationale**: Teams can draft and/or call-up replacements at any position, so the constraint is unnecessary.

**Example**:
- Incoming player: Alex Rodriguez (3B, $15M)
- Valid return: David Ortiz (1B, $14M) ✓
- Valid return: Curt Schilling (SP, $14.5M) ✓ ← Pitchers now eligible too!

---

## Fallback Rule

**When no players meet the ±10% threshold**, the team must give the player whose **salary is CLOSEST to the incoming player's salary** (minimizing the absolute salary difference).

**Examples**:
- Incoming $25M, roster has $12M, $10M, $9M → Give **$12M** (closest to $25M from below)
- Incoming $5M, roster has $15M, $18M, $20M → Give **$15M** (closest to $5M from above)

**UI Treatment**:
- ⚠️ Orange/yellow banner explaining fallback triggered
- Closest-salary player auto-selected (no choice)
- Show "⚠️ REQUIRED (Closest)" badge

---

## Updated Eligibility Badges

| Badge | Meaning |
|-------|---------|
| ✓ WITHIN RANGE (+X%) | Green - player is eligible |
| ✗ TOO LOW (-X%) | Red - salary too low, not eligible |
| ✗ TOO HIGH (+X%) | Red - salary too high, not eligible |
| ⚠️ REQUIRED (Closest) | Orange - fallback rule, must give this player (closest salary) |

**Removed**: ~~✗ WRONG POSITION~~ (no longer applicable)

---

## Wireframe Update Notes

**Screen 4 - Normal Match Available**:
- Show salary threshold prominently: "$13.5M - $16.5M (±10% of $15M)"
- Show percentage delta for each player (e.g., "-7%", "+7%")
- Pitchers should appear as eligible if within salary range
- Outgoing card can say "Any player" instead of "Position Player"

**Screen 4 - Fallback Required**:
- Orange warning banner when triggered
- Text: "No players meet the ±10% salary threshold. You must give the player CLOSEST in salary to the incoming player."
- Auto-select the player with salary closest to incoming (any position)
- Other players shown as grayed with salary info

---

*See `FREE_AGENCY_FIGMA_SPEC.md` Screen 4 for complete wireframes*
