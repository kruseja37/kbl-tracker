import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type {
  BattingLine,
  PitchingLine,
  PlayerInstanceWpaSummary,
} from '../../../utils/almanacQueries';
import { getPlayerInstanceWpaSummary } from '../../../utils/almanacQueries';
import {
  getCanonicalPlayer,
  findCanonicalByPlayerId,
  type CanonicalPlayer,
  type CanonicalPlayerInstance,
} from '../../../utils/almanacStorage';
import type { CompletedGameRecord, PlayerRatingsSnapshot } from '../../../utils/gameStorage';
import {
  getLeaguePlayerOverride,
  getPlayer,
  type EditHistoryEntry,
  type LeaguePlayerOverrideRecord,
  type Player,
} from '../../../utils/leagueBuilderStorage';
import { FAME_TIER_LABEL, type FameTier } from '../../../types/reporter';
import { getEffectiveFame } from '../../../utils/effectiveValues';
import { getEffectivePlayer } from '../../../utils/playerOverrides';
import { getRunPromotionDecision } from '../../../utils/eliminationRunFameStorage';
import { formatWpaPoints } from '../../../utils/wpaDisplay';
import { FamePip } from '../components/FamePip';
import { PlayerFameSection, type PlayerFameGameSource } from '../components/PlayerFameSection';
import {
  buildPlayerName,
  formatBattingAverage,
  formatEarnedRunAverage,
  formatHometown,
  formatSalary,
  formatTimelineDate,
  getPlayerDisplayStats,
  getPlayerInstanceContext,
  isPitcherPosition,
} from '../utils/almanacPlayerViews';

type RatingState = PlayerRatingsSnapshot | Player;

interface TeamSummary {
  teamId: string;
  name: string;
  lastSeen: number;
}

interface TimelineItem {
  timestamp: number;
  kind: 'edit' | 'game';
  description: string;
}

interface TableRow {
  label: string;
  teams: TeamSummary[];
  values: Record<string, string | number>;
  highlight?: boolean;
}

interface PlayerCardState {
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
  canonicalPlayer: CanonicalPlayer | null;
  instance: CanonicalPlayerInstance | null;
  player: Player | null;
  playerOverride: LeaguePlayerOverrideRecord | null;
  latestGame: PlayerFameGameSource | null;
  ratingState: RatingState | null;
  isPitcher: boolean;
  usedFallback: boolean;
  batting: BattingLine | null;
  pitching: PitchingLine | null;
  wpaSummary: PlayerInstanceWpaSummary | null;
  allTimeEliminationBatting: BattingLine | null;
  allTimeEliminationPitching: PitchingLine | null;
  teams: TeamSummary[];
  timeline: TimelineItem[];
}

export interface PlayerInstanceCardContentState {
  canonicalPlayer: CanonicalPlayer;
  instance: CanonicalPlayerInstance;
  player: Player | null;
  playerOverride: LeaguePlayerOverrideRecord | null;
  latestGame: PlayerFameGameSource | null;
  ratingState: RatingState | null;
  isPitcher: boolean;
  usedFallback: boolean;
  batting: BattingLine | null;
  pitching: PitchingLine | null;
  wpaSummary: PlayerInstanceWpaSummary | null;
  allTimeEliminationBatting: BattingLine | null;
  allTimeEliminationPitching: PitchingLine | null;
  teams: TeamSummary[];
  timeline: TimelineItem[];
}

const initialState: PlayerCardState = {
  isLoading: true,
  error: null,
  notFound: false,
  canonicalPlayer: null,
  instance: null,
  player: null,
  playerOverride: null,
  latestGame: null,
  ratingState: null,
  isPitcher: false,
  usedFallback: false,
  batting: null,
  pitching: null,
  wpaSummary: null,
  allTimeEliminationBatting: null,
  allTimeEliminationPitching: null,
  teams: [],
  timeline: [],
};

const batterColumns = ['BA', 'G', 'AB', 'H', 'R', '2B', '3B', 'HR', 'RBI', 'SB', 'BB', 'SO'] as const;
const pitcherColumns = ['ERA', 'G', 'IP', 'H', 'R', 'ER', 'BB', 'SO', 'CG', 'SHO', 'SV', 'W', 'L'] as const;

