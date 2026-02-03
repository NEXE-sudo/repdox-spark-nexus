/**
 * QR Token Generation and Verification Utilities
 *
 * Provides secure, tokenized QR codes for event check-in without exposing
 * raw registration IDs in the QR code data.
 *
 * Flow:
 * 1. Generate: registration_id → signed JWT token with expiry
 * 2. Encode: token → QR code data URL
 * 3. Scan: QR → token string
 * 4. Verify: validate signature, check expiry, mark checked-in
 */

import crypto from "crypto";

/**
 * QR Token payload
 */
export interface QRTokenPayload {
  registration_id: string;
  event_id?: string;
  created_at: number;
  expires_at: number;
}

/**
 * Generate a secure QR token (JWT-like)
 *
 * Token format: {payload}.{signature}
 * - Payload: Base64-encoded JSON with registration ID and expiry
 * - Signature: HMAC-SHA256 of payload with secret key
 */
export function generateQRToken(
  registrationId: string,
  expiresInHours: number = 24,
  eventId?: string,
): string {
  const secret =
    process.env.QR_TOKEN_SECRET ||
    process.env.VITE_QR_TOKEN_SECRET ||
    "dev-secret-key";

  if (!secret || secret === "dev-secret-key") {
    console.warn(
      "⚠️  QR_TOKEN_SECRET not set. Using insecure default. Set QR_TOKEN_SECRET env var in production.",
    );
  }

  const now = Date.now();
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;

  const payload: QRTokenPayload = {
    registration_id: registrationId,
    event_id: eventId,
    created_at: now,
    expires_at: expiresAt,
  };

  // Encode payload
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson).toString("base64url");

  // Sign payload
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");

  // Return: payload.signature
  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode QR token
 *
 * Returns decoded payload if valid, null if invalid or expired
 */
export function verifyQRToken(token: string): QRTokenPayload | null {
  try {
    const secret =
      process.env.QR_TOKEN_SECRET ||
      process.env.VITE_QR_TOKEN_SECRET ||
      "dev-secret-key";

    const [payloadB64, providedSignature] = token.split(".");

    if (!payloadB64 || !providedSignature) {
      console.warn("Invalid token format");
      return null;
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("hex");

    if (providedSignature !== expectedSignature) {
      console.warn("Token signature verification failed");
      return null;
    }

    // Decode payload
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: QRTokenPayload = JSON.parse(payloadJson);

    // Check expiry
    if (payload.expires_at < Date.now()) {
      console.warn("Token expired");
      return null;
    }

    return payload;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}

/**
 * Generate QR code data URL for embedding in HTML/image
 *
 * Uses QR code library to generate SVG or PNG
 * For production, use a library like `qrcode` or `qr-code`:
 * npm install qrcode
 */
export async function generateQRCodeDataURL(
  token: string,
  format: "svg" | "png" = "svg",
): Promise<string> {
  try {
    // Dynamically import qrcode library (only if available)
    const QRCode = (await import("qrcode")).default;

    if (format === "svg") {
      return await QRCode.toDataURL(token, {
        type: "image/svg+xml",
        width: 300,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    } else {
      // PNG
      return await QRCode.toDataURL(token, {
        type: "image/png",
        width: 300,
        margin: 1,
      });
    }
  } catch (err) {
    console.warn(
      "QR code generation not available. Install 'qrcode' package: npm install qrcode",
      err,
    );

    // Fallback: return data URL string (not actually a QR code)
    return `data:text/plain;base64,${Buffer.from(token).toString("base64")}`;
  }
}

/**
 * Generate check-in URL from token
 *
 * Returns URL that users can click to check in
 */
export function generateCheckInURL(token: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    "http://localhost:5173";

  return `${appUrl}/check-in/${token}`;
}

/**
 * Parse token from URL path
 *
 * Extract token from /check-in/{token} path
 */
export function extractTokenFromPath(path: string): string | null {
  const match = path.match(/\/check-in\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Generate registration QR metadata
 *
 * Comprehensive QR data including token, URL, and metadata
 */
export interface QRMetadata {
  token: string;
  url: string;
  registration_id: string;
  expires_at: string;
  created_at: string;
  qr_data_url?: string;
}

export async function generateQRMetadata(
  registrationId: string,
  expiresInHours?: number,
  eventId?: string,
  generateImage: boolean = false,
): Promise<QRMetadata> {
  const token = generateQRToken(registrationId, expiresInHours, eventId);
  const url = generateCheckInURL(token);
  const decoded = verifyQRToken(token);

  const metadata: QRMetadata = {
    token,
    url,
    registration_id: registrationId,
    expires_at: new Date(decoded!.expires_at).toISOString(),
    created_at: new Date(decoded!.created_at).toISOString(),
  };

  if (generateImage) {
    metadata.qr_data_url = await generateQRCodeDataURL(url, "svg");
  }

  return metadata;
}

/**
 * Validate token and return registration info
 *
 * Used during check-in process
 */
export function validateCheckInToken(token: string): {
  valid: boolean;
  registration_id?: string;
  expires_at?: string;
  message: string;
} {
  if (!token) {
    return {
      valid: false,
      message: "No token provided",
    };
  }

  const payload = verifyQRToken(token);

  if (!payload) {
    return {
      valid: false,
      message: "Invalid or expired token",
    };
  }

  return {
    valid: true,
    registration_id: payload.registration_id,
    expires_at: new Date(payload.expires_at).toISOString(),
    message: "Token valid",
  };
}

/**
 * Token expiry helpers
 */
export function getTokenExpiryInfo(token: string): {
  expired: boolean;
  remaining_hours?: number;
  expires_at: string;
} {
  const payload = verifyQRToken(token);

  if (!payload) {
    return {
      expired: true,
      expires_at: "unknown",
    };
  }

  const expiresAt = new Date(payload.expires_at);
  const now = new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));

  return {
    expired: remainingMs <= 0,
    remaining_hours: Math.max(0, remainingHours),
    expires_at: expiresAt.toISOString(),
  };
}

/**
 * Batch generate QR codes for multiple registrations
 *
 * Useful for bulk check-in printing
 */
export async function batchGenerateQRMetadata(
  registrationIds: string[],
  expiresInHours?: number,
): Promise<QRMetadata[]> {
  return Promise.all(
    registrationIds.map((id) =>
      generateQRMetadata(id, expiresInHours, undefined, false),
    ),
  );
}

/**
 * Client-side utility: Handle QR code scan result
 *
 * Parse and validate token from scanned data
 */
export async function handleQRScan(scannedData: string): Promise<{
  success: boolean;
  token?: string;
  registration_id?: string;
  error?: string;
}> {
  try {
    // Extract token from URL if it's a full URL
    let token = scannedData;
    if (scannedData.includes("/check-in/")) {
      token = extractTokenFromPath(scannedData) || scannedData;
    }

    const validation = validateCheckInToken(token);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.message,
      };
    }

    return {
      success: true,
      token,
      registration_id: validation.registration_id,
    };
  } catch (err) {
    return {
      success: false,
      error: `Scan error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Production checklist
 *
 * Before deploying to production:
 * ✓ Set QR_TOKEN_SECRET environment variable (strong random value)
 * ✓ Install qrcode package: npm install qrcode
 * ✓ Configure check-in URL pattern in your app
 * ✓ Test token generation and verification
 * ✓ Test QR code scanning with mobile devices
 * ✓ Implement check-in endpoint (/api/qr/verify)
 * ✓ Add logging for check-in attempts
 * ✓ Configure cache headers (1 hour for QR metadata)
 */
