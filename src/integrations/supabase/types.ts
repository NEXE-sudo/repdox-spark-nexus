export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          discord_invite: string | null;
          end_at: string;
          faqs: Json | null;
          format: Database["public"]["Enums"]["event_format"];
          id: string;
          image_url: string | null;
          instagram_handle: string | null;
          is_active: boolean | null;
          location: string;
          long_description: string | null;
          organisers: Json | null;
          overview: string | null;
          prizes: Json | null;
          registration_deadline: string;
          registration_link: string | null;
          rules: string | null;
          schedule: Json | null;
          short_blurb: string;
          slug: string;
          sponsors: Json | null;
          start_at: string;
          tags: string[] | null;
          title: string;
          type: Database["public"]["Enums"]["event_type"];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          discord_invite?: string | null;
          end_at: string;
          faqs?: Json | null;
          format: Database["public"]["Enums"]["event_format"];
          id?: string;
          image_url?: string | null;
          instagram_handle?: string | null;
          is_active?: boolean | null;
          location: string;
          long_description?: string | null;
          organisers?: Json | null;
          overview?: string | null;
          prizes?: Json | null;
          registration_deadline: string;
          registration_link?: string | null;
          rules?: string | null;
          schedule?: Json | null;
          short_blurb: string;
          slug: string;
          sponsors?: Json | null;
          start_at: string;
          tags?: string[] | null;
          title: string;
          type: Database["public"]["Enums"]["event_type"];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          discord_invite?: string | null;
          end_at?: string;
          faqs?: Json | null;
          format?: Database["public"]["Enums"]["event_format"];
          id?: string;
          image_url?: string | null;
          instagram_handle?: string | null;
          is_active?: boolean | null;
          location?: string;
          long_description?: string | null;
          organisers?: Json | null;
          overview?: string | null;
          prizes?: Json | null;
          registration_deadline?: string;
          registration_link?: string | null;
          rules?: string | null;
          schedule?: Json | null;
          short_blurb?: string;
          slug?: string;
          sponsors?: Json | null;
          start_at?: string;
          tags?: string[] | null;
          title?: string;
          type?: Database["public"]["Enums"]["event_type"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          handle: string | null;
          bio: string | null;
          avatar_url: string | null;
          phone: string | null;
          website: string | null;
          company: string | null;
          job_title: string | null;
          created_at: string;
          updated_at: string;
          date_of_birth: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          twitter_url: string | null;
          instagram_url: string | null;
          portfolio_url: string | null;
          custom_links: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          handle?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          website?: string | null;
          company?: string | null;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          instagram_url?: string | null;
          portfolio_url?: string | null;
          custom_links?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          handle?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          website?: string | null;
          company?: string | null;
          job_title?: string | null;
          created_at?: string;
          updated_at?: string;
          date_of_birth?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          instagram_url?: string | null;
          portfolio_url?: string | null;
          custom_links?: Json | null;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          user_id: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          message: string | null;
          status: string | null;
          role: string | null;
          registration_id: string | null;
          qr_code_data: string | null;
          check_in_status: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          committee: string | null;
          position: string | null;
          country: string | null;
          session_name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          status?: string | null;
          role?: string | null;
          registration_id?: string | null;
          qr_code_data?: string | null;
          check_in_status?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          committee?: string | null;
          position?: string | null;
          country?: string | null;
          session_name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          user_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          status?: string | null;
          role?: string | null;
          registration_id?: string | null;
          qr_code_data?: string | null;
          check_in_status?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          committee?: string | null;
          position?: string | null;
          country?: string | null;
          session_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      event_schedules: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          start_at: string | null;
          title: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          start_at?: string | null;
          title: string;
          description?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          start_at?: string | null;
          title?: string;
          description?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event_schedule";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      event_teams: {
        Row: {
          id: string;
          created_at: string | null;
          event_id: string;
          name: string;
          description: string | null;
          contact_email: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          event_id: string;
          name: string;
          description?: string | null;
          contact_email?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          event_id?: string;
          name?: string;
          description?: string | null;
          contact_email?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_event_team";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };

      community_posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          encrypted_content: string | null;
          images_urls: string[] | null;
          gif_url: string | null;
          location: Json | null;
          poll_id: string | null;
          scheduled_at: string | null;
          is_scheduled: boolean | null;
          likes_count: number | null;
          comments_count: number | null;
          created_at: string | null;
          updated_at: string | null;
          repost_count: number | null;
          views_count: number | null;
          bookmark_count: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string;
          encrypted_content?: string | null;
          images_urls?: string[] | null;
          gif_url?: string | null;
          location?: Json | null;
          poll_id?: string | null;
          scheduled_at?: string | null;
          is_scheduled?: boolean | null;
          likes_count?: number | null;
          comments_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          repost_count?: number | null;
          views_count?: number | null;
          bookmark_count?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          encrypted_content?: string | null;
          images_urls?: string[] | null;
          gif_url?: string | null;
          location?: Json | null;
          poll_id?: string | null;
          scheduled_at?: string | null;
          is_scheduled?: boolean | null;
          likes_count?: number | null;
          comments_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          repost_count?: number | null;
          views_count?: number | null;
          bookmark_count?: number | null;
        };
        Relationships: [];
      };

      posts_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          images_urls: string[] | null;
          gif_url: string | null;
          location: Json | null;
          likes_count: number | null;
          created_at: string | null;
          updated_at: string | null;
          parent_comment_id: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          images_urls?: string[] | null;
          gif_url?: string | null;
          location?: Json | null;
          likes_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          parent_comment_id?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          images_urls?: string[] | null;
          gif_url?: string | null;
          location?: Json | null;
          likes_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
          parent_comment_id?: string | null;
        };
        Relationships: [];
      };

      post_views: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          viewed_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          viewed_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          viewed_at?: string | null;
        };
        Relationships: [];
      };

      polls: {
        Row: {
          id: string;
          post_id: string;
          question: string;
          options: string[];
          duration_days: number | null;
          duration_hours: number | null;
          duration_minutes: number | null;
          expires_at: string | null;
          votes_count: number | null;
          created_by_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          post_id: string;
          question: string;
          options: string[];
          duration_days?: number | null;
          duration_hours?: number | null;
          duration_minutes?: number | null;
          expires_at?: string | null;
          votes_count?: number | null;
          created_by_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          post_id?: string;
          question?: string;
          options?: string[];
          duration_days?: number | null;
          duration_hours?: number | null;
          duration_minutes?: number | null;
          expires_at?: string | null;
          votes_count?: number | null;
          created_by_id?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_post_bookmarks: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_post_likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_post_reposts: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };

      user_comment_likes: {
        Row: {
          id: string;
          user_id: string;
          comment_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          comment_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          comment_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };

      profile_verifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          contact: string;
          token: string;
          expires_at: string;
          verified: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          contact: string;
          token: string;
          expires_at: string;
          verified?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          contact?: string;
          token?: string;
          expires_at?: string;
          verified?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      friendships: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      media_audit_log: {
        Row: {
          id: string;
          user_id: string;
          content_type: string;
          content_id: string;
          media_url: string;
          media_type: string;
          file_size_bytes: number | null;
          uploaded_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_type: string;
          content_id: string;
          media_url: string;
          media_type: string;
          file_size_bytes?: number | null;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_type?: string;
          content_id?: string;
          media_url?: string;
          media_type?: string;
          file_size_bytes?: number | null;
          uploaded_at?: string | null;
        };
        Relationships: [];
      };

      conversations: {
        Row: {
          id: string;
          title: string | null;
          is_group: boolean | null;
          community_id: string | null;
          created_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          title?: string | null;
          is_group?: boolean | null;
          community_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string | null;
          is_group?: boolean | null;
          community_id?: string | null;
          created_by?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "fk_conversation_community"; columns: ["community_id"]; referencedRelation: "communities"; referencedColumns: ["id"]; }
        ];
      };

      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: string | null;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "fk_conv_member_conv"; columns: ["conversation_id"]; referencedRelation: "conversations"; referencedColumns: ["id"]; }
        ];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          encrypted_body: string;
          encryption_version: string;
          metadata: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          encrypted_body: string;
          encryption_version?: string;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          encrypted_body?: string;
          encryption_version?: string;
          metadata?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "fk_message_conv"; columns: ["conversation_id"]; referencedRelation: "conversations"; referencedColumns: ["id"]; }
        ];
      };

      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          storage_path: string;
          content_type: string | null;
          file_size_bytes: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          message_id: string;
          storage_path: string;
          content_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          message_id?: string;
          storage_path?: string;
          content_type?: string | null;
          file_size_bytes?: number | null;
          created_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "fk_attachment_message"; columns: ["message_id"]; referencedRelation: "messages"; referencedColumns: ["id"]; }
        ];
      };

      communities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_blurb: string | null;
          description: string | null;
          image_url: string | null;
          is_private: boolean | null;
          created_by: string | null;
          created_at: string | null;
          rules: Json | null;
          settings: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_blurb?: string | null;
          description?: string | null;
          image_url?: string | null;
          is_private?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          rules?: Json | null;
          settings?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          short_blurb?: string | null;
          description?: string | null;
          image_url?: string | null;
          is_private?: boolean | null;
          created_by?: string | null;
          created_at?: string | null;
          rules?: Json | null;
          settings?: Json | null;
        };
        Relationships: [];
      };

      community_memberships: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          role: string | null;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          role?: string | null;
          joined_at?: string | null;
        };
        Relationships: [
          { foreignKeyName: "fk_community_membership"; columns: ["community_id"]; referencedRelation: "communities"; referencedColumns: ["id"]; }
        ];
      };

      community_settings: {
        Row: {
          id: string;
          community_id: string;
          key: string;
          value: Json | null;
        };
        Insert: {
          id?: string;
          community_id: string;
          key: string;
          value?: Json | null;
        };
        Update: {
          id?: string;
          community_id?: string;
          key?: string;
          value?: Json | null;
        };
        Relationships: [
          { foreignKeyName: "fk_community_settings"; columns: ["community_id"]; referencedRelation: "communities"; referencedColumns: ["id"]; }
        ];
      };

    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      event_format: "Online" | "Offline" | "Hybrid";
      event_type: "Hackathon" | "Workshop" | "MUN" | "Gaming";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      event_format: ["Online", "Offline", "Hybrid"],
      event_type: ["Hackathon", "Workshop", "MUN", "Gaming"],
    },
  },
} as const;
