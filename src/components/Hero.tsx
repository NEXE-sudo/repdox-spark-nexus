import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSpring, animated } from "@react-spring/web";
import CountUp from "@/components/ui/CountUp";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scrollY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);

  const [springs, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const mouseX = (e.clientX - rect.left) / rect.width;
    const mouseY = (e.clientY - rect.top) / rect.height;

    api.start({
      rotateX: (mouseY - 0.5) * 10,
      rotateY: (mouseX - 0.5) * -10,
    });
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background is handled by AtmosphericBackground */}

      <motion.div
        style={{ y: scrollY, opacity, scale }}
        className="relative z-10 max-w-6xl mx-auto px-6 text-center"
      >
        <animated.div
          onMouseMove={handleMouseMove}
          onMouseLeave={() => api.start({ rotateX: 0, rotateY: 0 })}
          style={{
            transform: springs.rotateX.to((rx) =>
              springs.rotateY.to(
                (ry) =>
                  `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
              ),
            ),
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 backdrop-blur-sm border border-border mb-8"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">
              Next-Gen Event Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/40"
          >
            Think. Build.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              Transform.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Join hackathons, MUNs and workshops that spark change. Build.
            Compete. Connect.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Button
              size="lg"
              className="group relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg rounded-2xl"
              onClick={() => (window.location.href = "/events")}
            >
              <span className="relative z-10 flex items-center gap-2">
                View Events
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity" />
            </Button>
          </motion.div>

          {/* <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {[
              { label: "Events Run", value: 50, suffix: "+" },
              { label: "Attendees", value: 5000, suffix: "+" },
              { label: "Partners", value: 30, suffix: "+" },
            ].map((stat, index) => (
              <div key={index} className="text-center group cursor-pointer">
                <div className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 group-hover:scale-110 transition-transform">
                  <CountUp
                    from={0}
                    to={stat.value}
                    separator=","
                    direction="up"
                    duration={2}
                    suffix={stat.suffix}
                  />
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div> */}
        </animated.div>
      </motion.div>
    </section>
  );
}
