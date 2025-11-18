import { motion } from "framer-motion";
import { Heart, Lightbulb, Users, Target } from "lucide-react";

export default function About() {
  const values = [
    {
      icon: Lightbulb,
      title: "Innovate",
      description:
        "Foster creativity and bold thinking through hands-on experiences.",
    },
    {
      icon: Users,
      title: "Connect",
      description:
        "Build a vibrant community of like-minded innovators and leaders.",
    },
    {
      icon: Heart,
      title: "Empower",
      description:
        "Equip students with skills and confidence to transform ideas into reality.",
    },
    {
      icon: Target,
      title: "Impact",
      description:
        "Create solutions that address real-world challenges and drive change.",
    },
  ];

  const team = [
    {
      name: "Alex Chen",
      role: "Founder & CEO",
      bio: "Passionate about youth empowerment and tech innovation.",
    },
    {
      name: "Jordan Smith",
      role: "Head of Events",
      bio: "Organizes world-class hackathons and conferences.",
    },
    {
      name: "Maya Patel",
      role: "Community Lead",
      bio: "Builds and nurtures our thriving global community.",
    },
    {
      name: "Sam Rodriguez",
      role: "Operations Lead",
      bio: "Ensures seamless execution of all initiatives.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-accent/10 to-background border-b border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              About Repdox
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We're a youth-led movement empowering students and early-career
              professionals through transformative events, skill-building
              opportunities, and a global community of innovators.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Our Mission
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To empower students and early-career professionals to think
              boldly, build meaningful solutions, and transform their groups. We
              believe that by bringing together diverse talents through
              hackathons, conferences, and workshops, we can unlock potential
              and drive positive change.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Our Vision
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A world where innovation knows no boundaries, where the brightest
              minds collaborate across borders, and where every young person has
              access to the resources, mentorship, and opportunities they need
              to create lasting impact in their fields and groups.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 bg-accent/5 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">
            Our Core Values
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="p-6 bg-card rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <Icon className="w-10 h-10 text-accent mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {value.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 text-center">
          {[
            { number: "50+", label: "Events Hosted" },
            { number: "5,000+", label: "Participants" },
            { number: "30+", label: "Partner Organizations" },
            { number: "15", label: "Countries Reached" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-accent mb-2">
                {stat.number}
              </h3>
              <p className="text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-6 bg-accent/5 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-foreground mb-12">
            Meet Our Team
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-lg border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-32 bg-gradient-to-br from-accent/20 to-accent/5"></div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground">
                    {member.name}
                  </h3>
                  <p className="text-sm text-accent font-medium mb-2">
                    {member.role}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Join Our Community
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Ready to think boldly, build solutions, and transform your future?
          Join thousands of innovators in the Repdox community.
        </p>
        <a
          href="/events"
          className="inline-block px-8 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          Explore Events
        </a>
      </section>
    </main>
  );
}
