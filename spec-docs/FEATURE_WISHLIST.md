# KBL Feature Wishlist (Deferred Items)

> Items explicitly deferred from v1 to reduce architectural risk.
> Each item includes context on why it was deferred and when to revisit.

---

## Deferred from Franchise Deep-Dive Analysis

### High Priority (v2)

1. **Contraction System (Offseason Phase 4)**
   - Why deferred: VERY HIGH architectural risk. Touches division alignment, schedule, roster management, career stats, draft order, fan morale for every team.
   - Replacement: Fan morale → ratings adjustment loop provides competitive balance without removing teams.
   - Revisit when: Core franchise loop (Seasons 1-3) is stable and tested.

2. **Advanced AI GM Personalities**
   - Why deferred: Requires extensive tuning. Launch with Minimum Viable AI (reasonable, not optimal decisions).
   - What's deferred: AI personality profiles (aggressive/conservative), rebuild/compete strategic planning, contextual need assessment.
   - What's included in v1: AI trade Accept/Reject/Counter, AI draft picks, AI roster management in Finalize & Advance.
   - Revisit when: v1 franchise mode has been played through 3+ seasons.

3. **LLM-Assisted Narrative Generation**
   - Why deferred: Content quality depends on prompt engineering that requires real game context to calibrate.
   - What's included in v1: Template-based narrative with reporter personality filtering (3-5 templates per event type × 10 personalities).
   - Revisit when: Template fatigue is reported by playtesters (likely after 5-10 seasons).

4. **Almanac Insights Engine (Emergent Pattern Detection)**
   - Why deferred: Requires statistical analysis infrastructure and enough historical data to find meaningful patterns.
   - What's included in v1: Basic Almanac with filtering, sorting, record display.
   - What's deferred: Automatic correlation detection, streak surfacing, cross-season pattern recognition, beat reporter "imperceptible insights."
   - Revisit when: Event store has 3+ seasons of data.

### Medium Priority (v2-v3)

5. **Coaching Quality Factor for Development**
   - Why deferred: KBL development is performance-based (EOS adjustments) not simulation-based.
   - OOTP has it: Coaching quality affects development speed.
   - Revisit when: If multi-season franchise play feels too predictable.

6. **Scouting Trade / Scout Market**
   - Why deferred: Scout system is new; need to validate base mechanics first.
   - Concept: Trade scouts between teams, fire underperforming scouts, scouts retire.
   - Revisit when: Scouting system has been used for 2+ draft cycles.

7. **Multi-Year Contracts**
   - Why deferred: Adds enormous complexity (backloaded deals, dead money, luxury tax) without proportional fun.
   - KBL uses: Single-season salary derived from ratings.
   - Revisit when: If community requests persistent contract structures.

8. **Salary Cap System**
   - Why deferred: Need to validate that fan morale → expectations → ratings loop provides sufficient competitive balance without a hard cap.
   - Revisit when: If franchise play shows runaway team-building with no natural constraint.

9. **In-Season Player Development (beyond REG micro-adjustments)**
   - Why deferred: KBL's model is performance-based, not simulation-based.
   - What's included: REG "light bulb moment" events granting ±2 rating adjustments.
   - What's deferred: Continuous development curves, playing time → skill growth, challenge level factors.
   - Revisit when: If prospect-to-MLB transition feels too binary.

10. **Dispersal Draft for Contracted Teams**
    - Why deferred: Contraction itself is deferred.
    - Concept: When a team is contracted, dispersal pool feeds into a special draft (not FA).
    - Revisit when: Contraction is implemented.

### Lower Priority (v3+)

11. **Exhibition Mode as Standalone**
    - Why deferred: v1 focuses entirely on franchise mode.
    - Revisit when: Franchise mode is complete and stable.

12. **Weather/Altitude Effects on Park Factors**
    - Why deferred: SMB4 has no weather system. Only day/night toggle exists (cosmetic only).
    - Revisit when: If SMB5 introduces weather.

13. **Fan Experience Factors (Noise Level)**
    - Why deferred: Speculative mechanic with unclear gameplay impact.
    - Revisit when: Stadium analytics system is mature.

14. **Month-by-Month Park Factors**
    - Why deferred: No weather in SMB4, and fictional dates mean seasonal weather effects don't apply.
    - Revisit when: Never unless SMB introduces weather.

15. **Day/Night Splits for Park Factors**
    - Why deferred: Day/night is cosmetic only in SMB4.
    - Revisit when: If SMB introduces day/night gameplay effects.

---

## Deferred from Follow-Up Discussion

16. **AI-Controlled Team Season Simulation**
    - Why deferred: Requires simulated game stats for AI vs AI games. v1 is human-played games only.
    - Concept: One user-controlled team + AI opponents with simulated AI vs AI games.
    - Value: Enables solo franchise mode with meaningful league context.
    - Revisit when: Core engine is stable and event-driven refactor is complete.

17. **User-Contributed Almanac Lore**
    - Why deferred: Requires custom tagging/notation UI.
    - Concept: Users add names, notes, and "lore" entries to events, players, seasons ("The Great Trade Robbery of Season 4").
    - Revisit when: Almanac base feature is built.

18. **Emergent Narrative Engine (Auto-detected league-wide patterns)**
    - Why deferred: Requires statistical correlation analysis across seasons.
    - Concept: Beat reporters notice imperceptible statistical relationships (Player X always hits worse at Stadium Y vs LHP).
    - Revisit when: Event store has enough data and Almanac Insights Engine is built.

---

*Last updated: February 2026*
*Source: Franchise Mode Deep-Dive Analysis + JK Follow-Up Notes*
