# KBL Personality System Specification

**Version**: 1.0
**Status**: Draft
**Last Updated**: February 2026

---

## 1. Overview

Every player in KBL has a hybrid personality system: 7 visible personality types combined with 4 hidden numeric modifiers. The visible type is shown to the user and influences narrative tone. The hidden modifiers drive behavioral mechanics without ever being revealed as numbers.

> **Design Goal**: Create deep, emergent player behavior without overwhelming the user with numbers. Players should feel like individuals with consistent personalities.

---

## 2. Visible Personality Types (7)

Shown to the user from the moment a player is drafted or imported.

| Type | Description | Behavioral Tendency |
|------|-------------|---------------------|
| **COMPETITIVE** | Driven to win | Seeks contenders, responds to challenges |
| **RELAXED** | Easy-going | Comfortable with status quo |
| **DROOPY** | Pessimistic | Prone to slumps, drifts in FA |
| **JOLLY** | Optimistic | Loves teammates, adventurous |
| **TOUGH** | Resilient | Bounces back, values respect |
| **TIMID** | Anxious | Fears change, avoids spotlight |
| **EGOTISTICAL** | Self-focused | Wants money and glory |

### 2.1 Distribution Weights

| Personality | Weight |
|-------------|--------|
| COMPETITIVE | 20% |
| RELAXED | 20% |
| JOLLY | 15% |
| TOUGH | 15% |
| TIMID | 10% |
| DROOPY | 10% |
| EGOTISTICAL | 10% |

---

## 3. Hidden Modifiers (4)

Never shown as numbers. Only surfaced through behavioral signals and beat reporter hints.

| Modifier | Range | Affects |
|----------|-------|---------|
| **Loyalty** | 0-100 | FA destination pref, willingness to take discount, trade request likelihood |
| **Ambition** | 0-100 | Development speed, award pursuit, willingness to change teams for opportunity |
| **Resilience** | 0-100 | Morale recovery speed, performance under adversity, retirement probability |
| **Charisma** | 0-100 | Teammate morale effects, fan engagement, team captain selection, mentorship |

### 3.1 Generation

Hidden modifiers generated via Gaussian distribution: μ=50, σ=20, clamped [0, 100].

### 3.2 Personality Bias

Visible type creates soft bias on hidden modifiers:

| Personality | Modifier Bias |
|-------------|--------------|
| COMPETITIVE | +10 Ambition |
| RELAXED | +10 Resilience |
| JOLLY | +10 Charisma |
| TOUGH | +10 Resilience, +5 Loyalty |
| TIMID | -10 Ambition, +5 Loyalty |
| DROOPY | -10 Resilience |
| EGOTISTICAL | +15 Ambition, -10 Loyalty |

---

## 4. How Hidden Modifiers Surface

| Modifier | Observable Signals |
|----------|-------------------|
| **High Loyalty** | Beat reporter: "He wants to retire here." FA: stays. Trade: resists. |
| **Low Loyalty** | Beat reporter: "Exploring options." FA: destination-agnostic. |
| **High Ambition** | Beat reporter: "Working overtime." Development: fast. FA: bigger role. |
| **Low Ambition** | Beat reporter: "Content with role." Development: slower. |
| **High Resilience** | Beat reporter: "Bounced back quickly." Morale: recovers fast. |
| **Low Resilience** | Beat reporter: "Still struggling." Morale: fragile. Retirement: likely. |
| **High Charisma** | Beat reporter: "Real leader." Teammates: morale boost. Captain candidate. |
| **Low Charisma** | Beat reporter: "Keeps to himself." Teammates: no effect. |

---

## 5. Mechanical Effects

### 5.1 Free Agency Destinations

Hidden modifiers weight FA destination preferences:
- High Loyalty → prefers current team
- High Ambition → prefers contender or starting role
- Low Resilience + low morale → prefers any change

See FREE_AGENCY_FIGMA_SPEC.md for full destination weighting.

### 5.2 Morale Events by Personality

See OFFSEASON_SYSTEM_SPEC.md §15.2 for personality-specific morale triggers.

### 5.3 Team Captain Selection

Highest combined (Loyalty + Charisma) among veterans (3+ seasons with team).

### 5.4 Retirement Probability

Low Resilience increases retirement probability at end-of-season.

---

## 6. Cross-References

| Spec | Relevance |
|------|-----------|
| OFFSEASON_SYSTEM_SPEC.md §14-15 | Full personality + morale system |
| NARRATIVE_SYSTEM_SPEC.md | Beat reporter personality-driven coverage |
| FREE_AGENCY_FIGMA_SPEC.md | Personality-weighted FA destinations |
| PROSPECT_GENERATION_SPEC.md | Initial personality assignment |

---

*Last Updated: February 20, 2026*
