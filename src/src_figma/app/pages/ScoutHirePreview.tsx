import { useState } from "react";
import { Check, Eye, Target } from "lucide-react";

/**
 * ScoutHirePreview — the scout-draft hire screen (roadmap §7.5), at
 * /__preview/scout-hire. Each team hires ONE scout from a shared pool (the scout-
 * draft phase, before the prospect draft); scouts go off the board as they're
 * taken. A better scout → a tighter draft read (narrower price bands, sharper
 * grades), especially within their specialty. Mock-fed; the built scout-draft
 * phase gets polished/wired here.
 */

interface Scout { id: string; name: string; specialty: string; accuracy: number; line: string }
const POOL: Scout[] = [
  { id: "s1", name: "Marisol Okafor", specialty: "Infielders", accuracy: 84, line: "Reads middle infielders like a book — tight on shortstops and second basemen." },
  { id: "s2", name: "Pete Nunn", specialty: "Arms", accuracy: 81, line: "An old pitching coach's eye; spots a future rotation arm before the radar does." },
  { id: "s3", name: "Lena Boyd", specialty: "Speed & glove", accuracy: 78, line: "Lives at the track meets — burners and leather are her thing." },
  { id: "s4", name: "Cyrus Vale", specialty: "Power", accuracy: 76, line: "Chases thump; loves a slugger, can overrate the all-or-nothing bat." },
  { id: "s5", name: "Dot Reyes", specialty: "Generalist", accuracy: 72, line: "No specialty, no blind spots — steady reads across the board." },
  { id: "s6", name: "Hal Crane", specialty: "Catchers", accuracy: 70, line: "A backstop man — frames, blocks, and game-calling others miss." },
];

export function ScoutHirePreview() {
  const [hired, setHired] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1040px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">SCOUT DRAFT · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Hire Your Scout</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[74ch]">Your scout is your draft guide — the better the read, the sharper your bargains and the fewer your traps, especially in their <b className="text-[#E8E8D8]">specialty</b>. Pick one; scouts come off the board as clubs take them.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {POOL.map((s) => {
            const isHired = hired === s.id;
            const taken = hired !== null && !isHired;
            return (
              <button key={s.id} type="button" disabled={taken} onClick={() => setHired(isHired ? null : s.id)}
                className={`relative text-left border-4 p-4 transition-transform active:scale-[0.99] ${
                  isHired ? "border-[#C4A853] bg-[#3a4d3c] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
                  : taken ? "border-[#4A6844]/50 bg-[#2a352b] opacity-50"
                  : "border-[#4A6844] bg-[#34472f] hover:bg-[#3a4d3c] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)]"}`}>
                {isHired && <span className="absolute top-2 right-2 flex items-center gap-1 bg-[#C4A853] text-[#1A1A1A] text-[9px] font-bold tracking-wider px-1.5 py-0.5"><Check className="w-2.5 h-2.5" /> YOUR SCOUT</span>}
                {taken && <span className="absolute top-2 right-2 text-[9px] font-bold tracking-wider text-[#E8E8D8]/40">OFF THE BOARD</span>}
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] text-[#C4A853] mb-2"><Target className="w-3 h-3" /> {s.specialty.toUpperCase()}</div>
                <div className="text-lg font-bold text-[#E8E8D8] pr-20" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{s.name}</div>
                <div className="text-[12px] text-[#E8E8D8]/65 leading-snug my-2 min-h-[48px]">{s.line}</div>
                {/* accuracy bar */}
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-[#9FE0A0]" />
                  <div className="flex-1 h-2 bg-[#243024] border border-[#4A6844]"><div className="h-full bg-[#9FE0A0]" style={{ width: `${s.accuracy}%` }} /></div>
                  <span className="text-[11px] font-bold text-[#9FE0A0]">{s.accuracy}</span>
                  <span className="text-[9px] text-[#E8E8D8]/40">eye</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="button" disabled={!hired} className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] disabled:opacity-40 text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
            Hire {hired ? POOL.find((p) => p.id === hired)!.name.split(" ")[0] : "a scout"}
          </button>
          {!hired && <span className="text-[11px] text-[#E8E8D8]/50">pick the scout whose eye fits your build</span>}
        </div>
      </div>
    </div>
  );
}

export default ScoutHirePreview;
