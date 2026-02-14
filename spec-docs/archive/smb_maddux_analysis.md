# SMB Maddux Threshold Analysis

## Raw Data from Screenshots

### Starting Pitchers (SP) - Primary Analysis Group

| Player | IP | TBF | NP | NP/IP | NP/TBF | TBF/IP |
|--------|---:|----:|---:|------:|-------:|-------:|
| A.J. Burnett | 52.1 | 226 | 599 | 11.5 | 2.65 | 4.33 |
| Mark Buehrle | 60.2 | 270 | 837 | 13.8 | 3.10 | 4.45 |
| Chasey Kim | 61.1 | 247 | 718 | 11.7 | 2.91 | 4.03 |
| Tom Seaver | 71.0 | 276 | 807 | 11.4 | 2.92 | 3.89 |
| Vern Turnburner | 78.2 | 317 | 907 | 11.5 | 2.86 | 4.03 |
| Ritonda Black | 50.2 | 244 | 705 | 13.9 | 2.89 | 4.82 |
| Stooby Tubrek | 55.1 | 233 | 806 | 14.6 | 3.46 | 4.22 |
| Bret Saberhagen | 62.2 | 244 | 763 | 12.2 | 3.13 | 3.90 |
| Chucky Carrillo | 70.2 | 292 | 867 | 12.3 | 2.97 | 4.14 |
| Mike Mussina | 82.0 | 332 | 840 | 10.2 | 2.53 | 4.05 |
| Air Lovestone | 52.2 | 229 | 655 | 12.4 | 2.86 | 4.34 |
| Alberto Roberto | 55.2 | 247 | 744 | 13.4 | 3.01 | 4.44 |
| Randy Johnson | 68.1 | 288 | 856 | 12.5 | 2.97 | 4.22 |
| Bartolo Colon | 69.1 | 300 | 877 | 12.7 | 2.92 | 4.33 |
| Fabio Fabulo | 58.1 | 258 | 773 | 13.3 | 3.00 | 4.43 |
| Meow Bubbkins | 49.0 | 232 | 784 | 16.0 | 3.38 | 4.73 |
| Slip Sauder | 68.1 | 277 | 995 | 14.6 | 3.59 | 4.06 |
| Justin Verlander | 78.0 | 320 | 1164 | 14.9 | 3.64 | 4.10 |
| Kerwin Arches | 62.2 | 273 | 1027 | 16.4 | 3.76 | 4.36 |
| Jerry Kapps | 51.2 | 226 | 834 | 16.2 | 3.69 | 4.39 |
| Hurley Bender | 66.1 | 282 | 1003 | 15.1 | 3.56 | 4.25 |
| Tom Glavine | 56.1 | 248 | 901 | 16.0 | 3.63 | 4.41 |
| Vida Blue | 52.0 | 229 | 836 | 16.1 | 3.65 | 4.40 |
| Ace von Acesson | 75.2 | 318 | 833 | 11.0 | 2.62 | 4.20 |
| Bob Gibson | 68.0 | 276 | 795 | 11.7 | 2.88 | 4.06 |
| Jack Morris | 58.2 | 255 | 834 | 14.2 | 3.27 | 4.35 |
| Nolan Ryan | 69.0 | 284 | 841 | 12.2 | 2.96 | 4.12 |
| Greg Maddux | 67.0 | 289 | 911 | 13.6 | 3.15 | 4.31 |
| Hiro Misano | 37.2 | 171 | 680 | 18.0 | 3.98 | 4.54 |
| Bob Feller | 53.2 | 235 | 702 | 13.1 | 2.99 | 4.38 |
| Donk Oh | 63.0 | 271 | 781 | 12.4 | 2.88 | 4.30 |
| Bertram Haftberger III | 31.1 | 141 | 471 | 15.0 | 3.34 | 4.50 |

---

## Statistical Analysis

### Key Metrics (Starting Pitchers Only)

| Metric | Value |
|--------|-------|
| **Sample Size** | 32 SP seasons |
| **Total IP** | 1,972.1 |
| **Total NP** | 26,698 |
| **Average NP/IP** | **13.5 pitches per inning** |
| **Median NP/IP** | ~13.0 |
| **Min NP/IP** | 10.2 (Mike Mussina - efficient!) |
| **Max NP/IP** | 18.0 (Hiro Misano) |

### Comparison to MLB

