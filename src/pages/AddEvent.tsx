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

        // Set prizes
        if (event.prizes && Array.isArray(event.prizes)) {
          setPrizeText(event.prizes.join("\n"));
        }

        // Set FAQs
        if (event.faqs && Array.isArray(event.faqs)) {
          const loadedFaqs = event.faqs.map((f: any, idx: number) => ({
            id: `faq-${idx}`,
            question: f.question || "",
            answer: f.answer || "",
          }));
          if (loadedFaqs.length > 0) {
            setFaqs(loadedFaqs);
            setShowFaqs(true);
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
      } catch (err: any) {
        console.error("Failed to load event:", err);
        alert("Failed to load event: " + err.message);
        navigate("/events");
      } finally {
        setLoadingEvent(false);
      }
    };

    loadEvent();
  }, [isEditMode, slug, navigate]);

  const onChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

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
    // Basic client-side validation
    if (!form.title || !form.start_date || !form.start_time || !form.location) {
      alert("Please fill required fields: Title, Start date/time and Location");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        form,
        tags,
        scheduleText,
        teamsText,
        prizeText,
        faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
        uploadedFiles,
      };

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
    } catch (err: any) {
      console.error(
        isEditMode ? "Update event failed" : "Create event failed",
        err
      );
      let message = "Unknown error";
      try {
        if (err instanceof Error) {
          try {
            const parsed = JSON.parse(err.message);
            message = parsed?.message || err.message;
          } catch {
            message = err.message;
          }
        } else if (typeof err === "string") {
          message = err;
        } else if (err && typeof err === "object") {
          message = (err as any).message || JSON.stringify(err);
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            {isEditMode ? "Edit Event" : "Create Event"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Update your event details"
              : "Fill in the details to create your event"}
          </p>
        </div>

        <div className="space-y-8 bg-black">
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
                  />
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
                      type="date"
                      value={form.start_date}
                      onChange={(e) => onChange("start_date", e.target.value)}
                      required
                      className="h-11"
                    />
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => onChange("start_time", e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>
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
                      className="h-11"
                    />
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => onChange("end_time", e.target.value)}
                      required
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
                      className="h-11"
                    />
                    <Input
                      type="time"
                      value={form.registration_deadline_time}
                      onChange={(e) =>
                        onChange("registration_deadline_time", e.target.value)
                      }
                      className="h-11"
                    />
                  </div>
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
                    // Map hook files to the shape expected by eventService
                    const mapped = files.map((f: any) => ({
                      file: f.file as File,
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
      </div>
    </div>
  );
}
