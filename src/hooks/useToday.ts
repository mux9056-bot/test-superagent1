import { useEffect, useRef, useState } from 'react';
import { nextMidnight, todayKey } from '../domain/date';

/**
 * Current local calendar date. Recomputes after local midnight and whenever the
 * page returns to the foreground, so date groups never go stale.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    function refresh() {
      setToday((previous) => {
        const next = todayKey();
        return next === previous ? previous : next;
      });
    }

    function schedule() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const delay = Math.max(1000, nextMidnight().getTime() - Date.now() + 1000);
      timerRef.current = window.setTimeout(() => {
        refresh();
        schedule();
      }, delay);
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        refresh();
        schedule();
      }
    }

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, []);

  return today;
}
