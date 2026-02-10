import { useState, useEffect, createContext, useContext } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Users, TrendingUp, Newspaper, Trophy, Folder, Home, ChevronDown, ChevronUp, DollarSign, ClipboardList, Star, Award, TrendingDown, Shuffle, UserMinus, CheckCircle, ArrowRight, BarChart3, Plus } from "lucide-react";
import { getTeamColors } from "@/config/teamColors";
import { getStadiumForTeam } from "@/config/stadiumData";
import { TeamHubContent } from "@/app/components/TeamHubContent";
import { MuseumContent, type RetiredJersey } from "@/app/components/MuseumContent";
import { FreeAgencyFlow } from "@/app/components/FreeAgencyFlow";
import { RatingsAdjustmentFlow } from "@/app/components/RatingsAdjustmentFlow";
import { RetirementFlow } from "@/app/components/RetirementFlow";
import { AwardsCeremonyFlow } from "@/app/components/AwardsCeremonyFlow";
import { ContractionExpansionFlow } from "@/app/components/ContractionExpansionFlow";
import { DraftFlow } from "@/app/components/DraftFlow";
import { FinalizeAdvanceFlow } from "@/app/components/FinalizeAdvanceFlow";
import { TradeFlow } from "@/app/components/TradeFlow";
import { AddGameModal, type GameFormData } from "@/app/components/AddGameModal";
import { ScheduleContent } from "@/app/components/ScheduleContent";
import { useFranchiseData, type UseFranchiseDataReturn } from "@/hooks/useFranchiseData";
import { useScheduleData, type ScheduledGame } from "@/hooks/useScheduleData";
import { usePlayoffData } from "@/hooks/usePlayoffData";

// Context for passing franchise data to child components
const FranchiseDataContext = createContext<UseFranchiseDataReturn | null>(null);

export function useFranchiseDataContext() {
  const context = useContext(FranchiseDataContext);
  if (!context) {
    throw new Error('useFranchiseDataContext must be used within FranchiseDataProvider');
  }
  return context;
}

type TabType = "todays-game" | "team" | "schedule" | "standings" | "news" | "leaders" | "rosters" | "allstar" | "museum" | "awards" | "ratings-adj" | "contraction" | "retirements" | "free-agency" | "draft" | "finalize" | "advance" | "bracket" | "series" | "playoff-stats" | "playoff-leaders";
type SeasonPhase = "regular" | "playoffs" | "offseason";

// ScheduledGame type is imported from useScheduleData hook

