import Hero from "@/components/Hero";
import About from "@/components/About";
import CurrentEventsStrip from "@/components/CurrentEventsStrip";
import Team from "@/components/Team";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <CurrentEventsStrip />
      <About />
      <Team />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
