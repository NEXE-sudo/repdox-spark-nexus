import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  ArrowLeft,
  Home,
  Compass,
  Mail,
  Bookmark,
  Users,
  Trash2,
  Check,
  X,
  Settings,
  Search,
} from "lucide-react";
import { getRelativeTime } from "@/lib/timeUtils";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "friend_request" | "friend_accept";
  from_user: UserProfile;
  post_id?: string;
  post_content?: string;
  comment_content?: string;
  friendship_id?: string;
  created_at: string;
  read: boolean;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "mentions">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await Promise.all([
        loadNotifications(currentUser.id),
        loadFriendRequests(currentUser.id),
      ]);
    };

    initializeNotifications();
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

  const loadNotifications = async (userId: string) => {
    try {
      setIsLoading(true);
      const mockNotifications: Notification[] = [];

      // Load likes on user's posts
      const { data: likes } = await supabase
        .from("user_post_likes")
        .select(
          `
          *,
          community_posts!inner(id, content, user_id),
          user_profiles!user_post_likes_user_id_fkey(id, user_id, full_name, handle, avatar_url)
        `
        )
        .eq("community_posts.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (likes) {
        likes.forEach((like: any) => {
          if (like.user_id !== userId) {
            mockNotifications.push({
              id: like.id,
              type: "like",
              from_user: like.user_profiles,
              post_id: like.community_posts.id,
              post_content: like.community_posts.content,
              created_at: like.created_at,
              read: false,
            });
          }
        });
      }

      // Load comments on user's posts
      const { data: comments } = await supabase
        .from("posts_comments")
        .select(
          `
          *,
          community_posts!inner(id, content, user_id),
          user_profiles!posts_comments_user_id_fkey(id, user_id, full_name, handle, avatar_url)
        `
        )
        .eq("community_posts.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (comments) {
        comments.forEach((comment: any) => {
          if (comment.user_id !== userId) {
            mockNotifications.push({
              id: comment.id,
              type: "comment",
              from_user: comment.user_profiles,
              post_id: comment.community_posts.id,
              post_content: comment.community_posts.content,
              comment_content: comment.content,
              created_at: comment.created_at,
              read: false,
            });
          }
        });
      }

      // Sort by date
      mockNotifications.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(mockNotifications);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendRequests = async (userId: string) => {
    try {
      const { data: requests, error } = await supabase
        .from("friendships")
        .select(
          `
          *,
          user_profiles!friendships_user_id_fkey(id, user_id, full_name, handle, avatar_url, bio)
        `
        )
        .eq("friend_id", userId)
        .eq("status", "pending");

      if (error) throw error;
      setFriendRequests(requests || []);
    } catch (err) {
      console.error("Error loading friend requests:", err);
    }
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      setFriendRequests(
        friendRequests.filter((req) => req.id !== friendshipId)
      );
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const handleRejectFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      setFriendRequests(
        friendRequests.filter((req) => req.id !== friendshipId)
      );
    } catch (err) {
      console.error("Error rejecting friend request:", err);
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-pink-500" fill="currentColor" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case "friend_request":
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      case "friend_accept":
        return <UserCheck className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-accent" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case "like":
        return "liked your post";
      case "comment":
        return "commented on your post";
      case "follow":
        return "started following you";
      case "friend_request":
        return "sent you a friend request";
      case "friend_accept":
        return "accepted your friend request";
      default:
        return "interacted with your content";
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
            <div className="flex items-center gap-4 p-3 rounded-full bg-accent/20 transition cursor-pointer">
              <Bell className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">Notifications</span>
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
            <div
              onClick={() => navigate("/groups")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Users className="w-6 h-6" />
              <span className="text-xl">Groups</span>
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
                  <h1 className="text-xl font-bold">Notifications</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-accent hover:underline"
                  >
                    Clear all
                  </button>
                )}

                <button
                  className="p-2 hover:bg-accent/10 rounded-full transition"
                  title="Direct messages settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "all"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setActiveTab("verified")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "verified"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Verified
              </button>

              <button
                onClick={() => setActiveTab("mentions")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "mentions"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Mentions
              </button>
            </div>
          </div>

          {/* Friend Requests */}
          {friendRequests.length > 0 && (
            <div className="border-b border-border">
              <div className="p-4 bg-accent/5">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Friend Requests
                </h2>
                <div className="space-y-3">
                  {friendRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
                    >
                      {getAvatarUrl(request.user_profiles?.avatar_url) ? (
                        <img
                          src={getAvatarUrl(request.user_profiles?.avatar_url)!}
                          alt={request.user_profiles?.full_name || "User"}
                          className="w-12 h-12 rounded-full object-cover cursor-pointer"
                          onClick={() =>
                            navigate(
                              `/profile/${request.user_profiles?.user_id}`
                            )
                          }
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-bold cursor-pointer"
                          onClick={() =>
                            navigate(
                              `/profile/${request.user_profiles?.user_id}`
                            )
                          }
                        >
                          {request.user_profiles?.full_name?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-bold">
                          {request.user_profiles?.full_name || "Anonymous"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{request.user_profiles?.handle || "user"}
                        </div>
                        {request.user_profiles?.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {request.user_profiles.bio}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptFriend(request.id)}
                          className="rounded-full"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectFriend(request.id)}
                          className="rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No notifications yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  When someone interacts with your posts, you'll see it here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    if (notification.post_id) {
                      navigate(`/community/${notification.post_id}`);
                    } else if (notification.from_user) {
                      navigate(`/profile/${notification.from_user.user_id}`);
                    }
                  }}
                  className={`border-b border-border px-4 py-3 hover:bg-accent/5 transition cursor-pointer ${
                    !notification.read ? "bg-accent/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex gap-3 flex-1">
                      {getAvatarUrl(notification.from_user?.avatar_url) ? (
                        <img
                          src={
                            getAvatarUrl(notification.from_user?.avatar_url)!
                          }
                          alt={notification.from_user?.full_name || "User"}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold">
                          {notification.from_user?.full_name?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">
                            {notification.from_user?.full_name || "Someone"}
                          </span>{" "}
                          {getNotificationText(notification)}
                        </p>
                        {notification.post_content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            "{notification.post_content}"
                          </p>
                        )}
                        {notification.comment_content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            "{notification.comment_content}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Search & Trending */}
        <div className="w-[400px] flex-shrink-0 border-l border-border p-4 hidden xl:flex flex-col sticky top-0 h-full overflow-y-auto">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* What's happening */}
          <div className="bg-muted rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">What's happening</h2>
            <div className="space-y-3">
              {/* Add trending content here */}
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  No trending topics yet
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
