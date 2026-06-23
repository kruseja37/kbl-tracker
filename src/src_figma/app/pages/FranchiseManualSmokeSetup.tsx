import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FRANCHISE_MANUAL_SMOKE_LEAGUE_ID,
  prepareFranchiseManualSmokeFixture,
  type FranchiseManualSmokeFixtureReport,
} from '../../../utils/franchiseManualSmokeFixture';

export function FranchiseManualSmokeSetup() {
  const [report, setReport] = useState<FranchiseManualSmokeFixtureReport | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePrepare = async () => {
    setStatus('running');
    setError(null);
    try {
      const nextReport = await prepareFranchiseManualSmokeFixture({ forceReset: true });
      setReport(nextReport);
      setStatus(nextReport.prepared ? 'done' : 'error');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <main className="min-h-screen bg-[#0E1116] text-[#F4F1DE] font-['Press_Start_2P'] px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border border-[#3A3F4B] bg-[#161A22] p-4">
          <div className="text-[10px] uppercase text-[#F2CC8F]">DEV / TEST PREVIEW ONLY</div>
          <h1 className="text-lg uppercase">Mode 1/2 Manual Smoke Setup</h1>
          <p className="font-sans text-sm leading-6 text-[#C9D1D9]">
            Prepares a named League Builder smoke league with six teams, 22 MLB players per team,
            10 hidden-safe FARM prospects per team, and one hired scout per team. This is not product
            auto-draft and is not part of normal Franchise gameplay.
          </p>
          <div className="font-sans text-xs text-[#E0E0CF]">
            Namespace: <span className="font-bold">{FRANCHISE_MANUAL_SMOKE_LEAGUE_ID}</span>
          </div>
        </header>

        <section className="border border-[#3A3F4B] bg-[#11151C] p-4">
          <div className="mb-3 text-xs uppercase text-[#A9BCD0]">Manual smoke fixture action</div>
          <button
            type="button"
            onClick={handlePrepare}
            disabled={status === 'running'}
            className="min-h-11 border border-[#F2CC8F] bg-[#F2CC8F] px-4 py-3 text-[10px] uppercase text-[#11151C] disabled:opacity-50"
          >
            {status === 'running' ? 'Preparing...' : 'Prepare Smoke League'}
          </button>
          <p className="mt-3 font-sans text-xs leading-5 text-[#B8C0CC]">
            This overwrites only the named manual-smoke-v1 League Builder records. It does not create a
            Franchise, schedule, GameTracker result, random event, morale effect, or Mode 3/offseason state.
          </p>
        </section>

        {error ? (
          <section className="border border-[#E07A5F] bg-[#251719] p-4 text-xs text-[#FFD6CC]">
            {error}
          </section>
        ) : null}

        {report ? (
          <section className="border border-[#3A3F4B] bg-[#161A22] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="border border-[#81B29A] px-2 py-1 text-[10px] uppercase text-[#A7F3C1]">
                {report.prepared ? 'Prepared' : 'Blocked'}
              </span>
              <span className="text-[10px] uppercase text-[#C9D1D9]">
                {report.teamCount} teams · {report.createdMlbPlayers} MLB · {report.createdFarmPlayers} FARM · {report.hiredScouts} scouts
              </span>
            </div>

            {report.blockers.length > 0 ? (
              <div className="mb-3 font-sans text-xs text-[#FFD6CC]">
                {report.blockers.join(' ')}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {report.teamSummaries.map((team) => (
                <div key={team.teamId} className="border border-[#2F3540] bg-[#0E1116] p-3">
                  <div className="text-[10px] uppercase text-[#F4F1DE]">{team.teamName}</div>
                  <div className="mt-2 font-sans text-xs leading-5 text-[#C9D1D9]">
                    <div>Stadium: {team.stadium}</div>
                    <div>MLB {team.mlbPlayers}/22 · FARM {team.farmPlayers}/10 · Scouts {team.hiredScouts}/1</div>
                    <div>Payroll baseline: ${(team.payroll / 1_000_000).toFixed(1)}M</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link className="border border-[#81B29A] px-3 py-2 text-[10px] uppercase text-[#A7F3C1]" to="/franchise/setup">
                Open Franchise Setup
              </Link>
              <Link className="border border-[#A9BCD0] px-3 py-2 text-[10px] uppercase text-[#D8E7FF]" to="/league-builder/draft">
                Inspect Draft Readiness
              </Link>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
