export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      alarms: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alarm_type: string | null
          battery: boolean | null
          device_id: string | null
          id: string
          location: string | null
          raw_data: Json | null
          smoke: boolean | null
          temp: number | null
          timestamp: string | null
          user_code: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alarm_type?: string | null
          battery?: boolean | null
          device_id?: string | null
          id?: string
          location?: string | null
          raw_data?: Json | null
          smoke?: boolean | null
          temp?: number | null
          timestamp?: string | null
          user_code?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alarm_type?: string | null
          battery?: boolean | null
          device_id?: string | null
          id?: string
          location?: string | null
          raw_data?: Json | null
          smoke?: boolean | null
          temp?: number | null
          timestamp?: string | null
          user_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      device_status: {
        Row: {
          battery_level: number | null
          created_at: string
          device_id: string
          id: string
          last_seen: string | null
          online: boolean | null
          raw_data: Json | null
          signal_strength: number | null
          smoke: boolean | null
          temperature: number | null
          updated_at: string
          user_code: string
          user_id: string | null
        }
        Insert: {
          battery_level?: number | null
          created_at?: string
          device_id: string
          id?: string
          last_seen?: string | null
          online?: boolean | null
          raw_data?: Json | null
          signal_strength?: number | null
          smoke?: boolean | null
          temperature?: number | null
          updated_at?: string
          user_code: string
          user_id?: string | null
        }
        Update: {
          battery_level?: number | null
          created_at?: string
          device_id?: string
          id?: string
          last_seen?: string | null
          online?: boolean | null
          raw_data?: Json | null
          signal_strength?: number | null
          smoke?: boolean | null
          temperature?: number | null
          updated_at?: string
          user_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          fcm_token: string
          id: string
          updated_at: string
          user_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          fcm_token: string
          id?: string
          updated_at?: string
          user_code: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          fcm_token?: string
          id?: string
          updated_at?: string
          user_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          user_code: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
          user_code?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_code?: string | null
        }
        Relationships: []
      }
      user_codes: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          user_code: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          user_code: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          user_code?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          user_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          user_code: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          user_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      device_overview: {
        Row: {
          battery_level: number | null
          device_added: string | null
          device_id: string | null
          last_seen: string | null
          latest_data: Json | null
          online: boolean | null
          signal_strength: number | null
          smoke: boolean | null
          temperature: number | null
          user_code: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_by_code: {
        Args: { code: string }
        Returns: string
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
    Enums: {},
  },
} as const
