import { useState, useEffect, useRef } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
  compactFormatted: string;
}

export function useCountdown(targetDate: string): CountdownResult {
  const [timeLeft, setTimeLeft] = useState<CountdownResult>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    formatted: '',
    compactFormatted: '',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
          formatted: 'Event has started',
          compactFormatted: '00:00:00',
        };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const formatted = days > 0 
        ? `${days}d ${hours}h ${minutes}m ${seconds}s`
        : `${hours}h ${minutes}m ${seconds}s`;

      const compactFormatted = days > 0
        ? `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      return {
        days,
        hours,
        minutes,
        seconds,
        isExpired: false,
        formatted,
        compactFormatted,
      };
    };

    // Handle Page Visibility API to pause updates when tab is hidden
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (isVisibleRef.current) {
        // Update immediately when becoming visible
        setTimeLeft(calculateTimeLeft());
        
        // Restart interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
          if (isVisibleRef.current) {
            setTimeLeft(calculateTimeLeft());
          }
        }, 1000);
      } else {
        // Pause updates when hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Start interval only if page is visible
    if (!document.hidden) {
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          setTimeLeft(calculateTimeLeft());
        }
      }, 1000);
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [targetDate]);

  return timeLeft;
}
