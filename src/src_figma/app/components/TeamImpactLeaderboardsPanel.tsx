import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  BestManagerLeaderboardEntry,
  ManagerValueTeamLeaderboardEntry,
  PlayerAwardLeaderboardEntry,
  PlayerPogPointsLeaderboardEntry,
  PlayerWpaLeaderboardEntry,
  RoleWpaLeaderboardEntry,
  TeamImpactLeaderboards,
  TeamPogPointsLeaderboardEntry,
  TeamWpaLeaderboardEntry,
} from "../../../utils/teamImpact";

type PanelTheme = "elimination" | "almanac";

const themeClasses = {
  elimination: {
    frame: "bg-[#5A8352] border-[6px] border-[#4A6844] text-[#E8E8D8]",
    card: "bg-[#4A6844] border-4 border-[#6B9462]",
    accent: "text-[#F5D06F]",
    muted: "text-[#E8E8D8]/65",
    warning: "bg-[#6B9462] border-4 border-[#C4A853] text-[#F5D06F]",
  },
  almanac: {
    frame: "bg-[#101010] border-[6px] border-[#2B2B2B] text-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(51,102,255,0.25)]",
    card: "bg-[#171717] border-4 border-[#2B2B2B]",
    accent: "text-[#3366FF]",
    muted: "text-[#8F96A3]",
    warning: "bg-[#171717] border-4 border-[#DD0000] text-[#E8E8D8]",
  },
} as const;

function formatSigned(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatPoints(points: number): string {
  return `${points} ${points === 1 ? "pt" : "pts"}`;
}

function hasImpactRows(leaderboards: TeamImpactLeaderboards): boolean {
  return (
    leaderboards.teamWpaLeaders.length > 0 ||
    leaderboards.teamPogPointsLeaders.length > 0 ||
    leaderboards.playerTotalWpaLeaders.length > 0 ||
    leaderboards.playerPogPointsLeaders.length > 0 ||
    leaderboards.overallPogLeaders.length > 0 ||
    leaderboards.bestHitterLeaders.length > 0 ||
    leaderboards.bestPitcherLeaders.length > 0 ||
    leaderboards.bestBaserunnerLeaders.length > 0 ||
    leaderboards.bestFielderLeaders.length > 0 ||
    leaderboards.bestManagerLeaders.length > 0 ||
    leaderboards.roleWpaLeaders.batting.length > 0 ||
    leaderboards.roleWpaLeaders.pitching.length > 0 ||
    leaderboards.roleWpaLeaders.defense.length > 0 ||
    leaderboards.roleWpaLeaders.baserunning.length > 0 ||
    leaderboards.managerValueTeamLeaders.length > 0 ||
    leaderboards.highLeverageWpaLeaders.length > 0
  );
}

function Row({
  rank,
  primary,
  secondary,
  value,
  theme,
}: {
  rank: number;
  primary: string;
  secondary?: string;
  value: string;
  theme: PanelTheme;
}) {
  const classes = themeClasses[theme];

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 py-2 last:border-0">
      <div className="min-w-0">
        <div className="text-[8px] leading-4 text-white">
          <span className={classes.accent}>{rank}.</span> {primary}
        </div>
        {secondary ? (
          <div className={`mt-1 text-[7px] leading-4 ${classes.muted}`}>{secondary}</div>
        ) : null}
      </div>
      <div className="shrink-0 text-right text-[8px] leading-4 text-white">{value}</div>
    </div>
  );
}

function LeaderCard({
  title,
  children,
  theme,
}: {
  title: string;
  children: ReactNode;
  theme: PanelTheme;
}) {
  const classes = themeClasses[theme];

  return (
    <div className={`${classes.card} p-3`}>
      <div className={`mb-2 text-[8px] uppercase tracking-[0.2em] ${classes.accent}`}>{title}</div>
      {children}
    </div>
  );
}