const fieldLabels: Record<string, string> = {
  power: 'Power',
  contact: 'Contact',
  speed: 'Speed',
  fielding: 'Fielding',
  arm: 'Arm',
  velocity: 'Velocity',
  junk: 'Junk',
  accuracy: 'Accuracy',
  primaryPosition: 'Primary Position',
  secondaryPosition: 'Secondary Position',
  trait1: 'Trait 1',
  trait2: 'Trait 2',
  personality: 'Personality',
  chemistry: 'Chemistry',
  arsenal: 'Arsenal',
  nickname: 'Nickname',
  age: 'Age',
  bats: 'Bats',
  throws: 'Throws',
  gender: 'Gender',
  hometown: 'Hometown',
};

function BackLinks({
  canonicalId,
}: {
  canonicalId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {canonicalId ? (
        <Link
          to={`/almanac/players/${canonicalId}`}
          className="inline-flex items-center gap-3 border-[5px] border-[#3366FF] bg-[#111111] px-4 py-3 text-[10px] text-white shadow-[6px_6px_0px_0px_rgba(221,0,0,0.85)] transition hover:bg-[#1a1a1a]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-white" />
          PLAYER DIRECTORY
        </Link>
      ) : null}

      <Link
        to="/almanac"
        className="inline-flex items-center gap-3 border-[5px] border-[#A57C1B] bg-[#F6E7B8] px-4 py-3 text-[10px] text-black shadow-[6px_6px_0px_0px_rgba(51,102,255,0.45)] transition hover:bg-[#FFF0C1]"
      >
        ALMANAC HOME
      </Link>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div className="border-b-[4px] border-[#8A6A1A] pb-3 text-[10px] text-[#B01212] sm:text-xs">
      {children}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '--';
  }

  if (value && typeof value === 'object' && 'city' in (value as Record<string, unknown>)) {
    const hometown = value as { city?: string; state?: string };
    return hometown.city && hometown.state ? `${hometown.city}, ${hometown.state}` : '--';
  }

  if (value === null || value === undefined || value === '') {
    return '--';
  }

  return String(value);
}

function formatEditDescription(entry: EditHistoryEntry): string {
  const label = fieldLabels[entry.field] ?? entry.field;
  return `${label}: ${formatValue(entry.oldValue)} -> ${formatValue(entry.newValue)}`;
}

function getBattingAppearance(
  game: CompletedGameRecord,
  playerIds: string[],
): CompletedGameRecord['playerStats'][string] | null {
  for (const playerId of playerIds) {
    if (game.playerStats[playerId]) {
      return game.playerStats[playerId];
    }
  }

  return null;
}

function getPitchingAppearance(
  game: CompletedGameRecord,
  playerIds: string[],
): CompletedGameRecord['pitcherGameStats'][number] | null {
  return (
    game.pitcherGameStats.find((pitcher) => playerIds.includes(pitcher.pitcherId)) ??
    null
  );
}

function buildTeamSummaries(
  games: CompletedGameRecord[],
  playerIds: string[],
  teamNames: Map<string, string>,
): TeamSummary[] {
  const teams = new Map<string, TeamSummary>();

  for (const game of games) {
    const batterTeamId = getBattingAppearance(game, playerIds)?.teamId;
    const pitcherTeamId = getPitchingAppearance(game, playerIds)?.teamId;
    const teamId = batterTeamId ?? pitcherTeamId;

    if (!teamId) {
      continue;
    }

    const existing = teams.get(teamId);
    const nextSummary: TeamSummary = {
      teamId,
      name: teamNames.get(teamId) ?? teamId,
      lastSeen: Math.max(existing?.lastSeen ?? 0, game.date),
    };
    teams.set(teamId, nextSummary);
  }

  return Array.from(teams.values()).sort((a, b) => b.lastSeen - a.lastSeen || a.name.localeCompare(b.name));
}

