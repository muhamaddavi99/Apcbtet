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
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          image_url: string | null
          priority: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          priority?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          priority?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          created_at: string
          created_by: string | null
          download_url: string | null
          id: string
          is_active: boolean | null
          is_force_update: boolean | null
          platform: string | null
          release_notes: string | null
          updated_at: string
          version_code: number
          version_name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean | null
          is_force_update?: boolean | null
          platform?: string | null
          release_notes?: string | null
          updated_at?: string
          version_code: number
          version_name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          id?: string
          is_active?: boolean | null
          is_force_update?: boolean | null
          platform?: string | null
          release_notes?: string | null
          updated_at?: string
          version_code?: number
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          id: string
          status: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          id?: string
          status?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          id?: string
          status?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string | null
          grade: string
          id: string
          name: string
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          grade: string
          id?: string
          name: string
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          grade?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      letters: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          date: string
          file_url: string | null
          id: string
          letter_number: string
          letter_type: string
          recipient: string | null
          sender: string | null
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          file_url?: string | null
          id?: string
          letter_number: string
          letter_type: string
          recipient?: string | null
          sender?: string | null
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          file_url?: string | null
          id?: string
          letter_number?: string
          letter_type?: string
          recipient?: string | null
          sender?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          can_teach: boolean | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          nip: string
          phone: string | null
          role: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_teach?: boolean | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          nip: string
          phone?: string | null
          role: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_teach?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          nip?: string
          phone?: string | null
          role?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string | null
          day: string
          end_time: string
          id: string
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          day: string
          end_time: string
          id?: string
          start_time: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          day?: string
          end_time?: string
          id?: string
          start_time?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          check_in_time: string
          check_out_time: string
          created_at: string | null
          id: string
          late_time: string
          school_address: string | null
          school_icon_url: string | null
          school_name: string
          school_phone: string | null
          updated_at: string | null
        }
        Insert: {
          check_in_time?: string
          check_out_time?: string
          created_at?: string | null
          id?: string
          late_time?: string
          school_address?: string | null
          school_icon_url?: string | null
          school_name?: string
          school_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in_time?: string
          check_out_time?: string
          created_at?: string | null
          id?: string
          late_time?: string
          school_address?: string | null
          school_icon_url?: string | null
          school_name?: string
          school_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          class_id: string
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          notes: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          description: string | null
          grade_type: string
          grade_value: number
          id: string
          semester: string
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          description?: string | null
          grade_type: string
          grade_value: number
          id?: string
          semester: string
          student_id: string
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          description?: string | null
          grade_type?: string
          grade_value?: number
          id?: string
          semester?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          class_id: string | null
          created_at: string | null
          gender: string | null
          id: string
          name: string
          nis: string
          phone: string | null
          qr_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          class_id?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name: string
          nis: string
          phone?: string | null
          qr_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          class_id?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string
          nis?: string
          phone?: string | null
          qr_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      system_info: {
        Row: {
          created_at: string
          id: string
          started_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          started_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          started_at?: string
        }
        Relationships: []
      }
      teacher_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          reason: string
          rejection_reason: string | null
          request_type: string
          start_date: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          reason: string
          rejection_reason?: string | null
          request_type: string
          start_date: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          reason?: string
          rejection_reason?: string | null
          request_type?: string
          start_date?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_leave_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_no_teach_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          reason: string | null
          schedule_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          reason?: string | null
          schedule_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
          schedule_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_no_teach_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_no_teach_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_no_teach_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_no_teach_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_journals: {
        Row: {
          class_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          learning_objectives: string | null
          notes: string | null
          subject_id: string
          teacher_id: string
          teaching_method: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          learning_objectives?: string | null
          notes?: string | null
          subject_id: string
          teacher_id: string
          teaching_method?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          learning_objectives?: string | null
          notes?: string | null
          subject_id?: string
          teacher_id?: string
          teaching_method?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_journals_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_journals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_journals_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_sessions: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          schedule_id: string
          start_time: string
          status: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          schedule_id: string
          start_time?: string
          status?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          schedule_id?: string
          start_time?: string
          status?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      uptime_history: {
        Row: {
          api_response_ms: number | null
          checked_at: string
          created_at: string
          database_response_ms: number | null
          details: Json | null
          id: string
          is_healthy: boolean
        }
        Insert: {
          api_response_ms?: number | null
          checked_at?: string
          created_at?: string
          database_response_ms?: number | null
          details?: Json | null
          id?: string
          is_healthy?: boolean
        }
        Update: {
          api_response_ms?: number | null
          checked_at?: string
          created_at?: string
          database_response_ms?: number | null
          details?: Json | null
          id?: string
          is_healthy?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
