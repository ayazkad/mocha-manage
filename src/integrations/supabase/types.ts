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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          icon: string | null
          id: string
          name_en: string | null
          name_fr: string
          name_ge: string | null
          name_ru: string | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name_en?: string | null
          name_fr: string
          name_ge?: string | null
          name_ru?: string | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name_en?: string | null
          name_fr?: string
          name_ge?: string | null
          name_ru?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      customer_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          order_id: string | null
          points_added: number
          points_redeemed: number
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          points_added?: number
          points_redeemed?: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          points_added?: number
          points_redeemed?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string
          points: number
          qr_code: string
          total_purchases: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone: string
          points?: number
          qr_code?: string
          total_purchases?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          points?: number
          qr_code?: string
          total_purchases?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_losses: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          loss_date: string
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          session_id: string | null
          total_loss: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          loss_date?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          session_id?: string | null
          total_loss: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          loss_date?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          session_id?: string | null
          total_loss?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_losses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_losses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_losses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_daily_benefits: {
        Row: {
          benefit_date: string
          created_at: string | null
          discount_tickets_count: number | null
          discount_used: boolean | null
          employee_id: string
          free_drink_used: boolean | null
          free_snack_used: boolean | null
          id: string
        }
        Insert: {
          benefit_date?: string
          created_at?: string | null
          discount_tickets_count?: number | null
          discount_used?: boolean | null
          employee_id: string
          free_drink_used?: boolean | null
          free_snack_used?: boolean | null
          id?: string
        }
        Update: {
          benefit_date?: string
          created_at?: string | null
          discount_tickets_count?: number | null
          discount_used?: boolean | null
          employee_id?: string
          free_drink_used?: boolean | null
          free_snack_used?: boolean | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_daily_benefits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean | null
          created_at: string | null
          employee_code: string
          id: string
          name: string
          pin_code: string
          role: Database["public"]["Enums"]["employee_role"]
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          employee_code: string
          id?: string
          name: string
          pin_code: string
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          employee_code?: string
          id?: string
          name?: string
          pin_code?: string
          role?: Database["public"]["Enums"]["employee_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean | null
          applicable_categories: string[] | null
          applicable_products: string[] | null
          created_at: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          min_amount: number | null
          min_items: number | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          created_at?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          min_amount?: number | null
          min_items?: number | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          min_amount?: number | null
          min_items?: number | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          selected_options: Json | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          selected_options?: Json | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_options?: Json | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cash_received: number | null
          completed_at: string | null
          created_at: string | null
          discount_amount: number | null
          employee_id: string
          id: string
          notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          session_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number | null
          tip_amount: number | null
          total: number
        }
        Insert: {
          cash_received?: number | null
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          employee_id: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount?: number | null
          tip_amount?: number | null
          total: number
        }
        Update: {
          cash_received?: number | null
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          employee_id?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number | null
          tip_amount?: number | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_settings: {
        Row: {
          created_at: string
          id: string
          printer_name: string | null
          printer_server_ip: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          printer_name?: string | null
          printer_server_ip?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          printer_name?: string | null
          printer_server_ip?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_options: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name_en: string | null
          name_fr: string
          name_ge: string | null
          name_ru: string | null
          option_type: string
          price_modifier: number | null
          product_id: string | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_fr: string
          name_ge?: string | null
          name_ru?: string | null
          option_type: string
          price_modifier?: number | null
          product_id?: string | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name_en?: string | null
          name_fr?: string
          name_ge?: string | null
          name_ru?: string | null
          option_type?: string
          price_modifier?: number | null
          product_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          base_price: number
          category_id: string | null
          created_at: string | null
          description_en: string | null
          description_fr: string | null
          description_ge: string | null
          description_ru: string | null
          has_milk_options: boolean | null
          has_size_options: boolean | null
          id: string
          image_url: string | null
          name_en: string | null
          name_fr: string
          name_ge: string | null
          name_ru: string | null
          sort_order: number | null
          updated_at: string | null
          visible_in_categories: boolean | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_ge?: string | null
          description_ru?: string | null
          has_milk_options?: boolean | null
          has_size_options?: boolean | null
          id?: string
          image_url?: string | null
          name_en?: string | null
          name_fr: string
          name_ge?: string | null
          name_ru?: string | null
          sort_order?: number | null
          updated_at?: string | null
          visible_in_categories?: boolean | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description_en?: string | null
          description_fr?: string | null
          description_ge?: string | null
          description_ru?: string | null
          has_milk_options?: boolean | null
          has_size_options?: boolean | null
          id?: string
          image_url?: string | null
          name_en?: string | null
          name_fr?: string
          name_ge?: string | null
          name_ru?: string | null
          sort_order?: number | null
          updated_at?: string | null
          visible_in_categories?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          employee_id: string
          end_time: string | null
          id: string
          start_time: string
          total_orders: number | null
          total_sales: number | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          end_time?: string | null
          id?: string
          start_time?: string
          total_orders?: number | null
          total_sales?: number | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          end_time?: string | null
          id?: string
          start_time?: string
          total_orders?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
    }
    Enums: {
      employee_role: "employee" | "admin"
      order_status: "pending" | "completed" | "cancelled"
      payment_method: "cash" | "card" | "other"
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
      employee_role: ["employee", "admin"],
      order_status: ["pending", "completed", "cancelled"],
      payment_method: ["cash", "card", "other"],
    },
  },
} as const
