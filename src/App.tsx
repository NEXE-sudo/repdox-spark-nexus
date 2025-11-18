import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Nav />
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
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
