export type SnakeRoomPhase = 'REVIEW' | 'ARM' | 'ANNOUNCE' | 'RECORDED' | 'CORRECTION';

export interface SnakeRecordedPick {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
}

export interface SnakeRoomState {
  phase: SnakeRoomPhase;
  candidateId: string | null;
  recordedPick: SnakeRecordedPick | null;
  paused: boolean;
  blockReason: string | null;
  notice: string | null;
}

export type SnakeRoomEvent =
  | { type: 'ARM'; candidateId: string; blockedBy?: string | null }
  | { type: 'GAVEL_DOWN' }
  | { type: 'GAVEL_RELEASE' }
  | { type: 'GAVEL_HOME'; recordedPick: SnakeRecordedPick }
  | { type: 'RECORD_FAILED' }
  | { type: 'OPEN_CORRECTION'; available?: boolean }
  | { type: 'CORRECTION_DONE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTORE'; paused: boolean }
  | { type: 'LIVE_PICK_MOVED' }
  | { type: 'NEXT_TURN'; candidateId?: string | null }
  | { type: 'ADVANCE'; candidateId?: string | null }
  | { type: 'CLEAR_NOTICE' };

export function createSnakeRoomState(paused = false): SnakeRoomState {
  return {
    phase: 'REVIEW',
    candidateId: null,
    recordedPick: null,
    paused,
    blockReason: null,
    notice: null,
  };
}

export function snakeRoomReducer(state: SnakeRoomState, event: SnakeRoomEvent): SnakeRoomState {
  switch (event.type) {
    case 'ARM':
      if (state.paused) return { ...state, notice: 'THE DRAFT IS PAUSED' };
      if (event.blockedBy) {
        return { ...state, phase: 'REVIEW', candidateId: event.candidateId, blockReason: event.blockedBy, notice: null };
      }
      return { ...state, phase: 'ARM', candidateId: event.candidateId, blockReason: null, notice: null };
    case 'GAVEL_DOWN':
      return state.paused || state.phase !== 'ARM' ? state : { ...state, phase: 'ANNOUNCE', notice: 'KEEP HOLDING' };
    case 'GAVEL_RELEASE':
      return state.phase !== 'ANNOUNCE'
        ? state
        : { ...state, phase: 'ARM', notice: 'NOT PICKED — HOLD CANCELED' };
    case 'GAVEL_HOME':
      return state.paused || state.phase !== 'ANNOUNCE'
        ? state
        : { ...state, phase: 'RECORDED', recordedPick: event.recordedPick, notice: 'PICK RECORDED' };
    case 'RECORD_FAILED':
      return { ...state, phase: 'ARM', notice: 'PICK NOT SAVED — HOLD THE GAVEL AGAIN' };
    case 'OPEN_CORRECTION':
      return event.available ? { ...state, phase: 'CORRECTION', notice: null } : state;
    case 'CORRECTION_DONE':
      return { ...state, phase: 'REVIEW', candidateId: null, recordedPick: null, notice: 'LAST ACTION UNDONE' };
    case 'PAUSE':
      return state.phase === 'RECORDED'
        ? { ...state, paused: true, notice: 'THE DRAFT IS PAUSED' }
        : { ...state, phase: 'REVIEW', candidateId: null, recordedPick: null, paused: true, notice: 'THE DRAFT IS PAUSED' };
    case 'RESUME':
      return state.phase === 'RECORDED'
        ? { ...state, paused: false, notice: 'PICK RECORDED' }
        : { ...state, phase: 'REVIEW', candidateId: null, recordedPick: null, paused: false, blockReason: null, notice: 'THE DRAFT IS BACK' };
    case 'RESTORE':
      return createSnakeRoomState(event.paused);
    case 'LIVE_PICK_MOVED':
      if (state.phase === 'RECORDED') return state;
      return { ...state, phase: 'REVIEW', candidateId: null, blockReason: null, notice: 'THE LIVE PICK MOVED — REVIEW THE NEW TURN' };
    case 'NEXT_TURN':
      if (state.phase === 'ANNOUNCE' || state.phase === 'RECORDED') return state;
      return { ...state, phase: 'REVIEW', candidateId: event.candidateId ?? null, blockReason: null, notice: null };
    case 'ADVANCE':
      return state.phase !== 'RECORDED'
        ? state
        : { ...state, phase: 'REVIEW', candidateId: event.candidateId ?? null, recordedPick: null, blockReason: null, notice: null };
    case 'CLEAR_NOTICE':
      return { ...state, notice: null };
  }
}