| Metric | MLB Average | SMB Average | Ratio |
|--------|-------------|-------------|-------|
| **Pitches per Inning** | 15.5-16.5 | 13.5 | **0.85** |
| **Pitches per Batter** | 3.8-4.0 | 3.15 | **0.82** |
| **Batters per Inning** | 4.2-4.3 | 4.25 | 0.99 |

**Key Finding**: SMB averages about **85% of MLB's pitch count** per inning, primarily because:
- Fewer pitches per at-bat (3.15 vs 3.9)
- Similar batters faced per inning

---

## SMB Maddux Threshold Calculation

### MLB Maddux Definition
- Complete Game Shutout (9 IP)
- Under 100 pitches
- That's **11.1 pitches per inning** (elite efficiency)

### SMB Scaling

Using the 0.85 ratio:

```
SMB Maddux Threshold = MLB Threshold × 0.85
                     = 100 × 0.85
                     = 85 pitches (for 9 innings)
```

**BUT** - a Maddux is about being **exceptionally efficient**, not just average.

The MLB Maddux threshold (11.1 NP/IP) is about **70% of MLB average** (15.5 NP/IP).

Applying that same "exceptional efficiency" standard to SMB:

```
SMB "Exceptional" NP/IP = SMB Average × 0.70
                       = 13.5 × 0.70
                       = 9.5 pitches per inning
```

### Recommended SMB Maddux Thresholds

| Innings | Pitches (Scaled 85%) | Pitches (Exceptional 70%) | **Recommended** |
|---------|---------------------|---------------------------|-----------------|
| **9** | 85 | 86 | **85** |
| **7** | 66 | 67 | **65** |
| **6** | 57 | 57 | **55** |
| **5** | 48 | 48 | **45** |

---

## Final Recommendation

### SMB Maddux Definition

> **A complete game shutout with fewer than 85 pitches (for a 9-inning game), scaled proportionally for shorter games.**

### Formula

```javascript
function getSMBMadduxThreshold(inningsInGame) {
  // Base: 85 pitches for 9 innings = 9.44 pitches per inning
  const PITCHES_PER_INNING = 9.44;
  return Math.round(PITCHES_PER_INNING * inningsInGame);
}

// Results:
// 9 innings: 85 pitches
// 7 innings: 66 pitches
// 6 innings: 57 pitches
```

### Alternative: Round Number Thresholds

For easier tracking, use these clean thresholds:

| Game Length | Maddux Threshold |
|-------------|------------------|
| **9 innings** | < 85 pitches |
| **7 innings** | < 65 pitches |
| **6 innings** | < 55 pitches |
| **5 innings** | < 45 pitches |

---

## Notable Efficient Pitchers from Data

Based on NP/IP (lower is better):

1. **Mike Mussina**: 10.2 NP/IP - Elite efficiency!
2. **Ace von Acesson**: 11.0 NP/IP
3. **Tom Seaver**: 11.4 NP/IP
4. **A.J. Burnett**: 11.5 NP/IP
5. **Vern Turnburner**: 11.5 NP/IP

These pitchers would be the most likely Maddux candidates. At 10.2 NP/IP, Mike Mussina would need only **92 pitches for 9 innings** - well under the 85-pitch threshold with his average efficiency.

---

## Implementation

```javascript
const MADDUX_THRESHOLDS = {
  9: 85,
  7: 65,
  6: 55,
  5: 45,
};

function checkMaddux(gameStats) {
  const { inningsPitched, pitchCount, runsAllowed, isCompleteGame } = gameStats;

  if (!isCompleteGame) return false;
  if (runsAllowed > 0) return false;  // Must be shutout

  const threshold = MADDUX_THRESHOLDS[inningsPitched] ||
    Math.round(9.44 * inningsPitched);

  return pitchCount < threshold;
}

// Example:
// checkMaddux({ inningsPitched: 9, pitchCount: 82, runsAllowed: 0, isCompleteGame: true })
// Returns: true (82 < 85, shutout, CG)
```

---

## Summary

| Metric | MLB | SMB |
|--------|-----|-----|
| **Average NP/IP** | 15.5-16.5 | 13.5 |
| **Maddux Threshold (9 inn)** | < 100 | **< 85** |
| **Maddux Threshold (7 inn)** | < 78 | **< 65** |
| **Ratio** | 1.00 | 0.85 |

**The SMB Maddux: A complete game shutout in under 85 pitches (9 innings).**
