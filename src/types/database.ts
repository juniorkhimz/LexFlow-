export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          firm_id: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          firm_id: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          firm_id?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          advocate_id: string | null
          appointment_date: string
          client_id: string | null
          created_at: string
          end_time: string
          firm_id: string
          id: string
          lead_id: string | null
          location: string | null
          matter_id: string | null
          notes: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
        }
        Insert: {
          advocate_id?: string | null
          appointment_date: string
          client_id?: string | null
          created_at?: string
          end_time: string
          firm_id: string
          id?: string
          lead_id?: string | null
          location?: string | null
          matter_id?: string | null
          notes?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Update: {
          advocate_id?: string | null
          appointment_date?: string
          client_id?: string | null
          created_at?: string
          end_time?: string
          firm_id?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          matter_id?: string | null
          notes?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          email: string | null
          firm_id: string
          full_name: string
          id: string
          id_number: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          lead_id: string | null
          notes: string | null
          organization: string | null
          phone: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          email?: string | null
          firm_id: string
          full_name: string
          id?: string
          id_number?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lead_id?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          email?: string | null
          firm_id?: string
          full_name?: string
          id?: string
          id_number?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          lead_id?: string | null
          notes?: string | null
          organization?: string | null
          phone?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string
          firm_id: string
          id: string
          matter_id: string | null
          owner_id: string | null
          priority: Database["public"]["Enums"]["deadline_priority"]
          status: Database["public"]["Enums"]["deadline_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          firm_id: string
          id?: string
          matter_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deadline_priority"]
          status?: Database["public"]["Enums"]["deadline_status"]
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          firm_id?: string
          id?: string
          matter_id?: string | null
          owner_id?: string | null
          priority?: Database["public"]["Enums"]["deadline_priority"]
          status?: Database["public"]["Enums"]["deadline_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          client_id: string | null
          created_at: string
          firm_id: string
          id: string
          matter_id: string | null
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          client_id?: string | null
          created_at?: string
          firm_id: string
          id?: string
          matter_id?: string | null
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          client_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          matter_id?: string | null
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          tax_rate: number
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          tax_rate?: number
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          tax_rate?: number
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          firm_id: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          firm_id: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          firm_id?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          discount: number
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          sort_order: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          description: string
          discount?: number
          id?: string
          invoice_id: string
          line_total?: number
          quantity?: number
          sort_order?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          description?: string
          discount?: number
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          due_date: string | null
          firm_id: string
          id: string
          invoice_number: string
          matter_id: string | null
          notes: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          firm_id: string
          id?: string
          invoice_number: string
          matter_id?: string | null
          notes?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          due_date?: string | null
          firm_id?: string
          id?: string
          invoice_number?: string
          matter_id?: string | null
          notes?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          advocate_id: string | null
          company: string | null
          converted_client_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_value: number | null
          firm_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          practice_area_id: string | null
          priority: Database["public"]["Enums"]["lead_priority"]
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          advocate_id?: string | null
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          firm_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          practice_area_id?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          advocate_id?: string | null
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          firm_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          practice_area_id?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_converted_client"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_practice_area_id_fkey"
            columns: ["practice_area_id"]
            isOneToOne: false
            referencedRelation: "practice_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      matter_members: {
        Row: {
          added_at: string
          matter_id: string
          profile_id: string
        }
        Insert: {
          added_at?: string
          matter_id: string
          profile_id: string
        }
        Update: {
          added_at?: string
          matter_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matter_members_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matters: {
        Row: {
          advocate_id: string | null
          billed_amount: number
          client_id: string
          created_at: string
          description: string | null
          firm_id: string
          id: string
          matter_name: string
          matter_number: string
          notes: string | null
          practice_area_id: string | null
          progress: number
          start_date: string
          status: Database["public"]["Enums"]["matter_status"]
          updated_at: string
        }
        Insert: {
          advocate_id?: string | null
          billed_amount?: number
          client_id: string
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          matter_name: string
          matter_number: string
          notes?: string | null
          practice_area_id?: string | null
          progress?: number
          start_date?: string
          status?: Database["public"]["Enums"]["matter_status"]
          updated_at?: string
        }
        Update: {
          advocate_id?: string | null
          billed_amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          matter_name?: string
          matter_number?: string
          notes?: string | null
          practice_area_id?: string | null
          progress?: number
          start_date?: string
          status?: Database["public"]["Enums"]["matter_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matters_advocate_id_fkey"
            columns: ["advocate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_practice_area_id_fkey"
            columns: ["practice_area_id"]
            isOneToOne: false
            referencedRelation: "practice_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          firm_id: string
          id: string
          matter_id: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string
          firm_id: string
          id?: string
          matter_id?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          matter_id?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          firm_id: string
          id: string
          link: string | null
          profile_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          firm_id: string
          id?: string
          link?: string | null
          profile_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          link?: string | null
          profile_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          firm_id: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_date: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          firm_id: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          firm_id?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          client_portal: boolean
          max_documents: number | null
          max_staff_users: number | null
          max_storage_mb: number | null
          plan: string
        }
        Insert: {
          client_portal?: boolean
          max_documents?: number | null
          max_staff_users?: number | null
          max_storage_mb?: number | null
          plan: string
        }
        Update: {
          client_portal?: boolean
          max_documents?: number | null
          max_staff_users?: number | null
          max_storage_mb?: number | null
          plan?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      practice_areas: {
        Row: {
          created_at: string
          description: string | null
          firm_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_areas_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          firm_id: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          firm_id?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          firm_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          discount: number
          id: string
          line_total: number
          quantity: number
          quote_id: string
          sort_order: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          description: string
          discount?: number
          id?: string
          line_total?: number
          quantity?: number
          quote_id: string
          sort_order?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          description?: string
          discount?: number
          id?: string
          line_total?: number
          quantity?: number
          quote_id?: string
          sort_order?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          discount_amount: number
          firm_id: string
          id: string
          matter_id: string | null
          notes: string | null
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          firm_id: string
          id?: string
          matter_id?: string | null
          notes?: string | null
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          discount_amount?: number
          firm_id?: string
          id?: string
          matter_id?: string | null
          notes?: string | null
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          firm_id: string
          id: string
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          firm_id: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          firm_id?: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          firm_id: string
          id: string
          matter_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          matter_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          matter_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          firm_id: string
          id: string
          matter_id: string | null
          recorded_by: string | null
          reference: string | null
          type: Database["public"]["Enums"]["trust_transaction_type"]
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          firm_id: string
          id?: string
          matter_id?: string | null
          recorded_by?: string | null
          reference?: string | null
          type: Database["public"]["Enums"]["trust_transaction_type"]
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          firm_id?: string
          id?: string
          matter_id?: string | null
          recorded_by?: string | null
          reference?: string | null
          type?: Database["public"]["Enums"]["trust_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trust_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { p_full_name: string; p_token: string }
        Returns: string
      }
      auth_client_ids: { Args: never; Returns: string[] }
      auth_firm_id: { Args: never; Returns: string }
      auth_is_staff: { Args: never; Returns: boolean }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      can_invite_staff_user: { Args: { p_firm_id: string }; Returns: boolean }
      can_upload_document: {
        Args: { p_additional_bytes: number; p_firm_id: string }
        Returns: boolean
      }
      client_trust_balance: { Args: { p_client_id: string }; Returns: number }
      convert_lead_to_client: { Args: { p_lead_id: string }; Returns: string }
      convert_quote_to_invoice: {
        Args: { p_quote_id: string }
        Returns: string
      }
      create_firm_and_owner: {
        Args: { p_email: string; p_firm_name: string; p_full_name: string }
        Returns: string
      }
      firm_has_client_portal: { Args: { p_firm_id: string }; Returns: boolean }
      firm_plan: { Args: { p_firm_id: string }; Returns: string }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          firm_name: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
        }[]
      }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      appointment_type: "consultation" | "meeting" | "court" | "call" | "other"
      client_type: "individual" | "company" | "organization"
      deadline_priority: "low" | "medium" | "high" | "critical"
      deadline_status: "pending" | "completed" | "missed"
      document_category:
        | "contracts"
        | "court_documents"
        | "correspondence"
        | "identification"
        | "evidence"
        | "agreements"
        | "other"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      kyc_status: "pending" | "verified" | "rejected"
      lead_priority: "low" | "medium" | "high" | "critical"
      lead_status:
        | "new"
        | "contacted"
        | "conflict_check"
        | "under_review"
        | "qualified"
        | "consultation_scheduled"
        | "quote_sent"
        | "converted"
        | "rejected"
      matter_status:
        | "intake"
        | "active"
        | "pending"
        | "on_hold"
        | "completed"
        | "closed"
      payment_method: "mpesa" | "bank_transfer" | "cash" | "card" | "other"
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "todo" | "in_progress" | "completed" | "cancelled"
      trust_transaction_type:
        | "deposit"
        | "disbursement"
        | "transfer_to_operating"
      user_role:
        | "admin"
        | "partner"
        | "advocate"
        | "paralegal"
        | "accountant"
        | "receptionist"
        | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      appointment_type: ["consultation", "meeting", "court", "call", "other"],
      client_type: ["individual", "company", "organization"],
      deadline_priority: ["low", "medium", "high", "critical"],
      deadline_status: ["pending", "completed", "missed"],
      document_category: [
        "contracts",
        "court_documents",
        "correspondence",
        "identification",
        "evidence",
        "agreements",
        "other",
      ],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      kyc_status: ["pending", "verified", "rejected"],
      lead_priority: ["low", "medium", "high", "critical"],
      lead_status: [
        "new",
        "contacted",
        "conflict_check",
        "under_review",
        "qualified",
        "consultation_scheduled",
        "quote_sent",
        "converted",
        "rejected",
      ],
      matter_status: [
        "intake",
        "active",
        "pending",
        "on_hold",
        "completed",
        "closed",
      ],
      payment_method: ["mpesa", "bank_transfer", "cash", "card", "other"],
      quote_status: ["draft", "sent", "accepted", "rejected", "expired"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "completed", "cancelled"],
      trust_transaction_type: [
        "deposit",
        "disbursement",
        "transfer_to_operating",
      ],
      user_role: [
        "admin",
        "partner",
        "advocate",
        "paralegal",
        "accountant",
        "receptionist",
        "client",
      ],
    },
  },
} as const

// ---- Convenience aliases (the app imports these names) ----
type Tbl = Database["public"]["Tables"];
type En = Database["public"]["Enums"];

export type UserRole = En["user_role"];
export type LeadStatus = En["lead_status"];
export type Priority = En["lead_priority"];
export type ClientType = En["client_type"];
export type KycStatus = En["kyc_status"];
export type MatterStatus = En["matter_status"];
export type TaskStatus = En["task_status"];
export type DeadlineStatus = En["deadline_status"];
export type AppointmentType = En["appointment_type"];
export type AppointmentStatus = En["appointment_status"];
export type QuoteStatus = En["quote_status"];
export type InvoiceStatus = En["invoice_status"];
export type PaymentMethod = En["payment_method"];
export type DocumentCategory = En["document_category"];
export type TrustTransactionType = En["trust_transaction_type"];

export type Firm = Tbl["firms"]["Row"];
export type Profile = Tbl["profiles"]["Row"];
export type PracticeArea = Tbl["practice_areas"]["Row"];
export type Lead = Tbl["leads"]["Row"];
export type Client = Tbl["clients"]["Row"];
export type Matter = Tbl["matters"]["Row"];
export type Task = Tbl["tasks"]["Row"];
export type Deadline = Tbl["deadlines"]["Row"];
export type Appointment = Tbl["appointments"]["Row"];
export type Quote = Tbl["quotes"]["Row"];
export type QuoteItem = Tbl["quote_items"]["Row"];
export type Invoice = Tbl["invoices"]["Row"];
export type InvoiceItem = Tbl["invoice_items"]["Row"];
export type Payment = Tbl["payments"]["Row"];
export type DocumentRow = Tbl["documents"]["Row"];
export type Activity = Tbl["activities"]["Row"];
export type MessageRow = Tbl["messages"]["Row"];
export type NotificationRow = Tbl["notifications"]["Row"];
export type Invitation = Tbl["invitations"]["Row"];
export type Subscription = Tbl["subscriptions"]["Row"];
export type PlatformAdmin = Tbl["platform_admins"]["Row"];
export type TrustTransaction = Tbl["trust_transactions"]["Row"];
export type PlanLimit = Tbl["plan_limits"]["Row"];
