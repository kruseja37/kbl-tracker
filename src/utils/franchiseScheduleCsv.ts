import type { FranchiseScheduleImportRow, ScheduledGame } from './scheduleStorage';

export interface FranchiseScheduleCsvTeamRef {
  id: string;
  name?: string;
  abbreviation?: string;
}

export interface FranchiseScheduleCsvIssue {
  rowNumber: number;
  code:
    | 'EMPTY_FILE'
    | 'MISSING_HEADER'
    | 'MALFORMED_ROW'
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_GAME_NUMBER'
    | 'UNKNOWN_TEAM'
    | 'SAME_TEAM'
    | 'DUPLICATE_GAME_NUMBER';
  message: string;
  field?: string;
}

export interface ParsedFranchiseScheduleCsvRow {
  rowNumber: number;
  gameNumber?: number;
  dayNumber?: number;
  date?: string;
  time?: string;
  notes?: string;
  awayTeamInput?: string;
  homeTeamInput?: string;
  awayTeamId?: string;
  homeTeamId?: string;
}

export interface FranchiseScheduleCsvValidationResult {
  rows: ParsedFranchiseScheduleCsvRow[];
  acceptedRows: FranchiseScheduleImportRow[];
  issues: FranchiseScheduleCsvIssue[];
  hasErrors: boolean;
}

export interface ValidateFranchiseScheduleCsvOptions {
  teams: FranchiseScheduleCsvTeamRef[];
  existingGames?: Pick<ScheduledGame, 'gameNumber'>[];
  allowDuplicateGameNumbers?: boolean;
}

type CsvMappedHeader =
  | 'gameNumber'
  | 'dayNumber'
  | 'date'
  | 'time'
  | 'notes'
  | 'awayTeamInput'
  | 'homeTeamInput';

const HEADER_ALIASES: Record<string, CsvMappedHeader> = {
  gamenumber: 'gameNumber',
  game: 'gameNumber',
  gameid: 'gameNumber',
  order: 'gameNumber',
  ordernumber: 'gameNumber',
  daynumber: 'dayNumber',
  day: 'dayNumber',
  date: 'date',
  time: 'time',
  notes: 'notes',
  note: 'notes',
  awayteam: 'awayTeamInput',
  awayteamid: 'awayTeamInput',
  away: 'awayTeamInput',
  roadteam: 'awayTeamInput',
  hometeam: 'homeTeamInput',
  hometeamid: 'homeTeamInput',
  home: 'homeTeamInput',
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeTeamLookup(value: string): string {
  return value.trim().toLowerCase();
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value.trim());
  return parsed > 0 ? parsed : undefined;
}

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function buildTeamResolver(teams: FranchiseScheduleCsvTeamRef[]): (input?: string) => string | undefined {
  const lookup = new Map<string, string>();
  for (const team of teams) {
    lookup.set(normalizeTeamLookup(team.id), team.id);
    if (team.name) lookup.set(normalizeTeamLookup(team.name), team.id);
    if (team.abbreviation) lookup.set(normalizeTeamLookup(team.abbreviation), team.id);
  }

  return (input?: string) => {
    if (!input) return undefined;
    return lookup.get(normalizeTeamLookup(input));
  };
}

