# Comprehensive Test Matrix

## Base States (8 combinations)
| State | 1B | 2B | 3B | Code |
|-------|----|----|-----|------|
| Empty | - | - | - | 000 |
| R1 | X | - | - | 100 |
| R2 | - | X | - | 010 |
| R3 | - | - | X | 001 |
| R1+R2 | X | X | - | 110 |
| R1+R3 | X | - | X | 101 |
| R2+R3 | - | X | X | 011 |
| Loaded | X | X | X | 111 |

## Result Types (18 types)
BB, IBB, HBP, 1B, 2B, 3B, HR, K, KL, GO, FO, LO, PO, DP, SF, SAC, FC, E

## Test Matrix: Expected Defaults

### WALKS (BB, IBB, HBP)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 000 (empty) | - | - | - | Batter to 1B only |
| 100 (R1) | TO_2B | - | - | R1 forced |
| 010 (R2) | - | HELD | - | R2 NOT forced (no R1) |
| 001 (R3) | - | - | HELD | R3 NOT forced |
| 110 (R1+R2) | TO_2B | TO_3B | - | Both forced by chain |
| 101 (R1+R3) | TO_2B | - | HELD | R1 forced, R3 NOT forced |
| 011 (R2+R3) | - | HELD | HELD | Neither forced (no R1) |
| 111 (loaded) | TO_2B | TO_3B | SCORED | All forced |

### SINGLE (1B)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 000 | - | - | - | Batter to 1B |
| 100 | TO_2B | - | - | R1 forced |
| 010 | - | TO_3B | - | R2 advances on hit |
| 001 | - | - | SCORED | R3 scores on hit |
| 110 | TO_2B | TO_3B | - | R1 forced, R2 advances |
| 101 | TO_2B | - | SCORED | R1 forced, R3 scores |
| 011 | - | TO_3B | SCORED | R2 advances, R3 scores |
| 111 | TO_2B | TO_3B | SCORED | Standard single w/bases loaded |

### DOUBLE (2B)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 000 | - | - | - | Batter to 2B |
| 100 | TO_3B | - | - | R1 to 3B (forced) |
| 010 | - | SCORED | - | R2 scores (forced) |
| 001 | - | - | SCORED | R3 scores |
| 110 | TO_3B | SCORED | - | Standard double |
| 101 | TO_3B | - | SCORED | R1 to 3B, R3 scores |
| 011 | - | SCORED | SCORED | Both score |
| 111 | TO_3B | SCORED | SCORED | R1 to 3B, R2+R3 score |

### TRIPLE (3B)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| All | SCORED | SCORED | SCORED | All runners must score |

### HOME RUN (HR)
- No runner selection needed - all score automatically

### STRIKEOUT (K, KL)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| All | HELD | HELD | HELD | No forces on strikeout |

### GROUND OUT (GO)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| All | HELD | HELD | HELD | Default hold, user can change |

### FLY OUT (FO)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 000-011 | HELD | HELD | HELD/SCORED | R3 tag-up if <2 outs |
| With R3 + <2 outs | HELD | HELD | SCORED | Auto-converts to SF! |

### LINE OUT (LO), POP OUT (PO)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| All | HELD | HELD | HELD | Rarely advance on these |

### DOUBLE PLAY (DP)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| With R1 | OUT_2B | HELD | HELD | R1 typically out at 2B |

### SACRIFICE FLY (SF)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| With R3 | HELD | HELD | SCORED | That's what makes it SF |

### SACRIFICE BUNT (SAC)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 100 | TO_2B | - | - | Advance the runner |
| 010 | - | TO_3B | - | Advance the runner |
| 001 | - | - | HELD | R3 holds on bunt |
| 110 | TO_2B | TO_3B | - | Both advance |

### FIELDER'S CHOICE (FC)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| With R1 | OUT_2B | HELD | HELD | R1 typically out |

### ERROR (E)
| Base State | R1 Default | R2 Default | R3 Default | Notes |
|------------|------------|------------|------------|-------|
| 100 | TO_2B | - | - | Extra base possible |
| 010 | - | TO_3B | - | Extra base possible |
| 001 | - | - | SCORED | Scores on error |

---

## Auto-Correction Rules

### FO → SF
- **Trigger**: FO + R3 exists + R3 outcome = SCORED + outs < 2
- **Action**: Change result to SF, show auto-correction message
- **Revert**: If R3 outcome changes from SCORED, revert to FO

### GO → SAC (suggestion only)
- **Trigger**: GO + outs < 2 + any runner advances
- **Action**: Show tip suggesting SAC (don't auto-convert)

---

## Extra Event Inference

### When to Prompt
| Result | Runner | Advancement | Requires Inference |
|--------|--------|-------------|-------------------|
| BB/IBB/HBP | R1 | TO_3B | Yes (SB/WP/PB/E) |
| BB/IBB/HBP | R1 | SCORED | Yes |
| BB/IBB/HBP | R2 (not forced) | SCORED | Yes |
| 1B | R1 | SCORED | Yes (likely E) |

### Extra Event Options
- SB: Stolen Base
- WP: Wild Pitch
- PB: Passed Ball
- E: Error
*(Note: BALK removed - not in SMB4)*

---

## Impossible States (Must Block)

1. ❌ R1 HELD on walk (always forced)
2. ❌ R2 HELD on walk when R1 exists (forced by chain)
3. ❌ R3 HELD on bases-loaded walk (forced by chain)
4. ❌ R1 HELD on single (must vacate for batter)
5. ❌ R1 TO_2B on double (must go to 3B minimum)
6. ❌ Any runner HELD on triple (all must vacate)

---

*Document created for exhaustive QA testing*
