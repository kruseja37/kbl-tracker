# Baseball Rules Quick Reference
## MUST CONSULT BEFORE CHANGING GAME LOGIC

**Purpose:** Prevent incorrect "fixes" by providing authoritative rule references.

---

## Rule 5.08(a) - When Runs Do NOT Score

**A run does NOT score if the third out is made by:**

1. **The batter-runner before touching first base**
   - GO where batter is thrown out at 1B = NO RUN (even if R3 crossed home first)
   - DP where batter is out at 1B = NO RUN
   - FC where batter would be out at 1B = NO RUN

2. **Any runner being forced out**
   - R1 out at 2B (forced by batter) = NO RUN
   - R2 out at 3B when R1 exists (chain force) = NO RUN  
   - R3 out at home when bases loaded (chain force) = NO RUN

3. **A preceding runner failing to touch a base (appeal play)**

---

## When Runs CAN Score on Third Out

**Only on TAG plays (not force outs):**
- FO caught, then runner tagged out trying to advance = TIME PLAY
- If runner crossed home BEFORE the tag, run counts

**Example:**
- R3, R1, 1 out
- FO caught (2 outs)
- R3 tags and runs home
- R1 thrown out at 1B (tag play, didn't tag up)
- If R3 crossed home BEFORE the tag at 1B, run counts

---

## Force Out Definition

A runner is FORCED when:
- The batter becomes a runner AND
- There is no empty base behind the runner

**Force chain:**
- Batter always forces R1
- R1 forces R2 only if R1 is forced
- R2 forces R3 only if R2 is forced

---

## DO NOT CHANGE WITHOUT CONSULTING:

1. This document
2. MASTER_BASEBALL_RULES_AND_LOGIC.md
3. RUNNER_ADVANCEMENT_RULES.md
4. The user

---

*Created after near-mistake on force out rule interpretation*
