# Worst Case Scenario Audit

## Critical Discovery: Extra Events Not Processed!

**MAJOR BUG FOUND**: In `index.tsx`, the `handleAtBatFlowComplete` function receives `flowState` which includes `extraEvents`, but:
1. `extraEvents` is NEVER read from `flowState`
2. `extraEvents` is NEVER logged to `activityLog`
3. `extraEvents` is NEVER used to update `playerStats` (e.g., SB stat)
4. The `generateActivityLog` function IGNORES `extraEvents` entirely

This explains why the screenshot showed stacked events - they're being collected in AtBatFlow state but never properly processed or persisted.

---

## Exhaustive Worst-Case Scenario List

### Category 1: Data Loss / Not Recorded

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 1.1 | Extra events (SB/WP/PB/E/BALK) during AB | Recorded in log + stats | **HIGH** | ❌ NOT IMPLEMENTED |
| 1.2 | Runner scores but force out negates run | Run NOT scored, RBI adjusted | Medium | ⚠️ Needs verification |
| 1.3 | Multiple runners score on single play | All runs + RBIs recorded | Medium | ⚠️ Needs verification |
| 1.4 | DP with runner scoring before out | Run should count (timing) | Medium | ⚠️ Needs verification |
| 1.5 | Error allows extra advancement | E stat recorded | Medium | ❌ Not tracked |

### Category 2: Incorrect State Transitions

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 2.1 | R1 held on walk | BLOCKED - impossible | Medium | ✅ Blocked in UI |
| 2.2 | R2 held on walk when R1 exists | BLOCKED - impossible | Medium | ✅ Blocked in UI |
| 2.3 | Runner on wrong base after play | Bases updated correctly | High | ⚠️ Needs verification |
| 2.4 | Ghost runner (runner disappears) | Runner tracked properly | High | ⚠️ Needs verification |
| 2.5 | Duplicate runner on same base | Prevented | High | ⚠️ Needs verification |

### Category 3: Stat Accuracy

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 3.1 | SB during AB not recorded | SB stat incremented | **HIGH** | ❌ NOT IMPLEMENTED |
| 3.2 | WP/PB during AB not recorded | WP/PB stat tracked | **HIGH** | ❌ NOT IMPLEMENTED |
| 3.3 | RBI on SF | RBI recorded | Medium | ✅ Appears correct |
| 3.4 | No RBI on error | RBI = 0 | Medium | ✅ Implemented |
| 3.5 | No RBI on DP | RBI = 0 | Medium | ✅ Implemented |
| 3.6 | 2B/3B hit types tracked | doubles/triples stats | Low | ✅ Implemented |

### Category 4: UI/UX Bugs

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 4.1 | Extra events stack on repeated clicks | Only ONE event per runner | **HIGH** | ⚠️ Fix in AtBatFlow, but log issue |
| 4.2 | Submit while pendingExtraEvent | BLOCKED | Medium | ✅ Blocked |
| 4.3 | Rapid button clicks cause race | State consistent | Medium | ⚠️ Needs verification |
| 4.4 | Cancel clears all state | Clean reset | Low | ⚠️ Needs verification |
| 4.5 | Auto-correction message shown | User sees SF conversion | Low | ⚠️ Needs verification |

### Category 5: Edge Cases

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 5.1 | D3K with R1 (can't reach) | D3K blocked or handled | Medium | ⚠️ Needs verification |
| 5.2 | 3rd out is force out | No runs score | High | ✅ Implemented |
| 5.3 | Tag-up on LO (not FO) | No auto-tag-up | Low | ✅ Only FO defaults to scored |
| 5.4 | Bases loaded walk forces run | R3 scores, others advance | Medium | ✅ Tested |
| 5.5 | Triple clears all bases | All runners score | Medium | ✅ Tested |

### Category 6: Undo/Redo Integrity

| # | Scenario | Expected | Risk | Status |
|---|----------|----------|------|--------|
| 6.1 | Undo restores all state | Complete restoration | Medium | ⚠️ Needs verification |
| 6.2 | Undo mid-flow | Flow cancelled, state restored | Medium | ⚠️ Needs verification |
| 6.3 | Multiple undos | Stack works correctly | Low | ⚠️ Needs verification |

---

## Priority Fixes Required

### P0 - Critical (Data Loss)
1. **Implement extra event processing in handleAtBatFlowComplete**
   - Read `flowState.extraEvents`
   - Log each extra event to `activityLog`
   - Update `playerStats` (SB count, etc.)

2. **Verify extra events cleared on selection change**
   - AtBatFlow fix is in place, verify it works

### P1 - High (Incorrect Data)
3. **Test force out third out rule**
   - Verify runs negated correctly
   - Verify RBI adjusted correctly

4. **Test runner base placement**
   - Verify no ghost runners
   - Verify no duplicate runners

### P2 - Medium (UX Issues)
5. **Test undo functionality**
6. **Test rapid clicking behavior**
7. **Test auto-correction display**

---

## Test Plan

### Phase 1: Fix Extra Events (P0)
1. Modify `handleAtBatFlowComplete` to process `extraEvents`
2. Modify `generateActivityLog` to include extra events
3. Add SB/WP/PB/E tracking to player stats

### Phase 2: Integration Tests
1. Create test scenarios for each worst-case
2. Run through each scenario manually or via automated test
3. Document results

### Phase 3: Regression Testing
1. Re-run all 30 unit tests
2. Run full game simulation
3. Verify activity log accuracy

---

*Document created for exhaustive QA*
