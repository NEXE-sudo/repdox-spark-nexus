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
  role: "admin" | "moderator";
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  role: "admin" | "moderator" | "member";
  joined_at: string;
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
  
  // Invite State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");

  // Moderation State
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const handleInviteUser = async (userToInvite: any) => {
      try {
        const { error } = await supabase.from('community_memberships').insert({
            community_id: groupId,
            user_id: userToInvite.user_id,
            role: 'member'
        });
        
        if (error) {
            if (error.code === '23505') alert("User is already a member!");
            else throw error;
        } else {
            alert(`Invited ${userToInvite.full_name}!`);
            setShowInviteModal(false);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to invite.");
      }
  };

  const [groupInfo, setGroupInfo] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/signin");
        return;
      }
      setUser(currentUser);
      if (groupId) {
        await Promise.all([
          loadGroupInfo(groupId),
          loadModerators(groupId),
          loadPosts(groupId),
          checkMembership(groupId, currentUser.id)
        ]);
      }
    };
    init();
  }, [groupId]);

  const loadGroupInfo = async (id: string) => {
    const { data } = await supabase.from('communities').select('*').eq('id', id).single();
    if (data) setGroupInfo(data);
  };

  const checkMembership = async (groupId: string, userId: string) => {
    const { data } = await supabase
      .from('community_memberships')
      .select('role')
      .eq('community_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    
    setIsMember(!!data);
    setCurrentUserRole(data?.role || null);
  };

  const loadModerators = async (id: string) => {
    const { data } = await supabase
      .from('community_memberships')
      .select(`
        id, role,
        user:user_profiles!community_memberships_user_id_fkey(user_id, full_name, handle, avatar_url)
      `)
      .eq('community_id', id)
      .in('role', ['admin', 'moderator']);

    if (data) {
       const mods = data.map((m: any) => ({
         id: m.id,
         user_id: m.user.user_id,
         full_name: m.user.full_name,
         handle: m.user.handle,
         avatar_url: m.user.avatar_url,
         role: m.role
       }));
       setModerators(mods);
    }
  };

  const loadAllMembers = async (id: string) => {
    const { data, error } = await supabase
      .from('community_memberships')
      .select(`
        id, role, joined_at,
        user:user_profiles!community_memberships_user_id_fkey(user_id, full_name, handle, avatar_url)
      `)
      .eq('community_id', id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error("Error loading members:", error);
      return;
    }

    if (data) {
      const formatted: Member[] = data.map((m: any) => ({
        id: m.id,
        user_id: m.user.user_id,
        full_name: m.user.full_name,
        handle: m.user.handle,
        avatar_url: m.user.avatar_url,
        role: m.role,
        joined_at: m.joined_at
      }));
      setAllMembers(formatted);
    }
  };

  const handleUpdateRole = async (membershipId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('community_memberships')
        .update({ role: newRole })
        .eq('id', membershipId);
      
      if (error) throw error;
      
      // Update local state
      setAllMembers(allMembers.map(m => m.id === membershipId ? { ...m, role: newRole as any } : m));
      // Reload moderators if needed
      if (groupId) loadModerators(groupId);
    } catch (err) {
      console.error(err);
      alert("Failed to update role.");
    }
  };

  const handleKickMember = async (membershipId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const { error } = await supabase
        .from('community_memberships')
        .delete()
        .eq('id', membershipId);
      
      if (error) throw error;
      
      setAllMembers(allMembers.filter(m => m.id !== membershipId));
      if (groupId) {
        loadModerators(groupId);
        // If I kicked myself (unlikely UI-wise), update status
        if (allMembers.find(m => m.id === membershipId)?.user_id === user?.id) {
            setIsMember(false);
            setCurrentUserRole(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to remove member.");
    }
  };

  const loadPosts = async (id: string) => {
    const { data } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:user_profiles(full_name, handle, avatar_url),
        likes:user_post_likes(count),
        comments:posts_comments(count)
      `)
      .eq('community_id', id) 
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map((p: any) => ({
        id: p.id,
        title: p.title || "Untitled",
        content: p.content,
        author: p.author,
        likes_count: p.likes?.[0]?.count || 0,
        comments_count: p.comments?.[0]?.count || 0,
        created_at: p.created_at,
        is_pinned: false
      }));
      setPosts(formatted);
    }
  };

  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  if (!groupInfo) return <div className="p-8 text-center">Loading...</div>;

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
            <p className="text-sm text-muted-foreground">Group</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* Group Info Card */}
          <div className="bg-muted/50 rounded-lg p-6 border border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{groupInfo.name}</h2>
                <p className="text-muted-foreground mb-4">{groupInfo.description}</p>
              </div>
              <div className="flex gap-2">
                 {isMember && (
                    <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)}>
                       <Users className="w-4 h-4 mr-2" />
                       Invite
                    </Button>
                 )}
                 {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
                    <Button size="sm" variant="outline" onClick={() => { loadAllMembers(groupId!); setShowMembersModal(true); }}>
                       <Shield className="w-4 h-4 mr-2" />
                       Manage Members
                    </Button>
                 )}
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
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No posts yet in this group</p>
              </div>
            ) : (
              posts.map((post) => (
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
                    {getAvatarUrl(post.author?.avatar_url) ? (
                      <img src={getAvatarUrl(post.author.avatar_url)!} alt={post.author.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                        {post.author?.full_name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{post.author?.full_name || 'Unknown'}</span>
                        <span className="text-muted-foreground">@{post.author?.handle || 'user'}</span>
                      </div>
                      {post.title && <h3 className="text-lg font-bold mb-2">{post.title}</h3>}
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
              ))
            )}
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
              {moderators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No moderators yet</p>
              ) : (
                moderators.map((mod) => (
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
                    {mod.role === "admin" && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                ))
              )}
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
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
            <div className="relative bg-background rounded-xl p-6 w-full max-w-md shadow-xl border border-border">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Invite Members</h3>
                  <button onClick={() => setShowInviteModal(false)}><ArrowLeft className="w-5 h-5 rotate-180" /></button>
               </div>
               
               <input
                 className="w-full bg-muted border border-border rounded-lg px-3 py-2 mb-4"
                 placeholder="Search users..."
                 value={inviteQuery}
                 onChange={e => setInviteQuery(e.target.value)}
               />
               
               <div className="max-h-60 overflow-y-auto">
                 <FriendSearchList query={inviteQuery} onSelect={handleInviteUser} />
               </div>
            </div>
        </div>
      )}

      {/* Members Management Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMembersModal(false)} />
            <div className="relative bg-background rounded-xl p-6 w-full max-w-2xl shadow-xl border border-border">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Manage Members</h3>
                  <button onClick={() => setShowMembersModal(false)}><ArrowLeft className="w-5 h-5 rotate-180" /></button>
               </div>
               
               <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                  {allMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                       <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold overflow-hidden">
                          {getAvatarUrl(m.avatar_url) ? <img src={getAvatarUrl(m.avatar_url)!} className="w-full h-full object-cover" /> : m.full_name[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{m.full_name}</div>
                          <div className="text-xs text-muted-foreground">@{m.handle} • Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                             m.role === 'admin' ? 'bg-yellow-500/20 text-yellow-500' : 
                             m.role === 'moderator' ? 'bg-blue-500/20 text-blue-500' : 
                             'bg-muted text-muted-foreground'
                          }`}>
                             {m.role}
                          </span>
                          
                          {/* Admin Controls */}
                          {currentUserRole === 'admin' && m.user_id !== user?.id && (
                             <div className="flex items-center gap-1">
                                {m.role === 'member' ? (
                                   <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleUpdateRole(m.id, 'moderator')}>
                                      <Shield className="w-3.5 h-3.5 mr-1" /> Promote
                                   </Button>
                                ) : m.role === 'moderator' ? (
                                   <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => handleUpdateRole(m.id, 'member')}>
                                      <Users className="w-3.5 h-3.5 mr-1" /> Demote
                                   </Button>
                                ) : null}
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleKickMember(m.id)}>
                                   Kick
                                </Button>
                             </div>
                          )}

                          {/* Moderator Controls */}
                          {currentUserRole === 'moderator' && m.role === 'member' && m.user_id !== user?.id && (
                             <Button size="sm" variant="ghost" className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleKickMember(m.id)}>
                                Kick
                             </Button>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Helper component for searching friends (Copied from Messages.tsx for speed)
function FriendSearchList({ query, onSelect }: { query: string; onSelect: (u: any) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
       setLoading(true);
       let q = supabase.from('user_profiles').select('*').limit(10);
       if (query) q = q.or(`full_name.ilike.%${query}%,handle.ilike.%${query}%`);
       const { data } = await q;
       setResults(data || []);
       setLoading(false);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (results.length === 0) return <div className="text-center p-4 text-muted-foreground text-sm">No users found.</div>;

  return (
    <div className="space-y-1">
      {results.map(u => (
        <div key={u.id} onClick={() => onSelect(u)} className="flex items-center gap-3 p-2 hover:bg-accent/10 rounded cursor-pointer transition">
           <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
               {u.avatar_url ? <img src={supabase.storage.from('avatars').getPublicUrl(u.avatar_url).data.publicUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full font-bold text-xs">{u.full_name?.[0]}</div>}
           </div>
           <div>
              <div className="font-medium text-sm">{u.full_name}</div>
              <div className="text-xs text-muted-foreground">@{u.handle}</div>
           </div>
        </div>
      ))}
    </div>
  );
}