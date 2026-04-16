import { NewsBoard } from "../components/NewsBoard";
import type { CommentaryFeedEntry } from "../components/CommentaryFeed";

const previewEntries: CommentaryFeedEntry[] = [
  {
    id: "entry-b4-double",
    commentaryText:
      "Backman split the alley in right-center and that crowd found its lungs in a hurry.",
    halfInningLabel: "B4",
    timestamp: new Date("2026-04-15T19:24:00.000Z").getTime(),
    reporterId: "reporter-blowfish",
  },
  {
    id: "entry-b4-rbi",
    commentaryText:
      "The Blowfish cash in first in the fourth, and the home dugout suddenly looks two shades lighter.",
    halfInningLabel: "B4",
    timestamp: new Date("2026-04-15T19:22:00.000Z").getTime(),
    reporterId: "reporter-blowfish",
  },
  {
    id: "entry-t4-escape",
    commentaryText:
      "Noelle wriggled through the top half with the sort of cool face that makes a rally feel imaginary.",
    halfInningLabel: "T4",
    timestamp: new Date("2026-04-15T19:18:00.000Z").getTime(),
    reporterId: "reporter-blowfish",
  },
];

export function CommentaryFeedPreview() {
  return (
    <main
      className="min-h-screen px-6 py-10"
      style={{
        background:
          "radial-gradient(circle at top, #4A5B46 0%, #2E3A2C 48%, #1B231B 100%)",
        color: "#F5E8CF",
        fontFamily: "'Moms Typewriter', monospace",
      }}
    >
      <section
        className="mx-auto max-w-5xl"
        style={{
          border: "3px solid rgba(245, 232, 207, 0.44)",
          background:
            "linear-gradient(180deg, rgba(17, 22, 16, 0.78) 0%, rgba(25, 31, 24, 0.94) 100%)",
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.34)",
        }}
      >
        <div className="border-b border-[#556B55] px-6 py-5">
          <div
            className="mb-2 text-[0.8rem] uppercase tracking-[0.18em] text-[#CBB89C]"
            style={{ fontFamily: "'Tox Typewriter', monospace" }}
          >
            Reporter Feed Preview
          </div>
          <h1 className="m-0 text-[1.9rem] text-[#F2C041]">
            CommentaryFeed proof route
          </h1>
          <p className="mt-3 max-w-3xl text-[0.95rem] leading-6 text-[#d7d8c8]">
            Fixture-driven NewsBoard render with a live typewriter line at the
            top and a visible T4 to B4 inning break.
          </p>
        </div>

        <div className="grid min-h-[720px] grid-cols-[320px_1fr] gap-0">
          <NewsBoard
            currentBatterName="Harry Backman"
            currentBatterLine="2-for-3, 2 RBI, double in the 4th"
            currentPitcherName="Winnie Noelle"
            currentPitcherLine="6.1 IP, 3 H, 1 ER, 7 K"
            matchupSummary="vs Noelle: 4-for-11, 1 HR, 2 K"
            commentaryEntries={previewEntries}
            soundsOn={true}
          />

          <div className="flex items-center justify-center border-l-[3px] border-[#252b27] bg-[#243028] px-8 py-6 text-center text-[#88AA88]">
            <div>
              <div
                className="mb-3 text-[0.85rem] uppercase tracking-[0.16em] text-[#C4A853]"
                style={{ fontFamily: "'Tox Typewriter', monospace" }}
              >
                Preview Context
              </div>
              <p className="max-w-xl text-sm leading-6">
                Column 1 is the production target. The right pane stays simple on
                purpose so Claude can screenshot the feed without visual noise.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CommentaryFeedPreview;
