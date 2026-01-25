import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoScrollOptions {
  itemCount: number;
  intervalMs?: number;
  pauseOnHover?: boolean;
  pauseOnFocus?: boolean;
}

export function useAutoScroll({
  itemCount,
  intervalMs = 7000,
  pauseOnHover = true,
  pauseOnFocus = true,
}: UseAutoScrollOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseReasonRef = useRef<Set<string>>(new Set());

  const pause = useCallback((reason: string) => {
    pauseReasonRef.current.add(reason);
    setIsPaused(true);
  }, []);

  const resume = useCallback((reason: string) => {
    pauseReasonRef.current.delete(reason);
    if (pauseReasonRef.current.size === 0) {
      setIsPaused(false);
    }
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % itemCount);
  }, [itemCount]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + itemCount) % itemCount);
  }, [itemCount]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (isPaused || itemCount <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goToNext, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, itemCount, intervalMs, goToNext]);

  return {
    currentIndex,
    isPaused,
    pause,
    resume,
    goToNext,
    goToPrev,
    goToIndex,
  };
}
