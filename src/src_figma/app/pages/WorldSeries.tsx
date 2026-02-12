import { useNavigate } from "react-router";
import { ArrowLeft, Trophy, Settings, GitBranch, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { getAllLeagueTemplates, type LeagueTemplate } from "../../../utils/leagueBuilderStorage";
import {
  getAllPlayoffs,
  getPlayoffBySeason,
  getSeriesByPlayoff,
  getPlayoffLeaders,
  type PlayoffConfig,
  type PlayoffSeries,
  type PlayoffPlayerStats,
  type PlayoffTeam,
  type PlayoffMVP,
} from "../../../utils/playoffStorage";

type PlayoffTab = "setup" | "bracket" | "leaders" | "history";

interface PlayoffSettings {
  leagueId: string | null;
  leagueName: string;
  teamCount: number;
  rounds: number;
  gamesPerRound: number[];
  inningsPerGame: number;
  dhRule: "yes" | "no" | "nl-only";
}

export function WorldSeries() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PlayoffTab>("setup");
  const [settings, setSettings] = useState<PlayoffSettings>({
    leagueId: null,
    leagueName: "Select League",
    teamCount: 0,
    rounds: 0,
    gamesPerRound: [],
    inningsPerGame: 9,
    dhRule: "yes",
  });
  const [isConfigured, setIsConfigured] = useState(false);

  const tabs = [
    { id: "setup", label: "SETUP", icon: <Settings className="w-4 h-4" /> },
    { id: "bracket", label: "BRACKET", icon: <GitBranch className="w-4 h-4" /> },
    { id: "leaders", label: "LEADERS", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "history", label: "HISTORY", icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-[#6B9462] border-b-[6px] border-[#4A6844] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-[#5A8352] border-2 border-[#4A6844] transition active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-[#E8E8D8]" />
          </button>
          <div className="text-center flex-1">
            <div className="text-lg text-[#E8E8D8]">PLAYOFF MODE</div>
            <div className="text-[8px] text-[#E8E8D8]/70">
              {isConfigured ? settings.leagueName.toUpperCase() : "NOT CONFIGURED"}
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-[#6B9462] border-b-4 border-[#4A6844]">
        <div className="max-w-7xl mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PlayoffTab)}
              className={`px-4 py-2 text-[8px] flex items-center gap-2 transition border-r-2 border-[#4A6844] ${
                activeTab === tab.id
                  ? "bg-[#4A6844] text-[#E8E8D8]"
                  : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeTab === "setup" && (
          <SetupTab settings={settings} setSettings={setSettings} setIsConfigured={setIsConfigured} />
        )}
        {activeTab === "bracket" && (
          isConfigured ? (
            <BracketView settings={settings} />
          ) : (
            <div className="text-center py-12 text-[#E8E8D8]/60 text-xs">
              CONFIGURE PLAYOFFS IN SETUP TAB FIRST
            </div>
          )
        )}
        {activeTab === "leaders" && (
          <PlayoffLeadersContent />
        )}
        {activeTab === "history" && (
          <PlayoffHistoryContent />
        )}
      </div>
    </div>
  );
}

function SetupTab({
  settings,
  setSettings,
  setIsConfigured,
}: {
  settings: PlayoffSettings;
  setSettings: (settings: PlayoffSettings) => void;
  setIsConfigured: (configured: boolean) => void;
}) {
  // Load real leagues from League Builder storage
  const [leagues, setLeagues] = useState<{ id: string; name: string; teams: number }[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadLeagues() {
      try {
        const templates = await getAllLeagueTemplates();
        if (!cancelled) {
          setLeagues(
            templates.map((t: LeagueTemplate) => ({
              id: t.id,
              name: t.name,
              teams: t.teamIds.length,
            }))
          );
        }
      } catch (err) {
        console.error('[WorldSeries] Failed to load leagues:', err);
      }
    }
    loadLeagues();
    return () => { cancelled = true; };
  }, []);

  const calculateRounds = (teamCount: number): number => {
    if (teamCount <= 2) return 1;
    if (teamCount <= 4) return 2;
    if (teamCount <= 8) return 3;
    if (teamCount <= 16) return 4;
    return 5;
  };

  const handleLeagueSelect = (leagueId: string) => {
    const league = leagues.find((l) => l.id === leagueId);
    if (league) {
      const rounds = calculateRounds(league.teams);
      const defaultGamesPerRound = Array(rounds).fill(7);
      setSettings({
        ...settings,
        leagueId: league.id,
        leagueName: league.name,
        teamCount: league.teams,
        rounds,
        gamesPerRound: defaultGamesPerRound,
      });
      setIsConfigured(false); // Require re-confirmation when changing league
    }
  };

  const handleGamesPerRoundChange = (roundIndex: number, games: number) => {
    const newGamesPerRound = [...settings.gamesPerRound];
    newGamesPerRound[roundIndex] = games;
    setSettings({ ...settings, gamesPerRound: newGamesPerRound });
  };

  const handleConfirm = () => {
    if (settings.leagueId) {
      setIsConfigured(true);
    }
  };

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return "Championship";
    if (remaining === 2) return "Semi-Finals";
    if (remaining === 3) return "Quarter-Finals";
    return `Round ${roundIndex + 1}`;
  };

  return (
    <div className="space-y-4">
      {/* League Selection */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6">
        <div className="text-sm text-[#E8E8D8] mb-4">▶ SELECT LEAGUE</div>
        {leagues.length === 0 ? (
          <div className="text-center text-[#E8E8D8]/50 text-[9px] py-4">
            No leagues found — create a league in Franchise Mode first.
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => handleLeagueSelect(league.id)}
              className={`p-4 border-4 transition active:scale-95 ${
                settings.leagueId === league.id
                  ? "bg-[#4A6844] border-[#E8E8D8] text-[#E8E8D8]"
                  : "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
              }`}
            >
              <div className="text-xs">{league.name}</div>
              <div className="text-[8px] mt-1 opacity-70">{league.teams} TEAMS</div>
            </button>
          ))}
        </div>
        )}
      </div>

      {settings.leagueId && (
        <>
          {/* Playoff Structure */}
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6">
            <div className="text-sm text-[#E8E8D8] mb-4">▶ PLAYOFF STRUCTURE</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[#E8E8D8] text-[8px]">TEAMS IN PLAYOFFS</div>
                <div className="text-[#E8E8D8] text-xs">{settings.teamCount}</div>
              </div>
              <div className="flex items-center justify-between bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[#E8E8D8] text-[8px]">TOTAL ROUNDS</div>
                <div className="text-[#E8E8D8] text-xs">{settings.rounds}</div>
              </div>
            </div>
          </div>

          {/* Games per Round */}
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6">
            <div className="text-sm text-[#E8E8D8] mb-4">▶ GAMES PER ROUND</div>
            <div className="space-y-3">
              {settings.gamesPerRound.map((games, index) => (
                <div key={index} className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                  <div className="text-[#E8E8D8] text-[8px] mb-2">
                    {getRoundName(index, settings.rounds)}
                  </div>
                  <div className="flex gap-2">
                    {[1, 3, 5, 7].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleGamesPerRoundChange(index, num)}
                        className={`flex-1 py-2 text-[8px] border-2 transition active:scale-95 ${
                          games === num
                            ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#4A6844]"
                            : "bg-[#5A8352] border-[#6B9462] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                        }`}
                      >
                        BEST OF {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Settings */}
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6">
            <div className="text-sm text-[#E8E8D8] mb-4">▶ GAME SETTINGS</div>
            <div className="space-y-3">
              {/* Innings per Game */}
              <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[#E8E8D8] text-[#8px] mb-2">INNINGS PER GAME</div>
                <div className="flex gap-2">
                  {[3, 5, 7, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSettings({ ...settings, inningsPerGame: num })}
                      className={`flex-1 py-2 text-[8px] border-2 transition active:scale-95 ${
                        settings.inningsPerGame === num
                          ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#4A6844]"
                          : "bg-[#5A8352] border-[#6B9462] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                      }`}
                    >
                      {num} INNINGS
                    </button>
                  ))}
                </div>
              </div>

              {/* DH Rule */}
              <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[#E8E8D8] text-[8px] mb-2">DESIGNATED HITTER</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, dhRule: "yes" })}
                    className={`flex-1 py-2 text-[8px] border-2 transition active:scale-95 ${
                      settings.dhRule === "yes"
                        ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#4A6844]"
                        : "bg-[#5A8352] border-[#6B9462] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, dhRule: "no" })}
                    className={`flex-1 py-2 text-[8px] border-2 transition active:scale-95 ${
                      settings.dhRule === "no"
                        ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#4A6844]"
                        : "bg-[#5A8352] border-[#6B9462] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    }`}
                  >
                    NO
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, dhRule: "nl-only" })}
                    className={`flex-1 py-2 text-[8px] border-2 transition active:scale-95 ${
                      settings.dhRule === "nl-only"
                        ? "bg-[#E8E8D8] border-[#E8E8D8] text-[#4A6844]"
                        : "bg-[#5A8352] border-[#6B9462] text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    }`}
                  >
                    NL ONLY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full bg-[#6B9462] border-[6px] border-[#4A6844] py-4 text-sm text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform"
          >
            GENERATE PLAYOFF BRACKET
          </button>
        </>
      )}
    </div>
  );
}

function BracketView({ settings }: { settings: PlayoffSettings }) {
  const getRoundName = (roundIndex: number, totalRounds: number) => {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return "Championship";
    if (remaining === 2) return "Semi-Finals";
    if (remaining === 3) return "Quarter-Finals";
    return `Round ${roundIndex + 1}`;
  };

  return (
    <div className="space-y-4">
      {/* Bracket Info */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6">
        <div className="text-center mb-4">
          <Trophy className="w-10 h-10 text-[#E8E8D8] mx-auto mb-2" />
          <div className="text-sm text-[#E8E8D8]">{settings.leagueName.toUpperCase()} PLAYOFFS</div>
          <div className="text-[8px] text-[#E8E8D8]/70 mt-1">
            {settings.teamCount} TEAMS • {settings.rounds} ROUNDS • {settings.inningsPerGame} INNINGS
          </div>
        </div>
      </div>

      {/* Empty Bracket State — no playoff games recorded yet */}
      {settings.gamesPerRound.map((games, roundIndex) => (
        <div key={roundIndex} className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">
            ▶ {getRoundName(roundIndex, settings.rounds).toUpperCase()} - BEST OF {games}
          </div>
          <div className="text-center text-[#E8E8D8]/50 text-[9px] py-4">
            Matchups will appear once playoffs begin.
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayoffLeadersContent() {
  const [expandedBattingStat, setExpandedBattingStat] = useState<string | null>(null);
  const [expandedPitchingStat, setExpandedPitchingStat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [battingData, setBattingData] = useState<Record<string, Array<{ player: string; team: string; value: string }>>>({});
  const [pitchingData, setPitchingData] = useState<Record<string, Array<{ player: string; team: string; value: string }>>>({});

  // Load real playoff stats from IndexedDB
  useEffect(() => {
    let cancelled = false;
    async function loadLeaders() {
      try {
        // Find the most recent playoff
        const allPlayoffs = await getAllPlayoffs();
        const activePlayoff = allPlayoffs
          .filter(p => p.status === 'IN_PROGRESS' || p.status === 'COMPLETED')
          .sort((a, b) => b.seasonNumber - a.seasonNumber)[0];

        if (!activePlayoff || cancelled) {
          setIsLoading(false);
          return;
        }

        // Batting stats
        const battingStats: Record<string, keyof PlayoffPlayerStats> = {
          AVG: 'avg', HR: 'homeRuns', RBI: 'rbi', SB: 'stolenBases', OPS: 'ops',
        };
        const newBatting: typeof battingData = {};
        for (const [label, stat] of Object.entries(battingStats)) {
          const leaders = await getPlayoffLeaders(activePlayoff.id, stat, 5);
          newBatting[label] = leaders.map(p => ({
            player: p.playerName,
            team: p.teamId,
            value: stat === 'avg' ? p.avg.toFixed(3) :
                   stat === 'ops' ? p.ops.toFixed(3) :
                   String(p[stat] ?? 0),
          }));
        }

        // Pitching stats
        const pitchingStats: Record<string, keyof PlayoffPlayerStats> = {
          ERA: 'era', W: 'wins', K: 'pitchingStrikeouts', WHIP: 'whip', SV: 'saves',
        };
        const newPitching: typeof pitchingData = {};
        for (const [label, stat] of Object.entries(pitchingStats)) {
          const leaders = await getPlayoffLeaders(activePlayoff.id, stat, 5);
          newPitching[label] = leaders
            .filter(p => (p.pitchingGames ?? 0) > 0)
            .map(p => ({
              player: p.playerName,
              team: p.teamId,
              value: stat === 'era' ? (p.era ?? 0).toFixed(2) :
                     stat === 'whip' ? (p.whip ?? 0).toFixed(2) :
                     String(p[stat] ?? 0),
            }));
        }

        if (!cancelled) {
          setBattingData(newBatting);
          setPitchingData(newPitching);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[PlayoffLeaders] Failed to load:', err);
        if (!cancelled) setIsLoading(false);
      }
    }
    loadLeaders();
    return () => { cancelled = true; };
  }, []);

  const battingCategories = ['AVG', 'HR', 'RBI', 'SB', 'OPS'];
  const pitchingCategories = ['ERA', 'W', 'K', 'WHIP', 'SV'];

  const hasData = Object.values(battingData).some(arr => arr.length > 0) ||
                  Object.values(pitchingData).some(arr => arr.length > 0);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-[#E8E8D8]/60 text-xs">
        Loading playoff statistics...
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center">
          <Trophy className="w-10 h-10 text-[#E8E8D8]/30 mx-auto mb-2" />
          <div className="text-lg text-[#E8E8D8]">PLAYOFF LEADERS</div>
          <div className="text-sm text-[#E8E8D8]/50 mt-3">No playoff stats yet</div>
          <div className="text-[8px] text-[#E8E8D8]/40 mt-1">Stats will appear once playoff games are played</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center">
        <Trophy className="w-10 h-10 text-[#E8E8D8] mx-auto mb-2" />
        <div className="text-lg text-[#E8E8D8]">PLAYOFF LEADERS</div>
        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">CURRENT POSTSEASON STATISTICS</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Batting Leaders */}
        <div>
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-3 mb-3">
            <div className="text-xs text-[#E8E8D8] text-center">BATTING LEADERS</div>
          </div>
          <div className="space-y-2">
            {battingCategories.map((cat) => {
              const data = battingData[cat] || [];
              const topValue = data[0]?.value || '-';
              return (
                <div key={cat}>
                  <button
                    onClick={() => setExpandedBattingStat(expandedBattingStat === cat ? null : cat)}
                    className="w-full bg-[#6B9462] border-4 border-[#4A6844] p-3 hover:bg-[#5A8352] transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] text-[#E8E8D8]">{cat}</div>
                        {expandedBattingStat === cat ? (
                          <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                        )}
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]">{topValue}</div>
                    </div>
                  </button>
                  {expandedBattingStat === cat && (
                    <div className="bg-[#4A6844] border-4 border-[#5A8352] border-t-0 p-2">
                      {data.length === 0 ? (
                        <div className="text-[8px] text-[#E8E8D8]/40 text-center py-2">No data</div>
                      ) : data.map((player, pIndex) => (
                        <div
                          key={pIndex}
                          className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-[8px] text-[#E8E8D8]/50 w-4">{pIndex + 1}.</div>
                            <div className="text-[8px] text-[#E8E8D8]">{player.player}</div>
                            <div className="text-[7px] text-[#E8E8D8]/60">{player.team}</div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]">{player.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pitching Leaders */}
        <div>
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-3 mb-3">
            <div className="text-xs text-[#E8E8D8] text-center">PITCHING LEADERS</div>
          </div>
          <div className="space-y-2">
            {pitchingCategories.map((cat) => {
              const data = pitchingData[cat] || [];
              const topValue = data[0]?.value || '-';
              return (
                <div key={cat}>
                  <button
                    onClick={() => setExpandedPitchingStat(expandedPitchingStat === cat ? null : cat)}
                    className="w-full bg-[#6B9462] border-4 border-[#4A6844] p-3 hover:bg-[#5A8352] transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] text-[#E8E8D8]">{cat}</div>
                        {expandedPitchingStat === cat ? (
                          <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                        )}
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]">{topValue}</div>
                    </div>
                  </button>
                  {expandedPitchingStat === cat && (
                    <div className="bg-[#4A6844] border-4 border-[#5A8352] border-t-0 p-2">
                      {data.length === 0 ? (
                        <div className="text-[8px] text-[#E8E8D8]/40 text-center py-2">No data</div>
                      ) : data.map((player, pIndex) => (
                        <div
                          key={pIndex}
                          className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-[8px] text-[#E8E8D8]/50 w-4">{pIndex + 1}.</div>
                            <div className="text-[8px] text-[#E8E8D8]">{player.player}</div>
                            <div className="text-[7px] text-[#E8E8D8]/60">{player.team}</div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]">{player.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayoffHistoryContent() {
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<Array<{
    playoffId: string;
    seasonNumber: number;
    championTeam: PlayoffTeam | undefined;
    runnerUpTeam: PlayoffTeam | undefined;
    mvp: PlayoffMVP | undefined;
    seriesList: PlayoffSeries[];
  }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      try {
        const allPlayoffs = await getAllPlayoffs();
        const completed = allPlayoffs
          .filter(p => p.status === 'COMPLETED' && p.champion)
          .sort((a, b) => b.seasonNumber - a.seasonNumber);

        const entries = [];
        for (const playoff of completed) {
          const seriesList = await getSeriesByPlayoff(playoff.id);
          const championTeam = playoff.teams.find(t => t.teamId === playoff.champion);

          // Find runner-up: the team that lost in the final round
          const maxRound = Math.max(...seriesList.map(s => s.round), 0);
          const finalSeries = seriesList.find(s => s.round === maxRound && s.status === 'COMPLETED');
          const runnerUpId = finalSeries
            ? (finalSeries.winner === finalSeries.higherSeed.teamId
                ? finalSeries.lowerSeed.teamId
                : finalSeries.higherSeed.teamId)
            : undefined;
          const runnerUpTeam = runnerUpId ? playoff.teams.find(t => t.teamId === runnerUpId) : undefined;

          entries.push({
            playoffId: playoff.id,
            seasonNumber: playoff.seasonNumber,
            championTeam,
            runnerUpTeam,
            mvp: playoff.mvp,
            seriesList: seriesList.sort((a, b) => b.round - a.round),
          });
        }

        if (!cancelled) {
          setHistoryData(entries);
          if (entries.length > 0) setExpandedSeason(entries[0].playoffId);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[PlayoffHistory] Failed to load:', err);
        if (!cancelled) setIsLoading(false);
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-[#E8E8D8]/60 text-xs">
        Loading playoff history...
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center">
          <Trophy className="w-10 h-10 text-[#E8E8D8]/30 mx-auto mb-2" />
          <div className="text-lg text-[#E8E8D8]">PLAYOFF HISTORY</div>
          <div className="text-sm text-[#E8E8D8]/50 mt-3">No championship history yet</div>
          <div className="text-[8px] text-[#E8E8D8]/40 mt-1">History will appear after a playoff is completed</div>
        </div>
      </div>
    );
  }

  // Build all-time championship counts from real data
  const champCounts: Record<string, { teamName: string; count: number }> = {};
  for (const entry of historyData) {
    if (entry.championTeam) {
      const id = entry.championTeam.teamId;
      if (!champCounts[id]) {
        champCounts[id] = { teamName: entry.championTeam.teamName, count: 0 };
      }
      champCounts[id].count++;
    }
  }
  const champRanking = Object.values(champCounts).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center">
        <Trophy className="w-10 h-10 text-[#E8E8D8] mx-auto mb-2" />
        <div className="text-lg text-[#E8E8D8]">PLAYOFF HISTORY</div>
        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">PAST POSTSEASON RESULTS & AWARDS</div>
      </div>

      {/* Championship History */}
      {historyData.map((entry) => {
        const champName = entry.championTeam?.teamName ?? 'Unknown';
        const runnerUpName = entry.runnerUpTeam?.teamName ?? 'Unknown';

        // Find the championship series result
        const maxRound = Math.max(...entry.seriesList.map(s => s.round), 0);
        const finalSeries = entry.seriesList.find(s => s.round === maxRound && s.status === 'COMPLETED');
        const champWins = finalSeries
          ? (finalSeries.winner === finalSeries.higherSeed.teamId ? finalSeries.higherSeedWins : finalSeries.lowerSeedWins)
          : 0;
        const runnerUpWins = finalSeries
          ? (finalSeries.winner === finalSeries.higherSeed.teamId ? finalSeries.lowerSeedWins : finalSeries.higherSeedWins)
          : 0;

        return (
          <div key={entry.playoffId} className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
            <button
              onClick={() => setExpandedSeason(expandedSeason === entry.playoffId ? null : entry.playoffId)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-[#E8E8D8]" />
                  <div>
                    <div className="text-sm text-[#E8E8D8]">
                      SEASON {entry.seasonNumber} CHAMPIONSHIP
                    </div>
                    <div className="text-[8px] text-[#E8E8D8]/60 mt-1">
                      {champName.toUpperCase()} def. {runnerUpName.toUpperCase()} ({champWins}-{runnerUpWins})
                    </div>
                  </div>
                </div>
                {expandedSeason === entry.playoffId ? (
                  <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
                )}
              </div>
            </button>

            {expandedSeason === entry.playoffId && (
              <div className="mt-4 space-y-4">
                {/* Series results by round (highest round first) */}
                {entry.seriesList
                  .filter(s => s.status === 'COMPLETED')
                  .map((series) => (
                    <div key={series.id} className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                      <div className="text-[8px] text-[#E8E8D8]/70 mb-2">{series.roundName.toUpperCase()}</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {series.winner === series.higherSeed.teamId && (
                              <Trophy className="w-3 h-3 text-[#E8E8D8]" />
                            )}
                            {series.winner !== series.higherSeed.teamId && <div className="w-3" />}
                            <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{series.higherSeed.seed}</div>
                            <div className={`text-[8px] ${series.winner === series.higherSeed.teamId ? 'text-[#E8E8D8] font-bold' : 'text-[#E8E8D8]/70'}`}>
                              {series.higherSeed.teamName}
                            </div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]">{series.higherSeedWins}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {series.winner === series.lowerSeed.teamId && (
                              <Trophy className="w-3 h-3 text-[#E8E8D8]" />
                            )}
                            {series.winner !== series.lowerSeed.teamId && <div className="w-3" />}
                            <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{series.lowerSeed.seed}</div>
                            <div className={`text-[8px] ${series.winner === series.lowerSeed.teamId ? 'text-[#E8E8D8] font-bold' : 'text-[#E8E8D8]/70'}`}>
                              {series.lowerSeed.teamName}
                            </div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]/70">{series.lowerSeedWins}</div>
                        </div>
                      </div>
                    </div>
                  ))}

                {/* MVP Award */}
                {entry.mvp && (
                  <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                    <div className="text-[8px] text-[#E8E8D8]/70 mb-3">PLAYOFF AWARDS</div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-[8px] text-[#E8E8D8] font-bold">MVP</div>
                        <div className="text-[7px] text-[#E8E8D8]/60 mt-1">{entry.mvp.playerName}</div>
                      </div>
                      <div className="text-[7px] text-[#E8E8D8]/80 text-right">{entry.mvp.stats}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* All-Time Championships (computed from real data) */}
      {champRanking.length > 0 && (
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">▶ ALL-TIME CHAMPIONSHIPS</div>
          <div className={`grid gap-3 ${champRanking.length >= 3 ? 'grid-cols-3' : champRanking.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {champRanking.map((team) => (
              <div key={team.teamName} className="bg-[#4A6844] border-4 border-[#5A8352] p-3 text-center">
                <div className="text-[8px] text-[#E8E8D8]/70">{team.teamName.toUpperCase()}</div>
                <div className="text-lg text-[#E8E8D8] mt-1">{team.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}