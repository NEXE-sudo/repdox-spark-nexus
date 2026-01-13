import { useState, useEffect, useRef } from 'react';

export type FocusState = 'exploring' | 'reading' | 'idle';

export function useInteractionDensity() {
  const [focusState, setFocusState] = useState<FocusState>('idle');
  const lastScrollY = useRef(0);
  const lastInteractionTime = useRef(Date.now());
  const scrollVelocity = useRef(0);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY.current);
      scrollVelocity.current = delta;
      lastScrollY.current = currentScrollY;
      lastInteractionTime.current = Date.now();

      if (delta > 20) {
        setFocusState('exploring');
      } else {
        setFocusState('reading');
      }
    };

    const handleMouseMove = () => {
      lastInteractionTime.current = Date.now();
      if (focusState === 'idle') {
        setFocusState('reading');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const checkIdle = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionTime.current > 5000) {
        setFocusState('idle');
      }
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(checkIdle);
    };
  }, [focusState]);

  return { focusState, scrollVelocity: scrollVelocity.current };
}
