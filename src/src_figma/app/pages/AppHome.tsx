import { Link } from "react-router";
import { Trophy, Gamepad2, Users, Globe, Database } from "lucide-react";

export function AppHome() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* SNES-style header */}
      <div className="max-w-4xl mx-auto">
        {/* Upper left corner text */}
        <div className="mb-8">
          <div className="text-[#0066FF] text-xs tracking-widest">KRUSE FAMILY</div>
          <div className="text-[#FF0000] text-lg tracking-wide">BASEBALL</div>
        </div>

        <div className="text-center mb-12">
          {/* Title box with SNES aesthetic */}
          <div className="bg-white border-[8px] border-[#0066FF] p-8 mb-8 inline-block shadow-[8px_8px_0px_0px_#FF0000]">
            <div className="text-3xl text-[#FF0000] mb-1 tracking-wide">SUPER MEGA</div>
            <div className="text-4xl text-[#0066FF] mb-3 tracking-wide">BASEBALL</div>
            <div className="text-sm text-black tracking-widest border-t-4 border-[#0066FF] pt-3">STAT TRACKER</div>
          </div>
        </div>

        {/* Menu buttons with SNES styling */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <Link
            to="/franchise/select"
            className="bg-[#5599FF] h-[71.102px] relative block w-full"
          >
            <div aria-hidden="true" className="absolute border-[#3366CC] border-[5.556px] border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start pb-[5.556px] pt-[21.554px] px-[21.554px] relative size-full">
              <div className="flex gap-4 h-[27.995px] items-center w-full">
                <Gamepad2 className="w-4 h-4 text-black shrink-0" />
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-black tracking-[0.7px] uppercase flex-1">LOAD FRANCHISE</p>
                <p className="font-['Press_Start_2P'] leading-[28px] text-[20px] text-black">▶</p>
              </div>
            </div>
          </Link>

          <Link
            to="/franchise/setup"
            className="bg-[#3366FF] h-[71.102px] relative block w-full"
          >
            <div aria-hidden="true" className="absolute border-[#1A44BB] border-[5.556px] border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start pb-[5.556px] pt-[21.554px] px-[21.554px] relative size-full">
              <div className="flex gap-4 h-[27.995px] items-center w-full">
                <Trophy className="w-4 h-4 text-black shrink-0" />
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-black tracking-[0.7px] uppercase flex-1">NEW FRANCHISE</p>
                <p className="font-['Press_Start_2P'] leading-[28px] text-[20px] text-black">▶</p>
              </div>
            </div>
          </Link>

          <Link
            to="/exhibition"
            className="bg-[#7733DD] h-[71.102px] relative block w-full"
          >
            <div aria-hidden="true" className="absolute border-[#5522AA] border-[5.556px] border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start pb-[5.556px] pt-[21.554px] px-[21.554px] relative size-full">
              <div className="flex gap-4 h-[27.995px] items-center w-full">
                <Users className="w-4 h-4 text-black shrink-0" />
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-black tracking-[0.7px] uppercase flex-1">Exhibition Game</p>
                <p className="font-['Press_Start_2P'] leading-[28px] text-[20px] text-black">▶</p>
              </div>
            </div>
          </Link>

          <Link
            to="/world-series"
            className="bg-[#CC44CC] h-[71.102px] relative block w-full"
          >
            <div aria-hidden="true" className="absolute border-[#992299] border-[5.556px] border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start pb-[5.556px] pt-[21.554px] px-[21.554px] relative size-full">
              <div className="flex gap-4 h-[27.995px] items-center w-full">
                <Globe className="w-4 h-4 text-black shrink-0" />
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-black tracking-[0.7px] uppercase flex-1">PLAYOFFS</p>
                <p className="font-['Press_Start_2P'] leading-[28px] text-[20px] text-black">▶</p>
              </div>
            </div>
          </Link>

          <Link
            to="/league-builder"
            className="bg-[#DD0000] h-[71.102px] relative block w-full"
          >
            <div aria-hidden="true" className="absolute border-[#AA0000] border-[5.556px] border-solid inset-0 pointer-events-none shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)]" />
            <div className="content-stretch flex flex-col items-start pb-[5.556px] pt-[21.554px] px-[21.554px] relative size-full">
              <div className="flex gap-4 h-[27.995px] items-center w-full">
                <Database className="w-4 h-4 text-black shrink-0" />
                <p className="font-['Press_Start_2P'] leading-[20px] text-[14px] text-black tracking-[0.7px] uppercase flex-1">LEAGUE BUILDER</p>
                <p className="font-['Press_Start_2P'] leading-[28px] text-[20px] text-black">▶</p>
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