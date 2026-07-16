import type {
  LeagueBuilderMlbDraftSession,
  SnakeDraftCorrectionSnapshot,
} from '../utils/leagueBuilderStorage';

function snapshot(
  session: LeagueBuilderMlbDraftSession,
  action: SnakeDraftCorrectionSnapshot['action'],
): SnakeDraftCorrectionSnapshot {
  const priorSession = { ...session };
  delete priorSession.correctionSnapshots;
  return {
    action,
    // Run It Back is a real one-action rewind. Offers that were live immediately
    // before the action are part of that truth and carry the restored revision.
    priorSession,
  };
}

/** One window only: every completed action overwrites the previous correction snapshot. */
export function withLatestSnakeCorrection(
  session: LeagueBuilderMlbDraftSession,
  action: SnakeDraftCorrectionSnapshot['action'],
): LeagueBuilderMlbDraftSession {
  return { ...session, correctionSnapshots: [snapshot(session, action)] };
}

export function restoreLatestSnakeCorrection(
  session: LeagueBuilderMlbDraftSession,
): LeagueBuilderMlbDraftSession {
  const latest = session.correctionSnapshots?.[0];
  return latest ? latest.priorSession : session;
}
