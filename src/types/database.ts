// Supabase Database Types
// This is a placeholder - regenerate from Supabase CLI or update manually

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          role: 'landlord' | 'tenant' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role: 'landlord' | 'tenant' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'landlord' | 'tenant' | 'admin'
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
          property_type: string | null
          rules_visible_to_tenants: boolean
          late_fee_rules: {
            amount?: number
            grace_period_days?: number
            applies_after?: 'due_date' | 'grace_period_end'
          } | null
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
          property_type?: string | null
          rules_visible_to_tenants?: boolean
          late_fee_rules?: {
            amount?: number
            grace_period_days?: number
            applies_after?: 'due_date' | 'grace_period_end'
          } | null
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
          property_type?: string | null
          rules_visible_to_tenants?: boolean
          late_fee_rules?: {
            amount?: number
            grace_period_days?: number
            applies_after?: 'due_date' | 'grace_period_end'
          } | null
          created_at?: string
          updated_at?: string
        }
      }
      user_property_types: {
        Row: {
          id: string
          user_id: string
          type_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type_name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type_name?: string
          created_at?: string
        }
      }
      property_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'city' | 'ownership' | 'custom'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type?: 'city' | 'ownership' | 'custom'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'city' | 'ownership' | 'custom'
          created_at?: string
        }
      }
      property_group_assignments: {
        Row: {
          property_id: string
          group_id: string
        }
        Insert: {
          property_id: string
          group_id: string
        }
        Update: {
          property_id?: string
          group_id?: string
        }
      }
      tenants: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          move_in_date: string
          lease_end_date: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id?: string | null
          move_in_date: string
          lease_end_date?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string | null
          move_in_date?: string
          lease_end_date?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_requests: {
        Row: {
          id: string
          property_id: string | null
          tenant_id: string | null
          lease_id: string | null
          status: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
          category: string | null
          description: string
          created_by: string | null
          created_by_role: 'landlord' | 'tenant'
          scheduled_date: string | null
          visibility_to_tenants: boolean
          internal_notes: string | null
          public_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          status?: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
          category?: string | null
          description?: string
          created_by?: string | null
          created_by_role: 'landlord' | 'tenant'
          scheduled_date?: string | null
          visibility_to_tenants?: boolean
          internal_notes?: string | null
          public_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          status?: 'submitted' | 'seen' | 'scheduled' | 'in_progress' | 'resolved' | 'closed'
          category?: string | null
          description?: string
          created_by?: string | null
          created_by_role?: 'landlord' | 'tenant'
          scheduled_date?: string | null
          visibility_to_tenants?: boolean
          internal_notes?: string | null
          public_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rent_records: {
        Row: {
          id: string
          property_id: string | null
          tenant_id: string | null
          lease_id: string | null
          amount: number
          due_date: string
          status: 'pending' | 'paid' | 'overdue'
          paid_date: string | null
          payment_method: 'manual' | 'external' | null
          payment_method_type: 'manual' | 'external' | null
          payment_method_label: string | null
          notes: string | null
          receipt_url: string | null
          late_fee: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          amount: number
          due_date: string
          status?: 'pending' | 'paid' | 'overdue'
          paid_date?: string | null
          payment_method?: 'manual' | 'external' | null
          payment_method_type?: 'manual' | 'external' | null
          payment_method_label?: string | null
          notes?: string | null
          receipt_url?: string | null
          late_fee?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          tenant_id?: string | null
          lease_id?: string | null
          amount?: number
          due_date?: string
          status?: 'pending' | 'paid' | 'overdue'
          paid_date?: string | null
          payment_method?: 'manual' | 'external' | null
          payment_method_type?: 'manual' | 'external' | null
          payment_method_label?: string | null
          notes?: string | null
          receipt_url?: string | null
          late_fee?: number
          created_at?: string
          updated_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          property_id: string
          name: string
          amount: number
          date: string
          category: 'maintenance' | 'utilities' | 'repairs' | null
          is_recurring: boolean
          recurring_frequency: 'monthly' | 'quarterly' | 'yearly' | null
          recurring_start_date: string | null
          recurring_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          amount: number
          date: string
          category?: 'maintenance' | 'utilities' | 'repairs' | null
          is_recurring?: boolean
          recurring_frequency?: 'monthly' | 'quarterly' | 'yearly' | null
          recurring_start_date?: string | null
          recurring_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          name?: string
          amount?: number
          date?: string
          category?: 'maintenance' | 'utilities' | 'repairs' | null
          is_recurring?: boolean
          recurring_frequency?: 'monthly' | 'quarterly' | 'yearly' | null
          recurring_start_date?: string | null
          recurring_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          property_id: string
          unit_id: string
          tenant_id: string | null
          status: 'draft' | 'active' | 'ended'
          lease_start_date: string | null
          lease_end_date: string | null
          lease_type: 'short-term' | 'long-term'
          rent_amount: number | null
          rent_frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
          security_deposit: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_id: string
          tenant_id?: string | null
          status?: 'draft' | 'active' | 'ended'
          lease_start_date?: string | null
          lease_end_date?: string | null
          lease_type?: 'short-term' | 'long-term'
          rent_amount?: number | null
          rent_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
          security_deposit?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_id?: string
          tenant_id?: string | null
          status?: 'draft' | 'active' | 'ended'
          lease_start_date?: string | null
          lease_end_date?: string | null
          lease_type?: 'short-term' | 'long-term'
          rent_amount?: number | null
          rent_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
          security_deposit?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          lease_id: string
          sender_id: string | null
          sender_role: 'tenant' | 'landlord' | 'system'
          body: string
          intent: 'general' | 'maintenance' | 'billing' | 'notice'
          status: 'open' | 'acknowledged' | 'resolved' | null
          message_type: 'landlord_tenant' | 'household'
          created_at: string
          soft_deleted_at: string | null
        }
        Insert: {
          id?: string
          lease_id: string
          sender_id?: string | null
          sender_role: 'tenant' | 'landlord' | 'system'
          body: string
          intent?: 'general' | 'maintenance' | 'billing' | 'notice'
          status?: 'open' | 'acknowledged' | 'resolved' | null
          message_type?: 'landlord_tenant' | 'household'
          created_at?: string
          soft_deleted_at?: string | null
        }
        Update: {
          id?: string
          lease_id?: string
          sender_id?: string | null
          sender_role?: 'tenant' | 'landlord' | 'system'
          body?: string
          intent?: 'general' | 'maintenance' | 'billing' | 'notice'
          status?: 'open' | 'acknowledged' | 'resolved' | null
          message_type?: 'landlord_tenant' | 'household'
          created_at?: string
          soft_deleted_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          lease_id: string
          type: 'message' | 'system'
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lease_id: string
          type?: 'message' | 'system'
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lease_id?: string
          type?: 'message' | 'system'
          read?: boolean
          created_at?: string
        }
      }
      receipt_settings: {
        Row: {
          id: string
          user_id: string
          header_text: string | null
          logo_url: string | null
          footer_note: string | null
          currency: string
          date_format: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          header_text?: string | null
          logo_url?: string | null
          footer_note?: string | null
          currency?: string
          date_format?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          header_text?: string | null
          logo_url?: string | null
          footer_note?: string | null
          currency?: string
          date_format?: string
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          property_id: string
          unit_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          unit_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          unit_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          entity_type:
            | 'property'
            | 'unit'
            | 'tenant'
            | 'rent_record'
            | 'expense'
            | 'work_order'
            | 'document'
          entity_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type:
            | 'property'
            | 'unit'
            | 'tenant'
            | 'rent_record'
            | 'expense'
            | 'work_order'
            | 'document'
          entity_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?:
            | 'property'
            | 'unit'
            | 'tenant'
            | 'rent_record'
            | 'expense'
            | 'work_order'
            | 'document'
          entity_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          assigned_to_type: 'tenant' | 'household' | 'unit'
          assigned_to_id: string
          status: 'pending' | 'completed'
          deadline: string | null
          linked_context_type: 'work_order' | 'move_in' | 'property' | 'rent_record'
          linked_context_id: string
          checklist_items: Array<{ id: string; text: string; completed: boolean }>
          image_urls: string[]
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          assigned_to_type: 'tenant' | 'household' | 'unit'
          assigned_to_id: string
          status?: 'pending' | 'completed'
          deadline?: string | null
          linked_context_type: 'work_order' | 'move_in' | 'property' | 'rent_record'
          linked_context_id: string
          checklist_items?: Array<{ id: string; text: string; completed: boolean }>
          image_urls?: string[]
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          assigned_to_type?: 'tenant' | 'household' | 'unit'
          assigned_to_id?: string
          status?: 'pending' | 'completed'
          deadline?: string | null
          linked_context_type?: 'work_order' | 'move_in' | 'property' | 'rent_record'
          linked_context_id?: string
          checklist_items?: Array<{ id: string; text: string; completed: boolean }>
          image_urls?: string[]
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          property_id: string
          lease_id: string | null
          uploaded_by: string
          file_url: string
          file_name: string
          file_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          lease_id?: string | null
          uploaded_by: string
          file_url: string
          file_name: string
          file_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          lease_id?: string | null
          uploaded_by?: string
          file_url?: string
          file_name?: string
          file_type?: string | null
          created_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          user_id: string
          email: string
          subject: string
          message: string
          status: 'open' | 'resolved'
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          subject: string
          message: string
          status?: 'open' | 'resolved'
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          subject?: string
          message?: string
          status?: 'open' | 'resolved'
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
    }
  }
}
