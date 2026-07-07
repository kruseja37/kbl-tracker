import { useState } from "react";
import { ClipboardList, Mic, Newspaper, ChevronRight, Shuffle } from "lucide-react";

/**
 * EndOfDraftStaffingPreview — end-of-draft staffing (roadmap §7.6), at
 * /__preview/staffing. Hire a MANAGER + a beat REPORTER for each human club
 * (CPU clubs auto-fill); optional draft-recap from the new reporter. Managers +
 * reporters are season staff hired AFTER the draft, BEFORE the freeze (the freeze
 * doesn't depend on them; hiring the reporter pre-freeze lets him cover the draft).
 * Mock-fed; the lazy creation moves into a per-team loop later.
 */

const MGR_STYLES = ["Balanced", "Aggressive", "Small-ball", "Old-school", "Analytics"];
const REP_PERSONAS = ["Straight shooter", "Homer", "Cynic", "Hype man", "Old hand"];
const REP_AVATARS = ["🎩", "🎧", "🧢"] as const;

interface Club { id: string; name: string; gm: string; mgr: string; mgrStyle: string; rep: string; repPersona: string; avatar: number }

export function EndOfDraftStaffingPreview() {
  const [clubs, setClubs] = useState<Club[]>([
    { id: "PC", name: "Page Capitals", gm: "You", mgr: "B. Cole", mgrStyle: "Balanced", rep: "J. Tate", repPersona: "Homer", avatar: 0 },
    { id: "BM", name: "Brass Monkeys", gm: "You", mgr: "R. Vance", mgrStyle: "Aggressive", rep: "D. Hale", repPersona: "Hype man", avatar: 1 },
  ]);
  const [recap, setRecap] = useState(true);

  const set = (id: string, patch: Partial<Club>) => setClubs((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const roll = (id: string) => {
    const first = ["Sal", "Mo", "Rico", "Pat", "Lee", "Gus", "Vic", "Ed"];
    const last = ["Briggs", "Nunez", "Park", "Cole", "Ward", "Hale", "Doss", "Krane"];
    const r = (a: string[]) => a[Math.floor(((id.charCodeAt(0) + Date.now()) % a.length))];
    set(id, { mgr: `${r(first)[0]}. ${r(last)}`, rep: `${r(first)[0]}. ${r(last)}` });
  };

  return (
    <div className="min-h-screen bg-[#243024] text-[#E8E8D8] p-6" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-[#C4A853]">END OF DRAFT · PREVIEW</div>
        <h1 className="text-2xl font-bold mb-1" style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.8)" }}>Staff Your Clubs</h1>
        <p className="text-sm text-[#E8E8D8]/65 mb-5 max-w-[74ch]">The draft's done — hire a <b className="text-[#E8E8D8]">manager</b> and a <b className="text-[#E8E8D8]">beat reporter</b> for your clubs before you freeze. (CPU clubs fill themselves.) Your reporter can cover the draft on his way in.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {clubs.map((c) => (
            <div key={c.id} className="bg-[#2d3d2f] border-4 border-[#4A6844] p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg font-bold text-[#E8E8D8]" style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.8)" }}>{c.name}</span>
                <span className="text-[11px] text-[#E8E8D8]/55">GM {c.gm}</span>
                <button type="button" onClick={() => roll(c.id)} className="ml-auto flex items-center gap-1 text-[11px] text-[#C4A853] hover:underline"><Shuffle className="w-3.5 h-3.5" /> roll names</button>
              </div>

              {/* manager */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#C4A853] mb-2"><ClipboardList className="w-3.5 h-3.5" /> MANAGER</div>
                <div className="flex flex-wrap gap-2">
                  <input value={c.mgr} onChange={(e) => set(c.id, { mgr: e.target.value })}
                    className="flex-1 min-w-[140px] bg-[#34472f] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]" />
                  <select value={c.mgrStyle} onChange={(e) => set(c.id, { mgrStyle: e.target.value })}
                    className="bg-[#34472f] border-2 border-[#4A6844] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]">
                    {MGR_STYLES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* reporter */}
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-[#C4A853] mb-2"><Mic className="w-3.5 h-3.5" /> BEAT REPORTER</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => set(c.id, { avatar: (c.avatar + 1) % REP_AVATARS.length })}
                    className="w-10 h-10 grid place-items-center text-xl bg-[#34472f] border-2 border-[#4A6844] hover:border-[#C4A853]">{REP_AVATARS[c.avatar]}</button>
                  <input value={c.rep} onChange={(e) => set(c.id, { rep: e.target.value })}
                    className="flex-1 min-w-[120px] bg-[#34472f] border-2 border-[#4A6844] focus:border-[#C4A853] outline-none px-3 py-2 text-sm font-bold text-[#E8E8D8]" />
                  <select value={c.repPersona} onChange={(e) => set(c.id, { repPersona: e.target.value })}
                    className="bg-[#34472f] border-2 border-[#4A6844] outline-none px-2 py-2 text-sm font-bold text-[#E8E8D8]">
                    {REP_PERSONAS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* optional draft recap */}
        <button type="button" onClick={() => setRecap((v) => !v)}
          className={`w-full flex items-center gap-3 border-4 px-4 py-3 text-left mb-5 ${recap ? "border-[#C4A853] bg-[#3a4d3c]" : "border-[#4A6844] bg-[#2d3d2f]"}`}>
          <Newspaper className={`w-5 h-5 ${recap ? "text-[#C4A853]" : "text-[#E8E8D8]/40"}`} />
          <div className="flex-1">
            <div className="text-sm font-bold text-[#E8E8D8]">Have your reporters write a draft recap</div>
            <div className="text-[11px] text-[#E8E8D8]/55">An opening story for each club — who you landed, who got away.</div>
          </div>
          <span className={`w-10 h-6 border-2 flex items-center px-0.5 ${recap ? "border-[#C4A853] justify-end" : "border-[#4A6844] justify-start"}`}>
            <span className={`w-4 h-4 ${recap ? "bg-[#C4A853]" : "bg-[#E8E8D8]/30"}`} />
          </span>
        </button>

        <button type="button" className="flex items-center gap-2 bg-[#C4A853] hover:bg-[#D4B863] text-[#1A1A1A] border-[5px] border-[#E8E8D8] px-6 py-3 font-bold tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] active:scale-95">
          Confirm staff &amp; review freeze <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default EndOfDraftStaffingPreview;
