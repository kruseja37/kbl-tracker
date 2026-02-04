import { useState, useMemo, useCallback } from "react";
import { X, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, Lock, Trophy, DollarSign, Star, Award, ChevronDown, ChevronUp, ChevronRight, BarChart3, CheckCircle, Plus } from "lucide-react";
import { useOffseasonData, type OffseasonPlayer, type OffseasonTeam } from "@/hooks/useOffseasonData";
import { useOffseasonState, type RatingAdjustment, type ManagerBonus } from "../../hooks/useOffseasonState";

// Types
type Position = "SP" | "RP" | "CP" | "SP/RP" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH" | "UTIL" | "BENCH" | "TWO-WAY";
type Grade = "S" | "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D";
type Screen = "OVERVIEW" | "TEAM_REVEAL" | "MANAGER_DISTRIBUTION" | "LEAGUE_SUMMARY";

interface PlayerRatings {
  // Position players
  powerL?: number;
  powerR?: number;
  contactL?: number;
  contactR?: number;
  speed?: number;
  fielding?: number;
  arm?: number;
  // Pitchers
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

interface PlayerStats {
  bWAR: number;
  rWAR: number;
  fWAR: number;
  pWAR: number;
  bWARPercentile: number;
  rWARPercentile: number;
  fWARPercentile: number;
  pWARPercentile: number;
}

interface Player {
  id: string;
  name: string;
  position: Position;
  detectedPosition: Position;
  grade: Grade;
  salary: number;
  salaryPercentile: number;
  stats: PlayerStats;
  ratingsBefore: PlayerRatings;
  ratingsAfter: PlayerRatings;
  netChange: number;
  salaryChange: number;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
  shortName: string;
  record: { wins: number; losses: number };
  logo: string;
  managerName: string;
  managerGrade: Grade;
  mWAR: number;
  isManagerOfYear: boolean;
}

interface ManagerAllocation {
  playerId: string;
  playerName: string;
  category: keyof PlayerRatings;
  points: number;
}

interface TeamSummary {
  teamId: string;
  improved: number;
  declined: number;
  netChange: number;
  salaryDelta: number;
}

// Mock Data (fallback when real data not available)
const MOCK_TEAMS: Team[] = [
  { id: "thunder", name: "New York Thunder", shortName: "THUNDER", record: { wins: 42, losses: 28 }, logo: "NYT", managerName: "Joe Torre", managerGrade: "A-", mWAR: 3.8, isManagerOfYear: true },
  { id: "redsox", name: "Boston Red Sox", shortName: "SOX", record: { wins: 48, losses: 22 }, logo: "BOS", managerName: "Terry Francona", managerGrade: "A", mWAR: 4.2, isManagerOfYear: false },
  { id: "giants", name: "San Francisco Giants", shortName: "GIANTS", record: { wins: 35, losses: 35 }, logo: "SF", managerName: "Bruce Bochy", managerGrade: "B+", mWAR: 1.5, isManagerOfYear: false },
  { id: "mariners", name: "Seattle Mariners", shortName: "MARINERS", record: { wins: 40, losses: 30 }, logo: "SEA", managerName: "Lou Piniella", managerGrade: "B", mWAR: 2.1, isManagerOfYear: false },
  { id: "rockies", name: "Colorado Rockies", shortName: "ROCKIES", record: { wins: 28, losses: 42 }, logo: "COL", managerName: "Clint Hurdle", managerGrade: "C+", mWAR: -1.8, isManagerOfYear: false },
  { id: "dodgers", name: "Los Angeles Dodgers", shortName: "DODGERS", record: { wins: 52, losses: 18 }, logo: "LAD", managerName: "Tommy Lasorda", managerGrade: "A+", mWAR: 5.1, isManagerOfYear: false },
  { id: "cubs", name: "Chicago Cubs", shortName: "CUBS", record: { wins: 38, losses: 32 }, logo: "CHC", managerName: "Dusty Baker", managerGrade: "B", mWAR: 1.9, isManagerOfYear: false },
  { id: "astros", name: "Houston Astros", shortName: "ASTROS", record: { wins: 45, losses: 25 }, logo: "HOU", managerName: "Phil Garner", managerGrade: "A-", mWAR: 3.2, isManagerOfYear: false },
];

/**
 * Convert OffseasonTeam to local Team format with defaults for ratings adjustment
 */
function convertToLocalTeam(team: OffseasonTeam, index: number): Team {
  // Default manager data for now (would come from manager system in future)
  const defaultManagers = [
    { name: "Manager 1", grade: "B+" as Grade, mWAR: 2.0, isMOY: false },
    { name: "Manager 2", grade: "A-" as Grade, mWAR: 3.2, isMOY: false },
    { name: "Manager 3", grade: "B" as Grade, mWAR: 1.5, isMOY: false },
    { name: "Manager 4", grade: "A" as Grade, mWAR: 4.0, isMOY: true },
    { name: "Manager 5", grade: "C+" as Grade, mWAR: -0.5, isMOY: false },
    { name: "Manager 6", grade: "B-" as Grade, mWAR: 1.0, isMOY: false },
    { name: "Manager 7", grade: "A-" as Grade, mWAR: 2.8, isMOY: false },
    { name: "Manager 8", grade: "B+" as Grade, mWAR: 2.2, isMOY: false },
  ];
  const mgr = defaultManagers[index % defaultManagers.length];

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    record: { wins: 35, losses: 35 }, // Default - would come from season data
    logo: team.shortName.slice(0, 3).toUpperCase(),
    managerName: mgr.name,
    managerGrade: mgr.grade,
    mWAR: mgr.mWAR,
    isManagerOfYear: mgr.isMOY,
  };
}

/**
 * Convert OffseasonPlayer to local Player format with mock rating changes
 */
function convertToLocalPlayer(player: OffseasonPlayer): Player {
  // Generate mock rating changes based on position
  const isPitcher = ["SP", "RP", "CP"].includes(player.position);
  const baseRating = 70; // Default base rating

  // Generate random change for demo purposes
  const netChange = Math.floor(Math.random() * 20) - 8; // -8 to +11
  const salaryChange = netChange * 0.3; // Roughly $0.3M per point

  const ratingsBefore: PlayerRatings = isPitcher ? {
    velocity: player.velocity ?? baseRating + Math.floor(Math.random() * 20),
    junk: player.junk ?? baseRating + Math.floor(Math.random() * 20),
    accuracy: player.accuracy ?? baseRating + Math.floor(Math.random() * 20),
  } : {
    powerL: player.power ?? baseRating,
    powerR: (player.power ?? baseRating) - 2,
    contactL: player.contact ?? baseRating,
    contactR: (player.contact ?? baseRating) - 2,
    speed: player.speed ?? baseRating,
    fielding: player.fielding ?? baseRating,
    arm: player.arm ?? baseRating,
  };

  const ratingsAfter: PlayerRatings = isPitcher ? {
    velocity: (ratingsBefore.velocity || baseRating) + Math.floor(netChange / 3),
    junk: (ratingsBefore.junk || baseRating) + Math.floor(netChange / 3),
    accuracy: (ratingsBefore.accuracy || baseRating) + Math.ceil(netChange / 3),
  } : {
    powerL: (ratingsBefore.powerL || baseRating) + Math.floor(netChange / 4),
    powerR: (ratingsBefore.powerR || baseRating) + Math.floor(netChange / 4),
    contactL: (ratingsBefore.contactL || baseRating) + Math.floor(netChange / 4),
    contactR: (ratingsBefore.contactR || baseRating) + Math.floor(netChange / 4),
    speed: (ratingsBefore.speed || baseRating) + Math.floor(netChange / 7),
    fielding: (ratingsBefore.fielding || baseRating) + Math.floor(netChange / 7),
    arm: (ratingsBefore.arm || baseRating) + Math.floor(netChange / 7),
  };

  return {
    id: player.id,
    name: player.name,
    position: player.position as Position,
    detectedPosition: player.position as Position,
    grade: player.grade as Grade,
    salary: player.salary,
    salaryPercentile: Math.floor(Math.random() * 100),
    stats: {
      bWAR: isPitcher ? 0 : player.war * 0.6,
      rWAR: isPitcher ? 0 : player.war * 0.2,
      fWAR: isPitcher ? 0 : player.war * 0.2,
      pWAR: isPitcher ? player.war : 0,
      bWARPercentile: Math.floor(Math.random() * 100),
      rWARPercentile: Math.floor(Math.random() * 100),
      fWARPercentile: Math.floor(Math.random() * 100),
      pWARPercentile: Math.floor(Math.random() * 100),
    },
    ratingsBefore,
    ratingsAfter,
    netChange,
    salaryChange,
    teamId: player.teamId,
  };
}

