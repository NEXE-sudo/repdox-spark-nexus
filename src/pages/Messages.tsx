import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Search,
  ArrowLeft,
  Home,
  Compass,
  Bell,
  Bookmark,
  Users,
  Send,
  Settings,
  X,
  Smile,
  Image as ImageIcon,
  Paperclip,
  Info,
} from "lucide-react";
import { CommunitySidebar } from "@/components/CommunitySidebar";
import { getRelativeTime } from "@/lib/timeUtils";

// Enhanced interfaces for real data
interface UserProfile {
  id: string; // profile id
  user_id: string; // auth id
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_body: string; // We will store plain text here for now
  created_at: string;
}

interface Conversation {
  id: string;
  title: string | null;
  is_group: boolean;
  participants: UserProfile[]; // Other participants
  lastMessage?: Message;
  updated_at?: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Track selected conversation ID instead of just user
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null); 
  // Keep track of the *user* we are talking to (helpful for header display in 1:1)
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageQuery, setNewMessageQuery] = useState("");

  useEffect(() => {
    const initializeMessages = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await loadConversations(currentUser.id);
      
      // Check if navigated from another page with selected user
      const state = (window.history.state as any)?.usr;
      if (state?.selectedUserId) {
        const conv = conversations.find(c => 
          c.participants.some(p => p.user_id === state.selectedUserId)
        );
        if (conv) {
          handleSelectConversation(conv);
        }
      }
    };

    initializeMessages();
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

  const loadConversations = async (userId: string) => {
    try {
      setIsLoading(true);

      // 1. Get all conversation IDs the user is part of
      const { data: myMemberships, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const conversationIds = myMemberships.map(m => m.conversation_id);

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      // 2. Fetch conversation details, other members, and latest messages
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id, title, is_group, created_at,
          conversation_members!inner(
             user_id,
             user_profiles(id, user_id, full_name, handle, avatar_url, bio)
          ),
          messages(id, conversation_id, sender_id, encrypted_body, created_at)
        `)
        .in('id', conversationIds)
        .order('created_at', { ascending: false }); // Order conversations by creation for now, ideally by last message

      if (convError) throw convError;

      // Process data to match UI needs
      const processed: Conversation[] = convData.map((c: any) => {
         // Filter out self from participants list for display
         const participants = c.conversation_members
            .map((m: any) => m.user_profiles)
            .filter((p: any) => p && p.user_id !== userId);

         // Find latest message (supabase return might not be sorted if we don't strict it, but we can sort here)
         const sortedMsgs = (c.messages || []).sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
         );
         const lastMsg = sortedMsgs[0];

         return {
           id: c.id,
           title: c.title,
           is_group: c.is_group,
           participants,
           lastMessage: lastMsg,
           updated_at: lastMsg ? lastMsg.created_at : c.created_at
         };
      });

      // Sort by last activity
      processed.sort((a, b) => {
         const tA = new Date(a.updated_at || 0).getTime();
         const tB = new Date(b.updated_at || 0).getTime();
         return tB - tA;
      });

      setConversations(processed);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscribe to real-time changes
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`chat:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
           const newMsg = payload.new as Message;
           setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId]);

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }); // Oldest first for chat log

      if (error) throw error;
      setMessages(data as Message[]);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversationId(conversation.id);
    
    // For 1:1, set the partner
    if (!conversation.is_group && conversation.participants.length > 0) {
       setSelectedPartner(conversation.participants[0]);
    } else {
       // Handle group logic later, or just show title
       setSelectedPartner(null);
    }

    loadMessages(conversation.id);
    
    // Update URL state/param if needed
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationId || !user) return;

    setIsSending(true);
    try {
       const { error } = await supabase
         .from('messages')
         .insert({
            conversation_id: activeConversationId,
            sender_id: user.id,
            encrypted_body: newMessage, // Storing plaintext for now
            // encryption_version: 'none' // if needed by DB constraint
         });

       if (error) throw error;
       setNewMessage("");
       
       // Optimistic update handled by Realtime subscription usually, 
       // but we can also append locally if latency is high, 
       // though realtime is generally fast enough.
    } catch (err) {
       console.error("Failed to send:", err);
    } finally {
       setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (conv) => {
      const partner = conv.participants[0];
      if (!partner) return false;
      return (
         partner.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         partner.handle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-[1323px]">
        {/* Left Sidebar - Navigation */}
        <CommunitySidebar activePath="/messages" />

        {/* Conversations List */}
        <div className="w-full max-w-[400px] border-r border-border overflow-y-auto h-full">
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
                <h1 className="text-xl font-bold">Messages</h1>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-accent/10 rounded-full transition"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-6 py-12">
                <Mail className="w-16 h-16 mx-auto mb-6 text-muted-foreground opacity-50" />
                <h2 className="text-2xl font-bold text-center mb-2">
                  Welcome to your inbox!
                </h2>
                <p className="text-sm text-muted-foreground text-center max-w-[36ch] mx-auto mb-6">
                  Drop a line, share posts and more with private conversations
                  between you and others on X.
                </p>

                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowNewMessageModal(true)}
                    className="rounded-full px-6 py-3 text-base font-semibold"
                    size="md"
                  >
                    Write a message
                  </Button>
                </div>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                 const partner = conversation.participants[0];
                 if (!partner) return null;
                 
                 const isActive = activeConversationId === conversation.id;
                 const preview = conversation.lastMessage?.encrypted_body || 'Start a conversation';
                 // We don't have is_read logic yet, assuming read for now
                 const isRead = true; 

                 return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-4 cursor-pointer hover:bg-accent/5 transition border-b border-border relative ${
                    isActive ? "bg-accent/10 border-r-2 border-r-accent" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                        <img
                          src={getAvatarUrl(partner.avatar_url) || `https://ui-avatars.com/api/?name=${partner.full_name}&background=random`}
                          alt={partner.handle || "User"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Online status indicator can go here */}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold truncate ${!isRead ? "text-foreground" : ""}`}>
                          {partner.full_name || partner.handle}
                        </span>
                        {conversation.updated_at && (
                          <span className={`text-xs whitespace-nowrap ml-2 ${!isRead ? "text-accent font-medium" : "text-muted-foreground"}`}>
                            {getRelativeTime(conversation.updated_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate pr-2 ${!isRead ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                           {conversation.lastMessage?.sender_id === user?.id && <span className="mr-1">You:</span>}
                           {preview}
                        </p>
                        {/* Validation badges or unread counts can go here */}
                      </div>
                    </div>
                  </div>
                </motion.div>
                 );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeConversationId && selectedPartner ? (
            <>
              {/* Chat Header */}
              <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border">
                    <img
                      src={getAvatarUrl(selectedPartner.avatar_url) || `https://ui-avatars.com/api/?name=${selectedPartner.full_name}&background=random`}
                      alt={selectedPartner.handle || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg leading-none">{selectedPartner.full_name}</h2>
                    <span className="text-sm text-muted-foreground">@{selectedPartner.handle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="icon"><Info className="w-5 h-5 text-muted-foreground" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex mb-4 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                            isOwn
                              ? "bg-purple-600 text-white rounded-br-none"
                              : "bg-card border border-border text-foreground rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.encrypted_body}</p>
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isOwn ? "text-white/70" : "text-muted-foreground"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>


              {/* Message Input */}
              <div className="border-t border-border p-4 bg-background">
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-accent/10 rounded-full transition">
                    <ImageIcon className="w-5 h-5 text-accent" />
                  </button>
                  <button className="p-2 hover:bg-accent/10 rounded-full transition">
                    <Paperclip className="w-5 h-5 text-accent" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <button className="p-2 hover:bg-accent/10 rounded-full transition">
                    <Smile className="w-5 h-5 text-accent" />
                  </button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="rounded-full"
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-[520px] w-full px-8 py-12">
                <h3 className="text-2xl font-bold mb-3">Select a message</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-[48ch]">
                  Choose from your existing conversations, start a new one, or
                  just keep swimming.
                </p>

                <div className="flex">
                  <Button
                    onClick={() => setShowNewMessageModal(true)}
                    className="rounded-full px-6 py-3 text-base font-semibold"
                    size="md"
                  >
                    New message
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showNewMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNewMessageModal(false)}
          />
          <div className="relative bg-background rounded-xl p-4 w-full max-w-lg shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">New message</h3>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={newMessageQuery}
                  onChange={(e) => setNewMessageQuery(e.target.value)}
                  placeholder="Search people"
                  className="w-full pl-10 pr-3 py-3 rounded-md bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
               {newMessageQuery.length > 0 && <p className="text-xs text-muted-foreground px-1 mb-2">Search results...</p>}
               {/* Friends list search logic - Using a simplified search here for demonstration.
                   In a full implementation, we'd fetch friends matching the query.
                   Here we just assume you might want to start chat with existing friends or search globally.
                   Let's implement a simple user search from profiles table.
               */}
               <FriendSearchList query={newMessageQuery} onSelect={async (selectedUser) => {
                  try {
                    if (!user) return;
                    
                    // Check if conversation exists
                    // This is complex in SQL without a function, so for now we'll just create a new one 
                    // or ideally check if we have a common conversation ID in memory (conversations list).
                    
                    const existing = conversations.find(c => 
                      !c.is_group && c.participants.some(p => p.id === selectedUser.id)
                    );

                    if (existing) {
                       handleSelectConversation(existing);
                       setShowNewMessageModal(false);
                       return;
                    }

                    // Create new conversation
                    const { data: newConv, error: createError } = await supabase
                      .from('conversations')
                      .insert({ is_group: false, created_by: user.id })
                      .select()
                      .single();
                      
                    if (createError) throw createError;

                    // Add members
                    const { error: memberError } = await supabase
                      .from('conversation_members')
                      .insert([
                        { conversation_id: newConv.id, user_id: user.id },
                        { conversation_id: newConv.id, user_id: selectedUser.user_id }
                      ]);

                    if (memberError) throw memberError;

                    // Reload conversations
                    await loadConversations(user.id);
                    
                    setShowNewMessageModal(false);
                    // We might need to select it after reload, but loadConversations is async. 
                    // For now, user will see it appear at top.
                  } catch (err: any) {
                    console.error("Critical: Failed to start chat", {
                       error: err,
                       message: err?.message,
                       selectedUser_id: selectedUser?.id,
                       selectedUser_userId: selectedUser?.user_id,
                       currentUser_id: user?.id
                    });
                    alert(`Failed to start chat: ${err?.message || 'Unknown error'}`);
                  }
               }} />
            </div>

            <div className="border-t border-border pt-3 mt-4">
              <button
                className="flex items-center gap-2 text-accent"
                onClick={() => {
                   alert("Group creation coming soon!");
                }}
              >
                <Users className="w-5 h-5" />
                Create a group
              </button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="fixed right-0 top-0 h-full w-[420px] bg-background border-l border-border z-[9999] shadow-2xl">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-accent/10 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold">Direct Messages</h2>
            </div>

            {/* Section 1 */}
            <div className="mb-8">
              <p className="text-sm font-semibold mb-2">
                Allow message requests from:
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-[300px]">
                People you follow will always be able to message you.{" "}
                <a href="#" className="text-accent hover:underline">
                  Learn more
                </a>
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">No one</span>
                  <input type="radio" name="dm-requests" className="w-4 h-4" />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Verified users</span>
                  <input type="radio" name="dm-requests" className="w-4 h-4" />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Everyone</span>
                  <input type="radio" name="dm-requests" className="w-4 h-4" />
                </label>
              </div>
            </div>

            {/* Filter Low Quality */}
            <div className="mb-8 pt-6 border-t border-border">
              <label className="flex items-center justify-between mb-2 cursor-pointer">
                <span className="text-sm font-semibold">
                  Filter low-quality messages
                </span>
                <input type="checkbox" className="w-4 h-4" />
              </label>

              <p className="text-xs text-muted-foreground max-w-[330px]">
                Hide message requests that have been detected as being
                potentially spam or low-quality. These will be sent to a
                separate inbox at the bottom of your message requests. You can
                still access them if you want.{" "}
                <a href="#" className="text-accent hover:underline">
                  Learn more
                </a>
              </p>
            </div>

            {/* Read Receipts */}
            <div>
              <label className="flex items-center justify-between mb-2 cursor-pointer">
                <span className="text-sm font-semibold">
                  Show read receipts
                </span>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </label>

              <p className="text-xs text-muted-foreground max-w-[330px]">
                Let people you're messaging with know when you've seen their
                messages. Read receipts are not shown on message requests.{" "}
                <a href="#" className="text-accent hover:underline">
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for searching friends
function FriendSearchList({ query, onSelect }: { query: string; onSelect: (u: UserProfile) => void }) {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
       setLoading(true);
       let q = supabase.from('user_profiles').select('*').limit(10);
       
       if (query) {
         q = q.or(`full_name.ilike.%${query}%,handle.ilike.%${query}%`);
       }
       
       const { data } = await q;
       setResults(data || []);
       setLoading(false);
    };
    
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (loading) return <div className="text-center p-4"><div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full mx-auto"/></div>;
  if (results.length === 0) return <div className="text-center p-4 text-muted-foreground text-sm">No users found.</div>;

  return (
    <div className="space-y-1">
      {results.map(u => (
        <div 
          key={u.id} 
          onClick={() => onSelect(u)}
          className="flex items-center gap-3 p-2 hover:bg-accent/10 rounded cursor-pointer transition"
        >
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
