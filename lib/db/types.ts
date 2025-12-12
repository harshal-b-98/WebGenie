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
          vercel_project_id: string | null;
          vercel_project_name: string | null;
          production_url: string | null;
          last_deployed_at: string | null;
          last_deployment_id: string | null;
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
          vercel_project_id?: string | null;
          vercel_project_name?: string | null;
          production_url?: string | null;
          last_deployed_at?: string | null;
          last_deployment_id?: string | null;
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
          vercel_project_id?: string | null;
          vercel_project_name?: string | null;
          production_url?: string | null;
          last_deployed_at?: string | null;
          last_deployment_id?: string | null;
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
      deployments: {
        Row: {
          id: string;
          site_id: string;
          version_id: string | null;
          user_id: string;
          provider: string;
          status: "pending" | "building" | "ready" | "error" | "canceled";
          deployment_url: string | null;
          production_url: string | null;
          preview_url: string | null;
          vercel_project_id: string | null;
          vercel_deployment_id: string | null;
          vercel_team_id: string | null;
          build_started_at: string | null;
          build_completed_at: string | null;
          build_duration_ms: number | null;
          error_message: string | null;
          error_code: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          version_id?: string | null;
          user_id: string;
          provider?: string;
          status?: "pending" | "building" | "ready" | "error" | "canceled";
          deployment_url?: string | null;
          production_url?: string | null;
          preview_url?: string | null;
          vercel_project_id?: string | null;
          vercel_deployment_id?: string | null;
          vercel_team_id?: string | null;
          build_started_at?: string | null;
          build_completed_at?: string | null;
          build_duration_ms?: number | null;
          error_message?: string | null;
          error_code?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          version_id?: string | null;
          user_id?: string;
          provider?: string;
          status?: "pending" | "building" | "ready" | "error" | "canceled";
          deployment_url?: string | null;
          production_url?: string | null;
          preview_url?: string | null;
          vercel_project_id?: string | null;
          vercel_deployment_id?: string | null;
          vercel_team_id?: string | null;
          build_started_at?: string | null;
          build_completed_at?: string | null;
          build_duration_ms?: number | null;
          error_message?: string | null;
          error_code?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_domains: {
        Row: {
          id: string;
          site_id: string;
          user_id: string;
          domain: string;
          subdomain: string | null;
          status: "pending" | "verifying" | "active" | "error" | "expired";
          verification_type: string | null;
          verification_token: string | null;
          verified_at: string | null;
          ssl_status: string | null;
          ssl_expires_at: string | null;
          vercel_domain_id: string | null;
          is_primary: boolean;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          site_id: string;
          user_id: string;
          domain: string;
          subdomain?: string | null;
          status?: "pending" | "verifying" | "active" | "error" | "expired";
          verification_type?: string | null;
          verification_token?: string | null;
          verified_at?: string | null;
          ssl_status?: string | null;
          ssl_expires_at?: string | null;
          vercel_domain_id?: string | null;
          is_primary?: boolean;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          site_id?: string;
          user_id?: string;
          domain?: string;
          subdomain?: string | null;
          status?: "pending" | "verifying" | "active" | "error" | "expired";
          verification_type?: string | null;
          verification_token?: string | null;
          verified_at?: string | null;
          ssl_status?: string | null;
          ssl_expires_at?: string | null;
          vercel_domain_id?: string | null;
          is_primary?: boolean;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vercel_connections: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          token_type: string | null;
          scope: string | null;
          vercel_user_id: string | null;
          vercel_team_id: string | null;
          vercel_team_slug: string | null;
          email: string | null;
          username: string | null;
          expires_at: string | null;
          refresh_token: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          token_type?: string | null;
          scope?: string | null;
          vercel_user_id?: string | null;
          vercel_team_id?: string | null;
          vercel_team_slug?: string | null;
          email?: string | null;
          username?: string | null;
          expires_at?: string | null;
          refresh_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          token_type?: string | null;
          scope?: string | null;
          vercel_user_id?: string | null;
          vercel_team_id?: string | null;
          vercel_team_slug?: string | null;
          email?: string | null;
          username?: string | null;
          expires_at?: string | null;
          refresh_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
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
