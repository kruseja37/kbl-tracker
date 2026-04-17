import React from "react";

const DEFAULT_WORD_DELAY_MS = 120;
const DEFAULT_CHAR_DELAY_MS = 20;

export interface CommentaryTypewriterProps {
  text: string;
  active?: boolean;
  wordDelayMs?: number;
  charDelayMs?: number;
  soundsOn?: boolean;
  onCharacterTyped?: () => void;
  className?: string;
}

function toWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function CommentaryTypewriter({
  text,
  active = false,
  wordDelayMs = DEFAULT_WORD_DELAY_MS,
  charDelayMs = DEFAULT_CHAR_DELAY_MS,
  soundsOn = false,
  onCharacterTyped,
  className,
}: CommentaryTypewriterProps) {
  const words = React.useMemo(() => toWords(text), [text]);
  const [visibleWordCount, setVisibleWordCount] = React.useState(
    active ? 0 : words.length,
  );
  const soundTimeoutsRef = React.useRef<number[]>([]);
  const shouldScheduleCharacterSounds = Boolean(onCharacterTyped);
  const emitCharacterTyped = React.useEffectEvent(() => {
    if (soundsOn) {
      onCharacterTyped?.();
    }
  });

  const clearPendingSoundTimeouts = React.useCallback(() => {
    soundTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    soundTimeoutsRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!active) {
      clearPendingSoundTimeouts();
      setVisibleWordCount(words.length);
      return undefined;
    }

    clearPendingSoundTimeouts();
    setVisibleWordCount(0);

    let cancelled = false;
    let nextWordIndex = 0;

    const revealNextWord = () => {
      if (cancelled || nextWordIndex >= words.length) {
        return;
      }

      const word = words[nextWordIndex];
      setVisibleWordCount(nextWordIndex + 1);

      if (shouldScheduleCharacterSounds) {
        Array.from(word.replace(/\s+/g, "")).forEach((character, characterIndex) => {
          if (!character.trim()) return;
          const timeoutId = window.setTimeout(() => {
            if (!cancelled) {
              emitCharacterTyped();
            }
          }, characterIndex * charDelayMs);
          soundTimeoutsRef.current.push(timeoutId);
        });
      }

      nextWordIndex += 1;
      if (nextWordIndex < words.length) {
        window.setTimeout(revealNextWord, wordDelayMs);
      }
    };

    const initialTimeout = window.setTimeout(revealNextWord, wordDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimeout);
      clearPendingSoundTimeouts();
    };
  }, [
    active,
    charDelayMs,
    clearPendingSoundTimeouts,
    shouldScheduleCharacterSounds,
    wordDelayMs,
    words,
  ]);

  const visibleText = React.useMemo(() => {
    if (!active) return text;
    return words.slice(0, visibleWordCount).join(" ");
  }, [active, text, visibleWordCount, words]);

  return <span className={className}>{visibleText}</span>;
}

export default CommentaryTypewriter;
