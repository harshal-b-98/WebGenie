// Database types - generated from schema
// To regenerate: npx supabase gen types typescript --project-id cfhssgueszhoracjeyou > lib/db/types.ts

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
      conversations: {
        Row: {
          id: string;
          site_id: string;
          user_id: string;
          conversation_type: "clarification" | "generation" | "refinement";
          status: "active" | "completed" | "abandoned";
          ai_provider: string | null;
          model: string | null;
          total_tokens: number;
          total_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          user_id: string;
          conversation_type: "clarification" | "generation" | "refinement";
          status?: "active" | "completed" | "abandoned";
          ai_provider?: string | null;
          model?: string | null;
          total_tokens?: number;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          user_id?: string;
          conversation_type?: "clarification" | "generation" | "refinement";
          status?: "active" | "completed" | "abandoned";
          ai_provider?: string | null;
          model?: string | null;
          total_tokens?: number;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          sequence_number: number;
          tokens_used: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          sequence_number: number;
          tokens_used?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          sequence_number?: number;
          tokens_used?: number | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      site_versions: {
        Row: {
          id: string;
          site_id: string;
          version_number: number;
          html_content: string;
          css_content: string | null;
          js_content: string | null;
          component_tree: Json | null;
          generation_type: "initial" | "refinement";
          prompt_context: Json | null;
          ai_provider: string | null;
          model: string | null;
          tokens_used: number | null;
          generation_time_ms: number | null;
          change_summary: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          version_number: number;
          html_content: string;
          css_content?: string | null;
          js_content?: string | null;
          component_tree?: Json | null;
          generation_type: "initial" | "refinement";
          prompt_context?: Json | null;
          ai_provider?: string | null;
          model?: string | null;
          tokens_used?: number | null;
          generation_time_ms?: number | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          version_number?: number;
          html_content?: string;
          css_content?: string | null;
          js_content?: string | null;
          component_tree?: Json | null;
          generation_type?: "initial" | "refinement";
          prompt_context?: Json | null;
          ai_provider?: string | null;
          model?: string | null;
          tokens_used?: number | null;
          generation_time_ms?: number | null;
          change_summary?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          site_id: string;
          user_id: string;
          filename: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          extracted_text: string | null;
          summary: string | null;
          metadata: Json;
          processing_status: "pending" | "processing" | "completed" | "failed";
          processing_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          user_id: string;
          filename: string;
          file_type: string;
          file_size: number;
          storage_path: string;
          extracted_text?: string | null;
          summary?: string | null;
          metadata?: Json;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          user_id?: string;
          filename?: string;
          file_type?: string;
          file_size?: number;
          storage_path?: string;
          extracted_text?: string | null;
          summary?: string | null;
          metadata?: Json;
          processing_status?: "pending" | "processing" | "completed" | "failed";
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          file_type: string | null;
          file_size: number | null;
          mime_type: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          filename: string;
          storage_path: string;
          file_type?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          filename?: string;
          storage_path?: string;
          file_type?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
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
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
