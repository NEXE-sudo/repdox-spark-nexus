import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";

export default function CurrentEventsStrip() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['current-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_at', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return data || [];
    },
  });

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = 380 + 24; // card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    
    const newIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(events.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
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

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  if (isLoading) {
    return (
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="max-w-[95vw] mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded-xl w-1/3 mx-auto" />
            <div className="h-96 bg-muted rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyEventsState />
    );
  }

  return (
    <section 
      ref={ref}
      className="py-24 px-0 relative overflow-hidden"
    >
      {/* Animated background gradient */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0"
      />

      <div className="max-w-[95vw] mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-block mb-4 text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400"
          >
            Featured Events
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60">
            Upcoming Events
          </h2>
          <p className="text-muted-foreground text-lg">
            Don't miss out on our next events
          </p>
        </motion.div>

        <div className="relative">
          {/* Navigation Buttons with magnetic effect */}
          <MagneticButton
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20"
            onClick={() => scroll('left')}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </MagneticButton>

          <MagneticButton
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20"
            onClick={() => scroll('right')}
            disabled={currentIndex === events.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </MagneticButton>

          {/* Scrollable Container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing px-16 py-4"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
          >
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 50 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <EventCard event={event} compact />
              </motion.div>
            ))}
          </motion.div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {events.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  if (scrollContainerRef.current) {
                    const cardWidth = 380 + 24;
                    scrollContainerRef.current.scrollTo({
                      left: index * cardWidth,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'w-2 bg-muted hover:bg-muted-foreground/40'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Magnetic Button Component
function MagneticButton({ 
  children, 
  className = "", 
  onClick,
  disabled = false 
}: { 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      className={`p-3 rounded-full bg-accent/10 backdrop-blur-md border border-border hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.button>
  );
}
