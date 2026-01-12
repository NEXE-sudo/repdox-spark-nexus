// src/App.tsx
// Complete App with Email Verification routes integrated

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
import PrivacyPolicy from "./pages/Privacy_policy";
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
import CommandPalette from '@/components/CommandPalette';
import GroupDetail from './pages/GroupDetail';

// NEW: Email Verification imports
import VerifyEmail from "./pages/VerifyEmail";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [showIntro, setShowIntro] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const isFirstLoad = useRef(true);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Check if intro should be shown (only on first session)
  useEffect(() => {
    try {
      const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
      const skipInitial = sessionStorage.getItem('skipInitialLoad');
      
      if (skipInitial) {
        sessionStorage.removeItem('skipInitialLoad');
        // Coming from navigation, don't show anything
      } else if (!hasSeenIntro) {
        setShowIntro(true);  // Show intro only if NOT seen before
      } else {
        // Reload - show top bar on initial page load
        setIsPageLoading(true);
        loadingTimeoutRef.current = window.setTimeout(() => {
          setIsPageLoading(false);
          loadingTimeoutRef.current = null;
        }, 900);
      }
    } catch (e) {
      console.warn("[App] Error determining intro display:", e);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Show top bar loading on navigation clicks
  useEffect(() => {
    // Skip setting up navigation listeners until intro is complete
    if (showIntro && isFirstLoad.current) {
      return;
    }

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
      
      // Prevent default navigation
      e.preventDefault();
      
      // Start loading animation
      setIsPageLoading(true);
      
      // Preload the page - navigate only when fully loaded
      fetch(href)
        .then(response => response.text())
        .then(() => {
          // Page is loaded, stop animation and navigate (client-side if possible)
          setIsPageLoading(false);
          try {
            sessionStorage.setItem('skipInitialLoad', 'true');
          } catch (e) {
            console.warn("[App] sessionStorage set failed:", e);
          }
          try {
            const path = url.pathname + url.search + url.hash;
            window.history.pushState({}, '', path);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (err) {
            // Fallback to full navigation if client-side nav fails
            window.location.href = href;
          }
        })
        .catch((err) => {
          // If fetch fails, try client-side navigation, otherwise fall back
          console.warn("[App] preload fetch failed:", err);
          setIsPageLoading(false);
          try {
            sessionStorage.setItem('skipInitialLoad', 'true');
          } catch (e) {
            console.warn("[App] sessionStorage set failed:", e);
          }
          try {
            const path = url.pathname + url.search + url.hash;
            window.history.pushState({}, '', path);
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch (err) {
            window.location.href = href;
          }
        });
    };

    const onPop = () => {
      try {
        sessionStorage.setItem('skipInitialLoad', 'true');
      } catch (err: unknown) {
        // Non-fatal: store action failed (e.g., private mode)
        console.debug("[App] sessionStorage set failed (onPop):", err);
      }
    };

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);

    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [showIntro]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    isFirstLoad.current = false;
    try {
      sessionStorage.setItem('hasSeenIntro', 'true');
    } catch (err: unknown) {
      // Non-fatal: sessionStorage may be unavailable (incognito)
      console.debug("[App] sessionStorage set failed (introComplete):", err);
    }
  };

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AnimatedBackground />
          <BrowserRouter>
            <CommandPalette />
            <div className="flex flex-col min-h-screen">
              {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
              <Nav />
              <main className="flex-1 md:pt-16">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/events" element={<EventsList />} />
                  <Route path="/events/:slug" element={<EventDetail />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/groups/:groupId" element={<GroupDetail />} />

                  {/* NEW: Email Verification Routes (Public - No Auth Required) */}
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Protected Routes - Require Authentication + Email Verification */}
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile/:userId" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/events/new" 
                    element={
                      <ProtectedRoute>
                        <AddEvent />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/events/:slug/edit" 
                    element={
                      <ProtectedRoute>
                        <AddEvent />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/my-events" 
                    element={
                      <ProtectedRoute>
                        <MyEvents />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/community" 
                    element={
                      <ProtectedRoute>
                        <Community />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/community/:postId" 
                    element={
                      <ProtectedRoute>
                        <CommentDetail />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/explore" 
                    element={
                      <ProtectedRoute>
                        <Explore />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/notifications" 
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/messages" 
                    element={
                      <ProtectedRoute>
                        <Messages />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/bookmarks" 
                    element={
                      <ProtectedRoute>
                        <Bookmarks />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/groups" 
                    element={
                      <ProtectedRoute>
                        <Groups />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;