export function validateFranchiseScheduleCsv(
  csvText: string,
  options: ValidateFranchiseScheduleCsvOptions,
): FranchiseScheduleCsvValidationResult {
  const issues: FranchiseScheduleCsvIssue[] = [];
  const rows: ParsedFranchiseScheduleCsvRow[] = [];
  const acceptedRows: FranchiseScheduleImportRow[] = [];
  const allowDuplicateGameNumbers = options.allowDuplicateGameNumbers ?? false;
  const resolveTeam = buildTeamResolver(options.teams);

  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    issues.push({
      rowNumber: 1,
      code: 'EMPTY_FILE',
      message: 'Schedule CSV is empty.',
    });
    return { rows, acceptedRows, issues, hasErrors: true };
  }

  const headerValues = parseCsvLine(lines[0]);
  const headerMap = headerValues.map((header) => HEADER_ALIASES[normalize(header)]);
  const requiredHeaders: CsvMappedHeader[] = [
    'gameNumber',
    'awayTeamInput',
    'homeTeamInput',
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headerMap.includes(requiredHeader)) {
      issues.push({
        rowNumber: 1,
        code: 'MISSING_HEADER',
        field: requiredHeader,
        message: `Schedule CSV header is missing ${requiredHeader}.`,
      });
    }
  }

  if (issues.length > 0) {
    return { rows, acceptedRows, issues, hasErrors: true };
  }

  const seenGameNumbers = new Map<number, number>();
  const existingGameNumbers = new Set(
    (options.existingGames ?? []).map((game) => game.gameNumber),
  );

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const rowNumber = lineIndex + 1;
    const values = parseCsvLine(lines[lineIndex]);

    if (values.length !== headerValues.length) {
      issues.push({
        rowNumber,
        code: 'MALFORMED_ROW',
        message: `Row ${rowNumber} has ${values.length} fields; expected ${headerValues.length}.`,
      });
      rows.push({ rowNumber });
      continue;
    }

    const draft: ParsedFranchiseScheduleCsvRow = { rowNumber };
    for (let columnIndex = 0; columnIndex < headerMap.length; columnIndex += 1) {
      const mappedHeader = headerMap[columnIndex];
      if (!mappedHeader) continue;

      const value = values[columnIndex];
      switch (mappedHeader) {
        case 'gameNumber':
          draft.gameNumber = parsePositiveInteger(value);
          break;
        case 'dayNumber':
          draft.dayNumber = parsePositiveInteger(value);
          break;
        case 'date':
          draft.date = cleanOptional(value);
          break;
        case 'time':
          draft.time = cleanOptional(value);
          break;
        case 'notes':
          draft.notes = cleanOptional(value);
          break;
        case 'awayTeamInput':
          draft.awayTeamInput = cleanOptional(value);
          break;
        case 'homeTeamInput':
          draft.homeTeamInput = cleanOptional(value);
          break;
      }
    }

    const rowIssues: FranchiseScheduleCsvIssue[] = [];

    if (!draft.gameNumber) {
      rowIssues.push({
        rowNumber,
        code: values[headerMap.indexOf('gameNumber')]?.trim()
          ? 'INVALID_GAME_NUMBER'
          : 'MISSING_REQUIRED_FIELD',
        field: 'gameNumber',
        message: `Row ${rowNumber} needs a positive game number/order.`,
      });
    }

    if (!draft.awayTeamInput) {
      rowIssues.push({
        rowNumber,
        code: 'MISSING_REQUIRED_FIELD',
        field: 'awayTeam',
        message: `Row ${rowNumber} is missing away team.`,
      });
    }
    if (!draft.homeTeamInput) {
      rowIssues.push({
        rowNumber,
        code: 'MISSING_REQUIRED_FIELD',
        field: 'homeTeam',
        message: `Row ${rowNumber} is missing home team.`,
      });
    }

    draft.awayTeamId = resolveTeam(draft.awayTeamInput);
    draft.homeTeamId = resolveTeam(draft.homeTeamInput);

    if (draft.awayTeamInput && !draft.awayTeamId) {
      rowIssues.push({
        rowNumber,
        code: 'UNKNOWN_TEAM',
        field: 'awayTeam',
        message: `Row ${rowNumber} has unknown away team "${draft.awayTeamInput}".`,
      });
    }
    if (draft.homeTeamInput && !draft.homeTeamId) {
      rowIssues.push({
        rowNumber,
        code: 'UNKNOWN_TEAM',
        field: 'homeTeam',
        message: `Row ${rowNumber} has unknown home team "${draft.homeTeamInput}".`,
      });
    }

    if (draft.awayTeamId && draft.homeTeamId && draft.awayTeamId === draft.homeTeamId) {
      rowIssues.push({
        rowNumber,
        code: 'SAME_TEAM',
        message: `Row ${rowNumber} cannot schedule a team against itself.`,
      });
    }

    if (!allowDuplicateGameNumbers && draft.gameNumber) {
      const firstSeenRow = seenGameNumbers.get(draft.gameNumber);
      if (firstSeenRow != null) {
        rowIssues.push({
          rowNumber,
          code: 'DUPLICATE_GAME_NUMBER',
          field: 'gameNumber',
          message: `Row ${rowNumber} duplicates game number ${draft.gameNumber} from row ${firstSeenRow}.`,
        });
      } else if (existingGameNumbers.has(draft.gameNumber)) {
        rowIssues.push({
          rowNumber,
          code: 'DUPLICATE_GAME_NUMBER',
          field: 'gameNumber',
          message: `Row ${rowNumber} duplicates existing game number ${draft.gameNumber}.`,
        });
      } else {
        seenGameNumbers.set(draft.gameNumber, rowNumber);
      }
    }

    rows.push(draft);
    issues.push(...rowIssues);

    if (rowIssues.length === 0 && draft.gameNumber && draft.awayTeamId && draft.homeTeamId) {
      acceptedRows.push({
        gameNumber: draft.gameNumber,
        dayNumber: draft.dayNumber ?? draft.gameNumber,
        date: draft.date,
        time: draft.time,
        notes: draft.notes,
        awayTeamId: draft.awayTeamId,
        homeTeamId: draft.homeTeamId,
      });
    }
  }

  if (rows.length === 0) {
    issues.push({
      rowNumber: 1,
      code: 'EMPTY_FILE',
      message: 'Schedule CSV has a header but no game rows.',
    });
  }

  return {
    rows,
    acceptedRows,
    issues,
    hasErrors: issues.length > 0,
  };
}
