import { useNavigate } from "react-router";
import { ArrowLeft, Trophy, Settings, GitBranch, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
  // Mock leagues - in production this would come from League Builder
  const mockLeagues = [
    { id: "1", name: "American League", teams: 8 },
    { id: "2", name: "National League", teams: 12 },
    { id: "3", name: "KBL Super League", teams: 16 },
    { id: "4", name: "Minor League", teams: 4 },
  ];

  const calculateRounds = (teamCount: number): number => {
    if (teamCount <= 2) return 1;
    if (teamCount <= 4) return 2;
    if (teamCount <= 8) return 3;
    if (teamCount <= 16) return 4;
    return 5;
  };

  const handleLeagueSelect = (leagueId: string) => {
    const league = mockLeagues.find((l) => l.id === leagueId);
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
        <div className="grid grid-cols-2 gap-3">
          {mockLeagues.map((league) => (
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
  // Mock bracket data - would be auto-generated based on league standings
  const mockTeams = [
    { name: "Tigers", seed: 1, record: "68-32" },
    { name: "Sox", seed: 2, record: "65-35" },
    { name: "Cubs", seed: 3, record: "62-38" },
    { name: "Dodgers", seed: 4, record: "60-40" },
    { name: "Yankees", seed: 5, record: "58-42" },
    { name: "Mets", seed: 6, record: "56-44" },
    { name: "Brewers", seed: 7, record: "54-46" },
    { name: "Braves", seed: 8, record: "52-48" },
  ];

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

      {/* Bracket Rounds */}
      {settings.gamesPerRound.map((games, roundIndex) => (
        <div key={roundIndex} className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-sm text-[#E8E8D8] mb-3">
            ▶ {getRoundName(roundIndex, settings.rounds).toUpperCase()} - BEST OF {games}
          </div>
          <div className="space-y-2">
            {/* Show matchups based on round */}
            {roundIndex === 0 && settings.teamCount >= 8 && (
              <>
                <Matchup team1={mockTeams[0]} team2={mockTeams[7]} games={games} />
                <Matchup team1={mockTeams[3]} team2={mockTeams[4]} games={games} />
                <Matchup team1={mockTeams[1]} team2={mockTeams[6]} games={games} />
                <Matchup team1={mockTeams[2]} team2={mockTeams[5]} games={games} />
              </>
            )}
            {roundIndex === 1 && (
              <>
                <Matchup team1={mockTeams[0]} team2={mockTeams[3]} games={games} winner={mockTeams[0]} />
                <Matchup team1={mockTeams[1]} team2={mockTeams[2]} games={games} winner={mockTeams[2]} />
              </>
            )}
            {roundIndex === 2 && (
              <Matchup team1={mockTeams[0]} team2={mockTeams[2]} games={games} inProgress />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Matchup({
  team1,
  team2,
  games,
  winner,
  inProgress,
}: {
  team1: { name: string; seed: number; record: string };
  team2: { name: string; seed: number; record: string };
  games: number;
  winner?: { name: string; seed: number; record: string };
  inProgress?: boolean;
}) {
  return (
    <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{team1.seed}</div>
            <div className={`text-[8px] ${winner?.name === team1.name ? "text-[#E8E8D8]" : "text-[#E8E8D8]/70"}`}>
              {team1.name}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/40">{team1.record}</div>
          </div>
          <div className="text-[#E8E8D8] text-xs">
            {winner?.name === team1.name ? Math.ceil(games / 2) : inProgress ? "2" : "-"}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{team2.seed}</div>
            <div className={`text-[8px] ${winner?.name === team2.name ? "text-[#E8E8D8]" : "text-[#E8E8D8]/70"}`}>
              {team2.name}
            </div>
            <div className="text-[8px] text-[#E8E8D8]/40">{team2.record}</div>
          </div>
          <div className="text-[#E8E8D8] text-xs">
            {winner?.name === team2.name ? Math.ceil(games / 2) : inProgress ? "1" : "-"}
          </div>
        </div>
      </div>
      {inProgress && (
        <div className="mt-2 pt-2 border-t-2 border-[#5A8352] text-center text-[#E8E8D8]/60 text-[8px]">
          SERIES IN PROGRESS
        </div>
      )}
      {winner && (
        <div className="mt-2 pt-2 border-t-2 border-[#5A8352] text-center text-[#E8E8D8] text-[8px]">
          {winner.name.toUpperCase()} ADVANCE
        </div>
      )}
    </div>
  );
}

function PlayoffLeadersContent() {
  const [expandedBattingStat, setExpandedBattingStat] = useState<string | null>(null);
  const [expandedPitchingStat, setExpandedPitchingStat] = useState<string | null>(null);

  // Mock playoff leaders data
  const battingLeadersData = {
    AVG: [
      { player: "J. Rodriguez", team: "Tigers", value: ".385" },
      { player: "K. Martinez", team: "Sox", value: ".361" },
      { player: "T. Anderson", team: "Sox", value: ".342" },
      { player: "M. Thompson", team: "Crocs", value: ".328" },
      { player: "D. Wilson", team: "Beewolves", value: ".315" },
    ],
    HR: [
      { player: "M. Thompson", team: "Crocs", value: "8" },
      { player: "J. Rodriguez", team: "Tigers", value: "7" },
      { player: "K. Martinez", team: "Sox", value: "6" },
      { player: "R. Williams", team: "Nemesis", value: "5" },
      { player: "D. Wilson", team: "Beewolves", value: "5" },
    ],
    RBI: [
      { player: "K. Martinez", team: "Sox", value: "21" },
      { player: "M. Thompson", team: "Crocs", value: "19" },
      { player: "J. Rodriguez", team: "Tigers", value: "18" },
      { player: "R. Williams", team: "Nemesis", value: "16" },
      { player: "T. Anderson", team: "Sox", value: "14" },
    ],
    SB: [
      { player: "T. Davis", team: "Sox", value: "9" },
      { player: "D. Wilson", team: "Beewolves", value: "7" },
      { player: "K. Martinez", team: "Sox", value: "5" },
      { player: "J. Rodriguez", team: "Tigers", value: "4" },
      { player: "A. Brown", team: "Crocs", value: "3" },
    ],
    OPS: [
      { player: "J. Rodriguez", team: "Tigers", value: "1.245" },
      { player: "M. Thompson", team: "Crocs", value: "1.198" },
      { player: "K. Martinez", team: "Sox", value: "1.142" },
      { player: "D. Wilson", team: "Beewolves", value: "1.087" },
      { player: "R. Williams", team: "Nemesis", value: "1.034" },
    ],
  };

  const pitchingLeadersData = {
    ERA: [
      { player: "T. Anderson", team: "Sox", value: "1.72" },
      { player: "A. Chen", team: "Nemesis", value: "1.89" },
      { player: "J. Williams", team: "Tigers", value: "2.14" },
      { player: "R. Garcia", team: "Moonstars", value: "2.38" },
      { player: "K. Brown", team: "Crocs", value: "2.67" },
    ],
    W: [
      { player: "T. Anderson", team: "Sox", value: "4" },
      { player: "A. Chen", team: "Nemesis", value: "4" },
      { player: "J. Williams", team: "Tigers", value: "3" },
      { player: "R. Garcia", team: "Moonstars", value: "3" },
      { player: "K. Brown", team: "Crocs", value: "2" },
    ],
    K: [
      { player: "T. Anderson", team: "Sox", value: "47" },
      { player: "A. Chen", team: "Nemesis", value: "41" },
      { player: "J. Williams", team: "Tigers", value: "38" },
      { player: "R. Garcia", team: "Moonstars", value: "32" },
      { player: "K. Brown", team: "Crocs", value: "29" },
    ],
    WHIP: [
      { player: "A. Chen", team: "Nemesis", value: "0.87" },
      { player: "T. Anderson", team: "Sox", value: "0.94" },
      { player: "J. Williams", team: "Tigers", value: "1.02" },
      { player: "R. Garcia", team: "Moonstars", value: "1.08" },
      { player: "K. Brown", team: "Crocs", value: "1.15" },
    ],
    SV: [
      { player: "C. Rivera", team: "Crocs", value: "8" },
      { player: "K. Lee", team: "Beewolves", value: "6" },
      { player: "D. Martinez", team: "Sox", value: "5" },
      { player: "R. Smith", team: "Tigers", value: "4" },
      { player: "J. Parker", team: "Nemesis", value: "3" },
    ],
  };

  const battingLeaders = [
    { stat: "AVG", value: ".385" },
    { stat: "HR", value: "8" },
    { stat: "RBI", value: "21" },
    { stat: "SB", value: "9" },
    { stat: "OPS", value: "1.245" },
  ];

  const pitchingLeaders = [
    { stat: "ERA", value: "1.72" },
    { stat: "W", value: "4" },
    { stat: "K", value: "47" },
    { stat: "WHIP", value: "0.87" },
    { stat: "SV", value: "8" },
  ];

  // Mock awards race data
  const awardsRaceData = {
    bestHitter: [
      { player: "J. Rodriguez", team: "Tigers", stats: ".385 AVG, 7 HR, 18 RBI, 1.245 OPS" },
      { player: "M. Thompson", team: "Crocs", stats: ".328 AVG, 8 HR, 19 RBI, 1.198 OPS" },
      { player: "K. Martinez", team: "Sox", stats: ".361 AVG, 6 HR, 21 RBI, 1.142 OPS" },
    ],
    bestPitcher: [
      { player: "T. Anderson", team: "Sox", stats: "4-0, 1.72 ERA, 47 K, 0.94 WHIP" },
      { player: "A. Chen", team: "Nemesis", stats: "4-1, 1.89 ERA, 41 K, 0.87 WHIP" },
      { player: "J. Williams", team: "Tigers", stats: "3-0, 2.14 ERA, 38 K, 1.02 WHIP" },
    ],
    bestFielder: [
      { player: "T. Davis", team: "Sox", stats: "SS, 0 Errors, .995 FLD%, 12 Assists" },
      { player: "D. Wilson", team: "Beewolves", stats: "CF, 0 Errors, 1.000 FLD%, 8 Putouts" },
      { player: "K. Martinez", team: "Sox", stats: "3B, 1 Error, .980 FLD%, 14 Assists" },
    ],
  };

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
            {battingLeaders.map((leader, index) => {
              const data = battingLeadersData[leader.stat as keyof typeof battingLeadersData];
              return (
                <div key={index}>
                  <button
                    onClick={() =>
                      setExpandedBattingStat(expandedBattingStat === leader.stat ? null : leader.stat)
                    }
                    className="w-full bg-[#6B9462] border-4 border-[#4A6844] p-3 hover:bg-[#5A8352] transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] text-[#E8E8D8]">{leader.stat}</div>
                        {expandedBattingStat === leader.stat ? (
                          <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                        )}
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]">{leader.value}</div>
                    </div>
                  </button>
                  {expandedBattingStat === leader.stat && (
                    <div className="bg-[#4A6844] border-4 border-[#5A8352] border-t-0 p-2">
                      {data.map((player, pIndex) => (
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
            {pitchingLeaders.map((leader, index) => {
              const data = pitchingLeadersData[leader.stat as keyof typeof pitchingLeadersData];
              return (
                <div key={index}>
                  <button
                    onClick={() =>
                      setExpandedPitchingStat(expandedPitchingStat === leader.stat ? null : leader.stat)
                    }
                    className="w-full bg-[#6B9462] border-4 border-[#4A6844] p-3 hover:bg-[#5A8352] transition"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="text-[8px] text-[#E8E8D8]">{leader.stat}</div>
                        {expandedPitchingStat === leader.stat ? (
                          <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                        )}
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]">{leader.value}</div>
                    </div>
                  </button>
                  {expandedPitchingStat === leader.stat && (
                    <div className="bg-[#4A6844] border-4 border-[#5A8352] border-t-0 p-2">
                      {data.map((player, pIndex) => (
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

      {/* Awards Race Section */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center mt-6">
        <Trophy className="w-8 h-8 text-[#E8E8D8] mx-auto mb-2" />
        <div className="text-sm text-[#E8E8D8]">PLAYOFF AWARDS RACE</div>
        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">TOP PERFORMERS</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Best Hitter */}
        <div>
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-3 mb-3 text-center">
            <div className="text-xs text-[#E8E8D8]">BEST HITTER</div>
          </div>
          <div className="space-y-2">
            {awardsRaceData.bestHitter.map((candidate, index) => (
              <div
                key={index}
                className="bg-[#6B9462] border-4 border-[#4A6844] p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[8px] text-[#E8E8D8]/50 w-4">{index + 1}.</div>
                  <div className="text-[8px] text-[#E8E8D8] font-bold">{candidate.player}</div>
                </div>
                <div className="text-[7px] text-[#E8E8D8]/60 ml-6">{candidate.team}</div>
                <div className="text-[7px] text-[#E8E8D8]/80 ml-6 mt-1">{candidate.stats}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Pitcher */}
        <div>
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-3 mb-3 text-center">
            <div className="text-xs text-[#E8E8D8]">BEST PITCHER</div>
          </div>
          <div className="space-y-2">
            {awardsRaceData.bestPitcher.map((candidate, index) => (
              <div
                key={index}
                className="bg-[#6B9462] border-4 border-[#4A6844] p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[8px] text-[#E8E8D8]/50 w-4">{index + 1}.</div>
                  <div className="text-[8px] text-[#E8E8D8] font-bold">{candidate.player}</div>
                </div>
                <div className="text-[7px] text-[#E8E8D8]/60 ml-6">{candidate.team}</div>
                <div className="text-[7px] text-[#E8E8D8]/80 ml-6 mt-1">{candidate.stats}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Fielder */}
        <div>
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-3 mb-3 text-center">
            <div className="text-xs text-[#E8E8D8]">BEST FIELDER</div>
          </div>
          <div className="space-y-2">
            {awardsRaceData.bestFielder.map((candidate, index) => (
              <div
                key={index}
                className="bg-[#6B9462] border-4 border-[#4A6844] p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[8px] text-[#E8E8D8]/50 w-4">{index + 1}.</div>
                  <div className="text-[8px] text-[#E8E8D8] font-bold">{candidate.player}</div>
                </div>
                <div className="text-[7px] text-[#E8E8D8]/60 ml-6">{candidate.team}</div>
                <div className="text-[7px] text-[#E8E8D8]/80 ml-6 mt-1">{candidate.stats}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayoffHistoryContent() {
  const [expandedYear, setExpandedYear] = useState<string | null>("2023");

  // Mock historical playoff data
  const playoffHistory = [
    {
      year: "2023",
      league: "American League",
      champion: { team: "Tigers", seed: 1, record: "68-32" },
      runnerUp: { team: "Sox", seed: 2, record: "65-35" },
      seriesResult: "4-3",
      mvp: { player: "J. Rodriguez", stats: ".385 AVG, 7 HR, 18 RBI" },
      bestPitcher: { player: "T. Anderson", stats: "4-0, 1.72 ERA, 47 K" },
      bestFielder: { player: "T. Davis", stats: "SS, 0 Errors, .995 FLD%" },
      rounds: [
        {
          name: "Championship",
          matchups: [
            { team1: "Tigers", team2: "Sox", result: "4-3", winner: "Tigers" }
          ]
        },
        {
          name: "Semi-Finals",
          matchups: [
            { team1: "Tigers", team2: "Dodgers", result: "4-1", winner: "Tigers" },
            { team1: "Sox", team2: "Cubs", result: "4-2", winner: "Sox" }
          ]
        }
      ]
    },
    {
      year: "2022",
      league: "National League",
      champion: { team: "Cubs", seed: 1, record: "62-38" },
      runnerUp: { team: "Dodgers", seed: 2, record: "60-40" },
      seriesResult: "4-3",
      mvp: { player: "R. Williams", stats: ".361 AVG, 6 HR, 21 RBI" },
      bestPitcher: { player: "A. Chen", stats: "4-1, 1.89 ERA, 41 K" },
      bestFielder: { player: "D. Wilson", stats: "CF, 0 Errors, 1.000 FLD%" },
      rounds: [
        {
          name: "Championship",
          matchups: [
            { team1: "Cubs", team2: "Dodgers", result: "4-3", winner: "Cubs" }
          ]
        },
        {
          name: "Semi-Finals",
          matchups: [
            { team1: "Cubs", team2: "Brewers", result: "4-0", winner: "Cubs" },
            { team1: "Dodgers", team2: "Mets", result: "4-2", winner: "Dodgers" }
          ]
        }
      ]
    },
    {
      year: "2021",
      league: "American League",
      champion: { team: "Yankees", seed: 1, record: "58-42" },
      runnerUp: { team: "Mets", seed: 2, record: "56-44" },
      seriesResult: "4-1",
      mvp: { player: "M. Thompson", stats: ".328 AVG, 8 HR, 19 RBI" },
      bestPitcher: { player: "J. Williams", stats: "3-0, 2.14 ERA, 38 K" },
      bestFielder: { player: "K. Martinez", stats: "3B, 1 Error, .980 FLD%" },
      rounds: [
        {
          name: "Championship",
          matchups: [
            { team1: "Yankees", team2: "Mets", result: "4-1", winner: "Yankees" }
          ]
        },
        {
          name: "Semi-Finals",
          matchups: [
            { team1: "Yankees", team2: "Braves", result: "4-2", winner: "Yankees" },
            { team1: "Mets", team2: "Tigers", result: "4-3", winner: "Mets" }
          ]
        }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 text-center">
        <Trophy className="w-10 h-10 text-[#E8E8D8] mx-auto mb-2" />
        <div className="text-lg text-[#E8E8D8]">PLAYOFF HISTORY</div>
        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">PAST POSTSEASON RESULTS & AWARDS</div>
      </div>

      {/* Championship History */}
      {playoffHistory.map((playoff) => (
        <div key={playoff.year} className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <button
            onClick={() => setExpandedYear(expandedYear === playoff.year ? null : playoff.year)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-[#E8E8D8]" />
                <div>
                  <div className="text-sm text-[#E8E8D8]">
                    {playoff.year} CHAMPIONSHIP - {playoff.league.toUpperCase()}
                  </div>
                  <div className="text-[8px] text-[#E8E8D8]/60 mt-1">
                    {playoff.champion.team.toUpperCase()} def. {playoff.runnerUp.team.toUpperCase()} ({playoff.seriesResult})
                  </div>
                </div>
              </div>
              {expandedYear === playoff.year ? (
                <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#E8E8D8]" />
              )}
            </div>
          </button>

          {expandedYear === playoff.year && (
            <div className="mt-4 space-y-4">
              {/* Championship Series */}
              <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-2">CHAMPIONSHIP SERIES</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-[#E8E8D8]" />
                      <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{playoff.champion.seed}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold">{playoff.champion.team}</div>
                      <div className="text-[8px] text-[#E8E8D8]/40">{playoff.champion.record}</div>
                    </div>
                    <div className="text-[#E8E8D8] text-xs">{playoff.seriesResult.split('-')[0]}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4"></div>
                      <div className="text-[#E8E8D8]/50 text-[8px] w-6">#{playoff.runnerUp.seed}</div>
                      <div className="text-[8px] text-[#E8E8D8]/70">{playoff.runnerUp.team}</div>
                      <div className="text-[8px] text-[#E8E8D8]/40">{playoff.runnerUp.record}</div>
                    </div>
                    <div className="text-[#E8E8D8] text-xs">{playoff.seriesResult.split('-')[1]}</div>
                  </div>
                </div>
              </div>

              {/* Playoff Rounds */}
              {playoff.rounds.map((round, rIndex) => (
                <div key={rIndex} className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                  <div className="text-[8px] text-[#E8E8D8]/70 mb-2">{round.name.toUpperCase()}</div>
                  <div className="space-y-3">
                    {round.matchups.map((matchup, mIndex) => (
                      <div key={mIndex} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {matchup.winner === matchup.team1 && (
                              <Trophy className="w-3 h-3 text-[#E8E8D8]" />
                            )}
                            <div className="text-[8px] text-[#E8E8D8]">{matchup.team1}</div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]">{matchup.result.split('-')[0]}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {matchup.winner === matchup.team2 && (
                              <Trophy className="w-3 h-3 text-[#E8E8D8]" />
                            )}
                            <div className="text-[8px] text-[#E8E8D8]/70">{matchup.team2}</div>
                          </div>
                          <div className="text-[8px] text-[#E8E8D8]/70">{matchup.result.split('-')[1]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Awards */}
              <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3">
                <div className="text-[8px] text-[#E8E8D8]/70 mb-3">PLAYOFF AWARDS</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-[#5A8352]">
                    <div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold">MVP</div>
                      <div className="text-[7px] text-[#E8E8D8]/60 mt-1">{playoff.mvp.player}</div>
                    </div>
                    <div className="text-[7px] text-[#E8E8D8]/80 text-right">{playoff.mvp.stats}</div>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#5A8352]">
                    <div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold">BEST PITCHER</div>
                      <div className="text-[7px] text-[#E8E8D8]/60 mt-1">{playoff.bestPitcher.player}</div>
                    </div>
                    <div className="text-[7px] text-[#E8E8D8]/80 text-right">{playoff.bestPitcher.stats}</div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold">BEST FIELDER</div>
                      <div className="text-[7px] text-[#E8E8D8]/60 mt-1">{playoff.bestFielder.player}</div>
                    </div>
                    <div className="text-[7px] text-[#E8E8D8]/80 text-right">{playoff.bestFielder.stats}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* All-Time Stats Summary */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
        <div className="text-sm text-[#E8E8D8] mb-3">▶ ALL-TIME CHAMPIONSHIPS</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3 text-center">
            <div className="text-[8px] text-[#E8E8D8]/70">TIGERS</div>
            <div className="text-lg text-[#E8E8D8] mt-1">2</div>
          </div>
          <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3 text-center">
            <div className="text-[8px] text-[#E8E8D8]/70">CUBS</div>
            <div className="text-lg text-[#E8E8D8] mt-1">1</div>
          </div>
          <div className="bg-[#4A6844] border-4 border-[#5A8352] p-3 text-center">
            <div className="text-[8px] text-[#E8E8D8]/70">YANKEES</div>
            <div className="text-lg text-[#E8E8D8] mt-1">1</div>
          </div>
        </div>
      </div>
    </div>
  );
}