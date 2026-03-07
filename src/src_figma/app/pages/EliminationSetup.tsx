import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronUp, Loader2, Trophy } from 'lucide-react';
import { useLeagueBuilderData, type LeagueTemplate, type Team } from '../../hooks/useLeagueBuilderData';
import { createElimination, updateElimination } from '../../../utils/eliminationManager';
import { createRosterSnapshots } from '../../../utils/eliminationRosterStorage';
import { createPlayoff, createSeries, startPlayoff, type PlayoffTeam } from '../../../utils/playoffStorage';
type HomeFieldPattern = '2-3-2' | '2-2-1-1-1' | 'Home throughout';
const STEP_LABELS = ['League', 'Settings', 'Control', 'Seeding', 'Confirm'];
const TEAM_OPTIONS = [4, 8, 16];
const SERIES_OPTIONS = [3, 5, 7];
function getValidTeamOptions(teamCount: number): number[] {
  return TEAM_OPTIONS.filter((option) => option <= teamCount);
}
function getRoundCount(teamCount: number): number {
  return teamCount > 0 ? Math.log2(teamCount) : 0;
}
function getRoundName(round: number, totalRounds: number): string {
  const names: Record<number, Record<number, string>> = {
    1: { 2: 'Semi-Finals', 3: 'Quarter-Finals', 4: 'First Round' },
    2: { 2: 'Championship', 3: 'Semi-Finals', 4: 'Quarter-Finals' },
    3: { 3: 'Championship', 4: 'Semi-Finals' },
    4: { 4: 'Championship' },
  };
  return names[round]?.[totalRounds] || `Round ${round}`;
}
function panelClasses(selected = false): string {
  return selected
    ? 'border-4 border-[#C4A853] bg-[#C4A853]/10'
    : 'border-4 border-[#E8E8D8] bg-[#4A6A42] hover:border-[#C4A853]';
}
function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-[#E8E8D8] mb-2 tracking-wide" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>{title}</h2>
      <p className="text-xs text-[#E8E8D8]/70">{subtitle}</p>
    </div>
  );
}
function ProgressHeader({ currentStep, setCurrentStep }: { currentStep: number; setCurrentStep: (step: number) => void }) {
  return (
    <div className="bg-[#4A6A42] border-b-[6px] border-[#E8E8D8] px-8 py-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-[#E8E8D8] tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>NEW ELIMINATION BRACKET</h1>
        <span className="text-sm text-[#E8E8D8]/80" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>Step {currentStep} of {STEP_LABELS.length}</span>
      </div>
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((_, index) => {
          const step = index + 1;
          const stateClass =
            step < currentStep
              ? 'bg-[#00CC00] border-[#00CC00] cursor-pointer hover:scale-110'
              : step === currentStep
                ? 'bg-[#C4A853] border-[#C4A853] animate-pulse'
                : 'bg-transparent border-[#8A9A82]';
          const barClass =
            step < currentStep
              ? 'bg-[#00CC00]'
              : step === currentStep
                ? 'bg-gradient-to-r from-[#C4A853] to-[#8A9A82]'
                : 'bg-[#8A9A82] opacity-30';
          return (
            <div key={step} className="flex items-center" style={{ flex: index < STEP_LABELS.length - 1 ? 1 : 0 }}>
              <button
                onClick={() => step < currentStep && setCurrentStep(step)}
                disabled={step > currentStep}
                className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${stateClass}`}
              >
                {step < currentStep ? <Check className="w-4 h-4 text-white" /> : <span className="text-xs text-[#4A6A42] font-bold">{step}</span>}
              </button>
              {index < STEP_LABELS.length - 1 && <div className={`h-1 mx-2 flex-1 ${barClass}`} />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2">
        {STEP_LABELS.map((label, index) => (
          <div key={label} className="text-[9px] text-[#E8E8D8]/70 text-center" style={{ flex: index < STEP_LABELS.length - 1 ? 1 : 0, width: index === STEP_LABELS.length - 1 ? '60px' : 'auto', textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{label}</div>
        ))}
      </div>
    </div>
  );
}
function StepLeagueSelection({
  leagues,
  teams,
  selectedLeagueId,
  onSelectLeague,
}: {
  leagues: LeagueTemplate[];
  teams: Team[];
  selectedLeagueId: string | null;
  onSelectLeague: (league: LeagueTemplate) => void;
}) {
  return (
    <div>
      <StepTitle title="SELECT A LEAGUE" subtitle="Choose the League Builder league to turn into an elimination bracket." />
      <div className="space-y-4">
        {leagues.map((league) => {
          const isSelected = selectedLeagueId === league.id;
          const leagueTeamCount = teams.filter((team) => league.teamIds.includes(team.id)).length;
          return (
            <button key={league.id} onClick={() => onSelectLeague(league)} className={`w-full p-4 text-left transition-all ${panelClasses(isSelected)}`}>
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-4 flex-shrink-0 mt-1 ${isSelected ? 'border-[#C4A853] bg-[#C4A853]' : 'border-[#E8E8D8] bg-transparent'}`}>
                  {isSelected && <div className="w-full h-full rounded-full bg-[#4A6A42] scale-50" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#E8E8D8] mb-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{league.name.toUpperCase()}</h3>
                  <div className="h-[1px] bg-[#E8E8D8]/30 mb-2" />
                  <p className="text-xs text-[#E8E8D8]/70">{leagueTeamCount} teams available</p>
                  <p className="text-xs text-[#E8E8D8]/50 mt-1">{league.conferences.length} conferences • {league.divisions.length} divisions</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function StepPlayoffSettings(props: {
  leagueTeams: Team[];
  validTeamOptions: number[];
  numTeams: number;
  setNumTeams: (value: number) => void;
  seriesLengths: number[];
  onSeriesLengthChange: (roundIndex: number, value: number) => void;
  homeFieldPattern: HomeFieldPattern;
  setHomeFieldPattern: (value: HomeFieldPattern) => void;
  inningsPerGame: number;
  setInningsPerGame: (value: number) => void;
  useDH: boolean;
  setUseDH: (value: boolean) => void;
}) {
  const { leagueTeams, validTeamOptions, numTeams, setNumTeams, seriesLengths, onSeriesLengthChange, homeFieldPattern, setHomeFieldPattern, inningsPerGame, setInningsPerGame, useDH, setUseDH } = props;
  const rounds = getRoundCount(numTeams);
  return (
    <div>
      <StepTitle title="PLAYOFF SETTINGS" subtitle="Set bracket size, series lengths, and game rules for this elimination run." />
      <div className="space-y-6">
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
          <div className="text-xs text-[#E8E8D8]/70 mb-3">Teams in bracket</div>
          {validTeamOptions.length > 0 ? (
            <div className="flex gap-3">
              {validTeamOptions.map((option) => (
                <button key={option} onClick={() => setNumTeams(option)} className={`px-4 py-2 border-4 font-bold text-sm transition-all ${numTeams === option ? 'border-[#C4A853] bg-[#C4A853] text-[#4A6A42]' : 'border-[#E8E8D8] bg-[#5A7A52] text-[#E8E8D8] hover:border-[#C4A853]'}`}>{option}</button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#DD0000]">This league needs at least 4 teams for an elimination bracket.</p>
          )}
          <p className="text-xs text-[#E8E8D8]/50 mt-3">{leagueTeams.length} teams available in the selected league</p>
        </div>
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
          <div className="text-xs text-[#E8E8D8]/70 mb-3">Series lengths</div>
          <div className="space-y-3">
            {Array.from({ length: rounds }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="text-sm text-[#E8E8D8]">{getRoundName(index + 1, rounds)}</div>
                <div className="flex gap-2">
                  {SERIES_OPTIONS.map((option) => (
                    <button key={option} onClick={() => onSeriesLengthChange(index, option)} className={`px-3 py-1 border-2 text-xs font-bold transition-all ${seriesLengths[index] === option ? 'border-[#C4A853] bg-[#C4A853] text-[#4A6A42]' : 'border-[#E8E8D8] text-[#E8E8D8] hover:border-[#C4A853]'}`}>Best of {option}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
            <label className="block text-xs text-[#E8E8D8]/70 mb-2">Home field pattern</label>
            <select value={homeFieldPattern} onChange={(event) => setHomeFieldPattern(event.target.value as HomeFieldPattern)} className="w-full bg-[#5A7A52] border-2 border-[#E8E8D8] text-[#E8E8D8] px-3 py-2 text-sm">
              <option>2-3-2</option>
              <option>2-2-1-1-1</option>
              <option>Home throughout</option>
            </select>
          </div>
          <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
            <label className="block text-xs text-[#E8E8D8]/70 mb-2">Innings per game</label>
            <input type="number" min={3} max={9} value={inningsPerGame} onChange={(event) => setInningsPerGame(Math.max(3, Math.min(9, Number(event.target.value) || 9)))} className="w-full bg-[#5A7A52] border-2 border-[#E8E8D8] text-[#E8E8D8] px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#E8E8D8]">Designated hitter</div>
            <div className="text-xs text-[#E8E8D8]/60 mt-1">Set the DH rule used for every game in this bracket.</div>
          </div>
          <div className="flex gap-2">
            {[
              { label: 'ON', value: true },
              { label: 'OFF', value: false },
            ].map((option) => (
              <button key={option.label} onClick={() => setUseDH(option.value)} className={`px-4 py-2 border-2 text-xs font-bold ${useDH === option.value ? 'border-[#C4A853] bg-[#C4A853] text-[#4A6A42]' : 'border-[#E8E8D8] text-[#E8E8D8]'}`}>{option.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function StepTeamControl({
  leagueTeams,
  controlledTeamIds,
  onToggleControlled,
}: {
  leagueTeams: Team[];
  controlledTeamIds: string[];
  onToggleControlled: (teamId: string) => void;
}) {
  return (
    <div>
      <StepTitle title="TEAM CONTROL" subtitle="Choose which teams are Human versus Observe for narrative framing in v1." />
      <div className="space-y-3">
        {leagueTeams.map((team) => {
          const isControlled = controlledTeamIds.includes(team.id);
          return (
            <div key={team.id} className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-[#E8E8D8]">{team.name}</div>
                <div className="text-xs text-[#E8E8D8]/60 mt-1">{team.abbreviation} • {team.stadium}</div>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Human', active: isControlled, nextState: true },
                  { label: 'Observe', active: !isControlled, nextState: false },
                ].map((option) => (
                  <button key={option.label} onClick={() => option.nextState !== isControlled && onToggleControlled(team.id)} className={`px-4 py-2 border-2 text-xs font-bold ${option.active ? 'border-[#C4A853] bg-[#C4A853] text-[#4A6A42]' : 'border-[#E8E8D8] text-[#E8E8D8]'}`}>{option.label}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function StepSeeding({
  seededTeams,
  onMoveSeed,
}: {
  seededTeams: Team[];
  onMoveSeed: (index: number, direction: 'up' | 'down') => void;
}) {
  const bracketPreview = useMemo(() => {
    const pairs: Array<{ higher: { seed: number; team: Team }; lower: { seed: number; team: Team } }> = [];
    for (let index = 0; index < seededTeams.length / 2; index += 1) {
      const higher = seededTeams[index];
      const lower = seededTeams[seededTeams.length - 1 - index];
      if (higher && lower) pairs.push({ higher: { seed: index + 1, team: higher }, lower: { seed: seededTeams.length - index, team: lower } });
    }
    return pairs;
  }, [seededTeams]);
  return (
    <div>
      <StepTitle title="SET BRACKET SEEDING" subtitle="Use the up/down controls to reorder seeds. Matchups update live below." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {seededTeams.map((team, index) => (
            <div key={team.id} className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#E8E8D8]/60 mb-1">Seed #{index + 1}</div>
                <div className="text-sm font-bold text-[#E8E8D8]">{team.name}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onMoveSeed(index, 'up')} disabled={index === 0} className="p-2 border-2 border-[#E8E8D8] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#C4A853]"><ChevronUp className="w-4 h-4 text-[#E8E8D8]" /></button>
                <button onClick={() => onMoveSeed(index, 'down')} disabled={index === seededTeams.length - 1} className="p-2 border-2 border-[#E8E8D8] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#C4A853]"><ChevronDown className="w-4 h-4 text-[#E8E8D8]" /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
          <div className="text-xs text-[#E8E8D8]/70 mb-3">Round 1 preview</div>
          <div className="space-y-3">
            {bracketPreview.map((pair, index) => (
              <div key={`${pair.higher.team.id}-${pair.lower.team.id}`} className="border-2 border-[#E8E8D8]/40 p-3 bg-[#5A7A52]">
                <div className="text-sm text-[#E8E8D8]">Matchup {index + 1}</div>
                <div className="text-xs text-[#E8E8D8]/70 mt-2">#{pair.higher.seed} {pair.higher.team.name}</div>
                <div className="text-xs text-[#E8E8D8]/50">vs</div>
                <div className="text-xs text-[#E8E8D8]/70">#{pair.lower.seed} {pair.lower.team.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function StepConfirm(props: {
  selectedLeague: LeagueTemplate | null;
  bracketName: string;
  setBracketName: (value: string) => void;
  numTeams: number;
  totalRounds: number;
  seriesLengths: number[];
  inningsPerGame: number;
  useDH: boolean;
  homeFieldPattern: HomeFieldPattern;
  controlledCount: number;
}) {
  const { selectedLeague, bracketName, setBracketName, numTeams, totalRounds, seriesLengths, inningsPerGame, useDH, homeFieldPattern, controlledCount } = props;
  return (
    <div>
      <StepTitle title="CONFIRM AND NAME" subtitle="Review the bracket details, set a name, then start playoffs." />
      <div className="space-y-6">
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
          <label className="block text-xs text-[#E8E8D8]/70 mb-2">Bracket name</label>
          <input type="text" value={bracketName} onChange={(event) => setBracketName(event.target.value)} className="w-full bg-[#5A7A52] border-2 border-[#E8E8D8] text-[#E8E8D8] px-3 py-2 text-sm" placeholder={selectedLeague ? `${selectedLeague.name} Playoffs` : 'Bracket name'} />
        </div>
        <div className="border-4 border-[#E8E8D8] bg-[#4A6A42] p-4">
          <div className="text-xs text-[#E8E8D8]/70 mb-3">Setup summary</div>
          <div className="space-y-2 text-sm text-[#E8E8D8]">
            <div>League: {selectedLeague?.name ?? 'None selected'}</div>
            <div>Teams in bracket: {numTeams}</div>
            <div>Rounds: {totalRounds}</div>
            <div>Series lengths: {seriesLengths.map((value) => `Best of ${value}`).join(' • ')}</div>
            <div>Innings per game: {inningsPerGame}</div>
            <div>DH rule: {useDH ? 'On' : 'Off'}</div>
            <div>Home field: {homeFieldPattern}</div>
            <div>Human-controlled teams: {controlledCount}</div>
          </div>
        </div>
        <div className="border-4 border-[#C4A853] bg-[#C4A853]/10 p-4">
          <div className="text-sm font-bold text-[#E8E8D8] mb-2">What happens next</div>
          <div className="text-xs text-[#E8E8D8]/70 space-y-1">
            <div>1. An elimination slot is created in app meta storage.</div>
            <div>2. A playoff bracket is created in `kbl-playoffs`.</div>
            <div>3. Round 1 series are generated from the current seeding.</div>
            <div>4. The bracket opens in Elimination Home.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function EliminationSetup() {
  const navigate = useNavigate();
  const { leagues, teams, isLoading, error, seedSMB4Data } = useLeagueBuilderData();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [numTeams, setNumTeams] = useState(4);
  const [seriesLengths, setSeriesLengths] = useState<number[]>([7, 7]);
  const [homeFieldPattern, setHomeFieldPattern] = useState<HomeFieldPattern>('2-3-2');
  const [inningsPerGame, setInningsPerGame] = useState(9);
  const [useDH, setUseDH] = useState(true);
  const [controlledTeamIds, setControlledTeamIds] = useState<string[]>([]);
  const [seededTeamIds, setSeededTeamIds] = useState<string[]>([]);
  const [bracketName, setBracketName] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const autoSeedAttempted = useRef(false);
  useEffect(() => {
    if (!isLoading && !error && leagues.length === 0 && !autoSeedAttempted.current) {
      autoSeedAttempted.current = true;
      seedSMB4Data(false).catch((err) => console.error('[EliminationSetup] Auto-seed failed:', err));
    }
  }, [isLoading, error, leagues.length, seedSMB4Data]);
  const selectedLeague = useMemo(() => leagues.find((league) => league.id === selectedLeagueId) ?? null, [leagues, selectedLeagueId]);
  const leagueTeams = useMemo(() => (!selectedLeague ? [] : teams.filter((team) => selectedLeague.teamIds.includes(team.id)).sort((a, b) => a.name.localeCompare(b.name))), [selectedLeague, teams]);
  const validTeamOptions = useMemo(() => getValidTeamOptions(leagueTeams.length), [leagueTeams.length]);
  const totalRounds = getRoundCount(numTeams);
  useEffect(() => {
    if (validTeamOptions.length === 0) {
      setNumTeams(0);
      setSeriesLengths([]);
      return;
    }
    setNumTeams((current) => (validTeamOptions.includes(current) ? current : validTeamOptions[validTeamOptions.length - 1]));
  }, [validTeamOptions]);
  useEffect(() => {
    if (!selectedLeague) {
      setControlledTeamIds([]);
      setSeededTeamIds([]);
      setBracketName('');
      return;
    }
    setControlledTeamIds(leagueTeams.map((team) => team.id));
    setSeededTeamIds(leagueTeams.slice(0, numTeams).map((team) => team.id));
    setBracketName(`${selectedLeague.name} Playoffs`);
  }, [selectedLeague, leagueTeams, numTeams]);
  useEffect(() => {
    const rounds = getRoundCount(numTeams);
    setSeriesLengths(rounds === 0 ? [] : (current) => Array.from({ length: rounds }, (_, index) => current[index] ?? 7));
  }, [numTeams]);
  const seededTeams = useMemo(
    () => seededTeamIds.map((teamId) => leagueTeams.find((team) => team.id === teamId)).filter((team): team is Team => Boolean(team)),
    [seededTeamIds, leagueTeams]
  );
  const canProceed = currentStep === 1 ? selectedLeague !== null : currentStep === 5 ? bracketName.trim().length > 0 : true;
  const handleMoveSeed = (index: number, direction: 'up' | 'down') => {
    setSeededTeamIds((current) => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const handleStartPlayoffs = async () => {
    if (!selectedLeague || numTeams === 0 || seededTeams.length !== numTeams) {
      setInitError('Complete the setup steps before starting playoffs.');
      return;
    }
    setIsInitializing(true);
    setInitError(null);
    try {
      const elimination = await createElimination({
        name: bracketName.trim(),
        leagueId: selectedLeague.id,
        leagueName: selectedLeague.name,
        teamsCount: numTeams,
      });
      const eliminationId = elimination.eliminationId;
      const teamIds = seededTeams.map((team) => team.id);
      await createRosterSnapshots(eliminationId, teamIds);
      const playoffTeams: PlayoffTeam[] = seededTeams.map((team, index) => ({
        teamId: team.id,
        teamName: team.name,
        seed: index + 1,
        league: 'Eastern' as const,
        regularSeasonRecord: { wins: 0, losses: 0 },
        eliminated: false,
      }));
      const rounds = Math.log2(numTeams);
      const gamesPerRound = seriesLengths;
      const playoff = await createPlayoff({
        seasonNumber: 1,
        seasonId: `elimination-${eliminationId}`,
        status: 'NOT_STARTED',
        teamsQualifying: numTeams,
        rounds,
        gamesPerRound,
        inningsPerGame,
        useDH,
        leagues: ['Eastern'],
        conferenceChampionship: false,
        teams: playoffTeams,
        currentRound: 0,
        sourceType: 'elimination',
        eliminationId,
      });
      for (let index = 0; index < numTeams / 2; index += 1) {
        const higher = playoffTeams[index];
        const lower = playoffTeams[numTeams - 1 - index];
        await createSeries({
          playoffId: playoff.id,
          round: 1,
          roundName: getRoundName(1, rounds),
          higherSeed: { teamId: higher.teamId, teamName: higher.teamName, seed: higher.seed },
          lowerSeed: { teamId: lower.teamId, teamName: lower.teamName, seed: lower.seed },
          status: 'PENDING',
          gamesRequired: Math.ceil(gamesPerRound[0] / 2),
          bestOf: gamesPerRound[0],
          higherSeedWins: 0,
          lowerSeedWins: 0,
          games: [],
        });
      }
      await startPlayoff(playoff.id);
      await updateElimination(eliminationId, { status: 'IN_PROGRESS', currentRound: 1 });
      navigate(`/elimination/${eliminationId}`);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to start playoffs');
      setIsInitializing(false);
    }
  };
  const renderStep = () => {
    if (currentStep === 1) return <StepLeagueSelection leagues={leagues} teams={teams} selectedLeagueId={selectedLeagueId} onSelectLeague={(league) => { setSelectedLeagueId(league.id); setInitError(null); }} />;
    if (currentStep === 2) return <StepPlayoffSettings leagueTeams={leagueTeams} validTeamOptions={validTeamOptions} numTeams={numTeams} setNumTeams={setNumTeams} seriesLengths={seriesLengths} onSeriesLengthChange={(roundIndex, value) => setSeriesLengths((current) => current.map((item, index) => (index === roundIndex ? value : item)))} homeFieldPattern={homeFieldPattern} setHomeFieldPattern={setHomeFieldPattern} inningsPerGame={inningsPerGame} setInningsPerGame={setInningsPerGame} useDH={useDH} setUseDH={setUseDH} />;
    if (currentStep === 3) return <StepTeamControl leagueTeams={leagueTeams} controlledTeamIds={controlledTeamIds} onToggleControlled={(teamId) => setControlledTeamIds((current) => current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId])} />;
    if (currentStep === 4) return <StepSeeding seededTeams={seededTeams} onMoveSeed={handleMoveSeed} />;
    return <StepConfirm selectedLeague={selectedLeague} bracketName={bracketName} setBracketName={setBracketName} numTeams={numTeams} totalRounds={totalRounds} seriesLengths={seriesLengths} inningsPerGame={inningsPerGame} useDH={useDH} homeFieldPattern={homeFieldPattern} controlledCount={controlledTeamIds.length} />;
  };
  return (
    <div className="min-h-screen bg-[#6B9462] text-[#E8E8D8] flex items-center justify-center p-6">
      {isInitializing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-[#4A6A42] border-[6px] border-[#E8E8D8] p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
            <Loader2 className="w-12 h-12 animate-spin text-[#C4A853] mx-auto mb-4" />
            <p className="text-lg text-[#E8E8D8] font-bold tracking-wider" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>STARTING PLAYOFFS</p>
            <p className="text-xs text-[#E8E8D8]/70 mt-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.2)' }}>Building bracket structure and opening elimination mode...</p>
          </div>
        </div>
      )}
      <div className="w-full max-w-[800px] bg-[#5A7A52] border-[6px] border-[#E8E8D8] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
        {initError && (
          <div className="bg-[#DD0000]/20 border-b-4 border-[#DD0000] px-6 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#DD0000] shrink-0" />
            <p className="text-xs text-[#DD0000]">{initError}</p>
            <button onClick={() => setInitError(null)} className="ml-auto text-xs text-[#DD0000]/70 hover:text-[#DD0000]">[Dismiss]</button>
          </div>
        )}
        <ProgressHeader currentStep={currentStep} setCurrentStep={setCurrentStep} />
        <div className="p-8 min-h-[440px] max-h-[65vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#C4A853]" />
              <span className="ml-3 text-[#E8E8D8]">Loading leagues...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle className="w-8 h-8 text-[#DD0000] mb-3" />
              <p className="text-[#DD0000] mb-2">Failed to load League Builder data</p>
              <p className="text-xs text-[#E8E8D8]/70">{error}</p>
            </div>
          ) : leagues.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#C4A853] mb-3" />
              <p className="text-[#E8E8D8] mb-2">No leagues found yet</p>
              <p className="text-xs text-[#E8E8D8]/70">Auto-seeding SMB4 league data...</p>
            </div>
          ) : renderStep()}
        </div>
        <div className="border-t-[6px] border-[#E8E8D8] px-8 py-5 flex items-center justify-end gap-3 bg-[#4A6A42]">
          {currentStep > 1 && <button onClick={() => setCurrentStep((step) => step - 1)} className="px-6 py-3 bg-transparent border-4 border-[#E8E8D8] text-[#E8E8D8] hover:bg-[#E8E8D8]/10 transition-all active:scale-95 font-bold text-sm tracking-wide flex items-center gap-2" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}><ArrowLeft className="w-4 h-4" />BACK</button>}
          <button onClick={() => navigate('/elimination/select')} className="px-6 py-3 text-[#DD0000] hover:text-[#FF0000] transition-all font-bold text-sm tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}>
            CANCEL
          </button>
          <button
            onClick={() => currentStep < STEP_LABELS.length ? setCurrentStep((step) => step + 1) : void handleStartPlayoffs()}
            disabled={!canProceed || isLoading || leagues.length === 0 || isInitializing}
            className={`px-8 py-3 border-4 font-bold text-sm tracking-wide transition-all flex items-center gap-2 ${currentStep === STEP_LABELS.length ? 'border-[#E91E63] bg-[#E91E63] text-white hover:bg-[#D81B60] hover:border-[#D81B60] min-w-[220px] justify-center' : canProceed ? 'border-[#E8E8D8] bg-[#C4A853] text-[#4A6A42] hover:bg-[#B59A4A] active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]' : 'border-[#8A9A82] bg-[#3A5A32] text-[#8A9A82] cursor-not-allowed'}`}
            style={canProceed ? { textShadow: '1px 1px 0px rgba(0,0,0,0.2)' } : {}}
          >
            {currentStep === STEP_LABELS.length ? <><Trophy className="w-4 h-4" />START PLAYOFFS</> : <>NEXT<ArrowLeft className="w-4 h-4 rotate-180" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