function TeamWpaRows({ entries, theme }: { entries: TeamWpaLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={entry.teamId}
      rank={entry.rank}
      primary={entry.teamName}
      secondary={`${formatSigned(entry.perGameWpa)} per game | ${entry.identityLabel}`}
      value={formatSigned(entry.value)}
      theme={theme}
    />
  ));
}

function TeamPogRows({ entries, theme }: { entries: TeamPogPointsLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={entry.teamId}
      rank={entry.rank}
      primary={entry.teamName}
      secondary={`Overall ${entry.overallWins} | Best Manager ${entry.bestManagerWins}${entry.mostDecoratedPlayer ? ` | ${entry.mostDecoratedPlayer.playerName}` : ""}`}
      value={formatPoints(entry.points)}
      theme={theme}
    />
  ));
}

function PlayerWpaRows({ entries, theme }: { entries: PlayerWpaLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={`${entry.teamId}-${entry.playerId}`}
      rank={entry.rank}
      primary={entry.playerName}
      secondary={`${entry.teamName} | ${formatSigned(entry.perGameWpa)} per game | POG ${formatPoints(entry.pogPoints)}`}
      value={formatSigned(entry.value)}
      theme={theme}
    />
  ));
}

function PlayerPogRows({ entries, theme }: { entries: PlayerPogPointsLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={`${entry.teamId}-${entry.playerId}`}
      rank={entry.rank}
      primary={entry.playerName}
      secondary={`${entry.teamName} | Overall ${entry.awardCounts.overall} | Roles ${entry.awardCounts.bestHitter + entry.awardCounts.bestPitcher + entry.awardCounts.bestBaserunner + entry.awardCounts.bestFielder}`}
      value={formatPoints(entry.points)}
      theme={theme}
    />
  ));
}

function AwardRows({ entries, theme }: { entries: PlayerAwardLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={`${entry.teamId}-${entry.playerId}`}
      rank={entry.rank}
      primary={entry.playerName}
      secondary={`${entry.teamName} | POG ${formatPoints(entry.pogPoints)}`}
      value={`${entry.count}`}
      theme={theme}
    />
  ));
}

function BestManagerRows({ entries, theme }: { entries: BestManagerLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={entry.teamId}
      rank={entry.rank}
      primary={entry.teamName}
      secondary={`${formatSigned(entry.managerValue)} Manager Value`}
      value={`${entry.count}`}
      theme={theme}
    />
  ));
}

function RoleRows({ entries, theme }: { entries: RoleWpaLeaderboardEntry[]; theme: PanelTheme }) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={`${entry.role}-${entry.teamId}-${entry.playerId}`}
      rank={entry.rank}
      primary={entry.playerName}
      secondary={`${entry.teamName} | ${formatSigned(entry.perGameWpa)} per game`}
      value={formatSigned(entry.value)}
      theme={theme}
    />
  ));
}

function ManagerValueRows({
  entries,
  theme,
}: {
  entries: ManagerValueTeamLeaderboardEntry[];
  theme: PanelTheme;
}) {
  if (entries.length === 0) return <EmptyRows theme={theme} />;
  return entries.map((entry) => (
    <Row
      key={entry.teamId}
      rank={entry.rank}
      primary={entry.teamName}
      secondary={`Best Manager ${entry.bestManagerWins} | Tactical ${formatSigned(entry.managerWpa.tacticalManagerWpa)} | Deploy ${formatSigned(entry.managerWpa.deploymentWpa)} | Lineup ${formatSigned(entry.managerWpa.lineupDeltaWpa)}`}
      value={formatSigned(entry.value)}
      theme={theme}
    />
  ));
}

function EmptyRows({ theme }: { theme: PanelTheme }) {
  return <div className={`py-2 text-[8px] ${themeClasses[theme].muted}`}>No qualifying data.</div>;
}

