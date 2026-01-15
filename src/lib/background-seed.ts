// src/lib/background-seed.ts

/**
 * Generates a deterministic seed string or number for a user.
 * Uses in-memory storage instead of localStorage.
 */

let cachedSeed: string | null = null;

export function getBackgroundSeed(): string {
  if (typeof window === 'undefined') return 'default-seed';

  // Return cached seed if already generated
  if (cachedSeed) {
    return cachedSeed;
  }

  // Generate a simple random seed
  cachedSeed = Math.random().toString(36).substring(2, 15);
  
  return cachedSeed;
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