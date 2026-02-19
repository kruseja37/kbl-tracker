# Legacy GameTracker (Button-Based) - Documentation Index

> **Status**: LEGACY - Original implementation in `src/components/GameTracker/`
> **Last Updated**: 2026-02-02

---

## Overview

The Legacy GameTracker uses a **two-step button-based flow**:
1. **Step 1**: Select at-bat result (1B, GO, K, etc.)
2. **Step 2**: Confirm fielding details via modal

### Core Principles

1. **Direction + Exit Type → Inferred Fielder** (user confirms or overrides)
2. **Contextual toggles** - Only show relevant options (IFR, GRD, Nutshot, etc.)
3. **Fielding Chance Logic** - Critical distinction between outs and clean hits
4. **Adaptive Learning** - Track inferences vs. actuals to improve over time

---

## Key Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| **FIELDING_SYSTEM_SPEC.md** | `../FIELDING_SYSTEM_SPEC.md` | Complete fielding specification |
| **FIELD_ZONE_INPUT_SPEC.md** | `../FIELD_ZONE_INPUT_SPEC.md` | Zone-based input specification |
| **RUNNER_ADVANCEMENT_RULES.md** | `../RUNNER_ADVANCEMENT_RULES.md` | Runner movement rules |

---

## Key Code Files

| File | Path | Size | Purpose |
|------|------|------|---------|
| **AtBatFlow.tsx** | `src/components/GameTracker/` | 51KB | Two-step at-bat flow |
| **FieldingModal.tsx** | `src/components/GameTracker/` | 34KB | Fielding confirmation modal |
| **FieldZoneInput.tsx** | `src/components/GameTracker/` | 14KB | Zone-based direction/depth |
| **DefensiveSubModal.tsx** | `src/components/GameTracker/` | 14KB | Defensive substitutions |
| **DoubleSwitchModal.tsx** | `src/components/GameTracker/` | 14KB | Double switch handling |

---

## Fielder Inference Matrices

### Ground Balls (GO, DP, FC)

| Direction | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| Left | 3B | SS | P |
| Left-Center | SS | 3B | 2B |
| Center | P | SS | 2B |
| Right-Center | 2B | 1B | SS |
| Right | 1B | 2B | P |

### Fly Balls (FO, SF)

| Direction | Primary | Secondary | Tertiary |
|-----------|---------|-----------|----------|
| Left | LF | CF | 3B |
| Left-Center | CF | LF | SS |
| Center | CF | - | - |
| Right-Center | CF | RF | 2B |
| Right | RF | CF | 1B |

### Line Drives (LO)

| Direction | Primary | Secondary |
|-----------|---------|-----------|
| Left | 3B | LF |
| Left-Center | SS | CF |
| Center | P | CF |
| Right-Center | 2B | CF |
| Right | 1B | RF |

### Pop Flies (PO)

| Direction | Primary | Secondary |
|-----------|---------|-----------|
| Left | 3B | SS |
| Left-Center | SS | 3B |
| Center | SS | 2B |
| Right-Center | 2B | 1B |
| Right | 1B | 2B |

---

## Fielding Chance Logic (CRITICAL)

**A fielding chance is recorded ONLY when a fielder attempts to make a play.**

| Result | Fielding Chance? | Notes |
|--------|-----------------|-------|
| Outs (GO, FO, LO, PO) | ✅ Yes | Always |
| Double Play (DP) | ✅ Yes | Always |
| Sac Fly (SF) | ✅ Yes | Always |
| Fielder's Choice (FC) | ✅ Yes | Always |
| Error (E) | ✅ Yes | Always |
| D3K | ✅ Yes | Always |
| Strikeout (K, KL) | ❌ No | No batted ball |
| Walk (BB, IBB, HBP) | ❌ No | No batted ball |
| **Clean Hit (1B, 2B, 3B)** | ❌ No | Default |
| Hit with Diving attempt | ✅ Yes | User indicates |
| Hit with Leaping attempt | ✅ Yes | User indicates |
| Clean HR | ❌ No | Default |
| HR with Robbery Attempt | ✅ Yes | User indicates |

---

## Contextual Visibility Rules

| Element | Show When |
|---------|-----------|
| IFR Toggle | PO/FO + R1&R2 or bases loaded + < 2 outs |
| GRD Toggle | Result = 2B |
| Bad Hop Toggle | Result is a hit (1B, 2B, 3B) |
| Nutshot Toggle | Direction = Center + GO/LO/1B |
| Comebacker Injury | Direction = Center + GO/LO |
| Robbery Options | Result = HR |
| D3K Options | Result = D3K |
| DP Chain | Result = DP |

---

## Double Play Chains

| Code | Description | Positions |
|------|-------------|-----------|
| 6-4-3 | SS to 2B to 1B | SS (A), 2B (A), 1B (PO) |
| 4-6-3 | 2B to SS to 1B | 2B (A), SS (A), 1B (PO) |
| 5-4-3 | 3B to 2B to 1B | 3B (A), 2B (A), 1B (PO) |
| 3-6-3 | 1B to SS to 1B | 1B (A), SS (A), 1B (PO) |
| 1-6-3 | P to SS to 1B | P (A), SS (A), 1B (PO) |
| 1-4-3 | P to 2B to 1B | P (A), 2B (A), 1B (PO) |

### DP Inference by Direction

| Direction | Default Chain |
|-----------|---------------|
| Left | 5-4-3 |
| Left-Center | 6-4-3 |
| Center | 6-4-3 |
| Right-Center | 4-6-3 |
| Right | 3-6-3 |

---

## Star Plays & Errors

### Star Play Categories

| Category | Fame | fWAR (48g) |
|----------|------|------------|
| Diving Catch | +1 | +0.030 |
| Leaping Catch | +1 | +0.024 |
| Wall Catch | +1 | +0.030 |
| Running Catch | - | +0.018 |
| Sliding Catch | +1 | +0.030 |
| Over-Shoulder Catch | +1 | +0.024 |
| Robbed HR | +2 | +0.078 |
| Outfield Assist | +1 | +0.045 |

### Error Categories

| Category | Fame | fWAR (48g) |
|----------|------|------------|
| Fielding Error | -1 | -0.051 |
| Throwing Error | -1 | -0.068 |
| Mental Error | -1 | -0.084 |
| Missed Catch (routine) | -1 | -0.051 |
| Failed HR Robbery | -1 | -0.078 |

---

## D3K (Dropped Third Strike)

| Scenario | Batter Outcome | Fielder Credit |
|----------|----------------|----------------|
| D3K → thrown out at 1B | Out | Assist (C/P/3B), 1B Putout |
| D3K → safe on Wild Pitch | Reaches 1B | - |
| D3K → safe on Passed Ball | Reaches 1B | - |
| D3K → safe on Throwing Error | Reaches 1B | Error (C/P/3B) |
| D3K → safe (1B error) | Reaches 1B | Assist (C/P/3B), 1B Error |

**Fielders Who Can Handle D3K**: Catcher (default), Pitcher, 3B
