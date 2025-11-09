import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import hackathonImg from "@/assets/event-hackathon.jpg";
import munImg from "@/assets/event-mun.jpg";
import gamingImg from "@/assets/event-gaming.jpg";
import workshopImg from "@/assets/event-workshop.jpg";

const events = [
  {
    id: 1,
    title: "CodeCraft Hackathon 2025",
    type: "Hackathon",
    description: "48-hour coding marathon building solutions for social impact. Form teams, ideate, and ship innovative projects.",
    date: "March 15-17, 2025",
    location: "Tech Hub, Mumbai",
    attendees: "200+",
    image: hackathonImg,
    tags: ["Tech", "Innovation", "Prizes"],
  },
  {
    id: 2,
    title: "Global Youth MUN",
    type: "MUN",
    description: "Debate international policies, represent nations, and develop diplomatic skills in this prestigious Model UN conference.",
    date: "April 8-10, 2025",
    location: "Convention Center, Delhi",
    attendees: "300+",
    image: munImg,
    tags: ["Debate", "Leadership", "Diplomacy"],
  },
  {
    id: 3,
    title: "Esports Championship",
    type: "Gaming",
    description: "Compete in popular games, showcase your skills, and win amazing prizes in our multi-game tournament.",
    date: "May 20-21, 2025",
    location: "Gaming Arena, Bangalore",
    attendees: "150+",
    image: gamingImg,
    tags: ["Gaming", "Competition", "Esports"],
  },
  {
    id: 4,
    title: "AI & ML Workshop",
    type: "Workshop",
    description: "Learn cutting-edge machine learning techniques from industry experts. Hands-on projects included.",
    date: "June 5, 2025",
    location: "Online",
    attendees: "100+",
    image: workshopImg,
    tags: ["AI", "Learning", "Career"],
  },
];

export default function Events() {
  return (
    <section className="py-24 px-6 bg-background" id="events">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Upcoming Events
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join our next event and be part of a vibrant community driving change through action.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="overflow-hidden h-full flex flex-col group cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                      {event.type}
                    </Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    {event.title}
                  </CardTitle>
                  <CardDescription>{event.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.attendees} Expected</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button className="w-full group/btn" variant="default">
                    Register Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
