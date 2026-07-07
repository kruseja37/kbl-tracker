import { LineupPreview } from "@/app/components/LineupPreview";
import { MilestoneWatchPanel } from "@/app/components/MilestoneWatchPanel";
import { PregameBenchmarkChecklist } from "@/app/components/PregameBenchmarkChecklist";
import {
  getFranchisePregameReadiness,
  getFranchiseStarterHand,
  type FranchisePregameData,
} from "../utils/franchiseGameLaunch";
import { selectOptimalLineupForOpposingPitcher } from "../../../utils/optimalLineup";
import {
  buildPregameBenchmarkRows,
} from "../utils/pregameLineupBenchmarks";

export interface FranchisePregameLaunchOverlayProps {
  data: FranchisePregameData;
  onChange: (data: FranchisePregameData) => void;
  onBack: () => void;
  onLaunch: () => void;
  onRegisterBenchmarks?: () => void;
}

export function FranchisePregameLaunchOverlay({
  data,
  onChange,
  onBack,
  onLaunch,
  onRegisterBenchmarks,
}: FranchisePregameLaunchOverlayProps) {
  const awayStarter = data.awayPitchers[data.selectedAwayStarterIdx];
  const homeStarter = data.homePitchers[data.selectedHomeStarterIdx];
  const awayBenchmark = selectOptimalLineupForOpposingPitcher(data.awayOptimalLineups, homeStarter);
  const homeBenchmark = selectOptimalLineupForOpposingPitcher(data.homeOptimalLineups, awayStarter);
  const benchmarkRequirements = [
    {
      teamName: data.awayTeamName,
      opposingPitcherHand: getFranchiseStarterHand(homeStarter),
      dhEnabled: data.useDH,
      snapshot: awayBenchmark,
    },
    {
      teamName: data.homeTeamName,
      opposingPitcherHand: getFranchiseStarterHand(awayStarter),
      dhEnabled: data.useDH,
      snapshot: homeBenchmark,
    },
  ];
  const benchmarkRows = buildPregameBenchmarkRows(benchmarkRequirements);
  const readiness = getFranchisePregameReadiness(data);
  const readinessIssues = readiness.issues ?? [];
  const canLaunch = readiness.isReady;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-[var(--franchise-header)] border-[6px] border-[var(--franchise-border)] p-6 max-w-3xl w-full my-4">
        <div className="text-center mb-4">
          <div className="text-lg text-[var(--franchise-text)] font-bold mb-1" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}>
            PRE-GAME LINEUP
          </div>
          <div className="text-xs text-[var(--franchise-text)]/70">
            Game {data.gameNumber} &bull; {data.awayTeamName} @ {data.homeTeamName}
          </div>
          {readinessIssues.length > 0 && (
            <div
              className="mt-4 border-2 border-[var(--franchise-gold)] bg-[var(--franchise-shadow-darkest)] p-3 text-left text-[10px] text-[var(--franchise-text)]"
              data-testid="franchise-pregame-readiness"
            >
              <div className="mb-2 font-bold tracking-[0.16em] text-[var(--franchise-gold)]">
                LINEUP READINESS REQUIRED
              </div>
              <div className="text-[var(--franchise-text)]/75">
                {readinessIssues.join(" • ")}
              </div>
            </div>
          )}
          <PregameBenchmarkChecklist
            rows={benchmarkRows}
            onAction={canLaunch ? onRegisterBenchmarks : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-[9px] text-[var(--franchise-text)]/60 mb-1 uppercase tracking-wider">Away starter override</div>
            <select
              aria-label="Away starter override"
              value={data.selectedAwayStarterIdx}
              onChange={(e) => onChange({ ...data, selectedAwayStarterIdx: Number(e.target.value) })}
              className="w-full bg-[var(--franchise-panel-deep)] border-[3px] border-[var(--franchise-shadow-soft)] text-[var(--franchise-text)] text-xs px-2 py-2"
            >
              {data.awayPitchers.map((p, i) => (
                <option key={i} value={i}>{p.name} ({p.throwingHand})</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[9px] text-[var(--franchise-text)]/60 mb-1 uppercase tracking-wider">Home starter override</div>
            <select
              aria-label="Home starter override"
              value={data.selectedHomeStarterIdx}
              onChange={(e) => onChange({ ...data, selectedHomeStarterIdx: Number(e.target.value) })}
              className="w-full bg-[var(--franchise-panel-deep)] border-[3px] border-[var(--franchise-shadow-soft)] text-[var(--franchise-text)] text-xs px-2 py-2"
            >
              {data.homePitchers.map((p, i) => (
                <option key={i} value={i}>{p.name} ({p.throwingHand})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-4 text-center text-[10px] text-[var(--franchise-text)]/60">
          Lineup order and rotation source from Team Hub. Starter override is game-only.
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <LineupPreview
            teamName={data.awayTeamName}
            lineup={data.awayPlayers.filter((p) => p.battingOrder != null)}
            bench={data.awayPlayers.filter((p) => p.battingOrder == null)}
            startingPitcher={data.awayPitchers[data.selectedAwayStarterIdx]}
            teamColor="#E8E8D8"
            isAway
          />
          <LineupPreview
            teamName={data.homeTeamName}
            lineup={data.homePlayers.filter((p) => p.battingOrder != null)}
            bench={data.homePlayers.filter((p) => p.battingOrder == null)}
            startingPitcher={data.homePitchers[data.selectedHomeStarterIdx]}
            teamColor="#E8E8D8"
            isAway={false}
          />
        </div>

        <div className="mb-4">
          <MilestoneWatchPanel
            watches={data.milestoneWatches || []}
            isLoading={!data.milestoneWatches}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-[var(--franchise-border)] border-[5px] border-[var(--franchise-panel)] py-3 text-sm text-[var(--franchise-text)] hover:bg-[var(--franchise-panel-dark)] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={onLaunch}
            disabled={!canLaunch}
            className={`flex-[2] border-[5px] py-3 text-sm font-bold transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
              !canLaunch
                ? "border-[var(--franchise-border)] bg-[var(--franchise-panel-dark)] text-[var(--franchise-text)]/50 cursor-not-allowed"
                : "border-[var(--franchise-gold-bronze)] bg-[var(--franchise-gold)] text-[var(--franchise-field-ink)] hover:bg-[var(--franchise-gold-light)] active:scale-95"
            }`}
          >
            START GAME
          </button>
        </div>
      </div>
    </div>
  );
}