const MOCK_ALL_PLAYERS: Player[] = [
  // Thunder players
  {
    id: "p1", name: "Mike Trout", position: "CF", detectedPosition: "CF", grade: "A+", salary: 12.0, salaryPercentile: 95,
    stats: { bWAR: 4.2, rWAR: 1.1, fWAR: 0.8, pWAR: 0, bWARPercentile: 98, rWARPercentile: 85, fWARPercentile: 72, pWARPercentile: 0 },
    ratingsBefore: { powerL: 85, powerR: 83, contactL: 82, contactR: 80, speed: 78, fielding: 75, arm: 70 },
    ratingsAfter: { powerL: 88, powerR: 86, contactL: 85, contactR: 83, speed: 80, fielding: 75, arm: 70 },
    netChange: 14, salaryChange: 1.5, teamId: "thunder"
  },
  {
    id: "p2", name: "Derek Jeter", position: "SS", detectedPosition: "SS", grade: "A-", salary: 8.0, salaryPercentile: 88,
    stats: { bWAR: 3.5, rWAR: 0.9, fWAR: 1.2, pWAR: 0, bWARPercentile: 85, rWARPercentile: 78, fWARPercentile: 88, pWARPercentile: 0 },
    ratingsBefore: { powerL: 65, powerR: 63, contactL: 88, contactR: 86, speed: 80, fielding: 85, arm: 80 },
    ratingsAfter: { powerL: 67, powerR: 65, contactL: 90, contactR: 88, speed: 82, fielding: 85, arm: 80 },
    netChange: 6, salaryChange: 1.2, teamId: "thunder"
  },
  {
    id: "p3", name: "Alex Rodriguez", position: "3B", detectedPosition: "3B", grade: "A", salary: 15.0, salaryPercentile: 98,
    stats: { bWAR: 1.8, rWAR: 0.4, fWAR: -0.2, pWAR: 0, bWARPercentile: 42, rWARPercentile: 38, fWARPercentile: 28, pWARPercentile: 0 },
    ratingsBefore: { powerL: 92, powerR: 90, contactL: 78, contactR: 76, speed: 72, fielding: 70, arm: 85 },
    ratingsAfter: { powerL: 88, powerR: 86, contactL: 75, contactR: 73, speed: 70, fielding: 68, arm: 83 },
    netChange: -10, salaryChange: -3.8, teamId: "thunder"
  },
  {
    id: "p4", name: "Mariano Rivera", position: "CP", detectedPosition: "CP", grade: "A", salary: 10.0, salaryPercentile: 92,
    stats: { bWAR: 0, rWAR: 0, fWAR: 0, pWAR: 3.8, bWARPercentile: 0, rWARPercentile: 0, fWARPercentile: 0, pWARPercentile: 95 },
    ratingsBefore: { velocity: 88, junk: 92, accuracy: 90 },
    ratingsAfter: { velocity: 89, junk: 94, accuracy: 91 },
    netChange: 4, salaryChange: 0.8, teamId: "thunder"
  },
  {
    id: "p5", name: "Jorge Posada", position: "C", detectedPosition: "C", grade: "B+", salary: 6.5, salaryPercentile: 75,
    stats: { bWAR: 2.1, rWAR: 0.5, fWAR: 0.3, pWAR: 0, bWARPercentile: 76, rWARPercentile: 68, fWARPercentile: 62, pWARPercentile: 0 },
    ratingsBefore: { powerL: 78, powerR: 76, contactL: 72, contactR: 70, speed: 45, fielding: 68, arm: 75 },
    ratingsAfter: { powerL: 78, powerR: 76, contactL: 72, contactR: 70, speed: 45, fielding: 68, arm: 75 },
    netChange: 0, salaryChange: 0, teamId: "thunder"
  },

  // Giants players
  {
    id: "p6", name: "Barry Bonds", position: "LF", detectedPosition: "LF", grade: "A+", salary: 18.0, salaryPercentile: 99,
    stats: { bWAR: 2.5, rWAR: 0.6, fWAR: 0.1, pWAR: 0, bWARPercentile: 55, rWARPercentile: 52, fWARPercentile: 45, pWARPercentile: 0 },
    ratingsBefore: { powerL: 99, powerR: 97, contactL: 88, contactR: 86, speed: 68, fielding: 72, arm: 75 },
    ratingsAfter: { powerL: 95, powerR: 93, contactL: 85, contactR: 83, speed: 66, fielding: 70, arm: 73 },
    netChange: -10, salaryChange: -5.2, teamId: "giants"
  },
  {
    id: "p7", name: "Willie Mays", position: "CF", detectedPosition: "CF", grade: "A-", salary: 7.5, salaryPercentile: 82,
    stats: { bWAR: 3.8, rWAR: 1.2, fWAR: 1.5, pWAR: 0, bWARPercentile: 92, rWARPercentile: 88, fWARPercentile: 95, pWARPercentile: 0 },
    ratingsBefore: { powerL: 82, powerR: 80, contactL: 85, contactR: 83, speed: 88, fielding: 92, arm: 88 },
    ratingsAfter: { powerL: 85, powerR: 83, contactL: 87, contactR: 85, speed: 90, fielding: 94, arm: 90 },
    netChange: 9, salaryChange: 2.8, teamId: "giants"
  },
  {
    id: "p8", name: "Randy Johnson", position: "SP", detectedPosition: "SP", grade: "A-", salary: 9.5, salaryPercentile: 86,
    stats: { bWAR: 0, rWAR: 0, fWAR: 0, pWAR: 2.8, bWARPercentile: 0, rWARPercentile: 0, fWARPercentile: 0, pWARPercentile: 82 },
    ratingsBefore: { velocity: 95, junk: 85, accuracy: 80 },
    ratingsAfter: { velocity: 95, junk: 85, accuracy: 80 },
    netChange: 0, salaryChange: 0, teamId: "giants"
  },

  // Red Sox players
  {
    id: "p9", name: "David Ortiz", position: "DH", detectedPosition: "DH", grade: "A", salary: 15.0, salaryPercentile: 94,
    stats: { bWAR: 4.5, rWAR: 1.8, fWAR: 0, pWAR: 0, bWARPercentile: 96, rWARPercentile: 92, fWARPercentile: 0, pWARPercentile: 0 },
    ratingsBefore: { powerL: 95, powerR: 93, contactL: 85, contactR: 83, speed: 45, fielding: undefined, arm: undefined },
    ratingsAfter: { powerL: 97, powerR: 95, contactL: 87, contactR: 85, speed: 44, fielding: undefined, arm: undefined },
    netChange: 5, salaryChange: 1.8, teamId: "redsox"
  },
  {
    id: "p10", name: "Pedro Martinez", position: "SP", detectedPosition: "SP", grade: "A+", salary: 14.0, salaryPercentile: 96,
    stats: { bWAR: 0, rWAR: 0, fWAR: 0, pWAR: 5.2, bWARPercentile: 0, rWARPercentile: 0, fWARPercentile: 0, pWARPercentile: 98 },
    ratingsBefore: { velocity: 92, junk: 95, accuracy: 93 },
    ratingsAfter: { velocity: 93, junk: 97, accuracy: 95 },
    netChange: 5, salaryChange: 4.2, teamId: "redsox"
  },
  {
    id: "p11", name: "Manny Ramirez", position: "LF", detectedPosition: "LF", grade: "A-", salary: 9.9, salaryPercentile: 89,
    stats: { bWAR: 3.2, rWAR: 0.8, fWAR: -0.3, pWAR: 0, bWARPercentile: 88, rWARPercentile: 75, fWARPercentile: 35, pWARPercentile: 0 },
    ratingsBefore: { powerL: 90, powerR: 88, contactL: 86, contactR: 84, speed: 52, fielding: 62, arm: 68 },
    ratingsAfter: { powerL: 91, powerR: 89, contactL: 87, contactR: 85, speed: 52, fielding: 61, arm: 68 },
    netChange: 3, salaryChange: 0.5, teamId: "redsox"
  },

  // Mariners players
  {
    id: "p12", name: "Ken Griffey Jr.", position: "CF", detectedPosition: "CF", grade: "A", salary: 9.8, salaryPercentile: 88,
    stats: { bWAR: 1.9, rWAR: 0.4, fWAR: 0.5, pWAR: 0, bWARPercentile: 48, rWARPercentile: 42, fWARPercentile: 58, pWARPercentile: 0 },
    ratingsBefore: { powerL: 92, powerR: 90, contactL: 88, contactR: 86, speed: 78, fielding: 88, arm: 82 },
    ratingsAfter: { powerL: 88, powerR: 86, contactL: 86, contactR: 84, speed: 76, fielding: 87, arm: 81 },
    netChange: -8, salaryChange: -2.8, teamId: "mariners"
  },
  {
    id: "p13", name: "Ichiro Suzuki", position: "RF", detectedPosition: "RF", grade: "A-", salary: 8.5, salaryPercentile: 84,
    stats: { bWAR: 3.9, rWAR: 1.3, fWAR: 1.6, pWAR: 0, bWARPercentile: 94, rWARPercentile: 89, fWARPercentile: 96, pWARPercentile: 0 },
    ratingsBefore: { powerL: 55, powerR: 53, contactL: 95, contactR: 93, speed: 92, fielding: 90, arm: 88 },
    ratingsAfter: { powerL: 56, powerR: 54, contactL: 97, contactR: 95, speed: 94, fielding: 92, arm: 90 },
    netChange: 8, salaryChange: 2.2, teamId: "mariners"
  },
];

