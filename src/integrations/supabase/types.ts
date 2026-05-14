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
      app_settings: {
        Row: {
          favicon_url: string | null
          id: boolean
          login_background_url: string | null
          logo_size: number
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          favicon_url?: string | null
          id?: boolean
          login_background_url?: string | null
          logo_size?: number
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          favicon_url?: string | null
          id?: boolean
          login_background_url?: string | null
          logo_size?: number
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assignment_details: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          instructions: string
          max_file_size_mb: number
          max_marks: number
          module_id: string
          pdf_url: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          instructions: string
          max_file_size_mb?: number
          max_marks?: number
          module_id: string
          pdf_url?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          instructions?: string
          max_file_size_mb?: number
          max_marks?: number
          module_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_details_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          file_name: string | null
          file_url: string | null
          grade: number | null
          graded: boolean
          grading_comments: string | null
          id: string
          student_id: string
          submission_text: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          grade?: number | null
          graded?: boolean
          grading_comments?: string | null
          id?: string
          student_id: string
          submission_text?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          grade?: number | null
          graded?: boolean
          grading_comments?: string | null
          id?: string
          student_id?: string
          submission_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      campus_admins: {
        Row: {
          campus_id: string
          created_at: string
          email: string | null
          id: string
          name: string | null
          user_id: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          user_id: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campus_admins_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          region_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
          region_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          region_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      capstone_settings: {
        Row: {
          cover_url: string | null
          deadline: string | null
          id: boolean
          instructions: string
          is_published: boolean
          max_file_size_mb: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          deadline?: string | null
          id?: boolean
          instructions?: string
          is_published?: boolean
          max_file_size_mb?: number
          title?: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          deadline?: string | null
          id?: boolean
          instructions?: string
          is_published?: boolean
          max_file_size_mb?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      capstone_submissions: {
        Row: {
          created_at: string
          description: string
          files: Json
          grade: number | null
          graded: boolean
          graded_at: string | null
          graded_by: string | null
          grading_comments: string | null
          id: string
          profile_links: Json
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          files?: Json
          grade?: number | null
          graded?: boolean
          graded_at?: string | null
          graded_by?: string | null
          grading_comments?: string | null
          id?: string
          profile_links?: Json
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          files?: Json
          grade?: number | null
          graded?: boolean
          graded_at?: string | null
          graded_by?: string | null
          grading_comments?: string | null
          id?: string
          profile_links?: Json
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          campus_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          campus_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          campus_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_campuses: {
        Row: {
          campus_id: string
          course_id: string
          id: string
        }
        Insert: {
          campus_id: string
          course_id: string
          id?: string
        }
        Update: {
          campus_id?: string
          course_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_campuses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_campuses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          sequence: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sequence?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sequence?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          progress: number
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          progress?: number
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          progress?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          module_id: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          module_id: string
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          type: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      program_enrollments: {
        Row: {
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          id: string
          program_id: string
          status: string
          student_id: string
        }
        Insert: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          program_id: string
          status?: string
          student_id: string
        }
        Update: {
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          program_id?: string
          status?: string
          student_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          max_score: number
          module_id: string
          score: number
          student_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          max_score?: number
          module_id: string
          score?: number
          student_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          max_score?: number
          module_id?: string
          score?: number
          student_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          correct_answer_text: string | null
          created_at: string
          id: string
          module_id: string
          options: Json
          question: string
          question_type: string
          sort_order: number
        }
        Insert: {
          correct_answer?: number
          correct_answer_text?: string | null
          created_at?: string
          id?: string
          module_id: string
          options?: Json
          question: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          correct_answer?: number
          correct_answer_text?: string | null
          created_at?: string
          id?: string
          module_id?: string
          options?: Json
          question?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          item_id: string
          item_type: string
          module_id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          module_id: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          module_id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          campus_id: string | null
          class_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          phone: string | null
          reg_no: string | null
          section_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          campus_id?: string | null
          class_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          name: string
          phone?: string | null
          reg_no?: string | null
          section_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          campus_id?: string | null
          class_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          phone?: string | null
          reg_no?: string | null
          section_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          section_id: string | null
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          section_id?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          section_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          campus_id: string | null
          created_at: string
          email: string
          id: string
          name: string
          status: string
          user_id: string | null
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_user_role: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "campus_admin"
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
      app_role: ["admin", "teacher", "student", "campus_admin"],
    },
  },
} as const
