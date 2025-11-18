import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  ArrowLeft,
  Home,
  Compass,
  Bell,
  Mail,
  Users,
  Heart,
  MessageCircle,
  BarChart3,
  Trash2,
  Share,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRelativeTime } from "@/lib/timeUtils";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  job_title: string | null;
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
  gif_url?: string;
  user_profile?: UserProfile;
}

export default function Bookmarks() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const initializeBookmarks = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await loadBookmarkedPosts(currentUser.id);
    };

    initializeBookmarks();
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

  const loadBookmarkedPosts = async (userId: string) => {
    try {
      setIsLoading(true);

      const { data: bookmarks, error } = await supabase
        .from("user_post_bookmarks")
        .select(
          `
          post_id,
          created_at,
          community_posts!inner(
            *,
            user_profiles!community_posts_user_id_fkey(
              id,
              user_id,
              full_name,
              handle,
              avatar_url,
              job_title
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const posts = (bookmarks || []).map((bookmark: any) => ({
        ...bookmark.community_posts,
        user_profile: bookmark.community_posts.user_profiles,
      }));

      setBookmarkedPosts(posts as FeedPost[]);
    } catch (err) {
      console.error("Error loading bookmarks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBookmark = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_post_bookmarks")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      if (error) throw error;

      setBookmarkedPosts(bookmarkedPosts.filter((post) => post.id !== postId));
      setSuccess("Bookmark removed");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error removing bookmark:", err);
    }
  };

  const handleClearAll = async () => {
    if (!user) return;

    const confirmed = window.confirm("Remove all bookmarks?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("user_post_bookmarks")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setBookmarkedPosts([]);
      setSuccess("All bookmarks cleared");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error clearing bookmarks:", err);
    }
  };

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
            <div className="flex items-center gap-4 p-3 rounded-full bg-accent/20 transition cursor-pointer">
              <Bookmark className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">Bookmarks</span>
            </div>
            <div
              onClick={() => navigate("/communities")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Users className="w-6 h-6" />
              <span className="text-xl">Communities</span>
            </div>
          </nav>
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
                  <h1 className="text-xl font-bold">Bookmarks</h1>
                  <p className="text-sm text-muted-foreground">
                    {bookmarkedPosts.length} saved posts
                  </p>
                </div>
              </div>
              {bookmarkedPosts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-500 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Bookmarked Posts */}
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No bookmarks yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Save posts to read later. Don't let the good ones fly away!
                </p>
                <Button
                  onClick={() => navigate("/community")}
                  className="rounded-full"
                >
                  Browse Posts
                </Button>
              </div>
            ) : (
              bookmarkedPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/community/${post.id}`)}
                  className="border-b border-border px-4 py-3 hover:bg-muted/30 transition cursor-pointer"
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="font-bold text-foreground">
                            {post.user_profile?.full_name || "Anonymous"}
                          </span>
                          <span className="text-muted-foreground">
                            @
                            {post.user_profile?.handle ||
                              post.user_profile?.full_name
                                ?.toLowerCase()
                                .replace(/\s+/g, "") ||
                              "user"}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {getRelativeTime(post.created_at)}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-muted-foreground rounded-full hover:bg-accent/20 hover:text-accent transition"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleRemoveBookmark(post.id, e as any)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                              <span className="text-red-500">
                                Remove bookmark
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                const postUrl = `${window.location.origin}/community/${post.id}`;
                                navigator.clipboard.writeText(postUrl);
                                setSuccess("Link copied!");
                                setTimeout(() => setSuccess(null), 2000);
                              }}
                            >
                              <Share className="w-4 h-4 mr-2" />
                              Copy link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-foreground text-[15px] leading-5 mt-1 break-words">
                        {post.content}
                      </p>

                      {/* Images Display */}
                      {post.images_urls && post.images_urls.length > 0 && (
                        <div
                          className={`grid gap-0.5 mt-3 rounded-2xl overflow-hidden border border-border ${
                            post.images_urls.length === 1
                              ? "grid-cols-1"
                              : post.images_urls.length === 2
                              ? "grid-cols-2"
                              : "grid-cols-2"
                          }`}
                        >
                          {post.images_urls.slice(0, 4).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`post-img-${idx}`}
                              className={`w-full rounded-lg cursor-pointer hover:opacity-90 transition ${
                                post.images_urls!.length === 1
                                  ? "max-h-[500px] object-cover"
                                  : "h-[250px] object-cover"
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* GIF Display */}
                      {post.gif_url && (
                        <img
                          src={post.gif_url}
                          alt="post-gif"
                          className="w-full h-auto max-h-72 object-contain rounded-lg mt-3"
                        />
                      )}

                      {/* Engagement Buttons */}
                      <div className="flex items-center justify-between mt-3 text-muted-foreground text-sm">
                        <div className="flex items-center w-full max-w-[425px] justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/community/${post.id}`);
                            }}
                            className="flex items-center gap-1 -ml-2 hover:text-blue-500 transition"
                          >
                            <div className="p-2 rounded-full hover:bg-blue-500/10">
                              <MessageCircle className="w-[18px] h-[18px]" />
                            </div>
                            <span className="text-[13px]">
                              {post.comments_count || 0}
                            </span>
                          </button>

                          <button className="flex items-center gap-1 hover:text-pink-500 transition">
                            <div className="p-2 rounded-full hover:bg-pink-500/10">
                              <Heart className="w-[18px] h-[18px]" />
                            </div>
                            <span className="text-[13px]">
                              {post.likes_count || 0}
                            </span>
                          </button>

                          <button className="flex items-center gap-1 cursor-default hover:text-blue-500 transition">
                            <div className="p-2 rounded-full hover:bg-blue-500/10">
                              <BarChart3 className="w-[18px] h-[18px]" />
                            </div>
                            <span className="text-[13px]">
                              {post.views_count || 0}
                            </span>
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleRemoveBookmark(post.id, e)}
                          className="p-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition"
                        >
                          <Bookmark
                            className="w-[18px] h-[18px]"
                            fill="currentColor"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[400px] flex-shrink-0 p-4 hidden xl:block">
          <div className="bg-muted rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">About Bookmarks</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Save posts to easily find them later. Your bookmarks are private
                and only visible to you.
              </p>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">
                    Total Bookmarks
                  </span>
                  <span className="text-accent font-bold">
                    {bookmarkedPosts.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    This Month
                  </span>
                  <span className="text-accent font-bold">
                    {
                      bookmarkedPosts.filter((post) => {
                        const postDate = new Date(post.created_at);
                        const now = new Date();
                        return (
                          postDate.getMonth() === now.getMonth() &&
                          postDate.getFullYear() === now.getFullYear()
                        );
                      }).length
                    }
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
