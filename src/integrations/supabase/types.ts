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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          created_at: string
          filename: string
          id: string
          label: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          label: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          label?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_analyses: {
        Row: {
          created_at: string
          cv_filename: string | null
          feedback: string | null
          formatting_score: number
          id: string
          keyword_score: number
          readability_score: number
          score: number
          structure_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          cv_filename?: string | null
          feedback?: string | null
          formatting_score?: number
          id?: string
          keyword_score?: number
          readability_score?: number
          score: number
          structure_score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          cv_filename?: string | null
          feedback?: string | null
          formatting_score?: number
          id?: string
          keyword_score?: number
          readability_score?: number
          score?: number
          structure_score?: number
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_views: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          application_deadline: string | null
          application_email: string | null
          company: string
          created_at: string
          description: string
          employment_type: string | null
          hiring_contact_name: string | null
          hiring_contact_title: string | null
          id: string
          industry: string
          is_active: boolean
          job_type: string
          location: string
          posted_by: string | null
          required_field_of_study: string[] | null
          required_qualification: string | null
          required_years_experience: number | null
          salary_range: string | null
          skills: string[]
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          application_email?: string | null
          company: string
          created_at?: string
          description: string
          employment_type?: string | null
          hiring_contact_name?: string | null
          hiring_contact_title?: string | null
          id?: string
          industry: string
          is_active?: boolean
          job_type?: string
          location: string
          posted_by?: string | null
          required_field_of_study?: string[] | null
          required_qualification?: string | null
          required_years_experience?: number | null
          salary_range?: string | null
          skills?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          application_email?: string | null
          company?: string
          created_at?: string
          description?: string
          employment_type?: string | null
          hiring_contact_name?: string | null
          hiring_contact_title?: string | null
          id?: string
          industry?: string
          is_active?: boolean
          job_type?: string
          location?: string
          posted_by?: string | null
          required_field_of_study?: string[] | null
          required_qualification?: string | null
          required_years_experience?: number | null
          salary_range?: string | null
          skills?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          job_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          ai_consent_at: string | null
          career_summary: string | null
          created_at: string
          current_job_title: string | null
          current_location: string | null
          cv_extracted_experience_years: number | null
          cv_extracted_qualification: string | null
          cv_extracted_skills: string[] | null
          cv_filename: string | null
          cv_path: string | null
          cv_summary: string | null
          email: string | null
          field_of_study: string | null
          full_name: string | null
          graduation_year: number | null
          highest_education: string | null
          id: string
          industries: string[] | null
          institution: string | null
          onboarding_complete: boolean
          phone: string | null
          postal_address: string | null
          preferred_industries: string[] | null
          residential_address: string | null
          skills: string[] | null
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          account_type?: string | null
          ai_consent_at?: string | null
          career_summary?: string | null
          created_at?: string
          current_job_title?: string | null
          current_location?: string | null
          cv_extracted_experience_years?: number | null
          cv_extracted_qualification?: string | null
          cv_extracted_skills?: string[] | null
          cv_filename?: string | null
          cv_path?: string | null
          cv_summary?: string | null
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          graduation_year?: number | null
          highest_education?: string | null
          id: string
          industries?: string[] | null
          institution?: string | null
          onboarding_complete?: boolean
          phone?: string | null
          postal_address?: string | null
          preferred_industries?: string[] | null
          residential_address?: string | null
          skills?: string[] | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          account_type?: string | null
          ai_consent_at?: string | null
          career_summary?: string | null
          created_at?: string
          current_job_title?: string | null
          current_location?: string | null
          cv_extracted_experience_years?: number | null
          cv_extracted_qualification?: string | null
          cv_extracted_skills?: string[] | null
          cv_filename?: string | null
          cv_path?: string | null
          cv_summary?: string | null
          email?: string | null
          field_of_study?: string | null
          full_name?: string | null
          graduation_year?: number | null
          highest_education?: string | null
          id?: string
          industries?: string[] | null
          institution?: string | null
          onboarding_complete?: boolean
          phone?: string | null
          postal_address?: string | null
          preferred_industries?: string[] | null
          residential_address?: string | null
          skills?: string[] | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      quick_jobs: {
        Row: {
          budget: string | null
          category: string
          contact: string | null
          contact_number: string | null
          created_at: string
          date_needed: string | null
          description: string
          details: Json | null
          duration: string | null
          id: string
          is_active: boolean
          location: string | null
          pay_amount: number | null
          pay_type: string | null
          payment_status: string
          posted_by: string | null
          poster_id: string | null
          poster_name: string | null
          preferred_gender: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          budget?: string | null
          category: string
          contact?: string | null
          contact_number?: string | null
          created_at?: string
          date_needed?: string | null
          description: string
          details?: Json | null
          duration?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          payment_status?: string
          posted_by?: string | null
          poster_id?: string | null
          poster_name?: string | null
          preferred_gender?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          budget?: string | null
          category?: string
          contact?: string | null
          contact_number?: string | null
          created_at?: string
          date_needed?: string | null
          description?: string
          details?: Json | null
          duration?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          payment_status?: string
          posted_by?: string | null
          poster_id?: string | null
          poster_name?: string | null
          preferred_gender?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      revamp_requests: {
        Row: {
          attachment_paths: string[] | null
          created_at: string
          current_job_title: string | null
          cv_path: string | null
          delivered_at: string | null
          fulfilment_status: string
          id: string
          notes: string | null
          partner_notes: string | null
          payment_status: string
          revamp_amount: number | null
          revamp_level: string | null
          revamped_cv_filename: string | null
          revamped_cv_path: string | null
          target_job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_paths?: string[] | null
          created_at?: string
          current_job_title?: string | null
          cv_path?: string | null
          delivered_at?: string | null
          fulfilment_status?: string
          id?: string
          notes?: string | null
          partner_notes?: string | null
          payment_status?: string
          revamp_amount?: number | null
          revamp_level?: string | null
          revamped_cv_filename?: string | null
          revamped_cv_path?: string | null
          target_job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_paths?: string[] | null
          created_at?: string
          current_job_title?: string | null
          cv_path?: string | null
          delivered_at?: string | null
          fulfilment_status?: string
          id?: string
          notes?: string | null
          partner_notes?: string | null
          payment_status?: string
          revamp_amount?: number | null
          revamp_level?: string | null
          revamped_cv_filename?: string | null
          revamped_cv_path?: string | null
          target_job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: Database["public"]["Enums"]["swipe_action"]
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["swipe_action"]
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["swipe_action"]
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "partner"
      application_status: "draft" | "submitted"
      swipe_action: "like" | "save" | "pass"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user", "partner"],
      application_status: ["draft", "submitted"],
      swipe_action: ["like", "save", "pass"],
    },
  },
} as const