// Helper functions
function getGradeColor(grade: Grade): string {
  const tier = { "S": 11, "A+": 10, "A": 9, "A-": 8, "B+": 7, "B": 6, "B-": 5, "C+": 4, "C": 3, "C-": 2, "D+": 1, "D": 0 }[grade];
  if (tier >= 8) return "#228B22";
  if (tier >= 5) return "#4682B4";
  if (tier >= 2) return "#CD853F";
  return "#B22222";
}

function getSalaryTierColor(percentile: number): { bg: string; text: string; label: string } {
  if (percentile >= 90) return { bg: "#FFF8E1", text: "#FFD700", label: "Elite" };
  if (percentile >= 75) return { bg: "#F3E5F5", text: "#7B1FA2", label: "High" };
  if (percentile >= 50) return { bg: "#E3F2FD", text: "#1976D2", label: "Mid-High" };
  if (percentile >= 25) return { bg: "#E0F2F1", text: "#00796B", label: "Mid-Low" };
  if (percentile >= 10) return { bg: "#FFF3E0", text: "#F57C00", label: "Low" };
  return { bg: "#EEEEEE", text: "#616161", label: "Minimum" };
}

function getChangeColor(change: number): { bg: string; text: string; icon: any; emoji: string } {
  if (change >= 6) return { bg: "#C8E6C9", text: "#1B5E20", icon: TrendingUp, emoji: "🚀" };
  if (change >= 1) return { bg: "#E8F5E9", text: "#2E7D32", icon: TrendingUp, emoji: "📈" };
  if (change === 0) return { bg: "#F5F5F5", text: "#757575", icon: Minus, emoji: "➖" };
  if (change >= -5) return { bg: "#FFEBEE", text: "#C62828", icon: TrendingDown, emoji: "📉" };
  return { bg: "#FFCDD2", text: "#B71C1C", icon: TrendingDown, emoji: "💔" };
}

function calculateTeamSummary(teamId: string, allPlayers: Player[]): TeamSummary {
  const teamPlayers = allPlayers.filter(p => p.teamId === teamId);
  const improved = teamPlayers.filter(p => p.netChange > 0).length;
  const declined = teamPlayers.filter(p => p.netChange < 0).length;
  const netChange = teamPlayers.reduce((sum, p) => sum + p.netChange, 0);
  const salaryDelta = teamPlayers.reduce((sum, p) => sum + p.salaryChange, 0);

  return { teamId, improved, declined, netChange, salaryDelta };
}

function getManagerPool(team: Team): number {
  const basePool = 20;
  const medianMWAR = 2.0;
  const mwarDelta = team.mWAR - medianMWAR;
  const mwarBonus = Math.round(mwarDelta * 10);
  const moyBonus = team.isManagerOfYear ? 5 : 0;
  
  return basePool + mwarBonus + moyBonus;
}

interface RatingsAdjustmentFlowProps {
  seasonId: string;
  onClose: () => void;
}

