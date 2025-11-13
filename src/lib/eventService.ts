import { supabase } from '@/integrations/supabase/client';

export interface CreateEventPayload {
  form: Record<string, any>;
  tags: string[];
  scheduleText?: string;
  teamsText?: string;
  prizeText?: string;
  faqs?: Array<{ question: string; answer: string }>;
  uploadedFiles?: Array<{ file: File; name: string }>;
}

/**
 * Create event and related records (schedules, teams).
 * Returns the created event row as returned by Supabase.
 */
export async function createEvent(payload: CreateEventPayload) {
  const { form, tags, scheduleText, teamsText, prizeText, faqs, uploadedFiles } = payload;

  // Basic validation for required fields
  if (!form?.title) throw new Error('Title is required');
  if (!form?.start_date || !form?.start_time) throw new Error('Start date and time are required');
  if (!form?.location) throw new Error('Location is required');

  // Build required start_at timestamp
  const startAt = form.start_date && form.start_time ? new Date(`${form.start_date}T${form.start_time}`) : null;

  // Build details JSON for fields that don't exist on the `events` table
  // Compute end_at and registration_deadline (events table requires them)
  const endAt = form.end_date && form.end_time
    ? new Date(`${form.end_date}T${form.end_time}`)
    : (startAt ? new Date(startAt.getTime() + 8 * 60 * 60 * 1000) : null); // default +8h

  const registrationDeadline = form.registration_deadline_date && form.registration_deadline_time
    ? new Date(`${form.registration_deadline_date}T${form.registration_deadline_time}`)
    : (startAt ? new Date(startAt.getTime() - 24 * 60 * 60 * 1000) : null); // default -1 day

  // Build event row for main events table. Map rich fields to the columns declared in migrations.
  const eventRow: Record<string, any> = {
    title: form.title,
    slug: form.slug && form.slug.trim() !== '' ? form.slug.trim() : slugify(form.title || ''),
    type: form.type,
    format: form.format,
    start_at: startAt ? startAt.toISOString() : undefined,
    end_at: endAt ? endAt.toISOString() : undefined,
    registration_deadline: registrationDeadline ? registrationDeadline.toISOString() : undefined,
    location: form.location,
    short_blurb: form.short_blurb || '',
    long_description: form.long_description || null,
    overview: form.overview || null,
    rules: form.rules || null,
    prizes: prizeText ? prizeText.split('\n').map(p => p.trim()).filter(Boolean) : null,
    faqs: faqs && faqs.length ? faqs.map(f => ({ question: f.question, answer: f.answer })) : null,
    registration_link: form.registration_link || null,
    discord_invite: form.discord_invite || null,
    instagram_handle: form.instagram_handle || null,
    tags: tags && tags.length ? tags : null,
    image_url: uploadedFiles && uploadedFiles.length ? uploadedFiles[0].name : null,
  };

  // If there are uploaded files, upload the first one to Supabase Storage bucket 'events'
  if (uploadedFiles && uploadedFiles.length > 0) {
    try {
      const file = uploadedFiles[0].file;
      const ext = file.name.split('.').pop() ?? 'jpg';
      const base = (eventRow.slug || slugify(eventRow.title || 'event')).replace(/[^a-z0-9-]/g, '');
      const fileName = `${base}-${Date.now()}.${ext}`;
      const filePath = fileName; // store at root of bucket or change to `events/${fileName}` if desired

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Try to get a public URL for the uploaded file
      // Always store the storage path (filePath) for private buckets.
      // A signed URL will be generated at render time via the Edge Function.
      eventRow.image_url = filePath;
    } catch (err: any) {
      console.error('Failed to upload event image', err);
      // Don't block the event creation for image upload failure; log and continue
    }
  }

  // Insert event with improved error handling
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .insert(eventRow)
    .select('*')
    .single();

  if (eventError) {
    // Throw a readable error so UI can display a message
    const msg = eventError.message || 'Unknown error inserting event';
    const details = { message: msg, code: (eventError as any).code, details: (eventError as any).details };
    throw new Error(JSON.stringify(details));
  }

  const eventId = eventData.id as string;

  // Parse and insert schedules
  if (scheduleText && scheduleText.trim()) {
    const lines = scheduleText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const scheduleInserts = lines.map(line => {
      // Format: 2025-03-15T09:00 | Title | Description
      const parts = line.split('|').map(p => p.trim());
      const start = parts[0] || null;
      const title = parts[1] || 'Schedule Item';
      const description = parts[2] || null;
      return {
        event_id: eventId,
        start_at: start ? new Date(start).toISOString() : null,
        title,
        description,
      };
    });

    // Insert schedules in a single call
    const { error: schedulesError } = await supabase
      .from('event_schedules')
      .insert(scheduleInserts);

    if (schedulesError) {
      console.error('Failed to insert schedules', schedulesError);
      throw new Error(JSON.stringify({ message: schedulesError.message, details: (schedulesError as any).details }));
    }
  }

  // Parse and insert teams
  if (teamsText && teamsText.trim()) {
    const lines = teamsText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const teamInserts = lines.map(line => {
      // Format: Name | Description | Email
      const parts = line.split('|').map(p => p.trim());
      return {
        event_id: eventId,
        name: parts[0] || 'Team',
        description: parts[1] || null,
        contact_email: parts[2] || null,
      };
    });

    const { error: teamsError } = await supabase
      .from('event_teams')
      .insert(teamInserts);

    if (teamsError) {
      console.error('Failed to insert teams', teamsError);
      throw new Error(JSON.stringify({ message: teamsError.message, details: (teamsError as any).details }));
    }
  }

  return eventData;
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default { createEvent };
