import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, GripVertical, CalendarDays } from "lucide-react";
import eventService from "@/lib/eventService";
import FileUpload from "@/components/ui/File_upload";

import EventBuilderExtensions from '@/components/EventBuilder/EventBuilderExtensions';
import LivePreview from '@/components/EventBuilder/LivePreview';
import useAutoSave from '@/hooks/useAutoSave';
import type { EventDraft } from '@/components/EventBuilder/LivePreview';

// Suggested tags based on common event categories
const SUGGESTED_TAGS = [
  "Technology",
  "Innovation",
  "AI/ML",
  "Blockchain",
  "Web Development",
  "Mobile Apps",
  "Gaming",
  "Design",
  "UI/UX",
  "Prizes",
  "Networking",
  "Workshop",
  "Beginner Friendly",
  "Open Source",
  "Hardware",
  "IoT",
  "Data Science",
  "Cybersecurity",
  "Cloud Computing",
  "Startup",
];

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function AddEvent() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!slug;

  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [eventId, setEventId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "Hackathon",
    format: "Offline",
    start_date: "",
    start_time: "09:00",
    end_date: "",
    end_time: "18:00",
    registration_deadline_date: "",
    registration_deadline_time: "23:59",
    location: "",
    short_blurb: "",
    long_description: "",
    overview: "",
    rules: "",
    registration_link: "",
    discord_invite: "",
    instagram_handle: "",
  });

  const [scheduleText, setScheduleText] = useState("");
  const [teamsText, setTeamsText] = useState("");
  const [prizeText, setPrizeText] = useState("");

  // FAQ state management (start empty; user can opt-in)
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [showFaqs, setShowFaqs] = useState(false);
  const [draggedFaq, setDraggedFaq] = useState<string | null>(null);

  // Tag state management
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ file: File; name: string }>
  >([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Optional sections and enhanced draft state (for Live Preview & reordering)
  const [speakers, setSpeakers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [resources, setResources] = useState<Array<{ id: string; title: string; link?: string }>>([]);


  const [sectionOrder, setSectionOrder] = useState<string[]>([]); // e.g. ['Agenda','Speakers','FAQs','Resources']

  // Autosave draft
  const draftKey = `event-draft:${slug ?? 'new'}`;
  const [draft, setDraft] = useState<EventDraft>({ id: eventId ?? undefined, title: '', description: '', date: '', location: '', tags: [], sections: [] });
  const { state: draftSaveState, load: loadDraft, manualSave: manualSaveDraft, clear: clearDraft } = useAutoSave<EventDraft>(draftKey, draft, { debounceMs: 700 });
  const [savedDraftAvailable, setSavedDraftAvailable] = useState<{ payload?: EventDraft; savedAt?: number } | null>(null);

  // Roles text (organizer-defined roles) and preview toggle
  const [rolesText, setRolesText] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // Publish later
  const [publishLater, setPublishLater] = useState(false);
  const [publish_date, setPublishDate] = useState('');
  const [publish_time, setPublishTime] = useState('09:00');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helpers for date/time constraints
  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const startTimeMin = form.start_date === todayStr ? nowTime : '00:00';
  const endDateMin = form.start_date || todayStr;
  const regDateMin = todayStr;
  const regDateMax = form.start_date || undefined;
  const regTimeMax =
    form.registration_deadline_date === form.start_date && form.start_time
      ? ((): string => {
          const [h, m] = form.start_time.split(":").map(Number);
          let total = h * 60 + m - 1;
          if (total < 0) total = 0;
          const hh = String(Math.floor(total / 60)).padStart(2, "0");
          const mm = String(total % 60).padStart(2, "0");
          return `${hh}:${mm}`;
        })()
      : undefined;

  // Mobile pane toggle: 'fields' or 'preview' (small screens)
  const [mobilePane, setMobilePane] = useState<'fields' | 'preview'>('fields');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // toggle only on small screens
      if (window.innerWidth >= 1024) return;
      if (e.key.toLowerCase() === 'p') {
        setMobilePane((m) => (m === 'preview' ? 'fields' : 'preview'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load event data if in edit mode
  useEffect(() => {
    if (!isEditMode || !slug) return;

    const loadEvent = async () => {
      try {
        const { data: event, error } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) throw error;

        // Check if user owns this event
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (event.created_by !== user?.id) {
          alert("You don't have permission to edit this event");
          navigate("/events");
          return;
        }

        setEventId(event.id);

        // Parse dates
        const startDate = new Date(event.start_at);
        const endDate = new Date(event.end_at);
        const regDeadline = new Date(event.registration_deadline);

        // Populate form
        setForm({
          title: event.title || "",
          slug: event.slug || "",
          type: event.type || "Hackathon",
          format: event.format || "Offline",
          start_date: startDate.toISOString().split("T")[0],
          start_time: startDate.toTimeString().slice(0, 5),
          end_date: endDate.toISOString().split("T")[0],
          end_time: endDate.toTimeString().slice(0, 5),
          registration_deadline_date: regDeadline.toISOString().split("T")[0],
          registration_deadline_time: regDeadline.toTimeString().slice(0, 5),
          location: event.location || "",
          short_blurb: event.short_blurb || "",
          long_description: event.long_description || "",
          overview: event.overview || "",
          rules: event.rules || "",
          registration_link: event.registration_link || "",
          discord_invite: event.discord_invite || "",
          instagram_handle: event.instagram_handle || "",
        });

        // Set tags
        if (event.tags) setTags(event.tags);

        // attempt to set cover image if event provides one (some events may use different property names)
        const getEventCover = (ev: unknown): string | null => {
          if (!ev || typeof ev !== 'object') return null;
          const e = ev as Record<string, unknown>;
          if (typeof e['cover_url'] === 'string') return e['cover_url'] as string;
          if (typeof e['image_url'] === 'string') return e['image_url'] as string;
          if (typeof e['cover'] === 'string') return e['cover'] as string;
          return null;
        };
        setCoverUrl(getEventCover(event));

        // Set prizes
        if (event.prizes && Array.isArray(event.prizes)) {
          setPrizeText(event.prizes.join("\n"));
        }

        // Set FAQs
        if (event.faqs && Array.isArray(event.faqs)) {
          const loadedFaqs = (event.faqs as Array<{ question?: string; answer?: string }>).map((f, idx: number) => ({
            id: `faq-${idx}`,
            question: f?.question || "",
            answer: f?.answer || "",
          }));
          if (loadedFaqs.length > 0) {
            setFaqs(loadedFaqs);
            setShowFaqs(true);
            // add to section order
            setSectionOrder((s) => (s.includes('FAQs') ? s : [...s, 'FAQs']));
          }
        }

        // Load schedules
        const { data: schedules } = await supabase
          .from("event_schedules")
          .select("*")
          .eq("event_id", event.id)
          .order("start_at", { ascending: true });

        if (schedules && schedules.length > 0) {
          const scheduleLines = schedules.map((s) => {
            const start = s.start_at
              ? new Date(s.start_at).toISOString().slice(0, 16)
              : "";
            return `${start} | ${s.title} | ${s.description || ""}`;
          });
          setScheduleText(scheduleLines.join("\n"));
          setSectionOrder((s) => (s.includes('Agenda') ? s : [...s, 'Agenda']));
        }

        // Load teams
        const { data: teams } = await supabase
          .from("event_teams")
          .select("*")
          .eq("event_id", event.id);

        if (teams && teams.length > 0) {
          const teamLines = teams.map(
            (t) =>
              `${t.name} | ${t.description || ""} | ${t.contact_email || ""}`
          );
          setTeamsText(teamLines.join("\n"));
        }
      } catch (err: unknown) {
        console.error("Failed to load event:", err);
        const message = err instanceof Error ? err.message : String(err);
        alert("Failed to load event: " + message);
        navigate("/events");
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEvent();
  }, [isEditMode, slug, navigate]);

  const onChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // keep `draft` in sync with the main form and extras (for preview / autosave)
  useEffect(() => {
    const secs: EventDraft["sections"] = sectionOrder.map((type, i) => {
      switch (type) {
        case 'Agenda':
          return { id: `agenda-${i}`, type: 'Agenda', title: 'Agenda', content: scheduleText };
        case 'FAQs':
          return { id: `faqs-${i}`, type: 'FAQs', title: 'FAQs', content: JSON.stringify(faqs) };
        case 'Speakers':
          return { id: `speakers-${i}`, type: 'Speakers', title: 'Speakers', content: JSON.stringify(speakers) };
        case 'Resources':
          return { id: `resources-${i}`, type: 'Resources', title: 'Resources', content: JSON.stringify(resources) };
        default:
          return { id: `${type}-${i}`, type, title: type, content: '' };
      }
    });

    setDraft({
      id: eventId ?? undefined,
      title: form.title,
      description: form.short_blurb || form.overview || form.long_description,
      date: form.start_date ? `${form.start_date}T${form.start_time}` : '',
      location: form.location,
      cover: coverUrl ?? undefined,
      tags,
      sections: secs,
    });
  }, [form, tags, scheduleText, faqs, speakers, resources, sectionOrder, eventId, coverUrl]);

  // make saved draft available to restore (once)
  useEffect(() => {
    const existing = loadDraft();
    if (existing && existing.payload) {
      setSavedDraftAvailable(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime validation: clear errors as fields are fixed
  useEffect(() => {
    setErrors((prev) => {
      const next = { ...prev };
      if (form.title && next.title) delete next.title;
      if (form.start_date && form.start_time && next.start) delete next.start;
      if (form.location && next.location) delete next.location;
      return next;
    });
  }, [form.title, form.start_date, form.start_time, form.location]);

  const restoreDraft = () => {
    if (!savedDraftAvailable?.payload) return;
    const p = savedDraftAvailable.payload;
    setForm((s) => ({ ...s, title: p.title || s.title, short_blurb: p.description || s.short_blurb, location: p.location || s.location }));
    setTags(p.tags || []);

    // reconstruct extras
    const order: string[] = [];
    const sp: typeof speakers = [];
    const res: typeof resources = [];
    let sched = '';
    let fqs: FAQ[] = [];

    (p.sections || []).forEach((sec) => {
      order.push(sec.type);
      try {
        if (sec.type === 'Agenda') sched = typeof sec.content === 'string' ? (sec.content as string) : '';
        if (sec.type === 'FAQs') fqs = typeof sec.content === 'string' ? JSON.parse(sec.content) : sec.content || [];
        if (sec.type === 'Speakers') {
          const parsed = (typeof sec.content === 'string' ? JSON.parse(sec.content) : sec.content || []) as Array<{ name?: string; role?: string }>;
          parsed.forEach((s, i: number) => sp.push({ id: `sp-${i}`, name: s?.name || '', role: s?.role || '' }));
        }
        if (sec.type === 'Resources') {
          const parsed = (typeof sec.content === 'string' ? JSON.parse(sec.content) : sec.content || []) as Array<{ title?: string; link?: string }>;
          parsed.forEach((r, i: number) => res.push({ id: `r-${i}`, title: r?.title || '', link: r?.link || '' }));
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    if (sched) setScheduleText(sched);
    if (fqs && fqs.length) { setFaqs(fqs); setShowFaqs(true); }
    if (sp.length) setSpeakers(sp);
    if (res.length) setResources(res);
    if (order.length) setSectionOrder(order);

    // clear the saved-draft banner
    setSavedDraftAvailable(null);
  };

  const dismissSavedDraft = () => setSavedDraftAvailable(null);

  // FAQ handlers
  const addFaq = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: "", answer: "" }]);
  };

  const removeFaq = (id: string) => {
    if (faqs.length > 1) {
      setFaqs(faqs.filter((f) => f.id !== id));
    }
  };

  const updateFaq = (
    id: string,
    field: "question" | "answer",
    value: string
  ) => {
    setFaqs(faqs.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const handleDragStart = (id: string) => {
    setDraggedFaq(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedFaq || draggedFaq === id) return;

    const draggedIndex = faqs.findIndex((f) => f.id === draggedFaq);
    const targetIndex = faqs.findIndex((f) => f.id === id);

    const newFaqs = [...faqs];
    const [removed] = newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(targetIndex, 0, removed);
    setFaqs(newFaqs);
  };

  const handleDragEnd = () => {
    setDraggedFaq(null);
  };

  // Tag handlers
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = SUGGESTED_TAGS.filter(
        (tag) =>
          tag.toLowerCase().includes(value.toLowerCase()) && !tags.includes(tag)
      );
      setFilteredSuggestions(filtered);
      setShowTagSuggestions(true);
    } else {
      setShowTagSuggestions(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const duplicate = tags.find(
      (t) => t.toLowerCase() === trimmedTag.toLowerCase()
    );
    if (duplicate) {
      alert(`"${duplicate}" already exists. Try a different tag.`);
      return;
    }

    setTags([...tags, trimmedTag]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSubmit = async () => {
    // Run validation
    const nextErrors: Record<string, string> = {};
    if (!form.title || !form.title.trim()) nextErrors.title = 'Please enter an event title.';
    if (!form.start_date || !form.start_time) nextErrors.start = 'Start date and time are required.';

    // Date/time validation: start cannot be in the past
    try {
      const startAt = new Date(`${form.start_date}T${form.start_time}`);
      if (startAt.getTime() < Date.now()) {
        nextErrors.start = 'Event start must be in the future.';
      }

      if (form.end_date && form.end_time) {
        const endAt = new Date(`${form.end_date}T${form.end_time}`);
        if (endAt.getTime() <= startAt.getTime()) {
          nextErrors.end = 'End time must be after start time.';
        }
      }

      if (form.registration_deadline_date && form.registration_deadline_time) {
        const regDead = new Date(`${form.registration_deadline_date}T${form.registration_deadline_time}`);
        if (regDead.getTime() >= startAt.getTime()) {
          nextErrors.registration_deadline = 'Registration deadline must be before the event start.';
        }
      }
    } catch (err) {
      // ignore parse errors here; other validations will catch
    }
    if (!form.location || !form.location.trim()) nextErrors.location = 'Venue or platform is required.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      // focus first error if possible
      const first = Object.keys(nextErrors)[0];
      const el = document.getElementById(first === 'title' ? 'title' : first === 'location' ? 'location' : undefined);
      el?.focus();
      return;
    }

    setLoading(true);
    try {
      const parsedRoles = rolesText
        ? rolesText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map((line) => {
              const [name, cap] = line.split('|').map((p) => p.trim());
              return { name, capacity: cap ? (parseInt(cap, 10) || null) : null };
            })
        : null;

      const payloadBase = {
        form,
        tags,
        scheduleText,
        teamsText,
        prizeText,
        faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
        uploadedFiles,
        roles: parsedRoles && parsedRoles.length ? parsedRoles : null,
      };

      const payload = publishLater && publish_date
        ? { ...payloadBase, publish_at: new Date(`${publish_date}T${publish_time}`).toISOString() }
        : payloadBase;

      if (isEditMode && eventId) {
        // Update existing event
        const updated = await eventService.updateEvent(eventId, payload);
        alert("Event updated successfully!");
        if (updated?.slug) {
          navigate(`/events/${updated.slug}`);
        } else {
          navigate("/my-events");
        }
      } else {
        // Create new event
        const created = await eventService.createEvent(payload);
        alert("Event created successfully!");
        if (created?.slug) {
          navigate(`/events/${created.slug}`);
        } else {
          navigate("/my-events");
        }
      }

      // clear autosave on successful publish
      clearDraft();
    } catch (err: unknown) {
      console.error(
        isEditMode ? "Update event failed" : "Create event failed",
        err
      );
      let message = "Unknown error";
      try {
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse((err as Error).message);
            if (parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)) {
              const maybeMessage = (parsed as Record<string, unknown>)['message'];
              message = typeof maybeMessage === 'string' ? maybeMessage : (err as Error).message;
            } else {
              message = (err as Error).message;
            }
          } catch {
            message = err.message;
          }
        } else if (typeof err === "string") {
          message = err;
        } else {
          try {
            message = JSON.stringify(err);
          } catch {
            message = String(err);
          }
        }
      } catch (e) {
        message = String(err);
      }
      alert(`Failed to ${isEditMode ? "update" : "create"} event: ` + message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {isEditMode ? "Edit Event" : "Create Event"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? "Update your event details"
                : "Fill in the details to create your event"}
            </p>

            {savedDraftAvailable && (
              <div className="mt-3 rounded-md bg-yellow-50/80 dark:bg-yellow-900/30 p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Local draft available</div>
                  <div className="text-xs text-muted-foreground">Saved locally — you can restore or dismiss it.</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={restoreDraft} className="px-3 py-1 rounded-md bg-white/90">Restore</button>
                  <button onClick={dismissSavedDraft} className="px-3 py-1 rounded-md bg-transparent">Dismiss</button>
                </div>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Draft: <span className="font-medium text-neutral-700">{draftSaveState === 'saving' ? 'Saving…' : draftSaveState === 'saved' ? 'Saved' : draftSaveState}</span></div>
            <div className="mt-2 text-xs text-muted-foreground">Progress is auto-saved to your browser</div>
            <div className="mt-3">
              <button type="button" onClick={() => setShowPreview((p) => !p)} className="px-3 py-1 rounded-md bg-neutral-100 text-sm">{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-8">
          {/* Mobile toggle - visible only on small screens */}
        <div className="lg:hidden mb-4">
          <div className="inline-flex items-center gap-3 rounded-md bg-muted p-1 text-sm" role="tablist" aria-label="Toggle fields or preview on small screens">
            <button type="button" onClick={() => setMobilePane('fields')} className={`px-3 py-1 rounded-md ${mobilePane === 'fields' ? 'bg-white dark:bg-neutral-900 font-medium' : 'bg-transparent'}`} aria-pressed={mobilePane === 'fields'}>Fields</button>
            <button type="button" onClick={() => setMobilePane('preview')} className={`px-3 py-1 rounded-md ${mobilePane === 'preview' ? 'bg-white dark:bg-neutral-900 font-medium' : 'bg-transparent'}`} aria-pressed={mobilePane === 'preview'}>Preview</button>
            <div className="ml-3 text-xs text-muted-foreground">Press <kbd className="px-1 py-0.5 bg-muted rounded">P</kbd> to toggle</div>
          </div>
        </div>

        <div className={`${mobilePane === 'fields' ? 'block' : 'hidden'} lg:block space-y-8 bg-background`}>
          {/* Basic Information Card */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                <p className="text-sm text-muted-foreground">
                  Essential details about your event
                </p>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Event Title *
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => onChange("title", e.target.value)}
                    placeholder="Enter event title"
                    required
                    className="h-11"
                    aria-invalid={!!errors.title}
                    aria-describedby={errors.title ? 'title-error' : undefined}
                  />
                  {errors.title && <p id="title-error" role="alert" className="text-xs mt-1 text-red-600">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-sm font-medium">
                    URL Slug
                  </Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => onChange("slug", e.target.value)}
                    placeholder="my-awesome-event"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate from title
                  </p>
                </div>

                {errors.location && <p id="location-error" role="alert" className="text-xs mt-1 text-red-600">{errors.location}</p>}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Event Type *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => onChange("type", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hackathon">Hackathon</SelectItem>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                        <SelectItem value="MUN">MUN</SelectItem>
                        <SelectItem value="Gaming">Gaming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Format *</Label>
                    <Select
                      value={form.format}
                      onValueChange={(v) => onChange("format", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location *
                  </Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={(e) => onChange("location", e.target.value)}
                    placeholder="Enter venue or platform"
                    required
                    aria-invalid={!!errors.location}
                    aria-describedby={errors.location ? 'location-error' : undefined}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Time Card */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Date & Time
                </h2>
                <p className="text-sm text-muted-foreground">
                  Schedule your event
                </p>
              </div>

              <div className="space-y-6">
                {/* Start Date & Time */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Start Date & Time *
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      id="start"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => onChange("start_date", e.target.value)}
                      required
                      min={todayStr}
                      className="h-11"
                      aria-invalid={!!errors.start}
                      aria-describedby={errors.start ? 'start-error' : undefined}
                    />
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => onChange("start_time", e.target.value)}
                      required
                      min={startTimeMin}
                      className="h-11"
                      aria-invalid={!!errors.start}
                    />
                  </div>
                  {errors.start && <p id="start-error" role="alert" className="text-xs mt-1 text-red-600">{errors.start}</p>}
                </div>

                {/* End Date & Time */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    End Date & Time *
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => onChange("end_date", e.target.value)}
                      required
                      min={endDateMin}
                      className="h-11"
                    />
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => onChange("end_time", e.target.value)}
                      required
                      min={form.end_date === form.start_date ? form.start_time : undefined}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Registration Deadline */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Registration Deadline
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={form.registration_deadline_date}
                      onChange={(e) =>
                        onChange("registration_deadline_date", e.target.value)
                      }
                      min={regDateMin}
                      max={regDateMax}
                      className="h-11"
                    />
                    <Input
                      type="time"
                      value={form.registration_deadline_time}
                      onChange={(e) =>
                        onChange("registration_deadline_time", e.target.value)
                      }
                      min={form.registration_deadline_date === todayStr ? nowTime : '00:00'}
                      max={regTimeMax}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Publish later control */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={publishLater} onChange={(e) => setPublishLater(e.target.checked)} aria-label="Publish later" />
                    <span className="text-sm">Publish later</span>
                  </label>

                  {publishLater && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input type="date" value={publish_date} onChange={(e) => setPublishDate(e.target.value)} className="h-11" aria-label="Publish date" />
                      <Input type="time" value={publish_time} onChange={(e) => setPublishTime(e.target.value)} className="h-11" aria-label="Publish time" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Description</h2>
                <p className="text-sm text-muted-foreground">
                  Tell attendees about your event
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="short_blurb" className="text-sm font-medium">
                    Short Blurb *
                  </Label>
                  <Input
                    id="short_blurb"
                    value={form.short_blurb}
                    onChange={(e) => onChange("short_blurb", e.target.value)}
                    placeholder="A brief one-liner about your event"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overview" className="text-sm font-medium">
                    Overview
                  </Label>
                  <Textarea
                    id="overview"
                    value={form.overview}
                    onChange={(e) => onChange("overview", e.target.value)}
                    rows={4}
                    placeholder="High-level summary of your event"
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="long_description"
                    className="text-sm font-medium"
                  >
                    Detailed Description
                  </Label>
                  <Textarea
                    id="long_description"
                    value={form.long_description}
                    onChange={(e) =>
                      onChange("long_description", e.target.value)
                    }
                    rows={6}
                    placeholder="Full details about your event"
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rules" className="text-sm font-medium">
                    Rules & Guidelines
                  </Label>
                  <Textarea
                    id="rules"
                    value={form.rules}
                    onChange={(e) => onChange("rules", e.target.value)}
                    rows={4}
                    placeholder="Event rules and participation guidelines"
                    className="resize-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prizes Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prizes" className="text-sm font-medium">
                  Prizes
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enter one prize per line
                </p>
              </div>
              <Textarea
                id="prizes"
                value={prizeText}
                onChange={(e) => setPrizeText(e.target.value)}
                rows={5}
                placeholder="1st Prize - ₹10,000&#10;2nd Prize - ₹5,000&#10;3rd Prize - ₹2,500"
                className="resize-none font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Sections & Live Preview */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Sections & Preview</h2>
                  <p className="text-sm text-muted-foreground">Add optional sections that appear on the event page — reorder freely</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="px-3 py-1 rounded-md bg-neutral-50" onClick={() => { if (!sectionOrder.includes('Agenda')) setSectionOrder((s) => [...s, 'Agenda']); }}>Add Agenda</button>
                  <button type="button" className="px-3 py-1 rounded-md bg-neutral-50" onClick={() => { if (!sectionOrder.includes('Speakers')) setSectionOrder((s) => [...s, 'Speakers']); }}>Add Speakers</button>
                  <button type="button" className="px-3 py-1 rounded-md bg-neutral-50" onClick={() => { if (!sectionOrder.includes('FAQs')) { setShowFaqs(true); if (faqs.length === 0) setFaqs([{ id: Date.now().toString(), question: '', answer: '' }]); setSectionOrder((s) => [...s, 'FAQs']); } }}>Add FAQs</button>
                  <button type="button" className="px-3 py-1 rounded-md bg-neutral-50" onClick={() => { if (!sectionOrder.includes('Resources')) setSectionOrder((s) => [...s, 'Resources']); }}>Add Resources</button>
                </div>
              </div>

              <div className="mt-4">
                <EventBuilderExtensions draft={draft} onChange={(d) => { setSectionOrder(d.sections.map((s) => s.type)); manualSaveDraft(); }} />
                {/* On small screens show the preview beneath the sections */}
                <div className="lg:hidden mt-4">
                  <LivePreview draft={draft} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQs: optional. Show toggle first. */}
          <div className="mb-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showFaqs}
                onChange={(e) => {
                  const on = e.target.checked;
                  setShowFaqs(on);
                  if (on && faqs.length === 0) {
                    // initialize one blank FAQ
                    setFaqs([
                      { id: Date.now().toString(), question: "", answer: "" },
                    ]);
                  }
                  if (!on) {
                    // clear faqs when toggle off
                    setFaqs([]);
                  }
                }}
              />
              <span className="text-sm">Add FAQs</span>
            </label>
          </div>

          {showFaqs && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">FAQs</h2>
                  <p className="text-sm text-muted-foreground">
                    Answer common questions
                  </p>
                </div>

                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <Card
                      key={faq.id}
                      draggable
                      onDragStart={() => handleDragStart(faq.id)}
                      onDragOver={(e) => handleDragOver(e, faq.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-move transition-all hover:shadow-md ${
                        draggedFaq === faq.id ? "opacity-50 scale-95" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-3 flex-shrink-0" />
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Question {index + 1}
                              </span>
                              {faqs.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFaq(faq.id)}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <Input
                              placeholder="Enter your question"
                              value={faq.question}
                              onChange={(e) =>
                                updateFaq(faq.id, "question", e.target.value)
                              }
                              className="h-10"
                            />
                            <Textarea
                              placeholder="Enter the answer"
                              value={faq.answer}
                              onChange={(e) =>
                                updateFaq(faq.id, "answer", e.target.value)
                              }
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addFaq}
                    className="w-full border-dashed border-2 h-12 hover:bg-accent"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Tags</h2>
                <p className="text-sm text-muted-foreground">
                  Help people discover your event
                </p>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="gap-1 px-3 py-1.5 text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Input
                  placeholder="Type to search or add new tags..."
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onFocus={() => tagInput && setShowTagSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowTagSuggestions(false), 200)
                  }
                  className="h-11"
                />

                {showTagSuggestions && filteredSuggestions.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                    <CardContent className="p-2">
                      <div className="space-y-1">
                        {filteredSuggestions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => addTag(tag)}
                            className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Press Enter to add a tag or select from suggestions
              </p>
            </CardContent>
          </Card>

          {/* Schedule & Teams Card */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Schedule & Teams</h2>
                <p className="text-sm text-muted-foreground">
                  Optional event logistics
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="schedule" className="text-sm font-medium">
                    Event Schedule
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Format: YYYY-MM-DDTHH:MM | Title | Description (one per
                    line)
                  </p>
                  <Textarea
                    id="schedule"
                    value={scheduleText}
                    onChange={(e) => setScheduleText(e.target.value)}
                    rows={5}
                    placeholder="2025-03-15T09:00 | Opening Ceremony | Welcome address&#10;2025-03-15T10:00 | Event Kickoff | Rules and guidelines"
                    className="resize-none font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teams" className="text-sm font-medium">
                    Event Teams
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Format: Name | Description | Email (one per line)
                  </p>
                  <Textarea
                    id="teams"
                    value={teamsText}
                    onChange={(e) => setTeamsText(e.target.value)}
                    rows={4}
                    placeholder="Organizers | Main event team | contact@example.com&#10;Volunteers | Helper team | volunteers@example.com"
                    className="resize-none font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participant Roles Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Participant Roles</h2>
                <p className="text-sm text-muted-foreground">
                  Optionally define roles attendees can choose when registering. One per line. Format: Role Name | capacity (optional)
                </p>
              </div>

              <Textarea
                id="roles"
                value={rolesText}
                onChange={(e) => setRolesText(e.target.value)}
                rows={4}
                placeholder="Participant | 200\nVolunteer | 50\nJudge | 10"
                className="resize-none font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Links Card */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Links & Social</h2>
                <p className="text-sm text-muted-foreground">
                  Connect with attendees
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="registration_link"
                    className="text-sm font-medium"
                  >
                    Registration Link
                  </Label>
                  <Input
                    id="registration_link"
                    value={form.registration_link}
                    onChange={(e) =>
                      onChange("registration_link", e.target.value)
                    }
                    placeholder="https://forms.example.com/register"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="discord_invite"
                    className="text-sm font-medium"
                  >
                    Discord Invite
                  </Label>
                  <Input
                    id="discord_invite"
                    value={form.discord_invite}
                    onChange={(e) => onChange("discord_invite", e.target.value)}
                    placeholder="https://discord.gg/yourserver"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="instagram_handle"
                    className="text-sm font-medium"
                  >
                    Instagram Handle
                  </Label>
                  <Input
                    id="instagram_handle"
                    value={form.instagram_handle}
                    onChange={(e) =>
                      onChange("instagram_handle", e.target.value)
                    }
                    placeholder="@yourevent"
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images & Media Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Images & Media</h2>
                <p className="text-sm text-muted-foreground">
                  Upload event images or banners
                </p>
              </div>

              <div>
                <FileUpload
                  maxFiles={1}
                  maxSizeMB={10}
                  onFilesChange={(files) => {
                    const arr = files as Array<{ file: File; preview?: string }>;
                    // If the hook provides a preview (blob URL), use it for immediate preview
                    if (arr.length > 0 && arr[0].preview) {
                      setCoverUrl(arr[0].preview);
                    } else if (arr.length === 0) {
                      setCoverUrl(null);
                    }

                    // Map hook files to the shape expected by eventService
                    const mapped = arr.map((f) => ({
                      file: f.file,
                      name: f.file.name,
                    }));
                    setUploadedFiles(mapped);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || loadingEvent}
              className="flex-1 h-12 text-base"
              onClick={handleSubmit}
            >
              {loading
                ? isEditMode
                  ? "Updating Event..."
                  : "Creating Event..."
                : isEditMode
                ? "Update Event"
                : "Create Event"}
            </Button>
          </div>
          </div>

          {/* Mobile-only preview pane (toggled) */}
          <div className={`${mobilePane === 'preview' ? 'block' : 'hidden'} lg:hidden mt-4`}>
            <LivePreview draft={draft} />
          </div>

          <aside className={`${showPreview ? 'hidden lg:block' : 'hidden'} sticky top-24 self-start h-[calc(100vh-6rem)] overflow-auto`}>
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground font-medium mb-3">Preview</div>
                <LivePreview draft={draft} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
