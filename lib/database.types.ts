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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};