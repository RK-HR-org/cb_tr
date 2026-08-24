export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type NamedWeightedRow = {
  id: number
  name: string
  weight: number | null
}

type NamedWeightedInsert = {
  id?: number
  name: string
  weight?: number | null
}

type ClassifiedRow = NamedWeightedRow & {
  description: string | null
  is_active: boolean
}

type ClassifiedInsert = NamedWeightedInsert & {
  description?: string | null
  is_active?: boolean
}

type ActiveNamedRow = {
  id: number
  name: string
  is_active: boolean
}

type ActiveNamedInsert = {
  id?: number
  name: string
  is_active?: boolean
}

type CodeDictionaryRow = {
  code: string
  name: string
  sort_order: number
  is_active: boolean
}

type CodeDictionaryInsert = {
  code: string
  name: string
  sort_order?: number
  is_active?: boolean
}

export type TrainerRow = {
  id: number
  full_name: string
  city_id: number | null
  division_id: number | null
  login: string | null
  auth_user_id: string | null
}

export type TrainerInsert = {
  id?: number
  full_name: string
  city_id?: number | null
  division_id?: number | null
  login?: string | null
  auth_user_id?: string | null
}

export type ProjectRow = {
  id: number
  name: string
  audit_index: string | null
  weight: number | null
  status_code: string
  project_type_id: number | null
  parent_project_id: number | null
  module_position: number | null
  customer: string | null
  lead_methodologist_id: number | null
  target_audience: string | null
  goals: string | null
  short_description: string | null
  duration_days: number | null
  duration_hours: number | null
  participant_count: number | null
  is_in_application_campaign: boolean
  module_gap_value: number | null
  module_gap_unit: 'days' | 'weeks' | 'months' | 'quarters' | null
  central_office_format_code: string | null
  main_department_format_code: string | null
  annual_budget_item_id: number | null
}

export type ProjectInsert = {
  id?: number
  name: string
  audit_index?: string | null
  weight?: number | null
  status_code?: string
  project_type_id?: number | null
  parent_project_id?: number | null
  module_position?: number | null
  customer?: string | null
  lead_methodologist_id?: number | null
  target_audience?: string | null
  goals?: string | null
  short_description?: string | null
  duration_days?: number | null
  duration_hours?: number | null
  participant_count?: number | null
  is_in_application_campaign?: boolean
  module_gap_value?: number | null
  module_gap_unit?: 'days' | 'weeks' | 'months' | 'quarters' | null
  central_office_format_code?: string | null
  main_department_format_code?: string | null
  annual_budget_item_id?: number | null
}

