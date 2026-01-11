import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";

type UploadedFile = { file: File; name: string };
type FAQ = { question: string; answer: string };

export interface CreateEventPayload {
  form: {
    title: string;
    slug?: string;
    type?: string;
    format?: string;
    start_date: string; // YYYY-MM-DD
    start_time: string; // HH:mm
    end_date?: string;
    end_time?: string;
    registration_deadline_date?: string;
    registration_deadline_time?: string;
    location: string;
    short_blurb?: string;
    long_description?: string;
    overview?: string;
    rules?: string;
    registration_link?: string;
    discord_invite?: string;
    instagram_handle?: string;
  };
  tags?: string[];
  scheduleText?: string;
  teamsText?: string;
  prizeText?: string;
  faqs?: FAQ[];
  uploadedFiles?: UploadedFile[];
  // Optional participant roles defined by organizer
  roles?: Array<{ name: string; capacity?: number | null }>;
}

/**
 * Create event and related records (schedules, teams).
 * - Enforces authenticated user (created_by)
 * - Retries slug on unique-violation
 * - Stores the storage path in image_url (not a signed URL)
 */
export async function createEvent(payload: CreateEventPayload) {
  const {
    form,
    tags,
    scheduleText,
    teamsText,
    prizeText,
    faqs,
    uploadedFiles,
    roles,
  } = payload;

  // Basic validation
  if (!form?.title) throw new Error("Title is required");
  if (!form?.start_date || !form?.start_time)
    throw new Error("Start date and time are required");
  if (!form?.location) throw new Error("Location is required");

  // Require authenticated user
  const userRes = await supabase.auth.getUser();
  const user = (userRes?.data?.user ?? null) as User | null;
  if (!user || !user.id) {
    throw new Error("Authentication required to create events");
  }

  const startAt = new Date(`${form.start_date}T${form.start_time}`);
  const endAt =
    form.end_date && form.end_time
      ? new Date(`${form.end_date}T${form.end_time}`)
      : new Date(startAt.getTime() + 8 * 60 * 60 * 1000);
  const registrationDeadline =
    form.registration_deadline_date && form.registration_deadline_time
      ? new Date(
          `${form.registration_deadline_date}T${form.registration_deadline_time}`
        )
      : new Date(startAt.getTime() - 24 * 60 * 60 * 1000);

  // Build base event object
  const baseEvent: Record<string, unknown> = {
    title: form.title,
    type: form.type || null,
    format: form.format || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    registration_deadline: registrationDeadline.toISOString(),
    location: form.location,
    short_blurb: form.short_blurb ?? "",
    long_description: form.long_description ?? null,
    overview: form.overview ?? null,
    rules: form.rules ?? null,
    prizes: prizeText
      ? prizeText
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean)
      : null,
    faqs:
      faqs && faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : null,
    registration_link: form.registration_link ?? null,
    discord_invite: form.discord_invite ?? null,
    instagram_handle: form.instagram_handle ?? null,
    tags: tags && tags.length ? tags : null,
    image_url: null,
    created_by: user.id,
  };

  // Handle upload
  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;

      console.log("[eventService] Uploading file:", file.name);

      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      let base =
        form.slug && form.slug.trim() !== ""
          ? form.slug
          : slugify(form.title || "event");
      base = base.replace(/[^a-z0-9-]/g, "");
      if (!base || base === "-") {
        base = "event";
      }
      const fileName = `${base}-${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("[eventService] Upload error:", uploadError);
        console.warn("Supabase upload error (continuing without image):", uploadError.message);
      } else {
        console.log("[eventService] Upload successful:", uploadData);
        baseEvent.image_url = fileName;
      }
    } catch (err) {
      console.error("[eventService] Upload exception:", err);
      console.warn("Failed to upload event image, continuing without image", err);
    }
  }

  // FIX: Slug uniqueness with proper error handling
  const maxAttempts = 5;
  let createdEvent: Database["public"]["Tables"]["events"]["Row"] | null = null;
  const requestedSlug =
    form.slug && form.slug.trim() !== ""
      ? form.slug.trim()
      : slugify(form.title || "");

  // Try to insert with unique slug
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateSlug =
      attempt === 0 ? requestedSlug : `${requestedSlug}-${generateSuffix(4)}`;
    
    const eventPayload = {
      ...baseEvent,
      slug: candidateSlug,
    } as unknown as Database["public"]["Tables"]["events"]["Insert"];

    console.log(`[eventService] Attempt ${attempt + 1}: Trying slug "${candidateSlug}"`);

    const { data, error } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("*")
      .single();

    if (!error && data) {
      // SUCCESS - event created
      createdEvent = data as Database["public"]["Tables"]["events"]["Row"];
      console.log("[eventService] Event created successfully:", createdEvent.id);
      break;
    }

    // Check if it's a unique constraint error
    const errorObj = error as unknown as { message?: string; code?: string };
    const message = String(errorObj?.message ?? "");
    const code = String(errorObj?.code ?? "");
    
    // PostgreSQL unique violation codes: 23505, or message contains "duplicate"
    const isUniqueViolation =
      code === "23505" ||
      message.toLowerCase().includes("duplicate") ||
      message.toLowerCase().includes("unique");

    if (!isUniqueViolation) {
      // Not a uniqueness issue - throw the error
      console.error("[eventService] Non-unique error:", error);
      throw new Error(`Failed to create event: ${message}`);
    }

    // If this was the last attempt, throw error
    if (attempt === maxAttempts - 1) {
      throw new Error(`Failed to create event after ${maxAttempts} attempts. Please try a different title or slug.`);
    }

    // Otherwise, continue to next attempt with different slug
    console.log(`[eventService] Slug "${candidateSlug}" already exists, trying another...`);
  }

  if (!createdEvent) {
    throw new Error("Failed to create event: Unknown error");
  }

  const eventId = createdEvent.id as string;

  // Insert schedules if provided
  if (scheduleText && scheduleText.trim()) {
    const lines = scheduleText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const scheduleInserts = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const start = parts[0] || null;
      const title = parts[1] || "Schedule Item";
      const description = parts[2] || null;
      return {
        event_id: eventId,
        start_at: start ? new Date(start).toISOString() : null,
        title,
        description,
      };
    });

    const { error: schedulesError } = await supabase
      .from("event_schedules")
      .insert(scheduleInserts);

    if (schedulesError) {
      console.warn("Failed to insert schedules", schedulesError);
    }
  }

  // Insert teams if provided
  if (teamsText && teamsText.trim()) {
    const lines = teamsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const teamInserts = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        event_id: eventId,
        name: parts[0] || "Team",
        description: parts[1] || null,
        contact_email: parts[2] || null,
      };
    });

    const { error: teamsError } = await supabase
      .from("event_teams")
      .insert(teamInserts);

    if (teamsError) {
      console.warn("Failed to insert teams", teamsError);
    }
  }

  return createdEvent;
}
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function generateSuffix(len = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  payload: CreateEventPayload
) {
  const {
    form,
    tags,
    scheduleText,
    teamsText,
    prizeText,
    faqs,
    uploadedFiles,
    roles,
  } = payload;

  // Verify user owns this event
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  const { data: existingEvent } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (existingEvent?.created_by !== user.id) {
    throw new Error("You don't have permission to edit this event");
  }

  const startAt = new Date(`${form.start_date}T${form.start_time}`);
  const endAt =
    form.end_date && form.end_time
      ? new Date(`${form.end_date}T${form.end_time}`)
      : new Date(startAt.getTime() + 8 * 60 * 60 * 1000);
  const registrationDeadline =
    form.registration_deadline_date && form.registration_deadline_time
      ? new Date(
          `${form.registration_deadline_date}T${form.registration_deadline_time}`
        )
      : new Date(startAt.getTime() - 24 * 60 * 60 * 1000);

  const updateData: Record<string, unknown> = {
    title: form.title,
    type: form.type || null,
    format: form.format || null,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
    registration_deadline: registrationDeadline.toISOString(),
    location: form.location,
    short_blurb: form.short_blurb ?? "",
    long_description: form.long_description ?? null,
    overview: form.overview ?? null,
    rules: form.rules ?? null,
    prizes: prizeText
      ? prizeText
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean)
      : null,
    faqs:
      faqs && faqs.length
        ? faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : null,
    registration_link: form.registration_link ?? null,
    discord_invite: form.discord_invite ?? null,
    instagram_handle: form.instagram_handle ?? null,
    tags: tags && tags.length ? tags : null,
    roles: roles && roles.length ? roles : null,
    updated_at: new Date().toISOString(),
  };

  // Handle new image upload
  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB");
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const base = slugify(form.title || "event");
      const fileName = `${base}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError) {
        updateData.image_url = fileName;
      }
    } catch (err) {
      console.warn("Failed to upload event image", err);
    }
  }

  // Update slug if provided
  if (form.slug && form.slug.trim() !== "") {
    updateData.slug = form.slug.trim();
  }

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw error;

  // Update schedules - delete old and insert new
  await supabase.from("event_schedules").delete().eq("event_id", eventId);
  if (scheduleText && scheduleText.trim()) {
    const lines = scheduleText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const scheduleInserts = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        event_id: eventId,
        start_at: parts[0] ? new Date(parts[0]).toISOString() : null,
        title: parts[1] || "Schedule Item",
        description: parts[2] || null,
      };
    });
    await supabase.from("event_schedules").insert(scheduleInserts);
  }

  // Update teams - delete old and insert new
  await supabase.from("event_teams").delete().eq("event_id", eventId);
  if (teamsText && teamsText.trim()) {
    const lines = teamsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const teamInserts = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        event_id: eventId,
        name: parts[0] || "Team",
        description: parts[1] || null,
        contact_email: parts[2] || null,
      };
    });
    await supabase.from("event_teams").insert(teamInserts);
  }

  return data;
}

