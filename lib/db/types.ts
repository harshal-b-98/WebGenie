// Generated types from Supabase
// Run: npx supabase gen types typescript --project-id cfhssgueszhoracjeyou > lib/db/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          tier: "free" | "pro" | "business" | "agency";
          credits_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: "free" | "pro" | "business" | "agency";
          credits_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: "free" | "pro" | "business" | "agency";
          credits_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      sites: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          title: string;
          description: string | null;
          site_type: string | null;
          status: "draft" | "generating" | "generated" | "published" | "archived";
          requirements: Json | null;
          target_audience: string | null;
          main_goal: string | null;
          current_version_id: string | null;
          published_url: string | null;
          subdomain: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          site_type?: string | null;
          status?: "draft" | "generating" | "generated" | "published" | "archived";
          requirements?: Json | null;
          target_audience?: string | null;
          main_goal?: string | null;
          current_version_id?: string | null;
          published_url?: string | null;
          subdomain?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          site_type?: string | null;
          status?: "draft" | "generating" | "generated" | "published" | "archived";
          requirements?: Json | null;
          target_audience?: string | null;
          main_goal?: string | null;
          current_version_id?: string | null;
          published_url?: string | null;
          subdomain?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          deleted_at?: string | null;
        };
      };
      // Add other tables as needed
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
