import Hero from "@/components/Hero";
import About from "@/components/About";
import CurrentEventsStrip from "@/components/CurrentEventsStrip";
import { useTheme } from "@/contexts/ThemeContext";

const Index = () => {
  const { theme } = useTheme();

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Hero />
      <About />
      <CurrentEventsStrip />
    </main>
  );
};

export default Index;
