import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  onStatusChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ targetUserId, className, onStatusChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      
      if (user.id === targetUserId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("followed_id", targetUserId)
        .maybeSingle();

      if (data) setIsFollowing(true);
      setLoading(false);
    };

    checkStatus();
  }, [targetUserId]);

  const handleFollow = async () => {
    if (!currentUserId) {
      toast({
        title: "Sign in required",
        description: "You must be signed in to follow other users.",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("followed_id", targetUserId);

        if (error) throw error;
        setIsFollowing(false);
        onStatusChange?.(false);
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user.",
        });
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            followed_id: targetUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
        onStatusChange?.(true);
        toast({
          title: "Following",
          description: "You are now following this user.",
        });
      }
    } catch (error: any) {
      console.error("Follow error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || currentUserId === targetUserId) return null;

  return (
    <Button
      onClick={handleFollow}
      disabled={actionLoading}
      variant={isFollowing ? "outline" : "default"}
      className={`rounded-full gap-2 transition-all duration-300 ${className}`}
    >
      {actionLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {isFollowing ? "Unfollow" : "Follow"}
    </Button>
  );
}
