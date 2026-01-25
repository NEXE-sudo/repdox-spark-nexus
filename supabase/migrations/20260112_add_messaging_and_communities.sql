-- Migration: Add messaging (conversations, messages, attachments) and communities

-- Communities (groups)
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_blurb text,
  description text,
  image_url text,
  is_private boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  rules jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- Community memberships
CREATE TABLE IF NOT EXISTS community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member', -- member, moderator, owner
  joined_at timestamptz DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_memberships(community_id);

-- Community settings (key-value, for extensibility)
CREATE TABLE IF NOT EXISTS community_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb DEFAULT 'null'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_settings_key ON community_settings(community_id, key);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  is_group boolean DEFAULT false,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Conversation members
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  encrypted_body text NOT NULL,
  encryption_version text NOT NULL DEFAULT 'v1',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  content_type text,
  file_size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_msg ON message_attachments(message_id);

-- Communities (groups)
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_blurb text,
  description text,
  image_url text,
  is_private boolean DEFAULT false,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  rules jsonb DEFAULT '[]'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);

-- Community memberships
CREATE TABLE IF NOT EXISTS community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member', -- member, moderator, owner
  joined_at timestamptz DEFAULT now(),
  UNIQUE(community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_memberships(community_id);

-- Community settings (key-value, for extensibility)
CREATE TABLE IF NOT EXISTS community_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb DEFAULT 'null'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_community_settings_key ON community_settings(community_id, key);

-- Enable Row Level Security and Policies

-- Conversations policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_can_select_conversations" ON conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()));

CREATE POLICY "authenticated_can_insert_conversations" ON conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "owners_can_update_conversations" ON conversations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

CREATE POLICY "owners_can_delete_conversations" ON conversations FOR DELETE
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

-- Conversation members policies
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_can_select_own_membership" ON conversation_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_can_insert_own_membership" ON conversation_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_can_delete_own_membership" ON conversation_members FOR DELETE
  USING (user_id = auth.uid());

-- Messages policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_can_select_messages" ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "participants_can_insert_messages" ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()));

CREATE POLICY "sender_can_update_messages" ON messages FOR UPDATE
  USING (sender_id = auth.uid());

CREATE POLICY "sender_can_delete_messages" ON messages FOR DELETE
  USING (sender_id = auth.uid());

-- Message attachments policies (mirror messages)
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments_participants_select" ON message_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM messages m JOIN conversation_members cm ON cm.conversation_id = m.conversation_id WHERE m.id = message_attachments.message_id AND cm.user_id = auth.uid()));

CREATE POLICY "attachments_owner_insert" ON message_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM messages m WHERE m.id = message_attachments.message_id AND m.sender_id = auth.uid()));

-- Communities policies
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_or_member_select_communities" ON communities FOR SELECT
  USING (is_private = false OR EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = communities.id AND cm.user_id = auth.uid()));

CREATE POLICY "authenticated_can_insert_communities" ON communities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "moderators_can_update_communities" ON communities FOR UPDATE
  USING (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = communities.id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

CREATE POLICY "moderators_can_delete_communities" ON communities FOR DELETE
  USING (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = communities.id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

-- Community memberships policies
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_can_select_own_membership" ON community_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_can_insert_own_membership" ON community_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "moderators_can_update_membership" ON community_memberships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM community_memberships cm2 WHERE cm2.community_id = community_memberships.community_id AND cm2.user_id = auth.uid() AND (cm2.role = 'owner' OR cm2.role = 'moderator')));

CREATE POLICY "moderators_can_delete_membership" ON community_memberships FOR DELETE
  USING (EXISTS (SELECT 1 FROM community_memberships cm2 WHERE cm2.community_id = community_memberships.community_id AND cm2.user_id = auth.uid() AND (cm2.role = 'owner' OR cm2.role = 'moderator')));

-- Community settings policies
ALTER TABLE community_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderators_can_select_settings" ON community_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = community_settings.community_id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

CREATE POLICY "moderators_can_insert_settings" ON community_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = community_settings.community_id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

CREATE POLICY "moderators_can_update_settings" ON community_settings FOR UPDATE
  WITH CHECK (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = community_settings.community_id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

CREATE POLICY "moderators_can_delete_settings" ON community_settings FOR DELETE
  USING (EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.community_id = community_settings.community_id AND cm.user_id = auth.uid() AND (cm.role = 'owner' OR cm.role = 'moderator')));

-- Provide useful helper indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_memberships(user_id);

-- DONE
COMMENT ON TABLE messages IS 'Messages store encrypted payloads (server-side encryption). Client must encrypt before sending or server encrypts before storing depending on implementation.';
