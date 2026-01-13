// src/lib/background-seed.ts

/**
 * Generates a deterministic seed string or number for a user.
 * It attempts to use a persistent identifier from localStorage.
 */

const SEED_KEY = 'app_background_seed';

export function getBackgroundSeed(): string {
  if (typeof window === 'undefined') return 'default-seed';

  let seed = localStorage.getItem(SEED_KEY);

  if (!seed) {
    // Generate a simple random seed if non-existent
    seed = Math.random().toString(36).substring(2, 15);
    try {
      localStorage.setItem(SEED_KEY, seed);
    } catch (e) {
      // Storage might be full or disabled
      console.warn('Failed to persist background seed:', e);
    }
  }

  return seed;
}

/**
 * Converts a string seed into a numeric hash for use in GLSL or math functions.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
