import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Search,
  TrendingUp,
  Hash,
  Users,
  ArrowLeft,
  Sparkles,
  Home,
  Compass,
  Bell,
  Mail,
  Bookmark,
  Heart,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { CommunitySidebar } from "@/components/CommunitySidebar";
import { getRelativeTime } from "@/lib/timeUtils";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  job_title: string | null;
  created_at: string;
}

interface FeedPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  images_urls?: string[];
  user_profile?: UserProfile;
}

interface TrendingHashtag {
  hashtag: string;
  count: number;
  category: string;
}

export default function Explore() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"trending" | "users" | "posts">(
    "trending"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>(
    []
  );
  const [trendingPosts, setTrendingPosts] = useState<FeedPost[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeExplore = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await Promise.all([
        loadTrendingHashtags(),
        loadTrendingPosts(),
        loadSuggestedUsers(currentUser.id),
      ]);
    };

    initializeExplore();
  }, [navigate]);

  const getAvatarUrl = (
    avatarPath: string | null | undefined
  ): string | null => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http")) return avatarPath;

    let cleanPath = avatarPath;
    if (cleanPath.startsWith("avatars/")) {
      cleanPath = cleanPath.replace("avatars/", "");
    }
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);
    return data.publicUrl;
  };

  const loadTrendingHashtags = async () => {
    try {
      const last7Days = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: posts, error } = await supabase
        .from("community_posts")
        .select("content")
        .gte("created_at", last7Days)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const hashtagMap = new Map<string, number>();
      (posts || []).forEach((post) => {
        const hashtags = post.content.match(/#\w+/g) || [];
        hashtags.forEach((tag: string) => {
          const normalizedTag = tag.toLowerCase();
          hashtagMap.set(
            normalizedTag,
            (hashtagMap.get(normalizedTag) || 0) + 1
          );
        });
      });

      const trending = Array.from(hashtagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([hashtag, count]) => ({
          hashtag,
          count,
          category: count > 50 ? "Hot" : count > 20 ? "Rising" : "New",
        }));

      setTrendingHashtags(trending);
    } catch (err) {
      console.error("Error loading trending hashtags:", err);
    }
  };

  const loadTrendingPosts = async () => {
    try {
      const { data: posts, error } = await supabase
        .from("community_posts")
        .select(
          `
          *,
          user_profiles!community_posts_user_id_fkey (
            id,
            user_id,
            full_name,
            handle,
            bio,
            avatar_url,
            job_title
          )
        `
        )
        .order("views_count", { ascending: false })
        .limit(10);

      if (error) throw error;

      const transformedPosts = (posts || []).map((post) => ({
        ...post,
        user_profile: post.user_profiles,
      }));

      setTrendingPosts(transformedPosts as FeedPost[]);
    } catch (err) {
      console.error("Error loading trending posts:", err);
    }
  };

  const loadSuggestedUsers = async (currentUserId: string) => {
    try {
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .neq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSuggestedUsers((profiles || []) as UserProfile[]);
    } catch (err) {
      console.error("Error loading suggested users:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      if (searchQuery.startsWith("#")) {
        const hashtag = searchQuery.toLowerCase();
        const { data: posts, error } = await supabase
          .from("community_posts")
          .select(
            `
            *,
            user_profiles!community_posts_user_id_fkey (*)
          `
          )
          .ilike("content", `%${hashtag}%`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setTrendingPosts(
          (posts || []).map((post) => ({
            ...post,
            user_profile: post.user_profiles,
          })) as FeedPost[]
        );
        setActiveTab("posts");
      } else {
        const { data: profiles, error } = await supabase
          .from("user_profiles")
          .select("*")
          .or(
            `full_name.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`
          )
          .limit(20);

        if (error) throw error;
        setSuggestedUsers((profiles || []) as UserProfile[]);
        setActiveTab("users");
      }
    } catch (err) {
      console.error("Error searching:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-[1323px]">
        {/* Left Sidebar */}
        <CommunitySidebar activePath="/explore" />

        {/* Center Content */}
        <div className="w-full max-w-[600px] border-r border-border overflow-y-auto h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center gap-4 p-4">
              <button
                onClick={() => navigate("/community")}
                className="p-2 hover:bg-accent/10 rounded-full transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold">Explore</h1>
                <p className="text-sm text-muted-foreground">
                  Discover trending content and people
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search hashtags or people..."
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("trending")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "trending"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                Trending
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "posts"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                <Sparkles className="w-5 h-5 inline mr-2" />
                Posts
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "users"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                <Users className="w-5 h-5 inline mr-2" />
                People
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === "trending" && (
              <div className="space-y-3">
                {trendingHashtags.length === 0 ? (
                  <div className="text-center py-12">
                    <Hash className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No trending hashtags yet
                    </p>
                  </div>
                ) : (
                  trendingHashtags.map((tag, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setSearchQuery(tag.hashtag);
                        handleSearch();
                      }}
                      className="p-4 rounded-lg hover:bg-accent/10 transition cursor-pointer border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-accent px-2 py-1 rounded-full bg-accent/10">
                              {tag.category}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              #{idx + 1} trending
                            </span>
                          </div>
                          <div className="text-lg font-bold">{tag.hashtag}</div>
                          <div className="text-sm text-muted-foreground">
                            {tag.count} posts
                          </div>
                        </div>
                        <Hash className="w-8 h-8 text-accent opacity-20" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="space-y-4">
                {trendingPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No trending posts yet
                    </p>
                  </div>
                ) : (
                  trendingPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => navigate(`/community/${post.id}`)}
                      className="border border-border rounded-lg p-4 hover:bg-accent/5 transition cursor-pointer"
                    >
                      <div className="flex gap-3">
                        {getAvatarUrl(post.user_profile?.avatar_url) ? (
                          <img
                            src={getAvatarUrl(post.user_profile?.avatar_url)!}
                            alt={post.user_profile?.full_name || "User"}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                            {post.user_profile?.full_name?.[0] || "U"}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">
                              {post.user_profile?.full_name || "Anonymous"}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-sm text-muted-foreground">
                              {getRelativeTime(post.created_at)}
                            </span>
                          </div>
                          <p className="text-foreground mb-2 line-clamp-3">
                            {post.content}
                          </p>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {post.likes_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {post.comments_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <BarChart3 className="w-4 h-4" />
                              {post.views_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-3">
                {suggestedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  suggestedUsers.map((profile) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => navigate(`/profile/${profile.user_id}`)}
                      className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent/10 transition cursor-pointer"
                    >
                      {getAvatarUrl(profile.avatar_url) ? (
                        <img
                          src={getAvatarUrl(profile.avatar_url)!}
                          alt={profile.full_name || "User"}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-bold text-lg">
                          {profile.full_name?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">
                          {profile.full_name || "Anonymous"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          @{profile.handle || profile.user_id.slice(0, 8)}
                        </div>
                        {profile.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {profile.bio}
                          </p>
                        )}
                      </div>
                      <Button size="sm" className="rounded-full">
                        Follow
                      </Button>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[400px] flex-shrink-0 p-4 hidden xl:block">
          <div className="bg-muted rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">What's hot</h2>
            <div className="space-y-3">
              {trendingHashtags.slice(0, 5).map((tag, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchQuery(tag.hashtag);
                    handleSearch();
                  }}
                  className="cursor-pointer hover:bg-accent/10 p-2 rounded-lg transition"
                >
                  <div className="text-sm font-bold">{tag.hashtag}</div>
                  <div className="text-xs text-muted-foreground">
                    {tag.count} posts
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
