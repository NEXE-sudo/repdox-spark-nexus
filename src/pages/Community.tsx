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
  GripVertical,
  Plus,
} from "lucide-react";
import {
  reverseGeocodeLocation,
  getPreferredMapUrl,
  type LocationData,
} from "@/lib/geolocationUtils";

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
  "Date of Birth"?: string | null;
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
  poll?: Poll | null;
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
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null); // Add this
  const [activeTab, setActiveTab] = useState<"feed" | "people" | "friends">(
    "feed"
  );
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // Feed state
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(
    new Set()
  );
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollQuestion, setPollQuestion] = useState<string>("");
  const [pollDuration, setPollDuration] = useState<{
    days: number;
    hours: number;
    minutes: number;
  }>({
    days: 1,
    hours: 0,
    minutes: 0,
  });
  const [draggedPollOption, setDraggedPollOption] = useState<number | null>(
    null
  );
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

  const testBucketAccess = async () => {
    console.log("[testBucketAccess] Testing storage buckets...");

    try {
      // Test community-posts bucket
      const { data: files, error } = await supabase.storage
        .from("community-posts")
        .list("", { limit: 1 });

      if (error) {
        console.error("[testBucketAccess] community-posts error:", error);
        console.error(
          "[testBucketAccess] Error details:",
          JSON.stringify(error, null, 2)
        );
      } else {
        console.log("[testBucketAccess] community-posts bucket accessible!");
        console.log("[testBucketAccess] Files found:", files?.length || 0);
      }
    } catch (err) {
      console.error("[testBucketAccess] Unexpected error:", err);
    }
  };

  useEffect(() => {
    testBucketAccess();
  }, []);

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

      // Load current user's profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (profile) {
        setCurrentUserProfile(profile as UserProfile);
      }

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

  const getAvatarUrl = (
    avatarPath: string | null | undefined
  ): string | null => {
    if (!avatarPath) return null;

    // If it's already a full URL, return it
    if (avatarPath.startsWith("http")) {
      return avatarPath;
    }

    // Clean the path - remove 'avatars/' prefix if present
    let cleanPath = avatarPath;
    if (cleanPath.startsWith("avatars/")) {
      cleanPath = cleanPath.replace("avatars/", "");
    }
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    // Get the public URL from storage
    const { data } = supabase.storage.from("avatars").getPublicUrl(cleanPath);

    return data.publicUrl;
  };

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
        .select("id,user_id,full_name,handle,avatar_url");

      if (current.length > 0) {
        query = query.or(
          `full_name.ilike.%${current}%,user_id.ilike.%${current}%,handle.ilike.%${current}%`
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

    setIsLoading(true);
    try {
      // Get the post with image URLs before deleting
      const post = feedPosts.find((p) => p.id === postId);

      // Delete images from storage first
      if (post?.images_urls && post.images_urls.length > 0) {
        for (const imageUrl of post.images_urls) {
          try {
            // Extract the file path from the URL
            // URL format: https://[project].supabase.co/storage/v1/object/public/community-posts/[user-id]/[filename]
            const urlParts = imageUrl.split("/community-posts/");
            if (urlParts.length === 2) {
              const filePath = urlParts[1];

              const { error: deleteError } = await supabase.storage
                .from("community-posts")
                .remove([filePath]);

              if (deleteError) {
                console.error(
                  "[handleDeletePost] Error deleting image:",
                  deleteError
                );
                // Continue anyway - don't block post deletion
              } else {
                console.log("[handleDeletePost] Image deleted:", filePath);
              }
            }
          } catch (err) {
            console.error(
              "[handleDeletePost] Error processing image URL:",
              err
            );
            // Continue anyway
          }
        }
      }

      // Delete the post from database
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      setFeedPosts(feedPosts.filter((post) => post.id !== postId));
      setSuccess("Post and images deleted successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Failed to delete post");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAllUserImages = async (userId: string) => {
    try {
      console.log(
        "[deleteAllUserImages] Deleting all images for user:",
        userId
      );

      // List all files in user's folder
      const { data: files, error: listError } = await supabase.storage
        .from("community-posts")
        .list(userId);

      if (listError) {
        console.error("[deleteAllUserImages] List error:", listError);
        return;
      }

      if (!files || files.length === 0) {
        console.log("[deleteAllUserImages] No images to delete");
        return;
      }

      // Delete all files
      const filePaths = files.map((file) => `${userId}/${file.name}`);

      console.log("[deleteAllUserImages] Deleting", filePaths.length, "images");

      const { error: deleteError } = await supabase.storage
        .from("community-posts")
        .remove(filePaths);

      if (deleteError) {
        console.error("[deleteAllUserImages] Delete error:", deleteError);
      } else {
        console.log("[deleteAllUserImages] All images deleted successfully");
      }
    } catch (err) {
      console.error("[deleteAllUserImages] Unexpected error:", err);
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
      const now = new Date().toISOString();

      // First, get posts with user profiles
      const { data: posts, error: postsError } = await supabase
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
        .or(`is_scheduled.is.false,scheduled_at.lte.${now}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) {
        console.error("Feed query error:", postsError);
        throw postsError;
      }

      if (!posts || posts.length === 0) {
        setFeedPosts([]);
        return;
      }

      // Get poll IDs from posts
      const pollIds = posts
        .map((post) => post.poll_id)
        .filter((id) => id !== null);

      // Fetch polls separately if any exist
      let pollsMap = new Map();
      if (pollIds.length > 0) {
        const { data: polls, error: pollsError } = await supabase
          .from("polls")
          .select("*")
          .in("id", pollIds);

        if (pollsError) {
          console.error("Error loading polls:", pollsError);
        } else if (polls) {
          polls.forEach((poll) => pollsMap.set(poll.id, poll));
        }
      }

      // Transform data to match your interface
      const transformedPosts = posts.map((post) => ({
        ...post,
        user_profile: post.user_profiles,
        poll: post.poll_id ? pollsMap.get(post.poll_id) || null : null,
      }));

      console.log("[Community] Loaded posts:", transformedPosts.length);
      console.log(
        "[Community] Posts with polls:",
        transformedPosts.filter((p) => p.poll).length
      );
      setFeedPosts(transformedPosts as FeedPost[]);
    } catch (err) {
      console.error("Error loading feed:", err);
      setError("Failed to load posts");
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

          if (existing && !existing.handle) {
            setError("Please set a @handle in your profile before posting.");
            return false;
          }

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

      let pollId = null;

      // Create poll FIRST if it exists
      if (
        showPollCreator &&
        pollOptions.some((opt) => opt.trim()) &&
        pollQuestion.trim()
      ) {
        const validOptions = pollOptions.filter((opt) => opt.trim());

        // Check for duplicate options
        const normalizedOptions = validOptions.map((opt) =>
          opt.trim().toLowerCase()
        );
        const uniqueOptions = new Set(normalizedOptions);

        if (uniqueOptions.size !== normalizedOptions.length) {
          setError(
            "Poll options cannot be duplicates. Please use unique options."
          );
          setIsLoading(false);
          return;
        }

        if (validOptions.length >= 2) {
          // Calculate poll expiry time
          const now = new Date();
          const expiryTime = new Date(
            now.getTime() +
              pollDuration.days * 24 * 60 * 60 * 1000 +
              pollDuration.hours * 60 * 60 * 1000 +
              pollDuration.minutes * 60 * 1000
          );

          console.log("[Community] Creating poll...");

          // Create poll without post_id first (we'll update it later)
          const { data: pollData, error: pollError } = await supabase
            .from("polls")
            .insert({
              post_id: null, // Temporary null
              question: pollQuestion,
              options: validOptions,
              expires_at: expiryTime.toISOString(),
              created_by_id: user.id,
              duration_days: pollDuration.days,
              duration_hours: pollDuration.hours,
              duration_minutes: pollDuration.minutes,
            })
            .select()
            .single();

          if (pollError) {
            console.error("[Community] Poll creation error:", pollError);
            throw pollError;
          }

          pollId = pollData.id;
          console.log("[Community] Poll created:", pollId);
        }
      }

      // Create the post with poll_id
      console.log("[Community] Creating post with poll_id:", pollId);

      const { data: postData, error: postError } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          title: "Community Post",
          content: newPost,
          images_urls: selectedImages.length > 0 ? selectedImages : null,
          gif_url: selectedGif,
          location: userLocation,
          poll_id: pollId,
          is_scheduled: !!scheduledTime,
          scheduled_at: scheduledTime
            ? new Date(scheduledTime).toISOString()
            : null,
          likes_count: 0,
          comments_count: 0,
        })
        .select()
        .single();

      if (postError) {
        console.error("[Community] Post creation error:", postError);
        throw postError;
      }

      console.log("[Community] Post created:", postData);

      // Update poll with post_id
      if (pollId) {
        const { error: updateError } = await supabase
          .from("polls")
          .update({ post_id: postData.id })
          .eq("id", pollId);

        if (updateError) {
          console.error("[Community] Poll update error:", updateError);
        }
      }

      setSuccess("Post created!");
      setNewPost("");
      setSelectedImages([]);
      setSelectedGif(null);
      setUserLocation(null);
      setPollOptions(["", ""]);
      setPollQuestion("");
      setPollDuration({ days: 1, hours: 0, minutes: 0 });
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
          try {
            // Get readable address from coordinates
            const locationData = await reverseGeocodeLocation(
              latitude,
              longitude
            );
            setUserLocation(locationData);
            setSuccess("Location added!");
          } catch (err) {
            console.error("Geocoding error:", err);
            // Fallback to coordinates only
            setUserLocation({
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            });
            setSuccess("Location added (coordinates only)!");
          }
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

    console.log(
      "[handleImageUpload] Starting upload for",
      files.length,
      "files"
    );
    console.log("[handleImageUpload] User ID:", user.id);

    setIsLoading(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < Math.min(files.length, 4); i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith("image/")) {
          console.warn(
            `[handleImageUpload] Skipping non-image file: ${file.name}`
          );
          continue;
        }

        // Validate file size (max 50MB)
        if (file.size > 52428800) {
          setError(`File ${file.name} is too large (max 50MB)`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        console.log("[handleImageUpload] Uploading to bucket: community-posts");
        console.log("[handleImageUpload] File path:", fileName);
        console.log("[handleImageUpload] File size:", file.size, "bytes");
        console.log("[handleImageUpload] File type:", file.type);

        // CRITICAL: Make sure bucket name is EXACTLY 'community-posts'
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("community-posts") // ✅ Exact bucket name
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("[handleImageUpload] Upload error:", uploadError);
          console.error(
            "[handleImageUpload] Error details:",
            JSON.stringify(uploadError, null, 2)
          );

          // Check if it's a bucket not found error
          if (uploadError.message?.includes("Bucket not found")) {
            setError("Storage bucket not configured. Please contact support.");
            console.error(
              "[handleImageUpload] BUCKET NOT FOUND! Check Supabase dashboard."
            );
          } else {
            setError(`Upload failed: ${uploadError.message}`);
          }
          continue;
        }

        console.log("[handleImageUpload] Upload successful:", uploadData);

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from("community-posts")
          .getPublicUrl(fileName);

        console.log(
          "[handleImageUpload] Public URL generated:",
          urlData.publicUrl
        );

        uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setSelectedImages([...selectedImages, ...uploadedUrls]);
        setSuccess(`${uploadedUrls.length} image(s) uploaded!`);
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError("No valid images were uploaded");
      }
    } catch (err) {
      console.error("[handleImageUpload] Unexpected error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload images";
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
      // Reset file input
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const handleImageError = (imageSrc: string) => {
    console.error("[Community] Image failed to load:", imageSrc);
    setImageLoadErrors((prev) => new Set([...prev, imageSrc]));
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
                              const handle =
                                p.handle ||
                                p.full_name?.replace(/\s+/g, "") ||
                                p.user_id.slice(0, 8);
                              setNewPost(before + `@${handle} `);
                              setShowMentionSuggestions(false);
                            }}
                          >
                            {p.avatar_url ? (
                              <img
                                src={getAvatarUrl(p.avatar_url)}
                                alt={p.full_name || "User"}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold flex-shrink-0">
                                {p.full_name?.[0] || "U"}
                              </div>
                            )}
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
                  <div className="border border-border rounded-lg p-4 mt-3 mb-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Ask a question
                      </label>
                      <input
                        type="text"
                        placeholder="What would you like to ask?"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full bg-transparent border border-border rounded p-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-accent"
                      />
                    </div>

                    {/* Poll Options */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Choices
                      </label>
                      <div className="space-y-2">
                        {pollOptions.map((option, idx) => {
                          // Check if this option is a duplicate
                          const optionTrimmed = option.trim().toLowerCase();
                          const isDuplicate =
                            optionTrimmed &&
                            pollOptions.findIndex(
                              (opt) =>
                                opt.trim().toLowerCase() === optionTrimmed
                            ) !== idx;

                          return (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => setDraggedPollOption(idx)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (
                                  draggedPollOption !== null &&
                                  draggedPollOption !== idx
                                ) {
                                  const newOptions = [...pollOptions];
                                  const [removed] = newOptions.splice(
                                    draggedPollOption,
                                    1
                                  );
                                  newOptions.splice(idx, 0, removed);
                                  setPollOptions(newOptions);
                                  setDraggedPollOption(idx);
                                }
                              }}
                              onDragEnd={() => setDraggedPollOption(null)}
                              className="flex flex-col gap-1"
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...pollOptions];
                                    newOptions[idx] = e.target.value;
                                    setPollOptions(newOptions);
                                  }}
                                  placeholder={`Choice ${idx + 1}`}
                                  className={`flex-1 bg-transparent border rounded p-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-accent transition ${
                                    isDuplicate
                                      ? "border-red-500 focus:border-red-500"
                                      : "border-border"
                                  }`}
                                />
                                {pollOptions.length > 2 && (
                                  <button
                                    onClick={() => {
                                      setPollOptions(
                                        pollOptions.filter((_, i) => i !== idx)
                                      );
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {isDuplicate && (
                                <div className="text-xs text-red-500 ml-6">
                                  This option is already used
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Option Button */}
                    <Button
                      onClick={() => {
                        if (pollOptions.length < 5) {
                          setPollOptions([...pollOptions, ""]);
                        }
                      }}
                      variant="outline"
                      className="w-full text-xs"
                      disabled={pollOptions.length >= 5}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Choice (Max 5)
                    </Button>

                    {/* Poll Duration */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        How long should this poll run?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Days
                          </label>
                          <select
                            value={pollDuration.days}
                            onChange={(e) =>
                              setPollDuration({
                                ...pollDuration,
                                days: parseInt(e.target.value),
                              })
                            }
                            className="w-full bg-muted border border-border rounded p-2 text-foreground text-sm outline-none focus:border-accent"
                          >
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Hours
                          </label>
                          <select
                            value={pollDuration.hours}
                            onChange={(e) =>
                              setPollDuration({
                                ...pollDuration,
                                hours: parseInt(e.target.value),
                              })
                            }
                            className="w-full bg-muted border border-border rounded p-2 text-foreground text-sm outline-none focus:border-accent"
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Minutes
                          </label>
                          <select
                            value={pollDuration.minutes}
                            onChange={(e) =>
                              setPollDuration({
                                ...pollDuration,
                                minutes: parseInt(e.target.value),
                              })
                            }
                            className="w-full bg-muted border border-border rounded p-2 text-foreground text-sm outline-none focus:border-accent"
                          >
                            {[0, 15, 30, 45].map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
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
                      disabled={
                        isLoading ||
                        !newPost.trim() ||
                        (showPollCreator &&
                          pollOptions.some((opt) => opt.trim()) &&
                          (() => {
                            const normalizedOptions = pollOptions
                              .filter((opt) => opt.trim())
                              .map((opt) => opt.trim().toLowerCase());
                            return (
                              new Set(normalizedOptions).size !==
                              normalizedOptions.length
                            );
                          })())
                      }
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
                  {getAvatarUrl(post.user_profile?.avatar_url) ? (
                    <img
                      src={getAvatarUrl(post.user_profile?.avatar_url)!}
                      alt={post.user_profile?.full_name || "User"}
                      className="w-12 h-12 rounded-full flex-shrink-0 object-cover cursor-pointer hover:opacity-80 transition"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold cursor-pointer hover:opacity-80 transition"
                      onClick={() => navigate(`/profile/${post.user_id}`)}
                    >
                      {post.user_profile?.full_name?.[0] || "U"}
                    </div>
                  )}
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
                          @
                          {post.user_profile?.handle ||
                            post.user_profile?.full_name
                              ?.toLowerCase()
                              .replace(" ", "") ||
                            "user"}
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
                            Mute @
                            {post.user_profile?.handle ||
                              post.user_profile?.full_name?.replace(
                                /\s+/g,
                                ""
                              ) ||
                              post.user_id.slice(0, 8)}
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
                      <div
                        className={`grid gap-2 mt-3 mb-3 rounded-lg overflow-hidden ${
                          post.images_urls.length === 1
                            ? "grid-cols-1"
                            : post.images_urls.length === 2
                            ? "grid-cols-2"
                            : post.images_urls.length === 3
                            ? "grid-cols-3"
                            : "grid-cols-2"
                        }`}
                      >
                        {post.images_urls.slice(0, 4).map((img, idx) => {
                          // Check if this image failed to load
                          const hasFailed = imageLoadErrors.has(img);

                          if (hasFailed) {
                            return (
                              <div
                                key={idx}
                                className="w-full h-auto min-h-[200px] flex items-center justify-center bg-muted rounded-lg border border-border"
                              >
                                <div className="text-center p-4">
                                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-xs text-muted-foreground">
                                    Image unavailable
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <img
                              key={idx}
                              src={img}
                              alt={`post-img-${idx}`}
                              className={`w-full rounded-lg cursor-pointer hover:opacity-90 transition ${
                                post.images_urls.length === 1
                                  ? "max-h-[500px] object-cover" // Single image: cover mode, taller
                                  : "h-[250px] object-cover" // Multiple images: fixed height grid
                              }`}
                              onError={() => handleImageError(img)}
                              onLoad={() =>
                                console.log("[Community] Image loaded:", img)
                              }
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* GIF Display */}
                    {post.gif_url && (
                      <img
                        src={post.gif_url}
                        alt="post-gif"
                        className="w-full h-auto max-h-72 object-contain rounded-lg mb-3 cursor-pointer hover:opacity-80 transition bg-black/5"
                      />
                    )}

                    {/* Location Display */}
                    {post.location && (
                      <button
                        onClick={() => {
                          const mapUrl = getPreferredMapUrl(
                            post.location.latitude,
                            post.location.longitude,
                            post.location.address
                          );
                          window.open(mapUrl, "_blank");
                        }}
                        className="flex items-center gap-2 text-sm text-accent mt-3 mb-4 hover:underline cursor-pointer hover:opacity-80 transition"
                      >
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {post.location.address ||
                            `${post.location.latitude.toFixed(
                              6
                            )}, ${post.location.longitude.toFixed(6)}`}
                        </span>
                      </button>
                    )}

                    {/* Poll Display */}
                    {post.poll && (
                      <div className="border border-border rounded-lg p-4 mb-3 space-y-3">
                        <div className="font-bold text-foreground text-sm">
                          {post.poll.question}
                        </div>
                        <div className="space-y-2">
                          {post.poll.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                // Poll voting functionality would go here
                                setSuccess(`Voted for: ${option}`);
                                setTimeout(() => setSuccess(null), 2000);
                              }}
                              className="w-full text-left p-3 border border-border rounded-lg hover:bg-accent/10 transition text-sm text-foreground hover:border-accent"
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                <span className="text-xs text-muted-foreground">
                                  0 votes
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {post.poll.expires_at && (
                          <div className="text-xs text-muted-foreground text-center">
                            Poll expires:{" "}
                            {new Date(post.poll.expires_at).toLocaleString()}
                          </div>
                        )}
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
