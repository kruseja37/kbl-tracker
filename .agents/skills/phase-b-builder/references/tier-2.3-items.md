# Tier 2.3: Fame, Milestones & Fan Systems (Batch 10) — 9 Items

Key specs: FAME_SYSTEM_SPEC.md, MILESTONES_SPEC.md
Notes from AUTHORITY.md: See AUTHORITY.md §Pre-Resolved User Decisions

---

### GAP-B10-001
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §15/§24
- Code Location: New oddityRecordTracker.ts + museumStorage
- Spec Says: Oddity Records system: 19 record types (Shortest Homer, Slowest Triple, etc.) with OddityRecordCandidate interface, GameOddityState tracking, play-by-play/end-of-game/season-end checks
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No OddityRecord types, no tracking functions, no storage

---

### GAP-B10-002
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: New nicknameEngine.ts + player model
- Spec Says: Nickname system: 16 auto-nickname triggers (Mr. October, The Ace, The Machine, etc.) with checkForNickname(), user override, earned-season tracking
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Player model has no nickname field beyond leagueBuilder

---

### GAP-B10-003
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §25
- Code Location: New tradeEngine.ts + seasonStorage update
- Spec Says: In-season Trade system: trade execution, stat splits (byTeam array), trade deadline at 65% season, salary matching, trade history, WAR attribution per team stint
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No trade execution, no stat splits, no trade deadline prompt

---

### GAP-B10-004
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §25/§26
- Code Location: Player model + gameTracker integration
- Spec Says: Revenge game tracking: formerTeams array, revengeGames array, firstMeetingPlayed flag, performance tracking vs former team, 3-season duration
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No formerTeams, revengeGames, or revenge-game detection

---

### GAP-B10-005
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §24
- Code Location: New awardEmblems.ts + player model
- Spec Says: Award Emblems system: AWARD_EMBLEMS const (16 types), getPlayerEmblems() function, priority ordering, count display (e.g., "⭐(3)"), display in 4 locations (GameTracker, roster, player card, museum)
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. No emblem constants, display functions, or UI integration

---

### GAP-B10-006
- Severity: MAJOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §6
- Code Location: museumStorage or new hofEngine.ts
- Spec Says: HOF Score calculation: calculateHOFScore() with WAR×1.5 + MVP×15 + CY×15 + AS×3 + GG×2 + champ×5. Entry criteria: WAR≥50 OR MVP≥1 OR AS≥5 OR override
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Museum storage exists but no induction logic [USER NOTE: HOF score weighted by games/season variable from season setup]

---

### GAP-B10-007
- Severity: MINOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §19
- Code Location: Player/Team models
- Spec Says: Legacy status tracking: CORNERSTONE, FRANCHISE_ICON, LEGEND statuses. Dynasty tracking: CONTENDER, MINI_DYNASTY, DYNASTY. Team history with per-team WAR accumulation
- Code Says: (Not implemented)
- Recommended Fix: Partial — TeamMVP/cornerstone exist but no legacy status levels or dynasty detection

---

### GAP-B10-008
- Severity: MINOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: New calendarEngine.ts
- Spec Says: Fictional Calendar system: SEASON_CALENDAR const, getGameDate() mapping game# to calendar date, special dates (Opening Day, Trade Deadline, etc.)
- Code Says: (Not implemented)
- Recommended Fix: Zero implementation. Games use game numbers only, no fictional dates

---

### GAP-B10-009
- Severity: MINOR
- Spec: KBL_XHD_TRACKER_MASTER_SPEC_v3.md §26
- Code Location: narrativeEngine or new headlineEngine.ts
- Spec Says: Headlines Generator: HEADLINE_TEMPLATES (3 categories: PREGAME, POSTGAME, SEASON), generatePregameHeadlines(), generatePostgameHeadline() with priority ordering
- Code Says: (Not implemented)
- Recommended Fix: narrativeEngine has generateNarrative() for game recaps but NOT the pre/post-game headline template system described in master spec

---

---
## Summary
Total items: 9
