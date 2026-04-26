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
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'dj' | 'listener' | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'dj' | 'listener' | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'dj' | 'listener' | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      live_streams: {
        Row: {
          id: string
          dj_id: string
          name: string
          mount: string
          is_live: boolean
          listeners_count: number
          created_at: string
        }
        Insert: {
          id?: string
          dj_id: string
          name: string
          mount: string
          is_live?: boolean
          listeners_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          dj_id?: string
          name?: string
          mount?: string
          is_live?: boolean
          listeners_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'live_streams_dj_id_fkey'
            columns: ['dj_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
  }
}
