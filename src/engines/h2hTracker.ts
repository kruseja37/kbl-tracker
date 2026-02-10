/**
 * Head-to-Head Record Tracker
 *
 * Stores and retrieves H2H records between teams for COMPETITIVE personality
 * rival calculation in Free Agency.
 *
 * Per STORIES_FREE_AGENCY.md S-FA006
 */

export interface H2HRecord {
  teamA: string;
  teamB: string;
  winsA: number;
  winsB: number;
  lastPlayed: string;
}

const H2H_STORAGE_KEY = 'kbl_h2h_records';

/** Get all H2H records */
export function getAllH2HRecords(): H2HRecord[] {
  const stored = localStorage.getItem(H2H_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/** Get H2H record between two specific teams */
export function getH2HRecord(teamA: string, teamB: string): H2HRecord | null {
  const records = getAllH2HRecords();
  return records.find(r =>
    (r.teamA === teamA && r.teamB === teamB) ||
    (r.teamA === teamB && r.teamB === teamA)
  ) || null;
}

/** Record a game result */
export function recordGameResult(winner: string, loser: string): void {
  const records = getAllH2HRecords();
  const existing = records.find(r =>
    (r.teamA === winner && r.teamB === loser) ||
    (r.teamA === loser && r.teamB === winner)
  );

  if (existing) {
    if (existing.teamA === winner) {
      existing.winsA++;
    } else {
      existing.winsB++;
    }
    existing.lastPlayed = new Date().toISOString();
  } else {
    records.push({
      teamA: winner,
      teamB: loser,
      winsA: 1,
      winsB: 0,
      lastPlayed: new Date().toISOString(),
    });
  }

  localStorage.setItem(H2H_STORAGE_KEY, JSON.stringify(records));
}

/**
 * Find the biggest rival for a team (most games played, closest record).
 * Used for COMPETITIVE personality routing in Free Agency.
 */
export function findRival(teamId: string): { rivalTeam: string; record: string } | null {
  const records = getAllH2HRecords();
  const teamRecords = records.filter(r => r.teamA === teamId || r.teamB === teamId);

  if (teamRecords.length === 0) return null;

  // Sort by total games played (most interaction = biggest rival)
  teamRecords.sort((a, b) => (b.winsA + b.winsB) - (a.winsA + a.winsB));

  const top = teamRecords[0];
  const isTeamA = top.teamA === teamId;
  const rivalTeam = isTeamA ? top.teamB : top.teamA;
  const wins = isTeamA ? top.winsA : top.winsB;
  const losses = isTeamA ? top.winsB : top.winsA;

  return { rivalTeam, record: `${wins}-${losses}` };
}

/** Clear all H2H records (e.g., for new franchise) */
export function clearH2HRecords(): void {
  localStorage.removeItem(H2H_STORAGE_KEY);
}
