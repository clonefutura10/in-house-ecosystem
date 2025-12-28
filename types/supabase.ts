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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appraisals: {
        Row: {
          areas_for_improvement: string | null
          communication_score: number | null
          created_at: string | null
          employee_comments: string | null
          goals_for_next_period: string | null
          id: string
          initiative_score: number | null
          is_published: boolean | null
          manager_comments: string | null
          overall_score: number | null
          period: Database["public"]["Enums"]["appraisal_period"]
          period_number: number
          period_year: number
          productivity_score: number | null
          published_at: string | null
          quality_score: number | null
          review_date: string | null
          reviewer_id: string
          status: string | null
          strengths: string | null
          teamwork_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          areas_for_improvement?: string | null
          communication_score?: number | null
          created_at?: string | null
          employee_comments?: string | null
          goals_for_next_period?: string | null
          id?: string
          initiative_score?: number | null
          is_published?: boolean | null
          manager_comments?: string | null
          overall_score?: number | null
          period: Database["public"]["Enums"]["appraisal_period"]
          period_number?: number
          period_year?: number
          productivity_score?: number | null
          published_at?: string | null
          quality_score?: number | null
          review_date?: string | null
          reviewer_id: string
          status?: string | null
          strengths?: string | null
          teamwork_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          areas_for_improvement?: string | null
          communication_score?: number | null
          created_at?: string | null
          employee_comments?: string | null
          goals_for_next_period?: string | null
          id?: string
          initiative_score?: number | null
          is_published?: boolean | null
          manager_comments?: string | null
          overall_score?: number | null
          period?: Database["public"]["Enums"]["appraisal_period"]
          period_number?: number
          period_year?: number
          productivity_score?: number | null
          published_at?: string | null
          quality_score?: number | null
          review_date?: string | null
          reviewer_id?: string
          status?: string | null
          strengths?: string | null
          teamwork_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string
          education_requirements: string[] | null
          experience_years_max: number | null
          experience_years_min: number | null
          id: string
          is_archived: boolean | null
          preferred_skills: string[] | null
          required_skills: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description: string
          education_requirements?: string[] | null
          experience_years_max?: number | null
          experience_years_min?: number | null
          id?: string
          is_archived?: boolean | null
          preferred_skills?: string[] | null
          required_skills?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string
          education_requirements?: string[] | null
          experience_years_max?: number | null
          experience_years_min?: number | null
          id?: string
          is_archived?: boolean | null
          preferred_skills?: string[] | null
          required_skills?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_resumes: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string | null
          llamaparse_job_id: string | null
          parsing_error: string | null
          parsing_status: Database["public"]["Enums"]["parsing_status"] | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id?: string | null
          llamaparse_job_id?: string | null
          parsing_error?: string | null
          parsing_status?: Database["public"]["Enums"]["parsing_status"] | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string | null
          llamaparse_job_id?: string | null
          parsing_error?: string | null
          parsing_status?: Database["public"]["Enums"]["parsing_status"] | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_resumes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ats_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_resumes_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_scores: {
        Row: {
          calculated_at: string | null
          education_score: number | null
          experience_score: number | null
          id: string
          job_id: string
          keyword_density_score: number | null
          keyword_matches: string[] | null
          overall_score: number | null
          resume_id: string
          score_breakdown: Json | null
          skill_match_score: number | null
        }
        Insert: {
          calculated_at?: string | null
          education_score?: number | null
          experience_score?: number | null
          id?: string
          job_id: string
          keyword_density_score?: number | null
          keyword_matches?: string[] | null
          overall_score?: number | null
          resume_id: string
          score_breakdown?: Json | null
          skill_match_score?: number | null
        }
        Update: {
          calculated_at?: string | null
          education_score?: number | null
          experience_score?: number | null
          id?: string
          job_id?: string
          keyword_density_score?: number | null
          keyword_matches?: string[] | null
          overall_score?: number | null
          resume_id?: string
          score_breakdown?: Json | null
          skill_match_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ats_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ats_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_scores_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "ats_resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_configs: {
        Row: {
          cron_command: string | null
          cron_job_name: string | null
          id: string
          is_active: boolean | null
          name: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          template_id: string | null
          trigger_cron: string
          updated_at: string | null
        }
        Insert: {
          cron_command?: string | null
          cron_job_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          template_id?: string | null
          trigger_cron: string
          updated_at?: string | null
        }
        Update: {
          cron_command?: string | null
          cron_job_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          template_id?: string | null
          trigger_cron?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_configs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "reminder_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_archived: boolean | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parsed_resume_data: {
        Row: {
          candidate_name: string | null
          education: Json | null
          email: string | null
          experience_years: number | null
          id: string
          parsed_at: string | null
          phone: string | null
          raw_text: string | null
          resume_id: string
          skills: string[] | null
          work_experience: Json | null
        }
        Insert: {
          candidate_name?: string | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          id?: string
          parsed_at?: string | null
          phone?: string | null
          raw_text?: string | null
          resume_id: string
          skills?: string[] | null
          work_experience?: Json | null
        }
        Update: {
          candidate_name?: string | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          id?: string
          parsed_at?: string | null
          phone?: string | null
          raw_text?: string | null
          resume_id?: string
          skills?: string[] | null
          work_experience?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "parsed_resume_data_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: true
            referencedRelation: "ats_resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_value: number | null
          description: string | null
          due_date: string | null
          id: string
          status: string | null
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string | null
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          attendance_days: number | null
          attendance_rate: number | null
          bonus_amount: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          incentive_percentage: number | null
          manager_notes: string | null
          on_time_rate: number | null
          overall_score: number | null
          period_end: string
          period_start: string
          quality_rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          tasks_assigned: number | null
          tasks_completed: number | null
          tasks_on_time: number | null
          tasks_overdue: number | null
          updated_at: string | null
          user_id: string
          working_days: number | null
        }
        Insert: {
          attendance_days?: number | null
          attendance_rate?: number | null
          bonus_amount?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          incentive_percentage?: number | null
          manager_notes?: string | null
          on_time_rate?: number | null
          overall_score?: number | null
          period_end: string
          period_start: string
          quality_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tasks_assigned?: number | null
          tasks_completed?: number | null
          tasks_on_time?: number | null
          tasks_overdue?: number | null
          updated_at?: string | null
          user_id: string
          working_days?: number | null
        }
        Update: {
          attendance_days?: number | null
          attendance_rate?: number | null
          bonus_amount?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          incentive_percentage?: number | null
          manager_notes?: string | null
          on_time_rate?: number | null
          overall_score?: number | null
          period_end?: string
          period_start?: string
          quality_rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tasks_assigned?: number | null
          tasks_completed?: number | null
          tasks_on_time?: number | null
          tasks_overdue?: number | null
          updated_at?: string | null
          user_id?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          job_title: string | null
          joining_date: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string | null
          work_anniversary: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          job_title?: string | null
          joining_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
          work_anniversary?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          job_title?: string | null
          joining_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string | null
          work_anniversary?: string | null
        }
        Relationships: []
      }
      reminder_templates: {
        Row: {
          body_template: string
          channel: Database["public"]["Enums"]["notification_channel"][] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          required_variables: string[] | null
          subject_template: string | null
        }
        Insert: {
          body_template: string
          channel?: Database["public"]["Enums"]["notification_channel"][] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          required_variables?: string[] | null
          subject_template?: string | null
        }
        Update: {
          body_template?: string
          channel?: Database["public"]["Enums"]["notification_channel"][] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          required_variables?: string[] | null
          subject_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_performance_metrics: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: Json
      }
      check_anniversary_reminders: { Args: never; Returns: number }
      check_birthday_reminders: { Args: never; Returns: number }
      check_task_deadline_reminders: { Args: never; Returns: number }
      create_automation: {
        Args: {
          p_cron_command?: string
          p_cron_job_name?: string
          p_name: string
          p_reminder_type: Database["public"]["Enums"]["reminder_type"]
          p_template_id: string
          p_trigger_cron: string
        }
        Returns: string
      }
      create_full_automation: {
        Args: {
          p_is_active?: boolean
          p_name: string
          p_reminder_type: Database["public"]["Enums"]["reminder_type"]
          p_template_id: string
          p_trigger_cron: string
        }
        Returns: string
      }
      create_reminder_template:
        | {
            Args: {
              p_body: string
              p_channels: Database["public"]["Enums"]["notification_channel"][]
              p_name: string
              p_subject: string
            }
            Returns: string
          }
        | {
            Args: {
              p_body_template: string
              p_channel?: string[]
              p_description?: string
              p_name: string
              p_required_variables?: string[]
              p_subject_template: string
            }
            Returns: string
          }
      cron_anniversary_check: { Args: never; Returns: Json }
      cron_birthday_check: { Args: never; Returns: Json }
      cron_custom_event_check: { Args: never; Returns: Json }
      cron_task_deadline_check: { Args: never; Returns: Json }
      delete_automation: {
        Args: { p_automation_id: string }
        Returns: undefined
      }
      delete_reminder_template: {
        Args: { p_template_id: string }
        Returns: Json
      }
      generate_monthly_performance: {
        Args: { p_month?: number; p_year?: number }
        Returns: Json
      }
      generate_quarterly_performance: {
        Args: { p_quarter?: number; p_year?: number }
        Returns: Json
      }
      get_cron_presets: { Args: never; Returns: Json }
      get_departments: { Args: never; Returns: string[] }
      get_performance_summary: { Args: { p_user_id?: string }; Returns: Json }
      get_template_usage: { Args: { p_template_id: string }; Returns: Json }
      get_template_variables: { Args: never; Returns: Json }
      invoke_send_email_edge_function: { Args: never; Returns: undefined }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      process_anniversary_reminders_with_edge: { Args: never; Returns: Json }
      process_birthday_reminders_with_edge: { Args: never; Returns: Json }
      process_custom_event_reminders_with_edge: { Args: never; Returns: Json }
      process_reminders_by_type: {
        Args: { p_reminder_type: Database["public"]["Enums"]["reminder_type"] }
        Returns: number
      }
      process_task_deadline_reminders_with_edge: { Args: never; Returns: Json }
      publish_appraisal: {
        Args: { p_appraisal_id: string }
        Returns: undefined
      }
      replace_template_variables: {
        Args: {
          p_employee: Database["public"]["Tables"]["profiles"]["Row"]
          p_template: string
        }
        Returns: string
      }
      replace_template_variables_text: {
        Args: {
          p_department: string
          p_email: string
          p_full_name: string
          p_job_title: string
          p_template: string
        }
        Returns: string
      }
      send_email_to_all: {
        Args: {
          p_body: string
          p_department?: string
          p_subject: string
          p_use_template_variables?: boolean
        }
        Returns: Json
      }
      send_manual_email: {
        Args: {
          p_body: string
          p_recipient_ids: string[]
          p_subject: string
          p_use_template_variables?: boolean
        }
        Returns: Json
      }
      toggle_automation: {
        Args: { p_automation_id: string; p_is_active: boolean }
        Returns: undefined
      }
      update_automation_schedule: {
        Args: {
          p_automation_id: string
          p_name?: string
          p_trigger_cron: string
        }
        Returns: undefined
      }
      update_performance_metrics: {
        Args: {
          p_attendance_rate?: number
          p_manager_notes?: string
          p_metric_id: string
          p_quality_rating?: number
        }
        Returns: undefined
      }
      update_reminder_template: {
        Args: { p_body: string; p_subject: string; p_template_id: string }
        Returns: undefined
      }
      update_reminder_template_full: {
        Args: {
          p_body?: string
          p_description?: string
          p_name?: string
          p_required_variables?: string[]
          p_subject?: string
          p_template_id: string
        }
        Returns: undefined
      }
      upsert_appraisal: {
        Args: {
          p_areas_for_improvement?: string
          p_comments?: string
          p_communication_score?: number
          p_goals?: string
          p_initiative_score?: number
          p_period: Database["public"]["Enums"]["appraisal_period"]
          p_period_number: number
          p_period_year: number
          p_productivity_score?: number
          p_quality_score?: number
          p_strengths?: string
          p_teamwork_score?: number
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      appraisal_period: "monthly" | "quarterly" | "yearly"
      notification_channel: "system" | "email" | "slack" | "whatsapp"
      parsing_status: "pending" | "processing" | "completed" | "failed"
      reminder_type:
        | "birthday"
        | "anniversary"
        | "holiday"
        | "custom_event"
        | "task_deadline"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "review" | "done" | "blocked"
      user_role: "admin" | "employee"
      user_status: "active" | "inactive" | "suspended"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appraisal_period: ["monthly", "quarterly", "yearly"],
      notification_channel: ["system", "email", "slack", "whatsapp"],
      parsing_status: ["pending", "processing", "completed", "failed"],
      reminder_type: [
        "birthday",
        "anniversary",
        "holiday",
        "custom_event",
        "task_deadline",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "review", "done", "blocked"],
      user_role: ["admin", "employee"],
      user_status: ["active", "inactive", "suspended"],
    },
  },
} as const
