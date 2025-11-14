import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Users,
  Heart,
  MessageCircle,
  MoreVertical,
  UserPlus,
  UserCheck,
  Ban,
  Home,
  Compass,
  Bell,
  Mail,
  Bookmark,
  Share,
  X,
  Image as ImageIcon,
  SmilePlus,
  MapPin,
  Clock,
  BarChart3,
  Video,
  Loader,
  Copy,
  Mail as MailIcon,
  Flag,
  VolumeX,
  Trash2,
  Edit,
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  images_urls?: string[];
  gif_url?: string;
  location?: { latitude: number; longitude: number; address?: string } | null;
  poll_id?: string;
  scheduled_at?: string;
  is_scheduled?: boolean;
  user_profile?: UserProfile;
  liked_by_current_user?: boolean;
  comment_count?: number;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
}

interface Poll {
  id: string;
  post_id: string;
  question: string;
  options: string[];
  created_at: string;
}

interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export default function Community() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "people" | "friends">(
    "feed"
  );
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // Feed state
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<
    Array<{ hashtag: string; count: number }>
  >([]);
  // Mention/autocomplete state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<UserProfile[]>(
    []
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Trending state
  const [trendingHashtags, setTrendingHashtags] = useState<
    Array<{
      hashtag: string;
      count: number;
      category?: string;
    }>
  >([]);

  const [isLoadingTrending, setIsLoadingTrending] = useState(false);

  // Interaction state
  const [likedPosts, setLikedPosts] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFollowId, setLoadingFollowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const initializeCommunity = async () => {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await Promise.all([
        loadFeedPosts(),
        loadFriends(),
        loadBlockedUsers(),
        loadTrendingHashtags(),
        loadUserLikes(currentUser.id),
      ]);
    };

    initializeCommunity();

    // Refresh trending hashtags every 30 seconds for real-time updates
    const trendingInterval = setInterval(loadTrendingHashtags, 30000);

    return () => clearInterval(trendingInterval);
  }, [navigate]);

  const loadUserLikes = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_post_likes")
        .select("post_id")
        .eq("user_id", userId);

      if (error) throw error;
      setLikedPosts((data || []).map((like) => like.post_id));
    } catch (err) {
      console.error("Error loading likes:", err);
    }
  };

  const updateMentionSuggestions = async (text: string) => {
    const lastAt = text.lastIndexOf("@");
    if (lastAt === -1) {
      setShowMentionSuggestions(false);
      return;
    }

    const current = text.substring(lastAt + 1).toLowerCase();

    try {
      // If no input after @, show some recent profiles
      let query = supabase
        .from("user_profiles")
        .select("id,user_id,full_name,avatar_url");

      if (current.length > 0) {
        query = query.or(
          `full_name.ilike.%${current}%,user_id.ilike.%${current}%`
        );
      }

      const { data: profiles, error } = (await query.limit(8)) as any;
      if (error) throw error;
      setMentionSuggestions((profiles || []) as UserProfile[]);
      setShowMentionSuggestions(true);
    } catch (err) {
      console.error("Error loading mention suggestions:", err);
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionClick = async (mention: string) => {
    try {
      // Try to resolve mention as user_id first, then by name
      const { data: profile, error } = (await supabase
        .from("user_profiles")
        .select("user_id")
        .or(`user_id.eq.${mention},full_name.ilike.%${mention}%`)
        .limit(1)
        .single()) as any;

      if (error) throw error;
      if (profile && profile.user_id) {
        navigate(`/profile/${profile.user_id}`);
      }
    } catch (err) {
      console.error("Failed to resolve mention:", err);
    }
  };

  const handleDeletePost = async (postId: string, userId: string) => {
    if (user?.id !== userId) {
      setError("You can only delete your own posts");
      return;
    }

    try {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setFeedPosts(feedPosts.filter((post) => post.id !== postId));
      setSuccess("Post deleted successfully!");
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Failed to delete post");
    }
  };

  const handleMuteAuthor = async (authorId: string) => {
    if (!user) return;

    try {
      // For now, we'll add them to a muted users list
      // In a real app, you'd have a separate muted_users table
      setFeedPosts(feedPosts.filter((post) => post.user_id !== authorId));
      setSuccess("Author muted successfully!");
    } catch (err) {
      console.error("Error muting author:", err);
      setError("Failed to mute author");
    }
  };

  const handleReportPost = async (postId: string) => {
    try {
      // In a real app, this would insert into a reports table
      setSuccess("Post reported successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error reporting post:", err);
      setError("Failed to report post");
    }
  };

  const renderContentWithMentions = (text: string) => {
    if (!text) return text;
    const parts: Array<string> = text.split(/(@[A-Za-z0-9-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const mention = part.substring(1);
        return (
          <button
            key={idx}
            onClick={() => handleMentionClick(mention)}
            className="text-accent hover:underline inline-block mr-1"
          >
            {part}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const loadFeedPosts = async () => {
    try {
      const { data: posts, error } = await (supabase
        .from("community_posts")
        .select(
          `
          *,
          user_profile:user_id (
            id,
            user_id,
            full_name,
            bio,
            avatar_url,
            job_title,
            location,
            phone,
            website,
            company,
            "Date of Birth",
            created_at,
            updated_at
          )
        `
        )
        .or(
          `is_scheduled.is.false,scheduled_at.lte.${new Date().toISOString()}`
        )
        .order("created_at", { ascending: false })
        .limit(50) as any);

      if (error) {
        console.error("Feed query error:", error);
        throw error;
      }
      setFeedPosts((posts || []) as FeedPost[]);
    } catch (err) {
      console.error("Error loading feed:", err);
      // Fallback: try to load posts without join
      try {
        const { data: postsWithoutProfile, error: fallbackError } =
          await (supabase
            .from("community_posts")
            .select("*")
            .or(
              `is_scheduled.is.false,scheduled_at.lte.${new Date().toISOString()}`
            )
            .order("created_at", { ascending: false })
            .limit(50) as any);

        if (fallbackError) throw fallbackError;
        setFeedPosts((postsWithoutProfile || []) as FeedPost[]);
      } catch (fallbackErr) {
        console.error("Fallback feed load failed:", fallbackErr);
        setError("Failed to load posts");
      }
    }
  };

  const loadFriends = async () => {
    if (!user) return;

    try {
      const { data: friendships, error } = await (supabase
        .from("friendships")
        .select("*")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted") as any);

      if (error) throw error;
      setFriends(friendships || []);
    } catch (err) {
      console.error("Error loading friends:", err);
    }
  };

  const loadBlockedUsers = async () => {
    if (!user) return;

    try {
      const { data: blocked, error } = await (supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "blocked") as any);

      if (error) throw error;
      setBlockedUsers((blocked || []).map((b) => b.friend_id));
    } catch (err) {
      console.error("Error loading blocked users:", err);
    }
  };

  const loadTrendingHashtags = async () => {
    setIsLoadingTrending(true);
    try {
      // Get posts from the last 48 hours
      const last48Hours = new Date(
        Date.now() - 48 * 60 * 60 * 1000
      ).toISOString();

      const { data: posts, error } = await (supabase
        .from("community_posts")
        .select("content")
        .gte("created_at", last48Hours)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;

      // Extract hashtags from post content
      const hashtagMap = new Map<string, number>();

      (posts || []).forEach((post) => {
        const content = post.content || "";
        const hashtags = content.match(/#\w+/g) || [];
        hashtags.forEach((tag: string) => {
          const normalizedTag = tag.toLowerCase();
          hashtagMap.set(
            normalizedTag,
            (hashtagMap.get(normalizedTag) || 0) + 1
          );
        });
      });

      // Sort by frequency and get top 15
      const trending = Array.from(hashtagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([hashtag, count]) => ({
          hashtag,
          count,
          category: "Trending",
        }));

      setTrendingHashtags(trending.length > 0 ? trending : []);
    } catch (err) {
      console.error("Error loading trending hashtags:", err);
      // Fallback: keep default empty state or load from feedPosts
      if (feedPosts.length > 0) {
        const hashtagMap = new Map<string, number>();
        feedPosts.forEach((post) => {
          const hashtags = post.content.match(/#\w+/g) || [];
          hashtags.forEach((tag) => {
            const normalizedTag = tag.toLowerCase();
            hashtagMap.set(
              normalizedTag,
              (hashtagMap.get(normalizedTag) || 0) + 1
            );
          });
        });

        const trending = Array.from(hashtagMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([hashtag, count]) => ({
            hashtag,
            count,
            category: "Trending",
          }));

        setTrendingHashtags(trending);
      }
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const updateHashtagSuggestions = (text: string) => {
    const lastHashtagIndex = text.lastIndexOf("#");
    if (lastHashtagIndex === -1) {
      setShowHashtagSuggestions(false);
      return;
    }

    const currentInput = text.substring(lastHashtagIndex + 1).toLowerCase();
    if (currentInput.length === 0) {
      setShowHashtagSuggestions(true);
      setHashtagSuggestions(trendingHashtags);
      return;
    }

    const filtered = trendingHashtags
      .filter((tag) => tag.hashtag.toLowerCase().includes(`#${currentInput}`))
      .sort((a, b) => b.count - a.count);

    setShowHashtagSuggestions(true);
    setHashtagSuggestions(filtered);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .or(
          `full_name.ilike.%${query}%,bio.ilike.%${query}%,job_title.ilike.%${query}%`
        )
        .limit(10);

      if (error) throw error;
      setSearchResults((profiles || []) as UserProfile[]);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user) return;

    setLoadingFollowId(friendId);
    try {
      // Check if friendship already exists
      const { data: existing, error: checkError } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        )
        .single();

      if (checkError && checkError.code !== "PGRST116") throw checkError;

      if (existing) {
        setError("Friendship request already exists");
        setLoadingFollowId(null);
        return;
      }

      // Create friendship request
      const { error: insertError } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (insertError) throw insertError;

      setSuccess("Friend request sent!");
      setTimeout(() => setSuccess(null), 2000);
      setTimeout(() => setLoadingFollowId(null), 600);
    } catch (err) {
      console.error("Error adding friend:", err);
      setError("Failed to send friend request");
      setLoadingFollowId(null);
    }
  };

  const handleBlockUser = async (blockUserId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${blockUserId}),and(user_id.eq.${blockUserId},friend_id.eq.${user.id})`
        );

      if (deleteError) throw deleteError;

      // Create block relationship
      const { error: blockError } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: blockUserId,
        status: "blocked",
      });

      if (blockError) throw blockError;

      setBlockedUsers([...blockedUsers, blockUserId]);
      setSuccess("User blocked");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error blocking user:", err);
      setError("Failed to block user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPost.trim()) return;

    setIsLoading(true);
    try {
      // Ensure user has a profile row and check for handle
      const ensureProfile = async () => {
        try {
          const { data: existing, error: existingErr } = await supabase
            .from("user_profiles")
            .select("user_id, handle")
            .eq("user_id", user.id)
            .single();

          if (existingErr && existingErr.code !== "PGRST116") throw existingErr;

          // If profile exists but no handle, require it
          if (existing && !existing.handle) {
            setError("Please set a @handle in your profile before posting.");
            return false;
          }

          // If no profile exists, create one but still require handle
          if (!existing) {
            setError(
              "Please complete your profile and set a @handle before posting."
            );
            return false;
          }

          return true;
        } catch (err) {
          console.error("Error ensuring user profile:", err);
          return false;
        }
      };

      const profileValid = await ensureProfile();
      if (!profileValid) {
        setIsLoading(false);
        return;
      }
      // Create the post with all features
      const { data: postData, error: postError } = await (supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          title: "Community Post",
          content: newPost,
          images_urls: selectedImages.length > 0 ? selectedImages : null,
          gif_url: selectedGif,
          location: userLocation,
          is_scheduled: !!scheduledTime,
          scheduled_at: scheduledTime
            ? new Date(scheduledTime).toISOString()
            : null,
          likes_count: 0,
          comments_count: 0,
        })
        .select() as any);

      if (postError) throw postError;

      // If poll exists, create it
      if (pollOptions.some((opt) => opt.trim())) {
        const validOptions = pollOptions.filter((opt) => opt.trim());
        if (validOptions.length >= 2 && postData && postData[0]) {
          await (supabase.from("polls").insert({
            post_id: postData[0].id,
            question: "Poll Question",
            options: validOptions,
          }) as any);
        }
      }

      setSuccess("Post created!");
      setNewPost("");
      setSelectedImages([]);
      setSelectedGif(null);
      setUserLocation(null);
      setPollOptions(["", ""]);
      setShowPollCreator(false);
      setScheduledTime("");
      await Promise.all([loadFeedPosts(), loadTrendingHashtags()]);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      if (likedPosts.includes(postId)) {
        // Unlike
        const { error: deleteError } = await supabase
          .from("user_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // Update local state
        setLikedPosts(likedPosts.filter((id) => id !== postId));

        // Update like count in community_posts
        const { error: updateError } = await supabase
          .from("community_posts")
          .update({
            likes_count: Math.max(
              0,
              (feedPosts.find((p) => p.id === postId)?.likes_count || 1) - 1
            ),
          })
          .eq("id", postId);

        if (updateError) throw updateError;

        // Update local feed
        setFeedPosts(
          feedPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: Math.max(0, post.likes_count - 1) }
              : post
          )
        );
      } else {
        // Like
        const { error: insertError } = await supabase
          .from("user_post_likes")
          .insert({ post_id: postId, user_id: user.id });

        if (insertError) throw insertError;

        // Update local state
        setLikedPosts([...likedPosts, postId]);

        // Update like count in community_posts
        const { error: updateError } = await supabase
          .from("community_posts")
          .update({
            likes_count:
              (feedPosts.find((p) => p.id === postId)?.likes_count || 0) + 1,
          })
          .eq("id", postId);

        if (updateError) throw updateError;

        // Update local feed
        setFeedPosts(
          feedPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: post.likes_count + 1 }
              : post
          )
        );
      }
    } catch (err) {
      console.error("Error liking post:", err);
      setError("Failed to like post");
    }
  };

  const handleGetLocation = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // In a real app, you'd use a geocoding API to get the address
          setUserLocation({
            latitude,
            longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          });
          setSuccess("Location added!");
        },
        () => {
          setError("Failed to get location");
        }
      );
    } else {
      setError("Geolocation not available");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || !user) return;

    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("community-posts")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("community-posts")
          .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
      }

      setSelectedImages([...selectedImages, ...uploadedUrls]);
      setSuccess("Images uploaded!");
    } catch (err) {
      console.error("Error uploading images:", err);
      setError("Failed to upload images");
    }
  };

  const isFriend = (userId: string) => {
    return friends.some(
      (f) =>
        (f.user_id === user?.id && f.friend_id === userId) ||
        (f.friend_id === user?.id && f.user_id === userId)
    );
  };

  const isBlocked = (userId: string) => blockedUsers.includes(userId);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-[1323px]">
        {/* Left Sidebar - Navigation */}
        <aside className="w-64 border-r border-border p-4 hidden lg:flex flex-col sticky top-0 h-full overflow-y-auto">
          <nav className="space-y-4 flex-1">
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Home className="w-6 h-6" />
              <span className="text-xl font-bold">Home</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Compass className="w-6 h-6" />
              <span className="text-xl font-bold">Explore</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Bell className="w-6 h-6" />
              <span className="text-xl font-bold">Notifications</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Mail className="w-6 h-6" />
              <span className="text-xl font-bold">Messages</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Bookmark className="w-6 h-6" />
              <span className="text-xl font-bold">Bookmarks</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-full hover:bg-muted transition cursor-pointer">
              <Users className="w-6 h-6" />
              <span className="text-xl font-bold">Communities</span>
            </div>
          </nav>

          <Button className="w-full py-6 text-lg font-bold rounded-full">
            Post
          </Button>
        </aside>

        {/* Center Content */}
        <div className="w-full max-w-[600px] border-r border-border overflow-y-auto h-full">
          {/* Feed Header */}
          <div className="sticky top-0 backdrop-blur bg-background/80 border-b border-border p-4 z-10">
            <h2 className="text-xl font-bold">For you</h2>
          </div>

          {/* Post Composition */}
          <div className="border-b border-border p-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <div className="relative">
                  <textarea
                    value={newPost}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewPost(v);
                      updateHashtagSuggestions(v);
                      updateMentionSuggestions(v);
                    }}
                    placeholder="What's happening?!"
                    className="w-full bg-transparent text-xl text-foreground placeholder:text-muted-foreground outline-none resize-none"
                    rows={3}
                  />
                  {/* Hashtag Suggestions */}
                  {showHashtagSuggestions && newPost.includes("#") && (
                    <div className="absolute left-0 top-full bg-muted border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-20 w-full">
                      {hashtagSuggestions.length > 0 ? (
                        hashtagSuggestions.slice(0, 8).map((tag, idx) => (
                          <div
                            key={idx}
                            className="p-3 hover:bg-accent/10 cursor-pointer flex items-center justify-between"
                            onClick={() => {
                              const lastHashIndex = newPost.lastIndexOf("#");
                              const beforeHash = newPost.substring(
                                0,
                                lastHashIndex
                              );
                              setNewPost(beforeHash + tag.hashtag + " ");
                              setShowHashtagSuggestions(false);
                            }}
                          >
                            <div>
                              <div className="font-bold text-foreground">
                                {tag.hashtag}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tag.count} posts
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-muted-foreground text-sm">
                          No trending hashtags match
                        </div>
                      )}
                    </div>
                  )}
                  {/* Mention Suggestions */}
                  {showMentionSuggestions && newPost.includes("@") && (
                    <div className="absolute left-0 top-full bg-muted border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-20 w-full">
                      {mentionSuggestions.length > 0 ? (
                        mentionSuggestions.slice(0, 8).map((p) => (
                          <div
                            key={p.id}
                            className="p-3 hover:bg-accent/10 cursor-pointer flex items-center gap-3"
                            onClick={() => {
                              const lastAt = newPost.lastIndexOf("@");
                              const before = newPost.substring(0, lastAt);
                              // insert the user's handle from profile
                              const handle = p.handle || p.full_name?.replace(/\s+/g, "") || p.user_id.slice(0, 8);
                              setNewPost(before + `@${handle} `);
                              setShowMentionSuggestions(false);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                              {p.full_name?.[0] || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-foreground">
                                {p.full_name || p.user_id}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                @{p.handle || p.user_id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-muted-foreground text-sm">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Images Preview */}
                {selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
                    {selectedImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={img}
                          alt={`preview-${idx}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() =>
                            setSelectedImages(
                              selectedImages.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected GIF Preview */}
                {selectedGif && (
                  <div className="relative mt-3 mb-3">
                    <img
                      src={selectedGif}
                      alt="gif"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}

                {/* Location Display */}
                {userLocation && (
                  <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg mt-3 mb-3">
                    <MapPin className="w-4 h-4 text-accent" />
                    <span className="text-sm text-foreground">
                      {userLocation.address}
                    </span>
                    <button
                      onClick={() => setUserLocation(null)}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Poll Creator */}
                {showPollCreator && (
                  <div className="border border-border rounded-lg p-3 mt-3 mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Poll question"
                      className="w-full bg-transparent border border-border rounded p-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
                    />
                    {pollOptions.map((option, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[idx] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full bg-transparent border border-border rounded p-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
                      />
                    ))}
                    <Button
                      onClick={() => {
                        setPollOptions([...pollOptions, ""]);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Add Option
                    </Button>
                  </div>
                )}

                {/* Scheduled Time Display */}
                {scheduledTime && (
                  <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg mt-3 mb-3">
                    <Clock className="w-4 h-4 text-accent" />
                    <span className="text-sm text-foreground">
                      Scheduled for: {new Date(scheduledTime).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setScheduledTime("")}
                      className="ml-auto text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Add images"
                    >
                      <ImageIcon className="w-5 h-5 text-accent" />
                    </button>

                    <button
                      onClick={() => setShowPollCreator(!showPollCreator)}
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Create poll"
                    >
                      <BarChart3 className="w-5 h-5 text-accent" />
                    </button>

                    <button
                      onClick={handleGetLocation}
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Add location"
                    >
                      <MapPin className="w-5 h-5 text-accent" />
                    </button>

                    <button
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Add GIF (Giphy integration needed)"
                    >
                      <Video className="w-5 h-5 text-accent" />
                    </button>

                    <button
                      onClick={() => {
                        const now = new Date();
                        const oneHourLater = new Date(
                          now.getTime() + 60 * 60 * 1000
                        );
                        setScheduledTime(
                          oneHourLater.toISOString().slice(0, 16)
                        );
                      }}
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Schedule post"
                    >
                      <Clock className="w-5 h-5 text-accent" />
                    </button>

                    <button
                      className="p-2 hover:bg-accent/10 rounded-full transition"
                      title="Add emoji"
                    >
                      <SmilePlus className="w-5 h-5 text-accent" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    {error && (
                      <Alert
                        variant="destructive"
                        className="bg-red-500/10 border-red-500/30"
                      >
                        <AlertDescription className="text-red-700 dark:text-red-400">
                          {error}
                          {error.includes("@handle") && (
                            <button
                              onClick={() => navigate("/profile")}
                              className="ml-2 underline font-semibold hover:opacity-80"
                            >
                              Go to Profile
                            </button>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                    <Button
                      onClick={handleCreatePost}
                      disabled={isLoading || !newPost.trim()}
                      className="rounded-full px-8 font-bold"
                    >
                      {isLoading ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {feedPosts.length === 0 ? (
            <div className="text-center py-12 p-4">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No posts yet. Be the first to share!
              </p>
            </div>
          ) : (
            feedPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border-b border-border p-4 hover:bg-muted/30 transition"
              >
                <div className="flex gap-4">
                  <div
                    className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                  >
                    {post.user_profile?.full_name?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between cursor-pointer group">
                      <div
                        className="flex items-center gap-2 flex-1"
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                      >
                        <h3 className="font-bold text-foreground group-hover:underline">
                          {post.user_profile?.full_name || "Anonymous"}
                        </h3>
                        <span className="text-muted-foreground">
                          @{post.user_profile?.handle || post.user_profile?.full_name?.toLowerCase().replace(" ", "") || "user"}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground text-sm">
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="p-2 text-muted-foreground rounded-full hover:bg-accent/20 hover:text-accent transition active:scale-95"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user?.id === post.user_id && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // In a real app, this would open an edit modal
                                  setSuccess("Edit feature coming soon!");
                                  setTimeout(() => setSuccess(null), 2000);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit post
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePost(post.id, post.user_id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                <span className="text-red-500">
                                  Delete post
                                </span>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReportPost(post.id);
                            }}
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Report post
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMuteAuthor(post.user_id);
                            }}
                          >
                            <VolumeX className="w-4 h-4 mr-2" />
                            Mute @{post.user_profile?.handle || post.user_profile?.full_name?.replace(/\s+/g, "") || post.user_id.slice(0, 8)}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Post Content */}
                    <p className="text-foreground mt-2 break-words cursor-pointer hover:text-muted-foreground">
                      {renderContentWithMentions(post.content)}
                    </p>

                    {/* Images Display */}
                    {post.images_urls && post.images_urls.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3 mb-3 rounded-lg overflow-hidden">
                        {post.images_urls.slice(0, 4).map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`post-img-${idx}`}
                            className="w-full h-40 object-cover cursor-pointer hover:opacity-80"
                          />
                        ))}
                      </div>
                    )}

                    {/* GIF Display */}
                    {post.gif_url && (
                      <img
                        src={post.gif_url}
                        alt="post-gif"
                        className="w-full max-h-72 object-cover rounded-lg mb-3 cursor-pointer hover:opacity-80"
                      />
                    )}

                    {/* Location Display */}
                    {post.location && (
                      <div className="flex items-center gap-2 text-sm text-accent mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {post.location.address ||
                            `${post.location.latitude}, ${post.location.longitude}`}
                        </span>
                      </div>
                    )}

                    {/* Poll Display */}
                    {post.poll_id && (
                      <div className="border border-border rounded-lg p-3 mb-3 space-y-2">
                        <div className="font-bold text-foreground">Poll</div>
                        {/* Poll options would be rendered here */}
                        <div className="text-sm text-muted-foreground">
                          Poll voting coming soon
                        </div>
                      </div>
                    )}

                    {/* Scheduled Indicator */}
                    {post.is_scheduled && (
                      <div className="flex items-center gap-2 text-sm text-amber-500 mb-3">
                        <Clock className="w-4 h-4" />
                        <span>
                          Scheduled for:{" "}
                          {new Date(post.scheduled_at || "").toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Engagement Buttons */}
                    <div className="flex items-center justify-between mt-4 text-muted-foreground text-sm">
                      <div className="flex gap-4 items-center">
                        {/* Comment Button */}
                        <button
                          onClick={() => navigate(`/community/${post.id}`)}
                          className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition"
                        >
                          <div className="p-2 rounded-full hover:bg-blue-500/20 transition active:scale-95">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <span className="text-xs">{post.comments_count}</span>
                        </button>

                        {/* Like Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikePost(post.id);
                          }}
                          className={`flex items-center gap-2 transition ${
                            likedPosts.includes(post.id)
                              ? "text-red-500"
                              : "text-muted-foreground hover:text-red-500"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-full transition active:scale-95 ${
                              likedPosts.includes(post.id)
                                ? "bg-red-500/20"
                                : "hover:bg-red-500/20"
                            }`}
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={
                                likedPosts.includes(post.id)
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </div>
                          <span className="text-xs">{post.likes_count}</span>
                        </button>
                      </div>

                      {/* Share Dropdown - Rightmost */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="p-2 text-muted-foreground rounded-full hover:bg-green-500/20 hover:text-green-500 transition active:scale-95"
                          >
                            <Share className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const postUrl = `${window.location.origin}/community/${post.id}`;
                              navigator.clipboard.writeText(postUrl);
                              setSuccess("Link copied to clipboard!");
                              setTimeout(() => setSuccess(null), 2000);
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              const postUrl = `${window.location.origin}/community/${post.id}`;
                              window.open(
                                `mailto:?subject=Check out this post&body=${encodeURIComponent(
                                  postUrl
                                )}`,
                                "_blank"
                              );
                            }}
                          >
                            <MailIcon className="w-4 h-4 mr-2" />
                            Share via Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Right Sidebar - Search & Trending */}
        <div className="w-[400px] flex-shrink-0 border-l border-border p-4 hidden xl:flex flex-col sticky top-0 h-full overflow-y-auto">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {/* Trending Hashtags - Only show if they exist */}
          {searchResults.length === 0 && (
            <div className="bg-muted rounded-2xl p-4">
              <h2 className="text-xl font-bold mb-4">What's happening</h2>
              <div className="space-y-3">
                {isLoadingTrending ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">
                      Loading trends...
                    </p>
                  </div>
                ) : trendingHashtags.length > 0 ? (
                  <>
                    {trendingHashtags.map((item, idx) => (
                      <div
                        key={idx}
                        className="hover:bg-muted/80 p-3 rounded transition cursor-pointer flex items-start justify-between group"
                      >
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">
                            {item.category} · Trending
                          </div>
                          <div className="font-bold text-foreground">
                            {item.hashtag}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.count} {item.count === 1 ? "post" : "posts"}
                          </div>
                        </div>
                        <button className="text-muted-foreground hover:text-accent opacity-0 group-hover:opacity-100 transition">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button className="text-accent hover:text-blue-400 text-sm font-medium mt-2 w-full text-left">
                      Show more
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">
                      No trending hashtags yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Suggested Users */}
          {searchResults.length > 0 && (
            <div className="bg-muted rounded-2xl p-4">
              <h2 className="text-xl font-bold mb-4">Search Results</h2>
              <div className="space-y-3">
                {searchResults.slice(0, 5).map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between"
                  >
                    <div
                      className="flex items-center gap-2 flex-1 cursor-pointer hover:opacity-80"
                      onClick={() => navigate(`/profile/${profile.user_id}`)}
                    >
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold">
                        {profile.full_name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground">
                          {profile.full_name || "Anonymous"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          @
                          {profile.full_name?.toLowerCase().replace(" ", "") ||
                            "user"}
                        </p>
                      </div>
                    </div>
                    {isFriend(profile.user_id) ? (
                      <button
                        onClick={() => handleBlockUser(profile.user_id)}
                        className="ml-2 px-4 py-1.5 bg-red-500/20 text-red-500 rounded-full font-bold text-sm hover:bg-red-500/30"
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(profile.user_id)}
                        disabled={loadingFollowId === profile.user_id}
                        className="ml-2 px-4 py-1.5 bg-accent text-white rounded-full font-bold text-sm hover:bg-accent/90 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center gap-2"
                      >
                        {loadingFollowId === profile.user_id ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Following...
                          </>
                        ) : (
                          "Follow"
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md bg-red-500/20 border border-red-500 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md bg-green-500/20 border border-green-500 text-green-500 p-4 rounded-lg">
          {success}
        </div>
      )}
    </div>
  );
}