export function RatingsAdjustmentFlow({ seasonId, onClose }: RatingsAdjustmentFlowProps) {
  // Load real data from playerDatabase via hook
  const { teams: realTeams, players: realPlayers, hasRealData, isLoading } = useOffseasonData();

  // Offseason state hook for persistence
  const { saveRatingChanges } = useOffseasonState(seasonId);
  const [isSaving, setIsSaving] = useState(false);

  // Convert real data to local format, with mock fallback
  const TEAMS: Team[] = useMemo(() => {
    if (hasRealData && realTeams.length > 0) {
      return realTeams.slice(0, 8).map((team, index) => convertToLocalTeam(team, index));
    }
    return MOCK_TEAMS;
  }, [realTeams, hasRealData]);

  const ALL_PLAYERS: Player[] = useMemo(() => {
    if (hasRealData && realPlayers.length > 0) {
      return realPlayers.map(convertToLocalPlayer);
    }
    return MOCK_ALL_PLAYERS;
  }, [realPlayers, hasRealData]);

  const [screen, setScreen] = useState<Screen>("OVERVIEW");
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [managerAllocations, setManagerAllocations] = useState<{ [teamId: string]: ManagerAllocation[] }>({});
  const [showAddAllocation, setShowAddAllocation] = useState(false);

  const currentTeam = TEAMS[currentTeamIndex];
  const teamPlayers = ALL_PLAYERS.filter(p => p.teamId === currentTeam?.id);
  const totalImproved = ALL_PLAYERS.filter(p => p.netChange > 0).length;
  const totalDeclined = ALL_PLAYERS.filter(p => p.netChange < 0).length;
  const totalUnchanged = ALL_PLAYERS.filter(p => p.netChange === 0).length;

  // Get top risers and fallers
  const sortedByChange = [...ALL_PLAYERS].sort((a, b) => b.netChange - a.netChange);
  const topRisers = sortedByChange.slice(0, 3);
  const topFallers = sortedByChange.slice(-3).reverse();

  const goToNextTeam = () => {
    if (currentTeamIndex < TEAMS.length - 1) {
      setCurrentTeamIndex(currentTeamIndex + 1);
      setScreen("TEAM_REVEAL");
    } else {
      setScreen("LEAGUE_SUMMARY");
    }
  };

  const goToPrevTeam = () => {
    if (currentTeamIndex > 0) {
      setCurrentTeamIndex(currentTeamIndex - 1);
      setScreen("TEAM_REVEAL");
    }
  };

  // Save ratings and close
  const handleSaveAndClose = useCallback(async () => {
    setIsSaving(true);
    try {
      // Convert player adjustments to storage format
      const isPitcherPosition = (pos: string) => ['SP', 'RP', 'CP'].includes(pos);

      const adjustments: RatingAdjustment[] = ALL_PLAYERS.map(player => ({
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        isPitcher: isPitcherPosition(player.position),
        previousRatings: player.ratingsBefore as Record<string, number>,
        newRatings: player.ratingsAfter as Record<string, number>,
        reason: player.netChange > 0 ? 'AGE_DEVELOPMENT' : player.netChange < 0 ? 'AGE_DECLINE' : 'MANUAL',
        adjustedAt: Date.now(),
      }));

      // Convert manager bonuses to storage format (for teams that won something)
      const bonuses: ManagerBonus[] = TEAMS
        .filter(team => team.isManagerOfYear || team.mWAR > 3)
        .map(team => ({
          teamId: team.id,
          teamName: team.name,
          bonusType: team.isManagerOfYear ? 'PENNANT' : 'REGULAR_SEASON' as const,
          amount: team.isManagerOfYear ? 10 : 5, // Fame bonus
          appliedAt: Date.now(),
        }));

      await saveRatingChanges(adjustments, bonuses);
      onClose();
    } catch (error) {
      console.error('[RatingsAdjustmentFlow] Failed to save ratings:', error);
      // Continue anyway
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [ALL_PLAYERS, TEAMS, saveRatingChanges, onClose]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
        <div className="text-[#E8E8D8] text-xl">Loading ratings data...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-screen p-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[#E8E8D8] hover:text-[#DD0000] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back to Offseason Hub</span>
          </button>
          <div className="text-center">
            <div className="text-xl text-[#E8E8D8]">RATINGS ADJUSTMENTS</div>
            <div className="text-xs text-[#E8E8D8]/60">Season 3 → Season 4</div>
          </div>
          <div className="w-40"></div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {screen === "OVERVIEW" && (
            <OverviewScreen
              totalImproved={totalImproved}
              totalDeclined={totalDeclined}
              totalUnchanged={totalUnchanged}
              topRisers={topRisers}
              topFallers={topFallers}
              teams={TEAMS}
              allPlayers={ALL_PLAYERS}
              onSelectTeam={(index) => {
                setCurrentTeamIndex(index);
                setScreen("TEAM_REVEAL");
              }}
              onBeginReview={() => {
                setCurrentTeamIndex(0);
                setScreen("TEAM_REVEAL");
              }}
              onSkipAll={() => setScreen("LEAGUE_SUMMARY")}
            />
          )}

          {screen === "TEAM_REVEAL" && (
            <TeamRevealScreen
              team={currentTeam}
              players={teamPlayers}
              teamIndex={currentTeamIndex}
              totalTeams={TEAMS.length}
              onNext={goToNextTeam}
              onPrev={goToPrevTeam}
              onGoToManagerDistribution={() => setScreen("MANAGER_DISTRIBUTION")}
            />
          )}

          {screen === "MANAGER_DISTRIBUTION" && (
            <ManagerDistributionScreen
              team={currentTeam}
              players={teamPlayers}
              allocations={managerAllocations[currentTeam.id] || []}
              onUpdateAllocations={(allocations) => {
                setManagerAllocations({
                  ...managerAllocations,
                  [currentTeam.id]: allocations
                });
              }}
              onContinue={goToNextTeam}
            />
          )}

          {screen === "LEAGUE_SUMMARY" && (
            <LeagueSummaryScreen
              teams={TEAMS}
              allPlayers={ALL_PLAYERS}
              totalImproved={totalImproved}
              totalDeclined={totalDeclined}
              totalUnchanged={totalUnchanged}
              topRisers={topRisers}
              topFallers={topFallers}
              onClose={handleSaveAndClose}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Screen
function OverviewScreen({
  totalImproved,
  totalDeclined,
  totalUnchanged,
  topRisers,
  topFallers,
  teams,
  allPlayers,
  onSelectTeam,
  onBeginReview,
  onSkipAll,
}: {
  totalImproved: number;
  totalDeclined: number;
  totalUnchanged: number;
  topRisers: Player[];
  topFallers: Player[];
  teams: Team[];
  allPlayers: Player[];
  onSelectTeam: (index: number) => void;
  onBeginReview: () => void;
  onSkipAll: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="text-2xl text-[#E8E8D8] mb-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          SEASON 3 PERFORMANCE REVIEW
        </div>
        <div className="text-sm text-[#E8E8D8]/80">
          Based on WAR performance vs salary expectations, player ratings will be adjusted for Season 4.
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#E8F5E9] border-[5px] border-[#2E7D32] p-6 text-center">
          <div className="text-5xl font-bold text-[#1B5E20] mb-2">📈 {totalImproved}</div>
          <div className="text-sm text-[#2E7D32]">IMPROVED</div>
        </div>
        <div className="bg-[#FFEBEE] border-[5px] border-[#C62828] p-6 text-center">
          <div className="text-5xl font-bold text-[#B71C1C] mb-2">📉 {totalDeclined}</div>
          <div className="text-sm text-[#C62828]">DECLINED</div>
        </div>
        <div className="bg-[#F5F5F5] border-[5px] border-[#757575] p-6 text-center">
          <div className="text-5xl font-bold text-[#424242] mb-2">➖ {totalUnchanged}</div>
          <div className="text-sm text-[#757575]">NO CHANGE</div>
        </div>
      </div>

      {/* Top Risers/Fallers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
          <div className="text-lg text-[#E8E8D8] mb-4 border-b-2 border-[#E8E8D8]/20 pb-2">TOP RISERS</div>
          <div className="space-y-2">
            {topRisers.map(player => {
              const team = teams.find(t => t.id === player.teamId);
              return (
                <div key={player.id} className="flex items-center justify-between text-[#E8E8D8]">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">🚀</span>
                    <span>{player.name}</span>
                    <span className="text-xs text-[#E8E8D8]/60">({team?.shortName})</span>
                  </span>
                  <span className="text-[#228B22] font-bold">+{player.netChange}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
          <div className="text-lg text-[#E8E8D8] mb-4 border-b-2 border-[#E8E8D8]/20 pb-2">TOP FALLERS</div>
          <div className="space-y-2">
            {topFallers.map(player => {
              const team = teams.find(t => t.id === player.teamId);
              return (
                <div key={player.id} className="flex items-center justify-between text-[#E8E8D8]">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">💔</span>
                    <span>{player.name}</span>
                    <span className="text-xs text-[#E8E8D8]/60">({team?.shortName})</span>
                  </span>
                  <span className="text-[#B71C1C] font-bold">{player.netChange}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">TEAMS TO REVIEW</div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {teams.map((team, index) => {
            const summary = calculateTeamSummary(team.id, allPlayers);
            const totalChanges = summary.improved + summary.declined;
            
            return (
              <button
                key={team.id}
                onClick={() => onSelectTeam(index)}
                className="w-full flex items-center gap-4 p-4 bg-[#5A8352] border-[3px] border-[#4A6844] hover:bg-[#4F7D4B] transition-colors text-left"
              >
                <div className="w-12 h-12 bg-[#E8E8D8] rounded-full flex items-center justify-center text-lg font-bold">
                  {team.logo}
                </div>
                <div className="flex-1">
                  <div className="text-base text-[#E8E8D8]">{team.name}</div>
                  <div className="text-xs text-[#E8E8D8]/60">
                    {totalChanges} change{totalChanges !== 1 ? 's' : ''} • Net: {summary.netChange >= 0 ? '+' : ''}{summary.netChange}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#E8E8D8]" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onSkipAll}
          className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-4 text-lg text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          SKIP ALL
        </button>
        <button
          onClick={onBeginReview}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          BEGIN TEAM REVIEW
        </button>
      </div>
    </div>
  );
}

// Team Reveal Screen
function TeamRevealScreen({
  team,
  players,
  teamIndex,
  totalTeams,
  onNext,
  onPrev,
  onGoToManagerDistribution,
}: {
  team: Team;
  players: Player[];
  teamIndex: number;
  totalTeams: number;
  onNext: () => void;
  onPrev: () => void;
  onGoToManagerDistribution: () => void;
}) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "improved" | "declined" | "unchanged">("all");

  const summary = calculateTeamSummary(team.id, players);
  const avgChange = players.length > 0 ? (summary.netChange / players.length).toFixed(1) : "0.0";
  
  const filteredPlayers = players.filter(p => {
    if (filter === "improved") return p.netChange > 0;
    if (filter === "declined") return p.netChange < 0;
    if (filter === "unchanged") return p.netChange === 0;
    return true;
  });

  const managerPool = getManagerPool(team);

  return (
    <div className="space-y-4">
      {/* Team Header */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-2xl font-bold">
            {team.logo}
          </div>
          <div className="flex-1">
            <div className="text-2xl text-[#E8E8D8]">{team.name}</div>
            <div className="text-sm text-[#E8E8D8]/60">Season 3: {team.record.wins}-{team.record.losses}</div>
          </div>
          <div className="text-sm text-[#E8E8D8]/60">Team {teamIndex + 1} of {totalTeams}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm text-[#E8E8D8]">
            Net Rating Change: <span className={`font-bold ${summary.netChange >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
              {summary.netChange >= 0 ? '+' : ''}{summary.netChange} points
            </span>
          </div>
          <div className="text-sm text-[#E8E8D8]">
            Avg Change: <span className={`font-bold ${parseFloat(avgChange) >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
              {parseFloat(avgChange) >= 0 ? '+' : ''}{avgChange} per player
            </span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-4 flex items-center gap-4">
        <div className="text-sm text-[#E8E8D8]">FILTER:</div>
        <div className="flex gap-2">
          {[
            { value: "all", label: "All" },
            { value: "improved", label: "Improved" },
            { value: "declined", label: "Declined" },
            { value: "unchanged", label: "No Change" }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`px-4 py-2 text-sm border-[3px] transition-colors ${
                filter === option.value
                  ? 'bg-[#E8E8D8] text-[#5A8352] border-[#E8E8D8]'
                  : 'bg-[#5A8352] text-[#E8E8D8] border-[#4A6844] hover:bg-[#4F7D4B]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Players List */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              team={team}
              isExpanded={expandedPlayer === player.id}
              onToggleExpand={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
            />
          ))}
          
          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-[#E8E8D8]/60">
              No players match this filter
            </div>
          )}
        </div>
      </div>

      {/* Manager Distribution Button */}
      {managerPool !== 0 && (
        <button
          onClick={onGoToManagerDistribution}
          className="w-full bg-[#7B1FA2] border-[5px] border-[#6A1B9A] py-4 text-lg text-[#E8E8D8] hover:bg-[#6A1B9A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2"
        >
          <Trophy className="w-6 h-6" />
          MANAGER DISTRIBUTION ({managerPool >= 0 ? '+' : ''}{managerPool} points available)
        </button>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={teamIndex === 0}
          className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-4 text-lg text-[#E8E8D8] hover:bg-[#3F5A3A] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          PREV TEAM
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2"
        >
          {teamIndex === totalTeams - 1 ? 'LEAGUE SUMMARY' : 'NEXT TEAM'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Player Card Component
function PlayerCard({
  player,
  team,
  isExpanded,
  onToggleExpand,
}: {
  player: Player;
  team: Team;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const changeInfo = getChangeColor(player.netChange);
  const salaryTier = getSalaryTierColor(player.salaryPercentile);
  const isPitcher = ["SP", "RP", "CP", "SP/RP"].includes(player.position);
  const isDH = player.position === "DH";
  const ChangeIcon = changeInfo.icon;

  return (
    <div className="bg-[#5A8352] border-[3px] border-[#4A6844]">
      <button
        onClick={onToggleExpand}
        className="w-full p-4 hover:bg-[#4F7D4B] transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          {/* Player Avatar */}
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-lg font-bold">
            {player.name.split(' ').map(n => n[0]).join('')}
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <div className="text-lg text-[#E8E8D8] font-bold">{player.name}</div>
            <div className="flex items-center gap-2 text-sm text-[#E8E8D8]/80">
              <span>{player.position}</span>
              <span>•</span>
              <span style={{ color: salaryTier.text }}>
                ${player.salary.toFixed(1)}M ({salaryTier.label})
              </span>
              {player.position !== player.detectedPosition && (
                <>
                  <span>•</span>
                  <span className="text-[#FFA500]">Detected: {player.detectedPosition}</span>
                </>
              )}
            </div>
          </div>

          {/* Change Badge */}
          <div
            className="px-4 py-2 rounded flex items-center gap-2"
            style={{ backgroundColor: changeInfo.bg, color: changeInfo.text }}
          >
            <span className="text-2xl font-bold">
              {player.netChange >= 0 ? '+' : ''}{player.netChange}
            </span>
            <ChangeIcon className="w-5 h-5" />
          </div>

          {/* Expand Icon */}
          {isExpanded ? <ChevronUp className="w-5 h-5 text-[#E8E8D8]" /> : <ChevronDown className="w-5 h-5 text-[#E8E8D8]" />}
        </div>

        {/* Quick Stats (Collapsed View) */}
        {!isExpanded && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="text-[#E8E8D8]/80">
              {isPitcher ? (
                <>
                  VEL: {player.ratingsBefore.velocity} → {player.ratingsAfter.velocity}
                  {' '}({player.ratingsAfter.velocity! - player.ratingsBefore.velocity! >= 0 ? '+' : ''}{player.ratingsAfter.velocity! - player.ratingsBefore.velocity!})
                </>
              ) : (
                <>
                  PWR: {player.ratingsBefore.powerL} → {player.ratingsAfter.powerL}
                  {' '}({player.ratingsAfter.powerL! - player.ratingsBefore.powerL! >= 0 ? '+' : ''}{player.ratingsAfter.powerL! - player.ratingsBefore.powerL!})
                </>
              )}
            </div>
            <div className="text-[#E8E8D8]/80">
              💰 Salary: ${player.salary.toFixed(1)}M → ${(player.salary + player.salaryChange).toFixed(1)}M
            </div>
          </div>
        )}
      </button>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t-[3px] border-[#4A6844] p-4 bg-[#4A6844]">
          {/* Season Performance */}
          <div className="mb-4">
            <div className="text-sm text-[#E8E8D8] font-bold mb-2">SEASON 3 PERFORMANCE</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {isPitcher ? (
                <div className="text-[#E8E8D8]/80">
                  pWAR: {player.stats.pWAR.toFixed(1)} ({player.stats.pWARPercentile}th %ile)
                </div>
              ) : (
                <>
                  <div className="text-[#E8E8D8]/80">
                    bWAR: {player.stats.bWAR.toFixed(1)} ({player.stats.bWARPercentile}th %ile)
                  </div>
                  <div className="text-[#E8E8D8]/80">
                    rWAR: {player.stats.rWAR.toFixed(1)} ({player.stats.rWARPercentile}th %ile)
                  </div>
                  {!isDH && (
                    <div className="text-[#E8E8D8]/80">
                      fWAR: {player.stats.fWAR.toFixed(1)} ({player.stats.fWARPercentile}th %ile)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Rating Changes */}
          <div className="mb-4">
            <div className="text-sm text-[#E8E8D8] font-bold mb-2">RATING CHANGES</div>
            <div className="space-y-1">
              {isPitcher ? (
                <>
                  <RatingChangeRow label="Velocity" before={player.ratingsBefore.velocity!} after={player.ratingsAfter.velocity!} />
                  <RatingChangeRow label="Junk" before={player.ratingsBefore.junk!} after={player.ratingsAfter.junk!} />
                  <RatingChangeRow label="Accuracy" before={player.ratingsBefore.accuracy!} after={player.ratingsAfter.accuracy!} />
                </>
              ) : (
                <>
                  <RatingChangeRow label="Power (L)" before={player.ratingsBefore.powerL!} after={player.ratingsAfter.powerL!} />
                  <RatingChangeRow label="Power (R)" before={player.ratingsBefore.powerR!} after={player.ratingsAfter.powerR!} />
                  <RatingChangeRow label="Contact (L)" before={player.ratingsBefore.contactL!} after={player.ratingsAfter.contactL!} />
                  <RatingChangeRow label="Contact (R)" before={player.ratingsBefore.contactR!} after={player.ratingsAfter.contactR!} />
                  <RatingChangeRow label="Speed" before={player.ratingsBefore.speed!} after={player.ratingsAfter.speed!} />
                  {!isDH && (
                    <>
                      <RatingChangeRow label="Fielding" before={player.ratingsBefore.fielding!} after={player.ratingsAfter.fielding!} />
                      <RatingChangeRow label="Arm" before={player.ratingsBefore.arm!} after={player.ratingsAfter.arm!} />
                    </>
                  )}
                  {isDH && (
                    <div className="text-xs text-[#E8E8D8]/60 italic">Fielding/Arm: N/A (DH - no fielding)</div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Salary Adjustment */}
          <div className="bg-[#5A8352] border-[3px] border-[#6B9462] p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#E8E8D8]">💰 Salary Adjustment:</span>
              <span className={`font-bold ${player.salaryChange >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
                ${player.salary.toFixed(1)}M → ${(player.salary + player.salaryChange).toFixed(1)}M
                {' '}({player.salaryChange >= 0 ? '+' : ''}${player.salaryChange.toFixed(1)}M)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Rating Change Row
function RatingChangeRow({ label, before, after }: { label: string; before: number; after: number }) {
  const change = after - before;
  const changePercent = change === 0 ? 0 : Math.min(Math.abs(change) / 10 * 100, 100);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-20 text-[#E8E8D8]/80">{label}</div>
      <div className="w-12 text-right text-[#E8E8D8]/60">{before}</div>
      <div className="text-[#E8E8D8]/40">→</div>
      <div className="w-12 text-[#E8E8D8]">{after}</div>
      <div className={`w-12 font-bold ${change > 0 ? 'text-[#228B22]' : change < 0 ? 'text-[#B71C1C]' : 'text-[#757575]'}`}>
        {change >= 0 ? '+' : ''}{change}
      </div>
      <div className="flex-1 bg-[#E8E8D8]/20 h-2 rounded overflow-hidden">
        <div
          className={`h-full ${change > 0 ? 'bg-[#228B22]' : change < 0 ? 'bg-[#B71C1C]' : 'bg-[#757575]'}`}
          style={{ width: `${changePercent}%` }}
        ></div>
      </div>
      <div className="text-[#E8E8D8]/60 text-xs">
        {change > 0 ? '📈' : change < 0 ? '📉' : '➖'}
      </div>
    </div>
  );
}

// Manager Distribution Screen
function ManagerDistributionScreen({
  team,
  players,
  allocations,
  onUpdateAllocations,
  onContinue,
}: {
  team: Team;
  players: Player[];
  allocations: ManagerAllocation[];
  onUpdateAllocations: (allocations: ManagerAllocation[]) => void;
  onContinue: () => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<keyof PlayerRatings>("powerL");
  const [selectedPoints, setSelectedPoints] = useState(0);

  const managerPool = getManagerPool(team);
  const usedPoints = allocations.reduce((sum, a) => sum + a.points, 0);
  const remainingPoints = managerPool - usedPoints;
  const maxPerPlayer = Math.floor(Math.abs(managerPool) * 0.5);

  const addAllocation = () => {
    if (!selectedPlayer) return;
    
    const player = players.find(p => p.id === selectedPlayer);
    if (!player) return;

    const newAllocation: ManagerAllocation = {
      playerId: selectedPlayer,
      playerName: player.name,
      category: selectedCategory,
      points: selectedPoints,
    };

    onUpdateAllocations([...allocations, newAllocation]);
    setShowAddModal(false);
    setSelectedPlayer("");
    setSelectedPoints(0);
  };

  const removeAllocation = (index: number) => {
    onUpdateAllocations(allocations.filter((_, i) => i !== index));
  };

  const adjustPoints = (index: number, delta: number) => {
    const updated = [...allocations];
    updated[index].points += delta;
    onUpdateAllocations(updated);
  };

  return (
    <div className="space-y-4">
      {/* Manager Header */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#E8E8D8] rounded-full flex items-center justify-center text-2xl">
            👔
          </div>
          <div className="flex-1">
            <div className="text-2xl text-[#E8E8D8]">{team.managerName}</div>
            <div className="flex items-center gap-3 text-sm text-[#E8E8D8]/80">
              <span>Grade: {team.managerGrade}</span>
              <span>•</span>
              <span>mWAR: {team.mWAR.toFixed(1)}</span>
              <span>•</span>
              <span>Record: {team.record.wins}-{team.record.losses}</span>
            </div>
          </div>
          {team.isManagerOfYear && (
            <div className="bg-[#FFD700] text-black px-4 py-2 rounded flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">MANAGER OF THE YEAR</span>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Pool */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">DISTRIBUTION POOL</div>
        
        <div className="space-y-2 text-sm text-[#E8E8D8]/80 mb-4">
          <div className="flex justify-between">
            <span>Base Pool:</span>
            <span className="font-bold">+20</span>
          </div>
          <div className="flex justify-between">
            <span>mWAR Bonus/Penalty:</span>
            <span className={`font-bold ${team.mWAR >= 2.0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
              {Math.round((team.mWAR - 2.0) * 10) >= 0 ? '+' : ''}{Math.round((team.mWAR - 2.0) * 10)}
              {' '}({team.mWAR >= 2.0 ? 'above' : 'below'} league median)
            </span>
          </div>
          {team.isManagerOfYear && (
            <div className="flex justify-between">
              <span>Manager of Year Bonus:</span>
              <span className="font-bold text-[#228B22]">+5</span>
            </div>
          )}
          <div className="border-t-2 border-[#E8E8D8]/20 pt-2 mt-2"></div>
          <div className="flex justify-between text-lg">
            <span className="text-[#E8E8D8]">TOTAL POOL:</span>
            <span className={`font-bold ${managerPool >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
              {managerPool >= 0 ? '+' : ''}{managerPool} points
            </span>
          </div>
        </div>

        {managerPool < 0 && (
          <div className="bg-[#B71C1C]/20 border-l-4 border-[#B71C1C] p-3 text-sm text-[#E8E8D8]">
            ⚠️ NEGATIVE POOL: You must distribute {managerPool} points across your roster.
            This represents your poor management penalizing player development.
          </div>
        )}
        
        {managerPool > 0 && (
          <div className="bg-[#1976D2]/20 border-l-4 border-[#1976D2] p-3 text-sm text-[#E8E8D8]">
            ℹ️ You must distribute ALL {managerPool} points (positive or negative) before continuing.
          </div>
        )}
      </div>

      {/* Allocations */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg text-[#E8E8D8]">ALLOCATIONS</div>
          <div className="text-sm">
            <span className="text-[#E8E8D8]/60">Remaining: </span>
            <span className={`text-2xl font-bold ${remainingPoints === 0 ? 'text-[#228B22]' : 'text-[#FFA500]'}`}>
              {remainingPoints}
            </span>
          </div>
        </div>

        {allocations.length > 0 ? (
          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
            {allocations.map((allocation, index) => (
              <div key={index} className="bg-[#5A8352] border-[3px] border-[#4A6844] p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm text-[#E8E8D8] font-bold">{allocation.playerName}</div>
                  <div className="text-xs text-[#E8E8D8]/60">{allocation.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustPoints(index, -1)}
                    className="w-8 h-8 bg-[#4A6844] border-[2px] border-[#5A8352] text-[#E8E8D8] hover:bg-[#3F5A3A] flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className={`w-12 text-center font-bold ${allocation.points >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
                    {allocation.points >= 0 ? '+' : ''}{allocation.points}
                  </div>
                  <button
                    onClick={() => adjustPoints(index, 1)}
                    className="w-8 h-8 bg-[#4A6844] border-[2px] border-[#5A8352] text-[#E8E8D8] hover:bg-[#3F5A3A] flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeAllocation(index)}
                  className="px-3 py-1 bg-[#B71C1C] border-[2px] border-[#8B0000] text-[#E8E8D8] text-xs hover:bg-[#8B0000]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#E8E8D8]/60 text-sm mb-4">
            No allocations yet. Click "Add Allocation" to begin.
          </div>
        )}

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] py-3 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          ADD ALLOCATION
        </button>
      </div>

      {/* Rules */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-4">
        <div className="text-sm text-[#E8E8D8] font-bold mb-2">RULES</div>
        <ul className="text-xs text-[#E8E8D8]/80 space-y-1">
          <li>• Max 50% of pool to any single player ({maxPerPlayer} points max)</li>
          <li>• Can give positive OR negative points</li>
          <li>• Can target any rating category</li>
          <li>• Must use all points before continuing</li>
        </ul>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={remainingPoints !== 0}
        className="w-full bg-[#5A8352] border-[5px] border-[#4A6844] py-4 text-lg text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
      >
        {remainingPoints === 0 ? 'CONFIRM DISTRIBUTION' : `CONFIRM DISTRIBUTION (${remainingPoints} points remaining)`}
      </button>

      {/* Add Allocation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6 max-w-md w-full">
            <div className="text-xl text-[#E8E8D8] mb-4">ADD ALLOCATION</div>

            {/* Player Select */}
            <div className="mb-4">
              <div className="text-sm text-[#E8E8D8] mb-2">PLAYER</div>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="w-full bg-[#5A8352] border-[3px] border-[#4A6844] text-[#E8E8D8] p-2"
              >
                <option value="">Select Player</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.position})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Select */}
            <div className="mb-4">
              <div className="text-sm text-[#E8E8D8] mb-2">RATING CATEGORY</div>
              <div className="grid grid-cols-3 gap-2">
                {["powerL", "contactL", "speed", "fielding", "arm", "velocity", "junk", "accuracy"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as keyof PlayerRatings)}
                    className={`p-2 text-xs border-[2px] ${
                      selectedCategory === cat
                        ? 'bg-[#E8E8D8] text-[#5A8352] border-[#E8E8D8]'
                        : 'bg-[#5A8352] text-[#E8E8D8] border-[#4A6844]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Points */}
            <div className="mb-4">
              <div className="text-sm text-[#E8E8D8] mb-2">POINTS</div>
              <div className="flex gap-2 justify-center mb-2">
                {[-5, -1, 0, 1, 5].map(val => (
                  <button
                    key={val}
                    onClick={() => setSelectedPoints(val)}
                    className={`px-3 py-2 border-[2px] ${
                      selectedPoints === val
                        ? 'bg-[#E8E8D8] text-[#5A8352] border-[#E8E8D8]'
                        : 'bg-[#5A8352] text-[#E8E8D8] border-[#4A6844]'
                    }`}
                  >
                    {val >= 0 ? '+' : ''}{val}
                  </button>
                ))}
              </div>
              <div className="text-center text-sm text-[#E8E8D8]/80">
                Current: <span className="font-bold">{selectedPoints >= 0 ? '+' : ''}{selectedPoints}</span>
              </div>
              <div className="text-center text-xs text-[#E8E8D8]/60 mt-1">
                ⚠️ Max for this player: ±{maxPerPlayer} (50% of pool)
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-[#4A6844] border-[3px] border-[#5A8352] py-2 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A]"
              >
                CANCEL
              </button>
              <button
                onClick={addAllocation}
                disabled={!selectedPlayer}
                className="flex-1 bg-[#5A8352] border-[3px] border-[#4A6844] py-2 text-sm text-[#E8E8D8] hover:bg-[#4F7D4B] disabled:opacity-50"
              >
                ADD ALLOCATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// League Summary Screen
function LeagueSummaryScreen({
  teams,
  allPlayers,
  totalImproved,
  totalDeclined,
  totalUnchanged,
  topRisers,
  topFallers,
  onClose,
  isSaving = false,
}: {
  teams: Team[];
  allPlayers: Player[];
  totalImproved: number;
  totalDeclined: number;
  totalUnchanged: number;
  topRisers: Player[];
  topFallers: Player[];
  onClose: () => void;
  isSaving?: boolean;
}) {
  const teamSummaries = teams.map(team => calculateTeamSummary(team.id, allPlayers));
  const totalPlayers = allPlayers.length;
  const totalNetChange = teamSummaries.reduce((sum, s) => sum + s.netChange, 0);
  const totalSalaryChange = teamSummaries.reduce((sum, s) => sum + s.salaryDelta, 0);

  const biggestRiser = topRisers[0];
  const biggestFaller = topFallers[0];
  const biggestRaise = [...allPlayers].sort((a, b) => b.salaryChange - a.salaryChange)[0];
  const biggestCut = [...allPlayers].sort((a, b) => a.salaryChange - b.salaryChange)[0];

  return (
    <div className="space-y-4">
      {/* Completion Header */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-8 text-center">
        <div className="text-3xl text-[#E8E8D8] mb-4 flex items-center justify-center gap-3">
          <CheckCircle className="w-10 h-10 text-[#228B22]" />
          SEASON 3 → SEASON 4 ADJUSTMENTS COMPLETE
        </div>
        <div className="text-lg text-[#E8E8D8]/80">
          {totalPlayers} players reviewed • {totalImproved} improved • {totalDeclined} declined • {totalUnchanged} unchanged
        </div>
      </div>

      {/* Team Summary Table */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">TEAM SUMMARY</div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#E8E8D8]/20">
                <th className="text-left py-2 text-[#E8E8D8]">TEAM</th>
                <th className="text-center py-2 text-[#E8E8D8]">IMPROVED</th>
                <th className="text-center py-2 text-[#E8E8D8]">DECLINED</th>
                <th className="text-center py-2 text-[#E8E8D8]">NET CHANGE</th>
                <th className="text-right py-2 text-[#E8E8D8]">SALARY Δ</th>
              </tr>
            </thead>
            <tbody>
              {teamSummaries.map(summary => {
                const team = teams.find(t => t.id === summary.teamId)!;
                return (
                  <tr key={summary.teamId} className="border-b border-[#E8E8D8]/10">
                    <td className="py-3 text-[#E8E8D8]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#E8E8D8] rounded-full flex items-center justify-center text-xs font-bold">
                          {team.logo}
                        </div>
                        {team.name}
                      </div>
                    </td>
                    <td className="text-center py-3 text-[#228B22] font-bold">{summary.improved}</td>
                    <td className="text-center py-3 text-[#B71C1C] font-bold">{summary.declined}</td>
                    <td className="text-center py-3">
                      <span className={`font-bold ${summary.netChange >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
                        {summary.netChange >= 0 ? '+' : ''}{summary.netChange}
                      </span>
                    </td>
                    <td className="text-right py-3">
                      <span className={`font-bold ${summary.salaryDelta >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}`}>
                        {summary.salaryDelta >= 0 ? '+' : ''}${summary.salaryDelta.toFixed(1)}M
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[#E8E8D8]/40 font-bold">
                <td className="py-3 text-[#E8E8D8]">LEAGUE TOTAL</td>
                <td className="text-center py-3 text-[#228B22]">{totalImproved}</td>
                <td className="text-center py-3 text-[#B71C1C]">{totalDeclined}</td>
                <td className="text-center py-3">
                  <span className={totalNetChange >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}>
                    {totalNetChange >= 0 ? '+' : ''}{totalNetChange}
                  </span>
                </td>
                <td className="text-right py-3">
                  <span className={totalSalaryChange >= 0 ? 'text-[#228B22]' : 'text-[#B71C1C]'}>
                    {totalSalaryChange >= 0 ? '+' : ''}${totalSalaryChange.toFixed(1)}M
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notable Changes */}
      <div className="bg-[#6B9462] border-[5px] border-[#C4A853] p-6">
        <div className="text-lg text-[#E8E8D8] mb-4">NOTABLE CHANGES</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-xs text-[#E8E8D8]/60 mb-1">BIGGEST RISER</div>
            <div className="text-base text-[#E8E8D8] font-bold">{biggestRiser.name}</div>
            <div className="text-sm text-[#228B22]">
              {teams.find(t => t.id === biggestRiser.teamId)?.shortName} • +{biggestRiser.netChange} points
            </div>
          </div>

          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
            <div className="text-2xl mb-2">💔</div>
            <div className="text-xs text-[#E8E8D8]/60 mb-1">BIGGEST FALLER</div>
            <div className="text-base text-[#E8E8D8] font-bold">{biggestFaller.name}</div>
            <div className="text-sm text-[#B71C1C]">
              {teams.find(t => t.id === biggestFaller.teamId)?.shortName} • {biggestFaller.netChange} points
            </div>
          </div>

          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-xs text-[#E8E8D8]/60 mb-1">BIGGEST RAISE</div>
            <div className="text-base text-[#E8E8D8] font-bold">{biggestRaise.name}</div>
            <div className="text-sm text-[#228B22]">
              {teams.find(t => t.id === biggestRaise.teamId)?.shortName} • +${biggestRaise.salaryChange.toFixed(1)}M
            </div>
          </div>

          <div className="bg-[#5A8352] border-[3px] border-[#4A6844] p-4">
            <div className="text-2xl mb-2">📉</div>
            <div className="text-xs text-[#E8E8D8]/60 mb-1">BIGGEST PAY CUT</div>
            <div className="text-base text-[#E8E8D8] font-bold">{biggestCut.name}</div>
            <div className="text-sm text-[#B71C1C]">
              {teams.find(t => t.id === biggestCut.teamId)?.shortName} • ${biggestCut.salaryChange.toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => {/* Export functionality */}}
          className="flex-1 bg-[#4A6844] border-[5px] border-[#5A8352] py-4 text-lg text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
        >
          EXPORT PDF
        </button>
        <button
          onClick={onClose}
          disabled={isSaving}
          className={`flex-1 border-[5px] py-4 text-lg text-[#E8E8D8] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2 ${
            isSaving
              ? 'bg-[#4A6844] border-[#5A8352] cursor-wait opacity-70'
              : 'bg-[#5A8352] border-[#4A6844] hover:bg-[#4F7D4B]'
          }`}
        >
          {isSaving ? 'SAVING CHANGES...' : 'CONTINUE TO RETIREMENTS'}
          {!isSaving && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