export type TrainerCertificationRow = {
  id: number
  trainer_id: number
  project_id: number
  status_code: string
  valid_from: string | null
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TrainerCertificationInsert = {
  id?: number
  trainer_id: number
  project_id: number
  status_code?: string
  valid_from?: string | null
  valid_until?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type ProjectMaterialRow = {
  id: number
  project_id: number
  type_code: string
  status_code: string
  title: string | null
  location: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type ProjectMaterialInsert = {
  id?: number
  project_id: number
  type_code: string
  status_code?: string
  title?: string | null
  location?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export type ProductionCalendarDayRow = {
  id: number
  event_date: string
  day_type: 'holiday' | 'working_saturday'
  name: string
  created_at: string
  updated_at: string
}

export type ProductionCalendarDayInsert = {
  id?: number
  event_date: string
  day_type: 'holiday' | 'working_saturday'
  name: string
  created_at?: string
  updated_at?: string
}

export type WorkNormSettingRow = {
  year: number
  training_days_per_trainer_week: number
  created_at: string
  updated_at: string
}

export type WorkNormSettingInsert = {
  year: number
  training_days_per_trainer_week?: number
  created_at?: string
  updated_at?: string
}

export type AdminCalendarEventRow = {
  id: number
  series_id: string
  copied_from_event_id: number | null
  trainer_event_group_id: string | null
  program_schedule_id: number | null
  program_schedule_module_id: number | null
  project_main_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  title: string
  required_trainer_count: number
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  recurrence_until: string | null
  occurrence_index: number
  description: string | null
  comments: string | null
  created_at: string
  updated_at: string
}

export type AdminCalendarEventInsert = {
  id?: number
  series_id?: string
  copied_from_event_id?: number | null
  trainer_event_group_id?: string | null
  program_schedule_id?: number | null
  program_schedule_module_id?: number | null
  project_main_id?: number | null
  activity_type_id?: number | null
  delivery_format_id?: number | null
  recurrence_type_id?: number | null
  title: string
  required_trainer_count?: number
  start_datetime?: string | null
  end_datetime?: string | null
  start_date?: string | null
  end_date?: string | null
  recurrence_until?: string | null
  occurrence_index?: number
  description?: string | null
  comments?: string | null
  created_at?: string
  updated_at?: string
}

export type TrainerProjectRow = {
  id: number
  trainer_id: number
  project_type_id: number | null
  project_main_id: number | null
  project_sub: string | null
  role_id: number | null
  activity_type_id: number | null
  delivery_format_id: number | null
  recurrence_type_id: number | null
  start_datetime: string | null
  end_datetime: string | null
  start_date: string | null
  end_date: string | null
  event_group_id: string | null
  source_type: string | null
  source_file: string | null
  source_schedule_key: string | null
  source_sheet: string | null
  source_range: string | null
  source_event_key: string | null
  is_duplicate: boolean
  task_desc: string | null
  comments: string | null
}

export type TrainerProjectInsert = {
  id?: number
  trainer_id: number
  project_type_id?: number | null
  project_main_id?: number | null
  project_sub?: string | null
  role_id?: number | null
  activity_type_id?: number | null
  delivery_format_id?: number | null
  recurrence_type_id?: number | null
  start_datetime?: string | null
  end_datetime?: string | null
  start_date?: string | null
  end_date?: string | null
  event_group_id?: string | null
  source_type?: string | null
  source_file?: string | null
  source_schedule_key?: string | null
  source_sheet?: string | null
  source_range?: string | null
  source_event_key?: string | null
  is_duplicate?: boolean
  task_desc?: string | null
  comments?: string | null
}

export type Database = {
  public: {
    Tables: {
      trainers: TableDefinition<
        TrainerRow,
        TrainerInsert
      >
      roles: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_types: TableDefinition<NamedWeightedRow, NamedWeightedInsert>
      project_names: TableDefinition<ProjectRow, ProjectInsert>
      activity_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      delivery_formats: TableDefinition<ClassifiedRow, ClassifiedInsert>
      recurrence_types: TableDefinition<ClassifiedRow, ClassifiedInsert>
      trainer_projects: TableDefinition<TrainerProjectRow, TrainerProjectInsert>
      cities: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      divisions: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      directions: TableDefinition<
        ActiveNamedRow & { description: string | null },
        ActiveNamedInsert & { description?: string | null }
      >
      project_statuses: TableDefinition<
        CodeDictionaryRow & { is_terminal: boolean },
        CodeDictionaryInsert & { is_terminal?: boolean }
      >
      project_delivery_formats: TableDefinition<CodeDictionaryRow, CodeDictionaryInsert>
      annual_budget_items: TableDefinition<ActiveNamedRow, ActiveNamedInsert>
      certification_statuses: TableDefinition<
        CodeDictionaryRow & { grants_access: boolean },
        CodeDictionaryInsert & { grants_access?: boolean }
      >
      material_types: TableDefinition<CodeDictionaryRow, CodeDictionaryInsert>
      material_statuses: TableDefinition<
        CodeDictionaryRow & { is_complete: boolean },
        CodeDictionaryInsert & { is_complete?: boolean }
      >
      project_direction_links: TableDefinition<
        { project_id: number; direction_id: number },
        { project_id: number; direction_id: number }
      >
      trainer_certifications: TableDefinition<
        TrainerCertificationRow,
        TrainerCertificationInsert
      >
      project_materials: TableDefinition<ProjectMaterialRow, ProjectMaterialInsert>
      production_calendar_days: TableDefinition<
        ProductionCalendarDayRow,
        ProductionCalendarDayInsert
      >
      work_norm_settings: TableDefinition<WorkNormSettingRow, WorkNormSettingInsert>
      program_schedules: TableDefinition<
        {
          id: number
          program_project_id: number
          start_date: string
          gap_value: number
          gap_unit: 'days' | 'weeks' | 'months' | 'quarters'
          calendar_mode: 'working' | 'calendar'
          source_reference: string | null
          created_at: string
          updated_at: string
        },
        {
          id?: number
          program_project_id: number
          start_date: string
          gap_value: number
          gap_unit: 'days' | 'weeks' | 'months' | 'quarters'
          calendar_mode?: 'working' | 'calendar'
          source_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      >
      program_schedule_modules: TableDefinition<
        {
          id: number
          schedule_id: number
          module_project_id: number
          module_position: number | null
          duration_days: number
          planned_start_date: string
          planned_end_date: string
          admin_calendar_event_id: number | null
          created_at: string
        },
        {
          id?: number
          schedule_id: number
          module_project_id: number
          module_position?: number | null
          duration_days: number
          planned_start_date: string
          planned_end_date: string
          admin_calendar_event_id?: number | null
          created_at?: string
        }
      >
      admin_calendar_events: TableDefinition<AdminCalendarEventRow, AdminCalendarEventInsert>
      admin_calendar_event_trainers: TableDefinition<
        { event_id: number; trainer_id: number; trainer_project_id: number; assigned_at: string },
        { event_id: number; trainer_id: number; trainer_project_id: number; assigned_at?: string }
      >
    }
    Views: {
      trainer_effective_project_access: {
        Row: {
          trainer_id: number | null
          project_id: number | null
          granted_by_project_id: number | null
          certification_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      save_project_card: {
        Args: {
          p_project_id: number | null
          p_payload: Json
          p_direction_ids?: number[]
        }
        Returns: number
      }
      save_trainer_activity: {
        Args: {
          p_record_id: number | null
          p_trainer_id: number
          p_participant_ids: number[]
          p_can_manage_participants: boolean
          p_payload: Json
        }
        Returns: undefined
      }
      sync_admin_calendar_event_trainers: {
        Args: { p_event_ids: number[]; p_trainer_ids?: number[] }
        Returns: undefined
      }
      delete_admin_calendar_events: {
        Args: { p_event_ids: number[] }
        Returns: number
      }
      delete_admin_calendar_event_future_series: {
        Args: { p_event_id: number; p_now?: string }
        Returns: number
      }
      save_program_schedule: {
        Args: {
          p_program_project_id: number
          p_start_date: string
          p_gap_value: number
          p_gap_unit: string
          p_calendar_mode: string
          p_modules: Json
        }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
