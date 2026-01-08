import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Users } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import CountUp from '@/components/ui/CountUp'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Event atmosphere"
          className="w-full h-full object-cover filter grayscale contrast-100 brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      </div>

      {/* Animated Background Shapes */}
      <div className="absolute inset-0 z-0 opacity-20">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-20 right-20 w-64 h-64 rounded-full bg-foreground blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-20 left-20 w-80 h-80 rounded-full bg-foreground blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            Think. Build. Transform.
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto">
            Join hackathons, MUNs and workshops that spark change. Build. Compete. Connect.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Button 
                variant="hero" 
                size="lg" 
                className="group"
                onClick={() => window.location.href = '/events'}
              >
                View Events
                <Calendar className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.6, duration: 0.8 }}
  className="flex flex-wrap justify-center gap-8 md:gap-16"
>
  {[
    { label: "Events Run", value: 50, suffix: "+" },
    { label: "Attendees", value: 5000, suffix: "+" },
    { label: "Partners", value: 30, suffix: "+" },
  ].map((stat, index) => (
    <div key={index} className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">
        <CountUp
          from={0}
          to={stat.value}
          separator=","
          direction="up"
          duration={2}
          suffix={stat.suffix}
          className="count-up-text"
        />
      </div>
      <div className="text-sm md:text-base text-primary-foreground/80">
        {stat.label}
      </div>
    </div>
  ))}
</motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
      >
        <ArrowRight className="h-6 w-6 text-primary-foreground rotate-90" />
      </motion.div>
    </section>
  );
}
