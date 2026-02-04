/**
 * Museum Data Hook
 *
 * Connects museumStorage to Figma UI components with:
 * - Loading states
 * - Mock data fallbacks
 * - CRUD operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initMuseumDatabase,
  getChampionships,
  saveChampionship,
  getSeasonStandings,
  getTeamSeasonHistory,
  saveSeasonStanding,
  getTeamRecords,
  getTeamRecord,
  saveTeamRecord,
  getAwardWinners,
  getPlayerAwards,
  saveAwardWinner,
  getHallOfFamers,
  saveHallOfFamer,
  removeHallOfFamer,
  getAllTimeLeaders,
  saveAllTimeLeader,
  getRecords,
  saveRecord,
  getMoments,
  saveMoment,
  removeMoment,
  getRetiredJerseys,
  saveRetiredJersey,
  removeRetiredJersey,
  getStadiums,
  saveStadium,
  hasMuseumData,
  generateMuseumId,
  type ChampionshipRecord,
  type SeasonStanding,
  type TeamAllTimeRecord,
  type AwardWinner,
  type HallOfFamer,
  type AllTimeLeader,
  type LeagueRecord,
  type LegendaryMoment,
  type RetiredJersey,
  type StadiumData,
} from '../../utils/museumStorage';

// Re-export types for convenience
export type {
  ChampionshipRecord,
  SeasonStanding,
  TeamAllTimeRecord,
  AwardWinner,
  HallOfFamer,
  AllTimeLeader,
  LeagueRecord,
  LegendaryMoment,
  RetiredJersey,
  StadiumData,
};

// ============================================
// MOCK DATA (for first-time or fallback)
// ============================================

const MOCK_CHAMPIONSHIPS: ChampionshipRecord[] = [
  { year: 2025, champion: "Tigers", championId: "tigers", runnerUp: "Sox", runnerUpId: "sox", series: "4-2", mvp: "J. Rodriguez", mvpId: "p1" },
  { year: 2024, champion: "Moonstars", championId: "moonstars", runnerUp: "Beewolves", runnerUpId: "beewolves", series: "4-3" },
  { year: 2023, champion: "Sox", championId: "sox", runnerUp: "Tigers", runnerUpId: "tigers", series: "4-1" },
];

const MOCK_TEAM_RECORDS: TeamAllTimeRecord[] = [
  { teamId: "tigers", teamName: "Tigers", totalWins: 487, totalLosses: 361, winPct: 0.574, championships: 2, playoffAppearances: 4, lastUpdated: Date.now() },
  { teamId: "sox", teamName: "Sox", totalWins: 468, totalLosses: 380, winPct: 0.552, championships: 1, playoffAppearances: 5, lastUpdated: Date.now() },
  { teamId: "moonstars", teamName: "Moonstars", totalWins: 445, totalLosses: 403, winPct: 0.525, championships: 1, playoffAppearances: 3, lastUpdated: Date.now() },
];

const MOCK_AWARD_WINNERS: AwardWinner[] = [
  { year: 2025, awardType: 'MVP', playerId: "p1", playerName: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", stats: "24-4, 2.12 ERA" },
  { year: 2025, awardType: 'CY_YOUNG', playerId: "p2", playerName: "A. Brown", teamId: "sox", teamName: "Sox", stats: "21-6, 2.45 ERA" },
  { year: 2025, awardType: 'ROY', playerId: "p3", playerName: "M. Chen", teamId: "bears", teamName: "Bears", stats: ".298, 28 HR" },
];

const MOCK_ALL_TIME_LEADERS: AllTimeLeader[] = [
  { id: "l1", playerId: "p1", name: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", category: 'pitching', war: 64.2, pwar: 64.2, bwar: 0, rwar: 0, fwar: 0, era: 2.45, wins: 187, lastUpdated: Date.now() },
  { id: "l2", playerId: "p4", name: "S. Wilson", teamId: "sox", teamName: "Sox", category: 'batting', war: 58.9, pwar: 0, bwar: 52.3, rwar: 4.8, fwar: 1.8, avg: 0.312, hr: 342, lastUpdated: Date.now() },
  { id: "l3", playerId: "p5", name: "K. Thompson", teamId: "moonstars", teamName: "Moonstars", category: 'batting', war: 56.7, pwar: 0, bwar: 48.9, rwar: 2.1, fwar: 5.7, avg: 0.298, hr: 298, lastUpdated: Date.now() },
];

const MOCK_HALL_OF_FAME: HallOfFamer[] = [
  { id: "hof1", playerId: "p1", name: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", position: "SP", jerseyNumber: 42, inductedYear: 2026, careerYears: "2018-2025", careerWar: 64.2, highlights: ["3x Cy Young", "World Series MVP 2025"] },
  { id: "hof2", playerId: "p6", name: "Historical Legend", teamId: "tigers", teamName: "Tigers", position: "CF", jerseyNumber: 7, inductedYear: 2020, careerYears: "2005-2017", careerWar: 58.4, highlights: ["MVP 2012", "500 HR Club"] },
];

const MOCK_RECORDS: LeagueRecord[] = [
  { id: "r1", category: 'batting', recordName: "Most Career Home Runs", playerId: "p3", playerName: "M. Chen", teamId: "bears", teamName: "Bears", year: "2015-2025", value: "389", numericValue: 389, isCareer: true },
  { id: "r2", category: 'batting', recordName: "Highest Career Batting Average", playerId: "p4", playerName: "S. Wilson", teamId: "sox", teamName: "Sox", year: "2016-2025", value: ".312", numericValue: 0.312, isCareer: true },
  { id: "r3", category: 'pitching', recordName: "Most Career Wins", playerId: "p1", playerName: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", year: "2018-2025", value: "187", numericValue: 187, isCareer: true },
  { id: "r4", category: 'pitching', recordName: "Lowest Career ERA", playerId: "p1", playerName: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", year: "2018-2025", value: "2.45", numericValue: 2.45, isCareer: true },
];

const MOCK_MOMENTS: LegendaryMoment[] = [
  { id: "m1", date: "Oct 15, 2025", year: 2025, title: "Rodriguez Perfect Game in World Series Game 7", description: "In the most pressure-packed moment imaginable, J. Rodriguez delivered a perfect game to clinch the championship.", reporter: "Sarah Jenkins", playerId: "p1", playerName: "J. Rodriguez", teamId: "tigers", teamName: "Tigers", tags: ["perfect-game", "world-series"] },
  { id: "m2", date: "Jul 4, 2024", year: 2024, title: "Chen's 4 Home Runs on Independence Day", description: "M. Chen put on a fireworks show of his own, becoming only the third player in league history to hit four home runs in a single game.", reporter: "Mike Patterson", playerId: "p3", playerName: "M. Chen", teamId: "bears", teamName: "Bears", tags: ["4-homer-game"] },
];

const MOCK_RETIRED_JERSEYS: RetiredJersey[] = [
  { id: "rj1", teamId: "tigers", teamName: "Tigers", number: 42, playerId: "p1", playerName: "J. Rodriguez", position: "SP", years: "2018-2025", retiredYear: 2025 },
  { id: "rj2", teamId: "tigers", teamName: "Tigers", number: 7, playerId: "p6", playerName: "Historical Legend", position: "CF", years: "2005-2017", retiredYear: 2017 },
];

const MOCK_STADIUMS: StadiumData[] = [
  { id: "s1", teamId: "tigers", name: "Tiger Stadium", opened: 1912, capacity: 42000, overall: 102, hr: 106, doubles: 104, triples: 98 },
  { id: "s2", teamId: "sox", name: "Sox Field", opened: 1995, capacity: 38500, overall: 98, hr: 95, doubles: 99, triples: 102 },
  { id: "s3", teamId: "bears", name: "Bear Den", opened: 2001, capacity: 45000, overall: 105, hr: 108, doubles: 107, triples: 96 },
];

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseMuseumDataReturn {
  // Loading state
  isLoading: boolean;
  error: string | null;
  hasData: boolean;

  // Data
  championships: ChampionshipRecord[];
  teamRecords: TeamAllTimeRecord[];
  awardWinners: AwardWinner[];
  allTimeLeaders: AllTimeLeader[];
  hallOfFamers: HallOfFamer[];
  records: LeagueRecord[];
  moments: LegendaryMoment[];
  retiredJerseys: RetiredJersey[];
  stadiums: StadiumData[];

  // Team-specific queries
  getTeamHistory: (teamId: string) => Promise<SeasonStanding[]>;
  getTeamRetiredJerseys: (teamId: string) => RetiredJersey[];

  // Award queries
  getAwardsByYear: (year: number) => AwardWinner[];
  getAwardsByPlayer: (playerId: string) => Promise<AwardWinner[]>;

  // Record queries
  getRecordsByCategory: (category: 'batting' | 'pitching' | 'fielding' | 'team') => LeagueRecord[];

  // Mutations
  addChampionship: (record: Omit<ChampionshipRecord, 'year'> & { year: number }) => Promise<void>;
  addAwardWinner: (award: AwardWinner) => Promise<void>;
  addHallOfFamer: (member: Omit<HallOfFamer, 'id'>) => Promise<void>;
  removeFromHallOfFame: (id: string) => Promise<void>;
  addMoment: (moment: Omit<LegendaryMoment, 'id'>) => Promise<void>;
  removeLegendaryMoment: (id: string) => Promise<void>;
  addRetiredJersey: (jersey: Omit<RetiredJersey, 'id'>) => Promise<void>;
  removeJersey: (id: string) => Promise<void>;
  updateRecord: (record: LeagueRecord) => Promise<void>;
  updateAllTimeLeader: (leader: AllTimeLeader) => Promise<void>;
  updateStadium: (stadium: StadiumData) => Promise<void>;

  // Actions
  refresh: () => Promise<void>;
  seedMockData: () => Promise<void>;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMuseumData(): UseMuseumDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  // Data states
  const [championships, setChampionships] = useState<ChampionshipRecord[]>([]);
  const [teamRecords, setTeamRecords] = useState<TeamAllTimeRecord[]>([]);
  const [awardWinners, setAwardWinners] = useState<AwardWinner[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<AllTimeLeader[]>([]);
  const [hallOfFamers, setHallOfFamers] = useState<HallOfFamer[]>([]);
  const [records, setRecords] = useState<LeagueRecord[]>([]);
  const [moments, setMoments] = useState<LegendaryMoment[]>([]);
  const [retiredJerseys, setRetiredJerseys] = useState<RetiredJersey[]>([]);
  const [stadiums, setStadiums] = useState<StadiumData[]>([]);

  /**
   * Load all museum data
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await initMuseumDatabase();

      const [
        champs,
        teams,
        awards,
        leaders,
        hof,
        recs,
        moms,
        jerseys,
        stads,
      ] = await Promise.all([
        getChampionships(),
        getTeamRecords(),
        getAwardWinners(),
        getAllTimeLeaders(),
        getHallOfFamers(),
        getRecords(),
        getMoments(),
        getRetiredJerseys(),
        getStadiums(),
      ]);

      // Use real data if available, otherwise use mock
      const hasRealData = champs.length > 0 || teams.length > 0;

      setChampionships(champs.length > 0 ? champs : MOCK_CHAMPIONSHIPS);
      setTeamRecords(teams.length > 0 ? teams : MOCK_TEAM_RECORDS);
      setAwardWinners(awards.length > 0 ? awards : MOCK_AWARD_WINNERS);
      setAllTimeLeaders(leaders.length > 0 ? leaders : MOCK_ALL_TIME_LEADERS);
      setHallOfFamers(hof.length > 0 ? hof : MOCK_HALL_OF_FAME);
      setRecords(recs.length > 0 ? recs : MOCK_RECORDS);
      setMoments(moms.length > 0 ? moms : MOCK_MOMENTS);
      setRetiredJerseys(jerseys.length > 0 ? jerseys : MOCK_RETIRED_JERSEYS);
      setStadiums(stads.length > 0 ? stads : MOCK_STADIUMS);

      setHasData(hasRealData);
    } catch (err) {
      console.error('[useMuseumData] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load museum data');

      // Use mock data on error
      setChampionships(MOCK_CHAMPIONSHIPS);
      setTeamRecords(MOCK_TEAM_RECORDS);
      setAwardWinners(MOCK_AWARD_WINNERS);
      setAllTimeLeaders(MOCK_ALL_TIME_LEADERS);
      setHallOfFamers(MOCK_HALL_OF_FAME);
      setRecords(MOCK_RECORDS);
      setMoments(MOCK_MOMENTS);
      setRetiredJerseys(MOCK_RETIRED_JERSEYS);
      setStadiums(MOCK_STADIUMS);
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Seed mock data to IndexedDB
   */
  const seedMockData = useCallback(async () => {
    try {
      await initMuseumDatabase();

      // Seed all mock data
      for (const champ of MOCK_CHAMPIONSHIPS) {
        await saveChampionship(champ);
      }
      for (const team of MOCK_TEAM_RECORDS) {
        await saveTeamRecord(team);
      }
      for (const award of MOCK_AWARD_WINNERS) {
        await saveAwardWinner(award);
      }
      for (const leader of MOCK_ALL_TIME_LEADERS) {
        await saveAllTimeLeader(leader);
      }
      for (const member of MOCK_HALL_OF_FAME) {
        await saveHallOfFamer(member);
      }
      for (const rec of MOCK_RECORDS) {
        await saveRecord(rec);
      }
      for (const moment of MOCK_MOMENTS) {
        await saveMoment(moment);
      }
      for (const jersey of MOCK_RETIRED_JERSEYS) {
        await saveRetiredJersey(jersey);
      }
      for (const stadium of MOCK_STADIUMS) {
        await saveStadium(stadium);
      }

      // Reload
      await loadData();
    } catch (err) {
      console.error('[useMuseumData] Error seeding mock data:', err);
      setError(err instanceof Error ? err.message : 'Failed to seed mock data');
    }
  }, [loadData]);

  // ============================================
  // QUERY HELPERS
  // ============================================

  const getTeamHistory = useCallback(async (teamId: string): Promise<SeasonStanding[]> => {
    try {
      return await getTeamSeasonHistory(teamId);
    } catch {
      return [];
    }
  }, []);

  const getTeamRetiredJerseys = useCallback((teamId: string): RetiredJersey[] => {
    return retiredJerseys.filter(j => j.teamId === teamId);
  }, [retiredJerseys]);

  const getAwardsByYear = useCallback((year: number): AwardWinner[] => {
    return awardWinners.filter(a => a.year === year);
  }, [awardWinners]);

  const getAwardsByPlayer = useCallback(async (playerId: string): Promise<AwardWinner[]> => {
    try {
      return await getPlayerAwards(playerId);
    } catch {
      return awardWinners.filter(a => a.playerId === playerId);
    }
  }, [awardWinners]);

  const getRecordsByCategory = useCallback((category: 'batting' | 'pitching' | 'fielding' | 'team'): LeagueRecord[] => {
    return records.filter(r => r.category === category);
  }, [records]);

  // ============================================
  // MUTATIONS
  // ============================================

  const addChampionship = useCallback(async (record: ChampionshipRecord) => {
    await saveChampionship(record);
    await loadData();
  }, [loadData]);

  const addAwardWinner = useCallback(async (award: AwardWinner) => {
    await saveAwardWinner(award);
    await loadData();
  }, [loadData]);

  const addHallOfFamer = useCallback(async (member: Omit<HallOfFamer, 'id'>) => {
    const newMember: HallOfFamer = {
      ...member,
      id: generateMuseumId('hof'),
    };
    await saveHallOfFamer(newMember);
    await loadData();
  }, [loadData]);

  const removeFromHallOfFame = useCallback(async (id: string) => {
    await removeHallOfFamer(id);
    await loadData();
  }, [loadData]);

  const addMoment = useCallback(async (moment: Omit<LegendaryMoment, 'id'>) => {
    const newMoment: LegendaryMoment = {
      ...moment,
      id: generateMuseumId('moment'),
    };
    await saveMoment(newMoment);
    await loadData();
  }, [loadData]);

  const removeLegendaryMoment = useCallback(async (id: string) => {
    await removeMoment(id);
    await loadData();
  }, [loadData]);

  const addRetiredJersey = useCallback(async (jersey: Omit<RetiredJersey, 'id'>) => {
    const newJersey: RetiredJersey = {
      ...jersey,
      id: generateMuseumId('jersey'),
    };
    await saveRetiredJersey(newJersey);
    await loadData();
  }, [loadData]);

  const removeJersey = useCallback(async (id: string) => {
    await removeRetiredJersey(id);
    await loadData();
  }, [loadData]);

  const updateRecord = useCallback(async (record: LeagueRecord) => {
    await saveRecord(record);
    await loadData();
  }, [loadData]);

  const updateAllTimeLeader = useCallback(async (leader: AllTimeLeader) => {
    await saveAllTimeLeader(leader);
    await loadData();
  }, [loadData]);

  const updateStadium = useCallback(async (stadium: StadiumData) => {
    await saveStadium(stadium);
    await loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    hasData,

    championships,
    teamRecords,
    awardWinners,
    allTimeLeaders,
    hallOfFamers,
    records,
    moments,
    retiredJerseys,
    stadiums,

    getTeamHistory,
    getTeamRetiredJerseys,
    getAwardsByYear,
    getAwardsByPlayer,
    getRecordsByCategory,

    addChampionship,
    addAwardWinner,
    addHallOfFamer,
    removeFromHallOfFame,
    addMoment,
    removeLegendaryMoment,
    addRetiredJersey,
    removeJersey,
    updateRecord,
    updateAllTimeLeader,
    updateStadium,

    refresh: loadData,
    seedMockData,
  };
}

export default useMuseumData;
