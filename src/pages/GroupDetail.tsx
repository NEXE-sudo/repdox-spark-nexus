import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Users,
  ArrowLeft,
  Settings,
  Share2,
  Bell,
  BellOff,
  Pin,
  TrendingUp,
  MessageSquare,
  Shield,
  Crown,
} from "lucide-react";

interface Moderator {
  id: string;
  user_id: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  role: "owner" | "moderator";
}

interface GroupPost {
  id: string;
  title: string;
  content: string;
  author: {
    full_name: string;
    handle: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_pinned: boolean;
}

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const groupInfo = {
    id: groupId,
    name: "Tech Innovators",
    description: "A community for tech enthusiasts and innovators to share ideas",
    member_count: 1234,
    online_count: 89,
    created_at: "2024-01-01",
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/signin");
        return;
      }
      setUser(currentUser);
      loadModerators();
      loadPosts();
    };
    init();
  }, [groupId]);

  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const loadModerators = () => {
    // Mock data
    setModerators([
      {
        id: "1",
        user_id: "user1",
        full_name: "John Doe",
        handle: "johndoe",
        avatar_url: null,
        role: "owner",
      },
      {
        id: "2",
        user_id: "user2",
        full_name: "Jane Smith",
        handle: "janesmith",
        avatar_url: null,
        role: "moderator",
      },
    ]);
  };

  const loadPosts = () => {
    // Mock data
    setPosts([
      {
        id: "1",
        title: "Welcome to Tech Innovators!",
        content: "This is our first post. Let's build something amazing together!",
        author: {
          full_name: "John Doe",
          handle: "johndoe",
          avatar_url: null,
        },
        likes_count: 45,
        comments_count: 12,
        created_at: new Date().toISOString(),
        is_pinned: true,
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/groups")} className="p-2 hover:bg-accent/10 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{groupInfo.name}</h1>
            <p className="text-sm text-muted-foreground">{groupInfo.member_count.toLocaleString()} members</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Group Info Card */}
          <div className="bg-muted/50 rounded-lg p-6 border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{groupInfo.name}</h2>
                <p className="text-muted-foreground mb-4">{groupInfo.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {groupInfo.member_count.toLocaleString()} members
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {groupInfo.online_count} online
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {isMember ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsNotifying(!isNotifying)}>
                      {isNotifying ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsMember(true)}>
                    Join Group
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-2">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background border border-border rounded-lg p-4 hover:border-accent/50 transition cursor-pointer"
                onClick={() => navigate(`/community/${post.id}`)}
              >
                {post.is_pinned && (
                  <div className="flex items-center gap-2 text-green-500 text-sm mb-2">
                    <Pin className="w-4 h-4" />
                    <span className="font-semibold">Pinned by moderators</span>
                  </div>
                )}
                <div className="flex gap-3">
                  {getAvatarUrl(post.author.avatar_url) ? (
                    <img src={getAvatarUrl(post.author.avatar_url)!} alt={post.author.full_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                      {post.author.full_name[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{post.author.full_name}</span>
                      <span className="text-muted-foreground">@{post.author.handle}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{post.title}</h3>
                    <p className="text-foreground mb-3">{post.content}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4 hidden lg:block">
          {/* Moderators */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Moderators
            </h3>
            <div className="space-y-3">
              {moderators.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3">
                  {getAvatarUrl(mod.avatar_url) ? (
                    <img src={getAvatarUrl(mod.avatar_url)!} alt={mod.full_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-bold text-sm">
                      {mod.full_name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{mod.full_name}</div>
                    <div className="text-xs text-muted-foreground">@{mod.handle}</div>
                  </div>
                  {mod.role === "owner" && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h3 className="font-bold mb-4">Group Rules</h3>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Be respectful and kind</li>
              <li>No spam or self-promotion</li>
              <li>Stay on topic</li>
              <li>No hate speech</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}