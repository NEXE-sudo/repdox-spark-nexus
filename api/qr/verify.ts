/**
 * API Route: POST /api/qr/verify
 * Verifies a QR token and marks registration as checked in
 *
 * Security:
 * - Validates QR token signature and expiry
 * - Prevents token reuse
 * - Updates registration status to checked_in
 * - Rate limited by Vercel Edge Middleware
 *
 * Request body:
 * {
 *   qr_token: string
 * }
 *
 * Response:
 * {
 *   checked_in: true,
 *   registration_id: uuid,
 *   event_id: uuid,
 *   attendee_name: string,
 *   message: string
 * }
 */

import { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
 * Verify and decode QR token (same logic as generate.ts)
 */
function verifyQRToken(
  token: string,
): { registration_id: string; expires_at: number } | null {
  try {
    const secret = process.env.QR_TOKEN_SECRET || "your-secret-key";
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) return null;

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadStr);

    // Check expiry
    if (payload.expires_at < Date.now()) {
      return null; // Token expired
    }

    return {
      registration_id: payload.registration_id,
      expires_at: payload.expires_at,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. VALIDATE REQUEST
    const { qr_token } = req.body;

    if (!qr_token) {
      return res.status(400).json({
        error: "Missing required field: qr_token",
      });
    }

    // 2. VERIFY TOKEN
    const decoded = verifyQRToken(qr_token);

    if (!decoded) {
      return res.status(401).json({
        error: "Invalid or expired QR token",
        code: "invalid_token",
      });
    }

    const { registration_id } = decoded;

    // 3. FETCH REGISTRATION
    const { data: registration, error: regError } = await supabase
      .from("event_registrations")
      .select("id, event_id, name, email, status, created_at")
      .eq("id", registration_id)
      .single();

    if (regError) {
      if (regError.code === "PGRST116") {
        return res.status(404).json({
          error: "Registration not found",
          code: "registration_not_found",
        });
      }
      console.error("Registration lookup error:", regError);
      return res.status(500).json({ error: "Failed to lookup registration" });
    }

    // 4. CHECK IF ALREADY CHECKED IN
    if (registration.status === "checked_in") {
      return res.status(409).json({
        error: "Already checked in",
        code: "already_checked_in",
        checked_in_at: registration.created_at, // Approximate
      });
    }

    // 5. UPDATE REGISTRATION STATUS
    const { error: updateError } = await supabase
      .from("event_registrations")
      .update({
        status: "checked_in",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration_id);

    if (updateError) {
      console.error("Check-in update error:", updateError);
      return res.status(500).json({
        error: "Failed to check in attendee",
        details: updateError.message,
      });
    }

    // 6. RETURN SUCCESS
    return res.status(200).json({
      checked_in: true,
      registration_id,
      event_id: registration.event_id,
      attendee_name: registration.name,
      attendee_email: registration.email,
      message: `${registration.name} checked in successfully`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
