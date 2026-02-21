# KBL Trait Integration Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

Traits are SMB4's per-player abilities that modify gameplay. KBL tracks traits as part of its stat, salary, and narrative systems. This spec defines the CORRECTED trait mechanics for KBL, including Chemistry interactions, potency calculations, and assignment rules.

> **North Star**: "Follows OOTP pattern AND preserves SMB4 asset intact." Traits are SMB4 assets — KBL wraps them with strategic depth but never overrides their in-game behavior.

---

## 2. ⚠️ CRITICAL: Corrected Chemistry Mechanics

### 2.1 Traits Can Come from ANY Chemistry Type

A player's Chemistry type does NOT restrict which traits they can receive. Any player can have any trait, regardless of their Chemistry.

```typescript
// CORRECT: Chemistry does NOT restrict trait eligibility
function canReceiveTrait(player: Player, trait: Trait): boolean {
  if (player.traits.length >= 2) return false;           // Max 2 traits
  if (!isPositionAppropriate(trait, player)) return false; // Must fit position
  return true;  // Chemistry type is IRRELEVANT to eligibility
}
```

### 2.2 Chemistry Affects POTENCY, Not Eligibility

Each trait belongs to a Chemistry type. The more players of that Chemistry type on the team, the more potent the trait becomes.

```typescript
// A trait's potency = team count of the TRAIT's Chemistry type
function getTraitPotency(trait: Trait, team: Team): PotencyTier {
  const traitChemistry = TRAIT_CHEMISTRY_MAP[trait.name];
  const teamCount = team.roster.filter(p => p.chemistryType === traitChemistry).length;
  return getChemistryTier(teamCount);  // 1-4
}
```

### 2.3 Self-Synergy

A player's own Chemistry type counts toward the team total. If a Spirited player has Clutch (a Spirited trait), they contribute to their own trait's potency.

```typescript
// Example: Spirited player with Clutch trait on a team with 5 Spirited players
// teamCount = 5 (includes the player themselves)
// potencyTier = 2 (4-7 threshold)
// The player's Spirited Chemistry DOES count toward the Clutch trait's potency
```

---

## 3. Trait-to-Chemistry Mapping

All traits map to one of SMB4's 5 Chemistry types. Reference: smb4_traits_reference.md

```typescript
type ChemistryType = 'Competitive' | 'Crafty' | 'Disciplined' | 'Spirited' | 'Scholarly';

const TRAIT_CHEMISTRY_MAP: Record<string, ChemistryType> = {
  // ── Competitive ──────────────────────────────────────────────
  'Cannon Arm': 'Competitive',
  'Durable': 'Competitive',
  'First Pitch Slayer': 'Competitive',
  'Sprinter': 'Competitive',
  'K Collector': 'Competitive',
  'Tough Out': 'Competitive',
  // Negative
  'K Neglecter': 'Competitive',
  'Whiffer': 'Competitive',
  'Slow Poke': 'Competitive',
  'First Pitch Prayer': 'Competitive',
  'Injury Prone': 'Competitive',
  'Noodle Arm': 'Competitive',

  // ── Crafty ───────────────────────────────────────────────────
  'Stimulated': 'Crafty',
  'Specialist': 'Crafty',
  'Reverse Splits': 'Crafty',
  'Stealer': 'Crafty',
  'Pick Officer': 'Crafty',
  'Sign Stealer': 'Crafty',
  'Mind Gamer': 'Crafty',
  'Distractor': 'Crafty',
  'Bad Ball Hitter': 'Crafty',
  // Negative
  'Bad Jumps': 'Crafty',
  'Easy Jumps': 'Crafty',
  'Wild Thrower': 'Crafty',
  'Easy Target': 'Crafty',

  // ── Disciplined ───────────────────────────────────────────────
  'Pinch Perfect': 'Disciplined',
  'Base Rounder': 'Disciplined',
  'Composed': 'Disciplined',
  'Magic Hands': 'Disciplined',
  'Fastball Hitter': 'Disciplined',
  'Off-Speed Hitter': 'Disciplined',
  'Low Pitch': 'Disciplined',
  'High Pitch': 'Disciplined',
  'Inside Pitch': 'Disciplined',
  'Outside Pitch': 'Disciplined',
  'Metal Head': 'Disciplined',
  'Consistent': 'Disciplined',
  // Negative
  'Base Jogger': 'Disciplined',
  'BB Prone': 'Disciplined',
  'Butter Fingers': 'Disciplined',
  'Volatile': 'Disciplined',

  // ── Spirited ──────────────────────────────────────────────────
  'Two Way': 'Spirited',
  'Rally Stopper': 'Spirited',
  'Clutch': 'Spirited',
  'Dive Wizard': 'Spirited',
  'Rally Starter': 'Spirited',
  'RBI Hero': 'Spirited',
  'CON vs LHP': 'Spirited',
  'CON vs RHP': 'Spirited',
  'POW vs LHP': 'Spirited',
  'POW vs RHP': 'Spirited',
  // Negative
  'Choker': 'Spirited',
  'Meltdown': 'Spirited',
  'Surrounded': 'Spirited',
  'Wild Thing': 'Spirited',
  'RBI Zero': 'Spirited',

  // ── Scholarly ─────────────────────────────────────────────────
  'Ace Exterminator': 'Scholarly',
  'Bunter': 'Scholarly',
  'Utility': 'Scholarly',
  'Big Hack': 'Scholarly',
  'Little Hack': 'Scholarly',
  'Gets Ahead': 'Scholarly',
  'Elite 4F': 'Scholarly',
  'Elite 2F': 'Scholarly',
  'Elite CF': 'Scholarly',
  'Elite FK': 'Scholarly',
  'Elite SL': 'Scholarly',
  'Elite CB': 'Scholarly',
  'Elite CH': 'Scholarly',
  'Elite SB': 'Scholarly',
  // Negative
  'Falls Behind': 'Scholarly',
  'Crossed Up': 'Scholarly',
};
```

