import type { League, Team, Player } from "@/app/types";

// Mock players for demo
const createPlayers = (teamPrefix: string): Player[] => [
  {
    id: `${teamPrefix}-p1`,
    name: "Mike Rodriguez",
    position: "SS",
    battingAvg: 0.287,
    homeRuns: 12,
    rbi: 45,
    mojo: 85,
    fitness: 92,
  },
  {
    id: `${teamPrefix}-p2`,
    name: "Tommy Chen",
    position: "CF",
    battingAvg: 0.312,
    homeRuns: 8,
    rbi: 38,
    mojo: 78,
    fitness: 88,
  },
  {
    id: `${teamPrefix}-p3`,
    name: "Jake Williams",
    position: "1B",
    battingAvg: 0.295,
    homeRuns: 22,
    rbi: 67,
    mojo: 91,
    fitness: 85,
  },
  {
    id: `${teamPrefix}-p4`,
    name: "Ryan Smith",
    position: "P",
    battingAvg: 0.145,
    homeRuns: 0,
    rbi: 4,
    era: 3.45,
    strikeouts: 98,
    wins: 8,
    mojo: 82,
    fitness: 95,
  },
];

export const mockLeagues: League[] = [
  {
    id: "kbl-1",
    name: "Kruse Baseball League",
    conferences: ["American", "National"],
    divisions: ["East", "West", "Central"],
    teams: [
      {
        id: "tigers-1",
        name: "Detroit Tigers",
        abbreviation: "DET",
        colors: { primary: "#0C2340", secondary: "#FA4616" },
        record: { wins: 42, losses: 28 },
        roster: createPlayers("det"),
      },
      {
        id: "sox-1",
        name: "Chicago Sox",
        abbreviation: "CHI",
        colors: { primary: "#27251F", secondary: "#C4CED4" },
        record: { wins: 38, losses: 32 },
        roster: createPlayers("chi"),
      },
      {
        id: "bombers-1",
        name: "New York Bombers",
        abbreviation: "NYB",
        colors: { primary: "#003087", secondary: "#E4002B" },
        record: { wins: 45, losses: 25 },
        roster: createPlayers("nyb"),
      },
      {
        id: "rays-1",
        name: "Tampa Bay Rays",
        abbreviation: "TB",
        colors: { primary: "#092C5C", secondary: "#8FBCE6" },
        record: { wins: 40, losses: 30 },
        roster: createPlayers("tb"),
      },
    ],
  },
];

export const getSavedFranchises = () => {
  const saved = localStorage.getItem("kbl-franchises");
  return saved ? JSON.parse(saved) : [];
};

export const saveFranchise = (franchise: any) => {
  const franchises = getSavedFranchises();
  const existing = franchises.findIndex((f: any) => f.id === franchise.id);
  if (existing >= 0) {
    franchises[existing] = franchise;
  } else {
    franchises.push(franchise);
  }
  localStorage.setItem("kbl-franchises", JSON.stringify(franchises));
};
