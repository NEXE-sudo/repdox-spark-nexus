import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { Link } from "react-router-dom";
import { getEventImage, getEventImageUrl } from "@/lib/eventImages";
import { useEffect, useState } from 'react';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    type: string;
    start_at: string;
    location: string;
    format: string;
    short_blurb: string;
    image_url: string;
    tags: string[];
  };
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const countdown = useCountdown(event.start_at);
  const [imgSrc, setImgSrc] = useState<string | undefined>(() => getEventImage(event.image_url) || event.image_url || undefined);

  useEffect(() => {
    let mounted = true;
    async function resolve() {
      if (!event.image_url) return;
      if (/^https?:\/\//i.test(event.image_url)) return; // already absolute
      const mapped = getEventImage(event.image_url);
      if (mapped) return; // mapped to local asset
      try {
        const url = await getEventImageUrl(event.image_url);
        if (mounted && url) setImgSrc(url);
      } catch (e) {
        console.error('Failed to resolve event image url', e);
      }
    }
    resolve();
    return () => { mounted = false; };
  }, [event.image_url]);

    if (compact) {
    return (
      <div className="flex-shrink-0 w-[380px] snap-center">
        <Card className="h-full border-accent/20 bg-card/80 backdrop-blur-sm hover:border-accent transition-all duration-300 hover:shadow-lg">
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            <img
              src={imgSrc}
              alt={event.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border-accent/30"
            >
              {event.type}
            </Badge>
          </div>

          <CardHeader className="pb-3">
            <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
            <CardDescription className="line-clamp-2 text-xs">
              {event.short_blurb}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(event.start_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="h-3 w-3 text-accent" />
              <span className="text-accent font-mono">
                {countdown.isExpired ? 'Started' : `Starts in ${countdown.compactFormatted}`}
              </span>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Link to={`/events/${event.slug}`} className="w-full">
              <Button variant="default" size="sm" className="w-full">
                Details
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden h-full flex flex-col group border-border/50 hover:border-accent/50 transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        <img
          src={imgSrc}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <Badge 
          variant="secondary" 
          className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border-accent/30"
        >
          {event.type}
        </Badge>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
          <div className="flex items-center gap-2 text-sm text-accent font-mono">
            <Clock className="h-4 w-4" />
            {countdown.isExpired ? 'Event Started' : `Starts in ${countdown.formatted}`}
          </div>
        </div>
      </div>

      <CardHeader>
        <CardTitle className="text-2xl group-hover:text-primary transition-colors">
          {event.title}
        </CardTitle>
        <CardDescription>{event.short_blurb}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(event.start_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.location}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {event.format}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {event.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs border-accent/30">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Link to={`/events/${event.slug}`} className="flex-1">
          <Button variant="default" className="w-full">
            Details
          </Button>
        </Link>
        <Link to={`/events/${event.slug}#register`} className="flex-1">
          <Button variant="outline" className="w-full border-accent/30 hover:bg-accent/10">
            Register
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
