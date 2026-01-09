import { useEffect, useState, useRef } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import IntroLoader from '@/components/IntroLoader';
import Index from "./pages/Index";
import EventsList from "./pages/EventsList";
import EventDetail from "./pages/EventDetail";
import AddEvent from "./pages/AddEvent";
import MyEvents from "./pages/MyEvents";
import Contact from "./pages/Contact";
import SignIn from "./pages/SignIn";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import CommentDetail from "./pages/CommentDetail";
import NotFound from "./pages/NotFound";
import Nav from "@/components/Nav";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import Groups from "./pages/Groups";
import AnimatedBackground from "@/components/AnimatedBackground";
import SmoothScroll from "@/components/SmoothScroll";
import Loading from '@/loading';

const queryClient = new QueryClient();

const App = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(true);
const loadingTimeoutRef = useRef<number | null>(null);

useEffect(() => {
  const onLoad = () => {
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    setIsPageLoading(false);
  };

  if (document.readyState === 'complete') {
    onLoad();
  } else {
    window.addEventListener('load', onLoad, { once: true });
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsPageLoading(false);
      loadingTimeoutRef.current = null;
    }, 1200); // fallback
  }

  return () => {
    window.removeEventListener('load', onLoad);
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };
}, []);

  useEffect(() => {
    try {
      const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
      if (hasSeenIntro) setShowIntro(false);
    } catch (e) {
      // In environments without sessionStorage, skip intro
      setShowIntro(false);
    }
  }, []);

  // Show a small top loading bar on internal navigation clicks
useEffect(() => {
  const showTempLoading = () => {
    setIsPageLoading(true);
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
    }
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsPageLoading(false);
      loadingTimeoutRef.current = null;
    }, 900);
  };

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest && (target.closest('a') as HTMLAnchorElement | null);
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
    } catch {
      return;
    }
    showTempLoading();
  };

  const onPop = () => setIsPageLoading(false);

  // Patch history APIs to detect programmatic navigations
  const _push = history.pushState;
  const _replace = history.replaceState;
  (history as any).pushState = function (...args: any[]) {
    _push.apply(history, args);
    window.dispatchEvent(new Event('locationchange'));
  };
  (history as any).replaceState = function (...args: any[]) {
    _replace.apply(history, args);
    window.dispatchEvent(new Event('locationchange'));
  };
  const onLocationChange = () => showTempLoading();

  document.addEventListener('click', onClick);
  window.addEventListener('popstate', onPop);
  window.addEventListener('locationchange', onLocationChange);

  return () => {
    document.removeEventListener('click', onClick);
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('locationchange', onLocationChange);
    history.pushState = _push;
    history.replaceState = _replace;
    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };
}, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    try {
      sessionStorage.setItem('hasSeenIntro', 'true');
    } catch (_) {}
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SmoothScroll>
          <AnimatedBackground />
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
              {isPageLoading && <Loading />}
              <Nav />
              <main className="flex-1 md:pt-16">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/events" element={<EventsList />} />
                  <Route path="/events/new" element={<AddEvent />} />
                  <Route path="/events/:slug" element={<EventDetail />} />
                  <Route path="/events/:slug/edit" element={<AddEvent />} />
                  <Route path="/my-events" element={<MyEvents />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/community/:postId" element={<CommentDetail />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/bookmarks" element={<Bookmarks />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
          </SmoothScroll>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
