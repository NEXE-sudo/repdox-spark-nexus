import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  ArrowLeft,
  Home,
  Compass,
  Bell,
  Mail,
  Bookmark,
  Plus,
  TrendingUp,
  Lock,
  Globe,
  UserPlus,
  Settings,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Community {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  post_count: number;
  is_private: boolean;
  created_by: string;
  created_at: string;
  is_member: boolean;
}

export default function Groups() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"joined" | "discover">("joined");
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedGroups, setJoinedGroups] = useState<Community[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const initializeGroups = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await Promise.all([
        loadJoinedGroups(currentUser.id),
        loadDiscoverGroups(),
      ]);
    };

    initializeGroups();
  }, [navigate]);

  const loadJoinedGroups = async (userId: string) => {
    try {
      setIsLoading(true);

      // Mock data - in a real app, you'd fetch from a groups table
      const mockGroups: Community[] = [
        {
          id: "1",
          name: "Tech Innovators",
          description:
            "A community for tech enthusiasts and innovators to share ideas and collaborate",
          avatar_url: null,
          cover_url: null,
          member_count: 1234,
          post_count: 567,
          is_private: false,
          created_by: userId,
          created_at: new Date().toISOString(),
          is_member: true,
        },
        {
          id: "2",
          name: "Design Masters",
          description:
            "Share your design work, get feedback, and learn from the best",
          avatar_url: null,
          cover_url: null,
          member_count: 892,
          post_count: 423,
          is_private: false,
          created_by: userId,
          created_at: new Date().toISOString(),
          is_member: true,
        },
        {
          id: "3",
          name: "Startup Founders",
          description:
            "Private community for startup founders to discuss challenges and share wins",
          avatar_url: null,
          cover_url: null,
          member_count: 156,
          post_count: 234,
          is_private: true,
          created_by: userId,
          created_at: new Date().toISOString(),
          is_member: true,
        },
      ];

      setJoinedGroups(mockGroups);
    } catch (err) {
      console.error("Error loading joined groups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscoverGroups = async () => {
    try {
      // Mock data for discovery
      const mockGroups: Community[] = [
        {
          id: "4",
          name: "AI & Machine Learning",
          description:
            "Discuss the latest in AI, ML, and deep learning technologies",
          avatar_url: null,
          cover_url: null,
          member_count: 5432,
          post_count: 2341,
          is_private: false,
          created_by: "other-user",
          created_at: new Date().toISOString(),
          is_member: false,
        },
        {
          id: "5",
          name: "Web3 Builders",
          description: "Build the decentralized future together",
          avatar_url: null,
          cover_url: null,
          member_count: 3210,
          post_count: 1567,
          is_private: false,
          created_by: "other-user",
          created_at: new Date().toISOString(),
          is_member: false,
        },
        {
          id: "6",
          name: "Product Management",
          description:
            "For product managers to share insights and best practices",
          avatar_url: null,
          cover_url: null,
          member_count: 2876,
          post_count: 1234,
          is_private: false,
          created_by: "other-user",
          created_at: new Date().toISOString(),
          is_member: false,
        },
        {
          id: "7",
          name: "DevOps Engineers",
          description: "Infrastructure, CI/CD, and all things DevOps",
          avatar_url: null,
          cover_url: null,
          member_count: 1987,
          post_count: 987,
          is_private: false,
          created_by: "other-user",
          created_at: new Date().toISOString(),
          is_member: false,
        },
      ];

      setDiscoverGroups(mockGroups);
    } catch (err) {
      console.error("Error loading discover groups:", err);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      const community = discoverGroups.find((c) => c.id === communityId);
      if (!community) return;

      // In a real app, you'd save to a community_members table
      const updatedCommunity = { ...community, is_member: true };

      setJoinedGroups([...joinedGroups, updatedCommunity]);
      setDiscoverGroups(discoverGroups.filter((c) => c.id !== communityId));

      setSuccess(`Joined ${community.name}!`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error joining community:", err);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to leave this community?"
      );
      if (!confirmed) return;

      const community = joinedGroups.find((c) => c.id === communityId);
      if (!community) return;

      const updatedCommunity = { ...community, is_member: false };

      setJoinedGroups(joinedGroups.filter((c) => c.id !== communityId));
      setDiscoverGroups([...discoverGroups, updatedCommunity]);

      setSuccess(`Left ${community.name}`);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error leaving community:", err);
    }
  };

  const filteredGroups =
    activeTab === "joined"
      ? joinedGroups.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : discoverGroups.filter((c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-[1323px]">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border p-4 hidden lg:flex flex-col sticky top-0 h-full overflow-y-auto">
          <nav className="space-y-2 flex-1">
            <div
              onClick={() => navigate("/community")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Home className="w-6 h-6" />
              <span className="text-xl">Home</span>
            </div>
            <div
              onClick={() => navigate("/explore")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Compass className="w-6 h-6" />
              <span className="text-xl">Explore</span>
            </div>
            <div
              onClick={() => navigate("/notifications")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Bell className="w-6 h-6" />
              <span className="text-xl">Notifications</span>
            </div>
            <div
              onClick={() => navigate("/messages")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Mail className="w-6 h-6" />
              <span className="text-xl">Messages</span>
            </div>
            <div
              onClick={() => navigate("/bookmarks")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Bookmark className="w-6 h-6" />
              <span className="text-xl">Bookmarks</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full bg-accent/20 transition cursor-pointer">
              <Users className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">Groups</span>
            </div>
          </nav>

          <Button className="w-full py-6 text-lg font-bold rounded-full bg-accent hover:bg-accent/90">
            <Plus className="w-5 h-5 mr-2" />
            Create
          </Button>
        </aside>

        {/* Center Content */}
        <div className="w-full max-w-[600px] border-r border-border overflow-y-auto h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/community")}
                  className="p-2 hover:bg-accent/10 rounded-full transition lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold">Groups</h1>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "joined"
                      ? `${joinedGroups.length} joined`
                      : "Discover new groups"}
                  </p>
                </div>
              </div>
              <Button size="sm" className="rounded-full lg:hidden">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search groups..."
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("joined")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "joined"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Your Groups
              </button>
              <button
                onClick={() => setActiveTab("discover")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "discover"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Discover
              </button>
            </div>
          </div>

          {/* Groups List */}
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {activeTab === "joined" ? "No groups yet" : "No groups found"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "joined"
                    ? "Join groups to connect with like-minded people"
                    : "Try a different search term"}
                </p>
                {activeTab === "joined" && (
                  <Button
                    onClick={() => setActiveTab("discover")}
                    className="rounded-full"
                  >
                    Discover Groups
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((community) => (
                  <motion.div
                    key={community.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-lg p-4 hover:bg-accent/5 transition"
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-8 h-8 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">
                                {community.name}
                              </h3>
                              {community.is_private ? (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Globe className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {community.description}
                            </p>
                          </div>
                          {activeTab === "joined" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-accent/10 rounded-full transition">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {community.created_by === user?.id && (
                                  <DropdownMenuItem>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Manage Community
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleLeaveCommunity(community.id)
                                  }
                                  className="text-red-500"
                                >
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Leave Community
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {community.member_count.toLocaleString()} members
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {community.post_count.toLocaleString()} posts
                          </span>
                        </div>

                        {activeTab === "discover" ? (
                          <Button
                            onClick={() => handleJoinCommunity(community.id)}
                            size="sm"
                            className="rounded-full"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Join
                          </Button>
                        ) : (
                          <Button
                            onClick={() => navigate(`/groups/${community.id}`)}
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                          >
                            View Posts
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[400px] flex-shrink-0 p-4 hidden xl:block">
          <div className="bg-muted rounded-2xl p-4 mb-4">
            <h2 className="text-xl font-bold mb-4">Trending Groups</h2>
            <div className="space-y-3">
              {discoverGroups.slice(0, 3).map((community, idx) => (
                <div
                  key={community.id}
                  className="cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-accent">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-sm">{community.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {community.member_count.toLocaleString()} members
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">About Groups</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Join groups to connect with people who share your interests and
                passions.
              </p>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">
                    Your Groups
                  </span>
                  <span className="text-accent font-bold">
                    {joinedGroups.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    Total Members
                  </span>
                  <span className="text-accent font-bold">
                    {joinedGroups
                      .reduce((sum, c) => sum + c.member_count, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500 text-green-500 p-4 rounded-lg z-50">
          {success}
        </div>
      )}
    </div>
  );
}
