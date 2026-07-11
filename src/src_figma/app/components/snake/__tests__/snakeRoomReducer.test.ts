import { describe, expect, it } from 'vitest';

import {
  createSnakeRoomState,
  snakeRoomReducer,
  type SnakeRoomEvent,
} from '../snakeRoomReducer';

function run(events: SnakeRoomEvent[]) {
  return events.reduce(snakeRoomReducer, createSnakeRoomState());
}

const recordedPick = { playerId: 'p1', playerName: 'Sam Slugger', teamId: 'a', teamName: 'Kodiaks' };

describe('snakeRoomReducer', () => {
  it('keeps REVIEW, ARM, ANNOUNCE, RECORDED, and CORRECTION separate', () => {
    const armed = run([{ type: 'ARM', candidateId: 'p1' }]);
    expect(armed.phase).toBe('ARM');
    const announcing = snakeRoomReducer(armed, { type: 'GAVEL_DOWN' });
    expect(announcing.phase).toBe('ANNOUNCE');
    const recorded = snakeRoomReducer(announcing, { type: 'GAVEL_HOME', recordedPick });
    expect(recorded.phase).toBe('RECORDED');
    expect(snakeRoomReducer(recorded, { type: 'OPEN_CORRECTION', available: true }).phase).toBe('CORRECTION');
  });

  it('snaps an early gavel release back without recording a pick', () => {
    const state = run([
      { type: 'ARM', candidateId: 'p1' },
      { type: 'GAVEL_DOWN' },
      { type: 'GAVEL_RELEASE' },
    ]);
    expect(state.phase).toBe('ARM');
    expect(state.notice).toBe('NOT PICKED — HOLD CANCELED');
    expect(state.recordedPick).toBeNull();
  });

  it('returns to ARM when the per-pick save fails', () => {
    const announcing = run([{ type: 'ARM', candidateId: 'p1' }, { type: 'GAVEL_DOWN' }]);
    const failed = snakeRoomReducer(announcing, { type: 'RECORD_FAILED' });
    expect(failed.phase).toBe('ARM');
    expect(failed.notice).toBe('PICK NOT SAVED — HOLD THE GAVEL AGAIN');
  });

  it('never arms an illegal pick and keeps the engine facts visible', () => {
    const state = run([{ type: 'ARM', candidateId: 'p1', blockedBy: 'You still need 2 catchers.' }]);
    expect(state.phase).toBe('REVIEW');
    expect(state.blockReason).toBe('You still need 2 catchers.');
  });

  it('gates arm and announce while paused, then resumes in REVIEW', () => {
    const paused = run([{ type: 'PAUSE' }, { type: 'ARM', candidateId: 'p1' }, { type: 'GAVEL_DOWN' }]);
    expect(paused.phase).toBe('REVIEW');
    expect(paused.paused).toBe(true);
    const resumed = snakeRoomReducer(paused, { type: 'RESUME' });
    expect(resumed.phase).toBe('REVIEW');
    expect(resumed.candidateId).toBeNull();
  });

  it('resume never restores ARM and a live-pick trade cancels ARM', () => {
    const armed = run([{ type: 'ARM', candidateId: 'p1' }]);
    expect(snakeRoomReducer(armed, { type: 'RESTORE', paused: false }).phase).toBe('REVIEW');
    const traded = snakeRoomReducer(armed, { type: 'LIVE_PICK_MOVED' });
    expect(traded.phase).toBe('REVIEW');
    expect(traded.notice).toBe('THE LIVE PICK MOVED — REVIEW THE NEW TURN');
  });

  it('latches the recorded pick through next-turn updates until explicit ADVANCE', () => {
    const recorded = run([
      { type: 'ARM', candidateId: 'p1' },
      { type: 'GAVEL_DOWN' },
      { type: 'GAVEL_HOME', recordedPick },
    ]);
    const nextTurn = snakeRoomReducer(recorded, { type: 'NEXT_TURN', candidateId: 'p2' });
    expect(nextTurn.phase).toBe('RECORDED');
    expect(nextTurn.recordedPick).toEqual(recordedPick);
    const advanced = snakeRoomReducer(nextTurn, { type: 'ADVANCE', candidateId: 'p2' });
    expect(advanced.phase).toBe('REVIEW');
    expect(advanced.candidateId).toBe('p2');
    expect(advanced.recordedPick).toBeNull();
  });

  it('rejects a late gavel completion after pause or a live-pick trade', () => {
    const announcing = run([{ type: 'ARM', candidateId: 'p1' }, { type: 'GAVEL_DOWN' }]);
    const paused = snakeRoomReducer(announcing, { type: 'PAUSE' });
    expect(snakeRoomReducer(paused, { type: 'GAVEL_HOME', recordedPick }).phase).toBe('REVIEW');
    const moved = snakeRoomReducer(announcing, { type: 'LIVE_PICK_MOVED' });
    expect(snakeRoomReducer(moved, { type: 'GAVEL_HOME', recordedPick }).phase).toBe('REVIEW');
  });

  it('opens correction only when the persisted engine says one is available', () => {
    const state = createSnakeRoomState();
    expect(snakeRoomReducer(state, { type: 'OPEN_CORRECTION' }).phase).toBe('REVIEW');
    expect(snakeRoomReducer(state, { type: 'OPEN_CORRECTION', available: true }).phase).toBe('CORRECTION');
  });
});
