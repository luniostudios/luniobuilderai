export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  next_auth: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          emailVerified: string | null;
          image: string | null;
          role: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email?: string | null;
          emailVerified?: string | null;
          image?: string | null;
          role?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          emailVerified?: string | null;
          image?: string | null;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          html: string;
          cms_data: Json;
          site_metadata: Json;
          encrypted_vercel_token: string | null;
          stripe_connect_account_id: string | null;
          published_slug: string | null;
          published_at: string | null;
          created_date: string;
          updated_date: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name?: string;
          html?: string;
          cms_data?: Json;
          site_metadata?: Json;
          encrypted_vercel_token?: string | null;
          stripe_connect_account_id?: string | null;
          published_slug?: string | null;
          published_at?: string | null;
          created_date?: string;
          updated_date?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          html?: string;
          cms_data?: Json;
          site_metadata?: Json;
          encrypted_vercel_token?: string | null;
          stripe_connect_account_id?: string | null;
          published_slug?: string | null;
          published_at?: string | null;
          created_date?: string;
          updated_date?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          role: "user" | "assistant";
          content: string;
          created_date: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          role: "user" | "assistant";
          content: string;
          created_date?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_date?: string;
        };
        Relationships: [];
      };
      project_integrations: {
        Row: {
          project_id: string;
          owner_id: string;
          provider: "unsplash" | "resend";
          encrypted_key: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          owner_id: string;
          provider: "unsplash" | "resend";
          encrypted_key: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          owner_id?: string;
          provider?: "unsplash" | "resend";
          encrypted_key?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_memberships: {
        Row: { project_id: string; auth_user_id: string; email: string; created_at: string };
        Insert: { project_id: string; auth_user_id: string; email: string; created_at?: string };
        Update: { project_id?: string; auth_user_id?: string; email?: string; created_at?: string };
        Relationships: [];
      };
      site_private_pages: {
        Row: { project_id: string; path: string; title: string; html: string; access_mode: string; password_salt: string | null; password_hash: string | null; updated_at: string };
        Insert: { project_id: string; path: string; title: string; html: string; access_mode: string; password_salt?: string | null; password_hash?: string | null; updated_at?: string };
        Update: { project_id?: string; path?: string; title?: string; html?: string; access_mode?: string; password_salt?: string | null; password_hash?: string | null; updated_at?: string };
        Relationships: [];
      };
      site_subscribers: {
        Row: { id: string; project_id: string; email: string; source: string; consent_at: string; unsubscribe_token_hash: string; unsubscribed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; email: string; source?: string; consent_at?: string; unsubscribe_token_hash: string; unsubscribed_at?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; email?: string; source?: string; consent_at?: string; unsubscribe_token_hash?: string; unsubscribed_at?: string | null; created_at?: string };
        Relationships: [];
      };
      site_products: {
        Row: { id: string; project_id: string; sku: string; name: string; description: string; image_url: string; amount_cents: number; currency: string; requires_shipping: boolean; active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; sku: string; name: string; description?: string; image_url?: string; amount_cents: number; currency?: string; requires_shipping?: boolean; active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; sku?: string; name?: string; description?: string; image_url?: string; amount_cents?: number; currency?: string; requires_shipping?: boolean; active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      site_orders: {
        Row: { id: string; project_id: string; checkout_session_id: string; payment_intent_id: string | null; customer_email: string | null; status: string; amount_total: number; currency: string; items: Json; shipping_address: Json; created_at: string };
        Insert: { id?: string; project_id: string; checkout_session_id: string; payment_intent_id?: string | null; customer_email?: string | null; status: string; amount_total: number; currency: string; items?: Json; shipping_address?: Json; created_at?: string };
        Update: { id?: string; project_id?: string; checkout_session_id?: string; payment_intent_id?: string | null; customer_email?: string | null; status?: string; amount_total?: number; currency?: string; items?: Json; shipping_address?: Json; created_at?: string };
        Relationships: [];
      };
      site_campaigns: {
        Row: { id: string; project_id: string; subject: string; from_email: string; recipient_count: number; sent_count: number; status: string; provider_ids: Json; created_at: string; completed_at: string | null };
        Insert: { id?: string; project_id: string; subject: string; from_email: string; recipient_count?: number; sent_count?: number; status: string; provider_ids?: Json; created_at?: string; completed_at?: string | null };
        Update: { id?: string; project_id?: string; subject?: string; from_email?: string; recipient_count?: number; sent_count?: number; status?: string; provider_ids?: Json; created_at?: string; completed_at?: string | null };
        Relationships: [];
      };
      site_form_rate_limits: {
        Row: { project_id: string; ip_hash: string; window_started: string; request_count: number };
        Insert: { project_id: string; ip_hash: string; window_started: string; request_count?: number };
        Update: { project_id?: string; ip_hash?: string; window_started?: string; request_count?: number };
        Relationships: [];
      };
      user_model_settings: {
        Row: {
          owner_id: string;
          selected_model: string;
          encrypted_google_key: string | null;
          encrypted_openai_key: string | null;
          encrypted_anthropic_key: string | null;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          selected_model?: string;
          encrypted_google_key?: string | null;
          encrypted_openai_key?: string | null;
          encrypted_anthropic_key?: string | null;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          selected_model?: string;
          encrypted_google_key?: string | null;
          encrypted_openai_key?: string | null;
          encrypted_anthropic_key?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_site_form_submission: {
        Args: { p_project_id: string; p_ip_hash: string; p_window_started: string; p_limit?: number };
        Returns: boolean;
      };
      reserve_daily_generation: {
        Args: { p_owner_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};