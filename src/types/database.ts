/**
 * Supabase schema type boundary.
 *
 * The migrations are the source of truth for the complete PostgreSQL schema.
 * This intentionally broad generated-schema-compatible map keeps server-side
 * query composition available while all mutation payloads are validated by
 * Zod and PostgreSQL constraints/RLS. Regenerate precise table types from the
 * deployed Supabase project after the schema is stable.
 */
type DynamicRow = Record<string, unknown>;
type DynamicTable = {
  Row: DynamicRow;
  Insert: DynamicRow;
  Update: DynamicRow;
  Relationships: [];
};
type DynamicView = {
  Row: DynamicRow;
  Relationships: [];
};
type DynamicFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, DynamicTable>;
    Views: Record<string, DynamicView>;
    Functions: Record<string, DynamicFunction>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** UI-safe notification row returned by the protected notifications query. */
export type NotificationRecord = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};
