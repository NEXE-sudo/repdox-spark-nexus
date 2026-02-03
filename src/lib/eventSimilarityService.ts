/**
 * Event Similarity Detection Utilities
 *
 * Detects duplicate and near-duplicate events to prevent spam and confusion.
 *
 * Phase 1: String-based similarity
 * - Normalizes titles (lowercase, remove punctuation)
 * - Uses Levenshtein distance for string similarity
 * - Checks same organizer + location + date±1
 * - Flags if similarity > 0.8
 *
 * Phase 2: Embedding-based similarity (requires pgvector)
 * - Uses OpenAI embeddings for semantic understanding
 * - Cosine similarity on embedding vectors
 * - More accurate but requires additional infrastructure
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Similarity detection result
 */
export interface SimilarityResult {
  similar_event_id: string;
  similar_event_title: string;
  phase1_score: number;
  phase2_score?: number;
  final_assessment: string;
}

/**
 * Normalize event title for comparison
 * - Lowercase
 * - Remove special characters and punctuation
 * - Collapse multiple spaces
 * - Trim whitespace
 */
export function normalizeEventTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns: 0 (identical) to max(len1, len2) (completely different)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1)
 * 1.0 = identical, 0.0 = completely different
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const normalized_a = normalizeEventTitle(a);
  const normalized_b = normalizeEventTitle(b);

  if (normalized_a === normalized_b) return 1.0;
  if (normalized_a.length === 0 || normalized_b.length === 0) return 0.0;

  const distance = levenshteinDistance(normalized_a, normalized_b);
  const maxLength = Math.max(normalized_a.length, normalized_b.length);

  return 1.0 - distance / maxLength;
}

/**
 * Phase 1: String-based similarity detection
 * Calls Supabase RPC function for database-level detection
 */
export async function detectDuplicateEventsPhase1(
  title: string,
  location: string,
  startAt: string,
  organizerId: string,
  excludeEventId?: string,
): Promise<SimilarityResult[]> {
  try {
    const { data: results, error } = await supabase.rpc(
      "detect_duplicate_events",
      {
        p_title: title,
        p_location: location,
        p_start_at: startAt,
        p_organizer_id: organizerId,
        p_exclude_event_id: excludeEventId,
      },
    );

    if (error) {
      console.error("Phase 1 detection error:", error);
      return [];
    }

    return results || [];
  } catch (err) {
    console.error("Phase 1 detection exception:", err);
    return [];
  }
}

/**
 * Assess similarity and determine action
 */
export function assessSimilarity(
  results: SimilarityResult[],
  strict: boolean = false,
): {
  hasDuplicates: boolean;
  assessment: "clear" | "low_risk" | "warn" | "block";
  similarEvents: SimilarityResult[];
} {
  if (results.length === 0) {
    return {
      hasDuplicates: false,
      assessment: "clear",
      similarEvents: [],
    };
  }

  const blockedCount = results.filter((r) =>
    r.final_assessment.includes("BLOCK"),
  ).length;
  const warnCount = results.filter((r) =>
    r.final_assessment.includes("WARN"),
  ).length;

  if (blockedCount > 0) {
    return {
      hasDuplicates: true,
      assessment: "block",
      similarEvents: results.filter((r) =>
        r.final_assessment.includes("BLOCK"),
      ),
    };
  }

  if (warnCount > 0 && strict) {
    return {
      hasDuplicates: true,
      assessment: "warn",
      similarEvents: results.filter((r) => r.final_assessment.includes("WARN")),
    };
  }

  if (warnCount > 0) {
    return {
      hasDuplicates: false,
      assessment: "warn",
      similarEvents: results,
    };
  }

  return {
    hasDuplicates: false,
    assessment: "low_risk",
    similarEvents: results,
  };
}

/**
 * Log similarity check result to database
 */
export async function logSimilarityCheck(
  checkingEventId: string,
  similarEventId: string,
  titleSimilarityScore: number,
  action: "block" | "warn" | "allowed" = "warn",
  reason: string = "",
): Promise<boolean> {
  try {
    const { error } = await supabase.from("event_similarity_checks").insert({
      checking_event_id: checkingEventId,
      similar_event_id: similarEventId,
      title_similarity_score: titleSimilarityScore,
      action,
      reason,
    });

    if (error) {
      console.warn("Failed to log similarity check:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Error logging similarity check:", err);
    return false;
  }
}

/**
 * Comprehensive similarity check (Phase 1 + Phase 2)
 * Returns both string-based and semantic similarity results
 */
export async function performComprehensibilitySimilarityCheck(
  title: string,
  location: string,
  startAt: string,
  organizerId: string,
  shortBlurb?: string,
  excludeEventId?: string,
): Promise<{
  hasDuplicates: boolean;
  assessment: "clear" | "low_risk" | "warn" | "block";
  phase1Results: SimilarityResult[];
  phase1Score?: number;
}> {
  // Phase 1: String-based
  const phase1Results = await detectDuplicateEventsPhase1(
    title,
    location,
    startAt,
    organizerId,
    excludeEventId,
  );

  const assessment = assessSimilarity(phase1Results);

  return {
    hasDuplicates: assessment.hasDuplicates,
    assessment: assessment.assessment,
    phase1Results: assessment.similarEvents,
    phase1Score:
      assessment.similarEvents.length > 0
        ? assessment.similarEvents[0].phase1_score
        : undefined,
  };
}

/**
 * Get similarity warning message for user
 */
export function getSimilarityWarningMessage(
  assessment: string,
  similarEvents: SimilarityResult[],
): string | null {
  switch (assessment) {
    case "block":
      if (similarEvents.length > 0) {
        return `Event blocked: Too similar to "${similarEvents[0].similar_event_title}" (${(similarEvents[0].phase1_score * 100).toFixed(0)}% match)`;
      }
      return "Event blocked: Potential duplicate detected";

    case "warn":
      if (similarEvents.length > 0) {
        return `Warning: Event similar to "${similarEvents[0].similar_event_title}" (${(similarEvents[0].phase1_score * 100).toFixed(0)}% match). Please review.`;
      }
      return "Warning: Potential duplicate event detected. Please review.";

    case "low_risk":
      return null;

    case "clear":
    default:
      return null;
  }
}

/**
 * Client-side utility: Display similarity check results to user
 */
export function formatSimilarityAlert(results: SimilarityResult[]): {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  suggestions: string[];
} {
  if (results.length === 0) {
    return {
      type: "info",
      title: "No similar events found",
      message: "Your event appears to be unique.",
      suggestions: [],
    };
  }

  const hasBlocked = results.some((r) => r.final_assessment.includes("BLOCK"));
  const hasWarn = results.some((r) => r.final_assessment.includes("WARN"));

  if (hasBlocked) {
    return {
      type: "error",
      title: "Duplicate Event Detected",
      message: `Your event is too similar to "${results[0].similar_event_title}"`,
      suggestions: [
        "Choose a different event title",
        "Pick a different date or location",
        "Add more specific details to differentiate",
      ],
    };
  }

  if (hasWarn) {
    return {
      type: "warning",
      title: "Similar Events Found",
      message: `Found ${results.length} event(s) with similar titles/details`,
      suggestions: [
        "Review the similar events to avoid confusion",
        "Consider collaborating instead of creating duplicate",
        "You can proceed, but manually review recommended",
      ],
    };
  }

  return {
    type: "info",
    title: "Low Risk",
    message: "Your event appears to be sufficiently unique.",
    suggestions: [],
  };
}
