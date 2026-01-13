import Hero from "@/components/Hero";
import About from "@/components/About";
import CurrentEventsStrip from "@/components/CurrentEventsStrip";
import Footer from "@/components/Footer";
import { BackgroundSection } from "@/components/BackgroundSystem/BackgroundSection";
import { useBackground } from "@/components/BackgroundSystem/BackgroundContext";
import { useTheme } from "@/contexts/ThemeContext";

const Index = () => {
  const { theme } = useTheme();
  const { updateConfig } = useBackground();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <BackgroundSection semanticMode="scanning">
        <Hero />
      </BackgroundSection>

      <BackgroundSection semanticMode="thinking">
        <About />
      </BackgroundSection>

      <BackgroundSection semanticMode="executing">
        <CurrentEventsStrip />
      </BackgroundSection>

      <Footer />
    </main>
  );
};

export default Index;
