import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

export function GlobalListeners() {
  const location = useLocation();

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Message Listener
      const messageChannel = supabase
        .channel('global_messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const newMessage = payload.new as any;
            if (newMessage.sender_id === user.id) return;
            if (location.pathname.startsWith('/messages')) return;

            const { data: sender } = await supabase
                .from('user_profiles')
                .select('full_name')
                .eq('user_id', newMessage.sender_id)
                .single();
            
            toast(`New message from ${sender?.full_name || 'someone'}`, {
              description: "Check your messages",
              action: {
                label: "View",
                onClick: () => window.location.href = '/messages',
              },
            });
          }
        )
        .subscribe();

      // 2. Community Membership Listener (Global Add to Group)
      const communityChannel = supabase
        .channel('global_community_adds')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'community_memberships',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            const newMembership = payload.new as any;
            
            // Fetch community name
            const { data: community } = await supabase
                .from('communities')
                .select('name')
                .eq('id', newMembership.community_id)
                .single();
            
            toast(`You've been added to ${community?.name || 'a new group'}!`, {
              description: "Start participating now",
              action: {
                label: "Go",
                onClick: () => window.location.href = `/groups/${newMembership.community_id}`,
              },
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageChannel);
        supabase.removeChannel(communityChannel);
      };
    };

    setup();
  }, [location.pathname]);

  return null;
}
