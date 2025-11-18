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
import { getRelativeTime } from "@/lib/timeUtils";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface Conversation {
  user: UserProfile;
  lastMessage: Message;
  unreadCount: number;
}

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

      // Get friends to create mock conversations
      const { data: friendships, error } = await supabase
        .from("friendships")
        .select(
          `
          *,
          user_profiles!friendships_friend_id_fkey(id, user_id, full_name, handle, avatar_url, bio)
        `
        )
        .eq("user_id", userId)
        .eq("status", "accepted");

      if (error) throw error;

      // Create mock conversations
      const mockConversations: Conversation[] = (friendships || []).map(
        (friendship: any) => ({
          user: friendship.user_profiles,
          lastMessage: {
            id: `msg-${friendship.id}`,
            sender_id: friendship.user_profiles.user_id,
            receiver_id: userId,
            content: "Hey! How are you doing?",
            created_at: friendship.created_at,
            read: Math.random() > 0.5,
          },
          unreadCount: Math.floor(Math.random() * 5),
        })
      );

      setConversations(mockConversations);
    } catch (err) {
      console.error("Error loading conversations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationUserId: string) => {
    try {
      // Mock messages for demonstration
      const mockMessages: Message[] = [
        {
          id: "1",
          sender_id: conversationUserId,
          receiver_id: user!.id,
          content: "Hey! How are you doing?",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read: true,
        },
        {
          id: "2",
          sender_id: user!.id,
          receiver_id: conversationUserId,
          content: "I'm doing great! Thanks for asking 😊",
          created_at: new Date(Date.now() - 3000000).toISOString(),
          read: true,
        },
        {
          id: "3",
          sender_id: conversationUserId,
          receiver_id: user!.id,
          content: "That's awesome! Want to collaborate on a project?",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          read: true,
        },
        {
          id: "4",
          sender_id: user!.id,
          receiver_id: conversationUserId,
          content: "Sure! What do you have in mind?",
          created_at: new Date(Date.now() - 900000).toISOString(),
          read: true,
        },
      ];

      setMessages(mockMessages);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation.user);
    loadMessages(conversation.user.user_id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const message: Message = {
      id: `msg-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selectedConversation.user_id,
      content: newMessage,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages([...messages, message]);
    setNewMessage("");

    // In a real app, you would save this to the database
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user.handle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="flex items-center gap-4 p-3 rounded-full bg-accent/20 transition cursor-pointer">
              <Mail className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">Messages</span>
            </div>
            <div
              onClick={() => navigate("/bookmarks")}
              className="flex items-center gap-4 p-3 rounded-full hover:bg-accent/10 transition cursor-pointer"
            >
              <Bookmark className="w-6 h-6" />
              <span className="text-xl">Bookmarks</span>
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
              filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`flex items-center gap-3 p-4 border-b border-border hover:bg-accent/10 transition cursor-pointer ${
                    selectedConversation?.user_id === conversation.user.user_id
                      ? "bg-accent/10"
                      : ""
                  }`}
                >
                  <div className="relative">
                    {getAvatarUrl(conversation.user.avatar_url) ? (
                      <img
                        src={getAvatarUrl(conversation.user.avatar_url)!}
                        alt={conversation.user.full_name || "User"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                        {conversation.user.full_name?.[0] || "U"}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold truncate">
                        {conversation.user.full_name || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(conversation.lastMessage.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm truncate ${
                          conversation.unreadCount > 0
                            ? "text-foreground font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conversation.lastMessage.content}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-accent text-white rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border p-4 flex items-center justify-between bg-background">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() =>
                    navigate(`/profile/${selectedConversation.user_id}`)
                  }
                >
                  {getAvatarUrl(selectedConversation.avatar_url) ? (
                    <img
                      src={getAvatarUrl(selectedConversation.avatar_url)!}
                      alt={selectedConversation.full_name || "User"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-bold">
                      {selectedConversation.full_name?.[0] || "U"}
                    </div>
                  )}
                  <div>
                    <div className="font-bold">
                      {selectedConversation.full_name || "Anonymous"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{selectedConversation.handle || "user"}
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-accent/10 rounded-full transition">
                  <Info className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.sender_id === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender_id === user?.id
                          ? "bg-accent text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === user?.id
                            ? "text-white/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {getRelativeTime(message.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
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

            <div className="border-t border-border pt-3">
              <button
                className="flex items-center gap-2 text-accent"
                onClick={() => {
                  /* stub: create group action */
                }}
              >
                <Users className="w-5 h-5" />
                Create a group
              </button>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  /* stub: search/next action */
                }}
                size="sm"
              >
                Next
              </Button>
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
