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
      admin_treasury: {
        Row: {
          balance_cash_cents: number
          id: number
          updated_at: string
        }
        Insert: {
          balance_cash_cents?: number
          id?: number
          updated_at?: string
        }
        Update: {
          balance_cash_cents?: number
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_events: {
        Row: {
          channel: Database["public"]["Enums"]["share_channel"] | null
          code: string
          id: string
          ip_hash: string | null
          kind: Database["public"]["Enums"]["affiliate_event_kind"]
          multiplier_applied: number
          occurred_at: string
          points_awarded: number
          product_slug: string | null
          promotion_id: string | null
          revenue_cents: number
          ua_hash: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["share_channel"] | null
          code: string
          id?: string
          ip_hash?: string | null
          kind: Database["public"]["Enums"]["affiliate_event_kind"]
          multiplier_applied?: number
          occurred_at?: string
          points_awarded?: number
          product_slug?: string | null
          promotion_id?: string | null
          revenue_cents?: number
          ua_hash?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["share_channel"] | null
          code?: string
          id?: string
          ip_hash?: string | null
          kind?: Database["public"]["Enums"]["affiliate_event_kind"]
          multiplier_applied?: number
          occurred_at?: string
          points_awarded?: number
          product_slug?: string | null
          promotion_id?: string | null
          revenue_cents?: number
          ua_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_promotions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          multiplier: number
          name: string
          notify_affiliates: boolean
          public_visible: boolean
          starts_at: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          multiplier?: number
          name: string
          notify_affiliates?: boolean
          public_visible?: boolean
          starts_at?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          multiplier?: number
          name?: string
          notify_affiliates?: boolean
          public_visible?: boolean
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_referral_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string | null
          product_slug: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label?: string | null
          product_slug?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string | null
          product_slug?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_reward_rules: {
        Row: {
          active: boolean
          click_points: number
          created_at: string
          id: string
          max_daily_points: number | null
          notes: string | null
          product_slug: string
          purchase_points: number
          referral_cap: number | null
          revenue_share_bps: number
          signup_points: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          click_points?: number
          created_at?: string
          id?: string
          max_daily_points?: number | null
          notes?: string | null
          product_slug: string
          purchase_points?: number
          referral_cap?: number | null
          revenue_share_bps?: number
          signup_points?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          click_points?: number
          created_at?: string
          id?: string
          max_daily_points?: number | null
          notes?: string | null
          product_slug?: string
          purchase_points?: number
          referral_cap?: number | null
          revenue_share_bps?: number
          signup_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_shares: {
        Row: {
          channel: Database["public"]["Enums"]["share_channel"]
          code: string
          id: string
          occurred_at: string
          product_slug: string | null
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["share_channel"]
          code: string
          id?: string
          occurred_at?: string
          product_slug?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["share_channel"]
          code?: string
          id?: string
          occurred_at?: string
          product_slug?: string | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_wallets: {
        Row: {
          balance_cash_cents: number
          balance_points: number
          lifetime_points: number
          pending_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cash_cents?: number
          balance_points?: number
          lifetime_points?: number
          pending_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cash_cents?: number
          balance_points?: number
          lifetime_points?: number
          pending_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      consent_policies: {
        Row: {
          active: boolean
          content_url: string | null
          created_at: string
          effective_at: string
          id: string
          kind: Database["public"]["Enums"]["consent_policy_kind"]
          summary: string | null
          version: string
        }
        Insert: {
          active?: boolean
          content_url?: string | null
          created_at?: string
          effective_at?: string
          id?: string
          kind: Database["public"]["Enums"]["consent_policy_kind"]
          summary?: string | null
          version: string
        }
        Update: {
          active?: boolean
          content_url?: string | null
          created_at?: string
          effective_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["consent_policy_kind"]
          summary?: string | null
          version?: string
        }
        Relationships: []
      }
      consent_settings: {
        Row: {
          active_policy_version: string
          default_analytics: boolean
          default_marketing: boolean
          default_personalization: boolean
          id: number
          reprompt_on_version_change: boolean
          updated_at: string
        }
        Insert: {
          active_policy_version?: string
          default_analytics?: boolean
          default_marketing?: boolean
          default_personalization?: boolean
          id?: number
          reprompt_on_version_change?: boolean
          updated_at?: string
        }
        Update: {
          active_policy_version?: string
          default_analytics?: boolean
          default_marketing?: boolean
          default_personalization?: boolean
          id?: number
          reprompt_on_version_change?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      corporate_topup_inquiries: {
        Row: {
          assigned_to: string | null
          company: string
          contact_name: string
          contacted_at: string | null
          created_at: string
          email: string
          estimated_volume: string
          frequency: string
          id: string
          industry: string | null
          network: string
          notes: string | null
          phone: string
          preferred_contact: Database["public"]["Enums"]["preferred_contact"]
          qualified_at: string | null
          role: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          status_notes: string | null
          updated_at: string
          use_cases: string[]
        }
        Insert: {
          assigned_to?: string | null
          company: string
          contact_name: string
          contacted_at?: string | null
          created_at?: string
          email: string
          estimated_volume: string
          frequency: string
          id?: string
          industry?: string | null
          network: string
          notes?: string | null
          phone: string
          preferred_contact: Database["public"]["Enums"]["preferred_contact"]
          qualified_at?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_notes?: string | null
          updated_at?: string
          use_cases?: string[]
        }
        Update: {
          assigned_to?: string | null
          company?: string
          contact_name?: string
          contacted_at?: string | null
          created_at?: string
          email?: string
          estimated_volume?: string
          frequency?: string
          id?: string
          industry?: string | null
          network?: string
          notes?: string | null
          phone?: string
          preferred_contact?: Database["public"]["Enums"]["preferred_contact"]
          qualified_at?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          status_notes?: string | null
          updated_at?: string
          use_cases?: string[]
        }
        Relationships: []
      }
      loyalty_exchange_rates: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["loyalty_rate_kind"]
          label: string | null
          points: number
          starts_at: string
          updated_at: string
          value_amount: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["loyalty_rate_kind"]
          label?: string | null
          points: number
          starts_at?: string
          updated_at?: string
          value_amount: number
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["loyalty_rate_kind"]
          label?: string | null
          points?: number
          starts_at?: string
          updated_at?: string
          value_amount?: number
        }
        Relationships: []
      }
      product_assets: {
        Row: {
          active: boolean
          body_text: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          kind: Database["public"]["Enums"]["product_asset_kind"]
          notes: string | null
          product_slug: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind: Database["public"]["Enums"]["product_asset_kind"]
          notes?: string | null
          product_slug: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body_text?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["product_asset_kind"]
          notes?: string | null
          product_slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_verified: boolean
          created_at: string
          email: string
          id: string
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["profile_role"] | null
          role_selected: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_verified?: boolean
          created_at?: string
          email: string
          id?: string
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["profile_role"] | null
          role_selected?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_verified?: boolean
          created_at?: string
          email?: string
          id?: string
          onboarding_completed?: boolean
          role?: Database["public"]["Enums"]["profile_role"] | null
          role_selected?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotion_products: {
        Row: {
          product_slug: string
          promotion_id: string
        }
        Insert: {
          product_slug: string
          promotion_id: string
        }
        Update: {
          product_slug?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "affiliate_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["role_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["role_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["role_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_templates: {
        Row: {
          active: boolean
          body: string
          channel: Database["public"]["Enums"]["share_channel"]
          created_at: string
          cta: string | null
          id: string
          product_slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          channel: Database["public"]["Enums"]["share_channel"]
          created_at?: string
          cta?: string | null
          id?: string
          product_slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          channel?: Database["public"]["Enums"]["share_channel"]
          created_at?: string
          cta?: string | null
          id?: string
          product_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          category: Database["public"]["Enums"]["consent_category"]
          created_at: string
          granted: boolean
          id: string
          ip_hash: string | null
          policy_version: string
          source: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["consent_category"]
          created_at?: string
          granted: boolean
          id?: string
          ip_hash?: string | null
          policy_version: string
          source?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["consent_category"]
          created_at?: string
          granted?: boolean
          id?: string
          ip_hash?: string | null
          policy_version?: string
          source?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      wallet_ledger: {
        Row: {
          cash_delta_cents: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note: string | null
          points_delta: number
          ref_event_id: string | null
          ref_withdrawal_id: string | null
          user_id: string
        }
        Insert: {
          cash_delta_cents?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          points_delta?: number
          ref_event_id?: string | null
          ref_withdrawal_id?: string | null
          user_id: string
        }
        Update: {
          cash_delta_cents?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          note?: string | null
          points_delta?: number
          ref_event_id?: string | null
          ref_withdrawal_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_points: number
          amount_value: number
          created_at: string
          destination: string | null
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          payout_ref: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_points: number
          amount_value: number
          created_at?: string
          destination?: string | null
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          payout_ref?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_points?: number
          amount_value?: number
          created_at?: string
          destination?: string | null
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          payout_ref?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_rules: {
        Row: {
          auto_approve: boolean
          cooldown_minutes: number
          daily_limit_points: number
          id: number
          min_points: number
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean
          cooldown_minutes?: number
          daily_limit_points?: number
          id?: number
          min_points?: number
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean
          cooldown_minutes?: number
          daily_limit_points?: number
          id?: number
          min_points?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_user_consents: {
        Row: {
          category: Database["public"]["Enums"]["consent_category"] | null
          created_at: string | null
          granted: boolean | null
          policy_version: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      affiliate_approve_withdrawal: {
        Args: { _id: string; _payout_ref: string }
        Returns: undefined
      }
      affiliate_leaderboard_weekly: {
        Args: never
        Returns: {
          clicks: number
          points: number
          purchases: number
          revenue_cents: number
          signups: number
          user_id: string
        }[]
      }
      affiliate_reject_withdrawal: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      affiliate_request_withdrawal: {
        Args: {
          _amount_points: number
          _destination?: string
          _method: Database["public"]["Enums"]["withdrawal_method"]
        }
        Returns: string
      }
      affiliate_track_event:
        | {
            Args: {
              _code: string
              _ip_hash: string
              _kind: Database["public"]["Enums"]["affiliate_event_kind"]
              _product_slug: string
              _revenue_cents?: number
              _ua_hash: string
            }
            Returns: string
          }
        | {
            Args: {
              _channel?: Database["public"]["Enums"]["share_channel"]
              _code: string
              _ip_hash: string
              _kind: Database["public"]["Enums"]["affiliate_event_kind"]
              _product_slug: string
              _revenue_cents?: number
              _ua_hash: string
            }
            Returns: string
          }
      claim_first_superadmin: { Args: never; Returns: boolean }
      complete_onboarding: {
        Args: {
          _email?: string
          _role: Database["public"]["Enums"]["profile_role"]
        }
        Returns: {
          auth_verified: boolean
          created_at: string
          email: string
          id: string
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["profile_role"] | null
          role_selected: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_user_profile: {
        Args: { _email?: string }
        Returns: {
          auth_verified: boolean
          created_at: string
          email: string
          id: string
          onboarding_completed: boolean
          role: Database["public"]["Enums"]["profile_role"] | null
          role_selected: boolean
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_active_loyalty_rate: {
        Args: { _kind: Database["public"]["Enums"]["loyalty_rate_kind"] }
        Returns: {
          label: string
          points: number
          value_amount: number
        }[]
      }
      grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_superadmin: { Args: never; Returns: boolean }
      list_users_with_roles: {
        Args: never
        Returns: {
          email: string
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      record_user_consents: {
        Args: { _items: Json; _policy_version: string; _source?: string }
        Returns: undefined
      }
      revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      affiliate_event_kind: "click" | "signup" | "purchase"
      app_role:
        | "admin"
        | "staff"
        | "user"
        | "developer"
        | "affiliate"
        | "superadmin"
        | "customer"
        | "merchant"
      consent_category:
        | "necessary"
        | "analytics"
        | "marketing"
        | "personalization"
      consent_policy_kind: "privacy" | "terms" | "cookies"
      inquiry_status: "new" | "contacted" | "qualified" | "rejected"
      ledger_kind: "earn" | "redeem" | "payout" | "adjust" | "refund"
      loyalty_rate_kind: "cash" | "airtime" | "data"
      preferred_contact: "Email" | "Phone call" | "WhatsApp"
      product_asset_kind:
        | "poster"
        | "logo"
        | "video"
        | "sms_template"
        | "whatsapp_template"
        | "email_copy"
        | "social_caption"
        | "script"
        | "other"
      profile_role: "customer" | "affiliate" | "merchant" | "developer"
      role_request_status: "pending" | "approved" | "rejected"
      share_channel:
        | "whatsapp"
        | "sms"
        | "email"
        | "facebook"
        | "instagram"
        | "tiktok"
        | "x"
        | "telegram"
        | "copy"
      withdrawal_method: "mpesa" | "airtime" | "data"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid" | "failed"
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
      affiliate_event_kind: ["click", "signup", "purchase"],
      app_role: [
        "admin",
        "staff",
        "user",
        "developer",
        "affiliate",
        "superadmin",
        "customer",
        "merchant",
      ],
      consent_category: [
        "necessary",
        "analytics",
        "marketing",
        "personalization",
      ],
      consent_policy_kind: ["privacy", "terms", "cookies"],
      inquiry_status: ["new", "contacted", "qualified", "rejected"],
      ledger_kind: ["earn", "redeem", "payout", "adjust", "refund"],
      loyalty_rate_kind: ["cash", "airtime", "data"],
      preferred_contact: ["Email", "Phone call", "WhatsApp"],
      product_asset_kind: [
        "poster",
        "logo",
        "video",
        "sms_template",
        "whatsapp_template",
        "email_copy",
        "social_caption",
        "script",
        "other",
      ],
      profile_role: ["customer", "affiliate", "merchant", "developer"],
      role_request_status: ["pending", "approved", "rejected"],
      share_channel: [
        "whatsapp",
        "sms",
        "email",
        "facebook",
        "instagram",
        "tiktok",
        "x",
        "telegram",
        "copy",
      ],
      withdrawal_method: ["mpesa", "airtime", "data"],
      withdrawal_status: ["pending", "approved", "rejected", "paid", "failed"],
    },
  },
} as const
