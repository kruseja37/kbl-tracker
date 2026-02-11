/**
 * SimulationOverlay - Animated play-by-play for simulated games
 *
 * Shows a full-screen overlay with scrolling play-by-play entries,
 * live score updates, and a FINAL card when complete.
 *
 * KBL retro green theme matching FranchiseHome.
 */

import { useState, useEffect, useRef } from 'react';
import type { PlayByPlayEntry } from '../../../utils/syntheticGameFactory';

interface SimulationOverlayProps {
  isOpen: boolean;
  playByPlay: PlayByPlayEntry[];
  awayTeamName: string;
  homeTeamName: string;
  finalAwayScore: number;
  finalHomeScore: number;
  onComplete: () => void;
}

export function SimulationOverlay({
  isOpen,
  playByPlay,
  awayTeamName,
  homeTeamName,
  finalAwayScore,
  finalHomeScore,
  onComplete,
}: SimulationOverlayProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Animate entries one by one
  useEffect(() => {
    if (!isOpen || playByPlay.length === 0) {
      setVisibleCount(0);
      setShowFinal(false);
      return;
    }

    setVisibleCount(0);
    setShowFinal(false);

    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= playByPlay.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen, playByPlay]);

  // Show FINAL card after all entries are visible
  useEffect(() => {
    if (visibleCount >= playByPlay.length && playByPlay.length > 0 && !showFinal) {
      const timer = setTimeout(() => setShowFinal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, playByPlay.length, showFinal]);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount, showFinal]);

  if (!isOpen) return null;

  // Get current scores from the latest visible entry
  const currentEntry = visibleCount > 0 ? playByPlay[visibleCount - 1] : null;
  const displayAwayScore = showFinal
    ? finalAwayScore
    : currentEntry?.awayScore ?? 0;
  const displayHomeScore = showFinal
    ? finalHomeScore
    : currentEntry?.homeScore ?? 0;

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
      <div className="w-full max-w-lg flex flex-col h-[80vh]">
        {/* Header */}
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
          <div className="text-[10px] text-[#C4A853] tracking-widest mb-2">
            {showFinal ? 'FINAL' : 'SIMULATING...'}
          </div>

          {/* Score display */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <div
                className="text-lg text-[#E8E8D8] font-bold"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {awayTeamName}
              </div>
            </div>

            <div className="text-center">
              <div
                className="text-3xl text-[#E8E8D8] font-bold tracking-wider"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {displayAwayScore} - {displayHomeScore}
              </div>
            </div>

            <div className="text-center">
              <div
                className="text-lg text-[#E8E8D8] font-bold"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {homeTeamName}
              </div>
            </div>
          </div>
        </div>

        {/* Play-by-play feed */}
        <div
          ref={scrollRef}
          className="flex-1 bg-[#4A6844] border-x-[5px] border-[#C4A853] overflow-y-auto p-3 space-y-1"
        >
          {playByPlay.slice(0, visibleCount).map((entry, i) => (
            <div
              key={i}
              className={`p-2 text-[10px] leading-relaxed border-l-4 ${
                entry.text.includes('HOME RUN')
                  ? 'bg-[#6B9462] border-[#C4A853] text-[#E8E8D8]'
                  : entry.text.includes('triple')
                    ? 'bg-[#5A8352] border-[#C4A853] text-[#E8E8D8]'
                    : 'bg-[#3F5A3A] border-[#5A8352] text-[#E8E8D8]/90'
              }`}
            >
              <span className="text-[#C4A853] mr-2">
                {entry.halfInning === 'TOP' ? '\u25B2' : '\u25BC'}{entry.inning}
              </span>
              {entry.text}
            </div>
          ))}

          {/* Loading indicator while entries are still appearing */}
          {visibleCount < playByPlay.length && (
            <div className="p-2 text-[10px] text-[#E8E8D8]/50 animate-pulse">
              ...
            </div>
          )}
        </div>

        {/* Footer / FINAL card */}
        <div className="bg-[#5A8352] border-[5px] border-[#C4A853] p-4 text-center">
          {showFinal ? (
            <div>
              <div className="text-[10px] text-[#C4A853] tracking-widest mb-2">
                GAME OVER
              </div>
              <div
                className="text-2xl text-[#E8E8D8] font-bold mb-3"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                {finalAwayScore > finalHomeScore ? awayTeamName : homeTeamName} WIN
              </div>
              <div className="text-[10px] text-[#E8E8D8]/80 mb-4">
                {awayTeamName} {finalAwayScore} - {homeTeamName} {finalHomeScore}
              </div>
              <button
                onClick={onComplete}
                className="bg-[#4A6844] border-[5px] border-[#C4A853] py-3 px-8 text-sm text-[#E8E8D8] hover:bg-[#3F5A3A] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              >
                CONTINUE
              </button>
            </div>
          ) : (
            <div className="text-[10px] text-[#E8E8D8]/60">
              {visibleCount} / {playByPlay.length} plays
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
