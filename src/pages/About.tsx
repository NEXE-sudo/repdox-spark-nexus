import { motion, useScroll, useTransform } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";
import { useRef } from "react";
import { useInView } from "react-intersection-observer";

const features = [
  {
    icon: Zap,
    title: "Energize Innovation",
    description: "Spark creativity through hands-on hackathons and collaborative workshops.",
    gradient: "from-yellow-400 to-orange-500"
  },
  {
    icon: Target,
    title: "Build Skills",
    description: "Develop technical and leadership abilities in real-world scenarios.",
    gradient: "from-blue-400 to-cyan-500"
  },
  {
    icon: Heart,
    title: "Foster Community",
    description: "Connect with like-minded students, mentors, and industry leaders.",
    gradient: "from-pink-400 to-rose-500"
  },
  {
    icon: Lightbulb,
    title: "Drive Impact",
    description: "Transform ideas into solutions that make a difference.",
    gradient: "from-purple-400 to-indigo-500"
  },
];

export default function About() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["100px", "-100px"]);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section ref={containerRef} className="py-32 px-6 relative overflow-hidden">
      {/* Animated background layers */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)]"
      />
      
      <div ref={ref} className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-block mb-6"
          >
            <span className="text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400">
              About Repdox
            </span>
          </motion.div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            About Repdox
          </h2>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
            We're a youth-led movement empowering students and early-career professionals 
            through transformative events. From hackathons to Model UN conferences, 
            gaming tournaments to skill-building workshops—we create spaces where 
            ambition meets opportunity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group relative"
              >
                <div className="h-full bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md rounded-2xl p-6 border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300">
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${feature.gradient}`} />
                  
                  <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Extra Content: Organizer Benefits, Guidelines, Contact */}
        <div className="max-w-4xl mx-auto mt-16 space-y-10">
          <section className="bg-muted rounded-lg p-6 border border-muted/40">
            <h3 className="text-2xl font-semibold mb-3">For Organizers</h3>
            <p className="text-muted-foreground">
              Repdox supports organizers with tools to create events, manage registrations,
              accept role-based signups, and export participant lists. We provide
              templates and best practices for running safe, accessible, and impactful events.
            </p>
          </section>

          <section className="bg-muted rounded-lg p-6 border border-muted/40">
            <h3 className="text-2xl font-semibold mb-3">Community Guidelines</h3>
            <p className="text-muted-foreground">
              We strive to build welcoming spaces. Treat others with respect, follow local
              laws and venue rules, and report any behavior that makes you uncomfortable.
              Organizers are expected to provide clear codes of conduct and accessibility information.
            </p>
          </section>

          <section className="bg-muted rounded-lg p-6 border border-muted/40">
            <h3 className="text-2xl font-semibold mb-3">Get Involved</h3>
            <p className="text-muted-foreground">
              Interested in contributing content, organizing events, or sponsoring? Reach out
              to <a className="underline" href="/contact">our team</a> with your ideas — we’re always happy to collaborate.
            </p>
          </section>

          <section className="bg-muted rounded-lg p-6 border border-muted/40">
            <h3 className="text-2xl font-semibold mb-3">Verification & Safety</h3>
            <p className="text-muted-foreground">
              We offer account verification via email or phone to help organisers and attendees trust interactions on the platform. You can request a verification token in your profile settings — this token is sent via email or SMS (or shown during testing).
            </p>
            <p className="text-muted-foreground mt-2">
              Organisers should provide clear codes of conduct and keep registration deadlines and capacities up to date. Use the export tools in the organiser dashboard to manage participant lists securely.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}