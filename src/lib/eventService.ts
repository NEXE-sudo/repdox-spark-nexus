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
  } = payload;

  // Basic validation
  if (!form?.title) throw new Error("Title is required");
  if (!form?.start_date || !form?.start_time)
    throw new Error("Start date and time are required");
  if (!form?.location) throw new Error("Location is required");

  // Require authenticated user so created_by can be set and RLS policies work
  const userRes = await supabase.auth.getUser();
  // supabase.auth.getUser() returns { data: { user } } in client
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

  // Build base event object (no slug yet, slug will be attempted with uniqueness)
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

  // Handle upload (first file only). Store path in image_url.
  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;

      // Validate file
      console.log(
        "[eventService] Uploading file:",
        file.name,
        "Size:",
        file.size,
        "Type:",
        file.type
      );

      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are allowed");
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        throw new Error("File size must be less than 10MB");
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      let base =
        form.slug && form.slug.trim() !== ""
          ? form.slug
          : slugify(form.title || "event");
      base = base.replace(/[^a-z0-9-]/g, "");
      // Ensure base is not empty
      if (!base || base === "-") {
        base = "event";
      }
      const fileName = `${base}-${Date.now()}.${ext}`;

      console.log(
        "[eventService] Uploading to event-images bucket, filename:",
        fileName
      );

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("[eventService] Upload error:", uploadError);
        console.error(
          "[eventService] Error details:",
          JSON.stringify(uploadError, null, 2)
        );
        const msg =
          typeof uploadError === "object" &&
          uploadError !== null &&
          "message" in uploadError
            ? String((uploadError as { message?: unknown }).message ?? "")
            : String(uploadError);
        console.warn("Supabase upload error (continuing without image):", msg);
      } else {
        console.log("[eventService] Upload successful:", uploadData);
        baseEvent.image_url = fileName;
      }
    } catch (err) {
      console.error("[eventService] Upload exception:", err);
      console.warn(
        "Failed to upload event image, continuing without image",
        err
      );
    }
  }

  // Slug uniqueness: attempt inserting up to N times with slug variants
  const maxAttempts = 5;
  let lastError: unknown = null;
  let createdEvent: Database["public"]["Tables"]["events"]["Row"] | null = null;
  const requestedSlug =
    form.slug && form.slug.trim() !== ""
      ? form.slug.trim()
      : slugify(form.title || "");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateSlug =
      attempt === 0 ? requestedSlug : `${requestedSlug}-${generateSuffix(4)}`;
    const eventPayload = {
      ...baseEvent,
      slug: candidateSlug,
    } as unknown as Database["public"]["Tables"]["events"]["Insert"];

    const { data, error } = await supabase
      .from("events")
      .insert(eventPayload as Database["public"]["Tables"]["events"]["Insert"])
      .select("*")
      .single();

    if (!error) {
      createdEvent = data as Database["public"]["Tables"]["events"]["Row"];
      break;
    }

    // detect unique-violation for slug and retry
    const errorObj = error as unknown as { message?: string; code?: string };
    const message = String(errorObj?.message ?? "");
    const isUniqueViolation =
      message.toLowerCase().includes("duplicate") ||
      (typeof errorObj?.code === "string" && errorObj.code.startsWith("23"));

    lastError = error;
    if (!isUniqueViolation) {
      // not a uniqueness issue, stop retrying
      break;
    }

    // else continue and try another slug
  }

  if (!createdEvent) {
    // Provide helpful error context
    throw new Error(
      `Failed to create event: ${JSON.stringify(lastError ?? "unknown")}`
    );
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

export default { createEvent };
