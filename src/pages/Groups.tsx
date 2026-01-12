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
import { CommunitySidebar } from "@/components/CommunitySidebar";
import { slugify, generateRandomString } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null; // Database uses image_url
  member_count?: number; // Fetched separately or count of join
  is_private: boolean;
  created_by: string;
  created_at: string;
  slug: string;
  // UI helpers
  is_member?: boolean;
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
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', is_private: false });
  const [isCreating, setIsCreating] = useState(false);

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

      const { data: memberships, error } = await supabase
        .from('community_memberships')
        .select(`
          community:communities(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Extract communities from memberships and format
      const groups: Community[] = (memberships || [])
        .map((m: any) => m.community)
        .filter((c: any) => c !== null) // Safety check
        .map((c: any) => ({
           id: c.id,
           name: c.name,
           description: c.description,
           image_url: c.image_url,
           is_private: c.is_private || false,
           created_by: c.created_by,
           created_at: c.created_at,
           slug: c.slug,
           is_member: true,
           member_count: 0 //TODO: fetch count if needed
        }));

      setJoinedGroups(groups);
    } catch (err) {
      console.error("Error loading joined groups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiscoverGroups = async () => {
    try {
      // Fetch all communities (limit 20)
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .limit(20)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groups: Community[] = (data || []).map((c: any) => ({
           id: c.id,
           name: c.name,
           description: c.description,
           image_url: c.image_url,
           is_private: c.is_private || false,
           created_by: c.created_by,
           created_at: c.created_at,
           slug: c.slug,
           is_member: false,
           member_count: 0
      }));

      setDiscoverGroups(groups);
    } catch (err) {
      console.error("Error loading discover groups:", err);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      if (!user) return;

      // Insert into community_memberships
      const { error } = await supabase
        .from('community_memberships')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member'
        });

      if (error) {
        if (error.code === '23505') {
          alert("You are already a member of this group!");
        } else {
          throw error;
        }
        return;
      }

      const community = discoverGroups.find((c) => c.id === communityId);
      if (community) {
        setSuccess(`Joined ${community.name}!`);
        setTimeout(() => setSuccess(null), 2000);
        
        // Reload groups to reflect changes
        await loadJoinedGroups(user.id);
        await loadDiscoverGroups();
      }
    } catch (err) {
      console.error("Error joining community:", err);
      alert("Failed to join community");
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

  const handleCreateGroup = async () => {
    try {
      if (!newGroupData.name.trim() || !user) return;
      setIsCreating(true);

      // 1. Check if name exists
      const { data: existing } = await supabase
        .from('communities')
        .select('id')
        .ilike('name', newGroupData.name.trim())
        .maybeSingle();
      
      if (existing) {
        alert("A community with this name already exists!");
        setIsCreating(false);
        return;
      }

      // 2. Generate slug
      let slug = slugify(newGroupData.name);
      
      // 3. Create community
      const { data: community, error: createError } = await supabase
        .from('communities')
        .insert({
          name: newGroupData.name.trim(),
          description: newGroupData.description.trim(),
          is_private: newGroupData.is_private,
          created_by: user.id,
          slug: `${slug}-${generateRandomString(4)}`
        })
        .select()
        .single();
      
      if (createError) throw createError;

      // 4. Add creator as admin
      const { error: memberError } = await supabase
        .from('community_memberships')
        .insert({
          community_id: community.id,
          user_id: user.id,
          role: 'admin'
        });
      
      if (memberError) throw memberError;

      setSuccess("Community created successfully!");
      setShowCreateModal(false);
      setNewGroupData({ name: '', description: '', is_private: false });
      
      // 5. Reload groups
      await Promise.all([
        loadJoinedGroups(user.id),
        loadDiscoverGroups()
      ]);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error creating community:", err);
      alert("Failed to create community. Please try again.");
    } finally {
      setIsCreating(false);
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
        <CommunitySidebar activePath="/groups" />

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
                      ? "Communities you're part of"
                      : "Discover new communities"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 hover:bg-accent/10 rounded-full transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent hover:shadow-md transition group cursor-pointer"
                    onClick={() => navigate(`/groups/${community.id}`)}
                  >
                    {/* Cover Image */}
                    <div className="h-32 bg-muted relative">
                      {community.image_url ? (
                        <img
                          src={community.image_url}
                          alt={community.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-accent/5">
                          <Users className="w-10 h-10 text-accent/20" />
                        </div>
                      )}
                      
                      {/* Privacy Badge */}
                      {community.is_private && (
                         <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Private
                         </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                         <h3 className="font-bold text-lg leading-tight group-hover:text-accent transition">
                           {community.name}
                         </h3>
                         {activeTab === "joined" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 -mr-2 hover:bg-accent/10 rounded-full transition">
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

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                        {community.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {(community.member_count || 0).toLocaleString()} members
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
                             View
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
      
      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-background rounded-xl p-6 w-full max-w-md shadow-xl border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Create Community</h3>
                  <button onClick={() => setShowCreateModal(false)}><ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" /></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input 
                       className="w-full bg-muted border border-border rounded-lg px-3 py-2"
                       value={newGroupData.name}
                       onChange={e => setNewGroupData({...newGroupData, name: e.target.value})}
                       placeholder="e.g. Design Enthusiasts"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea 
                       className="w-full bg-muted border border-border rounded-lg px-3 py-2 min-h-[100px]"
                       value={newGroupData.description}
                       onChange={e => setNewGroupData({...newGroupData, description: e.target.value})}
                       placeholder="What is this group about?"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                     <input 
                       type="checkbox" 
                       id="is_private"
                       checked={newGroupData.is_private}
                       onChange={e => setNewGroupData({...newGroupData, is_private: e.target.checked})}
                       className="rounded border-border bg-muted"
                     />
                     <label htmlFor="is_private" className="text-sm">Private Group</label>
                  </div>
                  
                  <div className="pt-2 flex justify-end gap-2">
                     <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                     <Button 
                       disabled={isCreating || !newGroupData.name} 
                       onClick={handleCreateGroup}
                       className="bg-accent text-white"
                     >
                       {isCreating ? 'Creating...' : 'Create'}
                     </Button>
                  </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
