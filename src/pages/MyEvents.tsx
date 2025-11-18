import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import eventService from "@/lib/eventService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, MapPin, Edit, Trash2, Plus, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getEventImage } from "@/lib/eventImages";
import Footer from "@/components/Footer";

export default function MyEvents() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your events",
          variant: "destructive",
        });
        navigate("/signin");
      } else {
        setUser(user);
      }
    };
    checkAuth();
  }, [navigate]);

  const {
    data: events = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["my-events"],
    queryFn: () => eventService.getMyEvents(),
    enabled: !!user,
  });

  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;

    try {
      await eventService.deleteEvent(eventToDelete);
      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully",
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-b from-accent/10 to-background border-b border-border/50">
        <div className="max-w-7xl mx-auto">
          <Link to="/events">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
              My Events
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mb-6">
              Manage all the events you've created
            </p>
            <Link to="/events/new">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create New Event
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {events.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground mb-6">
                You haven't created any events yet
              </p>
              <Link to="/events/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <Card className="overflow-hidden h-full flex flex-col group border-border/50 hover:border-accent/50 transition-all duration-300">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getEventImage(event.image_url) || event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <Badge
                        variant="secondary"
                        className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm border-accent/30"
                      >
                        {event.type}
                      </Badge>
                      {!event.is_active && (
                        <Badge
                          variant="destructive"
                          className="absolute top-4 left-4 bg-destructive/90 backdrop-blur-sm"
                        >
                          Deleted
                        </Badge>
                      )}
                    </div>

                    <CardHeader>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {event.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(event.start_at).toLocaleDateString(
                              "en-IN",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.format}
                        </Badge>
                      </div>
                    </CardContent>

                    <CardFooter className="gap-2">
                      <Link to={`/events/${event.slug}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View
                        </Button>
                      </Link>
                      {event.is_active && (
                        <>
                          <Link
                            to={`/events/${event.slug}/edit`}
                            className="flex-1"
                          >
                            <Button
                              variant="default"
                              className="w-full"
                              size="sm"
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(event.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate your event. It will no longer be visible to
              other users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
