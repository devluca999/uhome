// Supabase Database Types
// This is a placeholder - regenerate from Supabase CLI or update manually

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          role: 'landlord' | 'tenant'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role: 'landlord' | 'tenant'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'landlord' | 'tenant'
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          owner_id: string
          name: string
          address: string | null
          rent_amount: number
          rent_due_date: number | null
          rules: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          address?: string | null
          rent_amount: number
          rent_due_date?: number | null
          rules?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          address?: string | null
          rent_amount?: number
          rent_due_date?: number | null
          rules?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          user_id: string
          property_id: string
          move_in_date: string
          lease_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          move_in_date: string
          lease_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          move_in_date?: string
          lease_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_requests: {
        Row: {
          id: string
          property_id: string
          tenant_id: string
          status: 'pending' | 'in_progress' | 'completed'
          category: string | null
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          tenant_id: string
          status?: 'pending' | 'in_progress' | 'completed'
          category?: string | null
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          tenant_id?: string
          status?: 'pending' | 'in_progress' | 'completed'
          category?: string | null
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
