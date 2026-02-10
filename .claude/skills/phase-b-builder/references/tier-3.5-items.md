# Tier 3.5: Narrative & Special Events — 7 Items

Key specs: [see individual items]
Notes: [see AUTHORITY.md for Phase B decisions]

---
### GAP-B13-001
- Severity: GAP
- Spec: STORIES_RETIREMENT.md S-RET005
- Code Location: RetirementFlow.tsx
- Spec Says: Probability recalculation: after each retirement, remaining players' probabilities increase as roster shrinks
- Code Says: No recalculation — probabilities are fixed after initial calculation
- Recommended Fix: Implement dynamic probability recalculation

---
### GAP-B13-002
- Severity: GAP
- Spec: STORIES_RETIREMENT.md S-RET007,009
- Code Location: RetirementFlow.tsx:781-797
- Spec Says: Jersey retirement with real career data (teams played for, WAR, seasons) persisted to IndexedDB
- Code Says: `teamsPlayedFor` hardcoded with fake stats ("8 seasons/32.1 WAR") for every player. No IndexedDB persistence
- Recommended Fix: Wire real career data; add retired numbers to franchise storage

---
### GAP-B13-005
- Severity: GAP
- Spec: STORIES_SEASON_END.md S-SEP008-009
- Code Location: N/A (not implemented)
- Spec Says: Championship fame bonus (+1 Fame to roster), championship morale boost
- Code Says: No code to apply fame or morale bonuses to championship roster
- Recommended Fix: Implement championship fame and morale effects

---
### GAP-B13-006
- Severity: GAP
- Spec: STORIES_TRADE.md S-TRD018-021
- Code Location: TradeFlow.tsx
- Spec Says: Waiver Wire: claim screen + results screen with waiver order, claim priority, player selection
- Code Says: WaiverPlayer interface defined (line 76-83) but ZERO UI rendering — both screens entirely unimplemented
- Recommended Fix: Implement waiver wire claim and results screens

---
### GAP-B13-007
- Severity: GAP
- Spec: STORIES_TRADE.md S-TRD014-015
- Code Location: TradeFlow.tsx
- Spec Says: AI trade proposals: AI generates trade offers using WAR differential, position need, salary analysis
- Code Says: Single hardcoded mockAIProposals entry. No real AI trade generation or evaluation logic
- Recommended Fix: Implement AI trade proposal generation engine

---
### GAP-B13-008
- Severity: GAP
- Spec: STORIES_TRADE.md S-TRD016-017
- Code Location: TradeFlow.tsx
- Spec Says: Three-way trades: validation logic, all three teams evaluate independently
- Code Says: Type defined but zero validation flow for three-team trades
- Recommended Fix: Implement three-way trade validation and evaluation

---
### MIS-B13-001
- Severity: MISMATCH
- Spec: STORIES_RETIREMENT.md S-RET001
- Code Location: RetirementFlow.tsx:125-145
- Spec Says: Retirement probability rank-based within roster: `max(5, 50-(ageRank*(45/rosterSize)))` where oldest gets highest probability
- Code Says: Code uses absolute age-based lookup table (age 42=47%, 25=3%, etc.) — no rank-based calculation
- Recommended Fix: Implement rank-based retirement probability per spec formula

---
## Summary
Total items: 7
