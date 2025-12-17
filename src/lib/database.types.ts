export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          avatar_url: string | null
          status_msg: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          status_msg?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          avatar_url?: string | null
          status_msg?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          created_at?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          id: number
          name: string
          type: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          type?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          type?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          id: string
          room_id: number
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: number
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: number
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          room_id: number
          user_id: string | null
          content_ko: string | null
          content_en: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: number
          user_id?: string | null
          content_ko?: string | null
          content_en?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: number
          user_id?: string | null
          content_ko?: string | null
          content_en?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_room_ids: {
        Args: Record<string, never>
        Returns: number[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

