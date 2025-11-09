import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import EventCard from "./EventCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function CurrentEventsStrip() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [srAnnouncement, setSrAnnouncement] = useState<string>('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['current-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
  });

  const {
    currentIndex,
    isPaused,
    pause,
    resume,
    goToNext,
    goToPrev,
    goToIndex,
  } = useAutoScroll({
    itemCount: events.length,
    intervalMs: 7000,
    pauseOnHover: true,
    pauseOnFocus: true,
  });

  // local wrappers to announce pause/resume reasons for screen readers
  const pauseWithAnnounce = (reason: string) => {
    pause(reason);
    setSrAnnouncement(`Carousel paused: ${reason}`);
    // clear announcement shortly after to avoid repeated reads
    setTimeout(() => setSrAnnouncement(''), 1200);
  };

  const resumeWithAnnounce = (reason: string) => {
    resume(reason);
    setSrAnnouncement('Carousel resumed');
    setTimeout(() => setSrAnnouncement(''), 1200);
  };

  // Scroll to current index
  useEffect(() => {
    if (!scrollContainerRef.current || events.length === 0) return;
    
    const container = scrollContainerRef.current;
    const cardWidth = 320 + 16; // card width + gap
    const targetScroll = currentIndex * cardWidth;
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });

    // Announce visible event title for screen reader users
    const visible = events[currentIndex];
    if (visible) {
      setSrAnnouncement(`Showing event: ${visible.title}`);
      setTimeout(() => setSrAnnouncement(''), 1200);
    }
  }, [currentIndex, events]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
    pauseWithAnnounce('drag');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => resumeWithAnnounce('drag'), 100);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setTimeout(() => resumeWithAnnounce('drag'), 100);
    }
  };

  if (isLoading) {
    return (
      <section className="py-12 px-6 bg-background/50 backdrop-blur-sm border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <section 
      className="py-12 px-6 bg-background/50 backdrop-blur-sm border-y border-border/50"
      onMouseEnter={() => pauseWithAnnounce('hover')}
      onMouseLeave={() => resumeWithAnnounce('hover')}
      onFocus={() => pauseWithAnnounce('focus')}
      onBlur={() => resumeWithAnnounce('focus')}
      aria-atomic="true"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Upcoming Events
          </h2>
          <p className="text-muted-foreground">
            Don't miss out on our next events
          </p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border-accent/30 hover:bg-accent/10"
            onClick={goToPrev}
            aria-label="Previous event"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm border-accent/30 hover:bg-accent/10"
            onClick={goToNext}
            aria-label="Next event"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing px-12"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} compact />
            ))}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {events.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-accent' 
                    : 'w-2 bg-muted hover:bg-accent/50'
                }`}
                aria-label={`Go to event ${index + 1}`}
                aria-current={index === currentIndex}
              />
            ))}
          </div>

          {/* Progress Bar */}
          {!isPaused && (
            <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 7, ease: "linear" }}
                key={currentIndex}
              />
            </div>
          )}
        
          {/* Offscreen live region for announcements (pause/resume/visible item) */}
          <div className="sr-only" aria-live="polite">{srAnnouncement}</div>
        </div>
      </div>
    </section>
  );
}
