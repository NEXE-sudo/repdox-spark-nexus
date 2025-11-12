import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCountdown } from "@/hooks/useCountdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Copy,
  Check,
  Instagram,
} from "lucide-react";
import { getEventImage } from "@/lib/eventImages";
import { getSignedUrl } from '@/lib/storageService';
import { toast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";
import AddToCalendar from "@/components/AddToCalendar";

export default function EventDetail() {
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const countdown = useCountdown(event?.start_at || "");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'details';

  const setTab = (tab: string) => {
    const p = new URLSearchParams(searchParams);
    if (tab === 'details') {
      p.delete('tab');
    } else {
      p.set('tab', tab);
    }
    setSearchParams(p);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Resolve image for private storage paths when needed
  const [heroImageSrc, setHeroImageSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!event?.image_url) {
        setHeroImageSrc(undefined);
        return;
      }

      const mapped = getEventImage(event.image_url);
      if (mapped) {
        if (mounted) setHeroImageSrc(mapped);
        return;
      }

      // If image_url isn't an absolute URL, try to get a signed URL for private bucket
      if (!/^https?:\/\//i.test(event.image_url)) {
        try {
          const signed = await getSignedUrl(event.image_url, 'events');
          if (mounted) setHeroImageSrc(signed);
          return;
        } catch (e) {
          // fallback to the raw path (may not load if private)
          if (mounted) setHeroImageSrc(event.image_url);
          return;
        }
      }

      // absolute URL
      if (mounted) setHeroImageSrc(event.image_url);
    })();

    return () => { mounted = false; };
  }, [event?.image_url]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Event link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch schedules and teams when needed
  const { data: schedules = [] } = useQuery({
    queryKey: ['event_schedules', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase.from('event_schedules').select('*').eq('event_id', event.id).order('start_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && activeTab === 'schedule'
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['event_teams', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase.from('event_teams').select('*').eq('event_id', event.id).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id && activeTab === 'teams'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (async () => {
      try {
        // attempt to attach user if signed in
        const userResp = await supabase.auth.getUser();
        const user = userResp.data.user ?? null;

        const payload = {
          event_id: event.id,
          user_id: user ? user.id : null,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          status: 'registered'
        };

        const { error } = await supabase.from('event_registrations').insert(payload);
        if (error) throw error;

        toast({
          title: 'Registration submitted!',
          description: 'You are registered for this event. Check your email for confirmation.'
        });
        setFormData({ name: '', email: '', phone: '', message: '' });
      } catch (err: unknown) {
        const msg = typeof err === 'object' && err !== null && 'message' in err && typeof (err as Record<string, unknown>).message === 'string' ? ((err as Record<string, unknown>).message as string) : String(err);
        toast({ title: 'Registration failed', description: msg });
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-96 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
        <Link to="/events">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Link>
      </div>
    );
  }

  // Build structured data for the event (schema.org Event)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_at,
    endDate: event.end_at || undefined,
    eventAttendanceMode:
      event.format === "Online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: event.is_active
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventCancelled",
    location:
      event.format === "Online"
        ? {
            "@type": "VirtualLocation",
            url: event.registration_link || window.location.href,
          }
        : { "@type": "Place", name: event.location },
    image: event.image_url ? [event.image_url] : undefined,
    description: event.short_blurb || event.overview || event.long_description,
    organizer: event.organisers || undefined,
    offers: event.registration_link
      ? { "@type": "Offer", url: event.registration_link }
      : undefined,
    url: window.location.href,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Hero */}
      <section className="relative h-[60vh] overflow-hidden">
        <img
          src={heroImageSrc ?? getEventImage(event?.image_url) ?? event?.image_url}
          alt={event?.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-12">
            <Link to="/events">
              <Button variant="ghost" size="sm" className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Button>
            </Link>

            <div className="mb-6">
              <Badge className="bg-accent text-accent-foreground border-0 px-3 py-1 text-sm font-semibold">
                {event.type}
              </Badge>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-foreground mb-4"
            >
              {event.title}
            </motion.h1>

            <div className="flex items-center gap-4 text-accent font-mono text-lg">
              <Clock className="h-5 w-5" />
              {countdown.isExpired ? (
                <span>Event has started</span>
              ) : (
                <span>
                  Starts in{" "}
                  {`${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="mb-6 px-6">
            <div className="flex items-center gap-3 border-b border-border">
              <button onClick={() => setTab('details')} className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab==='details' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Details
              </button>
              <button onClick={() => setTab('schedule')} className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab==='schedule' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Local Event Schedule
              </button>
              <button onClick={() => setTab('teams')} className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab==='teams' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                Teams
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            

            {activeTab === 'schedule' && (
              <Card>
                <CardHeader>
                  <CardTitle>Local Event Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No schedule available for this event.</p>
                  ) : (
                    <ul className="space-y-4">
                      {schedules.map((s: { id: string; start_at: string; title: string; description?: string }) => (
                        <li key={s.id} className="border rounded p-3">
                          <div className="text-sm text-muted-foreground">
                            {s.start_at ? new Date(s.start_at).toLocaleString() : ''}
                          </div>
                          <div className="font-medium">{s.title}</div>
                          {s.description && <div className="text-sm text-muted-foreground">{s.description}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'teams' && (
              <Card>
                <CardHeader>
                  <CardTitle>Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {teams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No teams listed for this event.</p>
                  ) : (
                    <div className="space-y-4">
                      {teams.map((t: { id: string; name: string; description?: string; contact_email?: string }) => (
                        <div key={t.id} className="border rounded p-3">
                          <div className="font-medium">{t.name}</div>
                          {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                          {t.contact_email && <div className="text-sm text-muted-foreground">Contact: {t.contact_email}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'details' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {event.overview ||
                        event.long_description ||
                        event.short_blurb}
                    </p>

                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-accent/30"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* FAQs */}
                {event.faqs &&
                  Array.isArray(event.faqs) &&
                  event.faqs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>FAQs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible>
                          {(event.faqs as unknown as Array<{question: string; answer: string}>).map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                              <AccordionTrigger>{faq.question}</AccordionTrigger>
                              <AccordionContent>{faq.answer}</AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                {/* Registration Form */}
                <Card id="register">
                  <CardHeader>
                    <CardTitle>Register Now</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Why do you want to attend?</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({ ...formData, message: e.target.value })
                          }
                          rows={4}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        Submit Registration
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.start_at).toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.start_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {event.location}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {event.format}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">

                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>

                  <AddToCalendar event={event} />

                  {event.discord_invite && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <a
                        href={event.discord_invite}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Users className="h-4 w-4" />
                        Join Discord
                      </a>
                    </Button>
                  )}

                  {event.instagram_handle && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      asChild
                    >
                      <a
                        href={`https://instagram.com/${event.instagram_handle.replace(
                          "@",
                          ""
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram className="h-4 w-4" />
                        Follow on Instagram
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Prizes */}
            {event.prizes &&
              Array.isArray(event.prizes) &&
              event.prizes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prizes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {event.prizes.map((prize: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="text-accent">•</span>
                          <span className="text-sm">{prize}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
