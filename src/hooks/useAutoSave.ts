import { useCallback, useEffect, useRef, useState } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function useAutoSave<T extends Record<string, any>>(key: string, value: T, options?: {
  debounceMs?: number;
  minSaveInterval?: number;
  onSaved?: (payload: T) => void;
}) {
  const debounceMs = options?.debounceMs ?? 600;
  const minSaveInterval = options?.minSaveInterval ?? 1000;
  const onSaved = options?.onSaved;

  const [state, setState] = useState<SaveState>('idle');
  const lastSavedRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const save = useCallback(async (payload: T) => {
    try {
      setState('saving');
      localStorage.setItem(key, JSON.stringify({ payload, savedAt: Date.now() }));
      lastSavedRef.current = Date.now();
      setState('saved');
      if (onSaved) onSaved(payload);
      // after short delay revert to idle to show "Saved" briefly
      window.setTimeout(() => setState('idle'), 1200);
    } catch (err) {
      console.error('Auto-save error', err);
      setState('error');
    }
  }, [key, onSaved]);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const elapsed = Date.now() - lastSavedRef.current;
    const doSave = () => save(value);

    if (elapsed >= minSaveInterval) {
      timerRef.current = window.setTimeout(doSave, debounceMs);
    } else {
      timerRef.current = window.setTimeout(doSave, minSaveInterval - elapsed + 10);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [value, debounceMs, minSaveInterval, save]);

  const load = useCallback((): { payload?: T; savedAt?: number } => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return { payload: parsed.payload as T, savedAt: parsed.savedAt };
    } catch (err) {
      console.error('Failed to load autosave', err);
      return {};
    }
  }, [key]);

  const manualSave = useCallback(() => save(value), [save, value]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState('idle');
    } catch (err) {
      console.error('Failed to clear autosave', err);
    }
  }, [key]);

  return { state, load, manualSave, clear } as const;
}
