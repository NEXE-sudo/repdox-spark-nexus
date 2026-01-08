import Hero from "@/components/Hero";
import About from "@/components/About";
import CurrentEventsStrip from "@/components/CurrentEventsStrip";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <About />
      <CurrentEventsStrip />
      <Footer />
    </main>
  );
};

export default Index;