export function TeamImpactLeaderboardsPanel({
  leaderboards,
  isLoading = false,
  error,
  theme = "almanac",
}: {
  leaderboards: TeamImpactLeaderboards | null;
  isLoading?: boolean;
  error?: string | null;
  theme?: PanelTheme;
}) {
  const classes = themeClasses[theme];

  if (isLoading) {
    return (
      <section className={`${classes.frame} p-6 text-center`} data-testid="team-impact-leaderboards">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
        <div className="text-[9px] uppercase tracking-[0.2em]">Loading Team Impact leaders...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${classes.frame} p-6 text-center`} data-testid="team-impact-leaderboards">
        <div className="text-[10px] uppercase tracking-[0.2em]">Team Impact leaders unavailable</div>
        <p className={`mt-3 text-[8px] leading-4 ${classes.muted}`}>{error}</p>
      </section>
    );
  }

  if (!leaderboards || !hasImpactRows(leaderboards)) {
    return (
      <section className={`${classes.frame} p-6 text-center`} data-testid="team-impact-leaderboards">
        <div className="text-[10px] uppercase tracking-[0.2em]">Team Impact / POG Leaders</div>
        <p className={`mt-3 text-[8px] leading-4 ${classes.muted}`}>
          No Team Impact or POG leaderboard data yet.
        </p>
      </section>
    );
  }

  return (
    <section className={`${classes.frame} p-4 sm:p-5`} data-testid="team-impact-leaderboards">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.24em]">Team Impact / POG Leaders</h2>
          <p className={`mt-2 text-[8px] leading-4 ${classes.muted}`}>
            WPA and POG leaders from canonical Team Impact summaries. Manager Value is tracked separately from player WPA.
          </p>
        </div>
      </div>

      {leaderboards.dataQuality.warnings.length > 0 ? (
        <div className={`${classes.warning} mb-4 p-3 text-[8px] leading-4`}>
          {leaderboards.dataQuality.warnings.slice(0, 3).map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <LeaderCard title="Team WPA" theme={theme}>
          <TeamWpaRows entries={leaderboards.teamWpaLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Team POG Points" theme={theme}>
          <TeamPogRows entries={leaderboards.teamPogPointsLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Player WPA" theme={theme}>
          <PlayerWpaRows entries={leaderboards.playerTotalWpaLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Player POG Points" theme={theme}>
          <PlayerPogRows entries={leaderboards.playerPogPointsLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Overall POG" theme={theme}>
          <AwardRows entries={leaderboards.overallPogLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Best Hitter" theme={theme}>
          <AwardRows entries={leaderboards.bestHitterLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Best Pitcher" theme={theme}>
          <AwardRows entries={leaderboards.bestPitcherLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Best Baserunner" theme={theme}>
          <AwardRows entries={leaderboards.bestBaserunnerLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Best Fielder" theme={theme}>
          <AwardRows entries={leaderboards.bestFielderLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Best Manager" theme={theme}>
          <BestManagerRows entries={leaderboards.bestManagerLeaders} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Batting WPA" theme={theme}>
          <RoleRows entries={leaderboards.roleWpaLeaders.batting} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Pitching WPA" theme={theme}>
          <RoleRows entries={leaderboards.roleWpaLeaders.pitching} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Defense WPA" theme={theme}>
          <RoleRows entries={leaderboards.roleWpaLeaders.defense} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Baserunning WPA" theme={theme}>
          <RoleRows entries={leaderboards.roleWpaLeaders.baserunning} theme={theme} />
        </LeaderCard>
        <LeaderCard title="Manager Value" theme={theme}>
          <ManagerValueRows entries={leaderboards.managerValueTeamLeaders} theme={theme} />
        </LeaderCard>
        {leaderboards.highLeverageWpaLeaders.length > 0 ? (
          <LeaderCard title="High-Leverage WPA" theme={theme}>
            {leaderboards.highLeverageWpaLeaders.map((entry) => (
              <Row
                key={`${entry.teamId}-${entry.playerId}`}
                rank={entry.rank}
                primary={entry.playerName}
                secondary={`${entry.teamName} | Total ${formatSigned(entry.totalWpa)}`}
                value={formatSigned(entry.value)}
                theme={theme}
              />
            ))}
          </LeaderCard>
        ) : null}
      </div>
    </section>
  );
}