---

## 4. Chemistry Potency Tiers

```typescript
const CHEMISTRY_TIER_THRESHOLDS = {
  1: { min: 0, max: 3, label: 'Minimal',   multiplier: 1.00 },
  2: { min: 4, max: 7, label: 'Growing',   multiplier: 1.25 },
  3: { min: 8, max: 11, label: 'Strong',   multiplier: 1.50 },
  4: { min: 12, max: 99, label: 'Dominant', multiplier: 1.75 },
};

function getChemistryTier(count: number): 1 | 2 | 3 | 4 {
  if (count >= 12) return 4;
  if (count >= 8) return 3;
  if (count >= 4) return 2;
  return 1;
}
```

### 4.1 Potency Effects

| System | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|--------|--------|--------|--------|--------|
| Salary modifier | ×1.00 | ×1.25 | ×1.50 | ×1.75 |
| Narrative frequency | Base | +25% | +50% | +75% |
| Trade value weight | Base | +25% | +50% | +75% |
| Beat reporter mentions | Rare | Occasional | Frequent | Constant |

---

## 5. Trait Assignment Rules

### 5.1 Max 2 Traits Per Player

Hard cap. No player may have more than 2 traits simultaneously.

### 5.2 Position-Appropriate Traits

Traits are filtered by position group:

| Position Group | Eligible Trait Categories |
|---------------|-------------------------|
| Position player (non-DH) | Hitting, Baserunning, Fielding |
| DH | Hitting, Baserunning |
| Starting Pitcher | Pitching |
| Relief Pitcher | Pitching |
| Closer | Pitching (Closer-specific eligible) |
| Two-Way | Hitting, Baserunning, Pitching |

### 5.3 Trait Distribution (Initial League)

From the 506-player SMB4 database:
- ~30% of players: 0 traits
- ~50% of players: 1 trait
- ~20% of players: 2 traits

### 5.4 End-of-Season Trait Assignment

See EOS_RATINGS_ADJUSTMENT_SPEC.md for full details. Summary:

- Traits assigned during Awards Ceremony (Phase 2)
- Award winners: 60% chance of gaining a trait
- Top performers: 30% chance
- Regular players: 5% chance
- 15% of all assigned traits are negative
- "Trait Wheel Spin" reveal ceremony for each eligible player

---

## 6. Interactions with Other Systems

### 6.1 Salary System

Traits are a modifier in the salary formula. The trait modifier scales with potency:

```typescript
traitSalaryModifier = baseTierMultiplier × potencyMultiplier
// e.g., Clutch (Tier A, +10%) on Tier 2 potency team = +12.5%
```

See SALARY_SYSTEM_SPEC.md for the full Chemistry-tier trait potency factor.

### 6.2 Trade System

When evaluating trades, the system shows how a player's trait potency would CHANGE on the receiving team:

```typescript
// Example: Trading a Clutch player (Spirited trait)
// Sending team: 8 Spirited players → Tier 3 (×1.50)
// Receiving team: 2 Spirited players → Tier 1 (×1.00)
// Trade UI shows: "Clutch potency: Strong → Minimal"
```

See TRADE_SYSTEM_SPEC.md Section 4 for Chemistry-tier trade value evaluation.

### 6.3 Narrative System

Beat reporters reference traits contextually:
- Higher potency = more frequent trait mentions
- Chemistry synergies generate "chemistry report" storylines
- Trait changes generate major narrative events

### 6.4 Fan Morale System

Trait-related events influence fan morale through the designation system:
- Players outperforming their salary (boosted by positive traits) → Fan Favorite candidates
- Players underperforming (dragged by negative traits) → Scapegoat candidates

---

## 7. Trade Value Impact

### 7.1 Trait Chemistry Evaluation in Trades

When evaluating a trade, the system shows the Chemistry-tier impact:

```typescript
interface TraitTradeAnalysis {
  playerName: string;
  trait: string;
  traitChemistry: ChemistryType;
  sendingTeam: {
    chemistryCount: number;
    potencyTier: 1 | 2 | 3 | 4;
    tierLabel: string;
  };
  receivingTeam: {
    chemistryCount: number;
    potencyTier: 1 | 2 | 3 | 4;
    tierLabel: string;
  };
  potencyChange: 'UPGRADE' | 'DOWNGRADE' | 'NEUTRAL';
}
```

---

## 8. Cross-References

| Spec | Relevance |
|------|-----------|
| smb4_traits_reference.md | Full SMB4 trait list with Chemistry mappings |
| EOS_RATINGS_ADJUSTMENT_SPEC.md | Trait assignment at end of season |
| SALARY_SYSTEM_SPEC.md | Chemistry-tier trait potency salary factor |
| TRADE_SYSTEM_SPEC.md | Chemistry-tier trade value evaluation |
| NARRATIVE_SYSTEM_SPEC.md | Beat reporter trait coverage |
| PROSPECT_GENERATION_SPEC.md | Initial trait distribution for new players |

---

*Last Updated: February 20, 2026*
