import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  Share,
  BarChart3,
  MapPin,
  Clock,
  Image as ImageIcon,
  SmilePlus,
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
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  user_profile?: UserProfile;
}

export default function CommentDetail() {
  const navigate = useNavigate();
  const { postId } = useParams();

  const [user, setUser] = useState<User | null>(null);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [likedComments, setLikedComments] = useState<string[]>([]);
  // Mention/autocomplete state for comments
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<UserProfile[]>(
    []
  );

  useEffect(() => {
    const initializeDetail = async () => {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);

      if (postId) {
        await Promise.all([
          loadPost(postId),
          loadComments(postId),
          loadUserLikes(currentUser.id),
          loadUserLikedComments(currentUser.id),
        ]);
      }
    };

    initializeDetail();
  }, [postId, navigate]);

  const loadPost = async (id: string) => {
    try {
      const { data: post, error } = await (supabase
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
        .eq("id", id)
        .single() as any);

      if (error) throw error;
      setPost(post as FeedPost);
    } catch (err) {
      console.error("Error loading post:", err);
      setError("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data: comments, error } = await (supabase
        .from("posts_comments")
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
            created_at,
            updated_at
          )
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true }) as any);

      if (error) throw error;
      setComments(comments || []);
    } catch (err) {
      console.error("Error loading comments:", err);
    }
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

  const loadUserLikedComments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_comment_likes")
        .select("comment_id")
        .eq("user_id", userId);

      if (error && error.code !== "PGRST116") throw error;
      setLikedComments((data || []).map((like) => like.comment_id));
    } catch (err) {
      console.error("Error loading comment likes:", err);
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

      setSuccess("Post deleted successfully!");
      navigate("/community");
    } catch (err) {
      console.error("Error deleting post:", err);
      setError("Failed to delete post");
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (user?.id !== commentUserId) {
      setError("You can only delete your own comments");
      return;
    }

    try {
      const { error } = await supabase
        .from("posts_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
      setSuccess("Comment deleted successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error deleting comment:", err);
      setError("Failed to delete comment");
    }
  };

  const handleMuteAuthor = async (authorId: string) => {
    if (!user) return;

    try {
      // For now, we'll filter out the author's comments from view
      setComments(comments.filter((c) => c.user_id !== authorId));
      if (post?.user_id === authorId) {
        navigate("/community");
      }
      setSuccess("Author muted successfully!");
      setTimeout(() => setSuccess(null), 2000);
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

  const handleReportComment = async (commentId: string) => {
    try {
      // In a real app, this would insert into a reports table
      setSuccess("Comment reported successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error reporting comment:", err);
      setError("Failed to report comment");
    }
  };

  const handleCreateComment = async () => {
    if (!user || !newComment.trim() || !postId) return;

    setIsLoading(true);
    try {
      // Ensure user has a profile row so comments show with name/avatar
      try {
        const { data: existing, error: existingErr } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (existingErr && existingErr.code !== "PGRST116") throw existingErr;

        if (!existing) {
          const defaultName = user.email ? user.email.split("@")[0] : null;
          await supabase.from("user_profiles").insert({
            user_id: user.id,
            full_name: defaultName,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error ensuring user profile before comment:", err);
      }

      const { error: commentError } = await (supabase
        .from("posts_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment,
          likes_count: 0,
        }) as any);

      if (commentError) throw commentError;

      setSuccess("Comment added!");
      setNewComment("");
      await loadComments(postId);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Error creating comment:", err);
      setError("Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikePost = async () => {
    if (!user || !post) return;

    try {
      if (likedPosts.includes(post.id)) {
        const { error: deleteError } = await supabase
          .from("user_post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;
        setLikedPosts(likedPosts.filter((id) => id !== post.id));

        // Update likes_count in database
        const newCount = Math.max(0, post.likes_count - 1);
        const { error: updateError } = await supabase
          .from("community_posts")
          .update({ likes_count: newCount })
          .eq("id", post.id);

        if (updateError) throw updateError;

        setPost({
          ...post,
          likes_count: newCount,
        });
      } else {
        const { error: insertError } = await supabase
          .from("user_post_likes")
          .insert({ post_id: post.id, user_id: user.id });

        if (insertError) throw insertError;
        setLikedPosts([...likedPosts, post.id]);

        // Update likes_count in database
        const newCount = post.likes_count + 1;
        const { error: updateError } = await supabase
          .from("community_posts")
          .update({ likes_count: newCount })
          .eq("id", post.id);

        if (updateError) throw updateError;

        setPost({
          ...post,
          likes_count: newCount,
        });
      }
    } catch (err) {
      console.error("Error liking post:", err);
      setError("Failed to like post");
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;

    try {
      if (likedComments.includes(commentId)) {
        // Unlike comment
        const { error: deleteError } = await supabase
          .from("user_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (deleteError && deleteError.code !== "PGRST116") throw deleteError;
        setLikedComments(likedComments.filter((id) => id !== commentId));

        // Update likes_count in database
        const currentComment = comments.find((c) => c.id === commentId);
        if (currentComment) {
          const newCount = Math.max(0, currentComment.likes_count - 1);
          const { error: updateError } = await supabase
            .from("posts_comments")
            .update({ likes_count: newCount })
            .eq("id", commentId);

          if (updateError) throw updateError;

          setComments(
            comments.map((comment) =>
              comment.id === commentId
                ? { ...comment, likes_count: newCount }
                : comment
            )
          );
        }
      } else {
        // Like comment
        const { error: insertError } = await supabase
          .from("user_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });

        if (insertError) throw insertError;
        setLikedComments([...likedComments, commentId]);

        // Update likes_count in database
        const currentComment = comments.find((c) => c.id === commentId);
        if (currentComment) {
          const newCount = currentComment.likes_count + 1;
          const { error: updateError } = await supabase
            .from("posts_comments")
            .update({ likes_count: newCount })
            .eq("id", commentId);

          if (updateError) throw updateError;

          setComments(
            comments.map((comment) =>
              comment.id === commentId
                ? { ...comment, likes_count: newCount }
                : comment
            )
          );
        }
      }
    } catch (err) {
      console.error("Error liking comment:", err);
      setError("Failed to like comment");
    }
  };

  if (isLoading && !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-4xl">
        {/* Center Content */}
        <div className="w-full border-r border-border overflow-y-auto h-full flex flex-col">
          {/* Header */}
          <div className="sticky top-0 backdrop-blur bg-background/80 border-b border-border p-4 z-10 flex items-center gap-4">
            <button
              onClick={() => navigate("/community")}
              className="p-2 hover:bg-muted rounded-full transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Post</h2>
          </div>

          {/* Original Post */}
          <div className="border-b border-border p-6 flex-shrink-0">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold cursor-pointer hover:opacity-80">
                {post.user_profile?.full_name?.[0] || "U"}
              </div>
              <div className="flex-1">
                  <div className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-bold hover:underline"
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                      >
                        {post.user_profile?.full_name || "User"}
                      </span>
                      <span className="text-muted-foreground">
                        @
                        {post.user_profile?.handle ||
                          post.user_profile?.user_id?.slice(0, 8) ||
                          "user"}
                      </span>
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

                {/* Content */}
                <p className="text-foreground mt-4 text-lg break-words whitespace-pre-wrap">
                  {renderContentWithMentions(post.content)}
                </p>

                {/* Images */}
                {post.images_urls && post.images_urls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4 mb-4 rounded-lg overflow-hidden">
                    {post.images_urls.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`post-img-${idx}`}
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-80"
                      />
                    ))}
                  </div>
                )}

                {/* Location */}
                {post.location && (
                  <div className="flex items-center gap-2 text-sm text-accent mt-4 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {post.location.address ||
                        `${post.location.latitude}, ${post.location.longitude}`}
                    </span>
                  </div>
                )}

                {/* Scheduled Indicator */}
                {post.is_scheduled && (
                  <div className="flex items-center gap-2 text-sm text-amber-500 mt-4 mb-4">
                    <Clock className="w-4 h-4" />
                    <span>
                      Scheduled for{" "}
                      {new Date(post.scheduled_at || "").toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Engagement Buttons */}
                <div className="flex items-center justify-between mt-4 text-muted-foreground text-sm">
                  <div className="flex gap-6 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Comment clicked");
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/20 p-2 rounded-full transition active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs">{post.comments_count}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikePost();
                      }}
                      className={`flex items-center gap-2 p-2 rounded-full transition active:scale-95 ${
                        likedPosts.includes(post.id)
                          ? "text-red-500 bg-red-500/20"
                          : "text-muted-foreground hover:text-red-500 hover:bg-red-500/20"
                      }`}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={
                          likedPosts.includes(post.id) ? "currentColor" : "none"
                        }
                      />
                      <span className="text-xs">{post.likes_count}</span>
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Share clicked");
                    }}
                    className="p-2 text-muted-foreground rounded-full hover:bg-green-500/20 hover:text-green-500 transition active:scale-95"
                  >
                    <Share className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comment Composer */}
          <div className="border-b border-border p-4 flex-shrink-0">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewComment(v);
                    updateMentionSuggestions(v);
                  }}
                  placeholder="Post your reply!"
                  className="w-full text-xl resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                  rows={3}
                />
                {/* Mention Suggestions */}
                {showMentionSuggestions && newComment.includes("@") && (
                  <div className="mt-2 bg-muted border border-border rounded-lg max-h-44 overflow-y-auto">
                    {mentionSuggestions.length > 0 ? (
                      mentionSuggestions.slice(0, 8).map((p) => (
                        <div
                          key={p.id}
                          className="p-3 hover:bg-accent/10 cursor-pointer flex items-center gap-3"
                          onClick={() => {
                            const lastAt = newComment.lastIndexOf("@");
                            const before = newComment.substring(0, lastAt);
                            const handle =
                              p.handle ||
                              p.full_name?.replace(/\s+/g, "") ||
                              p.user_id.slice(0, 8);
                            setNewComment(before + `@${handle} `);
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
                              @{p.user_id.slice(0, 8)}
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-accent/20 rounded-full transition text-accent">
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-accent/20 rounded-full transition text-accent">
                      <SmilePlus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button
                    onClick={handleCreateComment}
                    disabled={isLoading || !newComment.trim()}
                    className="rounded-full px-8 font-bold"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-12 p-4 flex-1 flex flex-col items-center justify-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No comments yet. Be the first to reply!
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-border p-4 hover:bg-muted/30 transition"
                >
                  <div className="flex gap-4">
                    <div
                      className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 font-bold cursor-pointer hover:opacity-80"
                      onClick={() => navigate(`/profile/${comment.user_id}`)}
                    >
                      {comment.user_profile?.full_name?.[0] || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold hover:underline"
                            onClick={() =>
                              navigate(`/profile/${comment.user_id}`)
                            }
                          >
                            {comment.user_profile?.full_name || "User"}
                          </span>
                          <span className="text-muted-foreground">
                            @
                            {comment.user_profile?.handle ||
                              comment.user_id.slice(0, 8)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-muted-foreground rounded-full hover:bg-accent/20 hover:text-accent transition active:scale-95">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user?.id === comment.user_id && (
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
                                  Edit reply
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteComment(comment.id, comment.user_id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                                  <span className="text-red-500">
                                    Delete reply
                                  </span>
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReportComment(comment.id);
                              }}
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              Report reply
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMuteAuthor(comment.user_id);
                              }}
                            >
                              <VolumeX className="w-4 h-4 mr-2" />
                              Mute @
                              {comment.user_profile?.handle ||
                                comment.user_profile?.full_name?.replace(
                                  /\s+/g,
                                  ""
                                ) ||
                                comment.user_id.slice(0, 8)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-foreground mt-2 break-words whitespace-pre-wrap">
                        {renderContentWithMentions(comment.content)}
                      </p>

                      {/* Comment Engagement */}
                      <div className="flex items-center justify-between mt-4 text-muted-foreground text-sm">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center gap-2 p-2 rounded-full transition active:scale-95 ${
                            likedComments.includes(comment.id)
                              ? "text-red-500"
                              : "hover:text-red-500 hover:bg-red-500/20"
                          }`}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={
                              likedComments.includes(comment.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                          <span className="text-xs">{comment.likes_count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Hidden on Comment Page */}
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