export function FranchiseHome() {
  const navigate = useNavigate();
  const { franchiseId } = useParams<{ franchiseId: string }>();

  // Real season data from IndexedDB (with mock fallbacks)
  const franchiseData = useFranchiseData(franchiseId);

  const [seasonPhase, setSeasonPhase] = useState<SeasonPhase>("regular");
  const [activeTab, setActiveTab] = useState<TabType>("todays-game");
  const [leagueName, setLeagueName] = useState<string>("KRUSE BASEBALL");
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);
  const [showFreeAgency, setShowFreeAgency] = useState(false);
  const [showRatingsAdjustment, setShowRatingsAdjustment] = useState(false);
  const [showRetirements, setShowRetirements] = useState(false);
  const [showAwards, setShowAwards] = useState(false);
  const [showContraction, setShowContraction] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [retiredJerseys, setRetiredJerseys] = useState<RetiredJersey[]>([]);
  const [selectedScheduleTeam, setSelectedScheduleTeam] = useState<string>("FULL LEAGUE");
  
  // Schedule System State - Persisted to IndexedDB via useScheduleData
  // Load initial season from localStorage or default to 1
  const [currentSeason, setCurrentSeason] = useState(() => {
    const stored = localStorage.getItem('kbl-current-season');
    return stored ? parseInt(stored, 10) : 1;
  });
  const scheduleData = useScheduleData(currentSeason);
  const [addGameModalOpen, setAddGameModalOpen] = useState(false);

  // Playoff System State - Persisted to IndexedDB via usePlayoffData
  const playoffData = usePlayoffData(currentSeason);

  // Sync league name from franchise config when loaded
  useEffect(() => {
    if (franchiseData.leagueName) {
      setLeagueName(franchiseData.leagueName);
    }
  }, [franchiseData.leagueName]);

  // All-Star voting state
  const [allStarLeague, setAllStarLeague] = useState<"Eastern" | "Western">("Eastern");

  // Mock All-Star voting data
  const allStarVotes = {
    Eastern: {
      C: [
        { name: "M. Chen", team: "Tigers", pos: "C", votes: 245680 },
        { name: "J. Taylor", team: "Sox", pos: "C", votes: 198420 },
      ],
      "1B": [
        { name: "R. Thompson", team: "Moonstars", pos: "1B", votes: 312450 },
        { name: "D. Martinez", team: "Crocs", pos: "1B", votes: 267890 },
      ],
      "2B": [
        { name: "K. Anderson", team: "Sox", pos: "2B", votes: 289340 },
        { name: "S. Tanaka", team: "Tigers", pos: "2B", votes: 234120 },
      ],
      "3B": [
        { name: "L. Rodriguez", team: "Nemesis", pos: "3B", votes: 298760 },
        { name: "P. Davis", team: "Moonstars", pos: "3B", votes: 256340 },
      ],
      SS: [
        { name: "J. Martinez", team: "Sox", pos: "SS", votes: 334590 },
        { name: "H. Nakamura", team: "Tigers", pos: "SS", votes: 278920 },
      ],
      LF: [
        { name: "A. Johnson", team: "Crocs", pos: "LF", votes: 276430 },
        { name: "R. Garcia", team: "Nemesis", pos: "LF", votes: 241680 },
      ],
      CF: [
        { name: "Y. Wilson", team: "Moonstars", pos: "CF", votes: 356780 },
        { name: "D. Brown", team: "Tigers", pos: "CF", votes: 298450 },
      ],
      RF: [
        { name: "T. Ramirez", team: "Sox", pos: "RF", votes: 302140 },
        { name: "K. White", team: "Crocs", pos: "RF", votes: 267320 },
      ],
      Bench: [
        { name: "L. Kim", team: "Tigers", pos: "OF", votes: 223450 },
        { name: "M. Lopez", team: "Sox", pos: "1B", votes: 198760 },
        { name: "S. Patel", team: "Nemesis", pos: "2B", votes: 187340 },
        { name: "R. Lee", team: "Moonstars", pos: "3B", votes: 176890 },
        { name: "J. Smith", team: "Crocs", pos: "SS", votes: 165420 },
      ],
      SP: [
        { name: "C. Hernandez", team: "Tigers", pos: "SP", votes: 298450 },
        { name: "D. Peterson", team: "Sox", pos: "SP", votes: 276340 },
        { name: "M. Sato", team: "Moonstars", pos: "SP", votes: 245680 },
        { name: "L. Williams", team: "Crocs", pos: "SP", votes: 223890 },
      ],
      RP: [
        { name: "K. Rivera", team: "Nemesis", pos: "RP", votes: 187650 },
        { name: "T. Jackson", team: "Tigers", pos: "RP", votes: 176340 },
        { name: "P. Gonzalez", team: "Sox", pos: "RP", votes: 165780 },
        { name: "A. Yamamoto", team: "Moonstars", pos: "RP", votes: 154230 },
        { name: "R. Miller", team: "Crocs", pos: "RP", votes: 142890 },
      ],
    },
    Western: {
      C: [
        { name: "B. Foster", team: "Herbisaurs", pos: "C", votes: 267890 },
        { name: "J. O'Brien", team: "Wild Pigs", pos: "C", votes: 234560 },
      ],
      "1B": [
        { name: "M. Thompson", team: "Beewolves", pos: "1B", votes: 334780 },
        { name: "D. Chang", team: "Herbisaurs", pos: "1B", votes: 289450 },
      ],
      "2B": [
        { name: "S. Murphy", team: "Wild Pigs", pos: "2B", votes: 312560 },
        { name: "K. Suzuki", team: "Beewolves", pos: "2B", votes: 276340 },
      ],
      "3B": [
        { name: "R. Cruz", team: "Herbisaurs", pos: "3B", votes: 298340 },
        { name: "L. Bennett", team: "Wild Pigs", pos: "3B", votes: 267120 },
      ],
      SS: [
        { name: "T. Silva", team: "Beewolves", pos: "SS", votes: 345670 },
        { name: "A. Wright", team: "Herbisaurs", pos: "SS", votes: 289760 },
      ],
      LF: [
        { name: "J. Park", team: "Wild Pigs", pos: "LF", votes: 287450 },
        { name: "M. Torres", team: "Beewolves", pos: "LF", votes: 256780 },
      ],
      CF: [
        { name: "D. Coleman", team: "Herbisaurs", pos: "CF", votes: 367890 },
        { name: "R. Hayes", team: "Wild Pigs", pos: "CF", votes: 312340 },
      ],
      RF: [
        { name: "K. Brooks", team: "Beewolves", pos: "RF", votes: 323450 },
        { name: "S. Powell", team: "Herbisaurs", pos: "RF", votes: 278960 },
      ],
      Bench: [
        { name: "A. Morgan", team: "Wild Pigs", pos: "OF", votes: 234560 },
        { name: "L. Fisher", team: "Beewolves", pos: "C", votes: 212890 },
        { name: "T. Cooper", team: "Herbisaurs", pos: "2B", votes: 198450 },
        { name: "J. Reed", team: "Wild Pigs", pos: "3B", votes: 187230 },
        { name: "M. Ward", team: "Beewolves", pos: "1B", votes: 176540 },
      ],
      SP: [
        { name: "L. Richardson", team: "Herbisaurs", pos: "SP", votes: 312450 },
        { name: "K. Butler", team: "Wild Pigs", pos: "SP", votes: 289340 },
        { name: "D. Russell", team: "Beewolves", pos: "SP", votes: 267890 },
        { name: "T. Howard", team: "Herbisaurs", pos: "SP", votes: 245670 },
      ],
      RP: [
        { name: "S. Griffin", team: "Wild Pigs", pos: "RP", votes: 198760 },
        { name: "M. Barnes", team: "Beewolves", pos: "RP", votes: 187450 },
        { name: "R. Henderson", team: "Herbisaurs", pos: "RP", votes: 176340 },
        { name: "J. Dixon", team: "Wild Pigs", pos: "RP", votes: 165780 },
        { name: "A. Perry", team: "Beewolves", pos: "RP", votes: 154230 },
      ],
    },
  };

  // Helper functions for All-Star data
  const getTopPlayerByPosition = (league: "Eastern" | "Western", position: string) => {
    const leagueData = allStarVotes[league] as Record<string, { name: string; team: string; pos: string; votes: number }[]>;
    return leagueData[position]?.[0];
  };

  const getBenchPlayers = (league: "Eastern" | "Western") => {
    return allStarVotes[league].Bench || [];
  };

  const getStartingPitchers = (league: "Eastern" | "Western") => {
    return allStarVotes[league].SP || [];
  };

  const getReliefPitchers = (league: "Eastern" | "Western") => {
    return allStarVotes[league].RP || [];
  };

  useEffect(() => {
    // Try to load the selected league from localStorage
    const storedLeague = localStorage.getItem("selectedLeague");
    if (storedLeague) {
      try {
        const league = JSON.parse(storedLeague);
        if (league.name) {
          setLeagueName(league.name);
        }
      } catch (e) {
        console.error("Error loading league:", e);
      }
    }
  }, []);

  // Reset to first tab when switching seasons
  useEffect(() => {
    if (seasonPhase === "regular") {
      setActiveTab("todays-game");
    } else {
      setActiveTab("news");
    }
  }, [seasonPhase]);

  const handleLogoClick = () => {
    navigate("/");
  };

  // Schedule System Functions
  const availableTeams = [
    "TIGERS", "SOX", "BEARS", "CROCS", "MOOSE", 
    "NEMESIS", "MOONSTARS", "HERBISAURS", "WILD PIGS", "BEEWOLVES"
  ];

  // Schedule helper functions - now use scheduleData from hook
  const getNextGameNumber = (): number => {
    if (scheduleData.games.length === 0) return 1;
    const maxGameNumber = Math.max(...scheduleData.games.map(g => g.gameNumber));
    return maxGameNumber + 1;
  };

  const getNextDayNumber = (): number => {
    if (scheduleData.games.length === 0) return 1;
    const maxDayNumber = Math.max(...scheduleData.games.map(g => g.dayNumber));
    return maxDayNumber + 1;
  };

  const getNextDate = (): string => {
    if (scheduleData.games.length === 0) {
      // Start with today's date
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    // Find the most recent game with a date
    const gamesWithDates = scheduleData.games
      .filter(g => g.date)
      .sort((a, b) => b.gameNumber - a.gameNumber);

    if (gamesWithDates.length === 0) {
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    // Parse the last date and add one day
    const lastGame = gamesWithDates[0];
    const lastDate = lastGame.date || '';

    // Try to parse "Month Day" format (e.g., "July 12")
    try {
      const currentYear = new Date().getFullYear();
      const parsedDate = new Date(`${lastDate}, ${currentYear}`);

      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setDate(parsedDate.getDate() + 1);
        return parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      }
    } catch (e) {
      // If parsing fails, just use today
    }

    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const getFilteredSchedule = (filter: string): ScheduledGame[] => {
    if (filter === "FULL LEAGUE") {
      return [...scheduleData.games].sort((a, b) => a.gameNumber - b.gameNumber);
    }

    return scheduleData.games
      .filter(g => g.awayTeamId === filter || g.homeTeamId === filter)
      .sort((a, b) => a.gameNumber - b.gameNumber);
  };

  // Add game - persisted to IndexedDB via useScheduleData hook
  const handleAddGame = async (gameData: GameFormData) => {
    try {
      await scheduleData.addGame({
        gameNumber: gameData.gameNumber,
        dayNumber: gameData.dayNumber,
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      });
    } catch (err) {
      console.error('[FranchiseHome] Failed to add game:', err);
    }
  };

  // Add series - persisted to IndexedDB via useScheduleData hook
  const handleAddSeries = async (gameData: GameFormData, count: number) => {
    try {
      await scheduleData.addSeries({
        date: gameData.date,
        time: gameData.time,
        awayTeamId: gameData.awayTeamId,
        homeTeamId: gameData.homeTeamId,
      }, count);
    } catch (err) {
      console.error('[FranchiseHome] Failed to add series:', err);
    }
  };

  const regularSeasonTabs = [
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    { id: "todays-game", label: "Today's Game", icon: <Calendar className="w-4 h-4" /> },
    { id: "schedule", label: "SCHEDULE", icon: <Calendar className="w-4 h-4" /> },
    { id: "standings", label: "STANDINGS", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "team", label: "TEAM HUB", icon: <Users className="w-4 h-4" /> },
    { id: "leaders", label: "LEAGUE LEADERS", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "rosters", label: "TRADES", icon: <Folder className="w-4 h-4" /> },
    { id: "allstar", label: "ALL-STAR", icon: <Star className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  const playoffTabs = [
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    { id: "bracket", label: "BRACKET", icon: <Trophy className="w-4 h-4" /> },
    { id: "series", label: "SERIES RESULTS", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "playoff-stats", label: "PLAYOFF STATS", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "playoff-leaders", label: "PLAYOFF LEADERS", icon: <Star className="w-4 h-4" /> },
    { id: "team", label: "TEAM HUB", icon: <Users className="w-4 h-4" /> },
    { id: "advance", label: "ADVANCE TO OFFSEASON", icon: <ArrowRight className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  const offseasonTabs = [
    { id: "news", label: "THE TOOTWHISTLE TIMES", icon: <Newspaper className="w-4 h-4" /> },
    { id: "awards", label: "AWARDS", icon: <Award className="w-4 h-4" /> },
    { id: "ratings-adj", label: "RATINGS ADJ", icon: <TrendingDown className="w-4 h-4" /> },
    { id: "retirements", label: "RETIREMENTS", icon: <UserMinus className="w-4 h-4" /> },
    { id: "contraction", label: "CONTRACT/EXPAND", icon: <Shuffle className="w-4 h-4" /> },
    { id: "free-agency", label: "FREE AGENCY", icon: <DollarSign className="w-4 h-4" /> },
    { id: "draft", label: "DRAFT", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "rosters", label: "TRADES", icon: <Folder className="w-4 h-4" /> },
    { id: "finalize", label: "FINALIZE AND ADVANCE", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "museum", label: "MUSEUM", icon: <Trophy className="w-4 h-4" /> },
  ];

  const currentTabs = seasonPhase === "regular" ? regularSeasonTabs : seasonPhase === "playoffs" ? playoffTabs : offseasonTabs;

  // Schedule data is now loaded from IndexedDB via useScheduleData hook
  // No mock initialization needed - schedule starts empty per Figma spec

  return (
    <FranchiseDataContext.Provider value={franchiseData}>
    <div className="min-h-screen bg-[#567A50] text-white">
      {/* Header with logo */}
      <div className="bg-[#6B9462] border-b-[6px] border-[#4A6844] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between bg-[#5A8352] px-6 py-4">
          <button
            onClick={handleLogoClick}
            className="hover:scale-105 transition-transform active:scale-95"
          >
            <div className="bg-white border-2 border-[#0066FF] px-2 py-1 shadow-[3px_3px_0px_0px_#DD0000]">
              <div className="text-[8px] text-[#DD0000] leading-tight tracking-wide">SUPER</div>
              <div className="text-[8px] text-[#DD0000] leading-tight tracking-wide">MEGA</div>
              <div className="text-[9px] text-[#0066FF] leading-tight tracking-wide">BASEBALL</div>
            </div>
          </button>

          {/* League name - centered */}
          <div className="text-center">
            <div className="text-[16px] text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{leagueName}</div>
            <div className="text-[8px] text-[#E8E8D8]/70">
              SEASON {currentSeason} • WEEK {franchiseData.currentWeek}
              {franchiseData.hasRealData && <span className="ml-2 text-[#C4A853]">●</span>}
            </div>
          </div>

          <button
            onClick={handleLogoClick}
            className="p-2 hover:bg-[#4A6844] border-2 border-[#4A6844] active:scale-95 transition"
          >
            <Home className="w-5 h-5 text-[#E8E8D8]" />
          </button>
        </div>
      </div>

      {/* Season phase toggle */}
      <div className="bg-[#6B9462] border-b-4 border-[#4A6844]">
        <div className="max-w-7xl mx-auto flex">
          <button
            onClick={() => setSeasonPhase("regular")}
            className={`flex-1 py-2 text-sm border-r-4 border-[#4A6844] transition ${
              seasonPhase === "regular"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            REGULAR SEASON
          </button>
          <button
            onClick={() => setSeasonPhase("playoffs")}
            className={`flex-1 py-2 text-sm border-r-4 border-[#4A6844] transition ${
              seasonPhase === "playoffs"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            PLAYOFFS
          </button>
          <button
            onClick={() => setSeasonPhase("offseason")}
            className={`flex-1 py-2 text-sm transition ${
              seasonPhase === "offseason"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            OFFSEASON
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-[#6B9462] overflow-x-auto border-b-4 border-[#4A6844]">
        <div className={`max-w-7xl mx-auto flex ${seasonPhase === "regular" ? "gap-0" : "gap-0"}`}>
          {currentTabs.map((tab, index) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex-1 px-2 py-2 text-[8px] whitespace-nowrap transition border-r-2 border-[#4A6844] ${
                  activeTab === tab.id
                    ? "bg-[#4A6844] text-[#E8E8D8]"
                    : "text-[#E8E8D8]/60 hover:bg-[#5A8352]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto p-4 bg-[#567A50]">
        {activeTab === "todays-game" && <GameDayContent />}
        {activeTab === "team" && (
          <TeamHubContent />
        )}
        {activeTab === "schedule" && (
          <ScheduleContent
            games={getFilteredSchedule(selectedScheduleTeam)}
            selectedTeam={selectedScheduleTeam}
            onTeamChange={setSelectedScheduleTeam}
            availableTeams={availableTeams}
            onAddGame={() => setAddGameModalOpen(true)}
            dropdownOpen={scheduleDropdownOpen}
            setDropdownOpen={setScheduleDropdownOpen}
          />
        )}
        {activeTab === "news" && (
          <BeatReporterNews />
        )}
        {activeTab === "standings" && (
          <StandingsContent />
        )}
        {activeTab === "leaders" && (
          <LeagueLeadersContent />
        )}
        {activeTab === "rosters" && (
          <TradeFlow seasonId={`season-${currentSeason}`} />
        )}
        {activeTab === "allstar" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-6">
            {/* League Toggle */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => setAllStarLeague("Eastern")}
                className={`flex-1 py-3 px-4 border-[4px] border-[#4A6844] transition ${
                  allStarLeague === "Eastern" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">EASTERN LEAGUE</div>
              </button>
              <button
                onClick={() => setAllStarLeague("Western")}
                className={`flex-1 py-3 px-4 border-[4px] border-[#4A6844] transition ${
                  allStarLeague === "Western" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[11px] font-bold">WESTERN LEAGUE</div>
              </button>
            </div>

            {/* Baseball Field Layout - Outfield */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Left Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">LF</div>
                  {getTopPlayerByPosition(allStarLeague, "LF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "LF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "LF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "LF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">CF</div>
                  {getTopPlayerByPosition(allStarLeague, "CF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "CF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "CF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "CF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Field */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">RF</div>
                  {getTopPlayerByPosition(allStarLeague, "RF") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "RF")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "RF")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "RF")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Infield */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Third Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">3B</div>
                  {getTopPlayerByPosition(allStarLeague, "3B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "3B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "3B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "3B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Shortstop */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">SS</div>
                  {getTopPlayerByPosition(allStarLeague, "SS") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "SS")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "SS")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "SS")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Second Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">2B</div>
                  {getTopPlayerByPosition(allStarLeague, "2B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "2B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "2B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "2B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* First Base */}
              <div className="col-span-1">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">1B</div>
                  {getTopPlayerByPosition(allStarLeague, "1B") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "1B")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "1B")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "1B")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Catcher */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-start-2">
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-[9px] text-[#E8E8D8] font-bold mb-2 text-center">C</div>
                  {getTopPlayerByPosition(allStarLeague, "C") && (
                    <div className="bg-[#4A6844] border-[3px] border-[#C4A853] p-2">
                      <div className="text-[9px] text-[#E8E8D8] font-bold">{getTopPlayerByPosition(allStarLeague, "C")?.name}</div>
                      <div className="text-[7px] text-[#E8E8D8]/70">{getTopPlayerByPosition(allStarLeague, "C")?.team}</div>
                      <div className="text-[8px] text-[#E8E8D8] font-bold mt-1">
                        <Star className="w-3 h-3 inline mr-1 text-[#C4A853]" />
                        {getTopPlayerByPosition(allStarLeague, "C")?.votes.toLocaleString()} votes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bench Players */}
            <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4 mb-6">
              <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                BENCH (POSITION PLAYERS)
              </div>
              <div className="grid grid-cols-5 gap-3">
                {getBenchPlayers(allStarLeague).map((player, idx) => (
                  <div key={idx} className="bg-[#4A6844] border-[3px] border-[#E8E8D8]/30 p-2">
                    <div className="text-[8px] text-[#E8E8D8] font-bold">{player.name}</div>
                    <div className="text-[7px] text-[#E8E8D8]/70">{player.pos} • {player.team}</div>
                    <div className="text-[7px] text-[#E8E8D8] font-bold mt-1">
                      {player.votes.toLocaleString()} votes
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pitchers Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Starting Pitchers */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  STARTING PITCHERS
                </div>
                <div className="space-y-2">
                  {getStartingPitchers(allStarLeague).map((player, idx) => (
                    <div key={idx} className={`bg-[#4A6844] border-[3px] p-2 ${idx === 0 ? 'border-[#C4A853]' : 'border-[#E8E8D8]/30'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-[8px] font-bold ${idx === 0 ? 'text-[#C4A853]' : 'text-[#E8E8D8]'}`}>
                            {idx === 0 && <Star className="w-3 h-3 inline mr-1" />}
                            {player.name}
                          </div>
                          <div className="text-[7px] text-[#E8E8D8]/70">{player.team}</div>
                        </div>
                        <div className="text-[7px] text-[#E8E8D8] font-bold">
                          {player.votes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relief Pitchers */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-4">
                <div className="text-[10px] text-[#E8E8D8] font-bold mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  RELIEF PITCHERS
                </div>
                <div className="space-y-2">
                  {getReliefPitchers(allStarLeague).map((player, idx) => (
                    <div key={idx} className={`bg-[#4A6844] border-[3px] p-2 ${idx === 0 ? 'border-[#C4A853]' : 'border-[#E8E8D8]/30'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-[8px] font-bold ${idx === 0 ? 'text-[#C4A853]' : 'text-[#E8E8D8]'}`}>
                            {idx === 0 && <Star className="w-3 h-3 inline mr-1" />}
                            {player.name}
                          </div>
                          <div className="text-[7px] text-[#E8E8D8]/70">{player.team}</div>
                        </div>
                        <div className="text-[7px] text-[#E8E8D8] font-bold">
                          {player.votes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "museum" && (
          <MuseumContent retiredJerseys={retiredJerseys} />
        )}
        
        {/* Playoff Tabs Content */}
        {activeTab === "bracket" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF BRACKET</h2>
              <div className="text-sm text-[#E8E8D8]/70">
                {playoffData.playoff ? `Season ${playoffData.playoff.seasonNumber} Postseason` : `Season ${currentSeason} Postseason`}
              </div>
              {playoffData.playoff?.status === 'COMPLETED' && playoffData.playoff.champion && (
                <div className="mt-2 text-lg text-[#FFD700]">
                  🏆 CHAMPION: {playoffData.playoff.teams.find(t => t.teamId === playoffData.playoff?.champion)?.teamName.toUpperCase()}
                </div>
              )}
            </div>

            {!playoffData.playoff ? (
              // No playoff exists - show create option
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-[#E8E8D8]/30 mx-auto mb-4" />
                <div className="text-lg text-[#E8E8D8] mb-2">No Playoffs Configured</div>
                <div className="text-sm text-[#E8E8D8]/70 mb-6">
                  Create a playoff bracket based on current standings
                </div>
                <button
                  onClick={async () => {
                    try {
                      await playoffData.createNewPlayoff({
                        seasonNumber: currentSeason,
                        seasonId: `season-${currentSeason}`,
                        teamsQualifying: 8,
                        gamesPerRound: [5, 7, 7], // Wild Card, Division, Championship
                      });
                    } catch (err) {
                      console.error('Failed to create playoff:', err);
                    }
                  }}
                  className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                >
                  CREATE PLAYOFF BRACKET
                </button>
              </div>
            ) : (
              // Playoff exists - show bracket
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Eastern Conference */}
                  <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                    <div className="text-lg text-[#E8E8D8] font-bold mb-4 text-center border-b-2 border-[#4A6844] pb-2">
                      EASTERN CONFERENCE
                    </div>
                    <div className="space-y-4">
                      {playoffData.bracketByLeague.Eastern.length > 0 ? (
                        playoffData.bracketByLeague.Eastern.map((s) => (
                          <div key={s.id}>
                            <div className="text-xs text-[#E8E8D8]/60 mb-2">{s.roundName.toUpperCase()}</div>
                            <div className={`bg-[#4A6844] p-3 border-2 ${
                              s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                              s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                              'border-[#E8E8D8]/30'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.higherSeed.seed}) {s.higherSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.higherSeedWins}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.lowerSeedWins}</span>
                              </div>
                              {s.status === 'IN_PROGRESS' && (
                                <div className="mt-2 text-[8px] text-[#5599FF] text-center">IN PROGRESS - Best of {s.bestOf}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                          {playoffData.playoff.teams.filter(t => t.league === 'Eastern').slice(0, 4).map((t, i) => (
                            <div key={t.teamId} className="py-1">({i + 1}) {t.teamName}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Western Conference */}
                  <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                    <div className="text-lg text-[#E8E8D8] font-bold mb-4 text-center border-b-2 border-[#4A6844] pb-2">
                      WESTERN CONFERENCE
                    </div>
                    <div className="space-y-4">
                      {playoffData.bracketByLeague.Western.length > 0 ? (
                        playoffData.bracketByLeague.Western.map((s) => (
                          <div key={s.id}>
                            <div className="text-xs text-[#E8E8D8]/60 mb-2">{s.roundName.toUpperCase()}</div>
                            <div className={`bg-[#4A6844] p-3 border-2 ${
                              s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                              s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                              'border-[#E8E8D8]/30'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.higherSeed.seed}) {s.higherSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.higherSeedWins}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className={`text-xs ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                  ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                                </span>
                                <span className="text-xs text-[#E8E8D8]">{s.lowerSeedWins}</span>
                              </div>
                              {s.status === 'IN_PROGRESS' && (
                                <div className="mt-2 text-[8px] text-[#5599FF] text-center">IN PROGRESS - Best of {s.bestOf}</div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                          {playoffData.playoff.teams.filter(t => t.league === 'Western').slice(0, 4).map((t, i) => (
                            <div key={t.teamId} className="py-1">({i + 1}) {t.teamName}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Championship Series */}
                <div className="mt-8 bg-[#5A8352] border-[4px] border-[#FFD700] p-6">
                  <div className="text-xl text-[#FFD700] font-bold mb-4 text-center">
                    <Trophy className="w-6 h-6 inline mr-2" />
                    CHAMPIONSHIP SERIES
                  </div>
                  {playoffData.bracketByLeague.Championship ? (
                    <div className={`bg-[#4A6844] p-4 border-2 ${
                      playoffData.bracketByLeague.Championship.status === 'COMPLETED' ? 'border-[#FFD700]' :
                      playoffData.bracketByLeague.Championship.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                      'border-[#FFD700]/50'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm ${playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.higherSeed.teamId ? 'text-[#FFD700] font-bold' : 'text-[#E8E8D8]'}`}>
                          {playoffData.bracketByLeague.Championship.higherSeed.teamName}
                        </span>
                        <span className="text-lg text-[#E8E8D8]">{playoffData.bracketByLeague.Championship.higherSeedWins}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.lowerSeed.teamId ? 'text-[#FFD700] font-bold' : 'text-[#E8E8D8]'}`}>
                          {playoffData.bracketByLeague.Championship.lowerSeed.teamName}
                        </span>
                        <span className="text-lg text-[#E8E8D8]">{playoffData.bracketByLeague.Championship.lowerSeedWins}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700]/50">
                      <div className="text-sm text-[#E8E8D8] text-center">Eastern Champion vs Western Champion</div>
                    </div>
                  )}
                </div>

                {/* Start Playoffs Button */}
                {playoffData.playoff.status === 'NOT_STARTED' && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={async () => {
                        try {
                          await playoffData.startPlayoffs();
                        } catch (err) {
                          console.error('Failed to start playoffs:', err);
                        }
                      }}
                      className="bg-[#5599FF] border-[3px] border-[#3366FF] px-6 py-3 text-sm text-[#E8E8D8] hover:bg-[#3366FF] active:scale-95 transition-transform"
                    >
                      START PLAYOFFS
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {activeTab === "series" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">SERIES RESULTS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Complete playoff series breakdowns</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading series data...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : playoffData.series.length === 0 ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No series have started yet</div>
            ) : (
              <div className="space-y-6">
                {/* Group series by round */}
                {Array.from(playoffData.bracketByRound.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([round, roundSeries]) => (
                    <div key={round} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                      <div className="text-lg text-[#E8E8D8] font-bold mb-4 border-b-2 border-[#E8E8D8]/30 pb-2">
                        {playoffData.getRoundName(round)}
                      </div>

                      <div className="space-y-4">
                        {roundSeries.map((s) => (
                          <div key={s.id} className={`bg-[#4A6844] p-4 border-2 ${
                            s.status === 'COMPLETED' ? 'border-[#00DD00]' :
                            s.status === 'IN_PROGRESS' ? 'border-[#5599FF]' :
                            'border-[#E8E8D8]/30'
                          }`}>
                            {/* Series header */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="text-xs text-[#E8E8D8]/60">
                                {s.status === 'COMPLETED' ? (
                                  <span className="text-[#00DD00]">FINAL</span>
                                ) : s.status === 'IN_PROGRESS' ? (
                                  <span className="text-[#5599FF]">IN PROGRESS</span>
                                ) : (
                                  <span>PENDING</span>
                                )}
                                {' • Best of '}{s.bestOf}
                              </div>
                              <div className="text-xs text-[#E8E8D8]/60">
                                {s.higherSeedWins}-{s.lowerSeedWins}
                              </div>
                            </div>

                            {/* Matchup */}
                            <div className="flex justify-between items-center mb-2">
                              <div className={`text-sm ${s.winner === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                ({s.higherSeed.seed}) {s.higherSeed.teamName}
                              </div>
                              <div className="text-lg text-[#E8E8D8] font-bold">{s.higherSeedWins}</div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className={`text-sm ${s.winner === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]'}`}>
                                ({s.lowerSeed.seed}) {s.lowerSeed.teamName}
                              </div>
                              <div className="text-lg text-[#E8E8D8] font-bold">{s.lowerSeedWins}</div>
                            </div>

                            {/* Individual games */}
                            {s.games && s.games.filter(g => g.status === 'COMPLETED').length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#E8E8D8]/20">
                                <div className="text-[10px] text-[#E8E8D8]/60 mb-2">GAME RESULTS</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                  {s.games.filter(g => g.status === 'COMPLETED' && g.result).map((game) => (
                                    <div key={game.gameNumber} className="bg-[#5A8352] p-2 text-center">
                                      <div className="text-[10px] text-[#E8E8D8]/60 mb-1">Game {game.gameNumber}</div>
                                      <div className="text-xs">
                                        <span className={game.result!.winnerId === s.higherSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]/60'}>
                                          {game.result!.homeScore}
                                        </span>
                                        <span className="text-[#E8E8D8]/40 mx-1">-</span>
                                        <span className={game.result!.winnerId === s.lowerSeed.teamId ? 'text-[#00DD00] font-bold' : 'text-[#E8E8D8]/60'}>
                                          {game.result!.awayScore}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {playoffData.pendingSeries.length > 0 && (
                  <div className="text-center text-xs text-[#E8E8D8]/60 py-4">
                    {playoffData.pendingSeries.length} series pending • {playoffData.inProgressSeries.length} in progress
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "playoff-stats" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF STATISTICS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Team and player performance in the postseason</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading playoff stats...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : (
              <div className="space-y-6">
                {/* Team Stats - derived from series data */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TEAM PLAYOFF RECORDS</div>
                  <div className="bg-[#4A6844] p-4">
                    <table className="w-full text-xs text-[#E8E8D8]">
                      <thead className="border-b-2 border-[#E8E8D8]/30">
                        <tr>
                          <th className="text-left py-2">Team</th>
                          <th className="text-center py-2">Seed</th>
                          <th className="text-center py-2">League</th>
                          <th className="text-center py-2">Series W</th>
                          <th className="text-center py-2">Series L</th>
                          <th className="text-center py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playoffData.playoff.teams
                          .sort((a, b) => {
                            // Sort by league, then seed
                            if (a.league !== b.league) return a.league.localeCompare(b.league);
                            return a.seed - b.seed;
                          })
                          .map((team) => {
                            // Calculate series wins/losses for this team
                            const teamSeries = playoffData.series.filter(
                              s => s.higherSeed.teamId === team.teamId || s.lowerSeed.teamId === team.teamId
                            );
                            const seriesWins = teamSeries.filter(
                              s => s.status === 'COMPLETED' && s.winner === team.teamId
                            ).length;
                            const seriesLosses = teamSeries.filter(
                              s => s.status === 'COMPLETED' && s.winner && s.winner !== team.teamId
                            ).length;

                            return (
                              <tr key={team.teamId} className={`border-b border-[#E8E8D8]/10 ${team.eliminated ? 'opacity-50' : ''}`}>
                                <td className="py-2">{team.teamName}</td>
                                <td className="text-center">{team.seed}</td>
                                <td className="text-center">{team.league}</td>
                                <td className="text-center">{seriesWins}</td>
                                <td className="text-center">{seriesLosses}</td>
                                <td className="text-center">
                                  {team.eliminated ? (
                                    <span className="text-[#FF6B6B]">ELIMINATED</span>
                                  ) : playoffData.playoff?.champion === team.teamId ? (
                                    <span className="text-[#FFD700]">CHAMPION</span>
                                  ) : (
                                    <span className="text-[#00DD00]">ACTIVE</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Player Stats Placeholder */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">TOP PERFORMERS</div>
                  <div className="bg-[#4A6844] p-4">
                    <div className="text-xs text-[#E8E8D8]/60 text-center py-4">
                      Individual player stats will be tracked when games are played via GameTracker
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "playoff-leaders" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">PLAYOFF LEADERS</h2>
              <div className="text-sm text-[#E8E8D8]/70">Top individual performances</div>
            </div>

            {playoffData.isLoading ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Loading playoff leaders...</div>
            ) : !playoffData.playoff ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">No playoff data available</div>
            ) : playoffData.playoff.status === 'NOT_STARTED' ? (
              <div className="text-center text-[#E8E8D8]/60 py-8">Playoffs have not started yet</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Batting Leaders */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">BATTING LEADERS</div>
                  <div className="space-y-3">
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Home Runs</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Batting Average</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">RBIs</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                  </div>
                </div>

                {/* Pitching Leaders */}
                <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                  <div className="text-lg text-[#E8E8D8] font-bold mb-4">PITCHING LEADERS</div>
                  <div className="space-y-3">
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Wins</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">ERA</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                    <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                      <div className="text-xs text-[#E8E8D8]/60 mb-1">Strikeouts</div>
                      <div className="text-sm text-[#E8E8D8]/60">Track games via GameTracker to see leaders</div>
                    </div>
                  </div>
                </div>

                {/* Series MVP - if champion exists */}
                {playoffData.playoff.champion && playoffData.playoff.mvp && (
                  <div className="lg:col-span-2 bg-[#5A8352] border-[4px] border-[#FFD700] p-6">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                      <div className="text-lg text-[#FFD700] font-bold">PLAYOFF MVP</div>
                    </div>
                    <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700] text-center">
                      <div className="text-xl text-[#FFD700] font-bold mb-1">
                        {playoffData.playoff.mvp.playerName}
                      </div>
                      <div className="text-sm text-[#E8E8D8]/70">
                        {playoffData.playoff.mvp.stats}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === "advance" && seasonPhase === "playoffs" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl text-[#E8E8D8] font-bold mb-2">ADVANCE TO OFFSEASON</h2>
              <div className="text-sm text-[#E8E8D8]/70">Complete playoffs and begin offseason activities</div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Championship Summary */}
              {playoffData.playoff?.status === 'COMPLETED' && playoffData.playoff.champion ? (
                <div className="bg-[#5A8352] p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-[#FFD700]" />
                    <div className="text-xl text-[#E8E8D8] font-bold">SEASON {playoffData.playoff.seasonNumber} CHAMPION</div>
                  </div>
                  <div className="bg-[#4A6844] p-4 border-2 border-[#FFD700] text-center">
                    <div className="text-2xl text-[#FFD700] font-bold mb-2">
                      {playoffData.playoff.teams.find(t => t.teamId === playoffData.playoff?.champion)?.teamName || 'Champion'}
                    </div>
                    {playoffData.bracketByLeague.Championship && (
                      <div className="text-xs text-[#E8E8D8]/70">
                        Defeated {
                          playoffData.bracketByLeague.Championship.winner === playoffData.bracketByLeague.Championship.higherSeed.teamId
                            ? playoffData.bracketByLeague.Championship.lowerSeed.teamName
                            : playoffData.bracketByLeague.Championship.higherSeed.teamName
                        } {playoffData.bracketByLeague.Championship.higherSeedWins}-{playoffData.bracketByLeague.Championship.lowerSeedWins}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#5A8352] p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-[#E8E8D8]/40" />
                    <div className="text-xl text-[#E8E8D8]/60 font-bold">AWAITING CHAMPION</div>
                  </div>
                  <div className="bg-[#4A6844] p-4 border-2 border-[#E8E8D8]/30 text-center">
                    <div className="text-sm text-[#E8E8D8]/60">
                      Complete all playoff series to crown a champion
                    </div>
                  </div>
                </div>
              )}

              {/* Playoff Summary Stats */}
              <div className="bg-[#5A8352] border-[4px] border-[#4A6844] p-6">
                <div className="text-lg text-[#E8E8D8] font-bold mb-4">PLAYOFF SUMMARY</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Total Series</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.series.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Completed Series</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.completedSeries.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">In Progress</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.inProgressSeries.length}</div>
                  </div>
                  <div className="bg-[#4A6844] p-3 border-2 border-[#E8E8D8]/30">
                    <div className="text-xs text-[#E8E8D8]/60 mb-1">Pending</div>
                    <div className="text-2xl text-[#E8E8D8] font-bold">{playoffData.pendingSeries.length}</div>
                  </div>
                </div>
              </div>

              {/* Advance Button */}
              <button
                onClick={() => setSeasonPhase("offseason")}
                disabled={playoffData.playoff?.status !== 'COMPLETED'}
                className={`w-full border-[5px] p-8 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] group ${
                  playoffData.playoff?.status === 'COMPLETED'
                    ? 'bg-[#5A8352] border-[#C4A853] hover:bg-[#4F7D4B] active:scale-95'
                    : 'bg-[#4A6844] border-[#E8E8D8]/30 cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-center gap-4">
                  <ArrowRight className={`w-12 h-12 ${
                    playoffData.playoff?.status === 'COMPLETED'
                      ? 'text-[#E8E8D8] group-hover:text-[#5599FF] transition-colors'
                      : 'text-[#E8E8D8]/40'
                  }`} />
                  <div className="text-left">
                    <div className={`text-2xl font-bold mb-1 ${
                      playoffData.playoff?.status === 'COMPLETED' ? 'text-[#E8E8D8]' : 'text-[#E8E8D8]/60'
                    }`}>PROCEED TO OFFSEASON</div>
                    <div className={`text-sm ${
                      playoffData.playoff?.status === 'COMPLETED' ? 'text-[#E8E8D8]/80' : 'text-[#E8E8D8]/40'
                    }`}>Begin Awards, Free Agency, Draft, and more</div>
                  </div>
                </div>
              </button>

              {playoffData.playoff?.status !== 'COMPLETED' && (
                <div className="text-center text-xs text-[#FF9944] mt-4">
                  ⚠️ Complete all playoff series before advancing to offseason
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === "free-agency" && (
          <div>
            <div className="text-center py-12">
              <button
                onClick={() => setShowFreeAgency(true)}
                className="bg-[#5A8352] border-[5px] border-[#C4A853] px-12 py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                START FREE AGENCY
              </button>
            </div>
            
            {showFreeAgency && (
              <FreeAgencyFlow
                seasonId={`season-${currentSeason}`}
                seasonNumber={currentSeason}
                onClose={() => setShowFreeAgency(false)}
              />
            )}
          </div>
        )}
        
        {/* Ratings Adjustment Modal */}
        {showRatingsAdjustment && (
          <RatingsAdjustmentFlow
            seasonId={`season-${currentSeason}`}
            onClose={() => setShowRatingsAdjustment(false)}
          />
        )}
        
        {/* Retirements Modal */}
        {showRetirements && (
          <RetirementFlow
            seasonId={`season-${currentSeason}`}
            seasonNumber={currentSeason}
            onClose={() => setShowRetirements(false)}
            onRetirementsComplete={(newJerseys) => {
              setRetiredJerseys([...retiredJerseys, ...newJerseys]);
            }}
          />
        )}

        {/* Awards Ceremony Modal */}
        {showAwards && (
          <AwardsCeremonyFlow
            seasonId={`season-${currentSeason}`}
            seasonNumber={currentSeason}
            onClose={() => setShowAwards(false)}
          />
        )}

        {/* Contraction/Expansion Modal */}
        {showContraction && (
          <ContractionExpansionFlow onComplete={() => setShowContraction(false)} />
        )}

        {/* Draft Modal */}
        {showDraft && (
          <DraftFlow
            seasonId={`season-${currentSeason}`}
            onComplete={() => {
              setShowDraft(false);
              setActiveTab("todays-game");
            }}
            onCancel={() => setShowDraft(false)}
          />
        )}

        {activeTab === "draft" && (
          <button
            onClick={() => setShowDraft(true)}
            className="w-full bg-[#6B9462] border-[5px] border-[#C4A853] p-8 hover:bg-[#5A8352] transition-colors group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Trophy className="w-12 h-12 text-[#C4A853] group-hover:text-[#5599FF] transition-colors" />
                <div className="text-left">
                  <div className="text-3xl text-[#E8E8D8] font-bold">SEASON 27 DRAFT</div>
                  <div className="text-base text-[#E8E8D8]/70 mt-1">Draft 10 prospects to your farm system</div>
                </div>
              </div>
              <div className="bg-[#C4A853] text-black px-6 py-3 text-xl font-bold group-hover:bg-[#5599FF] transition-colors">
                START →
              </div>
            </div>
            <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-around text-center">
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 1</div>
                  <div className="text-base text-[#E8E8D8]">Choose Inactive Players</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#E8E8D8]/40" />
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 2</div>
                  <div className="text-base text-[#E8E8D8]">Draft Farm Prospects</div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#E8E8D8]/40" />
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8]/60 mb-1">STEP 3</div>
                  <div className="text-base text-[#E8E8D8]">Review & Confirm</div>
                </div>
              </div>
            </div>
          </button>
        )}
        {activeTab === "finalize" && (
          <div>
            <div className="text-center py-12">
              <button
                onClick={() => setShowFinalize(true)}
                className="bg-[#5A8352] border-[5px] border-[#C4A853] px-12 py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                START FINALIZE & ADVANCE
              </button>
            </div>
            
            {showFinalize && (
              <FinalizeAdvanceFlow
                onClose={() => setShowFinalize(false)}
                onAdvanceComplete={() => {
                  // Increment season number and persist to localStorage
                  const newSeason = currentSeason + 1;
                  setCurrentSeason(newSeason);
                  localStorage.setItem('kbl-current-season', String(newSeason));

                  // Reset to regular season
                  setSeasonPhase("regular");
                  setActiveTab("todays-game");
                }}
              />
            )}
          </div>
        )}
        {activeTab === "ratings-adj" && (
          <button
            onClick={() => setShowRatingsAdjustment(true)}
            className="w-full bg-[#6B9462] border-[5px] border-[#C4A853] p-8 hover:bg-[#5A8352] transition-colors group"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <BarChart3 className="w-16 h-16 text-[#E8E8D8] group-hover:text-[#DD0000] transition-colors" />
              <div className="text-left">
                <div className="text-2xl text-[#E8E8D8] font-bold mb-1">END-OF-SEASON RATINGS ADJUSTMENTS</div>
                <div className="text-sm text-[#E8E8D8]/80">Review player performance and adjust ratings for Season 4</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">📊</div>
                <div className="text-xs text-[#E8E8D8]/60">WAR-Based Adjustments</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">💰</div>
                <div className="text-xs text-[#E8E8D8]/60">Salary Updates</div>
              </div>
              <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
                <div className="text-3xl text-[#E8E8D8] mb-1">🏆</div>
                <div className="text-xs text-[#E8E8D8]/60">Manager Bonuses</div>
              </div>
            </div>
            <div className="mt-6 text-sm text-[#E8E8D8] flex items-center justify-center gap-2">
              <span>Click to begin</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}
        {activeTab === "awards" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  🏆
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">AWARDS CEREMONY</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 2</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Celebrate the season's best performers across 13 award categories. League leaders receive automatic rewards, while major awards use hybrid voting with user override capability.
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">13</div>
                  <div className="text-xs text-[#E8E8D8]/60">Award Screens</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">42+</div>
                  <div className="text-xs text-[#E8E8D8]/60">Total Awards</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🥇</div>
                  <div className="text-xs text-[#E8E8D8]/60">Gold Gloves</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">👑</div>
                  <div className="text-xs text-[#E8E8D8]/60">MVP Awards</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAwards(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              🏆 BEGIN AWARDS CEREMONY 🏆
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="flex items-start gap-2 text-sm text-[#E8E8D8]">
                <span className="text-lg">ℹ️</span>
                <div>
                  <div className="font-bold mb-1">Award Categories:</div>
                  <ul className="text-[#E8E8D8]/80 space-y-1 ml-4 list-disc">
                    <li>League Leaders (auto-calculated rewards)</li>
                    <li>Gold Glove (9 positions) + Platinum Glove</li>
                    <li>Silver Slugger (9 positions) + Booger Glove</li>
                    <li>Cy Young, MVP, Rookie of the Year (AL/NL)</li>
                    <li>Reliever of Year, Bench Player, Manager of Year</li>
                    <li>Special Awards: Kara Kawaguchi, Bust, Comeback</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "contraction" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  ⚠️
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">CONTRACTION/EXPANSION</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 4</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Teams with low fan morale face contraction risk. Roll dice to determine which teams survive. Protected players from contracted teams enter the expansion draft, while others face retirement checks. Create new expansion teams to fill the void.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🎲</div>
                  <div className="text-xs text-[#E8E8D8]/60">Risk Roll</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">4</div>
                  <div className="text-xs text-[#E8E8D8]/60">Protected</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🏛️</div>
                  <div className="text-xs text-[#E8E8D8]/60">Legacy</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowContraction(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              ⚠️ BEGIN CONTRACTION/EXPANSION PHASE ⚠️
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="text-xs text-[#E8E8D8]/90 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span className="font-bold">Phase 4 Details</span>
              </div>
              <div className="text-xs text-[#E8E8D8]/70 space-y-1">
                <div className="mb-2">Complete 12-screen flow:</div>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Risk Assessment: See all teams at contraction risk</li>
                  <li>Contraction Rolls: Dice determine team survival</li>
                  <li>Voluntary Sales: Option to sell additional teams</li>
                  <li>Protection Selection: Choose 4 players to protect</li>
                  <li>Legacy Cornerstone: Honor franchise cornerstones</li>
                  <li>Expansion Draft: Teams select from contraction pool</li>
                  <li>Player Disposal: Retirement checks (+30% probability)</li>
                  <li>Museum Entries: Defunct teams preserved in history</li>
                  <li>Expansion Creation: Build new franchises (optional)</li>
                  <li>Phase Summary: Complete contraction/expansion report</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        {activeTab === "retirements" && (
          <div className="p-8 space-y-6">
            <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center text-3xl">
                  🎩
                </div>
                <div>
                  <div className="text-2xl text-[#E8E8D8]">RETIREMENTS</div>
                  <div className="text-sm text-[#E8E8D8]/80">Offseason Phase 5</div>
                </div>
              </div>
              <div className="text-sm text-[#E8E8D8]/80 mb-4">
                Players retire based on age-weighted dice rolls. The goal is 1-2 retirements per team per season. Celebrate retiring players and optionally retire their jersey numbers.
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">8</div>
                  <div className="text-xs text-[#E8E8D8]/60">Teams</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">1-2</div>
                  <div className="text-xs text-[#E8E8D8]/60">Per Team</div>
                </div>
                <div className="bg-[#4A6844] border-[3px] border-[#5A8352] p-3 text-center">
                  <div className="text-2xl text-[#E8E8D8]">🎲</div>
                  <div className="text-xs text-[#E8E8D8]/60">Dice Roll</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRetirements(true)}
              className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-6 text-xl text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              🎩 BEGIN RETIREMENT PHASE 🎩
            </button>

            <div className="bg-[#4169E1]/20 border-l-4 border-[#4169E1] p-4">
              <div className="flex items-start gap-2 text-sm text-[#E8E8D8]">
                <span className="text-lg">ℹ️</span>
                <div>
                  <div className="font-bold mb-1">How it works:</div>
                  <ul className="text-[#E8E8D8]/80 space-y-1 ml-4 list-disc">
                    <li>Review retirement probabilities for each team (based on player age)</li>
                    <li>Roll dice to see if anyone retires</li>
                    <li>Celebrate retiring players with career highlights</li>
                    <li>Optionally retire jersey numbers</li>
                    <li>Each team may have 0-2 retirements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "advance" && (
          <div className="text-center py-12 text-[#E8E8D8]/60 text-xs">ADVANCE COMING SOON</div>
        )}
      </div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={addGameModalOpen}
        onClose={() => setAddGameModalOpen(false)}
        onAddGame={handleAddGame}
        onAddSeries={handleAddSeries}
        nextGameNumber={getNextGameNumber()}
        nextDayNumber={getNextDayNumber()}
        nextDate={getNextDate()}
        teams={availableTeams}
      />
    </div>
    </FranchiseDataContext.Provider>
  );
}

function StandingsContent() {
  const [selectedLeague, setSelectedLeague] = useState<"Eastern" | "Western">("Eastern");

  // Get standings from context (real data or mock fallback)
  const franchiseData = useFranchiseDataContext();
  const standings = franchiseData.standings;

  const currentLeagueStandings = standings[selectedLeague];

  return (
    <div className="space-y-4">
      {/* League Toggle */}
      <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLeague("Eastern")}
            className={`flex-1 py-2 px-4 text-[10px] transition ${
              selectedLeague === "Eastern"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            EASTERN LEAGUE
          </button>
          <button
            onClick={() => setSelectedLeague("Western")}
            className={`flex-1 py-2 px-4 text-[10px] transition ${
              selectedLeague === "Western"
                ? "bg-[#4A6844] text-[#E8E8D8]"
                : "bg-[#5A8352] text-[#E8E8D8]/60 hover:bg-[#4F7D4B]"
            }`}
          >
            WESTERN LEAGUE
          </button>
        </div>
      </div>

      {/* Divisions */}
      {Object.entries(currentLeagueStandings).map(([division, teams]) => (
        <div key={division} className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4">
          <div 
            className="text-[12px] text-[#E8E8D8] mb-3 pb-2 border-b-2 border-[#4A6844]"
            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
          >
            {division.toUpperCase()} DIVISION
          </div>
          
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 mb-2 px-2 pb-1 border-b border-[#4A6844]">
            <div className="text-[8px] text-[#E8E8D8]/70">TEAM</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">W</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">L</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">GB</div>
            <div className="text-[8px] text-[#E8E8D8]/70 text-center">RD</div>
          </div>

          {/* Team Rows */}
          {teams.map((teamData, index) => (
            <div 
              key={teamData.team}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-2 py-1.5 ${
                index % 2 === 0 ? 'bg-[#5A8352]/30' : ''
              }`}
            >
              <div className="text-[10px] text-[#E8E8D8]">{teamData.team}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.wins}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.losses}</div>
              <div className="text-[10px] text-[#E8E8D8] text-center">{teamData.gamesBack}</div>
              <div className={`text-[10px] text-center ${
                teamData.runDiff.startsWith('+') ? 'text-[#E8E8D8]' : 'text-[#E8E8D8]/80'
              }`}>
                {teamData.runDiff}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GameDayContent() {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [showHeadToHead, setShowHeadToHead] = useState(false);
  const [showBeatWriters, setShowBeatWriters] = useState(false);
  const [showAwayTeamStats, setShowAwayTeamStats] = useState(false);
  const [showHomeTeamStats, setShowHomeTeamStats] = useState(false);

  // Team IDs for the matchup
  const awayTeamId = 'tigers'; // Away team
  const homeTeamId = 'sox';    // Home team

  // Mock head-to-head data
  const headToHeadGames = [
    { date: "6/15", result: "W", score: "7-4", location: "HOME" },
    { date: "5/22", result: "L", score: "2-5", location: "AWAY" },
    { date: "4/18", result: "W", score: "9-3", location: "HOME" },
    { date: "3/29", result: "W", score: "6-2", location: "AWAY" },
    { date: "3/12", result: "L", score: "1-8", location: "AWAY" },
  ];

  // Mock beat writer stories
  const beatWriterStories = [
    {
      author: "@TigersBeatJim",
      time: "2h ago",
      content: "Tigers' ace pitcher Rodriguez has been dominant in his last 3 starts with a 1.20 ERA. Looking to continue that streak tonight against the Sox.",
      verified: true,
    },
    {
      author: "@SoxInsider",
      time: "4h ago",
      content: "Sox manager confirms lineup changes for tonight's matchup. Johnson moves to cleanup spot, Martinez gets the start at DH.",
      verified: true,
    },
    {
      author: "@BaseballBuzz",
      time: "6h ago",
      content: "This Tigers-Sox rivalry has been heating up all season. Tonight's game could have major playoff implications with both teams in the hunt.",
      verified: false,
    },
    {
      author: "@TigersNation",
      time: "8h ago",
      content: "Breaking: Tigers activate slugger Thompson from IL. Expected to be in tonight's starting lineup. Huge boost for the offense!",
      verified: true,
    },
  ];

  const handlePlayGame = () => {
    navigate("/game-tracker/game-123");
    setConfirmAction(null);
  };

  const handleSimulate = () => {
    // Simulate game logic here
    console.log("Game simulated");
    setConfirmAction(null);
  };

  const handleSkip = () => {
    // Skip game logic here
    console.log("Game skipped");
    setConfirmAction(null);
  };

  return (
    <div className="space-y-4">
      {/* Next game card */}
      <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 relative">
        <div className="text-[8px] text-[#E8E8D8] mb-3">▶ NEXT GAME • 7/12</div>
        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          <div className="text-center">
            <div className="text-lg text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>TIGERS</div>
            <div className="text-[8px] text-[#E8E8D8]">42-28</div>
          </div>

          <div className="text-center">
            <div className="text-2xl text-[#E8E8D8]">vs</div>
            <div className="text-[7px] text-[#E8E8D8]/70 italic mt-1">{getStadiumForTeam("SOX")}</div>
          </div>

          <div className="text-center">
            <div className="text-lg text-[#E8E8D8]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>SOX</div>
            <div className="text-[8px] text-[#E8E8D8]">38-32</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-center">
            <button
              onClick={() => setConfirmAction("play")}
              className="max-w-[200px] bg-[#5A8352] border-[5px] border-[#4A6844] py-3 px-8 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              PLAY GAME
            </button>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setConfirmAction("watch")}
              className="max-w-[150px] bg-[#4A6844] border-[5px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              SCORE GAME
            </button>
            <button
              onClick={() => setConfirmAction("simulate")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
            >
              SIMULATE
            </button>
            <button
              onClick={() => setConfirmAction("skip")}
              className="bg-[#4A6844] border-[5px] border-[#5A8352] py-2 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] whitespace-nowrap"
            >
              SKIP
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 right-2 text-[8px] text-[#E8E8D8]">GAME 71/162</div>
      </div>

      {/* Beat writers button */}
      <div>
        <button
          onClick={() => setShowBeatWriters(!showBeatWriters)}
          className="bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
        >
          <span>BEAT WRITERS</span>
          {showBeatWriters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Beat writers expandable section */}
      {showBeatWriters && (
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-[8px] text-[#E8E8D8] mb-3">▶ LATEST FROM BEAT WRITERS</div>
          <div className="space-y-2">
            {beatWriterStories.map((story, index) => (
              <div 
                key={index}
                className="bg-[#4A6844] border-[4px] border-[#5A8352] p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] ${story.verified ? "text-[#E8E8D8]" : "text-[#E8E8D8]/80"}`}>
                      {story.author}
                    </span>
                    {story.verified && (
                      <div className="w-3 h-3 bg-[#5A8352] rounded-full flex items-center justify-center">
                        <span className="text-[#E8E8D8] text-[6px]">✓</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-[#E8E8D8]/60">{story.time}</span>
                </div>
                <div className="text-[8px] text-[#E8E8D8] leading-relaxed">
                  {story.content}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[8px] text-[#E8E8D8] text-center">
            FOLLOW BEAT WRITERS ON X FOR REAL-TIME UPDATES
          </div>
        </div>
      )}

      {/* Head-to-head button */}
      <div>
        <button
          onClick={() => setShowHeadToHead(!showHeadToHead)}
          className="bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-2"
        >
          <span>HEAD-TO-HEAD HISTORY</span>
          {showHeadToHead ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Head-to-head expandable section */}
      {showHeadToHead && (
        <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4">
          <div className="text-[8px] text-[#E8E8D8] mb-3">▶ RECENT MATCHUPS (TIGERS vs SOX)</div>
          <div className="bg-[#4A6844] border-[4px] border-[#5A8352]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#5A8352]">
                  <th className="text-[8px] text-[#E8E8D8] px-3 py-2 text-left border-r-2 border-[#6B9462]">DATE</th>
                  <th className="text-[8px] text-[#E8E8D8] px-3 py-2 text-center border-r-2 border-[#6B9462]">RESULT</th>
                  <th className="text-[8px] text-[#E8E8D8] px-3 py-2 text-center border-r-2 border-[#6B9462]">SCORE</th>
                  <th className="text-[8px] text-[#E8E8D8] px-3 py-2 text-center">LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {headToHeadGames.map((game, index) => (
                  <tr 
                    key={index} 
                    className={`${index % 2 === 0 ? "bg-[#4A6844]" : "bg-[#3F5A3A]"} border-t-2 border-[#5A8352]`}
                  >
                    <td className="text-[8px] text-[#E8E8D8] px-3 py-2 border-r-2 border-[#5A8352]">{game.date}</td>
                    <td className={`text-[8px] px-3 py-2 text-center border-r-2 border-[#5A8352] ${
                      game.result === "W" ? "text-[#E8E8D8]" : "text-[#E8E8D8]/60"
                    }`}>
                      {game.result === "W" ? "WIN" : "LOSS"}
                    </td>
                    <td className="text-[8px] text-[#E8E8D8] px-3 py-2 text-center border-r-2 border-[#5A8352]">{game.score}</td>
                    <td className="text-[8px] text-[#E8E8D8] px-3 py-2 text-center">{game.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[8px] text-[#E8E8D8] flex justify-between">
            <span>SEASON RECORD: 3-2</span>
            <span>TIGERS LEAD SERIES</span>
          </div>
        </div>
      )}

      {/* Team status */}
      <div className="grid grid-cols-2 gap-4">
        {/* Away Team Stats */}
        <div>
          <button
            onClick={() => setShowAwayTeamStats(!showAwayTeamStats)}
            className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
          >
            <div className="flex-1 text-center">
              <div className="text-[10px] tracking-wide uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}>
                {awayTeamId}
              </div>
              <div className="text-[7px] text-[#E8E8D8]/80 mt-1">42-28 • 1ST IN DIVISION</div>
            </div>
            {showAwayTeamStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showAwayTeamStats && (
            <div className="bg-[#6B9462] border-4 border-[#4A6844] border-t-0 p-4 overflow-y-auto max-h-[600px]">
          
          {/* Team Leaders */}
          <div className="space-y-3 text-[7px]">
            {/* bWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>bWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>5.2</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>4.8</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.1</span></div>
              </div>
            </div>

            {/* pWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>pWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>3.9</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>3.2</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>2.7</span></div>
              </div>
            </div>

            {/* fWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>fWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>5.4</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>4.9</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.2</span></div>
              </div>
            </div>

            {/* rWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>rWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>5.1</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>4.7</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.0</span></div>
              </div>
            </div>

            {/* AVG Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>BATTING AVG:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.324</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.312</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.298</span></div>
              </div>
            </div>

            {/* HR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>HOME RUNS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>24</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>18</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>15</span></div>
              </div>
            </div>

            {/* RBI Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>RBI:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>67</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>58</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>52</span></div>
              </div>
            </div>

            {/* OPS Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>OPS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.942</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.918</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.887</span></div>
              </div>
            </div>

            {/* ERA Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>ERA:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>2.45</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>2.89</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>3.12</span></div>
              </div>
            </div>

            {/* WHIP Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>WHIP:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>1.08</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>1.15</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>1.22</span></div>
              </div>
            </div>

            {/* Strikeouts Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>STRIKEOUTS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>142</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>128</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>115</span></div>
              </div>
            </div>

            {/* Stolen Bases Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>STOLEN BASES:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>32</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>24</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>18</span></div>
              </div>
            </div>

            {/* Fielding % Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>FIELDING %:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.995</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.992</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.988</span></div>
              </div>
            </div>
          </div>
            </div>
          )}
        </div>

        {/* Home Team Stats */}
        <div>
          <button
            onClick={() => setShowHomeTeamStats(!showHomeTeamStats)}
            className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-6 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
          >
            <div className="flex-1 text-center">
              <div className="text-[10px] tracking-wide uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}>
                {homeTeamId}
              </div>
              <div className="text-[7px] text-[#E8E8D8]/80 mt-1">38-32 • 2ND IN DIVISION</div>
            </div>
            {showHomeTeamStats ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showHomeTeamStats && (
            <div className="bg-[#6B9462] border-4 border-[#4A6844] border-t-0 p-4 overflow-y-auto max-h-[600px]">
          
          {/* Team Leaders */}
          <div className="space-y-3 text-[7px]">
            {/* bWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>bWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>6.1</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>5.4</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.3</span></div>
              </div>
            </div>

            {/* pWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>pWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>4.2</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>3.8</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>3.1</span></div>
              </div>
            </div>

            {/* fWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>fWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>6.3</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>5.6</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.5</span></div>
              </div>
            </div>

            {/* rWAR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>rWAR:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>6.0</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>5.2</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>4.4</span></div>
              </div>
            </div>

            {/* AVG Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>BATTING AVG:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.318</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.305</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.294</span></div>
              </div>
            </div>

            {/* HR Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>HOME RUNS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>28</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>21</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>19</span></div>
              </div>
            </div>

            {/* RBI Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>RBI:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>72</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>61</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>55</span></div>
              </div>
            </div>

            {/* OPS Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>OPS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.965</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.932</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.901</span></div>
              </div>
            </div>

            {/* ERA Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>ERA:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>2.67</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>2.98</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>3.24</span></div>
              </div>
            </div>

            {/* WHIP Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>WHIP:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>1.12</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>1.18</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>1.26</span></div>
              </div>
            </div>

            {/* Strikeouts Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>STRIKEOUTS:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>156</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>134</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>121</span></div>
              </div>
            </div>

            {/* Stolen Bases Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>STOLEN BASES:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>28</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>22</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>16</span></div>
              </div>
            </div>

            {/* Fielding % Leaders */}
            <div>
              <div className="text-[#E8E8D8]/80 mb-1 uppercase" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>FIELDING %:</div>
              <div className="space-y-0.5 text-[#E8E8D8]/90">
                <div className="flex justify-between"><span>1. PLAYER NAME</span><span>.993</span></div>
                <div className="flex justify-between"><span>2. PLAYER NAME</span><span>.990</span></div>
                <div className="flex justify-between"><span>3. PLAYER NAME</span><span>.986</span></div>
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-6 max-w-md">
            <div className="text-lg text-[#E8E8D8] mb-4 text-center">ARE YOU SURE?</div>
            <div className="text-sm text-[#E8E8D8] mb-6 text-center">
              {confirmAction === "play" && "Start playing this game?"}
              {confirmAction === "watch" && "Watch this game?"}
              {confirmAction === "simulate" && "Simulate this game?"}
              {confirmAction === "skip" && "Skip this game?"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-3 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                CANCEL
              </button>
              <button
                onClick={confirmAction === "play" ? handlePlayGame : confirmAction === "simulate" ? handleSimulate : handleSkip}
                className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function LeagueLeadersContent() {
  const [expandedSection, setExpandedSection] = useState<string | null>("leaders");
  const [expandedBattingStat, setExpandedBattingStat] = useState<string | null>(null);
  const [expandedPitchingStat, setExpandedPitchingStat] = useState<string | null>(null);
  const [expandedLeague, setExpandedLeague] = useState<string | null>("al");

  // Get leaders from context (real data or mock fallback)
  const franchiseData = useFranchiseDataContext();

  // Use real batting/pitching leaders for AL (franchise data)
  // NL still uses mock data below until multi-franchise support
  const battingLeadersDataAL = franchiseData.battingLeaders;
  const pitchingLeadersDataAL = franchiseData.pitchingLeaders;

  // Mock league leaders data - NL (kept for dual-league display)
  const battingLeadersDataNL = {
    AVG: [
      { player: "D. Wilson", team: "Beewolves", value: ".338" },
      { player: "R. Williams", team: "Nemesis", value: ".325" },
      { player: "J. Martinez", team: "Moonstars", value: ".319" },
      { player: "D. Lee", team: "Beewolves", value: ".305" },
      { player: "S. Kim", team: "Moonstars", value: ".298" },
    ],
    HR: [
      { player: "R. Williams", team: "Nemesis", value: "44" },
      { player: "J. Martinez", team: "Moonstars", value: "39" },
      { player: "D. Wilson", team: "Beewolves", value: "33" },
      { player: "S. Kim", team: "Moonstars", value: "30" },
      { player: "D. Lee", team: "Beewolves", value: "28" },
    ],
    RBI: [
      { player: "R. Williams", team: "Nemesis", value: "125" },
      { player: "J. Martinez", team: "Moonstars", value: "115" },
      { player: "D. Wilson", team: "Beewolves", value: "102" },
      { player: "S. Kim", team: "Moonstars", value: "95" },
      { player: "D. Lee", team: "Beewolves", value: "88" },
    ],
    SB: [
      { player: "D. Wilson", team: "Beewolves", value: "62" },
      { player: "R. Williams", team: "Nemesis", value: "41" },
      { player: "J. Martinez", team: "Moonstars", value: "35" },
      { player: "D. Lee", team: "Beewolves", value: "29" },
      { player: "S. Kim", team: "Moonstars", value: "22" },
    ],
    OPS: [
      { player: "D. Wilson", team: "Beewolves", value: "1.065" },
      { player: "R. Williams", team: "Nemesis", value: "1.028" },
      { player: "J. Martinez", team: "Moonstars", value: ".995" },
      { player: "S. Kim", team: "Moonstars", value: ".945" },
      { player: "D. Lee", team: "Beewolves", value: ".918" },
    ],
    WAR: [
      { player: "D. Wilson", team: "Beewolves", value: "5.2" },
      { player: "R. Williams", team: "Nemesis", value: "4.8" },
      { player: "J. Martinez", team: "Moonstars", value: "4.1" },
      { player: "S. Kim", team: "Moonstars", value: "3.5" },
      { player: "D. Lee", team: "Beewolves", value: "3.2" },
    ],
  };

  const pitchingLeadersDataNL = {
    ERA: [
      { player: "A. Chen", team: "Nemesis", value: "2.14" },
      { player: "R. Garcia", team: "Moonstars", value: "2.45" },
      { player: "D. Lee", team: "Beewolves", value: "2.78" },
      { player: "J. Martinez", team: "Nemesis", value: "2.95" },
      { player: "S. Kim", team: "Moonstars", value: "3.08" },
    ],
    W: [
      { player: "R. Garcia", team: "Moonstars", value: "21" },
      { player: "A. Chen", team: "Nemesis", value: "20" },
      { player: "D. Lee", team: "Beewolves", value: "17" },
      { player: "J. Martinez", team: "Nemesis", value: "16" },
      { player: "S. Kim", team: "Moonstars", value: "15" },
    ],
    K: [
      { player: "A. Chen", team: "Nemesis", value: "243" },
      { player: "R. Garcia", team: "Moonstars", value: "234" },
      { player: "D. Lee", team: "Beewolves", value: "205" },
      { player: "J. Martinez", team: "Nemesis", value: "189" },
      { player: "S. Kim", team: "Moonstars", value: "172" },
    ],
    WHIP: [
      { player: "A. Chen", team: "Nemesis", value: "0.94" },
      { player: "R. Garcia", team: "Moonstars", value: "1.01" },
      { player: "D. Lee", team: "Beewolves", value: "1.09" },
      { player: "J. Martinez", team: "Nemesis", value: "1.16" },
      { player: "S. Kim", team: "Moonstars", value: "1.20" },
    ],
    SV: [
      { player: "K. Lee", team: "Beewolves", value: "42" },
      { player: "J. Parker", team: "Nemesis", value: "36" },
      { player: "R. Garcia", team: "Moonstars", value: "29" },
      { player: "D. Martinez", team: "Beewolves", value: "25" },
      { player: "A. Brown", team: "Nemesis", value: "21" },
    ],
    WAR: [
      { player: "A. Chen", team: "Nemesis", value: "4.5" },
      { player: "R. Garcia", team: "Moonstars", value: "3.8" },
      { player: "D. Lee", team: "Beewolves", value: "3.2" },
      { player: "J. Martinez", team: "Nemesis", value: "2.9" },
      { player: "S. Kim", team: "Moonstars", value: "2.5" },
    ],
  };

  const battingLeadersAL = [
    { stat: "AVG", value: ".342" },
    { stat: "HR", value: "47" },
    { stat: "RBI", value: "128" },
    { stat: "SB", value: "48" },
    { stat: "OPS", value: "1.087" },
    { stat: "WAR", value: "5.8" },
  ];

  const battingLeadersNL = [
    { stat: "AVG", value: ".338" },
    { stat: "HR", value: "44" },
    { stat: "RBI", value: "125" },
    { stat: "SB", value: "62" },
    { stat: "OPS", value: "1.065" },
    { stat: "WAR", value: "5.2" },
  ];

  const pitchingLeadersAL = [
    { stat: "ERA", value: "2.38" },
    { stat: "W", value: "19" },
    { stat: "K", value: "287" },
    { stat: "WHIP", value: "1.02" },
    { stat: "SV", value: "45" },
    { stat: "WAR", value: "4.9" },
  ];

  const pitchingLeadersNL = [
    { stat: "ERA", value: "2.14" },
    { stat: "W", value: "21" },
    { stat: "K", value: "243" },
    { stat: "WHIP", value: "0.94" },
    { stat: "SV", value: "42" },
    { stat: "WAR", value: "4.5" },
  ];

  // Mock award race leaders - AL
  const goldGloveLeadersAL = [
    { position: "C", player: "M. Santos", team: "Sox", tier: "PLATINUM", fWAR: "6.8" },
    { position: "1B", player: "K. Johnson", team: "Tigers", tier: "GOLD", fWAR: "5.2" },
    { position: "2B", player: "T. Davis", team: "Sox", tier: "GOLD", fWAR: "4.9" },
    { position: "3B", player: "K. Martinez", team: "Sox", tier: "GOLD", fWAR: "5.7" },
    { position: "SS", player: "J. Rodriguez", team: "Tigers", tier: "GOLD", fWAR: "6.3" },
    { position: "LF", player: "A. Brown", team: "Crocs", tier: "GOLD", fWAR: "4.1" },
    { position: "CF", player: "T. Anderson", team: "Sox", tier: "GOLD", fWAR: "5.9" },
    { position: "RF", player: "M. Thompson", team: "Crocs", tier: "GOLD", fWAR: "5.4" },
    { position: "P", player: "J. Williams", team: "Tigers", tier: "GOLD", fWAR: "4.7" },
    { position: "UTIL", player: "C. Rivera", team: "Crocs", tier: "GOLD", fWAR: "3.8" },
  ];

  const boogerGloveLeaderAL = { position: "2B", player: "T. Clumsy", team: "Sox", tier: "BOOGER", fWAR: "-1.2" };

  // Mock award race leaders - NL
  const goldGloveLeadersNL = [
    { position: "C", player: "D. Lee", team: "Beewolves", tier: "GOLD", fWAR: "5.8" },
    { position: "1B", player: "R. Williams", team: "Nemesis", tier: "PLATINUM", fWAR: "6.5" },
    { position: "2B", player: "J. Martinez", team: "Moonstars", tier: "GOLD", fWAR: "5.1" },
    { position: "3B", player: "D. Wilson", team: "Beewolves", tier: "GOLD", fWAR: "5.5" },
    { position: "SS", player: "A. Chen", team: "Nemesis", tier: "GOLD", fWAR: "6.1" },
    { position: "LF", player: "S. Kim", team: "Moonstars", tier: "GOLD", fWAR: "4.3" },
    { position: "CF", player: "R. Garcia", team: "Moonstars", tier: "GOLD", fWAR: "5.7" },
    { position: "RF", player: "J. Parker", team: "Nemesis", tier: "GOLD", fWAR: "5.2" },
    { position: "P", player: "A. Chen", team: "Nemesis", tier: "GOLD", fWAR: "4.9" },
    { position: "UTIL", player: "K. Lee", team: "Beewolves", tier: "GOLD", fWAR: "3.9" },
  ];

  const boogerGloveLeaderNL = { position: "LF", player: "B. Butterfingers", team: "Moonstars", tier: "BOOGER", fWAR: "-1.5" };

  const silverSluggerLeadersAL = [
    { position: "C", player: "M. Santos", team: "Sox" },
    { position: "1B", player: "M. Thompson", team: "Crocs" },
    { position: "2B", player: "K. Martinez", team: "Sox" },
    { position: "3B", player: "J. Rodriguez", team: "Tigers" },
    { position: "SS", player: "T. Anderson", team: "Sox" },
    { position: "OF", player: "C. Rivera", team: "Crocs" },
    { position: "OF", player: "A. Brown", team: "Crocs" },
    { position: "OF", player: "K. Johnson", team: "Tigers" },
    { position: "DH", player: "R. Smith", team: "Tigers" },
  ];

  const silverSluggerLeadersNL = [
    { position: "C", player: "D. Lee", team: "Beewolves" },
    { position: "1B", player: "R. Williams", team: "Nemesis" },
    { position: "2B", player: "J. Martinez", team: "Moonstars" },
    { position: "3B", player: "D. Wilson", team: "Beewolves" },
    { position: "SS", player: "A. Chen", team: "Nemesis" },
    { position: "OF", player: "S. Kim", team: "Moonstars" },
    { position: "OF", player: "R. Garcia", team: "Moonstars" },
    { position: "OF", player: "J. Parker", team: "Nemesis" },
    { position: "DH", player: "K. Lee", team: "Beewolves" },
  ];

  const majorAwardsLeadersAL = [
    { award: "RELIEVER OF THE YEAR", player: "C. Rivera", team: "Crocs", stats: "45 SV, 1.87 ERA" },
    { award: "BENCH PLAYER OF THE YEAR", player: "K. Martinez", team: "Sox", stats: ".312 AVG, 18 HR" },
    { award: "ROOKIE OF THE YEAR", player: "T. Davis", team: "Sox", stats: ".289 AVG, 25 HR, 89 RBI" },
    { award: "CY YOUNG", player: "T. Anderson", team: "Sox", stats: "19-4, 2.38 ERA, 287 K" },
    { award: "MVP", player: "J. Rodriguez", team: "Tigers", stats: ".342 AVG, 41 HR, 118 RBI" },
  ];

  const majorAwardsLeadersNL = [
    { award: "RELIEVER OF THE YEAR", player: "K. Lee", team: "Beewolves", stats: "42 SV, 1.95 ERA" },
    { award: "BENCH PLAYER OF THE YEAR", player: "J. Parker", team: "Nemesis", stats: ".305 AVG, 16 HR" },
    { award: "ROOKIE OF THE YEAR", player: "E. Jackson", team: "Beewolves", stats: ".289 AVG, 25 HR, 89 RBI" },
    { award: "CY YOUNG", player: "A. Chen", team: "Nemesis", stats: "20-4, 2.14 ERA, 243 K" },
    { award: "MVP", player: "D. Wilson", team: "Beewolves", stats: ".338 AVG, 33 HR, 102 RBI" },
  ];

  const leagueWideAwardsLeaders = [
    { award: "MANAGER OF THE YEAR (AL)", player: "Coach Martinez", team: "Tigers", stats: "102-60 Record" },
    { award: "MANAGER OF THE YEAR (NL)", player: "Coach Williams", team: "Nemesis", stats: "98-64 Record" },
    { award: "KARA KAWAGUCHI AWARD", player: "D. Tanaka", team: "Moonstars", stats: "Community Excellence" },
    { award: "BUST OF THE YEAR (AL)", player: "B. Foster", team: "Sox", stats: ".198 AVG, -2.1 WAR" },
    { award: "BUST OF THE YEAR (NL)", player: "R. Flop", team: "Beewolves", stats: ".185 AVG, -2.5 WAR" },
    { award: "COMEBACK PLAYER (AL)", player: "V. Ortiz", team: "Crocs", stats: "Returned from injury, .301 AVG" },
    { award: "COMEBACK PLAYER (NL)", player: "M. Phoenix", team: "Moonstars", stats: "Returned from injury, .295 AVG" },
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "PLATINUM": return "#E5E4E2";
      case "GOLD": return "#FFD700";
      case "BOOGER": return "#9ACD32";
      default: return "#FFD700";
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      {/* Season 1 Leaders Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}>
          SEASON 1 AWARDS RACE
        </div>
        <div className="text-[8px] text-[#E8E8D8]/70">CURRENT LEADERS & VOTING TRACKER</div>
      </div>

      {/* League Leaders Section */}
      <div>
        <button
          onClick={() => toggleSection("leaders")}
          className="w-full bg-[#6B9462] border-[5px] border-[#4A6844] py-3 px-4 text-[10px] text-[#E8E8D8] hover:bg-[#5A8352] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ LEAGUE LEADERS</span>
          {expandedSection === "leaders" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "leaders" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">AMERICAN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">NATIONAL LEAGUE</div>
              </button>
            </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Batting Leaders */}
          <div>
            <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] text-center">BATTING LEADERS</div>
            </div>
            <div className="space-y-1">
              {(expandedLeague === "al" ? battingLeadersAL : battingLeadersNL).map((leader, index) => {
                const battingData = expandedLeague === "al" ? battingLeadersDataAL : battingLeadersDataNL;
                return (
                  <div key={index}>
                    <button
                      onClick={() => setExpandedBattingStat(expandedBattingStat === leader.stat ? null : leader.stat)}
                      className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] p-2 hover:bg-[#4F7D4B] transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-[8px] text-[#E8E8D8] font-bold">{leader.stat}</div>
                          {expandedBattingStat === leader.stat ? (
                            <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold">{leader.value}</div>
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]/70 text-left">
                        {battingData[leader.stat as keyof typeof battingData]?.[0]?.player ?? 'N/A'} (
                        {battingData[leader.stat as keyof typeof battingData]?.[0]?.team ?? 'N/A'})
                      </div>
                    </button>
                    
                    {expandedBattingStat === leader.stat && (
                      <div className="bg-[#4A6844] border-[3px] border-[#5A8352] border-t-0 p-2">
                        <div className="text-[7px] text-[#E8E8D8] font-bold mb-1">TOP 5</div>
                        {(battingData[leader.stat as keyof typeof battingData] ?? []).map((player, pIndex) => (
                          <div 
                            key={pIndex} 
                            className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-b-0"
                          >
                            <div className="text-[8px] text-[#E8E8D8]">
                              {pIndex + 1}. {player.player} ({player.team})
                            </div>
                            <div className="text-[8px] text-[#E8E8D8] font-bold">{player.value}</div>
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
            <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] text-center">PITCHING LEADERS</div>
            </div>
            <div className="space-y-1">
              {(expandedLeague === "al" ? pitchingLeadersAL : pitchingLeadersNL).map((leader, index) => {
                const pitchingData = expandedLeague === "al" ? pitchingLeadersDataAL : pitchingLeadersDataNL;
                return (
                  <div key={index}>
                    <button
                      onClick={() => setExpandedPitchingStat(expandedPitchingStat === leader.stat ? null : leader.stat)}
                      className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] p-2 hover:bg-[#4F7D4B] transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="text-[8px] text-[#E8E8D8] font-bold">{leader.stat}</div>
                          {expandedPitchingStat === leader.stat ? (
                            <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-[#E8E8D8]" />
                          )}
                        </div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold">{leader.value}</div>
                      </div>
                      <div className="text-[8px] text-[#E8E8D8]/70 text-left">
                        {pitchingData[leader.stat as keyof typeof pitchingData]?.[0]?.player ?? 'N/A'} (
                        {pitchingData[leader.stat as keyof typeof pitchingData]?.[0]?.team ?? 'N/A'})
                      </div>
                    </button>

                    {expandedPitchingStat === leader.stat && (
                      <div className="bg-[#4A6844] border-[3px] border-[#5A8352] border-t-0 p-2">
                        <div className="text-[7px] text-[#E8E8D8] font-bold mb-1">TOP 5</div>
                        {(pitchingData[leader.stat as keyof typeof pitchingData] ?? []).map((player, pIndex) => (
                          <div 
                            key={pIndex} 
                            className="flex justify-between items-center py-1 border-b border-[#5A8352] last:border-b-0"
                          >
                            <div className="text-[8px] text-[#E8E8D8]">
                              {pIndex + 1}. {player.player} ({player.team})
                            </div>
                            <div className="text-[8px] text-[#E8E8D8] font-bold">{player.value}</div>
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
        )}
      </div>

      {/* Fielding Awards Section */}
      <div>
        <button
          onClick={() => toggleSection("gloves")}
          className="w-full bg-[#FFD700] border-[5px] border-black py-3 px-4 text-[10px] text-black hover:bg-[#DAA520] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ GOLD / PLATINUM / BOOGER GLOVES RACE</span>
          {expandedSection === "gloves" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "gloves" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">AMERICAN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">NATIONAL LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="grid grid-cols-3 gap-2">
              {(expandedLeague === "al" ? goldGloveLeadersAL : goldGloveLeadersNL).map((leader, index) => (
                <div 
                  key={index} 
                  className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-[#E8E8D8] font-bold">{leader.position}</div>
                    {leader.tier === "Gold Glove" && (
                      <Trophy className="w-5 h-5 text-[#FFD700]" />
                    )}
                    {leader.tier === "Platinum Glove" && (
                      <Trophy className="w-5 h-5 text-[#C0C0C0]" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-[#E8E8D8]">{leader.player}</div>
                    <div className="text-[8px] text-[#E8E8D8]/70">{leader.team}</div>
                    <div className="mt-2 text-[7px] text-[#E8E8D8] font-bold">{leader.tier}</div>
                    <div className="text-[7px] text-[#E8E8D8]/70">fWAR: {leader.fWAR}</div>
                  </div>
                </div>
              ))}
              <div 
                className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3"
              >
                <div className="text-sm text-[#E8E8D8] font-bold mb-2">{expandedLeague === "al" ? boogerGloveLeaderAL.position : boogerGloveLeaderNL.position}</div>
                <div className="text-center">
                  <div className="text-[8px] text-[#E8E8D8]">{expandedLeague === "al" ? boogerGloveLeaderAL.player : boogerGloveLeaderNL.player}</div>
                  <div className="text-[8px] text-[#E8E8D8]/70">{expandedLeague === "al" ? boogerGloveLeaderAL.team : boogerGloveLeaderNL.team}</div>
                  <div className="mt-2 text-[7px] text-[#E8E8D8] font-bold">{expandedLeague === "al" ? boogerGloveLeaderAL.tier : boogerGloveLeaderNL.tier}</div>
                  <div className="text-[7px] text-[#E8E8D8]/70">fWAR: {expandedLeague === "al" ? boogerGloveLeaderAL.fWAR : boogerGloveLeaderNL.fWAR}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Silver Sluggers Section */}
      <div>
        <button
          onClick={() => toggleSection("sluggers")}
          className="w-full bg-[#C0C0C0] border-[5px] border-black py-3 px-4 text-[10px] text-black hover:bg-[#D0D0D0] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ SILVER SLUGGERS RACE</span>
          {expandedSection === "sluggers" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "sluggers" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">AMERICAN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">NATIONAL LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="grid grid-cols-3 gap-2">
              {(expandedLeague === "al" ? silverSluggerLeadersAL : silverSluggerLeadersNL).map((leader, index) => (
                <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="text-center">
                    <div className="text-sm text-[#E8E8D8] font-bold mb-1">{leader.position}</div>
                    <div className="text-[8px] text-[#E8E8D8]">{leader.player}</div>
                    <div className="text-[8px] text-[#E8E8D8]/70">{leader.team}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Major Awards Section */}
      <div>
        <button
          onClick={() => toggleSection("major")}
          className="w-full bg-[#DD0000] border-[5px] border-black py-3 px-4 text-[10px] text-white hover:bg-[#EE1111] active:scale-[0.99] transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-between"
        >
          <span>▶ MAJOR AWARDS RACE</span>
          {expandedSection === "major" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expandedSection === "major" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] border-t-0 p-4">
            {/* League toggles */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setExpandedLeague("al")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "al" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">AMERICAN LEAGUE</div>
              </button>
              <button
                onClick={() => setExpandedLeague("nl")}
                className={`flex-1 py-2 px-4 border-[4px] border-[#4A6844] transition ${
                  expandedLeague === "nl" ? "bg-[#4A6844] text-[#E8E8D8]" : "bg-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#4F7D4B]"
                }`}
              >
                <div className="text-[10px] font-bold">NATIONAL LEAGUE</div>
              </button>
            </div>

            {/* Display selected league */}
            <div className="space-y-2">
              {(expandedLeague === "al" ? majorAwardsLeadersAL : majorAwardsLeadersNL).map((award, index) => (
                <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] text-[#E8E8D8] font-bold mb-1">{award.award}</div>
                      <div className="text-[8px] text-[#E8E8D8]">{award.player} ({award.team})</div>
                      <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{award.stats}</div>
                    </div>
                    {!award.award.includes("BUST OF THE YEAR") && (
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* League-wide awards */}
            <div className="mt-4">
              <div className="bg-[#4A6844] border-[4px] border-[#5A8352] p-2 mb-2">
                <div className="text-[10px] text-[#E8E8D8] text-center font-bold">LEAGUE-WIDE AWARDS</div>
              </div>
              <div className="space-y-2">
                {leagueWideAwardsLeaders.map((award, index) => (
                  <div key={index} className="bg-[#5A8352] border-[4px] border-[#4A6844] p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] text-[#E8E8D8] font-bold mb-1">{award.award}</div>
                        <div className="text-[8px] text-[#E8E8D8]">{award.player} ({award.team})</div>
                        <div className="text-[8px] text-[#E8E8D8]/70 mt-1">{award.stats}</div>
                      </div>
                      <Trophy className="w-6 h-6 text-[#FFD700]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function BeatReporterNews() {
  const [newsFilter, setNewsFilter] = useState<"all" | "league" | "team">("all");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  // Mock news data
  const newsArticles = [
    {
      id: 1,
      type: "league",
      headline: "Playoff Race Heats Up: Three Teams Battle for Final Wildcard Spot",
      excerpt: "With just 10 games remaining, the Sox, Tigers, and Crocs are separated by just 2 games in the AL wildcard race...",
      fullText: "With just 10 games remaining in the regular season, the American League wildcard race has become a nail-biter. The Sox, Tigers, and Crocs are separated by just 2 games, setting up a dramatic final stretch. The Sox currently hold the edge at 87-65, followed by the Tigers at 86-66 and the Crocs at 85-67. Each team has favorable matchups remaining, but the pressure is mounting. 'Every game matters now,' said Sox manager Coach Thompson. 'We can't afford any slip-ups.' The Tigers face a crucial 4-game series against the last-place Jacks this weekend, while the Crocs have a tough road trip to face the division-leading Blowfish. Baseball fans are in for a thrilling finish as these three teams battle for postseason berths.",
      reporter: "Sarah Martinez",
      team: null,
      timestamp: "2 hours ago",
      category: "STANDINGS"
    },
    {
      id: 2,
      type: "team",
      headline: "Beewolves Ace Wilson Returns to Practice After Injury Scare",
      excerpt: "David Wilson threw a successful bullpen session today, indicating he could return to the rotation this weekend...",
      fullText: "David Wilson threw a successful bullpen session today, indicating he could return to the rotation this weekend after missing three starts with shoulder inflammation. The Beewolves' ace threw approximately 40 pitches, reporting no discomfort afterward. 'Everything felt good,' Wilson said. 'My fastball had good velocity and my breaking stuff had the usual bite.' Manager Coach Williams expressed optimism about Wilson's return, stating he could start as early as Saturday against the Moonstars. Wilson's return couldn't come at a better time, as the Beewolves are pushing for home-field advantage in the NL playoffs. The 28-year-old right-hander is 14-6 with a 2.45 ERA this season and has been a cornerstone of the team's success.",
      reporter: "Mike Chen",
      team: "Beewolves",
      timestamp: "4 hours ago",
      category: "INJURY REPORT"
    },
    {
      id: 3,
      type: "league",
      headline: "Commissioner Announces Rule Changes for Season 2",
      excerpt: "League officials confirmed several rule modifications including expanded rosters and adjusted playoff format...",
      fullText: "League officials confirmed several rule modifications that will take effect in Season 2, including expanded rosters and an adjusted playoff format. The most significant change expands active rosters from 26 to 28 players for the entire season, giving managers more flexibility with pitching staffs and bench depth. Additionally, the playoff format will now include three wild card teams per league instead of two, with the top two wild card teams hosting the third in a best-of-three series. Commissioner Henderson explained, 'These changes reflect our commitment to competitive balance and player welfare.' Other modifications include a pitch clock for relief pitchers and expanded instant replay review. Team executives have expressed mixed reactions, with some praising the innovation while others worry about tradition.",
      reporter: "Jessica Brown",
      team: null,
      timestamp: "6 hours ago",
      category: "LEAGUE NEWS"
    },
    {
      id: 4,
      type: "team",
      headline: "Tigers Slugger Rodriguez Eyes Historic 50-Home Run Season",
      excerpt: "J. Rodriguez sits at 41 homers with 15 games to play. If he reaches 50, he'll join an elite club of power hitters...",
      fullText: "J. Rodriguez sits at 41 homers with 15 games to play. If he reaches 50, he'll join an elite club of power hitters in league history. The Tigers' first baseman has been on an absolute tear, hitting 12 home runs in his last 20 games. 'I'm not really thinking about the number,' Rodriguez said after yesterday's two-homer performance. 'I'm just trying to help us win and make the playoffs.' Despite his humble approach, the entire baseball world is watching. Rodriguez would become just the seventh player in league history to reach the 50-homer milestone in a single season. His power surge has been instrumental in keeping the Tigers in the wildcard race. Pitchers are being extra careful with him, as evidenced by his league-leading 89 walks this season. Tigers fans are hoping the slugger can maintain his pace and etch his name in the record books.",
      reporter: "Tom Anderson",
      team: "Tigers",
      timestamp: "8 hours ago",
      category: "RECORDS WATCH"
    },
    {
      id: 5,
      type: "team",
      headline: "Nemesis Front Office Hints at Major Trade Deadline Activity",
      excerpt: "GM Williams suggested the team is exploring 'all options' to bolster the bullpen before the August 31 deadline...",
      fullText: "GM Williams suggested the team is exploring 'all options' to bolster the bullpen before the August 31 deadline. The Nemesis have been linked to several high-profile relievers in recent days, including All-Star closer M. Rivera from the struggling Jacks. 'We're a complete team, but we recognize that adding one more late-inning arm could be the difference between a division title and a wild card spot,' Williams told reporters. The Nemesis currently sit 3.5 games behind the division-leading Beewolves with three weeks remaining. Sources indicate the team is willing to part with top prospect outfielder K. Santos in the right deal. Williams acknowledged the difficulty of trading prospects but emphasized the team's win-now mentality. 'Our window is open right now, and we need to take advantage,' he said. Expect the Nemesis to be active as the deadline approaches.",
      reporter: "Rachel Kim",
      team: "Nemesis",
      timestamp: "12 hours ago",
      category: "TRADE RUMORS"
    },
    {
      id: 6,
      type: "league",
      headline: "All-Star Game MVP Winner Donates Award to Youth Baseball Program",
      excerpt: "Moonstars' D. Tanaka announced he will auction his All-Star MVP trophy to benefit local youth baseball initiatives...",
      fullText: "Moonstars' D. Tanaka announced he will auction his All-Star MVP trophy to benefit local youth baseball initiatives in underserved communities. The heartfelt gesture comes as no surprise to those who know Tanaka, who has long been an advocate for youth sports access. 'Baseball changed my life, and I want to give that opportunity to as many kids as possible,' Tanaka said at a press conference. The auction is expected to raise over $100,000, with proceeds going to the Play Ball Foundation, which provides equipment and coaching to youth programs across the country. Tanaka went 2-for-3 with a home run and three RBIs in this year's All-Star Game, earning MVP honors. The 31-year-old outfielder is having a career year, batting .318 with 28 homers and 94 RBIs. His off-field contributions are equally impressive, and he's widely considered a leading candidate for the Kara Kawaguchi Award for community excellence.",
      reporter: "Chris Johnson",
      team: null,
      timestamp: "1 day ago",
      category: "COMMUNITY"
    },
    {
      id: 7,
      type: "team",
      headline: "Sox Manager Addresses Clubhouse Chemistry Questions",
      excerpt: "Following recent reports of tension, Coach Thompson held a team meeting to 'clear the air' and refocus on playoffs...",
      fullText: "Following recent reports of tension between veteran players and younger call-ups, Coach Thompson held a team meeting to 'clear the air' and refocus on playoffs. The meeting came after anonymous sources suggested friction over playing time allocation down the stretch. 'Every successful team goes through adversity,' Thompson told reporters. 'What matters is how you respond. We had a great conversation, and everyone is on the same page now.' Star pitcher T. Anderson echoed his manager's sentiments: 'We're all professionals here. Sometimes emotions run high when you're fighting for a playoff spot, but we're united in our goal.' The Sox have won 4 of their last 5 games since the meeting, suggesting the team has indeed moved past any issues. With the wildcard race heating up, the Sox can't afford distractions and appear focused on securing their first postseason berth in five years.",
      reporter: "David Park",
      team: "Sox",
      timestamp: "1 day ago",
      category: "CLUBHOUSE"
    },
    {
      id: 8,
      type: "team",
      headline: "Crocs Announce Stadium Upgrades for Next Season",
      excerpt: "The franchise revealed plans for a $12M renovation including new video boards and expanded concessions...",
      fullText: "The franchise revealed plans for a $12M renovation including new video boards, expanded concessions, and upgraded fan amenities. The improvements will transform the gameday experience at Crocs Stadium, which has been home to the team since 2015. The centerpiece is a massive 4K video board in center field, which will be the largest in the league. 'We're committed to providing our fans with a world-class experience,' said team president Angela Morris. Other upgrades include a new kids' play area, craft beer garden, and modernized luxury suites. The team also plans to install a state-of-the-art sound system and improve WiFi connectivity throughout the stadium. Construction will begin immediately after the season ends, with completion targeted for Opening Day next year. Season ticket holders will receive exclusive previews and discounts at the new concession stands. The Crocs are hoping the improvements will boost attendance, which has lagged behind league averages despite the team's on-field success.",
      reporter: "Emily White",
      team: "Crocs",
      timestamp: "2 days ago",
      category: "FRANCHISE"
    },
    {
      id: 9,
      type: "league",
      headline: "Cy Young Race Remains Too Close to Call",
      excerpt: "Anderson and Chen are neck-and-neck for their respective league awards with nearly identical stats...",
      fullText: "Anderson and Chen are neck-and-neck for their respective league awards with nearly identical stats heading into the final weeks of the season. Sox ace T. Anderson leads the AL with a 19-4 record and 2.38 ERA, while Nemesis pitcher A. Chen tops the NL at 20-4 with a 2.14 ERA. Both pitchers have been dominant all season, and both have strong cases for the award. Anderson leads in strikeouts with 287, while Chen has been more efficient with fewer walks. 'Both guys have been exceptional,' said Hall of Fame pitcher R. Martinez. 'It's going to come down to who finishes stronger.' Anderson has two starts remaining, while Chen has three. The voting will take place after the regular season ends, with results announced before the playoffs begin. Historically, win-loss record has played a significant role in Cy Young voting, which could give Chen an edge if he finishes 23-4. However, advanced metrics slightly favor Anderson's dominance. It's truly a toss-up at this point.",
      reporter: "Brian Rodriguez",
      team: null,
      timestamp: "2 days ago",
      category: "AWARDS WATCH"
    },
    {
      id: 10,
      type: "team",
      headline: "Moonstars Prospect Call-Up Creates Roster Controversy",
      excerpt: "The decision to promote rookie phenom K. Sato has sparked debate about service time manipulation...",
      fullText: "The decision to promote rookie phenom K. Sato has sparked debate about service time manipulation and competitive integrity. Sato, 22, was promoted from Triple-A yesterday after dominating the minors with a .342 average and 31 home runs. However, the timing raised eyebrows around the league. By calling him up now rather than at the start of the season, the Moonstars effectively delay his free agency eligibility by one year. 'It's a smart business move, but it feels wrong,' said one rival executive who requested anonymity. 'This kid should have been up months ago.' The Moonstars defended the decision, citing Sato's need for development and the strong performance of current roster players. 'We make decisions based on what's best for the organization and the player's long-term development,' said GM Peterson. Sato himself seems unfazed: 'I'm just happy to be here and ready to contribute.' The controversy highlights ongoing tensions between competitive and financial considerations in roster management.",
      reporter: "Lisa Thompson",
      team: "Moonstars",
      timestamp: "3 days ago",
      category: "PROSPECTS"
    }
  ];

  const teams = ["Beewolves", "Tigers", "Nemesis", "Sox", "Crocs", "Moonstars"];

  const filteredArticles = newsArticles.filter(article => {
    if (newsFilter === "league") return article.type === "league";
    if (newsFilter === "team") {
      if (selectedTeam) return article.team === selectedTeam;
      return article.type === "team";
    }
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "STANDINGS": return "#0066FF";
      case "INJURY REPORT": return "#DD0000";
      case "LEAGUE NEWS": return "#7733DD";
      case "RECORDS WATCH": return "#FFD700";
      case "TRADE RUMORS": return "#CC44CC";
      case "COMMUNITY": return "#5599FF";
      case "CLUBHOUSE": return "#3366FF";
      case "FRANCHISE": return "#0066FF";
      case "AWARDS WATCH": return "#FFD700";
      case "PROSPECTS": return "#5599FF";
      default: return "#7733DD";
    }
  };

  return (
    <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
      {/* Header */}
      <div className="bg-[#6B9462] border-[6px] border-[#4A6844] p-4 text-center">
        <div className="text-2xl text-[#E8E8D8] mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.2)' }}>
          YOUR DAILY SQUINCH
        </div>
        <div className="text-[8px] text-[#E8E8D8]/70">LATEST STORIES FROM AROUND THE LEAGUE</div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewsFilter("all");
              setSelectedTeam(null);
            }}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "all" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">ALL NEWS</div>
          </button>
          <button
            onClick={() => {
              setNewsFilter("league");
              setSelectedTeam(null);
            }}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "league" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">LEAGUE-WIDE</div>
          </button>
          <button
            onClick={() => setNewsFilter("team")}
            className={`flex-1 py-3 px-4 border-[5px] transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              newsFilter === "team" 
                ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]" 
                : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
            }`}
          >
            <div className="text-[10px] font-bold">TEAM REPORTS</div>
          </button>
        </div>

        {/* Team Filter */}
        {newsFilter === "team" && (
          <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-3">
            <div className="text-[8px] text-[#E8E8D8] mb-2">FILTER BY TEAM</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedTeam(null)}
                className={`py-2 px-3 border-[4px] transition text-[8px] ${
                  selectedTeam === null
                    ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]"
                    : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
                }`}
              >
                ALL TEAMS
              </button>
              {teams.map(team => (
                <button
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                  className={`py-2 px-3 border-[4px] transition text-[8px] ${
                    selectedTeam === team
                      ? "bg-[#5A8352] border-[#4A6844] text-[#E8E8D8]"
                      : "bg-[#4A6844] border-[#5A8352] text-[#E8E8D8]/70 hover:bg-[#3F5A3A]"
                  }`}
                >
                  {team.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* News Articles */}
      <div className="space-y-3">
        {filteredArticles.map(article => {
          const isExpanded = expandedArticle === article.id;
          return (
            <div
              key={article.id}
              onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
              className="bg-[#6B9462] border-[5px] border-[#4A6844] p-4 hover:bg-[#5A8352] transition cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              {/* Article Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="px-2 py-1 border-[3px] border-black text-[7px] font-bold"
                      style={{ backgroundColor: getCategoryColor(article.category), color: '#000' }}
                    >
                      {article.category}
                    </div>
                    {article.team && (
                      <div className="px-2 py-1 bg-[#4A6844] border-[3px] border-[#5A8352] text-[7px] text-[#E8E8D8]">
                        {article.team.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm text-[#E8E8D8] font-bold leading-tight mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>
                    {article.headline}
                  </h3>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#E8E8D8] ml-2 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#E8E8D8] ml-2 flex-shrink-0" />
                )}
              </div>

              {/* Article Body */}
              <p className="text-[10px] text-[#E8E8D8]/90 leading-relaxed mb-3">
                {isExpanded ? article.fullText : article.excerpt}
              </p>

              {/* Read More Indicator */}
              {!isExpanded && (
                <div className="text-[8px] text-[#E8E8D8]/70 mb-2 italic">
                  Click to read more...
                </div>
              )}

              {/* Article Footer */}
              <div className="flex items-center justify-between pt-2 border-t-2 border-[#4A6844]">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-3 h-3 text-[#E8E8D8]/60" />
                  <span className="text-[8px] text-[#E8E8D8]/80">{article.reporter}</span>
                </div>
                <span className="text-[8px] text-[#E8E8D8]/60">{article.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredArticles.length === 0 && (
        <div className="bg-[#6B9462] border-[5px] border-[#4A6844] p-8 text-center">
          <div className="text-[10px] text-[#E8E8D8]/60">NO ARTICLES FOUND</div>
        </div>
      )}
    </div>
  );
}