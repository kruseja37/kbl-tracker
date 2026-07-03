import { useState, useEffect } from "react";
import { Link } from "react-router";
import { SyncModal, SyncStatusIcon } from "../components/SyncModal";
import { useDataIntegrity } from "../../../hooks/useDataIntegrity";

export function AppHome() {
  const [syncOpen, setSyncOpen] = useState(false);
  const { status, recoverUnaggregatedGames } = useDataIntegrity();

  // Auto-recover unaggregated games on startup
  useEffect(() => {
    if (status.checked && (status.needsAggregation > 0 || status.hasErrors > 0)) {
      console.log(`[AppHome] Auto-recovering ${status.needsAggregation + status.hasErrors} unaggregated games`);
      recoverUnaggregatedGames().catch(console.error);
    }
  }, [status.checked, status.needsAggregation, status.hasErrors, recoverUnaggregatedGames]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* SNES-style header */}
      <div className="max-w-4xl mx-auto">
        {/* Upper left corner text */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="text-[#0066FF] text-xs tracking-widest">KRUSE FAMILY</div>
            <div className="text-[#FF0000] text-lg tracking-wide">BASEBALL</div>
          </div>
          <SyncStatusIcon onClick={() => setSyncOpen(true)} />
        </div>

        <SyncModal isOpen={syncOpen} onClose={() => setSyncOpen(false)} />

        <div className="text-center mb-12">
          {/* Title box with SNES aesthetic */}
          <div className="bg-white border-[8px] border-[#0066FF] p-8 mb-8 inline-block shadow-[8px_8px_0px_0px_#FF0000]">
            <div className="text-3xl text-[#FF0000] mb-1 tracking-wide">SUPER MEGA</div>
            <div className="text-4xl text-[#0066FF] mb-3 tracking-wide">BASEBALL</div>
            <div className="text-sm text-black tracking-widest border-t-4 border-[#0066FF] pt-3">STAT TRACKER</div>
          </div>
        </div>

        {/* Menu buttons with SNES styling */}
        <div className="space-y-4">
          <Link
            to="/franchise/select"
            className="bg-[#5599FF] h-[72px] relative block w-[260px]"
          >
            <div aria-hidden="true" className="absolute border-[#3366CC] border-4 border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start p-5 relative size-full">
              <div className="flex gap-4 h-7 items-center w-full">
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-white tracking-[0.7px] uppercase flex-1">Living Season</p>
              </div>
            </div>
          </Link>

          <Link
            to="/exhibition"
            className="bg-[#1A44CC] h-[72px] relative block w-[260px]"
          >
            <div aria-hidden="true" className="absolute border-[#113399] border-4 border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start p-5 relative size-full">
              <div className="flex gap-4 h-7 items-center w-full">
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-white tracking-[0.7px] uppercase flex-1">EXHIBITION</p>
              </div>
            </div>
          </Link>

          <Link
            to="/elimination/select"
            className="bg-[#7733DD] h-[72px] relative block w-[240px]"
          >
            <div aria-hidden="true" className="absolute border-[#5522AA] border-4 border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start p-5 relative size-full">
              <div className="flex gap-4 h-7 items-center w-full">
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-white tracking-[0.7px] uppercase flex-1">ELIMINATION</p>
              </div>
            </div>
          </Link>

          <Link
            to="/league-builder"
            className="bg-[#CC44CC] h-[72px] relative block w-[280px]"
          >
            <div aria-hidden="true" className="absolute border-[#992299] border-4 border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start p-5 relative size-full">
              <div className="flex gap-4 h-7 items-center w-full">
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-white tracking-[0.7px] uppercase flex-1">League Builder</p>
              </div>
            </div>
          </Link>

          <Link
            to="/almanac"
            className="bg-[#DD0000] h-[72px] relative block w-[240px]"
          >
            <div aria-hidden="true" className="absolute border-[#AA0000] border-4 border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start p-5 relative size-full">
              <div className="flex gap-4 h-7 items-center w-full">
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] tracking-[0.7px] uppercase flex-1 text-white">
                  ALMANAC
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Retro footer */}
        <div className="mt-16 text-center">
          <div className="bg-black border-4 border-[#808080] p-4 inline-block">
            <p className="text-[8px] text-white mb-2">◀ PRESS START ▶</p>
            <p className="text-[6px] text-[#808080]">v1.0 • KRUSE GAMING</p>
          </div>
        </div>
      </div>
    </div>
  );
}