function buildGameTimelineDescription(game: CompletedGameRecord, playerIds: string[]): string {
  const batterTeamId = getBattingAppearance(game, playerIds)?.teamId;
  const pitcherTeamId = getPitchingAppearance(game, playerIds)?.teamId;
  const teamId = batterTeamId ?? pitcherTeamId;

  if (!teamId) {
    return `Game logged: ${game.awayTeamName} @ ${game.homeTeamName}`;
  }

  const ownTeamName = teamId === game.awayTeamId ? game.awayTeamName : game.homeTeamName;
  const opponentName = teamId === game.awayTeamId ? game.homeTeamName : game.awayTeamName;
  const ownScore = teamId === game.awayTeamId ? game.finalScore.away : game.finalScore.home;
  const opponentScore = teamId === game.awayTeamId ? game.finalScore.home : game.finalScore.away;

  return `Game completed: ${ownTeamName} ${ownScore}, ${opponentName} ${opponentScore}`;
}

function inferPlayerName(
  playerIds: string[],
  player: Player | null,
  latestSnapshot: PlayerRatingsSnapshot | null,
  games: CompletedGameRecord[],
): string {
  const snapshotName = buildPlayerName(latestSnapshot);
  if (snapshotName !== 'Unknown Player') {
    return snapshotName;
  }

  const storedName = buildPlayerName(player);
  if (storedName !== 'Unknown Player') {
    return storedName;
  }

  for (const game of games) {
    for (const playerId of playerIds) {
      const battingName = game.playerStats[playerId]?.playerName;
      if (battingName) {
        return battingName;
      }
    }
    const pitchingName = getPitchingAppearance(game, playerIds)?.pitcherName;
    if (pitchingName) {
      return pitchingName;
    }
  }

  return playerIds[0] ?? 'Unknown Player';
}

function buildTimeline(
  player: Player | null,
  instanceId: string,
  games: CompletedGameRecord[],
  playerIds: string[],
): TimelineItem[] {
  const edits = (player?.editHistory ?? [])
    .filter((entry) => entry.context === 'base' || entry.leagueId === instanceId)
    .map<TimelineItem>((entry) => ({
      timestamp: new Date(entry.date).getTime(),
      kind: 'edit',
      description: formatEditDescription(entry),
    }));

  const gameEntries = games.map<TimelineItem>((game) => ({
    timestamp: game.date,
    kind: 'game',
    description: buildGameTimelineDescription(game, playerIds),
  }));

  return [...edits, ...gameEntries].sort((a, b) => {
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    if (a.kind === b.kind) {
      return a.description.localeCompare(b.description);
    }

    return a.kind === 'edit' ? -1 : 1;
  });
}

function buildBatterRows(
  batting: BattingLine | null,
  teams: TeamSummary[],
  allTimeEliminationBatting: BattingLine | null,
): TableRow[] {
  if (!batting && !allTimeEliminationBatting) {
    return [];
  }

  const rows: TableRow[] = [];
  if (batting) {
    rows.push({
      label: 'INSTANCE',
      teams,
      values: {
        BA: formatBattingAverage(batting.BA),
        G: batting.G,
        AB: batting.AB,
        H: batting.H,
        R: batting.R,
        '2B': batting['2B'],
        '3B': batting['3B'],
        HR: batting.HR,
        RBI: batting.RBI,
        SB: batting.SB,
        BB: batting.BB,
        SO: batting.SO,
      },
    });
  }
  if (allTimeEliminationBatting) {
    rows.push({
      label: 'ELIM ALL-TIME',
      teams: [],
      values: {
        BA: formatBattingAverage(allTimeEliminationBatting.BA),
        G: allTimeEliminationBatting.G,
        AB: allTimeEliminationBatting.AB,
        H: allTimeEliminationBatting.H,
        R: allTimeEliminationBatting.R,
        '2B': allTimeEliminationBatting['2B'],
        '3B': allTimeEliminationBatting['3B'],
        HR: allTimeEliminationBatting.HR,
        RBI: allTimeEliminationBatting.RBI,
        SB: allTimeEliminationBatting.SB,
        BB: allTimeEliminationBatting.BB,
        SO: allTimeEliminationBatting.SO,
      },
      highlight: true,
    });
  }
  return rows;
}

