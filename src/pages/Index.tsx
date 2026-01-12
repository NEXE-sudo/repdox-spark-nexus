import Hero from "@/components/Hero";
import About from "@/components/About";
import CurrentEventsStrip from "@/components/CurrentEventsStrip";
import Footer from "@/components/Footer";
import Particles from "@/components/Particles";
import { useTheme } from "@/contexts/ThemeContext";

const Index = () => {
  const { theme } = useTheme();

  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={theme === 'dark' ? ['#ffffff', '#8B5CF6'] : ['#8B5CF6', '#EC4899']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
          className="h-full w-full"
        />
      </div>
      <div className="relative z-10">
        <Hero />
        <About />
        <CurrentEventsStrip />
        <Footer />
      </div>
    </main>
  );
};

export default Index;
