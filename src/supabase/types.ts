export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      booth_fixed_fees: {
        Row: {
          booth_id: string
          created_at: string | null
          deposit_paid: boolean | null
          height_review_fee_paid: boolean | null
          id: number
          management_fee_paid: boolean | null
          updated_at: string | null
        }
        Insert: {
          booth_id: string
          created_at?: string | null
          deposit_paid?: boolean | null
          height_review_fee_paid?: boolean | null
          id?: number
          management_fee_paid?: boolean | null
          updated_at?: string | null
        }
        Update: {
          booth_id?: string
          created_at?: string | null
          deposit_paid?: boolean | null
          height_review_fee_paid?: boolean | null
          id?: number
          management_fee_paid?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booth_fixed_fees_booth_id_fkey"
            columns: ["booth_id"]
            referencedRelation: "exhibitor_booths"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_info: {
        Row: {
          booth_height_type: string | null
          booth_number: string
          created_at: string | null
          id: string
          need_screen: boolean | null
          screen_specification: string | null
          updated_at: string | null
        }
        Insert: {
          booth_height_type?: string | null
          booth_number: string
          created_at?: string | null
          id?: string
          need_screen?: boolean | null
          screen_specification?: string | null
          updated_at?: string | null
        }
        Update: {
          booth_height_type?: string | null
          booth_number?: string
          created_at?: string | null
          id?: string
          need_screen?: boolean | null
          screen_specification?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      builder_info: {
        Row: {
          booth_number: string
          builder_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          booth_number: string
          builder_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          booth_number?: string
          builder_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      drawing_documents: {
        Row: {
          booth_number: string
          created_at: string | null
          effect_drawing_comment: string | null
          effect_drawing_status: string | null
          effect_drawing_urls: string[] | null
          electrical_system_drawing_comment: string | null
          electrical_system_drawing_status: string | null
          electrical_system_drawing_urls: string[] | null
          elevation_grid_drawing_comment: string | null
          elevation_grid_drawing_status: string | null
          elevation_grid_drawing_urls: string[] | null
          fire_facility_drawing_comment: string | null
          fire_facility_drawing_status: string | null
          fire_facility_drawing_urls: string[] | null
          id: string
          is_submitted: boolean | null
          last_reviewed_at: string | null
          material_drawing_comment: string | null
          material_drawing_status: string | null
          material_drawing_urls: string[] | null
          plan_drawing_comment: string | null
          plan_drawing_status: string | null
          plan_drawing_urls: string[] | null
          review_round: number | null
          reviewed_by: string | null
          structure_drawing_comment: string | null
          structure_drawing_status: string | null
          structure_drawing_urls: string[] | null
          submitted_at: string | null
          updated_at: string | null
          utility_position_drawing_comment: string | null
          utility_position_drawing_status: string | null
          utility_position_drawing_urls: string[] | null
        }
        Insert: {
          booth_number: string
          created_at?: string | null
          effect_drawing_comment?: string | null
          effect_drawing_status?: string | null
          effect_drawing_urls?: string[] | null
          electrical_system_drawing_comment?: string | null
          electrical_system_drawing_status?: string | null
          electrical_system_drawing_urls?: string[] | null
          elevation_grid_drawing_comment?: string | null
          elevation_grid_drawing_status?: string | null
          elevation_grid_drawing_urls?: string[] | null
          fire_facility_drawing_comment?: string | null
          fire_facility_drawing_status?: string | null
          fire_facility_drawing_urls?: string[] | null
          id?: string
          is_submitted?: boolean | null
          last_reviewed_at?: string | null
          material_drawing_comment?: string | null
          material_drawing_status?: string | null
          material_drawing_urls?: string[] | null
          plan_drawing_comment?: string | null
          plan_drawing_status?: string | null
          plan_drawing_urls?: string[] | null
          review_round?: number | null
          reviewed_by?: string | null
          structure_drawing_comment?: string | null
          structure_drawing_status?: string | null
          structure_drawing_urls?: string[] | null
          submitted_at?: string | null
          updated_at?: string | null
          utility_position_drawing_comment?: string | null
          utility_position_drawing_status?: string | null
          utility_position_drawing_urls?: string[] | null
        }
        Update: {
          booth_number?: string
          created_at?: string | null
          effect_drawing_comment?: string | null
          effect_drawing_status?: string | null
          effect_drawing_urls?: string[] | null
          electrical_system_drawing_comment?: string | null
          electrical_system_drawing_status?: string | null
          electrical_system_drawing_urls?: string[] | null
          elevation_grid_drawing_comment?: string | null
          elevation_grid_drawing_status?: string | null
          elevation_grid_drawing_urls?: string[] | null
          fire_facility_drawing_comment?: string | null
          fire_facility_drawing_status?: string | null
          fire_facility_drawing_urls?: string[] | null
          id?: string
          is_submitted?: boolean | null
          last_reviewed_at?: string | null
          material_drawing_comment?: string | null
          material_drawing_status?: string | null
          material_drawing_urls?: string[] | null
          plan_drawing_comment?: string | null
          plan_drawing_status?: string | null
          plan_drawing_urls?: string[] | null
          review_round?: number | null
          reviewed_by?: string | null
          structure_drawing_comment?: string | null
          structure_drawing_status?: string | null
          structure_drawing_urls?: string[] | null
          submitted_at?: string | null
          updated_at?: string | null
          utility_position_drawing_comment?: string | null
          utility_position_drawing_status?: string | null
          utility_position_drawing_urls?: string[] | null
        }
        Relationships: []
      }
      drawing_history: {
        Row: {
          booth_number: string
          drawing_type: string
          file_url: string
          id: string
          review_round: number | null
          uploaded_at: string | null
        }
        Insert: {
          booth_number: string
          drawing_type: string
          file_url: string
          id?: string
          review_round?: number | null
          uploaded_at?: string | null
        }
        Update: {
          booth_number?: string
          drawing_type?: string
          file_url?: string
          id?: string
          review_round?: number | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      exhibitor_applications: {
        Row: {
          booth_id: string | null
          category: string
          content: Json
          created_at: string | null
          id: string
          payment_status: string | null
          reviewer_notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booth_id?: string | null
          category: string
          content?: Json
          created_at?: string | null
          id?: string
          payment_status?: string | null
          reviewer_notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booth_id?: string | null
          category?: string
          content?: Json
          created_at?: string | null
          id?: string
          payment_status?: string | null
          reviewer_notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exhibitor_applications_booth_id_fkey"
            columns: ["booth_id"]
            referencedRelation: "exhibitor_booths"
            referencedColumns: ["id"]
          },
        ]
      }
      exhibitor_booths: {
        Row: {
          booth_area: number | null
          booth_category: string | null
          booth_height: number | null
          booth_number: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          email: string | null
          exhibitor_name: string
          hall_number: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booth_area?: number | null
          booth_category?: string | null
          booth_height?: number | null
          booth_number: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          exhibitor_name: string
          hall_number?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booth_area?: number | null
          booth_category?: string | null
          booth_height?: number | null
          booth_number?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          exhibitor_name?: string
          hall_number?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fee_rules: {
        Row: {
          created_at: string | null
          deposit_0_50: number
          deposit_51_100: number
          deposit_over_100: number
          height_review_fee: number
          id: number
          management_fee_per_sqm: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deposit_0_50?: number
          deposit_51_100?: number
          deposit_over_100?: number
          height_review_fee?: number
          id?: number
          management_fee_per_sqm?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deposit_0_50?: number
          deposit_51_100?: number
          deposit_over_100?: number
          height_review_fee?: number
          id?: number
          management_fee_per_sqm?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_info: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          booth_id: string | null
          booth_number: string | null
          company_name: string | null
          created_at: string | null
          id: string
          payment_voucher_url: string | null
          phone: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          booth_id?: string | null
          booth_number?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          payment_voucher_url?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          booth_id?: string | null
          booth_number?: string | null
          company_name?: string | null
          created_at?: string | null
          id?: string
          payment_voucher_url?: string | null
          phone?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_info_booth_id_fkey"
            columns: ["booth_id"]
            referencedRelation: "exhibitor_booths"
            referencedColumns: ["id"]
          },
        ]
      }
      meiban_info: {
        Row: {
          booth_id: string | null
          company_name_cn: string
          company_name_en: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booth_id?: string | null
          company_name_cn: string
          company_name_en?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booth_id?: string | null
          company_name_cn?: string
          company_name_en?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meiban_info_booth_id_fkey"
            columns: ["booth_id"]
            referencedRelation: "exhibitor_booths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      qualification_documents: {
        Row: {
          application_letter_comment: string | null
          application_letter_status: string | null
          application_letter_urls: string[] | null
          booth_number: string
          business_license_comment: string | null
          business_license_status: string | null
          business_license_urls: string[] | null
          created_at: string | null
          electrician_certificate_comment: string | null
          electrician_certificate_status: string | null
          electrician_certificate_urls: string[] | null
          entrustment_letter_comment: string | null
          entrustment_letter_status: string | null
          entrustment_letter_urls: string[] | null
          equipment_rental_comment: string | null
          equipment_rental_status: string | null
          equipment_rental_urls: string[] | null
          id: string
          insurance_policy_comment: string | null
          insurance_policy_status: string | null
          insurance_policy_urls: string[] | null
          is_submitted: boolean | null
          last_reviewed_at: string | null
          review_round: number | null
          reviewed_by: string | null
          safety_responsibility_comment: string | null
          safety_responsibility_status: string | null
          safety_responsibility_urls: string[] | null
          submitted_at: string | null
          updated_at: string | null
          violation_handling_comment: string | null
          violation_handling_status: string | null
          violation_handling_urls: string[] | null
          volume_commitment_comment: string | null
          volume_commitment_status: string | null
          volume_commitment_urls: string[] | null
        }
        Insert: {
          application_letter_comment?: string | null
          application_letter_status?: string | null
          application_letter_urls?: string[] | null
          booth_number: string
          business_license_comment?: string | null
          business_license_status?: string | null
          business_license_urls?: string[] | null
          created_at?: string | null
          electrician_certificate_comment?: string | null
          electrician_certificate_status?: string | null
          electrician_certificate_urls?: string[] | null
          entrustment_letter_comment?: string | null
          entrustment_letter_status?: string | null
          entrustment_letter_urls?: string[] | null
          equipment_rental_comment?: string | null
          equipment_rental_status?: string | null
          equipment_rental_urls?: string[] | null
          id?: string
          insurance_policy_comment?: string | null
          insurance_policy_status?: string | null
          insurance_policy_urls?: string[] | null
          is_submitted?: boolean | null
          last_reviewed_at?: string | null
          review_round?: number | null
          reviewed_by?: string | null
          safety_responsibility_comment?: string | null
          safety_responsibility_status?: string | null
          safety_responsibility_urls?: string[] | null
          submitted_at?: string | null
          updated_at?: string | null
          violation_handling_comment?: string | null
          violation_handling_status?: string | null
          violation_handling_urls?: string[] | null
          volume_commitment_comment?: string | null
          volume_commitment_status?: string | null
          volume_commitment_urls?: string[] | null
        }
        Update: {
          application_letter_comment?: string | null
          application_letter_status?: string | null
          application_letter_urls?: string[] | null
          booth_number?: string
          business_license_comment?: string | null
          business_license_status?: string | null
          business_license_urls?: string[] | null
          created_at?: string | null
          electrician_certificate_comment?: string | null
          electrician_certificate_status?: string | null
          electrician_certificate_urls?: string[] | null
          entrustment_letter_comment?: string | null
          entrustment_letter_status?: string | null
          entrustment_letter_urls?: string[] | null
          equipment_rental_comment?: string | null
          equipment_rental_status?: string | null
          equipment_rental_urls?: string[] | null
          id?: string
          insurance_policy_comment?: string | null
          insurance_policy_status?: string | null
          insurance_policy_urls?: string[] | null
          is_submitted?: boolean | null
          last_reviewed_at?: string | null
          review_round?: number | null
          reviewed_by?: string | null
          safety_responsibility_comment?: string | null
          safety_responsibility_status?: string | null
          safety_responsibility_urls?: string[] | null
          submitted_at?: string | null
          updated_at?: string | null
          violation_handling_comment?: string | null
          violation_handling_status?: string | null
          violation_handling_urls?: string[] | null
          volume_commitment_comment?: string | null
          volume_commitment_status?: string | null
          volume_commitment_urls?: string[] | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_rdsvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfrabitq_vector_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      rds_float_normalize_i16: {
        Args: { "": unknown }
        Returns: unknown
      }
      rds_vector_norm: {
        Args: { "": string }
        Returns: number
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      user_role:
        | "admin"
        | "reviewer"
        | "standard_exhibitor"
        | "custom_exhibitor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: [
        "admin",
        "reviewer",
        "standard_exhibitor",
        "custom_exhibitor",
      ],
    },
  },
} as const