function buildPitcherRows(
  pitching: PitchingLine | null,
  teams: TeamSummary[],
  allTimeEliminationPitching: PitchingLine | null,
): TableRow[] {
  if (!pitching && !allTimeEliminationPitching) {
    return [];
  }

  const rows: TableRow[] = [];
  if (pitching) {
    rows.push({
      label: 'INSTANCE',
      teams,
      values: {
        ERA: formatEarnedRunAverage(pitching.ERA),
        G: pitching.G,
        IP: pitching.IP,
        H: pitching.H,
        R: pitching.R,
        ER: pitching.ER,
        BB: pitching.BB,
        SO: pitching.SO,
        CG: pitching.CG,
        SHO: pitching.SHO,
        SV: pitching.SV,
        W: pitching.W,
        L: pitching.L,
      },
    });
  }
  if (allTimeEliminationPitching) {
    rows.push({
      label: 'ELIM ALL-TIME',
      teams: [],
      values: {
        ERA: formatEarnedRunAverage(allTimeEliminationPitching.ERA),
        G: allTimeEliminationPitching.G,
        IP: allTimeEliminationPitching.IP,
        H: allTimeEliminationPitching.H,
        R: allTimeEliminationPitching.R,
        ER: allTimeEliminationPitching.ER,
        BB: allTimeEliminationPitching.BB,
        SO: allTimeEliminationPitching.SO,
        CG: allTimeEliminationPitching.CG,
        SHO: allTimeEliminationPitching.SHO,
        SV: allTimeEliminationPitching.SV,
        W: allTimeEliminationPitching.W,
        L: allTimeEliminationPitching.L,
      },
      highlight: true,
    });
  }
  return rows;
}

function TeamLinks({
  teams,
  instanceId,
}: {
  teams: TeamSummary[];
  instanceId: string;
}) {
  if (teams.length === 0) {
    return <span className="text-[#6F5B25]">--</span>;
  }

  return (
    <>
      {teams.map((team, index) => (
        <span key={team.teamId}>
          {index > 0 ? <span className="text-[#6F5B25]">, </span> : null}
          <Link
            to={`/almanac/teams/${instanceId}/${team.teamId}`}
            className="text-[#0D3FA8] underline decoration-[#0D3FA8] underline-offset-4"
          >
            {team.name.toUpperCase()}
          </Link>
        </span>
      ))}
    </>
  );
}

