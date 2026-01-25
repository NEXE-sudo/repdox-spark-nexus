import { motion } from "framer-motion";
import { Zap, Target, Heart, Lightbulb } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Energize Innovation",
    description: "Spark creativity through hands-on hackathons and collaborative workshops.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Target,
    title: "Build Skills",
    description: "Develop technical and leadership abilities in real-world scenarios.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Heart,
    title: "Foster Community",
    description: "Connect with like-minded students, mentors, and industry leaders.",
    gradient: "from-pink-500 to-purple-500",
  },
  {
    icon: Lightbulb,
    title: "Drive Impact",
    description: "Transform ideas into solutions that make a difference.",
    gradient: "from-yellow-500 to-orange-500",
  },
];

export default function About() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            About Repdox
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We're a youth-led movement empowering students and early-career professionals 
            through transformative events. From hackathons to Model UN conferences, 
            gaming tournaments to skill-building workshops—we create spaces where 
            ambition meets opportunity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group"
              >
                <div className="bg-card rounded-lg p-6 h-full border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <Icon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
