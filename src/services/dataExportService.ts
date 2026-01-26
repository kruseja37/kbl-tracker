/**
 * DataExportService - Export data to CSV/JSON
 * Per Ralph Framework S-G006
 *
 * Features:
 * - Box score export
 * - Season stats export
 * - CSV and JSON format options
 */

export type ExportFormat = 'csv' | 'json';

interface PlayerSeasonStats {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  games: number;
  pa: number;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  runs: number;
  sb: number;
  cs: number;
  bb: number;
  so: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  war: number;
}

interface BoxScorePlayer {
  playerId: string;
  playerName: string;
  position: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  avg: number;
}

interface BoxScoreData {
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  innings: number;
  homePlayers: BoxScorePlayer[];
  awayPlayers: BoxScorePlayer[];
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function convertToCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const headerRow = keys.join(',');

  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(',')
  );

  return [headerRow, ...rows].join('\n');
}

export function exportBoxScore(
  boxScore: BoxScoreData,
  format: ExportFormat = 'csv'
): void {
  const filename = `boxscore_${boxScore.gameId}_${boxScore.date.replace(/-/g, '')}.${format}`;

  if (format === 'json') {
    const content = JSON.stringify(boxScore, null, 2);
    downloadFile(content, filename, 'application/json');
    return;
  }

  // CSV format - combine into single table
  const allPlayers = [
    ...boxScore.awayPlayers.map((p) => ({
      ...p,
      team: boxScore.awayTeam,
      side: 'Away',
    })),
    ...boxScore.homePlayers.map((p) => ({
      ...p,
      team: boxScore.homeTeam,
      side: 'Home',
    })),
  ];

  const headers = [
    'team',
    'side',
    'playerName',
    'position',
    'ab',
    'r',
    'h',
    'rbi',
    'bb',
    'so',
    'avg',
  ];

  let content = `Game: ${boxScore.awayTeam} @ ${boxScore.homeTeam}\n`;
  content += `Date: ${boxScore.date}\n`;
  content += `Final: ${boxScore.awayScore} - ${boxScore.homeScore} (${boxScore.innings} innings)\n\n`;
  content += convertToCSV(allPlayers as Record<string, unknown>[], headers);

  downloadFile(content, filename, 'text/csv');
}

export function exportSeasonStats(
  seasonId: string,
  stats: PlayerSeasonStats[],
  format: ExportFormat = 'csv'
): void {
  const filename = `season_stats_${seasonId}.${format}`;

  if (format === 'json') {
    const content = JSON.stringify(
      { seasonId, exportDate: new Date().toISOString(), players: stats },
      null,
      2
    );
    downloadFile(content, filename, 'application/json');
    return;
  }

  // CSV format
  const headers = [
    'playerName',
    'teamName',
    'position',
    'G',
    'PA',
    'AB',
    'H',
    '2B',
    '3B',
    'HR',
    'RBI',
    'R',
    'SB',
    'CS',
    'BB',
    'SO',
    'AVG',
    'OBP',
    'SLG',
    'OPS',
    'WAR',
  ];

  const rows = stats.map((s) => ({
    playerName: s.playerName,
    teamName: s.teamName,
    position: s.position,
    G: s.games,
    PA: s.pa,
    AB: s.ab,
    H: s.hits,
    '2B': s.doubles,
    '3B': s.triples,
    HR: s.hr,
    RBI: s.rbi,
    R: s.runs,
    SB: s.sb,
    CS: s.cs,
    BB: s.bb,
    SO: s.so,
    AVG: s.avg.toFixed(3),
    OBP: s.obp.toFixed(3),
    SLG: s.slg.toFixed(3),
    OPS: s.ops.toFixed(3),
    WAR: s.war.toFixed(1),
  }));

  const content = convertToCSV(rows as Record<string, unknown>[], headers);
  downloadFile(content, filename, 'text/csv');
}

export function exportPitchingStats(
  seasonId: string,
  stats: {
    playerId: string;
    playerName: string;
    teamName: string;
    games: number;
    starts: number;
    wins: number;
    losses: number;
    saves: number;
    ip: number;
    hits: number;
    runs: number;
    er: number;
    bb: number;
    so: number;
    hr: number;
    era: number;
    whip: number;
    war: number;
  }[],
  format: ExportFormat = 'csv'
): void {
  const filename = `pitching_stats_${seasonId}.${format}`;

  if (format === 'json') {
    const content = JSON.stringify(
      { seasonId, exportDate: new Date().toISOString(), pitchers: stats },
      null,
      2
    );
    downloadFile(content, filename, 'application/json');
    return;
  }

  const headers = [
    'playerName',
    'teamName',
    'G',
    'GS',
    'W',
    'L',
    'SV',
    'IP',
    'H',
    'R',
    'ER',
    'BB',
    'SO',
    'HR',
    'ERA',
    'WHIP',
    'WAR',
  ];

  const rows = stats.map((s) => ({
    playerName: s.playerName,
    teamName: s.teamName,
    G: s.games,
    GS: s.starts,
    W: s.wins,
    L: s.losses,
    SV: s.saves,
    IP: s.ip.toFixed(1),
    H: s.hits,
    R: s.runs,
    ER: s.er,
    BB: s.bb,
    SO: s.so,
    HR: s.hr,
    ERA: s.era.toFixed(2),
    WHIP: s.whip.toFixed(3),
    WAR: s.war.toFixed(1),
  }));

  const content = convertToCSV(rows as Record<string, unknown>[], headers);
  downloadFile(content, filename, 'text/csv');
}

export function exportCareerStats(
  playerId: string,
  playerName: string,
  seasonStats: {
    seasonId: string;
    year: number;
    teamName: string;
    games: number;
    war: number;
    keyStats: Record<string, number | string>;
  }[],
  format: ExportFormat = 'csv'
): void {
  const filename = `career_${playerName.replace(/\s+/g, '_')}.${format}`;

  if (format === 'json') {
    const content = JSON.stringify(
      {
        playerId,
        playerName,
        exportDate: new Date().toISOString(),
        seasons: seasonStats,
      },
      null,
      2
    );
    downloadFile(content, filename, 'application/json');
    return;
  }

  // CSV format
  const allKeys = new Set<string>();
  for (const s of seasonStats) {
    Object.keys(s.keyStats).forEach((k) => allKeys.add(k));
  }

  const headers = ['Year', 'Team', 'G', 'WAR', ...Array.from(allKeys)];

  const rows = seasonStats.map((s) => {
    const row: Record<string, unknown> = {
      Year: s.year,
      Team: s.teamName,
      G: s.games,
      WAR: s.war.toFixed(1),
    };
    for (const key of allKeys) {
      row[key] = s.keyStats[key] ?? '';
    }
    return row;
  });

  const content = convertToCSV(rows, headers);
  downloadFile(content, filename, 'text/csv');
}
