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
// EMPTY FALLBACKS (no mock data — shows empty state)
// ============================================

const EMPTY_CHAMPIONSHIPS: ChampionshipRecord[] = [];
const EMPTY_TEAM_RECORDS: TeamAllTimeRecord[] = [];
const EMPTY_AWARD_WINNERS: AwardWinner[] = [];
const EMPTY_ALL_TIME_LEADERS: AllTimeLeader[] = [];
const EMPTY_HALL_OF_FAME: HallOfFamer[] = [];
const EMPTY_RECORDS: LeagueRecord[] = [];
const EMPTY_MOMENTS: LegendaryMoment[] = [];
const EMPTY_RETIRED_JERSEYS: RetiredJersey[] = [];
const EMPTY_STADIUMS: StadiumData[] = [];

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

      setChampionships(champs.length > 0 ? champs : EMPTY_CHAMPIONSHIPS);
      setTeamRecords(teams.length > 0 ? teams : EMPTY_TEAM_RECORDS);
      setAwardWinners(awards.length > 0 ? awards : EMPTY_AWARD_WINNERS);
      setAllTimeLeaders(leaders.length > 0 ? leaders : EMPTY_ALL_TIME_LEADERS);
      setHallOfFamers(hof.length > 0 ? hof : EMPTY_HALL_OF_FAME);
      setRecords(recs.length > 0 ? recs : EMPTY_RECORDS);
      setMoments(moms.length > 0 ? moms : EMPTY_MOMENTS);
      setRetiredJerseys(jerseys.length > 0 ? jerseys : EMPTY_RETIRED_JERSEYS);
      setStadiums(stads.length > 0 ? stads : EMPTY_STADIUMS);

      setHasData(hasRealData);
    } catch (err) {
      console.error('[useMuseumData] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load museum data');

      // Use mock data on error
      setChampionships(EMPTY_CHAMPIONSHIPS);
      setTeamRecords(EMPTY_TEAM_RECORDS);
      setAwardWinners(EMPTY_AWARD_WINNERS);
      setAllTimeLeaders(EMPTY_ALL_TIME_LEADERS);
      setHallOfFamers(EMPTY_HALL_OF_FAME);
      setRecords(EMPTY_RECORDS);
      setMoments(EMPTY_MOMENTS);
      setRetiredJerseys(EMPTY_RETIRED_JERSEYS);
      setStadiums(EMPTY_STADIUMS);
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
      for (const champ of EMPTY_CHAMPIONSHIPS) {
        await saveChampionship(champ);
      }
      for (const team of EMPTY_TEAM_RECORDS) {
        await saveTeamRecord(team);
      }
      for (const award of EMPTY_AWARD_WINNERS) {
        await saveAwardWinner(award);
      }
      for (const leader of EMPTY_ALL_TIME_LEADERS) {
        await saveAllTimeLeader(leader);
      }
      for (const member of EMPTY_HALL_OF_FAME) {
        await saveHallOfFamer(member);
      }
      for (const rec of EMPTY_RECORDS) {
        await saveRecord(rec);
      }
      for (const moment of EMPTY_MOMENTS) {
        await saveMoment(moment);
      }
      for (const jersey of EMPTY_RETIRED_JERSEYS) {
        await saveRetiredJersey(jersey);
      }
      for (const stadium of EMPTY_STADIUMS) {
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