function StatTable({
  columns,
  rows,
  instanceId,
}: {
  columns: readonly string[];
  rows: TableRow[];
  instanceId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border-[4px] border-[#D3BF84] bg-[#FFF8DB] px-4 py-6 text-[9px] text-[#6F5B25] sm:text-[10px]">
        No completed stats found for this instance yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-[4px] border-[#D3BF84] bg-[#FFF8DB]">
      <table className="min-w-full border-collapse text-left text-[9px] text-black sm:text-[10px]">
        <thead className="bg-[#E8D28F] text-[#6F1212]">
          <tr>
            <th className="border-b-[3px] border-[#D3BF84] px-3 py-3">LINE</th>
            <th className="border-b-[3px] border-[#D3BF84] px-3 py-3">TEAM</th>
            {columns.map((column) => (
              <th key={column} className="border-b-[3px] border-[#D3BF84] px-3 py-3 text-right">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.label}
              className={row.highlight ? 'bg-[#F4E1A7]' : 'bg-[#FFF8DB] even:bg-[#F9F0CD]'}
            >
              <td className="border-b border-[#E3D4A6] px-3 py-3 text-[#B01212]">{row.label}</td>
              <td className="border-b border-[#E3D4A6] px-3 py-3">
                <TeamLinks teams={row.teams} instanceId={instanceId} />
              </td>
              {columns.map((column) => (
                <td key={column} className="border-b border-[#E3D4A6] px-3 py-3 text-right">
                  {row.values[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WpaSummaryPanel({
  summary,
}: {
  summary: PlayerInstanceWpaSummary | null;
}) {
  if (!summary) {
    return (
      <div
        className="mt-5 border-[4px] border-[#D3BF84] bg-[#FFF8DB] px-4 py-5 text-[9px] leading-5 text-[#6F5B25] sm:text-[10px]"
        data-testid="player-instance-wpa-unavailable"
      >
        WPA unavailable for score-only/manual-result games or older archives without stored KBL WPA totals.
      </div>
    );
  }

  const roleRows = [
    ['BAT', summary.battingWpa],
    ['PIT', summary.pitchingWpa],
    ['FLD', summary.fieldingWpa],
    ['RUN', summary.baserunningWpa],
    ['CAT', summary.catchingWpa],
  ] as const;

  return (
    <div
      className="mt-5 border-[4px] border-[#D3BF84] bg-[#FFF8DB] p-4 text-black"
      data-testid="player-instance-wpa-summary"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-[#8A6A1A] sm:text-[9px]">
            Archived KBL WPA
          </div>
          <div className="mt-2 text-sm text-[#B01212]">
            {formatWpaPoints(summary.totalWpa)}
          </div>
        </div>
        <div className="text-[8px] leading-4 text-[#6F5B25] sm:text-[9px]">
          {summary.gamesWithWpa} scored game{summary.gamesWithWpa === 1 ? '' : 's'}
          {summary.gamesWithoutWpa > 0
            ? ` | ${summary.gamesWithoutWpa} without WPA`
            : ''}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {roleRows.map(([label, value]) => (
          <div key={label} className="border-[3px] border-[#E3D4A6] bg-[#FFF3CC] px-3 py-3">
            <div className="text-[8px] text-[#8A6A1A]">{label}</div>
            <div className="mt-2 text-[10px] text-black">{formatWpaPoints(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttributeCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-[3px] border-[#D3BF84] bg-[#FFF8DB] px-4 py-4">
      <div className="text-[8px] text-[#8A6A1A] sm:text-[9px]">{label}</div>
      <div className="mt-2 text-[10px] leading-5 text-black sm:text-[11px]">{value}</div>
    </div>
  );
}

export function getPlayerInstanceCardFameTier(
  player: Player | null,
  instance: CanonicalPlayerInstance | null,
  playerOverride: LeaguePlayerOverrideRecord | null,
): FameTier {
  return getEffectiveFame(
    player,
    instance?.mode === 'elimination' ? playerOverride : undefined,
  );
}

export function PlayerInstanceCardContent({
  state,
}: {
  state: PlayerInstanceCardContentState;
}) {
  const ratingState = state.ratingState;
  const hometown = state.canonicalPlayer.hometown ?? ratingState?.hometown ?? null;
  const batterRows = buildBatterRows(
    state.batting,
    state.teams,
    state.allTimeEliminationBatting,
  );
  const pitcherRows = buildPitcherRows(
    state.pitching,
    state.teams,
    state.allTimeEliminationPitching,
  );
  const fameTier = getPlayerInstanceCardFameTier(
    state.player,
    state.instance,
    state.playerOverride,
  );

  return (
    <>
      <div className="border-[6px] border-[#A57C1B] bg-[linear-gradient(180deg,#F8EDC6_0%,#E8C767_100%)] p-6 text-black shadow-[10px_10px_0px_0px_rgba(176,18,18,0.55)] sm:p-8">
        <div className="text-[10px] text-[#B01212] sm:text-xs">{state.instance.instanceName.toUpperCase()}</div>
        <h1 className="mt-4 text-sm leading-7 sm:text-lg">
          {state.canonicalPlayer.playerName.toUpperCase()}
        </h1>
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-[9px] text-[#8A6A1A] sm:text-[10px]"
          data-testid="player-instance-card-fame-tier-row"
        >
          <span>FAME TIER</span>
          <div className="inline-flex items-center gap-3 border-[3px] border-[#D3BF84] bg-[#FFF8DB] px-3 py-2 text-[#5C1F16] shadow-[4px_4px_0px_0px_rgba(92,74,25,0.18)]">
            <FamePip size="md" tier={fameTier} />
            <span className="text-[10px] leading-none sm:text-xs">
              {FAME_TIER_LABEL[fameTier].toUpperCase()}
            </span>
          </div>
        </div>
        <div className="mt-4 text-[10px] leading-5 text-[#5C4A19] sm:text-xs">
          Hometown: {formatHometown(hometown)}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="border-[6px] border-[#A57C1B] bg-[#F3E1A8] p-5 text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] sm:p-6">
          <SectionTitle>ATTRIBUTES / RATINGS</SectionTitle>

          <div className="mt-4 text-[8px] leading-4 text-[#8A6A1A] sm:text-[9px]">
            {state.usedFallback
              ? 'League Builder current state fallback'
              : 'Most recent completed game snapshot'}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AttributeCell label="POSITION" value={ratingState?.primaryPosition ?? '--'} />
            <AttributeCell label="AGE" value={ratingState?.age ?? '--'} />
            <AttributeCell
              label="BATS / THROWS"
              value={`${ratingState?.bats ?? '--'} / ${ratingState?.throws ?? '--'}`}
            />
            <AttributeCell label="POW" value={ratingState?.power ?? '--'} />
            <AttributeCell label="CON" value={ratingState?.contact ?? '--'} />
            <AttributeCell label="SPD" value={ratingState?.speed ?? '--'} />
            <AttributeCell label="FLD" value={ratingState?.fielding ?? '--'} />
            <AttributeCell label="ARM" value={ratingState?.arm ?? '--'} />
            <AttributeCell label="VEL" value={ratingState?.velocity ?? '--'} />
            <AttributeCell label="JNK" value={ratingState?.junk ?? '--'} />
            <AttributeCell label="ACC" value={ratingState?.accuracy ?? '--'} />
            <AttributeCell
              label="ARSENAL"
              value={ratingState?.arsenal?.length ? ratingState.arsenal.join(', ') : '--'}
            />
            <AttributeCell
              label="TRAITS"
              value={[ratingState?.trait1, ratingState?.trait2].filter(Boolean).join(', ') || '--'}
            />
            <AttributeCell label="PERSONALITY" value={ratingState?.personality ?? '--'} />
            <AttributeCell label="CHEMISTRY" value={ratingState?.chemistry ?? '--'} />
            <AttributeCell label="GRADE" value={ratingState?.overallGrade ?? '--'} />
            <AttributeCell label="SALARY" value={formatSalary(ratingState?.salary)} />
          </div>
        </section>

        <section className="border-[6px] border-[#6D0D0D] bg-[#170B0B] p-5 shadow-[8px_8px_0px_0px_rgba(165,124,27,0.45)] sm:p-6">
          <SectionTitle>EDIT HISTORY TIMELINE</SectionTitle>
          <div className="mt-5 flex flex-col gap-3">
            {state.timeline.length === 0 ? (
              <div className="border-[4px] border-[#492121] bg-[#251010] px-4 py-5 text-[9px] text-[#F8D7A2] sm:text-[10px]">
                No edit history or completed games found for this instance.
              </div>
            ) : (
              state.timeline.map((item, index) => (
                <div
                  key={`${item.kind}-${item.timestamp}-${index}`}
                  className="border-[4px] px-4 py-4 text-[9px] leading-5 sm:text-[10px] "
                  style={{
                    borderColor: item.kind === 'edit' ? '#A57C1B' : '#2F4E9D',
                    backgroundColor: item.kind === 'edit' ? '#2A1808' : '#10192D',
                  }}
                >
                  <div className={item.kind === 'edit' ? 'text-[#E8C767]' : 'text-[#7AA8FF]'}>
                    {formatTimelineDate(item.timestamp)}
                  </div>
                  <div className="mt-2 text-[#F8EED0]">{item.description}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <PlayerFameSection
        game={state.latestGame}
        gameMode={state.instance.mode}
        playerId={state.instance.playerIdInInstance}
        runId={state.instance.mode === 'elimination' ? state.instance.instanceId : null}
      />

      <section className="border-[6px] border-[#A57C1B] bg-[#F3E1A8] p-5 text-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.4)] sm:p-6">
        <SectionTitle>{state.isPitcher ? 'PITCHING LINE' : 'BATTING LINE'}</SectionTitle>
        <div className="mt-5">
          <StatTable
            columns={state.isPitcher ? pitcherColumns : batterColumns}
            rows={state.isPitcher ? pitcherRows : batterRows}
            instanceId={state.instance.instanceId}
          />
        </div>
        <WpaSummaryPanel summary={state.wpaSummary} />
      </section>

      <section className="border-[6px] border-[#A57C1B] bg-[#FFF3CC] p-5 text-black shadow-[8px_8px_0px_0px_rgba(176,18,18,0.35)] sm:p-6">
        <SectionTitle>CAREER SUMMARY (COMING SOON)</SectionTitle>
        <div className="mt-5 min-h-[132px] border-[4px] border-dashed border-[#D3BF84] bg-[#FFF8DB] px-5 py-6 text-[9px] leading-5 text-[#6F5B25] sm:text-[10px]">
          Reserved space for the V2 AI-generated baseball card back summary.
        </div>
      </section>
    </>
  );
}

export function PlayerInstanceCard() {
  const { canonicalId, instanceId } = useParams();
  const [state, setState] = useState<PlayerCardState>(initialState);

  useEffect(() => {
    let isCancelled = false;

    async function loadPlayerCard(): Promise<void> {
      setState(initialState);

      try {
        if (!canonicalId || !instanceId) {
          if (!isCancelled) {
            setState({ ...initialState, isLoading: false, notFound: true });
          }
          return;
        }

        let canonicalPlayer = await getCanonicalPlayer(canonicalId);
        if (!canonicalPlayer) {
          canonicalPlayer = await findCanonicalByPlayerId(canonicalId);
        }

        let instance =
          canonicalPlayer?.instances.find((entry) => entry.instanceId === instanceId) ?? null;
        const playerIdInInstance = instance?.playerIdInInstance ?? canonicalId;

        const resolvedMode = instance?.mode ?? 'exhibition';

        const [player, leaguePlayerOverride, promotionDecision, displayStats, playerContext] = await Promise.all([
          getPlayer(playerIdInInstance),
          getLeaguePlayerOverride(instanceId, playerIdInInstance),
          resolvedMode === 'elimination'
            ? getRunPromotionDecision(instanceId, playerIdInInstance)
            : Promise.resolve(null),
          getPlayerDisplayStats(playerIdInInstance, resolvedMode, instanceId),
          getPlayerInstanceContext(playerIdInInstance, resolvedMode, instanceId),
        ]);
        const wpaSummary = await getPlayerInstanceWpaSummary(
          playerIdInInstance,
          resolvedMode,
          instanceId,
        );
        const playerOverride =
          leaguePlayerOverride ??
          (promotionDecision?.acceptedTier
            ? ({
                id: `${instanceId}::${playerIdInInstance}`,
                leagueId: instanceId,
                playerId: playerIdInInstance,
                overrides: {},
                fameTierOverride: promotionDecision.acceptedTier,
                lastModified: new Date(promotionDecision.lastUpdatedAt).toISOString(),
              } satisfies LeaguePlayerOverrideRecord)
            : null);
        const resolvedPlayerIds =
          playerContext.playerIds.length > 0
            ? playerContext.playerIds
            : [playerIdInInstance];

        if (!canonicalPlayer || !instance) {
          const inferredName = inferPlayerName(
            resolvedPlayerIds,
            player,
            playerContext.latestSnapshot,
            playerContext.games,
          );
          const hasAnyArchivedData =
            playerContext.games.length > 0 ||
            Boolean(playerContext.latestSnapshot) ||
            Boolean(player);

          if (!hasAnyArchivedData) {
            if (!isCancelled) {
              setState({ ...initialState, isLoading: false, notFound: true });
            }
            return;
          }

          canonicalPlayer = {
            canonicalId,
            playerName: inferredName,
            hometown:
              playerContext.latestSnapshot?.hometown ||
              player?.hometown || {
                city: 'Unknown',
                state: '--',
              },
            instances: [
              {
                mode: resolvedMode,
                instanceId,
                instanceName: instanceId,
                playerIdInInstance,
              },
            ],
          };
          instance = canonicalPlayer.instances[0];
        }

        const effectivePlayer =
          playerContext.latestSnapshot || instance.mode !== 'exhibition'
            ? null
            : await getEffectivePlayer(instance.playerIdInInstance, instance.instanceId);
        const ratingState = playerContext.latestSnapshot ?? effectivePlayer ?? player;
        const teams = buildTeamSummaries(
          playerContext.games,
          resolvedPlayerIds,
          playerContext.teamNames,
        );
        const timeline = buildTimeline(
          player,
          instance.instanceId,
          playerContext.games,
          resolvedPlayerIds,
        );

        if (!isCancelled) {
          setState({
            isLoading: false,
            error: null,
            notFound: false,
            canonicalPlayer,
            instance,
            player,
            playerOverride,
            latestGame: playerContext.latestGame,
            ratingState,
            isPitcher: isPitcherPosition(ratingState?.primaryPosition ?? null),
            usedFallback: !playerContext.latestSnapshot && Boolean(ratingState),
            batting: displayStats.instanceBatting,
            pitching: displayStats.instancePitching,
            wpaSummary,
            allTimeEliminationBatting: displayStats.allTimeEliminationBatting,
            allTimeEliminationPitching: displayStats.allTimeEliminationPitching,
            teams,
            timeline,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            ...initialState,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load player card',
          });
        }
      }
    }

    void loadPlayerCard();

    return () => {
      isCancelled = true;
    };
  }, [canonicalId, instanceId]);

  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-black px-4 py-6 text-white font-['Press_Start_2P'] sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <BackLinks canonicalId={canonicalId} />
          <div className="flex min-h-[420px] items-center justify-center border-[6px] border-[#2B2B2B] bg-[#101010]">
            <Loader2 className="h-8 w-8 animate-spin text-[#DD0000]" />
          </div>
        </div>
      </div>
    );
  }

  if (state.notFound) {
    return (
      <div className="min-h-screen bg-black px-4 py-6 text-white font-['Press_Start_2P'] sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <BackLinks canonicalId={canonicalId} />
          <div className="border-[6px] border-[#5A1B1B] bg-[#1A0B0B] px-6 py-10 text-center text-[10px] text-[#FFD9D9] sm:text-xs">
            Player instance not found
          </div>
        </div>
      </div>
    );
  }

  if (state.error || !state.canonicalPlayer || !state.instance) {
    return (
      <div className="min-h-screen bg-black px-4 py-6 text-white font-['Press_Start_2P'] sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <BackLinks canonicalId={canonicalId} />
          <div className="border-[6px] border-[#5A1B1B] bg-[#1A0B0B] px-6 py-10 text-center text-[10px] text-[#FFD9D9] sm:text-xs">
            {state.error ?? 'Unable to load player instance.'}
          </div>
        </div>
      </div>
    );
  }

  const resolvedState: PlayerInstanceCardContentState = {
    canonicalPlayer: state.canonicalPlayer,
    instance: state.instance,
    player: state.player,
    playerOverride: state.playerOverride,
    latestGame: state.latestGame,
    ratingState: state.ratingState,
    isPitcher: state.isPitcher,
    usedFallback: state.usedFallback,
    batting: state.batting,
    pitching: state.pitching,
    wpaSummary: state.wpaSummary,
    allTimeEliminationBatting: state.allTimeEliminationBatting,
    allTimeEliminationPitching: state.allTimeEliminationPitching,
    teams: state.teams,
    timeline: state.timeline,
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white font-['Press_Start_2P'] sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <BackLinks canonicalId={state.canonicalPlayer.canonicalId} />
        <PlayerInstanceCardContent state={resolvedState} />
      </div>
    </div>
  );
}

export default PlayerInstanceCard;