/**
 * Delete an event (soft delete by setting is_active to false)
 */
export async function deleteEvent(eventId: string) {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  const { data: existingEvent } = await supabase
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .single();

  if (existingEvent?.created_by !== user.id) {
    throw new Error("You don't have permission to delete this event");
  }

  // Hard delete - permanently removes from database
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) throw error;
  return true;
}

/**
 * Get events created by current user
 */
export async function getMyEvents() {
  const userRes = await supabase.auth.getUser();
  const user = userRes?.data?.user ?? null;
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export type Role = { name: string; capacity?: number | null };

export type RegistrationRow = {
  id: string;
  created_at: string;
  event_id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  status?: string | null;
  role?: string | null;
};

export async function fetchEventRegistrations(eventId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RegistrationRow[]) || [];
}

export async function countRegistrationsByRole(eventId: string) {
  const regs = await fetchEventRegistrations(eventId);
  const counts: Record<string, number> = {};
  regs.forEach((r) => {
    const key = r.role || "__no_role__";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export async function canRegister(eventId: string, roleName?: string | null) {
  // Fetch event's roles
  const { data: evt, error: evtErr } = await supabase
    .from("events")
    .select("roles")
    .eq("id", eventId)
    .single();
  if (evtErr) throw evtErr;
  const roles = (evt as any)?.roles as Role[] | undefined;

  if (!roleName) return true; // if no role selected, allow registration (unless capacity global checks applied elsewhere)

  if (!roles || !roles.length) return true;

  const target = roles.find((r) => r.name === roleName);
  if (!target || target.capacity == null) return true; // no capacity constraint

  const counts = await countRegistrationsByRole(eventId);
  const current = counts[roleName] || 0;
  return current < (target.capacity ?? Infinity);
}

export async function registerForEvent(params: {
  event_id: string;
  user_id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
}) {
  const rpcParams = {
    p_event_id: params.event_id,
    p_user_id: params.user_id ?? null,
    p_role: params.role ?? null,
    p_name: params.name ?? null,
    p_email: params.email ?? null,
    p_phone: params.phone ?? null,
    p_message: params.message ?? null,
  };
  // Use an explicit any cast for RPC name to avoid TS RPC typing limitations for custom functions
  const { data, error } = await (supabase as any).rpc("register_for_event", rpcParams);
  if (error) throw error;
  return data;
}

export function registrationsToCSV(rows: RegistrationRow[]) {
  if (!rows || rows.length === 0) return "";
  const headers = [
    "id",
    "created_at",
    "event_id",
    "user_id",
    "name",
    "email",
    "phone",
    "role",
    "status",
    "message",
  ];
  const csv = [headers.join(",")];
  for (const r of rows) {
    const line = headers
      .map((h) => {
        const val = (r as any)[h] ?? "";
        if (typeof val === "string") return `"${String(val).replace(/"/g, '""')}"`;
        return `"${String(val ?? "")}"`;
      })
      .join(",");
    csv.push(line);
  }
  return csv.join("\n");
} 

export function registrationsToMarkdown(rows: RegistrationRow[]) {
  if (!rows || rows.length === 0) return "";
  const headers = ["id", "created_at", "name", "email", "phone", "role", "status"];
  const table = ["| " + headers.join(" | ") + " |", "| " + headers.map(() => "---").join(" | ") + " |"];
  for (const r of rows) {
    table.push(
      "| " + headers.map((h) => (r as any)[h] ?? "").join(" | ") + " |"
    );
  }
  return table.join("\n");
}

export async function exportRegistrationsXLSX(eventId: string) {
  // Invoke Edge Function which returns either { filename, url, storagePath } or fallback { filename, data }
  const fnRes = await (supabase as any).functions.invoke("export-registrations-xlsx", {
    body: JSON.stringify({ eventId }),
  });

  if (fnRes?.error) throw fnRes.error;

  let parsed: any = null;
  try {
    parsed = typeof fnRes.data === 'string' ? JSON.parse(fnRes.data) : fnRes.data;
  } catch (e) {
    parsed = fnRes.data;
  }

  const filename = parsed?.filename || `registrations-${eventId}.xlsx`;

  if (parsed?.url) {
    // Server uploaded to storage and returned a signed URL
    return { filename, url: parsed.url, storagePath: parsed.storagePath } as { filename: string; url: string; storagePath?: string };
  }

  const b64 = parsed?.data;
  if (!b64) throw new Error('No XLSX returned from server');

  // Decode base64 to binary
  const binStr = atob(b64);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  const blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { filename, blob };
}

export async function registrationsToXLSX(rows: RegistrationRow[]) {
  // Try to generate an .xlsx file using sheetjs (optional dependency)
  try {
    // Use @vite-ignore so Vite does not attempt to resolve this at build-time for optional deps
    const xlsx = await import(/* @vite-ignore */ "xlsx");
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "registrations");
    const wbout = xlsx.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  } catch (err) {
    // Provide a clear actionable message
    throw new Error(
      "XLSX export requires the 'xlsx' package. Install it with 'pnpm add xlsx' (or 'npm i xlsx') or use CSV/MD export instead."
    );
  }
} 

export default {
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  fetchEventRegistrations,
  countRegistrationsByRole,
  canRegister,
  registerForEvent,
  exportRegistrationsXLSX,
  registrationsToCSV,
  registrationsToMarkdown,
};
